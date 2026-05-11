/**
 * Platform connector metrics tests.
 *
 * Covers the Phase 3 metric upgrades: each connector should now prefer
 * real platform-supplied numbers over fabricated estimators. These tests
 * mock the integration classes and assert that:
 *   - Telegram uses getChatStatistics when available (no Math.random)
 *   - Instagram uses /insights for reach/impressions/saves when present
 *   - Facebook uses page_insights for monthly reach
 *   - LinkedIn uses organizationalEntityShareStatistics for orgs
 *   - WhatsApp surfaces quality_rating as engagement proxy
 */

jest.mock('../integraciones/telegram');
jest.mock('../integraciones/instagram');
jest.mock('../integraciones/facebook');
jest.mock('../integraciones/whatsapp');
jest.mock('../integraciones/linkedin');
jest.mock('../services/linkedinOrgMetricsService');
jest.mock('../lib/encryption', () => ({
  getDecryptedCreds: (canal) => canal.__creds || {},
}));

const TelegramAPI = require('../integraciones/telegram');
const InstagramAPI = require('../integraciones/instagram');
const FacebookAPI = require('../integraciones/facebook');
const WhatsAppAPI = require('../integraciones/whatsapp');
const LinkedInAPI = require('../integraciones/linkedin');
const linkedinOrgMetrics = require('../services/linkedinOrgMetricsService');

const {
  fetchTelegram,
  fetchInstagram,
  fetchFacebook,
  fetchWhatsApp,
  fetchLinkedin,
} = require('../lib/platformConnectors');

beforeEach(() => {
  jest.clearAllMocks();
});

describe('fetchTelegram — native stats', () => {
  test('uses getChatStatistics.meanViewsPerPost (no Math.random)', async () => {
    TelegramAPI.mockImplementation(() => ({
      getChat: jest.fn().mockResolvedValue({ result: { title: 'Test' } }),
      getChatMemberCount: jest.fn().mockResolvedValue({ result: 10000 }),
      getChatStatistics: jest.fn().mockResolvedValue({
        meanViewsPerPost: 3000,
        meanSharesPerPost: 50,
        growthPercent: 2.5,
      }),
    }));

    const result = await fetchTelegram({
      __creds: { botToken: 'bot' },
      identificadores: { chatId: '@test' },
      estadisticas: { seguidores: 10000 },
    });

    expect(result.viewsAvg).toBe(3000);
    expect(result.avgViewsPerPost).toBe(3000);
    expect(result.avgSharesPerPost).toBe(50);
    expect(result.growthRate30d).toBe(2.5);
    expect(result.raw.source).toBe('telegram_native_stats');
    expect(result.raw.estimated).toBeUndefined();
  });

  test('falls back deterministically when getChatStatistics returns null', async () => {
    TelegramAPI.mockImplementation(() => ({
      getChat: jest.fn().mockResolvedValue({ result: { title: 'Test' } }),
      getChatMemberCount: jest.fn().mockResolvedValue({ result: 1000 }),
      getChatStatistics: jest.fn().mockResolvedValue(null),
    }));

    // Run twice — deterministic fallback means identical output (no randomness)
    const a = await fetchTelegram({
      __creds: { botToken: 'bot' },
      identificadores: { chatId: '@test' },
      estadisticas: { seguidores: 1000 },
    });
    const b = await fetchTelegram({
      __creds: { botToken: 'bot' },
      identificadores: { chatId: '@test' },
      estadisticas: { seguidores: 1000 },
    });

    expect(a.viewsAvg).toBe(b.viewsAvg);
    expect(a.viewsAvg).toBe(300); // 1000 × 0.3 deterministic
    expect(a.raw.estimated).toBe(true);
    expect(a.raw.source).toBe('telegram_member_count_only');
  });
});

