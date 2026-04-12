/**
 * Tests for Telegram Intel module.
 *
 * All tests run without a real Telegram connection (fully mocked).
 */

const { Api } = require('telegram/tl');

// ─── Mock GramJS before requiring the service ─────────────────────────────

const mockGetEntity = jest.fn();
const mockInvoke = jest.fn();
const mockGetMessages = jest.fn();
const mockConnect = jest.fn().mockResolvedValue(true);
const mockDisconnect = jest.fn().mockResolvedValue(true);

jest.mock('telegram', () => ({
  TelegramClient: jest.fn().mockImplementation(() => ({
    connect: mockConnect,
    disconnect: mockDisconnect,
    connected: true,
    getEntity: mockGetEntity,
    invoke: mockInvoke,
    getMessages: mockGetMessages,
  })),
}));

jest.mock('telegram/sessions', () => ({
  StringSession: jest.fn().mockImplementation((str) => ({ save: () => str || '' })),
}));

// Set env vars before requiring
process.env.TELEGRAM_API_ID = '12345';
process.env.TELEGRAM_API_HASH = 'testhash';
process.env.TELEGRAM_SESSION = 'testsession';

const { getChannelMetrics, disconnectClient } = require('../services/telegramIntelService');

// ─── Helpers ──────────────────────────────────────────────────────────────

function buildMockChannel({ participantsCount = 50000, verified = false, about = 'Test channel' } = {}) {
  const entity = new Api.Channel({
    id: BigInt(123456),
    title: 'Test Channel',
    username: 'testchannel',
    verified,
    accessHash: BigInt(0),
  });

  const fullChat = {
    participantsCount,
    about,
  };

  return { entity, fullChat };
}

function buildMockMessages(count = 20, baseViews = 1000) {
  const now = Math.floor(Date.now() / 1000);
  return Array.from({ length: count }, (_, i) => ({
    message: `Post ${i + 1}`,
    media: null,
    views: baseViews + (count - i) * 10, // decreasing views for older posts
    date: now - i * 3600 * 12, // 12 hours apart
  }));
}

// ─── Tests ────────────────────────────────────────────────────────────────

describe('telegramIntelService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterAll(async () => {
    await disconnectClient();
  });

  describe('getChannelMetrics', () => {
    test('returns full metrics for a public channel with participants', async () => {
      const { entity, fullChat } = buildMockChannel({ participantsCount: 50000, verified: true });
      const messages = buildMockMessages(20, 5000);

      mockGetEntity.mockResolvedValue(entity);
      mockInvoke.mockResolvedValue({ fullChat });
      mockGetMessages.mockResolvedValue(messages);

      const result = await getChannelMetrics('testchannel');

      expect(result).toBeDefined();
      expect(result.username).toBe('testchannel');
      expect(result.participants_count).toBe(50000);
      expect(result.verified).toBe(true);
      expect(result.unscrapable).toBe(false);
      expect(result.avg_views_last_20_posts).toBeGreaterThan(0);
      expect(result.engagement_rate).toBeGreaterThan(0);
      expect(result.engagement_rate).toBeLessThanOrEqual(1);
      expect(result.post_frequency_per_week).toBeGreaterThan(0);
      expect(result.views_trend).toBeDefined();
      expect(result.last_post_date).toBeInstanceOf(Date);
      expect(result.description).toBe('Test channel');
    });

    test('returns unscrapable=true when participants_count is null (private channel)', async () => {
      const { entity, fullChat } = buildMockChannel({ participantsCount: null });

      // Override participantsCount to undefined (simulates private channel)
      fullChat.participantsCount = undefined;

      mockGetEntity.mockResolvedValue(entity);
      mockInvoke.mockResolvedValue({ fullChat });

      const result = await getChannelMetrics('privatechannel');

      expect(result).toBeDefined();
      expect(result.participants_count).toBeNull();
      expect(result.unscrapable).toBe(true);
      expect(result.avg_views_last_20_posts).toBeNull();
      expect(result.engagement_rate).toBeNull();
    });

    test('returns null when entity is not a Channel', async () => {
      // Return a non-Channel entity (e.g., User)
      mockGetEntity.mockResolvedValue({ className: 'User' });

      const result = await getChannelMetrics('notachannel');

      expect(result).toBeNull();
    });

    test('strips @ from username', async () => {
      const { entity, fullChat } = buildMockChannel();
      const messages = buildMockMessages(5, 1000);

      mockGetEntity.mockResolvedValue(entity);
      mockInvoke.mockResolvedValue({ fullChat });
      mockGetMessages.mockResolvedValue(messages);

      await getChannelMetrics('@withatsign');

      expect(mockGetEntity).toHaveBeenCalledWith('withatsign');
    });

    test('handles fewer than 20 posts (no views_trend)', async () => {
      const { entity, fullChat } = buildMockChannel({ participantsCount: 10000 });
      const messages = buildMockMessages(5, 500);

      mockGetEntity.mockResolvedValue(entity);
      mockInvoke.mockResolvedValue({ fullChat });
      mockGetMessages.mockResolvedValue(messages);

      const result = await getChannelMetrics('smallchannel');

      expect(result.views_trend).toBeNull();
      expect(result.avg_views_last_20_posts).toBeGreaterThan(0);
    });

    test('engagement_rate is 0 when avg views is 0', async () => {
      const { entity, fullChat } = buildMockChannel({ participantsCount: 10000 });
      // Messages with 0 views
      const messages = Array.from({ length: 5 }, (_, i) => ({
        message: `Post ${i}`,
        views: 0,
        date: Math.floor(Date.now() / 1000) - i * 3600,
      }));

      mockGetEntity.mockResolvedValue(entity);
      mockInvoke.mockResolvedValue({ fullChat });
      mockGetMessages.mockResolvedValue(messages);

      const result = await getChannelMetrics('deadchannel');

      expect(result.engagement_rate).toBe(0);
    });
  });
});

