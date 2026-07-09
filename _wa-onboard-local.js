/**
 * _wa-onboard-local.js — Local manual WhatsApp onboarding / channel verifier.
 *
 * Pairs a WhatsApp account via QR (file-based auth, NO prod DB), then lists the
 * newsletters (channels) and groups the paired account administers — exactly the
 * data the real Baileys onboarding reads. Handles the post-pair 515
 * "restart required" by reconnecting (like the prod BaileysSessionManager).
 *
 * Usage:
 *   node _wa-onboard-local.js                 # pair + list everything you admin
 *   node _wa-onboard-local.js --invite <url>  # also resolve a specific channel by invite link
 *
 * Output: QR in terminal + ./_wa-onboarding-qr.png, results to ./_wa-onboarding-result.json
 * Auth state lives in ./_wa-auth/ (delete it to fully unlink; also remove the
 * device from WhatsApp > Linked devices).
 */
'use strict';

const path = require('path');
const fs = require('fs');
const qrcode = require('qrcode');
const qrTerminal = require('qrcode-terminal');
const { loadBaileys } = require('./services/baileys/authStore');
const { asDisplayName, asDisplayText } = require('./services/baileys/displayName');

const AUTH_DIR = path.join(__dirname, '_wa-auth');
const QR_PNG = path.join(__dirname, '_wa-onboarding-qr.png');
const RESULT_JSON = path.join(__dirname, '_wa-onboarding-result.json');
const APTO_MIN_PARTICIPANTS = 200;

const inviteArgIdx = process.argv.indexOf('--invite');
const inviteArg = inviteArgIdx !== -1 ? process.argv[inviteArgIdx + 1] : null;
const phoneArgIdx = process.argv.indexOf('--phone');
const phoneArg = phoneArgIdx !== -1 ? String(process.argv[phoneArgIdx + 1] || '').replace(/[^0-9]/g, '') : null;

const baileys = loadBaileys();
const { default: makeWASocket, fetchLatestBaileysVersion, useMultiFileAuthState, DisconnectReason } = baileys;

// Module-level state shared across reconnects.
const newsletterJids = new Set();
let done = false;
let reconnects = 0;
let currentSock = null;
let pairingRequested = false;
let registered = false;

function evaluateGroupAptitude({ isAdmin, isAnnounce, count }) {
  const reasons = [];
  if (!isAdmin) reasons.push('No eres administrador del grupo');
  if (count < APTO_MIN_PARTICIPANTS) reasons.push(`Tiene ${count} miembros — mínimo ${APTO_MIN_PARTICIPANTS}`);
  if (isAnnounce) reasons.push('Grupo solo-anuncios — conviértelo en Canal (Newsletter)');
  const apto = isAdmin && count >= APTO_MIN_PARTICIPANTS && !isAnnounce;
  if (apto) reasons.push(`Cumple criterios: admin + ${count} miembros`);
  return { apto, reasons };
}

function finish(code) {
  if (done) return;
  done = true;
  try { currentSock?.end(); } catch (_) {}
  setTimeout(() => process.exit(code), 500);
}

