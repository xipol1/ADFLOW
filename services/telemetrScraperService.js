/**
 * Telemetr.io Scraper Service — channel discovery via HTML scraping.
 *
 * Scrapes telemetr.io/es/channels for Spanish Telegram channels
 * by category. All CSS selectors are isolated as constants for
 * easy maintenance when the HTML layout changes.
 *
 * Rate limiting: 4 seconds between page requests.
 * Retry: 1 retry after 60s on 429.
 */

const axios = require('axios');
const cheerio = require('cheerio');

const TELEMETR_BASE = 'https://telemetr.io/es/channels';
const RATE_LIMIT_MS = 4000;
const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36';

// ─── CSS selectors (isolated for maintenance) ───────────────────────────
const SEL = {
  channelRow: '.channels-rating__item, .channel-card, table tbody tr, .kt-widget4__item',
  channelLink: 'a[href*="/channel/"]',
  channelTitle: '.channel-card__title, .kt-widget4__title, .channels-rating__name, td:nth-child(2)',
  subscriberCount: '.channel-card__subscribers, .kt-widget4__sub, .channels-rating__subs, td:nth-child(3)',
  pagination: 'a.page-link, a[href*="page="], .pagination a',
};

// ─── Category URLs ──────────────────────────────────────────────────────
const CATEGORIES = [
  { slug: 'finance', label: 'finanzas' },
  { slug: 'marketing', label: 'marketing' },
  { slug: 'technology', label: 'tecnologia' },
  { slug: 'crypto', label: 'cripto' },
  { slug: 'health', label: 'salud' },
  { slug: 'education', label: 'educacion' },
];

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function parseSubscribers(text) {
  if (!text) return 0;
  const clean = text.replace(/\s/g, '').replace(/,/g, '.');
  const m = clean.match(/([\d.]+)\s*([KkMm])?/);
  if (!m) return 0;
  let num = parseFloat(m[1]);
  if (m[2] && (m[2] === 'K' || m[2] === 'k')) num *= 1000;
  if (m[2] && (m[2] === 'M' || m[2] === 'm')) num *= 1000000;
  return Math.round(num);
}

function extractUsername(href) {
  if (!href) return null;
  // Match /channel/@username or /channel/username
  const m = href.match(/\/channel\/@?([\w]+)/i);
  return m ? m[1].toLowerCase() : null;
}

/**
 * Scrape a single category page from telemetr.io.
 *
 * @param {string} url — full URL to scrape
 * @returns {Array<{ username, title, subscribers }>}
 */
async function scrapePage(url) {
  let retries = 0;
  while (retries <= 1) {
    try {
      const { data: html } = await axios.get(url, {
        timeout: 15000,
        headers: { 'User-Agent': USER_AGENT },
      });

      const $ = cheerio.load(html);
      const channels = [];

      // Try multiple selector strategies (telemetr changes layout)
      $(SEL.channelRow).each((_, el) => {
        const $el = $(el);
        const link = $el.find(SEL.channelLink).attr('href') || $el.find('a').attr('href') || '';
        const username = extractUsername(link);
        if (!username) return;

        const title =
          $el.find(SEL.channelTitle).first().text().trim() || username;
        const subsText =
          $el.find(SEL.subscriberCount).first().text().trim() || '0';
        const subscribers = parseSubscribers(subsText);

        channels.push({ username, title, subscribers });
      });

      // Fallback: scan all links containing /channel/
      if (channels.length === 0) {
        $('a[href*="/channel/"]').each((_, el) => {
          const href = $(el).attr('href') || '';
          const username = extractUsername(href);
          if (!username || username.length < 3) return;
          const title = $(el).text().trim() || username;
          channels.push({ username, title, subscribers: 0 });
        });
      }

      return channels;
    } catch (err) {
      if (err.response?.status === 429 && retries === 0) {
        console.warn('[Telemetr] Rate limited (429), waiting 60s...');
        await sleep(60000);
        retries++;
        continue;
      }
      console.error(`[Telemetr] Failed to scrape ${url}:`, err.message);
      return [];
    }
  }
  return [];
}

/**
 * Scrape a category across multiple pages.
 *
 * @param {string} categorySlug — telemetr category (e.g. 'finance')
 * @param {number} maxPages — max pages to scrape (default 2)
 * @returns {Array<{ username, title, subscribers }>}
 */
async function scrapeCategory(categorySlug, maxPages = 2) {
  const results = [];

  for (let page = 1; page <= maxPages; page++) {
    const url = `${TELEMETR_BASE}?country=ES&category=${categorySlug}&page=${page}`;
    const pageResults = await scrapePage(url);
    results.push(...pageResults);

    if (pageResults.length === 0) break; // no more pages
    await sleep(RATE_LIMIT_MS);
  }

  return results;
}

/**
 * Scrape all configured categories.
 *
 * @returns {{ results: Array, errors: string[] }}
 */
async function scrapeAllCategories() {
  const seen = new Map();
  const errors = [];

  for (const cat of CATEGORIES) {
    try {
      const channels = await scrapeCategory(cat.slug);
      for (const ch of channels) {
        if (!seen.has(ch.username)) {
          seen.set(ch.username, { ...ch, category: cat.label });
        }
      }
    } catch (err) {
      errors.push(`Telemetr ${cat.slug}: ${err.message}`);
    }
  }

  return { results: Array.from(seen.values()), errors };
}

module.exports = {
  scrapePage,
  scrapeCategory,
  scrapeAllCategories,
  CATEGORIES,
  SEL,
  parseSubscribers,
  extractUsername,
};
