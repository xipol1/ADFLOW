/**
 * WaChannelsFinder Detail-page Scraper — fixes the listing-only scraper.
 *
 * The original wachannelsfinderScraperService captures slugs from category
 * listing pages but never visits each channel's detail page, so it ends up
 * storing HTML-attribute garbage as the channel name and no invite link.
 *
 * This module fetches /channels/{slug}/ directly and extracts everything the
 * listing scraper missed:
 *   - Real channel name (og:title, stripping the SEO chrome)
 *   - WhatsApp invite link from the "Join Channel" CTA button
 *   - Subscriber count (e.g. "25,482 Subscribers")
 *   - Description (og:description / meta description)
 *   - Image URL, category (JSON-LD articleSection), datePublished/Modified
 *   - Language (JSON-LD inLanguage)
 *
 * Rate limiting: 2s between requests (their CDN allows it; verified).
 */

const axios = require('axios');

const BASE_URL = 'https://wachannelsfinder.com';
const RATE_LIMIT_MS = 2000;
const REQUEST_TIMEOUT_MS = 15000;
const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/132.0.0.0 Safari/537.36';

const HEADERS = {
  'User-Agent': USER_AGENT,
  Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  'Accept-Language': 'en-US,en;q=0.9,es;q=0.8',
  'Accept-Encoding': 'gzip, deflate, br',
  Referer: `${BASE_URL}/`,
};

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function decodeEntities(text) {
  if (!text) return '';
  return text
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(parseInt(d, 10)));
}

/**
 * Parse "25,482" / "1.2k" / "3.4M" → integer.
 */
function parseSubscribers(text) {
  if (!text) return 0;
  const clean = String(text).replace(/\s+/g, '');
  // Plain integer with thousand separators ("25,482" / "1.234.567")
  const intMatch = clean.match(/^([\d,.]+)$/);
  if (intMatch) {
    const digits = intMatch[1].replace(/[.,]/g, '');
    if (digits) return parseInt(digits, 10);
  }
  // Suffix form (1.2k, 3.4M)
  const m = clean.match(/([\d.]+)\s*([KkMm])/);
  if (!m) return 0;
  let n = parseFloat(m[1]);
  if (m[2].toLowerCase() === 'k') n *= 1000;
  if (m[2].toLowerCase() === 'm') n *= 1_000_000;
  return Math.round(n);
}

/**
 * Strip the wachannelsfinder SEO chrome from a title.
 *   "TIAA Deals's Official WhatsApp Channel Link - Whatsapp Channels Finder"
 *      → "TIAA Deals"
 *   "Foo Channel - Whatsapp Channels Finder"
 *      → "Foo Channel"
 */
