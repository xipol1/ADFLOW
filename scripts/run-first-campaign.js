#!/usr/bin/env node
/**
 * run-first-campaign.js — create the FIRST real link-attribution campaign.
 *
 * Model: WhatsApp doesn't expose channel posts/views to linked devices, so the
 * CREATOR publishes the ad himself; we measure CLICKS on a tracked link
 * (https://channelad.io/r/<campaignId> → app.js → models/Tracking). The only
 * channel metric we can read is the subscriber count by invite code
 * (services/whatsappChannelStats.js), stored as reachAtStart for the CTR base.
 *
 * WRITES TO PRODUCTION MONGO. Dry-run by default — pass --apply to actually write.
 *
 * Usage:
 *   node scripts/run-first-campaign.js \
 *     --advertiser-name "Wetaca" --advertiser-email ads@wetaca.com \
 *     --invite 0029Vb82Fo0I7BeLLtWLvh2B \
 *     --target https://wetaca.com/oferta \
 *     --creative "🍱 Comida real a domicilio. 20% con el código CANAL. {{LINK}}" \
 *     [--creator-email chomon@gmail.com] [--price 0] [--reach 12345] [--no-wa] \
 *     --apply
 *
 * Put {{LINK}} in the creative where the tracked link should go; if omitted it's
 * appended. Without --apply nothing is written — it prints the full plan.
 */
'use strict';

require('dotenv').config();

// Atlas SRV records fail on some local routers — use public DNS (mirrors server.js).
const dns = require('dns');
if (process.env.NODE_ENV !== 'production') {
  try { dns.setServers(['8.8.8.8', '8.8.4.4', '1.1.1.1']); } catch (_) {}
}

const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const database = require('../config/database');
const { checkUrl } = require('../lib/urlBlocklist');

// ─── Args ───────────────────────────────────────────────────────────────────
function arg(name, def = undefined) {
  const pfx = `--${name}=`;
  const hit = process.argv.find((a) => a === `--${name}` || a.startsWith(pfx));
  if (!hit) return def;
  if (hit === `--${name}`) return true;        // boolean flag
  return hit.slice(pfx.length);
}
// also support "--name value" form
function argv(name, def = undefined) {
  const i = process.argv.indexOf(`--${name}`);
  if (i !== -1 && process.argv[i + 1] && !process.argv[i + 1].startsWith('--')) return process.argv[i + 1];
  return arg(name, def);
}

const APPLY = process.argv.includes('--apply');
const NO_WA = process.argv.includes('--no-wa');
const ADV_NAME = argv('advertiser-name', '');
const ADV_EMAIL = (argv('advertiser-email', '') || '').toLowerCase();
const CREATOR_EMAIL = (argv('creator-email', 'chomon@gmail.com') || '').toLowerCase();
const INVITE_RAW = argv('invite', '');
const TARGET = argv('target', '');
const CREATIVE = argv('creative', '');
const PRICE = Number(argv('price', '0'));
const REACH_OVERRIDE = argv('reach', '');

