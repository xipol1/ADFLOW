/**
 * ChannelAd — Niche performance benchmarks.
 *
 * Percentiles of CTR and viewRate by niche, formatted as [p25, p50, p75, p90].
 * Initial values are based on public market data and will be auto-calibrated
 * from real campaign data once we have ≥10 campaigns per niche (handled by
 * the nightly cron in services/cronService.js).
 *
 * ──────────────────────────────────────────────────────────────────────────
 * Fallback policy: any unknown niche silently falls back to `otros`. Callers
 * never need to handle the "unknown niche" case themselves — the helper
 * functions below take care of it.
 * ──────────────────────────────────────────────────────────────────────────
 */
const NICHE_BENCHMARKS = {
  crypto:          { ctr: [0.010, 0.022, 0.045, 0.080], viewRate: [0.18, 0.30, 0.50, 0.70] },
  finanzas:        { ctr: [0.008, 0.018, 0.035, 0.060], viewRate: [0.15, 0.25, 0.40, 0.60] },
  tecnologia:      { ctr: [0.006, 0.014, 0.028, 0.050], viewRate: [0.12, 0.20, 0.35, 0.55] },
  marketing:       { ctr: [0.007, 0.016, 0.032, 0.055], viewRate: [0.13, 0.22, 0.38, 0.58] },
  ecommerce:       { ctr: [0.012, 0.025, 0.050, 0.090], viewRate: [0.20, 0.33, 0.52, 0.72] },
  salud:           { ctr: [0.009, 0.020, 0.040, 0.065], viewRate: [0.16, 0.27, 0.44, 0.64] },
  entretenimiento: { ctr: [0.015, 0.030, 0.060, 0.100], viewRate: [0.25, 0.40, 0.62, 0.82] },
  noticias:        { ctr: [0.004, 0.010, 0.020, 0.035], viewRate: [0.10, 0.17, 0.28, 0.45] },
  deporte:         { ctr: [0.011, 0.024, 0.048, 0.080], viewRate: [0.19, 0.32, 0.50, 0.70] },
  educacion:       { ctr: [0.008, 0.018, 0.036, 0.060], viewRate: [0.14, 0.24, 0.40, 0.60] },
  lifestyle:       { ctr: [0.010, 0.021, 0.042, 0.070], viewRate: [0.17, 0.28, 0.46, 0.66] },
  otros:           { ctr: [0.007, 0.016, 0.032, 0.055], viewRate: [0.13, 0.22, 0.36, 0.56] },
};

const CPM_BASE = {
  whatsapp:   20,
  newsletter: 28,
  instagram:  22,
  telegram:   14,
  facebook:   13,
  discord:     9,
  blog:        8,
};

/**
 * Safe lookup for a niche benchmark. Unknown niches (e.g. "moda") fall back
 * to `otros` silently — callers never get undefined.
 */
function getBenchmark(nicho) {
  return NICHE_BENCHMARKS[nicho] || NICHE_BENCHMARKS.otros;
}

/**
 * Calculate the dynamic CPM of a channel based on its CAS score.
 *
 *   CPM_real = CPM_base[plataforma] × (CAS / 50) ^ 1.3
 *
 * Edge case: CAS = 0 returns 0. This is mathematically correct but such
 * channels should never reach this helper — they are excluded upstream by
 * the marketplace query (estado === 'activo' AND CAS >= minThreshold). We
 * keep the math honest here and filter at the query layer rather than
 * silently clamping inside the pricing function.
 */
function calcularCPMDinamico(plataforma, CAS) {
  const base = CPM_BASE[plataforma] || 10;
  return +(base * Math.pow(CAS / 50, 1.3)).toFixed(2);
}

/**
 * Shared percentile interpolation used by both CTR and viewRate helpers.
 * Given a value and a [p25, p50, p75, p90] array, returns a 0-100 position
 * where 100 means the value equals or exceeds p90.
 *
 * Edge cases:
 *   - value ≤ 0 → returns 0 (never NaN, never negative)
 *   - p25 = 0 → returns 0 when value is 0 (avoids division by zero)
 */
function percentilFromArray(value, percentilArr) {
  const v = Number(value);
  if (!Number.isFinite(v) || v <= 0) return 0;

  const [p25, p50, p75, p90] = percentilArr;
  if (v >= p90) return 100;
  if (v >= p75) return 75 + 25 * ((v - p75) / (p90 - p75));
  if (v >= p50) return 50 + 25 * ((v - p50) / (p75 - p50));
  if (v >= p25) return 25 + 25 * ((v - p25) / (p50 - p25));
  return Math.max(0, p25 > 0 ? 25 * (v / p25) : 0);
}

/**
 * Percentile of a CTR value within the niche's benchmark. Returns 0-100.
 * CTR = 0 safely returns 0 (never -Infinity / NaN). Unknown niches fall
 * back to `otros`.
 */
function calcularPercentilCTR(nicho, ctr) {
  return percentilFromArray(ctr, getBenchmark(nicho).ctr);
}

/**
 * Percentile of a viewRate value within the niche's benchmark. Returns 0-100.
 * Symmetric to calcularPercentilCTR — used by the scoring engine (Piece 4)
 * to compute CAF / CER from view rates that aren't tied to a click stream.
 */
function calcularPercentilViewRate(nicho, viewRate) {
  return percentilFromArray(viewRate, getBenchmark(nicho).viewRate);
}

/**
 * Detect whether an implicit CTR looks anomalous for the niche.
 *
 * @returns {{ anomalia: boolean, tipo: 'alto'|'bajo'|null, sigmas: number }}
 */
function detectarAnomaliaFraude(nicho, CTRImplicito) {
  const bench = getBenchmark(nicho);
  const [p25, , , p90] = bench.ctr;
  const ctr = Number(CTRImplicito);

  // Non-finite or non-positive CTR is not a fraud signal by itself; it
  // usually means "no views yet". Callers can treat it separately.
  if (!Number.isFinite(ctr) || ctr <= 0) {
    return { anomalia: false, tipo: null, sigmas: 0 };
  }

  const esAnomaliaLow  = ctr < p25 * 0.3;
  const esAnomaliaHigh = ctr > p90 * 2.0;

  // Rough sigma estimate: distance from the median scaled by the IQR width.
  // Used by the anti-fraud dashboard to rank severity, not for decisions.
  const median = bench.ctr[1];
  const iqr = Math.max(bench.ctr[2] - bench.ctr[0], 1e-9);
  const sigmas = Math.abs(ctr - median) / iqr;

  return {
    anomalia: esAnomaliaLow || esAnomaliaHigh,
    tipo: esAnomaliaHigh ? 'alto' : esAnomaliaLow ? 'bajo' : null,
    sigmas: +sigmas.toFixed(2),
  };
}

module.exports = {
  NICHE_BENCHMARKS,
  CPM_BASE,
  getBenchmark,
  calcularCPMDinamico,
  calcularPercentilCTR,
  calcularPercentilViewRate,
  detectarAnomaliaFraude,
};