function cleanTitle(raw) {
  if (!raw) return '';
  return decodeEntities(raw)
    .replace(/\s*-\s*Whatsapp Channels Finder\s*$/i, '')
    .replace(/\s*-\s*Channels Finder\s*$/i, '')
    .replace(/['’]s\s+Official WhatsApp Channel Link\s*$/i, '')
    .replace(/\s+Official WhatsApp Channel Link\s*$/i, '')
    .replace(/\s+WhatsApp Channel\s*$/i, '')
    .trim();
}

/**
 * Pull the first <script type="application/ld+json"> blob and parse it.
 * Returns the @graph array (or [] on failure).
 */
function parseJsonLd(html) {
  const blocks = html.match(/<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi) || [];
  for (const block of blocks) {
    const m = block.match(/>([\s\S]*?)<\/script>/i);
    if (!m) continue;
    try {
      const parsed = JSON.parse(m[1].trim());
      const graph = Array.isArray(parsed['@graph']) ? parsed['@graph'] : [parsed];
      return graph;
    } catch {
      // try next block
    }
  }
  return [];
}

/**
 * Build a channel detail URL. The stored slugs may already contain URL-encoded
 * emoji bytes (e.g. %f0%9f%92%af) — pass them through as-is, since wachannelsfinder
 * keeps the same encoding in its own URLs.
 */
function buildDetailUrl(slug) {
  const clean = String(slug || '').replace(/^wa:/, '').replace(/^\/+|\/+$/g, '');
  if (!clean) return null;
  return `${BASE_URL}/channels/${clean}/`;
}

/**
 * Scrape a single detail page by slug.
 * Returns null when the page 404s or has no invite link.
 */
async function scrapeBySlug(slug) {
  const url = buildDetailUrl(slug);
  if (!url) return null;

  let html;
  try {
    ({ data: html } = await axios.get(url, {
      timeout: REQUEST_TIMEOUT_MS,
      headers: HEADERS,
      maxRedirects: 3,
      validateStatus: (s) => s >= 200 && s < 400,
    }));
  } catch (err) {
    if (err.response?.status === 404) return { slug, ok: false, reason: '404', url };
    return { slug, ok: false, reason: `fetch:${err.message}`, url };
  }

  // ── Invite link (mandatory) ───────────────────────────────────────────
  // CTA button: <a href="https://whatsapp.com/channel/0029..."> or chat.whatsapp.com/...
  let channelCode = '';
  let kind = '';
  let inviteLink = '';
  const joinMatch =
    html.match(/<a[^>]+href=["'](https?:\/\/whatsapp\.com\/channel\/[A-Za-z0-9]+)["'][^>]*join_button_clicks/i) ||
    html.match(/<a[^>]+href=["'](https?:\/\/chat\.whatsapp\.com\/[A-Za-z0-9_-]+)["'][^>]*join_button_clicks/i) ||
    html.match(/(https?:\/\/whatsapp\.com\/channel\/[A-Za-z0-9]+)/i) ||
    html.match(/(https?:\/\/chat\.whatsapp\.com\/[A-Za-z0-9_-]+)/i);
  if (joinMatch) {
    inviteLink = joinMatch[1];
    const chMatch = inviteLink.match(/whatsapp\.com\/channel\/([A-Za-z0-9]+)/i);
    const grMatch = inviteLink.match(/chat\.whatsapp\.com\/(?:invite\/)?([A-Za-z0-9_-]+)/i);
    if (chMatch) {
      channelCode = chMatch[1];
      kind = 'channel';
    } else if (grMatch) {
      channelCode = grMatch[1];
      kind = 'group';
    }
  }
  if (!channelCode) return { slug, ok: false, reason: 'no-invite', url };

  // ── Title ─────────────────────────────────────────────────────────────
  let title = '';
  const ogTitle = html.match(/<meta[^>]+property=["']og:title["'][^>]+content=["']([^"']+)["']/i);
  if (ogTitle) title = cleanTitle(ogTitle[1]);
  if (!title) {
    const tt = html.match(/<title>([^<]+)<\/title>/i);
    if (tt) title = cleanTitle(tt[1]);
  }

  // ── Description ───────────────────────────────────────────────────────
  let description = '';
  const ogDesc = html.match(/<meta[^>]+property=["']og:description["'][^>]+content=["']([^"']+)["']/i);
  if (ogDesc) description = decodeEntities(ogDesc[1]).trim();
  if (!description) {
    const md = html.match(/<meta[^>]+name=["']description["'][^>]+content=["']([^"']+)["']/i);
    if (md) description = decodeEntities(md[1]).trim();
  }

  // ── Subscribers (e.g. "25,482 Subscribers") ───────────────────────────
  let followers = 0;
  const subMatch = html.match(/([\d,.]+)\s+(?:Subscribers?|Followers?|Members?)/i);
  if (subMatch) followers = parseSubscribers(subMatch[1]);

  // ── Image ─────────────────────────────────────────────────────────────
  let image = '';
  const ogImg = html.match(/<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i);
  if (ogImg) image = decodeEntities(ogImg[1]).trim();

  // ── Category + dates from JSON-LD (NewsArticle / WebPage) ─────────────
  let category = '';
  let language = '';
  let datePublished = '';
  let dateModified = '';
  const graph = parseJsonLd(html);
  for (const node of graph) {
    const type = node['@type'];
    const types = Array.isArray(type) ? type : [type];
    if (types.includes('NewsArticle') || types.includes('Article')) {
      if (node.articleSection) category = String(node.articleSection).toLowerCase();
      if (node.datePublished) datePublished = node.datePublished;
      if (node.dateModified) dateModified = node.dateModified;
    }
    if (types.includes('WebPage')) {
      if (node.inLanguage) language = String(node.inLanguage).slice(0, 5).toLowerCase();
      if (node.datePublished && !datePublished) datePublished = node.datePublished;
      if (node.dateModified && !dateModified) dateModified = node.dateModified;
    }
  }

  return {
    slug,
    ok: true,
    channelCode,
    kind,
    name: title,
    followers,
    description: description.slice(0, 600),
    inviteLink,
    image,
    category,
    language,
    datePublished,
    dateModified,
    sourceUrl: url,
  };
}

/**
 * Scrape detail pages for a list of slugs sequentially with rate limiting.
 * @param {string[]} slugs — list of stored slugs (with or without wa: prefix)
 * @param {object} opts
 * @param {function} [opts.onProgress] — called as ({ i, total, current, result })
 * @returns {{ results: Array, errors: Array }}
 */
async function scrapeSlugs(slugs, { onProgress } = {}) {
  const results = [];
  const errors = [];
  let i = 0;
  for (const slug of slugs) {
    i++;
    let r = null;
    try {
      r = await scrapeBySlug(slug);
    } catch (err) {
      errors.push({ slug, error: err.message });
    }
    if (r) {
      results.push(r);
      if (!r.ok) errors.push({ slug, error: r.reason });
    }
    if (typeof onProgress === 'function') {
      onProgress({ i, total: slugs.length, current: slug, result: r });
    }
    await sleep(RATE_LIMIT_MS);
  }
  return { results, errors };
}

module.exports = {
  scrapeBySlug,
  scrapeSlugs,
  buildDetailUrl,
  cleanTitle,
  parseSubscribers,
  parseJsonLd,
  BASE_URL,
};
