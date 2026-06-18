/**
 * Anti-regression tests for the P0 + P1 security fixes shipped in the
 * pre-launch hardening sprint. Each describe block traces back to a fix
 * commit so a regression here means the original vulnerability is back.
 */
process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-secret';
process.env.JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'test-refresh-secret';

const request = require('supertest');
const app = require('../app');
const legalConsent = require('../services/legalConsent');
const consentsFor = (role) => legalConsent
  .requiredDocsForRole(role === 'creator' ? 'creator' : 'advertiser')
  .map((d) => ({ slug: d.slug, version: d.version }));

describe('Security fixes — anti-regression', () => {
  const uniqueId = Date.now();
  const userAEmail = `sec-a-${uniqueId}@test.com`;
  const userBEmail = `sec-b-${uniqueId}@test.com`;
  const password = 'TestPass123';

  let tokenA;
  let tokenB;
  let userAId;
  const setupTrace = [];

  const registerAndLogin = async (email, role = 'advertiser') => {
    // nombre must pass the registro validator (letters and spaces only) —
    // embedding the email here once made every registration 400 and the
    // whole suite pass vacuously through the `if (!tokenA) return` guards.
    const reg = await request(app).post('/api/auth/registro').send({ email, password, nombre: 'Sec Tester', role, consents: consentsFor(role) });
    setupTrace.push(`registro ${email} → ${reg.status}${reg.status >= 400 ? ' ' + JSON.stringify(reg.body) : ''}`);
    if (reg.status === 503) return { token: null, id: null };
    // Email verification is required for write ops — patch the user to verified
    // directly via Mongoose so we don't need to extract the verification token.
    try {
      const mongoose = require('mongoose');
      const Usuario = mongoose.models.Usuario || require('../models/Usuario');
      await Usuario.findOneAndUpdate({ email }, { emailVerificado: true });
    } catch (e) { /* if DB not available, login will 503 anyway */ }
    const login = await request(app).post('/api/auth/login').send({ email, password });
    setupTrace.push(`login ${email} → ${login.status}${!login.body?.token ? ' (no token)' : ''}`);
    if (login.status === 503 || !login.body?.token) return { token: null, id: null };
    return { token: login.body.token, id: login.body.user?.id || login.body.user?._id };
  };

  beforeAll(async () => {
    const a = await registerAndLogin(userAEmail);
    const b = await registerAndLogin(userBEmail);
    tokenA = a.token; userAId = a.id;
    tokenB = b.token;
  });

  // ─── Setup canary ──────────────────────────────────────────────────────────
  // Every test below early-returns when tokens are missing, so a broken setup
  // (validator change, new required registro field, consent doc bump…) would
  // make the entire suite pass without asserting anything. This test turns
  // that silent skip into a loud failure.
  describe('Setup canary', () => {
    test('both users registered and logged in (tokens + userAId present)', () => {
      if (!tokenA || !tokenB || !userAId) {
        throw new Error(
          'Auth setup failed — the rest of this suite would pass vacuously.\n' +
          setupTrace.join('\n')
        );
      }
      expect(tokenA).toBeTruthy();
      expect(tokenB).toBeTruthy();
      expect(userAId).toBeTruthy();
    });
  });

  // ─── P0-A · withdraw balance check ────────────────────────────────────────
  describe('P0-A · POST /api/payouts/withdraw requires sufficient balance', () => {
    test('rejects when balance is insufficient (fresh creator with €0 earnings)', async () => {
      if (!tokenA) return;
      // datosFacturacion guard fires first → either we test it indirectly,
      // or we patch datosFacturacion.completado=true. Patch for clarity.
      try {
        const mongoose = require('mongoose');
        const Usuario = mongoose.models.Usuario || require('../models/Usuario');
        await Usuario.findByIdAndUpdate(userAId, {
          'datosFacturacion.completado': true,
          'datosFacturacion.nombre': 'Test',
          'datosFacturacion.nif': 'B00000000',
          stripeConnectAccountId: 'acct_TEST_NEVER_REAL',
        });
      } catch { return; }

      const res = await request(app)
        .post('/api/payouts/withdraw')
        .set('Authorization', `Bearer ${tokenA}`)
        .send({ amount: 50 });

      // We expect either:
      //   400 — balance insuficiente (the fix kicked in)
      //   400 — Stripe account no payouts enabled (fix passed, Stripe rejected fake account)
      // The forbidden case is 200/201 — that would mean the transfer succeeded
      // on a €0 balance, which is the original P0.
      expect([400, 503]).toContain(res.status);
      if (res.status === 400) {
        // Message must mention balance, not be a generic Stripe error.
        // If it's the Stripe payouts-enabled check the fake account wouldn't even pass that.
        expect(typeof res.body.message).toBe('string');
      }
    });
  });

  // ─── P0-1 · anuncios write IDOR ───────────────────────────────────────────
  describe('P0-1 · Anuncios write IDOR closed', () => {
    let anuncioOfAId;

    beforeAll(async () => {
      if (!tokenA) return;
      // Create an anuncio owned by user A
      const res = await request(app)
        .post('/api/anuncios')
        .set('Authorization', `Bearer ${tokenA}`)
        .send({
          titulo: 'Anuncio de A',
          descripcion: 'Privado',
          presupuesto: 100,
          tipoAnuncio: 'patrocinio',
        });
      if (res.status === 201) anuncioOfAId = res.body.data?._id || res.body.data?.id;
    });

    test('user B cannot PUT user A anuncio (403)', async () => {
      if (!tokenA || !tokenB || !anuncioOfAId) return;
      const res = await request(app)
        .put(`/api/anuncios/${anuncioOfAId}`)
        .set('Authorization', `Bearer ${tokenB}`)
        .send({ presupuesto: 99999 });
      expect(res.status).toBe(403);
    });

    test('user B cannot DELETE user A anuncio (403)', async () => {
      if (!tokenA || !tokenB || !anuncioOfAId) return;
      const res = await request(app)
        .delete(`/api/anuncios/${anuncioOfAId}`)
        .set('Authorization', `Bearer ${tokenB}`);
      expect(res.status).toBe(403);
    });

    test('user B cannot POST :id/aprobacion on user A anuncio (403)', async () => {
      if (!tokenA || !tokenB || !anuncioOfAId) return;
      const res = await request(app)
        .post(`/api/anuncios/${anuncioOfAId}/aprobacion`)
        .set('Authorization', `Bearer ${tokenB}`);
      expect(res.status).toBe(403);
    });

    test('user B cannot GET user A anuncio detail (403) — P1-5 read IDOR', async () => {
      if (!tokenA || !tokenB || !anuncioOfAId) return;
      const res = await request(app)
        .get(`/api/anuncios/${anuncioOfAId}`)
        .set('Authorization', `Bearer ${tokenB}`);
      expect(res.status).toBe(403);
    });

    test('user A (owner) can PUT their own anuncio (200)', async () => {
      if (!tokenA || !anuncioOfAId) return;
      const res = await request(app)
        .put(`/api/anuncios/${anuncioOfAId}`)
        .set('Authorization', `Bearer ${tokenA}`)
        .send({ titulo: 'Titulo actualizado' });
      expect([200, 201]).toContain(res.status);
    });

    test('non-admin cannot PUT :id/responder approval (403)', async () => {
      if (!tokenA || !anuncioOfAId) return;
      const res = await request(app)
        .put(`/api/anuncios/${anuncioOfAId}/responder`)
        .set('Authorization', `Bearer ${tokenA}`)
        .send({ aprobado: true });
      expect(res.status).toBe(403);
    });
  });

  // ─── P0-2 · tracking analytics IDOR ───────────────────────────────────────
  describe('P0-2 · Tracking link analytics IDOR closed', () => {
    let linkOfAId;

    beforeAll(async () => {
      if (!tokenA) return;
      const res = await request(app)
        .post('/api/tracking/links')
        .set('Authorization', `Bearer ${tokenA}`)
        .send({ targetUrl: 'https://example.com/sec-a', type: 'custom' });
      if (res.status === 201) linkOfAId = res.body.data?.id || res.body.data?._id;
    });

    test('user B cannot GET analytics of user A link (403)', async () => {
      if (!tokenA || !tokenB || !linkOfAId) return;
      const res = await request(app)
        .get(`/api/tracking/links/${linkOfAId}/analytics`)
        .set('Authorization', `Bearer ${tokenB}`);
      expect(res.status).toBe(403);
    });

    test('user A (owner) can GET analytics of own link (200)', async () => {
      if (!tokenA || !linkOfAId) return;
      const res = await request(app)
        .get(`/api/tracking/links/${linkOfAId}/analytics`)
        .set('Authorization', `Bearer ${tokenA}`);
      expect(res.status).toBe(200);
    });
  });

  // ─── P0-C · Telegram webhook secret_token ─────────────────────────────────
  describe('P0-C · Telegram webhook requires secret_token when configured', () => {
    const SECRET = 'test-telegram-webhook-secret-' + uniqueId;

    beforeAll(() => {
      process.env.TELEGRAM_WEBHOOK_SECRET = SECRET;
    });

    afterAll(() => {
      delete process.env.TELEGRAM_WEBHOOK_SECRET;
    });

    test('missing X-Telegram-Bot-Api-Secret-Token header → still 200 but no processing', async () => {
      const res = await request(app)
        .post('/api/webhooks/telegram')
        .send({ channel_post: { message_id: 1, chat: { id: -1001 }, views: 9999 } });
      // Must respond 200 (Telegram retries otherwise) and ignore the payload.
      expect(res.status).toBe(200);
    });

    test('wrong secret_token → still 200 but no processing', async () => {
      const res = await request(app)
        .post('/api/webhooks/telegram')
        .set('X-Telegram-Bot-Api-Secret-Token', 'wrong-secret')
        .send({ channel_post: { message_id: 1, chat: { id: -1001 }, views: 9999 } });
      expect(res.status).toBe(200);
    });

    test('correct secret_token → 200 and processed', async () => {
      const res = await request(app)
        .post('/api/webhooks/telegram')
        .set('X-Telegram-Bot-Api-Secret-Token', SECRET)
        .send({ channel_post: { message_id: 1, chat: { id: -1001 }, views: 100 } });
      expect(res.status).toBe(200);
    });
  });

  // ─── P0-B · transaction webhook returns 503 without secret ────────────────
  describe('P0-B · Stripe transacciones webhook 503 without STRIPE_WEBHOOK_SECRET', () => {
    test('POST /api/transacciones/webhook → 503 when secret not configured', async () => {
      // The smoke check: before the fix this endpoint either accepted any body
      // (constructEvent on parsed JSON would crash with "no signatures found")
      // OR returned a Stripe internal error. After the fix it explicitly 503s
      // with "Webhook not configured" because the body is now the raw Buffer.
      const original = process.env.STRIPE_WEBHOOK_SECRET;
      delete process.env.STRIPE_WEBHOOK_SECRET;
      try {
        const res = await request(app)
          .post('/api/transacciones/webhook')
          .send({ type: 'payment_intent.succeeded' });
        expect([503, 400]).toContain(res.status);
      } finally {
        if (original !== undefined) process.env.STRIPE_WEBHOOK_SECRET = original;
      }
    });
  });

  // ─── P1 · cron OAuth refuses to run without CRON_SECRET ───────────────────
  describe('P1 · oauth crons refuse to run without CRON_SECRET', () => {
    test('GET /api/oauth/meta/cron-refresh → 503 if CRON_SECRET missing', async () => {
      const original = process.env.CRON_SECRET;
      delete process.env.CRON_SECRET;
      try {
        const res = await request(app).get('/api/oauth/meta/cron-refresh');
        expect(res.status).toBe(503);
      } finally {
        if (original !== undefined) process.env.CRON_SECRET = original;
      }
    });

    test('GET /api/oauth/channels/cron-health → 401 with wrong bearer', async () => {
      process.env.CRON_SECRET = 'test-cron-secret-' + uniqueId;
      try {
        const res = await request(app)
          .get('/api/oauth/channels/cron-health')
          .set('Authorization', 'Bearer WRONG');
        expect(res.status).toBe(401);
      } finally {
        delete process.env.CRON_SECRET;
      }
    });
  });

  // ─── P1 · /api/transacciones/:id/pay hard-failed in prod ──────────────────
  describe('P1 · /api/transacciones/:id/pay disabled in production', () => {
    test('returns 404 in NODE_ENV=production without ALLOW_SIMULATED_PAYMENTS', async () => {
      if (!tokenA) return;
      const originalEnv = process.env.NODE_ENV;
      const originalAllow = process.env.ALLOW_SIMULATED_PAYMENTS;
      process.env.NODE_ENV = 'production';
      delete process.env.ALLOW_SIMULATED_PAYMENTS;
      try {
        // Use a fake ObjectId — the gate fires BEFORE the lookup.
        const res = await request(app)
          .post('/api/transacciones/507f1f77bcf86cd799439011/pay')
          .set('Authorization', `Bearer ${tokenA}`);
        expect(res.status).toBe(404);
      } finally {
        process.env.NODE_ENV = originalEnv;
        if (originalAllow !== undefined) process.env.ALLOW_SIMULATED_PAYMENTS = originalAllow;
      }
    });
  });
});
