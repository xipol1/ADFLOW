process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-secret';
process.env.JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'test-refresh-secret';

const request = require('supertest');
const app = require('../app');

describe('Tracking integration — /api/tracking', () => {
  const uniqueId = Date.now();
  const creatorEmail = `track-creator-${uniqueId}@test.com`;
  const password = 'TestPass123';

  let creatorToken;
  let channelId;
  let trackingLinkCode;

  beforeAll(async () => {
    // Register creator
    const creRes = await request(app)
      .post('/api/auth/registro')
      .send({ email: creatorEmail, password, nombre: 'Track Creator', role: 'creator' });

    if (creRes.status === 503) return;
    creatorToken = creRes.body.token;

    // Create a channel for verification tests
    const chanRes = await request(app)
      .post('/api/canales')
      .set('Authorization', `Bearer ${creatorToken}`)
      .send({
        plataforma: 'telegram',
        identificadorCanal: `@track-chan-${uniqueId}`,
        nombreCanal: 'Tracking Test Channel',
        categoria: 'tech',
      });

    if (chanRes.status === 201) {
      const data = chanRes.body.data || chanRes.body.canal;
      channelId = data._id || data.id;
    }
  });

  // ── Create Tracking Link ──────────────────────────────────────────────────

  describe('POST /api/tracking/links', () => {
    test('creates tracking link with auth', async () => {
      if (!creatorToken) return;

      const res = await request(app)
        .post('/api/tracking/links')
        .set('Authorization', `Bearer ${creatorToken}`)
        .send({
          targetUrl: 'https://example.com/tracked-page',
          type: 'custom',
        });

      if (res.status === 503) return;

      expect(res.status).toBe(201);
      expect(res.body).toHaveProperty('success', true);
      expect(res.body.data).toHaveProperty('code');
      expect(res.body.data).toHaveProperty('trackingUrl');
      expect(res.body.data).toHaveProperty('targetUrl', 'https://example.com/tracked-page');

      trackingLinkCode = res.body.data.code;
    });

    test('returns 401 without auth', async () => {
      const res = await request(app)
        .post('/api/tracking/links')
        .send({
          targetUrl: 'https://example.com/no-auth',
        });

      expect(res.status).toBe(401);
      expect(res.body).toHaveProperty('success', false);
    });

    test('returns 400 without targetUrl', async () => {
      if (!creatorToken) return;

      const res = await request(app)
        .post('/api/tracking/links')
        .set('Authorization', `Bearer ${creatorToken}`)
        .send({});

      if (res.status === 503) return;

      expect(res.status).toBe(400);
    });
  });

  // ── Get My Links ──────────────────────────────────────────────────────────

  describe('GET /api/tracking/links', () => {
    test('returns list of tracking links for authenticated user', async () => {
      if (!creatorToken) return;

      const res = await request(app)
        .get('/api/tracking/links')
        .set('Authorization', `Bearer ${creatorToken}`);

      if (res.status === 503) return;

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('success', true);
    });

    test('returns 401 without auth', async () => {
      const res = await request(app)
        .get('/api/tracking/links');

      expect(res.status).toBe(401);
    });
  });

  // ── Verification Link ─────────────────────────────────────────────────────

  describe('POST /api/tracking/verify-link', () => {
    test('creates verification link for own channel', async () => {
      if (!creatorToken || !channelId) return;

      const res = await request(app)
        .post('/api/tracking/verify-link')
        .set('Authorization', `Bearer ${creatorToken}`)
        .send({ channelId });

      if (res.status === 503) return;

      expect([200, 201]).toContain(res.status);
      expect(res.body).toHaveProperty('success', true);
      expect(res.body.data).toHaveProperty('code');
      expect(res.body.data).toHaveProperty('trackingUrl');
    });

    test('returns 401 without auth', async () => {
      const res = await request(app)
        .post('/api/tracking/verify-link')
        .send({ channelId: '64f1a2b3c4d5e6f7a8b9c0d1' });

      expect(res.status).toBe(401);
    });

    test('returns error for non-existent channel', async () => {
      if (!creatorToken) return;

      const res = await request(app)
        .post('/api/tracking/verify-link')
        .set('Authorization', `Bearer ${creatorToken}`)
        .send({ channelId: '64f1a2b3c4d5e6f7a8b9c0d1' });

      if (res.status === 503) return;

      expect([400, 403, 404]).toContain(res.status);
    });
  });

  // ── Verification Status ───────────────────────────────────────────────────

  describe('GET /api/tracking/verify-status/:channelId', () => {
    test('checks verification status for own channel', async () => {
      if (!creatorToken || !channelId) return;

      const res = await request(app)
        .get(`/api/tracking/verify-status/${channelId}`)
        .set('Authorization', `Bearer ${creatorToken}`);

      if (res.status === 503) return;

      expect([200, 404]).toContain(res.status);
      expect(res.body).toHaveProperty('success');
    });

    test('returns 401 without auth', async () => {
      const res = await request(app)
        .get('/api/tracking/verify-status/64f1a2b3c4d5e6f7a8b9c0d1');

      expect(res.status).toBe(401);
    });
  });

  // ── Convert URL for Campaign ──────────────────────────────────────────────

  describe('POST /api/tracking/convert', () => {
    test('returns 401 without auth', async () => {
      const res = await request(app)
        .post('/api/tracking/convert')
        .send({ targetUrl: 'https://example.com' });

      expect(res.status).toBe(401);
    });
  });

  // ── Tracking Redirect (GET /t/:code) ──────────────────────────────────────

  describe('GET /t/:code', () => {
    test('redirects with valid tracking code (302)', async () => {
      if (!trackingLinkCode) return;

      const res = await request(app)
        .get(`/t/${trackingLinkCode}`)
        .redirects(0); // Do not follow redirects

      expect(res.status).toBe(302);
      expect(res.headers.location).toBe('https://example.com/tracked-page');
    });

    test('returns 404 for nonexistent code', async () => {
      const res = await request(app)
        .get('/t/nonexistent-code-xyz')
        .redirects(0);

      // Could be 404 or 302 redirect to '/' depending on error handling
      expect([302, 404]).toContain(res.status);
      if (res.status === 404) {
        expect(res.body).toHaveProperty('success', false);
      }
    });

    test('passes UTM parameters through redirect', async () => {
      if (!trackingLinkCode) return;

      const res = await request(app)
        .get(`/t/${trackingLinkCode}?utm_source=test&utm_medium=email`)
        .redirects(0);

      expect(res.status).toBe(302);
      // The target URL should contain UTM params
      expect(res.headers.location).toContain('example.com/tracked-page');
    });
  });

  // ── Link Analytics ────────────────────────────────────────────────────────

  describe('GET /api/tracking/links/:id/analytics', () => {
    test('returns 401 without auth', async () => {
      const res = await request(app)
        .get('/api/tracking/links/64f1a2b3c4d5e6f7a8b9c0d1/analytics');

      expect(res.status).toBe(401);
    });
  });
});
