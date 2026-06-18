process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-secret';
process.env.JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'test-refresh-secret';

const request = require('supertest');
const app = require('../../app');
const legalConsent = require('../../services/legalConsent');

const TEST_USER_CREATOR = {
  email: `test-creator-${Date.now()}@test.com`,
  password: 'TestPass123',
  nombre: 'Test Creator',
  role: 'creator',
};

const TEST_USER_ADVERTISER = {
  email: `test-advertiser-${Date.now()}@test.com`,
  password: 'TestPass123',
  nombre: 'Test Advertiser',
  role: 'advertiser',
};

async function createTestUser(userData) {
  // Registration no longer issues auth tokens (email verification required),
  // so the helper now performs an immediate login to keep callers working.
  // It also enforces clickwrap acceptance of the role's required legal docs, so
  // include the consents for the effective role (default: advertiser).
  const effectiveRole = userData.role === 'creator' ? 'creator' : 'advertiser';
  const consents = legalConsent.requiredDocsForRole(effectiveRole).map((d) => ({ slug: d.slug, version: d.version }));
  const regRes = await request(app).post('/api/auth/registro').send({ ...userData, consents });
  if (regRes.status !== 201) {
    return { user: regRes.body.user, token: undefined, refreshToken: undefined };
  }
  const logRes = await request(app)
    .post('/api/auth/login')
    .send({ email: userData.email, password: userData.password });
  return { user: logRes.body.user, token: logRes.body.token, refreshToken: logRes.body.refreshToken };
}

async function loginUser(email, password) {
  const res = await request(app).post('/api/auth/login').send({ email, password });
  return { user: res.body.user, token: res.body.token };
}

module.exports = { request, app, TEST_USER_CREATOR, TEST_USER_ADVERTISER, createTestUser, loginUser };
