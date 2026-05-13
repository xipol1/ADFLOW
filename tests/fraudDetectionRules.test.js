/**
 * FraudDetectionService rule tests — pure-function level.
 *
 * Each rule takes (intelligence, canal) → null or alert candidate. We
 * don't touch the persistence layer here; that's exercised separately
 * via the service-level orchestrator test below using mocked Mongoose.
 */

const {
  rules,
  THRESHOLDS,
} = require('../services/FraudDetectionService');

const {
  ruleFollowerIncoherence,
  ruleCategoryMismatch,
  ruleEngagementAnomaly,
  ruleBotAdminSuspicion,
  ruleDuplicateContentFarm,
  ruleSuddenFollowerDrop,
  ruleBrandSafetyViolation,
} = rules;

// ─── Helpers ────────────────────────────────────────────────────────────────
function makeIntel(over = {}) {
  return {
    sampleWindowDays: 30,
    inputCounts: { snapshots30d: 30, snapshots90d: 90, posts30d: 30, posts90d: 90 },
    cadence: {},
    growth: {},
    engagement: {},
    contentMix: {},
    trust: {},
    ...over,
  };
}
function makeCanal(over = {}) {
  return {
    _id: 'canal-1',
    categoria: 'cripto',
    estadisticas: { seguidores: 1000 },
    estado: 'activo',
    verificado: true,
    ...over,
  };
}

// ─── ruleFollowerIncoherence ───────────────────────────────────────────────
describe('ruleFollowerIncoherence', () => {
  test('fires when declared and observed differ by >15%', () => {
    const intel = makeIntel({ growth: { followersCurrent: 700 } }); // 30% under
    const canal = makeCanal({ estadisticas: { seguidores: 1000 } });
    const r = ruleFollowerIncoherence(intel, canal);
    expect(r).not.toBeNull();
    expect(r.type).toBe('FOLLOWER_INCOHERENCE');
    expect(r.severity).toBe('warning');
    expect(r.evidence.declared).toBe(1000);
    expect(r.evidence.observed).toBe(700);
    expect(r.evidence.diffRatio).toBeCloseTo(0.3);
  });

  test('does NOT fire within tolerance', () => {
    const intel = makeIntel({ growth: { followersCurrent: 950 } }); // 5% under
    expect(ruleFollowerIncoherence(intel, makeCanal())).toBeNull();
  });

  test('null when declared is 0 or missing', () => {
    expect(ruleFollowerIncoherence(makeIntel(), makeCanal({ estadisticas: { seguidores: 0 } }))).toBeNull();
    expect(ruleFollowerIncoherence(makeIntel(), { _id: 'x' })).toBeNull();
  });

  test('null when observed is missing', () => {
    expect(ruleFollowerIncoherence(makeIntel({ growth: {} }), makeCanal())).toBeNull();
  });
});

// ─── ruleCategoryMismatch ──────────────────────────────────────────────────
describe('ruleCategoryMismatch', () => {
  test('fires when declared category isnt in dominant list AND top has >60% share', () => {
    const intel = makeIntel({
      contentMix: {
        dominantCategories: [
          { category: 'adulto', share: 0.7 },
          { category: 'otros', share: 0.3 },
        ],
      },
    });
    const canal = makeCanal({ categoria: 'finanzas' });
    const r = ruleCategoryMismatch(intel, canal);
    expect(r).not.toBeNull();
    expect(r.type).toBe('CATEGORY_MISMATCH');
    expect(r.evidence.declared).toBe('finanzas');
    expect(r.evidence.topDetected.category).toBe('adulto');
  });

  test('does NOT fire when declared IS in dominant list', () => {
    const intel = makeIntel({
      contentMix: {
        dominantCategories: [
          { category: 'cripto', share: 0.6 },
          { category: 'trading', share: 0.4 },
        ],
      },
    });
    expect(ruleCategoryMismatch(intel, makeCanal({ categoria: 'cripto' }))).toBeNull();
  });

  test('does NOT fire when top dominant share is below threshold (diverse canal)', () => {
    const intel = makeIntel({
      contentMix: {
        dominantCategories: [
          { category: 'noticias', share: 0.4 },
          { category: 'tech', share: 0.3 },
        ],
      },
    });
    expect(ruleCategoryMismatch(intel, makeCanal({ categoria: 'finanzas' }))).toBeNull();
  });

  test('null when no declared category', () => {
    expect(ruleCategoryMismatch(makeIntel(), makeCanal({ categoria: '' }))).toBeNull();
  });
});

// ─── ruleEngagementAnomaly ─────────────────────────────────────────────────
describe('ruleEngagementAnomaly', () => {
  test('fires LOW alert when engagement < threshold', () => {
    const intel = makeIntel({ engagement: { engagementRate30d: 0.0001 } });
    const r = ruleEngagementAnomaly(intel, makeCanal());
    expect(r.type).toBe('ENGAGEMENT_ANOMALY_LOW');
    expect(r.severity).toBe('info');
    expect(r.autoAction).toBe('none');
  });

  test('fires HIGH alert (warning) when engagement >> threshold', () => {
    const intel = makeIntel({ engagement: { engagementRate30d: 0.5 } });
    const r = ruleEngagementAnomaly(intel, makeCanal());
    expect(r.type).toBe('ENGAGEMENT_ANOMALY_HIGH');
    expect(r.severity).toBe('warning');
    expect(r.autoAction).toBe('flag_review');
  });

  test('does NOT fire in the normal band', () => {
    expect(ruleEngagementAnomaly(makeIntel({ engagement: { engagementRate30d: 0.02 } }), makeCanal())).toBeNull();
  });

  test('null when no engagement rate', () => {
    expect(ruleEngagementAnomaly(makeIntel(), makeCanal())).toBeNull();
  });
});

