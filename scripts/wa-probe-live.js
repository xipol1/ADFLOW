#!/usr/bin/env node
/**
 * wa-probe-live.js — single-session, in-process metric probe (no worker/IPC).
 *
 * Why this exists: whatsapp-web.js 1.34.7's 'ready' event hangs on the
 * session-RESTORE path against the current WhatsApp Web build (module drift —
 * same family as the getRoleByIdentifier breakage). This script:
 *   1. opens the saved session (data/whatsapp-session-probe), or --fresh for a new QR,
 *   2. proceeds on 'ready' OR, if that hangs, on a getChannels() readiness fallback,
 *   3. does ALL reads + the publish/read-back in ONE live session, then exits.
 *
 * 100% local. No Mongo, no server.js.
 *   node scripts/wa-probe-live.js            # reuse saved session
 *   node scripts/wa-probe-live.js --fresh    # force a new QR (keep phone unlocked)
 *   node scripts/wa-probe-live.js --no-publish
 */
'use strict';

require('dotenv').config();
const path = require('path');
const fs = require('fs');
const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode');
const qrTerminal = require('qrcode-terminal');

const FRESH = process.argv.includes('--fresh');
const NO_PUBLISH = process.argv.includes('--no-publish');
const SESSION = FRESH
  ? path.join(__dirname, '..', 'data', 'whatsapp-session-live')
  : path.join(__dirname, '..', 'data', 'whatsapp-session-probe');
const PNG = path.join(__dirname, '..', '_wa-login-qr.png');
const RESULT = path.join(__dirname, '..', '_wa-probe-result.json');

const sleep = (ms) => new Promise(r => setTimeout(r, ms));
const hr = (t) => console.log('\n' + '═'.repeat(64) + '\n  ' + t + '\n' + '═'.repeat(64));
const dump = (l, o) => { console.log(`\n--- ${l} ---`); console.log(JSON.stringify(o, null, 2)); };

const client = new Client({
  authStrategy: new LocalAuth({ dataPath: SESSION }),
  puppeteer: {
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-gpu',
      '--disable-dev-shm-usage', '--disable-accelerated-2d-canvas',
      '--no-first-run', '--single-process'],
  },
});

let started = false;
function fail(e) { console.error('\nFATAL:', e && e.message ? e.message : e); try { client.destroy(); } catch (_) {} setTimeout(() => process.exit(1), 1500); }

client.on('qr', async (qr) => {
  qrTerminal.generate(qr, { small: true });
  try { await qrcode.toFile(PNG, qr, { width: 560, margin: 2 }); console.log('QR_PNG_WRITTEN', PNG); } catch (_) {}
});
client.on('authenticated', () => console.log('AUTHENTICATED'));
client.on('loading_screen', (p, m) => console.log(`LOADING ${p}% ${m || ''}`));
client.on('ready', () => { console.log('READY_EVENT fired'); kickoff('ready-event'); });
client.on('auth_failure', (m) => fail(new Error('auth_failure: ' + m)));

console.log('Session:', SESSION, FRESH ? '(FRESH — scan QR)' : '(restore)');
client.initialize().catch(fail);

// Readiness fallback: if 'ready' never fires, proceed once getChannels() works.
(async () => {
  await sleep(18000);
  if (started) return;
  console.log('\n"ready" did not fire in 18s — trying readiness fallback via getChannels()…');
  for (let i = 1; i <= 12 && !started; i++) {
    try {
      const ch = await client.getChannels();
      console.log(`  fallback getChannels() ok (${ch.length} channels) — proceeding`);
      kickoff('getChannels-fallback');
      return;
    } catch (e) {
      console.log(`  fallback attempt ${i}/12 failed: ${e.message}`);
      await sleep(5000);
    }
  }
  if (!started) fail(new Error('Could not reach a usable state (ready hang + fallback exhausted). Try --fresh with the phone unlocked.'));
})();

async function kickoff(via) {
  if (started) return;
  started = true;
  try { await runProbe(via); } catch (e) { fail(e); }
}

