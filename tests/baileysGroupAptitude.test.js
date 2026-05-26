'use strict';

const {
  APTO_MIN_PARTICIPANTS,
  evaluateGroupAptitude,
  normalizeJid,
} = require('../services/baileys/groupAptitude');

// The threshold lives next to the rules; if it ever changes we want this
// canary to flag it so the test cases (and the sales-pitch UI copy) get
// reviewed together.
describe('APTO_MIN_PARTICIPANTS', () => {
  test('current threshold is 200 members', () => {
    expect(APTO_MIN_PARTICIPANTS).toBe(200);
  });
});

describe('evaluateGroupAptitude', () => {
  test('admin + big regular group → apto with positive reason', () => {
    const { apto, reasons } = evaluateGroupAptitude({
      isAdmin: true,
      isAnnounce: false,
      count: 1024,
    });
    expect(apto).toBe(true);
    expect(reasons).toContain('Cumple criterios: eres admin y tiene 1024 miembros');
  });

  test('admin + too small → not apto, reason includes member count + threshold', () => {
    const { apto, reasons } = evaluateGroupAptitude({
      isAdmin: true,
      isAnnounce: false,
      count: 150,
    });
    expect(apto).toBe(false);
    expect(reasons).toEqual([
      'Tiene 150 miembros — mínimo 200 para monetizar',
    ]);
  });

  test('non-admin + big → not apto, reason "No eres administrador"', () => {
    const { apto, reasons } = evaluateGroupAptitude({
      isAdmin: false,
      isAnnounce: false,
      count: 800,
    });
    expect(apto).toBe(false);
    expect(reasons).toContain('No eres administrador del grupo');
    expect(reasons).not.toContain(expect.stringContaining('Cumple criterios'));
  });

  test('admin + big + announce → not apto, advises Newsletter conversion', () => {
    const { apto, reasons } = evaluateGroupAptitude({
      isAdmin: true,
      isAnnounce: true,
      count: 1500,
    });
    expect(apto).toBe(false);
    expect(reasons).toContain(
      'Grupo solo-anuncios — conviértelo en Canal (Newsletter) para Channelad'
    );
  });

  test('non-admin + too small → both reasons present', () => {
    const { reasons } = evaluateGroupAptitude({
      isAdmin: false,
      isAnnounce: false,
      count: 28,
    });
    expect(reasons).toEqual([
      'No eres administrador del grupo',
      'Tiene 28 miembros — mínimo 200 para monetizar',
    ]);
  });

  test('boundary: exactly APTO_MIN_PARTICIPANTS members is apto', () => {
    const { apto } = evaluateGroupAptitude({
      isAdmin: true,
      isAnnounce: false,
      count: APTO_MIN_PARTICIPANTS,
    });
    expect(apto).toBe(true);
  });

  test('boundary: one below the threshold is not apto', () => {
    const { apto, reasons } = evaluateGroupAptitude({
      isAdmin: true,
      isAnnounce: false,
      count: APTO_MIN_PARTICIPANTS - 1,
    });
    expect(apto).toBe(false);
    expect(reasons[0]).toMatch(/199 miembros/);
  });

  test('garbage input (undefined count) → not apto, no NaN in reason', () => {
    const { apto, reasons } = evaluateGroupAptitude({
      isAdmin: true,
      isAnnounce: false,
      count: undefined,
    });
    expect(apto).toBe(false);
    expect(reasons.join(' ')).not.toMatch(/NaN/);
    expect(reasons).toContain('Tiene 0 miembros — mínimo 200 para monetizar');
  });

  test('empty input object → not apto, no crash', () => {
    expect(() => evaluateGroupAptitude({})).not.toThrow();
    expect(() => evaluateGroupAptitude(undefined)).not.toThrow();
    const { apto } = evaluateGroupAptitude({});
    expect(apto).toBe(false);
  });
});

describe('normalizeJid', () => {
  // The regression we're guarding against: the previous code did
  //   `id.split(':')[0] + '@s.whatsapp.net'`
  // which produced `…@s.whatsapp.net@s.whatsapp.net` for bare-jid inputs,
  // breaking the admin lookup so every group looked "no eres admin".

  test('bare user → adds @s.whatsapp.net', () => {
    expect(normalizeJid('34611')).toBe('34611@s.whatsapp.net');
  });

  test('jid with device resource → drops :N, keeps server', () => {
    expect(normalizeJid('34611:5@s.whatsapp.net')).toBe('34611@s.whatsapp.net');
  });

  test('bare jid (no resource) → returned as-is, NO double suffix', () => {
    expect(normalizeJid('34611@s.whatsapp.net')).toBe('34611@s.whatsapp.net');
  });

  test('LID identity preserves @lid server', () => {
    expect(normalizeJid('abc123:1@lid')).toBe('abc123@lid');
  });

  test('falsy input → empty string (never crashes find())', () => {
    expect(normalizeJid('')).toBe('');
    expect(normalizeJid(null)).toBe('');
    expect(normalizeJid(undefined)).toBe('');
  });

  test('two normalized forms of the same id compare equal', () => {
    expect(normalizeJid('34611:5@s.whatsapp.net')).toBe(normalizeJid('34611'));
    expect(normalizeJid('34611:5@s.whatsapp.net')).toBe(normalizeJid('34611@s.whatsapp.net'));
  });
});
