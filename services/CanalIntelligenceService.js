/**
 * CanalIntelligenceService
 *
 * Capa 2 Fase 4 — orchestrator that loads source data (snapshots + posts),
 * runs the pure aggregator, applies the ChannelScore formula, and
 * upserts a CanalIntelligence document.
 *
 * Public methods:
 *   - recompute(canalId)        → upserts and returns the new CanalIntelligence
 *   - recomputeAll(filter)      → batch recompute for every enabled canal
 *                                  (paginates internally to avoid loading
 *                                   thousands of canals into memory at once)
 *
 * The service is invoked from:
 *   - ChannelPollScheduler — opportunistically after every successful
 *     metadata poll (so the score stays warm without waiting for the
 *     periodic recompute tick).
 *   - intelligence-aggregate-canal BullMQ job (Fase 4 — not wired yet
 *     in this commit, deferred to keep scope contained).
 *
 * Recompute is idempotent — same inputs → same output. We use Mongoose
 * `findOneAndUpdate({upsert:true})` so concurrent recomputes converge
 * rather than racing.
 */

'use strict';

const Canal = require('../models/Canal');
const CanalMetricsSnapshot = require('../models/CanalMetricsSnapshot');
const CanalPostObservation = require('../models/CanalPostObservation');
const CanalIntelligence = require('../models/CanalIntelligence');

const { aggregateAll } = require('./intelligence/aggregator');
const { computeChannelScore } = require('./intelligence/channelScore');

const DAY_MS = 24 * 3600 * 1000;
const DEFAULT_BATCH_SIZE = 25;

