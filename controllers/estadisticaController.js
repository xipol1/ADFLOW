const mongoose = require('mongoose');
const Campaign = require('../models/Campaign');
const Canal = require('../models/Canal');
const Tracking = require('../models/Tracking');
const Transaccion = require('../models/Transaccion');
const Retiro = require('../models/Retiro');
const { ensureDb } = require('../lib/ensureDb');

const httpError = (status, message) => {
  const err = new Error(message);
  err.status = status;
  return err;
};

const canAccessCampaign = async (campaign, userId) => {
  if (!campaign || !userId) return false;
  if (campaign.advertiser?.toString?.() === String(userId)) return true;
  const isOwner = await Canal.exists({ _id: campaign.channel, propietario: userId });
  return Boolean(isOwner);
};

// GET /api/estadisticas/campaign/:id
const getCampaignStats = async (req, res, next) => {
  try {
    const ok = await ensureDb();
    if (!ok) return res.status(503).json({ success: false, message: 'Servicio no disponible' });

    const userId = req.usuario?.id;
    if (!userId) return next(httpError(401, 'No autorizado'));

    const campaign = await Campaign.findById(req.params.id).lean();
    if (!campaign) return next(httpError(404, 'Campaign no encontrada'));

    const allowed = await canAccessCampaign(campaign, userId);
    if (!allowed) return next(httpError(403, 'No autorizado'));

    const clicks = await Tracking.find({ campaign: campaign._id })
      .sort({ timestamp: 1 })
      .lean();

    const totalClicks = clicks.length;

    // Unique clicks: deduplicate by IP
    const uniqueIps = new Set(clicks.map((c) => c.ip).filter(Boolean));
    const uniqueClicks = uniqueIps.size;

    const timestamps = clicks.map((c) => c.timestamp);

    return res.json({
      success: true,
      data: {
        campaignId: campaign._id,
        status: campaign.status,
        totalClicks,
        uniqueClicks,
        timestamps
      }
    });
  } catch (error) {
    next(error);
  }
};

