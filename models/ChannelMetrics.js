const mongoose = require('mongoose');

/**
 * ChannelMetrics — Tracks performance data per channel
 * Updated after each campaign completes or via platform connectors
 */
const ChannelMetricsSchema = new mongoose.Schema(
  {
    channel: { type: mongoose.Schema.Types.ObjectId, ref: 'Canal', required: true, index: true, unique: true },

    /* ── Attention metrics (from platform APIs) ── */
    viewsAvg: { type: Number, default: 0 },           // Average views per post
    engagementRate: { type: Number, default: 0 },      // 0-1 ratio
    scrollDepth: { type: Number, default: 0.5 },       // 0-1 ratio (how far users scroll/read)
    impressions30d: { type: Number, default: 0 },      // Total impressions last 30 days
    reachAvg: { type: Number, default: 0 },            // Average reach per post

    /* ── Performance metrics (from campaign results) ── */
    ctr: { type: Number, default: 0 },                 // Click-through rate (0-1)
    conversionRate: { type: Number, default: 0 },      // Conversion rate (0-1)
    totalCampaigns: { type: Number, default: 0 },
    completedCampaigns: { type: Number, default: 0 },
    avgCampaignRoi: { type: Number, default: 0 },

    /* ── Trust metrics ── */
    repeatRate: { type: Number, default: 0 },          // % of repeat advertisers (0-1)
    audienceQuality: { type: Number, default: 0.5 },   // Bot-free / real audience ratio (0-1)
    verifiedSince: { type: Date, default: null },
    disputes: { type: Number, default: 0 },
    refunds: { type: Number, default: 0 },

    /* ── Liquidity metrics ── */
    fillRate: { type: Number, default: 0 },            // Slots filled / slots available (0-1)
    avgResponseTime: { type: Number, default: 0 },     // Hours to respond
    publishOnTime: { type: Number, default: 0 },       // % published within deadline (0-1)

    /* ── Computed scores (updated by scoring engine) ── */
    scores: {
      attention: { type: Number, default: 0 },
      intent: { type: Number, default: 0 },
      trust: { type: Number, default: 0 },
      performance: { type: Number, default: 0 },
      liquidity: { type: Number, default: 0 },
      total: { type: Number, default: 0 },             // channel_score (0-100)
    },

    /* ── Dynamic pricing ── */
    recommendedPrice: { type: Number, default: 0 },    // Calculated by pricing engine
    priceHistory: [
      {
        price: Number,
        score: Number,
        date: { type: Date, default: Date.now },
      },
    ],

    /* ── Platform raw data (latest snapshot) ── */
    platformData: {
      followers: { type: Number, default: 0 },
      postsTotal: { type: Number, default: 0 },
      avgViewsPerPost: { type: Number, default: 0 },
      avgSharesPerPost: { type: Number, default: 0 },
      avgReactionsPerPost: { type: Number, default: 0 },
      growthRate30d: { type: Number, default: 0 },     // % growth last 30d
      lastFetched: { type: Date, default: null },
      raw: { type: mongoose.Schema.Types.Mixed, default: {} },
    },

    lastCalculated: { type: Date, default: null },
  },
  { timestamps: true }
);

module.exports = mongoose.models.ChannelMetrics || mongoose.model('ChannelMetrics', ChannelMetricsSchema);