describe('fetchInstagram — /insights enrichment', () => {
  test('uses real reach/impressions/saves when /insights returns data', async () => {
    InstagramAPI.mockImplementation(() => ({
      getProfile: jest.fn().mockResolvedValue({ followers_count: 50000, media_count: 200 }),
      getRecentMedia: jest.fn().mockResolvedValue({
        data: [
          { id: 'm1', like_count: 500, comments_count: 30 },
          { id: 'm2', like_count: 600, comments_count: 40 },
          { id: 'm3', like_count: 700, comments_count: 50 },
        ],
      }),
      getPostMetrics: jest.fn().mockImplementation((mediaId) => Promise.resolve({
        mediaId,
        reach: 10000,
        impresiones: 12000,
        guardados: 200,
      })),
    }));

    const result = await fetchInstagram({
      __creds: { accessToken: 'tok' },
      identificadorCanal: 'igid',
      estadisticas: { seguidores: 50000 },
    });

    expect(result.viewsAvg).toBe(12000); // impressions, not followers×0.1
    expect(result.raw.avgReach).toBe(10000);
    expect(result.raw.avgSaves).toBe(200);
    expect(result.raw.insightsSampleSize).toBe(3);
    expect(result.raw.source).toBe('instagram_insights');
  });

  test('falls back to follower-rate when /insights unavailable', async () => {
    InstagramAPI.mockImplementation(() => ({
      getProfile: jest.fn().mockResolvedValue({ followers_count: 50000, media_count: 200 }),
      getRecentMedia: jest.fn().mockResolvedValue({
        data: [{ id: 'm1', like_count: 500, comments_count: 30 }],
      }),
      getPostMetrics: jest.fn().mockRejectedValue(new Error('scope missing')),
    }));

    const result = await fetchInstagram({
      __creds: { accessToken: 'tok' },
      identificadorCanal: 'igid',
      estadisticas: { seguidores: 50000 },
    });

    expect(result.viewsAvg).toBe(5000); // 50000 × 0.1 fallback
    expect(result.raw.source).toBe('instagram_basic_media');
    expect(result.raw.insightsSampleSize).toBe(0);
  });
});

describe('fetchFacebook — page_insights enrichment', () => {
  test('derives per-post reach from page_impressions_unique', async () => {
    FacebookAPI.mockImplementation(() => ({
      getPageInfo: jest.fn().mockResolvedValue({ followers_count: 20000, name: 'Test', fan_count: 20000 }),
      getPagePosts: jest.fn().mockResolvedValue({
        data: [
          { likes: { summary: { total_count: 100 } }, comments: { summary: { total_count: 10 } }, shares: { count: 5 } },
          { likes: { summary: { total_count: 200 } }, comments: { summary: { total_count: 20 } }, shares: { count: 10 } },
        ],
      }),
      getPageInsights: jest.fn().mockResolvedValue({
        data: [
          { name: 'page_impressions_unique', values: [{ value: 100000 }] },
          { name: 'page_engaged_users', values: [{ value: 5000 }] },
          { name: 'page_post_engagements', values: [{ value: 8000 }] },
        ],
      }),
    }));

    const result = await fetchFacebook({
      __creds: { accessToken: 'tok' },
      identificadorCanal: 'pageid',
      estadisticas: { seguidores: 20000 },
    });

    // 100000 reach / 2 posts = 50000 per post (not followers × 0.08 = 1600)
    expect(result.viewsAvg).toBe(50000);
    expect(result.raw.monthlyReach).toBe(100000);
    expect(result.raw.source).toBe('facebook_page_insights');
    // 8000 engagements / 100000 reach = 0.08
    expect(result.engagementRate).toBeCloseTo(0.08, 2);
  });

  test('falls back to follower estimate when page_insights empty', async () => {
    FacebookAPI.mockImplementation(() => ({
      getPageInfo: jest.fn().mockResolvedValue({ followers_count: 20000, fan_count: 20000 }),
      getPagePosts: jest.fn().mockResolvedValue({ data: [] }),
      getPageInsights: jest.fn().mockResolvedValue({ data: [] }),
    }));

    const result = await fetchFacebook({
      __creds: { accessToken: 'tok' },
      identificadorCanal: 'pageid',
      estadisticas: { seguidores: 20000 },
    });

    expect(result.viewsAvg).toBe(1600); // 20000 × 0.08 fallback
    expect(result.raw.source).toBe('facebook_basic_posts');
  });
});

