const Campaign = require('../models/Campaign');
const Canal = require('../models/Canal');
const Transaccion = require('../models/Transaccion');
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

const createCampaign = async (req, res, next) => {
  try {
    const ok = await ensureDb();
    if (!ok) return res.status(503).json({ success: false, message: 'Servicio no disponible' });

    const userId = req.usuario?.id;
    if (!userId) return next(httpError(401, 'No autorizado'));

    const channelId = String(req.body?.channel || '').trim();
    const content = String(req.body?.content || '').trim();
    const targetUrl = String(req.body?.targetUrl || '').trim();
    const price = Number(req.body?.price);

    if (!channelId || !content || !targetUrl || !Number.isFinite(price)) {
      return next(httpError(400, 'Datos inválidos'));
    }

    const canal = await Canal.findById(channelId).select('_id').lean();
    if (!canal) return next(httpError(404, 'Canal no encontrado'));

    const campaign = await Campaign.create({
      advertiser: userId,
      channel: canal._id,
      content,
      targetUrl,
      price,
      status: 'DRAFT',
      createdAt: new Date()
    });

    await Transaccion.create({
      campaign: campaign._id,
      advertiser: userId,
      amount: price,
      status: 'pending'
    });

    return res.status(201).json({ success: true, data: campaign });
  } catch (error) {
    next(error);
  }
};

const getCampaigns = async (req, res, next) => {
  try {
    const ok = await ensureDb();
    if (!ok) return res.status(503).json({ success: false, message: 'Servicio no disponible' });

    const userId = req.usuario?.id;
    if (!userId) return next(httpError(401, 'No autorizado'));

    const isAdvertiser = req.usuario?.rol === 'advertiser';

    const ownedChannels = await Canal.find({ propietario: userId }).select('_id').lean();
    const channelIds = ownedChannels.map((c) => c._id);

    const or = [];
    if (isAdvertiser) or.push({ advertiser: userId });
    if (channelIds.length > 0) or.push({ channel: { $in: channelIds } });

    if (or.length === 0) return res.json({ success: true, data: { items: [] } });

    const items = await Campaign.find({ $or: or }).sort({ createdAt: -1 }).lean();
    return res.json({ success: true, data: { items } });
  } catch (error) {
    next(error);
  }
};

const getCampaignById = async (req, res, next) => {
  try {
    const ok = await ensureDb();
    if (!ok) return res.status(503).json({ success: false, message: 'Servicio no disponible' });

    const userId = req.usuario?.id;
    if (!userId) return next(httpError(401, 'No autorizado'));

    const campaign = await Campaign.findById(req.params.id).lean();
    if (!campaign) return next(httpError(404, 'Campaign no encontrada'));

    const allowed = await canAccessCampaign(campaign, userId);
    if (!allowed) return next(httpError(403, 'No autorizado'));

    return res.json({ success: true, data: campaign });
  } catch (error) {
    next(error);
  }
};

const updateCampaignStatus = async (req, res, next) => {
  try {
    const ok = await ensureDb();
    if (!ok) return res.status(503).json({ success: false, message: 'Servicio no disponible' });

    const userId = req.usuario?.id;
    if (!userId) return next(httpError(401, 'No autorizado'));

    const desiredStatus = String(req.body?.status || '').trim().toUpperCase();

    const campaign = await Campaign.findById(req.params.id);
    if (!campaign) return next(httpError(404, 'Campaign no encontrada'));

    const currentStatus = String(campaign.status || '').toUpperCase();

    if (desiredStatus === currentStatus) return res.json({ success: true, data: campaign });

    const isAdvertiser = campaign.advertiser?.toString?.() === String(userId);
    const isChannelOwner = await Canal.exists({ _id: campaign.channel, propietario: userId });

    const isValidTransition =
      (currentStatus === 'DRAFT' && desiredStatus === 'PAID' && isAdvertiser) ||
      (currentStatus === 'PAID' && desiredStatus === 'PUBLISHED' && Boolean(isChannelOwner)) ||
      (currentStatus === 'PUBLISHED' && desiredStatus === 'COMPLETED') ||
      (desiredStatus === 'CANCELLED' && isAdvertiser);

    if (!isValidTransition) return next(httpError(400, 'Transición de estado inválida'));

    campaign.status = desiredStatus;

    if (desiredStatus === 'PUBLISHED' && !campaign.publishedAt) campaign.publishedAt = new Date();
    if (desiredStatus === 'COMPLETED' && !campaign.completedAt) campaign.completedAt = new Date();

    await campaign.save();
    return res.json({ success: true, data: campaign });
  } catch (error) {
    next(error);
  }
};

