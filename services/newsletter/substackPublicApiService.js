/**
 * Newsletter Publication Probe — HTTP reachability + metadata extraction.
 *
 * Originally intended to hit Substack's /api/v1/publication/home endpoint,
 * but that endpoint returns 403 "Not authorized" for all publications as of
 * 2026-04. We fall back to the public HTML page, which is always reachable
 * and exposes enough metadata for our classifier:
 *
 *   - <title>          → publication name
 *   - <meta name="description">, og:description → description
 *   - og:image         → logo/hero
 *   - og:site_name     → provider confirmation
 *   - <html lang>      → language
 *   - Substack-injected `subscriber_count` in the preloaded state (when
 *     the leaderboard badge is visible)
 *
 * The service also doubles as an URL liveness checker — if the fetch 404s,
 * we know the seed URL is stale and flag it so the Canal can be saved with
 * empty crawler.urlPublica and a `_urlDead: true` marker.
 *
 * Rate limiting: 1.5 seconds between calls (play nice with any publisher,
 * not just Substack). Retry: 1 retry after 60s on 429.
 *
 * Note on the filename: this module is still called `substackPublicApiService`
 * for backward compatibility with the orchestrator, but it now works for ANY
 * newsletter URL (Substack, Beehiiv, Ghost, Mailchimp, custom domains…).
 */

const axios = require('axios');
const cheerio = require('cheerio');

const RATE_LIMIT_MS = 1500;
const REQUEST_TIMEOUT_MS = 12000;
const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36';

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Parse a Substack publication URL into its subdomain / custom domain.
 * Still useful for provider detection even though we no longer hit the JSON API.
 */
function parseSubstackUrl(url) {
  if (!url || typeof url !== 'string') return { subdomain: null, customDomain: null };
  try {
    const u = new URL(url);
    const host = u.hostname.toLowerCase();
    const m = host.match(/^([a-z0-9-]+)\.substack\.com$/);
    if (m) return { subdomain: m[1], customDomain: null };
    if (!host.endsWith('.substack.com')) {
      return { subdomain: null, customDomain: host };
    }
    return { subdomain: null, customDomain: null };
  } catch {
    return { subdomain: null, customDomain: null };
  }
}

/**
 * Low-level HTML GET with retry-on-429. Returns { html, status } so callers
 * can distinguish "alive" from "404" from "transient error".
 */
async function getHtmlWithStatus(url) {
  let retries = 0;
  while (retries <= 1) {
    try {
      const res = await axios.get(url, {
        timeout: REQUEST_TIMEOUT_MS,
        maxRedirects: 5,
        validateStatus: () => true, // treat all statuses as non-throwing
        headers: {
          'User-Agent': USER_AGENT,
          Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'Accept-Language': 'es-ES,es;q=0.9,en;q=0.8',
        },
      });
      if (res.status === 429 && retries === 0) {
        await sleep(60000);
        retries++;
        continue;
      }
      return { html: typeof res.data === 'string' ? res.data : '', status: res.status };
    } catch (err) {
      return { html: '', status: 0, error: err.message };
    }
  }
  return { html: '', status: 0 };
}

/**
 * Extract publication metadata from HTML. Works for any newsletter platform
 * (Substack, Beehiiv, Ghost, Mailchimp, Kit) — relies on standard OG/meta tags.
 */
function extractMetadataFromHtml(html, fallbackUrl = '') {
  if (!html || typeof html !== 'string') return null;
  const $ = cheerio.load(html);

  const getMeta = (name) =>
    ($(`meta[name="${name}"]`).attr('content') ||
      $(`meta[property="${name}"]`).attr('content') ||
      '').trim();

  // Title: prefer og:title, fall back to <title>
  let name =
    getMeta('og:title') ||
    getMeta('twitter:title') ||
    ($('title').first().text() || '').trim();
  // Strip common trailing brand noise like "| Substack" / "- Substack"
  name = name.replace(/\s*[|\-–—]\s*Substack\s*$/i, '').trim();

  const description =
    getMeta('og:description') ||
    getMeta('description') ||
    getMeta('twitter:description') ||
    '';

  const logoUrl =
    getMeta('og:image') ||
    getMeta('twitter:image') ||
    '';

  const siteName = getMeta('og:site_name');

  // Language: prefer <html lang>, otherwise og:locale
  const htmlLang = ($('html').attr('lang') || '').slice(0, 2).toLowerCase();
  const ogLocale = (getMeta('og:locale') || '').slice(0, 2).toLowerCase();
  const language = htmlLang || ogLocale || '';

  // Attempt to read a Substack-exposed subscriber count from the preloaded
  // state script (when visible on the public leaderboard).
  let subscribers = 0;
  const preloadedMatch = html.match(/"subscriber_count(?:_display)?":\s*(\d+)/);
  if (preloadedMatch) subscribers = parseInt(preloadedMatch[1], 10) || 0;

  // Author name: only Substack exposes this reliably via meta + JSON
  let author = '';
  const authorMeta = $('meta[name="author"]').attr('content');
  if (authorMeta) author = authorMeta.trim();

  return {
    name: name || '',
    description: description.trim(),
    subscribers,
    logoUrl: logoUrl.trim(),
    author,
    siteName: siteName.trim(),
    language,
    url: fallbackUrl,
  };
}

