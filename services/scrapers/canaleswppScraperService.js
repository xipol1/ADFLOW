/**
 * Canaleswpp Scraper — WhatsApp channel discovery via canaleswpp.com / .es.
 *
 * Small but curated directory (~55 channels). Next.js SSR app with two
 * levels:
 *   /sitemap.xml                 — index of category + channel URLs in ES & EN
 *   /{lang}/channel/{slug}       — channel detail page with the real WA invite
 *
 * Each detail page exposes (in server-streamed HTML):
 *   - The whatsapp.com/channel/{id} invite link as a real <a href>
 *   - The exact subscriber count in a title attribute
 *     e.g. title="423828 Suscriptores"
 *   - og:title / meta description for name + description
 *   - Category breadcrumb / sidebar links to /{lang}/category/{slug}
 *
 * Rate limiting: 1.5s between detail requests.
 */

const axios = require('axios');

const BASE_URL = 'https://canaleswpp.com';
const SITEMAP_URL = `${BASE_URL}/sitemap.xml`;
const RATE_LIMIT_MS = 1500;
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
 * Extract the WhatsApp channel ID from a whatsapp.com/channel/{id} URL.
 * WhatsApp IDs are alphanumeric strings ~22 chars, typically prefixed "0029".
 */
function extractChannelId(href) {
  if (!href) return null;
  const m = href.match(/whatsapp\.com\/channel\/([A-Za-z0-9]+)/i);
  return m ? m[1] : null;
}

/**
 * Pull the canonical channel slug from a canaleswpp URL.
 *   /es/channel/illojuan       -> 'illojuan'
 *   /en/channel/illojuan?... -> 'illojuan'
 */
