#!/usr/bin/env node
/**
 * Provision a partner in MongoDB.
 *
 * Usage:
 *   node scripts/provision-partner.js [name] [slug]
 *
 * Example:
 *   node scripts/provision-partner.js "Getalink" getalink
 *
 * Outputs the API key (shown once, store it securely).
 */
require('dotenv').config();
const crypto = require('crypto');
const mongoose = require('mongoose');

async function main() {
  const name = process.argv[2] || 'Getalink';
  const slug = process.argv[3] || name.toLowerCase().replace(/[^a-z0-9]+/g, '-');

  const uri = process.env.MONGODB_URI;
  if (!uri) { console.error('MONGODB_URI not set'); process.exit(1); }

  await mongoose.connect(uri);
  const Partner = require('../models/Partner');

  // Check if partner already exists
  const existing = await Partner.findOne({ slug });
  if (existing) {
    console.log(`Partner "${name}" (slug: ${slug}) already exists.`);
    console.log(`  ID:     ${existing._id}`);
    console.log(`  Status: ${existing.status}`);
    console.log(`  Hint:   ${existing.apiKeyHint}`);
    console.log('\nTo regenerate the API key, delete the partner and re-run this script.');
    await mongoose.disconnect();
    return;
  }

  // Generate API key
  const apiKey = `adflow_partner_${crypto.randomBytes(24).toString('hex')}`;
  const apiKeyHash = crypto.createHash('sha256').update(apiKey).digest('hex');
  const apiKeyHint = apiKey.slice(-4);

  const partner = await Partner.create({
    name,
    slug,
    apiKeyHash,
    apiKeyHint,
    status: 'active',
    allowedIps: ['*'],
    rateLimitPerMinute: 120,
    contactEmail: `${slug}@partner.example.com`,
    description: `Partner integration for ${name}`
  });

  console.log(`\nPartner provisioned successfully!`);
  console.log(`  Name:   ${partner.name}`);
  console.log(`  Slug:   ${partner.slug}`);
  console.log(`  ID:     ${partner._id}`);
  console.log(`  Status: ${partner.status}`);
  console.log(`\n  API Key (store securely, shown only once):`);
  console.log(`  ${apiKey}`);
  console.log(`\n  Use it as:`);
  console.log(`  Authorization: Bearer ${apiKey}`);
  console.log(`  — or —`);
  console.log(`  X-API-Key: ${apiKey}`);

  await mongoose.disconnect();
}

main().catch((err) => {
  console.error('Error:', err.message);
  process.exit(1);
});
