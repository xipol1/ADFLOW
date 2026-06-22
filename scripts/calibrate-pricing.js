#!/usr/bin/env node
/**
 * Pricing calibration — fits BASE_CPM to the REAL marketplace.
 *
 * The pricing model (lib/channelPricingCore.js) has one overall-level dial:
 * BASE_CPM. Every other constant is a relative multiplier. The honest way to set
 * it is against the prices channel owners actually list (Canal.precio), not a
 * guess. This script reverse-solves, for every channel that has both a price and
 * an audience, the BASE_CPM that would make the model reproduce that price:
 *
 *     impliedBaseCpm = precio / ( reach/1000 · platformMult · nicheMult · taper )
 *
 * ...then reports the distribution. The median is the BASE_CPM that best centres
 * the model on reality. Compare it to the current BASE_CPM and adjust if they
 * diverge a lot.
 *
 * USAGE
 *   node scripts/calibrate-pricing.js                 # all priced channels
 *   node scripts/calibrate-pricing.js --platform telegram
 *   node scripts/calibrate-pricing.js --min-followers 2000 --min-price 5
 *
 * Required env: MONGODB_URI. Read-only — never writes.
 */

require('dotenv').config();
const dns = require('dns');
dns.setServers(['1.1.1.1', '8.8.8.8']);

const PRICING = require('../lib/channelPricingCore');

// Category (free text) → niche id, same mapping the outreach generator uses.
const CATEGORY_TO_NICHE = {
  finanzas: 'finanzas', inversiones: 'finanzas', bolsa: 'finanzas',
  cripto: 'cripto', crypto: 'cripto', trading: 'cripto', bitcoin: 'cripto',
  tecnologia: 'tech', tech: 'tech', programacion: 'tech', software: 'tech',
  negocios: 'marketing', marketing: 'marketing', emprendimiento: 'marketing',
  ecommerce: 'ecommerce', educacion: 'educacion', noticias: 'noticias',
  entretenimiento: 'entretenimiento', memes: 'entretenimiento', gaming: 'gaming',
  deportes: 'lifestyle', comunidad: 'lifestyle', lifestyle: 'lifestyle',
  salud: 'fitness', fitness: 'fitness', dieta: 'fitness',
  cocina: 'lifestyle', recetas: 'lifestyle', food: 'lifestyle', comida: 'lifestyle',
};

function nicheFor(category) {
  return CATEGORY_TO_NICHE[String(category || '').toLowerCase().trim()] || 'lifestyle';
}

function parseArgs(argv) {
  const a = argv.slice(2);
  const get = (n, d = null) => {
    const i = a.indexOf(`--${n}`);
    return i >= 0 && a[i + 1] && !a[i + 1].startsWith('--') ? a[i + 1] : d;
  };
  return {
    platform: (get('platform', 'all') || 'all').toLowerCase(),
    minFollowers: Number(get('min-followers', '1000')),
    minPrice: Number(get('min-price', '1')),
  };
}

function percentile(arr, p) {
  if (!arr.length) return null;
  const s = [...arr].sort((x, y) => x - y);
  return s[Math.min(s.length - 1, Math.max(0, Math.floor((p / 100) * s.length)))];
}

async function main() {
  const opts = parseArgs(process.argv);

  const database = require('../config/database');
  const Canal = require('../models/Canal');

  console.log('[calibrate] Connecting to MongoDB...');
  if (!(await database.conectar())) {
    console.error('[calibrate] ✗ MongoDB connection failed (check MONGODB_URI).');
    process.exit(1);
  }

  const q = {
    precio: { $gte: opts.minPrice },
    'estadisticas.seguidores': { $gte: opts.minFollowers },
  };
  if (opts.platform !== 'all') q.plataforma = opts.platform;

  const docs = await Canal.find(q)
    .select('plataforma categoria precio estadisticas')
    .limit(5000)
    .lean();

  console.log(`[calibrate] ${docs.length} priced channels matched.\n`);

  const implied = [];
  for (const c of docs) {
    const followers = c.estadisticas?.seguidores || 0;
    const platform = c.plataforma;
    const niche = nicheFor(c.categoria);
    const rate = PRICING.reachRate(platform, followers);
    const reach = followers * rate;
    if (reach <= 0) continue;
    const platMult = PRICING.PLATFORM_CPM_MULT[platform] || 1;
    const nicheMult = PRICING.NICHE_CPM_MULT[niche] || 1;
    const taper = PRICING.scaleTaper(reach);
    const denom = (reach / 1000) * platMult * nicheMult * taper;
    if (denom <= 0) continue;
    implied.push(c.precio / denom);
  }

  if (!implied.length) {
    console.log('[calibrate] No usable rows (need precio + seguidores). Nothing to fit.');
    await database.desconectar().catch(() => {});
    process.exit(0);
  }

  const p25 = percentile(implied, 25);
  const p50 = percentile(implied, 50);
  const p75 = percentile(implied, 75);

  console.log(`  current BASE_CPM ............ ${PRICING.BASE_CPM.toFixed(2)} €`);
  console.log(`  implied BASE_CPM (p25/p50/p75) ${p25.toFixed(2)} / ${p50.toFixed(2)} / ${p75.toFixed(2)} €`);
  console.log(`  sample size ................. ${implied.length}\n`);

  const drift = p50 / PRICING.BASE_CPM;
  if (drift > 1.25 || drift < 0.8) {
    console.log(`  → Suggest setting BASE_CPM ≈ ${p50.toFixed(1)} (median of real prices).`);
    console.log('    The model currently ' + (drift > 1 ? 'UNDER' : 'OVER') + 'prices vs the market.');
  } else {
    console.log('  → BASE_CPM is well-centred on the market (within ±20% of the median). No change needed.');
  }

  await database.desconectar().catch(() => {});
  process.exit(0);
}

main().catch((err) => {
  console.error('FATAL:', err?.message || err);
  process.exit(1);
});
