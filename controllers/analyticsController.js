const mongoose = require('mongoose');
const Campaign = require('../models/Campaign');
const Canal = require('../models/Canal');
const TrackingLink = require('../models/TrackingLink');
const Transaccion = require('../models/Transaccion');
const Retiro = require('../models/Retiro');
const Review = require('../models/Review');
const { ensureDb } = require('../lib/ensureDb');

// ── Helpers ──

const httpError = (status, message) => {
  const err = new Error(message);
  err.status = status;
  return err;
};

/**
 * Parse the `period` query param into a start date.
 * Supported values: 7d, 30d, 90d, 1y.  Defaults to 30d.
 */
const periodToStartDate = (period) => {
  const now = new Date();
  switch (period) {
    case '7d':
      return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    case '90d':
      return new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
    case '1y':
      return new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
    case '30d':
    default:
      return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  }
};

/**
 * Choose aggregation date format based on period length.
 * 7d  -> daily,  30d -> daily,  90d -> weekly,  1y -> monthly
 */
const dateFormatForPeriod = (period) => {
  switch (period) {
    case '7d':
    case '30d':
      return '%Y-%m-%d';
    case '90d':
      return '%Y-W%V'; // ISO week
    case '1y':
      return '%Y-%m';
    default:
      return '%Y-%m-%d';
  }
};

/**
 * Generate a CSV string from an array of headers and an array of row objects.
 */
const generateCSV = (headers, rows) => {
  const escape = (val) => `"${String(val ?? '').replace(/"/g, '""')}"`;
  const lines = [headers.map(escape).join(',')];
  rows.forEach((row) =>
    lines.push(headers.map((h) => escape(row[h] ?? '')).join(','))
  );
  return lines.join('\n');
};

// ── Endpoints ──

/**
 * GET /api/estadisticas/creator/analytics
 * Time-series analytics for creator dashboards.
 */
