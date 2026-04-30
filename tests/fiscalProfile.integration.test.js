process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-secret';
process.env.JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'test-refresh-secret';

const request = require('supertest');
const app = require('../app');

// Tests for the fiscal data persistence flow.
// Skips gracefully when no database is available (CI without Mongo).
describe('Fiscal data — PUT /api/auth/perfil', () => {
  const uniqueId = Date.now();
  const email = `fiscal-${uniqueId}@test.com`;
  const password = 'TestPass123';
  let token;

  beforeAll(async () => {
    const res = await request(app)
      .post('/api/auth/registro')
      .send({ email, password, nombre: 'Fiscal Test', role: 'advertiser' });
    if (res.status === 503) return;
    token = res.body.token;
  });

  test('persists complete fiscal data and marks completado=true', async () => {
    if (!token) return; // no DB

    const res = await request(app)
      .put('/api/auth/perfil')
      .set('Authorization', `Bearer ${token}`)
      .send({
        datosFacturacion: {
          razonSocial: 'Test Company SL',
          nif: 'B58378431',
          direccion: 'Calle Falsa 123',
          cp: '28001',
          ciudad: 'Madrid',
          provincia: 'Madrid',
          pais: 'ES',
          emailFacturacion: 'billing@test.com',
          esEmpresa: true,
        },
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    const df = res.body.user.datosFacturacion;
    expect(df).toBeDefined();
    expect(df.razonSocial).toBe('Test Company SL');
    expect(df.nif).toBe('B58378431');
    expect(df.cp).toBe('28001');
    expect(df.completado).toBe(true);
  });

  test('returns the persisted data on subsequent GET /perfil', async () => {
    if (!token) return;

    const res = await request(app)
      .get('/api/auth/perfil')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.user.datosFacturacion.razonSocial).toBe('Test Company SL');
    expect(res.body.user.datosFacturacion.completado).toBe(true);
  });

  test('partial update keeps existing fields and recomputes completado', async () => {
    if (!token) return;

    const res = await request(app)
      .put('/api/auth/perfil')
      .set('Authorization', `Bearer ${token}`)
      .send({ datosFacturacion: { ciudad: 'Barcelona' } });

    expect(res.status).toBe(200);
    expect(res.body.user.datosFacturacion.ciudad).toBe('Barcelona');
    // razonSocial preserved from earlier write
    expect(res.body.user.datosFacturacion.razonSocial).toBe('Test Company SL');
    expect(res.body.user.datosFacturacion.completado).toBe(true);
  });

  test('rejects invalid Spanish NIF checksum', async () => {
    if (!token) return;

    const res = await request(app)
      .put('/api/auth/perfil')
      .set('Authorization', `Bearer ${token}`)
      .send({ datosFacturacion: { nif: '00000000A', pais: 'ES' } });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  test('changing NIF invalidates VIES validation', async () => {
    if (!token) return;

    // Manually set VIES validated via a sneaky direct write isn't possible
    // through the API, so we just verify the field is false after a NIF change.
    const res = await request(app)
      .put('/api/auth/perfil')
      .set('Authorization', `Bearer ${token}`)
      .send({ datosFacturacion: { nif: '12345678Z' } });

    expect(res.status).toBe(200);
    expect(res.body.user.datosFacturacion.viesValidado).toBe(false);
  });

  test('clearing required field flips completado to false', async () => {
    if (!token) return;

    const res = await request(app)
      .put('/api/auth/perfil')
      .set('Authorization', `Bearer ${token}`)
      .send({ datosFacturacion: { razonSocial: '' } });

    expect(res.status).toBe(200);
    expect(res.body.user.datosFacturacion.razonSocial).toBe('');
    expect(res.body.user.datosFacturacion.completado).toBe(false);
  });

  test('rejects without auth token', async () => {
    const res = await request(app)
      .put('/api/auth/perfil')
      .send({ datosFacturacion: { razonSocial: 'X' } });

    expect(res.status).toBe(401);
  });
});
