const AutoBuyRule = require('../models/AutoBuyRule');
const UserList = require('../models/UserList');
const Campaign = require('../models/Campaign');
const Transaccion = require('../models/Transaccion');
const Canal = require('../models/Canal');
const { ensureDb } = require('../lib/ensureDb');

const httpError = (status, message) => {
  const err = new Error(message);
  err.status = status;
  return err;
};

// GET /api/autobuy — list my rules
const getMyRules = async (req, res, next) => {
  try {
    const ok = await ensureDb();
    if (!ok) return res.status(503).json({ success: false, message: 'Servicio no disponible' });

    const userId = req.usuario?.id;
    if (!userId) return next(httpError(401, 'No autorizado'));

    const items = await AutoBuyRule.find({ advertiser: userId })
      .populate('channels', 'nombreCanal plataforma')
      .populate('list', 'name')
      .sort({ updatedAt: -1 })
      .lean();

    return res.json({ success: true, data: { items } });
  } catch (error) {
    next(error);
  }
};

// POST /api/autobuy — create rule
const createRule = async (req, res, next) => {
  try {
    const ok = await ensureDb();
    if (!ok) return res.status(503).json({ success: false, message: 'Servicio no disponible' });

    const userId = req.usuario?.id;
    if (!userId) return next(httpError(401, 'No autorizado'));

    const {
      name, channels, listId, platforms, categories,
      maxPricePerPost, dailyBudget, totalBudget,
      content, targetUrl
    } = req.body || {};

    if (!name?.trim()) return next(httpError(400, 'name es requerido'));
    if (!content?.trim() || !targetUrl?.trim()) {
      return next(httpError(400, 'content y targetUrl son requeridos'));
    }

    const rule = await AutoBuyRule.create({
      advertiser: userId,
      name: name.trim(),
      channels: channels || [],
      list: listId || null,
      platforms: platforms || [],
      categories: categories || [],
      maxPricePerPost: maxPricePerPost || 500,
      dailyBudget: dailyBudget || 1000,
      totalBudget: totalBudget || 5000,
      content: content.trim(),
      targetUrl: targetUrl.trim()
    });

    return res.status(201).json({ success: true, data: rule });
  } catch (error) {
    next(error);
  }
};

// PUT /api/autobuy/:id — update rule
const updateRule = async (req, res, next) => {
  try {
    const ok = await ensureDb();
    if (!ok) return res.status(503).json({ success: false, message: 'Servicio no disponible' });

    const userId = req.usuario?.id;
    if (!userId) return next(httpError(401, 'No autorizado'));

    const rule = await AutoBuyRule.findOne({ _id: req.params.id, advertiser: userId });
    if (!rule) return next(httpError(404, 'Regla no encontrada'));

    const allowed = ['name', 'active', 'channels', 'platforms', 'categories',
      'maxPricePerPost', 'dailyBudget', 'totalBudget', 'content', 'targetUrl'];
    for (const key of allowed) {
      if (req.body[key] !== undefined) rule[key] = req.body[key];
    }
    if (req.body.listId !== undefined) rule.list = req.body.listId || null;

    await rule.save();
    return res.json({ success: true, data: rule });
  } catch (error) {
    next(error);
  }
};

// DELETE /api/autobuy/:id
const deleteRule = async (req, res, next) => {
  try {
    const ok = await ensureDb();
    if (!ok) return res.status(503).json({ success: false, message: 'Servicio no disponible' });

    const userId = req.usuario?.id;
    if (!userId) return next(httpError(401, 'No autorizado'));

    const result = await AutoBuyRule.findOneAndDelete({ _id: req.params.id, advertiser: userId });
    if (!result) return next(httpError(404, 'Regla no encontrada'));

    return res.json({ success: true, message: 'Regla eliminada' });
  } catch (error) {
    next(error);
  }
};

// POST /api/autobuy/:id/trigger — manually trigger the autobuy rule (create campaigns)
const triggerRule = async (req, res, next) => {
  try {
    const ok = await ensureDb();
    if (!ok) return res.status(503).json({ success: false, message: 'Servicio no disponible' });

    const userId = req.usuario?.id;
    if (!userId) return next(httpError(401, 'No autorizado'));

    const rule = await AutoBuyRule.findOne({ _id: req.params.id, advertiser: userId });
    if (!rule) return next(httpError(404, 'Regla no encontrada'));
    if (!rule.active) return next(httpError(400, 'La regla está desactivada'));

    // Resolve target channels
    let targetChannelIds = [...(rule.channels || [])];

    // If rule has a list, merge those channels
    if (rule.list) {
      const list = await UserList.findById(rule.list).lean();
      if (list?.channels) {
        targetChannelIds = [...new Set([...targetChannelIds.map(String), ...list.channels.map(String)])];
      }
    }

    if (targetChannelIds.length === 0) {
      return next(httpError(400, 'No hay canales configurados en esta regla'));
    }

    const remainingBudget = rule.totalBudget - rule.totalSpent;
    const created = [];

    for (const channelId of targetChannelIds) {
      const canal = await Canal.findById(channelId).select('precioBase propietario').lean();
      if (!canal) continue;

      const price = canal.precioBase || rule.maxPricePerPost;
      if (price > rule.maxPricePerPost) continue;
      if (price > remainingBudget) continue;

      // Don't create duplicate active campaigns for same channel
      const existing = await Campaign.findOne({
        advertiser: userId,
        channel: channelId,
        status: { $in: ['DRAFT', 'PAID', 'PUBLISHED'] }
      });
      if (existing) continue;

      const campaign = await Campaign.create({
        advertiser: userId,
        channel: channelId,
        content: rule.content,
        targetUrl: rule.targetUrl,
        price,
        status: 'DRAFT',
        createdAt: new Date()
      });

      await Transaccion.create({
        campaign: campaign._id,
        advertiser: userId,
        amount: price,
        tipo: 'pago',
        status: 'pending'
      });

      rule.totalSpent += price;
      rule.campaignsCreated += 1;
      created.push({ campaignId: campaign._id, channel: channelId, price });
    }

    rule.lastTriggeredAt = new Date();
    await rule.save();

    return res.json({
      success: true,
      data: {
        campaignsCreated: created.length,
        campaigns: created,
        remainingBudget: rule.totalBudget - rule.totalSpent
      }
    });
  } catch (error) {
    next(error);
  }
};

module.exports = { getMyRules, createRule, updateRule, deleteRule, triggerRule };
