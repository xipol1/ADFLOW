/**
 * Campaign snapshot capture service.
 *
 * Pipeline:
 *   1. When a campaign transitions to PUBLISHED, initCampaignMetrics()
 *      creates exactly one CampaignMetricsV2 document with the full
 *      snapshotSchedule (at_1h..at_7d) precomputed from publishedAt.
 *
 *   2. An hourly Vercel Cron calls POST /api/admin/metrics/capture which
 *      runs runSnapshotCapture(). For each window it finds documents
 *      where schedule time <= now AND the snapshot is still null, then
 *      captures and writes that snapshot. Idempotent by construction.
 *
 *   3. When a campaign transitions to COMPLETED, captureFinalSnapshot()
 *      runs inline (non-blocking) so the `final` MetricPoint is written
 *      immediately regardless of whether the at_7d window has elapsed.
 *      This is the single data point that feeds CAP in the scoring engine.
 *
 * Data sources per snapshot (ordered by trust, best wins):
 *   - Admin bot (if available for the platform)  → fuenteDatos: admin_directo
 *   - Tracking URL (always available)            → fuenteDatos: tracking_url
 *   - None of the above                          → flag 'sin_datos'
 *
 * Fraud detection: every captured snapshot runs through
 * detectarAnomaliaFraude() — if anomalous, flagFraude=true and a structured
 * log line is emitted for the admin dashboard to pick up.
 */

const { ensureDb } = require('../lib/ensureDb');
const { detectarAnomaliaFraude } = require('../config/nicheBenchmarks');

function models() {
  return {
    Campaign: require('../models/Campaign'),
    Canal: require('../models/Canal'),
    CampaignMetricsV2: require('../models/CampaignMetricsV2'),
    TrackingLink: require('../models/TrackingLink'),
  };
}

// Map of snapshot field names to their (a) schedule path and (b) offset in ms.
const SNAPSHOT_WINDOWS = [
  { key: '1h',  field: 'snapshot_1h',  schedPath: 'snapshotSchedule.at_1h',  offsetMs: 1 * 60 * 60 * 1000 },
  { key: '6h',  field: 'snapshot_6h',  schedPath: 'snapshotSchedule.at_6h',  offsetMs: 6 * 60 * 60 * 1000 },
  { key: '24h', field: 'snapshot_24h', schedPath: 'snapshotSchedule.at_24h', offsetMs: 24 * 60 * 60 * 1000 },
  { key: '72h', field: 'snapshot_72h', schedPath: 'snapshotSchedule.at_72h', offsetMs: 72 * 60 * 60 * 1000 },
  { key: '7d',  field: 'snapshot_7d',  schedPath: 'snapshotSchedule.at_7d',  offsetMs: 7 * 24 * 60 * 60 * 1000 },
];

/**
 * Create a CampaignMetricsV2 document for a freshly PUBLISHED campaign.
 * Idempotent: if a document already exists for the campaign we return it
 * unchanged. Otherwise we compute the full snapshot schedule and insert.
 */
async function initCampaignMetrics(campaignId) {
  await ensureDb();
  const { Campaign, Canal, CampaignMetricsV2 } = models();

  const existing = await CampaignMetricsV2.findOne({ campaniaId: campaignId });
  if (existing) return existing;

  const campaign = await Campaign.findById(campaignId).lean();
  if (!campaign) throw new Error(`Campaign ${campaignId} not found`);
  const publishedAt = campaign.publishedAt ? new Date(campaign.publishedAt) : new Date();

  const canal = await Canal.findById(campaign.channel).select('plataforma categoria').lean();

  const schedule = {};
  for (const w of SNAPSHOT_WINDOWS) {
    schedule[`at_${w.key}`] = new Date(publishedAt.getTime() + w.offsetMs);
  }

  try {
    const doc = await CampaignMetricsV2.create({
      campaniaId: campaignId,
      canalId: campaign.channel,
      nicho: canal?.categoria || 'otros',
      plataforma: canal?.plataforma || '',
      publishedAt,
      snapshotSchedule: schedule,
    });
    return doc;
  } catch (err) {
    // Race with a concurrent initCampaignMetrics call — unique index on
    // campaniaId prevents duplicates. Return whatever is there now.
    if (err?.code === 11000) {
      return CampaignMetricsV2.findOne({ campaniaId: campaignId });
    }
    throw err;
  }
}

