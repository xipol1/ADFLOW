/**
 * Unit tests for the public channel intelligence service. We mock the
 * model layer and verify the service's privacy and shape guarantees.
 */

jest.mock('../lib/ensureDb', () => ({ ensureDb: jest.fn().mockResolvedValue(true) }));

const {
  filterPublicFlags,
  estimateNichePosition,
  benchmarkSummary,
  PUBLIC_FLAG_WHITELIST,
  NINETY_DAYS_MS,
} = require('../services/channelIntelligenceService');

// ── filterPublicFlags ────────────────────────────────────────────────────
describe('filterPublicFlags — privacy guard', () => {
  test('returns an empty array when input is missing or not an array', () => {
    expect(filterPublicFlags(null)).toEqual([]);
    expect(filterPublicFlags(undefined)).toEqual([]);
    expect(filterPublicFlags('bot_farm_sospechoso')).toEqual([]);
  });

  test('passes through whitelisted flags', () => {
    const flags = ['datos_no_verificados', 'verificacion_pendiente', 'sin_campanas_historicas'];
    expect(filterPublicFlags(flags)).toEqual(flags);
  });

  test('STRIPS sensitive internal flags (bot_farm_sospechoso, engagement_bajo)', () => {
    const flags = [
      'bot_farm_sospechoso',
      'engagement_bajo',
      'datos_no_verificados', // whitelisted
    ];
    const result = filterPublicFlags(flags);
    expect(result).toEqual(['datos_no_verificados']);
    expect(result).not.toContain('bot_farm_sospechoso');
    expect(result).not.toContain('engagement_bajo');
  });

  test('the whitelist contains only safe public flags', () => {
    const whitelist = Array.from(PUBLIC_FLAG_WHITELIST);
    for (const flag of whitelist) {
      expect(flag).not.toMatch(/fraud|bot|sospech|banned|penal/i);
    }
  });
});

// ── estimateNichePosition ───────────────────────────────────────────────
describe('estimateNichePosition', () => {
  test('maps CAS into ordered positional buckets', () => {
    expect(estimateNichePosition(90)).toBe('top 10% del nicho');
    expect(estimateNichePosition(75)).toBe('top 25% del nicho');
    expect(estimateNichePosition(60)).toBe('top 50% del nicho');
    expect(estimateNichePosition(45)).toBe('top 75% del nicho');
    expect(estimateNichePosition(30)).toBe('últimos percentiles del nicho');
  });

  test('handles null / undefined / garbage gracefully', () => {
    expect(estimateNichePosition(null)).toBe('últimos percentiles del nicho');
    expect(estimateNichePosition(undefined)).toBe('últimos percentiles del nicho');
    expect(estimateNichePosition('oops')).toBe('últimos percentiles del nicho');
  });
});

// ── benchmarkSummary ─────────────────────────────────────────────────────
describe('benchmarkSummary', () => {
  test('returns nichoMediaCTR from NICHE_BENCHMARKS p50', () => {
    const s = benchmarkSummary('crypto', 0.022);
    expect(s.nichoMediaCTR).toBe(0.022);
    expect(s.canalCTRRatio).toMatch(/^[+-]?\d/);
    expect(s.canalCTRRatio).toMatch(/vs la media del nicho/);
  });

  test('falls back to otros for unknown niches', () => {
    const s = benchmarkSummary('moda', 0.020);
    expect(s.nichoMediaCTR).toBeGreaterThan(0);
  });

  test('canalCTRRatio is null when ctr is 0', () => {
    const s = benchmarkSummary('crypto', 0);
    expect(s.canalCTRRatio).toBeNull();
  });

  test('ninety-day window constant equals 90 × 24h in ms', () => {
    expect(NINETY_DAYS_MS).toBe(90 * 24 * 60 * 60 * 1000);
  });
});

