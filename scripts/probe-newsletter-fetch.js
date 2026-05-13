#!/usr/bin/env node
/**
 * scripts/probe-newsletter-fetch.js
 *
 * Focused investigation of Baileys' `sock.newsletterFetchMessages`.
 *
 * Context: in prior probes (scripts/probe-channel-baileys.js) this method
 * consistently took ~60s and returned no parsed messages, on Baileys
 * 7.0.0-rc.9. The 60s smelled like the underlying IQ timing out without
 * a response, but we couldn't tell whether:
 *   (A) the WhatsApp server isn't responding at all     → server-side
 *       restriction, backfill is impossible from this client
 *   (B) the server responds but Baileys doesn't parse  → upstream bug,
 *       backfill becomes possible if we write a parser
 *   (C) the call needs different args we haven't tried → trivial fix
 *
 * This script:
 *   1. Resumes the existing Baileys probe session (no QR if already paired).
 *   2. Pipes Baileys' pino logger to `logs/baileys-debug-<ts>.log` at the
 *      'trace' level so every IQ frame sent and every node received are
 *      recorded.
 *   3. Calls `newsletterFetchMessages` against the sandbox JID with seven
 *      argument variants and a manual 120s timeout (twice the default,
 *      catching slow responses).
 *   4. Persists results + log path to logs/probe-newsletter-fetch-<ts>.json.
 *
 * After running, inspect the debug log: if there are `<iq … xmlns=newsletter …/>`
 * responses arriving back from the server, scenario B is in play and we
 * can write a parser. If no `<iq>` response carries newsletter content,
 * scenario A is in play and backfill is server-side restricted.
 *
 *   node scripts/probe-newsletter-fetch.js <inviteCode>
 *
 * Defaults to the sandbox channel if no argv is given.
 */

'use strict';

const path = require('path');
const fs = require('fs');
const pino = require('pino');

const baileys = require('@whiskeysockets/baileys');
const makeWASocket = baileys.default;
const { useMultiFileAuthState, fetchLatestBaileysVersion, DisconnectReason } = baileys;

const SESSION_DIR = path.join(__dirname, '..', 'data', 'baileys-probe-session');
const LOG_DIR = path.join(__dirname, '..', 'logs');
const READY_TIMEOUT_MS = 240_000;
const PER_CALL_TIMEOUT_MS = 120_000;

// Wrap an arbitrary promise with our own timeout. Returns either
// `{ ok: true, ms, value }` or `{ ok: false, ms, error, timedOut }`.
async function timed(label, fn, timeoutMs) {
  const t0 = Date.now();
  let timer;
  try {
    const result = await Promise.race([
      Promise.resolve().then(fn),
      new Promise((_, reject) => {
        timer = setTimeout(() => {
          const e = new Error(`timeout after ${timeoutMs}ms`);
          e.timedOut = true;
          reject(e);
        }, timeoutMs);
      }),
    ]);
    return { label, ok: true, ms: Date.now() - t0, value: result };
  } catch (err) {
    return {
      label,
      ok: false,
      ms: Date.now() - t0,
      error: err.message,
      timedOut: !!err.timedOut,
      stack: err.stack?.split('\n').slice(0, 6),
    };
  } finally {
    if (timer) clearTimeout(timer);
  }
}

function safeSerialize(value, depth = 0) {
  if (depth > 6) return '[max-depth]';
  if (value === null || value === undefined) return value;
  if (typeof value === 'function') return undefined;
  if (typeof value === 'bigint') return value.toString() + 'n';
  if (typeof value !== 'object') return value;
  if (Buffer.isBuffer(value)) return { __buffer_b64: value.toString('base64'), length: value.length };
  if (value instanceof Uint8Array) return { __uint8: value.length };
  if (Array.isArray(value)) return value.slice(0, 50).map((x) => safeSerialize(x, depth + 1));
  const out = {};
  for (const k of Object.keys(value)) {
    try { out[k] = safeSerialize(value[k], depth + 1); } catch (e) { out[k] = `[err:${e.message}]`; }
  }
  return out;
}

function connectWith515Restart(state, saveCreds, version, logger, timeoutMs) {
  return new Promise((resolve, reject) => {
    let resolved = false;
    let attempts = 0;
    let current = null;
    const t = setTimeout(() => {
      if (resolved) return;
      resolved = true;
      reject(new Error(`Baileys no llegó a 'open' tras ${timeoutMs / 1000}s`));
    }, timeoutMs);

    const build = () => {
      const s = makeWASocket({
        version,
        auth: state,
        printQRInTerminal: false,
        browser: ['ChannelAd NewsletterFetch Probe', 'Chrome', '1.0.0'],
        markOnlineOnConnect: false,
        syncFullHistory: false,
        logger,
      });
      s.ev.on('creds.update', saveCreds);
      s.ev.on('connection.update', (u) => {
        if (u.connection === 'open' && !resolved) {
          resolved = true;
          clearTimeout(t);
          resolve(current);
        }
        if (u.connection === 'close') {
          const reason = u.lastDisconnect?.error?.output?.statusCode;
          if (reason === DisconnectReason?.loggedOut) {
            if (resolved) return;
            resolved = true; clearTimeout(t);
            reject(new Error('Session loggedOut — re-pair via scripts/probe-channel-baileys.js'));
            return;
          }
          if (++attempts > 4) {
            if (resolved) return;
            resolved = true; clearTimeout(t);
            reject(new Error(`too many reconnects (last reason=${reason})`));
            return;
          }
          console.log(`[probe-fetch] reconnecting after close (reason=${reason})`);
          setTimeout(() => { if (!resolved) current = build(); }, 1500);
        }
      });
      return s;
    };
    current = build();
  });
}

