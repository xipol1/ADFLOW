/**
 * ChannelAd — Channel Scoring Engine v2.0
 *
 * PURE FUNCTION. No database queries, no model requires, no async I/O.
 * The caller (daily cron in Piece 6, or the campaign-completion hook) is
 * responsible for loading the channel and its completed campaigns and
 * passing them in as plain objects. This keeps the engine 100% testable
 * without a database and keeps the data-loading responsibility in one
 * place — the cron layer, not the math layer.
 *
 * Inputs:
 *   canal                 — plain object (Canal document or POJO)
 *   campanasCompletadas   — array of completed campaigns (POJOs)
 *   nicho                 — niche string (e.g. 'crypto'); falls back to 'otros'
 *
 * Output: { CAF, CTF, CER, CVS, CAP, CAS, nivel, CPMDinamico,
 *           confianzaScore, ratioCTF_CAF, flags }
 *
 * v1 vs v2: channelScoring.js (v1) is still used during onboarding, when
 * a channel hasn't been verified yet. v2 runs nightly for verified/active
 * channels and uses real campaign performance (the CAP component) which
 * is the only score that can't be faked.
 */

const {
  calcularPercentilCTR,
  calcularPercentilViewRate,
  calcularCPMDinamico,
} = require('../config/nicheBenchmarks');
const { NICHE_BENCHMARKS } = require('../config/nicheBenchmarks');

// ── Tunables ────────────────────────────────────────────────────────────────
const NIVEL_THRESHOLDS = { ELITE: 80, GOLD: 61, SILVER: 41 };

const COMPOSITE_WEIGHTS = {
  CAF: 0.15,
  CTF: 0.25,
  CER: 0.20,
  CVS: 0.10,
  CAP: 0.30,
};

const TIPO_ACCESO_SCORE = {
  admin_directo: 35,
  oauth_graph:   35,
  bot_miembro:   20,
  tracking_url:  10,
  declarado:      5,
};

const TIPO_ACCESO_CONFIANZA = {
  admin_directo: 95,
  oauth_graph:   95,
  bot_miembro:   70,
  tracking_url:  50,
  declarado:     30,
};

// ── Utilities ───────────────────────────────────────────────────────────────
const clamp = (v, min, max) => Math.min(max, Math.max(min, v));
const finiteOr = (v, fallback) => (Number.isFinite(+v) ? +v : fallback);

function getFollowers(canal) {
  return finiteOr(canal?.estadisticas?.seguidores, 0);
}

function getViewRate(canal) {
  const followers = getFollowers(canal);
  if (followers <= 0) return 0;
  const views = finiteOr(canal?.estadisticas?.promedioVisualizaciones, 0);
  return views / followers;
}

function hasCrawlerData(canal) {
  const n = canal?.crawler?.ultimoPostNum;
  return n !== null && n !== undefined && Number.isFinite(+n);
}

function resolveNicho(nicho) {
  return nicho && NICHE_BENCHMARKS[nicho] ? nicho : 'otros';
}

// ── CAF — Channel Attention Flow ────────────────────────────────────────────
// Raw volume. Does not distinguish quality. Max raw points = 120 → scaled to 100.
function calcularCAF(canal) {
  const followers = getFollowers(canal);

  let pts = 0;
  if (followers < 1000)        pts += 10;
  else if (followers < 10000)  pts += 25;
  else if (followers < 50000)  pts += 45;
  else if (followers < 200000) pts += 65;
  else if (followers < 500000) pts += 80;
  else                         pts += 95;

  const viewRate = getViewRate(canal);
  if (viewRate < 0.05)      pts += 0;
  else if (viewRate < 0.10) pts += 5;
  else if (viewRate < 0.20) pts += 10;
  else if (viewRate < 0.40) pts += 15;
  else                      pts += 20;

  if (hasCrawlerData(canal)) pts += 5;

  // Scale from a 120-point possible max to 0-100.
  return clamp(Math.round((pts / 120) * 100), 0, 100);
}

