/**
 * Tests for multi-source Channel Discovery module.
 *
 * Covers:
 * - discoverByKeywords (MTProto contacts.Search mock)
 * - discoverFromSocialGraph (MTProto getMessages mock)
 * - telemetrScraperService (axios/cheerio HTML mock)
 * - batchDiscoverChannels orchestrator
 * - Endpoint /api/jobs/tgstat-discover auth
 */

// ─── Mock GramJS ────────────────────────────────────────────────────────
const mockInvoke = jest.fn();
const mockGetEntity = jest.fn();
const mockGetMessages = jest.fn();
const mockConnect = jest.fn().mockResolvedValue(true);
const mockDisconnect = jest.fn().mockResolvedValue(true);

jest.mock('telegram', () => ({
  TelegramClient: jest.fn().mockImplementation(() => ({
    connect: mockConnect,
    disconnect: mockDisconnect,
    connected: true,
    invoke: mockInvoke,
    getEntity: mockGetEntity,
    getMessages: mockGetMessages,
  })),
}));

jest.mock('telegram/sessions', () => ({
  StringSession: jest.fn().mockImplementation(() => ({ save: () => '' })),
}));

jest.mock('telegram/tl', () => ({
  Api: {
    Channel: class Channel {
      constructor(data) { Object.assign(this, data); this.className = 'Channel'; }
    },
    contacts: {
      Search: jest.fn().mockImplementation((params) => params),
    },
  },
}));

// ─── Mock axios for Telemetr ────────────────────────────────────────────
const mockAxiosGet = jest.fn();
jest.mock('axios', () => ({ get: mockAxiosGet }));

// ─── Env vars ───────────────────────────────────────────────────────────
process.env.TELEGRAM_API_ID = '12345';
process.env.TELEGRAM_API_HASH = 'testhash';
process.env.TELEGRAM_SESSION = 'testsession';
process.env.CRON_SECRET = 'test-cron-secret-discovery';

// ─── Imports (after mocks) ──────────────────────────────────────────────
const {
  discoverByKeywords,
  discoverFromSocialGraph,
  disconnectClient,
} = require('../services/telegramIntelService');

const {
  parseSubscribers,
  extractUsername,
} = require('../services/telemetrScraperService');

// ═══════════════════════════════════════════════════════════════════════
// discoverByKeywords
// ═══════════════════════════════════════════════════════════════════════

describe('discoverByKeywords', () => {
  beforeEach(() => jest.clearAllMocks());
  afterAll(() => disconnectClient());

  test('filters out megagroups and channels with < 500 subs', async () => {
    mockInvoke.mockResolvedValue({
      chats: [
        { className: 'Channel', megagroup: false, username: 'goodchannel', participantsCount: 5000, title: 'Good' },
        { className: 'Channel', megagroup: true, username: 'supergroup', participantsCount: 10000, title: 'Group' },
        { className: 'Channel', megagroup: false, username: 'tinychannel', participantsCount: 100, title: 'Tiny' },
        { className: 'Channel', megagroup: false, username: null, participantsCount: 5000, title: 'NoUser' },
        { className: 'Chat', username: 'notchannel', participantsCount: 5000, title: 'Chat' },
      ],
    });

    const { results, errors } = await discoverByKeywords(['test keyword']);

    expect(results).toHaveLength(1);
    expect(results[0].username).toBe('goodchannel');
    expect(results[0].subscribers).toBe(5000);
    expect(errors).toHaveLength(0);
  });

  test('deduplicates across keywords', async () => {
    mockInvoke
      .mockResolvedValueOnce({
        chats: [
          { className: 'Channel', megagroup: false, username: 'DupChannel', participantsCount: 2000, title: 'Dup' },
        ],
      })
      .mockResolvedValueOnce({
        chats: [
          { className: 'Channel', megagroup: false, username: 'dupchannel', participantsCount: 2000, title: 'Dup2' },
          { className: 'Channel', megagroup: false, username: 'unique', participantsCount: 3000, title: 'Unique' },
        ],
      });

    const { results } = await discoverByKeywords(['kw1', 'kw2']);

    expect(results).toHaveLength(2);
    const usernames = results.map((r) => r.username);
    expect(usernames).toContain('dupchannel');
    expect(usernames).toContain('unique');
  });

  test('handles API errors gracefully per keyword', async () => {
    mockInvoke
      .mockRejectedValueOnce(new Error('FLOOD_WAIT'))
      .mockResolvedValueOnce({ chats: [] });

    const { results, errors } = await discoverByKeywords(['bad', 'ok']);

    expect(results).toHaveLength(0);
    expect(errors).toHaveLength(1);
    expect(errors[0]).toMatch(/FLOOD_WAIT/);
  });
});

