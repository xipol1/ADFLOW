/**
 * TGStat Discovery Service — channel discovery via TGStat API.
 *
 * Uses TGStat's REST API (api.tgstat.ru) to search for Spanish-language
 * Telegram channels by category, then stages them as ChannelCandidates
 * for manual admin review before onboarding.
 *
 * API docs: https://api.tgstat.ru/docs/ru/channels/search.html
 *
 * Rate limiting: 2 seconds between API calls.
 * Request cap: max 200 requests per job execution.
 */

const axios = require('axios');

const TGSTAT_API_BASE = 'https://api.tgstat.ru';
const RATE_LIMIT_MS = 2000;
const MAX_REQUESTS_PER_RUN = 200;

const DEFAULT_CATEGORIES = [
  'economics',
  'marketing',
  'technologies',
  'crypto',
  'health',
  'education',
  'business',
  'entertainment',
];

// Shared request counter per job execution
let _requestCount = 0;

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Get TGStat API token from env.
 */
function getToken() {
  const token = process.env.TGSTAT_API_TOKEN;
  if (!token) throw new Error('TGSTAT_API_TOKEN is required');
  return token;
}

/**
 * Make a rate-limited request to the TGStat API.
 * Handles 429 with a 60s backoff and 1 retry.
 */
async function tgstatRequest(endpoint, params = {}) {
  if (_requestCount >= MAX_REQUESTS_PER_RUN) {
    throw new Error(`Request cap reached (${MAX_REQUESTS_PER_RUN})`);
  }

  const url = `${TGSTAT_API_BASE}${endpoint}`;
  const allParams = { token: getToken(), ...params };

  let retries = 0;
  while (retries <= 1) {
    try {
      _requestCount++;
      const { data } = await axios.get(url, {
        params: allParams,
        timeout: 15000,
        headers: {
          'User-Agent': 'ChannelAd/1.0 (https://channelad.io)',
        },
      });

      if (data.status !== 'ok') {
        throw new Error(`TGStat API error: ${JSON.stringify(data)}`);
      }

      await sleep(RATE_LIMIT_MS);
      return data.response;
    } catch (err) {
      if (err.response?.status === 429 && retries === 0) {
        console.warn('[TGStat] Rate limited (429), waiting 60s before retry...');
        await sleep(60000);
        retries++;
        continue;
      }
      throw err;
    }
  }
}

/**
 * Search for channels in a specific category.
 *
 * @param {string} category — TGStat category slug
 * @param {number} limit — max results (up to 100)
 * @returns {Array} — array of channel candidate objects
 */
async function scrapeChannelsByCategory(category, limit = 100) {
  const response = await tgstatRequest('/channels/search', {
    category,
    language: 'spanish',
    peer_type: 'channel',
    limit: Math.min(limit, 100),
  });

  if (!response?.items?.length) return [];

  return response.items.map((ch) => ({
    username: (ch.username || '').replace(/^@/, '').toLowerCase(),
    title: ch.title || '',
    description: ch.about || '',
    subscribers: ch.participants_count || 0,
    ci_index: ch.ci_index || null,
    tgstat_id: ch.id || null,
    tg_id: ch.tg_id || null,
    image: ch.image100 || '',
    link: ch.link || '',
    created_at: ch.created_at ? new Date(ch.created_at * 1000) : null,
    category,
  }));
}

/**
 * Get detailed stats for a specific channel.
 *
 * @param {string} username — channel username (without @)
 * @returns {object|null} — detailed metrics or null on failure
 */
