#!/usr/bin/env node
/**
 * One-time migration: encrypt all existing plaintext credentials in Canal documents.
 *
 * Usage: node scripts/migrate-encrypt-tokens.js
 *
 * Safe to run multiple times — skips already-encrypted values.
 * Requires ENCRYPTION_KEY (32 chars) and MONGODB_URI in .env.
 */

require('dotenv').config();

const mongoose = require('mongoose');
const { encryptIfNeeded, isEncrypted } = require('../lib/encryption');

const SENSITIVE_FIELDS = ['botToken', 'accessToken', 'phoneNumberId', 'refreshToken', 'pageAccessToken'];

async function migrate() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.error('MONGODB_URI not set in .env');
    process.exit(1);
  }

  if (!process.env.ENCRYPTION_KEY || process.env.ENCRYPTION_KEY.length !== 32) {
    console.error('ENCRYPTION_KEY must be exactly 32 characters');
    process.exit(1);
  }

  console.log('Connecting to MongoDB...');
  await mongoose.connect(uri);

  // Use raw collection to avoid triggering Mongoose hooks
  const collection = mongoose.connection.db.collection('canals');
  const cursor = collection.find({});
  let total = 0;
  let encrypted = 0;
  let skipped = 0;

  while (await cursor.hasNext()) {
    const doc = await cursor.next();
    total++;
    const creds = doc.credenciales || {};
    const updates = {};
    let needsUpdate = false;

    for (const field of SENSITIVE_FIELDS) {
      const value = creds[field];
      if (value && !isEncrypted(value)) {
        updates[`credenciales.${field}`] = encryptIfNeeded(value);
        needsUpdate = true;
      }
    }

    // Also check metaOAuth.connectedPages[].pageAccessToken
    if (doc.metaOAuth?.connectedPages?.length) {
      const pages = [...doc.metaOAuth.connectedPages];
      let pagesChanged = false;
      for (let i = 0; i < pages.length; i++) {
        if (pages[i].pageAccessToken && !isEncrypted(pages[i].pageAccessToken)) {
          pages[i].pageAccessToken = encryptIfNeeded(pages[i].pageAccessToken);
          pagesChanged = true;
        }
      }
      if (pagesChanged) {
        updates['metaOAuth.connectedPages'] = pages;
        needsUpdate = true;
      }
    }

    if (needsUpdate) {
      await collection.updateOne({ _id: doc._id }, { $set: updates });
      encrypted++;
      console.log(`  Encrypted canal ${doc._id} (${doc.plataforma})`);
    } else {
      skipped++;
    }
  }

  console.log(`\nMigration complete:`);
  console.log(`  Total: ${total}`);
  console.log(`  Encrypted: ${encrypted}`);
  console.log(`  Already encrypted/empty: ${skipped}`);

  await mongoose.disconnect();
  process.exit(0);
}

migrate().catch((err) => {
  console.error('Migration failed:', err);
  process.exit(1);
});