/**
 * Load current click counts for a campaign from the tracking system.
 * Returns { clicksUnicos, source } — `source` is 'tracking_url' if we
 * found a TrackingLink, or 'none' if there was nothing (snapshot will be
 * flagged sin_datos).
 */
async function loadClicksFromTracking(campaignId) {
  const { TrackingLink } = models();
  const link = await TrackingLink.findOne({ campaign: campaignId }).select('stats').lean();
  if (!link) return { clicksUnicos: 0, source: 'none' };
  return {
    clicksUnicos: Number(link.stats?.uniqueClicks || 0),
    source: 'tracking_url',
  };
}

/**
 * Load view counts from a platform admin bot, if one is available for the
 * channel's platform. Stub in this phase — returns null so the caller
 * falls back to tracking data. The design is extensible: when the
 * Telegram admin bot ships, just return { views, source: 'admin_directo' }.
 */
async function loadViewsFromAdminBot(/* campaign, canal */) {
  // Placeholder. Future: if (canal.plataforma === 'telegram' && canal.credenciales.botToken) { ... }
  return null;
}

/**
 * Build a raw MetricPoint payload for a snapshot window. Pure-ish — does
 * one DB read for tracking stats but no writes.
 */
async function buildMetricPoint({ campaign, canal, nicho }) {
  const now = new Date();
  const { clicksUnicos, source: clicksSource } = await loadClicksFromTracking(campaign._id);
  const adminData = await loadViewsFromAdminBot(campaign, canal);

  const views = adminData ? Number(adminData.views || 0) : 0;
  const fuenteDatos = adminData ? 'admin_directo' : clicksSource === 'tracking_url' ? 'tracking_url' : 'tracking_url';
  const noData = clicksSource === 'none' && !adminData;

  const point = {
    timestamp: now,
    views,
    clicksUnicos,
    forwards: 0,
    reacciones: { total: 0, tipos: {} },
    fuenteDatos,
  };

  // Fraud detection. detectarAnomaliaFraude safely handles zero / null
  // CTRImplicito — it just returns anomalia:false in that case.
  const ctrImplicito = views > 0 ? clicksUnicos / views : 0;
  const anomaly = detectarAnomaliaFraude(nicho, ctrImplicito);
  point.CTRImplicito = ctrImplicito;
  point.flagFraude = Boolean(anomaly.anomalia);
  point.tipoFlag = anomaly.tipo || null;

  if (noData) {
    // We keep the snapshot row so the cron doesn't keep retrying forever,
    // but tag it so the admin dashboard sees it.
    point.fuenteDatos = 'declarado';
  }

  return { point, anomaly, noData };
}

/**
 * Capture a single snapshot window for a metrics document. Idempotent:
 * if the target field is already populated we skip silently.
 *
 * Returns one of:
 *   { status: 'captured', window, flagFraude }
 *   { status: 'skipped_exists', window }
 *   { status: 'skipped_no_campaign', window }
 */
async function capturarSnapshot(metricsDoc, windowKey) {
  const { Campaign, Canal } = models();
  const w = SNAPSHOT_WINDOWS.find((x) => x.key === windowKey);
  if (!w) throw new Error(`Unknown snapshot window: ${windowKey}`);

  // Idempotency: only write when the target field is still null.
  if (metricsDoc[w.field]) {
    return { status: 'skipped_exists', window: w.key };
  }

  const campaign = await Campaign.findById(metricsDoc.campaniaId).lean();
  if (!campaign) return { status: 'skipped_no_campaign', window: w.key };

  const canal = await Canal.findById(metricsDoc.canalId).select('plataforma categoria').lean();
  const { point, anomaly } = await buildMetricPoint({
    campaign,
    canal,
    nicho: metricsDoc.nicho || canal?.categoria || 'otros',
  });

  metricsDoc[w.field] = point;
  await metricsDoc.save();

  if (anomaly.anomalia) {
    // Structured log line consumed by the admin dashboard later.
    console.warn(
      '[snapshot_fraude]',
      JSON.stringify({
        campaniaId: String(metricsDoc.campaniaId),
        canalId: String(metricsDoc.canalId),
        nicho: metricsDoc.nicho,
        window: w.key,
        tipo: anomaly.tipo,
        sigmas: anomaly.sigmas,
        CTRImplicito: point.CTRImplicito,
      }),
    );
  }

  return { status: 'captured', window: w.key, flagFraude: Boolean(anomaly.anomalia) };
}

