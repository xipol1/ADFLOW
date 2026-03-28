require('dotenv').config();

const app = require('../app');
const request = require('supertest');

const run = async () => {
  const health = await request(app).get('/api/health');
  console.log('GET /api/health', health.statusCode, health.body);

  const list = await request(app).get('/api/channels');
  console.log('GET /api/channels', list.statusCode);

  const mine = await request(app).get('/api/channels/mine');
  console.log('GET /api/channels/mine', mine.statusCode, mine.body);
};

run().catch((e) => {
  console.error(e);
  process.exit(1);
});