describe('fetchWhatsApp — quality_rating proxy', () => {
  test('GREEN quality → engagementRate ~0.85', async () => {
    WhatsAppAPI.mockImplementation(() => ({
      getPhoneNumberInfo: jest.fn().mockResolvedValue({
        verified_name: 'Test',
        quality_rating: 'GREEN',
        messaging_limit_tier: 'TIER_1K',
      }),
    }));

    const result = await fetchWhatsApp({
      __creds: { accessToken: 'tok', phoneNumberId: 'pn' },
      estadisticas: { seguidores: 5000 },
    });

    expect(result.engagementRate).toBe(0.85);
    expect(result.raw.qualityRating).toBe('GREEN');
    expect(result.raw.messagingLimitTier).toBe('TIER_1K');
  });

  test('RED quality degrades engagementRate', async () => {
    WhatsAppAPI.mockImplementation(() => ({
      getPhoneNumberInfo: jest.fn().mockResolvedValue({
        verified_name: 'Test',
        quality_rating: 'RED',
      }),
    }));

    const result = await fetchWhatsApp({
      __creds: { accessToken: 'tok', phoneNumberId: 'pn' },
      estadisticas: { seguidores: 5000 },
    });

    expect(result.engagementRate).toBe(0.15);
    expect(result.raw.qualityRating).toBe('RED');
  });

  test('viewsAvg equals followers (no 0.8 fabrication)', async () => {
    WhatsAppAPI.mockImplementation(() => ({
      getPhoneNumberInfo: jest.fn().mockResolvedValue({
        verified_name: 'Test',
        quality_rating: 'GREEN',
      }),
    }));

    const result = await fetchWhatsApp({
      __creds: { accessToken: 'tok', phoneNumberId: 'pn' },
      estadisticas: { seguidores: 5000 },
    });

    expect(result.viewsAvg).toBe(5000);
    expect(result.raw.estimated).toBe(true);
  });
});

describe('fetchLinkedin — organizationalEntityShareStatistics', () => {
  test('uses 30-day share stats for organizations', async () => {
    LinkedInAPI.mockImplementation(() => ({
      getOrganizationFollowers: jest.fn().mockResolvedValue(15000),
      getOrganization: jest.fn().mockResolvedValue({ localizedName: 'Acme Corp' }),
    }));
    linkedinOrgMetrics.getOrgShareStatistics.mockResolvedValue(null);
    linkedinOrgMetrics.getOrgShareStatisticsTimeBound.mockResolvedValue({
      impressions: 60000,
      likes: 1500,
      comments: 200,
      shares: 100,
      clicks: 800,
    });

    const result = await fetchLinkedin({
      __creds: { accessToken: 'tok' },
      identificadores: { linkedinUrn: 'urn:li:organization:12345' },
      estadisticas: { seguidores: 15000 },
    });

    expect(result.followers).toBe(15000);
    // 60000 / 100 shares ≈ 600 per post
    expect(result.viewsAvg).toBe(600);
    expect(result.raw.source).toBe('linkedin_share_statistics');
    expect(result.raw.window).toBe('30d');
    expect(result.raw.impressions).toBe(60000);
  });

  test('falls back to estimate when share stats fail (missing scope)', async () => {
    LinkedInAPI.mockImplementation(() => ({
      getOrganizationFollowers: jest.fn().mockResolvedValue(15000),
      getOrganization: jest.fn().mockResolvedValue({ localizedName: 'Acme Corp' }),
    }));
    linkedinOrgMetrics.getOrgShareStatistics.mockRejectedValue(new Error('403'));
    linkedinOrgMetrics.getOrgShareStatisticsTimeBound.mockRejectedValue(new Error('403'));

    const result = await fetchLinkedin({
      __creds: { accessToken: 'tok' },
      identificadores: { linkedinUrn: 'urn:li:organization:12345' },
      estadisticas: { seguidores: 15000 },
    });

    expect(result.raw.source).toBe('linkedin_follower_count_only');
    expect(result.raw.estimated).toBe(true);
  });
});
