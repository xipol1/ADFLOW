/**
 * LLMBudgetGuard
 *
 * Capa 2 Fase 3 — Redis-backed monthly spend tracker for the Anthropic
 * API. Two responsibilities:
 *
 *   1. `canSpend(estimatedCostEur)` → boolean
 *      Checks current month's recorded spend + the candidate cost
 *      against LLM_MONTHLY_BUDGET_EUR (default 50). Returns false if
 *      the call would exceed the cap.
 *
 *   2. `recordSpend(actualCostEur, { calls, inputTokens, outputTokens })`
 *      Atomically increments the month's counter. Emits an admin alert
 *      log when spend crosses 80% of the cap (warned once per month).
 *
 * Why Redis: we already use it for the BullMQ scheduler and the
 * WhatsApp verification cache. Reusing the same connection avoids a
 * separate connection pool. State is monthly bucketed (`ym:YYYY-MM`)
 * so rollover is implicit — no cron needed.
 *
 * Local fallback: when REDIS_URL is unset OR Redis is unreachable,
 * the guard falls back to an in-memory counter. This keeps tests + local
 * dev simple and prevents an outage in the Redis layer from blocking
 * all NLP enrichment (better to over-spend a bit and alert loudly than
 * to silently halt classification).
 *
 * Cost estimation: Claude Haiku as of late 2025 is roughly
 *   input  $0.80 / Mtoken   ≈ €0.74 / Mtoken
 *   output $4.00 / Mtoken   ≈ €3.70 / Mtoken
 * Set via env LLM_HAIKU_INPUT_EUR_PER_MTOKEN / LLM_HAIKU_OUTPUT_EUR_PER_MTOKEN
 * so operators can adjust without redeploying when Anthropic changes pricing.
 */

'use strict';

const REDIS_KEY_PREFIX = 'capa2:llm-spend:';
const ALERT_FLAG_PREFIX = 'capa2:llm-alert80:';
// 1.4 = approximate USD→EUR mid-rate at time of writing; override via env
const DEFAULT_INPUT_EUR_PER_MTOKEN = 0.74;
const DEFAULT_OUTPUT_EUR_PER_MTOKEN = 3.70;
const DEFAULT_MONTHLY_BUDGET_EUR = 50;

class LLMBudgetGuard {
  constructor() {
    this._redis = null;
    this._memoryFallback = new Map(); // key → { spendEur, calls, inputTokens, outputTokens, alertSent }
    this._connectAttempted = false;
  }

  // ─── Public API ──────────────────────────────────────────────────────────

  async getMonthlyBudgetEur() {
    return Number(process.env.LLM_MONTHLY_BUDGET_EUR || DEFAULT_MONTHLY_BUDGET_EUR);
  }

  async getCurrentSpendEur() {
    const key = this._currentMonthKey();
    const redis = await this._getRedisOrNull();
    if (redis) {
      try {
        const raw = await redis.get(key);
        return raw ? Number(raw) : 0;
      } catch (err) {
        console.warn('[llm-budget] redis read failed, falling back to memory:', err.message);
      }
    }
    const m = this._memoryFallback.get(key);
    return m?.spendEur || 0;
  }

  /**
   * Compute the EUR cost of a hypothetical Claude Haiku call from token
   * estimates. Pure function — no side effects, no Redis.
   */
  estimateCostEur({ inputTokens = 0, outputTokens = 0 } = {}) {
    const inRate = Number(process.env.LLM_HAIKU_INPUT_EUR_PER_MTOKEN || DEFAULT_INPUT_EUR_PER_MTOKEN);
    const outRate = Number(process.env.LLM_HAIKU_OUTPUT_EUR_PER_MTOKEN || DEFAULT_OUTPUT_EUR_PER_MTOKEN);
    return (inputTokens / 1_000_000) * inRate + (outputTokens / 1_000_000) * outRate;
  }

  /**
   * Should we make this call? Returns `{ allowed, reason, spentEur, budgetEur }`.
   * `allowed: false` means the caller MUST NOT proceed — current spend +
   * estimated cost would cross the cap.
   */
  async canSpend(estimatedCostEur = 0) {
    const budgetEur = await this.getMonthlyBudgetEur();
    const spentEur = await this.getCurrentSpendEur();
    if (budgetEur <= 0) {
      return {
        allowed: false,
        reason: 'budget_disabled',
        spentEur,
        budgetEur,
      };
    }
    const wouldBe = spentEur + Math.max(0, Number(estimatedCostEur) || 0);
    if (wouldBe > budgetEur) {
      return {
        allowed: false,
        reason: 'over_budget',
        spentEur,
        budgetEur,
        wouldBeEur: wouldBe,
      };
    }
    return { allowed: true, spentEur, budgetEur };
  }