async function main() {
  const argvInvite = process.argv[2] || '0029Vb82Fo0I7BeLLtWLvh2B';

  if (!fs.existsSync(path.join(SESSION_DIR, 'creds.json'))) {
    console.error(`[probe-fetch] No Baileys session at ${SESSION_DIR}`);
    console.error('[probe-fetch] Run scripts/probe-channel-baileys.js first to pair.');
    process.exit(2);
  }

  fs.mkdirSync(LOG_DIR, { recursive: true });
  const ts = Date.now();
  const debugLogPath = path.join(LOG_DIR, `baileys-debug-${ts}.log`);
  const outPath = path.join(LOG_DIR, `probe-newsletter-fetch-${ts}.json`);

  // Pino → file at 'trace' level so we capture EVERY IQ frame Baileys
  // sends/receives. This is the key diagnostic data — if the WhatsApp
  // server responds with `<iq xmlns=newsletter …>` it shows up here.
  const logger = pino(
    { level: 'trace' },
    pino.destination({ dest: debugLogPath, sync: false })
  );

  console.log(`[probe-fetch] debug log → ${debugLogPath}`);
  console.log(`[probe-fetch] inviteCode = ${argvInvite}`);

  const { state, saveCreds } = await useMultiFileAuthState(SESSION_DIR);
  let version;
  try { version = (await fetchLatestBaileysVersion()).version; }
  catch { version = [2, 3000, 1015901307]; }
  console.log(`[probe-fetch] WA Web version = ${version}`);

  console.log('[probe-fetch] connecting (resume)...');
  const sock = await connectWith515Restart(state, saveCreds, version, logger, READY_TIMEOUT_MS);
  console.log('[probe-fetch] ✓ connected as', sock.user?.id);

  // Resolve the JID from the invite code first.
  const meta = await sock.newsletterMetadata('invite', argvInvite);
  const jid = meta?.id || meta?.jid;
  console.log(`[probe-fetch] jid resolved = ${jid}`);
  if (!jid) {
    console.error('[probe-fetch] no jid — aborting');
    sock.end?.();
    process.exit(3);
  }

  // ── Variant matrix ────────────────────────────────────────────────────
  // Each variant is a different call shape. Function signature in source:
  //   newsletterFetchMessages(jid, count: number, since?: number, after?: number)
  // We try counts from 1 to 100 and combinations of since/after to flush
  // out which (if any) coax the server into responding.
  const since24h = Math.floor(Date.now() / 1000) - 86400;
  const variants = [
    { label: 'count1',                args: [jid, 1] },
    { label: 'count5',                args: [jid, 5] },
    { label: 'count20',               args: [jid, 20] },
    { label: 'count100',              args: [jid, 100] },
    { label: 'count20_since24h',      args: [jid, 20, since24h] },
    { label: 'count20_since0',        args: [jid, 20, 0] },
    { label: 'count20_since0_after0', args: [jid, 20, 0, 0] },
  ];

  const results = [];
  for (const v of variants) {
    console.log(`[probe-fetch] ▶ ${v.label}: newsletterFetchMessages(${v.args.slice(1).join(', ')})`);
    const r = await timed(
      v.label,
      () => sock.newsletterFetchMessages(...v.args),
      PER_CALL_TIMEOUT_MS
    );
    if (r.ok) r.value = safeSerialize(r.value);
    results.push({ ...r, args: v.args.slice(1) });
    console.log(`[probe-fetch]   ${r.ok ? '✓' : '✗'} ${r.label} ms=${r.ms} timedOut=${r.timedOut || false}`);
  }

  const findings = {
    inviteCode: argvInvite,
    jid,
    baileysVersion: require('@whiskeysockets/baileys/package.json').version,
    waWebVersion: version,
    debugLogPath,
    variants: results,
    summary: {
      anyResolved: results.some((r) => r.ok && r.value !== undefined && r.value !== null),
      allTimedOut: results.every((r) => r.timedOut),
      mediumMs: results.map((r) => r.ms).sort((a, b) => a - b)[Math.floor(results.length / 2)],
    },
    nextSteps: results.some((r) => r.ok && r.value)
      ? 'IQ DID return something — inspect findings.variants[*].value for parseable content.'
      : 'All variants returned empty/timeout — grep the debug log for "<iq" lines from server to confirm whether responses arrive at all.',
  };

  fs.writeFileSync(outPath, JSON.stringify(findings, null, 2));
  console.log('\n[probe-fetch] ═══════════════════════════════════════════════');
  console.log('[probe-fetch] SUMMARY');
  console.log(JSON.stringify(findings.summary, null, 2));
  console.log(`[probe-fetch] Dump:      ${outPath}`);
  console.log(`[probe-fetch] Debug log: ${debugLogPath}`);
  console.log(`[probe-fetch] Next:      ${findings.nextSteps}`);
  console.log('[probe-fetch] ═══════════════════════════════════════════════');

  // Useful greps you can run after:
  //   grep -E "newsletter.*<iq|<iq.*newsletter|message_updates" logs/baileys-debug-<ts>.log
  //   grep -c "type=result" logs/baileys-debug-<ts>.log

  try { sock.end(); } catch (_) {}
  setTimeout(() => process.exit(0), 3000).unref();
}

main().catch((err) => {
  console.error('[probe-fetch] FATAL:', err);
  process.exit(1);
});
