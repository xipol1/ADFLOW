const mongoose = require('mongoose');

const CampaignSchema = new mongoose.Schema(
  {
    advertiser: { type: mongoose.Schema.Types.ObjectId, ref: 'Usuario', required: true, index: true },
    channel: { type: mongoose.Schema.Types.ObjectId, ref: 'Canal', required: true, index: true },
    content: { type: String, required: true, trim: true },
    targetUrl: { type: String, required: true, trim: true },

    // ── Rich post payload (per-platform delivery contract) ───────────────
    // Format id is namespaced per platform (e.g. "text_image" on Telegram,
    // "embed" on Discord, "broadcast" on Instagram). Default 'text' keeps
    // legacy campaigns working — they're treated as plain text + URL by
    // the delivery service.
    format: { type: String, default: 'text' },
    // Optional media: image / video / document files attached to the post.
    // URLs deben ser públicas (típicamente Cloudflare R2 vía /api/uploads).
    media: [{
      _id: false,
      type: { type: String, enum: ['image', 'video', 'document'], required: true },
      url: { type: String, required: true, trim: true },
      caption: { type: String, default: '', trim: true },
    }],
    // Optional inline CTA buttons (Telegram primary use). Hasta 4 botones.
    buttons: [{
      _id: false,
      label: { type: String, required: true, trim: true, maxlength: 64 },
      url: { type: String, required: true, trim: true },
    }],
    // Optional Discord-style rich embed (title/desc/color/image/thumbnail).
    // Null significa "usa el embed por defecto" (comportamiento legacy).
    embed: {
      type: new mongoose.Schema({
        title: { type: String, default: '', trim: true },
        description: { type: String, default: '', trim: true },
        color: { type: String, default: '' },
        thumbnail: { type: String, default: '' },
        image: { type: String, default: '' },
      }, { _id: false }),
      default: null,
    },

    price: { type: Number, required: true },
    netAmount: { type: Number, default: 0 },
    // Real EUR captured at payment (price minus promo credits applied). Set by
    // payCampaign. creatorPayable = capturedAmount * (1 - commissionRate) is the
    // creator's withdrawable share — promo credits are a discount, never cash.
    // Null on legacy campaigns → payout falls back to netAmount (see
    // lib/creatorPayout.js). MUST stay declared or strict mode strips the value
    // on save and the proportional payout silently degrades to full-price.
    capturedAmount: { type: Number, default: null },
    creatorPayable: { type: Number, default: null },
    commissionRate: { type: Number, default: require('../config/commissions').DEFAULT_COMMISSION_RATE },
    // Pricing model:
    //   1 (legacy)  → commission DEDUCTED from price. `price` is the creator's
    //                 base; the creator received price*(1-rate).
    //   2 (current) → commission paid BY THE ADVERTISER (on top). `price` is the
    //                 advertiser gross (base*(1+rate)); the creator receives their
    //                 full listed price = price/(1+rate).
    // Snapshotted per campaign so historical payouts never shift when the model
    // changes. New campaigns are created with version 2.
    pricingVersion: { type: Number, default: 1 },
    status: {
      type: String,
      enum: ['DRAFT', 'PAID', 'PUBLISHED', 'COMPLETED', 'CANCELLED', 'EXPIRED', 'DISPUTED'],
      default: 'DRAFT',
      index: true
    },
    stripePaymentIntentId: { type: String, default: null, index: true },
    deadline: { type: Date, default: null },
    createdAt: { type: Date, default: Date.now, index: true },
    publishedAt: { type: Date, default: null },
    completedAt: { type: Date, default: null },
    cancelledAt: { type: Date, default: null },
    expiredAt: { type: Date, default: null },
    trackingUrl: { type: String, default: '' },
    trackingLinkId: { type: mongoose.Schema.Types.ObjectId, ref: 'TrackingLink', default: null },
    trackingLinkFormat: { type: String, enum: ['short', 'domain', 'custom'], default: 'domain' },
    trackingLinkSlug: { type: String, default: '' },
    partner: { type: mongoose.Schema.Types.ObjectId, ref: 'Partner', default: null, index: true },
    partnerExternalRef: { type: String, default: null },

    // Recordatorio 24h antes del deadline 48h. Lo marca el cron una sola
    // vez para no spamear si la campaña sigue en PAID muchas horas más.
    reminder24hSent: { type: Boolean, default: false, index: true },

    // Delivery tracking
    delivery: {
      status: { type: String, enum: ['pending', 'sent', 'failed', 'skipped'], default: 'pending' },
      platformResponse: { type: String, default: '' },
      platformMessageId: { type: String, default: '' },
      attempts: { type: Number, default: 0 },
      lastAttemptAt: { type: Date, default: null },
      deliveredAt: { type: Date, default: null },
      error: { type: String, default: '' },
    }
  },
  { timestamps: false }
);

// Always recompute netAmount on insert and whenever price or commissionRate
// changes. Belt-and-braces: legacy docs that bypassed this hook fall back to
// the controller-level resolveNetAmount helper.
CampaignSchema.pre('save', function (next) {
  if (this.isNew || this.isModified('price') || this.isModified('commissionRate')) {
    const rate = Number.isFinite(this.commissionRate) ? this.commissionRate : 0.20;
    // v2 (advertiser-paid): price is the gross the advertiser pays; the creator
    // receives their full listed price = price / (1 + rate).
    // v1 (legacy): commission was deducted → netAmount = price * (1 - rate).
    this.netAmount = this.pricingVersion >= 2
      ? +(this.price / (1 + rate)).toFixed(2)
      : +(this.price * (1 - rate)).toFixed(2);
  }
  next();
});

module.exports = mongoose.models.Campaign || mongoose.model('Campaign', CampaignSchema);
