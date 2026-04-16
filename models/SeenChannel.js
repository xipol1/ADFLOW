/**
 * SeenChannel — TTL-indexed cache of channels processed by massive-seed
 * that did NOT end up saved to ChannelCandidate.
 *
 * Purpose: stop re-processing the same failed/filtered channels on every
 * run. ChannelCandidate already blocks dupes for SAVED channels, but every
 * run also re-spends MTProto quota on channels that errored, FloodWait'd,
 * or failed the MIN_SUBSCRIBERS filter. This cache short-circuits Phase 3
 * for those channels until the TTL expires.
 *
 * Different reasons have different retry horizons, all enforced via a
 * `retryAfter` field + TTL index that deletes the doc once its window
 * expires. After deletion, the channel becomes eligible for re-processing
 * on the next run (in case its state changed — new subscribers, resurrected
 * username, etc.).
 */

const mongoose = require('mongoose');

const SeenChannelSchema = new mongoose.Schema(
  {
    username: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
      index: true,
    },

    // Why this channel was NOT saved. Determines the retry horizon.
    reason: {
      type: String,
      required: true,
      enum: [
        'filtered-low-subs', // < MIN_SUBSCRIBERS at scrape time
        'floodwait', // MTProto rate limit
        'username-invalid', // USERNAME_INVALID / "No user has" from GramJS
        'not-viewable', // t.me HTTP check rejected
        'error-transient', // network/other transient error
        'unscrapable', // private/restricted channel
      ],
      index: true,
    },

    source: {
      type: String,
      default: 'unknown',
      // Phase 3 source: keyword | lyzem | social_graph | manual
    },

    // When this channel first went into the cache.
    seenAt: {
      type: Date,
      default: Date.now,
    },

    // Hint metadata at time of seeing (for debugging)
    lastKnownSubs: { type: Number, default: null },
    lastError: { type: String, default: '' },

    // TTL anchor: document auto-deletes when current time > retryAfter.
    // Mongoose TTL indexes use `expires: 0` on a Date field; when the field
    // is < now, the doc is deleted by Mongo's background sweep.
    retryAfter: {
      type: Date,
      required: true,
    },
  },
  {
    timestamps: true,
  },
);

// Auto-delete once retryAfter is in the past
SeenChannelSchema.index({ retryAfter: 1 }, { expireAfterSeconds: 0 });

// Compound index for analytics queries (reason + seenAt)
SeenChannelSchema.index({ reason: 1, seenAt: -1 });

// ── Retry-horizon helpers ─────────────────────────────────────────────
// Different reasons justify different retry windows. A transient error
// should be retried soon, while a dead username can wait much longer.
const RETRY_HORIZON_DAYS = {
  'filtered-low-subs': 30, // small channels can grow — recheck in a month
  floodwait: 1, // rate limit clears after a day
  'username-invalid': 90, // dead/deleted — rare to come back
  'not-viewable': 90, // t.me 404 — usually permanent
  'error-transient': 1, // network blip — retry tomorrow
  unscrapable: 60, // might become public later
};

SeenChannelSchema.statics.computeRetryAfter = function (reason) {
  const days = RETRY_HORIZON_DAYS[reason] ?? 30;
  return new Date(Date.now() + days * 24 * 3600 * 1000);
};

SeenChannelSchema.statics.RETRY_HORIZON_DAYS = RETRY_HORIZON_DAYS;

module.exports =
  mongoose.models.SeenChannel || mongoose.model('SeenChannel', SeenChannelSchema);
