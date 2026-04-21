/**
 * CheetahGroups Scraper — WhatsApp channel discovery via cheetahgroups.com.
 *
 * WordPress-based directory with 1,000+ WhatsApp Channels (the newer
 * Channels feature). Organized by categories (News, Sports, Business, etc.).
 *
 * URL patterns:
 *   /whatsapp-channels-links/                      — main listing
 *   /whatsapp-channel-links-{category}/            — category pages
 *   /whatsapp-channels-links/page/{n}/             — pagination
 *
 * May return 403 — uses full browser-like headers.
 * Rate limiting: 4s between requests.
 */

const axios = require('axios');
const cheerio = require('cheerio');

const BASE_URL = 'https://cheetahgroups.com';
const RATE_LIMIT_MS = 4000;
const MAX_PAGES = 5;
const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/132.0.0.0 Safari/537.36';

const PAGES_TO_SCRAPE = [
  { path: '/whatsapp-channels-links/', label: 'main' },
  { path: '/whatsapp-channel-links-business/', label: 'business' },
  { path: '/whatsapp-channel-links-news/', label: 'news' },
  { path: '/whatsapp-channel-links-technology/', label: 'technology' },
  { path: '/whatsapp-channel-links-education/', label: 'education' },
  { path: '/whatsapp-channel-links-sports/', label: 'sports' },
  { path: '/whatsapp-channel-links-entertainment/', label: 'entertainment' },
  { path: '/whatsapp-channel-links-finance/', label: 'finance' },
  { path: '/whatsapp-channel-links-crypto/', label: 'crypto' },
];

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function parseFollowers(text) {
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
 * Extract WhatsApp channel invite code from a whatsapp.com/channel link.
 */
function extractChannelCode(href) {
  if (!href) return null;
  // https://whatsapp.com/channel/XXXXXX
  const m = href.match(/whatsapp\.com\/channel\/([\w-]+)/i);
  return m ? m[1] : null;
}

/**
 * Scrape a single page.
 */
async function scrapePage(url) {
  try {
    const { data: html } = await axios.get(url, {
      timeout: 15000,
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
    const channels = [];

    // Strategy 1: WhatsApp channel invite links
    $('a[href*="whatsapp.com/channel/"]').each((_, el) => {
      const $a = $(el);
      const href = $a.attr('href') || '';
      const channelCode = extractChannelCode(href);
      if (!channelCode) return;

      const container = $a.closest('div, li, article, tr, p, td');
      const name =
        container.find('h2, h3, h4, h5, strong, b').first().text().trim() ||
        $a.text().trim();
      if (!name || name.length < 2) return;

      const containerText = container.text().replace(/\s+/g, ' ');
      const followersMatch = containerText.match(/([\d,.]+[KkMm]?)\s*(?:followers?|members?|seguidores?)/i);

      const description = container.find('p, .description, .excerpt').first().text().trim();

      channels.push({
        channelCode,
        name: name.slice(0, 120),
        followers: followersMatch ? parseFollowers(followersMatch[1]) : 0,
        description: (description || '').slice(0, 400),
        inviteLink: href,
      });
    });

    // Strategy 2: WordPress article entries with WA links
    if (channels.length === 0) {
      $('article, .entry-content li, .wp-block-list li, .post-content li').each((_, el) => {
        const $item = $(el);
        const link = $item.find('a[href*="whatsapp.com/channel/"]').first();
        if (!link.length) return;

        const href = link.attr('href') || '';
        const channelCode = extractChannelCode(href);
        if (!channelCode) return;

        const name = link.text().trim() || $item.find('strong, b, h3, h4').first().text().trim();
        if (!name || name.length < 2) return;

        channels.push({
          channelCode,
          name: name.slice(0, 120),
          followers: 0,
          description: '',
          inviteLink: href,
        });
      });
    }

    const hasMore = $('a.next, a[rel="next"], .nav-next a').length > 0;
    return { channels, hasMore };
  } catch (err) {
    const status = err.response?.status;
    if (status === 403) {
      console.warn(`[CheetahGroups] 403 on ${url} — may require browser JS`);
    } else if (status !== 404) {
      console.warn(`[CheetahGroups] Failed ${url}: ${err.message}`);
    }
    return { channels: [], hasMore: false };
  }
}

/**
 * Scrape a section with pagination.
 */
async function scrapeSection(basePath, maxPages = MAX_PAGES) {
  const results = [];
  for (let page = 1; page <= maxPages; page++) {
    const url = page > 1
      ? `${BASE_URL}${basePath}page/${page}/`
      : `${BASE_URL}${basePath}`;

    const { channels, hasMore } = await scrapePage(url);
    results.push(...channels);
    if (!hasMore || channels.length === 0) break;
    await sleep(RATE_LIMIT_MS);
  }
  return results;
}

/**
 * Scrape all configured pages.
 * @returns {{ results: Array, errors: string[] }}
 */
async function scrapeAll() {
  const seen = new Map();
  const errors = [];

  for (const page of PAGES_TO_SCRAPE) {
    try {
      const channels = await scrapeSection(page.path);
      for (const ch of channels) {
        if (!seen.has(ch.channelCode)) {
          seen.set(ch.channelCode, { ...ch, category: page.label });
        }
      }
      if (channels.length > 0) {
        console.log(`[CheetahGroups] ${page.label}: ${channels.length} channels`);
      }
    } catch (err) {
      errors.push(`CheetahGroups ${page.label}: ${err.message}`);
    }
    await sleep(RATE_LIMIT_MS);
  }

  return { results: Array.from(seen.values()), errors };
}

module.exports = {
  scrapePage,
  scrapeSection,
  scrapeAll,
  PAGES_TO_SCRAPE,
  parseFollowers,
  extractChannelCode,
};
