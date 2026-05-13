/**
 * CanalIntelligence
 *
 * Capa 2 Fase 4 — one document per Canal containing all derived intelligence
 * metrics + the computed ChannelScore. Updated periodically by
 * CanalIntelligenceService (typically every 6h, plus opportunistically
 * after each successful metadata poll).
 *
 * Source data: CanalMetricsSnapshot (time-series of subscribersCount +
 * metadata) and CanalPostObservation (posts with type, reactions, nlp).
 * This collection is a denormalized read model — recompute is idempotent
 * and the source of truth lives elsewhere.
 *
 * Field groups follow the original Fase 4 spec:
 *   - cadence    : posting frequency + temporal pattern
 *   - growth     : subscriber count derivatives
 *   - engagement : reactions per post + decay
 *   - contentMix : type/lang/category distribution
 *   - trust      : brand safety + bot suspicion
 *   - score      : ChannelScore output (confianzaScore + inventoryTier + price range)
 *
 * `null` is used for "unknown / insufficient data" everywhere — never
 * default to 0, because 0 reads as "we computed and it's zero" which is
 * a different semantic.
 */

'use strict';

const mongoose = require('mongoose');

const HourOfDayDistSchema = new mongoose.Schema(
  {
    hour: { type: Number, required: true, min: 0, max: 23 },
    count: { type: Number, required: true, min: 0 },
  },
  { _id: false }
);

const CategoryShareSchema = new mongoose.Schema(
  {
    category: { type: String, required: true },
    share: { type: Number, required: true, min: 0, max: 1 },
  },
  { _id: false }
);

const CanalIntelligenceSchema = new mongoose.Schema(
  {
    canalId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Canal',
      required: true,
      unique: true, // one intelligence doc per canal — recompute = upsert
      index: true,
    },
    channelJid: { type: String, required: true, index: true },

    computedAt: { type: Date, default: Date.now, index: true },
    sampleWindowDays: { type: Number, default: 30 },
    // Counts of input data behind this snapshot — useful to see WHY a
    // canal might be missing certain metrics (e.g. 0 snapshots → no growth).
    inputCounts: {
      snapshots30d: { type: Number, default: 0 },
      snapshots90d: { type: Number, default: 0 },
      posts30d: { type: Number, default: 0 },
      posts90d: { type: Number, default: 0 },
    },

    // ── Cadence ─────────────────────────────────────────────────────────────
    cadence: {
      postsPerWeekAvg30d: { type: Number, default: null },
      postsPerWeekAvg90d: { type: Number, default: null },
      // 1 - (normalised variance of inter-post intervals). Higher = more
      // regular cadence. null when <3 posts (no meaningful intervals).
      postingConsistencyScore: { type: Number, default: null, min: 0, max: 1 },
      lastPostRecencyHours: { type: Number, default: null },
      mostActiveHourOfDay: { type: Number, default: null, min: 0, max: 23 },
      // ISO day of week — 1=Mon..7=Sun (Mongo $dayOfWeek convention).
      mostActiveDow: { type: Number, default: null, min: 1, max: 7 },
      // Full hourly distribution for charting (24 entries)
      hourOfDayDistribution: { type: [HourOfDayDistSchema], default: [] },
    },

    // ── Growth ──────────────────────────────────────────────────────────────
    growth: {
      followersStart30d: { type: Number, default: null },
      followersCurrent: { type: Number, default: null },
      followerGrowthRate7d: { type: Number, default: null },   // relative (0.05 = +5%)
      followerGrowthRate30d: { type: Number, default: null },
      followerGrowthRate90d: { type: Number, default: null },
      // Second derivative — positive means growth is accelerating.
      growthAcceleration: { type: Number, default: null },
      // (followersGained_30d) / (posts_30d). null when posts_30d = 0.
      followersPerPost30d: { type: Number, default: null },
    },

    // ── Engagement ──────────────────────────────────────────────────────────
    engagement: {
      reactionsPerPostAvg30d: { type: Number, default: null },
      // reactions / followers / posts. null when followers or posts = 0.
      engagementRate30d: { type: Number, default: null },
      // Slope of reactions-vs-age in the last 30d posts. 0 = no decay
      // signal, positive = newer posts get more reactions (healthy),
      // negative = engagement falling. Normalised to [-1, 1].
      engagementDecayScore: { type: Number, default: null },
      topPostReactions: { type: Number, default: null },
      topPostId: { type: mongoose.Schema.Types.ObjectId, ref: 'CanalPostObservation', default: null },
    },

    // ── Content mix ─────────────────────────────────────────────────────────
    contentMix: {
      mediaRichnessScore: { type: Number, default: null, min: 0, max: 1 },
      linkDensity: { type: Number, default: null, min: 0, max: 1 },
      repostRatio: { type: Number, default: null, min: 0, max: 1 },
      // 1 - (duplicate bodyHashes / total). Lower = lots of repeated text.
      uniqueContentRatio: { type: Number, default: null, min: 0, max: 1 },
      promotionalRatio30d: { type: Number, default: null, min: 0, max: 1 },
      dominantCategories: { type: [CategoryShareSchema], default: [] },
      // 1 - Shannon entropy / log2(N). Higher = more focused on few categories.
      categoryCoherenceScore: { type: Number, default: null, min: 0, max: 1 },
      langPrimary: { type: String, default: 'unknown' },
      // Map<lang, share> — e.g. { es: 0.85, en: 0.15 }
      langMix: { type: Map, of: Number, default: () => new Map() },
    },

    // ── Trust ───────────────────────────────────────────────────────────────
    trust: {
      brandSafetyScoreAvg: { type: Number, default: null, min: 0, max: 100 },
      // Map<flag, count> — aggregated across all enriched posts in window.
      brandSafetyFlagsAggregate: { type: Map, of: Number, default: () => new Map() },
      // 0..1 estimate of "this looks bot-driven, not human": posting 24/7
      // without gaps + extreme cadence + low unique content. Higher = more
      // suspicious.
      botAdminSuspicionScore: { type: Number, default: null, min: 0, max: 1 },
    },

    // ── ChannelScore output ─────────────────────────────────────────────────
    score: {
      confianzaScore: { type: Number, default: null, min: 0, max: 100 },
      inventoryTier: { type: String, enum: ['S', 'A', 'B', 'C', null], default: null },
      // Price suggestion range in EUR per published post — informs admin
      // dashboards. NOT auto-applied to listings.
      priceFloorEUR: { type: Number, default: null, min: 0 },
      priceCeilingEUR: { type: Number, default: null, min: 0 },
      // Snapshot of the weights used at compute time. Lets us recompute
      // historical scores deterministically when the formula changes.
      formulaVersion: { type: String, default: '' },
      // Per-component scores [0..1] — useful for explaining the final score.
      components: {
        cadence: { type: Number, default: null, min: 0, max: 1 },
        growth: { type: Number, default: null, min: 0, max: 1 },
        engagement: { type: Number, default: null, min: 0, max: 1 },
        contentQuality: { type: Number, default: null, min: 0, max: 1 },
        trust: { type: Number, default: null, min: 0, max: 1 },
      },
    },
  },
  {
    timestamps: true,
    strict: true,
    autoIndex: false,
  }
);

CanalIntelligenceSchema.index({ 'score.inventoryTier': 1, 'score.confianzaScore': -1 });
CanalIntelligenceSchema.index({ computedAt: -1 });

module.exports = mongoose.model('CanalIntelligence', CanalIntelligenceSchema);
