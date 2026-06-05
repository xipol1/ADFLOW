#!/usr/bin/env node
/**
 * confirm-delivery.js — mark a link-attribution campaign as published/delivered.
 *
 * MANUAL by design. Auto-detecting the creator's forwarded channel post is not
 * reliable: WhatsApp doesn't deliver channel messages to linked devices, so the
 * worker's 'message' event won't see forwarded newsletter posts consistently
 * (see docs/wa-web-metrics-validation.md). The robust signals are: the creator
 * forwards you the post (you eyeball it) and/or the first click on the link.
 *
 * Usage:
 *   node scripts/confirm-delivery.js <campaignId> [--published-at=2026-06-04T18:00:00Z]
 *
 * Sets: publishedAt (= --published-at or now), deliveryConfirmedAt = now,
 *       status = 'PUBLISHED'. Writes to production Mongo for THIS campaign only.
 */
'use strict';

require('dotenv').config();
const dns = require('dns');
if (process.env.NODE_ENV !== 'production') {
  try { dns.setServers(['8.8.8.8', '8.8.4.4', '1.1.1.1']); } catch (_) {}
}
const database = require('../config/database');

(async () => {
  const id = process.argv.find((a) => /^[a-f0-9]{24}$/i.test(a));
  if (!id) { console.error('Usage: node scripts/confirm-delivery.js <campaignId> [--published-at=ISO]'); process.exit(1); }

  const pubArg = process.argv.find((a) => a.startsWith('--published-at='));
  const publishedAt = pubArg ? new Date(pubArg.split('=')[1]) : new Date();
  if (isNaN(publishedAt.getTime())) { console.error('✗ --published-at is not a valid date'); process.exit(1); }

  const ok = await database.conectar();
  if (!ok) { console.error('✗ Mongo connection failed:', database.getLastConnectionError()?.message); process.exit(1); }

  const Campaign = require('../models/Campaign');
  const c = await Campaign.findById(id);
  if (!c) { console.error('✗ Campaign not found:', id); await database.desconectar(); process.exit(1); }

  console.log('Campaign:', String(c._id), '| status:', c.status, '| channel:', c.waChannel?.name || c.channel);
  c.publishedAt = publishedAt;
  c.deliveryConfirmedAt = new Date();
  if (c.status === 'DRAFT' || c.status === 'PAID') c.status = 'PUBLISHED';
  await c.save();

  console.log('✓ Marked delivered.');
  console.log('   publishedAt        :', c.publishedAt.toISOString());
  console.log('   deliveryConfirmedAt:', c.deliveryConfirmedAt.toISOString());
  console.log('   status             :', c.status);
  console.log('\nWhen the campaign window closes:  node scripts/campaign-report.js ' + id);

  await database.desconectar();
  process.exit(0);
})().catch((e) => { console.error('FATAL:', e.message); process.exit(1); });
