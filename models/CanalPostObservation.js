/**
 * CanalPostObservation
 *
 * One document per post observed in a WhatsApp Channel (newsletter).
 *
 * Provenance: populated by the Baileys real-time stream via
 * `subscribeNewsletterUpdates(jid)` + filtered `messages.upsert` handler.
 * Historical backfill is NOT possible on Baileys 7.0.0-rc.9 — its
 * `newsletterFetchMessages` IQ times out at 60s without returning parsed
 * messages (verified empirically by scripts/probe-channel-baileys.js).
 * Observation timeline therefore anchors at the moment of verification.
 *
 * Dedup primary key: (channelJid, serverId). The `key.server_id` field
 * surfaced by Baileys is a per-channel monotonically-increasing integer
 * (string in the wire format, stored here as Number). It's the only
 * stable identifier suitable for deduplicating across reconnects.
 *
 * NLP fields (lang, categories, sentiment, brandSafety…) are left empty
 * here and populated asynchronously by ContentIntelligenceService (Capa 2
 * Fase 3) — keep them in this same document to avoid joins at read time.
 *
 * Privacy: only newsletter posts addressed to channels we explicitly track
 * are persisted (filter at the worker level — see Capa 2 Fase 2 service).
 * Private chats, groups, and unrelated newsletters never touch this table.
 */

'use strict';

const mongoose = require('mongoose');

const LinkSchema = new mongoose.Schema(
  {
    url: { type: String, required: true },
    domain: { type: String, index: true },     // extracted host for fast aggregation
    title: { type: String, default: '' },      // OG title (Baileys: extendedTextMessage.title)
    description: { type: String, default: '' },// OG description
    previewType: { type: Number, default: 0 }, // 0=standard, others tbd from Baileys observations
  },
  { _id: false }
);

const MediaSchema = new mongoose.Schema(
  {
    // Common envelope across imageMessage / videoMessage / audioMessage /
    // documentMessage. Most fields are optional because Baileys' protobuf
    // surface differs per media kind.
    mimeType: String,
    directPath: String,        // signed URL — expires, do NOT store long-term as canonical
    sha256: String,            // base64 of media SHA256 — stable identifier
    fileLength: Number,        // bytes
    width: Number,             // image/video
    height: Number,
    duration: Number,          // audio/video, seconds
    pageCount: Number,         // document (PDF)
    caption: String,           // user-supplied caption (text under media)
    thumbnailB64: String,      // small inline JPEG preview (base64, no padding) — ~2KB typically
    thumbnailSha256: String,
  },
  { _id: false }
);

const PollOptionSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    optionHash: String,        // Baileys: pollCreationMessage uses option-name hashes for vote attribution
  },
  { _id: false }
);

const PollSchema = new mongoose.Schema(
  {
    name: String,
    options: { type: [PollOptionSchema], default: [] },
    selectableOptionsCount: { type: Number, default: 1 }, // 1 = single-choice, >1 = multi-select
  },
  { _id: false }
);

const ReactionSchema = new mongoose.Schema(
  {
    total: { type: Number, default: 0 },
    // Map<emoji, count>. Kept as Map (not array) to make {emoji: '🔥'} → count
    // lookups O(1) and to let Mongo $inc on individual emojis atomically.
    byEmoji: { type: Map, of: Number, default: () => new Map() },
    lastUpdate: Date,
  },
  { _id: false }
);

const NlpSchema = new mongoose.Schema(
  {
    lang: String,                      // 'es-ES', 'es-LATAM', 'en', ...
    categories: { type: [String], default: [] },
    sentiment: Number,                 // -1.0 to 1.0
    brandSafetyScore: Number,          // 0-100
    brandSafetyFlags: { type: [String], default: [] },
    isPromotional: { type: Boolean, default: null },
    promotionalSignals: { type: [String], default: [] },
    buyerIntent: Number,               // 0-100
    topicsKeywords: { type: [String], default: [] },
    enrichedAt: Date,                  // when ContentIntelligenceService processed this
    enrichmentVersion: { type: String, default: '' }, // model/version tag for reproducibility
  },
  { _id: false }
);

