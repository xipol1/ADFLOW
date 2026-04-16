/**
 * Lyzem Scraper Service — Telegram channel discovery via lyzem.com search.
 *
 * Replaces the Telemetr.io scraper (blocked by CloudFlare since inception).
 * Lyzem.com is a Telegram search engine that indexes public channels and
 * returns t.me usernames matching arbitrary keywords.
 *
 * Yield is lower than MTProto contacts.Search (~8-15 channels/keyword) but
 * the index is DIFFERENT, so it finds channels that MTProto's prefix-based
 * search misses. Used as a complementary source in massive-seed Phase 1.5.
 *
 * Rate limiting: 3 seconds between queries. No retry on failures — we just
 * log and continue.
 */

const axios = require('axios');
const cheerio = require('cheerio');

const LYZEM_BASE = 'https://lyzem.com/search';
const TME_BASE = 'https://t.me';
const RATE_LIMIT_MS = 3000;
const VALIDATION_DELAY_MS = 400;
const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/132.0.0.0 Safari/537.36';

// Telegram username constraints: 5-32 chars, letters/digits/underscore,
// must start with a letter. Last char is permissive (Telegram allows
// trailing digits but not underscore).
const USERNAME_RE = /^[a-zA-Z][a-zA-Z0-9_]{3,30}[a-zA-Z0-9]$/;

// Usernames to filter out (noise, lyzem's own channels, common dupes)
const BLOCKLIST = new Set([
  'lyzemcom',
  'lyzem',
  'joinchat',
  'share',
  'addstickers',
  'proxy',
  'iv',
]);

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Search lyzem.com for Telegram channels matching a query.
 *
 * @param {string} query — search term (e.g. "bolsa española")
 * @returns {{ results: Array<{ username, title, subscribers }>, error?: string }}
 */
async function searchLyzem(query) {
  const url = `${LYZEM_BASE}?q=${encodeURIComponent(query)}&type=channel`;
  try {
    const { data: html } = await axios.get(url, {
      headers: {
        'User-Agent': USER_AGENT,
        Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'es-ES,es;q=0.9,en;q=0.8',
      },
      timeout: 15000,
    });

    const $ = cheerio.load(html);
    const seen = new Set();
    const results = [];

    $('a[href*="t.me/"]').each((_, el) => {
      const href = $(el).attr('href') || '';
      const m = href.match(/t\.me\/([\w]+)/);
      if (!m) return;

      const username = m[1].toLowerCase();
      if (BLOCKLIST.has(username)) return;
      if (username.length < 4) return;
      if (seen.has(username)) return;

      seen.add(username);

      // Try to pull a title from the surrounding element
      const $el = $(el);
      const container = $el.closest('div, li, article, .result, .card, .item');
      const title =
        container.find('h1, h2, h3, h4, .title, .channel-title').first().text().trim() ||
        $el.text().trim() ||
        username;

      results.push({
        username,
        title: title.slice(0, 120),
        subscribers: 0, // lyzem doesn't expose counts; MTProto enrichment fills this
      });
    });

    return { results };
  } catch (err) {
    return { results: [], error: err.message };
  }
}

/**
 * Validate a Telegram username's FORMAT (cheap, in-memory, no network).
 * Rejects trivial junk like too-short, too-long, or weird-char usernames.
 *
 * @param {string} username
 * @returns {boolean}
 */
function isValidUsername(username) {
  if (!username || typeof username !== 'string') return false;
  const clean = username.replace(/^@/, '').toLowerCase();
  if (clean.length < 5 || clean.length > 32) return false;
  return USERNAME_RE.test(clean);
}

/**
 * Parse a human-readable subscriber count (e.g. "15 453 subscribers",
 * "1.2K members") into a number.
 */
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

/**
 * Validate a Telegram channel by fetching its public t.me page.
 * Much cheaper than MTProto getEntity (no API quota burned) and catches
 * all dead/fake/non-channel usernames before they hit the rate-limited
 * MTProto enrichment phase.
 *
 * t.me returns 200 for everything but the HTML differs:
 *   - Valid channel:  <title>Telegram: View @name</title> + .tgme_page_title non-empty
 *   - Invalid/user:   <title>Telegram: Contact @name</title> + .tgme_page_title empty
 *
 * We accept both channels ("subscribers") and megagroups ("members") for
 * consistency with Phase 3 enrichment, which doesn't reject megagroups.
 *
 * @param {string} username
 * @returns {Promise<{ valid: boolean, title?: string, subscribers?: number,
 *                     type?: 'channel'|'group', reason?: string }>}
 */
