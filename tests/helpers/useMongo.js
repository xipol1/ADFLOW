// Opt-in helper for tests that need a real Mongo connection.
//
// Usage inside a test file:
//
//   const { useMongo } = require('./helpers/useMongo');
//   useMongo();   // connects + drops the DB before this file's tests
//
// Uses the in-memory Mongo server started by tests/jest.global-setup.js
// (URI exposed as process.env.__MMS_URI__). Each jest worker gets its own
// DB suffixed by JEST_WORKER_ID so workers don't trample each other.
//
// We intentionally do NOT auto-connect every test file: many existing
// "integration" tests are written to bail out when DB is unavailable
// (if (res.status === 503) return) and would silently exercise different
// code paths if we forced a connection.
//
// The afterAll restores the no-DB state so subsequent files in the same
// jest worker don't inherit a live connection and accidentally exit their
// 503-bail branches. Doing this only here (not in a global hook) avoids
// the cross-file "Operation buffering timed out" race we hit when every
// file disconnected.
function useMongo() {
  const database = require('../../config/database');

  beforeAll(async () => {
    const baseUri = process.env.__MMS_URI__;
    if (!baseUri) throw new Error('useMongo: MMS not started — check jest.global-setup.js');

    const workerId = process.env.JEST_WORKER_ID || '1';
    const url = new URL(baseUri);
    url.pathname = `/jest_${workerId}`;
    process.env.MONGODB_URI = url.toString();

    if (!database.estaConectado()) await database.conectar();

    const mongoose = require('mongoose');
    if (mongoose.connection?.readyState === 1) {
      await mongoose.connection.dropDatabase().catch(() => {});
    }
  });

  afterAll(async () => {
    try { await database.desconectar(); } catch { /* noop */ }
    delete process.env.MONGODB_URI;
  });
}

module.exports = { useMongo };
