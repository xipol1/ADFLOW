/**
 * Redis client singleton — lazy-initialized.
 * Falls back gracefully: if REDIS_URL is not set, returns null.
 * All consumers MUST handle null (use in-memory fallback).
 */
const { createClient } = require('redis');

let clientPromise = null;
let client = null;

async function getRedisClient() {
  if (client) return client;
  if (clientPromise) return clientPromise;

  const url = process.env.REDIS_URL;
  if (!url) {
    console.warn('[redis] REDIS_URL not set — Redis features disabled');
    return null;
  }

  clientPromise = (async () => {
    try {
      const c = createClient({ url });
      c.on('error', (err) => console.error('[redis] Error:', err.message));
      c.on('reconnecting', () => console.log('[redis] Reconnecting...'));
      await c.connect();
      client = c;
      console.log('[redis] Connected');
      return client;
    } catch (err) {
      console.error('[redis] Connection failed:', err.message);
      clientPromise = null;
      return null;
    }
  })();

  return clientPromise;
}

function isRedisConnected() {
  return client?.isReady || false;
}

async function disconnectRedis() {
  if (client) {
    try {
      await client.quit();
      console.log('[redis] Disconnected');
    } catch (_) {}
    client = null;
    clientPromise = null;
  }
}

module.exports = { getRedisClient, isRedisConnected, disconnectRedis };
