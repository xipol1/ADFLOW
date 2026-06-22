/**
 * channelPricing tests — locks the canonical pricing model AND its two mirrors.
 *
 * lib/channelPricingCore.js is mirrored inline by two ESM browser modules that
 * this (CommonJS, no-babel) suite can't `require`:
 *   - client/src/ui/lib/channelPricing.js   (creator calculator)
 *   - client/src/ui/lib/advertiserReach.js  (advertiser calculator)
 *
 * Two layers of protection:
 *   1. Property + reference-vector tests on the core lock its math/shape.
 *   2. The "mirror sync" suite reads the two client files as TEXT and asserts
 *      their constant tables equal the core's — so a drifting CPM / niche / reach
 *      constant fails CI even though we can't import the ESM files. (Formula
 *      drift inside the mirrors isn't caught by text-parsing; keep the formulas
 *      short and commented as mirrors.)
 */

const fs = require('fs');
const path = require('path');
const core = require('../lib/channelPricingCore');
const {
  BASE_CPM,
  COMMISSION_MULTIPLIER,
  PLATFORM_CPM_MULT,
  NICHE_CPM_MULT,
  reachRate,
  scaleTaper,
  engagementBoost,
  computePostPricing,
} = core;

describe('reachRate — per-platform, size-decaying', () => {
  test('equals the platform base for tiny channels (<= pivot)', () => {
    expect(reachRate('telegram', 1000)).toBeCloseTo(0.45, 5);
    expect(reachRate('whatsapp', 3000)).toBeCloseTo(0.72, 5);
  });

  test('decays as the channel grows', () => {
    expect(reachRate('telegram', 50000)).toBeLessThan(reachRate('telegram', 5000));
    expect(reachRate('telegram', 1000000)).toBeLessThan(reachRate('telegram', 50000));
  });

  test('stays bounded between floor and base', () => {
    for (const f of [5000, 50000, 500000, 5000000, 50000000]) {
      const r = reachRate('telegram', f);
      expect(r).toBeGreaterThanOrEqual(0.18 - 1e-9); // floor
      expect(r).toBeLessThanOrEqual(0.45 + 1e-9);    // base
    }
  });

  test('differs by platform (WhatsApp broadcast >> Telegram views)', () => {
    expect(reachRate('whatsapp', 50000)).toBeGreaterThan(reachRate('telegram', 50000));
  });

  test('unknown platform falls back to telegram, never NaN', () => {
    expect(reachRate('myspace', 50000)).toBeCloseTo(reachRate('telegram', 50000), 9);
    expect(Number.isFinite(reachRate('telegram', 0))).toBe(true);
  });
});

describe('scaleTaper — sublinear volume discount', () => {
  test('no discount below the reach pivot', () => {
    expect(scaleTaper(0)).toBe(1);
    expect(scaleTaper(8000)).toBe(1);
  });

  test('discounts above the pivot, monotonically', () => {
    expect(scaleTaper(50000)).toBeLessThan(1);
    expect(scaleTaper(1000000)).toBeLessThan(scaleTaper(50000));
  });

  test('never collapses below the floor', () => {
    expect(scaleTaper(50000000)).toBeGreaterThanOrEqual(0.45 - 1e-9);
  });
});

describe('engagementBoost — thresholds', () => {
  test('neutral without reaction data', () => {
    expect(engagementBoost(10000, 0)).toBe(1);
    expect(engagementBoost(0, 100)).toBe(1);
  });
  test('tiers map correctly', () => {
    expect(engagementBoost(10000, 30)).toBe(0.85);  // 0.3% → bajo
    expect(engagementBoost(10000, 100)).toBe(1.0);  // 1%   → normal
    expect(engagementBoost(10000, 300)).toBe(1.10); // 3%   → bueno
    expect(engagementBoost(10000, 600)).toBe(1.25); // 6%   → excelente
  });
});