// ── CTF — Channel Trust Flow ────────────────────────────────────────────────
// Verified quality. Max raw points = 100 (already 0-100 scale, no rescale).
function calcularCTF(canal, campanas, nicho) {
  const tipoAcceso = canal?.verificacion?.tipoAcceso || 'declarado';
  let pts = TIPO_ACCESO_SCORE[tipoAcceso] ?? TIPO_ACCESO_SCORE.declarado;

  const flags = canal?.antifraude?.flags || [];
  if (!Array.isArray(flags) || flags.length === 0) pts += 15;

  if (Array.isArray(campanas) && campanas.length > 0) {
    const ctrs = campanas
      .map((c) => {
        const views = finiteOr(c?.stats?.views ?? c?.views, 0);
        const clicks = finiteOr(c?.stats?.clicksUnicos ?? c?.clicksUnicos ?? c?.clicks, 0);
        return views > 0 ? clicks / views : null;
      })
      .filter((v) => v !== null);

    if (ctrs.length > 0) {
      const avgCtr = ctrs.reduce((a, b) => a + b, 0) / ctrs.length;
      const bench = NICHE_BENCHMARKS[resolveNicho(nicho)];
      const lo = bench.ctr[0] * 0.5;
      const hi = bench.ctr[3] * 1.5;
      pts += avgCtr >= lo && avgCtr <= hi ? 25 : -10;
    }
  }

  if (canal?.reaccionesOrganicasVerificadas === true) pts += 15;
  if (canal?.watermarkVerificado === true)            pts += 10;

  return clamp(Math.round(pts), 0, 100);
}

// ── CER — Channel Engagement Rate ───────────────────────────────────────────
// Relative to niche benchmark. Uses real campaign CTR when available;
// otherwise estimates from viewRate × 0.05 (conservative).
function calcularCER(canal, campanas, nicho) {
  const n = resolveNicho(nicho);

  if (Array.isArray(campanas) && campanas.length > 0) {
    const ctrs = campanas
      .map((c) => {
        const views = finiteOr(c?.stats?.views ?? c?.views, 0);
        const clicks = finiteOr(c?.stats?.clicksUnicos ?? c?.clicksUnicos ?? c?.clicks, 0);
        return views > 0 ? clicks / views : null;
      })
      .filter((v) => v !== null);

    if (ctrs.length > 0) {
      const avgCtr = ctrs.reduce((a, b) => a + b, 0) / ctrs.length;
      return clamp(Math.round(calcularPercentilCTR(n, avgCtr)), 0, 100);
    }
  }

  // Fallback estimate: viewRate × 0.05 (we assume 5% of viewers click-through
  // as a conservative baseline for channels without campaign history).
  const estimatedCtr = getViewRate(canal) * 0.05;
  return clamp(Math.round(calcularPercentilCTR(n, estimatedCtr)), 0, 100);
}

// ── CVS — Channel Velocity Score ────────────────────────────────────────────
// Temporal trajectory. Returns 50 (neutral) if there is no crawler data and
// no follower history — a new channel should not be penalized for lack of
// history.
function calcularCVS(canal) {
  const hasCrawler = hasCrawlerData(canal);
  const historicoSeguidores = Array.isArray(canal?.historicoSeguidores)
    ? canal.historicoSeguidores
    : [];
  const postsUltimos7dias = finiteOr(canal?.crawler?.postsUltimos7dias, null);

  if (!hasCrawler && historicoSeguidores.length < 2 && postsUltimos7dias === null) {
    return 50;
  }

  // Posts last 7 days (40% weight).
  let postsScore = 50;
  if (postsUltimos7dias !== null) {
    if (postsUltimos7dias < 1)       postsScore = 20;
    else if (postsUltimos7dias < 3)  postsScore = 40;
    else if (postsUltimos7dias < 7)  postsScore = 60;
    else if (postsUltimos7dias < 14) postsScore = 80;
    else                             postsScore = 100;
  }

  // Follower growth (40% weight). Compare newest vs oldest snapshot.
  let growthScore = 50;
  if (historicoSeguidores.length >= 2) {
    const sorted = [...historicoSeguidores].sort(
      (a, b) => new Date(a.fecha).getTime() - new Date(b.fecha).getTime(),
    );
    const first = finiteOr(sorted[0].seguidores, 0);
    const last = finiteOr(sorted[sorted.length - 1].seguidores, 0);
    if (first > 0) {
      const pctGrowth = (last - first) / first;
      if (pctGrowth >= 0.20)      growthScore = 100;
      else if (pctGrowth >= 0.10) growthScore = 80;
      else if (pctGrowth >= 0.05) growthScore = 60;
      else if (pctGrowth >= 0)    growthScore = 40;
      else                        growthScore = 20;
    }
  }

  // Publication regularity (20% weight). Low variance between cadences = high score.
  let regularityScore = 50;
  const cadencias = canal?.crawler?.cadencias;
  if (Array.isArray(cadencias) && cadencias.length >= 3) {
    const mean = cadencias.reduce((a, b) => a + b, 0) / cadencias.length;
    if (mean > 0) {
      const variance =
        cadencias.reduce((acc, v) => acc + (v - mean) ** 2, 0) / cadencias.length;
      const cv = Math.sqrt(variance) / mean; // coefficient of variation
      if (cv < 0.2)      regularityScore = 100;
      else if (cv < 0.4) regularityScore = 80;
      else if (cv < 0.6) regularityScore = 60;
      else if (cv < 1.0) regularityScore = 40;
      else               regularityScore = 20;
    }
  }

  const cvs = postsScore * 0.4 + growthScore * 0.4 + regularityScore * 0.2;
  return clamp(Math.round(cvs), 0, 100);
}

