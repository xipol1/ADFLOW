/**
 * ChannelCandidate — staging collection for discovered channels.
 *
 * Channels discovered via TGStat, Telemetr, social graph analysis, or
 * manual entry land here first. They NEVER go directly to the Canal
 * collection — an admin must approve each candidate first.
 *
 * Approval creates a Canal document and links it via canal_id.
 */

const mongoose = require('mongoose');

const ChannelCandidateSchema = new mongoose.Schema(
  {
    username: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
    },

    source: {
      type: String,
      required: true,
      enum: ['tgstat', 'telemetr', 'social_graph', 'manual'],
      index: true,
    },

    status: {
      type: String,
      default: 'pending_review',
      enum: ['pending_review', 'approved', 'rejected', 'duplicate'],
      index: true,
    },

    // All raw data from the discovery source, kept for audit/reprocessing
    raw_metrics: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },

    scraped_at: { type: Date, default: Date.now },
    reviewed_at: { type: Date, default: null },

    // Linked Canal document (set on approval)
    canal_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Canal',
      default: null,
    },

    rejection_reason: { type: String, default: '' },
  },
  {
    timestamps: true,
  },
);

// Compound indexes for admin listing queries
ChannelCandidateSchema.index({ source: 1, status: 1 });
ChannelCandidateSchema.index({ scraped_at: -1 });

module.exports =
  mongoose.models.ChannelCandidate ||
  mongoose.model('ChannelCandidate', ChannelCandidateSchema);