/**
 * Detect the provider from a URL (used as fallback when og:site_name
 * doesn't mention the platform). Mirrors taxonomyService.detectProvider
 * but is inlined here to avoid a circular require.
 */
function detectProviderFromUrl(url) {
  if (!url) return 'other';
  if (/substack\.com/i.test(url)) return 'substack';
  if (/beehiiv\.com|\.beehiiv\./i.test(url)) return 'beehiiv';
  if (/mailchimp\.com|us\d+\.campaign-archive\.com/i.test(url)) return 'mailchimp';
  if (/ck\.page|kit\.com|convertkit/i.test(url)) return 'kit';
  if (/ghost\.io/i.test(url)) return 'ghost';
  return 'other';
}

/**
 * Strip the Substack boilerplate "Click to read X, a Substack publication…"
 * tail that gets appended to every og:description, which would otherwise
 * skew language detection towards English for any Substack newsletter.
 */
function stripSubstackBoilerplate(description) {
  if (!description) return '';
  return description
    .replace(/\bClick to read.*?Substack[^.]*\.?/i, '')
    .replace(/\bSubstack publication[^.]*\.?/i, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Heuristic language detection. Looks for Spanish vs English markers in
 * the cleaned text. Returns 'es' or 'en'.
 */
function detectLanguageFromText(text) {
  if (!text) return '';
  const blob = text.toLowerCase();
  const spanishMarkers = [
    ' la ', ' las ', ' los ', ' el ', ' una ', ' uno ', ' del ', ' que ',
    ' con ', ' para ', ' por ', ' más ', ' y ', 'ñ', ' semanal ', ' mejor ',
    ' ecosistem', ' startups', ' tecnología', ' negocio', 'español',
  ];
  const englishMarkers = [
    ' the ', ' and ', ' of ', ' for ', ' with ', ' from ', ' about ',
    ' weekly ', ' daily ', ' learn ', ' your ', ' our ', ' this ',
  ];
  let esHits = 0;
  let enHits = 0;
  for (const m of spanishMarkers) if (blob.includes(m)) esHits++;
  for (const m of englishMarkers) if (blob.includes(m)) enHits++;
  if (esHits > enHits) return 'es';
  if (enHits > esHits) return 'en';
  return '';
}

/**
 * High-level: probe a newsletter URL and enrich the seed with live data.
 *
 *   - If the URL 404s, return the seed with _urlDead: true (keeping the
 *     seed's title/description/provider so the Canal still has fallback data).
 *   - If the URL is alive, merge the extracted metadata (title, description,
 *     logo, language, subs when visible) on top of the seed.
 */
async function enrichFromSubstack(seed) {
  if (!seed || !seed.url) return seed;

  const { html, status } = await getHtmlWithStatus(seed.url);
  await sleep(RATE_LIMIT_MS);

  // Dead URL → mark but still allow persistence with seed data
  if (!html || status >= 400) {
    return {
      ...seed,
      provider: seed.provider || detectProviderFromUrl(seed.url),
      idioma: seed.idioma || 'es',
      subscribers: seed.subscribers || 0,
      _urlDead: true,
      _probeStatus: status,
    };
  }

  const meta = extractMetadataFromHtml(html, seed.url);
  if (!meta) {
    return {
      ...seed,
      provider: seed.provider || detectProviderFromUrl(seed.url),
      idioma: seed.idioma || 'es',
      _probeStatus: status,
    };
  }

  // Provider detection: try site name first, fall back to URL rules.
  let provider = seed.provider || 'other';
  const sitename = (meta.siteName || '').toLowerCase();
  if (sitename.includes('substack')) provider = 'substack';
  else if (sitename.includes('beehiiv')) provider = 'beehiiv';
  else if (sitename.includes('ghost')) provider = 'ghost';
  if (provider === 'other') provider = detectProviderFromUrl(seed.url);

  // Language: strip Substack boilerplate from meta description before using
  // it for heuristics. Fall back to <html lang>, then to 'es' (we're harvesting
  // from Spanish-language sources).
  const cleanDesc = stripSubstackBoilerplate(meta.description);
  let idioma = meta.language;
  if (!idioma || idioma === 'en') {
    // meta.language often says "en" on Substack because the template ships
    // with lang="en" — prefer text heuristics on the cleaned description.
    const detected = detectLanguageFromText(`${meta.name} ${cleanDesc}`);
    if (detected) idioma = detected;
    else idioma = seed.idioma || 'es';
  }

  return {
    ...seed,
    title: meta.name || seed.title,
    description: cleanDesc || seed.description || '',
    subscribers: meta.subscribers > 0 ? meta.subscribers : (seed.subscribers || 0),
    logoUrl: meta.logoUrl || '',
    author: meta.author || '',
    provider,
    idioma,
    _enriched: true,
    _urlDead: false,
    _probeStatus: status,
  };
}

/**
 * Quick URL liveness check without extracting metadata.
 * Returns { alive: boolean, status: number }.
 */
async function isUrlAlive(url) {
  const { status } = await getHtmlWithStatus(url);
  return { alive: status >= 200 && status < 400, status };
}

module.exports = {
  parseSubstackUrl,
  enrichFromSubstack,
  extractMetadataFromHtml,
  getHtmlWithStatus,
  isUrlAlive,
  RATE_LIMIT_MS,
};
