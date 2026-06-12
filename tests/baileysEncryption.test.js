/**
 * At-rest encryption of Baileys session material (creds + keys).
 *
 * Guards the audit-S3 requirement: the full WhatsApp multi-device session must
 * never sit in Mongo as plaintext, and the persistence wrapper must be
 * fail-CLOSED — it never hands Baileys dubious material that would silently
 * regenerate credentials.
 */

'use strict';

// A valid 32-char key for the default module instance. Set BEFORE requiring
// any module so lib/encryption caches it.
const VALID_KEY = 'abcdefghijklmnopqrstuvwxyz012345'; // exactly 32 chars
process.env.ENCRYPTION_KEY = VALID_KEY;

const mongoose = require('mongoose');
const { isEncrypted } = require('../lib/encryption');

const {
  encryptPayload,
  decryptPayload,
  ENCRYPTED_VERSION,
} = require('../services/baileys/authStore');

// We can't `require('@whiskeysockets/baileys')` here: 7.x ships ESM and Jest's
// CommonJS runtime chokes on it (which is exactly why authStore lazy-loads it).
// The encryption boundary operates on the ALREADY-serialized payload — i.e.
// what BufferJSON.replacer produces — so we test against that shape directly.
// A Baileys Buffer becomes { type: 'Buffer', data: '<base64>' } pre-persistence.
function bufferShape(buf) {
  return { type: 'Buffer', data: buf.toString('base64') };
}

describe('Baileys at-rest encryption — round-trip', () => {
  test('Baileys-style serialized creds (Buffer fields) survive encrypt → decrypt', () => {
    const privKey = Buffer.from([1, 2, 3, 4, 5, 250, 251, 255]);
    // Shape mirrors `JSON.parse(JSON.stringify(creds, BufferJSON.replacer))`.
    const serialized = {
      noiseKey: { private: bufferShape(privKey), public: bufferShape(Buffer.from('pub')) },
      signedIdentityKey: { private: bufferShape(privKey) },
      registrationId: 42,
      me: { id: '34123@s.whatsapp.net' },
      registered: true,
    };

    const stored = encryptPayload(serialized);
    expect(typeof stored).toBe('string');
    expect(isEncrypted(stored)).toBe(true);

    const back = decryptPayload(stored, { encryptedVersion: ENCRYPTED_VERSION });
    expect(back).toEqual(serialized);

    // And the Buffer fields revive byte-for-byte (BufferJSON.reviver step).
    const revivedKey = Buffer.from(back.signedIdentityKey.private.data, 'base64');
    expect(revivedKey).toEqual(privKey);
  });

  test('keys map round-trips (deep-equal)', () => {
    const keys = { 'pre-key': { '1': { a: 1 } }, 'session': { abc: { b: 2 } } };
    const stored = encryptPayload(keys);
    expect(isEncrypted(stored)).toBe(true);
    expect(decryptPayload(stored, { encryptedVersion: ENCRYPTED_VERSION })).toEqual(keys);
  });
});

describe('Baileys at-rest encryption — fail-closed', () => {
  test('a plaintext string with encryptedVersion=1 throws (never trusted)', () => {
    expect(() => decryptPayload('plain-not-encrypted', { encryptedVersion: 1 }))
      .toThrow(/non-encrypted string/);
  });

  test('a plaintext string without any version still throws', () => {
    expect(() => decryptPayload('plain-not-encrypted', {}))
      .toThrow(/non-encrypted string/);
  });

  test('a plain object when the doc is already encryptedVersion=1 throws', () => {
    expect(() => decryptPayload({ foo: 'bar' }, { encryptedVersion: 1 }))
      .toThrow(/plain object/);
  });

  test('ciphertext encrypted with a DIFFERENT key throws (no garbage returned)', () => {
    // Encrypt under VALID_KEY (default instance)…
    const stored = encryptPayload({ secret: 'session' });

    // …then attempt to decrypt under a different key in an isolated registry.
    const OTHER_KEY = '543210zyxwvutsrqponmlkjihgfedcba'; // 32 chars, different
    let threw = false;
    jest.isolateModules(() => {
      const prev = process.env.ENCRYPTION_KEY;
      process.env.ENCRYPTION_KEY = OTHER_KEY;
      try {
        const { decryptPayload: dp } = require('../services/baileys/authStore');
        expect(() => dp(stored, { encryptedVersion: 1 })).toThrow();
        threw = true;
      } finally {
        process.env.ENCRYPTION_KEY = prev;
      }
    });
    expect(threw).toBe(true);
  });

  test('without ENCRYPTION_KEY, encrypting session material throws (error propagates)', () => {
    let asserted = false;
    jest.isolateModules(() => {
      const prev = process.env.ENCRYPTION_KEY;
      delete process.env.ENCRYPTION_KEY;
      try {
        const { encryptPayload: ep } = require('../services/baileys/authStore');
        expect(() => ep({ any: 'creds' })).toThrow(/ENCRYPTION_KEY/);
        asserted = true;
      } finally {
        process.env.ENCRYPTION_KEY = prev;
      }
    });
    expect(asserted).toBe(true);
  });
});

