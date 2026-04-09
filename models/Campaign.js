const mongoose = require('mongoose');

const CampaignSchema = new mongoose.Schema(
  {
    advertiser: { type: mongoose.Schema.Types.ObjectId, ref: 'Usuario', required: true, index: true },
    channel: { type: mongoose.Schema.Types.ObjectId, ref: 'Canal', required: true, index: true },
    content: { type: String, required: true, trim: true },
    targetUrl: { type: String, required: true, trim: true },
    price: { type: Number, required: true },
    netAmount: { type: Number, default: 0 },
    commissionRate: { type: Number, default: require('../config/commissions').DEFAULT_COMMISSION_RATE },
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
    partner: { type: mongoose.Schema.Types.ObjectId, ref: 'Partner', default: null, index: true },
    partnerExternalRef: { type: String, default: null },

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

CampaignSchema.pre('save', function (next) {
  if (this.isModified('price') || this.isModified('commissionRate')) {
    this.netAmount = +(this.price * (1 - this.commissionRate)).toFixed(2);
  }
  next();
});

module.exports = mongoose.models.Campaign || mongoose.model('Campaign', CampaignSchema);
