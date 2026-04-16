/**
 * OhMyNewst Scraper — HTML scraper for ohmynewst.com's newsletter directory.
 *
 * ohmynewst.com is the largest Spanish-language newsletter directory (30+
 * newsletters with explicit subscriber counts, advertiser-intent curation).
 * They don't expose an API, so we scrape the public listado HTML.
 *
 * Scraping strategy:
 *   1. Fetch /listado-newsletters (single page, no pagination — all cards
 *      are rendered server-side).
 *   2. Parse each card's <h4> title, "X mil Lectores" subscriber count,
 *      category badges, and the detail-page link.
 *   3. Optionally follow the detail page to extract the real external URL
 *      of the newsletter (needed for provider detection + Substack enrichment).
 *
 * Rate limiting: 3s between page requests, same profile as lyzemScraperService.
 * Retry: 1 retry after 60s on 429.
 *
 * Selectors are isolated as constants so they're easy to update when the
 * HTML layout changes (the site is actively maintained).
 */

const axios = require('axios');
const cheerio = require('cheerio');

const OHMYNEWST_BASE = 'https://www.ohmynewst.com';
const LISTADO_URL = `${OHMYNEWST_BASE}/listado-newsletters`;
const RATE_LIMIT_MS = 3000;
const REQUEST_TIMEOUT_MS = 15000;
const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36';

// Recommendation pages add curated lists we also want to consume.
const RECOMMENDATION_URLS = [
  `${OHMYNEWST_BASE}/recomendacion/mejores-newsletters-en-espanol`,
  `${OHMYNEWST_BASE}/recomendacion/mejores-newsletters-de-startups`,
  `${OHMYNEWST_BASE}/recomendacion/mejores-newsletters-de-marketing`,
];

// ─── Selectors (isolated for maintenance) ───────────────────────────────
// Next.js + CSS Modules: class names are hashed like `Card_card__OR4Bn`.
// We match by PREFIX so minor bundler changes don't break the parser.
const SEL = {
  // The whole card is an <a class="Card_card__XXXXX"> that wraps everything
  // (image, title, description, categories, subs).
  cardWrapper: 'a[class*="Card_card__"]',
  // Inside the card:
  cardTitle: 'h4',
  categoryTag: 'div[class*="CategoryTag_category-tag__"]',
  // Look for the external link on the detail page (first anchor that goes
  // off-domain is the newsletter's homepage).
  detailExternalLink: 'a[href^="http"]:not([href*="ohmynewst.com"])',
};

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Parse "X mil Lectores" / "X.Y mil Lectores" / "X M Lectores" to an int.
 *
 *   "920 mil Lectores" → 920000
 *   "138 mil Lectores" → 138000
 *   "1.2 M Lectores"   → 1200000
 *   "29k"              → 29000
 */
function parseSubscribersFromOhmynewst(text) {
  if (!text || typeof text !== 'string') return 0;
  const clean = text.toLowerCase().replace(/\s+/g, ' ').trim();

  // Match "X[.Y] mil", "X[.Y] m", "X[.Y]k"
  let m = clean.match(/([\d.,]+)\s*(mil|m|k)\b/i);
  if (m) {
    const num = parseFloat(m[1].replace(',', '.'));
    const unit = m[2].toLowerCase();
    if (unit === 'mil' || unit === 'k') return Math.round(num * 1000);
    if (unit === 'm') return Math.round(num * 1000000);
  }

  // Bare number
  m = clean.match(/([\d.,]+)/);
  if (m) return parseInt(m[1].replace(/[.,]/g, ''), 10) || 0;

  return 0;
}

/**
 * Low-level HTML GET with retry-on-429.
 */
async function getHtml(url) {
  let retries = 0;
  while (retries <= 1) {
    try {
      const { data } = await axios.get(url, {
        timeout: REQUEST_TIMEOUT_MS,
        headers: {
          'User-Agent': USER_AGENT,
          Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'Accept-Language': 'es-ES,es;q=0.9,en;q=0.8',
        },
      });
      return data;
    } catch (err) {
      const status = err.response?.status;
      if (status === 429 && retries === 0) {
        await sleep(60000);
        retries++;
        continue;
      }
      if (status === 404) return null;
      throw err;
    }
  }
  return null;
}

