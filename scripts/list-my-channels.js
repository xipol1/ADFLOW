#!/usr/bin/env node
/**
 * scripts/list-my-channels.js
 *
 * Read-only discovery: prints every WhatsApp channel where this account
 * is admin or follower. No Mongo. No side effects. Used to resolve the
 * sandbox channel's JID (and `name`) before running probe-channel.js
 * against it, so the sandbox never needs to be inserted into the DB.
 *
 * Usage (on the VPS where the LocalAuth session lives):
 *   node scripts/list-my-channels.js
 *
 * Output: name | role | followers | jid
 */

'use strict';

require('dotenv').config();
const whatsappAdmin = require('../services/WhatsAppAdminClient');

const READY_TIMEOUT_MS = 240_000;

function waitForReady(timeoutMs) {
  return new Promise((resolve, reject) => {
    const t0 = Date.now();
    const tick = () => {
      if (whatsappAdmin.ready) return resolve();
      if (Date.now() - t0 > timeoutMs) {
        return reject(new Error(`worker no llegó a READY tras ${timeoutMs / 1000}s`));
      }
      setTimeout(tick, 500);
    };
    tick();
  });
}

function pad(value, width, align = 'left') {
  const s = String(value ?? '');
  if (s.length >= width) return s.substring(0, width);
  const filler = ' '.repeat(width - s.length);
  return align === 'right' ? filler + s : s + filler;
}

function trunc(value, width) {
  const s = String(value ?? '');
  return s.length <= width ? s : s.substring(0, width - 1) + '…';
}

async function main() {
  console.log('[list-channels] Iniciando worker whatsapp-web.js…');
  whatsappAdmin.initialize();

  try {
    await waitForReady(READY_TIMEOUT_MS);
  } catch (e) {
    console.error('[list-channels] FATAL:', e.message);
    console.error('[list-channels] Si es la primera vez, escanea el QR que sale en stdout del worker.');
    process.exit(2);
  }
  console.log('[list-channels] Worker READY');

  let result;
  try {
    result = await whatsappAdmin.listMyChannels();
  } catch (e) {
    console.error('[list-channels] listMyChannels falló:', e.message);
    whatsappAdmin.shutdown();
    setTimeout(() => process.exit(3), 4000).unref();
    return;
  }

  console.log(`\n[list-channels] myNumber:      ${result.myNumber || '(unknown)'}`);
  console.log(`[list-channels] totalChats:    ${result.totalChats}`);
  console.log(`[list-channels] totalChannels: ${result.totalChannels}\n`);

  if (result.diagnostic) {
    console.log('[list-channels] ── diagnostic ──────────────────────────');
    console.log('[list-channels] serverCounts: ' + JSON.stringify(result.diagnostic.serverCounts));
    console.log('[list-channels] ctorCounts:   ' + JSON.stringify(result.diagnostic.ctorCounts));
    console.log('[list-channels] storeProbe:   ' + JSON.stringify(result.diagnostic.storeProbe, null, 2));
    console.log('[list-channels] ────────────────────────────────────────\n');
  }

  const W = { name: 40, role: 9, followers: 10 };
  const header =
    pad('NAME', W.name) + ' ' +
    pad('ROLE', W.role) + ' ' +
    pad('FOLLOWERS', W.followers, 'right') + '  ' +
    'JID';
  console.log(header);
  console.log('─'.repeat(W.name + W.role + W.followers + 70));

  for (const c of result.channels || []) {
    console.log(
      pad(trunc(c.name || '(sin nombre)', W.name), W.name) + ' ' +
      pad(c.role, W.role) + ' ' +
      pad(String(c.followersCount ?? 0), W.followers, 'right') + '  ' +
      (c.jid || '(?)')
    );
  }

  console.log(`\n[list-channels] ${(result.channels || []).length} canales listados.`);
  console.log('[list-channels] Copia el JID del canal sandbox y úsalo con:');
  console.log('[list-channels]   node scripts/probe-channel.js <jid>\n');

  whatsappAdmin.shutdown();
  setTimeout(() => process.exit(0), 6000).unref();
}

main().catch((err) => {
  console.error('[list-channels] FATAL no manejado:', err);
  try { whatsappAdmin.shutdown(); } catch {}
  setTimeout(() => process.exit(1), 6000).unref();
});
