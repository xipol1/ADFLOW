/**
 * TDirectory Scraper Service — Telegram channel discovery via tdirectory.me.
 *
 * Indexes channels, groups, and bots. The previous category structure
 * (/category/{name}.dhtml) is gone — the site now exposes flat listings:
 *   /channels.html  — top channels
 *   /groups.html    — top groups
 * Each item links to /channel/{username}.dhtml (or /group/{slug}.dhtml).
 *
 * The username in the path is the Telegram t.me/{username}, except invite
 * hashes that start with "+" — those are private invites we skip.
 *
 * Rate limiting: 4s between requests.
 */

const axios = require('axios');
const cheerio = require('cheerio');

const BASE_URL = 'https://tdirectory.me';
const RATE_LIMIT_MS = 4000;
const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/132.0.0.0 Safari/537.36';

const PAGES = [
  { path: '/channels.html', kind: 'channel', label: 'channels' },
  { path: '/groups.html', kind: 'group', label: 'groups' },
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
  m = href.match(/\/(?:channel|group|bot)\/@?([\w+]+)\.dhtml/i);
  if (m) return m[1].toLowerCase();
  m = href.match(/\/(?:channel|group)\/@?([\w]+)/i);
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
 * Scrape a single listing page (e.g. /channels.html or /groups.html).
 *
 * Each item is rendered as `<a href="/channel/X.dhtml" title="X title">`
 * with subscriber count and description in nearby siblings/parent.
 */
async function scrapeListing(pagePath, kind = 'channel') {
  const url = `${BASE_URL}${pagePath}`;
  try {
    const html = await fetchHtml(url);
    const $ = cheerio.load(html);
    const channels = [];

    // Anchors that point to /channel/X.dhtml or /group/X.dhtml
    const linkSelector = kind === 'group'
      ? 'a[href*="/group/"][href*=".dhtml"]'
      : 'a[href*="/channel/"][href*=".dhtml"]';

    $(linkSelector).each((_, el) => {
      const $a = $(el);
      const href = $a.attr('href') || '';
      const username = extractUsername(href);
      if (!username || username.length < 3) return;
      // Skip private invite hashes (start with +)
      if (username.startsWith('+')) return;
      if (/joinchat|share|addstickers|proxy/i.test(username)) return;

      const title =
        $a.attr('title')?.trim() ||
        $a.text().trim() ||
        username;

      // Walk up to find the card/row holding metrics
      const container = $a.closest('div, li, article, tr, td, .card, .item');
      const containerText = container.text().replace(/\s+/g, ' ');
      const subsMatch = containerText.match(/([\d,.]+\s*[KkMm]?)\s*(?:members?|subscribers?|subs?)/i);
      const subscribers = subsMatch ? parseCount(subsMatch[1]) : 0;

      const desc = container.find('p, .description, .desc, .text, small').first().text().trim();

      channels.push({
        username,
        title: title.slice(0, 120),
        subscribers,
        description: (desc || '').slice(0, 400),
        kind,
      });
    });

    // Dedupe within this page
    const seen = new Map();
    for (const ch of channels) {
      if (!seen.has(ch.username)) seen.set(ch.username, ch);
    }

    return Array.from(seen.values());
  } catch (err) {
    const status = err.response?.status;
    if (status === 403) {
      console.warn(`[TDirectory] 403 on ${pagePath} — site may require browser JS`);
    } else if (status === 404) {
      console.warn(`[TDirectory] 404 on ${pagePath} — page may not exist`);
    } else {
      console.warn(`[TDirectory] Failed ${pagePath}: ${err.message}`);
    }
    return [];
  }
}

/**
 * Scrape all configured pages.
 * @returns {{ results: Array, errors: string[] }}
 */
async function scrapeAllCategories() {
  const seen = new Map();
  const errors = [];

  for (const page of PAGES) {
    try {
      const channels = await scrapeListing(page.path, page.kind);
      for (const ch of channels) {
        if (!seen.has(ch.username)) {
          seen.set(ch.username, { ...ch, category: page.label });
        }
      }
      console.log(`[TDirectory] ${page.label}: ${channels.length} items`);
    } catch (err) {
      errors.push(`TDirectory ${page.label}: ${err.message}`);
    }
    await sleep(RATE_LIMIT_MS);
  }

  return { results: Array.from(seen.values()), errors };
}

module.exports = {
  scrapeListing,
  scrapeAllCategories,
  PAGES,
  parseCount,
  extractUsername,
};
