process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-secret';
process.env.JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'test-refresh-secret';

const request = require('supertest');
const app = require('../app');

describe('Channels integration', () => {
  const uniqueId = Date.now();
  const creatorEmail = `chan-creator-${uniqueId}@test.com`;
  const otherEmail = `chan-other-${uniqueId}@test.com`;
  const password = 'TestPass123';

  let creatorToken;
  let otherToken;
  let channelId;

  beforeAll(async () => {
    // Register creator
    const creatorRes = await request(app)
      .post('/api/auth/registro')
      .send({ email: creatorEmail, password, nombre: 'Chan Creator', role: 'creator' });

    if (creatorRes.status === 503) return;
    creatorToken = creatorRes.body.token;

    // Register another user
    const otherRes = await request(app)
      .post('/api/auth/registro')
      .send({ email: otherEmail, password, nombre: 'Chan Other', role: 'creator' });

    if (otherRes.status !== 503) {
      otherToken = otherRes.body.token;
    }
  });

  // ── Public channels list ──────────────────────────────────────────────────

  describe('GET /api/channels (public)', () => {
    test('returns list of channels', async () => {
      const res = await request(app)
        .get('/api/channels');

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('success', true);
      expect(Array.isArray(res.body.data)).toBe(true);
    });

    test('supports pagination params', async () => {
      const res = await request(app)
        .get('/api/channels?pagina=1&limite=5');

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('success', true);
    });

    test('supports platform filter', async () => {
      const res = await request(app)
        .get('/api/channels?plataforma=telegram');

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('success', true);
    });
  });

  // ── Create channel ────────────────────────────────────────────────────────

  describe('POST /api/canales', () => {
    test('creates channel as authenticated creator', async () => {
      if (!creatorToken) return;

      const res = await request(app)
        .post('/api/canales')
        .set('Authorization', `Bearer ${creatorToken}`)
        .send({
          plataforma: 'telegram',
          identificadorCanal: `@test-channel-${uniqueId}`,
          nombreCanal: 'Test Channel',
          categoria: 'crypto',
          descripcion: 'A test channel for integration tests',
        });

      if (res.status === 503) return;

      expect(res.status).toBe(201);
      expect(res.body).toHaveProperty('success', true);
      expect(res.body.data || res.body.canal).toBeTruthy();

      const data = res.body.data || res.body.canal;
      channelId = data._id || data.id;
      expect(channelId).toBeTruthy();
    });

    test('returns 401 without auth', async () => {
      const res = await request(app)
        .post('/api/canales')
        .send({
          plataforma: 'telegram',
          identificadorCanal: '@no-auth-channel',
          nombreCanal: 'No Auth',
        });

      expect(res.status).toBe(401);
      expect(res.body).toHaveProperty('success', false);
    });

    test('returns 400 with missing required fields', async () => {
      if (!creatorToken) return;

      const res = await request(app)
        .post('/api/canales')
        .set('Authorization', `Bearer ${creatorToken}`)
        .send({
          // Missing plataforma and identificadorCanal
          nombreCanal: 'Incomplete',
        });

      expect(res.status).toBe(400);
      expect(res.body).toHaveProperty('success', false);
    });

    test('returns 400 with empty plataforma', async () => {
      if (!creatorToken) return;

      const res = await request(app)
        .post('/api/canales')
        .set('Authorization', `Bearer ${creatorToken}`)
        .send({
          plataforma: '',
          identificadorCanal: '@missing-platform',
        });

      expect(res.status).toBe(400);
    });
  });

  // ── Get own channels ──────────────────────────────────────────────────────

  describe('GET /api/canales', () => {
    test('returns creator own channels list', async () => {
      if (!creatorToken) return;

      const res = await request(app)
        .get('/api/canales')
        .set('Authorization', `Bearer ${creatorToken}`);

      if (res.status === 503) return;

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('success', true);
    });

    test('returns 401 without auth', async () => {
      const res = await request(app)
        .get('/api/canales');

      expect(res.status).toBe(401);
      expect(res.body).toHaveProperty('success', false);
    });
  });

  // ── Update channel ────────────────────────────────────────────────────────

  describe('PUT /api/canales/:id', () => {
    test('owner can update channel', async () => {
      if (!creatorToken || !channelId) return;

      const res = await request(app)
        .put(`/api/canales/${channelId}`)
        .set('Authorization', `Bearer ${creatorToken}`)
        .send({
          nombreCanal: 'Updated Channel Name',
          descripcion: 'Updated description',
        });

      if (res.status === 503) return;

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('success', true);
    });

    test('non-owner gets 403', async () => {
      if (!otherToken || !channelId) return;

      const res = await request(app)
        .put(`/api/canales/${channelId}`)
        .set('Authorization', `Bearer ${otherToken}`)
        .send({
          nombreCanal: 'Hijacked Name',
        });

      if (res.status === 503) return;

      // Expect 403 (forbidden) or 404 (channel not found for this user)
      expect([403, 404]).toContain(res.status);
      expect(res.body).toHaveProperty('success', false);
    });

    test('invalid id returns 400', async () => {
      if (!creatorToken) return;

      const res = await request(app)
        .put('/api/canales/not-a-valid-id')
        .set('Authorization', `Bearer ${creatorToken}`)
        .send({ nombreCanal: 'Test' });

      expect(res.status).toBe(400);
    });
  });

  // ── Delete channel ────────────────────────────────────────────────────────

  describe('DELETE /api/canales/:id', () => {
    test('non-owner cannot delete', async () => {
      if (!otherToken || !channelId) return;

      const res = await request(app)
        .delete(`/api/canales/${channelId}`)
        .set('Authorization', `Bearer ${otherToken}`);

      if (res.status === 503) return;

      expect([403, 404]).toContain(res.status);
    });

    test('owner can delete channel', async () => {
      if (!creatorToken || !channelId) return;

      const res = await request(app)
        .delete(`/api/canales/${channelId}`)
        .set('Authorization', `Bearer ${creatorToken}`);

      if (res.status === 503) return;

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('success', true);
    });

    test('returns 401 without auth', async () => {
      const res = await request(app)
        .delete('/api/canales/64f1a2b3c4d5e6f7a8b9c0d1');

      expect(res.status).toBe(401);
    });
  });

  // ── Public channel by ID ──────────────────────────────────────────────────

  describe('GET /api/channels/:id', () => {
    test('returns channel detail by ID', async () => {
      // Use the demo channels endpoint first to get a valid ID
      const listRes = await request(app).get('/api/channels');
      if (listRes.body.data && listRes.body.data.length > 0) {
        const firstId = listRes.body.data[0]._id || listRes.body.data[0].id;
        if (firstId) {
          const res = await request(app).get(`/api/channels/${firstId}`);
          expect([200, 404]).toContain(res.status);
        }
      }
    });
  });
});