// POST /api/campaigns/:id/pay — DRAFT → PAID (simulated payment)
const payCampaign = async (req, res, next) => {
  try {
    const ok = await ensureDb();
    if (!ok) return res.status(503).json({ success: false, message: 'Servicio no disponible' });

    const userId = req.usuario?.id;
    if (!userId) return next(httpError(401, 'No autorizado'));

    const campaign = await Campaign.findById(req.params.id);
    if (!campaign) return next(httpError(404, 'Campaign no encontrada'));

    if (campaign.advertiser?.toString?.() !== String(userId)) {
      return next(httpError(403, 'No autorizado'));
    }

    if (campaign.status !== 'DRAFT') {
      return next(httpError(400, `No se puede pagar una campaña en estado ${campaign.status}`));
    }

    const transaccion = await Transaccion.findOneAndUpdate(
      { campaign: campaign._id, status: 'pending' },
      { status: 'paid', paidAt: new Date() },
      { new: true }
    );

    campaign.status = 'PAID';
    await campaign.save();

    return res.json({ success: true, data: { campaign, transaccion } });
  } catch (error) {
    next(error);
  }
};

// POST /api/campaigns/:id/confirm — PAID → PUBLISHED (channel owner confirms)
const confirmCampaign = async (req, res, next) => {
  try {
    const ok = await ensureDb();
    if (!ok) return res.status(503).json({ success: false, message: 'Servicio no disponible' });

    const userId = req.usuario?.id;
    if (!userId) return next(httpError(401, 'No autorizado'));

    const campaign = await Campaign.findById(req.params.id);
    if (!campaign) return next(httpError(404, 'Campaign no encontrada'));

    const isChannelOwner = await Canal.exists({ _id: campaign.channel, propietario: userId });
    if (!isChannelOwner) return next(httpError(403, 'Solo el dueño del canal puede confirmar'));

    if (campaign.status !== 'PAID') {
      return next(httpError(400, `No se puede confirmar una campaña en estado ${campaign.status}`));
    }

    campaign.status = 'PUBLISHED';
    campaign.publishedAt = new Date();
    await campaign.save();

    return res.json({ success: true, data: campaign });
  } catch (error) {
    next(error);
  }
};

// POST /api/campaigns/:id/complete — PUBLISHED → COMPLETED
const completeCampaign = async (req, res, next) => {
  try {
    const ok = await ensureDb();
    if (!ok) return res.status(503).json({ success: false, message: 'Servicio no disponible' });

    const userId = req.usuario?.id;
    if (!userId) return next(httpError(401, 'No autorizado'));

    const campaign = await Campaign.findById(req.params.id);
    if (!campaign) return next(httpError(404, 'Campaign no encontrada'));

    const allowed = await canAccessCampaign(campaign, userId);
    if (!allowed) return next(httpError(403, 'No autorizado'));

    if (campaign.status !== 'PUBLISHED') {
      return next(httpError(400, `No se puede completar una campaña en estado ${campaign.status}`));
    }

    campaign.status = 'COMPLETED';
    campaign.completedAt = new Date();
    await campaign.save();

    // Capture Stripe PaymentIntent if exists
    const tx = await Transaccion.findOne({ campaign: campaign._id }).lean();
    if (campaign.stripePaymentIntentId || tx?.stripePaymentIntentId) {
      try {
        const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY)
        const piId = campaign.stripePaymentIntentId || tx?.stripePaymentIntentId
        await stripe.paymentIntents.capture(piId)
      } catch (stripeErr) {
        console.error('Stripe capture error:', stripeErr.message)
      }
    }

    return res.json({ success: true, data: campaign });
  } catch (error) {
    next(error);
  }
};

// POST /api/campaigns/:id/cancel — Cancel campaign
const cancelCampaign = async (req, res, next) => {
  try {
    const ok = await ensureDb();
    if (!ok) return res.status(503).json({ success: false, message: 'Servicio no disponible' });

    const userId = req.usuario?.id;
    if (!userId) return next(httpError(401, 'No autorizado'));

    const campaign = await Campaign.findById(req.params.id);
    if (!campaign) return next(httpError(404, 'Campaign no encontrada'));

    if (campaign.advertiser?.toString?.() !== String(userId)) {
      return next(httpError(403, 'No autorizado'));
    }

    if (campaign.status === 'COMPLETED' || campaign.status === 'CANCELLED') {
      return next(httpError(400, `No se puede cancelar una campaña en estado ${campaign.status}`));
    }

    campaign.status = 'CANCELLED';
    await campaign.save();

    // Cancel or refund Stripe PaymentIntent
    const tx = await Transaccion.findOne({ campaign: campaign._id }).lean();
    if (campaign.stripePaymentIntentId || tx?.stripePaymentIntentId) {
      try {
        const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY)
        const piId = campaign.stripePaymentIntentId || tx?.stripePaymentIntentId
        const pi = await stripe.paymentIntents.retrieve(piId)
        if (pi.status === 'requires_capture') {
          await stripe.paymentIntents.cancel(piId)
        } else if (pi.status === 'succeeded') {
          await stripe.refunds.create({ payment_intent: piId })
        }
      } catch (stripeErr) {
        console.error('Stripe cancel/refund error:', stripeErr.message)
      }
    }

    return res.json({ success: true, data: campaign });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createCampaign,
  getCampaigns,
  getCampaignById,
  updateCampaignStatus,
  payCampaign,
  confirmCampaign,
  completeCampaign,
  cancelCampaign
};
