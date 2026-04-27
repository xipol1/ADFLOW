/**
 * Admin Dashboard API endpoints.
 * All routes require authenticated admin user.
 *
 * GET /api/admin/dashboard/overview   — KPIs + recent activity
 * GET /api/admin/dashboard/users      — User management (list, search, filter)
 * GET /api/admin/dashboard/users/:id  — Single user detail
 * PUT /api/admin/dashboard/users/:id  — Update user (role, status, ban)
 * GET /api/admin/dashboard/channels   — All channels with scores
 * GET /api/admin/dashboard/campaigns  — All campaigns
 * PUT /api/admin/dashboard/campaigns/:id — Update campaign status
 * GET /api/admin/dashboard/disputes   — All disputes
 * PUT /api/admin/dashboard/disputes/:id — Resolve dispute
 * GET /api/admin/dashboard/finances   — Revenue, transactions
 * GET /api/admin/dashboard/scoring    — Scoring cron logs + channel distribution
 */

const express = require('express');
const router = express.Router();
const { autenticar } = require('../middleware/auth');
const { ensureDb } = require('../lib/ensureDb');

// Inline admin check middleware
const requireAdmin = (req, res, next) => {
  const rol = req.usuario?.rol || req.usuario?.role;
  if (rol !== 'admin') return res.status(403).json({ success: false, message: 'Solo administradores' });
  next();
};

// All routes require auth + admin
router.use(autenticar, requireAdmin);

