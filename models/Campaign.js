const mongoose = require('mongoose');

const CampaignSchema = new mongoose.Schema(
  {
    advertiser: { type: mongoose.Schema.Types.ObjectId, ref: 'Usuario', required: true, index: true },
    channel: { type: mongoose.Schema.Types.ObjectId, ref: 'Canal', required: true, index: true },
    content: { type: String, required: true, trim: true },
    targetUrl: { type: String, required: true, trim: true },
    price: { type: Number, required: true },
    status: {
      type: String,
      enum: ['DRAFT', 'PAID', 'PUBLISHED', 'COMPLETED', 'CANCELLED'],
      default: 'DRAFT',
      index: true
    },
    createdAt: { type: Date, default: Date.now, index: true },
    publishedAt: { type: Date, default: null },
    completedAt: { type: Date, default: null }
  },
  { timestamps: false }
);

module.exports = mongoose.models.Campaign || mongoose.model('Campaign', CampaignSchema);
