const Dispute = require('../models/Dispute');
const Campaign = require('../models/Campaign');
const Canal = require('../models/Canal');
const Transaccion = require('../models/Transaccion');
const Usuario = require('../models/Usuario');
const { resolveCreatorPayable } = require('../lib/creatorPayout');
const { ensureDb } = require('../lib/ensureDb');

const httpError = (status, message) => {
  const err = new Error(message);
  err.status = status;
  return err;
};

// Lazy-load Stripe only if key is configured (same gating as transaccionController)
const getStripe = () => {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key || !key.startsWith('sk_')) return null;
  return require('stripe')(key);
};

/**
 * Split a dispute refund into its card and wallet-credit components.
 *
 * capturedAmount is the real EUR charged to the card at payment time
 * (price - promo credits applied, persisted by payCampaign). Only that part
 * can travel back through Stripe; the credit-funded remainder goes back to
 * the advertiser's campaignCreditsBalance. Legacy campaigns (capturedAmount
 * null) predate the split — there creditsUsed was always 0, so the full
 * price is treated as card money.
 */
const refundBreakdown = (campaign, pct) => {
  const price = campaign.price || 0;
  const captured = Number.isFinite(campaign.capturedAmount) ? campaign.capturedAmount : price;
  const creditsUsed = Number.isFinite(campaign.capturedAmount)
    ? Math.max(0, +(price - campaign.capturedAmount).toFixed(2))
    : 0;
  const cardRefund = +(captured * pct / 100).toFixed(2);
  const creditsRefund = +(creditsUsed * pct / 100).toFixed(2);
  return { captured, cardRefund, creditsRefund, total: +(cardRefund + creditsRefund).toFixed(2) };
};

/**
 * Move the card money back to the advertiser through Stripe BEFORE any DB
 * write records the refund. Throws httpError(502) on any Stripe failure so
 * the caller aborts without creating a Transaccion that lies about money
 * that never moved.
 *
 * Returns { piId, refundId } when Stripe was involved, or null when there is
 * no card money behind the campaign (credits-only / simulated test payment).
 */
const executeCardRefund = async (campaign, dispute, money, pct) => {
  if (!(money.cardRefund > 0)) return null;

  const payTx = await Transaccion.findOne({
    campaign: campaign._id,
    tipo: 'pago',
    stripePaymentIntentId: { $ne: null },
  }).lean();
  const piId = campaign.stripePaymentIntentId || payTx?.stripePaymentIntentId || null;
  // No PaymentIntent: the campaign was funded without a card charge
  // (credits-only or the simulated test-env path) — nothing to return via Stripe.
  if (!piId) return null;

  const stripe = getStripe();
  if (!stripe) {
    throw httpError(502, 'Stripe no está configurado: no se puede ejecutar el reembolso real');
  }

  try {
    const pi = await stripe.paymentIntents.retrieve(piId);

    if (pi.status === 'succeeded') {
      // Money already captured (dispute resolved after settlement) → real refund.
      const refund = await stripe.refunds.create(
        { payment_intent: piId, amount: Math.round(money.cardRefund * 100) },
        { idempotencyKey: pct < 100 ? `refund-dispute:${dispute._id}:${pct}` : `refund-dispute:${dispute._id}` }
      );
      return { piId, refundId: refund.id };
    }

    if (pi.status === 'requires_capture') {
      // Dispute resolved BEFORE the 15-day settlement captured the escrow.
      // refunds.create fails on an uncaptured PI: release the authorization
      // instead. Partial → capture only the share the creator keeps; Stripe
      // releases the rest back to the card automatically.
      const keptOnCard = +(money.captured - money.cardRefund).toFixed(2);
      if (keptOnCard > 0) {
        await stripe.paymentIntents.capture(
          piId,
          { amount_to_capture: Math.round(keptOnCard * 100) },
          { idempotencyKey: `capture-dispute:${dispute._id}:${pct}` }
        );
      } else {
        await stripe.paymentIntents.cancel(piId, {
          idempotencyKey: `cancel-dispute:${dispute._id}`,
        });
      }
      return { piId, refundId: null };
    }

    throw httpError(502, `No se puede reembolsar: PaymentIntent en estado ${pi.status}`);
  } catch (err) {
    if (err.status === 502) throw err;
    throw httpError(502, `Stripe rechazó el reembolso: ${err.message}`);
  }
};

// Wallet-credit restitution — the counterpart of the atomic deduction in
// payCampaign. Credits never left the platform, so this is a plain $inc.
const restoreCredits = async (campaign, creditsRefund) => {
  if (!(creditsRefund > 0) || !campaign.advertiser) return;
  await Usuario.findByIdAndUpdate(campaign.advertiser, {
    $inc: { campaignCreditsBalance: creditsRefund },
  });
};

