const Canal = require('../models/Canal');
const ChannelMetrics = require('../models/ChannelMetrics');
const { ensureDb } = require('../lib/ensureDb');
const { calculateChannelScore, calculatePrice, calculateDayPrice } = require('../lib/scoringEngine');
const { fetchPlatformData } = require('../lib/platformConnectors');

const httpError = (status, message) => {
  const err = new Error(message);
  err.status = status;
  return err;
};

/**
 * GET /scoring/:channelId
 * Get the current score + recommended price for a channel (public)
 */
const getChannelScore = async (req, res, next) => {
  try {
    const ok = await ensureDb();
    if (!ok) return res.status(503).json({ success: false, message: 'Servicio no disponible' });

    const canal = await Canal.findById(req.params.channelId).lean();
    if (!canal) return next(httpError(404, 'Canal no encontrado'));

    let metrics = await ChannelMetrics.findOne({ channel: canal._id }).lean();

    // If no metrics exist yet, create from channel stats
    if (!metrics) {
      metrics = {
        viewsAvg: 0,
        engagementRate: 0,
        scrollDepth: 0.5,
        ctr: 0,
        conversionRate: 0,
        repeatRate: 0,
        audienceQuality: 0.5,
        fillRate: 0,
        totalCampaigns: 0,
        scores: { attention: 0, intent: 0, trust: 0, performance: 0, liquidity: 0, total: 0 },
        recommendedPrice: canal.precio || 0,
      };
    }

    return res.json({
      success: true,
      data: {
        channelId: canal._id,
        channelName: canal.nombreCanal,
        platform: canal.plataforma,
        category: canal.categoria,
        basePrice: canal.precio,
        scores: metrics.scores,
        recommendedPrice: metrics.recommendedPrice,
        metrics: {
          viewsAvg: metrics.viewsAvg,
          engagementRate: metrics.engagementRate,
          scrollDepth: metrics.scrollDepth,
          ctr: metrics.ctr,
          conversionRate: metrics.conversionRate,
          repeatRate: metrics.repeatRate,
          audienceQuality: metrics.audienceQuality,
          fillRate: metrics.fillRate,
          totalCampaigns: metrics.totalCampaigns,
          completedCampaigns: metrics.completedCampaigns,
        },
        platformData: metrics.platformData || {},
        lastCalculated: metrics.lastCalculated,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /scoring/:channelId/calculate
 * Recalculate score + price for a channel (requires auth, owner only)
 */
const recalculateScore = async (req, res, next) => {
  try {
    const ok = await ensureDb();
    if (!ok) return res.status(503).json({ success: false, message: 'Servicio no disponible' });

    const userId = req.usuario?.id;
    if (!userId) return next(httpError(401, 'No autorizado'));

    const canal = await Canal.findById(req.params.channelId);
    if (!canal) return next(httpError(404, 'Canal no encontrado'));
    if (canal.propietario?.toString() !== String(userId)) return next(httpError(403, 'No autorizado'));

    // Get or create metrics
    let metrics = await ChannelMetrics.findOne({ channel: canal._id });
    if (!metrics) {
      metrics = new ChannelMetrics({ channel: canal._id });
    }

    // Fetch fresh data from platform
    const platformData = await fetchPlatformData(canal);

    // Update platform data snapshot
    metrics.platformData = {
      followers: platformData.followers,
      postsTotal: platformData.postsTotal,
      avgViewsPerPost: platformData.avgViewsPerPost,
      avgSharesPerPost: platformData.avgSharesPerPost,
      avgReactionsPerPost: platformData.avgReactionsPerPost,
      growthRate30d: platformData.growthRate30d,
      lastFetched: new Date(),
      raw: platformData.raw,
    };

    // Update attention metrics from platform data
    metrics.viewsAvg = platformData.viewsAvg || metrics.viewsAvg;
    metrics.engagementRate = platformData.engagementRate || metrics.engagementRate;
    metrics.scrollDepth = platformData.scrollDepth || metrics.scrollDepth;

    // Update follower count on the canal
    if (platformData.followers > 0) {
      canal.estadisticas.seguidores = platformData.followers;
      canal.estadisticas.ultimaActualizacion = new Date();
    }

    // Calculate scores
    const scores = calculateChannelScore(metrics, canal.categoria);
    metrics.scores = scores;

    // Calculate recommended price
    const price = calculatePrice(metrics, scores, canal.plataforma);
    metrics.recommendedPrice = price;

    // Save price history
    if (!metrics.priceHistory) metrics.priceHistory = [];
    metrics.priceHistory.push({ price, score: scores.total, date: new Date() });
    // Keep last 90 entries
    if (metrics.priceHistory.length > 90) {
      metrics.priceHistory = metrics.priceHistory.slice(-90);
    }

    metrics.lastCalculated = new Date();

    // Auto-update day pricing on the canal based on insights
    if (canal.insightsDias && canal.insightsDias.length > 0 && canal.disponibilidad?.preciosPorDia) {
      canal.disponibilidad.preciosPorDia = canal.disponibilidad.preciosPorDia.map((dp) => {
        const insight = canal.insightsDias.find((i) => i.day === dp.day);
        if (insight && insight.score > 0) {
          return { ...dp.toObject?.() || dp, price: calculateDayPrice(insight.score, price) };
        }
        return dp;
      });
    }

    await Promise.all([metrics.save(), canal.save()]);

    return res.json({
      success: true,
      data: {
        scores,
        recommendedPrice: price,
        platformData: metrics.platformData,
        lastCalculated: metrics.lastCalculated,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /scoring/:channelId/connect
 * Connect platform credentials and fetch initial data
 */
const connectPlatform = async (req, res, next) => {
  try {
    const ok = await ensureDb();
    if (!ok) return res.status(503).json({ success: false, message: 'Servicio no disponible' });

    const userId = req.usuario?.id;
    if (!userId) return next(httpError(401, 'No autorizado'));

    const canal = await Canal.findById(req.params.channelId);
    if (!canal) return next(httpError(404, 'Canal no encontrado'));
    if (canal.propietario?.toString() !== String(userId)) return next(httpError(403, 'No autorizado'));

    const { botToken, accessToken, chatId, serverId, phoneNumber, phoneNumberId, webhookUrl } = req.body || {};

    // Save credentials
    if (botToken !== undefined) canal.credenciales.botToken = String(botToken).trim();
    if (accessToken !== undefined) canal.credenciales.accessToken = String(accessToken).trim();
    if (phoneNumberId !== undefined) canal.credenciales.phoneNumberId = String(phoneNumberId).trim();
    if (webhookUrl !== undefined) canal.credenciales.webhookUrl = String(webhookUrl).trim();

    // Save identifiers
    if (chatId !== undefined) canal.identificadores.chatId = String(chatId).trim();
    if (serverId !== undefined) canal.identificadores.serverId = String(serverId).trim();
    if (phoneNumber !== undefined) canal.identificadores.phoneNumber = String(phoneNumber).trim();

    await canal.save();

    // Immediately try to fetch platform data
    const platformData = await fetchPlatformData(canal);

    // Create/update metrics
    let metrics = await ChannelMetrics.findOne({ channel: canal._id });
    if (!metrics) metrics = new ChannelMetrics({ channel: canal._id });

    metrics.viewsAvg = platformData.viewsAvg;
    metrics.engagementRate = platformData.engagementRate;
    metrics.scrollDepth = platformData.scrollDepth;
    metrics.platformData = {
      followers: platformData.followers,
      postsTotal: platformData.postsTotal,
      avgViewsPerPost: platformData.avgViewsPerPost,
      avgSharesPerPost: platformData.avgSharesPerPost,
      avgReactionsPerPost: platformData.avgReactionsPerPost,
      growthRate30d: platformData.growthRate30d,
      lastFetched: new Date(),
      raw: platformData.raw,
    };

    // Update follower count
    if (platformData.followers > 0) {
      canal.estadisticas.seguidores = platformData.followers;
      canal.estadisticas.ultimaActualizacion = new Date();
      await canal.save();
    }

    // Calculate score
    const scores = calculateChannelScore(metrics, canal.categoria);
    metrics.scores = scores;
    metrics.recommendedPrice = calculatePrice(metrics, scores, canal.plataforma);
    metrics.lastCalculated = new Date();
    await metrics.save();

    const isConnected = !platformData.raw?.estimated;

    return res.json({
      success: true,
      data: {
        connected: isConnected,
        platform: canal.plataforma,
        followers: platformData.followers,
        scores,
        recommendedPrice: metrics.recommendedPrice,
        platformData: platformData,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /scoring/:channelId/history
 * Get score + price history for the channel
 */
const getScoreHistory = async (req, res, next) => {
  try {
    const ok = await ensureDb();
    if (!ok) return res.status(503).json({ success: false, message: 'Servicio no disponible' });

    const metrics = await ChannelMetrics.findOne({ channel: req.params.channelId }).lean();
    if (!metrics) return res.json({ success: true, data: { history: [] } });

    return res.json({
      success: true,
      data: {
        history: metrics.priceHistory || [],
        currentScore: metrics.scores?.total || 0,
        currentPrice: metrics.recommendedPrice || 0,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /scoring/:channelId/metrics
 * Manually update performance metrics (CTR, conversions, etc.)
 * Called after a campaign completes
 */
const updateMetrics = async (req, res, next) => {
  try {
    const ok = await ensureDb();
    if (!ok) return res.status(503).json({ success: false, message: 'Servicio no disponible' });

    const userId = req.usuario?.id;
    if (!userId) return next(httpError(401, 'No autorizado'));

    const canal = await Canal.findById(req.params.channelId).lean();
    if (!canal) return next(httpError(404, 'Canal no encontrado'));

    // Allow owner or admin
    if (canal.propietario?.toString() !== String(userId)) {
      return next(httpError(403, 'No autorizado'));
    }

    let metrics = await ChannelMetrics.findOne({ channel: canal._id });
    if (!metrics) metrics = new ChannelMetrics({ channel: canal._id });

    const b = req.body || {};

    // Update any provided metrics
    const numFields = [
      'viewsAvg', 'engagementRate', 'scrollDepth', 'ctr', 'conversionRate',
      'repeatRate', 'audienceQuality', 'fillRate', 'totalCampaigns',
      'completedCampaigns', 'disputes', 'refunds', 'avgResponseTime', 'publishOnTime',
    ];

    numFields.forEach((f) => {
      if (b[f] !== undefined) metrics[f] = Number(b[f]) || 0;
    });

    // Recalculate scores
    const scores = calculateChannelScore(metrics, canal.categoria);
    metrics.scores = scores;
    metrics.recommendedPrice = calculatePrice(metrics, scores, canal.plataforma);
    metrics.lastCalculated = new Date();

    await metrics.save();

    return res.json({
      success: true,
      data: {
        scores,
        recommendedPrice: metrics.recommendedPrice,
      },
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getChannelScore,
  recalculateScore,
  connectPlatform,
  getScoreHistory,
  updateMetrics,
};