/**
 * Parse the listado HTML and extract all newsletter cards.
 *
 * @param {string} html
 * @returns {Array<{ title, description, subscribers, rawCategory, detailUrl }>}
 */
function parseListadoHtml(html) {
  const $ = cheerio.load(html);
  const results = [];
  const seen = new Set();

  // Iterate over every card wrapper <a class="Card_card__…">. The wrapper
  // contains the full card (image + right-hand text + bottom row with
  // categories + subs), so its text() is the authoritative blob we scan
  // for subscribers and category labels.
  $(SEL.cardWrapper).each((_, el) => {
    const $card = $(el);
    const detailUrl = ($card.attr('href') || '').trim();
    if (!detailUrl || detailUrl === '/') return;

    // Title: the first <h4> inside the card.
    const $title = $card.find(SEL.cardTitle).first();
    const title = ($title.text() || '').trim();
    if (!title || title.length < 2 || title.length > 120) return;

    // Categories: collect every CategoryTag_category-tag__ div. Filter out
    // bottom-row stats that share the same class (subscriber counts, locked
    // metrics, "y X más..." overflow indicators).
    const categories = [];
    $card.find(SEL.categoryTag).each((_, tagEl) => {
      const txt = $(tagEl)
        .text()
        .replace(/\s+/g, ' ')
        .trim();
      if (!txt || txt.length >= 60) return;
      // Reject subscriber-count cells: "920 mil Lectores", "60k suscriptores"
      if (/\d/.test(txt) && /(mil|lectores|suscriptores|readers)/i.test(txt)) return;
      // Reject locked-metric cells: "🔓 Open Rate", "🔓 CTR", "🔓 Precio"
      if (/🔓|open rate|ctr|precio/i.test(txt)) return;
      // Reject "y X más..." overflow indicators
      if (/^y\s+\d+\s+m[aá]s/i.test(txt)) return;
      categories.push(txt);
    });
    const rawCategory = categories.slice(0, 4).join(', ');

    // Full card text for subscriber + description extraction.
    const cardText = $card.text().replace(/\s+/g, ' ').trim();

    // Subscribers: "920 mil Lectores" / "60k suscriptores" / "1.2 M Lectores".
    // Require the capture to start with a digit so trailing-ellipsis text
    // ("y 1 más...180 mil") doesn't leak "..." into the number.
    const subsMatch = cardText.match(
      /(\d[\d.,]*\s*(?:mil|m|k))\s*(?:lectores|readers|suscriptores)/i,
    );
    const subscribers = subsMatch ? parseSubscribersFromOhmynewst(subsMatch[1]) : 0;

    // Description: strip the title (which appears twice: logo alt + h4) and
    // the trailing "🔓 Open Rate🔓 CTR🔓 Precio" boilerplate + category names
    // to get the actual human description.
    let description = cardText
      .replace(title, '') // remove first occurrence
      .replace(title, '') // remove second occurrence (logo alt)
      .replace(/🔓[^🔓]*?(?:Open Rate|CTR|Precio)/gu, '')
      .replace(/\d[\d.,]*\s*(?:mil|m|k)\s*(?:lectores|readers|suscriptores)/gi, '')
      .replace(/y\s+\d+\s+más\.\.\./gi, '');
    for (const cat of categories) {
      description = description.split(cat).join(' ');
    }
    description = description.replace(/\s+/g, ' ').trim();

    // Skip duplicates
    const key = detailUrl.toLowerCase();
    if (seen.has(key)) return;
    seen.add(key);

    // Skip obvious false positives
    if (/anuncia|listado|recomendacion|^\/tags?$|^\/inicio|^\/login|^\/registro/i.test(detailUrl)) {
      return;
    }

    results.push({
      title,
      description: description.slice(0, 400),
      subscribers,
      rawCategory,
      detailUrl: detailUrl.startsWith('http') ? detailUrl : `${OHMYNEWST_BASE}${detailUrl}`,
    });
  });

  return results;
}

/**
 * Scrape the main /listado-newsletters page.
 *
 * @returns {{ results: Array, errors: string[] }}
 */
