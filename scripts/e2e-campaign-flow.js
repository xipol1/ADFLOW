#!/usr/bin/env node
/**
 * e2e-campaign-flow.js — drive the REAL campaign lifecycle end-to-end IN-PROCESS
 * (no HTTP server needed). Invokes the actual controllers with mocked req/res, so
 * it exercises real validation, pricing, commission, tracking-link generation,
 * escrow and payout — exactly what the app does, against production Mongo.
 *
 * Flow: createCampaign (advertiser) → pay → confirm (creator) → [click] → [complete].
 * Payment is covered by the advertiser's campaign credits (charge €0), so no Stripe
 * and no real money moves.
 *
 * WRITES TO PRODUCTION MONGO. Dry-run by default — pass --apply to run.
 *   node scripts/e2e-campaign-flow.js                       # preview
 *   node scripts/e2e-campaign-flow.js --apply               # create → pay → confirm
 *   node scripts/e2e-campaign-flow.js --apply --click --complete   # + a real click + complete
 *   flags: --advertiser-email --creator-email --channel-id --target --creative
 */
'use strict';

require('dotenv').config();
const dns = require('dns');
if (process.env.NODE_ENV !== 'production') {
  try { dns.setServers(['8.8.8.8', '8.8.4.4', '1.1.1.1']); } catch (_) {}
}
const database = require('../config/database');

const argv = (name, def) => {
  const i = process.argv.indexOf(`--${name}`);
  if (i !== -1 && process.argv[i + 1] && !process.argv[i + 1].startsWith('--')) return process.argv[i + 1];
  const pfx = `--${name}=`; const hit = process.argv.find((a) => a.startsWith(pfx));
  return hit ? hit.slice(pfx.length) : def;
};
const APPLY = process.argv.includes('--apply');
const DO_CLICK = process.argv.includes('--click');
const DO_COMPLETE = process.argv.includes('--complete');

const ADV_EMAIL = argv('advertiser-email', 'advertiser@channelad.io').toLowerCase();
const CREATOR_EMAIL = argv('creator-email', 'creator@channelad.io').toLowerCase();
const CHANNEL_ID = argv('channel-id', '');
const TARGET = argv('target', 'https://channelad.io/founding?utm_source=e2e-test');
const CREATIVE = argv('creative', '🍳 Receta exprés patrocinada — mira la oferta del día 👇');
// 'short' (/t/hash) is the most robust link format; 'domain' (/go/host/path) can
// hit Vercel trailing-slash 308s when the target path is just '/'.
const TRACKING_FORMAT = argv('tracking-format', 'short');

// Invoke a controller with a mocked req/res/next; resolve with the JSON body or throw.
async function call(handler, { user, body, params }) {
  const req = { usuario: user, body: body || {}, params: params || {}, ip: '203.0.113.55', headers: { 'user-agent': 'e2e-script' } };
  const res = { statusCode: 200 };
  res.status = (c) => { res.statusCode = c; return res; };
  res.json = (b) => { res.body = b; return res; };
  let captured;
  const next = (err) => { captured = err; };
  await handler(req, res, next);
  if (captured) { const e = new Error(captured.message || String(captured)); e.status = captured.status; throw e; }
  if (res.statusCode >= 400) throw new Error(`HTTP ${res.statusCode}: ${JSON.stringify(res.body)}`);
  return res.body;
}

