/**
 * _wa-detect-diag.js — diagnose WHY newsletters aren't auto-detected.
 *
 * FRESH pairing (new auth dir) with syncFullHistory:true AND
 * shouldSyncHistoryMessage:()=>true (process the FULL chunk too). Logs every
 * messaging-history.set chunk: syncType, #chats, #newsletters, isLatest — so we
 * see exactly which sync phase delivers the @newsletter chats.
 *
 *   node _wa-detect-diag.js --phone 34674709388
 */
'use strict';
const path = require('path');
const fs = require('fs');
const qrcode = require('qrcode');
const qrTerminal = require('qrcode-terminal');
const QR_PNG = path.join(__dirname, '_wa-onboarding-qr.png');
const { loadBaileys } = require('./services/baileys/authStore');
const { asDisplayName } = require('./services/baileys/displayName');

const AUTH_DIR = path.join(__dirname, '_wa-auth-diag');
const phoneIdx = process.argv.indexOf('--phone');
const phone = phoneIdx !== -1 ? String(process.argv[phoneIdx + 1] || '').replace(/[^0-9]/g, '') : null;

const baileys = loadBaileys();
const { default: makeWASocket, fetchLatestBaileysVersion, useMultiFileAuthState, DisconnectReason } = baileys;

const nlJids = new Set();
const perSync = {};
let done = false, codeSock = null, codeAt = 0, sawLatest = false, lastSock = null, registered = false;
const fin = (c) => { if (!done) { done = true; setTimeout(() => process.exit(c), 400); } };
setTimeout(() => { if (!done) { console.log('\n⏱ corte a los 300s'); summarize(); } }, 300000);
// Re-issue a fresh pairing code every 90s if still not paired (codes expire).
const codeTimer = setInterval(() => { if (lastSock && !done) ensureCode(lastSock).catch(() => {}); }, 90000);
codeTimer.unref?.();

function summarize() {
  console.log('\n════════ RESUMEN DETECCIÓN ════════');
  console.log('Por fase de sync:', JSON.stringify(perSync));
  console.log(`Total @newsletter jids vistos: ${nlJids.size}`);
  fin(0);
}

async function ensureCode(sock) {
  if (!phone || done) return;
  if (sock.authState?.creds?.registered) return;
  if (sock === codeSock && Date.now() - codeAt < 150000) return;
  try {
    const code = await sock.requestPairingCode(phone);
    codeSock = sock; codeAt = Date.now();
    console.log('\n══════════════════════════════════════════════');
    console.log(`🔑  CÓDIGO para +${phone}:   ${code?.match(/.{1,4}/g)?.join('-') || code}`);
    console.log('══════════════════════════════════════════════');
    console.log('   WhatsApp → Dispositivos vinculados → "Vincular con número de teléfono" → teclea el código.\n');
  } catch (e) { console.log('requestPairingCode falló:', e.message); }
}

async function resolveAndFinish(sock) {
  if (done) return;
  console.log(`\n🔎 Resolviendo ${nlJids.size} newsletters detectados…`);
  for (const jid of nlJids) {
    try {
      const m = await sock.newsletterMetadata('jid', jid);
      console.log(`   • ${asDisplayName(m?.thread_metadata?.name, m?.name)} [${m?.viewer_metadata?.role || '-'}] jid=${jid}`);
    } catch (e) { console.log(`   • ${jid} (no resuelto: ${e.message})`); }
    await new Promise((r) => setTimeout(r, 600));
  }
  summarize();
}

async function start() {
  const { state, saveCreds } = await useMultiFileAuthState(AUTH_DIR);
  let version; try { version = (await fetchLatestBaileysVersion()).version; } catch { version = [2, 3000, 1015901307]; }
  const sock = makeWASocket({
    version, auth: state, printQRInTerminal: false,
    browser: ['ChannelAd Detect Diag', 'Chrome', '1.0.0'],
    markOnlineOnConnect: false,
    syncFullHistory: true,
    shouldSyncHistoryMessage: () => true,
  });
  lastSock = sock;
  sock.ev.on('creds.update', async () => { await saveCreds(); if (sock.authState?.creds?.registered) registered = true; });

  sock.ev.on('messaging-history.set', ({ chats, syncType, progress, isLatest }) => {
    const t = String(syncType);
    let n = 0;
    for (const c of chats || []) if (typeof c?.id === 'string' && c.id.endsWith('@newsletter')) { n++; nlJids.add(c.id); }
    perSync[t] = perSync[t] || { chunks: 0, newsletters: 0, chatsTotal: 0 };
    perSync[t].chunks++; perSync[t].newsletters += n; perSync[t].chatsTotal += (chats || []).length;
    console.log(`📦 history.set syncType=${t} chats=${(chats || []).length} newsletters=${n} progress=${progress ?? '-'} isLatest=${isLatest ?? '-'} | acumulado nl=${nlJids.size}`);
    if (isLatest) { sawLatest = true; setTimeout(() => resolveAndFinish(sock), 3000); }
  });

  sock.ev.on('connection.update', async (u) => {
    const { connection, lastDisconnect, qr, receivedPendingNotifications, isOnline } = u;
    if (qr && !phone) {
      console.log('\n📲 Escanea este QR:\n');
      qrTerminal.generate(qr, { small: true });
      try { await qrcode.toFile(QR_PNG, qr, { margin: 2, width: 420 }); console.log(`\n   🖼  Imagen: ${QR_PNG}\n`); } catch (_) {}
    }
    if (receivedPendingNotifications !== undefined || isOnline !== undefined) {
      console.log(`   conn.update: connection=${connection ?? '-'} receivedPending=${receivedPendingNotifications ?? '-'} isOnline=${isOnline ?? '-'}`);
    }
    if (connection === 'open') {
      console.log(`\n✅ open como ${sock.user?.name || sock.user?.id}. Esperando history sync…`);
      setTimeout(() => { if (!done && !sawLatest) resolveAndFinish(sock); }, 45000);
    }
    if (connection === 'close') {
      const code = lastDisconnect?.error?.output?.statusCode;
      const isRestart = code === DisconnectReason?.restartRequired;
      if (code === DisconnectReason?.loggedOut) { console.log('logged out'); fin(1); return; }
      if (!done) {
        // If pairing never completed (code expired), wipe the partial creds so
        // the next socket re-pairs cleanly and issues a FRESH code (instead of
        // dead-ending on a half-registered login). Never wipe after 515.
        if (!isRestart && !registered) { try { fs.rmSync(AUTH_DIR, { recursive: true, force: true }); } catch (_) {} codeSock = null; }
        console.log(`🔄 reconnect (code=${code}, registrado=${registered})`);
        setTimeout(() => start().catch(() => fin(1)), isRestart ? 300 : 1500);
      }
    }
  });

  // Proven pattern: request the pairing code a few seconds AFTER the socket
  // settles (not inside connection.update, which fires too early).
  if (phone) setTimeout(() => ensureCode(sock).catch(() => {}), 3500);
}

start().catch((e) => { console.log('FATAL=' + e.message); fin(1); });
