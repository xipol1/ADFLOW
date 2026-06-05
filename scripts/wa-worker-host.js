#!/usr/bin/env node
/**
 * wa-worker-host.js — Always-on host for the whatsapp-web.js worker (LOCAL PC).
 *
 * This is the process you keep alive with pm2 so the WhatsApp Web client stays
 * connected and the LocalAuth session persists. It does NOT start Express, does
 * NOT touch Mongo. It just forks + supervises workers/whatsappWorker.js via the
 * existing WhatsAppAdminClient singleton, and logs health every minute.
 *
 * FIRST START prints a QR (visible in `pm2 logs wa-worker-host`) — scan it once
 * with the admin number; after that the session is cached and restarts are silent.
 *
 *   npm i -g pm2
 *   pm2 start scripts/wa-worker-host.js --name wa-worker-host
 *   pm2 logs wa-worker-host        # scan the QR on first start
 *   pm2 save
 *
 * Uses the REAL session path (data/whatsapp-session) by default — the probe uses
 * a separate data/whatsapp-session-test so the two never collide.
 */

'use strict';

require('dotenv').config();
const path = require('path');

// Host runs the production session, not the probe's test session.
process.env.WHATSAPP_SESSION_PATH =
  process.env.WA_HOST_SESSION_PATH ||
  path.join(__dirname, '..', 'data', 'whatsapp-session');

const wa = require('../services/WhatsAppAdminClient');

console.log('[wa-host] starting; session:', process.env.WHATSAPP_SESSION_PATH);
wa.initialize();

const healthTimer = setInterval(async () => {
  try {
    const h = await wa.healthCheck();
    console.log('[wa-host] health', JSON.stringify(h));
  } catch (e) {
    console.log('[wa-host] not ready yet:', e.message);
  }
}, 60000);

function stop(sig) {
  console.log(`[wa-host] ${sig} — shutting down`);
  clearInterval(healthTimer);
  try { wa.shutdown(); } catch (_) {}
  setTimeout(() => process.exit(0), 3000);
}
process.on('SIGTERM', () => stop('SIGTERM'));
process.on('SIGINT', () => stop('SIGINT'));
