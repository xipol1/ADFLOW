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
const encryption = require('../../lib/encryption');

// ─── At-rest encryption of session material ─────────────────────────────────
// `creds` and `keys` are the user's full WhatsApp multi-device session — anyone
// who can read them from Mongo can hijack the account. We encrypt them at the
// persistence boundary with the shared AES-256-GCM helper (lib/encryption.js,
// keyed by ENCRYPTION_KEY). Documents written by this version are tagged
// `encryptedVersion: 1`; scripts/migrate-baileys-encrypt.js upgrades legacy
// plaintext docs.
//
// Unlike lib/encryption.decrypt() (backward-compat fail-OPEN), this wrapper is
// fail-CLOSED: it never hands Baileys dubious session material that would make
// it silently regenerate credentials. A present-but-not-encrypted string, or a
// ciphertext that won't decrypt (wrong key / bad authTag), THROWS.

const ENCRYPTED_VERSION = 1;

function encryptPayload(obj) {
  return encryption.encrypt(JSON.stringify(obj));
}

/**
 * Turn a stored creds/keys value back into a plain JS object.
 * @param {string|object|null} stored  The raw value from doc.creds / doc.keys
 * @param {object} doc                  The BaileysSession doc (for encryptedVersion)
 * @returns {object|null} parsed payload, or null when there is no material
 */
function decryptPayload(stored, doc) {
  if (stored === null || stored === undefined || stored === '') return null;

  if (typeof stored === 'string') {
    if (encryption.isEncrypted(stored)) {
      // decrypt() throws on a bad key / authTag — that propagates (fail-closed).
      return JSON.parse(encryption.decrypt(stored));
    }
    // A plaintext string is never legitimate session material here.
    throw new Error(
      `BaileysSession ${doc?._id}: payload is a non-encrypted string — refusing to use (fail-closed)`
    );
  }

  if (typeof stored === 'object') {
    // Legacy plaintext object: accept ONLY while the doc is un-migrated.
    if (doc?.encryptedVersion === ENCRYPTED_VERSION) {
      throw new Error(
        `BaileysSession ${doc?._id}: encryptedVersion=1 but payload is a plain object — refusing (fail-closed)`
      );
    }
    return stored;
  }

  throw new Error(
    `BaileysSession ${doc?._id}: payload has unexpected type ${typeof stored} — refusing (fail-closed)`
  );
}

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
  const storedCreds = decryptPayload(session.creds, session);
  if (storedCreds) {
    // Round-trip via JSON using BufferJSON to restore Buffers
    const raw = JSON.stringify(storedCreds);
    creds = JSON.parse(raw, BufferJSON.reviver);
  } else {
    creds = initAuthCreds();
  }

  // Key store — in-memory cache backed by DB
  const storedKeys = decryptPayload(session.keys, session);
  const keysCache = storedKeys ? decode(storedKeys) : {};

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
      // Persist to DB (encrypted at rest — encrypt() throws if no key set).
      await BaileysSession.findByIdAndUpdate(sessionId, {
        $set: {
          keys: encryptPayload(encode(keysCache)),
          encryptedVersion: ENCRYPTED_VERSION,
        },
      });
    },
  };

  const saveCreds = async () => {
    // Serialize creds with Baileys' BufferJSON replacer so Buffer fields
    // survive the round-trip, then encrypt the serialized payload at rest.
    const serialized = JSON.parse(JSON.stringify(creds, BufferJSON.replacer));
    await BaileysSession.findByIdAndUpdate(sessionId, {
      $set: {
        creds: encryptPayload(serialized),
        encryptedVersion: ENCRYPTED_VERSION,
        lastActivityAt: new Date(),
      },
    });
  };

  return {
    state: { creds, keys },
    saveCreds,
  };
}

module.exports = {
  useMongoAuthState,
  loadBaileys,
  // Exported for the migration script and tests.
  encryptPayload,
  decryptPayload,
  ENCRYPTED_VERSION,
};