const getCreatorAnalytics = async (req, res, next) => {
  try {
    const ok = await ensureDb();
    if (!ok) return res.status(503).json({ success: false, message: 'Servicio no disponible' });

    const userId = req.usuario?.id;
    if (!userId) return next(httpError(401, 'No autorizado'));

    const { period = '30d', channelId } = req.query;
    const startDate = periodToStartDate(period);
    const dateFmt = dateFormatForPeriod(period);

    // Resolve channels owned by this creator
    const channelFilter = channelId
      ? { _id: new mongoose.Types.ObjectId(channelId), propietario: new mongoose.Types.ObjectId(userId) }
      : { propietario: new mongoose.Types.ObjectId(userId) };
    const ownedChannels = await Canal.find(channelFilter).select('_id nombreCanal plataforma').lean();
    const channelIds = ownedChannels.map((c) => c._id);

    if (!channelIds.length) {
      return res.json({
        success: true,
        data: {
          revenueTimeline: [],
          campaignsTimeline: [],
          channelComparison: [],
          topChannels: [],
          clickMetrics: { totalClicks: 0, uniqueClicks: 0, timeline: [] },
        },
      });
    }

    // 1. Revenue over time
    const revenuePipeline = [
      { $match: { channel: { $in: channelIds }, status: 'COMPLETED', completedAt: { $gte: startDate } } },
      {
        $group: {
          _id: { $dateToString: { format: dateFmt, date: '$completedAt' } },
          revenue: { $sum: '$netAmount' },
          count: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ];

    // 2. Campaigns completed over time
    const campaignsTimelinePipeline = [
      { $match: { channel: { $in: channelIds }, completedAt: { $gte: startDate } } },
      {
        $group: {
          _id: {
            date: { $dateToString: { format: dateFmt, date: '$completedAt' } },
            status: '$status',
          },
          count: { $sum: 1 },
        },
      },
      { $sort: { '_id.date': 1 } },
    ];

    // 3. Channel performance comparison
    const channelComparisonPipeline = [
      { $match: { channel: { $in: channelIds }, status: 'COMPLETED', completedAt: { $gte: startDate } } },
      {
        $group: {
          _id: '$channel',
          revenue: { $sum: '$netAmount' },
          campaigns: { $sum: 1 },
          avgPrice: { $avg: '$netAmount' },
        },
      },
      { $sort: { revenue: -1 } },
    ];

    // 4. Click metrics from TrackingLink
    const clickPipeline = [
      { $match: { channel: { $in: channelIds }, type: 'campaign', active: true } },
      {
        $group: {
          _id: null,
          totalClicks: { $sum: '$stats.totalClicks' },
          uniqueClicks: { $sum: '$stats.uniqueClicks' },
        },
      },
    ];

    // Click timeline from individual clicks embedded in TrackingLink
    const clickTimelinePipeline = [
      { $match: { channel: { $in: channelIds }, type: 'campaign' } },
      { $unwind: '$clicks' },
      { $match: { 'clicks.timestamp': { $gte: startDate } } },
      {
        $group: {
          _id: { $dateToString: { format: dateFmt, date: '$clicks.timestamp' } },
          clicks: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ];

    const [revenueTimeline, campaignsRaw, channelComparison, clickAgg, clickTimeline] =
      await Promise.all([
        Campaign.aggregate(revenuePipeline),
        Campaign.aggregate(campaignsTimelinePipeline),
        Campaign.aggregate(channelComparisonPipeline),
        TrackingLink.aggregate(clickPipeline),
        TrackingLink.aggregate(clickTimelinePipeline),
      ]);

    // Build campaigns timeline grouped by date
    const campaignsTimeline = [];
    const dateMap = {};
    for (const r of campaignsRaw) {
      const d = r._id.date;
      if (!dateMap[d]) {
        dateMap[d] = { date: d, completed: 0, total: 0 };
        campaignsTimeline.push(dateMap[d]);
      }
      dateMap[d].total += r.count;
      if (r._id.status === 'COMPLETED') dateMap[d].completed += r.count;
    }

    // Enrich channel comparison with names
    const channelMap = {};
    ownedChannels.forEach((c) => {
      channelMap[c._id.toString()] = c;
    });
    const enrichedComparison = channelComparison.map((c) => ({
      channelId: c._id,
      name: channelMap[c._id.toString()]?.nombreCanal || 'Unknown',
      platform: channelMap[c._id.toString()]?.plataforma || '',
      revenue: +c.revenue.toFixed(2),
      campaigns: c.campaigns,
      avgPrice: +c.avgPrice.toFixed(2),
    }));

    // Top channels = top 5 by revenue
    const topChannels = enrichedComparison.slice(0, 5);

    return res.json({
      success: true,
      data: {
        period,
        startDate,
        revenueTimeline: revenueTimeline.map((r) => ({
          date: r._id,
          revenue: +r.revenue.toFixed(2),
          campaigns: r.count,
        })),
        campaignsTimeline,
        channelComparison: enrichedComparison,
        topChannels,
        clickMetrics: {
          totalClicks: clickAgg[0]?.totalClicks || 0,
          uniqueClicks: clickAgg[0]?.uniqueClicks || 0,
          timeline: clickTimeline.map((c) => ({ date: c._id, clicks: c.clicks })),
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/estadisticas/advertiser/analytics
 * Time-series analytics for advertiser dashboards.
 */
const getAdvertiserAnalytics = async (req, res, next) => {
  try {
    const ok = await ensureDb();
    if (!ok) return res.status(503).json({ success: false, message: 'Servicio no disponible' });

    const userId = req.usuario?.id;
    if (!userId) return next(httpError(401, 'No autorizado'));

    const uid = new mongoose.Types.ObjectId(userId);
    const { period = '30d' } = req.query;
    const startDate = periodToStartDate(period);
    const dateFmt = dateFormatForPeriod(period);

    // 1. Spend over time (from Transaccion)
    const spendTimelinePipeline = [
      { $match: { advertiser: uid, status: 'paid', tipo: { $ne: 'recarga' }, paidAt: { $gte: startDate } } },
      {
        $group: {
          _id: { $dateToString: { format: dateFmt, date: '$paidAt' } },
          spend: { $sum: '$amount' },
          count: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ];

    // 2. Campaigns by status (pie chart data)
    const statusPipeline = [
      { $match: { advertiser: uid } },
      { $group: { _id: '$status', count: { $sum: 1 }, totalSpend: { $sum: '$price' } } },
    ];

    // 3. Click performance across campaigns (from TrackingLink)
    const advertiserCampaignIds = await Campaign.find({ advertiser: uid }).select('_id').lean();
    const campIds = advertiserCampaignIds.map((c) => c._id);

    const clickPipeline = [
      { $match: { campaign: { $in: campIds }, type: 'campaign' } },
      {
        $group: {
          _id: '$campaign',
          totalClicks: { $sum: '$stats.totalClicks' },
          uniqueClicks: { $sum: '$stats.uniqueClicks' },
        },
      },
      { $sort: { totalClicks: -1 } },
    ];

    // 4. Top channels by ROI
    const channelROIPipeline = [
      { $match: { advertiser: uid, status: 'COMPLETED', completedAt: { $gte: startDate } } },
      {
        $group: {
          _id: '$channel',
          totalSpent: { $sum: '$price' },
          campaigns: { $sum: 1 },
        },
      },
      { $sort: { campaigns: -1 } },
      { $limit: 10 },
    ];

    const [spendTimeline, statusBreakdown, clickPerformance, channelROI] = await Promise.all([
      Transaccion.aggregate(spendTimelinePipeline),
      Campaign.aggregate(statusPipeline),
      TrackingLink.aggregate(clickPipeline),
      Campaign.aggregate(channelROIPipeline),
    ]);

    // Calculate CPC metrics
    const totalSpend = spendTimeline.reduce((s, r) => s + r.spend, 0);
    const totalClicks = clickPerformance.reduce((s, r) => s + r.totalClicks, 0);
    const totalUniqueClicks = clickPerformance.reduce((s, r) => s + r.uniqueClicks, 0);
    const cpc = totalClicks > 0 ? +(totalSpend / totalClicks).toFixed(4) : 0;
    const cpuc = totalUniqueClicks > 0 ? +(totalSpend / totalUniqueClicks).toFixed(4) : 0;

    // Enrich channel ROI with channel names
    const channelIdsForROI = channelROI.map((c) => c._id);
    const channelsForROI = await Canal.find({ _id: { $in: channelIdsForROI } })
      .select('nombreCanal plataforma')
      .lean();
    const roiChannelMap = {};
    channelsForROI.forEach((c) => {
      roiChannelMap[c._id.toString()] = c;
    });

    // Enrich click performance with campaign tracking link totals
    const clicksByCampaign = {};
    clickPerformance.forEach((c) => {
      clicksByCampaign[c._id.toString()] = {
        totalClicks: c.totalClicks,
        uniqueClicks: c.uniqueClicks,
      };
    });

    return res.json({
      success: true,
      data: {
        period,
        startDate,
        spendTimeline: spendTimeline.map((r) => ({
          date: r._id,
          spend: +r.spend.toFixed(2),
          transactions: r.count,
        })),
        campaignsByStatus: statusBreakdown.map((s) => ({
          status: s._id,
          count: s.count,
          totalSpend: +s.totalSpend.toFixed(2),
        })),
        clickPerformance: {
          totalClicks,
          totalUniqueClicks,
          cpc,
          costPerUniqueClick: cpuc,
          byCampaign: clickPerformance.slice(0, 20).map((c) => ({
            campaignId: c._id,
            totalClicks: c.totalClicks,
            uniqueClicks: c.uniqueClicks,
          })),
        },
        topChannelsByROI: channelROI.map((c) => ({
          channelId: c._id,
          name: roiChannelMap[c._id.toString()]?.nombreCanal || 'Unknown',
          platform: roiChannelMap[c._id.toString()]?.plataforma || '',
          totalSpent: +c.totalSpent.toFixed(2),
          campaigns: c.campaigns,
        })),
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/estadisticas/channels/:channelId/analytics
 * Detailed analytics for a specific channel.
 */
const getChannelAnalytics = async (req, res, next) => {
  try {
    const ok = await ensureDb();
    if (!ok) return res.status(503).json({ success: false, message: 'Servicio no disponible' });

    const userId = req.usuario?.id;
    if (!userId) return next(httpError(401, 'No autorizado'));

    const { channelId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(channelId)) return next(httpError(400, 'ID de canal inv\u00e1lido'));

    const channel = await Canal.findById(channelId).lean();
    if (!channel) return next(httpError(404, 'Canal no encontrado'));
    if (channel.propietario?.toString() !== String(userId)) return next(httpError(403, 'No autorizado'));

    const { period = '30d' } = req.query;
    const startDate = periodToStartDate(period);
    const dateFmt = dateFormatForPeriod(period);
    const chId = new mongoose.Types.ObjectId(channelId);

    // 1. Revenue timeline
    const revenuePipeline = [
      { $match: { channel: chId, status: 'COMPLETED', completedAt: { $gte: startDate } } },
      {
        $group: {
          _id: { $dateToString: { format: dateFmt, date: '$completedAt' } },
          revenue: { $sum: '$netAmount' },
          count: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ];

    // 2. Campaign count over time (all statuses)
    const campaignCountPipeline = [
      { $match: { channel: chId, createdAt: { $gte: startDate } } },
      {
        $group: {
          _id: { $dateToString: { format: dateFmt, date: '$createdAt' } },
          count: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ];

    // 3. Average rating over time
    const ratingPipeline = [
      { $match: { channel: chId, status: 'active', createdAt: { $gte: startDate } } },
      {
        $group: {
          _id: { $dateToString: { format: dateFmt, date: '$createdAt' } },
          avgRating: { $avg: '$ratings.overall' },
          count: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ];

    // 4. Click analytics (devices, countries, browsers) from TrackingLink
    const clickDetailPipeline = [
      { $match: { channel: chId, type: 'campaign' } },
      {
        $group: {
          _id: null,
          totalClicks: { $sum: '$stats.totalClicks' },
          uniqueClicks: { $sum: '$stats.uniqueClicks' },
          desktopClicks: { $sum: '$stats.devices.desktop' },
          mobileClicks: { $sum: '$stats.devices.mobile' },
          tabletClicks: { $sum: '$stats.devices.tablet' },
          unknownClicks: { $sum: '$stats.devices.unknown' },
        },
      },
    ];

    // Country aggregation across all tracking links for this channel
    const countryPipeline = [
      { $match: { channel: chId, type: 'campaign' } },
      { $project: { countries: { $objectToArray: '$stats.countries' } } },
      { $unwind: '$countries' },
      { $group: { _id: '$countries.k', count: { $sum: '$countries.v' } } },
      { $sort: { count: -1 } },
      { $limit: 20 },
    ];

    // Browser aggregation from individual clicks
    const browserPipeline = [
      { $match: { channel: chId, type: 'campaign' } },
      { $unwind: '$clicks' },
      { $match: { 'clicks.timestamp': { $gte: startDate } } },
      { $group: { _id: '$clicks.browser', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
    ];

    // Click timeline
    const clickTimelinePipeline = [
      { $match: { channel: chId, type: 'campaign' } },
      { $unwind: '$clicks' },
      { $match: { 'clicks.timestamp': { $gte: startDate } } },
      {
        $group: {
          _id: { $dateToString: { format: dateFmt, date: '$clicks.timestamp' } },
          clicks: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ];

    const [
      revenueTimeline,
      campaignCount,
      ratingTimeline,
      clickDetail,
      countryBreakdown,
      browserBreakdown,
      clickTimeline,
    ] = await Promise.all([
      Campaign.aggregate(revenuePipeline),
      Campaign.aggregate(campaignCountPipeline),
      Review.aggregate(ratingPipeline),
      TrackingLink.aggregate(clickDetailPipeline),
      TrackingLink.aggregate(countryPipeline),
      TrackingLink.aggregate(browserPipeline),
      TrackingLink.aggregate(clickTimelinePipeline),
    ]);

    const cd = clickDetail[0] || {};

    // 5. Audience growth estimation based on campaign activity
    const audienceGrowth = campaignCount.map((c) => ({
      date: c._id,
      newCampaigns: c.count,
      estimatedReach: c.count * (channel.estadisticas?.seguidores || 100),
    }));

    return res.json({
      success: true,
      data: {
        channelId,
        channelName: channel.nombreCanal,
        platform: channel.plataforma,
        period,
        startDate,
        revenueTimeline: revenueTimeline.map((r) => ({
          date: r._id,
          revenue: +r.revenue.toFixed(2),
          campaigns: r.count,
        })),
        campaignTimeline: campaignCount.map((c) => ({ date: c._id, count: c.count })),
        ratingTimeline: ratingTimeline.map((r) => ({
          date: r._id,
          avgRating: +r.avgRating.toFixed(2),
          reviews: r.count,
        })),
        clickAnalytics: {
          totalClicks: cd.totalClicks || 0,
          uniqueClicks: cd.uniqueClicks || 0,
          devices: {
            desktop: cd.desktopClicks || 0,
            mobile: cd.mobileClicks || 0,
            tablet: cd.tabletClicks || 0,
            unknown: cd.unknownClicks || 0,
          },
          countries: countryBreakdown.map((c) => ({ country: c._id, clicks: c.count })),
          browsers: browserBreakdown.map((b) => ({ browser: b._id, clicks: b.count })),
          timeline: clickTimeline.map((c) => ({ date: c._id, clicks: c.clicks })),
        },
        audienceGrowth,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/estadisticas/campaigns/:campaignId/analytics
 * Single campaign deep-dive analytics.
 */
const getCampaignAnalytics = async (req, res, next) => {
  try {
    const ok = await ensureDb();
    if (!ok) return res.status(503).json({ success: false, message: 'Servicio no disponible' });

    const userId = req.usuario?.id;
    if (!userId) return next(httpError(401, 'No autorizado'));

    const { campaignId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(campaignId)) return next(httpError(400, 'ID de campa\u00f1a inv\u00e1lido'));

    const campaign = await Campaign.findById(campaignId).lean();
    if (!campaign) return next(httpError(404, 'Campa\u00f1a no encontrada'));

    // Check access: advertiser or channel owner
    const isAdvertiser = campaign.advertiser?.toString() === String(userId);
    const isChannelOwner = await Canal.exists({ _id: campaign.channel, propietario: userId });
    if (!isAdvertiser && !isChannelOwner) return next(httpError(403, 'No autorizado'));

    const { period = '30d' } = req.query;
    const startDate = periodToStartDate(period);
    const campId = new mongoose.Types.ObjectId(campaignId);

    // Determine granularity: hourly for 7d, daily otherwise
    const isRecent = period === '7d';
    const timeFmt = isRecent ? '%Y-%m-%dT%H:00' : '%Y-%m-%d';

    // Get all tracking links for this campaign
    const trackingLinks = await TrackingLink.find({ campaign: campId }).lean();

    // Flatten all clicks
    const allClicks = [];
    for (const link of trackingLinks) {
      if (link.clicks && link.clicks.length) {
        for (const click of link.clicks) {
          allClicks.push({ ...click, linkCode: link.code });
        }
      }
    }

    // Filter clicks by date
    const filteredClicks = allClicks.filter(
      (c) => c.timestamp && new Date(c.timestamp) >= startDate
    );

    // Click timeline
    const timelineBuckets = {};
    const uniqueIpsByBucket = {};
    for (const click of filteredClicks) {
      const d = new Date(click.timestamp);
      let key;
      if (isRecent) {
        key = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(d.getUTCDate()).padStart(2, '0')}T${String(d.getUTCHours()).padStart(2, '0')}:00`;
      } else {
        key = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(d.getUTCDate()).padStart(2, '0')}`;
      }
      if (!timelineBuckets[key]) {
        timelineBuckets[key] = 0;
        uniqueIpsByBucket[key] = new Set();
      }
      timelineBuckets[key]++;
      if (click.ip) uniqueIpsByBucket[key].add(click.ip);
    }

    const clickTimeline = Object.keys(timelineBuckets)
      .sort()
      .map((k) => ({
        date: k,
        totalClicks: timelineBuckets[k],
        uniqueClicks: uniqueIpsByBucket[k].size,
      }));

    // Device breakdown
    const deviceCounts = { desktop: 0, mobile: 0, tablet: 0, unknown: 0 };
    for (const click of filteredClicks) {
      const dev = click.device || 'unknown';
      deviceCounts[dev] = (deviceCounts[dev] || 0) + 1;
    }

    // Country breakdown
    const countryCounts = {};
    for (const click of filteredClicks) {
      const country = click.country || 'Unknown';
      countryCounts[country] = (countryCounts[country] || 0) + 1;
    }
    const countryBreakdown = Object.entries(countryCounts)
      .map(([country, clicks]) => ({ country, clicks }))
      .sort((a, b) => b.clicks - a.clicks);

    // Referrer breakdown
    const refererCounts = {};
    for (const click of filteredClicks) {
      const ref = click.referer || 'Direct';
      refererCounts[ref] = (refererCounts[ref] || 0) + 1;
    }
    const refererBreakdown = Object.entries(refererCounts)
      .map(([referer, clicks]) => ({ referer, clicks }))
      .sort((a, b) => b.clicks - a.clicks);

    // UTM source breakdown
    const utmCounts = {};
    for (const click of filteredClicks) {
      const src = click.utmSource || 'none';
      utmCounts[src] = (utmCounts[src] || 0) + 1;
    }
    const utmBreakdown = Object.entries(utmCounts)
      .map(([source, clicks]) => ({ source, clicks }))
      .sort((a, b) => b.clicks - a.clicks);

    // Browser breakdown
    const browserCounts = {};
    for (const click of filteredClicks) {
      const br = click.browser || 'Unknown';
      browserCounts[br] = (browserCounts[br] || 0) + 1;
    }
    const browserBreakdown = Object.entries(browserCounts)
      .map(([browser, clicks]) => ({ browser, clicks }))
      .sort((a, b) => b.clicks - a.clicks);

    // Aggregate totals from tracking link stats
    let totalClicks = 0;
    let uniqueClicks = 0;
    for (const link of trackingLinks) {
      totalClicks += link.stats?.totalClicks || 0;
      uniqueClicks += link.stats?.uniqueClicks || 0;
    }

    return res.json({
      success: true,
      data: {
        campaignId,
        status: campaign.status,
        price: campaign.price,
        netAmount: campaign.netAmount,
        period,
        startDate,
        totals: {
          totalClicks,
          uniqueClicks,
          trackingLinks: trackingLinks.length,
        },
        clickTimeline,
        deviceBreakdown: deviceCounts,
        countryBreakdown,
        refererBreakdown,
        utmBreakdown,
        browserBreakdown,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/estadisticas/export
 * Export a CSV report.
 * Query params: type (revenue|campaigns|channels|clicks), period, format (csv)
 */
const exportReport = async (req, res, next) => {
  try {
    const ok = await ensureDb();
    if (!ok) return res.status(503).json({ success: false, message: 'Servicio no disponible' });

    const userId = req.usuario?.id;
    if (!userId) return next(httpError(401, 'No autorizado'));

    const { type = 'revenue', period = '30d', format = 'csv' } = req.query;
    if (format !== 'csv') return next(httpError(400, 'Solo se soporta formato CSV'));

    const startDate = periodToStartDate(period);
    const uid = new mongoose.Types.ObjectId(userId);

    // Determine user role channels
    const ownedChannels = await Canal.find({ propietario: uid }).select('_id').lean();
    const channelIds = ownedChannels.map((c) => c._id);
    const isCreator = channelIds.length > 0;

    let headers = [];
    let rows = [];
    let filename = `adflow-${type}-report.csv`;

    switch (type) {
      case 'revenue': {
        headers = ['Date', 'Channel', 'Campaign', 'Amount', 'Net Amount', 'Commission', 'Status'];

        // For creators: campaigns on their channels. For advertisers: their campaigns.
        const matchFilter = isCreator
          ? { channel: { $in: channelIds }, completedAt: { $gte: startDate } }
          : { advertiser: uid, completedAt: { $gte: startDate } };

        const campaigns = await Campaign.find(matchFilter)
          .populate('channel', 'nombreCanal')
          .sort({ completedAt: -1 })
          .lean();

        rows = campaigns.map((c) => ({
          Date: c.completedAt ? new Date(c.completedAt).toISOString().split('T')[0] : '',
          Channel: c.channel?.nombreCanal || c.channel?.toString() || '',
          Campaign: c._id.toString(),
          Amount: c.price,
          'Net Amount': c.netAmount,
          Commission: +(c.price - c.netAmount).toFixed(2),
          Status: c.status,
        }));
        filename = `adflow-revenue-${period}.csv`;
        break;
      }

      case 'campaigns': {
        headers = ['ID', 'Channel', 'Advertiser', 'Content', 'Price', 'Status', 'Created', 'Published', 'Completed'];

        const matchFilter = isCreator
          ? { channel: { $in: channelIds }, createdAt: { $gte: startDate } }
          : { advertiser: uid, createdAt: { $gte: startDate } };

        const campaigns = await Campaign.find(matchFilter)
          .populate('channel', 'nombreCanal')
          .populate('advertiser', 'email')
          .sort({ createdAt: -1 })
          .lean();

        rows = campaigns.map((c) => ({
          ID: c._id.toString(),
          Channel: c.channel?.nombreCanal || '',
          Advertiser: c.advertiser?.email || c.advertiser?.toString() || '',
          Content: c.content ? c.content.substring(0, 100) : '',
          Price: c.price,
          Status: c.status,
          Created: c.createdAt ? new Date(c.createdAt).toISOString().split('T')[0] : '',
          Published: c.publishedAt ? new Date(c.publishedAt).toISOString().split('T')[0] : '',
          Completed: c.completedAt ? new Date(c.completedAt).toISOString().split('T')[0] : '',
        }));
        filename = `adflow-campaigns-${period}.csv`;
        break;
      }

      case 'channels': {
        headers = ['ID', 'Name', 'Platform', 'Category', 'Followers', 'Price', 'Score', 'Rating', 'Reviews', 'Status'];

        if (!isCreator) return next(httpError(400, 'Solo creadores pueden exportar canales'));

        const channels = await Canal.find({ propietario: uid }).lean();

        // Get ratings for all channels
        const channelRatings = {};
        for (const ch of channels) {
          const ratings = await Review.aggregate([
            { $match: { channel: ch._id, status: 'active' } },
            { $group: { _id: null, avg: { $avg: '$ratings.overall' }, count: { $sum: 1 } } },
          ]);
          channelRatings[ch._id.toString()] = ratings[0] || { avg: 0, count: 0 };
        }

        rows = channels.map((ch) => {
          const r = channelRatings[ch._id.toString()] || {};
          return {
            ID: ch._id.toString(),
            Name: ch.nombreCanal,
            Platform: ch.plataforma,
            Category: ch.categoria,
            Followers: ch.estadisticas?.seguidores || 0,
            Price: ch.precio || 0,
            Score: '', // Score would require ChannelMetrics model lookup; left blank
            Rating: r.avg ? +r.avg.toFixed(2) : 0,
            Reviews: r.count || 0,
            Status: ch.estado,
          };
        });
        filename = `adflow-channels.csv`;
        break;
      }

      case 'clicks': {
        headers = ['Date', 'Link Code', 'Campaign', 'Total Clicks', 'Unique Clicks', 'Top Country', 'Top Device', 'Top Referer'];

        const matchFilter = isCreator
          ? { channel: { $in: channelIds }, type: 'campaign' }
          : { campaign: { $in: await Campaign.find({ advertiser: uid }).distinct('_id') }, type: 'campaign' };

        const links = await TrackingLink.find(matchFilter)
          .sort({ updatedAt: -1 })
          .lean();

        rows = links.map((link) => {
          // Find top country
          const countries = link.stats?.countries || {};
          let topCountry = '';
          let topCountryCount = 0;
          if (countries instanceof Map) {
            for (const [k, v] of countries) {
              if (v > topCountryCount) { topCountry = k; topCountryCount = v; }
            }
          } else {
            for (const [k, v] of Object.entries(countries)) {
              if (v > topCountryCount) { topCountry = k; topCountryCount = v; }
            }
          }

          // Find top device
          const devices = link.stats?.devices || {};
          const topDevice = Object.entries(devices)
            .filter(([k]) => k !== 'unknown')
            .sort((a, b) => b[1] - a[1])[0]?.[0] || 'unknown';

          // Find top referer
          const referers = link.stats?.referers || {};
          let topReferer = 'Direct';
          let topRefererCount = 0;
          if (referers instanceof Map) {
            for (const [k, v] of referers) {
              if (v > topRefererCount) { topReferer = k; topRefererCount = v; }
            }
          } else {
            for (const [k, v] of Object.entries(referers)) {
              if (v > topRefererCount) { topReferer = k; topRefererCount = v; }
            }
          }

          return {
            Date: link.createdAt ? new Date(link.createdAt).toISOString().split('T')[0] : '',
            'Link Code': link.code,
            Campaign: link.campaign?.toString() || '',
            'Total Clicks': link.stats?.totalClicks || 0,
            'Unique Clicks': link.stats?.uniqueClicks || 0,
            'Top Country': topCountry,
            'Top Device': topDevice,
            'Top Referer': topReferer,
          };
        });
        filename = `adflow-clicks-${period}.csv`;
        break;
      }

      default:
        return next(httpError(400, `Tipo de reporte inv\u00e1lido: ${type}`));
    }

    const csv = generateCSV(headers, rows);

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    return res.send(csv);
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getCreatorAnalytics,
  getAdvertiserAnalytics,
  getChannelAnalytics,
  getCampaignAnalytics,
  exportReport,
};
