#!/usr/bin/env node
/**
 * One-off migration: audit + create the partial unique index that enforces
 *   "only one strongly-verified Canal per (plataforma, identificadorCanal)"
 *
 * Why a script instead of autoIndex:
 *   The Canal schema sets `autoIndex: false` on purpose. If the index were
 *   built automatically on the next serverless cold start AND production
 *   already has duplicate verified canals (a real possibility — the trust
 *   model was tightened in commit dbd03fe), MongoDB would refuse to build
 *   the index and EVERY subsequent request would fail with
 *   `MongoServerError: E11000 duplicate key error` until an operator stepped
 *   in. That's a recipe for an outage.
 *
 * What this script does:
 *   1. Connects to the configured Mongo URL
 *   2. Reports any (plataforma, identificadorCanal) groups with >1 verified
 *      canal — these are the duplicates that would block index creation
 *   3. EXITS NON-ZERO if duplicates exist, with instructions for the operator
 *   4. Otherwise calls Canal.syncIndexes() which materialises the schema
 *      indexes against the live database
 *
 * Run once after deploying the new trust model:
 *   node scripts/migrate-canal-trust-index.js
 *
 * Or with --force to rebuild even if the index already exists.
 *
 * Resolving duplicates (manual):
 *   The script will print groups like:
 *     telegram | @example | 3 docs (ids: ...)
 *   For each group, decide which canal is the legitimate owner — typically
 *   the one with the strongest verification (admin_directo > oauth_graph
 *   > tracking_url). Demote the others by setting verificado=false
 *   manually, then re-run this script.
 */

/* eslint-disable no-console */
const mongoose = require('mongoose');
require('dotenv').config();

async function main() {
  const url = process.env.MONGO_URL || process.env.MONGODB_URI || process.env.DATABASE_URL;
  if (!url) {
    console.error('Set MONGO_URL / MONGODB_URI / DATABASE_URL before running this script.');
    process.exit(1);
  }

  console.log('Connecting to MongoDB...');
  await mongoose.connect(url);
  console.log('Connected.');

  // Load the model (pulls schema with autoIndex:false applied)
  const Canal = require('../models/Canal');

  // ── Step 1: audit ──────────────────────────────────────────────────────
  console.log('Auditing duplicates of (plataforma, identificadorCanal) WHERE verificado:true ...');
  const duplicates = await Canal.aggregate([
    { $match: { verificado: true } },
    {
      $group: {
        _id: { plataforma: '$plataforma', identificadorCanal: '$identificadorCanal' },
        count: { $sum: 1 },
        ids: { $push: '$_id' },
        propietarios: { $push: '$propietario' },
      },
    },
    { $match: { count: { $gt: 1 } } },
  ]);

  if (duplicates.length > 0) {
    console.error('');
    console.error(`✗ Found ${duplicates.length} duplicate group(s). Index NOT built.`);
    console.error('');
    for (const g of duplicates) {
      console.error(`  ${g._id.plataforma} | ${g._id.identificadorCanal} | ${g.count} docs`);
      console.error(`    ids:          ${g.ids.join(', ')}`);
      console.error(`    propietarios: ${g.propietarios.join(', ')}`);
    }
    console.error('');
    console.error('Resolve manually: keep one verified canal per group, set verificado=false on the rest.');
    console.error('Then re-run this script.');
    await mongoose.disconnect();
    process.exit(2);
  }

  console.log('No duplicates. Safe to build indexes.');

  // ── Step 2: build indexes ──────────────────────────────────────────────
  console.log('Calling Canal.syncIndexes() ...');
  const synced = await Canal.syncIndexes();
  console.log('syncIndexes result:', synced);

  // ── Step 3: verify ─────────────────────────────────────────────────────
  const indexes = await Canal.collection.indexes();
  const trustIndex = indexes.find(
    i => i.partialFilterExpression && i.partialFilterExpression.verificado === true
  );
  if (trustIndex) {
    console.log('✓ Trust index present:', trustIndex.name);
  } else {
    console.warn('⚠ Trust index not found after sync — investigate.');
  }

  await mongoose.disconnect();
  console.log('Done.');
}

main().catch(err => {
  console.error('Migration failed:', err.message);
  process.exit(1);
});
