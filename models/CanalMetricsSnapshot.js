/**
 * CanalMetricsSnapshot
 *
 * Periodic snapshot of a WhatsApp Channel's metadata. One document per
 * channel per tick. Time-series collection (requires MongoDB ≥ 5.0).
 *
 * Provenance: populated by ChannelMetricsCollector (Capa 2 Fase 2) calling
 * Baileys' `newsletterMetadata(jid, jid)` — which works reliably in
 * 7.0.0-rc.9 (verified) — and merging with `viewer_metadata` when present.
 *
 * What's NOT here:
 *   - Per-post counters (those live in CanalPostObservation).
 *   - Subscriber LIST (Baileys 7.0.0-rc.9 `newsletterSubscribers` is broken
 *     — throws "unexpected response structure". Only the aggregate count
 *     `thread_metadata.subscribers_count` is available.)
 *   - Admin LIST (only `viewer_metadata.role` is exposed for the current
 *     session; full admin list requires `newsletterAdminCount` which returns
 *     null in this Baileys version).
 *
 * Tick frequency is set by the BullMQ scheduler (Capa 2 Fase 2) based on
 * Canal.metricsIntelligence.pollPriority. Snapshots are append-only.
 *
 * Field naming follows Baileys' `thread_metadata` shape verbatim (snake_case
 * surfaces as we receive them) to keep replay/forensics simple. Numeric
 * values that arrive as STRING from Baileys (subscribersCount, etc.) are
 * stored as Number here — conversion happens at the collector boundary.
 */

'use strict';

const mongoose = require('mongoose');

const CanalMetricsSnapshotSchema = new mongoose.Schema(
  {
    // Time-series timeField — MUST be the field name passed to timeseries config.
    timestamp: { type: Date, required: true, default: Date.now },

    // Time-series metaField — used by MongoDB to bucket documents on disk.
    // We pick channelJid (string, stable) rather than canalId (ObjectId) because
    // it's the natural partition key for the worker subscribing per channel.
    channelJid: { type: String, required: true },

    canalId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Canal',
      required: true,
    },

    source: {
      type: String,
      enum: ['passive_poll', 'realtime_metadata_update', 'manual'],
      default: 'passive_poll',
    },

    // ── Counts (numbers, not strings — converted at collector boundary) ─────
    subscribersCount: { type: Number, default: 0 },
    adminCount: { type: Number, default: null }, // may be null when Baileys returns null

    // ── Metadata snapshot ────────────────────────────────────────────────────
    name: { type: String, default: '' },
    nameUpdateTime: { type: String, default: '' },  // Baileys timestamp string — opaque, used to detect renames
    description: { type: String, default: '' },
    descriptionUpdateTime: { type: String, default: '' },
    handle: { type: String, default: null },        // public @handle, null if channel has none
    verification: { type: String, default: 'UNVERIFIED' }, // 'UNVERIFIED' | 'VERIFIED'

    // Picture/preview IDs — change of `pictureId` implies the channel updated
    // its avatar. We don't store the bytes, only the ID for change detection.
    pictureId: { type: String, default: '' },
    previewId: { type: String, default: '' },

    // Channel-level setting that gates reactions:
    //   'ALL'   → any emoji
    //   'BASIC' → restricted set (👍 ❤️ 😂 😮 😢 🙏 — to verify empirically)
    //   'NONE'  → reactions disabled
    reactionCodesSetting: { type: String, default: 'ALL' },

    // ── Viewer-perspective fields (this Baileys session's role) ─────────────
    // Only present when we have admin/subscriber access. For passive polls
    // against canals where the session isn't subscribed, leave as null.
    viewerRole: {
      type: String,
      enum: ['ADMIN', 'OWNER', 'SUBSCRIBER', null],
      default: null,
    },
    viewerMute: {
      type: String,
      enum: ['ON', 'OFF', null],
      default: null,
    },

    // ── Operational status of this poll ─────────────────────────────────────
    pollStatus: {
      type: String,
      enum: ['ok', 'no_session', 'not_admin', 'metadata_failed', 'error'],
      default: 'ok',
    },
    pollErrorMessage: { type: String, default: '' },
    pollDurationMs: { type: Number, default: 0 },
  },
  {
    timestamps: false, // time-series collections manage their own time
    strict: true,
    autoIndex: false,
    // ── Time-series config (MongoDB ≥ 5.0) ────────────────────────────────
    // `granularity: 'hours'` optimizes for buckets up to a few hours wide.
    // Acceptable polling cadences range from 2h (high-priority canals) to
    // 7d (cold canals) — hours granularity covers the full range without
    // forcing operators into per-canal tuning. See:
    // https://www.mongodb.com/docs/manual/core/timeseries-collections/
    timeseries: {
      timeField: 'timestamp',
      metaField: 'channelJid',
      granularity: 'hours',
    },
    // Auto-expire snapshots older than 1 year. Adjust here when Capa 2 Fase 4
    // (intelligence aggregation) starts persisting long-term rollups.
    expireAfterSeconds: 31536000,
  }
);

// Secondary indexes for common queries. Time-series collections automatically
// index (metaField, timeField) — we only add ones for non-time queries.
CanalMetricsSnapshotSchema.index({ canalId: 1, timestamp: -1 });

module.exports = mongoose.model('CanalMetricsSnapshot', CanalMetricsSnapshotSchema);