// POST /api/disputes
const createDispute = async (req, res, next) => {
  try {
    const ok = await ensureDb();
    if (!ok) return res.status(503).json({ success: false, message: 'Servicio no disponible' });

    const userId = req.usuario?.id;
    if (!userId) return next(httpError(401, 'No autorizado'));

    const { campaignId, reason, description } = req.body || {};
    if (!campaignId || !reason || !description) {
      return next(httpError(400, 'campaignId, reason y description son requeridos'));
    }

    const campaign = await Campaign.findById(campaignId).lean();
    if (!campaign) return next(httpError(404, 'Campaña no encontrada'));

    // Determine who the dispute is against
    const isAdvertiser = campaign.advertiser?.toString() === String(userId);
    const channelOwner = await Canal.findOne({ _id: campaign.channel }).select('propietario').lean();
    const isCreator = channelOwner?.propietario?.toString() === String(userId);

    if (!isAdvertiser && !isCreator) {
      return next(httpError(403, 'Solo participantes de la campaña pueden abrir disputa'));
    }

    const againstUser = isAdvertiser ? channelOwner?.propietario : campaign.advertiser;

    // Check no existing open dispute for this campaign
    const existing = await Dispute.findOne({ campaign: campaignId, status: { $in: ['open', 'under_review'] } });
    if (existing) {
      return next(httpError(400, 'Ya existe una disputa abierta para esta campaña'));
    }

    const dispute = await Dispute.create({
      campaign: campaignId,
      openedBy: userId,
      againstUser,
      reason,
      description,
      messages: [{ sender: userId, text: description }],
      timeline: [{ type: 'opened', by: userId, at: new Date() }],
    });

    // Mark campaign as disputed
    await Campaign.findByIdAndUpdate(campaignId, { status: 'DISPUTED' });

    // Send notification
    try {
      const notificationService = require('../services/notificationService');
      await notificationService.enviarNotificacion({
        usuarioId: againstUser,
        tipo: 'disputa.abierta',
        titulo: 'Disputa abierta',
        mensaje: `Se ha abierto una disputa para una de tus campañas. Razón: ${reason}`,
        datos: { disputeId: dispute._id, campaignId },
        canales: ['database', 'realtime'],
        prioridad: 'alta'
      });
    } catch (_) { /* notification failure is non-blocking */ }

    return res.status(201).json({ success: true, data: dispute });
  } catch (error) {
    next(error);
  }
};

// GET /api/disputes
const getMyDisputes = async (req, res, next) => {
  try {
    const ok = await ensureDb();
    if (!ok) return res.status(503).json({ success: false, message: 'Servicio no disponible' });

    const userId = req.usuario?.id;
    if (!userId) return next(httpError(401, 'No autorizado'));

    const isAdmin = req.usuario?.rol === 'admin';
    const filter = isAdmin ? {} : { $or: [{ openedBy: userId }, { againstUser: userId }] };

    const items = await Dispute.find(filter)
      .populate('campaign', 'content status price channel advertiser')
      .populate('openedBy', 'nombre email')
      .populate('againstUser', 'nombre email')
      .sort({ createdAt: -1 })
      .lean();

    return res.json({ success: true, data: { items } });
  } catch (error) {
    next(error);
  }
};

// GET /api/disputes/:id
const getDispute = async (req, res, next) => {
  try {
    const ok = await ensureDb();
    if (!ok) return res.status(503).json({ success: false, message: 'Servicio no disponible' });

    const userId = req.usuario?.id;
    if (!userId) return next(httpError(401, 'No autorizado'));

    const dispute = await Dispute.findById(req.params.id)
      .populate('campaign', 'content status price channel advertiser')
      .populate('openedBy', 'nombre email')
      .populate('againstUser', 'nombre email')
      .populate('messages.sender', 'nombre email')
      .lean();

    if (!dispute) return next(httpError(404, 'Disputa no encontrada'));

    const isAdmin = req.usuario?.rol === 'admin';
    const isParticipant = [dispute.openedBy?._id?.toString(), dispute.againstUser?._id?.toString()].includes(String(userId));
    if (!isAdmin && !isParticipant) return next(httpError(403, 'No autorizado'));

    return res.json({ success: true, data: dispute });
  } catch (error) {
    next(error);
  }
};

