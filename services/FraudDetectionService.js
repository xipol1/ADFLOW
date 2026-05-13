/**
 * FraudDetectionService
 *
 * Capa 2 Fase 5 — rule engine that consumes a freshly-recomputed
 * CanalIntelligence + the source Canal document and emits CanalAlerts
 * for incoherences / suspicious patterns. Applies auto-actions on
 * critical severity (Canal.estado = 'paused_review').
 *
 * Design:
 *   - Rules are PURE functions that take (intelligence, canal) and
 *     return either null (no trigger) or a candidate alert payload.
 *     Pure means: same inputs → same output, no DB, no clock dependency
 *     beyond `now` passed in.
 *   - The service orchestrator runs each rule, persists matching alerts
 *     idempotently (one active per (canalId, type)), and applies
 *     auto-actions.
 *
 * Idempotency:
 *   The CanalAlert partial unique index on (canalId, type) WHERE
 *   status='active' guarantees we never insert duplicate active alerts.
 *   Re-triggers update lastTriggeredAt + reTriggerCount on the existing
 *   row instead of creating new ones.
 *
 * Why we don't auto-resolve:
 *   Once a rule stops firing (the canal cleaned up its act), the alert
 *   stays 'active' until an admin reviews it. This is deliberate: a
 *   canal that briefly tripped a critical rule SHOULD require human
 *   judgment to re-enable, not a transient metric change.
 *
 * Rules NOT yet implemented:
 *   - OCR_CONTRADICTS_PASSIVE: depends on Capa 3 OCR pipeline (not built).
 *   - ENGAGEMENT_ANOMALY based on CategoryBenchmark percentiles: depends
 *     on CategoryBenchmark service (Fase 4 Tier 2). For now we use
 *     absolute thresholds.
 */

'use strict';

const CanalAlert = require('../models/CanalAlert');
const Canal = require('../models/Canal');

const RULE_VERSION = 'capa2-fraud-v1';

// Thresholds — exposed as constants for tunability + test clarity. Override
// via env if you want to stay strict during a soft-launch.
const THRESHOLDS = {
  FOLLOWER_DIFF_RATIO: Number(process.env.CAPA2_FRAUD_FOLLOWER_DIFF || 0.15),
  CATEGORY_SHARE_MIN: Number(process.env.CAPA2_FRAUD_CATEGORY_SHARE || 0.60),
  ENGAGEMENT_LOW: Number(process.env.CAPA2_FRAUD_ENGAGEMENT_LOW || 0.001),
  ENGAGEMENT_HIGH: Number(process.env.CAPA2_FRAUD_ENGAGEMENT_HIGH || 0.20),
  BOT_SUSPICION: Number(process.env.CAPA2_FRAUD_BOT_SUSPICION || 0.70),
  UNIQUE_CONTENT_MIN: Number(process.env.CAPA2_FRAUD_UNIQUE_CONTENT || 0.30),
  FOLLOWER_DROP_7D: Number(process.env.CAPA2_FRAUD_FOLLOWER_DROP || -0.20),
  // Brand safety: critical flags that escalate severity.
  CRITICAL_BRAND_SAFETY_FLAGS: ['hate_speech', 'shock_violence', 'drugs', 'misinformation_suspected'],
  // Minimum window before we trust any alert (avoid alerting on canals
  // that just started observation — 7d of data minimum).
  MIN_OBSERVATION_DAYS: Number(process.env.CAPA2_FRAUD_MIN_OBSERVATION_DAYS || 7),
};

// ─── Rule pure functions ───────────────────────────────────────────────────
// Each returns { type, severity, autoAction, evidence } or null.

function ruleFollowerIncoherence(intel, canal) {
  const declared = canal?.estadisticas?.seguidores;
  const observed = intel?.growth?.followersCurrent;
  if (typeof declared !== 'number' || declared <= 0) return null;
  if (typeof observed !== 'number' || observed <= 0) return null;
  const diff = Math.abs(declared - observed) / declared;
  if (diff < THRESHOLDS.FOLLOWER_DIFF_RATIO) return null;
  return {
    type: 'FOLLOWER_INCOHERENCE',
    severity: 'warning',
    autoAction: 'flag_review',
    evidence: { declared, observed, diffRatio: diff, threshold: THRESHOLDS.FOLLOWER_DIFF_RATIO },
  };
}

function ruleCategoryMismatch(intel, canal) {
  const declared = (canal?.categoria || '').toLowerCase().normalize('NFC');
  if (!declared) return null;
  const dominant = intel?.contentMix?.dominantCategories || [];
  if (dominant.length === 0) return null;
  // If the declared category isn't even in the top 3, that's a mismatch.
  // We also require the dominant top-1 to have at least CATEGORY_SHARE_MIN
  // share, so we don't fire on canals whose content is just diverse.
  const top = dominant[0];
  if (!top || top.share < THRESHOLDS.CATEGORY_SHARE_MIN) return null;
  const declaredHasMatch = dominant.some(
    (d) => (d.category || '').toLowerCase().normalize('NFC') === declared
  );
  if (declaredHasMatch) return null;
  return {
    type: 'CATEGORY_MISMATCH',
    severity: 'warning',
    autoAction: 'flag_review',
    evidence: { declared, topDetected: top, dominantCategories: dominant },
  };
}

