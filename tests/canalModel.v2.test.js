/**
 * Canal schema v2.0 extension tests.
 *
 * These tests exercise the Mongoose schema without a DB connection. They
 * validate defaults, enum ranges, and that the new scoring fields don't
 * break existing documents.
 */
const Canal = require('../models/Canal');

function buildCanal(overrides = {}) {
  // Minimal required shape — propietario is optional, plataforma and
  // identificadorCanal are required by the base schema.
  return new Canal({
    plataforma: 'telegram',
    identificadorCanal: 'testchan',
    ...overrides,
  });
}

describe('Canal schema v2.0 — scoring defaults', () => {
  test('all six propietary scores default to 50', () => {
    const canal = buildCanal();
    expect(canal.CAF).toBe(50);
    expect(canal.CTF).toBe(50);
    expect(canal.CER).toBe(50);
    expect(canal.CVS).toBe(50);
    expect(canal.CAP).toBe(50);
    expect(canal.CAS).toBe(50);
  });

  test('nivel defaults to BRONZE', () => {
    const canal = buildCanal();
    expect(canal.nivel).toBe('BRONZE');
  });

  test('CPMDinamico defaults to 0', () => {
    const canal = buildCanal();
    expect(canal.CPMDinamico).toBe(0);
  });

  test('score values outside [0, 100] fail validation', async () => {
    const canal = buildCanal({ CAS: 150 });
    const err = canal.validateSync();
    expect(err).toBeDefined();
    expect(err.errors.CAS).toBeDefined();
  });

  test('negative score values fail validation', () => {
    const canal = buildCanal({ CTF: -1 });
    const err = canal.validateSync();
    expect(err).toBeDefined();
    expect(err.errors.CTF).toBeDefined();
  });

  test('nivel enum rejects unknown values', () => {
    const canal = buildCanal({ nivel: 'DIAMOND' });
    const err = canal.validateSync();
    expect(err).toBeDefined();
    expect(err.errors.nivel).toBeDefined();
  });

  test('all four nivel enum values are accepted', () => {
    for (const lvl of ['BRONZE', 'SILVER', 'GOLD', 'ELITE']) {
      const canal = buildCanal({ nivel: lvl });
      expect(canal.validateSync()).toBeUndefined();
    }
  });
});

describe('Canal schema v2.0 — verification enrichment', () => {
  test('verificacion.tipoAcceso defaults to declarado', () => {
    const canal = buildCanal();
    expect(canal.verificacion.tipoAcceso).toBe('declarado');
  });

  test('verificacion.confianzaScore defaults to 30', () => {
    const canal = buildCanal();
    expect(canal.verificacion.confianzaScore).toBe(30);
  });

  test('verificacion.tipoAcceso enum rejects unknown values', () => {
    const canal = buildCanal({ verificacion: { tipoAcceso: 'telepatia' } });
    const err = canal.validateSync();
    expect(err).toBeDefined();
    expect(err.errors['verificacion.tipoAcceso']).toBeDefined();
  });

  test('all five tipoAcceso enum values are accepted', () => {
    const accepted = ['admin_directo', 'oauth_graph', 'bot_miembro', 'tracking_url', 'declarado'];
    for (const tipo of accepted) {
      const canal = buildCanal({ verificacion: { tipoAcceso: tipo } });
      expect(canal.validateSync()).toBeUndefined();
    }
  });

  test('confianzaScore outside [0, 100] fails validation', () => {
    const canal = buildCanal({ verificacion: { confianzaScore: 150 } });
    const err = canal.validateSync();
    expect(err).toBeDefined();
  });
});

describe('Canal schema v2.0 — antifraude & crawler', () => {
  test('antifraude.flags defaults to empty array', () => {
    const canal = buildCanal();
    expect(Array.isArray(canal.antifraude.flags)).toBe(true);
    expect(canal.antifraude.flags.length).toBe(0);
  });

  test('antifraude.ratioCTF_CAF defaults to null', () => {
    const canal = buildCanal();
    expect(canal.antifraude.ratioCTF_CAF).toBeNull();
  });

  test('crawler fields default empty/null without breaking', () => {
    const canal = buildCanal();
    expect(canal.crawler.ultimoPostNum).toBeNull();
    expect(canal.crawler.ultimaActualizacion).toBeNull();
    expect(canal.crawler.urlPublica).toBe('');
  });

  test('crawler data round-trips correctly', () => {
    const canal = buildCanal({
      crawler: {
        ultimoPostNum: 42,
        urlPublica: 'https://t.me/examplechannel',
        ultimaActualizacion: new Date('2026-04-01'),
      },
    });
    expect(canal.crawler.ultimoPostNum).toBe(42);
    expect(canal.crawler.urlPublica).toBe('https://t.me/examplechannel');
    expect(canal.validateSync()).toBeUndefined();
  });
});

describe('Canal schema v2.0 — backwards compatibility', () => {
  test('existing-style document without any v2 fields still validates', () => {
    // Simulates a document loaded from the DB that was created before v2.
    // Mongoose will hydrate defaults for missing paths.
    const canal = buildCanal({
      nombreCanal: 'Legacy Channel',
      estadisticas: { seguidores: 12000 },
    });
    expect(canal.validateSync()).toBeUndefined();
    expect(canal.CAS).toBe(50); // default kicks in
    expect(canal.nivel).toBe('BRONZE');
  });

  test('legacy nivelVerificacion field is preserved alongside new nivel', () => {
    const canal = buildCanal({ nivelVerificacion: 'oro' });
    expect(canal.nivelVerificacion).toBe('oro');
    expect(canal.nivel).toBe('BRONZE'); // new field has its own default
    expect(canal.validateSync()).toBeUndefined();
  });
});
