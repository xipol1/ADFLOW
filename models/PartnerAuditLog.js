const mongoose = require('mongoose');

const PartnerAuditLogSchema = new mongoose.Schema(
  {
    partner: { type: mongoose.Schema.Types.ObjectId, ref: 'Partner', required: true, index: true },
    action: { type: String, required: true, index: true },
    method: { type: String, default: '' },
    path: { type: String, default: '' },
    statusCode: { type: Number, default: 0 },
    ip: { type: String, default: '' },
    campaignId: { type: mongoose.Schema.Types.ObjectId, ref: 'Campaign', default: null },
    requestBody: { type: mongoose.Schema.Types.Mixed, default: null },
    metadata: { type: mongoose.Schema.Types.Mixed, default: {} },
    error: { type: String, default: null }
  },
  { timestamps: true }
);

PartnerAuditLogSchema.index({ createdAt: -1 });
PartnerAuditLogSchema.index({ partner: 1, action: 1 });

module.exports = mongoose.models.PartnerAuditLog || mongoose.model('PartnerAuditLog', PartnerAuditLogSchema);
