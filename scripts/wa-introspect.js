#!/usr/bin/env node
/**
 * wa-introspect.js — definitive diagnostic: does the live WA Web Store actually
 * contain channels (newsletters), regardless of what whatsapp-web.js exposes?
 * Distinguishes "wweb 1.34.7 channel API broken vs current WA Web" from
 * "this account simply has no channels". Reuses data/whatsapp-session-probe.
 */
'use strict';
require('dotenv').config();
const path = require('path');
const fs = require('fs');
const { Client, LocalAuth } = require('whatsapp-web.js');

const SESSION = path.join(__dirname, '..', 'data', 'whatsapp-session-probe');
const OUT = path.join(__dirname, '..', '_wa-introspect.json');
const sleep = (ms) => new Promise(r => setTimeout(r, ms));

const client = new Client({
  authStrategy: new LocalAuth({ dataPath: SESSION }),
  puppeteer: { headless: true, args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-gpu', '--disable-dev-shm-usage', '--disable-accelerated-2d-canvas', '--no-first-run', '--single-process'] },
});

let started = false;
client.on('loading_screen', (p, m) => console.log(`LOADING ${p}% ${m || ''}`));
client.on('authenticated', () => console.log('AUTHENTICATED'));
client.on('ready', () => go('ready'));
client.on('auth_failure', m => { console.error('auth_failure', m); process.exit(1); });
client.initialize().catch(e => { console.error('init', e.message); process.exit(1); });

(async () => {
  await sleep(18000);
  if (started) return;
  console.log('ready hang — fallback');
  for (let i = 0; i < 10 && !started; i++) {
    try { await client.getChannels(); return go('fallback'); } catch (_) { await sleep(4000); }
  }
})();

async function go(via) {
  if (started) return; started = true;
  console.log('\n=== introspecting Store (via ' + via + ') ===');
  const data = await client.pupPage.evaluate(() => {
    const res = { collections: {}, newsletters: [], chatsWithNewsletter: 0, errors: {} };
    try {
      const C = window.require('WAWebCollections');
      res.collectionKeys = Object.keys(C);
      for (const k of res.collectionKeys) {
        try { const a = C[k]?.getModelsArray?.(); if (Array.isArray(a)) res.collections[k] = a.length; } catch (_) {}
      }
    } catch (e) { res.errors.collections = e.message; }

    // Try to read the newsletter collection under any plausible name
    try {
      const C = window.require('WAWebCollections');
      const nl = C.NewsletterCollection || C.WAWebNewsletterCollection || C.Newsletter;
      const arr = nl?.getModelsArray?.() || [];
      res.newsletterCount = arr.length;
      res.newsletters = arr.slice(0, 20).map(n => {
        let o = {};
        try { o.id = n.id?._serialized || n.id?.toString?.(); } catch (_) {}
        try { o.name = n.name || n.displayName; } catch (_) {}
        try { o.keys = Object.keys(n); } catch (_) {}
        try { o.serialized = typeof n.serialize === 'function' ? n.serialize() : null; } catch (_) {}
        return o;
      });
    } catch (e) { res.errors.newsletter = e.message; }

    // Does the Chat collection contain any newsletter-typed chats?
    try {
      const C = window.require('WAWebCollections');
      const chats = C.Chat?.getModelsArray?.() || [];
      res.totalChats = chats.length;
      res.chatsWithNewsletter = chats.filter(c => {
        const id = c.id?._serialized || '';
        return /@newsletter$/.test(id);
      }).map(c => ({ id: c.id?._serialized, name: c.name || c.formattedTitle })).slice(0, 20);
    } catch (e) { res.errors.chats = e.message; }

    // Connection / sync state
    try { res.state = window.require('WAWebSocketModel')?.Socket?.state; } catch (_) {}
    return res;
  }).catch(e => ({ evalError: e.message }));

  fs.writeFileSync(OUT, JSON.stringify(data, null, 2));
  console.log(JSON.stringify(data, null, 2));
  console.log('\nWritten to', OUT);
  try { await client.destroy(); } catch (_) {}
  setTimeout(() => process.exit(0), 1200);
}