// POST /api/disputes/:id/message
const addMessage = async (req, res, next) => {
  try {
    const ok = await ensureDb();
    if (!ok) return res.status(503).json({ success: false, message: 'Servicio no disponible' });

    const userId = req.usuario?.id;
    if (!userId) return next(httpError(401, 'No autorizado'));

    const { text } = req.body || {};
    if (!text?.trim()) return next(httpError(400, 'El mensaje no puede estar vacío'));

    const dispute = await Dispute.findById(req.params.id);
    if (!dispute) return next(httpError(404, 'Disputa no encontrada'));

    const isAdmin = req.usuario?.rol === 'admin';
    const isParticipant = [dispute.openedBy?.toString(), dispute.againstUser?.toString()].includes(String(userId));
    if (!isAdmin && !isParticipant) return next(httpError(403, 'No autorizado'));

    if (['resolved_advertiser', 'resolved_creator', 'closed'].includes(dispute.status)) {
      return next(httpError(400, 'La disputa ya está cerrada'));
    }

    dispute.messages.push({ sender: userId, text: text.trim() });
    dispute.timeline.push({ type: 'message', by: userId, at: new Date() });
    await dispute.save();

    // Notify the other party
    try {
      const notificationService = require('../services/notificationService');
      const otherUser = dispute.openedBy?.toString() === String(userId) ? dispute.againstUser : dispute.openedBy;
      await notificationService.enviarNotificacion({
        usuarioId: otherUser,
        tipo: 'disputa.mensaje',
        titulo: 'Nuevo mensaje en disputa',
        mensaje: text.trim().slice(0, 100),
        datos: { disputeId: dispute._id },
        canales: ['database', 'realtime'],
        prioridad: 'normal'
      });
    } catch (_) { /* non-blocking */ }

    return res.json({ success: true, data: dispute });
  } catch (error) {
    next(error);
  }
};

// POST /api/disputes/:id/escalate — Escalate dispute for admin review
const escalateDispute = async (req, res, next) => {
  try {
    const ok = await ensureDb();
    if (!ok) return res.status(503).json({ success: false, message: 'Servicio no disponible' });

    const userId = req.usuario?.id;
    if (!userId) return next(httpError(401, 'No autorizado'));

    const dispute = await Dispute.findById(req.params.id);
    if (!dispute) return next(httpError(404, 'Disputa no encontrada'));

    const isParticipant = [dispute.openedBy?.toString(), dispute.againstUser?.toString()].includes(String(userId));
    if (!isParticipant) return next(httpError(403, 'No autorizado'));

    if (dispute.status !== 'open') {
      return next(httpError(400, 'Solo disputas abiertas pueden ser escaladas'));
    }

    dispute.status = 'under_review';
    dispute.escalatedAt = new Date();
    dispute.timeline.push({ type: 'escalated', by: userId, at: new Date() });
    await dispute.save();

    return res.json({ success: true, message: 'Disputa escalada para revision', data: dispute });
  } catch (error) {
    next(error);
  }
};

