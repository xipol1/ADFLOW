/**
 * XTEA Scraper Service — Telegram channel discovery via xtea.io category pages.
 *
 * xtea.io indexes 50K+ Telegram channels across categories (crypto, news,
 * tech, education, entertainment). Category pages render server-side HTML
 * with `.channel-card` elements containing t.me links and subscriber counts.
 *
 * Rate limiting: 3s between page requests.
 */

const axios = require('axios');
const cheerio = require('cheerio');

const XTEA_BASE = 'https://xtea.io';
const RATE_LIMIT_MS = 3000;
const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/132.0.0.0 Safari/537.36';

const CATEGORIES = [
  { slug: 'crypto', label: 'cripto' },
  { slug: 'news', label: 'noticias' },
  { slug: 'tech', label: 'tecnologia' },
  { slug: 'education', label: 'educacion' },
  { slug: 'entertainment', label: 'entretenimiento' },
];

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function parseCount(text) {
  if (!text) return 0;
  const clean = text.replace(/\s/g, '').replace(/,/g, '').replace(/\+/g, '');
  const m = clean.match(/([\d.]+)\s*([KkMm])?/);
  if (!m) return 0;
  let n = parseFloat(m[1]);
  if (m[2] === 'K' || m[2] === 'k') n *= 1000;
  if (m[2] === 'M' || m[2] === 'm') n *= 1000000;
  return Math.round(n);
}

function extractUsername(href) {
  if (!href) return null;
  const m = href.match(/t\.me\/([\w]+)/i);
  return m ? m[1].toLowerCase() : null;
}

/**
 * Scrape a single XTEA category page.
 */
async function scrapeCategory(categorySlug) {
  const url = `${XTEA_BASE}/channels/${categorySlug}.html`;
  try {
    const { data: html } = await axios.get(url, {
      timeout: 15000,
      headers: {
        'User-Agent': USER_AGENT,
        Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'es-ES,es;q=0.9,en;q=0.8',
      },
    });

    const $ = cheerio.load(html);
    const channels = [];

    $('.channel-card').each((_, el) => {
      const $card = $(el);
      const href = $card.find('.channel-name a').attr('href') || '';
      const username = extractUsername(href);
      if (!username) return;

      const title = $card.find('.channel-name a').text().trim() || username;
      const subsText = $card.find('.channel-subs').text().trim();
      const subscribers = parseCount(subsText);
      const description = $card.find('.channel-desc').text().trim();

      channels.push({ username, title, subscribers, description });
    });

    // Fallback: scan all t.me links if card selectors didn't match
    if (channels.length === 0) {
      $('a[href*="t.me/"]').each((_, el) => {
        const href = $(el).attr('href') || '';
        const username = extractUsername(href);
        if (!username || username.length < 4) return;
        const container = $(el).closest('div, li, article, tr');
        const title = container.find('h2, h3, h4, strong, .title').first().text().trim() || username;
        channels.push({ username, title, subscribers: 0, description: '' });
      });
    }

    return channels;
  } catch (err) {
    if (err.response?.status === 403 || err.response?.status === 429) {
      console.warn(`[XTEA] Blocked on ${categorySlug}: ${err.response.status}`);
    }
    return [];
  }
}

/**
 * Scrape all XTEA categories.
 * @returns {{ results: Array<{ username, title, subscribers, description, category }>, errors: string[] }}
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
      console.log(`[XTEA] ${cat.slug}: ${channels.length} channels`);
    } catch (err) {
      errors.push(`XTEA ${cat.slug}: ${err.message}`);
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
