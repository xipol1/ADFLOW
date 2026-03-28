const request = require('supertest');
const app = require('../app');

// These tests validate endpoint existence and auth behavior.
// They work without a live DB: auth-required routes return 401, no-DB routes return 503.

describe('Marketplace endpoints — auth & structure', () => {
  // Campaigns
  test('GET /api/campaigns — sin token devuelve 401', async () => {
    const res = await request(app).get('/api/campaigns');
    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });

  test('POST /api/campaigns — sin token devuelve 401', async () => {
    const res = await request(app).post('/api/campaigns').send({});
    expect(res.status).toBe(401);
  });

  test('POST /api/campaigns/:id/pay — sin token devuelve 401', async () => {
    const res = await request(app).post('/api/campaigns/507f1f77bcf86cd799439011/pay');
    expect(res.status).toBe(401);
  });

  test('POST /api/campaigns/:id/confirm — sin token devuelve 401', async () => {
    const res = await request(app).post('/api/campaigns/507f1f77bcf86cd799439011/confirm');
    expect(res.status).toBe(401);
  });

  test('POST /api/campaigns/:id/complete — sin token devuelve 401', async () => {
    const res = await request(app).post('/api/campaigns/507f1f77bcf86cd799439011/complete');
    expect(res.status).toBe(401);
  });

  // Transacciones
  test('GET /api/transacciones — sin token devuelve 401', async () => {
    const res = await request(app).get('/api/transacciones');
    expect(res.status).toBe(401);
  });

  test('POST /api/transacciones/:id/pay — sin token devuelve 401', async () => {
    const res = await request(app).post('/api/transacciones/507f1f77bcf86cd799439011/pay');
    expect(res.status).toBe(401);
  });

  // Estadísticas
  test('GET /api/estadisticas/campaign/:id — sin token devuelve 401', async () => {
    const res = await request(app).get('/api/estadisticas/campaign/507f1f77bcf86cd799439011');
    expect(res.status).toBe(401);
  });

  // Lists (public)
  test('GET /api/lists/channels — devuelve respuesta válida (503 sin DB o 200 con DB)', async () => {
    const res = await request(app).get('/api/lists/channels');
    expect([200, 503]).toContain(res.status);
    expect(res.body).toHaveProperty('success');
  });

  // Canales
  test('GET /api/canales — sin token devuelve 401', async () => {
    const res = await request(app).get('/api/canales');
    expect(res.status).toBe(401);
  });

  test('POST /api/canales — sin token devuelve 401', async () => {
    const res = await request(app).post('/api/canales').send({});
    expect(res.status).toBe(401);
  });

  // Tracking redirect
  test('GET /r/:id — campaña inexistente devuelve 404 o redirect', async () => {
    const res = await request(app).get('/r/507f1f77bcf86cd799439011');
    expect([302, 404]).toContain(res.status);
  });

  // No 501 responses anywhere
  test('Ningún endpoint habilitado devuelve 501', async () => {
    const endpoints = [
      ['GET', '/api/campaigns'],
      ['GET', '/api/transacciones'],
      ['GET', '/api/estadisticas/campaign/507f1f77bcf86cd799439011'],
      ['GET', '/api/lists/channels'],
      ['GET', '/api/canales']
    ];

    for (const [method, path] of endpoints) {
      const res = await request(app)[method.toLowerCase()](path);
      expect(res.status).not.toBe(501);
    }
  });
});
