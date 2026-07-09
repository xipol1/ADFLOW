/**
 * _wa-verify-cocina.js — Promote chomon's staged channels to verified once
 * Channelad's number has been added as ADMIN of each channel.
 *
 * Operator-driven trust path (NO code-in-post): we read each channel's role via
 * the whatsapp-web.js worker (channelMetadata.membershipType, surfaced by the
 * fixed verifyAdminAccess). Where we are owner/admin → promote the Canal to
 * verificado + oro (owner) / plata (admin), tipoAcceso admin_directo, score 95,
 * estado activo. Channels where we're not admin yet are reported as PENDING so
 * the creator can be chased. Being added as admin IS the ownership proof — and
 * it's the same access needed to publish ads.
 *
 *   node _wa-verify-cocina.js <email>            # dry-run (just reads roles)
 *   node _wa-verify-cocina.js <email> --apply    # promote where admin
 *
 * Requires a logged-in wweb session at data/whatsapp-session. FIRST RUN prints a
 * QR in the terminal — scan it ONCE with Channelad's number (your phone). This
 * is a normal single device-link of OUR number; no anti-abuse risk.
 */
'use strict';

require('dotenv').config();
const dns = require('dns');
dns.setServers(['8.8.8.8', '8.8.4.4', '1.1.1.1']);

const path = require('path');
const fs = require('fs');
const qrcode = require('qrcode');
const mongoose = require('mongoose');

// Use the PRODUCTION wweb session. Set here (NOT in .env) — putting
// WHATSAPP_SESSION_PATH in .env makes server.js fork its own worker and hijack
// the session (documented gotcha). wa-worker-host.js sets it the same way.
process.env.WHATSAPP_SESSION_PATH =
  process.env.WHATSAPP_SESSION_PATH || path.join(__dirname, 'data', 'whatsapp-session');

const email = String(process.argv[2] || '').trim().toLowerCase();
const APPLY = process.argv.includes('--apply');
const CHANNELAD_NUMBER = process.env.WHATSAPP_CHANNELAD_NUMBER || '+34674709388';
const RESULT_JSON = path.join(__dirname, '_wa-verify-cocina-result.json');
const QR_PNG = path.join(__dirname, '_wa-session-qr.png');
if (!email) { console.error('Uso: node _wa-verify-cocina.js <email> [--apply]'); process.exit(1); }

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

