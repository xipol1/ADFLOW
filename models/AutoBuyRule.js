const mongoose = require('mongoose');

const AutoBuyRuleSchema = new mongoose.Schema(
  {
    advertiser: { type: mongoose.Schema.Types.ObjectId, ref: 'Usuario', required: true, index: true },
    name: { type: String, required: true, trim: true },
    active: { type: Boolean, default: true },
    // Targeting criteria
    channels: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Canal' }],
    list: { type: mongoose.Schema.Types.ObjectId, ref: 'UserList', default: null },
    platforms: [{ type: String }],
    categories: [{ type: String }],
    // Budget
    maxPricePerPost: { type: Number, default: 500 },
    dailyBudget: { type: Number, default: 1000 },
    totalBudget: { type: Number, default: 5000 },
    totalSpent: { type: Number, default: 0 },
    // Content template
    content: { type: String, default: '', trim: true },
    targetUrl: { type: String, default: '', trim: true },
    // Stats
    campaignsCreated: { type: Number, default: 0 },
    lastTriggeredAt: { type: Date, default: null }
  },
  { timestamps: true }
);

module.exports = mongoose.models.AutoBuyRule || mongoose.model('AutoBuyRule', AutoBuyRuleSchema);
