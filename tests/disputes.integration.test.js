process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-secret';
process.env.JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'test-refresh-secret';

const request = require('supertest');
const app = require('../app');

describe('Disputes integration — /api/disputes', () => {
  const uniqueId = Date.now();
  const advertiserEmail = `disp-adv-${uniqueId}@test.com`;
  const creatorEmail = `disp-cre-${uniqueId}@test.com`;
  const password = 'TestPass123';

  let advertiserToken;
  let creatorToken;
  let channelId;
  let campaignId;
  let disputeId;

  beforeAll(async () => {
    // Register advertiser
    const advRes = await request(app)
      .post('/api/auth/registro')
      .send({ email: advertiserEmail, password, nombre: 'Dispute Advertiser', role: 'advertiser' });

    if (advRes.status === 503) return;
    advertiserToken = advRes.body.token;

    // Register creator
    const creRes = await request(app)
      .post('/api/auth/registro')
      .send({ email: creatorEmail, password, nombre: 'Dispute Creator', role: 'creator' });

    if (creRes.status === 503) return;
    creatorToken = creRes.body.token;

    // Create channel
    const chanRes = await request(app)
      .post('/api/canales')
      .set('Authorization', `Bearer ${creatorToken}`)
      .send({
        plataforma: 'telegram',
        identificadorCanal: `@disp-chan-${uniqueId}`,
        nombreCanal: 'Dispute Test Channel',
        categoria: 'news',
      });

    if (chanRes.status === 201) {
      const data = chanRes.body.data || chanRes.body.canal;
      channelId = data._id || data.id;
    }

    // Create campaign for dispute
    if (channelId) {
      const campRes = await request(app)
        .post('/api/campaigns')
        .set('Authorization', `Bearer ${advertiserToken}`)
        .send({
          channel: channelId,
          content: 'Dispute test campaign content',
          targetUrl: 'https://example.com/dispute',
          price: 200,
        });

      if (campRes.status === 201) {
        const data = campRes.body.data || campRes.body.campaign;
        campaignId = data._id || data.id;
      }
    }
  });

  // ── Create dispute ────────────────────────────────────────────────────────

  describe('POST /api/disputes', () => {
    test('creates dispute for a campaign', async () => {
      if (!advertiserToken || !campaignId) return;

      const res = await request(app)
        .post('/api/disputes')
        .set('Authorization', `Bearer ${advertiserToken}`)
        .send({
          campaignId,
          reason: 'not_published',
          description: 'The content was never published on the channel as agreed.',
        });

      if (res.status === 503) return;

      expect([200, 201]).toContain(res.status);
      expect(res.body).toHaveProperty('success', true);

      const data = res.body.data || res.body.dispute;
      if (data) {
        disputeId = data._id || data.id;
      }
    });

    test('returns 401 without auth', async () => {
      const res = await request(app)
        .post('/api/disputes')
        .send({
          campaignId: '64f1a2b3c4d5e6f7a8b9c0d1',
          reason: 'not_published',
          description: 'No auth test',
        });

      expect(res.status).toBe(401);
      expect(res.body).toHaveProperty('success', false);
    });

    test('returns 400 with invalid reason', async () => {
      if (!advertiserToken) return;

      const res = await request(app)
        .post('/api/disputes')
        .set('Authorization', `Bearer ${advertiserToken}`)
        .send({
          campaignId: '64f1a2b3c4d5e6f7a8b9c0d1',
          reason: 'invalid_reason',
          description: 'Bad reason',
        });

      expect(res.status).toBe(400);
      expect(res.body).toHaveProperty('success', false);
    });

    test('returns 400 with missing description', async () => {
      if (!advertiserToken) return;

      const res = await request(app)
        .post('/api/disputes')
        .set('Authorization', `Bearer ${advertiserToken}`)
        .send({
          campaignId: '64f1a2b3c4d5e6f7a8b9c0d1',
          reason: 'fraud',
          // missing description
        });

      expect(res.status).toBe(400);
    });

    test('returns 400 with invalid campaignId', async () => {
      if (!advertiserToken) return;

      const res = await request(app)
        .post('/api/disputes')
        .set('Authorization', `Bearer ${advertiserToken}`)
        .send({
          campaignId: 'not-a-mongo-id',
          reason: 'late_delivery',
          description: 'Bad ID test',
        });

      expect(res.status).toBe(400);
    });
  });

  // ── List disputes ─────────────────────────────────────────────────────────

  describe('GET /api/disputes', () => {
    test('returns list of user disputes', async () => {
      if (!advertiserToken) return;

      const res = await request(app)
        .get('/api/disputes')
        .set('Authorization', `Bearer ${advertiserToken}`);

      if (res.status === 503) return;

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('success', true);
    });

    test('returns 401 without auth', async () => {
      const res = await request(app)
        .get('/api/disputes');

      expect(res.status).toBe(401);
      expect(res.body).toHaveProperty('success', false);
    });
  });

  // ── Get dispute detail ────────────────────────────────────────────────────

  describe('GET /api/disputes/:id', () => {
    test('returns dispute detail', async () => {
      if (!advertiserToken || !disputeId) return;

      const res = await request(app)
        .get(`/api/disputes/${disputeId}`)
        .set('Authorization', `Bearer ${advertiserToken}`);

      if (res.status === 503) return;

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('success', true);
    });

    test('returns 400 for invalid ID', async () => {
      if (!advertiserToken) return;

      const res = await request(app)
        .get('/api/disputes/bad-id')
        .set('Authorization', `Bearer ${advertiserToken}`);

      expect(res.status).toBe(400);
    });

    test('returns 401 without auth', async () => {
      const res = await request(app)
        .get('/api/disputes/64f1a2b3c4d5e6f7a8b9c0d1');

      expect(res.status).toBe(401);
    });
  });

  // ── Add message to dispute ────────────────────────────────────────────────

  describe('POST /api/disputes/:id/message', () => {
    test('adds message to dispute', async () => {
      if (!advertiserToken || !disputeId) return;

      const res = await request(app)
        .post(`/api/disputes/${disputeId}/message`)
        .set('Authorization', `Bearer ${advertiserToken}`)
        .send({ text: 'I have evidence of the issue attached.' });

      if (res.status === 503) return;

      expect([200, 201]).toContain(res.status);
      expect(res.body).toHaveProperty('success', true);
    });

    test('returns 400 with empty text', async () => {
      if (!advertiserToken || !disputeId) return;

      const res = await request(app)
        .post(`/api/disputes/${disputeId}/message`)
        .set('Authorization', `Bearer ${advertiserToken}`)
        .send({ text: '' });

      expect(res.status).toBe(400);
    });

    test('returns 401 without auth', async () => {
      const res = await request(app)
        .post('/api/disputes/64f1a2b3c4d5e6f7a8b9c0d1/message')
        .send({ text: 'No auth message' });

      expect(res.status).toBe(401);
    });

    test('returns 400 with invalid dispute ID', async () => {
      if (!advertiserToken) return;

      const res = await request(app)
        .post('/api/disputes/bad-id/message')
        .set('Authorization', `Bearer ${advertiserToken}`)
        .send({ text: 'Invalid ID test' });

      expect(res.status).toBe(400);
    });
  });
});
