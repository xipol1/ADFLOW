/**
 * asDisplayName — never render "[object Object]" for a WhatsApp newsletter name.
 *
 * Regression guard for the bug where a channel resolved by public invite link
 * returned `name` as an object, which showed as "[object Object]" in the picker.
 */
const { asDisplayName } = require('../services/baileys/displayName');

describe('asDisplayName', () => {
  test('returns a non-empty string as-is', () => {
    expect(asDisplayName('Tech News ES')).toBe('Tech News ES');
  });

  test('falls through to the next candidate when the first is empty/blank', () => {
    expect(asDisplayName('', '   ', 'Fallback')).toBe('Fallback');
  });

  test('extracts a text subfield from an object name (no [object Object])', () => {
    expect(asDisplayName({ text: 'Canal Real' })).toBe('Canal Real');
    expect(asDisplayName({ value: 'Por value' })).toBe('Por value');
    expect(asDisplayName({ name: 'Por name' })).toBe('Por name');
  });

  test('prefers an earlier valid candidate over a later one', () => {
    expect(asDisplayName('Primero', { text: 'Segundo' })).toBe('Primero');
  });

  test('uses thread_metadata-style fallback object when primary is an opaque object', () => {
    // primary object has no known text subfield → move on to the next candidate
    expect(asDisplayName({ foo: 'bar' }, { text: 'Desde thread' })).toBe('Desde thread');
  });

  test('never returns "[object Object]" for opaque/empty/nullish input', () => {
    expect(asDisplayName({ foo: 'bar' })).toBe('(sin nombre)');
    expect(asDisplayName(null, undefined, {}, 0, false)).toBe('(sin nombre)');
    expect(asDisplayName()).toBe('(sin nombre)');
    expect(String(asDisplayName({}))).not.toBe('[object Object]');
  });
});
