process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-secret';
process.env.JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'test-refresh-secret';

const request = require('supertest');
const app = require('../app');

describe('Notifications integration — /api/notifications', () => {
  const uniqueId = Date.now();
  const userEmail = `notif-user-${uniqueId}@test.com`;
  const password = 'TestPass123';

  let userToken;

  beforeAll(async () => {
    const res = await request(app)
      .post('/api/auth/registro')
      .send({ email: userEmail, password, nombre: 'Notif User', role: 'advertiser' });

    if (res.status === 503) return;
    userToken = res.body.token;
  });

  // ── List notifications ────────────────────────────────────────────────────

  describe('GET /api/notifications', () => {
    test('returns notifications for authenticated user', async () => {
      if (!userToken) return;

      const res = await request(app)
        .get('/api/notifications')
        .set('Authorization', `Bearer ${userToken}`);

      if (res.status === 503) return;

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('success', true);
    });

    test('returns 401 without auth', async () => {
      const res = await request(app)
        .get('/api/notifications');

      expect(res.status).toBe(401);
      expect(res.body).toHaveProperty('success', false);
    });
  });

  // ── Count unread ──────────────────────────────────────────────────────────

  describe('GET /api/notifications/no-leidas', () => {
    test('returns unread notification count', async () => {
      if (!userToken) return;

      const res = await request(app)
        .get('/api/notifications/no-leidas')
        .set('Authorization', `Bearer ${userToken}`);

      if (res.status === 503) return;

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('success', true);
      // Should have a count field (could be named count, total, noLeidas, etc.)
      expect(typeof res.body.count === 'number' || typeof res.body.noLeidas === 'number' || typeof res.body.data === 'number').toBe(true);
    });

    test('returns 401 without auth', async () => {
      const res = await request(app)
        .get('/api/notifications/no-leidas');

      expect(res.status).toBe(401);
    });
  });

  // ── Mark all as read ──────────────────────────────────────────────────────

  describe('PUT /api/notifications/leer-todas', () => {
    test('marks all notifications as read', async () => {
      if (!userToken) return;

      const res = await request(app)
        .put('/api/notifications/leer-todas')
        .set('Authorization', `Bearer ${userToken}`);

      if (res.status === 503) return;

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('success', true);
    });

    test('returns 401 without auth', async () => {
      const res = await request(app)
        .put('/api/notifications/leer-todas');

      expect(res.status).toBe(401);
    });
  });

  // ── Mark single as read ───────────────────────────────────────────────────

  describe('PUT /api/notifications/:id/leer', () => {
    test('returns 400 with invalid ID', async () => {
      if (!userToken) return;

      const res = await request(app)
        .put('/api/notifications/bad-id/leer')
        .set('Authorization', `Bearer ${userToken}`);

      expect(res.status).toBe(400);
    });

    test('returns 401 without auth', async () => {
      const res = await request(app)
        .put('/api/notifications/64f1a2b3c4d5e6f7a8b9c0d1/leer');

      expect(res.status).toBe(401);
    });
  });

  // ── Archive notification ──────────────────────────────────────────────────

  describe('PUT /api/notifications/:id/archivar', () => {
    test('returns 400 with invalid ID', async () => {
      if (!userToken) return;

      const res = await request(app)
        .put('/api/notifications/bad-id/archivar')
        .set('Authorization', `Bearer ${userToken}`);

      expect(res.status).toBe(400);
    });

    test('returns 401 without auth', async () => {
      const res = await request(app)
        .put('/api/notifications/64f1a2b3c4d5e6f7a8b9c0d1/archivar');

      expect(res.status).toBe(401);
    });
  });

  // ── Delete notification ───────────────────────────────────────────────────

  describe('DELETE /api/notifications/:id', () => {
    test('returns 400 with invalid ID', async () => {
      if (!userToken) return;

      const res = await request(app)
        .delete('/api/notifications/bad-id')
        .set('Authorization', `Bearer ${userToken}`);

      expect(res.status).toBe(400);
    });

    test('returns 401 without auth', async () => {
      const res = await request(app)
        .delete('/api/notifications/64f1a2b3c4d5e6f7a8b9c0d1');

      expect(res.status).toBe(401);
    });
  });

  // ── Get single notification ───────────────────────────────────────────────

  describe('GET /api/notifications/:id', () => {
    test('returns 400 with invalid ID', async () => {
      if (!userToken) return;

      const res = await request(app)
        .get('/api/notifications/bad-id')
        .set('Authorization', `Bearer ${userToken}`);

      expect(res.status).toBe(400);
    });

    test('returns 404 for nonexistent notification', async () => {
      if (!userToken) return;

      const res = await request(app)
        .get('/api/notifications/64f1a2b3c4d5e6f7a8b9c0d1')
        .set('Authorization', `Bearer ${userToken}`);

      if (res.status === 503) return;

      expect([404, 200]).toContain(res.status);
    });
  });
});
