const Dispute = require('../models/Dispute');
const Campaign = require('../models/Campaign');
const Canal = require('../models/Canal');
const Transaccion = require('../models/Transaccion');
const { ensureDb } = require('../lib/ensureDb');

const httpError = (status, message) => {
  const err = new Error(message);
  err.status = status;
  return err;
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
        refundAmount = campaign.price || 0;
        campaign.status = 'CANCELLED';
        campaign.cancelledAt = new Date();
        await campaign.save();
        // Create refund transaction
        if (refundAmount > 0) {
          await Transaccion.create({
            campaign: campaign._id,
            advertiser: campaign.advertiser,
            amount: refundAmount,
            tipo: 'reembolso',
            status: 'paid',
            paidAt: new Date(),
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
        refundAmount = +((campaign.price || 0) * pct / 100).toFixed(2);
        campaign.status = 'COMPLETED';
        campaign.completedAt = new Date();
        await campaign.save();
        if (refundAmount > 0) {
          await Transaccion.create({
            campaign: campaign._id,
            advertiser: campaign.advertiser,
            amount: refundAmount,
            tipo: 'reembolso',
            status: 'paid',
            paidAt: new Date(),
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