// ── Reference vectors (the mirror contract) ──────────────────────────────────
// followers, reactions=0 unless noted. Hand-derived from the formulas; both
// browser mirrors must reproduce these to the same precision.
const REFERENCE_VECTORS = [
  // small tech Telegram channel, neutral engagement, no taper
  { in: { followers: 8000, platform: 'telegram', niche: 'tech' },
    reachPerPost: 3360, effectiveCpm: 6.0, creatorPerPost: 20.16 },
  // mid crypto Telegram
  { in: { followers: 25000, platform: 'telegram', niche: 'cripto' },
    reachPerPost: 9734, effectiveCpm: 6.43, creatorPerPost: 62.6 },
  // huge WhatsApp cooking (lifestyle) — the channel that used to quote 12.928 €
  { in: { followers: 1900000, platform: 'whatsapp', niche: 'lifestyle' },
    reachPerPost: 876532, effectiveCpm: 3.93, creatorPerPost: 3444 },
];

describe('computePostPricing — reference vectors', () => {
  test.each(REFERENCE_VECTORS)('%j', (vec) => {
    const r = computePostPricing(vec.in);
    expect(r.reachPerPost).toBe(vec.reachPerPost);
    expect(r.effectiveCpm).toBeCloseTo(vec.effectiveCpm, 1);
    expect(r.creatorPerPost).toBeCloseTo(vec.creatorPerPost, 0);
  });

  test('advertiser pays creator price + commission', () => {
    const r = computePostPricing({ followers: 25000, platform: 'telegram', niche: 'cripto' });
    expect(r.advertiserPaysPerPost).toBeCloseTo(r.creatorPerPost * COMMISSION_MULTIPLIER, 6);
  });
});

describe('pricing is sublinear in followers (no more 12.928 €/post)', () => {
  const price = (followers) =>
    computePostPricing({ followers, platform: 'whatsapp', niche: 'lifestyle' }).creatorPerPost;

  test('monotonically non-decreasing', () => {
    let prev = 0;
    for (const f of [1000, 10000, 100000, 1000000, 2000000]) {
      const p = price(f);
      expect(p).toBeGreaterThanOrEqual(prev);
      prev = p;
    }
  });

  test('10x followers yields clearly less than 10x price at scale', () => {
    const ratio = price(1900000) / price(190000);
    expect(ratio).toBeLessThan(9);   // linear model would be exactly 10
    expect(ratio).toBeGreaterThan(1); // but still grows
  });

  test('the 1.9M WhatsApp channel lands far below the old linear 12.928 €', () => {
    expect(price(1900000)).toBeLessThan(6000);
  });
});

// ── Creator ↔ advertiser consistency ─────────────────────────────────────────
// The advertiser calculator (client/src/ui/lib/advertiserReach.js) inverts the
// creator model for a baseline channel:
//   reachPerPost = (pricePaid / commission) / (BASE_CPM·plat·niche) · 1000
// Re-derive that here from the SAME constants and assert it inverts
// computePostPricing for a channel with no taper and no engagement boost. If the
// client mirror drifts from these constants, this relationship breaks.
describe('advertiser reach inverts creator pricing (no taper, no engagement)', () => {
  const advertiserReach = ({ pricePerPost, platform, niche }) => {
    const creatorCpm = BASE_CPM * (PLATFORM_CPM_MULT[platform] ?? 1) * (NICHE_CPM_MULT[niche] ?? 1);
    const creatorRevenue = pricePerPost / COMMISSION_MULTIPLIER;
    return (creatorRevenue / creatorCpm) * 1000;
  };

  test('feeding the creator advertiser-price back recovers the reach', () => {
    // followers below the scale pivot → taper = 1, reactions 0 → boost = 1.
    const channel = { followers: 5000, platform: 'telegram', niche: 'finanzas' };
    const post = computePostPricing(channel);
    expect(post.scaleTaper).toBe(1);
    expect(post.boost).toBe(1);

    const recoveredReach = advertiserReach({
      pricePerPost: post.advertiserPaysPerPost,
      platform: channel.platform,
      niche: channel.niche,
    });
    expect(recoveredReach).toBeCloseTo(post.reachPerPost, 0);
  });
});

