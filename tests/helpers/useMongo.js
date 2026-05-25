// Opt-in helper for tests that want a hard DB reset between files.
//
// Usage inside a test file:
//
//   const { useMongo } = require('./helpers/useMongo');
//   useMongo();   // dropDatabase() before this file's tests
//
// MONGODB_URI is now set globally by tests/jest.setup-worker.js (pointing at
// the in-memory ReplSet from tests/jest.global-setup.js), so most tests get
// a real Mongo by default. Call useMongo() only when you need a clean slate.
function useMongo() {
  beforeAll(async () => {
    const database = require('../../config/database');
    if (!database.estaConectado()) await database.conectar();

    const mongoose = require('mongoose');
    if (mongoose.connection?.readyState === 1) {
      await mongoose.connection.dropDatabase().catch(() => {});
    }

    // Re-probe transaction support against the (now fresh) deployment.
    try {
      require('../../lib/withTransaction').__resetForTests();
    } catch { /* withTransaction may not exist in older branches */ }
  });
}

module.exports = { useMongo };
