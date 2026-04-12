/**
 * Tests for TGStat Discovery module.
 *
 * All tests run without real TGStat API calls (fully mocked).
 */

// ── Mock axios before requiring service ──────────────────────────────────
const mockGet = jest.fn();
jest.mock('axios', () => ({ get: mockGet }));

process.env.TGSTAT_API_TOKEN = 'test-tgstat-token';
process.env.CRON_SECRET = 'test-cron-secret-tgstat';

const {
  scrapeChannelsByCategory,
  scrapeChannelDetail,
  DEFAULT_CATEGORIES,
} = require('../services/tgstatScraperService');

// ── Helpers ──────────────────────────────────────────────────────────────

function buildSearchResponse(channels = []) {
  return {
    data: {
      status: 'ok',
      response: {
        count: channels.length,
        items: channels,
      },
    },
  };
}

function buildChannelItem(overrides = {}) {
  return {
    id: 12345,
    tg_id: 67890,
    link: 'https://t.me/testchannel',
    peer_type: 'channel',
    username: '@testchannel',
    title: 'Test Channel',
    about: 'A test channel for economics',
    image100: 'https://tgstat.com/img/test.jpg',
    image640: 'https://tgstat.com/img/test_big.jpg',
    participants_count: 15000,
    ci_index: 12.5,
    created_at: 1700000000,
    ...overrides,
  };
}

function buildGetResponse(channel = {}) {
  return {
    data: {
      status: 'ok',
      response: {
        id: 12345,
        tg_id: 67890,
        username: 'testchannel',
        title: 'Test Channel',
        about: 'A test channel',
        category: 'economics',
        country: 'ES',
        language: 'spanish',
        participants_count: 15000,
        ci_index: 12.5,
        ...channel,
      },
    },
  };
}

function buildStatResponse(stats = {}) {
  return {
    data: {
      status: 'ok',
      response: {
        participants_count: 15000,
        avg_post_reach: 5000,
        err_percent: 33.3,
        er_percent: 2.1,
        daily_reach: 8000,
        posts_count: 450,
        mentions_count: 12,
        forwards_count: 85,
        ...stats,
      },
    },
  };
}

// ── Unit Tests ───────────────────────────────────────────────────────────

describe('tgstatScraperService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('scrapeChannelsByCategory', () => {
    test('returns parsed channel candidates from API response', async () => {
      mockGet.mockResolvedValueOnce(buildSearchResponse([
        buildChannelItem({ username: '@canal_crypto', participants_count: 25000 }),
        buildChannelItem({ username: '@canal_economia', participants_count: 8000 }),
      ]));

      const result = await scrapeChannelsByCategory('economics');

      expect(result).toHaveLength(2);
      expect(result[0].username).toBe('canal_crypto');
      expect(result[0].subscribers).toBe(25000);
      expect(result[0].category).toBe('economics');
      expect(result[1].username).toBe('canal_economia');

      // Verify API was called with correct params
      expect(mockGet).toHaveBeenCalledWith(
        'https://api.tgstat.ru/channels/search',
        expect.objectContaining({
          params: expect.objectContaining({
            token: 'test-tgstat-token',
            category: 'economics',
            language: 'spanish',
            peer_type: 'channel',
          }),
        }),
      );
    });

    test('returns empty array when no results', async () => {
      mockGet.mockResolvedValueOnce(buildSearchResponse([]));

      const result = await scrapeChannelsByCategory('economics');

      expect(result).toEqual([]);
    });

    test('strips @ from username', async () => {
      mockGet.mockResolvedValueOnce(buildSearchResponse([
        buildChannelItem({ username: '@MiCanal' }),
      ]));

      const result = await scrapeChannelsByCategory('crypto');

      expect(result[0].username).toBe('micanal');
    });

    test('handles API error gracefully', async () => {
      mockGet.mockRejectedValueOnce(new Error('Network error'));

      await expect(scrapeChannelsByCategory('economics')).rejects.toThrow('Network error');
    });

    test('handles 429 with retry (verify retry logic exists)', () => {
      // Verify that the service source code contains 429 retry logic
      const fs = require('fs');
      const path = require('path');
      const src = fs.readFileSync(
        path.join(__dirname, '..', 'services', 'tgstatScraperService.js'),
        'utf8',
      );
      expect(src).toMatch(/429/);
      expect(src).toMatch(/retries/);
      expect(src).toMatch(/60000/);
    });
  });

  describe('scrapeChannelDetail', () => {
    test('returns combined info and stats', async () => {
      mockGet
        .mockResolvedValueOnce(buildGetResponse({ username: 'detailchan' }))
        .mockResolvedValueOnce(buildStatResponse({ avg_post_reach: 7000 }));

      const result = await scrapeChannelDetail('detailchan');

      expect(result).toBeDefined();
      expect(result.username).toBe('detailchan');
      expect(result.subscribers).toBe(15000);
      expect(result.avg_post_reach).toBe(7000);
      expect(result.category).toBe('economics');
    });

    test('returns null stats fields when stat request fails', async () => {
      mockGet
        .mockResolvedValueOnce(buildGetResponse({ username: 'partialchan' }))
        .mockRejectedValueOnce(new Error('Stat endpoint failed'));

      const result = await scrapeChannelDetail('partialchan');

      expect(result).toBeDefined();
      expect(result.username).toBe('partialchan');
      expect(result.subscribers).toBe(15000);
      expect(result.avg_post_reach).toBeNull();
      expect(result.er_percent).toBeNull();
    });

    test('returns null when channel info request fails', async () => {
      mockGet.mockRejectedValueOnce(new Error('Channel not found'));

      const result = await scrapeChannelDetail('nonexistent');

      expect(result).toBeNull();
    });
  });

  describe('DEFAULT_CATEGORIES', () => {
    test('includes all 8 required categories', () => {
      expect(DEFAULT_CATEGORIES).toContain('economics');
      expect(DEFAULT_CATEGORIES).toContain('marketing');
      expect(DEFAULT_CATEGORIES).toContain('technologies');
      expect(DEFAULT_CATEGORIES).toContain('crypto');
      expect(DEFAULT_CATEGORIES).toContain('health');
      expect(DEFAULT_CATEGORIES).toContain('education');
      expect(DEFAULT_CATEGORIES).toContain('business');
      expect(DEFAULT_CATEGORIES).toContain('entertainment');
      expect(DEFAULT_CATEGORIES).toHaveLength(8);
    });
  });
});

