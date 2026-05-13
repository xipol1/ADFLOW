const request = require('supertest');
const app = require('../app');

describe('Smoke API checks', () => {
  // Health endpoints reflect DB connectivity: 200 with DB, 503 ('degraded') without.
  // CI runs without a real DB by default, so accept either.
  test('GET /health responde 200 o 503 según DB', async () => {
    const res = await request(app).get('/health');

    expect([200, 503]).toContain(res.status);
    expect(res.body).toHaveProperty('status');
  });

  test('GET /api/health responde 200 o 503 según DB', async () => {
    const res = await request(app).get('/api/health');

    expect([200, 503]).toContain(res.status);
    expect(res.body).toHaveProperty('status');
  });

  test('GET /api/channels responde listado demo', async () => {
    const res = await request(app).get('/api/channels');

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('success', true);
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.data.length).toBeGreaterThan(0);
  });
});
