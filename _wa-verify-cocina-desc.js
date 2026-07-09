/**
 * _wa-verify-cocina-desc.js — Verificación de canales por CÓDIGO EN DESCRIPCIÓN
 * (sin admin). Alternativa a _wa-verify-cocina.js cuando el creador no quiere
 * añadir el número de Channelad como admin.
 *
 * Prueba de control: solo el dueño/admins de un canal de WhatsApp pueden editar
 * su descripción. El creador añade un código único a la descripción de cada
 * canal; nosotros lo leemos resolviendo el invite link (NO requiere admin ni
 * seguir el canal: client.getChannelByInviteCode expone name+description) y
 * promovemos el Canal a verificado PLATA (bot_miembro, score 70). Oro queda
 * reservado para acceso admin_directo. Tras verificar, el creador puede borrar
 * el código de la descripción.
 *
 *   node _wa-verify-cocina-desc.js <email> --gen      # genera códigos + mensaje para el creador
 *   node _wa-verify-cocina-desc.js <email>            # dry-run: lee descripciones, marca FOUND/PENDING
 *   node _wa-verify-cocina-desc.js <email> --apply    # promueve los FOUND a verificado plata
 *
 * Sin _wa-desc-codes.json (antes de --gen), el dry-run funciona como TEST DE
 * LECTURA: imprime la descripción actual de cada canal para validar el camino.
 *
 * Requiere la sesión wweb de data/whatsapp-session (ya establecida; si saliera
 * QR → _wa-session-qr.png, escanear con el número de Channelad).
 * Los invite codes salen de _canales-cocina-validated.json (join por JID).
 */
'use strict';

require('dotenv').config();
const dns = require('dns');
dns.setServers(['8.8.8.8', '8.8.4.4', '1.1.1.1']);

const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const qrcode = require('qrcode');
const mongoose = require('mongoose');

// Sesión wweb de producción — set aquí, NO en .env (gotcha: server.js forkearía
// su propio worker sobre la misma LocalAuth). Igual que _wa-verify-cocina.js.
process.env.WHATSAPP_SESSION_PATH =
  process.env.WHATSAPP_SESSION_PATH || path.join(__dirname, 'data', 'whatsapp-session');

const email = String(process.argv[2] || '').trim().toLowerCase();
const GEN = process.argv.includes('--gen');
const APPLY = process.argv.includes('--apply');
const CHANNELAD_NUMBER = process.env.WHATSAPP_CHANNELAD_NUMBER || '+34674709388';
const VALIDATED_JSON = path.join(__dirname, '_canales-cocina-validated.json');
const CODES_JSON = path.join(__dirname, '_wa-desc-codes.json');
const RESULT_JSON = path.join(__dirname, '_wa-verify-desc-result.json');
const MSG_MD = path.join(__dirname, '_mensaje-chomon-codigos.md');
const QR_PNG = path.join(__dirname, '_wa-session-qr.png');
if (!email) { console.error('Uso: node _wa-verify-cocina-desc.js <email> [--gen|--apply]'); process.exit(1); }

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// Código corto, único y legible: CHAD- + 6 chars sin ambiguos (0/O, 1/I/L).
const ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
function genCode() {
  let s = '';
  const bytes = crypto.randomBytes(6);
  for (const b of bytes) s += ALPHABET[b % ALPHABET.length];
  return `CHAD-${s}`;
}

function loadValidatedByJid() {
  const arr = JSON.parse(fs.readFileSync(VALIDATED_JSON, 'utf8'));
  const map = new Map();
  for (const c of arr) if (c.jid) map.set(c.jid, c);
  return map;
}

