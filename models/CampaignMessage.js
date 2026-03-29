const mongoose = require('mongoose');

const CampaignMessageSchema = new mongoose.Schema(
  {
    campaign: { type: mongoose.Schema.Types.ObjectId, ref: 'Campaign', required: true, index: true },
    sender: { type: mongoose.Schema.Types.ObjectId, ref: 'Usuario', required: true },
    senderRole: { type: String, enum: ['advertiser', 'creator'], required: true },
    text: { type: String, required: true, trim: true },
    type: { type: String, enum: ['message', 'brief', 'system'], default: 'message' }
  },
  { timestamps: true }
);

CampaignMessageSchema.index({ campaign: 1, createdAt: 1 });

module.exports = mongoose.models.CampaignMessage || mongoose.model('CampaignMessage', CampaignMessageSchema);