async function collectAndReport(sock) {
  const userJid = String(sock.user?.id || '');
  const userNum = userJid.split('@')[0].split(':')[0];
  console.log(`\n✅  Conectado como ${sock.user?.name || userJid} (${userNum}). Leyendo canales…`);

  const resolved = [];
  for (let attempt = 1; attempt <= 6; attempt++) {
    await new Promise((r) => setTimeout(r, attempt * 2000));
    if (newsletterJids.size === 0) continue;
    resolved.length = 0;
    for (const jid of newsletterJids) {
      try {
        const meta = await sock.newsletterMetadata('jid', jid);
        if (!meta) continue;
        let role = meta.viewer_metadata?.role || meta.role || null;
        if (!role && meta.owner) {
          const ownerNum = String(meta.owner).split('@')[0].split(':')[0];
          role = ownerNum && ownerNum === userNum ? 'OWNER' : 'SUBSCRIBER';
        }
        role = role || 'SUBSCRIBER';
        resolved.push({
          jid: meta.id || jid,
          name: asDisplayName(meta.name, meta.thread_metadata?.name),
          description: asDisplayText(meta.description, meta.thread_metadata?.description),
          subscribers: meta.subscribers || 0,
          verification: meta.verification || 'UNVERIFIED',
          inviteCode: meta.invite || '',
          role,
        });
      } catch (e) { /* skip */ }
    }
    if (resolved.some((n) => n.role === 'OWNER' || n.role === 'ADMIN')) break;
    if (newsletterJids.size > 0 && attempt >= 3) break;
  }
  const administered = resolved.filter((n) => n.role === 'OWNER' || n.role === 'ADMIN');

  let invite = null;
  if (inviteArg) {
    try {
      const userLidNum = String(sock.user?.lid || '').split('@')[0].split(':')[0];
      const code = String(inviteArg).trim().split('?')[0].split('/').filter(Boolean).pop();
      const meta = await sock.newsletterMetadata('invite', code);
      // FIX: invite metadata returns viewer_metadata:null — re-query by JID,
      // which DOES carry the viewer's role (OWNER/ADMIN/SUBSCRIBER).
      const byJid = meta?.id ? await sock.newsletterMetadata('jid', meta.id).catch(() => null) : null;
      const tm = byJid?.thread_metadata || meta?.thread_metadata || {};
      let role = byJid?.viewer_metadata?.role || meta.viewer_metadata?.role || meta.role || null;
      const owner = byJid?.owner || meta.owner;
      if (!role && owner) {
        const ownerNum = String(owner).split('@')[0].split(':')[0];
        role = (ownerNum && (ownerNum === userNum || ownerNum === userLidNum)) ? 'OWNER' : 'SUBSCRIBER';
      }
      role = role || 'SUBSCRIBER';
      invite = {
        jid: meta.id,
        name: asDisplayName(tm.name, meta.name),
        subscribers: Number(tm.subscribers_count ?? meta.subscribers ?? 0) || 0,
        verification: tm.verification || meta.verification || 'UNVERIFIED',
        role,
        administered: role === 'OWNER' || role === 'ADMIN',
      };
    } catch (e) { invite = { error: e.message }; }
  }

  let groups = [];
  try {
    const raw = (await sock.groupFetchAllParticipating()) || {};
    const meLid = sock.user?.lid || '';
    const meJid = userNum + '@s.whatsapp.net';
    for (const jid of Object.keys(raw)) {
      const g = raw[jid] || {};
      const parts = Array.isArray(g.participants) ? g.participants : [];
      const me = parts.find((p) => p.id === meJid || (meLid && p.id === meLid) || p.id === sock.user?.id);
      const isAdmin = !!me && (me.admin === 'admin' || me.admin === 'superadmin');
      const count = parts.length || g.size || 0;
      const { apto, reasons } = evaluateGroupAptitude({ isAdmin, isAnnounce: !!g.announce, count });
      groups.push({ jid, name: asDisplayText(g.subject), participantsCount: count, isAdmin, isAnnounce: !!g.announce, apto, aptoReasons: reasons });
    }
    groups.sort((a, b) => (a.apto !== b.apto ? (a.apto ? -1 : 1) : (b.participantsCount - a.participantsCount)));
  } catch (e) { /* groups optional */ }

  const result = {
    connectedAs: { number: userNum, name: sock.user?.name || '', jid: userJid },
    newsletterJidsSeen: newsletterJids.size,
    newslettersResolved: resolved,
    newslettersAdministered: administered,
    invite, groups,
  };
  fs.writeFileSync(RESULT_JSON, JSON.stringify(result, null, 2));

  console.log('\n══════════════ CANALES (NEWSLETTERS) QUE ADMINISTRAS ══════════════');
  if (administered.length === 0) {
    console.log(`  (0 administrados)  ·  ${newsletterJids.size} newsletter-jids vistos, ${resolved.length} resueltos`);
    if (resolved.length > 0) {
      console.log('  Newsletters vistos (no admin):');
      for (const n of resolved) console.log(`    - ${n.name} [${n.role}] ${n.subscribers} subs`);
    }
    console.log('  → Si tu canal no aparece, reenvía con: node _wa-onboard-local.js --invite <enlace-del-canal>');
  } else {
    for (const n of administered) {
      console.log(`  • ${n.name}  [${n.role}]  ${n.subscribers} subs  ·  ${n.verification}  ·  invite:${n.inviteCode || '—'}`);
    }
  }
  if (invite) console.log('\nCanal por invite:', JSON.stringify(invite));
  const aptos = groups.filter((g) => g.apto);
  console.log(`\n══════════════ GRUPOS: ${groups.length} total · ${aptos.length} aptos ══════════════`);
  for (const g of aptos.slice(0, 15)) console.log(`  • ${g.name}  ${g.participantsCount} miembros  [admin:${g.isAdmin}]`);
  console.log(`\n📄  Resultado completo: ${RESULT_JSON}\n`);
  finish(0);
}

