/**
 * Platform Connectors — Fetch real-time data from channel platforms
 *
 * Each connector returns a normalized object:
 * {
 *   followers, viewsAvg, engagementRate, scrollDepth,
 *   postsTotal, avgReactionsPerPost, avgSharesPerPost,
 *   avgViewsPerPost, growthRate30d, raw
 * }
 */

const https = require('https');
const http = require('http');

function fetchJSON(url, options = {}) {
  return new Promise((resolve, reject) => {
    const mod = url.startsWith('https') ? https : http;
    const req = mod.get(url, { headers: options.headers || {} }, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        try { resolve(JSON.parse(data)); }
        catch { resolve(null); }
      });
    });
    req.on('error', reject);
    req.setTimeout(10000, () => { req.destroy(); reject(new Error('Timeout')); });
  });
}

// ═══════════════════════════════════════════════════════════════════════════════
// TELEGRAM CONNECTOR
// Uses Bot API: getChat, getChatMemberCount
// For full stats: Telegram Stats API (requires channel admin)
// ═══════════════════════════════════════════════════════════════════════════════
async function fetchTelegram(channel) {
  const botToken = channel.credenciales?.botToken;
  const chatId = channel.identificadores?.chatId || channel.identificadorCanal;

  if (!botToken || !chatId) {
    return estimateFromFollowers(channel, 'telegram');
  }

  const base = `https://api.telegram.org/bot${botToken}`;

  try {
    const [chatInfo, memberCount] = await Promise.all([
      fetchJSON(`${base}/getChat?chat_id=${encodeURIComponent(chatId)}`),
      fetchJSON(`${base}/getChatMemberCount?chat_id=${encodeURIComponent(chatId)}`),
    ]);

    const followers = memberCount?.result || channel.estadisticas?.seguidores || 0;

    // Estimate engagement from follower count tier
    const engagementRate = estimateEngagement(followers, 'telegram');

    // Telegram channels typically have ~30-60% view rate
    const viewsAvg = Math.round(followers * (0.3 + Math.random() * 0.2));

    return {
      followers,
      viewsAvg,
      engagementRate,
      scrollDepth: 0.7, // Telegram messages are short, high scroll completion
      postsTotal: 0,
      avgReactionsPerPost: Math.round(viewsAvg * engagementRate),
      avgSharesPerPost: Math.round(viewsAvg * 0.02),
      avgViewsPerPost: viewsAvg,
      growthRate30d: 0,
      raw: {
        chatInfo: chatInfo?.result || {},
        memberCount: followers,
      },
    };
  } catch (err) {
    console.error('Telegram connector error:', err.message);
    return estimateFromFollowers(channel, 'telegram');
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// DISCORD CONNECTOR
// Uses Discord Bot API: /guilds/{id}
// ═══════════════════════════════════════════════════════════════════════════════
async function fetchDiscord(channel) {
  const botToken = channel.credenciales?.botToken || channel.credenciales?.accessToken;
  const serverId = channel.identificadores?.serverId || channel.identificadorCanal;

  if (!botToken || !serverId) {
    return estimateFromFollowers(channel, 'discord');
  }

  try {
    const guild = await fetchJSON(`https://discord.com/api/v10/guilds/${serverId}?with_counts=true`, {
      headers: { Authorization: `Bot ${botToken}` },
    });

    if (!guild || guild.code) {
      return estimateFromFollowers(channel, 'discord');
    }

    const followers = guild.approximate_member_count || channel.estadisticas?.seguidores || 0;
    const onlineCount = guild.approximate_presence_count || 0;
    const onlineRatio = followers > 0 ? onlineCount / followers : 0.1;

    // Discord engagement is based on active online members
    const engagementRate = Math.min(0.3, onlineRatio * 0.5);
    const viewsAvg = Math.round(followers * onlineRatio * 0.6);

    return {
      followers,
      viewsAvg,
      engagementRate,
      scrollDepth: 0.5, // Discord is scroll-heavy, lower depth
      postsTotal: 0,
      avgReactionsPerPost: Math.round(viewsAvg * engagementRate * 0.3),
      avgSharesPerPost: 0,
      avgViewsPerPost: viewsAvg,
      growthRate30d: 0,
      raw: {
        guildName: guild.name,
        memberCount: followers,
        onlineCount,
        premiumTier: guild.premium_tier,
      },
    };
  } catch (err) {
    console.error('Discord connector error:', err.message);
    return estimateFromFollowers(channel, 'discord');
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// INSTAGRAM CONNECTOR
// Uses Instagram Graph API (requires access token + user ID)
// GET /{user-id}?fields=followers_count,media_count,media{like_count,comments_count,impressions}
// ═══════════════════════════════════════════════════════════════════════════════
async function fetchInstagram(channel) {
  const accessToken = channel.credenciales?.accessToken;
  const userId = channel.identificadorCanal;

  if (!accessToken || !userId) {
    return estimateFromFollowers(channel, 'instagram');
  }

  try {
    // Fetch user profile + recent media
    const profile = await fetchJSON(
      `https://graph.instagram.com/${userId}?fields=followers_count,media_count&access_token=${accessToken}`
    );

    const media = await fetchJSON(
      `https://graph.instagram.com/${userId}/media?fields=like_count,comments_count,timestamp&limit=25&access_token=${accessToken}`
    );

    const followers = profile?.followers_count || channel.estadisticas?.seguidores || 0;
    const posts = media?.data || [];

    let totalLikes = 0;
    let totalComments = 0;
    posts.forEach((p) => {
      totalLikes += p.like_count || 0;
      totalComments += p.comments_count || 0;
    });

    const avgLikes = posts.length > 0 ? totalLikes / posts.length : 0;
    const avgComments = posts.length > 0 ? totalComments / posts.length : 0;
    const engagementRate = followers > 0 ? (avgLikes + avgComments) / followers : 0;

    // Instagram stories/reels views are typically 5-15% of followers
    const viewsAvg = Math.round(followers * 0.1);

    return {
      followers,
      viewsAvg,
      engagementRate: Math.min(0.5, engagementRate),
      scrollDepth: 0.6,
      postsTotal: profile?.media_count || 0,
      avgReactionsPerPost: Math.round(avgLikes + avgComments),
      avgSharesPerPost: Math.round(avgLikes * 0.05),
      avgViewsPerPost: viewsAvg,
      growthRate30d: 0,
      raw: { profile, recentPostCount: posts.length },
    };
  } catch (err) {
    console.error('Instagram connector error:', err.message);
    return estimateFromFollowers(channel, 'instagram');
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// WHATSAPP CONNECTOR
// WhatsApp Business API is limited — mostly estimate from subscriber count
// ═══════════════════════════════════════════════════════════════════════════════
async function fetchWhatsApp(channel) {
  // WhatsApp doesn't expose stats via API — use estimates
  return estimateFromFollowers(channel, 'whatsapp');
}

// ═══════════════════════════════════════════════════════════════════════════════
// NEWSLETTER CONNECTOR
// Custom — would integrate with Mailchimp, Substack, ConvertKit, etc.
// For now, estimate-based
// ═══════════════════════════════════════════════════════════════════════════════
async function fetchNewsletter(channel) {
  return estimateFromFollowers(channel, 'newsletter');
}

// ═══════════════════════════════════════════════════════════════════════════════
// FALLBACK ESTIMATOR
// When no API access, estimate metrics from follower count + platform norms
// ═══════════════════════════════════════════════════════════════════════════════
function estimateEngagement(followers, platform) {
  // Smaller channels have higher engagement rates
  const tier = followers < 1000 ? 'micro' : followers < 10000 ? 'small' : followers < 50000 ? 'medium' : 'large';

  const rates = {
    telegram: { micro: 0.15, small: 0.1, medium: 0.06, large: 0.03 },
    discord: { micro: 0.12, small: 0.08, medium: 0.05, large: 0.02 },
    instagram: { micro: 0.08, small: 0.05, medium: 0.03, large: 0.015 },
    whatsapp: { micro: 0.25, small: 0.2, medium: 0.15, large: 0.1 },
    newsletter: { micro: 0.3, small: 0.25, medium: 0.18, large: 0.12 },
    facebook: { micro: 0.06, small: 0.04, medium: 0.025, large: 0.01 },
  };

  return (rates[platform] || rates.telegram)[tier] || 0.05;
}

function estimateFromFollowers(channel, platform) {
  const followers = channel.estadisticas?.seguidores || 0;
  const engagementRate = estimateEngagement(followers, platform);

  // View rate varies by platform
  const viewRates = {
    telegram: 0.35,
    discord: 0.15,
    instagram: 0.1,
    whatsapp: 0.8,
    newsletter: 0.45,
    facebook: 0.08,
  };

  const scrollDepths = {
    telegram: 0.7,
    discord: 0.5,
    instagram: 0.6,
    whatsapp: 0.85,
    newsletter: 0.55,
    facebook: 0.4,
  };

  const viewRate = viewRates[platform] || 0.2;
  const viewsAvg = Math.round(followers * viewRate);

  return {
    followers,
    viewsAvg,
    engagementRate,
    scrollDepth: scrollDepths[platform] || 0.5,
    postsTotal: 0,
    avgReactionsPerPost: Math.round(viewsAvg * engagementRate),
    avgSharesPerPost: Math.round(viewsAvg * 0.01),
    avgViewsPerPost: viewsAvg,
    growthRate30d: 0,
    raw: { estimated: true, source: 'follower_count' },
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN DISPATCHER
// ═══════════════════════════════════════════════════════════════════════════════
/**
 * Fetch platform data for a channel
 * @param {Object} channel - Canal document
 * @returns {Object} Normalized metrics
 */
async function fetchPlatformData(channel) {
  const platform = String(channel.plataforma || '').toLowerCase().trim();

  switch (platform) {
    case 'telegram':
      return fetchTelegram(channel);
    case 'discord':
      return fetchDiscord(channel);
    case 'instagram':
      return fetchInstagram(channel);
    case 'whatsapp':
      return fetchWhatsApp(channel);
    case 'newsletter':
      return fetchNewsletter(channel);
    default:
      return estimateFromFollowers(channel, platform);
  }
}

module.exports = {
  fetchPlatformData,
  fetchTelegram,
  fetchDiscord,
  fetchInstagram,
  fetchWhatsApp,
  fetchNewsletter,
  estimateFromFollowers,
  estimateEngagement,
};
