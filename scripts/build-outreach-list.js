#!/usr/bin/env node
/**
 * Outreach target-list generator.
 *
 * Turns the backlog of already-scraped, UNCLAIMED channels in the DB into a
 * prioritised, contact-ready CSV for creator outreach — the cheapest possible
 * supply-acquisition lever (we already paid to discover these channels; this
 * just lets us go claim their owners).
 *
 * For each candidate it estimates the creator's earning potential using the
 * SAME pricing model as the public calculator (client/src/ui/lib/channelPricing.js),
 * so the "~X €/post" figure in the outreach message matches what the owner sees
 * if they plug their numbers into /para-canales. The list is sorted highest-value
 * first, so you contact the channels worth the most time first.
 *
 * USAGE
 *   node scripts/build-outreach-list.js --niche cocina --platform whatsapp
 *   node scripts/build-outreach-list.js --platform telegram --min-followers 5000 --limit 200
 *   node scripts/build-outreach-list.js --keywords cocina,recetas,airfryer
 *   node scripts/build-outreach-list.js --self-test        # offline, no DB (sanity check)
 *   node scripts/build-outreach-list.js --dry-run          # query DB but don't write the CSV
 *
 * FLAGS
 *   --platform <telegram|whatsapp|discord|all>   default: all three
 *   --niche <preset>                             cocina|cripto|finanzas|tech|marketing|fitness|gaming
 *   --keywords a,b,c                             custom keyword filter (overrides --niche presets)
 *   --pricing-niche <id>                         force a NICHES id for the € estimate (else auto from category)
 *   --min-followers N                            default: 1000
 *   --limit N                                    default: 300
 *   --posts-per-month N                          default: 4 (sponsored posts assumed for the monthly figure)
 *   --include-claimed                            include already-claimed channels (default: only unclaimed)
 *   --out <path>                                 output CSV path (default: outreach/lists/outreach-<niche>-<platform>-<date>.csv)
 *   --dry-run                                    don't write the file, just print the summary
 *   --self-test                                  run the pricing model on sample data, no DB
 *
 * Required env: MONGODB_URI (not needed for --self-test).
 */

require('dotenv').config();
const dns = require('dns');
dns.setServers(['1.1.1.1', '8.8.8.8']);

const fs = require('fs');
const path = require('path');

// ── Pricing model ────────────────────────────────────────────────────────────
// Uses the canonical pricing core (lib/channelPricingCore.js) — the SAME model
// the public calculator mirrors. So the "~X €/post" figure in the outreach
// message matches what the owner sees if they plug their numbers into
// /para-canales. No more duplicated CPM constants drifting out of sync.
const PRICING = require('../lib/channelPricingCore');
const { NICHE_CPM_MULT } = PRICING;
const DEFAULT_PRICING_NICHE = 'lifestyle';

// Upper bound for the € estimate. The public calculator's followers slider tops
// out here, so clamping keeps the outreach figure reproducible on the site (a
// channel above this would otherwise be quoted a number the owner can't verify).
// The sublinear model keeps even clamped figures sane. Override with
// --max-followers-for-estimate.
const DEFAULT_FOLLOWERS_CAP = 2_000_000;

// Map a channel's free-text category (already normalised by the scrapers) to a
// NICHES id for the € estimate. Unknown → DEFAULT_PRICING_NICHE (conservative).
const CATEGORY_TO_NICHE = {
  finanzas: 'finanzas', inversiones: 'finanzas', bolsa: 'finanzas',
  cripto: 'cripto', crypto: 'cripto', trading: 'cripto', bitcoin: 'cripto',
  tecnologia: 'tech', tech: 'tech', programacion: 'tech', software: 'tech',
  negocios: 'marketing', marketing: 'marketing', emprendimiento: 'marketing',
  ecommerce: 'ecommerce',
  educacion: 'educacion',
  noticias: 'noticias',
  entretenimiento: 'entretenimiento', memes: 'entretenimiento',
  gaming: 'gaming',
  deportes: 'lifestyle', comunidad: 'lifestyle', lifestyle: 'lifestyle',
  salud: 'fitness', fitness: 'fitness', dieta: 'fitness',
  // cooking vertical
  cocina: 'lifestyle', recetas: 'lifestyle', airfryer: 'lifestyle',
  thermomix: 'lifestyle', food: 'lifestyle', comida: 'lifestyle',
};

