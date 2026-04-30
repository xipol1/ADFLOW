process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-secret';
process.env.JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'test-refresh-secret';

const request = require('supertest');
const app = require('../app');

// Tests for the fiscal-data middleware on money-movement payouts routes.
// Skips gracefully when no database is available (CI without Mongo).
describe('Fiscal data — payouts routes', () => {
  const uniqueId = Date.now();
  const email = `payout-fiscal-${uniqueId}@test.com`;
  const password = 'TestPass123';
  let token;

  beforeAll(async () => {
    const res = await request(app)
      .post('/api/auth/registro')
      .send({ email, password, nombre: 'Payout Fiscal Test', role: 'creator' });
    if (res.status === 503) return; // no DB

    // Mark email as verified so requests reach the fiscal middleware
    // instead of being short-circuited by requiereEmailVerificado.
    const Usuario = require('../models/Usuario');
    await Usuario.updateOne({ email }, { emailVerificado: true });

    // Re-issue the access token so its embedded emailVerificado=true.
    const AuthService = require('../services/authService');
    const user = await Usuario.findOne({ email });
    const tokens = await AuthService.generarTokens(user);
    token = tokens.tokenAcceso;
  });

  test('blocks POST /api/payouts/withdraw when datosFacturacion is incomplete', async () => {
    if (!token) return; // no DB

    const res = await request(app)
      .post('/api/payouts/withdraw')
      .set('Authorization', `Bearer ${token}`)
      .send({ amount: 50 });

    expect(res.status).toBe(403);
    expect(res.body.code).toBe('FISCAL_DATA_REQUIRED');
  });

  test('blocks POST /api/payouts/onboard when datosFacturacion is incomplete', async () => {
    if (!token) return; // no DB

    const res = await request(app)
      .post('/api/payouts/onboard')
      .set('Authorization', `Bearer ${token}`)
      .send({});

    expect(res.status).toBe(403);
    expect(res.body.code).toBe('FISCAL_DATA_REQUIRED');
  });
});