(async () => {
  await mongoose.connect(process.env.MONGODB_URI, { serverSelectionTimeoutMS: 15000 });
  const Usuario = require('./models/Usuario');
  const Canal = require('./models/Canal');
  const wa = require('./services/WhatsAppAdminClient');

  const user = await Usuario.findOne({ email }).select('_id email nombre').lean();
  if (!user) { console.error(`❌ No existe ${email}`); await mongoose.disconnect(); process.exit(1); }
  const usuarioId = String(user._id);

  const canales = await Canal.find({
    propietario: usuarioId, plataforma: 'whatsapp', identificadorCanal: /@newsletter$/,
  });
  console.log(`👤 ${user.email} · canales WhatsApp staged: ${canales.length}`);
  console.log(APPLY ? '\n✍️  MODO --apply: promoveré los que sean admin\n' : '\n👀 DRY-RUN: solo leo roles (sin --apply no escribo)\n');

  console.log(`Arrancando worker whatsapp-web.js (sesión: ${process.env.WHATSAPP_SESSION_PATH})`);
  console.log(`⚠️  Si sale un QR abajo, ESCANÉALO con el número de Channelad ${CHANNELAD_NUMBER} (tu teléfono).\n`);
  wa.initialize();
  const workerRef = wa.worker; // capture now — wa.shutdown() nulls wa.worker
  let qrShown = false;
  workerRef?.on('message', (msg) => {
    if (msg && msg.event === 'QR_RECEIVED' && msg.qr) {
      qrcode.toFile(QR_PNG, msg.qr, { margin: 1, width: 420 })
        .then(() => { if (!qrShown) { console.log(`\n📲  QR → ${QR_PNG}  (escanéalo con ${CHANNELAD_NUMBER})\n`); qrShown = true; } })
        .catch(() => {});
    }
  });

  const deadline = Date.now() + 5 * 60 * 1000;
  while (!wa.ready && Date.now() < deadline) await sleep(2000);
  if (!wa.ready) { console.error('❌ El worker no llegó a READY (¿QR sin escanear a tiempo?).'); try { wa.shutdown(); } catch (_) {} await mongoose.disconnect(); process.exit(1); }
  console.log('✅ Worker conectado. Leyendo rol de cada canal…\n');

  const now = new Date();
  const out = [];
  for (const canal of canales) {
    const jid = canal.identificadorCanal;
    const nombre = canal.nombreCanal;
    let role = null, isAdmin = false, subs = null, err = null;
    try {
      const acc = await wa.verifyAdminAccess(jid);
      isAdmin = !!acc.isAdmin; role = acc.role || null;
      const info = await wa.getChannelInfo(jid).catch(() => null);
      subs = info?.subscribersCount ?? null;
    } catch (e) { err = e.message; } // not a member / not admin yet → getChatById throws

    if (isAdmin) {
      const isOwner = role === 'owner';
      if (APPLY) {
        canal.set({
          estado: 'activo',
          verificado: true,
          nivelVerificacion: isOwner ? 'oro' : 'plata',
          'verificacion.tipoAcceso': 'admin_directo',
          'verificacion.confianzaScore': 95,
          'botConfig.whatsapp.channelId': jid,
          'botConfig.whatsapp.channelName': nombre,
          'botConfig.whatsapp.adminNumber': CHANNELAD_NUMBER,
          'botConfig.whatsapp.adminAccess': true,
          'botConfig.whatsapp.verificadoEn': now,
        });
        if (subs != null) canal.set({
          'botConfig.whatsapp.seguidoresVerificados': subs,
          'estadisticas.seguidores': subs,
          'estadisticas.ultimaActualizacion': now,
        });
        if (!canal.claimed) { canal.claimed = true; canal.claimedBy = usuarioId; canal.claimedAt = now; }
        try { await canal.save(); }
        catch (e) { err = `save falló: ${e.message}`; out.push({ status: 'error', jid, nombre, role, err }); console.log(`  ❌ ERROR  | ${nombre} → ${err}`); continue; }
      }
      out.push({ status: 'verified', jid, nombre, role, nivel: isOwner ? 'oro' : 'plata', subs });
      console.log(`  ${APPLY ? '✅' : '👁'} ${(isOwner ? 'OWNER→oro' : 'ADMIN→plata').padEnd(11)} | ${String(subs ?? '?').padStart(8)} subs | ${nombre}`);
    } else {
      out.push({ status: 'pending', jid, nombre, role, err });
      console.log(`  ⏳ PENDIENTE  (rol=${role || '—'}${err ? ', ' + err.slice(0, 40) : ''}) | ${nombre}`);
    }
    await sleep(700); // gentle pacing
  }

  const verified = out.filter((o) => o.status === 'verified').length;
  const pending = out.filter((o) => o.status === 'pending').length;
  const errors = out.filter((o) => o.status === 'error').length;
  console.log(`\n${APPLY ? '✅ Aplicado' : '👀 Dry-run'}: ${verified} verificable(s)${APPLY ? ' → promovidos' : ''}, ${pending} pendiente(s) de añadirnos como admin${errors ? `, ${errors} error(es)` : ''}.`);
  if (pending) console.log('   → Pídele a chomon que añada ' + CHANNELAD_NUMBER + ' como admin en los canales PENDIENTE y reejecuta.');
  fs.writeFileSync(RESULT_JSON, JSON.stringify({ usuario: user.email, applied: APPLY, channeladNumber: CHANNELAD_NUMBER, out }, null, 2));

  // Graceful shutdown — WAIT for the worker to finish client.destroy() so the
  // wweb auth is flushed to disk. A too-fast exit kills the worker mid-flush and
  // leaves the session unrestorable (→ QR again next run). Cap at 10s.
  await new Promise((resolve) => {
    const w = workerRef;
    if (!w || w.killed || w.exitCode !== null) { try { wa.shutdown(); } catch (_) {} return resolve(); }
    w.once('exit', resolve);
    try { wa.shutdown(); } catch (_) { return resolve(); }
    setTimeout(resolve, 10000);
  });
  await mongoose.disconnect();
  process.exit(0);
})().catch(async (e) => { console.error('FATAL:', e.message); try { await mongoose.disconnect(); } catch (_) {} process.exit(1); });