function ruleEngagementAnomaly(intel /* canal */) {
  const rate = intel?.engagement?.engagementRate30d;
  if (typeof rate !== 'number') return null;
  if (rate < THRESHOLDS.ENGAGEMENT_LOW) {
    return {
      type: 'ENGAGEMENT_ANOMALY_LOW',
      severity: 'info',
      autoAction: 'none',
      evidence: { rate, threshold: THRESHOLDS.ENGAGEMENT_LOW },
    };
  }
  if (rate > THRESHOLDS.ENGAGEMENT_HIGH) {
    return {
      type: 'ENGAGEMENT_ANOMALY_HIGH',
      severity: 'warning',
      autoAction: 'flag_review',
      evidence: { rate, threshold: THRESHOLDS.ENGAGEMENT_HIGH },
    };
  }
  return null;
}

function ruleBotAdminSuspicion(intel /* canal */) {
  const score = intel?.trust?.botAdminSuspicionScore;
  if (typeof score !== 'number') return null;
  if (score < THRESHOLDS.BOT_SUSPICION) return null;
  return {
    type: 'BOT_ADMIN_SUSPICION',
    severity: 'critical',
    autoAction: 'pause_listings',
    evidence: { score, threshold: THRESHOLDS.BOT_SUSPICION },
  };
}

function ruleDuplicateContentFarm(intel /* canal */) {
  const ratio = intel?.contentMix?.uniqueContentRatio;
  if (typeof ratio !== 'number') return null;
  if (ratio >= THRESHOLDS.UNIQUE_CONTENT_MIN) return null;
  return {
    type: 'DUPLICATE_CONTENT_FARM',
    severity: 'critical',
    autoAction: 'pause_listings',
    evidence: { uniqueContentRatio: ratio, threshold: THRESHOLDS.UNIQUE_CONTENT_MIN },
  };
}

function ruleSuddenFollowerDrop(intel /* canal */) {
  // We approximate "24h drop" with the 7d rate since our snapshots are
  // typically hourly-to-daily and a tighter window has too much noise.
  // The plan calls for "20% drop in 24h" — using -20% in 7d errs on the
  // generous side; tune via CAPA2_FRAUD_FOLLOWER_DROP if needed.
  const rate7d = intel?.growth?.followerGrowthRate7d;
  if (typeof rate7d !== 'number') return null;
  if (rate7d > THRESHOLDS.FOLLOWER_DROP_7D) return null;
  return {
    type: 'SUDDEN_FOLLOWER_DROP',
    severity: 'critical',
    autoAction: 'pause_listings',
    evidence: {
      rate7d,
      threshold: THRESHOLDS.FOLLOWER_DROP_7D,
      followersCurrent: intel?.growth?.followersCurrent,
      followersStart30d: intel?.growth?.followersStart30d,
    },
  };
}

function ruleBrandSafetyViolation(intel /* canal */) {
  const aggregate = intel?.trust?.brandSafetyFlagsAggregate;
  if (!aggregate) return null;
  // Map or plain object — handle both.
  const entries = aggregate instanceof Map
    ? [...aggregate.entries()]
    : Object.entries(aggregate || {});
  if (entries.length === 0) return null;
  const violations = entries.filter(
    ([flag, count]) => THRESHOLDS.CRITICAL_BRAND_SAFETY_FLAGS.includes(flag) && count > 0
  );
  if (violations.length === 0) return null;
  const totalViolations = violations.reduce((a, [, c]) => a + c, 0);
  // 1 violation → warning, 3+ → critical
  const severity = totalViolations >= 3 ? 'critical' : 'warning';
  return {
    type: 'BRAND_SAFETY_VIOLATION',
    severity,
    autoAction: severity === 'critical' ? 'pause_listings' : 'flag_review',
    evidence: {
      violations: Object.fromEntries(violations),
      totalViolations,
      brandSafetyScoreAvg: intel?.trust?.brandSafetyScoreAvg,
    },
  };
}

// All rules in order. To add a new rule: write a pure function above,
// append it here, then add a test.
const RULES = [
  ruleFollowerIncoherence,
  ruleCategoryMismatch,
  ruleEngagementAnomaly,
  ruleBotAdminSuspicion,
  ruleDuplicateContentFarm,
  ruleSuddenFollowerDrop,
  ruleBrandSafetyViolation,
];

// ─── Service ────────────────────────────────────────────────────────────────

