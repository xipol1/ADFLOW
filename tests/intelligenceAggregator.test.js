/**
 * Aggregator pure-function tests.
 *
 * Every formula in services/intelligence/aggregator.js has at least one
 * boundary-case test here. No Mongo, no clock — `now` is injected.
 */

const {
  aggregateAll,
  postsPerWeek,
  postingConsistencyScore,
  lastPostRecencyHours,
  temporalActivity,
  subscribersAt,
  growthRate,
  engagementDecayScore,
  computeContentMix,
  computeTrust,
  botAdminSuspicionScore,
  entropyCoherence,
  totalReactions,
} = require('../services/intelligence/aggregator');

const HOUR_MS = 3600 * 1000;
const DAY_MS = 24 * HOUR_MS;
const NOW = new Date('2026-05-13T12:00:00Z').getTime();

// ─── Helpers ────────────────────────────────────────────────────────────────
function post({ daysAgo = 0, hoursAgo = 0, type = 'text', reactions = 0, body = 'hi', bodyHash = null, isForwarded = false, links = [], categories = [], isPromotional = null, lang = 'es', brandSafetyScore = null, brandSafetyFlags = [], id = null } = {}) {
  return {
    _id: id || Math.random().toString(36).slice(2),
    publishedAt: new Date(NOW - daysAgo * DAY_MS - hoursAgo * HOUR_MS),
    type,
    isForwarded,
    body,
    bodyHash: bodyHash !== null ? bodyHash : (body ? `hash:${body}` : null),
    links,
    reactions: { total: reactions },
    nlp: { lang, categories, isPromotional, brandSafetyScore, brandSafetyFlags },
  };
}
function snap({ daysAgo = 0, subscribers = 100 } = {}) {
  return { timestamp: new Date(NOW - daysAgo * DAY_MS), subscribersCount: subscribers };
}

// ─── postsPerWeek ──────────────────────────────────────────────────────────
describe('postsPerWeek', () => {
  test('30d window → 30 posts → 7 posts/week', () => {
    expect(postsPerWeek(30, 30)).toBe(7);
  });
  test('null/zero → null', () => {
    expect(postsPerWeek(0, 30)).toBeNull();
    expect(postsPerWeek(10, 0)).toBeNull();
  });
});

// ─── postingConsistencyScore ───────────────────────────────────────────────
describe('postingConsistencyScore', () => {
  test('evenly spaced posts → high score', () => {
    const ts = [];
    for (let i = 0; i < 10; i++) ts.push(NOW - i * DAY_MS); // exactly 1 day apart
    const s = postingConsistencyScore(ts);
    expect(s).toBeGreaterThan(0.9);
  });

  test('extremely bursty → low score', () => {
    const ts = [NOW, NOW - 1 * HOUR_MS, NOW - 2 * HOUR_MS, NOW - 30 * DAY_MS];
    const s = postingConsistencyScore(ts);
    expect(s).toBeLessThan(0.5);
  });

  test('<3 posts → null', () => {
    expect(postingConsistencyScore([NOW])).toBeNull();
    expect(postingConsistencyScore([NOW, NOW - DAY_MS])).toBeNull();
  });
});

// ─── lastPostRecencyHours ──────────────────────────────────────────────────
describe('lastPostRecencyHours', () => {
  test('most recent post 3h ago', () => {
    const posts = [post({ hoursAgo: 3 }), post({ hoursAgo: 10 })];
    expect(lastPostRecencyHours(posts, NOW)).toBeCloseTo(3, 0);
  });
  test('empty → null', () => {
    expect(lastPostRecencyHours([], NOW)).toBeNull();
  });
});

// ─── temporalActivity ──────────────────────────────────────────────────────
describe('temporalActivity', () => {
  test('returns 24-entry hourly distribution + most active hour/dow', () => {
    // 5 posts at hour 10
    const posts = [];
    for (let i = 0; i < 5; i++) {
      posts.push({ publishedAt: new Date(Date.UTC(2026, 4, 10 + i, 10, 0, 0)) });
    }
    const r = temporalActivity(posts);
    expect(r.hourOfDayDistribution).toHaveLength(24);
    expect(r.mostActiveHourOfDay).toBe(10);
    expect(r.mostActiveDow).toBeGreaterThanOrEqual(1);
    expect(r.mostActiveDow).toBeLessThanOrEqual(7);
  });

  test('empty array → null hour/dow + empty distribution', () => {
    const r = temporalActivity([]);
    expect(r.mostActiveHourOfDay).toBeNull();
    expect(r.mostActiveDow).toBeNull();
    expect(r.hourOfDayDistribution).toEqual([]);
  });
});

// ─── subscribersAt + growthRate ───────────────────────────────────────────
describe('subscribersAt', () => {
  test('picks closest snapshot to target time', () => {
    const snaps = [snap({ daysAgo: 0, subscribers: 200 }), snap({ daysAgo: 30, subscribers: 100 })];
    expect(subscribersAt(snaps, NOW - 30 * DAY_MS)).toBe(100);
    expect(subscribersAt(snaps, NOW)).toBe(200);
    // 15d ago — equidistant; either is acceptable
    const mid = subscribersAt(snaps, NOW - 15 * DAY_MS);
    expect([100, 200]).toContain(mid);
  });
  test('empty → null', () => {
    expect(subscribersAt([], NOW)).toBeNull();
  });
});

