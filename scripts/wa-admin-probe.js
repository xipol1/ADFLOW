#!/usr/bin/env node
/**
 * wa-admin-probe.js — Isolated, empirical validation of whatsapp-web.js channel metrics.
 *
 * 100% LOCAL. Does NOT touch Mongo, does NOT start server.js, does NOT deploy.
 * It only drives the existing WhatsAppAdminClient → whatsappWorker.js (Puppeteer).
 *
 * USAGE
 *   node scripts/wa-admin-probe.js                       # default test channel, publishes a probe post
 *   node scripts/wa-admin-probe.js <inviteCode>          # any channel by invite code (after /channel/)
 *   node scripts/wa-admin-probe.js <inviteCode> --no-publish   # read-only (use on a channel you only FOLLOW)
 *
 * First run prints a QR in the terminal → scan it with the WhatsApp number that is
 * ADMIN of the test channel. The LocalAuth session is cached under WHATSAPP_SESSION_PATH,
 * so subsequent runs skip the QR.
 *
 * Output: rich console log + a JSON dump at ./_wa-probe-result.json (git-ignored artifact).
 */

'use strict';

require('dotenv').config();
const path = require('path');
const fs = require('fs');

// Dedicated, isolated session — forced here (NOT read from .env) so this probe never
// collides with a running server.js WhatsApp worker. The forked worker inherits this.
process.env.WHATSAPP_SESSION_PATH =
  process.env.WA_PROBE_SESSION_PATH
  || path.join(__dirname, '..', 'data', 'whatsapp-session-probe');

const wa = require('../services/WhatsAppAdminClient');

// ─── Args ─────────────────────────────────────────────────────────────────────
const DEFAULT_INVITE = '0029Vb82Fo0I7BeLLtWLvh2B';
const argv = process.argv.slice(2);
const INVITE = argv.find(a => /^[0-9A-Za-z]{18,}$/.test(a)) || DEFAULT_INVITE;
const NO_PUBLISH = argv.includes('--no-publish');

const READY_TIMEOUT_MS = 300000; // 5 min — first login needs time to scan + sync
const POST_SETTLE_MS = 10000;
const RESULT_FILE = path.join(__dirname, '..', '_wa-probe-result.json');

// ─── Helpers ──────────────────────────────────────────────────────────────────
const sleep = (ms) => new Promise(r => setTimeout(r, ms));
const hr = (t) => console.log('\n' + '═'.repeat(64) + '\n  ' + t + '\n' + '═'.repeat(64));
function dump(label, obj) {
  console.log(`\n--- ${label} ---`);
  console.log(JSON.stringify(obj, null, 2));
}
async function tryStep(label, fn, results, key) {
  try {
    const out = await fn();
    results[key] = out;
    dump(label, out);
    return out;
  } catch (e) {
    console.error(`✗ ${label} FAILED: ${e.message}`);
    results[key + 'Error'] = e.message;
    return null;
  }
}
function jidFrom(idField) {
  if (!idField) return null;
  if (typeof idField === 'string') return idField;
  return idField._serialized || (idField.user ? `${idField.user}@${idField.server || 'newsletter'}` : null);
}

async function waitReady() {
  const start = Date.now();
  while (Date.now() - start < READY_TIMEOUT_MS) {
    if (wa.ready) return true;
    await sleep(1000);
  }
  return false;
}

