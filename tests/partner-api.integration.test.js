process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-secret';
process.env.JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'test-refresh-secret';

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const request = require('supertest');
const app = require('../app');

const dataDir = path.join(__dirname, '..', 'data');
const partnersPath = path.join(dataDir, 'partners.json');

const seedPartner = (plainApiKey) => {
  fs.mkdirSync(dataDir, { recursive: true });
  fs.writeFileSync(partnersPath, JSON.stringify([
    {
      id: 'partner-getalink',
      name: 'Getalink',
      apiKeyHash: crypto.createHash('sha256').update(plainApiKey).digest('hex'),
      apiKeyHint: plainApiKey.slice(-4),
      status: 'active',
      allowedIps: ['*'],
      rateLimitPerMinute: 60
    }
  ], null, 2));
};

describe('Partner API integration', () => {
  const apiKey = 'getalink-secret-key';

  beforeEach(() => {
    if (fs.existsSync(dataDir)) {
      fs.rmSync(dataDir, { recursive: true, force: true });
    }
    seedPartner(apiKey);
  });

  test('requires api key for partner access', async () => {
    const response = await request(app)
      .get('/api/partners/inventory')
      .expect(401);

    expect(response.body.error.code).toBe('API_KEY_REQUIRED');
    expect(response.body.requestId).toBeTruthy();
  });

  test('inventory is restricted and sanitized', async () => {
    const response = await request(app)
      .get('/api/partners/inventory?limit=50')
      .set('Authorization', `Bearer ${apiKey}`)
      .expect(200);

    expect(response.body.success).toBe(true);
    expect(response.body.data.length).toBeLessThanOrEqual(20);
    expect(response.body.data[0].url).toBeUndefined();
    expect(response.body.meta.usagePolicy.exportAllowed).toBe(false);
    expect(response.headers['x-request-id']).toBeTruthy();
  });

  test('campaign flow enforces contract order', async () => {
    const created = await request(app)
      .post('/api/partners/campaigns')
      .set('Authorization', `Bearer ${apiKey}`)
      .set('Idempotency-Key', 'create-campaign-1')
      .send({
        title: 'Campana Getalink',
        description: 'Integracion externa',
        targetUrl: 'https://getalink.com/campaign',
        channelId: 'demo-ch-crypto-alpha-signals',
        budget: 500,
        currency: 'EUR',
        externalReference: 'getalink-001'
      })
      .expect(201);

    const campaignId = created.body.data.id;

    expect(created.body.meta.nextRequiredStep).toBe('create_payment_session');
    expect(created.body.data.workflow.availableActions).toContain('create_payment_session');

    await request(app)
      .post(`/api/partners/campaigns/${campaignId}/register-publication`)
      .set('Authorization', `Bearer ${apiKey}`)
      .send({
        publicationId: 'pub-001',
        publishedAt: new Date().toISOString()
      })
      .expect(409);

    await request(app)
      .post(`/api/partners/campaigns/${campaignId}/payment-session`)
      .set('Authorization', `Bearer ${apiKey}`)
      .set('Idempotency-Key', 'payment-session-1')
      .send({ provider: 'stripe' })
      .expect(201);

    await request(app)
      .post(`/api/partners/campaigns/${campaignId}/confirm-payment`)
      .set('Authorization', `Bearer ${apiKey}`)
      .set('Idempotency-Key', 'confirm-payment-1')
      .send({ paymentReference: 'pi_123' })
      .expect(200);

    await request(app)
      .post(`/api/partners/campaigns/${campaignId}/register-publication`)
      .set('Authorization', `Bearer ${apiKey}`)
      .send({
        publicationId: 'pub-001',
        publishedAt: new Date().toISOString(),
        evidenceUrl: 'https://getalink.com/evidence/pub-001'
      })
      .expect(200);

    await request(app)
      .post(`/api/partners/campaigns/${campaignId}/confirm-execution`)
      .set('Authorization', `Bearer ${apiKey}`)
      .send({
        confirmedAt: new Date().toISOString(),
        notes: 'Publicado segun SLA'
      })
      .expect(200);

    const released = await request(app)
      .post(`/api/partners/campaigns/${campaignId}/release-funds`)
      .set('Authorization', `Bearer ${apiKey}`)
      .expect(200);

    expect(released.body.data.status).toBe('funds_released');
    expect(released.body.data.escrowStatus).toBe('released');
    expect(released.body.data.workflow.availableActions).toContain('read_metrics');
  });

  test('idempotency key replays successful mutations', async () => {
    const payload = {
      title: 'Campana Idempotente',
      targetUrl: 'https://getalink.com/idempotent',
      channelId: 'demo-ch-crypto-alpha-signals',
      budget: 450
    };

    const first = await request(app)
      .post('/api/partners/campaigns')
      .set('Authorization', `Bearer ${apiKey}`)
      .set('Idempotency-Key', 'campaign-create-replay')
      .send(payload)
      .expect(201);

    const second = await request(app)
      .post('/api/partners/campaigns')
      .set('Authorization', `Bearer ${apiKey}`)
      .set('Idempotency-Key', 'campaign-create-replay')
      .send(payload)
      .expect(201);

    expect(second.headers['idempotency-replayed']).toBe('true');
    expect(second.body.data.id).toBe(first.body.data.id);
  });
});