// ── buildChannelIntelligence (mocked model layer) ───────────────────────
describe('buildChannelIntelligence — end-to-end shape and privacy', () => {
  let service;

  beforeEach(() => {
    jest.resetModules();
    jest.doMock('../lib/ensureDb', () => ({ ensureDb: jest.fn().mockResolvedValue(true) }));

    jest.doMock('../models/Canal', () => ({
      findOne: jest.fn(() => ({
        lean: async () => ({
          _id: 'canal-1',
          nombreCanal: 'Crypto Daily',
          plataforma: 'telegram',
          categoria: 'crypto',
          descripcion: 'Daily crypto alerts',
          estado: 'activo',
          estadisticas: { seguidores: 21000 },
          CAS: 72, CAF: 65, CTF: 70, CER: 55, CVS: 50, CAP: 80,
          nivel: 'GOLD',
          antifraude: {
            ratioCTF_CAF: 1.08,
            flags: ['datos_no_verificados', 'bot_farm_sospechoso'],
          },
          verificacion: { confianzaScore: 85 },
        }),
      })),
    }));

    jest.doMock('../models/Campaign', () => ({
      exists: jest.fn().mockResolvedValue(null),
      countDocuments: jest.fn().mockResolvedValue(14),
    }));

    jest.doMock('../models/CanalScoreSnapshot', () => ({
      find: jest.fn(() => ({
        sort: () => ({
          limit: () => ({
            select: () => ({
              lean: async () => ([
                { fecha: new Date('2026-04-08'), CAS: 72, CTF: 70, CAP: 80 },
                { fecha: new Date('2026-04-07'), CAS: 70, CTF: 68, CAP: 78 },
              ]),
            }),
          }),
        }),
      })),
    }));

    service = require('../services/channelIntelligenceService');
  });

  test('returns the full public payload for a valid channel', async () => {
    const data = await service.buildChannelIntelligence('canal-1');
    expect(data).toBeDefined();
    expect(data.canal.nombre).toBe('Crypto Daily');
    expect(data.canal.plataforma).toBe('telegram');
    expect(data.canal.seguidores).toBe(21000);
    expect(data.scores.CAS).toBe(72);
    expect(data.scores.nivel).toBe('GOLD');
    expect(data.scores.CPMDinamico).toBeGreaterThan(0);
    expect(data.historial).toHaveLength(2);
    expect(data.benchmark.nichoMediaCTR).toBeGreaterThan(0);
    expect(data.campanias.completadas).toBe(14);
    expect(data.campanias.disponible).toBe(true);
  });

  test('returned flags are STRIPPED of sensitive internal signals', async () => {
    const data = await service.buildChannelIntelligence('canal-1');
    expect(data.scores.flags).toContain('datos_no_verificados');
    expect(data.scores.flags).not.toContain('bot_farm_sospechoso');
    expect(data.scores.flags).not.toContain('engagement_bajo');
  });

  test('does not expose owner identity, contact info, or advertiser history', async () => {
    const data = await service.buildChannelIntelligence('canal-1');
    const json = JSON.stringify(data);
    expect(json).not.toMatch(/propietario/);
    expect(json).not.toMatch(/ownerId/);
    expect(json).not.toMatch(/advertiser/);
    expect(json).not.toMatch(/email/);
    expect(json).not.toMatch(/phone/);
  });

  test('returns null when the channel does not exist', async () => {
    jest.resetModules();
    jest.doMock('../lib/ensureDb', () => ({ ensureDb: jest.fn().mockResolvedValue(true) }));
    jest.doMock('../models/Canal', () => ({
      findOne: jest.fn(() => ({ lean: async () => null })),
    }));
    jest.doMock('../models/Campaign', () => ({
      exists: jest.fn(), countDocuments: jest.fn(),
    }));
    jest.doMock('../models/CanalScoreSnapshot', () => ({
      find: jest.fn(() => ({ sort: () => ({ limit: () => ({ select: () => ({ lean: async () => [] }) }) }) })),
    }));
    const svc = require('../services/channelIntelligenceService');
    const data = await svc.buildChannelIntelligence('missing-id');
    expect(data).toBeNull();
  });
});

// ── Availability logic ─────────────────────────────────────────────────
describe('buildChannelIntelligence — disponibilidad', () => {
  test('disponible=false when a PAID or PUBLISHED campaign exists', async () => {
    jest.resetModules();
    jest.doMock('../lib/ensureDb', () => ({ ensureDb: jest.fn().mockResolvedValue(true) }));
    jest.doMock('../models/Canal', () => ({
      findOne: jest.fn(() => ({
        lean: async () => ({
          _id: 'canal-1',
          plataforma: 'telegram',
          categoria: 'crypto',
          estado: 'activo',
          CAS: 60,
          estadisticas: { seguidores: 5000 },
          antifraude: { flags: [] },
          verificacion: {},
        }),
      })),
    }));
    jest.doMock('../models/Campaign', () => ({
      exists: jest.fn().mockResolvedValue({ _id: 'camp-1' }),
      countDocuments: jest.fn().mockResolvedValue(0),
    }));
    jest.doMock('../models/CanalScoreSnapshot', () => ({
      find: jest.fn(() => ({
        sort: () => ({ limit: () => ({ select: () => ({ lean: async () => [] }) }) }),
      })),
    }));
    const svc = require('../services/channelIntelligenceService');
    const data = await svc.buildChannelIntelligence('canal-1');
    expect(data.campanias.disponible).toBe(false);
  });
});

// ── Rate-limit query guard (90-day window) ─────────────────────────────
describe('buildChannelIntelligence — historial query', () => {
  let callLog;
  beforeEach(() => {
    jest.resetModules();
    callLog = [];
    jest.doMock('../lib/ensureDb', () => ({ ensureDb: jest.fn().mockResolvedValue(true) }));
    jest.doMock('../models/Canal', () => ({
      findOne: jest.fn(() => ({
        lean: async () => ({
          _id: 'canal-1',
          plataforma: 'telegram',
          categoria: 'crypto',
          estado: 'activo',
          CAS: 50,
          estadisticas: { seguidores: 100 },
          antifraude: { flags: [] },
          verificacion: {},
        }),
      })),
    }));
    jest.doMock('../models/Campaign', () => ({
      exists: jest.fn().mockResolvedValue(null),
      countDocuments: jest.fn().mockResolvedValue(0),
    }));
    jest.doMock('../models/CanalScoreSnapshot', () => ({
      find: jest.fn((q) => {
        callLog.push(q);
        return {
          sort: () => ({
            limit: (n) => ({
              select: (fields) => ({
                lean: async () => {
                  callLog[callLog.length - 1]._limit = n;
                  callLog[callLog.length - 1]._select = fields;
                  return [];
                },
              }),
            }),
          }),
        };
      }),
    }));
  });

  test('historial query uses a 90-day lower bound, limit 90, and select() for payload reduction', async () => {
    const svc = require('../services/channelIntelligenceService');
    await svc.buildChannelIntelligence('canal-1');
    expect(callLog).toHaveLength(1);
    const q = callLog[0];
    expect(q.canalId).toBe('canal-1');
    expect(q.fecha.$gte).toBeInstanceOf(Date);
    const sinceAgo = Date.now() - q.fecha.$gte.getTime();
    // Allow ±5s for test execution.
    expect(sinceAgo).toBeGreaterThanOrEqual(NINETY_DAYS_MS - 5000);
    expect(sinceAgo).toBeLessThanOrEqual(NINETY_DAYS_MS + 5000);
    expect(q._limit).toBe(90);
    expect(q._select).toMatch(/CAS/);
    expect(q._select).toMatch(/-_id/);
  });
});