// POST /api/disputes/:id/resolve (admin only) — Enhanced with resolution types + auto-refund
const resolveDispute = async (req, res, next) => {
  try {
    const ok = await ensureDb();
    if (!ok) return res.status(503).json({ success: false, message: 'Servicio no disponible' });

    const userId = req.usuario?.id;
    if (!userId) return next(httpError(401, 'No autorizado'));
    if (req.usuario?.rol !== 'admin') return next(httpError(403, 'Solo administradores pueden resolver disputas'));

    const { resolution, resolutionType, refundPercent, adminNotes } = req.body || {};
    if (!resolution || !resolutionType) {
      return next(httpError(400, 'resolution y resolutionType son requeridos'));
    }
    if (!['favor_advertiser', 'favor_creator', 'partial', 'closed_no_action'].includes(resolutionType)) {
      return next(httpError(400, 'resolutionType invalido'));
    }

    const dispute = await Dispute.findById(req.params.id);
    if (!dispute) return next(httpError(404, 'Disputa no encontrada'));

    if (['resolved_advertiser', 'resolved_creator', 'closed'].includes(dispute.status)) {
      return next(httpError(400, 'La disputa ya esta resuelta'));
    }

    const campaign = await Campaign.findById(dispute.campaign);
    let refundAmount = 0;

    // Determine status and actions based on resolution type
    if (resolutionType === 'favor_advertiser') {
      dispute.status = 'resolved_advertiser';
      if (campaign) {
        const money = refundBreakdown(campaign, 100);
        // Real money FIRST: if Stripe refuses, abort with 502 and leave the
        // dispute/campaign untouched — no Transaccion may claim a refund that
        // never reached the card.
        const stripeResult = await executeCardRefund(campaign, dispute, money, 100);
        await restoreCredits(campaign, money.creditsRefund);
        refundAmount = money.total;
        campaign.status = 'CANCELLED';
        campaign.cancelledAt = new Date();
        await campaign.save();
        // The original payment is no longer owed to anyone: release the escrow
        // row as refunded so the advertiser's finances stop showing it held.
        await Transaccion.updateOne(
          { campaign: campaign._id, tipo: 'pago', status: { $in: ['escrow', 'pending'] } },
          { status: 'refunded' }
        );
        // Create refund transaction
        if (refundAmount > 0) {
          await Transaccion.create({
            campaign: campaign._id,
            advertiser: campaign.advertiser,
            amount: refundAmount,
            tipo: 'reembolso',
            status: 'paid',
            paidAt: new Date(),
            // NOTE: stripePaymentIntentId is NOT set here — the unique
            // (stripePaymentIntentId, tipo) index would block recording a
            // second legitimate partial refund against the same PI.
            stripeRefundId: stripeResult?.refundId || null,
            description: `Reembolso por disputa resuelta a favor del anunciante`,
          });
        }
      }
    } else if (resolutionType === 'favor_creator') {
      dispute.status = 'resolved_creator';
      if (campaign) {
        campaign.status = 'COMPLETED';
        campaign.completedAt = new Date();
        await campaign.save();
        // Release escrow
        await Transaccion.updateOne(
          { campaign: campaign._id, status: 'escrow' },
          { status: 'paid', paidAt: new Date() }
        );
      }
    } else if (resolutionType === 'partial') {
      dispute.status = 'resolved_advertiser';
      const pct = Math.min(100, Math.max(0, Number(refundPercent) || 50));
      if (campaign) {
        const money = refundBreakdown(campaign, pct);
        // Same contract as favor_advertiser: Stripe first, 502 aborts everything.
        const stripeResult = await executeCardRefund(campaign, dispute, money, pct);
        await restoreCredits(campaign, money.creditsRefund);
        refundAmount = money.total;
        // The creator only keeps the non-refunded share — scale their
        // withdrawable payout down or the refunded slice would be paid twice
        // (back to the advertiser AND out to the creator).
        campaign.creatorPayable = +(resolveCreatorPayable(campaign) * (100 - pct) / 100).toFixed(2);
        campaign.status = 'COMPLETED';
        campaign.completedAt = new Date();
        await campaign.save();
        // Release the remainder of the escrow to the creator (mirrors favor_creator).
        await Transaccion.updateOne(
          { campaign: campaign._id, status: 'escrow' },
          { status: 'paid', paidAt: new Date() }
        );
        if (refundAmount > 0) {
          await Transaccion.create({
            campaign: campaign._id,
            advertiser: campaign.advertiser,
            amount: refundAmount,
            tipo: 'reembolso',
            status: 'paid',
            paidAt: new Date(),
            stripeRefundId: stripeResult?.refundId || null,
            description: `Reembolso parcial (${pct}%) por disputa`,
          });
        }
      }
    } else {
      dispute.status = 'closed';
    }

    dispute.resolution = resolution;
    dispute.resolutionType = resolutionType;
    dispute.refundAmount = refundAmount;
    dispute.resolvedBy = userId;
    dispute.resolvedAt = new Date();
    dispute.adminNotes = adminNotes || '';
    dispute.timeline.push({ type: 'resolved', by: userId, text: resolution, at: new Date() });
    await dispute.save();

    // Notify both parties
    try {
      const notificationService = require('../services/notificationService');
      const labels = {
        favor_advertiser: 'a favor del anunciante',
        favor_creator: 'a favor del creador',
        partial: 'con reembolso parcial',
        closed_no_action: 'sin accion',
      };
      for (const uid of [dispute.openedBy, dispute.againstUser]) {
        await notificationService.enviarNotificacion({
          usuarioId: uid,
          tipo: 'disputa.resuelta',
          titulo: 'Disputa resuelta',
          mensaje: `La disputa ha sido resuelta ${labels[resolutionType]}.${refundAmount > 0 ? ` Reembolso: ${refundAmount} EUR.` : ''}`,
          datos: { disputeId: dispute._id, resolution, resolutionType, refundAmount },
          canales: ['database', 'realtime', 'email'],
          prioridad: 'alta'
        });
      }
    } catch (_) { /* non-blocking */ }

    return res.json({ success: true, data: dispute });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createDispute,
  getMyDisputes,
  getDispute,
  addMessage,
  escalateDispute,
  resolveDispute
};