// ─── Main ─────────────────────────────────────────────────────────────────────
(async () => {
  const results = {
    invite: INVITE,
    noPublish: NO_PUBLISH,
    sessionPath: process.env.WHATSAPP_SESSION_PATH,
    startedAt: new Date().toISOString(),
  };

  hr('Channelad — WhatsApp Web metric probe (whatsapp-web.js 1.34.7)');
  console.log('Session path :', process.env.WHATSAPP_SESSION_PATH);
  console.log('Invite code  :', INVITE);
  console.log('Mode         :', NO_PUBLISH ? 'READ-ONLY (no publish)' : 'full (will publish a probe post)');
  console.log('\nForking worker… On first run a QR prints below — scan it with the ADMIN number.');

  wa.initialize();

  const ready = await waitReady();
  if (!ready) {
    console.error('\n✗ Worker never became ready within 120s. Is the QR scanned? Aborting.');
    wa.shutdown();
    process.exit(1);
  }
  console.log('\n✓ Worker ready — WhatsApp connected.');

  await tryStep('healthCheck', () => wa.healthCheck(), results, 'health');

  // WhatsApp populates the newsletter (channel) collection a few seconds AFTER
  // 'ready' — querying immediately returns []. Give it time to sync.
  console.log('\nWaiting 10s for channel/newsletter sync…');
  await sleep(10000);

  // ── STEP 1: resolve channel JID ─────────────────────────────────────────────
  hr('STEP 1 — Resolve channel JID + inventory');
  let jid = null;

  // Primary path: list the account's channels, retrying until the collection fills.
  // (channels live in WAWebNewsletterCollection — getChats() does NOT include them).
  let channels = [];
  for (let attempt = 1; attempt <= 8; attempt++) {
    try { channels = await wa.listChannels(); } catch (e) { results.channelsError = e.message; }
    if (Array.isArray(channels) && channels.length) break;
    console.log(`  listChannels empty (attempt ${attempt}/8) — retrying in 4s…`);
    await sleep(4000);
  }
  results.channels = channels;
  dump('listChannels [getChannels()]', channels);

  if (Array.isArray(channels) && channels.length) {
    const owned = channels.find(c => /owner|admin/i.test(c.role || ''));
    const chosen = owned || channels[0];
    jid = chosen.id;
    console.log(`\n✓ JID from channel list: ${chosen.name || '(no name)'} → ${jid}  [role=${chosen.role}]`);
  }

  // For the record — invite-based resolution (fragile across WA Web versions). Non-fatal.
  await tryStep('rawInviteMetadata  [WWebJS.getChannelMetadata]',
    () => wa.rawInviteMetadata(INVITE), results, 'rawInviteMetadata');
  if (!jid && results.rawInviteMetadata) jid = jidFrom(results.rawInviteMetadata.id);
  await tryStep('getChannelByInvite [getChannelByInviteCode]',
    () => wa.getChannelByInvite(INVITE), results, 'channelByInvite');
  if (!jid && results.channelByInvite) jid = results.channelByInvite.id;

  if (!jid) {
    console.error('\n✗ Could not resolve a channel JID by any method. Aborting metric probe.');
    results.jid = null;
    fs.writeFileSync(RESULT_FILE, JSON.stringify(results, null, 2));
    wa.shutdown();
    process.exit(1);
  }
  results.jid = jid;
  console.log(`\n✓ Resolved JID: ${jid}`);

  // ── STEP 2: channel-level reads ────────────────────────────────────────────
  hr('STEP 2 — Channel-level reads (info, followers, admin access)');
  await tryStep('getChannelInfo', () => wa.getChannelInfo(jid), results, 'channelInfo');
  await tryStep('getChannelFollowers', () => wa.getChannelFollowers(jid), results, 'followers');
  await tryStep('verifyAdminAccess', () => wa.verifyAdminAccess(jid), results, 'adminAccess');

  // ── STEP 3: post-level reads ───────────────────────────────────────────────
  hr('STEP 3 — Recent posts  +  RAW model dump (look for view/reaction/forward fields)');
  await tryStep('getRecentPosts(jid, 10)', () => wa.getRecentPosts(jid, 10), results, 'recentPosts');
  await tryStep('debugRawPosts(jid, 5)  [raw _data keys + metric-like fields]',
    () => wa.debugRawPosts(jid, 5), results, 'rawPosts');

  // ── STEP 4: publish + read back metrics ────────────────────────────────────
  if (!NO_PUBLISH) {
    hr('STEP 4 — Publish a probe post, wait 10s, read its metrics');
    const stamp = new Date().toISOString();
    const pub = await tryStep('publishToChannel',
      () => wa.publishToChannel(jid, { text: `Channelad probe ${stamp}` }), results, 'publish');

    if (pub && pub.messageId) {
      console.log(`\nWaiting ${POST_SETTLE_MS / 1000}s for the post to settle…`);
      await sleep(POST_SETTLE_MS);
      await tryStep('readPostMetrics(jid, messageId)',
        () => wa.readPostMetrics(jid, pub.messageId), results, 'postMetrics');
    }
  } else {
    console.log('\n(Skipping publish — read-only mode.)');
  }

  // ── SUMMARY ────────────────────────────────────────────────────────────────
  hr('SUMMARY — metric → available? → example value');
  printSummary(results);

  results.finishedAt = new Date().toISOString();
  fs.writeFileSync(RESULT_FILE, JSON.stringify(results, null, 2));
  console.log(`\nFull JSON written to ${RESULT_FILE}`);

  console.log('\nDone. Leaving worker process up for a moment, then shutting down.');
  wa.shutdown();
  setTimeout(() => process.exit(0), 2000);
})().catch((err) => {
  console.error('\nFATAL:', err);
  try { wa.shutdown(); } catch (_) {}
  setTimeout(() => process.exit(1), 1500);
});

