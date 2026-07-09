/**
 * _wa-stage-cocina.js — Stage chomon's 16 validated cooking channels as
 * Canal records WITHOUT WhatsApp linking, so his inventory is in the product
 * while we finish the (robust) admin-add verification separately.
 *
 * Honest verification posture: these are created as `pendiente_verificacion`,
 * `verificado:false`, `tipoAcceso:declarado`. We validated the invite links
 * LIVE (real subscriber counts + canonical JIDs) but NOT cryptographic
 * ownership — that gets promoted to oro when Channelad's number is added as
 * admin (the whatsapp-web.js path) right before the first campaign.
 *
 * Idempotent: find-or-create per (propietario, plataforma, jid). Re-running
 * updates metadata, never duplicates. WRITES TO PRODUCTION MONGO.
 *
 *   node _wa-stage-cocina.js <email>            # dry-run summary
 *   node _wa-stage-cocina.js <email> --apply    # actually write
 */
'use strict';

require('dotenv').config();
const dns = require('dns');
dns.setServers(['8.8.8.8', '8.8.4.4', '1.1.1.1']);

const path = require('path');
const fs = require('fs');
const mongoose = require('mongoose');

const email = String(process.argv[2] || '').trim().toLowerCase();
const APPLY = process.argv.includes('--apply');
if (!email) { console.error('Uso: node _wa-stage-cocina.js <email> [--apply]'); process.exit(1); }

const idiomaFor = (country) => /aleman|german|deutsch/i.test(country || '') ? 'de' : 'es';

(async () => {
  const staged = JSON.parse(fs.readFileSync(path.join(__dirname, '_canales-cocina-validated.json'), 'utf8'))
    .filter((c) => c.resolves !== false && c.jid);
  console.log(`Canales validados con JID: ${staged.length}`);

  await mongoose.connect(process.env.MONGODB_URI, { serverSelectionTimeoutMS: 15000 });
  const Usuario = require('./models/Usuario');
  const Canal = require('./models/Canal');

  const user = await Usuario.findOne({ email }).select('_id email nombre rol').lean();
  if (!user) { console.error(`❌ No existe ${email}`); await mongoose.disconnect(); process.exit(1); }
  const usuarioId = String(user._id);
  console.log(`👤 ${user.email} (${user.nombre}, rol=${user.rol}) id=${usuarioId}`);
  console.log(APPLY ? '\n✍️  MODO --apply: escribiendo en Mongo\n' : '\n👀 DRY-RUN (sin --apply): solo muestro lo que haría\n');

  const now = new Date();
  const report = [];
  for (const c of staged) {
    const jid = c.jid;
    const nombre = c.nameWA || c.name;
    const subs = c.subscribersWA || c.subscribersExcel || 0;
    let canal = await Canal.findOne({ propietario: usuarioId, plataforma: 'whatsapp', identificadorCanal: jid });
    const action = canal ? 'update' : 'create';

    if (APPLY) {
      if (!canal) {
        canal = new Canal({ propietario: usuarioId, plataforma: 'whatsapp', identificadorCanal: jid });
      }
      canal.set({
        nombreCanal: nombre,
        categoria: c.category || '',
        idioma: idiomaFor(c.country),
        estado: 'pendiente_verificacion',
        verificado: false,
        nivelVerificacion: 'bronce',
        'estadisticas.seguidores': subs,
        'estadisticas.ultimaActualizacion': now,
        'verificacion.tipoAcceso': 'declarado',
        'verificacion.confianzaScore': 40, // links validados en vivo, propiedad aún no
        'botConfig.whatsapp.channelId': jid,
        'botConfig.whatsapp.channelName': nombre,
        'crawler.urlPublica': c.url || '',
        tags: [c.category, c.country].filter(Boolean),
      });
      if (!canal.claimed) { canal.claimed = true; canal.claimedBy = usuarioId; canal.claimedAt = now; }
      await canal.save();
    }
    report.push({ action, jid, nombre, subs, cat: c.category, idioma: idiomaFor(c.country), id: canal?._id ? String(canal._id) : '(dry)' });
    console.log(`  ${action === 'create' ? '➕' : '🔁'} ${action.padEnd(6)} | ${String(subs).padStart(8)} subs | ${c.category?.padEnd(12) || ''} | ${nombre}`);
  }

  const totalSubs = report.reduce((a, r) => a + r.subs, 0);
  const creates = report.filter((r) => r.action === 'create').length;
  console.log(`\n${APPLY ? '✅ Aplicado' : '👀 Dry-run'}: ${report.length} canales (${creates} nuevos, ${report.length - creates} existentes) · alcance total ${totalSubs.toLocaleString('es-ES')} subs`);
  if (APPLY) fs.writeFileSync(path.join(__dirname, '_wa-stage-cocina-result.json'), JSON.stringify({ usuario: user.email, usuarioId, report }, null, 2));
  await mongoose.disconnect();
  process.exit(0);
})().catch(async (e) => { console.error('FATAL:', e.message); try { await mongoose.disconnect(); } catch (_) {} process.exit(1); });
