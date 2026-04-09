/**
 * ChannelAd — Scoring orchestrator.
 *
 * The orchestrator is the data-loading layer between the pure scoring
 * engine (services/channelScoringV2.js) and the database. The engine
 * performs the math; the orchestrator loads channels + their completed
 * campaigns, calls the engine, and persists the result as both a
 * CanalScoreSnapshot row and an update on the Canal document.
 *
 * Exported functions:
 *   - recalcularCASCanal(canalId, { trigger })
 *       Immediate single-channel recalculation. Called from the campaign
 *       controller when a campaign transitions to COMPLETED.
 *
 *   - runScoringBatch({ cursor, batchSize, concurrency, trigger })
 *       Process a page of verified/active channels. Returns a cursor so
 *       the cron endpoint can paginate through all channels without
 *       exceeding Vercel's function timeout.
 *
 *   - runFullScoring({ trigger })
 *       Convenience loop around runScoringBatch that keeps calling until
 *       the cursor is exhausted. Safe for local use and tests but NOT
 *       appropriate for a single serverless invocation with many channels.
 */

const mongoose = require('mongoose');
const { ensureDb } = require('../lib/ensureDb');
const { calcularCAS } = require('./channelScoringV2');

// Lazy requires to avoid model init cycles during test teardown.
function models() {
  return {
    Canal: require('../models/Canal'),
    Campaign: require('../models/Campaign'),
    CanalScoreSnapshot: require('../models/CanalScoreSnapshot'),
    ScoringCronLog: require('../models/ScoringCronLog'),
  };
}

const ACTIVE_STATUSES = ['verificado', 'activo'];
const DEFAULT_BATCH_SIZE = 25;
const DEFAULT_CONCURRENCY = 10;
const ENGINE_VERSION = 2;

/**
 * Persist a single scoring result. Pure function apart from the two DB
 * writes. Accepts a loaded `canal` (Mongoose doc) and the engine result.
 */
async function persistScoringResult(canal, result) {
  const { CanalScoreSnapshot } = models();

  // 1. Update the Canal document with the latest scores. This is what the
  //    marketplace reads to display CPM and nivel — it must always reflect
  //    the most recent run so listings are never stale.
  canal.CAF = result.CAF;
  canal.CTF = result.CTF;
  canal.CER = result.CER;
  canal.CVS = result.CVS;
  canal.CAP = result.CAP;
  canal.CAS = result.CAS;
  canal.nivel = result.nivel;
  canal.CPMDinamico = result.CPMDinamico;

  canal.antifraude = canal.antifraude || {};
  canal.antifraude.ratioCTF_CAF = result.ratioCTF_CAF;
  canal.antifraude.flags = result.flags;
  canal.antifraude.ultimaRevision = new Date();

  canal.verificacion = canal.verificacion || {};
  canal.verificacion.confianzaScore = result.confianzaScore;

  await canal.save();

  // 2. Append an immutable historical snapshot. Point-in-time follower
  //    count and niche are frozen here — Piece 5 guarantees these are
  //    plain Number / String, not references.
  await CanalScoreSnapshot.create({
    canalId: canal._id,
    fecha: new Date(),
    CAF: result.CAF,
    CTF: result.CTF,
    CER: result.CER,
    CVS: result.CVS,
    CAP: result.CAP,
    CAS: result.CAS,
    nivel: result.nivel,
    CPMDinamico: result.CPMDinamico,
    confianzaScore: result.confianzaScore,
    ratioCTF_CAF: result.ratioCTF_CAF,
    flags: result.flags,
    seguidores: canal.estadisticas?.seguidores || 0,
    nicho: canal.categoria || 'otros',
    plataforma: canal.plataforma || '',
    version: ENGINE_VERSION,
  });
}

/**
 * Load a channel's completed-campaign history. Uses lean() because the
 * engine only reads the plain object.
 */
async function loadCompletedCampaigns(canalId) {
  const { Campaign } = models();
  return Campaign.find({ channel: canalId, status: 'COMPLETED' })
    .select('status stats publishedAt deadline price netAmount')
    .lean();
}

/**
 * Immediate single-channel recalculation. Called from:
 *   - controllers/campaignController.js when a campaign hits COMPLETED
 *   - routes/scoring.js admin recalculate endpoints
 *   - the batch orchestrator below
 *
 * Returns the engine result so callers can log or act on it. Throws on
 * missing channel; does NOT write an error log by itself — that's the
 * batch runner's job.
 */
