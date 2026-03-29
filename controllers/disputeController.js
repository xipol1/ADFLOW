const Dispute = require('../models/Dispute');
const Campaign = require('../models/Campaign');
const Canal = require('../models/Canal');
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
      messages: [{ sender: userId, text: description }]
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

// POST /api/disputes/:id/resolve (admin only)
const resolveDispute = async (req, res, next) => {
  try {
    const ok = await ensureDb();
    if (!ok) return res.status(503).json({ success: false, message: 'Servicio no disponible' });

    const userId = req.usuario?.id;
    if (!userId) return next(httpError(401, 'No autorizado'));
    if (req.usuario?.rol !== 'admin') return next(httpError(403, 'Solo administradores pueden resolver disputas'));

    const { resolution, favoredParty } = req.body || {};
    if (!resolution || !favoredParty) {
      return next(httpError(400, 'resolution y favoredParty son requeridos'));
    }

    const dispute = await Dispute.findById(req.params.id);
    if (!dispute) return next(httpError(404, 'Disputa no encontrada'));

    if (['resolved_advertiser', 'resolved_creator', 'closed'].includes(dispute.status)) {
      return next(httpError(400, 'La disputa ya está resuelta'));
    }

    dispute.status = favoredParty === 'advertiser' ? 'resolved_advertiser' : 'resolved_creator';
    dispute.resolution = resolution;
    dispute.resolvedBy = userId;
    dispute.resolvedAt = new Date();
    await dispute.save();

    // If resolved in favor of advertiser, refund; if creator, complete campaign
    const campaign = await Campaign.findById(dispute.campaign);
    if (campaign) {
      if (favoredParty === 'advertiser') {
        campaign.status = 'CANCELLED';
        campaign.cancelledAt = new Date();
      } else {
        campaign.status = 'COMPLETED';
        campaign.completedAt = new Date();
      }
      await campaign.save();
    }

    // Notify both parties
    try {
      const notificationService = require('../services/notificationService');
      for (const uid of [dispute.openedBy, dispute.againstUser]) {
        await notificationService.enviarNotificacion({
          usuarioId: uid,
          tipo: 'disputa.resuelta',
          titulo: 'Disputa resuelta',
          mensaje: `La disputa ha sido resuelta a favor del ${favoredParty === 'advertiser' ? 'anunciante' : 'creador'}.`,
          datos: { disputeId: dispute._id, resolution },
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
  resolveDispute
};
