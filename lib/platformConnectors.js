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
const linkedinOrgMetrics = require('../services/linkedinOrgMetricsService');
const { getDecryptedCreds } = require('./encryption');
const { isAllowed, isExplicitlyRejected, normalizePlatform } = require('./platformWhitelist');

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
    // getChatStatistics is gated by Bot API to "large" channels (Telegram's
    // internal threshold, undocumented but ~1k+ members) and returns null
    // otherwise — we fall through to a deterministic estimate clearly
    // flagged as estimated:true so the scoring layer can downweight it.
    const [chatInfo, memberCount, chatStats] = await Promise.all([
      telegram.getChat(chatId),
      telegram.getChatMemberCount(chatId),
      telegram.getChatStatistics(chatId).catch(() => null),
    ]);

    const followers = memberCount?.result || channel.estadisticas?.seguidores || 0;

    // Real stats path: use Telegram's native mean view/share counts.
    if (chatStats && typeof chatStats.meanViewsPerPost === 'number') {
      const viewsAvg = Math.round(chatStats.meanViewsPerPost);
      const sharesAvg = Math.round(chatStats.meanSharesPerPost || 0);
      const engagementRate = followers > 0 ? Math.min(0.5, viewsAvg / followers) : 0;
      return {
        followers,
        viewsAvg,
        engagementRate,
        scrollDepth: 0.7,
        postsTotal: 0,
        // Native API doesn't expose reactions on the chat-level stats, so we
        // derive a conservative estimate from views×engagement until the
        // webhook-based reaction aggregator catches up.
        avgReactionsPerPost: Math.round(viewsAvg * 0.05),
        avgSharesPerPost: sharesAvg,
        avgViewsPerPost: viewsAvg,
        growthRate30d: Number(chatStats.growthPercent) || 0,
        raw: {
          chatInfo: chatInfo?.result || {},
          memberCount: followers,
          source: 'telegram_native_stats',
        },
      };
    }

    // Fallback for small channels where getChatStatistics returns null.
    // DETERMINISTIC view-rate (was Math.random — fabricated metrics). The
    // 0.3 figure is the well-documented industry median for Telegram public
    // channels; flagged as estimated so consumers don't treat it as truth.
    const engagementRate = estimateEngagement(followers, 'telegram');
    const viewsAvg = Math.round(followers * 0.3);
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
        estimated: true,
        source: 'telegram_member_count_only',
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

    // Fetch reach/impressions/saves on a 5-post sample to avoid burning
    // through the per-account Graph quota. Failing /insights silently is
    // safe — older accounts may lack the `instagram_manage_insights` scope
    // (those channels need a re-consent, which the health job already
    // surfaces). We fall back to the followers-based view-rate estimate.
    let avgReach = 0;
    let avgImpressions = 0;
    let avgSaves = 0;
    let insightsUsed = 0;
    const sample = posts.slice(0, 5);
    if (sample.length > 0) {
      const insightResults = await Promise.allSettled(
        sample.map((p) => instagram.getPostMetrics(p.id))
      );
      let reachSum = 0;
      let impSum = 0;
      let savesSum = 0;
      for (const r of insightResults) {
        if (r.status === 'fulfilled' && r.value) {
          reachSum += r.value.reach || 0;
          impSum += r.value.impresiones || 0;
          savesSum += r.value.guardados || 0;
          insightsUsed++;
        }
      }
      if (insightsUsed > 0) {
        avgReach = Math.round(reachSum / insightsUsed);
        avgImpressions = Math.round(impSum / insightsUsed);
        avgSaves = Math.round(savesSum / insightsUsed);
      }
    }

    // viewsAvg priority: real impressions > real reach > followers×0.1 estimate.
    // Engagement rate uses (likes+comments+saves)/reach when we have insights
    // — saves are a strong intent signal that the old (likes+comments)/followers
    // calculation ignored, leading to systematically under-reported engagement.
    const hasInsights = insightsUsed > 0;
    const viewsAvg = avgImpressions || avgReach || Math.round(followers * 0.1);
    const engagementRate = hasInsights && avgReach > 0
      ? Math.min(0.5, (avgLikes + avgComments + avgSaves) / avgReach)
      : Math.min(0.5, followers > 0 ? (avgLikes + avgComments) / followers : 0);

    return {
      followers,
      viewsAvg,
      engagementRate,
      scrollDepth: 0.6,
      postsTotal: profile?.media_count || 0,
      avgReactionsPerPost: Math.round(avgLikes + avgComments + avgSaves),
      avgSharesPerPost: Math.round(avgLikes * 0.05),
      avgViewsPerPost: viewsAvg,
      growthRate30d: 0,
      raw: {
        profile,
        recentPostCount: posts.length,
        insightsSampleSize: insightsUsed,
        avgReach,
        avgImpressions,
        avgSaves,
        source: hasInsights ? 'instagram_insights' : 'instagram_basic_media',
      },
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

    const followers = channel.estadisticas?.seguidores || 0;
    // WhatsApp Business API doesn't expose per-broadcast view counts via
    // Graph — the platform was designed for 1:1 messaging, not channel-style
    // broadcasts. The previous version multiplied followers × 0.8 to fake
    // a "viewsAvg" which has no API backing. We surface the real signals
    // Meta DOES return (quality_rating, messaging_limit_tier) and stop
    // pretending to measure what we can't.
    //
    // qualityRating: 'GREEN' | 'YELLOW' | 'RED' | 'UNKNOWN' — Meta's own
    // anti-spam classification. RED = recipients are reporting/blocking.
    // We map it to an engagement proxy so the scoring layer can degrade
    // low-quality channels without inventing fake per-post metrics.
    const qualityRating = String(phoneInfo?.quality_rating || 'UNKNOWN').toUpperCase();
    const qualityScore = {
      GREEN: 0.85,
      YELLOW: 0.5,
      RED: 0.15,
    }[qualityRating] ?? 0.5;

    return {
      followers,
      // viewsAvg is left equal to followers (per WhatsApp's broadcast model
      // every subscriber receives the message), flagged via raw.estimated.
      viewsAvg: followers,
      engagementRate: qualityScore,
      scrollDepth: 0.85,
      postsTotal: 0,
      avgReactionsPerPost: 0,
      avgSharesPerPost: 0,
      avgViewsPerPost: followers,
      growthRate30d: 0,
      raw: {
        phoneInfo,
        verified: !!phoneInfo?.verified_name,
        qualityRating,
        messagingLimitTier: phoneInfo?.messaging_limit_tier || null,
        status: phoneInfo?.status || null,
        estimated: true,
        source: 'whatsapp_phone_info',
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
    // page_impressions_unique = unique people reached (= "reach"), the
    // closest analog to Telegram views. page_engaged_users counts unique
    // engagers. days_28 to smooth daily volatility; the connector is read
    // by the nightly scoring cron, so a 28-day window matches the scoring
    // horizon.
    const [pageInfo, postsRes, insightsRes] = await Promise.all([
      facebook.getPageInfo(accessToken, pageId),
      facebook.getPagePosts(accessToken, pageId, 25),
      facebook
        .getPageInsights(
          accessToken,
          pageId,
          ['page_impressions_unique', 'page_engaged_users', 'page_post_engagements'],
          'days_28'
        )
        .catch(() => null),
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

    // Pull the latest value from each insight metric. Graph returns a
    // values[] array (one entry per period bucket); the last entry is the
    // most recent. If the page is new or the scope is missing, the metric
    // is absent — fall back to follower-rate estimates clearly flagged.
    const insightsMap = {};
    for (const metric of insightsRes?.data || []) {
      const last = metric.values?.[metric.values.length - 1];
      if (last) insightsMap[metric.name] = Number(last.value) || 0;
    }
    const monthlyReach = insightsMap.page_impressions_unique || 0;
    const monthlyEngagers = insightsMap.page_engaged_users || 0;
    const monthlyEngagements = insightsMap.page_post_engagements || 0;

    const hasInsights = monthlyReach > 0;
    // Per-post reach: monthly reach / posts in the window. If posts.length
    // is small (less than 25 in a month), we cap at posts.length to avoid
    // dividing reach across a partial window and inflating per-post views.
    const avgReachPerPost = hasInsights && posts.length > 0
      ? Math.round(monthlyReach / Math.max(posts.length, 1))
      : 0;
    const viewsAvg = avgReachPerPost || Math.round(followers * 0.08);
    const engagementRate = hasInsights && monthlyReach > 0
      ? Math.min(0.5, monthlyEngagements / monthlyReach)
      : Math.min(0.5, followers > 0 ? (avgLikes + avgComments + avgShares) / followers : 0);

    return {
      followers,
      viewsAvg,
      engagementRate,
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
        monthlyReach,
        monthlyEngagers,
        monthlyEngagements,
        source: hasInsights ? 'facebook_page_insights' : 'facebook_basic_posts',
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

    // Organization path: pull real share statistics (impressions, likes,
    // comments, shares, clicks) from LinkedIn's REST API. The legacy
    // implementation only returned follower count and a follower-rate
    // estimate, which underreported engagement for active company pages.
    // Requires `r_organization_social` scope — older OAuth grants will
    // 403 on these calls; we swallow and fall back to the estimate so the
    // health job (Phase 2) is what surfaces the missing scope.
    if (isOrg) {
      const orgId = linkedinUrn.split(':').pop();
      const orgUrn = linkedinUrn.startsWith('urn:li:organization:')
        ? linkedinUrn
        : `urn:li:organization:${orgId}`;

      const [orgFollowers, shareStats, timeBound] = await Promise.all([
        linkedin.getOrganizationFollowers(orgId).catch(() => 0),
        linkedinOrgMetrics.getOrgShareStatistics(accessToken, orgUrn).catch(() => null),
        linkedinOrgMetrics
          .getOrgShareStatisticsTimeBound(accessToken, orgUrn, 30)
          .catch(() => null),
      ]);
      try {
        const org = await linkedin.getOrganization(orgId);
        name = org.localizedName || name;
      } catch { /* non-critical */ }

      if (orgFollowers > 0) followers = orgFollowers;

      // Prefer the 30-day window (matches our scoring horizon) and fall back
      // to the lifetime aggregate if the time-bound query failed.
      const stats = (timeBound && !timeBound.error ? timeBound : shareStats) || {};
      const hasStats =
        !stats.error && (stats.impressions > 0 || stats.likes > 0 || stats.comments > 0);

      if (hasStats) {
        const impressions = Number(stats.impressions) || 0;
        const likes = Number(stats.likes) || 0;
        const comments = Number(stats.comments) || 0;
        const shares = Number(stats.shares) || 0;
        const clicks = Number(stats.clicks) || 0;
        // shareCount approximates post count over the window. If LinkedIn
        // returned no breakdown, fall back to 1 to avoid divide-by-zero.
        const postCount = Number(stats.shares || stats.shareCount) || 1;
        const avgViewsPerPost = Math.round(impressions / postCount);
        const engagementRate = impressions > 0
          ? Math.min(0.5, (likes + comments + shares + clicks) / impressions)
          : 0;

        return {
          followers,
          viewsAvg: avgViewsPerPost,
          engagementRate,
          scrollDepth: 0.4,
          postsTotal: postCount,
          avgReactionsPerPost: Math.round((likes + comments) / postCount),
          avgSharesPerPost: Math.round(shares / postCount),
          avgViewsPerPost,
          growthRate30d: 0,
          raw: {
            linkedinUrn,
            name,
            isOrganization: true,
            impressions,
            likes,
            comments,
            shares,
            clicks,
            window: timeBound && !timeBound.error ? '30d' : 'lifetime',
            source: 'linkedin_share_statistics',
          },
        };
      }

      // No share-stats access (scope missing or new org): fall through to
      // the estimator below, but with the real follower count.
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
        estimated: true,
        source: 'linkedin_follower_count_only',
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
  // NOTE: these are ENGAGEMENT rates (views / followers), NOT platform commissions.
  // Platform commission rates live in config/commissions.js (COMMISSION_TIERS).
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
  const platform = normalizePlatform(channel.plataforma);
  const creds = getDecryptedCreds(channel);

  if (!isAllowed(platform)) {
    const msg = isExplicitlyRejected(platform)
      ? `Plataforma "${platform}" no soportada en Channelad.`
      : `Plataforma "${platform}" desconocida.`;
    return { valid: false, error: msg, code: 'PLATFORM_NOT_SUPPORTED' };
  }

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
/**
 * Publish a campaign to its target channel.
 *
 * Signature accepts a full campaign object now (instead of content/targetUrl
 * directly) so the rich payload — media[], buttons[], embed, format — can
 * reach the per-platform integrations. Old call sites that still pass two
 * strings keep working via the back-compat block below.
 *
 *   publishAdToChannel(channel, campaign)        ← new
 *   publishAdToChannel(channel, content, target) ← legacy, deprecated
 */
async function publishAdToChannel(channel, campaignOrContent, targetUrlArg) {
  const platform = normalizePlatform(channel.plataforma);
  const creds = getDecryptedCreds(channel);

  // Back-compat: callers que pasan (channel, content, targetUrl) se
  // mapean al objeto campaign con media/buttons/embed vacíos. Callers
  // nuevos pasan el documento entero y leemos todos los campos.
  const campaign = (typeof campaignOrContent === 'string')
    ? { content: campaignOrContent, targetUrl: targetUrlArg, media: [], buttons: [], embed: null, format: 'text' }
    : (campaignOrContent || {});

  const content = String(campaign.content || '').trim();
  const targetUrl = String(campaign.targetUrl || '').trim();
  const media = Array.isArray(campaign.media) ? campaign.media : [];
  const buttons = Array.isArray(campaign.buttons) ? campaign.buttons : [];
  const embed = campaign.embed || null;
  const format = String(campaign.format || 'text');

  if (!isAllowed(platform)) {
    const err = new Error(
      isExplicitlyRejected(platform)
        ? `Publicación no soportada para "${platform}" (plataforma no integrada).`
        : `Publicación no soportada para plataforma "${platform}".`
    );
    err.code = 'PLATFORM_NOT_SUPPORTED';
    throw err;
  }

  switch (platform) {
    case 'telegram': {
      const chatId = channel.identificadores?.chatId || channel.identificadorCanal;
      if (!creds.botToken || !chatId) throw new Error('Telegram: credenciales incompletas');
      const telegram = new TelegramAPI(creds.botToken);
      return telegram.publishAd(chatId, content, targetUrl, { media, buttons, format });
    }
    case 'discord': {
      const botToken = creds.botToken || creds.accessToken;
      const channelId = channel.identificadores?.channelId || channel.identificadorCanal;
      if (!botToken || !channelId) throw new Error('Discord: credenciales incompletas');
      const discord = new DiscordAPI(botToken);
      return discord.publishAd(channelId, content, targetUrl, { embed, media, format });
    }
    case 'whatsapp': {
      const to = channel.identificadores?.phoneNumber || channel.identificadorCanal;
      if (!creds.accessToken || !creds.phoneNumberId || !to) throw new Error('WhatsApp: credenciales incompletas');
      const whatsapp = new WhatsAppAPI(creds.accessToken, creds.phoneNumberId);
      return whatsapp.publishAd(to, content, targetUrl, { media, buttons, format });
    }
    case 'facebook': {
      const pageId = channel.identificadorCanal;
      if (!creds.accessToken || !pageId) throw new Error('Facebook: credenciales incompletas');
      const facebook = new FacebookAPI();
      return facebook.publishPost(creds.accessToken, pageId, content, targetUrl, { media, buttons, format });
    }
    case 'linkedin': {
      const linkedinUrn = channel.identificadores?.linkedinUrn;
      if (!creds.accessToken || !linkedinUrn) throw new Error('LinkedIn: credenciales incompletas');
      const linkedin = new LinkedInAPI(creds.accessToken);
      return linkedin.publishAd(linkedinUrn, content, targetUrl, { media, buttons, format });
    }
    default:
      throw new Error(`Publicación de anuncios no soportada para plataforma "${platform}"`);
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN DISPATCHER
// ═══════════════════════════════════════════════════════════════════════════════
async function fetchPlatformData(channel) {
  const platform = normalizePlatform(channel.plataforma);

  if (!isAllowed(platform)) {
    // Previously the dispatcher silently fell back to estimateFromFollowers
    // for unknown platforms, which let canales fantasma (youtube/tiktok/twitch)
    // surface in the marketplace with fabricated stats. Now we throw so
    // upstream callers (scoring cron, intel jobs) skip them explicitly.
    const err = new Error(`Plataforma "${platform}" no soportada por Channelad.`);
    err.code = 'PLATFORM_NOT_SUPPORTED';
    throw err;
  }

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
      // Unreachable: isAllowed gate above already filters out anything not
      // in this switch. Keep as defensive guard.
      throw new Error(`Plataforma "${platform}" no manejada`);
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
