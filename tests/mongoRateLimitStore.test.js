const MongoRateLimitStore = require('../middleware/mongoRateLimitStore');

// Each test file gets a real in-memory Mongo via tests/jest.global-setup.js +
// jest.setup-worker.js (MONGODB_URI is pre-wired). Connect mongoose once.
beforeAll(async () => {
  const database = require('../config/database');
  if (!database.estaConectado()) await database.conectar();
});

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// Unique key per test so cases never collide in the shared collection.
let counter = 0;
const freshKey = () => `test-key-${Date.now()}-${counter++}`;

describe('MongoRateLimitStore', () => {
  test('increment accumulates hits within an open window', async () => {
    const store = new MongoRateLimitStore({ collectionName: 'rateLimits_test' });
    store.init({ windowMs: 60_000 });
    const key = freshKey();

    const a = await store.increment(key);
    const b = await store.increment(key);
    const c = await store.increment(key);

    expect(a.totalHits).toBe(1);
    expect(b.totalHits).toBe(2);
    expect(c.totalHits).toBe(3);
    // resetTime is stable across hits in the same window.
    expect(a.resetTime.getTime()).toBe(c.resetTime.getTime());
    expect(a.resetTime.getTime()).toBeGreaterThan(Date.now());
  });

  test('starts a fresh window once the previous one expires', async () => {
    const store = new MongoRateLimitStore({ collectionName: 'rateLimits_test' });
    store.init({ windowMs: 50 });
    const key = freshKey();

    const first = await store.increment(key);
    const second = await store.increment(key);
    expect(first.totalHits).toBe(1);
    expect(second.totalHits).toBe(2);

    await sleep(70); // let the 50ms window lapse

    const third = await store.increment(key);
    expect(third.totalHits).toBe(1); // reset, not 3
    expect(third.resetTime.getTime()).toBeGreaterThan(second.resetTime.getTime());
  });

  test('decrement lowers the counter but never below zero', async () => {
    const store = new MongoRateLimitStore({ collectionName: 'rateLimits_test' });
    store.init({ windowMs: 60_000 });
    const key = freshKey();

    await store.increment(key); // 1
    await store.increment(key); // 2
    await store.decrement(key); // 1
    const after = await store.increment(key); // 2
    expect(after.totalHits).toBe(2);

    // Drain below zero — must clamp.
    await store.decrement(key);
    await store.decrement(key);
    await store.decrement(key);
    const doc = await store._model().findById(key).lean();
    expect(doc.count).toBeGreaterThanOrEqual(0);
  });

  test('resetKey clears a client entirely', async () => {
    const store = new MongoRateLimitStore({ collectionName: 'rateLimits_test' });
    store.init({ windowMs: 60_000 });
    const key = freshKey();

    await store.increment(key);
    await store.increment(key);
    await store.resetKey(key);

    const next = await store.increment(key);
    expect(next.totalHits).toBe(1); // counting started over
  });

  test('fail-open: a broken store never blocks (returns one hit)', async () => {
    const store = new MongoRateLimitStore({ collectionName: 'rateLimits_test' });
    store.init({ windowMs: 30_000 });
    // Force the model layer to throw.
    store.Model = {
      findOneAndUpdate: () => {
        throw new Error('mongo down');
      },
    };
    const res = await store.increment('whatever');
    expect(res.totalHits).toBe(1);
    expect(res.resetTime.getTime()).toBeGreaterThan(Date.now());
  });
});
