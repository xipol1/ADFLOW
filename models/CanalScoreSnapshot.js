/**
 * CanalScoreSnapshot — historical scoring snapshot for a Canal.
 *
 * One document is written per channel per day by the nightly scoring cron
 * (see services/cronService.js, Piece 6), plus an extra snapshot is
 * written immediately whenever a campaign transitions to COMPLETED.
 *
 * ──────────────────────────────────────────────────────────────────────────
 * RETENTION POLICY: snapshots are the permanent historical record. They
 * feed the temporal moat (CVS — Channel Velocity Score) and the future
 * auto-calibration of NICHE_BENCHMARKS. NEVER add a TTL index here.
 * ──────────────────────────────────────────────────────────────────────────
 *
 * Engine versioning: the `version` field records which scoring engine
 * generated the snapshot. When the engine evolves to v3.0 or beyond,
 * historical charts can filter by version so v1 / v2 scores are never
 * mixed together in the same series.
 */

const mongoose = require('mongoose');

const CanalScoreSnapshotSchema = new mongoose.Schema(
  {
    canalId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Canal',
      required: true,
    },
    fecha: { type: Date, default: Date.now, required: true },

    // ── Propietary scores (0-100) ──────────────────────────────────────────
    CAF: { type: Number, required: true, min: 0, max: 100 },
    CTF: { type: Number, required: true, min: 0, max: 100 },
    CER: { type: Number, required: true, min: 0, max: 100 },
    CVS: { type: Number, required: true, min: 0, max: 100 },
    CAP: { type: Number, required: true, min: 0, max: 100 },
    CAS: { type: Number, required: true, min: 0, max: 100 },

    nivel: {
      type: String,
      enum: ['BRONZE', 'SILVER', 'GOLD', 'ELITE'],
      required: true,
    },

    CPMDinamico:     { type: Number, default: 0 },
    confianzaScore:  { type: Number, default: 0, min: 0, max: 100 },
    ratioCTF_CAF:    { type: Number, default: null },
    flags:           { type: [String], default: [] },

    // ── Point-in-time channel state (NOT a reference to the Canal doc) ─────
    // These fields are snapshotted on write. When the channel grows from
    // 21K to 50K followers six months from now, today's snapshot must
    // still read 21K — that's the whole point of the temporal moat and
    // what feeds CVS (Channel Velocity Score). Do NOT turn these into
    // references or virtuals.
    seguidores: { type: Number, required: true, default: 0 },
    nicho:      { type: String, default: 'otros', index: true },
    plataforma: { type: String, default: '' },

    // ── Telegram MTProto intel (optional, written by telegramIntelService) ──
    telegramIntel: {
      avg_views_last_20_posts:  { type: Number, default: null },
      engagement_rate:          { type: Number, default: null },
      post_frequency_per_week:  { type: Number, default: null },
      views_trend:              { type: Number, default: null },
      last_post_date:           { type: Date,   default: null },
      verified:                 { type: Boolean, default: null },
    },

    // ── LinkedIn intel (optional, written by linkedinSyncService) ──────────
    // Shape depends on the canal type: creator profiles write {type:'creator',…}
    // with aggregate engagement from recent posts; organizations write
    // {type:'organization',…} with follower count + impression/engagement
    // statistics + page visit statistics from LinkedIn's Community Management API.
    //
    // All fields default to null so pre-LinkedIn snapshots and scope-restricted
    // syncs remain valid. Use `$ne: null` in queries to filter.
    linkedinIntel: {
      type:              { type: String, default: null }, // 'creator' | 'organization'
      personUrn:         { type: String, default: null },
      orgUrn:            { type: String, default: null },

      // ─── Creator aggregates (from syncCreatorCanal) ───────────────────
      // Engagement totals from the 10 most recent posts
      postCount:         { type: Number, default: null },
      totalLikes:        { type: Number, default: null },
      totalComments:     { type: Number, default: null },
      totalShares:       { type: Number, default: null },
      avgLikesPerPost:   { type: Number, default: null },
      avgCommentsPerPost:{ type: Number, default: null },

      // Creator follower count (new in 202504 — /rest/memberFollowersCount)
      memberFollowersCount:        { type: Number, default: null },
      memberFollowersGrowth7d:     { type: Number, default: null },
      memberFollowersGrowth30d:    { type: Number, default: null },

      // ─── Organization aggregates (from syncOrgCanal) ──────────────────
      // Total organic follower count (from /rest/networkSizes — fixed from
      // the deprecated totalFollowerCount field on organizationalEntityFollowerStatistics)
      followerCount:     { type: Number, default: null },

      // Lifetime share statistics (/rest/organizationalEntityShareStatistics)
      impressions:       { type: Number, default: null },
      clicks:            { type: Number, default: null },
      likes:             { type: Number, default: null },
      comments:          { type: Number, default: null },
      shares:            { type: Number, default: null },
      uniqueImpressions: { type: Number, default: null },
      engagementRate:    { type: Number, default: null },

      // ─── NEW: time-bound follower growth (feeds CVS) ──────────────────
      // Organic follower gain summed over the window (via time-bound
      // organizationalEntityFollowerStatistics in DAY granularity)
      followerGrowth7d:  { type: Number, default: null },
      followerGrowth30d: { type: Number, default: null },

      // ─── NEW: time-bound share statistics (feeds CAF velocity) ────────
      impressions7d:     { type: Number, default: null },
      impressions30d:    { type: Number, default: null },
      clicks7d:          { type: Number, default: null },
      clicks30d:         { type: Number, default: null },
      engagement7d:      { type: Number, default: null },
      engagement30d:     { type: Number, default: null },

      // ─── NEW: organization page visit statistics ─────────────────────
      // From /rest/organizationPageStatistics — measures traffic to the
      // company page itself, not to posts. Signal of brand awareness and
      // antifraud (high follower count + 0 page views = suspicious).
      pageViews: {
        allPageViews:          { type: Number, default: null },
        desktopPageViews:      { type: Number, default: null },
        mobilePageViews:       { type: Number, default: null },
        overviewPageViews:     { type: Number, default: null },
        careersPageViews:      { type: Number, default: null },
        jobsPageViews:         { type: Number, default: null },
        lifeAtPageViews:       { type: Number, default: null },
      },
      pageViews7d:       { type: Number, default: null },
      pageViews30d:      { type: Number, default: null },
      uniquePageViews30d:{ type: Number, default: null },

      // ─── Shared fields ────────────────────────────────────────────────
      postsPerWeek:      { type: Number, default: null },
      latestPostDate:    { type: Date,   default: null },

      // Scope-tolerance markers — set to true when the token is missing a
      // required scope and the corresponding metric could not be fetched.
      // Allows the scoring engine to downweight the signal and the admin
      // UI to prompt the user to reconnect.
      scopeMissing:              { type: Boolean, default: false },
      scopeMissingDetails: {
        memberFollowers: { type: Boolean, default: false },
        orgFollowers:    { type: Boolean, default: false },
        orgShares:       { type: Boolean, default: false },
        orgPageStats:    { type: Boolean, default: false },
      },
    },

    // ── Engine version ─────────────────────────────────────────────────────
    // Records which version of channelScoringV2 generated this snapshot.
    // When the engine evolves, historical queries can filter by version
    // to avoid mixing incompatible score definitions in the same chart.
    version: { type: Number, default: 2, required: true },
  },
  {
    timestamps: true,
    // Explicit: no auto-expire, no TTL, no capped collection.
    // Snapshots are kept forever.
  },
);

// ── Indexes ────────────────────────────────────────────────────────────────
// Historical chart for a single channel (most common query path).
CanalScoreSnapshotSchema.index({ canalId: 1, fecha: -1 });

// CRITICAL for NICHE_BENCHMARKS auto-calibration. Without this index a
// "snapshots of niche X in the last 30 days" query becomes a full scan
// once the collection grows past a few thousand documents.
CanalScoreSnapshotSchema.index({ nicho: 1, fecha: -1 });

// Global time-range queries (admin dashboards, fraud analytics).
CanalScoreSnapshotSchema.index({ fecha: -1 });

module.exports =
  mongoose.models.CanalScoreSnapshot ||
  mongoose.model('CanalScoreSnapshot', CanalScoreSnapshotSchema);
