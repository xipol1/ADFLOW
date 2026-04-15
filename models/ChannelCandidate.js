/**
 * ChannelCandidate — staging collection for discovered channels.
 *
 * Channels discovered via TGStat, Telemetr, social graph analysis, newsletter
 * directories (Substack, ohmynewst, editorial lists), or manual entry land
 * here first. Most follow the pipeline: candidate → admin review → Canal.
 *
 * Newsletters follow a fast-track: they are created as unclaimed Canals
 * directly (for SEO / catalog volume) and this collection keeps the audit
 * trail with status='approved' and canal_id pointing to the created Canal.
 *
 * Username collision-safety: Telegram usernames are stored as-is. Newsletter
 * candidates prefix their username with "nl:" to avoid clashing with Telegram
 * usernames that happen to share the same slug (e.g. "sumapositiva").
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

    // Platform this candidate belongs to. Defaults to 'telegram' so existing
    // records keep working without a migration.
    plataforma: {
      type: String,
      default: 'telegram',
      lowercase: true,
      trim: true,
      index: true,
    },

    source: {
      type: String,
      required: true,
      enum: [
        // Telegram sources
        'tgstat',
        'telemetr',
        'lyzem',
        'social_graph',
        'manual',
        // Newsletter sources
        'substack_public_api',
        'substack_directory',
        'ohmynewst',
        'marketing4ecommerce',
        'autonewsletter_ai',
        'fleet_street',
        'editorial_seed',
        'linkedin_newsletters',
      ],
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
