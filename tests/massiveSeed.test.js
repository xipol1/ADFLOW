/**
 * Tests for massive seed job + job status endpoint.
 */

process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-secret';
process.env.JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'test-refresh-secret';
process.env.CRON_SECRET = 'test-cron-massive';
process.env.TELEGRAM_API_ID = '12345';
process.env.TELEGRAM_API_HASH = 'testhash';
process.env.TELEGRAM_SESSION = 'test';

describe('massiveSeedJob', () => {
  test('startMassiveSeedJob returns a jobId string', () => {
    // Mock dependencies to prevent real execution
    jest.mock('../services/telegramIntelService', () => ({
      getClient: jest.fn().mockResolvedValue({}),
      disconnectClient: jest.fn().mockResolvedValue(),
      discoverByKeywords: jest.fn().mockResolvedValue({ results: [], errors: [] }),
      discoverFromSocialGraph: jest.fn().mockResolvedValue({ results: [], errors: [] }),
      getChannelMetrics: jest.fn().mockResolvedValue(null),
      sleep: jest.fn().mockResolvedValue(),
      ALL_KEYWORDS: ['test1', 'test2'],
      SEED_CHANNELS: ['seedchan'],
    }));

    jest.mock('../models/JobLog', () => ({
      create: jest.fn().mockResolvedValue({
        jobId: 'test',
        progress: {},
        save: jest.fn().mockResolvedValue(),
      }),
    }));

    jest.mock('../models/ChannelCandidate', () => ({}));
    jest.mock('../models/Canal', () => ({
      find: jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({
          lean: jest.fn().mockResolvedValue([]),
        }),
      }),
    }));

    const { startMassiveSeedJob } = require('../jobs/massiveSeedJob');
    const jobId = startMassiveSeedJob();

    expect(typeof jobId).toBe('string');
    expect(jobId).toMatch(/^massive-seed-/);
  });

  test('ALL_KEYWORDS has 80+ entries and SEED_CHANNELS 15+', () => {
    const fs = require('fs');
    const path = require('path');
    const src = fs.readFileSync(
      path.join(__dirname, '..', 'services', 'telegramIntelService.js'),
      'utf8',
    );
    // Count quoted strings in ALL_KEYWORDS array
    const kwMatch = src.match(/const ALL_KEYWORDS = \[([\s\S]*?)\];/);
    const kwCount = kwMatch ? (kwMatch[1].match(/'/g) || []).length / 2 : 0;
    expect(kwCount).toBeGreaterThanOrEqual(80);

    const seedMatch = src.match(/const SEED_CHANNELS = \[([\s\S]*?)\];/);
    const seedCount = seedMatch ? (seedMatch[1].match(/'/g) || []).length / 2 : 0;
    expect(seedCount).toBeGreaterThanOrEqual(15);
  });
});

describe('Massive seed endpoints', () => {
  let app;
  let request;

  beforeAll(() => {
    jest.mock('../jobs/massiveSeedJob', () => ({
      startMassiveSeedJob: jest.fn().mockReturnValue('massive-seed-123-abc'),
    }));

    jest.mock('../models/JobLog', () => ({
      findOne: jest.fn().mockReturnValue({
        lean: jest.fn().mockResolvedValue({
          jobId: 'massive-seed-123-abc',
          type: 'massive-seed',
          status: 'running',
          progress: { phase: 'keyword-discovery', current: 10, total: 80 },
        }),
      }),
    }));

    jest.mock('../middleware/auth', () => ({
      autenticar: (req, res, next) => { req.usuario = { _id: 'test' }; next(); },
    }));

    jest.mock('../services/tgstatScraperService', () => ({
      batchDiscoverChannels: jest.fn().mockResolvedValue({
        discovered: 0, duplicates: 0, saved: 0, errors: [], sources: {},
      }),
      batchDiscoverFromTGStat: jest.fn().mockResolvedValue({
        discovered: 0, duplicates: 0, saved: 0, errors: [],
      }),
      DEFAULT_CATEGORIES: [],
    }));

    request = require('supertest');
    const express = require('express');
    app = express();
    app.use(express.json());
    app.use('/api/jobs', require('../routes/channelCandidates'));
  });

  test('POST /api/jobs/massive-seed returns 401 without CRON_SECRET', async () => {
    const res = await request(app)
      .post('/api/jobs/massive-seed')
      .expect(401);
    expect(res.body.success).toBe(false);
  });

  test('POST /api/jobs/massive-seed returns jobId with correct auth', async () => {
    const res = await request(app)
      .post('/api/jobs/massive-seed')
      .set('Authorization', 'Bearer test-cron-massive')
      .expect(200);

    expect(res.body.success).toBe(true);
    expect(res.body.jobId).toBe('massive-seed-123-abc');
    expect(res.body.status).toBe('started');
  });

  test('GET /api/jobs/:jobId/status returns job progress', async () => {
    const res = await request(app)
      .get('/api/jobs/massive-seed-123-abc/status')
      .set('Authorization', 'Bearer test-cron-massive')
      .expect(200);

    expect(res.body.success).toBe(true);
    expect(res.body.data.jobId).toBe('massive-seed-123-abc');
    expect(res.body.data.status).toBe('running');
    expect(res.body.data.progress.phase).toBe('keyword-discovery');
  });

  test('GET /api/jobs/:jobId/status returns 401 without auth', async () => {
    await request(app)
      .get('/api/jobs/massive-seed-123-abc/status')
      .expect(401);
  });

  test('GET /api/jobs/nonexistent/status returns 404', async () => {
    const JobLog = require('../models/JobLog');
    JobLog.findOne.mockReturnValueOnce({
      lean: jest.fn().mockResolvedValue(null),
    });

    const res = await request(app)
      .get('/api/jobs/nonexistent/status')
      .set('Authorization', 'Bearer test-cron-massive')
      .expect(404);

    expect(res.body.message).toBe('Job not found');
  });
});
