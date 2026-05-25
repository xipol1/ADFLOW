// Test helper: register a user via the public API, force email verification +
// fiscal data in the DB (so middleware gates pass), then log in and return
// the token.
//
// Many of our integration tests need an authenticated user that can hit
// money-movement / data-modifying endpoints. In production those endpoints
// are gated by `requiereEmailVerificado` and `requiereDatosFacturacion`
// (middleware/auth.js) and the only way to flip `emailVerificado=true` is
// via the email-verification flow. Tests bypass that by writing directly
// to the Usuario document after registro and before login — the JWT issued
// at login will then include `emailVerificado: true`.
const request = require('supertest');

async function registerVerifiedUser(app, { email, password, nombre, role, withFiscal = true, subscriptionPlan = null } = {}) {
  const regRes = await request(app)
    .post('/api/auth/registro')
    .send({ email, password, nombre, role });

  if (regRes.status === 503) {
    throw new Error('registerVerifiedUser: DB unavailable (503) — MMS should be wired by jest.setup-worker.js');
  }

  // Force-verify the user and (optionally) attach minimal fiscal data so
  // requiereDatosFacturacion passes.
  const Usuario = require('../../models/Usuario');
  const update = { emailVerificado: true };
  if (withFiscal) {
    update.datosFacturacion = {
      razonSocial: 'Test SL',
      nif: 'B12345678',
      direccion: 'Calle Test 1',
      cp: '28001',
      ciudad: 'Madrid',
      pais: 'ES',
      completado: true,
    };
  }
  if (subscriptionPlan) {
    update.subscription = {
      plan: subscriptionPlan,
      status: 'granted',
      currentPeriodStart: new Date(),
      currentPeriodEnd: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
    };
  }
  await Usuario.findOneAndUpdate({ email }, update);

  const loginRes = await request(app)
    .post('/api/auth/login')
    .send({ email, password });

  if (loginRes.status !== 200) {
    throw new Error(`registerVerifiedUser: login failed (${loginRes.status}) — body=${JSON.stringify(loginRes.body)}`);
  }

  return { user: loginRes.body.user, token: loginRes.body.token };
}

module.exports = { registerVerifiedUser };
