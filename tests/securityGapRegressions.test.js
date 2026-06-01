/**
 * Anti-regression guards for two security gap-fixes (PR #74, commit 80c18ea):
 *
 *   1. buscarAnuncios IDOR — GET /api/anuncios/buscar must scope results to the
 *      caller (anunciante); only admins may query across advertisers. A
 *      regression here re-opens enumeration of every advertiser's ad docs.
 *   2. Telegram webhook fail-closed — a mismatched or missing-on-managed-host
 *      secret must NOT process the update (metric spoofing → inflated payouts).
 *
 * Pure unit tests (no DB): the controller/router logic is exercised with mocked
 * models, so they run anywhere and pin the exact behaviour of each fix.
 */

jest.mock('../lib/ensureDb', () => ({ ensureDb: jest.fn(async () => true) }));
jest.mock('../models/Anuncio', () => ({ find: jest.fn() }));
jest.mock('../integraciones/telegram', () => ({ parseWebhookUpdate: jest.fn() }));
jest.mock('../models/CampaignMetrics', () => ({ findOneAndUpdate: jest.fn(async () => ({})) }));

// ───────────────────────────────────────────────────────────────────────────
// 1. buscarAnuncios — IDOR scoping
// ───────────────────────────────────────────────────────────────────────────
const Anuncio = require('../models/Anuncio');
const anuncioController = require('../controllers/anuncioController');

const findChain = (result) => ({ sort: () => ({ limit: () => ({ lean: async () => result }) }) });
const mockRes = () => {
  const res = {};
  res.status = jest.fn(() => res);
  res.json = jest.fn(() => res);
  return res;
};

describe('buscarAnuncios — IDOR scoping (GET /api/anuncios/buscar)', () => {
  beforeEach(() => jest.clearAllMocks());

  test('non-admin: query is scoped to the caller (anunciante)', async () => {
    let captured;
    Anuncio.find.mockImplementation((q) => { captured = q; return findChain([]); });

    const req = { usuario: { id: 'USER_A', rol: 'advertiser' }, query: { estado: 'activo' } };
    await anuncioController.buscarAnuncios(req, mockRes());

    expect(Anuncio.find).toHaveBeenCalledTimes(1);
    expect(captured.anunciante).toBe('USER_A');   // <-- the IDOR fix
    expect(captured.estado).toBe('activo');
  });

  test('admin: query is NOT scoped (may search across advertisers)', async () => {
    let captured;
    Anuncio.find.mockImplementation((q) => { captured = q; return findChain([]); });

    const req = { usuario: { id: 'ADMIN_1', rol: 'admin' }, query: {} };
    await anuncioController.buscarAnuncios(req, mockRes());

    expect(captured.anunciante).toBeUndefined();
  });
});

// ───────────────────────────────────────────────────────────────────────────
// 2. Telegram webhook — fail-closed secret validation
// ───────────────────────────────────────────────────────────────────────────
const express = require('express');
const request = require('supertest');
const TelegramBot = require('../integraciones/telegram');
const webhooksRouter = require('../routes/webhooks');

const flush = () => new Promise((r) => setImmediate(r));
const makeApp = () => {
  const app = express();
  app.use('/api/webhooks', webhooksRouter);
  return app;
};

describe('Telegram webhook — fail-closed secret (POST /api/webhooks/telegram)', () => {
  const app = makeApp();
  const ORIGINAL = { secret: process.env.TELEGRAM_WEBHOOK_SECRET, vercel: process.env.VERCEL, node: process.env.NODE_ENV };

  beforeEach(() => {
    jest.clearAllMocks();
    TelegramBot.parseWebhookUpdate.mockReturnValue({ views: 100, messageId: 1, chatId: 1 });
  });
  afterAll(() => {
    if (ORIGINAL.secret === undefined) delete process.env.TELEGRAM_WEBHOOK_SECRET; else process.env.TELEGRAM_WEBHOOK_SECRET = ORIGINAL.secret;
    if (ORIGINAL.vercel === undefined) delete process.env.VERCEL; else process.env.VERCEL = ORIGINAL.vercel;
    process.env.NODE_ENV = ORIGINAL.node;
  });

  test('secret MISMATCH → 200 but NOT processed', async () => {
    process.env.TELEGRAM_WEBHOOK_SECRET = 'right-secret';
    const res = await request(app)
      .post('/api/webhooks/telegram')
      .set('x-telegram-bot-api-secret-token', 'WRONG')
      .send({ channel_post: { views: 100 } });
    await flush();
    expect(res.status).toBe(200);                               // 200 so Telegram won't retry-storm
    expect(TelegramBot.parseWebhookUpdate).not.toHaveBeenCalled(); // but the update is dropped
  });

  test('no secret configured on a managed host → fail-closed (NOT processed)', async () => {
    delete process.env.TELEGRAM_WEBHOOK_SECRET;
    process.env.VERCEL = '1'; // simulate a managed deploy even if NODE_ENV !== production
    const res = await request(app)
      .post('/api/webhooks/telegram')
      .send({ channel_post: { views: 100 } });
    await flush();
    expect(res.status).toBe(200);
    expect(TelegramBot.parseWebhookUpdate).not.toHaveBeenCalled();
    delete process.env.VERCEL;
  });

  test('secret MATCH → processed', async () => {
    process.env.TELEGRAM_WEBHOOK_SECRET = 'right-secret';
    const res = await request(app)
      .post('/api/webhooks/telegram')
      .set('x-telegram-bot-api-secret-token', 'right-secret')
      .send({ channel_post: { views: 100 } });
    await flush();
    expect(res.status).toBe(200);
    expect(TelegramBot.parseWebhookUpdate).toHaveBeenCalled();   // the valid update IS processed
  });
});
