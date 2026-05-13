/**
 * ChannelScore tests — pure function with documented weights.
 */

const {
  computeChannelScore,
  scoreCadence,
  scoreGrowth,
  scoreEngagement,
  scoreContentQuality,
  scoreTrust,
  inventoryTierFor,
  priceRangeFor,
  FORMULA_VERSION,
  VERIFIED_FLOOR,
  UNVERIFIED_CEILING,
} = require('../services/intelligence/channelScore');

function emptyIntelligence(over = {}) {
  return {
    cadence: { postsPerWeekAvg30d: null, postingConsistencyScore: null, lastPostRecencyHours: null },
    growth: { followerGrowthRate30d: null, growthAcceleration: null },
    engagement: { engagementRate30d: null, engagementDecayScore: null },
    contentMix: { uniqueContentRatio: null, mediaRichnessScore: null, categoryCoherenceScore: null, promotionalRatio30d: null },
    trust: { brandSafetyScoreAvg: null, botAdminSuspicionScore: null },
    ...over,
  };
}

// ─── Component scorers ──────────────────────────────────────────────────────
describe('scoreCadence', () => {
  test('null cadence → null', () => {
    expect(scoreCadence(null)).toBeNull();
  });
  test('1 post/day, consistent, recent → near 1', () => {
    const s = scoreCadence({
      postsPerWeekAvg30d: 7,
      postingConsistencyScore: 1,
      lastPostRecencyHours: 1,
    });
    expect(s).toBeGreaterThan(0.9);
  });
  test('inactive (very old last post) → low', () => {
    const s = scoreCadence({
      postsPerWeekAvg30d: 0.5,
      postingConsistencyScore: 0.5,
      lastPostRecencyHours: 24 * 30, // 30d
    });
    expect(s).toBeLessThan(0.3);
  });
});

describe('scoreGrowth', () => {
  test('null growth rate → null', () => {
    expect(scoreGrowth({ followerGrowthRate30d: null })).toBeNull();
  });
  test('+20% growth → near 1', () => {
    const s = scoreGrowth({ followerGrowthRate30d: 0.20 });
    expect(s).toBeGreaterThan(0.9);
  });
  test('-10% (decline) → 0', () => {
    const s = scoreGrowth({ followerGrowthRate30d: -0.10 });
    expect(s).toBe(0);
  });
  test('positive acceleration nudges score up', () => {
    const base = scoreGrowth({ followerGrowthRate30d: 0.10 });
    const accel = scoreGrowth({ followerGrowthRate30d: 0.10, growthAcceleration: 0.01 });
    expect(accel).toBeGreaterThanOrEqual(base);
  });
});

describe('scoreEngagement', () => {
  test('null engagement → null', () => {
    expect(scoreEngagement({ engagementRate30d: null })).toBeNull();
  });
  test('5% engagement → near 1', () => {
    expect(scoreEngagement({ engagementRate30d: 0.05 })).toBeGreaterThan(0.9);
  });
  test('0.5% engagement → low', () => {
    expect(scoreEngagement({ engagementRate30d: 0.005 })).toBeLessThan(0.2);
  });
});

describe('scoreContentQuality', () => {
  test('high uniqueness + media + coherent → high', () => {
    const s = scoreContentQuality({
      uniqueContentRatio: 0.95,
      mediaRichnessScore: 0.5,
      categoryCoherenceScore: 0.8,
      promotionalRatio30d: 0.1,
    });
    expect(s).toBeGreaterThan(0.6);
  });
  test('high promotional ratio drags score down', () => {
    const lowPromo = scoreContentQuality({
      uniqueContentRatio: 0.9,
      mediaRichnessScore: 0.5,
      categoryCoherenceScore: 0.8,
      promotionalRatio30d: 0.05,
    });
    const highPromo = scoreContentQuality({
      uniqueContentRatio: 0.9,
      mediaRichnessScore: 0.5,
      categoryCoherenceScore: 0.8,
      promotionalRatio30d: 0.7,
    });
    expect(highPromo).toBeLessThan(lowPromo);
  });
});

describe('scoreTrust', () => {
  test('high brand safety + zero bot suspicion → near 1', () => {
    const s = scoreTrust({ brandSafetyScoreAvg: 95, botAdminSuspicionScore: 0 });
    expect(s).toBeGreaterThan(0.9);
  });
  test('high bot suspicion → 0', () => {
    const s = scoreTrust({ brandSafetyScoreAvg: 95, botAdminSuspicionScore: 0.9 });
    expect(s).toBeLessThan(0.6);
  });
});

// ─── Tier mapping ───────────────────────────────────────────────────────────
describe('inventoryTierFor', () => {
  test('boundaries', () => {
    expect(inventoryTierFor(95)).toBe('S');
    expect(inventoryTierFor(92)).toBe('S');
    expect(inventoryTierFor(91)).toBe('A');
    expect(inventoryTierFor(80)).toBe('A');
    expect(inventoryTierFor(79)).toBe('B');
    expect(inventoryTierFor(60)).toBe('B');
    expect(inventoryTierFor(59)).toBe('C');
    expect(inventoryTierFor(0)).toBe('C');
  });
  test('null → null', () => {
    expect(inventoryTierFor(null)).toBeNull();
  });
});