async function recalcularCASCanal(canalId, { trigger = 'manual' } = {}) {
  await ensureDb();
  const { Canal } = models();

  const canal = await Canal.findById(canalId);
  if (!canal) throw new Error(`Canal ${canalId} not found`);

  const campanas = await loadCompletedCampaigns(canal._id);
  const result = calcularCAS(canal, campanas, canal.categoria || 'otros');

  await persistScoringResult(canal, result);

  // Write a lightweight log row for the immediate trigger path so the
  // admin dashboard can see that it fired.
  if (trigger === 'campaign_completed') {
    const { ScoringCronLog } = models();
    await ScoringCronLog.create({
      fechaInicio: new Date(),
      fechaFin: new Date(),
      duracionMs: 0,
      canalesProcesados: 1,
      canalesActualizados: 1,
      errores: 0,
      trigger,
      engineVersion: ENGINE_VERSION,
    });
  }

  return result;
}

/**
 * Process a concurrency-limited batch of channels in parallel.
 * Promise.allSettled ensures one bad channel does not abort the batch.
 */
async function processChannelsConcurrently(canales, concurrency) {
  const { Canal } = models();
  const results = { updated: 0, errors: [] };

  for (let i = 0; i < canales.length; i += concurrency) {
    const slice = canales.slice(i, i + concurrency);
    const outcomes = await Promise.allSettled(
      slice.map(async (canalId) => {
        const canal = await Canal.findById(canalId);
        if (!canal) throw new Error('canal desaparecido');
        const campanas = await loadCompletedCampaigns(canal._id);
        const result = calcularCAS(canal, campanas, canal.categoria || 'otros');
        await persistScoringResult(canal, result);
        return canal._id;
      }),
    );

    for (let j = 0; j < outcomes.length; j++) {
      const outcome = outcomes[j];
      if (outcome.status === 'fulfilled') {
        results.updated += 1;
      } else {
        results.errors.push({
          canalId: slice[j],
          mensaje: String(outcome.reason?.message || outcome.reason || 'error'),
        });
      }
    }
  }

  return results;
}

/**
 * Run one page of the scoring job. Returns a cursor so the caller can
 * resume from the next unprocessed channel. `cursor` is the _id of the
 * last channel processed in the previous page, or null for the first page.
 *
 * The Vercel cron endpoint calls this until nextCursor is null.
 */
async function runScoringBatch({
  cursor = null,
  batchSize = DEFAULT_BATCH_SIZE,
  concurrency = DEFAULT_CONCURRENCY,
  trigger = 'scheduled',
} = {}) {
  const startedAt = Date.now();
  await ensureDb();
  const { Canal, ScoringCronLog } = models();

  const query = { estado: { $in: ACTIVE_STATUSES } };
  if (cursor) query._id = { $gt: new mongoose.Types.ObjectId(cursor) };

  const canalIds = await Canal.find(query)
    .select('_id')
    .sort({ _id: 1 })
    .limit(batchSize)
    .lean();

  const ids = canalIds.map((c) => c._id);
  const { updated, errors } = await processChannelsConcurrently(ids, concurrency);

  const nextCursor = ids.length === batchSize ? ids[ids.length - 1] : null;
  const finishedAt = Date.now();

  const logEntry = {
    fechaInicio: new Date(startedAt),
    fechaFin: new Date(finishedAt),
    duracionMs: finishedAt - startedAt,
    canalesProcesados: ids.length,
    canalesActualizados: updated,
    errores: errors.length,
    erroresDetalle: errors.slice(0, 20),
    trigger,
    engineVersion: ENGINE_VERSION,
  };
  await ScoringCronLog.create(logEntry);

  return {
    canalesProcesados: ids.length,
    canalesActualizados: updated,
    errores: errors.length,
    erroresDetalle: errors,
    duracionMs: logEntry.duracionMs,
    nextCursor: nextCursor ? String(nextCursor) : null,
  };
}

/**
 * Convenience loop. Calls runScoringBatch repeatedly until the cursor
 * is exhausted. Use in local scripts or tests; the cron endpoint should
 * call runScoringBatch directly and let Vercel re-invoke with the cursor
 * if pagination is needed.
 */
async function runFullScoring({ trigger = 'manual' } = {}) {
  let cursor = null;
  let totals = { canalesProcesados: 0, canalesActualizados: 0, errores: 0 };
  do {
    const page = await runScoringBatch({ cursor, trigger });
    totals.canalesProcesados += page.canalesProcesados;
    totals.canalesActualizados += page.canalesActualizados;
    totals.errores += page.errores;
    cursor = page.nextCursor;
  } while (cursor);
  return totals;
}

module.exports = {
  recalcularCASCanal,
  runScoringBatch,
  runFullScoring,
  ACTIVE_STATUSES,
  ENGINE_VERSION,
  DEFAULT_BATCH_SIZE,
  DEFAULT_CONCURRENCY,
  // Exposed for fine-grained testing.
  processChannelsConcurrently,
};