/**
 * Immediate final snapshot capture, called from the campaign controller
 * when a campaign transitions to COMPLETED. Does not care about the
 * snapshot schedule — writes `final` regardless.
 *
 * Idempotent: if `final` already exists we leave it alone.
 */
async function captureFinalSnapshot(campaignId) {
  await ensureDb();
  const { Campaign, Canal, CampaignMetricsV2 } = models();

  // Ensure the metrics document exists even if init was missed (e.g. a
  // campaign that was seeded in an older state before Piece 8 shipped).
  let metricsDoc = await CampaignMetricsV2.findOne({ campaniaId: campaignId });
  if (!metricsDoc) {
    metricsDoc = await initCampaignMetrics(campaignId);
  }

  if (metricsDoc.final) {
    return { status: 'skipped_exists', window: 'final' };
  }

  const campaign = await Campaign.findById(campaignId).lean();
  if (!campaign) return { status: 'skipped_no_campaign', window: 'final' };

  const canal = await Canal.findById(metricsDoc.canalId).select('plataforma categoria').lean();
  const { point, anomaly } = await buildMetricPoint({
    campaign,
    canal,
    nicho: metricsDoc.nicho || canal?.categoria || 'otros',
  });

  metricsDoc.final = point;
  await metricsDoc.save();

  if (anomaly.anomalia) {
    console.warn(
      '[snapshot_fraude]',
      JSON.stringify({
        campaniaId: String(metricsDoc.campaniaId),
        canalId: String(metricsDoc.canalId),
        nicho: metricsDoc.nicho,
        window: 'final',
        tipo: anomaly.tipo,
        sigmas: anomaly.sigmas,
        CTRImplicito: point.CTRImplicito,
      }),
    );
  }

  return { status: 'captured', window: 'final', flagFraude: Boolean(anomaly.anomalia) };
}

/**
 * The hourly cron driver. Iterates each window and captures any documents
 * whose schedule time has elapsed and whose snapshot is still null. One
 * cron handles all five windows for every document.
 */
async function runSnapshotCapture({ now = new Date(), batchSize = 100 } = {}) {
  await ensureDb();
  const { CampaignMetricsV2 } = models();

  const totals = { procesados: 0, capturados: 0, saltados: 0, fraudes: 0, porVentana: {} };

  for (const w of SNAPSHOT_WINDOWS) {
    const query = {
      [w.schedPath]: { $lte: now },
      [w.field]: null,
    };
    const docs = await CampaignMetricsV2.find(query).limit(batchSize);

    let captured = 0;
    let flagged = 0;
    for (const doc of docs) {
      totals.procesados += 1;
      try {
        const result = await capturarSnapshot(doc, w.key);
        if (result.status === 'captured') {
          captured += 1;
          if (result.flagFraude) flagged += 1;
        } else {
          totals.saltados += 1;
        }
      } catch (err) {
        console.error(`[snapshot_error] window=${w.key} doc=${doc._id}:`, err?.message);
      }
    }

    totals.capturados += captured;
    totals.fraudes += flagged;
    totals.porVentana[w.key] = { captured, flagged, candidates: docs.length };
  }

  return totals;
}

module.exports = {
  initCampaignMetrics,
  capturarSnapshot,
  captureFinalSnapshot,
  runSnapshotCapture,
  buildMetricPoint,
  loadClicksFromTracking,
  loadViewsFromAdminBot,
  SNAPSHOT_WINDOWS,
};
