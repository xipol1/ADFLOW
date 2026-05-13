/**
 * ContentIntelligenceService
 *
 * Capa 2 Fase 3 — NLP enrichment orchestrator for CanalPostObservation.
 *
 * Flow for a batch:
 *   1. Load observations (cap 20 — Anthropic batch ceiling per the plan).
 *   2. Run local classifiers (lang, emoji, hashtags, promotional signals,
 *      discount codes) — free.
 *   3. For each post, look up Redis cache keyed by bodyHash. Identical
 *      text reposted across canals reuses the same LLM result.
 *   4. For cache misses, estimate the Claude Haiku cost. If LLMBudgetGuard
 *      says we'd cross the monthly cap, skip the LLM call and persist
 *      local-only enrichment.
 *   5. Otherwise call anthropicClient.classifyBatch on the cache misses
 *      AS A SINGLE batched call, record actual cost, cache results by
 *      bodyHash.
 *   6. Merge local + LLM (LLM wins where it has data) and write back to
 *      CanalPostObservation.nlp.
 *
 * Cache TTL: 365 days. Texts don't change — re-classifying the same body
 * is wasted spend. Operators bump NLP_ENRICHMENT_VERSION when the schema
 * or prompt changes, which we DON'T retroactively re-enrich (do it via a
 * separate backfill script if needed).
 *
 * No side effects beyond Mongo + Redis writes. No queue interaction —
 * this service is invoked BY the enrichment scheduler worker, not the
 * other way around, to keep the dependency graph acyclic.
 */

'use strict';

const CanalPostObservation = require('../models/CanalPostObservation');
const localClassifiers = require('./nlp/localClassifiers');
const llmBudgetGuard = require('./nlp/LLMBudgetGuard');
const anthropicClient = require('./nlp/anthropicClient');

// Bump when the prompt OR the merged-nlp shape changes — lets future code
// detect stale enrichments. Not auto-invalidated; backfill script needed.
const NLP_ENRICHMENT_VERSION = 'capa2-haiku-v1';

const CACHE_KEY_PREFIX = 'capa2:nlp-cache:';
const CACHE_TTL_SECONDS = 365 * 24 * 3600;
const MAX_BATCH = 20;
// Upper bound for the LLM output tokens budget per post in a batch. Used
// only for the pre-call cost estimate; actual usage is recorded post-call.
const OUTPUT_TOKENS_PER_POST_ESTIMATE = 220;

class ContentIntelligenceService {
  constructor() {
    this._redis = null;
    this._redisAttempted = false;
  }

  /**
   * Convenience for single-doc enrichment from a BullMQ job handler.
   * Returns the updated CanalPostObservation doc (or null if not found).
   */
  async enrichObservation(observationId) {
    const results = await this.enrichBatch([observationId]);
    return results[0] || null;
  }

  /**
   * Batch entrypoint. Loads the observations, runs the full pipeline,
   * writes nlp back, returns the updated docs.
   *
   * @param {Array<string>} observationIds  Mongo ObjectIds — caller MUST
   *   ensure all belong to the same downstream policy (we don't separate
   *   by canal here; a heterogeneous batch is fine).
   * @returns {Promise<Array>}
   */
  async enrichBatch(observationIds) {
    if (!Array.isArray(observationIds) || observationIds.length === 0) return [];
    const limited = observationIds.slice(0, MAX_BATCH);

    const obs = await CanalPostObservation.find({ _id: { $in: limited } })
      .select('_id body bodyHash type isForwarded nlp')
      .lean();
    if (obs.length === 0) return [];

    // ── Step 1: local classifiers ─────────────────────────────────────────
    const localByObsId = new Map();
    for (const o of obs) {
      localByObsId.set(String(o._id), localClassifiers.runLocalClassifiers(o.body || ''));
    }

    // ── Step 2: cache lookup ──────────────────────────────────────────────
    const cacheHits = new Map();    // obsId → cached LLM result
    const cacheMisses = [];          // observations needing LLM
    for (const o of obs) {
      if (!o.bodyHash) {
        // No hash → can't cache, but we still call LLM (text exists)
        cacheMisses.push(o);
        continue;
      }
      const cached = await this._cacheGet(o.bodyHash);
      if (cached) {
        cacheHits.set(String(o._id), cached);
      } else {
        cacheMisses.push(o);
      }
    }

    // ── Step 3 + 4 + 5: budget gate + LLM call ────────────────────────────
    let llmResults = new Map();       // obsId → LLM result
    let llmCallStatus = 'skipped';    // 'ok' | 'over_budget' | 'api_error' | 'parse_failed' | 'skipped'

    if (cacheMisses.length > 0) {
      const promptPayload = cacheMisses.map((o) => ({
        id: String(o._id),
        body: o.body || '',
        type: o.type || 'text',
        isForwarded: !!o.isForwarded,
        localSignals: localByObsId.get(String(o._id)),
      }));
      const userPrompt = anthropicClient.buildPrompt(promptPayload);
      const inputTokensEst = anthropicClient.estimateInputTokens(
        anthropicClient.SYSTEM_PROMPT || require('./nlp/anthropicClient').SYSTEM_PROMPT,
        userPrompt
      );
      const outputTokensEst = OUTPUT_TOKENS_PER_POST_ESTIMATE * cacheMisses.length;
      const estCost = llmBudgetGuard.estimateCostEur({
        inputTokens: inputTokensEst,
        outputTokens: outputTokensEst,
      });
      const verdict = await llmBudgetGuard.canSpend(estCost);

      if (!verdict.allowed) {
        llmCallStatus = 'over_budget';
        console.warn(
          `[content-intel] LLM call SKIPPED (${verdict.reason}) — €${verdict.spentEur?.toFixed(2)}/${verdict.budgetEur?.toFixed(2)} this month. ${cacheMisses.length} posts get local-only enrichment.`
        );
      } else {
        const llm = await anthropicClient.classifyBatch(promptPayload);
        if (llm.ok) {
          llmCallStatus = 'ok';
          // Record actual cost
          const actualCost = llmBudgetGuard.estimateCostEur({
            inputTokens: llm.usage.inputTokens,
            outputTokens: llm.usage.outputTokens,
          });
          await llmBudgetGuard.recordSpend(actualCost, {
            calls: 1,
            inputTokens: llm.usage.inputTokens,
            outputTokens: llm.usage.outputTokens,
          });
          for (const r of llm.results) {
            if (r?.id) llmResults.set(String(r.id), r);
          }
          // Populate cache
          for (const o of cacheMisses) {
            const r = llmResults.get(String(o._id));
            if (r && o.bodyHash) {
              await this._cacheSet(o.bodyHash, r);
            }
          }
        } else {
          llmCallStatus = llm.reason || 'api_error';
          console.warn(`[content-intel] LLM call FAILED (${llm.reason}): ${llm.error || ''}`);
        }
      }
    }

    // ── Step 6: merge + persist ────────────────────────────────────────────
    const updated = [];
    for (const o of obs) {
      const obsId = String(o._id);
      const llmResult = cacheHits.get(obsId) || llmResults.get(obsId) || null;
      const nlp = this._mergeNlp({
        local: localByObsId.get(obsId),
        llm: llmResult,
        partial: !llmResult, // true when we only have local data
        llmCallStatus,
      });
      const doc = await CanalPostObservation.findByIdAndUpdate(
        o._id,
        { $set: { nlp } },
        { new: true }
      );
      updated.push(doc);
    }
    return updated;
  }

