const mongoose = require('mongoose');

/**
 * TrackingFingerprint — out-of-document storage for the per-link click
 * deduplication set.
 *
 * Replaces TrackingLink._seenIps (a capped array on the parent doc that was
 * eventually going to bump into the 16 MB BSON limit on viral verification
 * links). Each row records the first time a given fingerprint was seen on
 * a given tracking link.
 *
 * Fingerprint is the SHA-1 (sliced to 20 hex chars) of
 * `${ip}::${ua}::${device}::${os}::${browser}` computed in the redirect
 * handler — same value previously stored in _seenIps.
 *
 * Atomic dedup pattern (used in app.js trackingRedirectHandler):
 *
 *   const doc = await TrackingFingerprint.findOneAndUpdate(
 *     { trackingLinkId, fingerprint },
 *     { $setOnInsert: { firstSeenAt: new Date() } },
 *     { upsert: true, new: false, setDefaultsOnInsert: true }
 *   );
 *   const isNew = !doc;  // null when row was inserted just now
 *
 * The unique compound index makes the upsert race-safe even under
 * concurrent clicks from the same fingerprint.
 */
const TrackingFingerprintSchema = new mongoose.Schema(
  {
    trackingLinkId: { type: mongoose.Schema.Types.ObjectId, ref: 'TrackingLink', required: true },
    fingerprint:    { type: String, required: true },
    firstSeenAt:    { type: Date, default: Date.now },
  },
  { timestamps: false }
);

// Race-safe dedup: the unique index is what makes the findOneAndUpdate
// upsert atomic — two concurrent inserts with the same (link, fingerprint)
// resolve to one row.
TrackingFingerprintSchema.index({ trackingLinkId: 1, fingerprint: 1 }, { unique: true });

// TTL housekeeping: tracking fingerprints older than 90 days are dropped
// automatically. Verification links live only 48h anyway and campaign
// links don't need lifetime dedup history.
TrackingFingerprintSchema.index({ firstSeenAt: 1 }, { expireAfterSeconds: 60 * 60 * 24 * 90 });

module.exports = mongoose.models.TrackingFingerprint
  || mongoose.model('TrackingFingerprint', TrackingFingerprintSchema);