describe('Baileys at-rest encryption — legacy compat', () => {
  test('a legacy plain object with no encryptedVersion is read as-is', () => {
    const legacy = { me: { id: '123@s.whatsapp.net' }, registered: true };
    expect(decryptPayload(legacy, { encryptedVersion: null })).toEqual(legacy);
    expect(decryptPayload(legacy, {})).toEqual(legacy);
  });

  test('null/empty material reads as null (Baileys regenerates fresh creds)', () => {
    expect(decryptPayload(null, { encryptedVersion: null })).toBeNull();
    expect(decryptPayload(undefined, {})).toBeNull();
    expect(decryptPayload('', {})).toBeNull();
  });
});

describe('migrate-baileys-encrypt — DB migration + idempotency', () => {
  const { migrateBaileysSessions } = require('../scripts/migrate-baileys-encrypt');
  const BaileysSession = require('../models/BaileysSession');

  beforeAll(async () => {
    if (mongoose.connection.readyState !== 1) {
      await mongoose.connect(process.env.MONGODB_URI);
    }
  });

  afterAll(async () => {
    await BaileysSession.deleteMany({});
    await mongoose.disconnect();
  });

  test('encrypts a seeded legacy doc and is idempotent on re-run', async () => {
    // Seed a legacy plaintext session directly (bypassing the model so the
    // Mixed fields hold plain objects exactly like pre-migration data).
    const legacyCreds = { me: { id: '34123@s.whatsapp.net' }, registered: true };
    const legacyKeys = { 'pre-key': { '1': { keyPair: 'x' } } };
    const insert = await BaileysSession.collection.insertOne({
      usuarioId: new mongoose.Types.ObjectId(),
      status: 'connected',
      creds: legacyCreds,
      keys: legacyKeys,
      // no encryptedVersion → legacy
    });
    const id = insert.insertedId;

    // Dry-run first: counts but writes nothing.
    const dry = await migrateBaileysSessions({ apply: false, log: () => {} });
    expect(dry.migrated).toBe(1);
    const stillPlain = await BaileysSession.collection.findOne({ _id: id });
    expect(typeof stillPlain.creds).toBe('object');
    expect(stillPlain.encryptedVersion).toBeUndefined();

    // Apply.
    const first = await migrateBaileysSessions({ apply: true, log: () => {} });
    expect(first.migrated).toBe(1);

    const migrated = await BaileysSession.collection.findOne({ _id: id });
    expect(migrated.encryptedVersion).toBe(ENCRYPTED_VERSION);
    expect(typeof migrated.creds).toBe('string');
    expect(isEncrypted(migrated.creds)).toBe(true);
    expect(isEncrypted(migrated.keys)).toBe(true);

    // The encrypted values decrypt back to the originals.
    expect(decryptPayload(migrated.creds, migrated)).toEqual(legacyCreds);
    expect(decryptPayload(migrated.keys, migrated)).toEqual(legacyKeys);

    // Second pass: nothing left to migrate (idempotent, no double-encrypt).
    const second = await migrateBaileysSessions({ apply: true, log: () => {} });
    expect(second.migrated).toBe(0);

    const afterTwice = await BaileysSession.collection.findOne({ _id: id });
    expect(afterTwice.creds).toBe(migrated.creds); // unchanged ciphertext
    expect(decryptPayload(afterTwice.creds, afterTwice)).toEqual(legacyCreds);
  });
});
