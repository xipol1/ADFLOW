/**
 * Campaign settlement job — platform-verified payment release.
 *
 * Payment release is NOT a choice the advertiser or the creator gets to make.
 * Instead the platform settles a campaign automatically once the ad has been
 * live for the verification window (the post must "survive" 15 days), proving
 * the placement was real and durable. If either party has a problem they open a
 * dispute within the window — which flips the campaign to DISPUTED and pulls it
 * out of this job's set until an admin resolves it.
 *
 * Eligible campaign:
 *   - status === 'PUBLISHED'
 *   - publishedAt is set and older than SETTLEMENT_WINDOW_DAYS
 *   - no open/under_review dispute
 *
 * For each eligible campaign we invoke the existing completeCampaign controller
 * with a system 'admin' actor, so the entire release + payout path (escrow
 * release, Stripe capture, Connect transfer, notifications, referral credits)
 * is reused verbatim — this job owns the SCHEDULING, not a second copy of the
 * money logic.
 *
 * Triggered by Vercel Cron (see vercel.json → /api/jobs/campaign-settlement).
 */
'use strict';

const SETTLEMENT_WINDOW_DAYS = 15;
const DAY_MS = 24 * 60 * 60 * 1000;

// System actor used to invoke completeCampaign. It is NOT a real user — it only
// has to satisfy the handler's `req.usuario.id` truthiness check and carry the
// 'admin' role that authorises a platform-initiated release.
const SYSTEM_ACTOR = { id: 'system-settlement', rol: 'admin' };

/**
 * Invoke an Express-style controller (req, res, next) and resolve/reject with
 * its outcome — the same in-process pattern scripts/e2e-campaign-flow.js uses.
 */
function invokeController(handler, { params }) {
  return new Promise((resolve, reject) => {
    const req = { usuario: SYSTEM_ACTOR, params: params || {}, body: {}, query: {} };
    const res = {
      statusCode: 200,
      status(code) { this.statusCode = code; return this; },
      json(body) {
        if (this.statusCode >= 400) reject(new Error(body?.message || `HTTP ${this.statusCode}`));
        else resolve(body);
        return this;
      },
    };
    const next = (err) =>
      reject(err instanceof Error ? err : new Error(err?.message || 'release failed'));
    Promise.resolve(handler(req, res, next)).catch(reject);
  });
}

async function runCampaignSettlementJob({ now = new Date(), windowDays = SETTLEMENT_WINDOW_DAYS } = {}) {
  const { ensureDb } = require('../lib/ensureDb');
  const ok = await ensureDb();
  if (!ok) return { ok: false, error: 'db unavailable' };

  const Campaign = require('../models/Campaign');
  const Dispute = require('../models/Dispute');
  const campaignController = require('../controllers/campaignController');

  const cutoff = new Date(now.getTime() - windowDays * DAY_MS);

  // Eligible = published long enough ago. We re-check disputes per-campaign
  // below (belt-and-braces: createDispute already flips status to DISPUTED, so
  // a disputed campaign won't match status:'PUBLISHED' here anyway).
  const due = await Campaign.find({
    status: 'PUBLISHED',
    publishedAt: { $ne: null, $lte: cutoff },
  }).select('_id publishedAt').lean();

  let released = 0;
  let skippedDisputed = 0;
  let failed = 0;
  const errors = [];

  for (const c of due) {
    try {
      const hasOpenDispute = await Dispute.exists({
        campaign: c._id,
        status: { $in: ['open', 'under_review'] },
      });
      if (hasOpenDispute) { skippedDisputed += 1; continue; }

      await invokeController(campaignController.completeCampaign, { params: { id: String(c._id) } });
      released += 1;
    } catch (err) {
      failed += 1;
      errors.push({ campaign: String(c._id), error: err?.message || String(err) });
    }
  }

  return {
    ok: true,
    windowDays,
    cutoff: cutoff.toISOString(),
    scanned: due.length,
    released,
    skippedDisputed,
    failed,
    errors,
  };
}

module.exports = { runCampaignSettlementJob, SETTLEMENT_WINDOW_DAYS };
