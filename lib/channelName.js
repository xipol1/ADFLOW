/**
 * Channel display-name sanitiser.
 *
 * WhatsApp channels discovered via wachannelsfinder.com were historically
 * poisoned: the site's lazy-load plugin wraps avatars in
 * <noscript><img></noscript>, which cheerio exposes as RAW TEXT, so the old
 * scraper read literal "<img width=...>" markup as the channel name and stored
 * it in Canal.nombreCanal. The scraper is now hardened (services/scrapers/
 * wachannelsfinderScraperService.js → cleanText), but the ingestion path only
 * CREATES new canales and skips existing ones, and discovery has been dead for
 * weeks — so the old markup names were never refreshed and still render as raw
 * "<img ...>" text in the marketplace and rankings.
 *
 * This module is the single source of truth for turning a stored (possibly
 * poisoned) name into a clean display name. It is shared by:
 *   - the controller output (defensive: never serve markup, even un-migrated)
 *   - lib/cleanChannelNames.js (one-off data cleanup)
 *   - scripts/migrate-clean-channel-names.js (CLI runner)
 *
 * The strip + slug-fallback logic mirrors the scraper so a migrated name is
 * identical to what a fresh scrape would now produce.
 */

// Platform prefixes used in identificadorCanal (e.g. "wa:unops-official").
const PLATFORM_PREFIX = /^(?:wa|whatsapp|tg|telegram|dc|discord|ig|instagram|li|linkedin)\s*:\s*/i;
const IMAGE_EXT = /\.(?:avif|png|jpe?g|webp|svg|gif)\b/i;

/**
 * Strip leaked tag markup and collapse whitespace. Identical in spirit to the
 * scraper's cleanText: removes any complete <...> run.
 */
function stripMarkup(s) {
  if (!s) return '';
  return String(s).replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
}

/**
 * Humanise a slug into a display name: "led-tv-spares-sb" -> "Led Tv Spares Sb".
 * Mirrors the scraper's nameFromSlug fallback.
 */
function nameFromSlug(slug) {
  let s = String(slug || '')
    .replace(/^@/, '')              // drop a leading @ first ("@wa:foo")
    .replace(PLATFORM_PREFIX, '');  // then drop the "wa:" / "tg:" prefix
  // Slugs lifted from URLs carry percent-encoded UTF-8 (emojis, accents):
  // "%f0%9f%92%af" → "💯". Decode before humanising so the title-case pass
  // doesn't mangle the hex into "%F0%9f%92%Af". Leave malformed "%" as-is.
  try { s = decodeURIComponent(s); } catch { /* lone % — keep raw */ }
  return s
    .replace(/[<>]/g, ' ')          // never let decoded markup slip through
    .replace(/[-_]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/\b\w/g, (c) => c.toUpperCase())
    .trim();
}

/**
 * True when a stored name is junk that should never be shown: leaked markup
 * (complete OR truncated, e.g. a 120-char slice that cut off before the closing
 * ">"), a bare URL, or a bare image filename. A legitimate channel name never
 * contains "<" or ">".
 */
function looksPolluted(raw) {
  if (!raw) return false; // empty isn't "polluted" — just absent
  const s = String(raw);
  if (/[<>]/.test(s)) return true;
  if (/^https?:\/\//i.test(s.trim())) return true;
  if (IMAGE_EXT.test(s.trim()) && !/\s/.test(s.trim())) return true; // "avatar.png", not "My PNG Channel"
  return false;
}

/**
 * Turn a stored (possibly poisoned) name into a clean display name.
 *
 * 1. If the raw name is usable as-is (no markup/url/image junk), strip any
 *    stray markup and return it.
 * 2. Otherwise derive a humanised name from the identifier slug — the same
 *    fallback the scraper now uses.
 * 3. As a last resort return '' (caller renders a placeholder).
 *
 * @param {string} rawName     value stored in Canal.nombreCanal
 * @param {string} [identifier] Canal.identificadorCanal (e.g. "wa:unops-official")
 * @returns {string} clean display name
 */
function sanitizeChannelName(rawName, identifier = '') {
  const raw = (rawName == null ? '' : String(rawName)).trim();

  if (raw && !looksPolluted(raw)) {
    const stripped = stripMarkup(raw);
    // stripMarkup only removes COMPLETE tags; a salvaged value that still holds
    // a stray "<" (truncated tag) is treated as polluted below.
    if (stripped && !/[<>]/.test(stripped)) return stripped;
  }

  const fromSlug = nameFromSlug(identifier);
  if (fromSlug && fromSlug.length >= 2) return fromSlug;

  // Nothing usable from the identifier — try salvaging the raw as a last resort.
  const salvaged = stripMarkup(raw);
  if (salvaged && !/[<>]/.test(salvaged)) return salvaged;
  return '';
}

module.exports = {
  sanitizeChannelName,
  looksPolluted,
  nameFromSlug,
  stripMarkup,
};