// ═══════════════════════════════════════════════════════════════════════
// discoverFromSocialGraph
// ═══════════════════════════════════════════════════════════════════════

describe('discoverFromSocialGraph', () => {
  beforeEach(() => jest.clearAllMocks());

  test('extracts forwards and @mentions from posts', async () => {
    const { Api } = require('telegram/tl');

    // Seed channel entity
    mockGetEntity
      .mockResolvedValueOnce(new Api.Channel({ id: 1n, username: 'seed', accessHash: 0n }))
      // Resolved forward target
      .mockResolvedValueOnce({
        className: 'Channel',
        megagroup: false,
        username: 'fwdchannel',
        participantsCount: 8000,
        title: 'Forwarded',
      })
      // Resolved mention target
      .mockResolvedValueOnce({
        className: 'Channel',
        megagroup: false,
        username: 'mentioned',
        participantsCount: 1200,
        title: 'Mentioned',
      });

    mockGetMessages.mockResolvedValueOnce([
      {
        message: 'Check out @mentioned for more',
        fwdFrom: { fromId: { channelId: '999' } },
        date: Date.now() / 1000,
      },
      {
        message: 'Regular post',
        fwdFrom: null,
        date: Date.now() / 1000,
      },
    ]);

    const { results } = await discoverFromSocialGraph(['@seed']);

    expect(results.length).toBeGreaterThanOrEqual(1);
    const usernames = results.map((r) => r.username);
    expect(usernames).toContain('fwdchannel');
  });

  test('skips non-channel entities and small channels', async () => {
    const { Api } = require('telegram/tl');

    mockGetEntity
      .mockResolvedValueOnce(new Api.Channel({ id: 1n, username: 'seed2', accessHash: 0n }))
      .mockResolvedValueOnce({
        className: 'User',
        username: 'auser',
        participantsCount: 0,
      });

    mockGetMessages.mockResolvedValueOnce([
      {
        message: '@auser hello',
        fwdFrom: null,
        date: Date.now() / 1000,
      },
    ]);

    const { results } = await discoverFromSocialGraph(['seed2']);

    expect(results).toHaveLength(0);
  });
});

// ═══════════════════════════════════════════════════════════════════════
// telemetrScraperService
// ═══════════════════════════════════════════════════════════════════════

describe('telemetrScraperService', () => {
  test('parseSubscribers handles K/M suffixes', () => {
    expect(parseSubscribers('12.4K')).toBe(12400);
    expect(parseSubscribers('1.2M')).toBe(1200000);
    expect(parseSubscribers('500')).toBe(500);
    expect(parseSubscribers('15 200')).toBe(15200);
    expect(parseSubscribers('')).toBe(0);
    expect(parseSubscribers(null)).toBe(0);
  });

  test('extractUsername parses channel URLs', () => {
    expect(extractUsername('/channel/@myChannel')).toBe('mychannel');
    expect(extractUsername('/channel/testchan')).toBe('testchan');
    expect(extractUsername('/other/path')).toBeNull();
    expect(extractUsername('')).toBeNull();
    expect(extractUsername(null)).toBeNull();
  });

  test('scrapeCategory parses HTML with channel links', async () => {
    const { scrapeCategory } = require('../services/telemetrScraperService');

    mockAxiosGet.mockResolvedValueOnce({
      data: `<html><body>
        <div class="channels-rating__item">
          <a href="/channel/@finanzas_es">Finanzas ES</a>
          <span class="channels-rating__subs">15.2K</span>
        </div>
        <div class="channels-rating__item">
          <a href="/channel/@crypto_spain">Crypto Spain</a>
          <span class="channels-rating__subs">8.5K</span>
        </div>
      </body></html>`,
    });

    const results = await scrapeCategory('finance', 1);

    expect(results).toHaveLength(2);
    expect(results[0].username).toBe('finanzas_es');
    expect(results[1].username).toBe('crypto_spain');
  });

  test('returns empty array on network error', async () => {
    const { scrapeCategory } = require('../services/telemetrScraperService');

    mockAxiosGet.mockRejectedValueOnce(new Error('ECONNREFUSED'));

    const results = await scrapeCategory('finance', 1);

    expect(results).toEqual([]);
  });
});

