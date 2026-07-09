/**
 * _wa-onboard-creator.js — REAL local onboarding of a recruited creator's
 * WhatsApp channels, persisted under THEIR Channelad account.
 *
 * Reuses the production BaileysSessionManager (so the BaileysSession is stored
 * in Mongo exactly as prod would) and mirrors baileysController.linkNewsletterToCanal
 * to create/link a Canal under the creator's usuarioId with a verified grant.
 *
 *   node _wa-onboard-creator.js <email> [inviteUrl1] [inviteUrl2] ...
 *
 * WRITES TO PRODUCTION MONGO: BaileysSession (his session), Canal (find-or-create
 * per channel), WhatsAppAuditLog. Ownership grant is applied because we only link
 * newsletters where he is OWNER/ADMIN (detection fixed via newsletterRole.js).
 */
'use strict';

require('dotenv').config();
// NOTE: we DON'T rely on BAILEYS_TRUSTED_OWNERSHIP here. The manager methods we
// use (startLinking/listNewsletters/getNewsletterMetadataByInvite) don't read it;
// the verified grant below is applied DIRECTLY (equivalent to the flag = true),
// and only to newsletters where the creator is OWNER/ADMIN (detection fixed).

const dns = require('dns');
dns.setServers(['8.8.8.8', '8.8.4.4', '1.1.1.1']);

const path = require('path');
const fs = require('fs');
const qrcode = require('qrcode');
const qrTerminal = require('qrcode-terminal');
const mongoose = require('mongoose');

const email = String(process.argv[2] || '').trim().toLowerCase();
const rawArgs = process.argv.slice(3);
const phoneIdx = rawArgs.indexOf('--phone');
const creatorPhone = phoneIdx !== -1 ? String(rawArgs[phoneIdx + 1] || '').replace(/[^0-9]/g, '') : null;
let inviteUrls = rawArgs.filter((a, i) => a && !a.startsWith('--') && i !== phoneIdx + 1);
// If no links passed, default to the pre-validated cooking channels.
if (inviteUrls.length === 0) {
  try {
    const staged = JSON.parse(fs.readFileSync(path.join(__dirname, '_canales-cocina-validated.json'), 'utf8'));
    inviteUrls = staged.filter((c) => c.resolves !== false).map((c) => c.url);
    console.log(`(usando ${inviteUrls.length} canales pre-validados de _canales-cocina-validated.json)`);
  } catch (_) { /* none staged */ }
}
const QR_PNG = path.join(__dirname, '_wa-onboarding-qr.png');
const RESULT_JSON = path.join(__dirname, '_wa-onboarding-creator-result.json');

if (!email) { console.error('Uso: node _wa-onboard-creator.js <email> [inviteUrl...]'); process.exit(1); }