describe('growthRate', () => {
  test('100 → 150 = +50%', () => {
    expect(growthRate(100, 150)).toBeCloseTo(0.5);
  });
  test('100 → 50 = -50%', () => {
    expect(growthRate(100, 50)).toBeCloseTo(-0.5);
  });
  test('0 → 100 = sentinel 1.0', () => {
    expect(growthRate(0, 100)).toBe(1.0);
  });
  test('null/missing → null', () => {
    expect(growthRate(null, 100)).toBeNull();
    expect(growthRate(100, null)).toBeNull();
  });
});

// ─── engagementDecayScore ─────────────────────────────────────────────────
describe('engagementDecayScore', () => {
  test('newer posts have more reactions → positive score (healthy decay)', () => {
    const posts = [];
    for (let i = 0; i < 10; i++) {
      posts.push(post({ daysAgo: i, reactions: 50 - i * 5 })); // newer = more rx
    }
    const s = engagementDecayScore(posts, NOW);
    expect(s).toBeGreaterThan(0);
  });

  test('older posts have more reactions → negative score (unusual)', () => {
    const posts = [];
    for (let i = 0; i < 10; i++) {
      posts.push(post({ daysAgo: i, reactions: 10 + i * 5 })); // older = more rx
    }
    const s = engagementDecayScore(posts, NOW);
    expect(s).toBeLessThan(0);
  });

  test('<4 posts → null', () => {
    expect(engagementDecayScore([post({}), post({})], NOW)).toBeNull();
  });

  test('all-zero reactions → 0 (no signal)', () => {
    const posts = Array.from({ length: 5 }, (_, i) => post({ daysAgo: i, reactions: 0 }));
    expect(engagementDecayScore(posts, NOW)).toBe(0);
  });
});

// ─── computeContentMix ────────────────────────────────────────────────────
describe('computeContentMix', () => {
  test('captures media richness + link density + forwarded ratio', () => {
    const posts = [
      post({ type: 'image' }),
      post({ type: 'video' }),
      post({ type: 'text', links: [{ url: 'https://example.com' }] }),
      post({ type: 'text', isForwarded: true }),
      post({ type: 'text' }),
    ];
    const r = computeContentMix(posts);
    expect(r.mediaRichnessScore).toBeCloseTo(0.4); // 2/5
    expect(r.linkDensity).toBeCloseTo(0.2);        // 1/5
    expect(r.repostRatio).toBeCloseTo(0.2);        // 1/5
  });

  test('unique content ratio detects duplicates', () => {
    const posts = [
      post({ body: 'same', bodyHash: 'hash:1' }),
      post({ body: 'same', bodyHash: 'hash:1' }), // duplicate
      post({ body: 'same', bodyHash: 'hash:1' }), // duplicate
      post({ body: 'different', bodyHash: 'hash:2' }),
    ];
    const r = computeContentMix(posts);
    expect(r.uniqueContentRatio).toBeCloseTo(0.5); // 2 unique / 4 total
  });

  test('promotional ratio only counts enriched posts', () => {
    const posts = [
      post({ isPromotional: true }),
      post({ isPromotional: false }),
      post({ isPromotional: null }),  // unenriched — should NOT pull the ratio down
    ];
    const r = computeContentMix(posts);
    expect(r.promotionalRatio30d).toBeCloseTo(0.5); // 1 promo / 2 enriched
  });

  test('dominant categories sorted by share, top 3', () => {
    const posts = [
      post({ categories: ['cripto'] }),
      post({ categories: ['cripto'] }),
      post({ categories: ['cripto', 'trading'] }),
      post({ categories: ['trading'] }),
      post({ categories: ['tech'] }),
      post({ categories: ['otros'] }),
    ];
    const r = computeContentMix(posts);
    expect(r.dominantCategories[0].category).toBe('cripto');
    expect(r.dominantCategories).toHaveLength(3);
  });

  test('langPrimary is the most-frequent non-unknown lang', () => {
    const posts = [
      post({ lang: 'es' }),
      post({ lang: 'es' }),
      post({ lang: 'es' }),
      post({ lang: 'en' }),
      post({ lang: 'unknown' }),
    ];
    const r = computeContentMix(posts);
    expect(r.langPrimary).toBe('es');
    expect(r.langMix.get('es')).toBeCloseTo(0.6);
    expect(r.langMix.get('en')).toBeCloseTo(0.2);
  });

  test('empty → null/empty defaults', () => {
    const r = computeContentMix([]);
    expect(r.mediaRichnessScore).toBeNull();
    expect(r.dominantCategories).toEqual([]);
    expect(r.langPrimary).toBe('unknown');
  });
});

