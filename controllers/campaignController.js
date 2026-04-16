const Campaign = require('../models/Campaign');
const Canal = require('../models/Canal');
const Transaccion = require('../models/Transaccion');
const Usuario = require('../models/Usuario');
const { ensureDb } = require('../lib/ensureDb');
const notificationService = require('../services/notificationService');

// Helper: calculate referral tier
function getReferralTier(user) {
  if (user.referralGMVGenerated >= 20000 || user.referralCount >= 20) return 'partner'
  if (user.referralGMVGenerated >= 5000 || user.referralCount >= 5) return 'power'
  return 'normal'
}

const notifySafe = async (data) => {
  try { await notificationService.enviarNotificacion(data); } catch (_) { /* non-blocking */ }
};

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

    if (!channelId || !content || !targetUrl) {
      return next(httpError(400, 'Datos inválidos'));
    }

    // Content length limit: 5000 chars
    if (content.length > 5000) {
      return next(httpError(400, 'El contenido no puede superar los 5000 caracteres'));
    }

    // URL validation
    try { new URL(targetUrl); } catch {
      return next(httpError(400, 'URL de destino inválida'));
    }

    const canal = await Canal.findById(channelId).select('_id CPMDinamico precio propietario disponibilidad').lean();
    if (!canal) return next(httpError(404, 'Canal no encontrado'));

    // Prevent advertising on own channel
    if (canal.propietario?.toString() === String(userId)) {
      return next(httpError(400, 'No puedes crear una campaña en tu propio canal'));
    }

    // Server-side price: resolve from per-day pricing or base CPM
    const publishDateStr = (req.body?.publishDate || req.body?.deadline || '').trim();
    let price = canal.CPMDinamico || canal.precio || 0;

    if (publishDateStr) {
      const pubDate = new Date(publishDateStr + 'T12:00:00');
      if (!isNaN(pubDate.getTime())) {
        const dow = pubDate.getDay(); // 0=Sun..6=Sat
        const dispo = canal.disponibilidad || {};
        const dayPricing = (dispo.preciosPorDia || []).find(p => p.day === dow);
        if (dayPricing && dayPricing.enabled && dayPricing.price > 0) {
          price = dayPricing.price;
        }
      }
    }

    if (!Number.isFinite(price) || price < 1) {
      return next(httpError(400, 'Este canal no tiene un precio configurado. Contacta al creador.'));
    }

    const deadline = publishDateStr ? new Date(publishDateStr + 'T12:00:00') : (req.body?.deadline ? new Date(req.body.deadline) : null);
    const trackingLinkFormat = ['short', 'domain', 'custom'].includes(req.body?.trackingLinkFormat) ? req.body.trackingLinkFormat : 'domain';
    const trackingLinkSlug = (req.body?.trackingLinkSlug || '').trim().toLowerCase().replace(/[^a-z0-9-]/g, '-').slice(0, 40);

    const campaign = await Campaign.create({
      advertiser: userId,
      channel: canal._id,
      content,
      targetUrl,
      price,
      deadline,
      trackingLinkFormat,
      trackingLinkSlug,
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

    // Notify channel owner about new campaign request
    const channelDoc = await Canal.findById(canal._id).select('propietario').lean();
    if (channelDoc?.propietario) {
      notifySafe({
        usuarioId: channelDoc.propietario,
        tipo: 'campana.nueva',
        titulo: 'Nueva solicitud de campaña',
        mensaje: `Un anunciante quiere publicar en tu canal por €${price}`,
        datos: { campaignId: campaign._id },
        canales: ['database', 'realtime'],
        prioridad: 'normal'
      });
    }

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

    const items = await Campaign.find({ $or: or })
      .populate('channel', 'nombreCanal plataforma categoria identificadorCanal foto')
      .sort({ createdAt: -1 }).lean();
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

    const campaign = await Campaign.findById(req.params.id)
      .populate('channel', 'nombreCanal plataforma categoria identificadorCanal foto')
      .lean();
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

    // Auto-apply campaign credits (welcome bonus from referrals).
    // Uses atomic $inc to prevent double-spend on concurrent payments.
    const advertiser = await Usuario.findById(userId);
    let creditsUsed = 0;
    if (advertiser?.campaignCreditsBalance > 0) {
      creditsUsed = Math.min(advertiser.campaignCreditsBalance, campaign.price);
      // Atomic deduction — if two payments race, each gets its own snapshot
      const updated = await Usuario.findOneAndUpdate(
        { _id: userId, campaignCreditsBalance: { $gte: creditsUsed } },
        { $inc: { campaignCreditsBalance: -creditsUsed } },
        { new: true }
      );
      // If the atomic update failed (balance dropped between read and write),
      // recalculate with whatever balance remains
      if (!updated) {
        const fresh = await Usuario.findById(userId);
        creditsUsed = Math.min(fresh?.campaignCreditsBalance || 0, campaign.price);
        if (creditsUsed > 0) {
          await Usuario.findOneAndUpdate(
            { _id: userId, campaignCreditsBalance: { $gte: creditsUsed } },
            { $inc: { campaignCreditsBalance: -creditsUsed } }
          );
        }
      }
    }

    const amountCharged = +(campaign.price - creditsUsed).toFixed(2);

    // Hold payment in escrow until campaign is completed
    const transaccion = await Transaccion.findOneAndUpdate(
      { campaign: campaign._id, status: 'pending' },
      {
        status: 'escrow',
        paidAt: new Date(),
        amount: amountCharged,
        description: creditsUsed > 0
          ? `Pago campaña: €${campaign.price} (€${creditsUsed.toFixed(2)} en créditos aplicados)`
          : '',
      },
      { new: true }
    );

    campaign.status = 'PAID';
    await campaign.save();

    // Fetch fresh balance after atomic deduction
    const freshAdvertiser = await Usuario.findById(userId).select('campaignCreditsBalance').lean();
    return res.json({
      success: true,
      data: {
        campaign,
        transaccion,
        creditsUsed,
        amountCharged,
        remainingCredits: freshAdvertiser?.campaignCreditsBalance || 0,
      },
    });
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

    // Generate tracking link based on advertiser's chosen format
    try {
      const TrackingLink = require('../models/TrackingLink');
      const crypto = require('crypto');
      const fmt = campaign.trackingLinkFormat || 'domain';
      let code;

      if (fmt === 'custom' && campaign.trackingLinkSlug) {
        // Custom slug: channelad.io/r/mi-oferta-especial
        code = campaign.trackingLinkSlug;
      } else if (fmt === 'domain') {
        // Show target domain: channelad.io/go/su-web.com/oferta
        try {
          const parsed = new URL(campaign.targetUrl);
          code = 'go/' + parsed.host + parsed.pathname;
        } catch { code = crypto.randomBytes(4).toString('hex'); }
      } else {
        // Short hash: channelad.io/t/a8f3c2d1
        code = crypto.randomBytes(4).toString('hex');
      }

      const trackingLink = await TrackingLink.create({
        code,
        targetUrl: campaign.targetUrl,
        createdBy: userId,
        type: 'campaign',
        campaign: campaign._id,
        channel: campaign.channel,
        active: true,
        stats: { totalClicks: 0, uniqueClicks: 0 },
      });

      const prefix = fmt === 'custom' ? '/r/' : fmt === 'domain' ? '/' : '/t/';
      campaign.trackingUrl = `https://channelad.io${prefix}${code}`;
      campaign.trackingLinkId = trackingLink._id;
    } catch (trackErr) {
      console.error('TrackingLink creation failed:', trackErr?.message);
      campaign.trackingUrl = campaign.targetUrl;
    }

    campaign.status = 'PUBLISHED';
    campaign.publishedAt = new Date();
    await campaign.save();

    // Initialize the v2 metrics document + its 5-window snapshot schedule
    // so the hourly capture cron can start picking it up. Non-blocking.
    setImmediate(() => {
      require('../services/campaignSnapshotService')
        .initCampaignMetrics(campaign._id)
        .catch((err) => console.error('initCampaignMetrics failed:', err?.message));
    });

    // Deliver ad to platform (non-blocking with retry)
    setImmediate(async () => {
      try {
        const { deliverAd } = require('../services/adDeliveryService');
        const result = await deliverAd(campaign._id);
        if (!result.success && !result.skipped) {
          console.error(`Ad delivery failed for campaign ${campaign._id}:`, result.error);
        }
      } catch (deliveryErr) {
        console.error('Ad delivery service error:', deliveryErr?.message);
      }
    });

    // Notify advertiser that campaign is published
    notifySafe({
      usuarioId: campaign.advertiser,
      tipo: 'campana.publicada',
      titulo: 'Campaña publicada',
      mensaje: 'Tu campaña ha sido aceptada y publicada por el creador.',
      datos: { campaignId: campaign._id },
      canales: ['database', 'realtime'],
      prioridad: 'alta'
    });

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

    // Immediate final-snapshot capture + CAS recalc. The snapshot writes
    // the `final` MetricPoint that feeds CAP in the next CAS run. Both
    // are non-blocking so the user response is not delayed by scoring.
    setImmediate(async () => {
      try {
        await require('../services/campaignSnapshotService')
          .captureFinalSnapshot(campaign._id);
      } catch (err) {
        console.error('captureFinalSnapshot failed:', err?.message);
      }
      try {
        await require('../services/scoringOrchestrator')
          .recalcularCASCanal(campaign.channel, { trigger: 'campaign_completed' });
      } catch (err) {
        console.error('Post-campaign CAS recalc failed:', err?.message);
      }
    });

    // Release escrow: mark transaction as paid + capture Stripe PaymentIntent if exists
    const tx = await Transaccion.findOne({ campaign: campaign._id });
    if (tx && (tx.status === 'escrow' || tx.status === 'pending')) {
      tx.status = 'paid';
      tx.paidAt = tx.paidAt || new Date();
      await tx.save();
    }
    if (campaign.stripePaymentIntentId || tx?.stripePaymentIntentId) {
      try {
        const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY)
        const piId = campaign.stripePaymentIntentId || tx?.stripePaymentIntentId
        await stripe.paymentIntents.capture(piId)
      } catch (stripeErr) {
        console.error('Stripe capture error:', stripeErr.message)
      }
    }

    // Auto-transfer to creator via Stripe Connect (non-blocking)
    const channelOwner = await Canal.findOne({ _id: campaign.channel }).select('propietario').lean();
    if (channelOwner?.propietario) {
      setImmediate(async () => {
        try {
          const creator = await Usuario.findById(channelOwner.propietario);
          if (creator?.stripeConnectAccountId) {
            const stripeConnect = require('../services/stripeConnectService');
            const netAmount = campaign.netAmount || campaign.price * 0.9;
            await stripeConnect.transferToCreator(netAmount, creator.stripeConnectAccountId, {
              campaignId: String(campaign._id),
              creatorId: String(creator._id),
            });
          }
        } catch (transferErr) {
          console.error('Auto-transfer to creator failed:', transferErr?.message);
        }
      });
    }

    // Notify both parties
    notifySafe({
      usuarioId: campaign.advertiser,
      tipo: 'campana.completada',
      titulo: 'Campaña completada',
      mensaje: 'Tu campaña ha sido completada exitosamente.',
      datos: { campaignId: campaign._id },
      canales: ['database', 'realtime'],
      prioridad: 'alta'
    });
    if (channelOwner?.propietario) {
      notifySafe({
        usuarioId: channelOwner.propietario,
        tipo: 'campana.completada',
        titulo: 'Campaña completada',
        mensaje: `Campaña completada. Has ganado €${campaign.netAmount || campaign.price}.`,
        datos: { campaignId: campaign._id, earnings: campaign.netAmount },
        canales: ['database', 'realtime'],
        prioridad: 'alta'
      });
    }

    // --- Referral credit generation ---
    try {
      const advertiser = await Usuario.findById(campaign.advertiser)
      if (advertiser?.referredBy) {
        const referrer = await Usuario.findById(advertiser.referredBy)
        if (referrer) {
          const creditAmount = (campaign.price || 0) * 0.05
          if (creditAmount > 0) {
            referrer.referralCreditsBalance += creditAmount
            referrer.referralGMVGenerated += (campaign.price || 0)
            referrer.referralTier = getReferralTier(referrer)
            await referrer.save()

            await Transaccion.create({
              campaign: campaign._id,
              advertiser: advertiser._id,
              creator: referrer._id,
              amount: creditAmount,
              tipo: 'referral',
              status: 'paid',
              paidAt: new Date(),
              description: `Credito referido: ${creditAmount.toFixed(2)}€ (5% de €${campaign.price})`,
              referralCreditGenerated: creditAmount,
              referralUserId: referrer._id,
            })

            // Send commission email to referrer (non-blocking)
            setImmediate(async () => {
              try {
                const emailService = require('../services/emailService')
                await emailService.enviarComisionReferral(
                  referrer,
                  advertiser.nombre || advertiser.email,
                  creditAmount,
                  campaign.price,
                  referrer.referralCreditsBalance,
                  referrer.referralTier
                )
              } catch (emailErr) {
                console.error('Referral commission email failed:', emailErr?.message)
              }
            })
          }
        }
      }
    } catch (refErr) {
      console.error('Referral credit error (non-blocking):', refErr)
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

    const isAdvertiser = campaign.advertiser?.toString?.() === String(userId);
    const channelDoc = await Canal.findById(campaign.channel).select('propietario').lean();
    const isChannelOwner = channelDoc?.propietario?.toString?.() === String(userId);

    if (!isAdvertiser && !isChannelOwner) {
      return next(httpError(403, 'No autorizado'));
    }

    if (campaign.status === 'COMPLETED' || campaign.status === 'CANCELLED') {
      return next(httpError(400, `No se puede cancelar una campaña en estado ${campaign.status}`));
    }

    campaign.status = 'CANCELLED';
    campaign.cancelledAt = new Date();
    await campaign.save();

    // Notify channel owner
    const cOwner = await Canal.findOne({ _id: campaign.channel }).select('propietario').lean();
    if (cOwner?.propietario) {
      notifySafe({
        usuarioId: cOwner.propietario,
        tipo: 'campana.cancelada',
        titulo: 'Campaña cancelada',
        mensaje: 'El anunciante ha cancelado una campaña.',
        datos: { campaignId: campaign._id },
        canales: ['database', 'realtime'],
        prioridad: 'normal'
      });
    }

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

// ── Campaign chat ────────────────────────────────────────────────────────────

const CampaignMessage = require('../models/CampaignMessage');
const { moderateMessage } = require('../lib/messageModeration');

// Rate-limit: per-user message timestamps (in-memory, resets on deploy)
const _msgTimestamps = new Map();
const MSG_RATE_LIMIT_MS = 3000;    // 1 message per 3 seconds
const MSG_MAX_PER_HOUR = 60;       // max 60 messages per campaign per hour
const MSG_MAX_LENGTH = 2000;       // max 2000 chars per message

const getCampaignMessages = async (req, res, next) => {
  try {
    const ok = await ensureDb();
    if (!ok) return res.status(503).json({ success: false, message: 'Servicio no disponible' });

    const userId = req.usuario?.id;
    if (!userId) return next(httpError(401, 'No autorizado'));

    const campaign = await Campaign.findById(req.params.id).lean();
    if (!campaign) return next(httpError(404, 'Campaign no encontrada'));

    const allowed = await canAccessCampaign(campaign, userId);
    if (!allowed) return next(httpError(403, 'No autorizado'));

    const messages = await CampaignMessage.find({ campaign: campaign._id })
      .sort({ createdAt: 1 })
      .lean();

    return res.json({ success: true, data: messages });
  } catch (error) { next(error); }
};

const sendCampaignMessage = async (req, res, next) => {
  try {
    const ok = await ensureDb();
    if (!ok) return res.status(503).json({ success: false, message: 'Servicio no disponible' });

    const userId = req.usuario?.id;
    if (!userId) return next(httpError(401, 'No autorizado'));

    const text = String(req.body?.text || '').trim();
    const type = req.body?.type || 'message';
    if (!text) return next(httpError(400, 'Texto requerido'));

    // ── Length limit ──
    if (text.length > MSG_MAX_LENGTH) {
      return next(httpError(400, `El mensaje no puede superar los ${MSG_MAX_LENGTH} caracteres`));
    }

    // ── Rate limiting ──
    const rateKey = `${userId}:${req.params.id}`;
    const now = Date.now();
    const timestamps = _msgTimestamps.get(rateKey) || [];
    // Remove entries older than 1 hour
    const recent = timestamps.filter(t => now - t < 3600000);

    if (recent.length > 0 && now - recent[recent.length - 1] < MSG_RATE_LIMIT_MS) {
      return next(httpError(429, 'Espera unos segundos antes de enviar otro mensaje'));
    }
    if (recent.length >= MSG_MAX_PER_HOUR) {
      return next(httpError(429, 'Has alcanzado el limite de mensajes por hora'));
    }

    // ── Content moderation ──
    const modResult = moderateMessage(text);
    if (modResult.blocked) {
      return res.status(422).json({
        success: false,
        blocked: true,
        message: modResult.reason,
      });
    }

    const campaign = await Campaign.findById(req.params.id).lean();
    if (!campaign) return next(httpError(404, 'Campaign no encontrada'));

    const allowed = await canAccessCampaign(campaign, userId);
    if (!allowed) return next(httpError(403, 'No autorizado'));

    const isAdvertiser = campaign.advertiser?.toString() === String(userId);
    const senderRole = isAdvertiser ? 'advertiser' : 'creator';

    const msg = await CampaignMessage.create({
      campaign: campaign._id,
      sender: userId,
      senderRole,
      text,
      type
    });

    // Record timestamp for rate limiting
    recent.push(now);
    _msgTimestamps.set(rateKey, recent);

    // Notify the other party
    const channelDoc = await Canal.findById(campaign.channel).select('propietario').lean();
    const recipientId = isAdvertiser ? channelDoc?.propietario : campaign.advertiser;
    if (recipientId) {
      notifySafe({
        usuarioId: recipientId,
        tipo: 'campana.mensaje',
        titulo: 'Nuevo mensaje',
        mensaje: `${isAdvertiser ? 'El anunciante' : 'El creador'} te ha enviado un mensaje`,
        datos: { campaignId: campaign._id },
        canales: ['database', 'realtime'],
        prioridad: 'normal'
      });
    }

    return res.status(201).json({ success: true, data: msg });
  } catch (error) { next(error); }
};

// POST /api/campaigns/launch-auto — Auto-buy: select channels + create campaigns in batch
const launchAutoCampaign = async (req, res, next) => {
  try {
    const ok = await ensureDb();
    if (!ok) return res.status(503).json({ success: false, message: 'Servicio no disponible' });

    const userId = req.usuario?.id;
    if (!userId) return next(httpError(401, 'No autorizado'));

    const { budget, category, mode, content, targetUrl, channels: manualChannelIds, listId } = req.body || {};

    if (!content?.trim()) return next(httpError(400, 'El contenido del anuncio es requerido'));
    if (!targetUrl?.trim()) return next(httpError(400, 'La URL de destino es requerida'));
    try { new URL(targetUrl.trim()); } catch { return next(httpError(400, 'URL de destino inválida')); }
    if (!budget || budget < 50) return next(httpError(400, 'Presupuesto mínimo: €50'));

    const { resolveCommissionRate } = require('../config/commissions');
    const commissionRate = resolveCommissionRate({ campaignType: 'autoCampaign' });

    // Resolve target channels based on mode
    let targetChannels = [];

    if (mode === 'manual' && Array.isArray(manualChannelIds) && manualChannelIds.length > 0) {
      targetChannels = await Canal.find({
        _id: { $in: manualChannelIds },
        estado: 'activo',
      }).select('_id nombreCanal plataforma categoria CPMDinamico precio propietario').lean();
    } else if (mode === 'fav' && listId) {
      const UserList = require('../models/UserList');
      const list = await UserList.findOne({ _id: listId, usuario: userId }).lean();
      if (list?.channels?.length) {
        targetChannels = await Canal.find({
          _id: { $in: list.channels },
          estado: 'activo',
        }).select('_id nombreCanal plataforma categoria CPMDinamico precio propietario').lean();
      }
    } else {
      // Auto mode: find best channels in category
      const query = { estado: 'activo' };
      if (category) query.categoria = category;
      targetChannels = await Canal.find(query)
        .select('_id nombreCanal plataforma categoria CPMDinamico precio propietario')
        .sort({ 'estadisticas.seguidores': -1 })
        .limit(20)
        .lean();
    }

    // Filter out own channels
    targetChannels = targetChannels.filter(
      ch => ch.propietario?.toString() !== String(userId)
    );

    if (targetChannels.length === 0) {
      return next(httpError(400, 'No se encontraron canales disponibles para tu configuración'));
    }

    // Distribute budget across channels, respecting per-channel price
    let remaining = budget;
    const selected = [];

    for (const ch of targetChannels) {
      const price = ch.CPMDinamico || ch.precio || 0;
      if (price <= 0) continue;
      if (price > remaining) continue;
      selected.push({ channel: ch, price });
      remaining -= price;
      if (remaining <= 0) break;
    }

    if (selected.length === 0) {
      return next(httpError(400, 'El presupuesto no es suficiente para ningún canal disponible'));
    }

    // Create campaigns in batch
    const campaigns = [];
    for (const { channel, price } of selected) {
      const netAmount = +(price * (1 - commissionRate)).toFixed(2);

      const campaign = await Campaign.create({
        advertiser: userId,
        channel: channel._id,
        content: content.trim(),
        targetUrl: targetUrl.trim(),
        price,
        commissionRate,
        netAmount,
        status: 'DRAFT',
        createdAt: new Date(),
      });

      await Transaccion.create({
        campaign: campaign._id,
        advertiser: userId,
        amount: price,
        tipo: 'pago',
        status: 'pending',
      });

      campaigns.push({
        _id: campaign._id,
        id: campaign._id,
        channel: {
          _id: channel._id,
          nombreCanal: channel.nombreCanal,
          plataforma: channel.plataforma,
          categoria: channel.categoria,
        },
        price,
        netAmount,
        status: 'DRAFT',
      });

      // Notify channel owner
      if (channel.propietario) {
        notifySafe({
          usuarioId: channel.propietario,
          tipo: 'campana.nueva',
          titulo: 'Nueva solicitud de campaña',
          mensaje: `Un anunciante quiere publicar en tu canal por €${price}`,
          datos: { campaignId: campaign._id },
          canales: ['database', 'realtime'],
          prioridad: 'normal',
        });
      }
    }

    const totalSpent = selected.reduce((sum, s) => sum + s.price, 0);

    return res.status(201).json({
      success: true,
      data: {
        campaigns,
        channelCount: campaigns.length,
        totalBudget: totalSpent,
        commissionRate,
        remainingBudget: budget - totalSpent,
      },
    });
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
  cancelCampaign,
  getCampaignMessages,
  sendCampaignMessage,
  launchAutoCampaign,
};
