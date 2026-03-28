const Campaign = require('../models/Campaign');
const Canal = require('../models/Canal');
const Tracking = require('../models/Tracking');
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

module.exports = {
  getCampaignStats
};