// Keyword presets for the --niche filter (matched against name/desc/category/tags).
const NICHE_PRESETS = {
  cocina: ['cocina', 'recet', 'airfryer', 'freidora', 'thermomix', 'dieta', 'nutri', 'food', 'comida', 'reposter', 'postre', 'saludable'],
  cripto: ['cripto', 'crypto', 'trading', 'bitcoin', 'blockchain', 'señal', 'signal', 'altcoin'],
  finanzas: ['finanz', 'inversi', 'bolsa', 'ahorro', 'dividend', 'economia', 'economía'],
  tech: ['tech', 'tecnolog', 'program', 'software', 'startup', 'ia ', 'inteligencia artificial', 'dev'],
  marketing: ['marketing', 'negocio', 'emprend', 'ventas', 'ecommerce', 'e-commerce', 'dropship'],
  fitness: ['fitness', 'gym', 'salud', 'entrena', 'workout', 'dieta', 'nutri'],
  gaming: ['gaming', 'gamer', 'juego', 'esport', 'twitch', 'minecraft', 'fortnite', 'roblox'],
};

function pricingNicheFor(category, override) {
  if (override) return NICHE_CPM_MULT[override] ? override : DEFAULT_PRICING_NICHE;
  const key = String(category || '').toLowerCase().trim();
  return CATEGORY_TO_NICHE[key] || DEFAULT_PRICING_NICHE;
}

function estimate({ followers, platform, pricingNiche, postsPerMonth, followersCap }) {
  // Clamp to the calculator's range so the quoted figure is reproducible on the
  // site. `clamped` flags rows where the real audience is larger than the cap.
  const cap = followersCap || DEFAULT_FOLLOWERS_CAP;
  const rawFollowers = Math.max(0, Number(followers) || 0);
  const effFollowers = Math.min(rawFollowers, cap);
  const clamped = rawFollowers > cap;

  // No engagement data for scraped channels → neutral boost (handled by core).
  const post = PRICING.computePostPricing({
    followers: effFollowers,
    reactionsPerPost: 0,
    platform,
    niche: pricingNiche,
  });

  // Outreach leads with what the CREATOR earns per post (the honest hook).
  return {
    effectiveCpm: post.effectiveCpm,
    reachPerPost: post.reachPerPost,
    eurPerPost: post.creatorPerPost,
    eurPerMonth: post.creatorPerPost * postsPerMonth,
    advertiserPaysPerPost: post.advertiserPaysPerPost,
    clamped,
  };
}

// ── Arg parsing ──────────────────────────────────────────────────────────────
function parseArgs(argv) {
  const a = argv.slice(2);
  const get = (name, def = null) => {
    const i = a.indexOf(`--${name}`);
    return i >= 0 && a[i + 1] && !a[i + 1].startsWith('--') ? a[i + 1] : def;
  };
  const has = (name) => a.includes(`--${name}`);
  return {
    platform: (get('platform', 'all') || 'all').toLowerCase(),
    niche: get('niche'),
    keywords: get('keywords'),
    pricingNiche: get('pricing-niche'),
    minFollowers: Number(get('min-followers', '1000')),
    maxFollowersForEstimate: Number(get('max-followers-for-estimate', String(DEFAULT_FOLLOWERS_CAP))),
    limit: Number(get('limit', '300')),
    postsPerMonth: Number(get('posts-per-month', '4')),
    includeClaimed: has('include-claimed'),
    out: get('out'),
    dryRun: has('dry-run'),
    selfTest: has('self-test'),
    help: has('help') || has('h'),
  };
}

// ── CSV helpers ──────────────────────────────────────────────────────────────
const COLUMNS = [
  'platform', 'name', 'category', 'pricing_niche', 'followers',
  'reach_per_post', 'eur_per_post', 'adv_per_post', 'eur_per_month', 'est_clamped',
  'level', 'CAS', 'public_url', 'claim_url', 'signup_url', 'channel_id',
];

