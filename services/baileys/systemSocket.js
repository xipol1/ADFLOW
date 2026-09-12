/**
 * System Baileys socket — file-backed, single-purpose.
 *
 * Unlike the per-user BaileysSessionManager (which authenticates one device
 * per Usuario for verification flows), this module spins up ONE shared
 * "scraper" account whose only job is to fetch public metadata about
 * discovered WhatsApp channels and groups.
 *
 * Differences vs BaileysSessionManager:
 *   - No Usuario / Canal coupling. Single global session.
 *   - File-based auth state (default: data/baileys-system-session/) so the
 *     session can be moved between machines just by copying the folder.
 *   - No audit logs (these reads are not user-attributable).
 *   - Exposes the one operation the enrichment pipeline needs:
 *       getNewsletterMetadata(inviteCode)  → channel info + subs + last post
 *
 * Channels only — groups (chat.whatsapp.com/...) are out of scope for
 * ChannelAd. If you ever need group enrichment, sock.groupGetInviteInfo is
 * still available on the raw Baileys socket.
 *
 * IMPORTANT: requires a long-running Node process. Won't work on Vercel
 * serverless. Use on a VPS or as a Node background worker.
 */

'use strict';

const path = require('path');
const fs = require('fs');
const qrcode = require('qrcode');
const qrTerminal = require('qrcode-terminal');
const { loadBaileys } = require('./authStore');

const DEFAULT_AUTH_DIR = path.join(__dirname, '..', '..', 'data', 'baileys-system-session');

/**
 * Open the system socket. Returns once the socket is constructed; you then
 * await `entry.ready` to wait until WhatsApp confirms the connection (or
 * QR scan if first-time).
 *
 * @param {object} opts
 * @param {string} [opts.authDir] - folder where creds/keys are stored
 * @param {boolean} [opts.printQrToTerminal=true] - print QR ASCII in console
 * @param {string}  [opts.qrPngPath] - if set, also save the QR as a PNG file
 * @param {number}  [opts.connectTimeoutMs=120000] - reject `ready` after this
 * @returns {Promise<{ sock, ready: Promise<{ jid, name, number }>, end: () => Promise<void> }>}
 */
async function openSystemSocket({
  authDir = DEFAULT_AUTH_DIR,
  printQrToTerminal = true,
  qrPngPath = null,
  connectTimeoutMs = 120000,
} = {}) {
  fs.mkdirSync(authDir, { recursive: true });

  const baileys = loadBaileys();
  const {
    default: makeWASocket,
    useMultiFileAuthState,
    fetchLatestBaileysVersion,
    DisconnectReason,
  } = baileys;

  const { state, saveCreds } = await useMultiFileAuthState(authDir);

  let version;
  try {
    const v = await fetchLatestBaileysVersion();
    version = v.version;
  } catch {
    version = [2, 3000, 1015901307]; // safe fallback
  }

  const sock = makeWASocket({
    version,
    auth: state,
    printQRInTerminal: false, // we handle QR ourselves so we control UX
    browser: ['ChannelAd Enrichment', 'Chrome', '1.0.0'],
    markOnlineOnConnect: false,
    syncFullHistory: false,
  });

  sock.ev.on('creds.update', saveCreds);

  // ─── Wait-for-ready promise ──────────────────────────────────────────
  let resolveReady;
  let rejectReady;
  const ready = new Promise((resolve, reject) => {
    resolveReady = resolve;
    rejectReady = reject;
  });
  const readyTimer = setTimeout(() => {
    rejectReady(new Error(`System socket did not become ready within ${connectTimeoutMs}ms`));
  }, connectTimeoutMs);

  // Don't crash the process if ready rejects and nobody awaits it.
  ready.catch(() => {});

  sock.ev.on('connection.update', async (update) => {
    const { connection, lastDisconnect, qr } = update;

    if (qr) {
      if (printQrToTerminal) {
        console.log('\n──── Scan this QR with WhatsApp → Settings → Linked Devices ────\n');
        qrTerminal.generate(qr, { small: true });
      }
      if (qrPngPath) {
        try {
          await qrcode.toFile(qrPngPath, qr, { margin: 1, width: 384 });
          console.log(`  QR PNG saved to: ${qrPngPath}`);
        } catch (err) {
          console.warn(`  QR PNG save failed: ${err.message}`);
        }
      }
    }

    if (connection === 'open') {
      clearTimeout(readyTimer);
      const user = sock.user || {};
      const info = {
        jid: user.id || '',
        name: user.name || user.verifiedName || '',
        number: (user.id || '').split(':')[0].split('@')[0],
      };
      console.log(`\n[✓] System socket connected: ${info.name || info.number} (${info.jid})`);
      resolveReady(info);
    }

    if (connection === 'close') {
      const reason = lastDisconnect?.error?.output?.statusCode;
      const isLoggedOut = reason === DisconnectReason?.loggedOut;
      console.warn(`[!] System socket closed (reason=${reason}, loggedOut=${isLoggedOut})`);
      if (isLoggedOut) {
        clearTimeout(readyTimer);
        rejectReady(new Error('Logged out from phone — re-run baileys-system-bootstrap.js'));
      }
      // For non-loggedOut closures we DO NOT auto-reconnect here. The caller
      // can decide (the enrichment script just exits and you re-run; a long-
      // lived worker would wrap this and reconnect).
    }
  });

  async function end() {
    try {
      sock.end();
    } catch {
      // ignore
    }
  }

  return { sock, ready, end };
}

/**
 * Convenience: fetch a channel/newsletter's metadata by invite code.
 * The invite code is the part after https://whatsapp.com/channel/.
 *
 * @param {object} sock     The Baileys socket (sock from openSystemSocket)
 * @param {string} inviteCode
 * @returns {Promise<object|null>} Raw metadata or null on hard failure.
 */
async function getNewsletterMetadata(sock, inviteCode) {
  if (!sock || typeof sock.newsletterMetadata !== 'function') {
    throw new Error('sock.newsletterMetadata is not available — Baileys version mismatch?');
  }
  try {
    return await sock.newsletterMetadata('invite', inviteCode);
  } catch (err) {
    // Common errors: 404 (link revoked), 400 (bad code), rate limit (429)
    const msg = err.message || String(err);
    if (/not[- ]?found|404/i.test(msg)) return { _error: 'not_found' };
    if (/rate[- ]?limit|429/i.test(msg)) return { _error: 'rate_limited' };
    return { _error: msg.slice(0, 200) };
  }
}

module.exports = {
  openSystemSocket,
  getNewsletterMetadata,
  DEFAULT_AUTH_DIR,
};