// ── CAP — Channel Ad Performance ────────────────────────────────────────────
// The only score that cannot be faked. Returns 50 (neutral) when there is
// no campaign history — a new channel should not be penalized for having
// no campaigns yet.
function calcularCAP(campanas, nicho) {
  if (!Array.isArray(campanas) || campanas.length === 0) return 50;

  const n = resolveNicho(nicho);

  // CTR vs benchmark (40% weight). Convert percentile (0-100) to 0-40.
  const ctrs = campanas
    .map((c) => {
      const views = finiteOr(c?.stats?.views ?? c?.views, 0);
      const clicks = finiteOr(c?.stats?.clicksUnicos ?? c?.clicksUnicos ?? c?.clicks, 0);
      return views > 0 ? clicks / views : null;
    })
    .filter((v) => v !== null);
  let ctrScore = 0;
  if (ctrs.length > 0) {
    const avg = ctrs.reduce((a, b) => a + b, 0) / ctrs.length;
    ctrScore = (calcularPercentilCTR(n, avg) / 100) * 40;
  }

  // Cancellation rate (30% weight).
  const cancelled = campanas.filter((c) => c?.status === 'CANCELLED' || c?.estado === 'cancelado').length;
  const cancelRate = cancelled / campanas.length;
  let cancelScore;
  if (cancelRate === 0)      cancelScore = 30;
  else if (cancelRate < 0.10) cancelScore = 20;
  else if (cancelRate < 0.20) cancelScore = 10;
  else                       cancelScore = 0;

  // Publication-delay rate (30% weight). A campaign is "delayed" if it was
  // published after its deadline.
  const delayed = campanas.filter((c) => {
    const published = c?.publishedAt ? new Date(c.publishedAt).getTime() : null;
    const deadline = c?.deadline ? new Date(c.deadline).getTime() : null;
    return published !== null && deadline !== null && published > deadline;
  }).length;
  const delayRate = delayed / campanas.length;
  let delayScore;
  if (delayRate === 0)      delayScore = 30;
  else if (delayRate < 0.10) delayScore = 20;
  else if (delayRate < 0.20) delayScore = 10;
  else                      delayScore = 0;

  return clamp(Math.round(ctrScore + cancelScore + delayScore), 0, 100);
}

