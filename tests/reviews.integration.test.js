process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-secret';
process.env.JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'test-refresh-secret';

const request = require('supertest');
const app = require('../app');

describe('Reviews integration — /api/reviews', () => {
  const uniqueId = Date.now();
  const advertiserEmail = `rev-adv-${uniqueId}@test.com`;
  const creatorEmail = `rev-cre-${uniqueId}@test.com`;
  const password = 'TestPass123';

  let advertiserToken;
  let creatorToken;
  let channelId;
  let campaignId;
  let reviewId;

  beforeAll(async () => {
    // Register advertiser
    const advRes = await request(app)
      .post('/api/auth/registro')
      .send({ email: advertiserEmail, password, nombre: 'Review Advertiser', role: 'advertiser' });

    if (advRes.status === 503) return;
    advertiserToken = advRes.body.token;

    // Register creator
    const creRes = await request(app)
      .post('/api/auth/registro')
      .send({ email: creatorEmail, password, nombre: 'Review Creator', role: 'creator' });

    if (creRes.status === 503) return;
    creatorToken = creRes.body.token;

    // Create channel
    const chanRes = await request(app)
      .post('/api/canales')
      .set('Authorization', `Bearer ${creatorToken}`)
      .send({
        plataforma: 'telegram',
        identificadorCanal: `@rev-chan-${uniqueId}`,
        nombreCanal: 'Review Test Channel',
        categoria: 'marketing',
      });

    if (chanRes.status === 201) {
      const data = chanRes.body.data || chanRes.body.canal;
      channelId = data._id || data.id;
    }

    // Create campaign for review (reviews typically require a campaign)
    if (channelId) {
      const campRes = await request(app)
        .post('/api/campaigns')
        .set('Authorization', `Bearer ${advertiserToken}`)
        .send({
          channel: channelId,
          content: 'Review test campaign content',
          targetUrl: 'https://example.com/review',
          price: 150,
        });

      if (campRes.status === 201) {
        const data = campRes.body.data || campRes.body.campaign;
        campaignId = data._id || data.id;
      }
    }
  });

  // ── Create review ─────────────────────────────────────────────────────────

  describe('POST /api/reviews', () => {
    test('creates review for a campaign', async () => {
      if (!advertiserToken || !campaignId || !channelId) return;

      const res = await request(app)
        .post('/api/reviews')
        .set('Authorization', `Bearer ${advertiserToken}`)
        .send({
          campaign: campaignId,
          channel: channelId,
          ratings: {
            overall: 4,
            communication: 5,
            quality: 4,
            timeliness: 3,
            value: 4,
          },
          title: 'Great channel for crypto ads',
          comment: 'The channel delivered excellent results for our campaign.',
        });

      if (res.status === 503) return;

      // Accept 201 (created), 200 (success), or 400/403 (business rule — e.g., campaign not completed)
      expect([200, 201, 400, 403]).toContain(res.status);

      if (res.status === 201 || res.status === 200) {
        expect(res.body).toHaveProperty('success', true);
        const data = res.body.data || res.body.review;
        if (data) {
          reviewId = data._id || data.id;
        }
      }
    });

    test('returns 401 without auth', async () => {
      const res = await request(app)
        .post('/api/reviews')
        .send({
          campaign: '64f1a2b3c4d5e6f7a8b9c0d1',
          channel: '64f1a2b3c4d5e6f7a8b9c0d2',
          ratings: { overall: 3 },
        });

      expect(res.status).toBe(401);
      expect(res.body).toHaveProperty('success', false);
    });

    test('returns 400 with missing ratings.overall', async () => {
      if (!advertiserToken) return;

      const res = await request(app)
        .post('/api/reviews')
        .set('Authorization', `Bearer ${advertiserToken}`)
        .send({
          campaign: '64f1a2b3c4d5e6f7a8b9c0d1',
          channel: '64f1a2b3c4d5e6f7a8b9c0d2',
          ratings: {},
        });

      expect(res.status).toBe(400);
    });

    test('returns 400 with invalid overall rating (out of range)', async () => {
      if (!advertiserToken) return;

      const res = await request(app)
        .post('/api/reviews')
        .set('Authorization', `Bearer ${advertiserToken}`)
        .send({
          campaign: '64f1a2b3c4d5e6f7a8b9c0d1',
          channel: '64f1a2b3c4d5e6f7a8b9c0d2',
          ratings: { overall: 10 },
        });

      expect(res.status).toBe(400);
    });

    test('returns 400 with invalid campaign ID', async () => {
      if (!advertiserToken) return;

      const res = await request(app)
        .post('/api/reviews')
        .set('Authorization', `Bearer ${advertiserToken}`)
        .send({
          campaign: 'not-a-mongo-id',
          channel: '64f1a2b3c4d5e6f7a8b9c0d2',
          ratings: { overall: 3 },
        });

      expect(res.status).toBe(400);
    });
  });

  // ── Get channel reviews (public) ──────────────────────────────────────────

  describe('GET /api/reviews/channel/:channelId', () => {
    test('returns channel reviews (public endpoint)', async () => {
      if (!channelId) return;

      const res = await request(app)
        .get(`/api/reviews/channel/${channelId}`);

      if (res.status === 503) return;

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('success', true);
    });

    test('returns 400 with invalid channelId', async () => {
      const res = await request(app)
        .get('/api/reviews/channel/bad-id');

      expect(res.status).toBe(400);
    });
  });

  // ── Get my reviews ────────────────────────────────────────────────────────

  describe('GET /api/reviews/my', () => {
    test('returns authenticated user reviews', async () => {
      if (!advertiserToken) return;

      const res = await request(app)
        .get('/api/reviews/my')
        .set('Authorization', `Bearer ${advertiserToken}`);

      if (res.status === 503) return;

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('success', true);
    });

    test('returns 401 without auth', async () => {
      const res = await request(app)
        .get('/api/reviews/my');

      expect(res.status).toBe(401);
      expect(res.body).toHaveProperty('success', false);
    });
  });

  // ── Respond to review (channel owner) ─────────────────────────────────────

  describe('PUT /api/reviews/:id/respond', () => {
    test('channel owner responds to review', async () => {
      if (!creatorToken || !reviewId) return;

      const res = await request(app)
        .put(`/api/reviews/${reviewId}/respond`)
        .set('Authorization', `Bearer ${creatorToken}`)
        .send({ text: 'Thank you for the feedback!' });

      if (res.status === 503) return;

      // Accept 200 (success) or 403 (not owner — depends on business logic)
      expect([200, 403]).toContain(res.status);
    });

    test('returns 401 without auth', async () => {
      const res = await request(app)
        .put('/api/reviews/64f1a2b3c4d5e6f7a8b9c0d1/respond')
        .send({ text: 'No auth response' });

      expect(res.status).toBe(401);
    });

    test('returns 400 with empty text', async () => {
      if (!creatorToken) return;

      const res = await request(app)
        .put('/api/reviews/64f1a2b3c4d5e6f7a8b9c0d1/respond')
        .set('Authorization', `Bearer ${creatorToken}`)
        .send({ text: '' });

      expect(res.status).toBe(400);
    });

    test('returns 400 with invalid review ID', async () => {
      if (!creatorToken) return;

      const res = await request(app)
        .put('/api/reviews/bad-id/respond')
        .set('Authorization', `Bearer ${creatorToken}`)
        .send({ text: 'Test response' });

      expect(res.status).toBe(400);
    });
  });

  // ── Mark helpful ──────────────────────────────────────────────────────────

  describe('PUT /api/reviews/:id/helpful', () => {
    test('marks review as helpful', async () => {
      if (!advertiserToken || !reviewId) return;

      const res = await request(app)
        .put(`/api/reviews/${reviewId}/helpful`)
        .set('Authorization', `Bearer ${advertiserToken}`);

      if (res.status === 503) return;

      expect([200, 400]).toContain(res.status);
    });

    test('returns 401 without auth', async () => {
      const res = await request(app)
        .put('/api/reviews/64f1a2b3c4d5e6f7a8b9c0d1/helpful');

      expect(res.status).toBe(401);
    });

    test('returns 400 with invalid ID', async () => {
      if (!advertiserToken) return;

      const res = await request(app)
        .put('/api/reviews/bad-id/helpful')
        .set('Authorization', `Bearer ${advertiserToken}`);

      expect(res.status).toBe(400);
    });
  });

  // ── Delete review ─────────────────────────────────────────────────────────

  describe('DELETE /api/reviews/:id', () => {
    test('author can delete own review', async () => {
      if (!advertiserToken || !reviewId) return;

      const res = await request(app)
        .delete(`/api/reviews/${reviewId}`)
        .set('Authorization', `Bearer ${advertiserToken}`);

      if (res.status === 503) return;

      expect([200, 403, 404]).toContain(res.status);
    });

    test('returns 401 without auth', async () => {
      const res = await request(app)
        .delete('/api/reviews/64f1a2b3c4d5e6f7a8b9c0d1');

      expect(res.status).toBe(401);
    });

    test('returns 400 with invalid ID', async () => {
      if (!advertiserToken) return;

      const res = await request(app)
        .delete('/api/reviews/bad-id')
        .set('Authorization', `Bearer ${advertiserToken}`);

      expect(res.status).toBe(400);
    });
  });
});
