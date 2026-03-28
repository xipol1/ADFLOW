const Canal = require('../models/Canal');
const Anuncio = require('../models/Anuncio');

/**
 * Ranks channels for the marketplace based on multiple factors
 * @param {Object} filters - Optional filters (category, platform)
 * @returns {Promise<Array>} Sorted list of active channels
 */
const rankChannels = async (filters = {}) => {
  const query = { status: 'ACTIVE' };
  
  if (filters.category) query.categoria = filters.category;
  if (filters.platform) query.plataforma = filters.platform;

  const channels = await Canal.find(query);

  // Get campaign count for cold start boost
  const channelData = await Promise.all(channels.map(async (channel) => {
    const campaignCount = await Anuncio.countDocuments({ 
      canal: channel._id, 
      estado: 'completado' 
    });
    
    let rankingScore = channel.score || 0;
    
    // Boost: +10 temporary if channel has < 3 campaigns (cold start boost)
    if (campaignCount < 3) {
      rankingScore += 10;
    }

    return {
      ...channel.toObject(),
      rankingScore,
      campaignCount
    };
  }));

  // Sort logic:
  // PRIMARY: rankingScore DESC (which includes the boost)
  // SECONDARY: performanceScore DESC
  // TERTIARY: subscribers DESC
  return channelData.sort((a, b) => {
    if (b.rankingScore !== a.rankingScore) {
      return b.rankingScore - a.rankingScore;
    }
    if (b.performanceScore !== a.performanceScore) {
      return b.performanceScore - a.performanceScore;
    }
    return (b.estadisticas?.seguidores || 0) - (a.estadisticas?.seguidores || 0);
  });
};

module.exports = {
  rankChannels
};
