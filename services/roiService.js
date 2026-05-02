const mongoose = require('mongoose');
const Conversion = require('../models/Conversion');
const Campaign = require('../models/Campaign');

// MongoDB aggregate $match doesn't auto-cast string → ObjectId. Wrap any
// id we receive (as a string) before stuffing it into a $match filter.
const toObjectId = (id) => {
  if (id instanceof mongoose.Types.ObjectId) return id;
  try { return new mongoose.Types.ObjectId(String(id)) } catch { return id }
}

/**
 * Compute real (closed-loop) ROI for a single campaign.
 *
 * Returns:
 *   {
 *     campaignId, spend,
 *     revenue,                  // sum of confirmed conversions, minus refunds
 *     conversions,              // count of confirmed conversions
 *     refunds,                  // count of refunded conversions
 *     conversionValue,          // revenue per confirmed conversion (avg)
 *     cvr,                      // conversion rate (conversions / clicks * 100)
 *     roi,                      // (revenue - spend) / spend * 100, percent
 *     roas,                     // revenue / spend (multiplier)
 *     hasRealData,              // true if at least one conversion exists
 *   }
 *
 * If there are no conversions, hasRealData is false and the caller should
 * fall back to estimated ROI (CPM-based).
 */
async function computeCampaignROI(campaignId, options = {}) {
  const { sinceDays } = options;
  const cId = toObjectId(campaignId);
  const filter = { campaign: cId, status: 'confirmed' };
  if (sinceDays) filter.createdAt = { $gte: new Date(Date.now() - sinceDays * 86400000) };

  const [agg, refundsAgg, campaign] = await Promise.all([
    Conversion.aggregate([
      { $match: filter },
      { $group: { _id: null, total: { $sum: '$value' }, count: { $sum: 1 } } },
    ]),
    Conversion.aggregate([
      { $match: { campaign: cId, status: 'refunded' } },
      { $group: { _id: null, total: { $sum: '$refundedValue' }, count: { $sum: 1 } } },
    ]),
    Campaign.findById(campaignId).select('price trackingLinkId').lean(),
  ]);

  const revenue = (agg[0]?.total || 0) - (refundsAgg[0]?.total || 0);
  const conversions = agg[0]?.count || 0;
  const refunds = refundsAgg[0]?.count || 0;
  const spend = campaign?.price || 0;

  // Get clicks count from the tracking link (best-effort)
  let clicks = 0;
  if (campaign?.trackingLinkId) {
    try {
      const TrackingLink = require('../models/TrackingLink');
      const link = await TrackingLink.findById(campaign.trackingLinkId).select('stats.totalClicks stats.uniqueClicks').lean();
      clicks = link?.stats?.uniqueClicks || link?.stats?.totalClicks || 0;
    } catch { /* ignore */ }
  }

  const cvr = clicks > 0 ? (conversions / clicks) * 100 : 0;
  const conversionValue = conversions > 0 ? revenue / conversions : 0;
  const roi = spend > 0 ? ((revenue - spend) / spend) * 100 : 0;
  const roas = spend > 0 ? revenue / spend : 0;

  return {
    campaignId: String(campaignId),
    spend,
    revenue: Number(revenue.toFixed(2)),
    conversions,
    refunds,
    clicks,
    conversionValue: Number(conversionValue.toFixed(2)),
    cvr: Number(cvr.toFixed(2)),
    roi: Number(roi.toFixed(2)),
    roas: Number(roas.toFixed(2)),
    hasRealData: conversions > 0,
  };
}

/**
 * Aggregate ROI across all campaigns of an advertiser.
 *
 * Returns the same shape as computeCampaignROI, plus campaignBreakdown[].
 * Useful for the dashboard KPI_ROI widget.
 */
async function computeAdvertiserROI(advertiserId, options = {}) {
  const { sinceDays } = options;
  const aId = toObjectId(advertiserId);
  const filter = { advertiser: aId, status: 'confirmed' };
  if (sinceDays) filter.createdAt = { $gte: new Date(Date.now() - sinceDays * 86400000) };

  const Usuario = require('../models/Usuario');

  const [conversions, refundsAgg, campaigns, user] = await Promise.all([
    Conversion.find(filter).select('campaign value uid').lean(),
    Conversion.aggregate([
      { $match: { advertiser: aId, status: 'refunded' } },
      { $group: { _id: null, total: { $sum: '$refundedValue' } } },
    ]),
    Campaign.find({ advertiser: advertiserId, status: { $nin: ['DRAFT', 'CANCELLED'] } })
      .select('price status')
      .lean(),
    Usuario.findById(advertiserId).select('attributionModel attributionLookbackDays').lean(),
  ]);

  const model = user?.attributionModel || 'last_touch';
  const lookbackDays = user?.attributionLookbackDays || 30;

  // For non-last-touch models, fan revenue across all clicks of the same uid.
  let totalRevenue = 0;
  if (model === 'last_touch') {
    totalRevenue = conversions.reduce((s, c) => s + (c.value || 0), 0);
  } else {
    const attributionService = require('./attributionService');
    const credits = await attributionService.attributeConversions({
      conversions, advertiserId, model, lookbackDays,
    });
    // credits is a Map<campaignId, attributedRevenue>; sum to advertiser total
    for (const v of credits.values()) totalRevenue += v;
  }
  totalRevenue -= (refundsAgg[0]?.total || 0);

  const totalConversions = conversions.length;
  const totalSpend = campaigns.reduce((s, c) => s + (c.price || 0), 0);

  const roi = totalSpend > 0 ? ((totalRevenue - totalSpend) / totalSpend) * 100 : 0;
  const roas = totalSpend > 0 ? totalRevenue / totalSpend : 0;

  return {
    advertiserId: String(advertiserId),
    spend: totalSpend,
    revenue: Number(totalRevenue.toFixed(2)),
    conversions: totalConversions,
    roi: Number(roi.toFixed(2)),
    roas: Number(roas.toFixed(2)),
    hasRealData: totalConversions > 0,
    attributionModel: model,
    attributionLookbackDays: lookbackDays,
  };
}

module.exports = {
  computeCampaignROI,
  computeAdvertiserROI,
};
