/**
 * TDirectory Scraper Service — Telegram channel discovery via tdirectory.me.
 *
 * Indexes millions of channels, groups, bots, and stickers with community
 * moderation. Has explicit Spanish-language category sections.
 *
 * URL patterns:
 *   /category/{name}.dhtml  — category page
 *
 * May return 403 with basic headers — uses full browser-like headers and
 * cookie handling for best compatibility.
 *
 * Rate limiting: 4s between requests.
 */

const axios = require('axios');
const cheerio = require('cheerio');

const BASE_URL = 'https://tdirectory.me';
const RATE_LIMIT_MS = 4000;
const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/132.0.0.0 Safari/537.36';

const CATEGORIES = [
  { slug: 'spanish-crypto-groups', label: 'cripto' },
  { slug: 'spanish-finance', label: 'finanzas' },
  { slug: 'spanish-business', label: 'negocios' },
  { slug: 'spanish-marketing', label: 'marketing' },
  { slug: 'spanish-news', label: 'noticias' },
  { slug: 'spanish-education', label: 'educacion' },
  { slug: 'spanish-technology', label: 'tecnologia' },
  { slug: 'crypto', label: 'cripto_global' },
  { slug: 'finance', label: 'finanzas_global' },
  { slug: 'marketing', label: 'marketing_global' },
];

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function parseCount(text) {
  if (!text) return 0;
  const clean = text.replace(/\s/g, '').replace(/,/g, '');
  const m = clean.match(/([\d.]+)\s*([KkMm])?/);
  if (!m) return 0;
  let n = parseFloat(m[1]);
  if (m[2] === 'K' || m[2] === 'k') n *= 1000;
  if (m[2] === 'M' || m[2] === 'm') n *= 1000000;
  return Math.round(n);
}

function extractUsername(href) {
  if (!href) return null;
  // Match t.me/username or /channel/@username or /channel/username
  let m = href.match(/t\.me\/([\w]+)/i);
  if (m) return m[1].toLowerCase();
  m = href.match(/\/channel\/@?([\w]+)/i);
  if (m) return m[1].toLowerCase();
  return null;
}

/**
 * Fetch HTML with full browser headers to bypass light anti-bot.
 */
async function fetchHtml(url) {
  const { data } = await axios.get(url, {
    timeout: 15000,
    headers: {
      'User-Agent': USER_AGENT,
      Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
      'Accept-Language': 'es-ES,es;q=0.9,en-US;q=0.8,en;q=0.7',
      'Accept-Encoding': 'gzip, deflate, br',
      'Cache-Control': 'no-cache',
      Pragma: 'no-cache',
      'Sec-Fetch-Dest': 'document',
      'Sec-Fetch-Mode': 'navigate',
      'Sec-Fetch-Site': 'none',
      'Sec-Fetch-User': '?1',
      'Upgrade-Insecure-Requests': '1',
      Referer: BASE_URL,
    },
    maxRedirects: 3,
  });
  return data;
}

/**
 * Scrape a single category page.
 */
async function scrapeCategory(categorySlug) {
  const url = `${BASE_URL}/category/${categorySlug}.dhtml`;
  try {
    const html = await fetchHtml(url);
    const $ = cheerio.load(html);
    const channels = [];

    // Strategy 1: look for t.me links inside structured containers
    $('a[href*="t.me/"]').each((_, el) => {
      const href = $(el).attr('href') || '';
      const username = extractUsername(href);
      if (!username || username.length < 4) return;
      if (/joinchat|share|addstickers|proxy/i.test(username)) return;

      const container = $(el).closest('div, li, article, tr, .card, .item, .channel');
      const title =
        container.find('h2, h3, h4, h5, .title, .name, strong').first().text().trim() ||
        $(el).text().trim() ||
        username;

      // Look for subscriber count in nearby text
      const containerText = container.text().replace(/\s+/g, ' ');
      const subsMatch = containerText.match(/([\d,.]+\s*[KkMm]?)\s*(?:members?|subscribers?|subs?)/i);
      const subscribers = subsMatch ? parseCount(subsMatch[1]) : 0;

      // Description
      const desc = container.find('p, .description, .desc, .text').first().text().trim();

      channels.push({
        username,
        title: title.slice(0, 120),
        subscribers,
        description: (desc || '').slice(0, 400),
      });
    });

    // Dedupe
    const seen = new Map();
    for (const ch of channels) {
      if (!seen.has(ch.username)) seen.set(ch.username, ch);
    }

    return Array.from(seen.values());
  } catch (err) {
    const status = err.response?.status;
    if (status === 403) {
      console.warn(`[TDirectory] 403 on ${categorySlug} — site may require browser JS`);
    } else if (status === 404) {
      console.warn(`[TDirectory] 404 on ${categorySlug} — category may not exist`);
    } else {
      console.warn(`[TDirectory] Failed ${categorySlug}: ${err.message}`);
    }
    return [];
  }
}

/**
 * Scrape all configured categories.
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
      if (channels.length > 0) {
        console.log(`[TDirectory] ${cat.slug}: ${channels.length} channels`);
      }
    } catch (err) {
      errors.push(`TDirectory ${cat.slug}: ${err.message}`);
    }
    await sleep(RATE_LIMIT_MS);
  }

  return { results: Array.from(seen.values()), errors };
}

module.exports = {
  scrapeCategory,
  scrapeAllCategories,
  CATEGORIES,
  parseCount,
  extractUsername,
};
