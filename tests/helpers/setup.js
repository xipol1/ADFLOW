process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-secret';
process.env.JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'test-refresh-secret';

const request = require('supertest');
const app = require('../../app');

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
  const res = await request(app).post('/api/auth/registro').send(userData);
  return { user: res.body.user, token: res.body.token, refreshToken: res.body.refreshToken };
}

async function loginUser(email, password) {
  const res = await request(app).post('/api/auth/login').send({ email, password });
  return { user: res.body.user, token: res.body.token };
}

module.exports = { request, app, TEST_USER_CREATOR, TEST_USER_ADVERTISER, createTestUser, loginUser };