// ═══════════════════════════════════════════════════════════════════════
// batchDiscoverChannels orchestrator
// ═══════════════════════════════════════════════════════════════════════

describe('batchDiscoverChannels', () => {
  test('returns correct shape with sources breakdown', async () => {
    // Mock all 3 sources to skip real execution
    jest.mock('../services/telegramIntelService', () => ({
      discoverByKeywords: jest.fn().mockResolvedValue({
        results: [
          { username: 'mtproto_chan', title: 'From MTProto', subscribers: 5000 },
        ],
        errors: [],
      }),
      discoverFromSocialGraph: jest.fn().mockResolvedValue({
        results: [
          { username: 'social_chan', title: 'From Social', subscribers: 3000 },
        ],
        errors: [],
      }),
      disconnectClient: jest.fn().mockResolvedValue(),
    }));

    jest.mock('../services/telemetrScraperService', () => ({
      scrapeAllCategories: jest.fn().mockResolvedValue({
        results: [
          { username: 'telemetr_chan', title: 'From Telemetr', subscribers: 7000, category: 'finanzas' },
          { username: 'mtproto_chan', title: 'Duplicate', subscribers: 5000 }, // duplicate
        ],
        errors: [],
      }),
    }));

    jest.mock('../models/ChannelCandidate', () => ({
      findOneAndUpdate: jest.fn().mockResolvedValue({}),
    }));

    jest.mock('../models/Canal', () => ({
      find: jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({
          lean: jest.fn().mockResolvedValue([
            { identificadorCanal: '@seedchan' },
          ]),
        }),
      }),
      findOne: jest.fn().mockReturnValue({
        lean: jest.fn().mockResolvedValue(null), // no existing canals
      }),
    }));

    // Re-require to pick up mocks
    jest.isolateModules(() => {
      const { batchDiscoverChannels } = require('../services/tgstatScraperService');

      return batchDiscoverChannels().then((result) => {
        expect(result).toHaveProperty('discovered');
        expect(result).toHaveProperty('duplicates');
        expect(result).toHaveProperty('saved');
        expect(result).toHaveProperty('errors');
        expect(result).toHaveProperty('sources');
        expect(result.sources).toHaveProperty('mtproto');
        expect(result.sources).toHaveProperty('social_graph');
        expect(result.sources).toHaveProperty('telemetr');
      });
    });
  });
});

// ═══════════════════════════════════════════════════════════════════════
// Endpoint /api/jobs/tgstat-discover
// ═══════════════════════════════════════════════════════════════════════

describe('GET /api/jobs/tgstat-discover', () => {
  let app;
  let request;

  beforeAll(() => {
    jest.mock('../services/tgstatScraperService', () => ({
      batchDiscoverChannels: jest.fn().mockResolvedValue({
        discovered: 45,
        duplicates: 5,
        saved: 38,
        errors: [],
        sources: { mtproto: 20, social_graph: 10, telemetr: 15 },
      }),
      batchDiscoverFromTGStat: jest.fn().mockResolvedValue({
        discovered: 45,
        duplicates: 5,
        saved: 38,
        errors: [],
        sources: { mtproto: 20, social_graph: 10, telemetr: 15 },
      }),
      DEFAULT_CATEGORIES: [],
    }));

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
  });

  test('returns 401 without CRON_SECRET', async () => {
    const res = await request(app)
      .get('/api/jobs/tgstat-discover')
      .expect(401);
    expect(res.body.success).toBe(false);
  });

  test('returns 401 with wrong CRON_SECRET', async () => {
    await request(app)
      .get('/api/jobs/tgstat-discover')
      .set('Authorization', 'Bearer wrong')
      .expect(401);
  });

  test('returns 200 with correct CRON_SECRET and sources field', async () => {
    const res = await request(app)
      .get('/api/jobs/tgstat-discover')
      .set('Authorization', 'Bearer test-cron-secret-discovery')
      .expect(200);

    expect(res.body.success).toBe(true);
    expect(res.body.discovered).toBe(45);
    expect(res.body.saved).toBe(38);
    expect(res.body.duration_ms).toBeDefined();
  });

  test('returns 503 when CRON_SECRET not configured', async () => {
    const orig = process.env.CRON_SECRET;
    delete process.env.CRON_SECRET;

    await request(app)
      .get('/api/jobs/tgstat-discover')
      .set('Authorization', 'Bearer anything')
      .expect(503);

    process.env.CRON_SECRET = orig;
  });
});
