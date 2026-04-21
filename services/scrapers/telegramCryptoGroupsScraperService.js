/**
 * TelegramCryptoGroups Scraper — channel discovery via telegramcryptogroups.com.
 *
 * Indexes 1,000+ crypto communities (5M+ combined subscribers) in a single
 * table-based page. Categories include: signals, ICO, news, Bitcoin,
 * Ethereum, education, DeFi, AI, AMA. All rendered server-side (no JS needed).
 *
 * Uses Schema.org markup (BlogPosting, FAQPage) for clean structure.
 * Cloudflare present but no visible CAPTCHA from server-side fetch.
 *
 * Rate limiting: 3s between page requests.
 */

const axios = require('axios');
const cheerio = require('cheerio');

const BASE_URL = 'https://telegramcryptogroups.com';
const RATE_LIMIT_MS = 3000;
const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/132.0.0.0 Safari/537.36';

// Language-specific pages for broader coverage
const PAGES = [
  { url: '/', label: 'main' },
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
  const m = href.match(/t\.me\/([\w]+)/i);
  return m ? m[1].toLowerCase() : null;
}

/**
 * Scrape a single page from telegramcryptogroups.com.
 */
async function scrapePage(pageUrl) {
  const url = pageUrl.startsWith('http') ? pageUrl : `${BASE_URL}${pageUrl}`;
  try {
    const { data: html } = await axios.get(url, {
      timeout: 15000,
      headers: {
        'User-Agent': USER_AGENT,
        Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'es-ES,es;q=0.9,en;q=0.8',
        Referer: BASE_URL,
      },
    });

    const $ = cheerio.load(html);
    const channels = [];

    // Strategy 1: table rows with t.me links
    $('tr').each((_, el) => {
      const $row = $(el);
      const link = $row.find('a[href*="t.me/"]').first();
      if (!link.length) return;

      const href = link.attr('href') || '';
      const username = extractUsername(href);
      if (!username || username.length < 4) return;

      const tds = $row.find('td');
      // Try to extract structured data from table columns
      const title = link.text().trim() ||
        tds.eq(0).text().trim() ||
        tds.eq(1).text().trim() ||
        username;

      // Look for numeric member count in any td
      let subscribers = 0;
      let description = '';
      let category = '';
      tds.each((i, td) => {
        const text = $(td).text().trim();
        // Numeric-looking cell = member count
        if (/^[\d,.\s]+[KkMm]?$/.test(text.replace(/\s/g, '')) && subscribers === 0) {
          subscribers = parseCount(text);
        }
        // Longer text = description
        if (text.length > 40 && !description) {
          description = text.slice(0, 400);
        }
        // Short text with known category keywords
        if (/signals?|defi|news|bitcoin|ethereum|education|ico|ai|ama|shill/i.test(text) && !category) {
          category = text.toLowerCase().trim();
        }
      });

      channels.push({
        username,
        title: title.slice(0, 120),
        subscribers,
        description,
        category,
      });
    });

    // Strategy 2: any container with t.me links (fallback)
    if (channels.length === 0) {
      $('a[href*="t.me/"]').each((_, el) => {
        const href = $(el).attr('href') || '';
        const username = extractUsername(href);
        if (!username || username.length < 4) return;

        const container = $(el).closest('div, li, article, section');
        const title = $(el).text().trim() || username;
        const containerText = container.text().replace(/\s+/g, ' ').trim();
        const subsMatch = containerText.match(/([\d,.]+\s*[KkMm]?)\s*(?:members?|subscribers?)/i);

        channels.push({
          username,
          title: title.slice(0, 120),
          subscribers: subsMatch ? parseCount(subsMatch[1]) : 0,
          description: '',
          category: 'crypto',
        });
      });
    }

    return channels;
  } catch (err) {
    console.warn(`[TelegramCryptoGroups] Failed ${url}: ${err.message}`);
    return [];
  }
}

/**
 * Scrape all configured pages.
 * @returns {{ results: Array, errors: string[] }}
 */
async function scrapeAll() {
  const seen = new Map();
  const errors = [];

  for (const page of PAGES) {
    try {
      const channels = await scrapePage(page.url);
      for (const ch of channels) {
        if (!seen.has(ch.username)) {
          seen.set(ch.username, { ...ch, _page: page.label });
        }
      }
      console.log(`[TelegramCryptoGroups] ${page.label}: ${channels.length} channels`);
    } catch (err) {
      errors.push(`TelegramCryptoGroups ${page.label}: ${err.message}`);
    }
    await sleep(RATE_LIMIT_MS);
  }

  return { results: Array.from(seen.values()), errors };
}

module.exports = {
  scrapePage,
  scrapeAll,
  PAGES,
  parseCount,
  extractUsername,
};
