const mongoose = require('mongoose');
const CanalScoreSnapshot = require('../models/CanalScoreSnapshot');

function buildSnapshot(overrides = {}) {
  return new CanalScoreSnapshot({
    canalId: new mongoose.Types.ObjectId(),
    CAF: 60, CTF: 55, CER: 48, CVS: 50, CAP: 62, CAS: 57,
    nivel: 'SILVER',
    seguidores: 21000,
    nicho: 'crypto',
    plataforma: 'telegram',
    ...overrides,
  });
}

describe('CanalScoreSnapshot — required fields and defaults', () => {
  test('valid snapshot passes validation', () => {
    const snap = buildSnapshot();
    expect(snap.validateSync()).toBeUndefined();
  });

  test('canalId is required', () => {
    const snap = buildSnapshot({ canalId: undefined });
    const err = snap.validateSync();
    expect(err).toBeDefined();
    expect(err.errors.canalId).toBeDefined();
  });

  test('all six scores are required', () => {
    for (const field of ['CAF', 'CTF', 'CER', 'CVS', 'CAP', 'CAS']) {
      const snap = buildSnapshot({ [field]: undefined });
      const err = snap.validateSync();
      expect(err).toBeDefined();
      expect(err.errors[field]).toBeDefined();
    }
  });

  test('nivel is required and enum-restricted', () => {
    const missing = buildSnapshot({ nivel: undefined });
    expect(missing.validateSync()).toBeDefined();

    const bad = buildSnapshot({ nivel: 'DIAMOND' });
    expect(bad.validateSync().errors.nivel).toBeDefined();

    for (const n of ['BRONZE', 'SILVER', 'GOLD', 'ELITE']) {
      expect(buildSnapshot({ nivel: n }).validateSync()).toBeUndefined();
    }
  });

  test('score values outside [0, 100] fail validation', () => {
    const high = buildSnapshot({ CAS: 150 });
    expect(high.validateSync().errors.CAS).toBeDefined();

    const low = buildSnapshot({ CTF: -1 });
    expect(low.validateSync().errors.CTF).toBeDefined();
  });

  test('fecha defaults to now when not supplied', () => {
    const before = Date.now();
    const snap = buildSnapshot();
    const after = Date.now();
    expect(snap.fecha).toBeInstanceOf(Date);
    expect(snap.fecha.getTime()).toBeGreaterThanOrEqual(before - 5);
    expect(snap.fecha.getTime()).toBeLessThanOrEqual(after + 5);
  });
});

describe('CanalScoreSnapshot — seguidores is a plain point-in-time number', () => {
  test('seguidores is stored as a plain Number, not a reference', () => {
    const snap = buildSnapshot({ seguidores: 21000 });
    expect(typeof snap.seguidores).toBe('number');
    expect(snap.seguidores).toBe(21000);
  });

  test('two snapshots of the same channel can hold different follower counts', () => {
    const canalId = new mongoose.Types.ObjectId();
    const old = buildSnapshot({ canalId, seguidores: 21000 });
    const recent = buildSnapshot({ canalId, seguidores: 50000 });
    expect(old.seguidores).toBe(21000);
    expect(recent.seguidores).toBe(50000);
    expect(old.canalId.toString()).toBe(recent.canalId.toString());
  });

  test('seguidores schema path is a Number, not an ObjectId ref', () => {
    const path = CanalScoreSnapshot.schema.path('seguidores');
    expect(path.instance).toBe('Number');
    expect(path.options.ref).toBeUndefined();
  });
});

describe('CanalScoreSnapshot — version field', () => {
  test('version defaults to 2 (current engine)', () => {
    const snap = buildSnapshot();
    expect(snap.version).toBe(2);
  });

  test('version can be overridden to track future engine upgrades', () => {
    const snap = buildSnapshot({ version: 3 });
    expect(snap.version).toBe(3);
    expect(snap.validateSync()).toBeUndefined();
  });
});

describe('CanalScoreSnapshot — indexes', () => {
  const indexes = CanalScoreSnapshot.schema.indexes();

  test('has compound index { canalId: 1, fecha: -1 }', () => {
    const match = indexes.find(
      ([spec]) => spec.canalId === 1 && spec.fecha === -1,
    );
    expect(match).toBeDefined();
  });

  test('has CRITICAL index { nicho: 1, fecha: -1 } for niche benchmark recalibration', () => {
    const match = indexes.find(
      ([spec]) => spec.nicho === 1 && spec.fecha === -1,
    );
    expect(match).toBeDefined();
  });

  test('has global time-range index { fecha: -1 }', () => {
    const match = indexes.find(
      ([spec]) => spec.fecha === -1 && !('canalId' in spec) && !('nicho' in spec),
    );
    expect(match).toBeDefined();
  });

  test('no TTL index is defined anywhere (snapshots are permanent)', () => {
    // TTL is expressed as { expireAfterSeconds: N } on an index's options.
    for (const [, options = {}] of indexes) {
      expect(options.expireAfterSeconds).toBeUndefined();
    }
    // Also ensure no individual path has `expires`.
    CanalScoreSnapshot.schema.eachPath((_name, type) => {
      expect(type.options && type.options.expires).toBeFalsy();
    });
  });

  test('collection is not capped', () => {
    const opts = CanalScoreSnapshot.schema.get('capped');
    expect(!opts).toBe(true);
  });
});
