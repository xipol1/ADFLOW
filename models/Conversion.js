const mongoose = require('mongoose');

/**
 * Conversion — closed-loop tracking event from the advertiser's site.
 *
 * Flow:
 *   1. User clicks tracking link → trackingController generates a unique
 *      `clickId`, stores it on the TrackingLink.clicks[] sub-doc, sets a
 *      `_chad_cid` cookie on the user's browser, and appends `?cid=<clickId>`
 *      to the destination URL.
 *
 *   2. User completes a goal on the advertiser's site (purchase, signup, …).
 *      The advertiser pings POST /api/conversions (server-to-server with
 *      apiKey) or GET /api/track/conversion?cid=...&value=... (pixel) to
 *      register a Conversion document.
 *
 *   3. roiService.computeCampaignROI(campaignId) joins Conversions to
 *      Campaigns via campaignId / clickId and produces real revenue + ROI.
 *
 * Indexes:
 *   - clickId (sparse unique-ish): primary attribution lookup
 *   - campaign + createdAt: for "conversions in last N days" queries
 *   - createdAt: TTL-style cleanup if we ever want to age out
 */

const ConversionSchema = new mongoose.Schema(
  {
    // ── Attribution ──────────────────────────────────────────────────────
    // The click that led to this conversion. May be null if the conversion
    // was reported without a clickId (e.g. server fallback, fingerprint match).
    clickId: { type: String, default: null, index: true },

    // Direct ref to campaign — required so we can compute ROI even when
    // the click record has rolled out of the TrackingLink.clicks[] array.
    campaign: { type: mongoose.Schema.Types.ObjectId, ref: 'Campaign', required: true, index: true },

    // The advertiser who owns the campaign (denormalised for fast filtering).
    advertiser: { type: mongoose.Schema.Types.ObjectId, ref: 'Usuario', required: true, index: true },

    // ── Event data ──────────────────────────────────────────────────────
    type: {
      type: String,
      enum: ['purchase', 'signup', 'lead', 'subscription', 'install', 'custom'],
      default: 'custom',
      index: true,
    },
    value:    { type: Number, default: 0 },           // monetary value of the conversion
    currency: { type: String, default: 'EUR' },
    quantity: { type: Number, default: 1 },           // for purchases of >1 item

    // Optional advertiser-supplied identifiers (deduplication, idempotency)
    externalId: { type: String, default: null, index: true }, // e.g. order_id

    // ── Source + integrity ──────────────────────────────────────────────
    source: { type: String, enum: ['server', 'pixel', 'manual', 'webhook'], default: 'server' },
    ip:        { type: String, default: '' },
    userAgent: { type: String, default: '' },
    referer:   { type: String, default: '' },

    // Free-form metadata: product names, customer email hash, etc.
    metadata: { type: mongoose.Schema.Types.Mixed, default: {} },

    // ── Lifecycle ───────────────────────────────────────────────────────
    // For tracking refunds / chargebacks. We never delete records; we
    // mark them refunded so historical reports stay reproducible.
    status: {
      type: String,
      enum: ['confirmed', 'pending', 'refunded', 'cancelled', 'fraud'],
      default: 'confirmed',
      index: true,
    },
    refundedAt:    { type: Date, default: null },
    refundedValue: { type: Number, default: 0 },
  },
  { timestamps: true }
);

// Idempotency: an advertiser shouldn't be able to submit the same externalId
// twice for the same campaign and accidentally double-count revenue.
ConversionSchema.index(
  { campaign: 1, externalId: 1 },
  { unique: true, sparse: true, partialFilterExpression: { externalId: { $type: 'string' } } }
);
ConversionSchema.index({ campaign: 1, createdAt: -1 });

module.exports = mongoose.models.Conversion || mongoose.model('Conversion', ConversionSchema);
