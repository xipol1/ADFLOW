const mongoose = require('mongoose');

const DisputeSchema = new mongoose.Schema(
  {
    campaign: { type: mongoose.Schema.Types.ObjectId, ref: 'Campaign', required: true, index: true },
    openedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Usuario', required: true, index: true },
    againstUser: { type: mongoose.Schema.Types.ObjectId, ref: 'Usuario', required: true, index: true },
    reason: {
      type: String,
      enum: ['not_published', 'wrong_content', 'late_delivery', 'fraud', 'other'],
      required: true
    },
    description: { type: String, required: true, trim: true, maxlength: 2000 },
    status: {
      type: String,
      enum: ['open', 'under_review', 'resolved_advertiser', 'resolved_creator', 'closed'],
      default: 'open',
      index: true
    },
    resolution: { type: String, default: null, trim: true },
    resolvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Usuario', default: null },
    resolvedAt: { type: Date, default: null },
    messages: [
      {
        sender: { type: mongoose.Schema.Types.ObjectId, ref: 'Usuario', required: true },
        text: { type: String, required: true, trim: true },
        createdAt: { type: Date, default: Date.now }
      }
    ]
  },
  { timestamps: true }
);

module.exports = mongoose.models.Dispute || mongoose.model('Dispute', DisputeSchema);
