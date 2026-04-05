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
    resolutionType: {
      type: String,
      enum: ['favor_advertiser', 'favor_creator', 'partial', 'closed_no_action', null],
      default: null
    },
    refundAmount: { type: Number, default: 0 },
    resolvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Usuario', default: null },
    resolvedAt: { type: Date, default: null },
    escalatedAt: { type: Date, default: null },
    adminNotes: { type: String, default: '' },
    timeline: [{
      type: { type: String, enum: ['opened', 'message', 'escalated', 'admin_note', 'resolved'], required: true },
      by: { type: mongoose.Schema.Types.ObjectId, ref: 'Usuario' },
      text: { type: String, default: '' },
      at: { type: Date, default: Date.now },
    }],
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
