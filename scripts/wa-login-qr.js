#!/usr/bin/env node
/**
 * wa-login-qr.js — one-shot login helper. Renders the WhatsApp QR to a PNG
 * (_wa-login-qr.png) + ASCII, then caches the LocalAuth session and exits on ready.
 * After this, scripts/wa-admin-probe.js starts with no QR. 100% local.
 */
'use strict';

require('dotenv').config();
const path = require('path');
const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode');
const qrTerminal = require('qrcode-terminal');

// Dedicated, isolated session — separate from a running server.js worker.
const SESSION_PATH = process.env.WA_PROBE_SESSION_PATH
  || path.join(__dirname, '..', 'data', 'whatsapp-session-probe');
const PNG = path.join(__dirname, '..', '_wa-login-qr.png');

const client = new Client({
  authStrategy: new LocalAuth({ dataPath: SESSION_PATH }),
  puppeteer: {
    headless: true,
    args: [
      '--no-sandbox', '--disable-setuid-sandbox', '--disable-gpu',
      '--disable-dev-shm-usage', '--disable-accelerated-2d-canvas',
      '--no-first-run', '--single-process',
    ],
  },
});

let qrCount = 0;
client.on('qr', async (qr) => {
  qrCount++;
  qrTerminal.generate(qr, { small: true });
  try {
    await qrcode.toFile(PNG, qr, { width: 560, margin: 2 });
    console.log(`QR_PNG_WRITTEN #${qrCount} ${PNG}`);
  } catch (e) {
    console.error('png render error:', e.message);
  }
});
client.on('authenticated', () => console.log('AUTHENTICATED — session being saved'));
client.on('ready', () => {
  console.log('READY — login complete, session cached at', SESSION_PATH);
  setTimeout(async () => { try { await client.destroy(); } catch (_) {} process.exit(0); }, 1500);
});
client.on('auth_failure', (m) => { console.error('AUTH_FAILURE', m); process.exit(1); });

client.initialize().catch((e) => { console.error('init error:', e.message); process.exit(1); });
console.log('Login QR helper started; session:', SESSION_PATH);