async function scrapeListado() {
  const errors = [];
  try {
    const html = await getHtml(LISTADO_URL);
    if (!html) return { results: [], errors: ['[ohmynewst] listado returned empty'] };
    const results = parseListadoHtml(html);
    return { results, errors };
  } catch (err) {
    errors.push(`[ohmynewst] listado: ${err.message}`);
    return { results: [], errors };
  }
}

/**
 * Scrape all editorial recommendation pages (extra curated lists).
 */
async function scrapeRecommendations() {
  const errors = [];
  const seen = new Map();

  for (const url of RECOMMENDATION_URLS) {
    try {
      const html = await getHtml(url);
      if (html) {
        const cards = parseListadoHtml(html);
        for (const card of cards) {
          if (!seen.has(card.detailUrl)) {
            seen.set(card.detailUrl, card);
          }
        }
      }
    } catch (err) {
      errors.push(`[ohmynewst recommendation] ${url}: ${err.message}`);
    }
    await sleep(RATE_LIMIT_MS);
  }

  return { results: Array.from(seen.values()), errors };
}

/**
 * Follow a detail page to extract the external newsletter URL.
 * Returns null if we can't determine one.
 */
async function fetchDetailExternalUrl(detailUrl) {
  try {
    const html = await getHtml(detailUrl);
    if (!html) return null;
    const $ = cheerio.load(html);

    // Strategy 1: look for an external link that is not navigation.
    // ohmynewst detail pages have a prominent "Suscribirse" button or
    // a header link pointing to the real publication.
    let best = null;
    $(SEL.detailExternalLink).each((_, el) => {
      const href = $(el).attr('href') || '';
      if (!href || !/^https?:\/\//i.test(href)) return;
      // Filter out obvious non-publication links (twitter, linkedin, etc).
      if (/twitter\.com|x\.com|linkedin\.com|facebook\.com|instagram\.com|youtube\.com|tiktok\.com|wa\.me|mailto:|t\.me/i.test(href)) {
        return;
      }
      if (!best) best = href;
      // Prefer the first link whose anchor text suggests subscription.
      const anchorText = ($(el).text() || '').toLowerCase();
      if (/suscrib|subscribe|leer|visitar|website|web/i.test(anchorText)) {
        best = href;
        return false; // break
      }
    });

    return best;
  } catch {
    return null;
  }
}

/**
 * Full pipeline: scrape listado + recommendations, dedupe by detailUrl,
 * optionally follow N detail pages to enrich with external URLs.
 *
 * @param {object} options
 * @param {number} options.maxDetailFetches — max detail-page follows (default 60)
 */
async function scrapeAll(options = {}) {
  const maxDetailFetches = options.maxDetailFetches ?? 60;
  const errors = [];
  const all = new Map();

  // Phase 1: listado
  const listado = await scrapeListado();
  for (const card of listado.results) {
    if (!all.has(card.detailUrl)) all.set(card.detailUrl, card);
  }
  errors.push(...listado.errors);
  await sleep(RATE_LIMIT_MS);

  // Phase 2: recommendation pages
  const recs = await scrapeRecommendations();
  for (const card of recs.results) {
    if (!all.has(card.detailUrl)) all.set(card.detailUrl, card);
  }
  errors.push(...recs.errors);

  // Phase 3: follow up to N detail pages to get real external URLs.
  const cards = Array.from(all.values());
  const cardsToEnrich = cards
    .sort((a, b) => (b.subscribers || 0) - (a.subscribers || 0))
    .slice(0, maxDetailFetches);

  for (const card of cardsToEnrich) {
    try {
      const externalUrl = await fetchDetailExternalUrl(card.detailUrl);
      if (externalUrl) card.url = externalUrl;
    } catch (err) {
      errors.push(`[ohmynewst detail ${card.detailUrl}] ${err.message}`);
    }
    await sleep(RATE_LIMIT_MS);
  }

  return {
    results: Array.from(all.values()),
    errors,
  };
}

module.exports = {
  scrapeListado,
  scrapeRecommendations,
  fetchDetailExternalUrl,
  scrapeAll,
  parseListadoHtml,
  parseSubscribersFromOhmynewst,
  SEL,
  OHMYNEWST_BASE,
  RECOMMENDATION_URLS,
};
