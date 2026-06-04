/**
 * Shared one-off cleanup: re-derive a clean display name for every Canal whose
 * nombreCanal was poisoned with leaked markup / a bare URL / an image filename
 * (see lib/channelName.js for the historical cause). Used by both the CLI
 * script (scripts/migrate-clean-channel-names.js) and the admin endpoint
 * (POST /api/channels/admin/clean-names).
 *
 * Idempotent: only writes when the sanitised name actually differs, so re-runs
 * are no-ops once the data is clean. DRY-RUN by default.
 */

const { sanitizeChannelName } = require('./channelName');

// Matches the polluted patterns at the DB level so we never scan the whole
// collection: leaked markup ("<" or ">"), a bare URL, or an image filename.
// sanitizeChannelName() is the real decider — this query just narrows the set.
const POLLUTED_QUERY = {
  $or: [
    { nombreCanal: { $regex: '[<>]' } },
    { nombreCanal: { $regex: '^https?://', $options: 'i' } },
    { nombreCanal: { $regex: '\\.(?:avif|png|jpe?g|webp|svg|gif)$', $options: 'i' } },
  ],
};

/**
 * @param {object} [opts]
 *   apply  — false (default) = dry-run (counts only); true = persist updates.
 *   Canal  — Mongoose model (defaults to require('../models/Canal')); injectable for tests.
 * @returns {Promise<object>} summary { matched, fixed|wouldFix, unchanged, applied, samples }
 */
async function cleanChannelNames({ apply = false, Canal } = {}) {
  const Model = Canal || require('../models/Canal');

  const docs = await Model.find(POLLUTED_QUERY)
    .select('_id nombreCanal identificadorCanal plataforma')
    .lean();

  let changed = 0;
  let unchanged = 0;
  const samples = [];
  const ops = [];

  for (const doc of docs) {
    const clean = sanitizeChannelName(doc.nombreCanal, doc.identificadorCanal);
    if (clean === (doc.nombreCanal || '')) {
      unchanged++;
      continue;
    }
    changed++;
    if (samples.length < 20) {
      samples.push({
        id: String(doc._id),
        plataforma: doc.plataforma,
        from: (doc.nombreCanal || '').slice(0, 60),
        to: clean,
      });
    }
    if (apply) {
      ops.push({ updateOne: { filter: { _id: doc._id }, update: { $set: { nombreCanal: clean } } } });
    }
  }

  let fixed = 0;
  if (apply && ops.length) {
    const res = await Model.bulkWrite(ops, { ordered: false });
    fixed = res.modifiedCount ?? res.nModified ?? ops.length;
  }

  return {
    matched: docs.length,
    [apply ? 'fixed' : 'wouldFix']: apply ? fixed : changed,
    unchanged,
    applied: apply,
    samples,
  };
}

module.exports = { cleanChannelNames, POLLUTED_QUERY };