// ─── Overview ────────────────────────────────────────────────────────────────
router.get('/overview', async (req, res) => {
  try {
    const ok = await ensureDb();
    if (!ok) return res.status(503).json({ success: false, message: 'DB unavailable' });

    const Usuario = require('../models/Usuario');
    const Canal = require('../models/Canal');
    const Campaign = require('../models/Campaign');
    const Transaccion = require('../models/Transaccion');
    const Dispute = require('../models/Dispute');
    const ChannelCandidate = require('../models/ChannelCandidate');

    const now = new Date();
    const day30 = new Date(now - 30 * 86400000);
    const day7 = new Date(now - 7 * 86400000);

    const [
      totalUsers, newUsers30d, newUsers7d,
      totalChannels, activeChannels,
      totalCampaigns, completedCampaigns, activeCampaigns,
      totalDisputes, openDisputes,
      pendingCandidates,
      revenueAgg,
      recentUsers,
      recentCampaigns,
    ] = await Promise.all([
      Usuario.countDocuments(),
      Usuario.countDocuments({ createdAt: { $gte: day30 } }),
      Usuario.countDocuments({ createdAt: { $gte: day7 } }),
      Canal.countDocuments(),
      Canal.countDocuments({ status: 'activo' }),
      Campaign.countDocuments(),
      Campaign.countDocuments({ status: 'COMPLETED' }),
      Campaign.countDocuments({ status: { $in: ['PAID', 'PUBLISHED'] } }),
      Dispute.countDocuments().catch(() => 0),
      Dispute.countDocuments({ status: { $in: ['open', 'pending', 'OPEN', 'PENDING'] } }).catch(() => 0),
      ChannelCandidate.countDocuments({ status: 'pending' }).catch(() => 0),
      Transaccion.aggregate([
        { $match: { tipo: 'comision' } },
        { $group: { _id: null, total: { $sum: '$amount' } } },
      ]).catch(() => []),
      Usuario.find().sort({ createdAt: -1 }).limit(5).select('nombre email rol createdAt').lean(),
      Campaign.find().sort({ createdAt: -1 }).limit(5).populate('channel', 'nombreCanal plataforma').select('status price createdAt channel').lean(),
    ]);

    const totalRevenue = revenueAgg[0]?.total || 0;

    return res.json({
      success: true,
      data: {
        kpis: {
          totalUsers, newUsers30d, newUsers7d,
          totalChannels, activeChannels,
          totalCampaigns, completedCampaigns, activeCampaigns,
          totalDisputes, openDisputes,
          pendingCandidates,
          totalRevenue,
        },
        recentUsers,
        recentCampaigns,
      },
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// ─── Users ───────────────────────────────────────────────────────────────────
router.get('/users', async (req, res) => {
  try {
    const ok = await ensureDb();
    if (!ok) return res.status(503).json({ success: false, message: 'DB unavailable' });

    const Usuario = require('../models/Usuario');
    const { page = 1, limit = 20, search, role, sort = '-createdAt' } = req.query;
    const filter = {};
    if (role) filter.rol = role;
    if (search) {
      filter.$or = [
        { nombre: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
      ];
    }

    const [users, total] = await Promise.all([
      Usuario.find(filter).sort(sort).skip((page - 1) * limit).limit(Number(limit))
        .select('nombre email rol createdAt emailVerified referralCode').lean(),
      Usuario.countDocuments(filter),
    ]);

    return res.json({ success: true, data: users, pagination: { page: Number(page), limit: Number(limit), total, totalPages: Math.ceil(total / limit) } });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

router.get('/users/:id', async (req, res) => {
  try {
    await ensureDb();
    const Usuario = require('../models/Usuario');
    const Canal = require('../models/Canal');
    const Campaign = require('../models/Campaign');

    const user = await Usuario.findById(req.params.id).select('-password').lean();
    if (!user) return res.status(404).json({ success: false, message: 'Usuario no encontrado' });

    const [channels, campaigns] = await Promise.all([
      Canal.find({ propietario: user._id }).select('nombreCanal plataforma seguidores CAS status').lean(),
      Campaign.find({ $or: [{ advertiser: user._id }, { channel: { $in: (await Canal.find({ propietario: user._id }).select('_id')).map(c => c._id) } }] })
        .sort({ createdAt: -1 }).limit(20).select('status price createdAt channel').lean(),
    ]);

    return res.json({ success: true, data: { ...user, channels, campaigns } });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

router.put('/users/:id', async (req, res) => {
  try {
    await ensureDb();
    const Usuario = require('../models/Usuario');
    const { rol, banned, fullAccess } = req.body;
    const updates = {};
    if (rol) updates.rol = rol;
    if (typeof banned === 'boolean') updates.banned = banned;
    if (typeof fullAccess === 'boolean') updates.fullAccess = fullAccess;

    const user = await Usuario.findByIdAndUpdate(req.params.id, updates, { new: true }).select('-password').lean();
    if (!user) return res.status(404).json({ success: false, message: 'Usuario no encontrado' });
    return res.json({ success: true, data: user });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// ─── Channels ────────────────────────────────────────────────────────────────
router.get('/channels', async (req, res) => {
  try {
    await ensureDb();
    const Canal = require('../models/Canal');
    const { page = 1, limit = 20, search, platform, sort = '-createdAt' } = req.query;
    const filter = {};
    if (platform) filter.plataforma = platform;
    if (search) filter.nombreCanal = { $regex: search, $options: 'i' };

    const [channels, total] = await Promise.all([
      Canal.find(filter).sort(sort).skip((page - 1) * limit).limit(Number(limit))
        .select('nombreCanal plataforma seguidores CAS nivel CPMDinamico status claimed createdAt propietario').lean(),
      Canal.countDocuments(filter),
    ]);

    return res.json({ success: true, data: channels, pagination: { page: Number(page), limit: Number(limit), total, totalPages: Math.ceil(total / limit) } });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// ─── Campaigns ───────────────────────────────────────────────────────────────
router.get('/campaigns', async (req, res) => {
  try {
    await ensureDb();
    const Campaign = require('../models/Campaign');
    const { page = 1, limit = 20, status, sort = '-createdAt' } = req.query;
    const filter = {};
    if (status) filter.status = status;

    const [campaigns, total] = await Promise.all([
      Campaign.find(filter).sort(sort).skip((page - 1) * limit).limit(Number(limit))
        .populate('advertiser', 'nombre email')
        .populate('channel', 'nombreCanal plataforma')
        .select('status price netAmount createdAt publishedAt completedAt trackingUrl').lean(),
      Campaign.countDocuments(filter),
    ]);

    return res.json({ success: true, data: campaigns, pagination: { page: Number(page), limit: Number(limit), total, totalPages: Math.ceil(total / limit) } });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

router.put('/campaigns/:id', async (req, res) => {
  try {
    await ensureDb();
    const Campaign = require('../models/Campaign');
    const { status } = req.body;
    const campaign = await Campaign.findByIdAndUpdate(req.params.id, { status }, { new: true }).lean();
    if (!campaign) return res.status(404).json({ success: false, message: 'Campana no encontrada' });
    return res.json({ success: true, data: campaign });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// ─── Disputes ────────────────────────────────────────────────────────────────
router.get('/disputes', async (req, res) => {
  try {
    await ensureDb();
    const Dispute = require('../models/Dispute');
    const { page = 1, limit = 20, status, sort = '-createdAt' } = req.query;
    const filter = {};
    if (status) filter.status = status;

    const [disputes, total] = await Promise.all([
      Dispute.find(filter).sort(sort).skip((page - 1) * limit).limit(Number(limit))
        .populate('campana', 'status price')
        .populate('creador', 'nombre email')
        .populate('anunciante', 'nombre email')
        .lean(),
      Dispute.countDocuments(filter),
    ]);

    return res.json({ success: true, data: disputes, pagination: { page: Number(page), limit: Number(limit), total, totalPages: Math.ceil(total / limit) } });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

router.put('/disputes/:id', async (req, res) => {
  try {
    await ensureDb();
    const Dispute = require('../models/Dispute');
    const { status, resolution, resolvedInFavorOf } = req.body;
    const updates = {};
    if (status) updates.status = status;
    if (resolution) updates.resolution = resolution;
    if (resolvedInFavorOf) updates.resolvedInFavorOf = resolvedInFavorOf;
    if (status === 'resolved' || status === 'RESOLVED') updates.resolvedAt = new Date();

    const dispute = await Dispute.findByIdAndUpdate(req.params.id, updates, { new: true }).lean();
    if (!dispute) return res.status(404).json({ success: false, message: 'Disputa no encontrada' });
    return res.json({ success: true, data: dispute });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// ─── Finances ────────────────────────────────────────────────────────────────
router.get('/finances', async (req, res) => {
  try {
    await ensureDb();
    const Transaccion = require('../models/Transaccion');
    const Campaign = require('../models/Campaign');
    const { period = '30d' } = req.query;
    const days = period === '7d' ? 7 : period === '90d' ? 90 : period === '1y' ? 365 : 30;
    const since = new Date(Date.now() - days * 86400000);

    const [revenueTimeline, totalVolume, commissions, campaignsByStatus] = await Promise.all([
      Transaccion.aggregate([
        { $match: { createdAt: { $gte: since } } },
        { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } }, volume: { $sum: '$amount' }, count: { $sum: 1 } } },
        { $sort: { _id: 1 } },
      ]).catch(() => []),
      Transaccion.aggregate([
        { $match: { createdAt: { $gte: since } } },
        { $group: { _id: null, total: { $sum: '$amount' } } },
      ]).catch(() => []),
      Transaccion.aggregate([
        { $match: { tipo: 'comision', createdAt: { $gte: since } } },
        { $group: { _id: null, total: { $sum: '$amount' } } },
      ]).catch(() => []),
      Campaign.aggregate([
        { $group: { _id: '$status', count: { $sum: 1 }, revenue: { $sum: '$price' } } },
      ]).catch(() => []),
    ]);

    return res.json({
      success: true,
      data: {
        period,
        revenueTimeline: revenueTimeline.map(r => ({ date: r._id, volume: r.volume, count: r.count })),
        totalVolume: totalVolume[0]?.total || 0,
        totalCommissions: commissions[0]?.total || 0,
        campaignsByStatus,
      },
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// ─── Scoring ─────────────────────────────────────────────────────────────────
router.get('/scoring', async (req, res) => {
  try {
    await ensureDb();
    const Canal = require('../models/Canal');
    const ScoringCronLog = require('../models/ScoringCronLog');

    const [distribution, recentLogs, totalScored, avgCAS] = await Promise.all([
      Canal.aggregate([
        { $match: { CAS: { $exists: true, $ne: null } } },
        { $bucket: { groupBy: '$CAS', boundaries: [0, 20, 40, 60, 80, 100], default: 'other', output: { count: { $sum: 1 } } } },
      ]).catch(() => []),
      ScoringCronLog.find().sort({ startedAt: -1 }).limit(10).lean().catch(() => []),
      Canal.countDocuments({ CAS: { $exists: true, $ne: null } }),
      Canal.aggregate([
        { $match: { CAS: { $exists: true, $ne: null } } },
        { $group: { _id: null, avg: { $avg: '$CAS' } } },
      ]).catch(() => []),
    ]);

    return res.json({
      success: true,
      data: {
        distribution,
        recentLogs,
        totalScored,
        avgCAS: avgCAS[0]?.avg || 0,
      },
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
