/**
 * Calculates suggested price for a channel based on performance and reach
 * @param {Object} channel - Channel object with stats and scoring
 * @returns {Object} Suggested price range
 */
const calculateSuggestedPrice = (channel) => {
  const subscribers = channel.estadisticas?.seguidores || 0;
  const performanceScore = channel.performanceScore || 0;
  const avgViews = channel.estadisticas?.promedioVisualizaciones || 0;
  
  // CTR derived (as proxy)
  const ctr = subscribers > 0 ? (avgViews / subscribers) : 0;

  // 1. Base Price: subscribers / 1000 * 2 (e.g., $2 per 1k subscribers)
  const basePrice = (subscribers / 1000) * 2;

  // 2. Performance Multiplier:
  // 80 → x1.5, 65–80 → x1.2, 50–65 → x1.0, <50 → x0.8
  let performanceMultiplier = 0.8;
  if (performanceScore >= 80) performanceMultiplier = 1.5;
  else if (performanceScore >= 65) performanceMultiplier = 1.2;
  else if (performanceScore >= 50) performanceMultiplier = 1.0;

  // 3. CTR Multiplier:
  // high (>0.03) → x1.3, medium (0.01-0.03) → x1.1, low (<0.01) → x0.9
  let ctrMultiplier = 0.9;
  if (ctr > 0.03) ctrMultiplier = 1.3;
  else if (ctr >= 0.01) ctrMultiplier = 1.1;

  const suggestedPrice = basePrice * performanceMultiplier * ctrMultiplier;

  // Range calculation
  const minPrice = suggestedPrice * 0.8;
  const maxPrice = suggestedPrice * 1.5;

  return {
    suggestedPrice: Math.round(suggestedPrice * 100) / 100,
    minPrice: Math.round(minPrice * 100) / 100,
    maxPrice: Math.round(maxPrice * 100) / 100
  };
};

module.exports = {
  calculateSuggestedPrice
};
