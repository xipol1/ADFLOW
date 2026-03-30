const TrackingLink = require('../models/TrackingLink');
const Campaign = require('../models/Campaign');
const Canal = require('../models/Canal');
const { ensureDb } = require('../lib/ensureDb');

const httpError = (status, message) => {
  const err = new Error(message); err.status = status; return err;
};

const BASE_URL = process.env.FRONTEND_URL
  || (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : '');

// ═══════════════════════════════════════════════════════════════════════════════
// CREATE TRACKING LINK — POST /api/tracking/links
// Creates a short trackable URL for any destination
// ═══════════════════════════════════════════════════════════════════════════════
const createLink = async (req, res, next) => {
  try {
    const ok = await ensureDb();
    if (!ok) return res.status(503).json({ success: false, message: 'Servicio no disponible' });

    const userId = req.usuario?.id;
    if (!userId) return next(httpError(401, 'No autorizado'));

    const { targetUrl, type = 'custom', campaignId, channelId } = req.body;
    if (!targetUrl) return next(httpError(400, 'targetUrl es requerido'));

    // Generate unique code
    let code, attempts = 0;
    do {
      code = TrackingLink.generateCode();
      attempts++;
    } while (await TrackingLink.exists({ code }) && attempts < 10);

    const link = await TrackingLink.create({
      code,
      targetUrl,
      createdBy: userId,
      type,
      campaign: campaignId || null,
      channel: channelId || null,
    });

    const origin = BASE_URL || `${req.protocol}://${req.get('host')}`;
    const trackingUrl = `${origin}/t/${code}`;

    return res.status(201).json({
      success: true,
      data: {
        id: link._id,
        code: link.code,
        targetUrl: link.targetUrl,
        trackingUrl,
        type: link.type,
        stats: link.stats,
      },
    });
  } catch (error) { next(error); }
};

// ═══════════════════════════════════════════════════════════════════════════════
// CREATE VERIFICATION LINK — POST /api/tracking/verify-link
// Creates a special link for channel verification test post
// ═══════════════════════════════════════════════════════════════════════════════
const createVerificationLink = async (req, res, next) => {
  try {
    const ok = await ensureDb();
    if (!ok) return res.status(503).json({ success: false, message: 'Servicio no disponible' });

    const userId = req.usuario?.id;
    if (!userId) return next(httpError(401, 'No autorizado'));

    const { channelId } = req.body;
    if (!channelId) return next(httpError(400, 'channelId es requerido'));

    const canal = await Canal.findById(channelId);
    if (!canal) return next(httpError(404, 'Canal no encontrado'));
    if (canal.propietario?.toString() !== String(userId)) return next(httpError(403, 'No autorizado'));

    // Check if there's already a pending verification link for this channel
    let existing = await TrackingLink.findOne({
      channel: channelId,
      type: 'verification',
      'verification.status': { $in: ['pending', 'posted'] },
    });

    if (existing) {
      const origin = BASE_URL || `${req.protocol}://${req.get('host')}`;
      return res.json({
        success: true,
        data: {
          id: existing._id,
          code: existing.code,
          trackingUrl: `${origin}/t/${existing.code}`,
          targetUrl: existing.targetUrl,
          verification: existing.verification,
          stats: existing.stats,
        },
      });
    }

    // Generate unique code
    let code, attempts = 0;
    do {
      code = TrackingLink.generateCode();
      attempts++;
    } while (await TrackingLink.exists({ code }) && attempts < 10);

    // Verification link redirects to Adflow's own verification landing page
    const origin = BASE_URL || `${req.protocol}://${req.get('host')}`;
    const verifyLandingUrl = `${origin}/verify-channel?ch=${channelId}`;

    const link = await TrackingLink.create({
      code,
      targetUrl: verifyLandingUrl,
      createdBy: userId,
      type: 'verification',
      channel: channelId,
      verification: {
        status: 'pending',
        minClicks: 3,
        expiresAt: new Date(Date.now() + 48 * 60 * 60 * 1000), // 48h
      },
    });

    const trackingUrl = `${origin}/t/${link.code}`;

    return res.status(201).json({
      success: true,
      data: {
        id: link._id,
        code: link.code,
        trackingUrl,
        targetUrl: link.targetUrl,
        verification: link.verification,
        stats: link.stats,
        message: `Publica este enlace en tu canal. Necesitas al menos ${link.verification.minClicks} clicks en 48h para verificar.`,
      },
    });
  } catch (error) { next(error); }
};

