/**
 * WaChannelsFinder Scraper — WhatsApp channel discovery via wachannelsfinder.com.
 *
 * WordPress-based directory with 100+ categories, country filters, and
 * clean URL patterns:
 *   /category/{slug}/               — by category
 *   /country/{slug}/                — by country
 *   /category/{cat}/country/{co}/   — combined
 *   /category/{cat}/page/{n}/       — pagination
 *
 * Channels listed as anchor cards: a[href*="/channels/"] with h2/h3 titles.
 *
 * Rate limiting: 3s between page requests.
 */

const axios = require('axios');
const cheerio = require('cheerio');

const BASE_URL = 'https://wachannelsfinder.com';
const RATE_LIMIT_MS = 3000;
const MAX_PAGES_PER_CATEGORY = 5;
const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/132.0.0.0 Safari/537.36';

const CATEGORIES = [
  { slug: 'business', label: 'negocios' },
  { slug: 'technology', label: 'tecnologia' },
  { slug: 'news', label: 'noticias' },
  { slug: 'education', label: 'educacion' },
  { slug: 'entertainment', label: 'entretenimiento' },
  { slug: 'finance', label: 'finanzas' },
  { slug: 'marketing', label: 'marketing' },
  { slug: 'cryptocurrency', label: 'cripto' },
  { slug: 'sports', label: 'deportes' },
  { slug: 'health', label: 'salud' },
];

// Country slugs for Spanish-speaking markets
const COUNTRIES = ['spain', 'mexico', 'argentina', 'colombia'];

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
 * Extract WhatsApp channel slug from a wachannelsfinder URL.
 */
function extractChannelSlug(href) {
  if (!href) return null;
  const m = href.match(/\/channels\/([^/]+)\/?$/);
  return m ? m[1].toLowerCase() : null;
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
        Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'es-ES,es;q=0.9,en;q=0.8',
        Referer: BASE_URL,
      },
    });

    const $ = cheerio.load(html);
    const channels = [];

    // Primary: anchor cards linking to /channels/{slug}/
    $('a[href*="/channels/"]').each((_, el) => {
      const $a = $(el);
      const href = $a.attr('href') || '';
      const slug = extractChannelSlug(href);
      if (!slug) return;

      // Skip navigation/category links
      if (/^\/channels\/?$/.test(href) || /category|country|language|page/.test(href)) return;

      const title =
        $a.find('h2, h3, h4').first().text().trim() ||
        $a.text().trim();
      if (!title || title.length < 2) return;

      // Look for follower/member count in surrounding text
      const container = $a.closest('article, div, li');
      const containerText = container.text().replace(/\s+/g, ' ');
      const followersMatch = containerText.match(/([\d,.]+[KkMm]?)\s*(?:followers?|members?|seguidores?)/i);
      const followers = followersMatch ? parseFollowers(followersMatch[1]) : 0;

      // Description from container or meta
      const description =
        container.find('p, .excerpt, .description, .entry-summary').first().text().trim() || '';

      channels.push({
        slug,
        name: title.slice(0, 120),
        followers,
        description: description.slice(0, 400),
        sourceUrl: href.startsWith('http') ? href : `${BASE_URL}${href}`,
      });
    });

    // Check for next page
    const nextPage = $('a.next, a[rel="next"], .nav-next a, .pagination a:contains("Next")').attr('href');
    const hasMore = !!nextPage;

    return { channels, hasMore };
  } catch (err) {
    if (err.response?.status === 404) return { channels: [], hasMore: false };
    console.warn(`[WaChannelsFinder] Failed ${url}: ${err.message}`);
    return { channels: [], hasMore: false };
  }
}

/**
 * Scrape a category with pagination.
 */
async function scrapeCategory(categorySlug, country = null, maxPages = MAX_PAGES_PER_CATEGORY) {
  const results = [];
  for (let page = 1; page <= maxPages; page++) {
    let url = `${BASE_URL}/category/${categorySlug}/`;
    if (country) url = `${BASE_URL}/category/${categorySlug}/country/${country}/`;
    if (page > 1) url += `page/${page}/`;

    const { channels, hasMore } = await scrapePage(url);
    results.push(...channels);

    if (!hasMore || channels.length === 0) break;
    await sleep(RATE_LIMIT_MS);
  }
  return results;
}

/**
 * Scrape all categories across Spanish-speaking countries.
 * @returns {{ results: Array, errors: string[] }}
 */
async function scrapeAll() {
  const seen = new Map();
  const errors = [];

  for (const cat of CATEGORIES) {
    // Global (no country filter)
    try {
      const channels = await scrapeCategory(cat.slug);
      for (const ch of channels) {
        if (!seen.has(ch.slug)) {
          seen.set(ch.slug, { ...ch, category: cat.label });
        }
      }
      console.log(`[WaChannelsFinder] ${cat.slug}: ${channels.length} channels`);
    } catch (err) {
      errors.push(`WaChannelsFinder ${cat.slug}: ${err.message}`);
    }
    await sleep(RATE_LIMIT_MS);

    // Spanish-speaking countries
    for (const country of COUNTRIES) {
      try {
        const channels = await scrapeCategory(cat.slug, country, 2);
        for (const ch of channels) {
          if (!seen.has(ch.slug)) {
            seen.set(ch.slug, { ...ch, category: cat.label, country });
          }
        }
        if (channels.length > 0) {
          console.log(`[WaChannelsFinder] ${cat.slug}/${country}: ${channels.length} channels`);
        }
      } catch (err) {
        errors.push(`WaChannelsFinder ${cat.slug}/${country}: ${err.message}`);
      }
      await sleep(RATE_LIMIT_MS);
    }
  }

  return { results: Array.from(seen.values()), errors };
}

module.exports = {
  scrapePage,
  scrapeCategory,
  scrapeAll,
  CATEGORIES,
  COUNTRIES,
  parseFollowers,
  extractChannelSlug,
};
