const Anuncio = require('../models/Anuncio');
const Canal = require('../models/Canal');

/**
 * Calculates the performance score of a channel based on campaign data
 * @param {string} channelId - ID of the channel
 * @returns {Promise<Object>} Performance score and breakdown
 */
const calculatePerformanceScore = async (channelId) => {
  const channel = await Canal.findById(channelId);
  if (!channel) throw new Error('Canal no encontrado');

  const campaigns = await Anuncio.find({ 
    canal: channelId, 
    estado: { $in: ['completado', 'cancelado'] } 
  });

  if (campaigns.length === 0) {
    return {
      performanceScore: 0,
      breakdown: {
        ctr: 0,
        volume: 0,
        consistency: 0,
        reliability: 0
      }
    };
  }

  const completedCampaigns = campaigns.filter(c => c.estado === 'completado');
  const cancelledCampaigns = campaigns.filter(c => c.estado === 'cancelado');

  // 1. CTR (40%)
  // CTR = totalClicks / subscribers (as proxy if impressions unknown)
  const totalClicks = completedCampaigns.reduce((sum, c) => sum + (c.tracking?.clicsTotales || 0), 0);
  const avgCtr = channel.estadisticas.seguidores > 0 
    ? (totalClicks / completedCampaigns.length) / channel.estadisticas.seguidores 
    : 0;

  let ctrPoints = 5;
  if (avgCtr >= 0.03) ctrPoints = 40;
  else if (avgCtr >= 0.01) ctrPoints = 25;
  else if (avgCtr >= 0.005) ctrPoints = 15;

  // 2. Click Volume (20%)
  const avgClicks = completedCampaigns.length > 0 ? totalClicks / completedCampaigns.length : 0;
  let volumePoints = 5;
  if (avgClicks > 1000) volumePoints = 20;
  else if (avgClicks > 100) volumePoints = 10;

  // 3. Consistency (20%) - Variance of clicks
  let consistencyPoints = 20;
  if (completedCampaigns.length > 1) {
    const clicksList = completedCampaigns.map(c => c.tracking?.clicsTotales || 0);
    const mean = totalClicks / completedCampaigns.length;
    const variance = clicksList.reduce((sum, c) => sum + Math.pow(c - mean, 2), 0) / clicksList.length;
    const stdDev = Math.sqrt(variance);
    const cv = mean > 0 ? stdDev / mean : 0; // Coefficient of variation

    if (cv > 0.5) consistencyPoints = 5;
    else if (cv > 0.2) consistencyPoints = 10;
  }

  // 4. Reliability (20%) - Delays and Cancellations
  let reliabilityPoints = 20;
  const cancellationRate = campaigns.length > 0 ? cancelledCampaigns.length / campaigns.length : 0;
  
  // Delays: publicacion.fechaPublicacion > programacion.fechaPublicacion
  const delayedCampaigns = completedCampaigns.filter(c => {
    if (c.publicacion?.fechaPublicacion && c.programacion?.fechaPublicacion) {
      return new Date(c.publicacion.fechaPublicacion) > new Date(c.programacion.fechaPublicacion);
    }
    return false;
  });
  const delayRate = completedCampaigns.length > 0 ? delayedCampaigns.length / completedCampaigns.length : 0;

  if (cancellationRate > 0.2 || delayRate > 0.3) reliabilityPoints = 5;
  else if (cancellationRate > 0.05 || delayRate > 0.1) reliabilityPoints = 10;

  const performanceScore = ctrPoints + volumePoints + consistencyPoints + reliabilityPoints;

  return {
    performanceScore,
    breakdown: {
      ctr: ctrPoints,
      volume: volumePoints,
      consistency: consistencyPoints,
      reliability: reliabilityPoints
    }
  };
};

module.exports = {
  calculatePerformanceScore
};
