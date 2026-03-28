const Canal = require('../models/Canal');
const ChannelList = require('../models/ChannelList');
const { calculateSuggestedPrice } = require('./channelPricingService');

/**
 * Automatically allocates budget across channels to maximize expected clicks.
 * @param {Object} input - { budget, category, platform, maxChannels, listId }
 * @returns {Promise<Object>} Optimization results
 */
const optimizeCampaign = async (input) => {
  const { budget: totalBudget, category, platform, maxChannels = 10, listId } = input;

  if (!totalBudget || totalBudget <= 0) {
    throw new Error('Budget must be greater than 0');
  }

  // 1. Fetch ACTIVE channels filtered by category/platform or listId
  let channels = [];
  
  if (listId) {
    // Semi-auto mode: Restrict to channels in specific list
    const list = await ChannelList.findById(listId).populate({
      path: 'channels',
      match: { status: 'ACTIVE' }
    });
    if (list) {
      channels = list.channels;
    }
  } else {
    // Full auto mode: Use filters
    const query = { status: 'ACTIVE' };
    if (category) query.categoria = category;
    if (platform) query.plataforma = platform;
    channels = await Canal.find(query);
  }

  if (channels.length === 0) {
    return {
      totalBudgetUsed: 0,
      expectedClicks: 0,
      allocation: []
    };
  }

  // 2. Calculate efficiency for each channel
  const channelEfficiencies = channels.map(channel => {
    const { suggestedPrice } = calculateSuggestedPrice(channel);
    
    // expectedCTR = performanceScore proxy (e.g., performanceScore / 1000)
    const expectedCTR = (channel.performanceScore || 50) / 1000;
    const subscribers = channel.estadisticas?.seguidores || 0;
    
    // expectedClicks = subscribers * expectedCTR
    const expectedClicks = subscribers * expectedCTR;
    
    // efficiency = expectedClicks / suggestedPrice
    const efficiency = suggestedPrice > 0 ? expectedClicks / suggestedPrice : 0;

    return {
      channelId: channel._id,
      name: channel.nombre || channel.nombreCanal,
      price: suggestedPrice,
      expectedClicks: Math.round(expectedClicks),
      efficiency
    };
  });

  // 3. Sort by efficiency DESC
  channelEfficiencies.sort((a, b) => b.efficiency - a.efficiency);

  // 4. Allocation (Greedy)
  const allocation = [];
  let remainingBudget = totalBudget;
  let totalExpectedClicks = 0;
  let totalBudgetUsed = 0;

  for (const channel of channelEfficiencies) {
    if (remainingBudget <= 0 || allocation.length >= maxChannels) break;

    // Diversification: Only one campaign per channel in this greedy pass
    if (remainingBudget >= channel.price) {
      allocation.push({
        channelId: channel.channelId,
        name: channel.name,
        price: channel.price,
        expectedClicks: channel.expectedClicks
      });
      
      remainingBudget -= channel.price;
      totalBudgetUsed += channel.price;
      totalExpectedClicks += channel.expectedClicks;
    }
  }

  return {
    totalBudgetUsed: Math.round(totalBudgetUsed * 100) / 100,
    expectedClicks: Math.round(totalExpectedClicks),
    allocation
  };
};

module.exports = {
  optimizeCampaign
};
