#!/usr/bin/env node
/**
 * wa-invite-meta.js — fetch a channel's PUBLIC metadata by invite code, bypassing
 * whatsapp-web.js's broken getChannelByInviteCode (WAWebNewsletterModelUtils
 * .getRoleByIdentifier was renamed in the current WA Web build). Introspects the
 * current module API and queries newsletter metadata directly via pupPage.
 *
 *   node scripts/wa-invite-meta.js [inviteCode]
 */
'use strict';
require('dotenv').config();
const path = require('path');
const fs = require('fs');
const { Client, LocalAuth } = require('whatsapp-web.js');

const INVITE = process.argv.find(a => /^[0-9A-Za-z]{18,}$/.test(a)) || '0029Vb82Fo0I7BeLLtWLvh2B';
const SESSION = path.join(__dirname, '..', 'data', 'whatsapp-session-probe');
const OUT = path.join(__dirname, '..', '_wa-invite-meta.json');
const sleep = (ms) => new Promise(r => setTimeout(r, ms));

const client = new Client({
  authStrategy: new LocalAuth({ dataPath: SESSION }),
  puppeteer: { headless: true, args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-gpu', '--disable-dev-shm-usage', '--disable-accelerated-2d-canvas', '--no-first-run', '--single-process'] },
});

let started = false;
client.on('loading_screen', (p, m) => console.log(`LOADING ${p}%`));
client.on('ready', () => go('ready'));
client.on('auth_failure', m => { console.error('auth_failure', m); process.exit(1); });
client.initialize().catch(e => { console.error('init', e.message); process.exit(1); });
(async () => { await sleep(18000); if (started) return; for (let i = 0; i < 10 && !started; i++) { try { await client.getChannels(); return go('fallback'); } catch (_) { await sleep(4000); } } })();

async function go(via) {
  if (started) return; started = true;
  console.log('\n=== invite metadata probe (via ' + via + '), invite=' + INVITE + ' ===');
  const data = await client.pupPage.evaluate(async (invite) => {
    const res = { invite, utilKeys: [], queryKeys: [], roleVia: null, role: null, attempts: [] };
    let utils, queryJob;
    try { utils = window.require('WAWebNewsletterModelUtils'); res.utilKeys = Object.keys(utils); } catch (e) { res.utilsErr = e.message; }
    try { queryJob = window.require('WAWebNewsletterMetadataQueryJob'); res.queryKeys = Object.keys(queryJob); } catch (e) { res.queryErr = e.message; }

    // find the role resolver under any current name
    if (utils) {
      for (const fn of Object.keys(utils)) {
        if (/role/i.test(fn) && typeof utils[fn] === 'function') {
          try { const r = utils[fn](invite); res.roleVia = fn; res.role = (r && r.toString) ? r.toString() : r; break; } catch (_) {}
        }
      }
    }

    const queryFn = queryJob && Object.keys(queryJob).find(k => /queryNewsletterMetadataByInviteCode|byInviteCode/i.test(k));
    res.queryFn = queryFn || null;

    if (queryJob && queryFn) {
      const candidates = [res.role, undefined, 'GUEST', 'SUBSCRIBER', 'guest', 2, 3];
      for (const r of candidates) {
        try {
          const resp = await queryJob[queryFn](invite, r);
          res.attempts.push({ role: r === undefined ? '(undefined)' : String(r), ok: true });
          res.success = {
            role: r === undefined ? '(undefined)' : String(r),
            idJid: resp?.idJid?._serialized || resp?.idJid,
            name: resp?.newsletterNameMetadataMixin?.nameElementValue,
            description: resp?.newsletterDescriptionMetadataMixin?.descriptionQueryDescriptionResponseMixin?.elementValue,
            subscribersCount: resp?.newsletterSubscribersMetadataMixin?.subscribersCount,
            verificationState: resp?.newsletterVerificationMetadataMixin?.verificationState,
            stateType: resp?.newsletterStateMetadataMixin?.stateType,
            createdAt: resp?.newsletterCreationTimeMetadataMixin?.creationTimeValue,
            respKeys: resp ? Object.keys(resp) : [],
          };
          break;
        } catch (e) {
          res.attempts.push({ role: r === undefined ? '(undefined)' : String(r), ok: false, err: e.message });
        }
      }
    }
    return res;
  }, INVITE).catch(e => ({ evalError: e.message }));

  fs.writeFileSync(OUT, JSON.stringify(data, null, 2));
  console.log(JSON.stringify(data, null, 2));
  console.log('\nWritten to', OUT);
  try { await client.destroy(); } catch (_) {}
  setTimeout(() => process.exit(0), 1200);
}
