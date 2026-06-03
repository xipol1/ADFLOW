/**
 * Shared logic to migrate the orphaned Channel One waitlist into the founder
 * waitlist collection. Used by both the CLI script
 * (scripts/migrate-channelone-to-founder.js) and the admin endpoint
 * (POST /api/founder-waitlist/admin/migrate-legacy).
 *
 * Channel One was merged into the founding cohort (2026-06-02). The model
 * rename ChannelOneRegistration → FounderRegistration moves the Mongo
 * collection `channeloneregistrations` → `founderregistrations`. Any
 * pre-launch signups in the old collection would otherwise be orphaned.
 * Schemas are identical, so docs are copied verbatim (preserving _id, tokens,
 * confirmed state, queuePosition, timestamps) — referral links keep working.
 */

const SOURCE = 'channeloneregistrations';
const TARGET = 'founderregistrations';

async function collectionExists(db, name) {
  const found = await db.listCollections({ name }).toArray();
  return found.length > 0;
}

/**
 * Copy legacy waitlist signups into the founder waitlist collection.
 *
 * Idempotent: skips any source doc whose email OR referralToken already exists
 * in the target, so re-runs never duplicate.
 *
 * @param {import('mongodb').Db} db  native mongo db handle (mongoose.connection.db)
 * @param {{ apply?: boolean, dropOld?: boolean }} [opts]
 *   apply   — false (default) = dry-run (counts only); true = actually insert.
 *   dropOld — when applying, drop the source collection after a successful copy.
 * @returns {Promise<object>} summary { sourceExists, sourceTotal, alreadyInTarget,
 *   inserted|wouldInsert, dropped, applied, samples }
 */
async function migrateLegacyWaitlist(db, { apply = false, dropOld = false } = {}) {
  if (!db) throw new Error('No database handle provided to migrateLegacyWaitlist');

  if (!(await collectionExists(db, SOURCE))) {
    return {
      sourceExists: false,
      sourceTotal: 0,
      alreadyInTarget: 0,
      [apply ? 'inserted' : 'wouldInsert']: 0,
      dropped: false,
      applied: apply,
      samples: [],
    };
  }

  const source = db.collection(SOURCE);
  const target = db.collection(TARGET);

  const sourceDocs = await source.find({}).toArray();

  // Pre-load existing keys in the target so we skip duplicates (the unique
  // indexes on email + referralToken would otherwise reject the insert).
  const existing = await target.find({}, { projection: { email: 1, referralToken: 1 } }).toArray();
  const seenEmails = new Set(existing.map(d => (d.email || '').toLowerCase()));
  const seenTokens = new Set(existing.map(d => d.referralToken).filter(Boolean));

  const toInsert = [];
  let skipped = 0;
  const samples = [];

  for (const doc of sourceDocs) {
    const email = (doc.email || '').toLowerCase();
    if (seenEmails.has(email) || (doc.referralToken && seenTokens.has(doc.referralToken))) {
      skipped++;
      continue;
    }
    seenEmails.add(email);
    if (doc.referralToken) seenTokens.add(doc.referralToken);
    toInsert.push(doc); // verbatim — preserves _id, tokens, confirmed, queuePosition, timestamps
    if (samples.length < 12) {
      samples.push({ email, nicho: doc.nicho, confirmed: !!doc.confirmed, referralToken: doc.referralToken });
    }
  }

  let inserted = 0;
  if (apply && toInsert.length) {
    // ordered:false → one bad doc doesn't abort the rest; dup-key races are
    // tolerated (we count what actually went in).
    try {
      const res = await target.insertMany(toInsert, { ordered: false });
      inserted = res.insertedCount;
    } catch (e) {
      inserted = e?.result?.insertedCount ?? e?.insertedCount ?? 0;
    }
  }

  let dropped = false;
  if (apply && dropOld) {
    await source.drop();
    dropped = true;
  }

  return {
    sourceExists: true,
    sourceTotal: sourceDocs.length,
    alreadyInTarget: skipped,
    [apply ? 'inserted' : 'wouldInsert']: apply ? inserted : toInsert.length,
    dropped,
    applied: apply,
    samples,
  };
}

module.exports = { migrateLegacyWaitlist, SOURCE, TARGET };