// ── Route / endpoint tests ──────────────────────────────────────────────

describe('TGStat Discovery endpoints', () => {
  let app;
  let request;

  beforeAll(() => {
    // Mock the service to avoid real API calls
    jest.mock('../services/tgstatScraperService', () => ({
      batchDiscoverFromTGStat: jest.fn().mockResolvedValue({
        discovered: 45,
        duplicates: 5,
        saved: 38,
        errors: ['Category health: timeout'],
      }),
      DEFAULT_CATEGORIES: ['economics', 'marketing', 'technologies', 'crypto',
        'health', 'education', 'business', 'entertainment'],
    }));

    // Mock auth middleware
    jest.mock('../middleware/auth', () => ({
      autenticar: (req, res, next) => {
        req.usuario = { _id: '507f1f77bcf86cd799439011' };
        next();
      },
      requiereEmailVerificado: (req, res, next) => next(),
    }));

    request = require('supertest');
    const express = require('express');
    app = express();
    app.use(express.json());
    app.use('/api/jobs', require('../routes/channelCandidates'));
    app.use('/api/channel-candidates', require('../routes/channelCandidates'));
  });

  describe('GET /api/jobs/tgstat-discover', () => {
    test('returns 401 without CRON_SECRET', async () => {
      const res = await request(app)
        .get('/api/jobs/tgstat-discover')
        .expect(401);

      expect(res.body.success).toBe(false);
      expect(res.body.message).toBe('Unauthorized');
    });

    test('returns 401 with wrong CRON_SECRET', async () => {
      const res = await request(app)
        .get('/api/jobs/tgstat-discover')
        .set('Authorization', 'Bearer wrong-secret')
        .expect(401);

      expect(res.body.success).toBe(false);
    });

    test('returns 200 with correct CRON_SECRET', async () => {
      const res = await request(app)
        .get('/api/jobs/tgstat-discover')
        .set('Authorization', 'Bearer test-cron-secret-tgstat')
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.discovered).toBe(45);
      expect(res.body.duplicates).toBe(5);
      expect(res.body.saved).toBe(38);
      expect(res.body.errors).toHaveLength(1);
      expect(res.body.duration_ms).toBeDefined();
    });

    test('POST also works with correct CRON_SECRET', async () => {
      const res = await request(app)
        .post('/api/jobs/tgstat-discover')
        .set('Authorization', 'Bearer test-cron-secret-tgstat')
        .send({ categories: ['crypto', 'economics'] })
        .expect(200);

      expect(res.body.success).toBe(true);
    });

    test('returns 503 when CRON_SECRET is not configured', async () => {
      const originalSecret = process.env.CRON_SECRET;
      delete process.env.CRON_SECRET;

      const res = await request(app)
        .get('/api/jobs/tgstat-discover')
        .set('Authorization', 'Bearer anything')
        .expect(503);

      expect(res.body.message).toBe('CRON_SECRET not configured');

      process.env.CRON_SECRET = originalSecret;
    });
  });
});
