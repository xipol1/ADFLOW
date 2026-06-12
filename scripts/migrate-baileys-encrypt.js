#!/usr/bin/env node
/**
 * One-time migration: encrypt at rest the WhatsApp session material
 * (creds + keys) stored in BaileysSession documents.
 *
 * WHY: those two fields are the user's full WhatsApp multi-device session.
 * They used to be stored as plaintext Mixed objects in Mongo — anyone with DB
 * access could hijack a creator's WhatsApp account. From now on authStore.js
 * encrypts them with AES-256-GCM (lib/encryption.js) and tags the doc
 * `encryptedVersion: 1`. This script upgrades the legacy plaintext docs.
 *
 * WHAT IT DOES, per BaileysSession with encryptedVersion != 1:
 *   creds (object|null) → encrypt(JSON.stringify(creds))   (null left as null)
 *   keys  (object)      → encrypt(JSON.stringify(keys))
 *   encryptedVersion    → 1
 * It uses the raw collection so Mongoose's Mixed→String hydration never
 * touches the legacy objects.
 *
 * SAFETY:
 *  - DRY-RUN by default. Pass --apply to write.
 *  - Idempotent: filter excludes encryptedVersion=1, and each field is skipped
 *    if it is already an encrypted string (guard by isEncrypted). Re-running
 *    never double-encrypts.
 *  - Requires ENCRYPTION_KEY (exactly 32 chars) and MONGODB_URI in the env —
 *    the SAME ENCRYPTION_KEY the Baileys host uses, or sessions won't decrypt.
 *
 * USAGE:
 *   node scripts/migrate-baileys-encrypt.js            # dry-run, prints scope
 *   node scripts/migrate-baileys-encrypt.js --apply    # writes
 *
 * NOTE on Atlas + SRV DNS: if MONGODB_URI is mongodb+srv:// and the SRV lookup
 * fails on your machine (it does on the dev box used for this repo against
 * Atlas), rewrite it to a direct mongodb:// URI with the shard A-records and
 * port 27017 before running.
 */

require('dotenv').config();

const mongoose = require('mongoose');
const { isEncrypted } = require('../lib/encryption');
const { encryptPayload, ENCRYPTED_VERSION } = require('../services/baileys/authStore');
const BaileysSession = require('../models/BaileysSession');

// Encrypt one creds/keys field unless it's absent or already an encrypted
// string. Returns { changed, value }.
function encryptField(value) {
  if (value === null || value === undefined) return { changed: false, value };
  if (typeof value === 'string' && isEncrypted(value)) return { changed: false, value };
  return { changed: true, value: encryptPayload(value) };
}

/**
 * Core migration. Operates on the already-connected Mongoose default
 * connection (so tests can drive it against mongodb-memory-server).
 *
 * @param {{ apply?: boolean, log?: (msg:string)=>void }} opts
 * @returns {Promise<{ total:number, migrated:number, skipped:number }>}
 */
async function migrateBaileysSessions({ apply = false, log = console.log } = {}) {
  // Raw collection — bypass Mongoose casting so legacy plaintext objects are
  // read exactly as stored.
  const collection = BaileysSession.collection;
  const filter = { encryptedVersion: { $ne: ENCRYPTED_VERSION } };

  const total = await collection.countDocuments(filter);
  log(`[migrate-baileys-encrypt] mode=${apply ? 'APPLY' : 'DRY-RUN'} — ${total} session(s) to encrypt`);

  const cursor = collection.find(filter);
  let migrated = 0;
  let skipped = 0;

  while (await cursor.hasNext()) {
    const doc = await cursor.next();
    const updates = { encryptedVersion: ENCRYPTED_VERSION };

    const creds = encryptField(doc.creds);
    if (creds.changed) updates.creds = creds.value;

    const keys = encryptField(doc.keys);
    if (keys.changed) updates.keys = keys.value;

    const fields = [creds.changed && 'creds', keys.changed && 'keys'].filter(Boolean).join('+') || 'tag-only';

    if (apply) {
      await collection.updateOne({ _id: doc._id }, { $set: updates });
      log(`  encrypted BaileysSession ${doc._id} (status=${doc.status}, fields=${fields})`);
    } else {
      log(`  would encrypt BaileysSession ${doc._id} (status=${doc.status}, fields=${fields})`);
    }
    // Every doc that matched the filter is upgraded to encryptedVersion 1.
    migrated++;
  }

  log(`\n[migrate-baileys-encrypt] ${apply ? 'migrated' : 'would migrate'}: ${migrated}, skipped: ${skipped}`);
  return { total, migrated, skipped };
}

async function main() {
  const apply = process.argv.includes('--apply');

  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.error('MONGODB_URI not set in .env');
    process.exit(1);
  }
  if (!process.env.ENCRYPTION_KEY || process.env.ENCRYPTION_KEY.length !== 32) {
    console.error('ENCRYPTION_KEY must be exactly 32 characters (the same key the Baileys host uses)');
    process.exit(1);
  }

  console.log('Connecting to MongoDB...');
  await mongoose.connect(uri);

  try {
    await migrateBaileysSessions({ apply });
  } finally {
    await mongoose.disconnect();
  }

  if (!apply) {
    console.log('\nDry-run only. Re-run with --apply to write.');
    console.log('Reminder: if MONGODB_URI is mongodb+srv:// and SRV DNS fails,');
    console.log('rewrite it to a direct mongodb:// URI (A-records + :27017).');
  }
  process.exit(0);
}

// Only auto-run when invoked directly (tests require the function instead).
if (require.main === module) {
  main().catch((err) => {
    console.error('Migration failed:', err);
    process.exit(1);
  });
}

module.exports = { migrateBaileysSessions, encryptField };