// ─── Summary builder ──────────────────────────────────────────────────────────
function printSummary(r) {
  const meta = r.rawInviteMetadata || {};
  const info = r.channelInfo || {};
  const followers = r.followers || {};
  const admin = r.adminAccess || {};
  const posts = Array.isArray(r.recentPosts) ? r.recentPosts : [];
  const raw = Array.isArray(r.rawPosts) ? r.rawPosts : [];
  const pm = r.postMetrics || {};

  // Did the RAW model carry any view-like field on any post?
  const rawMetricKeys = new Set();
  raw.forEach(p => Object.keys(p.metricLike || {}).forEach(k => rawMetricKeys.add(k)));
  const sawAnyViewField = [...rawMetricKeys].some(k => /view|seen|read/i.test(k));

  const rows = [
    ['Channel name', info.name || meta.titleMetadata?.title, info.name || meta.titleMetadata?.title],
    ['Channel description', info.description || meta.descriptionMetadata?.description, (info.description || meta.descriptionMetadata?.description || '').slice(0, 40)],
    ['Subscribers / followers (metadata)', meta.subscribersCount, meta.subscribersCount],
    ['Subscribers via getChannelFollowers()', followers.count, followers.count],
    ['Verified badge', typeof meta.isVerified === 'boolean', meta.isVerified],
    ['My role / membershipType', meta.membershipType || info.role, meta.membershipType],
    ['Admin access detected', admin.isAdmin, admin.isAdmin],
    ['Recent posts list (body/time/type)', posts.length > 0, `${posts.length} posts`],
    ['Per-post VIEWS (wweb getter msg.views)', posts.some(p => p.views > 0), posts.map(p => p.views).slice(0, 5)],
    ['Per-post VIEWS (raw _data field exists)', sawAnyViewField, [...rawMetricKeys]],
    ['Per-post reactions (readPostMetrics)', pm.totalReactions > 0, pm.reactions],
    ['Per-post forwards (forwardingScore)', posts.length ? 'see raw' : 'n/a', raw.map(p => p.forwardingScore).slice(0, 5)],
  ];

  const verdict = (v) => {
    if (v === true) return 'YES   ';
    if (v === false || v === 0 || v == null || v === '') return 'NO    ';
    if (typeof v === 'number' && v > 0) return 'YES   ';
    if (typeof v === 'string') return 'PARTIAL';
    if (Array.isArray(v)) return v.some(Boolean) ? 'PARTIAL' : 'NO    ';
    return 'PARTIAL';
  };

  console.log('');
  for (const [name, avail, example] of rows) {
    const ex = typeof example === 'object' ? JSON.stringify(example) : String(example);
    console.log(`  [${verdict(avail)}] ${name.padEnd(40)} e.g. ${ex}`);
  }

  console.log('\n  RAW metric-like fields seen across posts:', [...rawMetricKeys].length ? [...rawMetricKeys].join(', ') : '(none)');
  console.log('\n  VERDICT (views per post):');
  if (posts.some(p => p.views > 0)) {
    console.log('   → whatsapp-web.js surfaces per-post views directly (msg.views).');
  } else if (sawAnyViewField) {
    console.log('   → wweb does NOT expose views via msg.views, BUT the raw WA model carries a');
    console.log('     view-like field — recoverable with a small patch. See _wa-probe-result.json.');
  } else {
    console.log('   → NO per-post view count is available through whatsapp-web.js 1.34.7');
    console.log('     (no msg.views getter and no view field in the raw newsletter message model).');
    console.log('     Reactions/forwards may still be readable; views are not.');
  }
}
