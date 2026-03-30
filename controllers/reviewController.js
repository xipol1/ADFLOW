const Review = require('../models/Review');
const Campaign = require('../models/Campaign');
const Canal = require('../models/Canal');
const { ensureDb } = require('../lib/ensureDb');

const httpError = (status, message) => {
  const err = new Error(message);
  err.status = status;
  return err;
};

// POST /api/reviews
const createReview = async (req, res, next) => {
  try {
    const ok = await ensureDb();
    if (!ok) return res.status(503).json({ success: false, message: 'Servicio no disponible' });

    const userId = req.usuario?.id;
    if (!userId) return next(httpError(401, 'No autorizado'));

    const { campaign: campaignId, channel: channelId, ratings, title, comment } = req.body || {};
    if (!campaignId || !channelId || !ratings?.overall) {
      return next(httpError(400, 'campaign, channel y ratings.overall son requeridos'));
    }

    // Validate campaign exists and is completed
    const campaign = await Campaign.findById(campaignId).lean();
    if (!campaign) return next(httpError(404, 'Campaña no encontrada'));
    if (campaign.status !== 'COMPLETED') {
      return next(httpError(400, 'Solo se puede reseñar una campaña completada'));
    }

    // Verify the channel matches the campaign
    if (campaign.channel?.toString() !== String(channelId)) {
      return next(httpError(400, 'El canal no corresponde a esta campaña'));
    }

    // Only the advertiser of the campaign can leave a review
    const isAdvertiser = campaign.advertiser?.toString() === String(userId);
    if (!isAdvertiser) {
      return next(httpError(403, 'Solo el anunciante de la campaña puede dejar una reseña'));
    }

    // Check for existing review
    const existing = await Review.findOne({ campaign: campaignId, reviewer: userId });
    if (existing) {
      return next(httpError(400, 'Ya has dejado una reseña para esta campaña'));
    }

    const review = await Review.create({
      campaign: campaignId,
      channel: channelId,
      reviewer: userId,
      reviewerRole: 'advertiser',
      ratings: {
        overall: ratings.overall,
        communication: ratings.communication || null,
        quality: ratings.quality || null,
        timeliness: ratings.timeliness || null,
        value: ratings.value || null,
      },
      title: title || undefined,
      comment: comment || undefined,
    });

    return res.status(201).json({ success: true, data: review });
  } catch (error) {
    next(error);
  }
};

