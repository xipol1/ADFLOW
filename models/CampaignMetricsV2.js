/**
 * CampaignMetricsV2
 *
 * Per-campaign metrics document with named temporal snapshots. One document
 * per campaign (enforced by a unique index on `campaniaId`).
 *
 * Why v2: the legacy CampaignMetrics model uses an unbounded array of
 * `snapshots` and references `Anuncio`, which was the old campaign
 * primitive. The live campaign model across controllers and cross-refs
 * (Dispute, Review, Tracking, TrackingLink, Transaccion, PartnerAuditLog,
 * CampaignMessage) is `Campaign`. Rather than mutate the legacy model and
 * risk breaking SocialSyncService and WhatsAppMetricsPoller, v2 ships as
 * a separate collection with the new shape and the correct ref.
 *
 * Snapshot timing (captured by the cron in Piece 8):
 *   +1h, +6h, +24h, +72h, +7d, and `final` (last authoritative reading).
 *
 * Design invariants:
 *   1. Exactly one document per campaign (unique index).
 *   2. Snapshots are named subdocuments, not an array — direct access
 *      (metrics.snapshot_24h.views) with no filtering.
 *   3. CTR is computed at write time inside the subdocument hook so
 *      analytics queries never recompute it. CTR is ALWAYS 0 when views
 *      is 0 (never NaN, never Infinity).
 *   4. fuenteDatos and flagFraude live per snapshot, not per document —
 *      different points in time can have different verification sources.
 */

const mongoose = require('mongoose');

const FUENTE_DATOS_VALUES = [
  'admin_directo',
  'oauth_graph',
  'bot_miembro',
  'tracking_url',
  'screenshot_ocr',
  'declarado',
];

const TIPO_FLAG_VALUES = ['ctr_alto', 'ctr_bajo', null];

// ── MetricPoint subdocument ────────────────────────────────────────────────
// Not-exported _id so subdocuments stay lightweight. CTR is stored (not
// virtual) so queries like "find campaigns with final.CTR > x" are index-
// backed if we ever add the index.
const MetricPointSchema = new mongoose.Schema(
  {
    timestamp: { type: Date, default: Date.now },
    views: { type: Number, default: 0 },
    clicksUnicos: { type: Number, default: 0 },
    CTR: { type: Number, default: 0 },

    reacciones: {
      total: { type: Number, default: 0 },
      tipos: { type: mongoose.Schema.Types.Mixed, default: {} },
    },
    forwards: { type: Number, default: 0 },

    // Per-snapshot anti-fraud metadata.
    CTRImplicito: { type: Number, default: 0 },
    flagFraude: { type: Boolean, default: false },
    tipoFlag: { type: String, enum: TIPO_FLAG_VALUES, default: null },
    fuenteDatos: {
      type: String,
      enum: FUENTE_DATOS_VALUES,
      default: 'tracking_url',
    },
  },
  { _id: false },
);

// Names of the snapshot subdocument fields on the parent schema. We
// iterate these in a single parent-level hook below because nested
// subdoc hooks don't always fire on validateSync().
const SNAPSHOT_FIELDS = [
  'snapshot_1h', 'snapshot_6h', 'snapshot_24h',
  'snapshot_72h', 'snapshot_7d', 'final',
];

function computeMetricPointCTR(point) {
  if (!point) return;
  const views = Number(point.views) || 0;
  const clicks = Number(point.clicksUnicos) || 0;
  if (views > 0) {
    point.CTR = +(clicks / views).toFixed(6);
  } else {
    point.CTR = 0; // Never NaN, never Infinity.
  }
  if (point.CTRImplicito == null || !Number.isFinite(+point.CTRImplicito) || +point.CTRImplicito === 0) {
    point.CTRImplicito = point.CTR;
  }
}

const CampaignMetricsV2Schema = new mongoose.Schema(
  {
    campaniaId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Campaign',
      required: true,
      unique: true,
      index: true,
    },
    canalId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Canal',
      required: true,
      index: true,
    },
    nicho: { type: String, default: 'otros' },
    plataforma: { type: String, default: '' },

    // ── publishedAt + precomputed snapshot schedule ────────────────────────
    // Stored at document-creation time so the hourly capture cron can run a
    // cheap index-backed query: "snapshotSchedule.at_1h <= now AND
    // snapshot_1h IS NULL". No setTimeout — serverless can't hold timers.
    publishedAt: { type: Date, default: null },
    snapshotSchedule: {
      at_1h:  { type: Date, default: null },
      at_6h:  { type: Date, default: null },
      at_24h: { type: Date, default: null },
      at_72h: { type: Date, default: null },
      at_7d:  { type: Date, default: null },
    },

    // ── Named temporal snapshots ────────────────────────────────────────────
    // Each is an optional subdocument — missing ones mean "not captured yet".
    snapshot_1h:  { type: MetricPointSchema, default: null },
    snapshot_6h:  { type: MetricPointSchema, default: null },
    snapshot_24h: { type: MetricPointSchema, default: null },
    snapshot_72h: { type: MetricPointSchema, default: null },
    snapshot_7d:  { type: MetricPointSchema, default: null },
    final:        { type: MetricPointSchema, default: null },
  },
  { timestamps: true },
);

// Recompute CTR for every snapshot subdocument at validate time. This
// guarantees analytics queries never see stale or uninitialised CTR and
// the zero-views guard is enforced consistently.
// Sync hook — no `next` argument, no async — so validateSync() picks
// it up. Mongoose skips callback-style hooks on validateSync().
CampaignMetricsV2Schema.pre('validate', function normalizeSnapshots() {
  for (const field of SNAPSHOT_FIELDS) {
    if (this[field]) computeMetricPointCTR(this[field]);
  }
});

// ── Indexes ────────────────────────────────────────────────────────────────
// Unique on campaniaId so retries (Vercel timeout + re-invoke) can never
// create duplicate metrics documents.
CampaignMetricsV2Schema.index({ campaniaId: 1 }, { unique: true });

// Feeds the CAP component of the scoring engine — "all completed campaigns
// for this channel, newest first".
CampaignMetricsV2Schema.index({ canalId: 1, 'final.timestamp': -1 });

// Indexes powering the hourly snapshot capture cron. Each index backs a
// specific "snapshot due" query of the form
//   { 'snapshotSchedule.at_Xh': { $lte: now }, snapshot_Xh: null }
// so the cron never scans the whole collection.
CampaignMetricsV2Schema.index({ 'snapshotSchedule.at_1h':  1, snapshot_1h:  1 });
CampaignMetricsV2Schema.index({ 'snapshotSchedule.at_6h':  1, snapshot_6h:  1 });
CampaignMetricsV2Schema.index({ 'snapshotSchedule.at_24h': 1, snapshot_24h: 1 });
CampaignMetricsV2Schema.index({ 'snapshotSchedule.at_72h': 1, snapshot_72h: 1 });
CampaignMetricsV2Schema.index({ 'snapshotSchedule.at_7d':  1, snapshot_7d:  1 });

module.exports =
  mongoose.models.CampaignMetricsV2 ||
  mongoose.model('CampaignMetricsV2', CampaignMetricsV2Schema);

module.exports.FUENTE_DATOS_VALUES = FUENTE_DATOS_VALUES;
module.exports.TIPO_FLAG_VALUES = TIPO_FLAG_VALUES;