class FraudDetectionService {
  /**
   * Run all rules against a freshly-computed intelligence + canal pair.
   * Pure rule application + persistence — caller (CanalIntelligenceService)
   * decides WHEN to invoke this.
   *
   * @returns {Promise<{ candidates: Array, applied: Array }>}
   *   candidates: every rule that fired (for logging / dashboards)
   *   applied:    the alerts we persisted (or updated)
   */
  async runRules({ intelligence, canal }) {
    if (!intelligence || !canal) {
      return { candidates: [], applied: [], skipped: 'missing inputs' };
    }

    // Don't fire alerts on canals with insufficient observation history —
    // 7d minimum so rules have signal to work with.
    if (!this._hasEnoughObservation(intelligence)) {
      return { candidates: [], applied: [], skipped: 'observation window too short' };
    }

    const candidates = [];
    for (const rule of RULES) {
      try {
        const result = rule(intelligence, canal);
        if (result) candidates.push(result);
      } catch (err) {
        console.warn(`[fraud] rule ${rule.name} crashed:`, err.message);
      }
    }

    const applied = [];
    for (const candidate of candidates) {
      try {
        const alert = await this._upsertAlert(canal, candidate);
        applied.push(alert);
        if (candidate.autoAction === 'pause_listings') {
          await this._applyPauseAction(canal._id, alert._id, candidate);
        }
      } catch (err) {
        console.warn(`[fraud] persist failed for ${candidate.type}:`, err.message);
      }
    }

    return { candidates, applied };
  }

  // ─── Internal ────────────────────────────────────────────────────────────

  _hasEnoughObservation(intelligence) {
    const days = intelligence?.sampleWindowDays || 30;
    // Use post count as a proxy for "did we actually observe ≥ minDays of activity"
    const posts = intelligence?.inputCounts?.posts30d ?? 0;
    if (posts < 3) return false;
    // Also require the intelligence document itself to be at least minDays old
    // OR have ≥ minDays of snapshots. Either is enough confidence.
    const snapshotsInWindow = intelligence?.inputCounts?.snapshots90d ?? 0;
    return snapshotsInWindow >= THRESHOLDS.MIN_OBSERVATION_DAYS || posts >= 10;
  }

  async _upsertAlert(canal, candidate) {
    const now = new Date();
    // Upsert the active alert. If it exists, bump reTriggerCount and
    // update evidence. The partial unique index on (canalId, type) WHERE
    // status='active' makes this atomic.
    const filter = { canalId: canal._id, type: candidate.type, status: 'active' };
    const update = {
      $set: {
        severity: candidate.severity,
        autoAction: candidate.autoAction,
        evidence: candidate.evidence,
        lastTriggeredAt: now,
        ruleVersion: RULE_VERSION,
      },
      $setOnInsert: {
        canalId: canal._id,
        type: candidate.type,
        status: 'active',
        triggeredAt: now,
      },
      $inc: { reTriggerCount: 1 },
    };
    return CanalAlert.findOneAndUpdate(filter, update, {
      upsert: true,
      new: true,
      setDefaultsOnInsert: true,
    });
  }

  async _applyPauseAction(canalId, alertId, candidate) {
    // Only set estado=paused_review if the canal isn't already paused.
    // Avoids overwriting a manual admin pause with our own.
    const canal = await Canal.findById(canalId).select('_id estado').lean();
    if (!canal) return;
    if (canal.estado === 'paused_review' || canal.estado === 'suspendido') return;
    await Canal.findByIdAndUpdate(canalId, {
      $set: { estado: 'paused_review' },
    });
    await CanalAlert.findByIdAndUpdate(alertId, {
      $set: { autoActionAppliedAt: new Date() },
    });
    console.warn(
      `[fraud] AUTO-PAUSED canal=${canalId} due to ${candidate.type} severity=${candidate.severity}`
    );
  }

  // ─── Admin ops ───────────────────────────────────────────────────────────

  /**
   * Mark an alert as resolved. Used by the admin endpoint. Does NOT
   * un-pause the canal — that's a separate admin action.
   */
  async resolveAlert(alertId, { userId, note = '' } = {}) {
    return CanalAlert.findByIdAndUpdate(
      alertId,
      {
        $set: {
          status: 'resolved',
          resolvedAt: new Date(),
          resolvedBy: userId || null,
          resolutionNote: note,
        },
      },
      { new: true }
    );
  }

  async dismissAlert(alertId, { userId, note = '' } = {}) {
    return CanalAlert.findByIdAndUpdate(
      alertId,
      {
        $set: {
          status: 'dismissed',
          resolvedAt: new Date(),
          resolvedBy: userId || null,
          resolutionNote: note,
        },
      },
      { new: true }
    );
  }

  async listAlertsForCanal(canalId, { includeResolved = false, limit = 50 } = {}) {
    const filter = { canalId };
    if (!includeResolved) filter.status = 'active';
    return CanalAlert.find(filter)
      .sort({ severity: 1, triggeredAt: -1 }) // critical first (alphabetically c<i<w)
      .limit(limit)
      .lean();
  }
}

module.exports = new FraudDetectionService();
module.exports.FraudDetectionServiceClass = FraudDetectionService;
module.exports.THRESHOLDS = THRESHOLDS;
module.exports.RULE_VERSION = RULE_VERSION;
// Exposed for unit tests
module.exports.rules = {
  ruleFollowerIncoherence,
  ruleCategoryMismatch,
  ruleEngagementAnomaly,
  ruleBotAdminSuspicion,
  ruleDuplicateContentFarm,
  ruleSuddenFollowerDrop,
  ruleBrandSafetyViolation,
};