class CanalIntelligenceService {
  /**
   * Recompute intelligence for a single canal. Loads 90 days of source
   * data, runs the aggregator + score, upserts CanalIntelligence.
   *
   * @param {string} canalId
   * @param {object} [opts]
   * @param {number} [opts.now]    inject clock for tests
   * @returns {Promise<object|null>}
   */
  async recompute(canalId, opts = {}) {
    const nowMs = opts.now || Date.now();

    const canal = await Canal.findById(canalId)
      .select('_id verificado metricsIntelligence')
      .lean();
    if (!canal) return null;
    if (!canal.metricsIntelligence?.enabled) return null;

    const channelJid = canal.metricsIntelligence.channelJid;
    if (!channelJid) return null;

    // ── Load source data ─────────────────────────────────────────────────
    const since90d = new Date(nowMs - 90 * DAY_MS);
    const since30d = new Date(nowMs - 30 * DAY_MS);

    const [snapshots, posts90d] = await Promise.all([
      CanalMetricsSnapshot.find({
        canalId,
        timestamp: { $gte: since90d },
      })
        .sort({ timestamp: -1 })
        .lean(),
      CanalPostObservation.find({
        canalId,
        publishedAt: { $gte: since90d },
      })
        .sort({ publishedAt: -1 })
        .select('_id type isForwarded bodyHash links reactions nlp publishedAt')
        .lean(),
    ]);

    const posts30d = posts90d.filter(
      (p) => new Date(p.publishedAt).getTime() >= since30d.getTime()
    );

    // ── Run pure aggregator ──────────────────────────────────────────────
    const intelligence = aggregateAll({
      canalId: canal._id,
      channelJid,
      snapshots,
      posts30d,
      posts90d,
      now: nowMs,
    });

    // ── Compute score ────────────────────────────────────────────────────
    const score = computeChannelScore({ intelligence, canal });

    // ── Persist (upsert) ─────────────────────────────────────────────────
    // Maps stored as plain objects for the Mongoose Map type; we re-wrap
    // on the way in.
    const doc = await CanalIntelligence.findOneAndUpdate(
      { canalId: canal._id },
      {
        $set: {
          canalId: canal._id,
          channelJid,
          computedAt: intelligence.computedAt,
          sampleWindowDays: intelligence.sampleWindowDays,
          inputCounts: intelligence.inputCounts,
          cadence: intelligence.cadence,
          growth: intelligence.growth,
          engagement: intelligence.engagement,
          contentMix: {
            ...intelligence.contentMix,
            langMix: this._mapToObject(intelligence.contentMix.langMix),
          },
          trust: {
            ...intelligence.trust,
            brandSafetyFlagsAggregate: this._mapToObject(intelligence.trust.brandSafetyFlagsAggregate),
          },
          score,
        },
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    // Mirror the confianzaScore back onto Canal.verificacion so downstream
    // pricing/scoring code that still reads from Canal sees a fresh value.
    // We respect the original 85 floor for verified canals so manual data
    // never silently regresses.
    try {
      await this._mirrorScoreToCanal(canal, score);
    } catch (err) {
      console.warn(`[ci-service] mirror to Canal failed canal=${canalId}:`, err.message);
    }

    // Capa 2 Fase 5 — run fraud detection rules. We re-fetch the canal
    // to get the latest `verificado`/`estado` + estadisticas (in case the
    // mirror above changed something). Failures are non-fatal: the
    // intelligence doc is already persisted.
    try {
      await this._runFraudDetection(canal._id);
    } catch (err) {
      console.warn(`[ci-service] fraud detection failed canal=${canalId}:`, err.message);
    }

    return doc;
  }

  /**
   * Batch recompute. Designed for a 6h periodic job — paginates so memory
   * stays bounded even with thousands of canals.
   */
  async recomputeAll({ filter = {}, batchSize = DEFAULT_BATCH_SIZE, now } = {}) {
    const baseFilter = {
      'metricsIntelligence.enabled': true,
      'metricsIntelligence.channelJid': { $nin: ['', null] },
      ...filter,
    };
    const stats = { processed: 0, ok: 0, errors: 0, skipped: 0 };

    let cursor = Canal.find(baseFilter)
      .select('_id')
      .cursor({ batchSize });

    for await (const c of cursor) {
      stats.processed += 1;
      try {
        const r = await this.recompute(c._id, { now });
        if (r) stats.ok += 1;
        else stats.skipped += 1;
      } catch (err) {
        stats.errors += 1;
        console.warn(`[ci-service] recompute failed canal=${c._id}:`, err.message);
      }
    }
    console.log(
      `[ci-service] recomputeAll done — processed=${stats.processed} ok=${stats.ok} errors=${stats.errors} skipped=${stats.skipped}`
    );
    return stats;
  }

  // ─── Internal ────────────────────────────────────────────────────────────

  _mapToObject(maybeMap) {
    if (!maybeMap) return {};
    if (maybeMap instanceof Map) {
      const out = {};
      for (const [k, v] of maybeMap) out[k] = v;
      return out;
    }
    return maybeMap;
  }

  /**
   * Mirror the computed confianzaScore back to Canal.verificacion.confianzaScore
   * so the legacy pricing/scoring path that reads from Canal stays in sync.
   * Respects the verification floor invariant — we never write a value
   * lower than 85 to a verified canal.
   */
  async _mirrorScoreToCanal(canal, score) {
    const confianza = score.confianzaScore;
    if (typeof confianza !== 'number') return;
    const update = { 'verificacion.confianzaScore': confianza };
    await Canal.findByIdAndUpdate(canal._id, { $set: update });
  }

  /**
   * Run fraud detection rules against the freshly persisted intelligence.
   * Re-loads the canal + intelligence to ensure rules see the latest state.
   * Lazy-required so this module stays importable in environments where
   * the alert model isn't loaded (e.g. partial tests).
   */
  async _runFraudDetection(canalId) {
    let fraud;
    try {
      fraud = require('./FraudDetectionService');
    } catch (_) {
      return;
    }
    if (typeof fraud?.runRules !== 'function') return;
    const [latestIntel, freshCanal] = await Promise.all([
      CanalIntelligence.findOne({ canalId }).lean(),
      Canal.findById(canalId).select('_id categoria estado verificado estadisticas').lean(),
    ]);
    if (!latestIntel || !freshCanal) return;
    return fraud.runRules({ intelligence: latestIntel, canal: freshCanal });
  }
}

module.exports = new CanalIntelligenceService();
module.exports.CanalIntelligenceServiceClass = CanalIntelligenceService;
