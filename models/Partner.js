const mongoose = require('mongoose');

const PartnerSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    slug: { type: String, required: true, trim: true, unique: true, lowercase: true },
    apiKeyHash: { type: String, required: true, index: true },
    apiKeyHint: { type: String, default: '' },
    status: { type: String, enum: ['active', 'suspended', 'revoked'], default: 'active', index: true },
    allowedIps: [{ type: String }],
    rateLimitPerMinute: { type: Number, default: 60 },
    commissionOverride: { type: Number, default: null },
    webhookUrl: { type: String, default: '', trim: true },
    webhookSecret: { type: String, default: '' },
    contactEmail: { type: String, default: '', trim: true },
    description: { type: String, default: '', trim: true },
    expiresAt: { type: Date, default: null },
    lastUsedAt: { type: Date, default: null },
    lastIp: { type: String, default: '' },
    metadata: { type: mongoose.Schema.Types.Mixed, default: {} }
  },
  { timestamps: true }
);

module.exports = mongoose.models.Partner || mongoose.model('Partner', PartnerSchema);
