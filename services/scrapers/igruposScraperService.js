/**
 * iGrupos Scraper Service — multi-platform community discovery via igrupos.com.
 *
 * igrupos.com is 100% Spanish and indexes WhatsApp, Telegram, Discord,
 * Signal, and Facebook groups. Each listing shows member count, platform,
 * location, and description.
 *
 * URL patterns:
 *   /tag/{platform}/{category}  — e.g. /tag/whatsapp/marketing
 *   /grupo/{ID}                 — detail page
 *   /{platform}/{city}          — city-specific
 *
 * Selectors: .group-item, .group-title, .group-description
 * Member counts appear as "📈 [number]" before the title.
 * Platform identified by img[src*="{platform}.svg"].
 *
 * Rate limiting: 3s between page requests.
 */

const axios = require('axios');
const cheerio = require('cheerio');

const IGRUPOS_BASE = 'https://www.igrupos.com';
const RATE_LIMIT_MS = 3000;
const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/132.0.0.0 Safari/537.36';

// Platform + category combos to scrape
const SCRAPE_TARGETS = [
  // WhatsApp
  { platform: 'whatsapp', category: 'marketing' },
  { platform: 'whatsapp', category: 'negocios' },
  { platform: 'whatsapp', category: 'emprendimiento' },
  { platform: 'whatsapp', category: 'finanzas' },
  { platform: 'whatsapp', category: 'criptomonedas' },
  { platform: 'whatsapp', category: 'ecommerce' },
  { platform: 'whatsapp', category: 'tecnologia' },
  { platform: 'whatsapp', category: 'inversiones' },
  // Telegram
  { platform: 'telegram', category: 'marketing' },
  { platform: 'telegram', category: 'negocios' },
  { platform: 'telegram', category: 'emprendimiento' },
  { platform: 'telegram', category: 'finanzas' },
  { platform: 'telegram', category: 'criptomonedas' },
  { platform: 'telegram', category: 'trading' },
  // Discord
  { platform: 'discord', category: 'gaming' },
  { platform: 'discord', category: 'marketing' },
  { platform: 'discord', category: 'programacion' },
  { platform: 'discord', category: 'criptomonedas' },
  { platform: 'discord', category: 'comunidad' },
];

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function parseMembers(text) {
  if (!text) return 0;
  const m = text.match(/📈?\s*([\d.,]+)/);
  if (m) {
    return parseInt(m[1].replace(/[.,]/g, ''), 10) || 0;
  }
  // Fallback: any standalone number
  const n = text.match(/([\d.,]+)/);
  return n ? parseInt(n[1].replace(/[.,]/g, ''), 10) || 0 : 0;
}

function detectPlatform($item) {
  const html = $item.html() || '';
  if (/whatsapp/i.test(html)) return 'whatsapp';
  if (/telegram/i.test(html)) return 'telegram';
  if (/discord/i.test(html)) return 'discord';
  if (/signal/i.test(html)) return 'signal';
  if (/facebook/i.test(html)) return 'facebook';
  return 'unknown';
}

/**
 * Scrape a single tag page from igrupos.com.
 *
 * @param {string} platform
 * @param {string} category
 * @returns {Array<{ name, platform, members, description, igruposId, country }>}
 */
async function scrapeTagPage(platform, category) {
  const url = `${IGRUPOS_BASE}/tag/${platform}/${category}`;
  try {
    const { data: html } = await axios.get(url, {
      timeout: 15000,
      headers: {
        'User-Agent': USER_AGENT,
        Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'es-ES,es;q=0.9,en;q=0.8',
        Referer: IGRUPOS_BASE,
      },
    });

    const $ = cheerio.load(html);
    const results = [];

    // Primary selector: .group-item
    $('.group-item').each((_, el) => {
      const $item = $(el);

      // Skip ads
      if ($item.hasClass('anuncio-item')) return;

      const name = $item.find('.group-title').text().trim();
      if (!name) return;

      const description =
        $item.find('.group-description').text().trim() ||
        $item.find('.group-description-more').text().trim();

      // Member count: "📈 [number]" text node
      const itemText = $item.text();
      const members = parseMembers(itemText);

      // Group ID from link
      const link = $item.find('a[href*="grupo/"]').attr('href') || '';
      const idMatch = link.match(/grupo\/(\d+)/);
      const igruposId = idMatch ? idMatch[1] : '';

      // Country from flag image alt
      const flagAlt = $item.find('img[src*="banderas"]').attr('alt') || '';

      // Platform detection
      const detectedPlatform = detectPlatform($item) || platform;

      results.push({
        name: name.slice(0, 120),
        platform: detectedPlatform,
        members,
        description: description.slice(0, 400),
        igruposId,
        country: flagAlt,
        category,
      });
    });

    // Fallback: li-based listings
    if (results.length === 0) {
      $('li').each((_, el) => {
        const $li = $(el);
        const text = $li.text().trim();
        if (text.length < 10 || text.length > 500) return;

        const link = $li.find('a[href*="grupo/"]').attr('href') || '';
        const idMatch = link.match(/grupo\/(\d+)/);
        if (!idMatch) return;

        const name = $li.find('a').first().text().trim() || text.slice(0, 60);
        const members = parseMembers(text);

        results.push({
          name,
          platform,
          members,
          description: '',
          igruposId: idMatch[1],
          country: '',
          category,
        });
      });
    }

    return results;
  } catch (err) {
    if (err.response?.status === 404) return [];
    console.warn(`[iGrupos] Failed ${platform}/${category}: ${err.message}`);
    return [];
  }
}

/**
 * Scrape all configured platform/category combos.
 * @returns {{ results: Array, errors: string[], byPlatform: object }}
 */
async function scrapeAll() {
  const seen = new Map();
  const errors = [];
  const byPlatform = { whatsapp: 0, telegram: 0, discord: 0, signal: 0, facebook: 0, unknown: 0 };

  for (const target of SCRAPE_TARGETS) {
    try {
      const items = await scrapeTagPage(target.platform, target.category);
      for (const item of items) {
        const key = `${item.platform}:${item.igruposId || item.name}`;
        if (!seen.has(key)) {
          seen.set(key, item);
          byPlatform[item.platform] = (byPlatform[item.platform] || 0) + 1;
        }
      }
      console.log(`[iGrupos] ${target.platform}/${target.category}: ${items.length} groups`);
    } catch (err) {
      errors.push(`iGrupos ${target.platform}/${target.category}: ${err.message}`);
    }
    await sleep(RATE_LIMIT_MS);
  }

  return { results: Array.from(seen.values()), errors, byPlatform };
}

module.exports = {
  scrapeTagPage,
  scrapeAll,
  SCRAPE_TARGETS,
  parseMembers,
  detectPlatform,
};
