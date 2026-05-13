/**
 * Orchestrator unit tests focused on the parts that don't need a live
 * database: the fault-tolerant batch runner and the cron endpoint auth.
 *
 * Full integration (Mongo + Canal fixtures + runScoringBatch) lives in
 * tests/integration.* and is gated by MONGO_URI availability.
 */

jest.mock('../lib/ensureDb', () => ({ ensureDb: jest.fn().mockResolvedValue(true) }));

describe('processChannelsConcurrently — fault isolation', () => {
  // We stub the required models before requiring the orchestrator so the
  // lazy model() requires inside it resolve to our stubs.
  const okId = 'ok-1';
  const badId = 'bad-1';
  const okId2 = 'ok-2';

  beforeEach(() => {
    jest.resetModules();

    jest.doMock('../models/Canal', () => ({
      findById: jest.fn(async (id) => {
        if (id === badId) throw new Error('boom');
        return {
          _id: id,
          plataforma: 'telegram',
          categoria: 'crypto',
          estadisticas: { seguidores: 10000, promedioVisualizaciones: 2000 },
          verificacion: { tipoAcceso: 'admin_directo' },
          antifraude: { flags: [] },
          crawler: {},
          save: jest.fn().mockResolvedValue(true),
        };
      }),
    }));
    jest.doMock('../models/Campaign', () => ({
      find: () => ({ select: () => ({ lean: async () => [] }) }),
    }));
    jest.doMock('../models/CanalScoreSnapshot', () => ({
      create: jest.fn().mockResolvedValue(true),
    }));
    jest.doMock('../models/ScoringCronLog', () => ({
      create: jest.fn().mockResolvedValue(true),
    }));
  });

  test('one failing channel does not abort the rest of the batch', async () => {
    const { processChannelsConcurrently } = require('../services/scoringOrchestrator');
    const result = await processChannelsConcurrently([okId, badId, okId2], 2);
    expect(result.updated).toBe(2);
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0].canalId).toBe(badId);
    expect(result.errors[0].mensaje).toContain('boom');
  });

  test('empty input returns zero updates and no errors', async () => {
    const { processChannelsConcurrently } = require('../services/scoringOrchestrator');
    const result = await processChannelsConcurrently([], 5);
    expect(result.updated).toBe(0);
    expect(result.errors).toHaveLength(0);
  });
});

describe('admin scoring endpoint — auth', () => {
  // We mount the real router on a real express app and drive it with
  // supertest. The previous version walked the router stack manually,
  // which races against async handlers and reports a null body for
  // happy-path requests even though the handler did write a response.
  const express = require('express');
  const request = require('supertest');

  beforeEach(() => {
    jest.resetModules();
    delete process.env.CRON_SECRET;
    jest.doMock('../services/scoringOrchestrator', () => ({
      runScoringBatch: jest.fn().mockResolvedValue({
        canalesProcesados: 0, canalesActualizados: 0, errores: 0,
        erroresDetalle: [], duracionMs: 5, nextCursor: null,
      }),
      recalcularCASCanal: jest.fn().mockResolvedValue({ CAS: 73 }),
    }));
  });

  function makeApp() {
    const router = require('../routes/adminScoring');
    const app = express();
    app.use(express.json());
    app.use('/', router);
    return app;
  }

  test('returns 503 when CRON_SECRET is not configured', async () => {
    const res = await request(makeApp()).post('/run');
    expect(res.status).toBe(503);
    expect(res.body.message).toMatch(/CRON_SECRET/);
  });

  test('returns 401 when Authorization header is missing or wrong', async () => {
    process.env.CRON_SECRET = 'test-secret';
    const res = await request(makeApp())
      .post('/run')
      .set('Authorization', 'Bearer nope');
    expect(res.status).toBe(401);
  });

  test('returns 200 with batch result when auth is correct', async () => {
    process.env.CRON_SECRET = 'test-secret';
    const res = await request(makeApp())
      .post('/run')
      .set('Authorization', 'Bearer test-secret');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toHaveProperty('canalesProcesados');
    expect(res.body.data).toHaveProperty('nextCursor');
  });

  test('GET /run is also supported (Vercel Cron uses GET)', async () => {
    process.env.CRON_SECRET = 'test-secret';
    const res = await request(makeApp())
      .get('/run')
      .set('Authorization', 'Bearer test-secret');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });
});
