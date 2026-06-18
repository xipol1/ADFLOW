process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-secret';
process.env.JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'test-refresh-secret';

const request = require('supertest');
const app = require('../app');
const legalConsent = require('../services/legalConsent');

// Required clickwrap consents per role, taken from the legal manifest. Sending
// these mirrors a real signup; registration now rejects payloads that don't
// cover the role's required documents at the current version.
const creatorConsents = legalConsent.requiredDocsForRole('creator').map((d) => ({ slug: d.slug, version: d.version }));
const advertiserConsents = legalConsent.requiredDocsForRole('advertiser').map((d) => ({ slug: d.slug, version: d.version }));

describe('Auth integration — /api/auth', () => {
  const uniqueId = Date.now();
  const creatorEmail = `auth-creator-${uniqueId}@test.com`;
  const advertiserEmail = `auth-advertiser-${uniqueId}@test.com`;
  const password = 'TestPass123';

  let creatorToken;
  let creatorRefreshToken;

  // ── Registration ──────────────────────────────────────────────────────────

  describe('POST /api/auth/registro', () => {
    test('registers a new creator (no tokens — verification required)', async () => {
      const res = await request(app)
        .post('/api/auth/registro')
        .send({
          email: creatorEmail,
          password,
          nombre: 'Auth Creator',
          role: 'creator',
          consents: creatorConsents,
        });

      // Accept 201 (created) or 503 (no DB — CI environments)
      if (res.status === 503) {
        console.warn('SKIP: DB not available');
        return;
      }

      expect(res.status).toBe(201);
      expect(res.body).toHaveProperty('success', true);
      // Registration must NOT log the user in — tokens are issued only after
      // email verification. See verificarEmail.
      expect(res.body).not.toHaveProperty('token');
      expect(res.body).not.toHaveProperty('refreshToken');
      expect(res.body).toHaveProperty('emailVerificationRequired', true);
      expect(res.body.user).toHaveProperty('email', creatorEmail);
      expect(res.body.user).toHaveProperty('emailVerificado', false);
      // Having accepted every required document, the gate must not fire.
      expect(res.body.user).toHaveProperty('requiresTermsAcceptance', false);
    });

    test('rejects registration that does not accept the required documents', async () => {
      const res = await request(app)
        .post('/api/auth/registro')
        .send({
          email: `auth-noconsent-${uniqueId}@test.com`,
          password,
          nombre: 'No Consent',
          role: 'creator',
          // Only one of the three required creator docs → must be rejected.
          consents: creatorConsents.slice(0, 1),
        });

      if (res.status === 503) return;

      expect(res.status).toBe(400);
      expect(res.body).toHaveProperty('success', false);
      expect(Array.isArray(res.body.missingConsents)).toBe(true);
      expect(res.body.missingConsents.length).toBeGreaterThan(0);
    });

    test('registers a new advertiser (no tokens — verification required)', async () => {
      const res = await request(app)
        .post('/api/auth/registro')
        .send({
          email: advertiserEmail,
          password,
          nombre: 'Auth Advertiser',
          role: 'advertiser',
          consents: advertiserConsents,
        });

      if (res.status === 503) return; // no DB

      expect(res.status).toBe(201);
      expect(res.body).toHaveProperty('success', true);
      expect(res.body).not.toHaveProperty('token');
      expect(res.body.user).toHaveProperty('email', advertiserEmail);
      expect(res.body.user).toHaveProperty('requiresTermsAcceptance', false);
    });

    test('duplicate email returns 400', async () => {
      const res = await request(app)
        .post('/api/auth/registro')
        .send({
          email: creatorEmail,
          password,
          nombre: 'Dup User',
          role: 'creator',
        });

      if (res.status === 503) return; // no DB

      expect(res.status).toBe(400);
      expect(res.body).toHaveProperty('success', false);
    });

    test('missing email returns 400', async () => {
      const res = await request(app)
        .post('/api/auth/registro')
        .send({
          password,
          nombre: 'No Email',
        });

      expect(res.status).toBe(400);
      expect(res.body).toHaveProperty('success', false);
    });

    test('short password returns 400', async () => {
      const res = await request(app)
        .post('/api/auth/registro')
        .send({
          email: `short-pwd-${uniqueId}@test.com`,
          password: 'ab',
          nombre: 'Short Pwd',
        });

      expect(res.status).toBe(400);
      expect(res.body).toHaveProperty('success', false);
    });

    test('password without uppercase returns 400', async () => {
      const res = await request(app)
        .post('/api/auth/registro')
        .send({
          email: `nouppercase-${uniqueId}@test.com`,
          password: 'alllowercase1',
          nombre: 'No Upper',
        });

      expect(res.status).toBe(400);
      expect(res.body).toHaveProperty('success', false);
    });
  });

  // ── Login ─────────────────────────────────────────────────────────────────

  describe('POST /api/auth/login', () => {
    test('valid credentials returns token and user', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: creatorEmail, password });

      if (res.status === 503) return;

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('success', true);
      expect(res.body).toHaveProperty('token');
      expect(res.body).toHaveProperty('refreshToken');
      expect(res.body.user).toHaveProperty('email', creatorEmail);

      // Update token for later tests
      creatorToken = res.body.token;
      creatorRefreshToken = res.body.refreshToken;
    });

    test('wrong password returns 401', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: creatorEmail, password: 'WrongPass999' });

      if (res.status === 503) return;

      expect(res.status).toBe(401);
      expect(res.body).toHaveProperty('success', false);
    });

    test('non-existent email returns 401', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: 'nonexist-xyz@test.com', password });

      if (res.status === 503) return;

      expect(res.status).toBe(401);
      expect(res.body).toHaveProperty('success', false);
    });

    test('missing password returns 400', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: creatorEmail });

      expect(res.status).toBe(400);
      expect(res.body).toHaveProperty('success', false);
    });
  });

  // ── Profile ───────────────────────────────────────────────────────────────

  describe('GET /api/auth/perfil', () => {
    test('with valid token returns user profile', async () => {
      if (!creatorToken) return; // no DB

      const res = await request(app)
        .get('/api/auth/perfil')
        .set('Authorization', `Bearer ${creatorToken}`);

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('success', true);
      expect(res.body.user).toHaveProperty('email', creatorEmail);
    });

    test('without token returns 401', async () => {
      const res = await request(app)
        .get('/api/auth/perfil');

      expect(res.status).toBe(401);
      expect(res.body).toHaveProperty('success', false);
    });

    test('with invalid token returns 401', async () => {
      const res = await request(app)
        .get('/api/auth/perfil')
        .set('Authorization', 'Bearer invalid-token-value');

      expect(res.status).toBe(401);
      expect(res.body).toHaveProperty('success', false);
    });
  });

  // ── Refresh Token ─────────────────────────────────────────────────────────

  describe('POST /api/auth/refresh-token', () => {
    test('with valid refresh token returns new access token', async () => {
      if (!creatorRefreshToken) return; // no DB

      const res = await request(app)
        .post('/api/auth/refresh-token')
        .send({ refreshToken: creatorRefreshToken });

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('success', true);
      expect(res.body).toHaveProperty('token');
    });

    test('with invalid refresh token returns 401', async () => {
      const res = await request(app)
        .post('/api/auth/refresh-token')
        .send({ refreshToken: 'bogus-refresh-token' });

      // Could be 400 (validation) or 401 (auth)
      expect([400, 401]).toContain(res.status);
      expect(res.body).toHaveProperty('success', false);
    });

    test('missing refresh token returns 400', async () => {
      const res = await request(app)
        .post('/api/auth/refresh-token')
        .send({});

      expect(res.status).toBe(400);
      expect(res.body).toHaveProperty('success', false);
    });
  });

  // ── Change Password ───────────────────────────────────────────────────────

  describe('POST /api/auth/cambiar-password', () => {
    test('changes password successfully', async () => {
      if (!creatorToken) return; // no DB

      const newPassword = 'NewPass456';
      const res = await request(app)
        .post('/api/auth/cambiar-password')
        .set('Authorization', `Bearer ${creatorToken}`)
        .send({
          passwordActual: password,
          passwordNueva: newPassword,
        });

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('success', true);

      // Verify we can login with the new password
      const loginRes = await request(app)
        .post('/api/auth/login')
        .send({ email: creatorEmail, password: newPassword });

      if (loginRes.status !== 503) {
        expect(loginRes.status).toBe(200);
        expect(loginRes.body).toHaveProperty('token');
        creatorToken = loginRes.body.token;
      }
    });

    test('wrong current password returns 401', async () => {
      if (!creatorToken) return;

      const res = await request(app)
        .post('/api/auth/cambiar-password')
        .set('Authorization', `Bearer ${creatorToken}`)
        .send({
          passwordActual: 'WrongCurrent999',
          passwordNueva: 'AnotherPass789',
        });

      expect(res.status).toBe(401);
      expect(res.body).toHaveProperty('success', false);
    });

    test('without auth returns 401', async () => {
      const res = await request(app)
        .post('/api/auth/cambiar-password')
        .send({
          passwordActual: password,
          passwordNueva: 'AnotherPass789',
        });

      expect(res.status).toBe(401);
      expect(res.body).toHaveProperty('success', false);
    });
  });

  // ── Verify Token Endpoint ─────────────────────────────────────────────────

  describe('GET /api/auth/verificar-token', () => {
    test('valid token returns success', async () => {
      if (!creatorToken) return;

      const res = await request(app)
        .get('/api/auth/verificar-token')
        .set('Authorization', `Bearer ${creatorToken}`);

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('success', true);
    });
  });

  // ── Terms acceptance gate (legacy / Google-OAuth accounts) ─────────────────

  describe('POST /api/auth/accept-terms', () => {
    const legacyEmail = `auth-legacy-${uniqueId}@test.com`;

    test('flags a user missing consents and clears the flag once accepted', async () => {
      // Register normally (with consents), then simulate a legacy/OAuth account
      // by clearing its consents directly in the DB.
      const reg = await request(app)
        .post('/api/auth/registro')
        .send({ email: legacyEmail, password, nombre: 'Legacy User', role: 'advertiser', consents: advertiserConsents });
      if (reg.status === 503) return; // no DB
      expect(reg.status).toBe(201);

      const Usuario = require('../models/Usuario');
      await Usuario.findOneAndUpdate({ email: legacyEmail }, { emailVerificado: true, consentimientos: [] });

      const login = await request(app).post('/api/auth/login').send({ email: legacyEmail, password });
      expect(login.status).toBe(200);
      // Derived flag must report the missing consent.
      expect(login.body.user).toHaveProperty('requiresTermsAcceptance', true);
      const token = login.body.token;

      // An incomplete payload is rejected.
      const bad = await request(app)
        .post('/api/auth/accept-terms')
        .set('Authorization', `Bearer ${token}`)
        .send({ consents: advertiserConsents.slice(0, 1) });
      expect(bad.status).toBe(400);

      // Full payload records the consents and clears the gate.
      const ok = await request(app)
        .post('/api/auth/accept-terms')
        .set('Authorization', `Bearer ${token}`)
        .send({ consents: advertiserConsents });
      expect(ok.status).toBe(200);
      expect(ok.body.user).toHaveProperty('requiresTermsAcceptance', false);
    });

    test('without auth returns 401', async () => {
      const res = await request(app)
        .post('/api/auth/accept-terms')
        .send({ consents: advertiserConsents });
      expect(res.status).toBe(401);
    });
  });
});