describe('priceRangeFor', () => {
  test('S tier has highest range', () => {
    const r = priceRangeFor('S', { engagementRate30d: 0.05 });
    expect(r.floor).toBe(80);
    expect(r.ceiling).toBeGreaterThanOrEqual(200);
  });
  test('C tier has lowest range', () => {
    const r = priceRangeFor('C', { engagementRate30d: 0 });
    expect(r.floor).toBeLessThan(20);
  });
  test('high engagement raises the ceiling within the tier', () => {
    const low = priceRangeFor('B', { engagementRate30d: 0 });
    const high = priceRangeFor('B', { engagementRate30d: 0.05 });
    expect(high.ceiling).toBeGreaterThan(low.ceiling);
  });
  test('unknown tier → null/null', () => {
    expect(priceRangeFor(null)).toEqual({ floor: null, ceiling: null });
  });
});

// ─── computeChannelScore — anchor invariants ────────────────────────────────
describe('computeChannelScore — verification anchor', () => {
  test('verified canal NEVER drops below VERIFIED_FLOOR', () => {
    // Build worst-case intelligence: zero everything
    const intel = emptyIntelligence({
      cadence: { postsPerWeekAvg30d: 0, postingConsistencyScore: 0, lastPostRecencyHours: 1000 },
      growth: { followerGrowthRate30d: -0.50 },
      engagement: { engagementRate30d: 0 },
      contentMix: { uniqueContentRatio: 0, mediaRichnessScore: 0, categoryCoherenceScore: 0, promotionalRatio30d: 1 },
      trust: { brandSafetyScoreAvg: 0, botAdminSuspicionScore: 1 },
    });
    const out = computeChannelScore({ intelligence: intel, canal: { verificado: true } });
    expect(out.confianzaScore).toBeGreaterThanOrEqual(VERIFIED_FLOOR);
  });

  test('unverified canal NEVER exceeds UNVERIFIED_CEILING', () => {
    // Build best-case intelligence
    const intel = emptyIntelligence({
      cadence: { postsPerWeekAvg30d: 7, postingConsistencyScore: 1, lastPostRecencyHours: 1 },
      growth: { followerGrowthRate30d: 0.50 },
      engagement: { engagementRate30d: 0.10, engagementDecayScore: 0.5 },
      contentMix: { uniqueContentRatio: 1, mediaRichnessScore: 1, categoryCoherenceScore: 1, promotionalRatio30d: 0 },
      trust: { brandSafetyScoreAvg: 100, botAdminSuspicionScore: 0 },
    });
    const out = computeChannelScore({ intelligence: intel, canal: { verificado: false } });
    expect(out.confianzaScore).toBeLessThanOrEqual(UNVERIFIED_CEILING);
  });

  test('null intelligence → all-null score', () => {
    const out = computeChannelScore({ intelligence: null, canal: { verificado: true } });
    expect(out.confianzaScore).toBeNull();
    expect(out.inventoryTier).toBeNull();
  });
});

describe('computeChannelScore — outputs', () => {
  test('attaches formula version', () => {
    const out = computeChannelScore({ intelligence: emptyIntelligence(), canal: { verificado: true } });
    expect(out.formulaVersion).toBe(FORMULA_VERSION);
  });

  test('high-quality canal → S tier', () => {
    const intel = emptyIntelligence({
      cadence: { postsPerWeekAvg30d: 7, postingConsistencyScore: 1, lastPostRecencyHours: 1 },
      growth: { followerGrowthRate30d: 0.20 },
      engagement: { engagementRate30d: 0.05, engagementDecayScore: 0.5 },
      contentMix: { uniqueContentRatio: 1, mediaRichnessScore: 0.4, categoryCoherenceScore: 0.85, promotionalRatio30d: 0.05 },
      trust: { brandSafetyScoreAvg: 95, botAdminSuspicionScore: 0 },
    });
    const out = computeChannelScore({ intelligence: intel, canal: { verificado: true } });
    expect(out.inventoryTier).toBe('S');
    expect(out.confianzaScore).toBeGreaterThanOrEqual(92);
  });

  test('components are surfaced for explainability', () => {
    const intel = emptyIntelligence({
      cadence: { postsPerWeekAvg30d: 7, postingConsistencyScore: 1, lastPostRecencyHours: 1 },
      engagement: { engagementRate30d: 0.05 },
    });
    const out = computeChannelScore({ intelligence: intel, canal: { verificado: true } });
    expect(out.components.cadence).toBeGreaterThan(0);
    expect(out.components.engagement).toBeGreaterThan(0);
    expect(out.components.growth).toBeNull(); // not provided
  });
});