// ── Mirror sync: client ESM files must match the core's constants ─────────────
// We can't import the ESM modules, so we parse them as text. The regexes tolerate
// whitespace; they fail loudly if a constant is renamed/removed (which is exactly
// when a re-sync is needed).
describe('mirror sync — client modules match the core constants', () => {
  const read = (rel) => fs.readFileSync(path.join(__dirname, '..', rel), 'utf8');
  const creatorSrc = read('client/src/ui/lib/channelPricing.js');
  const advertiserSrc = read('client/src/ui/lib/advertiserReach.js');
  const statsSrc = read('client/src/ui/theme/stats.js');

  // `NAME = <number>` (declaration, not a usage like `NAME / x`).
  const scalar = (src, name) => {
    const m = src.match(new RegExp(`\\b${name}\\b\\s*=\\s*(-?[\\d.]+)`));
    if (!m) throw new Error(`scalar ${name} not found`);
    return Number(m[1]);
  };
  // First `{ ... }` after `NAME =`, parsed as flat numeric key:value pairs.
  const objectLiteral = (src, name) => {
    const m = src.match(new RegExp(`\\b${name}\\b\\s*=\\s*\\{([\\s\\S]*?)\\}`));
    if (!m) throw new Error(`object literal ${name} not found`);
    const out = {};
    const pair = /([a-zA-Z0-9_]+)\s*:\s*(-?[\d.]+)/g;
    let p;
    while ((p = pair.exec(m[1]))) out[p[1]] = Number(p[2]);
    return out;
  };
  // The `{ ... }` array entry whose id matches, parsed as flat key:value pairs.
  const arrayEntry = (src, id) => {
    const m = src.match(new RegExp(`\\{[^}]*id:\\s*'${id}'[^}]*\\}`));
    if (!m) throw new Error(`array entry id='${id}' not found`);
    const out = {};
    const pair = /([a-zA-Z0-9_]+)\s*:\s*(-?[\d.]+)/g;
    let p;
    while ((p = pair.exec(m[0]))) out[p[1]] = Number(p[2]);
    return out;
  };

  test('BASE_CPM matches in both mirrors', () => {
    expect(scalar(creatorSrc, 'BASE_CPM')).toBe(core.BASE_CPM);
    expect(scalar(advertiserSrc, 'BASE_CPM')).toBe(core.BASE_CPM);
  });

  test('reach/scale constants match in the creator mirror', () => {
    expect(scalar(creatorSrc, 'REACH_PIVOT')).toBe(core.REACH_PIVOT);
    expect(scalar(creatorSrc, 'REACH_DECAY')).toBe(core.REACH_DECAY);
    expect(scalar(creatorSrc, 'SCALE_RPIVOT')).toBe(core.SCALE_RPIVOT);
    expect(scalar(creatorSrc, 'SCALE_DECAY')).toBe(core.SCALE_DECAY);
    expect(scalar(creatorSrc, 'SCALE_FLOOR')).toBe(core.SCALE_FLOOR);
  });

  test('commission rate matches (theme/stats ↔ core)', () => {
    expect(scalar(statsSrc, 'PUBLIC_COMMISSION_RATE')).toBeCloseTo(core.COMMISSION_RATE, 6);
  });

  test('platform CPM mult + reach curve match in both mirrors', () => {
    const advMults = objectLiteral(advertiserSrc, 'PLATFORM_CPM_MULT');
    for (const id of Object.keys(core.PLATFORM_CPM_MULT)) {
      const entry = arrayEntry(creatorSrc, id);
      expect(entry.mult).toBe(core.PLATFORM_CPM_MULT[id]);
      expect(entry.reachBase).toBe(core.PLATFORM_REACH[id].base);
      expect(entry.reachFloor).toBe(core.PLATFORM_REACH[id].floor);
      expect(advMults[id]).toBe(core.PLATFORM_CPM_MULT[id]);
    }
  });

  test('niche CPM mult matches in both mirrors', () => {
    const advNiches = objectLiteral(advertiserSrc, 'NICHE_CPM_MULT');
    for (const id of Object.keys(core.NICHE_CPM_MULT)) {
      expect(arrayEntry(creatorSrc, id).mult).toBe(core.NICHE_CPM_MULT[id]);
      expect(advNiches[id]).toBe(core.NICHE_CPM_MULT[id]);
    }
  });
});