// ═══════════════════════════════════════════════════════════════════════════════
// CHECK VERIFICATION STATUS — GET /api/tracking/verify-status/:channelId
// ═══════════════════════════════════════════════════════════════════════════════
const checkVerificationStatus = async (req, res, next) => {
  try {
    const ok = await ensureDb();
    if (!ok) return res.status(503).json({ success: false, message: 'Servicio no disponible' });

    const { channelId } = req.params;

    const link = await TrackingLink.findOne({
      channel: channelId,
      type: 'verification',
    }).sort({ createdAt: -1 });

    if (!link) {
      return res.json({ success: true, data: { status: 'none', message: 'No hay verificacion pendiente' } });
    }

    // Check if expired
    if (link.verification.expiresAt && new Date() > link.verification.expiresAt && link.verification.status === 'pending') {
      link.verification.status = 'expired';
      await link.save();
    }

    // Check if verification threshold reached
    const isVerified = link.stats.uniqueClicks >= link.verification.minClicks;
    if (isVerified && link.verification.status !== 'verified') {
      link.verification.status = 'verified';
      link.verification.verifiedAt = new Date();
      await link.save();

      // Update channel status
      await Canal.findByIdAndUpdate(channelId, {
        estado: 'activo',
        verificado: true,
        'estadisticas.ultimaActualizacion': new Date(),
      });
    }

    const origin = BASE_URL || `${req.protocol}://${req.get('host')}`;

    return res.json({
      success: true,
      data: {
        status: link.verification.status,
        trackingUrl: `${origin}/t/${link.code}`,
        stats: {
          totalClicks: link.stats.totalClicks,
          uniqueClicks: link.stats.uniqueClicks,
          devices: link.stats.devices,
          countries: link.stats.countries,
          lastClickAt: link.stats.lastClickAt,
        },
        verification: link.verification,
        minClicks: link.verification.minClicks,
        clicksNeeded: Math.max(0, link.verification.minClicks - link.stats.uniqueClicks),
        recentClicks: (link.clicks || []).slice(-10).map(c => ({
          device: c.device,
          os: c.os,
          browser: c.browser,
          country: c.country,
          timestamp: c.timestamp,
        })),
      },
    });
  } catch (error) { next(error); }
};

// ═══════════════════════════════════════════════════════════════════════════════
// CONVERT URL FOR CAMPAIGN — POST /api/tracking/convert
// Takes an advertiser's URL and returns a tracking-wrapped version
// ═══════════════════════════════════════════════════════════════════════════════
const convertUrlForCampaign = async (req, res, next) => {
  try {
    const ok = await ensureDb();
    if (!ok) return res.status(503).json({ success: false, message: 'Servicio no disponible' });

    const userId = req.usuario?.id;
    if (!userId) return next(httpError(401, 'No autorizado'));

    const { targetUrl, campaignId } = req.body;
    if (!targetUrl) return next(httpError(400, 'targetUrl es requerido'));

    // Validate campaign exists and belongs to user
    if (campaignId) {
      const campaign = await Campaign.findById(campaignId);
      if (!campaign) return next(httpError(404, 'Campana no encontrada'));
    }

    let code, attempts = 0;
    do {
      code = TrackingLink.generateCode();
      attempts++;
    } while (await TrackingLink.exists({ code }) && attempts < 10);

    const link = await TrackingLink.create({
      code,
      targetUrl,
      createdBy: userId,
      type: 'campaign',
      campaign: campaignId || null,
    });

    // Also update campaign's targetUrl to use the tracking link
    const origin = BASE_URL || `${req.protocol}://${req.get('host')}`;
    const trackingUrl = `${origin}/t/${link.code}`;

    if (campaignId) {
      await Campaign.findByIdAndUpdate(campaignId, {
        $set: { trackingUrl, trackingLinkId: link._id },
      });
    }

    return res.status(201).json({
      success: true,
      data: {
        id: link._id,
        code: link.code,
        originalUrl: targetUrl,
        trackingUrl,
        type: 'campaign',
      },
    });
  } catch (error) { next(error); }
};

// ═══════════════════════════════════════════════════════════════════════════════
// GET LINK ANALYTICS — GET /api/tracking/links/:id/analytics
// ═══════════════════════════════════════════════════════════════════════════════
const getLinkAnalytics = async (req, res, next) => {
  try {
    const ok = await ensureDb();
    if (!ok) return res.status(503).json({ success: false, message: 'Servicio no disponible' });

    const link = await TrackingLink.findById(req.params.id);
    if (!link) return next(httpError(404, 'Link no encontrado'));

    const origin = BASE_URL || `${req.protocol}://${req.get('host')}`;

    return res.json({
      success: true,
      data: {
        id: link._id,
        code: link.code,
        trackingUrl: `${origin}/t/${link.code}`,
        targetUrl: link.targetUrl,
        type: link.type,
        stats: link.stats,
        clicks: (link.clicks || []).slice(-50).map(c => ({
          device: c.device,
          os: c.os,
          browser: c.browser,
          country: c.country,
          city: c.city,
          referer: c.referer,
          language: c.language,
          timestamp: c.timestamp,
        })),
        createdAt: link.createdAt,
      },
    });
  } catch (error) { next(error); }
};

// ═══════════════════════════════════════════════════════════════════════════════
// GET MY LINKS — GET /api/tracking/links
// ═══════════════════════════════════════════════════════════════════════════════
const getMyLinks = async (req, res, next) => {
  try {
    const ok = await ensureDb();
    if (!ok) return res.status(503).json({ success: false, message: 'Servicio no disponible' });

    const userId = req.usuario?.id;
    if (!userId) return next(httpError(401, 'No autorizado'));

    const { type, campaignId, channelId } = req.query;
    const filter = { createdBy: userId };
    if (type) filter.type = type;
    if (campaignId) filter.campaign = campaignId;
    if (channelId) filter.channel = channelId;

    const links = await TrackingLink.find(filter)
      .select('code targetUrl type stats verification campaign channel active createdAt')
      .sort({ createdAt: -1 })
      .limit(100)
      .lean();

    const origin = BASE_URL || `${req.protocol}://${req.get('host')}`;

    return res.json({
      success: true,
      data: links.map(l => ({
        ...l,
        trackingUrl: `${origin}/t/${l.code}`,
      })),
    });
  } catch (error) { next(error); }
};

module.exports = {
  createLink,
  createVerificationLink,
  checkVerificationStatus,
  convertUrlForCampaign,
  getLinkAnalytics,
  getMyLinks,
};