(async () => {
  await mongoose.connect(process.env.MONGODB_URI, { serverSelectionTimeoutMS: 15000 });
  const Usuario = require('./models/Usuario');
  const Canal = require('./models/Canal');
  const WhatsAppAuditLog = require('./models/WhatsAppAuditLog');
  const BaileysSession = require('./models/BaileysSession');
  const manager = require('./services/baileys/BaileysSessionManager');

  let user = await Usuario.findOne({ email }).select('_id email nombre rol').lean();
  if (!user) {
    // Tolerant fallback — the email was given two ways in chat (chomon@ vs chomonnoriega@).
    const stem = email.split('@')[0].slice(0, 6) || email;
    const cands = await Usuario.find({ email: new RegExp(stem, 'i') }).select('_id email nombre rol').limit(10).lean();
    if (cands.length === 1) { user = cands[0]; console.log(`(email exacto no encontrado; usando única coincidencia: ${user.email})`); }
    else { console.error(`❌ No existe ${email}. Candidatos con "${stem}": ${cands.map((c) => c.email).join(', ') || 'ninguno'}`); await mongoose.disconnect(); process.exit(1); }
  }
  const usuarioId = String(user._id);
  console.log(`👤 Usuario: ${user.email} (${user.nombre || 'sin nombre'}, rol=${user.rol}) id=${usuarioId}`);

  // ── Start linking (real manager → BaileysSession persisted) ────────────────
  const { sessionId } = await manager.startLinking(usuarioId, {
    alias: 'Onboarding cocina (local)',
    consentIp: 'local-operator',
    consentUserAgent: 'wa-onboard-creator-script',
  });
  console.log(`🔗 Sesión Baileys creada: ${sessionId}`);

  // ── Pairing-code mode (remote creator): request an 8-char code he types into
  // WhatsApp → "Vincular con número de teléfono". Re-issued if it expires and the
  // manager re-spawns the socket, so a slow creator still gets a fresh code.
  let lastCodeSock = null;
  let lastCodeAt = 0;
  async function ensureCode() {
    if (!creatorPhone) return;
    const sock = manager.sockets.get(sessionId)?.sock;
    if (!sock || sock.authState?.creds?.registered) return;
    if (sock === lastCodeSock && Date.now() - lastCodeAt < 150000) return;
    try {
      const code = await sock.requestPairingCode(creatorPhone);
      lastCodeSock = sock; lastCodeAt = Date.now();
      const pretty = code?.match(/.{1,4}/g)?.join('-') || code;
      console.log('\n══════════════════════════════════════════════');
      console.log(`🔑  CÓDIGO para +${creatorPhone}:   ${pretty}`);
      console.log('══════════════════════════════════════════════');
      console.log('   WhatsApp → Dispositivos vinculados → Vincular un dispositivo →');
      console.log('   "Vincular con número de teléfono" → teclea el código.\n');
    } catch (e) { console.error('requestPairingCode falló (reintentaré):', e.message); }
  }
  if (creatorPhone) { await new Promise((r) => setTimeout(r, 3500)); await ensureCode(); }

  // ── Poll for QR + connection ───────────────────────────────────────────────
  let lastQr = null;
  let connected = false;
  const deadline = Date.now() + 12 * 60 * 1000;
  while (Date.now() < deadline && !connected) {
    const st = await manager.getSessionState(sessionId);
    await ensureCode();
    if (!creatorPhone && st?.qr && st.qr !== lastQr) {
      lastQr = st.qr;
      console.log('\n📲  QR para que el CREADOR lo escanee (Dispositivos vinculados → Vincular dispositivo):\n');
      qrTerminal.generate(st.qr, { small: true });
      try { await qrcode.toFile(QR_PNG, st.qr, { margin: 1, width: 360 }); console.log(`\n   (Imagen: ${QR_PNG})\n`); } catch (_) {}
    }
    if (st?.status === 'connected') { connected = true; break; }
    if (st?.status === 'revoked' || st?.status === 'expired') { console.error(`Sesión ${st.status}.`); break; }
    await new Promise((r) => setTimeout(r, 2500));
  }
  if (!connected) { console.error('No se conectó a tiempo.'); await mongoose.disconnect(); process.exit(1); }
  console.log('\n✅  WhatsApp del creador conectado. Leyendo sus canales…');

  // ── Gather administered newsletters (auto-detect + invite fallback) ────────
  let administered = [];
  for (let i = 0; i < 8 && administered.length === 0; i++) {
    await new Promise((r) => setTimeout(r, 2500));
    const s = await BaileysSession.findById(sessionId).lean();
    administered = (s?.newsletters || []).filter((n) => n.role === 'OWNER' || n.role === 'ADMIN');
  }
  for (const url of inviteUrls) {
    try {
      const { newsletter, administered: ok } = await manager.getNewsletterMetadataByInvite(sessionId, url);
      console.log(`   invite ${url} → "${newsletter.name}" role=${newsletter.role} administra=${ok}`);
      if (ok && !administered.find((n) => n.jid === newsletter.jid)) administered.push(newsletter);
    } catch (e) { console.warn(`   invite ${url} falló: ${e.message}`); }
    await new Promise((r) => setTimeout(r, 1100)); // gentle pacing — avoid WA rate-limit over 16 channels
  }

  console.log(`\n📋 Canales que administra: ${administered.length}`);
  administered.forEach((n) => console.log(`   • ${n.name} [${n.role}] ${n.subscribers} subs · invite:${n.inviteCode || '—'}`));

  // ── Find-or-create a Canal per channel + apply verified grant ──────────────
  const now = new Date();
  const linked = [];
  for (const n of administered) {
    const isOwner = n.role === 'OWNER';
    let canal = await Canal.findOne({
      propietario: usuarioId, plataforma: 'whatsapp',
      $or: [
        { identificadorCanal: n.jid },
        { identificadorCanal: n.inviteCode },
        { 'botConfig.whatsapp.channelJid': n.jid },
      ],
    });
    let created = false;
    if (!canal) {
      canal = await Canal.create({
        propietario: usuarioId,
        plataforma: 'whatsapp',
        identificadorCanal: n.jid,
        nombreCanal: n.name,
        estado: 'pendiente_verificacion',
        verificado: false,
        verificacion: { tipoAcceso: 'declarado', confianzaScore: 10 },
      });
      created = true;
    }

    // Mirror baileysController.linkNewsletterToCanal (trustedOwnership = true),
    // but persist ONLY in-schema fields. The prod controller also sets
    // botConfig.whatsapp.{channelJid,verifiedByMeta,baileysSessionId}, none of
    // which exist in the Canal schema (strict:true) → Mongoose silently drops
    // them. We store the newsletter id where the code actually reads it:
    // identificadorCanal (set on create) + botConfig.whatsapp.channelId
    // (WhatsAppMetricsPoller reads `channelId || identificadorCanal`).
    canal.set({
      'botConfig.whatsapp.channelId': n.jid,
      'botConfig.whatsapp.channelName': n.name,
      'botConfig.whatsapp.adminAccess': true,
      'botConfig.whatsapp.seguidoresVerificados': n.subscribers || 0,
      'botConfig.whatsapp.verificadoEn': now,
      'estadisticas.seguidores': n.subscribers || 0,
      'estadisticas.ultimaActualizacion': now,
      estado: 'activo',
      nivelVerificacion: isOwner ? 'oro' : 'plata',
      verificado: true,
      'verificacion.tipoAcceso': 'admin_directo',
      'verificacion.confianzaScore': 95,
    });
    if (!canal.claimed) { canal.claimed = true; canal.claimedBy = usuarioId; canal.claimedAt = now; canal.claimToken = null; }
    await canal.save();

    await BaileysSession.updateOne(
      { _id: sessionId, 'newsletters.jid': n.jid },
      { $set: { 'newsletters.$.linkedToCanalId': canal._id } }
    );
    await WhatsAppAuditLog.record({
      usuarioId, sessionId, canalId: canal._id,
      action: 'newsletter.linked_to_canal',
      summary: `Canal "${n.name}" vinculado (${n.subscribers || 0} subs)${created ? ' [canal creado]' : ''}`,
      data: { newsletterJid: n.jid, subscribers: n.subscribers, role: n.role, trustedOwnership: true, created },
    });
    linked.push({ canalId: String(canal._id), nombre: n.name, role: n.role, nivel: isOwner ? 'oro' : 'plata', created });
    console.log(`   ${created ? '➕ creado' : '🔁 existente'} → vinculado y verificado (${isOwner ? 'oro' : 'plata'}): ${n.name}`);
  }

  fs.writeFileSync(RESULT_JSON, JSON.stringify({ usuario: user.email, usuarioId, sessionId, administered, linked }, null, 2));
  console.log(`\n✅ Hecho. ${linked.length} canal(es) vinculado(s) bajo ${user.email}.`);
  console.log(`📄 ${RESULT_JSON}`);
  await mongoose.disconnect();
  process.exit(0);
})().catch(async (e) => { console.error('FATAL:', e.message); try { await mongoose.disconnect(); } catch (_) {} process.exit(1); });
