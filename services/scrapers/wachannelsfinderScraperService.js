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
 * Strip leaked tag markup and collapse whitespace.
 *
 * The site's lazy-load plugin wraps avatars in <noscript><img></noscript>,
 * which cheerio (htmlparser2) exposes as RAW TEXT. Reading such an anchor's
 * .text() therefore returns a literal "<img ...>" string — this was the
 * historical bug that poisoned every scraped `name`. cleanText() removes any
 * <...> run so a leaked tag can never reach the stored name.
 */
function cleanText(s) {
  if (!s) return '';
  return String(s).replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
}

/**
 * Humanise a slug into a fallback display name:
 * "led-tv-spares-sb" -> "Led Tv Spares Sb".
 */
function nameFromSlug(slug) {
  return String(slug || '')
    .replace(/[-_]+/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase())
    .trim();
}

/**
 * Extract the WhatsApp channel/group slug from a wachannelsfinder URL.
 * The directory uses both /channels/{slug}/ and /group/{slug}/ paths.
 */
function extractChannelSlug(href) {
  if (!href) return null;
  const m = href.match(/\/(?:channels?|groups?)\/([^/]+)\/?$/i);
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
    const bySlug = new Map();

    // Anchor on the canonical name heading (h2/h3.channel-name) whose <a> links
    // to /channels/{slug}/ or /group/{slug}/. We deliberately DON'T iterate the
    // avatar anchor: it wraps a lazy-load <noscript><img></noscript> that cheerio
    // exposes as raw text, so its .text() is literal "<img ...>" markup. If the
    // site ever drops the heading class we fall back to raw channel/group anchors
    // (cleanText still strips any leaked markup).
    const headings = $('h2.channel-name, h3.channel-name');
    const useFallback = headings.length === 0;
    const iter = useFallback
      ? $('a[href*="/channels/"], a[href*="/group/"]')
      : headings;

    iter.each((_, el) => {
      const $el = $(el);
      const $a = useFallback ? $el : $el.find('a[href]').first();
      const href = $a.attr('href') || '';
      const slug = extractChannelSlug(href);
      if (!slug) return;
      // Skip taxonomy/navigation links
      if (/\/(?:channels?|groups?)\/?$/i.test(href) || /\/(?:category|country|language|page|tag)\//i.test(href)) return;

      // Card details block (holds the subscriber count) and its wrapper (holds the avatar).
      const details = $a.closest('.p-3, article, li, div');
      const card = details.parent();

      // Name: heading text is clean; sanitise to drop any leaked markup, then
      // fall back to the avatar alt (minus the " Whatsapp Group link" suffix),
      // then to a humanised slug. Never store empty or markup.
      let name = cleanText($a.text());
      if (!name || name.length < 2 || /^https?:/i.test(name) || /\.(?:avif|png|jpe?g|webp|svg)/i.test(name)) {
        name = cleanText(card.find('img[alt]').first().attr('alt') || '');
      }
      name = name.replace(/\s+whats?app\s+(?:group|channel)\s+link$/i, '').trim();
      if (!name || name.length < 2) name = nameFromSlug(slug);

      // Followers: the count renders as a bare number inside <span class="text-muted">
      // after an SVG icon (no "followers" label), so the old keyword regex never
      // matched. Read that span directly; fall back to a labelled regex.
      let followers = 0;
      const subsSpan = details.find('span.text-muted').first();
      if (subsSpan.length) followers = parseFollowers(cleanText(subsSpan.text()));
      if (!followers) {
        const m = cleanText(details.text()).match(/([\d,.]+\s*[KkMm]?)\s*(?:followers?|members?|subscribers?|seguidores?)/i);
        if (m) followers = parseFollowers(m[1]);
      }

      const description = cleanText(
        details.find('p, .excerpt, .description, .entry-summary').first().text(),
      ).slice(0, 400);

      if (!bySlug.has(slug)) {
        bySlug.set(slug, {
          slug,
          name: name.slice(0, 120),
          followers,
          description,
          sourceUrl: href.startsWith('http') ? href : `${BASE_URL}${href}`,
        });
      } else if (followers > 0) {
        const existing = bySlug.get(slug);
        if (!existing.followers) existing.followers = followers;
      }
    });

    const channels = Array.from(bySlug.values());

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
