process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-secret';
process.env.JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'test-refresh-secret';

const request = require('supertest');
const app = require('../app');
const { registerVerifiedUser } = require('./helpers/registerVerifiedUser');

/**
 * The waiting room a user without beta access lands on.
 *
 * Before this existed they were bounced to /dashboard, where every call to
 * action pointed back at a gated route. These endpoints back the replacement:
 * the user can see their real queue position and put their channel forward.
 */
describe('Beta waiting room — /api/beta', () => {
  const id = Date.now();
  const email = `beta-room-${id}@test.com`;
  const password = 'TestPass123';
  let token;
  let userId;

  beforeAll(async () => {
    const res = await registerVerifiedUser(app, {
      email, password, nombre: 'Sala Espera', role: 'creator', withFiscal: false, withBeta: false,
    });
    token = res.token;
    userId = res.user.id;
  });

  const auth = (req) => req.set('Authorization', `Bearer ${token}`);

  test('requires authentication', async () => {
    const res = await request(app).get('/api/beta/estado');
    expect(res.status).toBe(401);
  });

  test('reports no access and no waitlist entry for a fresh account', async () => {
    const res = await auth(request(app).get('/api/beta/estado'));
    expect(res.status).toBe(200);
    expect(res.body.data.betaAccess).toBe(false);
    expect(res.body.data.waitlist).toBeNull();
    expect(res.body.data.cohorte.cap).toBeGreaterThan(0);
  });

  test('rejects a waitlist signup with an invalid niche', async () => {
    const res = await auth(request(app).post('/api/beta/waitlist'))
      .send({ handle: '@micanal', platform: 'telegram', nicho: 'inventado', size: 'lt5k' });
    expect(res.status).toBe(400);
  });

  test('joining the waitlist assigns a real queue position', async () => {
    const res = await auth(request(app).post('/api/beta/waitlist'))
      .send({ handle: '@micanal', platform: 'telegram', nicho: 'tech', size: '5k_50k' });

    expect(res.status).toBe(200);
    expect(res.body.data.confirmed).toBe(true);
    expect(res.body.data.queuePosition).toBeGreaterThan(0);
    expect(res.body.data.nichoLabel).toBeTruthy();
  });

  test('the position shows up on the next status read', async () => {
    const res = await auth(request(app).get('/api/beta/estado'));
    expect(res.body.data.waitlist).not.toBeNull();
    expect(res.body.data.waitlist.handle).toBe('@micanal');
    expect(res.body.data.waitlist.queuePosition).toBeGreaterThan(0);
  });

  test('signing up twice keeps the original position instead of re-queuing', async () => {
    const antes = await auth(request(app).get('/api/beta/estado'));
    const posicion = antes.body.data.waitlist.queuePosition;

    const res = await auth(request(app).post('/api/beta/waitlist'))
      .send({ handle: '@otrocanal', platform: 'whatsapp', nicho: 'gaming', size: 'gt50k' });

    expect(res.status).toBe(200);
    expect(res.body.data.queuePosition).toBe(posicion);
    expect(res.body.data.handle).toBe('@micanal');
  });

  test('the status never leaks other people’s personal data', async () => {
    const res = await auth(request(app).get('/api/beta/estado'));
    const w = res.body.data.waitlist;
    expect(w.ip).toBeUndefined();
    expect(w.userAgent).toBeUndefined();
    expect(w.confirmToken).toBeUndefined();
  });

  test('granting access flips betaAccess in the status endpoint', async () => {
    const Usuario = require('../models/Usuario');
    await Usuario.findByIdAndUpdate(userId, { betaAccess: true });

    const res = await auth(request(app).get('/api/beta/estado'));
    expect(res.body.data.betaAccess).toBe(true);

    await Usuario.findByIdAndUpdate(userId, { betaAccess: false });
  });
});

describe('Beta waitlist — admin bridge', () => {
  const id = Date.now() + 1;
  const adminEmail = `beta-wl-admin-${id}@test.com`;
  const memberEmail = `beta-wl-member-${id}@test.com`;
  const password = 'TestPass123';
  let adminToken;

  beforeAll(async () => {
    const Usuario = require('../models/Usuario');

    await registerVerifiedUser(app, {
      email: adminEmail, password, nombre: 'WL Admin', role: 'advertiser', withFiscal: false,
    });
    await Usuario.findOneAndUpdate({ email: adminEmail }, { rol: 'admin' });
    const login = await request(app).post('/api/auth/login').send({ email: adminEmail, password });
    adminToken = login.body.token;

    const member = await registerVerifiedUser(app, {
      email: memberEmail, password, nombre: 'WL Member', role: 'creator', withFiscal: false, withBeta: false,
    });
    await request(app)
      .post('/api/beta/waitlist')
      .set('Authorization', `Bearer ${member.token}`)
      .send({ handle: '@canalwl', platform: 'telegram', nicho: 'finanzas', size: 'lt5k' });
  });

  test('the waitlist is joined against real accounts', async () => {
    const res = await request(app)
      .get('/api/admin/dashboard/waitlist')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    const row = res.body.data.find((r) => r.email === memberEmail);
    expect(row).toBeTruthy();
    // This join is the whole point: without usuarioId the queue is unactionable.
    expect(row.tieneCuenta).toBe(true);
    expect(row.usuarioId).toBeTruthy();
    expect(row.betaAccess).toBe(false);
  });

  test('the row carries the id the grant endpoint needs', async () => {
    const lista = await request(app)
      .get('/api/admin/dashboard/waitlist')
      .set('Authorization', `Bearer ${adminToken}`);
    const row = lista.body.data.find((r) => r.email === memberEmail);

    const res = await request(app)
      .put(`/api/admin/dashboard/users/${row.usuarioId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ betaAccess: true, betaGrantReason: `Waitlist #${row.queuePosition}` });

    expect(res.status).toBe(200);
    expect(res.body.data.betaAccess).toBe(true);

    const despues = await request(app)
      .get('/api/admin/dashboard/waitlist')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(despues.body.data.find((r) => r.email === memberEmail).betaAccess).toBe(true);
  });

  test('non-admins cannot read the waitlist', async () => {
    const login = await request(app).post('/api/auth/login').send({ email: memberEmail, password });
    const res = await request(app)
      .get('/api/admin/dashboard/waitlist')
      .set('Authorization', `Bearer ${login.body.token}`);
    expect(res.status).toBe(403);
  });
});
