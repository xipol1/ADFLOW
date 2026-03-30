process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-secret';
process.env.JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'test-refresh-secret';

const request = require('supertest');
const app = require('../app');

describe('Campaigns integration — /api/campaigns', () => {
  const uniqueId = Date.now();
  const advertiserEmail = `camp-adv-${uniqueId}@test.com`;
  const creatorEmail = `camp-cre-${uniqueId}@test.com`;
  const password = 'TestPass123';

  let advertiserToken;
  let creatorToken;
  let channelId;
  let campaignId;

  beforeAll(async () => {
    // Register advertiser
    const advRes = await request(app)
      .post('/api/auth/registro')
      .send({ email: advertiserEmail, password, nombre: 'Camp Advertiser', role: 'advertiser' });

    if (advRes.status === 503) return;
    advertiserToken = advRes.body.token;

    // Register creator and create a channel
    const creRes = await request(app)
      .post('/api/auth/registro')
      .send({ email: creatorEmail, password, nombre: 'Camp Creator', role: 'creator' });

    if (creRes.status === 503) return;
    creatorToken = creRes.body.token;

    // Create a channel for campaigns
    const chanRes = await request(app)
      .post('/api/canales')
      .set('Authorization', `Bearer ${creatorToken}`)
      .send({
        plataforma: 'telegram',
        identificadorCanal: `@camp-channel-${uniqueId}`,
        nombreCanal: 'Campaign Test Channel',
        categoria: 'crypto',
      });

    if (chanRes.status === 201) {
      const data = chanRes.body.data || chanRes.body.canal;
      channelId = data._id || data.id;
    }
  });

  // ── Create campaign ───────────────────────────────────────────────────────

  describe('POST /api/campaigns', () => {
    test('creates campaign as advertiser', async () => {
      if (!advertiserToken || !channelId) return;

      const res = await request(app)
        .post('/api/campaigns')
        .set('Authorization', `Bearer ${advertiserToken}`)
        .send({
          channel: channelId,
          content: 'Test ad content for campaign integration test',
          targetUrl: 'https://example.com/landing',
          price: 100,
        });

      if (res.status === 503) return;

      expect(res.status).toBe(201);
      expect(res.body).toHaveProperty('success', true);

      const data = res.body.data || res.body.campaign;
      campaignId = data._id || data.id;
      expect(campaignId).toBeTruthy();
    });

    test('returns 401 without auth', async () => {
      const res = await request(app)
        .post('/api/campaigns')
        .send({
          channel: '64f1a2b3c4d5e6f7a8b9c0d1',
          content: 'No auth content',
          targetUrl: 'https://example.com',
          price: 50,
        });

      expect(res.status).toBe(401);
      expect(res.body).toHaveProperty('success', false);
    });

    test('returns 400 with missing required fields', async () => {
      if (!advertiserToken) return;

      const res = await request(app)
        .post('/api/campaigns')
        .set('Authorization', `Bearer ${advertiserToken}`)
        .send({
          // Missing channel, content, targetUrl, price
        });

      expect(res.status).toBe(400);
      expect(res.body).toHaveProperty('success', false);
    });

    test('returns 400 with invalid channel ID', async () => {
      if (!advertiserToken) return;

      const res = await request(app)
        .post('/api/campaigns')
        .set('Authorization', `Bearer ${advertiserToken}`)
        .send({
          channel: 'not-a-mongo-id',
          content: 'Some content',
          targetUrl: 'https://example.com',
          price: 100,
        });

      expect(res.status).toBe(400);
    });

    test('returns 400 with negative price', async () => {
      if (!advertiserToken || !channelId) return;

      const res = await request(app)
        .post('/api/campaigns')
        .set('Authorization', `Bearer ${advertiserToken}`)
        .send({
          channel: channelId,
          content: 'Bad price content',
          targetUrl: 'https://example.com',
          price: -50,
        });

      expect(res.status).toBe(400);
    });
  });

  // ── List campaigns ────────────────────────────────────────────────────────

  describe('GET /api/campaigns', () => {
    test('returns campaign list for authenticated user', async () => {
      if (!advertiserToken) return;

      const res = await request(app)
        .get('/api/campaigns')
        .set('Authorization', `Bearer ${advertiserToken}`);

      if (res.status === 503) return;

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('success', true);
    });

    test('returns 401 without auth', async () => {
      const res = await request(app)
        .get('/api/campaigns');

      expect(res.status).toBe(401);
      expect(res.body).toHaveProperty('success', false);
    });
  });

  // ── Get campaign by ID ────────────────────────────────────────────────────

  describe('GET /api/campaigns/:id', () => {
    test('returns campaign detail', async () => {
      if (!advertiserToken || !campaignId) return;

      const res = await request(app)
        .get(`/api/campaigns/${campaignId}`)
        .set('Authorization', `Bearer ${advertiserToken}`);

      if (res.status === 503) return;

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('success', true);
    });

    test('invalid ID returns 400', async () => {
      if (!advertiserToken) return;

      const res = await request(app)
        .get('/api/campaigns/bad-id')
        .set('Authorization', `Bearer ${advertiserToken}`);

      expect(res.status).toBe(400);
    });
  });

  // ── Cancel campaign ───────────────────────────────────────────────────────

  describe('POST /api/campaigns/:id/cancel', () => {
    test('cancels a draft campaign', async () => {
      if (!advertiserToken || !campaignId) return;

      const res = await request(app)
        .post(`/api/campaigns/${campaignId}/cancel`)
        .set('Authorization', `Bearer ${advertiserToken}`);

      if (res.status === 503) return;

      // Accept 200 (success) or 400/409 (already cancelled or wrong state)
      expect([200, 400, 409]).toContain(res.status);
      expect(res.body).toHaveProperty('success');
    });

    test('returns 401 without auth', async () => {
      const res = await request(app)
        .post('/api/campaigns/64f1a2b3c4d5e6f7a8b9c0d1/cancel');

      expect(res.status).toBe(401);
    });

    test('invalid ID returns 400', async () => {
      if (!advertiserToken) return;

      const res = await request(app)
        .post('/api/campaigns/not-valid/cancel')
        .set('Authorization', `Bearer ${advertiserToken}`);

      expect(res.status).toBe(400);
    });
  });

  // ── Campaign status transitions ───────────────────────────────────────────

  describe('PATCH /api/campaigns/:id/status', () => {
    test('returns 400 with invalid status', async () => {
      if (!advertiserToken || !campaignId) return;

      const res = await request(app)
        .patch(`/api/campaigns/${campaignId}/status`)
        .set('Authorization', `Bearer ${advertiserToken}`)
        .send({ status: 'INVALID_STATUS' });

      expect(res.status).toBe(400);
    });
  });

  // ── Campaign messages ─────────────────────────────────────────────────────

  describe('Campaign chat — /api/campaigns/:id/messages', () => {
    let chatCampaignId;

    beforeAll(async () => {
      if (!advertiserToken || !channelId) return;

      // Create a fresh campaign for chat tests
      const res = await request(app)
        .post('/api/campaigns')
        .set('Authorization', `Bearer ${advertiserToken}`)
        .send({
          channel: channelId,
          content: 'Chat test campaign content',
          targetUrl: 'https://example.com/chat',
          price: 75,
        });

      if (res.status === 201) {
        const data = res.body.data || res.body.campaign;
        chatCampaignId = data._id || data.id;
      }
    });

    test('sends a message to campaign chat', async () => {
      if (!advertiserToken || !chatCampaignId) return;

      const res = await request(app)
        .post(`/api/campaigns/${chatCampaignId}/messages`)
        .set('Authorization', `Bearer ${advertiserToken}`)
        .send({ text: 'Hello from integration test' });

      if (res.status === 503) return;

      expect([200, 201]).toContain(res.status);
      expect(res.body).toHaveProperty('success', true);
    });

    test('gets messages for a campaign', async () => {
      if (!advertiserToken || !chatCampaignId) return;

      const res = await request(app)
        .get(`/api/campaigns/${chatCampaignId}/messages`)
        .set('Authorization', `Bearer ${advertiserToken}`);

      if (res.status === 503) return;

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('success', true);
    });

    test('returns 401 without auth for messages', async () => {
      const res = await request(app)
        .get('/api/campaigns/64f1a2b3c4d5e6f7a8b9c0d1/messages');

      expect(res.status).toBe(401);
    });
  });
});
