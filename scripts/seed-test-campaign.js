#!/usr/bin/env node
/**
 * seed-test-campaign.js — seed the actors to exercise the FULL real campaign flow
 * end-to-end through the app (request → copy → pay → review → publish → metrics).
 *
 * Creates / ensures (idempotent):
 *   - creator@channelad.io   (rol creator, betaAccess, founderTier)  → owns the channel
 *   - La Terreta Cream Canal (whatsapp, priced, marketplace-visible)  → bookable
 *   - advertiser@channelad.io(rol advertiser, betaAccess, fiscal data, credits)
 *
 * WRITES TO PRODUCTION MONGO. Dry-run by default — pass --apply to commit.
 * Re-runnable: existing docs are updated in place; passwords are only (re)set on
 * create or with --reset-password.
 *
 *   node scripts/seed-test-campaign.js              # preview
 *   node scripts/seed-test-campaign.js --apply      # write
 *   node scripts/seed-test-campaign.js --apply --reset-password --password "MiClave123"
 *   flags: --price 25  --reach 0  --no-wa  --creator-email x  --advertiser-email y
 */
'use strict';

require('dotenv').config();
const dns = require('dns');
if (process.env.NODE_ENV !== 'production') {
  try { dns.setServers(['8.8.8.8', '8.8.4.4', '1.1.1.1']); } catch (_) {}
}
const bcrypt = require('bcryptjs');
const database = require('../config/database');

// ── args ──
const argv = (name, def) => {
  const i = process.argv.indexOf(`--${name}`);
  if (i !== -1 && process.argv[i + 1] && !process.argv[i + 1].startsWith('--')) return process.argv[i + 1];
  const pfx = `--${name}=`;
  const hit = process.argv.find((a) => a.startsWith(pfx));
  return hit ? hit.slice(pfx.length) : def;
};
const APPLY = process.argv.includes('--apply');
const RESET_PWD = process.argv.includes('--reset-password');
const NO_WA = process.argv.includes('--no-wa');

const CREATOR_EMAIL = (argv('creator-email', 'creator@channelad.io')).toLowerCase();
const ADV_EMAIL = (argv('advertiser-email', 'advertiser@channelad.io')).toLowerCase();
const PASSWORD = argv('password', 'Channelad.test.2026');
const PRICE = Number(argv('price', '25'));
const CREDITS = Number(argv('credits', '100'));
const REACH_OVERRIDE = argv('reach', '');

// La Terreta Cream (owner: the linked test number) — proven via wa-channel-stats.
const CHANNEL = {
  invite: '0029VbBdRDoKLaHpX2IUXW1u',
  jid: '120363426046114710@newsletter',
  name: 'La Terreta Cream',
  url: 'https://whatsapp.com/channel/0029VbBdRDoKLaHpX2IUXW1u',
};

async function resolveReach() {
  if (REACH_OVERRIDE !== '') return { count: Number(REACH_OVERRIDE), source: 'override' };
  if (NO_WA) return { count: 0, source: 'no-wa-default' };
  try {
    const Stats = require('../services/whatsappChannelStats');
    const stats = new Stats();
    console.log('  Querying live subscriber count (whatsapp-web.js, ~30s)…');
    await stats.init();
    const meta = await stats.getMetaByInvite(CHANNEL.invite);
    await stats.close();
    if (meta && meta.subscribersCount != null) return { count: meta.subscribersCount, name: meta.name, source: 'whatsapp-web.js' };
  } catch (e) {
    console.warn(`  ⚠️ live query failed (${e.message}) — defaulting reach to 0`);
  }
  return { count: 0, source: 'fallback' };
}

async function upsertUser(email, fields, { isNew }) {
  const Usuario = require('../models/Usuario');
  let u = await Usuario.findOne({ email });
  const action = u ? 'update' : 'create';
  if (!APPLY) return { _id: u?._id || '(NEW)', email, action, ref: u };

  if (!u) {
    const pwd = await bcrypt.hash(PASSWORD, 10);
    u = await Usuario.create({ email, password: pwd, ...fields });
  } else {
    Object.assign(u, fields);
    if (RESET_PWD) u.password = await bcrypt.hash(PASSWORD, 10);
    await u.save();
  }
  return { _id: u._id, email, action, ref: u };
}