const CanalPostObservationSchema = new mongoose.Schema(
  {
    canalId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Canal',
      required: true,
      index: true,
    },
    channelJid: { type: String, required: true, index: true }, // 120363...@newsletter

    // ── Identity ─────────────────────────────────────────────────────────────
    messageId: { type: String, required: true }, // Baileys key.id — 22-char hex
    serverId: { type: Number, required: true },  // Baileys key.server_id — monotonic per channel

    // Other key fields surfaced verbatim for forensic inspection / replay
    addressingMode: { type: String, default: 'pn' }, // 'pn' for newsletters
    fromMe: { type: Boolean, default: false },
    participant: { type: String, default: '' }, // empty for channels (anonymous posts)

    // ── Time ────────────────────────────────────────────────────────────────
    publishedAt: { type: Date, required: true, index: true },
    observedAt: { type: Date, default: Date.now },
    source: {
      type: String,
      enum: ['realtime', 'history_sync', 'manual', 'replay'],
      default: 'realtime',
    },

    // ── Content discriminator + body ────────────────────────────────────────
    // 'text'  → extendedTextMessage or conversation
    // 'image' → imageMessage
    // 'video' → videoMessage
    // 'audio' → audioMessage (PTT or file)
    // 'document' → documentMessage (PDF, etc.)
    // 'poll'  → pollCreationMessage
    // 'sticker' → stickerMessage
    // 'forwarded' → any of above with isForwarded=true (we still set the
    //               underlying type in `type` and use `isForwarded` as a flag)
    // 'unknown' → schema didn't recognize the message variant; raw is kept
    type: {
      type: String,
      enum: ['text', 'image', 'video', 'audio', 'document', 'poll', 'sticker', 'unknown'],
      required: true,
      index: true,
    },

    body: { type: String, default: '' },     // text or caption — FULL, no truncation
    bodyLength: { type: Number, default: 0 },
    // SHA256 of normalized body (lowercase, trimmed, whitespace collapsed).
    // Used to detect identical content reposted across channels — strong
    // anti-fraud signal for content-farm detection (Capa 2 Fase 5).
    bodyHash: { type: String, index: true },

    // ── Discriminator-specific subdocuments (all sparse) ─────────────────────
    links: { type: [LinkSchema], default: [] },
    media: { type: MediaSchema, default: null },
    poll: { type: PollSchema, default: null },

    // ── Forwarding ──────────────────────────────────────────────────────────
    isForwarded: { type: Boolean, default: false, index: true },
    // Baileys' contextInfo.forwardingScore: integer count of how many times
    // this message has been forwarded. ≥5 marks it as "frequently forwarded"
    // in WhatsApp UI. Useful proxy for viral content.
    forwardingScore: { type: Number, default: 0 },

    // ── Reactions (updated by separate event, not on insert) ────────────────
    reactions: { type: ReactionSchema, default: () => ({}) },

    // ── NLP (filled async by ContentIntelligenceService — Fase 3) ───────────
    nlp: { type: NlpSchema, default: () => ({}) },

    // ── Raw Baileys envelope ────────────────────────────────────────────────
    // Full event payload for replay/debug. Mixed type. Purged by TTL after
    // 30 days to limit DB size and PII exposure (rawTtlExpiresAt index).
    raw: { type: mongoose.Schema.Types.Mixed, default: null },
    rawTtlExpiresAt: { type: Date, index: { expires: 0 } }, // mongo deletes when this date passes
  },
  {
    timestamps: true,
    strict: true,
    autoIndex: false, // operator runs scripts/migrate-canal-post-observation.js once
  }
);

// ─── Indexes ──────────────────────────────────────────────────────────────
// Primary dedup: same channel can't have two posts with the same serverId.
// We use serverId rather than messageId because messageId can drift across
// session resyncs while serverId is stable on the WhatsApp server side.
CanalPostObservationSchema.index(
  { channelJid: 1, serverId: 1 },
  { unique: true, name: 'channelJid_serverId_unique' }
);

// Timeline queries — "latest N posts of this canal"
CanalPostObservationSchema.index({ canalId: 1, publishedAt: -1 });

// Global timeline — admin dashboards
CanalPostObservationSchema.index({ publishedAt: -1 });

// Cross-channel content-farm detection: posts with identical body hash
// across multiple channels surface a "duplicate content" alert.
CanalPostObservationSchema.index({ bodyHash: 1, publishedAt: -1 });

// Type-filtered timeline (e.g. "all promotional posts in last 7 days")
CanalPostObservationSchema.index({ canalId: 1, type: 1, publishedAt: -1 });

// NLP backfill worker queue: find posts where nlp hasn't been enriched yet
CanalPostObservationSchema.index(
  { 'nlp.enrichedAt': 1 },
  { partialFilterExpression: { 'nlp.enrichedAt': { $exists: false } } }
);

module.exports = mongoose.model('CanalPostObservation', CanalPostObservationSchema);
