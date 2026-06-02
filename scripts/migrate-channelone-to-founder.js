#!/usr/bin/env node
/**
 * Migrate the orphaned Channel One waitlist into the founding-cohort waitlist.
 *
 * WHY: Channel One was merged into the founding cohort (2026-06-02). The model
 * was renamed ChannelOneRegistration → FounderRegistration, which changes the
 * Mongo collection from `channeloneregistrations` → `founderregistrations`.
 * Any pre-launch signups in the old collection would otherwise be orphaned
 * (the public counter reads only the new collection). This copies them over.
 *
 * Schemas are identical, so docs are copied verbatim (preserving _id, tokens,
 * confirmed state, queuePosition, timestamps) — referral links keep working.
 *
 * SAFETY:
 *  - DRY-RUN by default. Pass --apply to write.
 *  - Idempotent: skips any source doc whose email OR referralToken already
 *    exists in the target, so re-runs never duplicate.
 *  - Never drops the source unless you ALSO pass --drop-old (after a successful
 *    --apply). Without it the old collection is left intact as a backup.
 *  - If the old collection doesn't exist, exits cleanly (nothing to do).
 *
 * USAGE:
 *   node scripts/migrate-channelone-to-founder.js              # dry-run
 *   node scripts/migrate-channelone-to-founder.js --apply      # copy docs
 *   node scripts/migrate-channelone-to-founder.js --apply --drop-old   # copy, then drop old
 */
require('dotenv').config();

const mongoose = require('mongoose');
const databaseConfig = require('../config/database');

const APPLY = process.argv.includes('--apply');
const DROP_OLD = process.argv.includes('--drop-old');

const SOURCE = 'channeloneregistrations';
const TARGET = 'founderregistrations';

async function collectionExists(db, name) {
  const found = await db.listCollections({ name }).toArray();
  return found.length > 0;
}

async function run() {
  await databaseConfig.conectar();
  const db = mongoose.connection.db;

  if (!(await collectionExists(db, SOURCE))) {
    console.log(`[migrate-c1] source collection "${SOURCE}" does not exist — nothing to migrate.`);
    await databaseConfig.desconectar();
    return;
  }

  const source = db.collection(SOURCE);
  const target = db.collection(TARGET);

  const sourceDocs = await source.find({}).toArray();
  console.log(`[migrate-c1] mode=${APPLY ? 'APPLY' : 'DRY-RUN'} — ${sourceDocs.length} doc(s) in "${SOURCE}"`);

  // Pre-load existing keys in the target so we can skip duplicates (the unique
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

  console.log('[migrate-c1] ' + JSON.stringify({
    sourceTotal: sourceDocs.length,
    alreadyInTarget: skipped,
    [APPLY ? 'inserted' : 'wouldInsert']: toInsert.length,
  }));
  if (samples.length) console.table(samples);

  if (APPLY && toInsert.length) {
    // ordered:false → one bad doc doesn't abort the rest; dup-key races are
    // caught and reported rather than thrown.
    try {
      const res = await target.insertMany(toInsert, { ordered: false });
      console.log(`[migrate-c1] inserted ${res.insertedCount} doc(s) into "${TARGET}".`);
    } catch (e) {
      const inserted = e?.result?.insertedCount ?? e?.insertedCount ?? 0;
      console.warn(`[migrate-c1] insertMany finished with ${inserted} inserted and some skipped (dup keys): ${e.message}`);
    }
  }

  if (APPLY && DROP_OLD) {
    await source.drop();
    console.log(`[migrate-c1] dropped source collection "${SOURCE}".`);
  } else if (!APPLY) {
    console.log('[migrate-c1] DRY-RUN only — re-run with --apply to write (add --drop-old to remove the old collection afterwards).');
  } else if (!DROP_OLD) {
    console.log(`[migrate-c1] source "${SOURCE}" left intact as a backup. Re-run with --drop-old once you have verified the target.`);
  }

  await databaseConfig.desconectar();
}

run().catch(async (error) => {
  console.error('[migrate-c1] error:', error);
  try { await databaseConfig.desconectar(); } catch { /* already down */ }
  process.exit(1);
});
