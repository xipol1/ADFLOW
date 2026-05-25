process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-secret';
process.env.JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'test-refresh-secret';

// Wire MONGODB_URI to the in-memory ReplSet started by jest.global-setup.js
// before any test file requires app.js / models. Each worker gets its own DB
// (jest_<workerId>) so they don't trample each other.
//
// useMongo() in tests/helpers/useMongo.js still exists for tests that want a
// hard reset (dropDatabase) between files, but plain "require('../app')" now
// gets a real Mongo by default instead of the 503-no-DB code path.
const baseUri = process.env.__MMS_URI__;
if (baseUri && !process.env.MONGODB_URI) {
  const workerId = process.env.JEST_WORKER_ID || '1';
  const url = new URL(baseUri);
  url.pathname = `/jest_${workerId}`;
  process.env.MONGODB_URI = url.toString();
}