// ─── Route / endpoint tests ──────────────────────────────────────────────

describe('GET /api/jobs/telegram-intel', () => {
  // We need supertest and the app for integration tests
  let app;
  let request;

  beforeAll(() => {
    // Mock the job to avoid real Telegram calls
    jest.mock('../jobs/telegramIntelJob', () => ({
      runTelegramIntelJob: jest.fn().mockResolvedValue({
        timestamp: '2026-04-12T02:30:00.000Z',
        processed: 3,
        errors: [],
        duration_ms: 7500,
      }),
    }));

    // Set CRON_SECRET for testing
    process.env.CRON_SECRET = 'test-cron-secret-123';

    request = require('supertest');
    // Load the route directly to test in isolation
    const express = require('express');
    app = express();
    app.use(express.json());
    app.use('/api/jobs', require('../routes/telegramIntel'));
  });

  test('returns 401 without CRON_SECRET', async () => {
    const res = await request(app)
      .get('/api/jobs/telegram-intel')
      .expect(401);

    expect(res.body.success).toBe(false);
    expect(res.body.message).toBe('Unauthorized');
  });

  test('returns 401 with wrong CRON_SECRET', async () => {
    const res = await request(app)
      .get('/api/jobs/telegram-intel')
      .set('Authorization', 'Bearer wrong-secret')
      .expect(401);

    expect(res.body.success).toBe(false);
  });

  test('returns 200 with correct CRON_SECRET', async () => {
    const res = await request(app)
      .get('/api/jobs/telegram-intel')
      .set('Authorization', 'Bearer test-cron-secret-123')
      .expect(200);

    expect(res.body.success).toBe(true);
    expect(res.body.processed).toBe(3);
    expect(res.body.errors).toEqual([]);
    expect(res.body.duration_ms).toBeDefined();
    expect(res.body.timestamp).toBeDefined();
  });

  test('POST also works with correct CRON_SECRET', async () => {
    const res = await request(app)
      .post('/api/jobs/telegram-intel')
      .set('Authorization', 'Bearer test-cron-secret-123')
      .expect(200);

    expect(res.body.success).toBe(true);
  });

  test('returns 503 when CRON_SECRET is not configured', async () => {
    const originalSecret = process.env.CRON_SECRET;
    delete process.env.CRON_SECRET;

    const res = await request(app)
      .get('/api/jobs/telegram-intel')
      .set('Authorization', 'Bearer anything')
      .expect(503);

    expect(res.body.message).toBe('CRON_SECRET not configured');

    process.env.CRON_SECRET = originalSecret;
  });
});