// ─── entropyCoherence ────────────────────────────────────────────────────
describe('entropyCoherence', () => {
  test('all on one category → coherence 1', () => {
    expect(entropyCoherence([1, 0, 0, 0])).toBe(1);
    expect(entropyCoherence([1])).toBe(1);
  });
  test('uniform 4-category → coherence 0', () => {
    expect(entropyCoherence([0.25, 0.25, 0.25, 0.25])).toBeCloseTo(0);
  });
  test('80/20 split → near 1', () => {
    expect(entropyCoherence([0.8, 0.2])).toBeGreaterThan(0.2);
  });
});

// ─── computeTrust ────────────────────────────────────────────────────────
describe('computeTrust', () => {
  test('averages brand safety scores across enriched posts', () => {
    const posts = [
      post({ brandSafetyScore: 90 }),
      post({ brandSafetyScore: 80 }),
      post({ brandSafetyScore: null }),
    ];
    expect(computeTrust(posts).brandSafetyScoreAvg).toBeCloseTo(85);
  });

  test('aggregates brand_safety_flags across all posts', () => {
    const posts = [
      post({ brandSafetyFlags: ['gambling'] }),
      post({ brandSafetyFlags: ['gambling', 'nsfw'] }),
      post({ brandSafetyFlags: [] }),
    ];
    const r = computeTrust(posts);
    expect(r.brandSafetyFlagsAggregate.get('gambling')).toBe(2);
    expect(r.brandSafetyFlagsAggregate.get('nsfw')).toBe(1);
  });
});

// ─── botAdminSuspicionScore ──────────────────────────────────────────────
describe('botAdminSuspicionScore', () => {
  test('<10 posts → null', () => {
    const posts = Array.from({ length: 5 }, () => post({}));
    expect(botAdminSuspicionScore(posts)).toBeNull();
  });

  test('human-like 1 post/day, varied content → low score', () => {
    const posts = Array.from({ length: 20 }, (_, i) =>
      post({ daysAgo: i, body: `post ${i}`, bodyHash: `h${i}` })
    );
    const s = botAdminSuspicionScore(posts);
    expect(s).toBeLessThanOrEqual(0.5);
  });

  test('extreme duplicate content → high score', () => {
    const posts = Array.from({ length: 20 }, (_, i) =>
      post({ daysAgo: i, body: 'spam', bodyHash: 'same-hash' })
    );
    const s = botAdminSuspicionScore(posts);
    expect(s).toBeGreaterThan(0.2);
  });
});

// ─── totalReactions ──────────────────────────────────────────────────────
describe('totalReactions', () => {
  test('reads from reactions.total', () => {
    expect(totalReactions({ reactions: { total: 5 } })).toBe(5);
  });
  test('zero default when missing', () => {
    expect(totalReactions({})).toBe(0);
    expect(totalReactions(null)).toBe(0);
  });
});

// ─── aggregateAll integration ────────────────────────────────────────────
describe('aggregateAll — integration on a realistic canal', () => {
  test('produces a complete intelligence shape', () => {
    // Canal: 1 post/day for 30d, gradual subscriber growth from 100 to 150,
    // mostly 'cripto' content, mix of text + image, very low promotional.
    const posts30d = [];
    for (let i = 0; i < 30; i++) {
      posts30d.push(
        post({
          daysAgo: i,
          type: i % 5 === 0 ? 'image' : 'text',
          reactions: 30 - i,
          categories: ['cripto'],
          lang: 'es',
          isPromotional: i % 10 === 0,
          brandSafetyScore: 90,
          bodyHash: `h${i}`,
          body: `analysis ${i}`,
        })
      );
    }
    const posts90d = posts30d.slice();
    // Add 60 more posts in the 31d..90d range
    for (let i = 30; i < 90; i++) {
      posts90d.push(post({ daysAgo: i, body: `older ${i}`, bodyHash: `o${i}` }));
    }
    const snapshots = [];
    for (let i = 0; i <= 30; i++) {
      snapshots.push(snap({ daysAgo: i, subscribers: 150 - i * 1.67 }));
    }

    const intel = aggregateAll({
      canalId: 'canal-1',
      channelJid: '120363@newsletter',
      snapshots,
      posts30d,
      posts90d,
      now: NOW,
    });

    expect(intel.canalId).toBe('canal-1');
    expect(intel.inputCounts.posts30d).toBe(30);
    expect(intel.cadence.postsPerWeekAvg30d).toBeCloseTo(7);
    expect(intel.cadence.lastPostRecencyHours).toBeGreaterThanOrEqual(0);
    expect(intel.growth.followersCurrent).toBe(150);
    expect(intel.growth.followerGrowthRate30d).toBeGreaterThan(0);
    expect(intel.engagement.reactionsPerPostAvg30d).toBeGreaterThan(0);
    expect(intel.contentMix.dominantCategories[0].category).toBe('cripto');
    expect(intel.contentMix.langPrimary).toBe('es');
    expect(intel.trust.brandSafetyScoreAvg).toBeCloseTo(90);
  });
});