function csvCell(v) {
  const s = v == null ? '' : String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

function toCsv(rows) {
  const lines = [COLUMNS.join(',')];
  for (const r of rows) lines.push(COLUMNS.map((c) => csvCell(r[c])).join(','));
  return lines.join('\n') + '\n';
}

// ── Channel → row ────────────────────────────────────────────────────────────
// Public site base — override with PUBLIC_BASE_URL when targeting staging.
const BASE_URL = (process.env.PUBLIC_BASE_URL || 'https://channelad.io').replace(/\/$/, '');
const SIGNUP_URL = `${BASE_URL}/para-canales`;

// Per-channel "claim your channel" deep link. The /claim/:id page resolves the
// channel by Mongo _id and runs the 3-step claim (see AppRoutes + claimController).
// Only Telegram has a working claim flow today: it's MTProto description-based.
// WhatsApp needs Baileys admin proof (sidecar down) and Discord uses OAuth
// onboarding, not this route — so for those we leave claim_url empty and the
// outreach falls back to the generic signup link until their claim paths exist.
function claimUrlFor(c) {
  if (c.plataforma !== 'telegram' || !c._id) return '';
  return `${BASE_URL}/claim/${c._id}`;
}

function publicUrlFor(c) {
  if (c.crawler?.urlPublica) return c.crawler.urlPublica;
  if (c.plataforma === 'telegram') {
    const handle = String(c.identificadorCanal || '').replace(/^@/, '');
    return handle && !handle.includes(':') ? `https://t.me/${handle}` : '';
  }
  return '';
}

function toRow(c, { pricingNicheOverride, postsPerMonth, followersCap }) {
  const followers = c.estadisticas?.seguidores || 0;
  const pricingNiche = pricingNicheFor(c.categoria, pricingNicheOverride);
  const est = estimate({ followers, platform: c.plataforma, pricingNiche, postsPerMonth, followersCap });
  return {
    platform: c.plataforma,
    name: c.nombreCanal || '',
    category: c.categoria || '',
    pricing_niche: pricingNiche,
    followers,
    reach_per_post: est.reachPerPost,
    eur_per_post: Math.round(est.eurPerPost),
    adv_per_post: Math.round(est.advertiserPaysPerPost),
    eur_per_month: Math.round(est.eurPerMonth),
    est_clamped: est.clamped ? 'yes' : '',
    level: c.nivel || '',
    CAS: c.CAS != null ? Math.round(c.CAS) : '',
    public_url: publicUrlFor(c),
    claim_url: claimUrlFor(c),
    signup_url: SIGNUP_URL,
    channel_id: String(c._id || ''),
    _monthly: est.eurPerMonth, // sort key, not emitted
  };
}

// ── Self-test (offline) ──────────────────────────────────────────────────────
function runSelfTest() {
  console.log('Self-test — pricing model on sample channels (no DB):\n');
  const samples = [
    { nombreCanal: 'Recetas Airfryer', plataforma: 'whatsapp', categoria: 'cocina', estadisticas: { seguidores: 1900000 } },
    { nombreCanal: 'Señales Cripto ES', plataforma: 'telegram', categoria: 'cripto', estadisticas: { seguidores: 25000 } },
    { nombreCanal: 'Comunidad Gaming', plataforma: 'discord', categoria: 'gaming', estadisticas: { seguidores: 8000 } },
    { nombreCanal: 'Finanzas Personales', plataforma: 'telegram', categoria: 'finanzas', estadisticas: { seguidores: 50000 } },
  ];
  const rows = samples.map((s, i) => toRow({ ...s, _id: `sampleid${i}` }, { postsPerMonth: 4 }));
  for (const r of rows) {
    const claim = r.claim_url ? '  · claim✓' : '';
    console.log(`  ${r.platform.padEnd(9)} ${r.name.padEnd(24)} ${String(r.followers).padStart(9)} subs  → ${String(r.eur_per_post).padStart(5)} €/post (anunciante ${r.adv_per_post} €)  ~${r.eur_per_month} €/mes (${r.pricing_niche})${claim}`);
  }
  console.log(`\n  Telegram claim deep link example: ${rows.find((r) => r.claim_url)?.claim_url || '(none)'}`);
  console.log('\n✓ Pricing model OK. Run without --self-test against the DB to generate a real list.');
}

// ── Main ─────────────────────────────────────────────────────────────────────
async function main() {
  const opts = parseArgs(process.argv);

  if (opts.help) {
    console.log(fs.readFileSync(__filename, 'utf8').split('\n').slice(2, 40).join('\n').replace(/^ \* ?/gm, ''));
    process.exit(0);
  }

  if (opts.selfTest) {
    runSelfTest();
    process.exit(0);
  }

  const PLATFORMS = ['telegram', 'whatsapp', 'discord'];
  if (opts.platform !== 'all' && !PLATFORMS.includes(opts.platform)) {
    console.error(`✗ --platform must be one of: ${PLATFORMS.join(', ')}, all`);
    process.exit(2);
  }

  // Resolve keyword filter
  let keywords = [];
  if (opts.keywords) keywords = opts.keywords.split(',').map((k) => k.trim().toLowerCase()).filter(Boolean);
  else if (opts.niche) {
    keywords = NICHE_PRESETS[opts.niche.toLowerCase()] || [];
    if (!keywords.length) {
      console.error(`✗ Unknown --niche "${opts.niche}". Known presets: ${Object.keys(NICHE_PRESETS).join(', ')}`);
      process.exit(2);
    }
  }

  const database = require('../config/database');
  const Canal = require('../models/Canal');

  console.log('[outreach] Connecting to MongoDB...');
  const ok = await database.conectar();
  if (!ok) {
    console.error('[outreach] ✗ MongoDB connection failed (check MONGODB_URI).');
    process.exit(1);
  }

  // Build the query
  const q = {};
  if (!opts.includeClaimed) q.claimed = false;
  q.plataforma = opts.platform === 'all' ? { $in: PLATFORMS } : opts.platform;
  q['estadisticas.seguidores'] = { $gte: opts.minFollowers };
  if (keywords.length) {
    const rx = keywords.map((k) => new RegExp(k.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i'));
    q.$or = [
      { nombreCanal: { $in: rx } },
      { descripcion: { $in: rx } },
      { categoria: { $in: rx } },
      { tags: { $in: rx } },
    ];
  }

  // Fetch a generous superset (sorted by raw reach), then re-rank by € estimate.
  const fetchCap = Math.max(opts.limit * 3, 500);
  const docs = await Canal.find(q)
    .select('plataforma nombreCanal descripcion categoria tags estadisticas crawler identificadorCanal nivel CAS claimed verificado')
    .sort({ 'estadisticas.seguidores': -1 })
    .limit(fetchCap)
    .lean();

  console.log(`[outreach] Matched ${docs.length} unclaimed channels (cap ${fetchCap}).`);

  const rows = docs
    .map((c) => toRow(c, {
      pricingNicheOverride: opts.pricingNiche,
      postsPerMonth: opts.postsPerMonth,
      followersCap: opts.maxFollowersForEstimate,
    }))
    .sort((a, b) => b._monthly - a._monthly)
    .slice(0, opts.limit);

  // Console summary: top 10 — lead with €/post (the honest outreach hook).
  console.log(`\nTop ${Math.min(10, rows.length)} by estimated value (${opts.postsPerMonth} posts/mo):`);
  console.log('  ' + 'platform'.padEnd(9) + 'followers'.padStart(10) + '  €/post  €/mes  name');
  for (const r of rows.slice(0, 10)) {
    const flag = r.est_clamped ? '*' : ' ';
    console.log(`  ${r.platform.padEnd(9)}${String(r.followers).padStart(10)}${flag} ${String(r.eur_per_post).padStart(5)}  ${String(r.eur_per_month).padStart(5)}  ${r.name.slice(0, 40)}`);
  }
  if (rows.some((r) => r.est_clamped)) {
    console.log(`  * estimate clamped at ${opts.maxFollowersForEstimate.toLocaleString('es-ES')} followers (calculator max).`);
  }

  if (opts.dryRun) {
    console.log(`\n[outreach] --dry-run: ${rows.length} rows ready (not written).`);
    await database.desconectar().catch(() => {});
    process.exit(0);
  }

  // Write CSV
  const stamp = new Date().toISOString().slice(0, 10);
  const tag = (opts.niche || (keywords.length ? 'custom' : 'all')).toLowerCase();
  const outPath = opts.out
    ? path.resolve(opts.out)
    : path.join(__dirname, '..', 'outreach', 'lists', `outreach-${tag}-${opts.platform}-${stamp}.csv`);

  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, toCsv(rows), 'utf8');

  console.log(`\n✓ Wrote ${rows.length} rows → ${outPath}`);
  console.log('  Next: open the CSV, then use the templates in outreach/templates/ to contact');
  console.log('  the highest-value channels first. See outreach/README.md for the workflow.');

  await database.desconectar().catch(() => {});
  process.exit(0);
}

main().catch((err) => {
  console.error('FATAL:', err?.message || err);
  process.exit(1);
});