// GET /api/estadisticas/dashboard — role-aware dashboard stats
const getDashboardStats = async (req, res, next) => {
  try {
    const ok = await ensureDb();
    if (!ok) return res.status(503).json({ success: false, message: 'Servicio no disponible' });

    const userId = req.usuario?.id;
    if (!userId) return next(httpError(401, 'No autorizado'));

    const role = req.usuario?.rol;
    const uid = new mongoose.Types.ObjectId(userId);

    if (role === 'creator') {
      // Creator dashboard: earnings, campaigns on their channels, payouts
      const ownedChannels = await Canal.find({ propietario: userId }).select('_id').lean();
      const channelIds = ownedChannels.map(c => c._id);

      const [campaignStats, earningsAgg, pendingRetiros, totalRetiros] = await Promise.all([
        Campaign.aggregate([
          { $match: { channel: { $in: channelIds } } },
          { $group: {
            _id: '$status',
            count: { $sum: 1 },
            totalValue: { $sum: '$price' },
            totalNet: { $sum: '$netAmount' }
          }}
        ]),
        Campaign.aggregate([
          { $match: { channel: { $in: channelIds }, status: 'COMPLETED' } },
          { $group: { _id: null, total: { $sum: '$netAmount' }, count: { $sum: 1 } } }
        ]),
        Retiro.aggregate([
          { $match: { creator: uid, status: { $in: ['pending', 'processing'] } } },
          { $group: { _id: null, total: { $sum: '$amount' } } }
        ]),
        Retiro.aggregate([
          { $match: { creator: uid, status: 'completed' } },
          { $group: { _id: null, total: { $sum: '$amount' } } }
        ])
      ]);

      const statusMap = {};
      for (const s of campaignStats) statusMap[s._id] = s;

      const totalEarned = earningsAgg[0]?.total || 0;
      const reservedRetiros = pendingRetiros[0]?.total || 0;
      const paidOutRetiros = totalRetiros[0]?.total || 0;
      const availableBalance = totalEarned - reservedRetiros - paidOutRetiros;

      // Monthly earnings (last 6 months)
      const sixMonthsAgo = new Date();
      sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
      const monthlyEarnings = await Campaign.aggregate([
        { $match: { channel: { $in: channelIds }, status: 'COMPLETED', completedAt: { $gte: sixMonthsAgo } } },
        { $group: {
          _id: { $dateToString: { format: '%Y-%m', date: '$completedAt' } },
          earnings: { $sum: '$netAmount' },
          count: { $sum: 1 }
        }},
        { $sort: { _id: 1 } }
      ]);

      return res.json({
        success: true,
        data: {
          role: 'creator',
          channels: channelIds.length,
          campaigns: {
            total: campaignStats.reduce((a, s) => a + s.count, 0),
            published: statusMap.PUBLISHED?.count || 0,
            completed: statusMap.COMPLETED?.count || 0,
            active: (statusMap.PAID?.count || 0) + (statusMap.PUBLISHED?.count || 0)
          },
          earnings: {
            totalEarned,
            availableBalance: +availableBalance.toFixed(2),
            pendingRetiros: reservedRetiros,
            paidOut: paidOutRetiros
          },
          monthlyEarnings
        }
      });
    }

    if (role === 'advertiser') {
      // Advertiser dashboard: spending, campaigns, wallet
      const [campaignStats, spendAgg, rechargeAgg] = await Promise.all([
        Campaign.aggregate([
          { $match: { advertiser: uid } },
          { $group: {
            _id: '$status',
            count: { $sum: 1 },
            totalSpend: { $sum: '$price' }
          }}
        ]),
        Transaccion.aggregate([
          { $match: { advertiser: uid, status: 'paid', tipo: { $ne: 'recarga' } } },
          { $group: { _id: null, total: { $sum: '$amount' } } }
        ]),
        Transaccion.aggregate([
          { $match: { advertiser: uid, status: 'paid', tipo: 'recarga' } },
          { $group: { _id: null, total: { $sum: '$amount' } } }
        ])
      ]);

      const statusMap = {};
      for (const s of campaignStats) statusMap[s._id] = s;

      const totalSpent = spendAgg[0]?.total || 0;
      const totalRecharged = rechargeAgg[0]?.total || 0;
      const walletBalance = totalRecharged - totalSpent;

      // Monthly spending (last 6 months)
      const sixMonthsAgo = new Date();
      sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
      const monthlySpending = await Transaccion.aggregate([
        { $match: { advertiser: uid, status: 'paid', tipo: { $ne: 'recarga' }, paidAt: { $gte: sixMonthsAgo } } },
        { $group: {
          _id: { $dateToString: { format: '%Y-%m', date: '$paidAt' } },
          spent: { $sum: '$amount' },
          count: { $sum: 1 }
        }},
        { $sort: { _id: 1 } }
      ]);

      return res.json({
        success: true,
        data: {
          role: 'advertiser',
          campaigns: {
            total: campaignStats.reduce((a, s) => a + s.count, 0),
            draft: statusMap.DRAFT?.count || 0,
            active: (statusMap.PAID?.count || 0) + (statusMap.PUBLISHED?.count || 0),
            completed: statusMap.COMPLETED?.count || 0,
            cancelled: statusMap.CANCELLED?.count || 0
          },
          finances: {
            totalSpent,
            totalRecharged,
            walletBalance: +walletBalance.toFixed(2)
          },
          monthlySpending
        }
      });
    }

    // Admin dashboard
    const [totalUsers, totalCampaigns, totalRevenue, activeCampaigns] = await Promise.all([
      mongoose.model('Usuario').countDocuments({ activo: true }),
      Campaign.countDocuments(),
      Campaign.aggregate([
        { $match: { status: 'COMPLETED' } },
        { $group: { _id: null, total: { $sum: '$price' }, commission: { $sum: { $subtract: ['$price', '$netAmount'] } } } }
      ]),
      Campaign.countDocuments({ status: { $in: ['PAID', 'PUBLISHED'] } })
    ]);

    return res.json({
      success: true,
      data: {
        role: 'admin',
        users: totalUsers,
        campaigns: { total: totalCampaigns, active: activeCampaigns },
        revenue: {
          totalVolume: totalRevenue[0]?.total || 0,
          platformCommission: totalRevenue[0]?.commission || 0
        }
      }
    });
  } catch (error) {
    next(error);
  }
};

// GET /api/estadisticas/generales — general platform stats (public)
const getGeneralStats = async (req, res, next) => {
  try {
    const ok = await ensureDb();
    if (!ok) return res.status(503).json({ success: false, message: 'Servicio no disponible' });

    const [totalChannels, totalCampaigns, completedCampaigns] = await Promise.all([
      Canal.countDocuments({ verificado: true }),
      Campaign.countDocuments(),
      Campaign.countDocuments({ status: 'COMPLETED' })
    ]);

    return res.json({
      success: true,
      data: { totalChannels, totalCampaigns, completedCampaigns }
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getCampaignStats,
  getDashboardStats,
  getGeneralStats
};
