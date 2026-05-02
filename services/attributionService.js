const mongoose = require('mongoose');
const TrackingLink = require('../models/TrackingLink');

/**
 * Multi-touch attribution.
 *
 * Given a Conversion (which carries a uid + campaign), find every click
 * the same visitor made in the lookback window across ALL the advertiser's
 * tracking links, then split credit using the chosen model.
 *
 * Models supported:
 *   last_touch — full credit to the most recent click (single-touch baseline)
 *   linear     — equal weight to every click in the window
 *   time_decay — exponentially weight recent clicks higher (half-life: 7 days)
 *
 * Returns:
 *   {
 *     model,
 *     touches: [{ clickId, campaignId, weight, ts }],   weights sum to 1.0
 *     computedAt
 *   }
 *
 * The attribution result can be persisted onto the Conversion document so
 * subsequent ROI computations are O(1).
 */

const HALF_LIFE_DAYS = 7;

const toObjectId = (id) => {
  if (id instanceof mongoose.Types.ObjectId) return id;
  try { return new mongoose.Types.ObjectId(String(id)) } catch { return id }
}

/**
 * Find all clicks for a given uid in the last N days. Each TrackingLink
 * holds its clicks in an embedded array (capped at 500), so we use $unwind
 * to flatten across the advertiser's links.
 */
async function findClicksForVisitor({ uid, advertiserId, lookbackDays = 30 }) {
  if (!uid) return [];
  const since = new Date(Date.now() - lookbackDays * 86400000);

  // Two-step: first get TrackingLinks owned by the advertiser (via createdBy),
  // then unwind their clicks. Done as a single aggregation to keep round-trips
  // down. We only need a few fields per click — keeps memory bounded.
  const pipeline = [
    advertiserId
      ? { $match: { createdBy: toObjectId(advertiserId) } }
      : { $match: {} },
    { $unwind: '$clicks' },
    { $match: { 'clicks.uid': uid, 'clicks.timestamp': { $gte: since } } },
    { $project: {
        clickId:    '$clicks.clickId',
        campaignId: '$campaign',
        ts:         '$clicks.timestamp',
        _id: 0,
      }
    },
    { $sort: { ts: 1 } },
  ];
  return await TrackingLink.aggregate(pipeline).catch(err => {
    console.error('attributionService.findClicks failed:', err.message);
    return [];
  });
}

function applyModel(touches, model) {
  if (touches.length === 0) return [];
  if (touches.length === 1 || model === 'last_touch') {
    // Sole click (or last_touch model) — 100% to the latest one.
    const last = touches[touches.length - 1];
    return [{ ...last, weight: 1 }];
  }
  if (model === 'linear') {
    const w = 1 / touches.length;
    return touches.map(t => ({ ...t, weight: w }));
  }
  if (model === 'time_decay') {
    // Exponential decay: weight(t) = 2 ^ (- ageDays / HALF_LIFE_DAYS)
    // The most recent click is age 0 → weight 1.0; older clicks taper off.
    const lastTs = touches[touches.length - 1].ts.getTime();
    const raw = touches.map(t => {
      const ageDays = (lastTs - t.ts.getTime()) / 86400000;
      return Math.pow(2, -ageDays / HALF_LIFE_DAYS);
    });
    const sum = raw.reduce((s, v) => s + v, 0) || 1;
    return touches.map((t, i) => ({ ...t, weight: raw[i] / sum }));
  }
  // Unknown model → fall back to last_touch
  const last = touches[touches.length - 1];
  return [{ ...last, weight: 1 }];
}

/**
 * Compute attribution for a conversion. Returns the touches + weights.
 *
 *   await computeAttribution({ uid, advertiserId, model, lookbackDays })
 */
async function computeAttribution({ uid, advertiserId, model = 'last_touch', lookbackDays = 30 }) {
  const touches = await findClicksForVisitor({ uid, advertiserId, lookbackDays });
  const weighted = applyModel(touches, model);
  return {
    model,
    touches: weighted,
    computedAt: new Date(),
  };
}

/**
 * Compute attributed revenue per campaign across a set of conversions.
 * Used by roiService when the advertiser has selected a non-last-touch model.
 *
 * Returns: Map<campaignId, attributedRevenue>
 */
async function attributeConversions({ conversions, advertiserId, model, lookbackDays }) {
  const credits = new Map();
  for (const conv of conversions) {
    const touches = await findClicksForVisitor({
      uid: conv.uid,
      advertiserId,
      lookbackDays,
    });
    const weighted = applyModel(touches, model);
    if (weighted.length === 0) {
      // No multi-touch data found — fall back to single-touch on the conv's
      // own campaign so we don't lose the revenue entirely.
      const k = String(conv.campaign);
      credits.set(k, (credits.get(k) || 0) + (conv.value || 0));
      continue;
    }
    weighted.forEach(t => {
      const k = String(t.campaignId);
      credits.set(k, (credits.get(k) || 0) + (conv.value || 0) * t.weight);
    });
  }
  return credits;
}

module.exports = {
  computeAttribution,
  attributeConversions,
  findClicksForVisitor,
  applyModel,
};
