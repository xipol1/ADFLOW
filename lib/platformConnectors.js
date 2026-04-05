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

const TelegramAPI = require('../integraciones/telegram');
const DiscordAPI = require('../integraciones/discord');
const WhatsAppAPI = require('../integraciones/whatsapp');
const InstagramAPI = require('../integraciones/instagram');
const FacebookAPI = require('../integraciones/facebook');
const NewsletterAPI = require('../integraciones/newsletter');
const LinkedInAPI = require('../integraciones/linkedin');
const { getDecryptedCreds } = require('./encryption');

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
// ═══════════════════════════════════════════════════════════════════════════════
async function fetchTelegram(channel) {
  const creds = getDecryptedCreds(channel);
  const botToken = creds.botToken;
  const chatId = channel.identificadores?.chatId || channel.identificadorCanal;

  if (!botToken || !chatId) {
    return estimateFromFollowers(channel, 'telegram');
  }

  try {
    const telegram = new TelegramAPI(botToken);
    const [chatInfo, memberCount] = await Promise.all([
      telegram.getChat(chatId),
      telegram.getChatMemberCount(chatId),
    ]);

    const followers = memberCount?.result || channel.estadisticas?.seguidores || 0;
    const engagementRate = estimateEngagement(followers, 'telegram');
    const viewsAvg = Math.round(followers * (0.3 + Math.random() * 0.2));

    return {
      followers,
      viewsAvg,
      engagementRate,
      scrollDepth: 0.7,
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
// ═══════════════════════════════════════════════════════════════════════════════
async function fetchDiscord(channel) {
  const creds = getDecryptedCreds(channel);
  const botToken = creds.botToken || creds.accessToken;
  const serverId = channel.identificadores?.serverId || channel.identificadorCanal;

  if (!botToken || !serverId) {
    return estimateFromFollowers(channel, 'discord');
  }

  try {
    const discord = new DiscordAPI(botToken);
    const guild = await discord.getGuild(serverId);

    if (!guild || guild.code) {
      return estimateFromFollowers(channel, 'discord');
    }

    const followers = guild.approximate_member_count || channel.estadisticas?.seguidores || 0;
    const onlineCount = guild.approximate_presence_count || 0;
    const onlineRatio = followers > 0 ? onlineCount / followers : 0.1;
    const engagementRate = Math.min(0.3, onlineRatio * 0.5);
    const viewsAvg = Math.round(followers * onlineRatio * 0.6);

    return {
      followers,
      viewsAvg,
      engagementRate,
      scrollDepth: 0.5,
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
// ═══════════════════════════════════════════════════════════════════════════════
async function fetchInstagram(channel) {
  const creds = getDecryptedCreds(channel);
  const accessToken = creds.accessToken;
  const userId = channel.identificadorCanal;

  if (!accessToken || !userId) {
    return estimateFromFollowers(channel, 'instagram');
  }

  try {
    const instagram = new InstagramAPI();
    const [profile, mediaRes] = await Promise.all([
      instagram.getProfile(accessToken),
      instagram.getRecentMedia(accessToken, 25),
    ]);

    const followers = profile?.followers_count || channel.estadisticas?.seguidores || 0;
    const posts = mediaRes?.data || [];

    let totalLikes = 0;
    let totalComments = 0;
    posts.forEach((p) => {
      totalLikes += p.like_count || 0;
      totalComments += p.comments_count || 0;
    });

    const avgLikes = posts.length > 0 ? totalLikes / posts.length : 0;
    const avgComments = posts.length > 0 ? totalComments / posts.length : 0;
    const engagementRate = followers > 0 ? (avgLikes + avgComments) / followers : 0;
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
// ═══════════════════════════════════════════════════════════════════════════════
async function fetchWhatsApp(channel) {
  const creds = getDecryptedCreds(channel);
  const accessToken = creds.accessToken;
  const phoneNumberId = creds.phoneNumberId;

  if (!accessToken || !phoneNumberId) {
    return estimateFromFollowers(channel, 'whatsapp');
  }

  try {
    const whatsapp = new WhatsAppAPI(accessToken, phoneNumberId);
    const phoneInfo = await whatsapp.getPhoneNumberInfo();

    return {
      followers: channel.estadisticas?.seguidores || 0,
      viewsAvg: Math.round((channel.estadisticas?.seguidores || 0) * 0.8),
      engagementRate: estimateEngagement(channel.estadisticas?.seguidores || 0, 'whatsapp'),
      scrollDepth: 0.85,
      postsTotal: 0,
      avgReactionsPerPost: 0,
      avgSharesPerPost: 0,
      avgViewsPerPost: Math.round((channel.estadisticas?.seguidores || 0) * 0.8),
      growthRate30d: 0,
      raw: {
        phoneInfo,
        verified: !!phoneInfo?.verified_name,
        qualityRating: phoneInfo?.quality_rating || 'unknown',
      },
    };
  } catch (err) {
    console.error('WhatsApp connector error:', err.message);
    return estimateFromFollowers(channel, 'whatsapp');
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// FACEBOOK CONNECTOR
// ═══════════════════════════════════════════════════════════════════════════════
async function fetchFacebook(channel) {
  const creds = getDecryptedCreds(channel);
  const accessToken = creds.accessToken;
  const pageId = channel.identificadorCanal;

  if (!accessToken || !pageId) {
    return estimateFromFollowers(channel, 'facebook');
  }

  try {
    const facebook = new FacebookAPI();
    const [pageInfo, postsRes] = await Promise.all([
      facebook.getPageInfo(accessToken, pageId),
      facebook.getPagePosts(accessToken, pageId, 25),
    ]);

    const followers = pageInfo?.followers_count || pageInfo?.fan_count || channel.estadisticas?.seguidores || 0;
    const posts = postsRes?.data || [];

    let totalLikes = 0;
    let totalComments = 0;
    let totalShares = 0;
    posts.forEach((p) => {
      totalLikes += p.likes?.summary?.total_count || 0;
      totalComments += p.comments?.summary?.total_count || 0;
      totalShares += p.shares?.count || 0;
    });

    const avgLikes = posts.length > 0 ? totalLikes / posts.length : 0;
    const avgComments = posts.length > 0 ? totalComments / posts.length : 0;
    const avgShares = posts.length > 0 ? totalShares / posts.length : 0;
    const engagementRate = followers > 0 ? (avgLikes + avgComments + avgShares) / followers : 0;
    const viewsAvg = Math.round(followers * 0.08);

    return {
      followers,
      viewsAvg,
      engagementRate: Math.min(0.5, engagementRate),
      scrollDepth: 0.4,
      postsTotal: posts.length,
      avgReactionsPerPost: Math.round(avgLikes + avgComments),
      avgSharesPerPost: Math.round(avgShares),
      avgViewsPerPost: viewsAvg,
      growthRate30d: 0,
      raw: {
        pageName: pageInfo?.name,
        followers,
        fanCount: pageInfo?.fan_count,
        recentPostCount: posts.length,
      },
    };
  } catch (err) {
    console.error('Facebook connector error:', err.message);
    return estimateFromFollowers(channel, 'facebook');
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// NEWSLETTER CONNECTOR
// ═══════════════════════════════════════════════════════════════════════════════
async function fetchNewsletter(channel) {
  try {
    const newsletter = new NewsletterAPI();
    return newsletter.getEstimatedStats(channel);
  } catch (err) {
    console.error('Newsletter connector error:', err.message);
    return estimateFromFollowers(channel, 'newsletter');
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// LINKEDIN CONNECTOR
// ═══════════════════════════════════════════════════════════════════════════════
async function fetchLinkedin(channel) {
  const creds = getDecryptedCreds(channel);
  const accessToken = creds.accessToken;

  if (!accessToken) {
    return estimateFromFollowers(channel, 'linkedin');
  }

  try {
    const linkedin = new LinkedInAPI(accessToken);
    const linkedinUrn = channel.identificadores?.linkedinUrn || '';
    const isOrg = linkedinUrn.includes('organization');

    let followers = channel.estadisticas?.seguidores || 0;
    let name = channel.nombreCanal || '';

    if (isOrg) {
      const orgId = linkedinUrn.split(':').pop();
      const orgFollowers = await linkedin.getOrganizationFollowers(orgId);
      if (orgFollowers > 0) followers = orgFollowers;
      try {
        const org = await linkedin.getOrganization(orgId);
        name = org.localizedName || name;
      } catch { /* non-critical */ }
    } else {
      const profile = await linkedin.getProfile();
      name = profile?.name || name;
    }

    const engagementRate = estimateEngagement(followers, 'linkedin');
    const viewsAvg = Math.round(followers * 0.06);

    return {
      followers,
      viewsAvg,
      engagementRate,
      scrollDepth: 0.4,
      postsTotal: 0,
      avgReactionsPerPost: Math.round(viewsAvg * engagementRate),
      avgSharesPerPost: Math.round(viewsAvg * 0.02),
      avgViewsPerPost: viewsAvg,
      growthRate30d: 0,
      raw: {
        linkedinUrn,
        name,
        isOrganization: isOrg,
      },
    };
  } catch (err) {
    console.error('LinkedIn connector error:', err.message);
    return estimateFromFollowers(channel, 'linkedin');
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// FALLBACK ESTIMATOR
// ═══════════════════════════════════════════════════════════════════════════════
function estimateEngagement(followers, platform) {
  const tier = followers < 1000 ? 'micro' : followers < 10000 ? 'small' : followers < 50000 ? 'medium' : 'large';

  const rates = {
    telegram: { micro: 0.15, small: 0.1, medium: 0.06, large: 0.03 },
    discord: { micro: 0.12, small: 0.08, medium: 0.05, large: 0.02 },
    instagram: { micro: 0.08, small: 0.05, medium: 0.03, large: 0.015 },
    whatsapp: { micro: 0.25, small: 0.2, medium: 0.15, large: 0.1 },
    newsletter: { micro: 0.3, small: 0.25, medium: 0.18, large: 0.12 },
    facebook: { micro: 0.06, small: 0.04, medium: 0.025, large: 0.01 },
    linkedin: { micro: 0.06, small: 0.04, medium: 0.025, large: 0.01 },
  };

  return (rates[platform] || rates.telegram)[tier] || 0.05;
}

function estimateFromFollowers(channel, platform) {
  const followers = channel.estadisticas?.seguidores || 0;
  const engagementRate = estimateEngagement(followers, platform);

  const viewRates = {
    telegram: 0.35,
    discord: 0.15,
    instagram: 0.1,
    whatsapp: 0.8,
    newsletter: 0.45,
    facebook: 0.08,
    linkedin: 0.06,
  };

  const scrollDepths = {
    telegram: 0.7,
    discord: 0.5,
    instagram: 0.6,
    whatsapp: 0.85,
    newsletter: 0.55,
    facebook: 0.4,
    linkedin: 0.4,
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
// VERIFY CHANNEL ACCESS
// Tests if stored credentials are valid for any platform
// ═══════════════════════════════════════════════════════════════════════════════
async function verifyChannelAccess(channel) {
  const platform = String(channel.plataforma || '').toLowerCase().trim();
  const creds = getDecryptedCreds(channel);

  try {
    switch (platform) {
      case 'telegram': {
        const chatId = channel.identificadores?.chatId || channel.identificadorCanal;
        if (!creds.botToken || !chatId) return { valid: false, error: 'Credenciales incompletas' };
        const telegram = new TelegramAPI(creds.botToken);
        return telegram.verifyBotAccess(chatId);
      }
      case 'discord': {
        const botToken = creds.botToken || creds.accessToken;
        const serverId = channel.identificadores?.serverId || channel.identificadorCanal;
        if (!botToken || !serverId) return { valid: false, error: 'Credenciales incompletas' };
        const discord = new DiscordAPI(botToken);
        return discord.verifyBotAccess(serverId);
      }
      case 'whatsapp': {
        if (!creds.accessToken || !creds.phoneNumberId) return { valid: false, error: 'Credenciales incompletas' };
        const whatsapp = new WhatsAppAPI(creds.accessToken, creds.phoneNumberId);
        return whatsapp.verifyAccess();
      }
      case 'instagram': {
        if (!creds.accessToken) return { valid: false, error: 'Credenciales incompletas' };
        const instagram = new InstagramAPI();
        return instagram.verifyAccess(creds.accessToken);
      }
      case 'facebook': {
        const pageId = channel.identificadorCanal;
        if (!creds.accessToken || !pageId) return { valid: false, error: 'Credenciales incompletas' };
        const facebook = new FacebookAPI();
        return facebook.verifyAccess(creds.accessToken, pageId);
      }
      case 'newsletter': {
        const provider = channel.identificadores?.provider || 'mailchimp';
        if (!creds.accessToken) return { valid: false, error: 'API key no configurada' };
        const newsletter = new NewsletterAPI();
        return newsletter.verifyAccess(creds.accessToken, provider);
      }
      case 'linkedin': {
        if (!creds.accessToken) return { valid: false, error: 'Credenciales incompletas' };
        const linkedin = new LinkedInAPI(creds.accessToken);
        return linkedin.verifyAccess();
      }
      default:
        return { valid: false, error: `Plataforma "${platform}" no soportada` };
    }
  } catch (err) {
    return { valid: false, error: err.message };
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// PUBLISH AD TO CHANNEL
// Dispatches ad publication to the correct platform integration
// ═══════════════════════════════════════════════════════════════════════════════
async function publishAdToChannel(channel, content, targetUrl) {
  const platform = String(channel.plataforma || '').toLowerCase().trim();
  const creds = getDecryptedCreds(channel);

  switch (platform) {
    case 'telegram': {
      const chatId = channel.identificadores?.chatId || channel.identificadorCanal;
      if (!creds.botToken || !chatId) throw new Error('Telegram: credenciales incompletas');
      const telegram = new TelegramAPI(creds.botToken);
      return telegram.publishAd(chatId, content, targetUrl);
    }
    case 'discord': {
      const botToken = creds.botToken || creds.accessToken;
      const channelId = channel.identificadores?.channelId || channel.identificadorCanal;
      if (!botToken || !channelId) throw new Error('Discord: credenciales incompletas');
      const discord = new DiscordAPI(botToken);
      return discord.publishAd(channelId, content, targetUrl);
    }
    case 'whatsapp': {
      const to = channel.identificadores?.phoneNumber || channel.identificadorCanal;
      if (!creds.accessToken || !creds.phoneNumberId || !to) throw new Error('WhatsApp: credenciales incompletas');
      const whatsapp = new WhatsAppAPI(creds.accessToken, creds.phoneNumberId);
      return whatsapp.publishAd(to, content, targetUrl);
    }
    case 'facebook': {
      const pageId = channel.identificadorCanal;
      if (!creds.accessToken || !pageId) throw new Error('Facebook: credenciales incompletas');
      const facebook = new FacebookAPI();
      return facebook.publishPost(creds.accessToken, pageId, content, targetUrl);
    }
    case 'linkedin': {
      const linkedinUrn = channel.identificadores?.linkedinUrn;
      if (!creds.accessToken || !linkedinUrn) throw new Error('LinkedIn: credenciales incompletas');
      const linkedin = new LinkedInAPI(creds.accessToken);
      return linkedin.publishAd(linkedinUrn, content, targetUrl);
    }
    default:
      throw new Error(`Publicación de anuncios no soportada para plataforma "${platform}"`);
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN DISPATCHER
// ═══════════════════════════════════════════════════════════════════════════════
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
    case 'facebook':
      return fetchFacebook(channel);
    case 'linkedin':
      return fetchLinkedin(channel);
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
  fetchFacebook,
  fetchLinkedin,
  estimateFromFollowers,
  estimateEngagement,
  verifyChannelAccess,
  publishAdToChannel,
};
