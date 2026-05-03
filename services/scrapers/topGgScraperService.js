/**
 * Top.gg Scraper — Discord server discovery via top.gg.
 *
 * Replacement for the disboard.org scraper, which is now blocked by Cloudflare.
 * Top.gg is a Next.js app that embeds the full result set in `__NEXT_DATA__`
 * JSON inside the rendered HTML, so we can parse it server-side without a
 * headless browser.
 *
 * URL patterns:
 *   /servers/tag/{tag}                — first page of tagged servers
 *   /servers/tag/{tag}?page={n}       — pagination
 *
 * Each server node lives at:
 *   __NEXT_DATA__.props.pageProps.dehydratedState.queries[*]
 *     .state.data.pages[*].entitiesV2.nodes[*]
 *
 * Rate limiting: 4s between requests.
 */

const axios = require('axios');

const BASE_URL = 'https://top.gg';
const RATE_LIMIT_MS = 4000;
const MAX_PAGES_PER_TAG = 3;
const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/132.0.0.0 Safari/537.36';

const TAGS = [
  'spanish',
  'español',
  'crypto',
  'cryptocurrency',
  'trading',
  'marketing',
  'business',
  'finance',
  'programming',
  'technology',
  'education',
  'community',
  'gaming',
];

const HEADERS = {
  'User-Agent': USER_AGENT,
  Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
  'Accept-Language': 'es-ES,es;q=0.9,en-US;q=0.8,en;q=0.7',
  'Accept-Encoding': 'gzip, deflate, br',
  Referer: BASE_URL,
};

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Extract `__NEXT_DATA__` JSON blob from a page's HTML.
 */
function extractNextData(html) {
  const m = html.match(/<script id="__NEXT_DATA__"[^>]*>(\{.*?\})<\/script>/s);
  if (!m) return null;
  try {
    return JSON.parse(m[1]);
  } catch {
    return null;
  }
}

/**
 * Walk the dehydrated react-query cache and pull every server node we find.
 */
function collectServerNodes(nextData) {
  const queries = nextData?.props?.pageProps?.dehydratedState?.queries || [];
  const nodes = [];
  for (const q of queries) {
    const pages = q.state?.data?.pages;
    if (!Array.isArray(pages)) continue;
    for (const page of pages) {
      const ev = page?.entitiesV2?.nodes;
      if (Array.isArray(ev)) nodes.push(...ev);
    }
  }
  return nodes.filter((n) => n?.__typename === 'DiscordServer');
}

/**
 * Scrape a single tag page.
 */
async function scrapeTagPage(tag, page = 0) {
  const url = page > 0
    ? `${BASE_URL}/servers/tag/${encodeURIComponent(tag)}?page=${page}`
    : `${BASE_URL}/servers/tag/${encodeURIComponent(tag)}`;

  try {
    const { data: html } = await axios.get(url, {
      timeout: 20000,
      headers: HEADERS,
      maxRedirects: 3,
    });

    const nextData = extractNextData(html);
    if (!nextData) {
      console.warn(`[TopGg] No __NEXT_DATA__ on ${tag} p${page}`);
      return { servers: [], hasMore: false };
    }

    const nodes = collectServerNodes(nextData);
    const hasMore = !!nextData?.props?.pageProps?.hasNextPage;

    const servers = nodes.map((n) => ({
      name: (n.name || '').slice(0, 120),
      description: (n.shortDescription || n.description || '').slice(0, 400),
      members: typeof n.serverCount === 'number' ? n.serverCount : 0,
      tags: (n.tags || []).map((t) => t.slug || t.displayName).filter(Boolean),
      inviteLink: n.inviteUrl || (n.id ? `${BASE_URL}/servers/${n.id}` : ''),
      serverId: n.internalId || n.id || '',
      sourceUrl: n.id ? `${BASE_URL}/servers/${n.id}` : '',
      votes: n.votes || 0,
    }));

    return { servers, hasMore };
  } catch (err) {
    const status = err.response?.status;
    if (status && status !== 404) {
      console.warn(`[TopGg] ${tag} p${page} HTTP ${status}: ${err.message}`);
    }
    return { servers: [], hasMore: false };
  }
}

/**
 * Walk paginated results for a single tag.
 */
async function scrapeTag(tag, maxPages = MAX_PAGES_PER_TAG) {
  const results = [];
  for (let page = 0; page < maxPages; page++) {
    const { servers, hasMore } = await scrapeTagPage(tag, page);
    results.push(...servers);
    if (!hasMore || servers.length === 0) break;
    await sleep(RATE_LIMIT_MS);
  }
  return results;
}

/**
 * Scrape every tag in the curated list, deduplicating by Discord guild ID.
 */
async function scrapeAll() {
  const seen = new Map();
  const errors = [];

  for (const tag of TAGS) {
    try {
      const servers = await scrapeTag(tag);
      for (const s of servers) {
        const key = s.serverId || s.inviteLink || s.name;
        if (key && !seen.has(key)) {
          seen.set(key, { ...s, _tag: tag, category: tag });
        }
      }
      if (servers.length > 0) {
        console.log(`[TopGg] ${tag}: ${servers.length} servers`);
      }
    } catch (err) {
      errors.push(`TopGg ${tag}: ${err.message}`);
    }
    await sleep(RATE_LIMIT_MS);
  }

  return { results: Array.from(seen.values()), errors };
}

module.exports = {
  scrapeTagPage,
  scrapeTag,
  scrapeAll,
  TAGS,
  extractNextData,
  collectServerNodes,
};