async function start() {
  const { state, saveCreds } = await useMultiFileAuthState(AUTH_DIR);
  let version;
  try { version = (await fetchLatestBaileysVersion()).version; }
  catch { version = [2, 3000, 1015901307]; }

  const sock = makeWASocket({
    version,
    auth: state,
    printQRInTerminal: false,
    browser: ['ChannelAd Onboarding (local)', 'Chrome', '1.0.0'],
    markOnlineOnConnect: false,
    syncFullHistory: false,
  });
  currentSock = sock;

  sock.ev.on('creds.update', async () => {
    await saveCreds();
    if (sock.authState?.creds?.registered) registered = true;
  });
  sock.ev.on('messaging-history.set', ({ chats }) => {
    for (const c of chats || []) {
      if (typeof c?.id === 'string' && c.id.endsWith('@newsletter')) newsletterJids.add(c.id);
    }
  });

  // Pairing-code mode: if a phone number was passed and we're not yet
  // registered, request an 8-char code the user types into WhatsApp
  // (Vincular dispositivo → "Vincular con número de teléfono"). Far more
  // robust than scanning a fast-expiring QR through an async loop.
  if (phoneArg && !sock.authState.creds.registered && !pairingRequested) {
    pairingRequested = true;
    setTimeout(async () => {
      if (done || currentSock !== sock) return;
      try {
        const code = await sock.requestPairingCode(phoneArg);
        const pretty = code?.match(/.{1,4}/g)?.join('-') || code;
        console.log('\n══════════════════════════════════════════════');
        console.log(`🔑  CÓDIGO DE VINCULACIÓN para +${phoneArg}:   ${pretty}`);
        console.log('══════════════════════════════════════════════');
        console.log('   WhatsApp → Ajustes → Dispositivos vinculados →');
        console.log('   "Vincular un dispositivo" → "Vincular con número de teléfono" → escribe el código.\n');
      } catch (e) {
        console.error('No se pudo pedir código de vinculación:', e.message);
      }
    }, 3000);
  }

  sock.ev.on('connection.update', async (u) => {
    const { connection, lastDisconnect, qr } = u;

    if (qr && !phoneArg) {
      console.log('\n📲  Escanea este QR con WhatsApp (Dispositivos vinculados → Vincular dispositivo):\n');
      qrTerminal.generate(qr, { small: true });
      try { await qrcode.toFile(QR_PNG, qr, { margin: 1, width: 360 }); console.log(`\n   (Imagen: ${QR_PNG})\n`); } catch (_) {}
    }

    if (connection === 'open') {
      await collectAndReport(sock).catch((e) => { console.error('Error leyendo canales:', e.message); finish(1); });
    }

    if (connection === 'close') {
      const code = lastDisconnect?.error?.output?.statusCode;
      if (code === DisconnectReason?.loggedOut) {
        console.error('Sesión cerrada (logged out). Borra _wa-auth/ y reescanea.');
        finish(1);
        return;
      }
      // 515 restartRequired is ALWAYS post-successful-pairing: the creds are
      // valid, just reconnect with them intact (never wipe). Only a genuine
      // pairing expiry (408 "QR refs attempts ended" / other) means the QR/code
      // was never used — only THEN wipe partial creds and re-issue a fresh one.
      const isRestart = code === DisconnectReason?.restartRequired;
      if (!done && reconnects < 20) {
        reconnects++;
        if (!isRestart && !registered) {
          pairingRequested = false;
          try { fs.rmSync(AUTH_DIR, { recursive: true, force: true }); } catch (_) {}
        }
        const delay = isRestart ? 250 : 1500;
        console.log(`🔄  Reconectando (intento ${reconnects}, code=${code}, restart=${isRestart}, registrado=${registered})…`);
        setTimeout(() => { start().catch((e) => { console.error('Reconnect failed:', e.message); finish(1); }); }, delay);
      } else if (!done) {
        console.error('Demasiados reintentos de conexión.');
        finish(1);
      }
    }
  });
}

// Safety timeout — exit if we never reach 'open' within 12 minutes.
setTimeout(() => { if (!done) { console.error('\n⏱  Timeout: no se conectó en 12 min.'); finish(1); } }, 720000);

start().catch((e) => { console.error('FATAL:', e.message); process.exit(1); });
