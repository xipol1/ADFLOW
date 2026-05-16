/**
 * Whts.club Scraper — WhatsApp group & channel discovery via whts.club.
 *
 * User-submitted directory built on DLE (DataLife Engine). Volume is much
 * larger than canaleswpp (~1.5k listings) but data is editorial, not real-time:
 *   - Mostly chat.whatsapp.com/{code} group invites
 *   - Some whatsapp.com/channel/{id} channel invites
 *   - No subscriber counts (only 👍/👎 community votes)
 *
 * Structure:
 *   /sitemap.xml                 — sitemap index
 *   /news_pages.xml              — listing URLs ({id}-{slug}.html)
 *   /{id}-{slug}.html            — listing detail, JSON-LD inside
 *
 * The detail page exposes a clean Schema.org payload with the invite URL,
 * description, image, category breadcrumb, and tags. We parse JSON-LD
 * rather than scraping the rendered HTML.
 *
 * Rate limiting: 1.2s between detail requests.
 */

const axios = require('axios');

const BASE_URL = 'https://whts.club';
const SITEMAP_INDEX_URL = `${BASE_URL}/sitemap.xml`;
const RATE_LIMIT_MS = 1200;
const REQUEST_TIMEOUT_MS = 15000;
const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/132.0.0.0 Safari/537.36';

const HEADERS = {
  'User-Agent': USER_AGENT,
  Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  'Accept-Language': 'es-ES,es;q=0.9,en;q=0.8',
  'Accept-Encoding': 'gzip, deflate, br',
  Referer: BASE_URL,
};

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Group invite (chat.whatsapp.com/{code}) OR Channel invite
 * (whatsapp.com/channel/{id}) → { channelCode, kind }.
 */
function classifyInvite(url) {
  if (!url) return { channelCode: null, kind: null };
  const ch = url.match(/whatsapp\.com\/channel\/([A-Za-z0-9]+)/i);
  if (ch) return { channelCode: ch[1], kind: 'channel' };
  const gr = url.match(/chat\.whatsapp\.com\/(?:invite\/)?([A-Za-z0-9_-]+)/i);
  if (gr) return { channelCode: gr[1], kind: 'group' };
  return { channelCode: null, kind: null };
}

/**
 * Two-letter country code embedded in description text (e.g. "Argentina ar").
 * Whts.club consistently appends ISO-3166-1 alpha-2 codes at the tail of
 * description meta tags. Lightweight heuristic — not authoritative.
 */
function extractCountry(description) {
  if (!description) return '';
  const m = description.match(/\b([a-z]{2})\s*$/i);
  if (!m) return '';
  const code = m[1].toLowerCase();
  // Filter false positives (common 2-letter words)
  if (['de', 'la', 'el', 'en', 'un', 'no', 'es', 'tu', 'mi', 'al', 'lo'].includes(code)) return '';
  return code;
}

/**
 * Fetch the sitemap index → list the sub-sitemap URLs that contain listings.
 * Only news_pages.xml + pages.xml hold listing URLs (others are categories/tags).
 */
async function fetchListingSitemaps() {
  const { data: xml } = await axios.get(SITEMAP_INDEX_URL, {
    timeout: REQUEST_TIMEOUT_MS,
    headers: HEADERS,
  });
  const matches = xml.match(/<loc>([^<]+)<\/loc>/g) || [];
  return matches
    .map((m) => m.replace(/<\/?loc>/g, ''))
    .filter((u) => /news_pages\.xml|pages\.xml/.test(u));
}

/**
 * Fetch the URLs of every listing from the listing sub-sitemaps.
 * URL pattern: /{numericId}-{slug}.html
 */
async function fetchListingUrls() {
  const sitemaps = await fetchListingSitemaps();
  const urls = new Set();

  for (const sm of sitemaps) {
    try {
      const { data: xml } = await axios.get(sm, {
        timeout: REQUEST_TIMEOUT_MS,
        headers: HEADERS,
      });
      const matches = xml.match(/<loc>([^<]+)<\/loc>/g) || [];
      for (const m of matches) {
        const url = m.replace(/<\/?loc>/g, '');
        // Listing URLs are /{digits}-{slug}.html — filter out CMS pages
        if (/\/\d+-[^/]+\.html$/.test(url)) urls.add(url);
      }
    } catch (err) {
      console.warn(`[WhtsClub] Sitemap ${sm} failed: ${err.message}`);
    }
  }

  return Array.from(urls);
}

