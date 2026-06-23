'use strict';

// ─── Channelad — canonical channel-pricing model ─────────────────────────────
// SINGLE SOURCE OF TRUTH for "how much is one sponsored post worth".
//
// Pure, dependency-free CommonJS so it can be required by Node scripts, Jest
// tests and the backend. The browser calculator
// (client/src/ui/lib/channelPricing.js) and the advertiser reach estimator
// (client/src/ui/lib/advertiserReach.js) MIRROR these formulas inline, because
// the Vite client app cannot import a repo-root CommonJS module. The mirror is
// LOCKED by reference vectors in tests/channelPricing.test.js — if either copy
// drifts, the test fails. When you change a constant here, update the mirrors
// and the REFERENCE_VECTORS in that test in the same commit.
//
// Why this exists (the old model was wrong in three ways):
//   1. Two contradictory CPMs — the creator side charged 12 € CPM while the
//      advertiser side priced reach at ~4 € CPM. Same marketplace, ~3× apart.
//      Now BOTH derive from BASE_CPM and the on-top commission, so a creator's
//      quote and an advertiser's reach estimate reconcile.
//   2. Flat 0.6 reach rate — ignored platform AND the fact that view/open rates
//      collapse as a channel grows. Now reach decays with size, per platform.
//   3. Linear pricing — €/post grew in a straight line with followers, so a
//      1.9M channel quoted 12.928 €/post. Now the CPM tapers with scale, so
//      pricing is sublinear (the same channel lands near ~3.4k €/post).

// ── Commission (on-top model) ────────────────────────────────────────────────
// The advertiser pays the creator's listed price PLUS this commission; the
// creator keeps 100% of their listed price. Keep aligned with
// PUBLIC_COMMISSION_RATE in client/src/ui/theme/stats.js.
const COMMISSION_RATE = 0.20;
const COMMISSION_MULTIPLIER = 1 + COMMISSION_RATE; // 1.20

// ── Base CPM ─────────────────────────────────────────────────────────────────
// € the CREATOR earns per 1.000 real impressions (reach), for a baseline channel:
// neutral niche (×1.0), small scale (no taper), average engagement (×1.0). The
// advertiser pays this × COMMISSION_MULTIPLIER.
//
// Do NOT use this to claim "cheaper than Meta". A 2026 deep-research with sources
// found Meta's real CPM in Spain is ~€2,5-8 (centre ~€5-6,5), LATAM ~€3,3-4,8 —
// roughly at the level of Channelad's effective CPM, and below it for premium
// niches. The channel value prop is qualitative (opt-in niche audience, creator
// trust, high open/CTR), not a lower CPM.
//
// This is THE dial for the overall price level. Calibrate it against the median
// of real Canal.precio values: `node scripts/calibrate-pricing.js`.
const BASE_CPM = 5;

// Platform CPM multiplier — demand / quality of a single impression. Calibrated
// 2026-06-23 to the published Spanish CPM matrix in
// content/blog/calculadora-precios-publicidad.md (WhatsApp ≈ 1.5× Telegram,
// Discord ≈ 0.75×, Newsletter ≈ 2× — B2B premium). Real Canal.precio was n=1 so
// the blog matrix is the anchor; re-run scripts/calibrate-pricing.js once
// creators actually list prices.
const PLATFORM_CPM_MULT = { telegram: 1.0, whatsapp: 1.5, discord: 0.75, newsletter: 2.0 };

// Niche CPM multiplier — advertiser-demand premium/discount vs the marketplace
// mean. Calibrated 2026-06-23 to the blog matrix + market research: the old
// spread was too narrow (premium under-, cheap niches over-priced). Widened so
// finanzas/cripto sit at their real premium and gaming/noticias/memes at their
// real (low) rates.
const NICHE_CPM_MULT = {
  finanzas: 1.5, b2bsaas: 1.45, cripto: 1.55, tech: 1.2, educacion: 1.0,
  marketing: 1.0, ecommerce: 0.9, fitness: 0.85, lifestyle: 0.8,
  gaming: 0.6, noticias: 0.55, entretenimiento: 0.5,
};

// ── Reach rate: fraction of followers who SEE a given post ────────────────────
// Replaces the old flat 0.6. Two facts it now models:
//   1. It varies by platform (WhatsApp broadcast open-rates >> Telegram views).
//   2. It DECAYS with audience size — a 1M channel reaches a far smaller % per
//      post than a 5k one.
//
//   rate(f) = floor + (base - floor) · (PIVOT / max(f, PIVOT))^DECAY
//
// For f ≤ PIVOT the rate equals the platform `base`; as f → ∞ it asymptotes to
// the platform `floor`. DECAY controls how fast it erodes (0 = flat, the old
// behaviour). The bases line up with the ranges documented on the calculator:
// Telegram 30-45%, WhatsApp 75-90% (we use a conservative 72% base), Discord
// 60-80% online, Newsletter ~40% open.
const REACH_PIVOT = 3000;
const REACH_DECAY = 0.12;
const PLATFORM_REACH = {
  telegram:   { base: 0.45, floor: 0.18 },
  whatsapp:   { base: 0.72, floor: 0.24 },
  discord:    { base: 0.55, floor: 0.15 },
  newsletter: { base: 0.40, floor: 0.18 },
};