async function scrapeChannelDetail(username) {
  try {
    const info = await tgstatRequest('/channels/get', { channelId: `@${username}` });
    let stats = null;
    try {
      stats = await tgstatRequest('/channels/stat', { channelId: `@${username}` });
    } catch (_) { /* stat endpoint may fail on free tier */ }

    return {
      username: (info.username || username).toLowerCase(),
      title: info.title || '',
      description: info.about || '',
      category: info.category || '',
      country: info.country || '',
      language: info.language || '',
      subscribers: info.participants_count || 0,
      ci_index: info.ci_index || null,
      // Stats (may be null on free tier)
      avg_post_reach: stats?.avg_post_reach ?? null,
      err_percent: stats?.err_percent ?? null,
      er_percent: stats?.er_percent ?? null,
      daily_reach: stats?.daily_reach ?? null,
      posts_count: stats?.posts_count ?? null,
      mentions_count: stats?.mentions_count ?? null,
      forwards_count: stats?.forwards_count ?? null,
    };
  } catch (err) {
    console.error(`[TGStat] Failed to get detail for @${username}:`, err.message);
    return null;
  }
}

/**
 * Discover channels across multiple categories, deduplicate,
 * filter, and save as ChannelCandidates.
 *
 * @param {string[]} categories — category slugs to search
 * @returns {{ discovered: number, duplicates: number, saved: number, errors: string[] }}
 */
async function batchDiscoverFromTGStat(categories = DEFAULT_CATEGORIES) {
  const ChannelCandidate = require('../models/ChannelCandidate');
  const Canal = require('../models/Canal');

  // Reset per-run counter
  _requestCount = 0;

  const errors = [];
  const allCandidates = new Map(); // username -> candidate data

  // Phase 1: Search each category
  for (const category of categories) {
    try {
      if (_requestCount >= MAX_REQUESTS_PER_RUN) {
        errors.push(`Request cap reached, skipping remaining categories from ${category}`);
        break;
      }

      const channels = await scrapeChannelsByCategory(category);
      for (const ch of channels) {
        if (!ch.username) continue;
        // Deduplicate: keep first occurrence (or merge categories)
        if (!allCandidates.has(ch.username)) {
          allCandidates.set(ch.username, ch);
        }
      }
    } catch (err) {
      errors.push(`Category ${category}: ${err.message}`);
    }
  }

  // Phase 2: Filter — minimum 500 subscribers
  const filtered = [];
  for (const [, candidate] of allCandidates) {
    if (candidate.subscribers >= 500) {
      filtered.push(candidate);
    }
  }

  const discovered = allCandidates.size;
  const duplicates = discovered - filtered.length; // includes sub-500 filtered out

  // Phase 3: Check which already exist in Canal or ChannelCandidates
  let saved = 0;
  for (const candidate of filtered) {
    try {
      // Skip if already a registered canal
      const existingCanal = await Canal.findOne({
        plataforma: 'telegram',
        identificadorCanal: { $regex: new RegExp(`^@?${candidate.username}$`, 'i') },
      }).lean();

      if (existingCanal) continue;

      // Upsert into ChannelCandidates
      await ChannelCandidate.findOneAndUpdate(
        { username: candidate.username },
        {
          $setOnInsert: {
            username: candidate.username,
            source: 'tgstat',
            status: 'pending_review',
            scraped_at: new Date(),
          },
          $set: {
            raw_metrics: {
              title: candidate.title,
              description: candidate.description,
              subscribers: candidate.subscribers,
              ci_index: candidate.ci_index,
              tgstat_id: candidate.tgstat_id,
              tg_id: candidate.tg_id,
              image: candidate.image,
              link: candidate.link,
              category: candidate.category,
              created_at: candidate.created_at,
            },
          },
        },
        { upsert: true, new: true },
      );

      saved++;
    } catch (err) {
      // Duplicate key on race condition — fine, skip
      if (err.code === 11000) continue;
      errors.push(`Save ${candidate.username}: ${err.message}`);
    }
  }

  return { discovered, duplicates, saved, errors };
}

module.exports = {
  scrapeChannelsByCategory,
  scrapeChannelDetail,
  batchDiscoverFromTGStat,
  DEFAULT_CATEGORIES,
  RATE_LIMIT_MS,
  MAX_REQUESTS_PER_RUN,
};
