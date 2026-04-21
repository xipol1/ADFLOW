#!/usr/bin/env node
/**
 * One-time bootstrap: create initial CanalScoreSnapshot records for all
 * WhatsApp/Discord channels so the progression chart has data from day 1.
 *
 * Usage:  node scripts/bootstrap-multiplatform-snapshots.js
 */

require('dotenv').config();

async function main() {
  const { createInitialSnapshots } = require('../services/multiplatformIntelService');
  const result = await createInitialSnapshots();
  console.log('\nResult:', JSON.stringify(result, null, 2));
  process.exit(0);
}

main().catch((err) => {
  console.error('Bootstrap failed:', err);
  process.exit(1);
});