  /**
   * Atomically increment the month's counter. Returns the new total.
   * Always succeeds locally even if Redis is down.
   */
  async recordSpend(actualCostEur, meta = {}) {
    const cost = Math.max(0, Number(actualCostEur) || 0);
    if (cost === 0) return await this.getCurrentSpendEur();

    const key = this._currentMonthKey();
    const redis = await this._getRedisOrNull();
    let newTotal;

    if (redis) {
      try {
        // INCRBYFLOAT for atomic accumulation. Set TTL on first write so
        // we don't accumulate stale months forever.
        const raw = await redis.incrbyfloat(key, cost);
        newTotal = Number(raw);
        // 95 days = enough to keep this month + prior for reconciliation.
        await redis.expire(key, 95 * 24 * 3600).catch(() => {});
        // Optional metadata counters
        if (meta.calls) {
          await redis.hincrby(`${key}:meta`, 'calls', meta.calls).catch(() => {});
        }
        if (meta.inputTokens) {
          await redis.hincrby(`${key}:meta`, 'inputTokens', meta.inputTokens).catch(() => {});
        }
        if (meta.outputTokens) {
          await redis.hincrby(`${key}:meta`, 'outputTokens', meta.outputTokens).catch(() => {});
        }
        await redis.expire(`${key}:meta`, 95 * 24 * 3600).catch(() => {});
      } catch (err) {
        console.warn('[llm-budget] redis recordSpend failed, falling back to memory:', err.message);
        newTotal = this._memoryRecord(key, cost, meta);
      }
    } else {
      newTotal = this._memoryRecord(key, cost, meta);
    }

    // 80% alert — once per month per key. Emitted as a console.warn for
    // now (downstream operator alerting hooks plug in here later).
    const budgetEur = await this.getMonthlyBudgetEur();
    if (budgetEur > 0 && newTotal >= 0.8 * budgetEur) {
      await this._maybeEmitAlert(key, newTotal, budgetEur);
    }

    return newTotal;
  }

  /**
   * Diagnostic snapshot for the admin health endpoint.
   */
  async getHealthSnapshot() {
    const budgetEur = await this.getMonthlyBudgetEur();
    const spentEur = await this.getCurrentSpendEur();
    const key = this._currentMonthKey();
    const redis = await this._getRedisOrNull();
    let meta = null;
    if (redis) {
      try {
        meta = await redis.hgetall(`${key}:meta`);
      } catch (_) { /* ignore */ }
    }
    return {
      monthKey: key,
      budgetEur,
      spentEur,
      remainingEur: Math.max(0, budgetEur - spentEur),
      usagePct: budgetEur > 0 ? +((spentEur / budgetEur) * 100).toFixed(1) : null,
      meta: meta || null,
      source: redis ? 'redis' : 'memory',
    };
  }

  /**
   * Test-only — reset in-memory state. Does NOT touch Redis.
   */
  _resetMemoryForTests() {
    this._memoryFallback.clear();
  }

  // ─── Internal ────────────────────────────────────────────────────────────

  _currentMonthKey() {
    const now = new Date();
    const yyyy = now.getUTCFullYear();
    const mm = String(now.getUTCMonth() + 1).padStart(2, '0');
    return `${REDIS_KEY_PREFIX}${yyyy}-${mm}`;
  }

  _memoryRecord(key, cost, meta) {
    const cur = this._memoryFallback.get(key) || {
      spendEur: 0, calls: 0, inputTokens: 0, outputTokens: 0, alertSent: false,
    };
    cur.spendEur += cost;
    if (meta.calls) cur.calls += meta.calls;
    if (meta.inputTokens) cur.inputTokens += meta.inputTokens;
    if (meta.outputTokens) cur.outputTokens += meta.outputTokens;
    this._memoryFallback.set(key, cur);
    return cur.spendEur;
  }

  async _maybeEmitAlert(key, spentEur, budgetEur) {
    const flag = `${ALERT_FLAG_PREFIX}${key.replace(REDIS_KEY_PREFIX, '')}`;
    const redis = await this._getRedisOrNull();
    if (redis) {
      try {
        const set = await redis.setnx(flag, '1');
        if (set === 1) {
          await redis.expire(flag, 95 * 24 * 3600).catch(() => {});
          console.warn(`[llm-budget] ⚠ 80%% budget reached — spent €${spentEur.toFixed(2)} / €${budgetEur.toFixed(2)} (${key})`);
        }
      } catch (_) { /* fall through */ }
    } else {
      const m = this._memoryFallback.get(key);
      if (m && !m.alertSent) {
        m.alertSent = true;
        console.warn(`[llm-budget] ⚠ 80%% budget reached — spent €${spentEur.toFixed(2)} / €${budgetEur.toFixed(2)} (${key})`);
      }
    }
  }

  async _getRedisOrNull() {
    if (this._redis) return this._redis;
    if (this._connectAttempted) return null;
    this._connectAttempted = true;
    const url = process.env.REDIS_URL;
    if (!url) return null;
    try {
      const RedisCtor = require('ioredis');
      this._redis = new RedisCtor(url, {
        maxRetriesPerRequest: 2,
        enableReadyCheck: false,
        lazyConnect: false,
      });
      this._redis.on('error', (err) => {
        // log once per error type — ioredis can spam
        console.warn('[llm-budget] redis error:', err.message);
      });
      return this._redis;
    } catch (err) {
      console.warn('[llm-budget] ioredis unavailable, using in-memory fallback:', err.message);
      return null;
    }
  }
}

module.exports = new LLMBudgetGuard();
module.exports.LLMBudgetGuardClass = LLMBudgetGuard;
module.exports.DEFAULT_MONTHLY_BUDGET_EUR = DEFAULT_MONTHLY_BUDGET_EUR;