(async () => {
  console.log('\n══════════════════════════════════════════════════════════════');
  console.log('  Seed test campaign actors —', CHANNEL.name);
  console.log('══════════════════════════════════════════════════════════════');
  console.log(APPLY ? '  MODE: APPLY (writes to production Mongo)' : '  MODE: DRY-RUN (no writes — pass --apply)');
  console.log('  creator   :', CREATOR_EMAIL);
  console.log('  advertiser:', ADV_EMAIL);
  console.log('  price     : €' + PRICE, '| advertiser credits: €' + CREDITS);
  console.log('  password  :', APPLY ? (RESET_PWD ? PASSWORD + ' (reset)' : PASSWORD + ' (only on create)') : PASSWORD);

  const ok = await database.conectar();
  if (!ok) { console.error('✗ Mongo connection failed:', database.getLastConnectionError()?.message); process.exit(1); }
  console.log('  ✓ Mongo connected\n');

  const reach = await resolveReach();
  console.log(`  Reach: ${reach.count} subscribers [${reach.source}]\n`);

  // 1. Creator
  const creator = await upsertUser(CREATOR_EMAIL, {
    nombre: 'Creator', apellido: 'Channelad', rol: 'creator',
    emailVerificado: true, activo: true, betaAccess: true, founderTier: true,
    tipoPerfil: 'individual',
  }, {});
  console.log(`  creator    : ${creator._id} (${creator.action})`);

  // 2. Advertiser (fiscal data complete → datosFacturacion.completado=true via hook)
  const advertiser = await upsertUser(ADV_EMAIL, {
    nombre: 'Advertiser', apellido: 'Test', rol: 'advertiser',
    emailVerificado: true, activo: true, betaAccess: true,
    campaignCreditsBalance: CREDITS,
    datosFacturacion: {
      razonSocial: 'Channelad Test SL', nif: 'B00000000',
      direccion: 'Calle de Prueba 1', cp: '46001', ciudad: 'Valencia',
      provincia: 'Valencia', pais: 'ES', emailFacturacion: ADV_EMAIL, esEmpresa: true,
    },
  }, {});
  console.log(`  advertiser : ${advertiser._id} (${advertiser.action})`);

  // 3. Channel (owned by creator, priced, marketplace-visible)
  const Canal = require('../models/Canal');
  const canalFields = {
    plataforma: 'whatsapp',
    identificadorCanal: CHANNEL.jid,
    nombreCanal: reach.name || CHANNEL.name,
    descripcion: 'Canal de prueba para el flujo end-to-end de Channelad.',
    categoria: 'cocina',
    estado: 'activo',                 // marketplace filter: estado in ['activo','verificado']
    precio: PRICE,                    // createCampaign needs precio >= 1
    idioma: 'es',
    'estadisticas.seguidores': reach.count,
    'estadisticas.ultimaActualizacion': new Date(),
    'crawler.urlPublica': CHANNEL.url,
    'verificacion.tipoAcceso': 'declarado',
  };

  let canal = await Canal.findOne({ plataforma: 'whatsapp', identificadorCanal: CHANNEL.jid });
  let canalAction = canal ? 'update' : 'create';
  if (APPLY) {
    if (!canal) {
      canal = await Canal.create({
        plataforma: 'whatsapp', identificadorCanal: CHANNEL.jid,
        nombreCanal: canalFields.nombreCanal, descripcion: canalFields.descripcion,
        categoria: 'cocina', estado: 'activo', precio: PRICE, idioma: 'es',
        propietario: creator._id,
        estadisticas: { seguidores: reach.count, ultimaActualizacion: new Date() },
        crawler: { urlPublica: CHANNEL.url },
        verificacion: { tipoAcceso: 'declarado' },
      });
    } else {
      canal.propietario = creator._id;
      canal.nombreCanal = canalFields.nombreCanal;
      canal.categoria = 'cocina';
      canal.estado = 'activo';
      canal.precio = PRICE;
      canal.estadisticas = canal.estadisticas || {};
      canal.estadisticas.seguidores = reach.count;
      canal.estadisticas.ultimaActualizacion = new Date();
      canal.crawler = canal.crawler || {};
      canal.crawler.urlPublica = CHANNEL.url;
      await canal.save();
    }
  }
  const canalId = canal?._id || '(NEW)';
  console.log(`  canal      : ${canalId} (${canalAction})  €${PRICE}  ${reach.count} subs\n`);

  if (!APPLY) {
    console.log('  DRY-RUN — nothing written. Re-run with --apply to commit.');
    await database.desconectar();
    process.exit(0);
  }

  // Summary
  console.log('──────────────────────── READY TO TEST ────────────────────────');
  console.log('Accounts (login at the app):');
  console.log(`  CREATOR    ${CREATOR_EMAIL}  /  ${PASSWORD}`);
  console.log(`  ADVERTISER ${ADV_EMAIL}  /  ${PASSWORD}`);
  console.log(`Channel: ${canalFields.nombreCanal}  id=${canalId}  €${PRICE}  ${reach.count} subs`);
  console.log('\nFull flow — see scripts/README-first-campaign.md ("Test the full product flow").');

  await database.desconectar();
  process.exit(0);
})().catch((e) => { console.error('\nFATAL:', e.message); process.exit(1); });