// ─── ruleBotAdminSuspicion ─────────────────────────────────────────────────
describe('ruleBotAdminSuspicion', () => {
  test('fires CRITICAL with pause action when score > threshold', () => {
    const intel = makeIntel({ trust: { botAdminSuspicionScore: 0.85 } });
    const r = ruleBotAdminSuspicion(intel, makeCanal());
    expect(r.type).toBe('BOT_ADMIN_SUSPICION');
    expect(r.severity).toBe('critical');
    expect(r.autoAction).toBe('pause_listings');
  });

  test('does NOT fire below threshold', () => {
    expect(ruleBotAdminSuspicion(makeIntel({ trust: { botAdminSuspicionScore: 0.5 } }), makeCanal())).toBeNull();
  });

  test('null when no score', () => {
    expect(ruleBotAdminSuspicion(makeIntel(), makeCanal())).toBeNull();
  });
});

// ─── ruleDuplicateContentFarm ──────────────────────────────────────────────
describe('ruleDuplicateContentFarm', () => {
  test('fires CRITICAL when uniqueContentRatio < threshold', () => {
    const intel = makeIntel({ contentMix: { uniqueContentRatio: 0.20 } });
    const r = ruleDuplicateContentFarm(intel, makeCanal());
    expect(r.type).toBe('DUPLICATE_CONTENT_FARM');
    expect(r.severity).toBe('critical');
    expect(r.autoAction).toBe('pause_listings');
    expect(r.evidence.uniqueContentRatio).toBe(0.20);
  });

  test('does NOT fire above threshold', () => {
    expect(ruleDuplicateContentFarm(makeIntel({ contentMix: { uniqueContentRatio: 0.9 } }), makeCanal())).toBeNull();
  });
});

// ─── ruleSuddenFollowerDrop ────────────────────────────────────────────────
describe('ruleSuddenFollowerDrop', () => {
  test('fires CRITICAL when 7d rate < -20%', () => {
    const intel = makeIntel({ growth: { followerGrowthRate7d: -0.30, followersCurrent: 700 } });
    const r = ruleSuddenFollowerDrop(intel, makeCanal());
    expect(r.type).toBe('SUDDEN_FOLLOWER_DROP');
    expect(r.severity).toBe('critical');
    expect(r.autoAction).toBe('pause_listings');
  });

  test('does NOT fire on normal fluctuation', () => {
    expect(ruleSuddenFollowerDrop(makeIntel({ growth: { followerGrowthRate7d: -0.05 } }), makeCanal())).toBeNull();
  });

  test('does NOT fire on growth (positive)', () => {
    expect(ruleSuddenFollowerDrop(makeIntel({ growth: { followerGrowthRate7d: 0.10 } }), makeCanal())).toBeNull();
  });
});

// ─── ruleBrandSafetyViolation ──────────────────────────────────────────────
describe('ruleBrandSafetyViolation', () => {
  test('1 critical flag → warning severity, flag_review action', () => {
    const intel = makeIntel({
      trust: { brandSafetyFlagsAggregate: new Map([['hate_speech', 1]]) },
    });
    const r = ruleBrandSafetyViolation(intel, makeCanal());
    expect(r.type).toBe('BRAND_SAFETY_VIOLATION');
    expect(r.severity).toBe('warning');
    expect(r.autoAction).toBe('flag_review');
  });

  test('3+ critical flags → critical severity, pause_listings', () => {
    const intel = makeIntel({
      trust: { brandSafetyFlagsAggregate: new Map([['drugs', 2], ['shock_violence', 2]]) },
    });
    const r = ruleBrandSafetyViolation(intel, makeCanal());
    expect(r.severity).toBe('critical');
    expect(r.autoAction).toBe('pause_listings');
  });

  test('non-critical flags ignored', () => {
    const intel = makeIntel({
      trust: { brandSafetyFlagsAggregate: new Map([['alcohol_excess', 5], ['gambling', 5]]) },
    });
    expect(ruleBrandSafetyViolation(intel, makeCanal())).toBeNull();
  });

  test('accepts plain-object aggregate (Mongoose deserializes Map as object)', () => {
    const intel = makeIntel({
      trust: { brandSafetyFlagsAggregate: { hate_speech: 5 } },
    });
    const r = ruleBrandSafetyViolation(intel, makeCanal());
    expect(r.severity).toBe('critical');
  });

  test('empty aggregate → null', () => {
    expect(ruleBrandSafetyViolation(makeIntel({ trust: { brandSafetyFlagsAggregate: new Map() } }), makeCanal())).toBeNull();
  });
});

// ─── Threshold constants are sensible ──────────────────────────────────────
describe('THRESHOLDS sanity', () => {
  test('engagement low < high', () => {
    expect(THRESHOLDS.ENGAGEMENT_LOW).toBeLessThan(THRESHOLDS.ENGAGEMENT_HIGH);
  });
  test('critical brand safety list is non-empty', () => {
    expect(THRESHOLDS.CRITICAL_BRAND_SAFETY_FLAGS.length).toBeGreaterThan(0);
  });
  test('follower drop threshold is negative', () => {
    expect(THRESHOLDS.FOLLOWER_DROP_7D).toBeLessThan(0);
  });
});