  // ─── Internal helpers ────────────────────────────────────────────────────

  /**
   * Combine local classifier output + LLM output into the nlp subdoc.
   * LLM wins for fields it provides; local fills the rest.
   *
   * The `partial` flag is stamped onto `enrichmentVersion` so a downstream
   * audit can see which docs only got local enrichment (cap exceeded or
   * LLM failed) and may merit a re-enrichment run later.
   */
  _mergeNlp({ local, llm, partial, llmCallStatus }) {
    const out = {
      lang: llm?.lang || local?.lang || 'unknown',
      categories: Array.isArray(llm?.categories) ? llm.categories : [],
      sentiment: typeof llm?.sentiment === 'number' ? llm.sentiment : null,
      brandSafetyScore: typeof llm?.brandSafetyScore === 'number' ? llm.brandSafetyScore : null,
      brandSafetyFlags: Array.isArray(llm?.brandSafetyFlags) ? llm.brandSafetyFlags : [],
      isPromotional:
        typeof llm?.isPromotional === 'boolean'
          ? llm.isPromotional
          : (typeof local?.isLikelyPromotional === 'boolean' ? local.isLikelyPromotional : null),
      promotionalSignals: (llm?.promotionalSignals && llm.promotionalSignals.length > 0)
        ? llm.promotionalSignals
        : (local?.promotionalSignals || []),
      buyerIntent: typeof llm?.buyerIntent === 'number' ? llm.buyerIntent : null,
      topicsKeywords: Array.isArray(llm?.topicsKeywords) ? llm.topicsKeywords : [],
      enrichedAt: new Date(),
      enrichmentVersion: partial
        ? `${NLP_ENRICHMENT_VERSION}+local-only-${llmCallStatus}`
        : NLP_ENRICHMENT_VERSION,
    };
    return out;
  }

  async _cacheGet(bodyHash) {
    const redis = await this._getRedis();
    if (!redis) return null;
    try {
      const raw = await redis.get(`${CACHE_KEY_PREFIX}${bodyHash}`);
      return raw ? JSON.parse(raw) : null;
    } catch (err) {
      console.warn('[content-intel] cache get failed:', err.message);
      return null;
    }
  }

  async _cacheSet(bodyHash, llmResult) {
    const redis = await this._getRedis();
    if (!redis) return;
    try {
      await redis.set(
        `${CACHE_KEY_PREFIX}${bodyHash}`,
        JSON.stringify(llmResult),
        'EX',
        CACHE_TTL_SECONDS
      );
    } catch (err) {
      console.warn('[content-intel] cache set failed:', err.message);
    }
  }

  async _getRedis() {
    if (this._redis) return this._redis;
    if (this._redisAttempted) return null;
    this._redisAttempted = true;
    const url = process.env.REDIS_URL;
    if (!url) return null;
    try {
      const RedisCtor = require('ioredis');
      this._redis = new RedisCtor(url, {
        maxRetriesPerRequest: 2,
        enableReadyCheck: false,
      });
      this._redis.on('error', (err) => {
        console.warn('[content-intel] redis error:', err.message);
      });
      return this._redis;
    } catch (err) {
      console.warn('[content-intel] ioredis unavailable, cache disabled:', err.message);
      return null;
    }
  }
}

module.exports = new ContentIntelligenceService();
module.exports.ContentIntelligenceServiceClass = ContentIntelligenceService;
module.exports.NLP_ENRICHMENT_VERSION = NLP_ENRICHMENT_VERSION;
module.exports.MAX_BATCH = MAX_BATCH;