function reachRate(platform, followers) {
  const r = PLATFORM_REACH[platform] || PLATFORM_REACH.telegram;
  const f = Math.max(0, Number(followers) || 0);
  if (f <= REACH_PIVOT) return r.base;
  const decay = Math.pow(REACH_PIVOT / f, REACH_DECAY);
  return r.floor + (r.base - r.floor) * decay;
}

// ── Scale taper: volume discount → sublinear pricing ──────────────────────────
// Large buys clear at a lower CPM. Without this, €/post grows linearly with
// followers forever (the 12.928 €/post problem). Multiplies the CPM by a factor
// in (SCALE_FLOOR, 1]:
//
//   factor(reach) = SCALE_FLOOR + (1 - SCALE_FLOOR) · (RPIVOT / max(reach, RPIVOT))^SCALE_DECAY
//
// For reach ≤ RPIVOT there is no discount (factor = 1). The combined effect of a
// decaying reach rate AND a tapering CPM makes total price clearly sublinear in
// followers, while never going negative or to zero (floored).
const SCALE_RPIVOT = 8000;
const SCALE_DECAY = 0.10;
const SCALE_FLOOR = 0.45;

function scaleTaper(reachPerPost) {
  const r = Math.max(0, Number(reachPerPost) || 0);
  if (r <= SCALE_RPIVOT) return 1;
  return SCALE_FLOOR + (1 - SCALE_FLOOR) * Math.pow(SCALE_RPIVOT / r, SCALE_DECAY);
}

// ── Engagement boost ──────────────────────────────────────────────────────────
// reactionsPerPost / followers = engagement rate. <0.5% → −15%, 0.5-2% → neutral,
// 2-5% → +10%, >5% → +25%. No reaction data (0/null) → neutral.
function engagementBoost(followers, reactionsPerPost) {
  if (!reactionsPerPost || !followers || followers <= 0) return 1;
  const rate = reactionsPerPost / followers;
  if (rate >= 0.05) return 1.25;
  if (rate >= 0.02) return 1.10;
  if (rate >= 0.005) return 1.0;
  return 0.85;
}

function engagementLabel(followers, reactionsPerPost) {
  if (!reactionsPerPost || !followers) return 'Sin datos';
  const rate = reactionsPerPost / followers;
  if (rate >= 0.05) return 'Excelente';
  if (rate >= 0.02) return 'Bueno';
  if (rate >= 0.005) return 'Normal';
  return 'Bajo';
}

// ── Core: price for one standard sponsored post ───────────────────────────────
// The only place the price formula lives. Everything else (format multipliers,
// monthly/yearly, advertiser reach) is derived from this.
function computePostPricing({
  followers = 0,
  reactionsPerPost = 0,
  platform = 'telegram',
  niche = 'tech',
} = {}) {
  const platMult = PLATFORM_CPM_MULT[platform] != null ? PLATFORM_CPM_MULT[platform] : 1.0;
  const nicheMult = NICHE_CPM_MULT[niche] != null ? NICHE_CPM_MULT[niche] : 1.0;
  const boost = engagementBoost(followers, reactionsPerPost);

  const rate = reachRate(platform, followers);
  const reachPerPost = Math.round((Number(followers) || 0) * rate);
  const taper = scaleTaper(reachPerPost);

  const effectiveCpm = BASE_CPM * platMult * nicheMult * boost * taper;
  const creatorPerPost = (reachPerPost / 1000) * effectiveCpm;
  const advertiserPaysPerPost = creatorPerPost * COMMISSION_MULTIPLIER;

  return {
    effectiveCpm,
    reachRate: rate,
    reachPerPost,
    scaleTaper: taper,
    boost,
    creatorPerPost,
    advertiserPaysPerPost,
  };
}

module.exports = {
  COMMISSION_RATE,
  COMMISSION_MULTIPLIER,
  BASE_CPM,
  PLATFORM_CPM_MULT,
  NICHE_CPM_MULT,
  PLATFORM_REACH,
  REACH_PIVOT,
  REACH_DECAY,
  SCALE_RPIVOT,
  SCALE_DECAY,
  SCALE_FLOOR,
  reachRate,
  scaleTaper,
  engagementBoost,
  engagementLabel,
  computePostPricing,
};
