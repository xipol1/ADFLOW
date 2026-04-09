/**
 * One-shot migration: grant betaAccess=true to the two demo users.
 * Safe to re-run — it's idempotent, updateMany will just no-op the
 * second time.
 *
 *   node scripts/grantBetaAccess.js
 *
 * Requires MONGODB_URI in the environment (or .env).
 */
require('dotenv').config();
const mongoose = require('mongoose');
const Usuario = require('../models/Usuario');

async function run() {
  if (!process.env.MONGODB_URI) {
    console.error('❌  MONGODB_URI not set. Export it or add it to .env before running.');
    process.exit(1);
  }
  await mongoose.connect(process.env.MONGODB_URI, { serverSelectionTimeoutMS: 15000 });

  const emails = ['creator@adflow.com', 'advertiser@adflow.com'];
  const result = await Usuario.updateMany(
    { email: { $in: emails } },
    { $set: { betaAccess: true } }
  );

  console.log('Matched: ', result.matchedCount ?? result.n);
  console.log('Updated: ', result.modifiedCount ?? result.nModified);
  console.log('Emails:  ', emails.join(', '));

  await mongoose.disconnect();
}

run().catch((err) => {
  console.error('grantBetaAccess failed:', err?.message || err);
  process.exit(1);
});