(async () => {
  console.log('\n══════════════════════════════════════════════════════════════');
  console.log('  E2E campaign flow (in-process, real controllers)');
  console.log('══════════════════════════════════════════════════════════════');
  console.log(APPLY ? '  MODE: APPLY (writes a real campaign to production Mongo)' : '  MODE: DRY-RUN (no writes)');

  const ok = await database.conectar();
  if (!ok) { console.error('✗ Mongo:', database.getLastConnectionError()?.message); process.exit(1); }

  const Usuario = require('../models/Usuario');
  const Canal = require('../models/Canal');
  const advertiser = await Usuario.findOne({ email: ADV_EMAIL }).lean();
  const creator = await Usuario.findOne({ email: CREATOR_EMAIL }).lean();
  if (!advertiser || !creator) { console.error('✗ Run scripts/seed-test-campaign.js --apply first.'); process.exit(1); }

  let canal;
  if (CHANNEL_ID) canal = await Canal.findById(CHANNEL_ID).lean();
  else canal = await Canal.findOne({ propietario: creator._id, plataforma: 'whatsapp' }).sort({ createdAt: -1 }).lean();
  if (!canal) { console.error('✗ Channel not found (pass --channel-id).'); process.exit(1); }

  console.log('  advertiser:', advertiser.email, String(advertiser._id), '| credits €' + (advertiser.campaignCreditsBalance ?? 0));
  console.log('  creator   :', creator.email, String(creator._id));
  console.log('  channel   :', canal.nombreCanal, String(canal._id), '€' + (canal.precio ?? 0));
  console.log('  target    :', TARGET);

  if (!APPLY) {
    console.log('\n  DRY-RUN — would: createCampaign → pay → confirm' + (DO_CLICK ? ' → click' : '') + (DO_COMPLETE ? ' → complete' : ''));
    console.log('  Re-run with --apply.');
    await database.desconectar(); process.exit(0);
  }

  const cc = require('../controllers/campaignController');
  const advUser = { id: String(advertiser._id), rol: 'advertiser' };
  const creUser = { id: String(creator._id), rol: 'creator' };

  // 1. REQUEST + COPY
  console.log('\n  [1] createCampaign (advertiser)…');
  const created = await call(cc.createCampaign, { user: advUser, body: { channel: String(canal._id), content: CREATIVE, targetUrl: TARGET, trackingLinkFormat: TRACKING_FORMAT } });
  const id = created.data._id;
  console.log(`      → ${id}  status=${created.data.status}  price=€${created.data.price}  comm=${created.data.commissionRate}`);

  // 2. PAYMENT (credits → €0 charge)
  console.log('  [2] payCampaign (advertiser)…');
  const paid = await call(cc.payCampaign, { user: advUser, params: { id } });
  console.log(`      → status=${paid.data.campaign.status}  creditsUsed=€${paid.data.creditsUsed}  charged=€${paid.data.amountCharged}`);

  // 3. REVIEW + VALIDATION + PUBLICATION (creator confirms)
  console.log('  [3] confirmCampaign (creator)…');
  const confirmed = await call(cc.confirmCampaign, { user: creUser, params: { id } });
  const trackingUrl = confirmed.data.trackingUrl;
  console.log(`      → status=${confirmed.data.status}  publishedAt=${confirmed.data.publishedAt}`);
  console.log(`      → tracking link: ${trackingUrl}`);
  console.log('      (WhatsApp delivery = manual/skipped — creator posts the copy himself)');

  // 4. CLICK (optional) — hit the LIVE Vercel link with a browser UA
  if (DO_CLICK && trackingUrl) {
    console.log('  [4] simulating a click on the live link…');
    try {
      const axios = require('axios');
      await axios.get(trackingUrl, {
        maxRedirects: 0, validateStatus: (s) => s >= 200 && s < 400, timeout: 8000,
        headers: { 'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Safari/537.36' },
      });
      console.log('      → click sent (302).');
    } catch (e) {
      const code = e.response?.status;
      console.log(code ? `      → click sent (HTTP ${code}).` : `      ⚠️ click failed: ${e.message}`);
    }
  }

  // 5. COMPLETE (optional)
  if (DO_COMPLETE) {
    console.log('  [5] completeCampaign…');
    const done = await call(cc.completeCampaign, { user: creUser, params: { id } });
    console.log(`      → status=${done.data.status}`);
  }

  console.log('\n  ✓ Flow done. Campaign:', id);
  console.log('  Metrics:  node scripts/campaign-report.js ' + id);
  if (trackingUrl) console.log('  Live link (click it to add real clicks): ' + trackingUrl);

  await database.desconectar();
  // give non-blocking setImmediate hooks (metrics init, delivery) a moment
  setTimeout(() => process.exit(0), 1500);
})().catch((e) => { console.error('\nFATAL:', e.message); process.exit(1); });
