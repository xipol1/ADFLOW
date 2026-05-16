/**
 * iGrupos Detail/Search Scraper — name-based recovery for broken iGrupos
 * candidates.
 *
 * The existing igruposScraperService only fetches /tag/{platform}/{category}
 * listings and stores the channel name as a slug. The actual WhatsApp invite
 * link lives on the /grupo/{numericId} detail page, which is not derivable
 * from the slug alone.
 *
 * This module provides the missing pieces:
 *   - searchGroups(query)      — calls /?s={q}, parses listing cards
 *                                returns [{ id, platform, name, snippet }]
 *   - getDetail(id)            — fetches /grupo/{id}, extracts invite link
 *   - recoverByName(name)      — searches, picks best WhatsApp match by
 *                                normalized name similarity, returns detail
 *
 * Rate limiting: 2s between requests. iGrupos is mostly tolerant.
 */

const axios = require('axios');
const cheerio = require('cheerio');

const BASE_URL = 'https://www.igrupos.com';
const RATE_LIMIT_MS = 2000;
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

function normName(text) {
  if (!text) return '';
  return text
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Token-set similarity in [0, 1]. Order-independent, ignores stopwords.
 * Simple Jaccard on word sets after normalization.
 */
function similarity(a, b) {
  const na = normName(a);
  const nb = normName(b);
  if (!na || !nb) return 0;
  if (na === nb) return 1;
  const sa = new Set(na.split(' ').filter((w) => w.length >= 2));
  const sb = new Set(nb.split(' ').filter((w) => w.length >= 2));
  if (sa.size === 0 || sb.size === 0) return 0;
  let inter = 0;
  for (const w of sa) if (sb.has(w)) inter++;
  const union = sa.size + sb.size - inter;
  return inter / union;
}

/**
 * Identify the platform from the icon src in a search result row.
 */
function platformFromImgSrc(src) {
  if (!src) return null;
  const s = src.toLowerCase();
  if (s.includes('whatsapp')) return 'whatsapp';
  if (s.includes('telegram')) return 'telegram';
  if (s.includes('discord')) return 'discord';
  if (s.includes('signal')) return 'signal';
  if (s.includes('facebook')) return 'facebook';
  return null;
}

/**
 * Search iGrupos with the global ?s= parameter. Returns up to ~20 results.
 *
 * @returns {Array<{ id, platform, name, snippet, sourceUrl }>}
 */
async function searchGroups(query) {
  if (!query) return [];
  const url = `${BASE_URL}/?s=${encodeURIComponent(query)}`;
  let html;
  try {
    ({ data: html } = await axios.get(url, {
      timeout: REQUEST_TIMEOUT_MS,
      headers: HEADERS,
      maxRedirects: 3,
    }));
  } catch (err) {
    if (err.response?.status === 404) return [];
    return [];
  }

  const $ = cheerio.load(html);
  const results = [];

  $('a[href^="grupo/"]').each((_, el) => {
    const $a = $(el);
    const href = $a.attr('href') || '';
    const m = href.match(/^grupo\/(\d+)/);
    if (!m) return;

    const id = m[1];

    // Platform from the first image inside the h3
    const $h3 = $a.find('h3').first();
    const $platformImg = $h3.find('img').first();
    const platform = platformFromImgSrc($platformImg.attr('src'));
    if (platform !== 'whatsapp') return; // we only care about WA

    // Name = h3 text minus the platform/flag images
    const nameRaw = $h3
      .clone()
      .find('img')
      .remove()
      .end()
      .text()
      .replace(/\s+/g, ' ')
      .trim();
    if (!nameRaw) return;

    // Snippet = the rest of the <a> text after stripping the h3
    const snippet = $a
      .clone()
      .find('h3')
      .remove()
      .end()
      .find('span[id^="parte2mensaje"]')
      .remove()
      .end()
      .text()
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, 300);

    results.push({
      id,
      platform,
      name: nameRaw,
      snippet,
      sourceUrl: `${BASE_URL}/grupo/${id}`,
    });
  });

  return results;
}

/**
 * Fetch a single /grupo/{id} detail page and extract metadata + invite link.
 */
async function getDetail(id) {
  if (!id || !/^\d+$/.test(String(id))) return { ok: false, reason: 'invalid-id' };
  const url = `${BASE_URL}/grupo/${id}`;
  let html;
  try {
    ({ data: html } = await axios.get(url, {
      timeout: REQUEST_TIMEOUT_MS,
      headers: HEADERS,
      maxRedirects: 3,
      validateStatus: (s) => s >= 200 && s < 400,
    }));
  } catch (err) {
    if (err.response?.status === 404) return { ok: false, reason: '404' };
    return { ok: false, reason: `fetch:${err.message}` };
  }

  // Invite link — appears in onclick=window.open('...') or as plain URL
  let inviteLink = '';
  let channelCode = '';
  let kind = '';
  const ch = html.match(/whatsapp\.com\/channel\/([A-Za-z0-9]+)/i);
  const gr = html.match(/chat\.whatsapp\.com\/(?:invite\/)?([A-Za-z0-9_-]+)/i);
  if (ch) {
    channelCode = ch[1];
    kind = 'channel';
    inviteLink = `https://whatsapp.com/channel/${channelCode}`;
  } else if (gr) {
    channelCode = gr[1];
    kind = 'group';
    inviteLink = `https://chat.whatsapp.com/${channelCode}`;
  }
  if (!channelCode) return { ok: false, reason: 'no-invite', sourceUrl: url };

  const $ = cheerio.load(html);
  const name =
    $('meta[property="og:title"]').attr('content')?.trim() ||
    $('title').text().trim() ||
    '';
  const description =
    $('meta[property="og:description"]').attr('content')?.trim() ||
    $('meta[name="description"]').attr('content')?.trim() ||
    '';
  const image = $('meta[property="og:image"]').attr('content')?.trim() || '';

  return {
    ok: true,
    id,
    channelCode,
    kind,
    name,
    description: description.slice(0, 600),
    inviteLink,
    image,
    sourceUrl: url,
  };
}

/**
 * Recover a candidate's data by name. Returns the best WhatsApp match if
 * similarity meets the threshold, otherwise null.
 *
 * @param {string} candidateName  the name to search for (typically the
 *                                deslugified username or raw_metrics.title)
 * @param {object} opts
 * @param {number} [opts.minSim=0.6]  similarity threshold (0..1)
 */
async function recoverByName(candidateName, { minSim = 0.6 } = {}) {
  const search = await searchGroups(candidateName);
  if (search.length === 0) return { ok: false, reason: 'no-results' };

  // Rank by similarity to the candidate name
  const ranked = search
    .map((r) => ({ ...r, _sim: similarity(candidateName, r.name) }))
    .sort((a, b) => b._sim - a._sim);

  const best = ranked[0];
  if (!best || best._sim < minSim) {
    return {
      ok: false,
      reason: 'low-similarity',
      best_candidate: best ? { id: best.id, name: best.name, sim: best._sim } : null,
      search_results: ranked.length,
    };
  }

  await sleep(RATE_LIMIT_MS);
  const detail = await getDetail(best.id);
  if (!detail.ok) {
    return { ...detail, _searchName: best.name, _sim: best._sim };
  }

  return {
    ...detail,
    _matchedSearchName: best.name,
    _similarity: best._sim,
    _searchResultCount: search.length,
  };
}

module.exports = {
  searchGroups,
  getDetail,
  recoverByName,
  similarity,
  normName,
  BASE_URL,
};
