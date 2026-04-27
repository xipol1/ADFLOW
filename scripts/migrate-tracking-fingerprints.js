#!/usr/bin/env node
/**
 * Migrate TrackingLink._seenIps → TrackingFingerprint collection.
 *
 * The legacy schema stored every dedup fingerprint in an array on the
 * TrackingLink document, capped at 10 000 entries. Viral verification
 * links bumped against the cap and lost dedup data; popular ones risked
 * the 16 MB BSON limit (see AUDIT.md A-10). This script copies every
 * existing fingerprint into the new TrackingFingerprint collection and
 * (optionally) clears _seenIps from the source documents.
 *
 * Usage:
 *   node scripts/migrate-tracking-fingerprints.js                 # dry run
 *   node scripts/migrate-tracking-fingerprints.js --execute       # write
 *   node scripts/migrate-tracking-fingerprints.js --execute --prune
 *                                                                 # also clear _seenIps
 *
 * Idempotent: re-running it never duplicates rows because the
 * (trackingLinkId, fingerprint) compound index is unique. Failed inserts
 * (E11000 duplicates) are counted as "already migrated" and ignored.
 */

require('dotenv').config();
const mongoose = require('mongoose');

async function main() {
  const args = new Set(process.argv.slice(2));
  const execute = args.has('--execute');
  const prune = args.has('--prune');

  if (!process.env.MONGODB_URI) {
    console.error('MONGODB_URI not set');
    process.exit(1);
  }

  await mongoose.connect(process.env.MONGODB_URI);
  console.log('connected to mongo');

  const TrackingLink = require('../models/TrackingLink');
  const TrackingFingerprint = require('../models/TrackingFingerprint');

  const cursor = TrackingLink.find({ '_seenIps.0': { $exists: true } })
    .select('_id _seenIps')
    .cursor();

  let totalLinks = 0;
  let totalFingerprints = 0;
  let inserted = 0;
  let alreadyExisted = 0;
  let errors = 0;

  for await (const link of cursor) {
    totalLinks++;
    const seen = Array.isArray(link._seenIps) ? link._seenIps : [];
    totalFingerprints += seen.length;
    if (!execute) continue;

    // Bulk insert with ordered:false so a single duplicate doesn't abort
    // the rest. Duplicates are reported as writeErrors with code 11000.
    const docs = seen.map(fp => ({
      trackingLinkId: link._id,
      fingerprint: fp,
      firstSeenAt: new Date(),
    }));
    if (docs.length === 0) continue;

    try {
      const result = await TrackingFingerprint.insertMany(docs, { ordered: false });
      inserted += result.length;
    } catch (err) {
      // Mongoose batches mixed success+duplicate into err.insertedDocs +
      // err.writeErrors when ordered:false.
      const ok = err?.insertedDocs?.length || 0;
      const dups = (err?.writeErrors || []).filter(e => e.code === 11000).length;
      const other = (err?.writeErrors || []).length - dups;
      inserted += ok;
      alreadyExisted += dups;
      errors += other;
      if (other > 0) {
        console.warn(`link ${link._id}: ${other} write errors (non-duplicate):`,
          err.writeErrors.find(e => e.code !== 11000)?.errmsg);
      }
    }

    if (prune) {
      await TrackingLink.updateOne({ _id: link._id }, { $set: { _seenIps: [] } });
    }
  }

  console.log('---');
  console.log('TrackingLinks scanned:        ', totalLinks);
  console.log('Fingerprints in source:       ', totalFingerprints);
  if (execute) {
    console.log('Inserted into new collection: ', inserted);
    console.log('Already existed (duplicates): ', alreadyExisted);
    console.log('Other errors:                 ', errors);
    if (prune) console.log('Pruned _seenIps from sources: ', totalLinks);
  } else {
    console.log('(dry run — re-run with --execute to write)');
  }

  await mongoose.disconnect();
  process.exit(errors > 0 ? 1 : 0);
}

main().catch(err => {
  console.error('migration failed:', err);
  process.exit(1);
});
