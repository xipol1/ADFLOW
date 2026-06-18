/**
 * Anti-regression tests for the onboarding IDOR fixes (PR #107 follow-up).
 *
 * Two unauthenticated-write holes in controllers/onboardingController.js:
 *   1. instagramCallback — the OAuth state was unsigned base64, so anyone
 *      could forge a state pointing at another user's canalId and overwrite
 *      botConfig.instagram + estado:'activo'. Now the state is HMAC-signed
 *      (userId + canalId + expiry) and the callback verifies signature and
 *      canal ownership before touching the DB.
 *   2. whatsappVerify — canalId comes from the body, so a user with a
 *      legitimate verification of their own could pass ANOTHER user's
 *      canalId and overwrite that canal. Now the canal must belong to
 *      req.usuario before the verification completes.
 */
process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-secret';
process.env.JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'test-refresh-secret';

const request = require('supertest');
const mongoose = require('mongoose');
const app = require('../app');
const legalConsent = require('../services/legalConsent');

describe('Onboarding IDOR — ownership guards', () => {
  const uniqueId = Date.now();
  const userAEmail = `onb-idor-a-${uniqueId}@test.com`;
  const userBEmail = `onb-idor-b-${uniqueId}@test.com`;
  const password = 'TestPass123';

  let tokenA;
  let tokenB;
  let userAId;
  let userBId;
  let canalAId; // canal owned by user A — the IDOR target

  const registerAndLogin = async (email) => {
    // nombre must match /^[a-zA-Z...\s]+$/ — no digits or symbols, or registro 400s.
    // Registration now enforces clickwrap acceptance of the role's required legal
    // documents, so send the creator consents at the current manifest version.
    const consents = legalConsent
      .requiredDocsForRole('creator')
      .map((d) => ({ slug: d.slug, version: d.version }));
    const reg = await request(app).post('/api/auth/registro').send({ email, password, nombre: 'Onboarding Tester', role: 'creator', consents });
    if (reg.status === 503) return { token: null, id: null };
    try {
      const Usuario = mongoose.models.Usuario || require('../models/Usuario');
      await Usuario.findOneAndUpdate({ email }, { emailVerificado: true });
    } catch (e) { /* if DB not available, login will 503 anyway */ }
    const login = await request(app).post('/api/auth/login').send({ email, password });
    if (login.status === 503 || !login.body?.token) return { token: null, id: null };
    return { token: login.body.token, id: login.body.user?.id || login.body.user?._id };
  };

  const createCanal = async (token, plataforma, identificadorCanal) => {
    const res = await request(app)
      .post('/api/canales')
      .set('Authorization', `Bearer ${token}`)
      .send({ plataforma, identificadorCanal, nombreCanal: 'Canal ' + identificadorCanal });
    if (res.status !== 201) return null;
    return res.body.data?._id || res.body.data?.id || null;
  };

  const fetchCanal = async (id) => {
    const Canal = mongoose.models.Canal || require('../models/Canal');
    return Canal.findById(id).lean();
  };

  beforeAll(async () => {
    const a = await registerAndLogin(userAEmail);
    const b = await registerAndLogin(userBEmail);
    tokenA = a.token; userAId = a.id;
    tokenB = b.token; userBId = b.id;
    if (tokenA) canalAId = await createCanal(tokenA, 'whatsapp', `onb-idor-target-${uniqueId}`);
  });

  // Guard against vacuous passes: every test below early-returns when setup
  // failed, so this test is the canary that setup actually worked.
  test('setup: both users registered and target canal created', () => {
    expect(tokenA).toBeTruthy();
    expect(tokenB).toBeTruthy();
    expect(canalAId).toBeTruthy();
  });

  // ─── instagramCallback · forged/unsigned state must never write ────────────
  describe('instagramCallback rejects unsigned and foreign states', () => {
    const APP_ID = 'test-ig-app-id';
    let originalAppId;

    beforeAll(() => {
      originalAppId = process.env.INSTAGRAM_APP_ID;
      process.env.INSTAGRAM_APP_ID = APP_ID;
    });

    afterAll(() => {
      if (originalAppId !== undefined) process.env.INSTAGRAM_APP_ID = originalAppId;
      else delete process.env.INSTAGRAM_APP_ID;
    });

    const getSignedState = async (token, canalId) => {
      const res = await request(app)
        .get(`/api/onboarding/instagram/auth-url?canalId=${canalId}`)
        .set('Authorization', `Bearer ${token}`);
      if (res.status !== 200 || !res.body?.authUrl) return null;
      return new URL(res.body.authUrl).searchParams.get('state');
    };

    test('legacy unsigned base64 state (pre-fix forgery) → redirect with error, canal untouched', async () => {
      if (!canalAId) return;
      const forged = Buffer.from(JSON.stringify({ canalId: canalAId, source: 'creator' })).toString('base64');
      const res = await request(app)
        .get(`/api/onboarding/instagram/callback?code=fake-code&state=${encodeURIComponent(forged)}`);

      expect(res.status).toBe(302);
      expect(res.headers.location).toContain('error=instagram_state_invalid');

      const canal = await fetchCanal(canalAId);
      expect(canal.estado).not.toBe('activo');
      expect(canal.botConfig?.instagram?.accessToken).toBeUndefined();
    });

    test('signed state with tampered canalId → signature mismatch, canal untouched', async () => {
      if (!tokenB || !canalAId) return;
      // B gets a state legitimately signed for one of B's own canals…
      const canalBId = await createCanal(tokenB, 'instagram', `onb-idor-b-own-${uniqueId}`);
      if (!canalBId) return;
      const state = await getSignedState(tokenB, canalBId);
      if (!state) return;

      // …then swaps the payload to point at A's canal, keeping the signature.
      const [encoded, sig] = state.split('.');
      const payload = JSON.parse(Buffer.from(encoded, 'base64url').toString());
      payload.canalId = canalAId;
      const tampered = Buffer.from(JSON.stringify(payload)).toString('base64url') + '.' + sig;

      const res = await request(app)
        .get(`/api/onboarding/instagram/callback?code=fake-code&state=${encodeURIComponent(tampered)}`);

      expect(res.status).toBe(302);
      expect(res.headers.location).toContain('error=instagram_state_invalid');

      const canal = await fetchCanal(canalAId);
      expect(canal.estado).not.toBe('activo');
    });

    test('validly signed state for a canal the requester does not own → forbidden, canal untouched', async () => {
      if (!tokenB || !canalAId) return;
      // auth-url does not itself gate on ownership: B can request a state for
      // A's canal. The callback's ownership check (state.userId vs propietario)
      // is what must stop the write.
      const state = await getSignedState(tokenB, canalAId);
      if (!state) return;

      const res = await request(app)
        .get(`/api/onboarding/instagram/callback?code=fake-code&state=${encodeURIComponent(state)}`);

      expect(res.status).toBe(302);
      expect(res.headers.location).toContain('error=instagram_forbidden');

      const canal = await fetchCanal(canalAId);
      expect(canal.estado).not.toBe('activo');
      expect(canal.botConfig?.instagram?.accessToken).toBeUndefined();
    });

    test('missing state with code → 400, never writes', async () => {
      const res = await request(app).get('/api/onboarding/instagram/callback?code=fake-code');
      expect(res.status).toBe(400);
    });
  });

  // ─── whatsappVerify · body canalId must belong to the requester ────────────
  describe('whatsappVerify rejects a canalId owned by another user', () => {
    const createVerification = async (usuarioId, suffix) => {
      const WhatsAppVerification = mongoose.models.WhatsAppVerification || require('../models/WhatsAppVerification');
      const doc = await WhatsAppVerification.create({
        usuarioId,
        channelId: `wa-channel-${suffix}-${uniqueId}`,
        creatorPhone: '+34600000001',
        codigoOTP: '123456',
        codigoCanal: 'CHANNELAD-TEST',
        fase: 'otp_verificado',
        otpVerificadoEn: new Date(),
      });
      return doc._id.toString();
    };

    test('user B with own legit verification cannot activate user A canal (403)', async () => {
      if (!tokenB || !userBId || !canalAId) return;
      const verificacionId = await createVerification(userBId, 'b');

      const res = await request(app)
        .post('/api/onboarding/whatsapp/verificar')
        .set('Authorization', `Bearer ${tokenB}`)
        .send({ verificacionId, canalId: canalAId, seguidoresDeclarados: 99999 });

      expect(res.status).toBe(403);

      // Canal A untouched
      const canal = await fetchCanal(canalAId);
      expect(canal.estado).not.toBe('activo');
      expect(canal.botConfig?.whatsapp?.adminAccess).not.toBe(true);

      // And the verification must NOT have been consumed by the failed attempt
      const WhatsAppVerification = mongoose.models.WhatsAppVerification || require('../models/WhatsAppVerification');
      const verification = await WhatsAppVerification.findById(verificacionId).lean();
      expect(verification.fase).toBe('otp_verificado');
    });

    test('nonexistent canalId → 404', async () => {
      if (!tokenB || !userBId) return;
      const verificacionId = await createVerification(userBId, 'b404');
      const res = await request(app)
        .post('/api/onboarding/whatsapp/verificar')
        .set('Authorization', `Bearer ${tokenB}`)
        .send({ verificacionId, canalId: new mongoose.Types.ObjectId().toString() });
      expect(res.status).toBe(404);
    });

    test('owner can still verify their own canal (200, canal activo)', async () => {
      if (!tokenA || !userAId) return;
      const canalA2Id = await createCanal(tokenA, 'whatsapp', `onb-idor-own-${uniqueId}`);
      if (!canalA2Id) return;
      const verificacionId = await createVerification(userAId, 'a');

      const res = await request(app)
        .post('/api/onboarding/whatsapp/verificar')
        .set('Authorization', `Bearer ${tokenA}`)
        .send({ verificacionId, canalId: canalA2Id, seguidoresDeclarados: 1000 });

      expect(res.status).toBe(200);
      expect(res.body.tier).toBe('oro');

      const canal = await fetchCanal(canalA2Id);
      expect(canal.estado).toBe('activo');
      expect(canal.botConfig?.whatsapp?.adminAccess).toBe(true);
    });
  });
});