(async () => {
  await mongoose.connect(process.env.MONGODB_URI, { serverSelectionTimeoutMS: 15000 });
  const Usuario = require('./models/Usuario');
  const Canal = require('./models/Canal');

  const user = await Usuario.findOne({ email }).select('_id email nombre').lean();
  if (!user) { console.error(`❌ No existe ${email}`); await mongoose.disconnect(); process.exit(1); }
  const usuarioId = String(user._id);

  const canales = await Canal.find({
    propietario: usuarioId, plataforma: 'whatsapp', identificadorCanal: /@newsletter$/,
  });
  const byJid = loadValidatedByJid();
  console.log(`👤 ${user.email} · canales WhatsApp staged: ${canales.length}`);

  // ── MODO --gen: generar códigos + mensaje para el creador (no toca WhatsApp ni escribe en Mongo)
  if (GEN) {
    const existing = fs.existsSync(CODES_JSON) ? JSON.parse(fs.readFileSync(CODES_JSON, 'utf8')) : {};
    const codes = {};
    for (const canal of canales) {
      const jid = canal.identificadorCanal;
      // idempotente: conserva códigos ya generados (por si chomon ya pegó alguno)
      codes[jid] = existing[jid] || { code: genCode(), nombre: canal.nombreCanal, generatedAt: new Date().toISOString() };
      codes[jid].nombre = canal.nombreCanal;
    }
    fs.writeFileSync(CODES_JSON, JSON.stringify(codes, null, 2));

    const lines = canales.map((c) => `- *${c.nombreCanal}* → \`${codes[c.identificadorCanal].code}\``).join('\n');
    const msg = `# Mensaje para chomon — verificación por descripción (sin admin)

Hola! Como me dijiste que prefieres no añadir admins, lo hacemos de una forma mucho más sencilla
que no toca los permisos de tus canales y que tus seguidores NI VEN (editar la descripción no
envía ninguna notificación):

1. Abre cada canal → toca el nombre → **Editar** la descripción.
2. **Añade al final de la descripción el código** que te indico abajo para ese canal (tal cual, con el CHAD-).
3. Guarda. No publiques nada — solo la descripción.
4. Avísame cuando los tengas (puedes ir por tandas, no hace falta hacerlos todos de golpe).
5. En cuanto los verifique te aviso y **puedes borrar el código** de la descripción. Tarda minutos.

Códigos (uno distinto por canal):

${lines}

Esto nos sirve como prueba de que controlas los canales (solo el dueño puede editar la descripción)
y con eso quedan verificados en Channelad para empezar con las marcas. 💪
`;
    fs.writeFileSync(MSG_MD, msg);
    console.log(`\n✅ ${canales.length} códigos → ${CODES_JSON}`);
    console.log(`✉️  Mensaje para el creador → ${MSG_MD}\n`);
    for (const c of canales) console.log(`  ${codes[c.identificadorCanal].code}  | ${c.nombreCanal}`);
    await mongoose.disconnect();
    process.exit(0);
  }

  // ── MODO lectura/verificación: necesita el worker wweb
  const codes = fs.existsSync(CODES_JSON) ? JSON.parse(fs.readFileSync(CODES_JSON, 'utf8')) : null;
  if (!codes) console.log('\nℹ️  No hay _wa-desc-codes.json todavía → TEST DE LECTURA (solo imprimo descripciones; genera códigos con --gen).');
  console.log(APPLY ? '\n✍️  MODO --apply: promoveré los canales cuyo código aparezca en la descripción\n' : '\n👀 DRY-RUN: solo leo (sin --apply no escribo)\n');

  const wa = require('./services/WhatsAppAdminClient');
  console.log(`Arrancando worker whatsapp-web.js (sesión: ${process.env.WHATSAPP_SESSION_PATH})`);
  console.log(`⚠️  Si sale un QR → ${QR_PNG}, escanéalo con ${CHANNELAD_NUMBER}.\n`);
  wa.initialize();
  const workerRef = wa.worker;
  let qrShown = false;
  workerRef?.on('message', (msg) => {
    if (msg && msg.event === 'QR_RECEIVED' && msg.qr) {
      qrcode.toFile(QR_PNG, msg.qr, { margin: 1, width: 420 })
        .then(() => { if (!qrShown) { console.log(`\n📲  QR → ${QR_PNG}\n`); qrShown = true; } })
        .catch(() => {});
    }
  });

  const deadline = Date.now() + 5 * 60 * 1000;
  while (!wa.ready && Date.now() < deadline) await sleep(2000);
  if (!wa.ready) { console.error('❌ El worker no llegó a READY.'); try { wa.shutdown(); } catch (_) {} await mongoose.disconnect(); process.exit(1); }
  console.log('✅ Worker conectado. Leyendo descripciones…\n');

  const now = new Date();
  const out = [];
  for (const canal of canales) {
    const jid = canal.identificadorCanal;
    const nombre = canal.nombreCanal;
    const inviteCode = byJid.get(jid)?.code || null;
    const expected = codes?.[jid]?.code || null;

    let description = null, subs = null, source = null, err = null;
    // 1º: resolver por invite (no requiere admin ni seguir el canal)
    if (inviteCode) {
      try {
        const ch = await wa.getChannelByInvite(inviteCode);
        description = ch?.description ?? null;
        subs = ch?.channelMetadata?.subscribersCount ?? ch?.channelMetadata?.size ?? null;
        source = 'invite';
      } catch (e) { err = e.message; }
    }
    // 2º fallback: metadata cruda del invite
    if (description == null && inviteCode) {
      try {
        const raw = await wa.rawInviteMetadata(inviteCode);
        description = raw?.description ?? raw?.newsletter?.description ?? null;
        subs = subs ?? raw?.subscribersCount ?? raw?.subscribers ?? null;
        source = source || 'rawInvite';
      } catch (e) { err = err || e.message; }
    }
    // 3º fallback: getChatById (funciona si seguimos el canal)
    if (description == null) {
      try {
        const info = await wa.getChannelInfo(jid);
        description = info?.description ?? null;
        subs = subs ?? info?.subscribersCount ?? null;
        source = source || 'chat';
      } catch (e) { err = err || e.message; }
    }

    const subsNum = Number(subs);
    const descSnippet = description == null ? null : String(description).replace(/\s+/g, ' ').slice(0, 120);

    if (description == null) {
      out.push({ status: 'unreadable', jid, nombre, inviteCode, err });
      console.log(`  ❌ SIN LECTURA | ${nombre} → ${err || 'descripción no disponible'}`);
    } else if (!expected) {
      out.push({ status: 'read', jid, nombre, source, subs: subsNum || null, descSnippet });
      console.log(`  📖 LEÍDO (${source}) | ${String(subsNum || '?').padStart(8)} subs | ${nombre}\n      desc: ${descSnippet ? `"${descSnippet}"` : '(vacía)'}`);
    } else if (String(description).includes(expected)) {
      if (APPLY) {
        canal.set({
          estado: 'activo',
          verificado: true,
          nivelVerificacion: 'plata',
          'verificacion.tipoAcceso': 'bot_miembro',
          'verificacion.confianzaScore': 70,
          'botConfig.whatsapp.channelId': jid,
          'botConfig.whatsapp.channelName': nombre,
          'botConfig.whatsapp.adminAccess': false,
          'botConfig.whatsapp.verificadoEn': now,
          'botConfig.whatsapp.ultimaLectura': now,
        });
        if (Number.isFinite(subsNum) && subsNum > 0) canal.set({
          'botConfig.whatsapp.seguidoresVerificados': subsNum,
          'estadisticas.seguidores': subsNum,
          'estadisticas.ultimaActualizacion': now,
        });
        if (!canal.claimed) { canal.claimed = true; canal.claimedBy = usuarioId; canal.claimedAt = now; }
        try { await canal.save(); }
        catch (e) { out.push({ status: 'error', jid, nombre, err: `save falló: ${e.message}` }); console.log(`  ❌ ERROR  | ${nombre} → save falló: ${e.message}`); continue; }
      }
      out.push({ status: 'verified', jid, nombre, code: expected, source, subs: subsNum || null, descSnippet, verifiedAt: now.toISOString() });
      console.log(`  ${APPLY ? '✅' : '👁'} CÓDIGO OK→plata | ${String(subsNum || '?').padStart(8)} subs | ${nombre}`);
    } else {
      out.push({ status: 'pending', jid, nombre, code: expected, source, descSnippet });
      console.log(`  ⏳ PENDIENTE (código ${expected} no está en la desc) | ${nombre}`);
    }
    await sleep(1500); // pacing suave entre resoluciones de invite
  }

  const verified = out.filter((o) => o.status === 'verified').length;
  const pending = out.filter((o) => o.status === 'pending').length;
  const unreadable = out.filter((o) => o.status === 'unreadable').length;
  const readOnly = out.filter((o) => o.status === 'read').length;
  if (codes) {
    console.log(`\n${APPLY ? '✅ Aplicado' : '👀 Dry-run'}: ${verified} con código${APPLY ? ' → promovidos a plata' : ''}, ${pending} pendiente(s)${unreadable ? `, ${unreadable} sin lectura` : ''}.`);
    if (pending) console.log('   → Pídele al creador que pegue el código en la descripción de los PENDIENTE y reejecuta.');
  } else {
    console.log(`\n📖 Test de lectura: ${readOnly} descripciones leídas, ${unreadable} sin lectura. Si se leen bien → genera códigos con --gen.`);
  }
  fs.writeFileSync(RESULT_JSON, JSON.stringify({ usuario: user.email, applied: APPLY, mode: codes ? 'verify' : 'read-test', at: now.toISOString(), out }, null, 2));

  // Shutdown esperando al worker (flush de la sesión) — mismo patrón que _wa-verify-cocina.js
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