async function validateOnTelegram(username) {
  try {
    const { data: html, status } = await axios.get(`${TME_BASE}/${username}`, {
      headers: {
        'User-Agent': USER_AGENT,
        Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'es-ES,es;q=0.9,en;q=0.8',
      },
      timeout: 8000,
      validateStatus: () => true,
      maxRedirects: 2,
    });

    if (status >= 400) {
      return { valid: false, reason: `http-${status}` };
    }

    const $ = cheerio.load(html);
    const title = $('title').text() || '';
    const pageTitle = $('.tgme_page_title').first().text().trim();
    const extra = $('.tgme_page_extra').first().text().trim();

    // "View @" = public channel/group. "Contact @" = user account or 404.
    if (!title.includes('View @')) {
      return { valid: false, reason: 'not-viewable' };
    }

    if (!pageTitle) {
      return { valid: false, reason: 'no-title' };
    }

    const isChannel = /subscribers?\b/i.test(extra);
    const isGroup = /members?\b/i.test(extra);

    if (!isChannel && !isGroup) {
      return { valid: false, reason: 'no-subscribers-text' };
    }

    // Parse the count from whatever term matches
    const countMatch = extra.match(/([\d\s,.]+)\s*(subscribers?|members?)/i);
    const subscribers = countMatch ? parseCount(countMatch[1]) : 0;

    return {
      valid: true,
      title: pageTitle,
      subscribers,
      type: isChannel ? 'channel' : 'group',
    };
  } catch (err) {
    return { valid: false, reason: `http-error:${err.message}` };
  }
}

/**
 * Scrape lyzem.com by running a batch of keyword searches.
 * Dedupes across all queries and optionally validates each candidate
 * against t.me to strip dead/fake/user-account usernames BEFORE they
 * hit the rate-limited MTProto enrichment phase.
 *
 * @param {string[]} keywords — list of search terms
 * @param {object} [options]
 * @param {boolean} [options.validate=true] — run t.me validation pass
 * @param {number} [options.validationDelayMs=400] — delay between t.me requests
 * @returns {{ results: Array, errors: string[], rejectCounts?: object }}
 */
async function scrapeByKeywords(keywords = [], options = {}) {
  const { validate = true, validationDelayMs = VALIDATION_DELAY_MS } = options;

  const seen = new Map();
  const errors = [];

  // ── Phase A: scrape all keywords, dedupe ────────────────────────────
  for (const keyword of keywords) {
    const { results, error } = await searchLyzem(keyword);
    if (error) {
      errors.push(`Lyzem "${keyword}": ${error}`);
    } else {
      for (const ch of results) {
        if (!seen.has(ch.username)) {
          seen.set(ch.username, { ...ch, _keyword: keyword });
        }
      }
    }
    await sleep(RATE_LIMIT_MS);
  }

  // Without validation, return raw scrape results
  if (!validate) {
    return {
      results: Array.from(seen.values()),
      errors,
    };
  }

  // ── Phase B: validate each candidate against t.me ───────────────────
  const validated = [];
  const rejectCounts = {};
  let checked = 0;

  for (const [username, data] of seen) {
    // Format check (free)
    if (!isValidUsername(username)) {
      rejectCounts['invalid-format'] = (rejectCounts['invalid-format'] || 0) + 1;
      continue;
    }

    // t.me HTTP check
    const v = await validateOnTelegram(username);
    checked++;

    if (!v.valid) {
      rejectCounts[v.reason] = (rejectCounts[v.reason] || 0) + 1;
    } else {
      validated.push({
        ...data,
        title: v.title || data.title,
        subscribers: v.subscribers || 0,
        _validated: true,
        _type: v.type,
      });
    }

    await sleep(validationDelayMs);
  }

  return {
    results: validated,
    errors,
    rejectCounts,
    checked,
    scrapeRaw: seen.size,
  };
}

module.exports = {
  searchLyzem,
  scrapeByKeywords,
  isValidUsername,
  validateOnTelegram,
  parseCount,
  BLOCKLIST,
  RATE_LIMIT_MS,
  VALIDATION_DELAY_MS,
};
