const mongoose = require('mongoose');

/**
 * Sub-doc for content-edit suggestions.
 *
 * When a CampaignMessage has type='suggestion', the `suggestion` sub-doc
 * captures the proposed new ad text plus enough metadata to detect stale
 * suggestions (when the underlying Campaign.content has moved on) and to
 * accept/reject the suggestion idempotently.
 *
 * Statuses:
 *   pending     — awaiting the other party's decision
 *   accepted    — applied to Campaign.content
 *   rejected    — explicitly turned down
 *   superseded  — Campaign.content changed (via accept of a different
 *                 suggestion, or direct edit) so this one no longer
 *                 applies cleanly. Resolved automatically.
 */
const SuggestionSubSchema = new mongoose.Schema({
  // Full proposed replacement for Campaign.content
  proposedContent: { type: String, required: true, maxlength: 5000 },
  // The text the proposal was authored against — used to detect "superseded"
  // when the current content no longer matches.
  baseContent: { type: String, default: '' },
  // Score snapshot at the moment of proposal (for histórico). Both before
  // (the baseContent score) and after (the proposedContent score).
  score: {
    before: { type: Number, default: null },
    after: { type: Number, default: null },
  },
  // Resolution
  status: {
    type: String,
    enum: ['pending', 'accepted', 'rejected', 'superseded'],
    default: 'pending',
  },
  resolvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Usuario', default: null },
  resolvedAt: { type: Date, default: null },
  resolutionNote: { type: String, default: '', maxlength: 500 },
}, { _id: false });

const CampaignMessageSchema = new mongoose.Schema(
  {
    campaign: { type: mongoose.Schema.Types.ObjectId, ref: 'Campaign', required: true, index: true },
    sender: { type: mongoose.Schema.Types.ObjectId, ref: 'Usuario', required: true },
    senderRole: { type: String, enum: ['advertiser', 'creator'], required: true },
    text: { type: String, required: true, trim: true },
    type: { type: String, enum: ['message', 'brief', 'system', 'suggestion'], default: 'message' },

    // Populated only when type === 'suggestion'
    suggestion: { type: SuggestionSubSchema, default: null },
  },
  { timestamps: true }
);

CampaignMessageSchema.index({ campaign: 1, createdAt: 1 });
// Quick lookup of pending suggestions for a campaign
CampaignMessageSchema.index(
  { campaign: 1, type: 1, 'suggestion.status': 1 },
  { partialFilterExpression: { type: 'suggestion' } }
);

module.exports = mongoose.models.CampaignMessage || mongoose.model('CampaignMessage', CampaignMessageSchema);
