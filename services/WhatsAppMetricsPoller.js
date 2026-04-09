/**
 * WhatsAppMetricsPoller
 *
 * Reads campaign post metrics via the WhatsApp admin client.
 * Schedules snapshot reads at 1h, 6h, 24h, 72h, 7d from publication.
 * Detects fraud by comparing CTR against benchmarks.
 */

'use strict';

const whatsappAdmin = require('./WhatsAppAdminClient');
const CampaignMetrics = require('../models/CampaignMetrics');
const Canal = require('../models/Canal');

const SYNC_INTERVALS_HOURS = [1, 6, 24, 72, 168];
const MAX_CONCURRENT = 5;

// Inline CTR benchmarks — WhatsApp channels
const CTR_BENCHMARKS = {
  default:      { min: 0.003, max: 0.30 },
  tecnologia:   { min: 0.005, max: 0.25 },
  finanzas:     { min: 0.004, max: 0.20 },
  entretenimiento: { min: 0.002, max: 0.35 },
  noticias:     { min: 0.003, max: 0.15 },
  ecommerce:    { min: 0.008, max: 0.40 },
};

class WhatsAppMetricsPoller {

  /**
   * Poll metrics for a single campaign.
   * Reads views/reactions from admin position, crosses with tracking clicks.
   */
  async pollCampaignMetrics(campaignMetricsId) {
    const cm = await CampaignMetrics.findById(campaignMetricsId).populate('canalId');
    if (!cm) throw new Error(`CampaignMetrics ${campaignMetricsId} not found`);
    if (cm.plataforma !== 'whatsapp') throw new Error('Not a WhatsApp campaign');
    if (!cm.postId) throw new Error('No postId — campaign not published yet');

    const canal = cm.canalId;
    const channelId = canal.botConfig?.whatsapp?.channelId || canal.identificadorCanal;
    if (!channelId) throw new Error('No channelId for canal');

    // Read metrics via admin client
    const metrics = await whatsappAdmin.readPostMetrics(channelId, cm.postId);

    const horasDesdePublicacion = cm.publicadoEn
      ? Math.floor((Date.now() - cm.publicadoEn) / (1000 * 60 * 60))
      : 0;

    // Build snapshot data
    const snapshotData = {
      views: metrics.views || 0,
      reactions: metrics.totalReactions || 0,
      clicks: cm.metricsFinales?.clicks || 0,
    };

    cm.addSnapshot(snapshotData, horasDesdePublicacion);

    // Set source and confidence
    cm.fuenteDatos = 'admin_directo';
    cm.confianzaScore = 95;
    cm.nivelVerificacion = 'oro';

    // Update whatsappData
    cm.whatsappData = {
      ...(cm.whatsappData || {}),
      adminAccess: true,
      messageId: cm.postId,
      viewsLeidas: metrics.views || 0,
      reactionsLeidas: metrics.reactions || {},
    };

    // Store detailed reactions
    if (metrics.reactions && Object.keys(metrics.reactions).length > 0) {
      cm.reactionsDetalle = metrics.reactions;
    }

    // ─── Fraud detection ──────────────────────────────────────────────────
    this._detectAnomaly(cm, canal.categoria, horasDesdePublicacion);

    // ─── Schedule next sync ───────────────────────────────────────────────
    const nextHours = this._getNextSyncInterval(horasDesdePublicacion);
    if (nextHours) {
      cm.proximaSync = new Date(Date.now() + nextHours * 3600 * 1000);
    } else {
      cm.syncCompletada = true;
    }

    cm.ultimaSync = new Date();
    await cm.save();

    console.log(`📊 [wa-poller] ${cm._id} h:${horasDesdePublicacion} — views:${snapshotData.views} reactions:${snapshotData.reactions} clicks:${snapshotData.clicks}`);

    return cm;
  }

  /**
   * Poll all active WhatsApp campaigns with pending sync.
   * Processes in batches of MAX_CONCURRENT.
   */
  async pollAllActive() {
    const pending = await CampaignMetrics.find({
      plataforma: 'whatsapp',
      syncCompletada: false,
      proximaSync: { $lte: new Date() },
    }).populate('canalId');

    if (pending.length === 0) return { ok: 0, err: 0 };

    console.log(`📊 [wa-poller] ${pending.length} WhatsApp campaigns pending...`);

    let ok = 0;
    let err = 0;

    // Process in batches of MAX_CONCURRENT
    for (let i = 0; i < pending.length; i += MAX_CONCURRENT) {
      const batch = pending.slice(i, i + MAX_CONCURRENT);
      const results = await Promise.allSettled(
        batch.map(cm => this.pollCampaignMetrics(cm._id))
      );

      for (const r of results) {
        if (r.status === 'fulfilled') ok++;
        else {
          err++;
          console.error(`[wa-poller] Error:`, r.reason?.message);
        }
      }
    }

    console.log(`📊 [wa-poller] Done — ${ok} ok, ${err} errors`);
    return { ok, err };
  }

  /**
   * Schedule snapshot reads for a newly published campaign.
   * Uses the existing proximaSync field (persists across restarts).
   */
  async scheduleSnapshots(campaignMetricsId) {
    const cm = await CampaignMetrics.findById(campaignMetricsId);
    if (!cm) throw new Error(`CampaignMetrics ${campaignMetricsId} not found`);

    cm.proximaSync = new Date(Date.now() + 1 * 3600 * 1000); // 1 hour from now
    cm.syncCompletada = false;
    cm.fuenteDatos = 'admin_directo';
    cm.confianzaScore = 95;
    await cm.save();

    console.log(`📊 [wa-poller] Snapshots scheduled for ${campaignMetricsId} — first read in 1h`);
    return { proximaSync: cm.proximaSync };
  }

  // ─── Internal ───────────────────────────────────────────────────────────────

  _detectAnomaly(cm, categoria, horasDesdePublicacion) {
    const views = cm.metricsFinales?.views || 0;
    const clicks = cm.metricsFinales?.clicks || 0;

    // Flag: no views after 2 hours
    if (views === 0 && horasDesdePublicacion > 2) {
      cm.flagFraude = true;
      cm.flagFraudeRazon = 'Sin vistas después de 2 horas — posible no publicado';
      return;
    }

    // Flag: CTR anomaly
    if (views > 0 && clicks > 0) {
      const ctr = clicks / views;
      const benchmark = CTR_BENCHMARKS[categoria] || CTR_BENCHMARKS.default;

      const tooLow = ctr < benchmark.min * 0.3;
      const tooHigh = ctr > benchmark.max * 2;

      if (tooLow || tooHigh) {
        cm.flagFraude = true;
        cm.flagFraudeRazon = tooHigh
          ? `CTR sospechoso: ${(ctr * 100).toFixed(2)}% (máx esperado ~${(benchmark.max * 100).toFixed(0)}%)`
          : `CTR anormalmente bajo: ${(ctr * 100).toFixed(4)}% con ${views} vistas`;
      }
    }
  }

  _getNextSyncInterval(horasActuales) {
    for (const h of SYNC_INTERVALS_HOURS) {
      if (horasActuales < h) return h - horasActuales;
    }
    return null;
  }
}

module.exports = new WhatsAppMetricsPoller();