async function runProbe(via) {
  const results = { via, session: SESSION, startedAt: new Date().toISOString() };
  hr(`LIVE PROBE (readiness via: ${via})`);

  try { results.me = client.info?.wid?._serialized || null; console.log('Logged in as:', results.me); } catch (_) {}

  // ── Resolve channel (retry until newsletter collection populates) ───────────
  hr('STEP 1 — Channel inventory + JID');
  let channels = [];
  for (let i = 1; i <= 8; i++) {
    try { channels = await client.getChannels(); } catch (e) { results.channelsError = e.message; }
    if (Array.isArray(channels) && channels.length) break;
    console.log(`  getChannels empty (attempt ${i}/8) — retry in 4s…`);
    await sleep(4000);
  }
  results.channels = (channels || []).map(c => ({
    id: c.id?._serialized, name: c.name, isChannel: c.isChannel, isReadOnly: c.isReadOnly,
    role: c.channelMetadata?.membershipType || null,
    subscribersCount: c.channelMetadata?.subscribersCount ?? c.channelMetadata?.size ?? null,
    metadataKeys: c.channelMetadata ? Object.keys(c.channelMetadata) : [],
  }));
  dump('getChannels()', results.channels);

  if (!results.channels.length) { fail(new Error('Account sees 0 channels. Is this number admin/subscriber of the channel?')); return; }

  const owned = channels.find(c => /owner|admin/i.test(c.channelMetadata?.membershipType || ''));
  const chosen = owned || channels[0];
  const jid = chosen.id._serialized;
  results.jid = jid;
  console.log(`\n✓ Channel: ${chosen.name} → ${jid} [role=${chosen.channelMetadata?.membershipType}]`);

  // full metadata of the chosen channel
  results.chosenChannelMetadata = chosen.channelMetadata || null;
  dump('chosen.channelMetadata', results.chosenChannelMetadata);

  // ── Recent posts + RAW dump ────────────────────────────────────────────────
  hr('STEP 2 — Recent posts + raw _data metric hunt');
  let chat;
  try { chat = await client.getChatById(jid); } catch (e) { results.getChatError = e.message; }
  let messages = [];
  try { messages = await chat.fetchMessages({ limit: 10 }); } catch (e) { results.fetchError = e.message; }

  const rawMetricKeys = new Set();
  results.recentPosts = messages.map(m => {
    const raw = m._data || {};
    const metricLike = {};
    for (const k of Object.keys(raw)) {
      if (/view|seen|read|react|forward|count|stat|recipient/i.test(k)) { metricLike[k] = raw[k]; Object.keys(metricLike).forEach(() => rawMetricKeys.add(k)); }
    }
    return {
      id: m.id?._serialized, type: m.type, fromMe: m.fromMe,
      timestamp: m.timestamp ? new Date(m.timestamp * 1000).toISOString() : null,
      body: (m.body || '').slice(0, 80),
      views_getter: m.views ?? null,
      hasReaction: m.hasReaction || false,
      forwardingScore: m.forwardingScore || 0,
      rawKeys: Object.keys(raw),
      metricLike,
    };
  });
  dump('recentPosts (+ raw metric-like fields)', results.recentPosts);

  // ── Publish + read back ────────────────────────────────────────────────────
  if (!NO_PUBLISH && chat) {
    hr('STEP 3 — Publish a probe post, wait 12s, read it back');
    const stamp = new Date().toISOString();
    try {
      const sent = await chat.sendMessage(`Channelad probe ${stamp}`);
      results.publishedId = sent.id?._serialized;
      console.log('Published:', results.publishedId);
      await sleep(12000);
      const after = await chat.fetchMessages({ limit: 10 });
      const mine = after.find(m => m.id?._serialized === results.publishedId);
      if (mine) {
        const raw = mine._data || {};
        const metricLike = {};
        for (const k of Object.keys(raw)) if (/view|seen|read|react|forward|count|stat|recipient/i.test(k)) metricLike[k] = raw[k];
        results.publishedMetrics = {
          views_getter: mine.views ?? null,
          hasReaction: mine.hasReaction || false,
          forwardingScore: mine.forwardingScore || 0,
          ack: mine.ack,
          rawKeys: Object.keys(raw),
          metricLike,
        };
        dump('published post metrics (10s after)', results.publishedMetrics);
      } else {
        console.log('(could not find the published post in the last 10 messages)');
      }
    } catch (e) { results.publishError = e.message; console.error('publish/read failed:', e.message); }
  }

  // ── Summary ────────────────────────────────────────────────────────────────
  hr('SUMMARY');
  const meta = results.chosenChannelMetadata || {};
  const allRawKeys = new Set();
  results.recentPosts.forEach(p => p.rawKeys.forEach(k => allRawKeys.add(k)));
  const viewKeys = [...allRawKeys].filter(k => /view|seen|read/i.test(k));
  console.log('  Subscribers (channelMetadata.subscribersCount):', meta.subscribersCount ?? meta.size ?? '(none)');
  console.log('  Role / membershipType                        :', meta.membershipType ?? '(none)');
  console.log('  Verified                                     :', meta.verified ?? meta.isVerified ?? '(none)');
  console.log('  Recent posts read                            :', results.recentPosts.length);
  console.log('  Per-post views via msg.views                 :', results.recentPosts.map(p => p.views_getter));
  console.log('  RAW msg._data keys (union)                   :', [...allRawKeys].join(', ') || '(none)');
  console.log('  → view-like raw keys                         :', viewKeys.length ? viewKeys.join(', ') : 'NONE');
  if (results.publishedMetrics) {
    console.log('  Published post views_getter                  :', results.publishedMetrics.views_getter);
    console.log('  Published post raw keys                      :', results.publishedMetrics.rawKeys.join(', '));
  }
  console.log('\n  VERDICT views/post:', viewKeys.length
    ? `possible — raw field(s): ${viewKeys.join(', ')}`
    : 'NOT available (no msg.views, no view-like raw field on newsletter messages)');

  results.finishedAt = new Date().toISOString();
  fs.writeFileSync(RESULT, JSON.stringify(results, null, 2));
  console.log(`\nFull JSON → ${RESULT}`);
  try { await client.destroy(); } catch (_) {}
  setTimeout(() => process.exit(0), 1500);
}
