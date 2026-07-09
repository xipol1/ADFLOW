/* Validate the creator's WhatsApp channel invite links resolve in WhatsApp,
 * using the already-paired local session (READ-ONLY; no DB writes). Confirms
 * each link is live and captures the canonical JID + WA-reported name/subs so
 * tomorrow's onboarding is fast and predictable. */
'use strict';
const path = require('path');
const fs = require('fs');
const { loadBaileys } = require('./services/baileys/authStore');
const { asDisplayName } = require('./services/baileys/displayName');

const AUTH_DIR = path.join(__dirname, '_wa-auth');
const STAGING = path.join(__dirname, '_canales-cocina-staging.json');
const OUT = path.join(__dirname, '_canales-cocina-validated.json');

const baileys = loadBaileys();
const { default: makeWASocket, fetchLatestBaileysVersion, useMultiFileAuthState, DisconnectReason } = baileys;

let done = false;
const fin = (c) => { if (!done) { done = true; setTimeout(() => process.exit(c), 300); } };
setTimeout(() => { if (!done) { console.log('TIMEOUT'); fin(1); } }, 240000);

async function start() {
  const { state, saveCreds } = await useMultiFileAuthState(AUTH_DIR);
  let version; try { version = (await fetchLatestBaileysVersion()).version; } catch { version = [2, 3000, 1015901307]; }
  const sock = makeWASocket({ version, auth: state, printQRInTerminal: false, browser: ['ChannelAd Validate', 'Chrome', '1.0.0'], markOnlineOnConnect: false, syncFullHistory: false });
  sock.ev.on('creds.update', saveCreds);
  sock.ev.on('connection.update', async (u) => {
    const { connection, lastDisconnect } = u;
    if (connection === 'open') {
      const me = String(sock.user?.name || sock.user?.id || '');
      const channels = JSON.parse(fs.readFileSync(STAGING, 'utf8'));
      console.log(`Conectado como ${me}. Validando ${channels.length} canales…\n`);
      const results = [];
      for (const ch of channels) {
        const r = { ...ch, resolves: false, jid: null, nameWA: null, subscribersWA: null, verification: null, error: null };
        try {
          const meta = await sock.newsletterMetadata('invite', ch.code);
          if (meta) {
            const byJid = meta.id ? await sock.newsletterMetadata('jid', meta.id).catch(() => null) : null;
            const src = byJid || meta;
            const tm = src.thread_metadata || meta.thread_metadata || {};
            r.resolves = true;
            r.jid = meta.id || null;
            r.nameWA = asDisplayName(tm.name, meta.name);
            r.subscribersWA = Number(tm.subscribers_count ?? src.subscribers ?? 0) || 0;
            r.verification = tm.verification || meta.verification || 'UNVERIFIED';
          } else { r.error = 'no meta'; }
        } catch (e) { r.error = e.message; }
        results.push(r);
        console.log(`  [${r.resolves ? 'OK ' : 'FALLA'}] ${ch.name}  →  ${r.nameWA || '-'} | jid:${r.jid || '-'} | subsWA:${r.subscribersWA ?? '-'}${r.error ? ' | ' + r.error : ''}`);
        await new Promise((rr) => setTimeout(rr, 1100));
      }
      fs.writeFileSync(OUT, JSON.stringify(results, null, 2));
      const okN = results.filter((r) => r.resolves).length;
      console.log(`\n${okN}/${results.length} canales resuelven correctamente. → ${OUT}`);
      fin(okN === results.length ? 0 : 0);
    }
    if (connection === 'close') {
      const c = lastDisconnect?.error?.output?.statusCode;
      if (c === DisconnectReason?.restartRequired && !done) { setTimeout(() => start().catch(() => fin(1)), 250); }
      else if (c === DisconnectReason?.loggedOut) { console.log('LOGGED_OUT — la sesión local caducó, hay que re-emparejar'); fin(1); }
      else if (!done) { console.log('closed code=' + c + ' — reintentando'); setTimeout(() => start().catch(() => fin(1)), 1500); }
    }
  });
}
start().catch((e) => { console.log('FATAL=' + e.message); fin(1); });
