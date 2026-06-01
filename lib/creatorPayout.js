/**
 * Creator payout amount — proportional to REAL money captured (product
 * decision 2026-06).
 *
 * A campaign's price can be covered partly or fully by promotional/welcome
 * credits. Those credits are a discount the platform grants the advertiser,
 * NOT cash that entered the platform. So the creator's withdrawable payout is
 * their commission-adjusted share of the money that was actually captured
 * (`price - creditsApplied`), never of the full sticker price. A campaign paid
 * 100% with credits yields a 0 EUR payout — the credit value never converts to
 * withdrawable cash.
 *
 * `creatorPayable` is computed and persisted on the Campaign at payment time
 * (campaignController.payCampaign) so completion (the Stripe Connect transfer)
 * and the two withdrawal paths all read the same number. Legacy campaigns paid
 * before this field existed fall back to `netAmount` — which is correct for
 * real-money campaigns (there creditsApplied == 0, so the proportional value
 * equals netAmount) and only over-counts pre-existing credit-funded campaigns,
 * a bounded one-time migration boundary.
 */

const { DEFAULT_COMMISSION_RATE } = require('../config/commissions');

const rateOf = (campaign) =>
  campaign && Number.isFinite(campaign.commissionRate)
    ? campaign.commissionRate
    : DEFAULT_COMMISSION_RATE;

/**
 * Compute the cash owed to the creator from the amount actually captured.
 * @param {number} capturedAmount  real EUR charged (price - credits applied)
 * @param {number} commissionRate  platform commission as a fraction (e.g. 0.15)
 */
function computeCreatorPayable(capturedAmount, commissionRate) {
  const rate = Number.isFinite(commissionRate) ? commissionRate : DEFAULT_COMMISSION_RATE;
  const captured = Number.isFinite(capturedAmount) ? Math.max(0, capturedAmount) : 0;
  return +(captured * (1 - rate)).toFixed(2);
}

/**
 * Resolve the creator's withdrawable payout for a campaign.
 * Prefers the persisted creatorPayable; else derives from capturedAmount; else
 * falls back to netAmount / price*(1-rate) for legacy campaigns.
 */
function resolveCreatorPayable(campaign) {
  if (!campaign) return 0;
  if (Number.isFinite(campaign.creatorPayable)) return campaign.creatorPayable;
  if (Number.isFinite(campaign.capturedAmount)) {
    return computeCreatorPayable(campaign.capturedAmount, rateOf(campaign));
  }
  if (Number.isFinite(campaign.netAmount) && campaign.netAmount > 0) return campaign.netAmount;
  return +(((campaign.price || 0) * (1 - rateOf(campaign)))).toFixed(2);
}

module.exports = { computeCreatorPayable, resolveCreatorPayable };
