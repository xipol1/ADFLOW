process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-secret';
process.env.JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'test-refresh-secret';

const request = require('supertest');
const app = require('../app');
const { registerVerifiedUser } = require('./helpers/registerVerifiedUser');
const betaGrant = require('../lib/betaGrant');

/**
 * F1 — the backend beta gate, and F2 — the courtesy Pro plan.
 *
 * Before F1 `betaAccess` lived only in the frontend: ProtectedRoute kept people
 * out of the dashboards while a plain token could still POST to /api/campaigns.
 * Before F2 a granted user found ~60% of the sidebar behind a paywall.
 */
describe('requiereBeta — el gate del backend', () => {
  const id = Date.now();
  const outsider = `gate-out-${id}@test.com`;
  const insider = `gate-in-${id}@test.com`;
  const password = 'TestPass123';
  let tokenFuera;
  let tokenDentro;

  beforeAll(async () => {
    const Usuario = require('../models/Usuario');
    const a = await registerVerifiedUser(app, { email: outsider, password, nombre: 'Fuera', role: 'advertiser', withBeta: false });
    tokenFuera = a.token;

    const b = await registerVerifiedUser(app, { email: insider, password, nombre: 'Dentro', role: 'advertiser', withBeta: false });
    await Usuario.findByIdAndUpdate(b.user.id, { betaAccess: true });
    tokenDentro = b.token;
  });

  test('un usuario sin beta no puede llamar a la API de campañas', async () => {
    const res = await request(app)
      .get('/api/campaigns')
      .set('Authorization', `Bearer ${tokenFuera}`);

    expect(res.status).toBe(403);
    expect(res.body.code).toBe('BETA_REQUIRED');
    expect(res.body.redirectTo).toBe('/beta');
  });

  test('el gate cubre también transacciones y autobuy', async () => {
    for (const path of ['/api/transacciones', '/api/autobuy']) {
      const res = await request(app).get(path).set('Authorization', `Bearer ${tokenFuera}`);
      expect(res.status).toBe(403);
    }
  });

  test('un usuario con beta pasa el gate', async () => {
    const res = await request(app)
      .get('/api/campaigns')
      .set('Authorization', `Bearer ${tokenDentro}`);

    expect(res.status).not.toBe(403);
  });

  test('el gate lee la base de datos, así que una concesión aplica sin re-login', async () => {
    const Usuario = require('../models/Usuario');
    const bloqueado = await request(app).get('/api/campaigns').set('Authorization', `Bearer ${tokenFuera}`);
    expect(bloqueado.status).toBe(403);

    // Mismo token de antes: si el gate leyese el JWT, seguiria bloqueado.
    await Usuario.findOneAndUpdate({ email: outsider }, { betaAccess: true });
    const abierto = await request(app).get('/api/campaigns').set('Authorization', `Bearer ${tokenFuera}`);
    expect(abierto.status).not.toBe(403);

    await Usuario.findOneAndUpdate({ email: outsider }, { betaAccess: false });
  });

  test('sin token la respuesta sigue siendo 401, no 403', async () => {
    const res = await request(app).get('/api/campaigns');
    expect(res.status).toBe(401);
  });

  test('el endpoint público de contact-sales NO queda gateado', async () => {
    // Vive bajo /api/subscriptions, que por eso no se gatea entero.
    const res = await request(app)
      .post('/api/subscriptions/contact-sales')
      .send({ email: `lead-${id}@test.com`, empresa: 'Test SL', mensaje: 'hola' });

    expect(res.status).not.toBe(401);
    expect(res.status).not.toBe(403);
  });
});

