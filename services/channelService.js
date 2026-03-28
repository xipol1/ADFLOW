const Canal = require('../models/Canal');
const { scoreChannel } = require('./channelScoring');
const { calculatePerformanceScore } = require('./channelPerformanceService');

/**
 * Service to handle channel creation with scoring
 * @param {Object} data - Channel data including name, platform, topic, subscribers, pricePerPost, postsPerWeek, and owner ID
 * @returns {Object} Created channel and scoring result
 */
const createChannel = async (data) => {
  const {
    name,
    platform,
    topic,
    subscribers,
    pricePerPost,
    postsPerWeek,
    avgViews,
    isVerified,
    ownerId,
    description,
    url,
    category
  } = data;

  // 1. Validate required fields
  if (!name || !platform || !topic || subscribers === undefined || pricePerPost === undefined || postsPerWeek === undefined) {
    throw new Error('Faltan campos obligatorios: name, platform, topic, subscribers, pricePerPost, postsPerWeek');
  }

  // 2. Call scoring function
  const scoringResult = scoreChannel({
    subscribers,
    postsPerWeek,
    topic,
    avgViews,
    isVerified,
    pricePerPost
  });

  // 3. Create channel object in DB
  // Mapping new field names to existing Mongoose schema fields if necessary
  const nuevoCanal = new Canal({
    propietario: ownerId,
    nombre: name,
    plataforma: platform,
    descripcion: description || '',
    url: url || '',
    categoria: category || 'otros',
    'estadisticas.seguidores': subscribers,
    'estadisticas.promedioVisualizaciones': avgViews || 0,
    'tarifas.post.precio': pricePerPost,
    initialScore: scoringResult.score,
    score: scoringResult.score,
    level: scoringResult.level,
    status: scoringResult.status,
    isVerified: isVerified || false,
    'verificacion.verificado': isVerified || false,
    flags: scoringResult.flags,
    estado: scoringResult.status === 'ACTIVE' ? 'verificado' : 'pendiente'
  });

  await nuevoCanal.save();

  return {
    channel: nuevoCanal,
    ...scoringResult
  };
};

/**
 * Recalculates and updates the final score of a channel using performance data
 * @param {string} channelId - ID of the channel
 * @returns {Promise<Object>} Updated channel
 */
const updateChannelScore = async (channelId) => {
  const channel = await Canal.findById(channelId);
  if (!channel) throw new Error('Canal no encontrado');

  const { performanceScore } = await calculatePerformanceScore(channelId);
  
  const finalScore = (0.4 * channel.initialScore) + (0.6 * performanceScore);
  
  let level = 'BRONZE';
  if (finalScore >= 80) level = 'ELITE';
  else if (finalScore >= 65) level = 'GOLD';
  else if (finalScore >= 50) level = 'SILVER';

  let status = 'PENDING_REVIEW';
  if (finalScore >= 65) status = 'ACTIVE';
  else if (finalScore >= 50) status = 'ACTIVE';

  channel.score = finalScore;
  channel.performanceScore = performanceScore;
  channel.level = level;
  channel.status = status;
  
  if (status === 'ACTIVE') {
    channel.estado = 'verificado';
    channel['verificacion.verificado'] = true;
  }

  return await channel.save();
};

module.exports = {
  createChannel,
  updateChannelScore
};