// ─── Helpers ──────────────────────────────────────────────────────────────────
const inviteCodeOf = (s) => String(s || '').trim()
  .replace(/^https?:\/\/(?:www\.)?whatsapp\.com\/channel\//i, '').replace(/[/?#].*$/, '');

function validateTargetUrl(raw) {
  const value = String(raw || '').trim();
  if (!value) return { ok: false, message: 'targetUrl es requerido' };
  let parsed;
  try { parsed = new URL(value); } catch { return { ok: false, message: 'targetUrl no es una URL válida' }; }
  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return { ok: false, message: 'targetUrl debe usar http o https' };
  const verdict = checkUrl(value);
  if (!verdict.allowed) return { ok: false, message: `Destino no permitido (${verdict.category || 'bloqueado'})` };
  return { ok: true, url: parsed.toString() };
}

function loadValidatedChannel(code) {
  try {
    const list = require('../_canales-cocina-validated.json');
    const arr = Array.isArray(list) ? list : (list.canales || list.channels || []);
    return arr.find((c) => c.code === code || inviteCodeOf(c.url) === code) || null;
  } catch (_) { return null; }
}

async function resolveReach(invite) {
  if (REACH_OVERRIDE) return { subscribersCount: Number(REACH_OVERRIDE), name: '', jid: '', source: 'override' };

  if (!NO_WA) {
    try {
      const Stats = require('../services/whatsappChannelStats');
      const stats = new Stats();
      console.log('  Querying live subscriber count via whatsapp-web.js (may take ~30s)…');
      await stats.init();
      const meta = await stats.getMetaByInvite(invite);
      await stats.close();
      if (meta && meta.subscribersCount != null) return { ...meta, source: 'whatsapp-web.js' };
      console.warn('  ⚠️ live query returned no count — falling back to validated JSON');
    } catch (e) {
      console.warn(`  ⚠️ live query failed (${e.message}) — falling back to validated JSON`);
    }
  }

  const v = loadValidatedChannel(invite);
  if (v) return { subscribersCount: v.subscribersWA ?? v.subscribersExcel ?? null, name: v.nameWA || v.name || '', jid: v.jid || '', source: 'validated-json' };
  return { subscribersCount: null, name: '', jid: '', source: 'none' };
}

async function findOrCreateUser(email, { nombre, rol }) {
  const Usuario = require('../models/Usuario');
  let u = await Usuario.findOne({ email });
  if (u) return { user: u, created: false };
  if (!APPLY) return { user: { _id: '(NEW)', email, nombre, rol }, created: true };
  const randomPwd = await bcrypt.hash(crypto.randomBytes(24).toString('hex'), 10);
  u = await Usuario.create({
    email, password: randomPwd, nombre: nombre || '', rol: rol || 'advertiser',
    activo: true, emailVerificado: false,
  });
  return { user: u, created: true };
}

async function findOrCreateCanal({ jid, invite, name, reach, ownerId }) {
  const Canal = require('../models/Canal');
  const identificador = jid || inviteCodeOf(invite);
  let c = await Canal.findOne({ plataforma: 'whatsapp', identificadorCanal: identificador });
  if (c) {
    // refresh the snapshot reach (non-destructive)
    if (APPLY && reach != null) {
      c.estadisticas = c.estadisticas || {};
      c.estadisticas.seguidores = reach;
      c.estadisticas.ultimaActualizacion = new Date();
      if (!c.nombreCanal && name) c.nombreCanal = name;
      await c.save();
    }
    return { canal: c, created: false };
  }
  if (!APPLY) return { canal: { _id: '(NEW)', identificadorCanal: identificador, nombreCanal: name }, created: true };
  c = await Canal.create({
    plataforma: 'whatsapp',
    identificadorCanal: identificador,
    nombreCanal: name || '',
    propietario: ownerId && ownerId !== '(NEW)' ? ownerId : undefined,
    estado: 'activo',
    estadisticas: { seguidores: reach ?? 0, ultimaActualizacion: new Date() },
    crawler: { urlPublica: `https://whatsapp.com/channel/${inviteCodeOf(invite)}` },
    verificacion: { tipoAcceso: 'declarado' },
  });
  return { canal: c, created: true };
}

function composeCreative(creative, link) {
  const text = String(creative || '');
  if (text.includes('{{LINK}}')) return text.replace(/\{\{LINK\}\}/g, link);
  return `${text}\n\n👉 ${link}`;
}

// ─── Main ─────────────────────────────────────────────────────────────────────
(async () => {
  console.log('\n══════════════════════════════════════════════════════════════');
  console.log('  Channelad — first link-attribution campaign');
  console.log('══════════════════════════════════════════════════════════════');
  console.log(APPLY ? '  MODE: APPLY (will WRITE to production Mongo)' : '  MODE: DRY-RUN (no writes — pass --apply to commit)');

  // Validate inputs up front
  const errors = [];
  if (!ADV_NAME && !ADV_EMAIL) errors.push('--advertiser-name or --advertiser-email required');
  if (!INVITE_RAW) errors.push('--invite required (channel invite code or URL)');
  if (!TARGET) errors.push('--target required (advertiser landing URL)');
  if (!CREATIVE) errors.push('--creative required (ad text)');
  const urlCheck = validateTargetUrl(TARGET);
  if (TARGET && !urlCheck.ok) errors.push(`targetUrl: ${urlCheck.message}`);
  if (errors.length) {
    console.error('\n✗ Missing/invalid parameters:\n  - ' + errors.join('\n  - '));
    console.error('\nSee the header of this file for usage.');
    process.exit(1);
  }

  const invite = inviteCodeOf(INVITE_RAW);
  const advEmail = ADV_EMAIL || `${(ADV_NAME || 'advertiser').toLowerCase().replace(/[^a-z0-9]+/g, '.').replace(/(^\.|\.$)/g, '')}@founding.channelad.io`;

  console.log('\n  Params:');
  console.log('    advertiser :', ADV_NAME || '(from email)', '<' + advEmail + '>');
  console.log('    creator    :', CREATOR_EMAIL);
  console.log('    invite     :', invite);
  console.log('    target     :', urlCheck.url);
  console.log('    price      :', PRICE, PRICE === 0 ? '(founding brand — no commission)' : '');

  // Connect Mongo
  console.log('\n  Connecting to Mongo…');
  const ok = await database.conectar();
  if (!ok) { console.error('✗ Mongo connection failed:', database.getLastConnectionError()?.message); process.exit(1); }
  console.log('  ✓ Mongo connected');

  // Resolve reach (subscriber count)
  console.log('\n  Resolving channel reach…');
  const reachInfo = await resolveReach(invite);
  console.log(`    subscribers: ${reachInfo.subscribersCount ?? '(unknown)'}  [${reachInfo.source}]`);
  if (reachInfo.name) console.log(`    name       : ${reachInfo.name}`);
  if (reachInfo.jid) console.log(`    jid        : ${reachInfo.jid}`);

  // Resolve advertiser + creator + canal
  const { user: advertiser, created: advNew } = await findOrCreateUser(advEmail, { nombre: ADV_NAME, rol: 'advertiser' });
  const { user: creator, created: creatorNew } = await findOrCreateUser(CREATOR_EMAIL, { nombre: 'chomon', rol: 'creator' });
  const { canal, created: canalNew } = await findOrCreateCanal({
    jid: reachInfo.jid, invite, name: reachInfo.name, reach: reachInfo.subscribersCount, ownerId: creator._id,
  });

  console.log('\n  Resolved refs:');
  console.log(`    advertiser: ${advertiser._id} ${advNew ? '(NEW)' : '(existing)'}`);
  console.log(`    creator   : ${creator._id} ${creatorNew ? '(NEW)' : '(existing)'}`);
  console.log(`    canal     : ${canal._id} ${canalNew ? '(NEW)' : '(existing)'}`);

  // Build the campaign doc
  const Campaign = require('../models/Campaign');
  const doc = {
    advertiser: advertiser._id,
    channel: canal._id,
    creator: creator._id,
    content: CREATIVE,
    targetUrl: urlCheck.url,
    price: PRICE,
    commissionRate: 0,           // founding brand — first campaign free of commission
    pricingVersion: 2,
    status: 'DRAFT',             // schema enum has no 'pendiente'; DRAFT = pending publish
    attributionMode: 'link',
    reachAtStart: reachInfo.subscribersCount,
    waChannel: { invite, jid: reachInfo.jid || '', name: reachInfo.name || '' },
    createdAt: new Date(),
  };

  if (!APPLY) {
    console.log('\n  DRY-RUN — would create Campaign:');
    console.log(JSON.stringify({ ...doc, advertiser: String(doc.advertiser), channel: String(doc.channel), creator: String(doc.creator) }, null, 2));
    console.log('\n  Tracked link (after --apply): https://channelad.io/r/<CAMPAIGN_ID>');
    console.log('\n  Re-run with --apply to write to production.');
    await database.desconectar();
    process.exit(0);
  }

  // APPLY: persist
  const campaign = await Campaign.create(doc);
  const link = `https://channelad.io/r/${campaign._id}`;
  campaign.trackingUrl = link;
  await campaign.save();

  const finalCreative = composeCreative(CREATIVE, link);

  console.log('\n  ✓ Campaign created:', String(campaign._id));
  console.log('  ✓ Tracked link    :', link);

  console.log('\n──────────────────── SEND THIS TO chomon ────────────────────');
  console.log(`Canal: ${reachInfo.name || invite}  (${reachInfo.subscribersCount ?? '?'} subs)`);
  console.log('Enlace trackeado:', link);
  console.log('\nCreativo a publicar (cópialo tal cual):\n');
  console.log(finalCreative);
  console.log('\n──────────────────────────────────────────────────────────────');
  console.log('\nNext: chomon publishes it, forwards you the post, then:');
  console.log(`  node scripts/confirm-delivery.js ${campaign._id}`);
  console.log(`  node scripts/campaign-report.js ${campaign._id}`);

  // Persist a local record for convenience (git-ignored)
  try {
    fs.writeFileSync(
      path.join(__dirname, '..', `_campaign-${campaign._id}.json`),
      JSON.stringify({ id: String(campaign._id), link, finalCreative, ...doc, advertiser: String(doc.advertiser), channel: String(doc.channel), creator: String(doc.creator) }, null, 2),
    );
  } catch (_) {}

  await database.desconectar();
  process.exit(0);
})().catch((e) => { console.error('\nFATAL:', e.message); process.exit(1); });