function extractCanaleswppSlug(url) {
  const m = url.match(/\/(?:es|en)\/channel\/([^/?#]+)/i);
  return m ? m[1].toLowerCase() : null;
}

/**
 * Decode HTML entities common in canaleswpp meta tags (&amp; &quot; &#x...).
 * Lightweight — no DOM, no full parser.
 */
function decodeEntities(text) {
  if (!text) return '';
  return text
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(parseInt(d, 10)));
}

/**
 * Fetch the sitemap and return the unique set of channel detail URLs.
 * Picks the Spanish version when both ES and EN exist for the same slug.
 */
async function fetchChannelUrls() {
  const { data: xml } = await axios.get(SITEMAP_URL, {
    timeout: REQUEST_TIMEOUT_MS,
    headers: HEADERS,
  });

  const matches = xml.match(/<loc>([^<]+)<\/loc>/g) || [];
  const bySlug = new Map();

  for (const raw of matches) {
    const url = raw.replace(/<\/?loc>/g, '');
    const slug = extractCanaleswppSlug(url);
    if (!slug) continue;
    // Prefer /es/ over /en/ to keep Spanish-language descriptions
    const existing = bySlug.get(slug);
    if (!existing || (existing.includes('/en/') && url.includes('/es/'))) {
      bySlug.set(slug, url);
    }
  }

  return Array.from(bySlug.values());
}

/**
 * Parse a number rendered as either "423828" or "423.8k" / "1.2M".
 */
function parseFollowers(text) {
  if (!text) return 0;
  const clean = String(text).replace(/[\s,]/g, '');
  const exact = clean.match(/^(\d{3,})(?:$|[^\d])/);
  if (exact) return parseInt(exact[1], 10);
  const m = clean.match(/([\d.]+)\s*([KkMm])/);
  if (!m) return 0;
  let n = parseFloat(m[1]);
  if (m[2].toLowerCase() === 'k') n *= 1000;
  if (m[2].toLowerCase() === 'm') n *= 1_000_000;
  return Math.round(n);
}

/**
 * Scrape a single channel detail page.
 * Returns null on hard failure (404, parse error).
 */
async function scrapeChannel(url) {
  let html;
  try {
    ({ data: html } = await axios.get(url, {
      timeout: REQUEST_TIMEOUT_MS,
      headers: HEADERS,
      maxRedirects: 3,
    }));
  } catch (err) {
    if (err.response?.status === 404) return null;
    console.warn(`[Canaleswpp] Fetch failed ${url}: ${err.message}`);
    return null;
  }

  // ── Invite link (mandatory) ───────────────────────────────────────────
  const inviteMatch = html.match(/whatsapp\.com\/channel\/([A-Za-z0-9]+)/i);
  if (!inviteMatch) return null;
  const channelCode = inviteMatch[1];
  const inviteLink = `https://whatsapp.com/channel/${channelCode}`;

  // ── Exact subscriber count ────────────────────────────────────────────
  // The detail page renders e.g. title=\"423828 Suscriptores\" or
  // \\\"title\\\":\\\"423828 Suscriptores\\\" inside the Next.js stream.
  let followers = 0;
  const subsMatch =
    html.match(/title=\\?"(\d{1,9})\s+Suscriptores/i) ||
    html.match(/"title":"(\d{1,9})\s+Suscriptores/i);
  if (subsMatch) {
    followers = parseInt(subsMatch[1], 10);
  }

  // ── Name (og:title preferred, then <title>) ───────────────────────────
  // Canaleswpp puts the SEO title in both: "Canal de WhatsApp de {Name} | Canales de Whatsapp"
  // Strip the "Canal de WhatsApp de " prefix and the " | Canales de Whatsapp" suffix.
  const stripCanaleswppChrome = (raw) =>
    decodeEntities(raw || '')
      .replace(/\s*\|.*$/, '')
      .replace(/^Canal\s+de\s+WhatsApp\s+de\s+/i, '')
      .trim();

  let name = '';
  const ogTitle = html.match(/<meta[^>]+property=["']og:title["'][^>]+content=["']([^"']+)["']/i);
  if (ogTitle) name = stripCanaleswppChrome(ogTitle[1]);
  if (!name) {
    const titleTag = html.match(/<title>([^<]+)<\/title>/i);
    if (titleTag) name = stripCanaleswppChrome(titleTag[1]);
  }

  // ── Description (og:description, then meta description) ───────────────
  let description = '';
  const ogDesc = html.match(/<meta[^>]+property=["']og:description["'][^>]+content=["']([^"']+)["']/i);
  if (ogDesc) description = decodeEntities(ogDesc[1]).trim();
  if (!description) {
    const metaDesc = html.match(/<meta[^>]+name=["']description["'][^>]+content=["']([^"']+)["']/i);
    if (metaDesc) description = decodeEntities(metaDesc[1]).trim();
  }

  // ── Image ─────────────────────────────────────────────────────────────
  let image = '';
  const ogImg = html.match(/<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i);
  if (ogImg) image = decodeEntities(ogImg[1]).trim();

  // ── Category (first /{lang}/category/{slug} link in the page) ─────────
  let category = '';
  const catMatch = html.match(/\/(?:es|en)\/category\/([a-z0-9-]+)/i);
  if (catMatch) category = catMatch[1].toLowerCase();

  return {
    channelCode,
    slug: extractCanaleswppSlug(url),
    name: name.slice(0, 200),
    followers,
    description: description.slice(0, 600),
    inviteLink,
    image,
    category,
    sourceUrl: url,
    kind: 'channel', // canaleswpp lists only WA Channels (not Groups)
  };
}

/**
 * Scrape every channel listed in the sitemap.
 * @returns {{ results: Array, errors: string[] }}
 */
async function scrapeAll({ maxChannels = 0 } = {}) {
  const errors = [];

  let urls;
  try {
    urls = await fetchChannelUrls();
  } catch (err) {
    return { results: [], errors: [`Canaleswpp sitemap: ${err.message}`] };
  }

  if (maxChannels > 0) urls = urls.slice(0, maxChannels);

  console.log(`[Canaleswpp] ${urls.length} channels to scrape`);

  const seen = new Map();
  let i = 0;
  for (const url of urls) {
    i++;
    try {
      const ch = await scrapeChannel(url);
      if (ch && !seen.has(ch.channelCode)) {
        seen.set(ch.channelCode, ch);
      }
      if (i % 20 === 0) console.log(`[Canaleswpp] ${i}/${urls.length} scraped, ${seen.size} unique`);
    } catch (err) {
      errors.push(`Canaleswpp ${url}: ${err.message}`);
    }
    await sleep(RATE_LIMIT_MS);
  }

  console.log(`[Canaleswpp] Done: ${seen.size} unique channels, ${errors.length} errors`);
  return { results: Array.from(seen.values()), errors };
}

module.exports = {
  scrapeAll,
  scrapeChannel,
  fetchChannelUrls,
  parseFollowers,
  extractChannelId,
  extractCanaleswppSlug,
  BASE_URL,
  SITEMAP_URL,
};