// ── ConfianzaScore (of the channel, not of the CAS math) ────────────────────
// This number describes how trustworthy the INPUT DATA is. It is surfaced
// as metadata and may add a flag, but it does NOT modify CAS directly.
function calcularConfianzaScore(canal, campanas, nicho) {
  const tipoAcceso = canal?.verificacion?.tipoAcceso || 'declarado';
  let score = TIPO_ACCESO_CONFIANZA[tipoAcceso] ?? TIPO_ACCESO_CONFIANZA.declarado;

  // +5 if campaign CTR is coherent with the niche (same "in-band" check
  // used for the CTF coherence bonus).
  if (Array.isArray(campanas) && campanas.length > 0) {
    const ctrs = campanas
      .map((c) => {
        const views = finiteOr(c?.stats?.views ?? c?.views, 0);
        const clicks = finiteOr(c?.stats?.clicksUnicos ?? c?.clicksUnicos ?? c?.clicks, 0);
        return views > 0 ? clicks / views : null;
      })
      .filter((v) => v !== null);
    if (ctrs.length > 0) {
      const avg = ctrs.reduce((a, b) => a + b, 0) / ctrs.length;
      const bench = NICHE_BENCHMARKS[resolveNicho(nicho)];
      const lo = bench.ctr[0] * 0.5;
      const hi = bench.ctr[3] * 1.5;
      if (avg >= lo && avg <= hi) score += 5;
    }
  }

  if (hasCrawlerData(canal)) score += 5;
  return clamp(Math.round(score), 0, 100);
}

// ── Level bucket from CAS ───────────────────────────────────────────────────
function nivelFromCAS(cas) {
  if (cas >= NIVEL_THRESHOLDS.ELITE)  return 'ELITE';
  if (cas >= NIVEL_THRESHOLDS.GOLD)   return 'GOLD';
  if (cas >= NIVEL_THRESHOLDS.SILVER) return 'SILVER';
  return 'BRONZE';
}

/**
 * Main entry point. Pure function.
 */
function calcularCAS(canal, campanasCompletadas = [], nicho) {
  const campanas = Array.isArray(campanasCompletadas) ? campanasCompletadas : [];
  const nichoResolved = resolveNicho(nicho);

  const CAF = calcularCAF(canal);
  const CTF = calcularCTF(canal, campanas, nichoResolved);
  const CER = calcularCER(canal, campanas, nichoResolved);
  const CVS = calcularCVS(canal);
  const CAP = calcularCAP(campanas, nichoResolved);

  const CAS_raw =
    CAF * COMPOSITE_WEIGHTS.CAF +
    CTF * COMPOSITE_WEIGHTS.CTF +
    CER * COMPOSITE_WEIGHTS.CER +
    CVS * COMPOSITE_WEIGHTS.CVS +
    CAP * COMPOSITE_WEIGHTS.CAP;

  // ── Post-composition penalties ────────────────────────────────────────────
  // ratioCTF_CAF: when CAF = 0 we treat the ratio as 1 (neutral) — a brand
  // new channel with no data should not be flagged as a bot farm just
  // because the denominator is missing.
  const ratioCTF_CAF = CAF === 0 ? 1 : +(CTF / CAF).toFixed(4);

  const flags = [];
  let casAdjusted = CAS_raw;

  // Mutually exclusive: the <0.5 penalty is strictly stronger than <0.6.
  if (CAF > 0 && ratioCTF_CAF < 0.5) {
    casAdjusted -= 10;
    flags.push('bot_farm_sospechoso');
  } else if (CAF > 0 && ratioCTF_CAF < 0.6) {
    casAdjusted -= 7;
    flags.push('engagement_bajo');
  }

  // confianzaScore adds a metadata flag but does NOT subtract from CAS.
  const confianzaScore = calcularConfianzaScore(canal, campanas, nichoResolved);
  if (confianzaScore < 40) flags.push('datos_no_verificados');

  // ── Final clamp: ALWAYS the last operation ────────────────────────────────
  const CAS = clamp(Math.round(casAdjusted), 0, 100);

  const nivel = nivelFromCAS(CAS);
  const CPMDinamico = calcularCPMDinamico(canal?.plataforma, CAS);

  return {
    CAF,
    CTF,
    CER,
    CVS,
    CAP,
    CAS,
    nivel,
    CPMDinamico,
    confianzaScore,
    ratioCTF_CAF,
    flags,
  };
}

module.exports = {
  calcularCAS,
  // Exported for testing and for callers that only need a single component.
  calcularCAF,
  calcularCTF,
  calcularCER,
  calcularCVS,
  calcularCAP,
  calcularConfianzaScore,
  nivelFromCAS,
  COMPOSITE_WEIGHTS,
  NIVEL_THRESHOLDS,
};
