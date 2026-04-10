/**
 * Public channel intelligence service.
 *
 * Powers GET /api/channels/:id/intelligence. Pure-ish orchestration layer
 * between the live Canal document, the 90-day snapshot history, and the
 * niche benchmarks. Kept separate from the route handler so the shape is
 * unit-testable without Express.
 *
 * Privacy rules baked in:
 *   - Only public-safe flags are ever returned (see PUBLIC_FLAG_WHITELIST).
 *   - Internal fraud signals (bot_farm_sospechoso, engagement_bajo) stay
 *     admin-only — exposing them would tip off bad actors.
 *   - Owner identity, contact info, and advertiser history are never
 *     returned by this endpoint.
 */

const { ensureDb } = require('../lib/ensureDb');
const {
  NICHE_BENCHMARKS,
  calcularCPMDinamico,
  calcularPercentilCTR,
} = require('../config/nicheBenchmarks');

// Public-safe flags. Internal signals like bot_farm_sospechoso and
// engagement_bajo are NEVER surfaced here — see the filter below.
const PUBLIC_FLAG_WHITELIST = new Set([
  'datos_no_verificados',
  'sin_campanas_historicas',
  'verificacion_pendiente',
]);

const NINETY_DAYS_MS = 90 * 24 * 60 * 60 * 1000;

function models() {
  return {
    Canal: require('../models/Canal'),
    Campaign: require('../models/Campaign'),
    CanalScoreSnapshot: require('../models/CanalScoreSnapshot'),
  };
}

function filterPublicFlags(flags) {
  if (!Array.isArray(flags)) return [];
  return flags.filter((f) => PUBLIC_FLAG_WHITELIST.has(f));
}

/**
 * Estimate a channel's position within its niche based ONLY on its CAS
 * score and the niche's CTR benchmarks. This is a cheap approximation
 * that avoids a countDocuments query — good enough for MVP. The precise
 * variant would be:
 *   Canal.countDocuments({ categoria: nicho, CAS: { $gt: canal.CAS }, estado: 'verificado' })
 * but that requires a { categoria: 1, CAS: 1 } index which we don't
 * have yet. TODO: add the index + swap in the precise count once the
 * channel catalog is large enough to matter.
 */
function estimateNichePosition(CAS) {
  const cas = Number(CAS) || 0;
  if (cas >= 85) return 'top 10% del nicho';
  if (cas >= 70) return 'top 25% del nicho';
  if (cas >= 55) return 'top 50% del nicho';
  if (cas >= 40) return 'top 75% del nicho';
  return 'últimos percentiles del nicho';
}

function benchmarkSummary(nicho, canalCTR) {
  const bench = NICHE_BENCHMARKS[nicho] || NICHE_BENCHMARKS.otros;
  const p50 = bench.ctr[1];
  const ctr = Number(canalCTR) || 0;
  let canalCTRRatio = null;
  if (p50 > 0 && ctr > 0) {
    const delta = ((ctr - p50) / p50) * 100;
    canalCTRRatio = `${delta >= 0 ? '+' : ''}${delta.toFixed(0)}% vs la media del nicho`;
  }
  return {
    nichoMediaCTR: p50,
    canalCTRRatio,
    posicionNicho: estimateNichePosition(canalCTR ? calcularPercentilCTR(nicho, ctr) : null),
  };
}

/**
 * Decide whether the channel currently accepts new campaigns. A channel
 * is "available" when it has no active PAID or PUBLISHED campaign
 * occupying its slot.
 */
async function isChannelAvailable(canalId) {
  const { Campaign } = models();
  const busy = await Campaign.exists({
    channel: canalId,
    status: { $in: ['PAID', 'PUBLISHED'] },
  });
  return !busy;
}

/**
 * Main entry point. Returns the full public intelligence payload for a
 * channel, or null if the channel does not exist / is not public.
 */
async function buildChannelIntelligence(canalId) {
  await ensureDb();
  const { Canal, Campaign, CanalScoreSnapshot } = models();

  // 1. Load the channel. Only channels in verified/active state are
  //    considered public — pendiente_verificacion, suspendido, rechazado
  //    do not get an intelligence page.
  const canal = await Canal.findOne({
    _id: canalId,
    estado: { $in: ['verificado', 'activo'] },
  }).lean();
  if (!canal) return null;

  const nicho = canal.categoria || 'otros';

  // 2. 90-day historical snapshots. .lean() + .select() keep this cheap.
  const since = new Date(Date.now() - NINETY_DAYS_MS);
  const historial = await CanalScoreSnapshot.find({
    canalId: canal._id,
    fecha: { $gte: since },
  })
    .sort({ fecha: -1 })
    .limit(90)
    .select('fecha CAF CTF CER CVS CAP CAS -_id')
    .lean();

  // 3. Completed campaign count — used only for the public tally. We do
  //    NOT expose individual campaign details.
  const completadas = await Campaign.countDocuments({
    channel: canal._id,
    status: 'COMPLETED',
  });

  // 4. Availability.
  const disponible = await isChannelAvailable(canal._id);

  // 5. Benchmark comparison. We approximate the channel's "typical" CTR
  //    from the most-recent snapshot's CAP component if we have it, else
  //    from the niche's p50 (neutral).
  const latestCAP = historial[0]?.CAP ?? canal.CAP ?? 50;
  const benchRef = NICHE_BENCHMARKS[nicho] || NICHE_BENCHMARKS.otros;
  const impliedCTR = (latestCAP / 100) * benchRef.ctr[3]; // CAP→CTR rough mapping
  const benchmark = benchmarkSummary(nicho, impliedCTR);

  // 6. CPMDinamico always recomputed from live CAS so listings never lag.
  const CPMDinamico = calcularCPMDinamico(canal.plataforma, canal.CAS);

  return {
    canal: {
      id: String(canal._id),
      nombre: canal.nombreCanal || '',
      plataforma: canal.plataforma || '',
      nicho,
      seguidores: canal.estadisticas?.seguidores || 0,
      descripcion: canal.descripcion || '',
    },
    scores: {
      CAS: canal.CAS ?? 50,
      CAF: canal.CAF ?? 50,
      CTF: canal.CTF ?? 50,
      CER: canal.CER ?? 50,
      CVS: canal.CVS ?? 50,
      CAP: canal.CAP ?? 50,
      nivel: canal.nivel || 'BRONZE',
      CPMDinamico,
      ratioCTF_CAF: canal.antifraude?.ratioCTF_CAF ?? null,
      confianzaScore: canal.verificacion?.confianzaScore ?? 0,
      flags: filterPublicFlags(canal.antifraude?.flags),
    },
    historial,
    benchmark,
    campanias: {
      completadas,
      disponible,
    },
  };
}

module.exports = {
  buildChannelIntelligence,
  filterPublicFlags,
  estimateNichePosition,
  benchmarkSummary,
  isChannelAvailable,
  PUBLIC_FLAG_WHITELIST,
  NINETY_DAYS_MS,
};
