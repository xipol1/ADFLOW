const {
  NICHE_BENCHMARKS,
  CPM_BASE,
  getBenchmark,
  calcularCPMDinamico,
  calcularPercentilCTR,
  calcularPercentilViewRate,
  detectarAnomaliaFraude,
} = require('../config/nicheBenchmarks');

describe('NICHE_BENCHMARKS structure', () => {
  test('all 12 niches are present with [p25, p50, p75, p90] for ctr and viewRate', () => {
    const expected = [
      'crypto', 'finanzas', 'tecnologia', 'marketing', 'ecommerce', 'salud',
      'entretenimiento', 'noticias', 'deporte', 'educacion', 'lifestyle', 'otros',
    ];
    for (const nicho of expected) {
      expect(NICHE_BENCHMARKS[nicho]).toBeDefined();
      expect(NICHE_BENCHMARKS[nicho].ctr).toHaveLength(4);
      expect(NICHE_BENCHMARKS[nicho].viewRate).toHaveLength(4);
    }
  });

  test('each benchmark array is monotonically non-decreasing', () => {
    for (const [, b] of Object.entries(NICHE_BENCHMARKS)) {
      for (let i = 1; i < b.ctr.length; i++) {
        expect(b.ctr[i]).toBeGreaterThanOrEqual(b.ctr[i - 1]);
      }
      for (let i = 1; i < b.viewRate.length; i++) {
        expect(b.viewRate[i]).toBeGreaterThanOrEqual(b.viewRate[i - 1]);
      }
    }
  });

  test('otros fallback always resolves via getBenchmark', () => {
    expect(getBenchmark('moda')).toBe(NICHE_BENCHMARKS.otros);
    expect(getBenchmark(undefined)).toBe(NICHE_BENCHMARKS.otros);
    expect(getBenchmark(null)).toBe(NICHE_BENCHMARKS.otros);
    expect(getBenchmark('')).toBe(NICHE_BENCHMARKS.otros);
  });
});

describe('CPM_BASE', () => {
  test('all platforms present with positive values', () => {
    for (const p of ['whatsapp', 'newsletter', 'instagram', 'telegram', 'facebook', 'discord', 'blog']) {
      expect(CPM_BASE[p]).toBeGreaterThan(0);
    }
  });
});

describe('calcularCPMDinamico', () => {
  test('CAS=50 returns exactly the base CPM (neutral multiplier)', () => {
    expect(calcularCPMDinamico('telegram', 50)).toBe(14);
    expect(calcularCPMDinamico('whatsapp', 50)).toBe(20);
  });

  test('CAS=80 on telegram applies the 1.3 exponent (14 × 1.6^1.3 ≈ 25.79)', () => {
    // 14 * (80/50)^1.3 = 14 * 1.6^1.3 ≈ 25.79
    expect(calcularCPMDinamico('telegram', 80)).toBeCloseTo(25.79, 1);
  });

  test('unknown platform falls back to base 10', () => {
    expect(calcularCPMDinamico('tiktok', 50)).toBe(10);
  });

  test('CAS=0 returns 0 (channels with CAS=0 must be filtered at query level)', () => {
    expect(calcularCPMDinamico('telegram', 0)).toBe(0);
  });

  test('higher CAS yields strictly higher CPM', () => {
    expect(calcularCPMDinamico('telegram', 90)).toBeGreaterThan(
      calcularCPMDinamico('telegram', 60),
    );
  });
});

describe('calcularPercentilCTR', () => {
  test('CTR of exactly p50 returns ~50', () => {
    const ctr = NICHE_BENCHMARKS.crypto.ctr[1]; // p50 = 0.022
    expect(calcularPercentilCTR('crypto', ctr)).toBeCloseTo(50, 5);
  });

  test('CTR >= p90 returns 100', () => {
    expect(calcularPercentilCTR('crypto', 0.08)).toBe(100);
    expect(calcularPercentilCTR('crypto', 0.5)).toBe(100);
  });

  test('CTR = 0 returns 0 (no NaN, no -Infinity)', () => {
    const v = calcularPercentilCTR('crypto', 0);
    expect(Number.isFinite(v)).toBe(true);
    expect(v).toBe(0);
  });

  test('CTR < 0 returns 0', () => {
    expect(calcularPercentilCTR('crypto', -0.5)).toBe(0);
  });

  test('NaN and undefined CTR return 0 safely', () => {
    expect(calcularPercentilCTR('crypto', NaN)).toBe(0);
    expect(calcularPercentilCTR('crypto', undefined)).toBe(0);
  });

  test('unknown niche falls back to otros silently', () => {
    const otrosResult = calcularPercentilCTR('otros', 0.016);
    const modaResult = calcularPercentilCTR('moda', 0.016);
    expect(modaResult).toBeCloseTo(otrosResult, 5);
  });
});

describe('calcularPercentilViewRate', () => {
  test('viewRate of exactly p50 returns ~50', () => {
    const vr = NICHE_BENCHMARKS.crypto.viewRate[1]; // p50 = 0.30
    expect(calcularPercentilViewRate('crypto', vr)).toBeCloseTo(50, 5);
  });

  test('viewRate >= p90 returns 100', () => {
    expect(calcularPercentilViewRate('crypto', 0.7)).toBe(100);
    expect(calcularPercentilViewRate('crypto', 1.0)).toBe(100);
  });

  test('viewRate = 0 returns 0 safely', () => {
    expect(calcularPercentilViewRate('crypto', 0)).toBe(0);
  });

  test('unknown niche falls back to otros silently', () => {
    const v = calcularPercentilViewRate('moda', 0.22);
    expect(v).toBeCloseTo(calcularPercentilViewRate('otros', 0.22), 5);
  });

  test('higher viewRate yields strictly higher percentile (within a band)', () => {
    expect(calcularPercentilViewRate('crypto', 0.45)).toBeGreaterThan(
      calcularPercentilViewRate('crypto', 0.25),
    );
  });
});

describe('detectarAnomaliaFraude', () => {
  test('normal CTR returns no anomaly', () => {
    const result = detectarAnomaliaFraude('crypto', 0.022); // p50
    expect(result.anomalia).toBe(false);
    expect(result.tipo).toBeNull();
  });

  test('extremely high CTR flags as "alto"', () => {
    // crypto p90 = 0.08 → >0.16 is anomalia alto
    const result = detectarAnomaliaFraude('crypto', 0.25);
    expect(result.anomalia).toBe(true);
    expect(result.tipo).toBe('alto');
  });

  test('extremely low CTR flags as "bajo"', () => {
    // crypto p25 = 0.010 → <0.003 is anomalia bajo
    const result = detectarAnomaliaFraude('crypto', 0.001);
    expect(result.anomalia).toBe(true);
    expect(result.tipo).toBe('bajo');
  });

  test('unknown niche still runs via otros fallback', () => {
    const result = detectarAnomaliaFraude('moda', 0.016);
    expect(result).toBeDefined();
    expect(typeof result.anomalia).toBe('boolean');
  });

  test('zero or missing CTR is not treated as fraud', () => {
    expect(detectarAnomaliaFraude('crypto', 0).anomalia).toBe(false);
    expect(detectarAnomaliaFraude('crypto', null).anomalia).toBe(false);
    expect(detectarAnomaliaFraude('crypto', undefined).anomalia).toBe(false);
  });

  test('sigmas is a non-negative finite number', () => {
    const result = detectarAnomaliaFraude('crypto', 0.06);
    expect(Number.isFinite(result.sigmas)).toBe(true);
    expect(result.sigmas).toBeGreaterThanOrEqual(0);
  });
});