/**
 * Extract the first JSON-LD block from a listing page.
 * Returns the parsed object (or null).
 */
function parseJsonLd(html) {
  const m = html.match(/<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/i);
  if (!m) return null;
  try {
    return JSON.parse(m[1].trim());
  } catch {
    return null;
  }
}

/**
 * Scrape a single listing detail.
 * Returns null on parse failure / missing invite.
 */
async function scrapeListing(url) {
  let html;
  try {
    ({ data: html } = await axios.get(url, {
      timeout: REQUEST_TIMEOUT_MS,
      headers: HEADERS,
      maxRedirects: 3,
    }));
  } catch (err) {
    if (err.response?.status === 404) return null;
    console.warn(`[WhtsClub] Fetch failed ${url}: ${err.message}`);
    return null;
  }

  const ld = parseJsonLd(html);
  if (!ld) return null;

  // The page uses @graph: [ItemPage, BreadcrumbList].
  const graph = Array.isArray(ld['@graph']) ? ld['@graph'] : [ld];
  const itemPage = graph.find((g) => g['@type'] === 'ItemPage') || graph[0];
  const breadcrumb = graph.find((g) => g['@type'] === 'BreadcrumbList');

  if (!itemPage) return null;

  const main = itemPage.mainEntityOfPage || {};
  const inviteUrl = main.url || '';
  const { channelCode, kind } = classifyInvite(inviteUrl);
  if (!channelCode) return null;

  const name = (itemPage.name || main.name || '').trim();
  const description = (itemPage.description || '').trim();

  // Category from breadcrumb position 2 (position 1 = home, 3 = listing itself)
  let category = '';
  if (breadcrumb && Array.isArray(breadcrumb.itemListElement)) {
    const cat = breadcrumb.itemListElement.find((b) => b.position === 2);
    if (cat?.item?.name) category = cat.item.name.toLowerCase().trim();
  }

  // Tags from JSON-LD "about" array
  const tags = Array.isArray(main.about)
    ? main.about.map((a) => a.name).filter(Boolean)
    : [];

  const image = Array.isArray(itemPage.image) ? itemPage.image[0] : itemPage.image || '';
  const author = main.author?.name || itemPage.publisher?.name || '';
  const datePublished = itemPage.datePublished || main.datePublished || '';
  const dateModified = itemPage.dateModified || main.dateModified || '';
  const country = extractCountry(description);

  return {
    channelCode,
    kind,
    name: name.slice(0, 200),
    followers: 0, // whts.club exposes no subscriber counts
    description: description.slice(0, 600),
    inviteLink: inviteUrl,
    image: image || '',
    category,
    tags,
    country,
    author,
    datePublished,
    dateModified,
    sourceUrl: url,
  };
}

/**
 * Scrape every listing in the sitemap.
 * @returns {{ results: Array, errors: string[] }}
 */
async function scrapeAll({ maxListings = 0 } = {}) {
  const errors = [];

  let urls;
  try {
    urls = await fetchListingUrls();
  } catch (err) {
    return { results: [], errors: [`WhtsClub sitemap: ${err.message}`] };
  }

  if (maxListings > 0) urls = urls.slice(0, maxListings);
  console.log(`[WhtsClub] ${urls.length} listings to scrape`);

  const seen = new Map();
  let i = 0;
  for (const url of urls) {
    i++;
    try {
      const item = await scrapeListing(url);
      if (item && !seen.has(item.channelCode)) {
        seen.set(item.channelCode, item);
      }
      if (i % 100 === 0) {
        console.log(`[WhtsClub] ${i}/${urls.length} scraped, ${seen.size} unique`);
      }
    } catch (err) {
      errors.push(`WhtsClub ${url}: ${err.message}`);
    }
    await sleep(RATE_LIMIT_MS);
  }

  console.log(`[WhtsClub] Done: ${seen.size} unique listings, ${errors.length} errors`);
  return { results: Array.from(seen.values()), errors };
}

module.exports = {
  scrapeAll,
  scrapeListing,
  fetchListingUrls,
  fetchListingSitemaps,
  parseJsonLd,
  classifyInvite,
  extractCountry,
  BASE_URL,
};
