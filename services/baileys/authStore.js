/**
 * MongoDB-backed auth state for Baileys.
 *
 * Baileys ships with `useMultiFileAuthState(folder)` which stores creds/keys
 * on the filesystem. That works great on a VPS but not on serverless or
 * multi-instance deployments. This module re-implements the same interface
 * against the BaileysSession Mongoose model.
 *
 * Baileys expects two things:
 *   - state.creds       — a single object with identity data
 *   - state.keys        — a key store with get/set methods
 *
 * Both values contain Buffers. We serialize them to base64 so Mongo can
 * round-trip them without corruption.
 */

'use strict';

const BaileysSession = require('../../models/BaileysSession');

// ─── Buffer ↔ base64 helpers ────────────────────────────────────────────────
// Baileys stores `Buffer` instances inside its creds/keys objects.
// MongoDB can store them as Binary, but mixing native Binary with plain
// objects is fragile — safer to convert to base64 strings and tag them.

const BUFFER_TAG = '__BUFFER__';

function encode(value) {
  if (value === null || value === undefined) return value;
  if (Buffer.isBuffer(value)) {
    return { [BUFFER_TAG]: value.toString('base64') };
  }
  if (value instanceof Uint8Array) {
    return { [BUFFER_TAG]: Buffer.from(value).toString('base64') };
  }
  if (Array.isArray(value)) {
    return value.map(encode);
  }
  if (typeof value === 'object') {
    const out = {};
    for (const [k, v] of Object.entries(value)) {
      out[k] = encode(v);
    }
    return out;
  }
  return value;
}

function decode(value) {
  if (value === null || value === undefined) return value;
  if (typeof value === 'object' && value[BUFFER_TAG] !== undefined) {
    return Buffer.from(value[BUFFER_TAG], 'base64');
  }
  if (Array.isArray(value)) {
    return value.map(decode);
  }
  if (typeof value === 'object') {
    const out = {};
    for (const [k, v] of Object.entries(value)) {
      out[k] = decode(v);
    }
    return out;
  }
  return value;
}

// ─── Baileys initial auth state builder ─────────────────────────────────────
// We can't require('@whiskeysockets/baileys') at module load because on
// Vercel the module may not be installed in every environment. Lazy-load it
// and fall back gracefully.

let _baileys = null;
function loadBaileys() {
  if (_baileys) return _baileys;
  try {
    _baileys = require('@whiskeysockets/baileys');
  } catch (err) {
    throw new Error('@whiskeysockets/baileys is not installed. Run: npm install @whiskeysockets/baileys');
  }
  return _baileys;
}

/**
 * Build a Baileys-compatible auth state object backed by a BaileysSession doc.
 *
 * @param {string} sessionId  Mongo ObjectId of the BaileysSession document
 * @returns {Promise<{ state, saveCreds }>}
 */
async function useMongoAuthState(sessionId) {
  const { initAuthCreds, BufferJSON, proto } = loadBaileys();

  const session = await BaileysSession.findById(sessionId);
  if (!session) throw new Error(`BaileysSession ${sessionId} not found`);

  // Initialize creds from DB or generate fresh ones
  let creds;
  if (session.creds) {
    // Round-trip via JSON using BufferJSON to restore Buffers
    const raw = JSON.stringify(session.creds);
    creds = JSON.parse(raw, BufferJSON.reviver);
  } else {
    creds = initAuthCreds();
  }

  // Key store — in-memory cache backed by DB
  const keysCache = session.keys ? decode(session.keys) : {};

  const keys = {
    get: async (type, ids) => {
      const result = {};
      for (const id of ids) {
        let value = keysCache[type]?.[id];
        if (value) {
          // Reconstruct protobuf for message keys
          if (type === 'app-state-sync-key' && value) {
            value = proto.Message.AppStateSyncKeyData.fromObject(value);
          }
          result[id] = value;
        }
      }
      return result;
    },
    set: async (data) => {
      // data is { [type]: { [id]: value | null } }
      for (const category in data) {
        if (!keysCache[category]) keysCache[category] = {};
        for (const id in data[category]) {
          const value = data[category][id];
          if (value === null || value === undefined) {
            delete keysCache[category][id];
          } else {
            keysCache[category][id] = value;
          }
        }
      }
      // Persist to DB
      await BaileysSession.findByIdAndUpdate(sessionId, {
        $set: { keys: encode(keysCache) },
      });
    },
  };

  const saveCreds = async () => {
    // Serialize creds with Baileys' BufferJSON replacer so Buffer fields
    // survive the round-trip.
    const serialized = JSON.parse(JSON.stringify(creds, BufferJSON.replacer));
    await BaileysSession.findByIdAndUpdate(sessionId, {
      $set: {
        creds: serialized,
        lastActivityAt: new Date(),
      },
    });
  };

  return {
    state: { creds, keys },
    saveCreds,
  };
}

module.exports = { useMongoAuthState, loadBaileys };