describe('Pro de cortesía al conceder la beta', () => {
  test('conceder escribe un plan Pro con estado granted', () => {
    const updates = betaGrant.construirConcesion(
      { rol: 'creator', subscription: null },
      { grantedBy: null, motivo: 'test' }
    );
    expect(updates.betaAccess).toBe(true);
    expect(updates.subscription.plan).toBe('creator_pro');
    expect(updates.subscription.status).toBe('granted');
    expect(updates.subscription.grantedReason).toBe('beta');
  });

  test('el plan de cortesía desbloquea de verdad las features de ProGate', () => {
    const { hasFeature } = require('../lib/plans');
    const antes = { rol: 'advertiser', subscription: null };
    expect(hasFeature(antes, 'bulkLauncher')).toBe(false);

    const updates = betaGrant.construirConcesion(antes, {});
    const despues = { rol: 'advertiser', subscription: updates.subscription };
    expect(hasFeature(despues, 'bulkLauncher')).toBe(true);
    expect(hasFeature(despues, 'lookalike')).toBe(true);
  });

  test('una suscripción de pago NO se pisa al conceder beta', () => {
    const pagando = {
      rol: 'advertiser',
      subscription: { plan: 'advertiser_pro', status: 'active', stripeSubscriptionId: 'sub_123' },
    };
    const updates = betaGrant.construirConcesion(pagando, {});
    expect(updates.betaAccess).toBe(true);
    expect(updates.subscription).toBeUndefined();
  });

  test('revocar limpia el plan de cortesía', () => {
    const concedido = betaGrant.construirConcesion({ rol: 'creator', subscription: null }, {});
    const updates = betaGrant.construirRevocacion({ rol: 'creator', subscription: concedido.subscription });
    expect(updates.betaAccess).toBe(false);
    expect(updates.subscription.plan).toBeNull();
    expect(updates.subscription.status).toBeNull();
  });

  test('revocar NO toca una suscripción de pago', () => {
    const pagando = {
      rol: 'advertiser',
      subscription: { plan: 'advertiser_pro', status: 'active', stripeSubscriptionId: 'sub_123' },
    };
    const updates = betaGrant.construirRevocacion(pagando);
    expect(updates.betaAccess).toBe(false);
    expect(updates.subscription).toBeUndefined();
  });
});

describe('Concesión desde el admin, extremo a extremo', () => {
  const id = Date.now() + 7;
  const adminEmail = `grant-admin-${id}@test.com`;
  const targetEmail = `grant-target-${id}@test.com`;
  const password = 'TestPass123';
  let adminToken;
  let targetId;
  let targetToken;

  beforeAll(async () => {
    const Usuario = require('../models/Usuario');
    await registerVerifiedUser(app, { email: adminEmail, password, nombre: 'Adm', role: 'advertiser', withFiscal: false });
    await Usuario.findOneAndUpdate({ email: adminEmail }, { rol: 'admin' });
    adminToken = (await request(app).post('/api/auth/login').send({ email: adminEmail, password })).body.token;

    const t = await registerVerifiedUser(app, { email: targetEmail, password, nombre: 'Obj', role: 'creator', withFiscal: false, withBeta: false });
    targetId = t.user.id;
    targetToken = t.token;
  });

  test('conceder desde el admin abre el gate y da Pro en una sola acción', async () => {
    const bloqueado = await request(app).get('/api/campaigns').set('Authorization', `Bearer ${targetToken}`);
    expect(bloqueado.status).toBe(403);

    const res = await request(app)
      .put(`/api/admin/dashboard/users/${targetId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ betaAccess: true, betaGrantReason: 'cohorte cocina' });
    expect(res.status).toBe(200);

    const abierto = await request(app).get('/api/campaigns').set('Authorization', `Bearer ${targetToken}`);
    expect(abierto.status).not.toBe(403);

    const plan = await request(app).get('/api/subscriptions/me').set('Authorization', `Bearer ${targetToken}`);
    expect(plan.body.planKey).toBe('creator_pro');
    expect(plan.body.subscription.grantedReason).toBe('beta');
  });

  test('revocar cierra el gate y retira el Pro de cortesía', async () => {
    const res = await request(app)
      .put(`/api/admin/dashboard/users/${targetId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ betaAccess: false });
    expect(res.status).toBe(200);

    const cerrado = await request(app).get('/api/campaigns').set('Authorization', `Bearer ${targetToken}`);
    expect(cerrado.status).toBe(403);

    const plan = await request(app).get('/api/subscriptions/me').set('Authorization', `Bearer ${targetToken}`);
    expect(plan.body.planKey).toBe('creator_free');
  });
});
