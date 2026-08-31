process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-secret';
process.env.JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'test-refresh-secret';

const request = require('supertest');
const app = require('../app');
const { registerVerifiedUser } = require('./helpers/registerVerifiedUser');

/**
 * Regression suite for the beta access grant path.
 *
 * The bug this guards against: the admin endpoint wrote `updates.fullAccess`,
 * which is not a field in models/Usuario.js. Mongoose strict mode dropped it
 * silently, so the endpoint answered 200 with an unchanged document and the
 * admin UI kept rendering "Demo". There was no way to let a real user into the
 * beta from the product. The assertions below fail if that regresses.
 */
describe('Beta access — admin grant flow', () => {
  const id = Date.now();
  const adminEmail = `beta-admin-${id}@test.com`;
  const userEmail = `beta-user-${id}@test.com`;
  const password = 'TestPass123';

  let adminToken;
  let targetId;

  beforeAll(async () => {
    const Usuario = require('../models/Usuario');

    // Registration cannot create admins, so promote after the fact and log in
    // again so the JWT carries rol=admin.
    await registerVerifiedUser(app, {
      email: adminEmail, password, nombre: 'Beta Admin', role: 'advertiser', withFiscal: false,
    });
    await Usuario.findOneAndUpdate({ email: adminEmail }, { rol: 'admin' });
    const adminLogin = await request(app).post('/api/auth/login').send({ email: adminEmail, password });
    adminToken = adminLogin.body.token;

    const target = await registerVerifiedUser(app, {
      email: userEmail, password, nombre: 'Beta Target', role: 'creator', withFiscal: false,
    });
    targetId = target.user.id;
  });

  const put = (body) => request(app)
    .put(`/api/admin/dashboard/users/${targetId}`)
    .set('Authorization', `Bearer ${adminToken}`)
    .send(body);

  test('a new user starts without beta access', async () => {
    const login = await request(app).post('/api/auth/login').send({ email: userEmail, password });
    expect(login.status).toBe(200);
    expect(login.body.user.betaAccess).toBe(false);
  });

  test('granting beta access persists it to the database', async () => {
    const res = await put({ betaAccess: true, betaGrantReason: 'canal de cocina verificado' });
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.betaAccess).toBe(true);

    // Re-read from the DB, not just the response, so a phantom field can't pass.
    const Usuario = require('../models/Usuario');
    const stored = await Usuario.findById(targetId).select('betaAccess betaGrantedAt betaGrantReason').lean();
    expect(stored.betaAccess).toBe(true);
    expect(stored.betaGrantedAt).toBeTruthy();
    expect(stored.betaGrantReason).toBe('canal de cocina verificado');
  });

  test('the granted flag reaches the client through verificar-token', async () => {
    const login = await request(app).post('/api/auth/login').send({ email: userEmail, password });
    const res = await request(app)
      .get('/api/auth/verificar-token')
      .set('Authorization', `Bearer ${login.body.token}`);

    expect(res.status).toBe(200);
    expect(res.body.user.betaAccess).toBe(true);
    // Legacy alias consumed by the frontend must stay in sync.
    expect(res.body.user.fullAccess).toBe(true);
  });

  test('the grant is recorded in the audit log', async () => {
    const AuthAuditLog = require('../models/AuthAuditLog');
    const entry = await AuthAuditLog.findOne({ event: 'beta.granted', email: userEmail }).lean();
    expect(entry).toBeTruthy();
    expect(entry.metadata.motivo).toBe('canal de cocina verificado');
  });

  test('the user list returns the fields the admin table renders', async () => {
    const res = await request(app)
      .get('/api/admin/dashboard/users')
      .query({ search: userEmail })
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    const row = res.body.data.find((u) => u.email === userEmail);
    expect(row).toBeTruthy();
    // Both of these were absent from the .select(), so the columns were
    // permanently stuck on "Demo" and "No".
    expect(row.betaAccess).toBe(true);
    expect(row.emailVerificado).toBe(true);
  });

  test('revoking clears the grant metadata', async () => {
    const res = await put({ betaAccess: false });
    expect(res.status).toBe(200);
    expect(res.body.data.betaAccess).toBe(false);

    const Usuario = require('../models/Usuario');
    const stored = await Usuario.findById(targetId).select('betaAccess betaGrantedAt betaGrantReason').lean();
    expect(stored.betaAccess).toBe(false);
    expect(stored.betaGrantedAt).toBeNull();
    expect(stored.betaGrantReason).toBe('');
  });

  test('writing the legacy fullAccess key does NOT grant access', async () => {
    const res = await put({ fullAccess: true });
    // No recognised field → nothing to update.
    expect(res.status).toBe(400);

    const Usuario = require('../models/Usuario');
    const stored = await Usuario.findById(targetId).select('betaAccess').lean();
    expect(stored.betaAccess).toBe(false);
  });

  test('deactivating writes activo, the field that actually exists', async () => {
    const res = await put({ activo: false });
    expect(res.status).toBe(200);

    const Usuario = require('../models/Usuario');
    const stored = await Usuario.findById(targetId).select('activo').lean();
    expect(stored.activo).toBe(false);

    await put({ activo: true });
  });

  test('an unknown role is rejected instead of reaching the model', async () => {
    const res = await put({ rol: 'superadmin' });
    expect(res.status).toBe(400);
  });

  test('non-admins cannot grant beta access', async () => {
    const login = await request(app).post('/api/auth/login').send({ email: userEmail, password });
    const res = await request(app)
      .put(`/api/admin/dashboard/users/${targetId}`)
      .set('Authorization', `Bearer ${login.body.token}`)
      .send({ betaAccess: true });

    expect(res.status).toBe(403);
  });
});
