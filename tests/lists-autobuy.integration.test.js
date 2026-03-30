process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-secret';
process.env.JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'test-refresh-secret';

const request = require('supertest');
const app = require('../app');

describe('Lists & AutoBuy integration', () => {
  const uniqueId = Date.now();
  const advertiserEmail = `list-adv-${uniqueId}@test.com`;
  const creatorEmail = `list-cre-${uniqueId}@test.com`;
  const password = 'TestPass123';

  let advertiserToken;
  let creatorToken;
  let channelId;
  let listId;
  let ruleId;

  beforeAll(async () => {
    // Register advertiser
    const advRes = await request(app)
      .post('/api/auth/registro')
      .send({ email: advertiserEmail, password, nombre: 'List Advertiser', role: 'advertiser' });

    if (advRes.status === 503) return;
    advertiserToken = advRes.body.token;

    // Register creator and create channel
    const creRes = await request(app)
      .post('/api/auth/registro')
      .send({ email: creatorEmail, password, nombre: 'List Creator', role: 'creator' });

    if (creRes.status === 503) return;
    creatorToken = creRes.body.token;

    const chanRes = await request(app)
      .post('/api/canales')
      .set('Authorization', `Bearer ${creatorToken}`)
      .send({
        plataforma: 'telegram',
        identificadorCanal: `@list-chan-${uniqueId}`,
        nombreCanal: 'List Test Channel',
        categoria: 'finance',
      });

    if (chanRes.status === 201) {
      const data = chanRes.body.data || chanRes.body.canal;
      channelId = data._id || data.id;
    }
  });

  // ═══════════════════════════════════════════════════════════════════════════
  //  USER LISTS — /api/lists
  // ═══════════════════════════════════════════════════════════════════════════

  describe('POST /api/lists — create list', () => {
    test('creates a new list', async () => {
      if (!advertiserToken) return;

      const res = await request(app)
        .post('/api/lists')
        .set('Authorization', `Bearer ${advertiserToken}`)
        .send({ name: 'My Favorites' });

      if (res.status === 503) return;

      expect([200, 201]).toContain(res.status);
      expect(res.body).toHaveProperty('success', true);

      const data = res.body.data || res.body.list;
      if (data) {
        listId = data._id || data.id;
      }
    });

    test('returns 401 without auth', async () => {
      const res = await request(app)
        .post('/api/lists')
        .send({ name: 'No Auth List' });

      expect(res.status).toBe(401);
    });

    test('returns 400 with missing name', async () => {
      if (!advertiserToken) return;

      const res = await request(app)
        .post('/api/lists')
        .set('Authorization', `Bearer ${advertiserToken}`)
        .send({});

      expect(res.status).toBe(400);
    });

    test('returns 400 with empty name', async () => {
      if (!advertiserToken) return;

      const res = await request(app)
        .post('/api/lists')
        .set('Authorization', `Bearer ${advertiserToken}`)
        .send({ name: '' });

      expect(res.status).toBe(400);
    });
  });

  describe('GET /api/lists — get my lists', () => {
    test('returns user lists', async () => {
      if (!advertiserToken) return;

      const res = await request(app)
        .get('/api/lists')
        .set('Authorization', `Bearer ${advertiserToken}`);

      if (res.status === 503) return;

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('success', true);
    });

    test('returns 401 without auth', async () => {
      const res = await request(app)
        .get('/api/lists');

      expect(res.status).toBe(401);
    });
  });

  describe('POST /api/lists/:id/add-channel', () => {
    test('adds channel to list', async () => {
      if (!advertiserToken || !listId || !channelId) return;

      const res = await request(app)
        .post(`/api/lists/${listId}/add-channel`)
        .set('Authorization', `Bearer ${advertiserToken}`)
        .send({ channelId });

      if (res.status === 503) return;

      expect([200, 201]).toContain(res.status);
      expect(res.body).toHaveProperty('success', true);
    });

    test('returns 401 without auth', async () => {
      const res = await request(app)
        .post('/api/lists/64f1a2b3c4d5e6f7a8b9c0d1/add-channel')
        .send({ channelId: '64f1a2b3c4d5e6f7a8b9c0d2' });

      expect(res.status).toBe(401);
    });

    test('returns 400 with invalid list ID', async () => {
      if (!advertiserToken) return;

      const res = await request(app)
        .post('/api/lists/bad-id/add-channel')
        .set('Authorization', `Bearer ${advertiserToken}`)
        .send({ channelId: '64f1a2b3c4d5e6f7a8b9c0d1' });

      expect(res.status).toBe(400);
    });

    test('returns 400 with invalid channelId', async () => {
      if (!advertiserToken || !listId) return;

      const res = await request(app)
        .post(`/api/lists/${listId}/add-channel`)
        .set('Authorization', `Bearer ${advertiserToken}`)
        .send({ channelId: 'bad-channel-id' });

      expect(res.status).toBe(400);
    });
  });

  describe('DELETE /api/lists/:id', () => {
    test('deletes own list', async () => {
      if (!advertiserToken || !listId) return;

      // Create a fresh list to delete (keep main listId for other tests)
      const createRes = await request(app)
        .post('/api/lists')
        .set('Authorization', `Bearer ${advertiserToken}`)
        .send({ name: 'To Delete' });

      if (createRes.status === 503) return;

      const data = createRes.body.data || createRes.body.list;
      const deleteId = data?._id || data?.id;
      if (!deleteId) return;

      const res = await request(app)
        .delete(`/api/lists/${deleteId}`)
        .set('Authorization', `Bearer ${advertiserToken}`);

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('success', true);
    });

    test('returns 401 without auth', async () => {
      const res = await request(app)
        .delete('/api/lists/64f1a2b3c4d5e6f7a8b9c0d1');

      expect(res.status).toBe(401);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  //  AUTOBUY RULES — /api/autobuy
  // ═══════════════════════════════════════════════════════════════════════════

  describe('POST /api/autobuy — create rule', () => {
    test('creates an autobuy rule', async () => {
      if (!advertiserToken) return;

      const res = await request(app)
        .post('/api/autobuy')
        .set('Authorization', `Bearer ${advertiserToken}`)
        .send({
          name: 'Auto Crypto Buy',
          content: 'Automated crypto channel ad',
          targetUrl: 'https://example.com/crypto-landing',
        });

      if (res.status === 503) return;

      expect([200, 201]).toContain(res.status);
      expect(res.body).toHaveProperty('success', true);

      const data = res.body.data || res.body.rule;
      if (data) {
        ruleId = data._id || data.id;
      }
    });

    test('returns 401 without auth', async () => {
      const res = await request(app)
        .post('/api/autobuy')
        .send({
          name: 'No Auth Rule',
          content: 'Content',
          targetUrl: 'https://example.com',
        });

      expect(res.status).toBe(401);
    });

    test('returns 400 with missing name', async () => {
      if (!advertiserToken) return;

      const res = await request(app)
        .post('/api/autobuy')
        .set('Authorization', `Bearer ${advertiserToken}`)
        .send({
          content: 'Content only',
          targetUrl: 'https://example.com',
        });

      expect(res.status).toBe(400);
    });

    test('returns 400 with missing content', async () => {
      if (!advertiserToken) return;

      const res = await request(app)
        .post('/api/autobuy')
        .set('Authorization', `Bearer ${advertiserToken}`)
        .send({
          name: 'Name only',
          targetUrl: 'https://example.com',
        });

      expect(res.status).toBe(400);
    });

    test('returns 400 with missing targetUrl', async () => {
      if (!advertiserToken) return;

      const res = await request(app)
        .post('/api/autobuy')
        .set('Authorization', `Bearer ${advertiserToken}`)
        .send({
          name: 'No URL',
          content: 'Content here',
        });

      expect(res.status).toBe(400);
    });
  });

  describe('GET /api/autobuy — list rules', () => {
    test('returns autobuy rules for authenticated user', async () => {
      if (!advertiserToken) return;

      const res = await request(app)
        .get('/api/autobuy')
        .set('Authorization', `Bearer ${advertiserToken}`);

      if (res.status === 503) return;

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('success', true);
    });

    test('returns 401 without auth', async () => {
      const res = await request(app)
        .get('/api/autobuy');

      expect(res.status).toBe(401);
    });
  });

  describe('PUT /api/autobuy/:id — update rule', () => {
    test('updates an autobuy rule', async () => {
      if (!advertiserToken || !ruleId) return;

      const res = await request(app)
        .put(`/api/autobuy/${ruleId}`)
        .set('Authorization', `Bearer ${advertiserToken}`)
        .send({ name: 'Updated Auto Crypto Buy' });

      if (res.status === 503) return;

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('success', true);
    });

    test('returns 401 without auth', async () => {
      const res = await request(app)
        .put('/api/autobuy/64f1a2b3c4d5e6f7a8b9c0d1')
        .send({ name: 'No Auth Update' });

      expect(res.status).toBe(401);
    });

    test('returns 400 with invalid ID', async () => {
      if (!advertiserToken) return;

      const res = await request(app)
        .put('/api/autobuy/bad-id')
        .set('Authorization', `Bearer ${advertiserToken}`)
        .send({ name: 'Invalid ID' });

      expect(res.status).toBe(400);
    });
  });

  describe('DELETE /api/autobuy/:id — delete rule', () => {
    test('deletes an autobuy rule', async () => {
      if (!advertiserToken || !ruleId) return;

      const res = await request(app)
        .delete(`/api/autobuy/${ruleId}`)
        .set('Authorization', `Bearer ${advertiserToken}`);

      if (res.status === 503) return;

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('success', true);
    });

    test('returns 401 without auth', async () => {
      const res = await request(app)
        .delete('/api/autobuy/64f1a2b3c4d5e6f7a8b9c0d1');

      expect(res.status).toBe(401);
    });

    test('returns 400 with invalid ID', async () => {
      if (!advertiserToken) return;

      const res = await request(app)
        .delete('/api/autobuy/bad-id')
        .set('Authorization', `Bearer ${advertiserToken}`);

      expect(res.status).toBe(400);
    });
  });
});