// GET /api/reviews/channel/:channelId
const getChannelReviews = async (req, res, next) => {
  try {
    const ok = await ensureDb();
    if (!ok) return res.status(503).json({ success: false, message: 'Servicio no disponible' });

    const { channelId } = req.params;
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit) || 10));
    const skip = (page - 1) * limit;

    const filter = { channel: channelId, status: 'active' };

    const [reviews, total, aggregateRatings] = await Promise.all([
      Review.find(filter)
        .populate('reviewer', 'nombre email')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Review.countDocuments(filter),
      Review.getChannelRatings(channelId),
    ]);

    return res.json({
      success: true,
      data: {
        reviews,
        ratings: aggregateRatings,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit),
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

// GET /api/reviews/:id
const getReviewById = async (req, res, next) => {
  try {
    const ok = await ensureDb();
    if (!ok) return res.status(503).json({ success: false, message: 'Servicio no disponible' });

    const review = await Review.findById(req.params.id)
      .populate('reviewer', 'nombre email')
      .populate('channel', 'nombre plataforma')
      .populate('campaign', 'content status')
      .lean();

    if (!review) return next(httpError(404, 'Reseña no encontrada'));

    return res.json({ success: true, data: review });
  } catch (error) {
    next(error);
  }
};

// PUT /api/reviews/:id/respond
const respondToReview = async (req, res, next) => {
  try {
    const ok = await ensureDb();
    if (!ok) return res.status(503).json({ success: false, message: 'Servicio no disponible' });

    const userId = req.usuario?.id;
    if (!userId) return next(httpError(401, 'No autorizado'));

    const { text } = req.body || {};
    if (!text?.trim()) return next(httpError(400, 'El texto de respuesta es requerido'));

    const review = await Review.findById(req.params.id);
    if (!review) return next(httpError(404, 'Reseña no encontrada'));

    // Only the channel owner can respond
    const channel = await Canal.findById(review.channel).select('propietario').lean();
    if (!channel || channel.propietario?.toString() !== String(userId)) {
      return next(httpError(403, 'Solo el propietario del canal puede responder'));
    }

    // Only one response allowed
    if (review.response?.text) {
      return next(httpError(400, 'Ya se ha respondido a esta reseña'));
    }

    review.response = {
      text: text.trim(),
      respondedAt: new Date(),
    };
    await review.save();

    return res.json({ success: true, data: review });
  } catch (error) {
    next(error);
  }
};

// PUT /api/reviews/:id/helpful
const markHelpful = async (req, res, next) => {
  try {
    const ok = await ensureDb();
    if (!ok) return res.status(503).json({ success: false, message: 'Servicio no disponible' });

    const userId = req.usuario?.id;
    if (!userId) return next(httpError(401, 'No autorizado'));

    const review = await Review.findByIdAndUpdate(
      req.params.id,
      { $inc: { helpful: 1 } },
      { new: true }
    );
    if (!review) return next(httpError(404, 'Reseña no encontrada'));

    return res.json({ success: true, data: { helpful: review.helpful } });
  } catch (error) {
    next(error);
  }
};

// PUT /api/reviews/:id/report
const reportReview = async (req, res, next) => {
  try {
    const ok = await ensureDb();
    if (!ok) return res.status(503).json({ success: false, message: 'Servicio no disponible' });

    const userId = req.usuario?.id;
    if (!userId) return next(httpError(401, 'No autorizado'));

    const review = await Review.findById(req.params.id);
    if (!review) return next(httpError(404, 'Reseña no encontrada'));

    review.reported += 1;
    if (review.reported >= 3 && review.status === 'active') {
      review.status = 'flagged';
    }
    await review.save();

    return res.json({ success: true, data: { reported: review.reported, status: review.status } });
  } catch (error) {
    next(error);
  }
};

// DELETE /api/reviews/:id
const deleteReview = async (req, res, next) => {
  try {
    const ok = await ensureDb();
    if (!ok) return res.status(503).json({ success: false, message: 'Servicio no disponible' });

    const userId = req.usuario?.id;
    if (!userId) return next(httpError(401, 'No autorizado'));

    const review = await Review.findById(req.params.id);
    if (!review) return next(httpError(404, 'Reseña no encontrada'));

    const isAdmin = req.usuario?.rol === 'admin';
    const isAuthor = review.reviewer?.toString() === String(userId);
    if (!isAdmin && !isAuthor) {
      return next(httpError(403, 'Solo el autor o un administrador puede eliminar esta reseña'));
    }

    await Review.findByIdAndDelete(req.params.id);

    return res.json({ success: true, message: 'Reseña eliminada' });
  } catch (error) {
    next(error);
  }
};

// GET /api/reviews/my
const getMyReviews = async (req, res, next) => {
  try {
    const ok = await ensureDb();
    if (!ok) return res.status(503).json({ success: false, message: 'Servicio no disponible' });

    const userId = req.usuario?.id;
    if (!userId) return next(httpError(401, 'No autorizado'));

    const reviews = await Review.find({ reviewer: userId })
      .populate('channel', 'nombre plataforma')
      .populate('campaign', 'content status')
      .sort({ createdAt: -1 })
      .lean();

    return res.json({ success: true, data: { items: reviews } });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createReview,
  getChannelReviews,
  getReviewById,
  respondToReview,
  markHelpful,
  reportReview,
  deleteReview,
  getMyReviews,
};
