/**
 * Disboard Scraper Service — Discord server discovery via disboard.org.
 *
 * Disboard is the largest Discord server directory. Servers must install
 * the Disboard bot to be listed. Supports tag-based and category-based
 * browsing.
 *
 * URL patterns:
 *   /servers/tag/{tag}         — e.g. /servers/tag/spanish
 *   /servers/tag/{tag}/{page}  — pagination (1-indexed)
 *
 * Has Cloudflare protection — uses full browser headers.
 * Rate limiting: 5s between requests (conservative for Cloudflare).
 */

const axios = require('axios');
const cheerio = require('cheerio');

const BASE_URL = 'https://disboard.org';
const RATE_LIMIT_MS = 5000;
const MAX_PAGES_PER_TAG = 5;
const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/132.0.0.0 Safari/537.36';

const TAGS = [
  'spanish',
  'español',
  'espanol',
  'spanish-learning',
  'crypto',
  'cryptocurrency',
  'trading',
  'marketing',
  'business',
  'finance',
  'gaming',
  'programming',
  'technology',
  'education',
  'community',
];

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function parseMembers(text) {
  if (!text) return 0;
  const clean = text.replace(/\s/g, '').replace(/,/g, '');
  const m = clean.match(/([\d.]+)\s*([KkMm])?/);
  if (!m) return 0;
  let n = parseFloat(m[1]);
  if (m[2] === 'K' || m[2] === 'k') n *= 1000;
  if (m[2] === 'M' || m[2] === 'm') n *= 1000000;
  return Math.round(n);
}

/**
 * Scrape a single tag page.
 */
async function scrapeTagPage(tag, page = 1) {
  const url = page > 1
    ? `${BASE_URL}/servers/tag/${encodeURIComponent(tag)}/${page}`
    : `${BASE_URL}/servers/tag/${encodeURIComponent(tag)}`;

  try {
    const { data: html } = await axios.get(url, {
      timeout: 20000,
      headers: {
        'User-Agent': USER_AGENT,
        Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
        'Accept-Language': 'es-ES,es;q=0.9,en-US;q=0.8,en;q=0.7',
        'Accept-Encoding': 'gzip, deflate, br',
        'Sec-Fetch-Dest': 'document',
        'Sec-Fetch-Mode': 'navigate',
        'Sec-Fetch-Site': 'none',
        'Sec-Fetch-User': '?1',
        'Upgrade-Insecure-Requests': '1',
        Referer: BASE_URL,
      },
      maxRedirects: 3,
    });

    const $ = cheerio.load(html);
    const servers = [];

    // Primary selectors — Disboard uses .server-info cards
    $('.listing-card, .server-info, [class*="server"]').each((_, el) => {
      const $card = $(el);

      const name =
        $card.find('.server-name, .server-info-name, h5, h4, .name').first().text().trim();
      if (!name) return;

      const description =
        $card.find('.server-description, .server-info-description, p, .description').first().text().trim();

      // Member count
      const memberText = $card.find('.server-members, .member-count, [class*="member"]').text();
      const members = parseMembers(memberText);

      // Tags
      const tags = [];
      $card.find('.tag, .server-tag, [class*="tag"]').each((_, t) => {
        const txt = $(t).text().trim();
        if (txt && txt.length < 30) tags.push(txt.toLowerCase());
      });

      // Invite link or server ID
      const joinLink =
        $card.find('a[href*="discord.gg"], a[href*="discord.com/invite"]').attr('href') || '';
      const serverLink = $card.find('a[href*="/server/"]').attr('href') || '';
      const serverIdMatch = serverLink.match(/\/server\/(\d+)/);

      servers.push({
        name: name.slice(0, 120),
        description: (description || '').slice(0, 400),
        members,
        tags,
        inviteLink: joinLink,
        serverId: serverIdMatch ? serverIdMatch[1] : '',
        sourceUrl: serverLink ? `${BASE_URL}${serverLink}` : '',
      });
    });

    // Fallback: any Discord invite links on the page
    if (servers.length === 0) {
      const seen = new Set();
      $('a[href*="discord.gg"], a[href*="discord.com/invite"]').each((_, el) => {
        const href = $(el).attr('href') || '';
        if (seen.has(href)) return;
        seen.add(href);

        const container = $(el).closest('div, li, article, tr');
        const name =
          container.find('h2, h3, h4, h5, strong, .name, .title').first().text().trim() ||
          $(el).text().trim();
        if (!name || name.length < 2) return;

        const containerText = container.text().replace(/\s+/g, ' ');
        const membersMatch = containerText.match(/([\d,.]+[KkMm]?)\s*(?:members?|online)/i);

        servers.push({
          name: name.slice(0, 120),
          description: '',
          members: membersMatch ? parseMembers(membersMatch[1]) : 0,
          tags: [tag],
          inviteLink: href,
          serverId: '',
          sourceUrl: '',
        });
      });
    }

    // Check for next page
    const hasMore = $('a[rel="next"], .next-page, a:contains("Next")').length > 0 ||
      $(`a[href*="/${page + 1}"]`).length > 0;

    return { servers, hasMore };
  } catch (err) {
    const status = err.response?.status;
    if (status === 403) {
      console.warn(`[Disboard] 403 on tag "${tag}" p${page} — Cloudflare challenge active`);
    } else if (status === 404) {
      // tag doesn't exist
    } else {
      console.warn(`[Disboard] Failed tag "${tag}" p${page}: ${err.message}`);
    }
    return { servers: [], hasMore: false };
  }
}

/**
 * Scrape a tag across multiple pages.
 */
async function scrapeTag(tag, maxPages = MAX_PAGES_PER_TAG) {
  const results = [];
  for (let page = 1; page <= maxPages; page++) {
    const { servers, hasMore } = await scrapeTagPage(tag, page);
    results.push(...servers);
    if (!hasMore || servers.length === 0) break;
    await sleep(RATE_LIMIT_MS);
  }
  return results;
}

/**
 * Scrape all configured tags.
 * @returns {{ results: Array, errors: string[] }}
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
          seen.set(key, { ...s, _tag: tag });
        }
      }
      if (servers.length > 0) {
        console.log(`[Disboard] ${tag}: ${servers.length} servers`);
      }
    } catch (err) {
      errors.push(`Disboard ${tag}: ${err.message}`);
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
  parseMembers,
};
