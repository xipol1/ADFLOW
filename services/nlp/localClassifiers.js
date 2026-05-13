/**
 * Local NLP classifiers — pure functions, no network, no DB.
 *
 * Capa 2 Fase 3 plan calls for a "local-first" enrichment strategy: cheap
 * heuristic features done in-process, expensive features (semantic
 * category, brand safety, buyer intent) delegated to Claude Haiku. This
 * module is the cheap half.
 *
 * Outputs feed into:
 *   - CanalPostObservation.nlp.lang
 *   - CanalPostObservation.nlp.isPromotional       (boolean if confident)
 *   - CanalPostObservation.nlp.promotionalSignals  (array of matched
 *                                                    pattern names)
 * Plus a richer object returned by `runLocalClassifiers` that's passed as
 * grounding context to the LLM call (improves classification quality
 * without adding tokens beyond a small JSON header).
 *
 * Spanish-language-first heuristics: patterns target the wording that
 * appears most often in Spanish-speaking WhatsApp channels (the primary
 * market). English fallbacks included for international content. We
 * intentionally avoid matching purely on the morpheme 'promo' or 'ad'
 * because they're too short and produce false positives in everyday text.
 */

'use strict';

// tinyld: CJS-friendly language detector that returns ISO-639-1 codes
// directly (e.g. 'es', 'en', 'pt'). Picked over franc because franc 6.x
// is ESM-only and breaks Jest's CJS test transform.
const { detect: tinyldDetect } = require('tinyld');

// Promotional pattern catalogue. Each entry: { name, pattern }.
// `name` becomes the signal label persisted on the observation —
// keep stable, downstream filters may key by it.
const PROMOTIONAL_PATTERNS = [
  // Explicit disclosure (highest confidence)
  { name: 'explicit_ad_disclosure', pattern: /\b(?:patrocinad[oa]s?|sponsored|paid\s+promotion|publirreportaje)\b/i },
  { name: 'explicit_collab',        pattern: /\bcolaboraci[oó]n(?:\s+(?:pagada|patrocinada))?\b/i },
  { name: 'affiliate_link',         pattern: /\b(?:afiliad[oa]s?|enlace\s+de\s+afiliad[oa]s?|affiliate)\b/i },
  { name: 'hashtag_ad',             pattern: /(?:^|\s)#(?:ad|advertising|sponsored|paidpartnership|publicidad|colab)\b/i },

  // Discount / offer signals
  { name: 'discount_code',          pattern: /\b(?:c[oó]digo\s+(?:de\s+)?(?:descuento|promocional|promo)|usa\s+(?:el\s+)?c[oó]digo|use\s+code|with\s+code)\b/i },
  { name: 'discount_percentage',    pattern: /\b(?:descuento(?:\s+del?)?|off|save|ahorra)\s*\d{1,2}\s*%/i },
  { name: 'limited_time',           pattern: /\b(?:oferta\s+limitada|por\s+tiempo\s+limitado|solo\s+hoy|limited\s+time|flash\s+sale|black\s+friday|cyber\s+monday)\b/i },
  { name: 'free_offer',             pattern: /\b(?:gratis|free|sin\s+coste|0\s*€|0\s*\$)\b/i },

  // Call-to-action style promotional language
  { name: 'cta_buy',                pattern: /\b(?:compra(?:\s+ya)?|comprar|cómpralo|buy(?:\s+now)?|reserv[ae]|adquirir|adquiérelo)\b/i },
  { name: 'cta_click_link',         pattern: /\b(?:dale\s+click|click\s+(?:aqu[ií]|here)|enlace\s+en\s+(?:bio|perfil)|link\s+in\s+bio|tap\s+the\s+link)\b/i },

  // Emoji signals — alone they're a weak hint, combined they boost confidence
  { name: 'emoji_megaphone',        pattern: /📢/u },
  { name: 'emoji_gift',             pattern: /🎁/u },
  { name: 'emoji_alarm',            pattern: /🚨/u },
  { name: 'emoji_money',            pattern: /💰|💵|💸/u },
  { name: 'emoji_shopping',         pattern: /🛒|🛍️/u },
];

// Discount-code candidates. Standalone alphanumeric uppercase strings of
// length 4-10. Filter out URL fragments and known false positives.
const DISCOUNT_CODE_REGEX = /(?<![A-Z0-9])[A-Z0-9]{4,10}(?![A-Z0-9])/g;
const DISCOUNT_CODE_FALSE_POSITIVES = new Set([
  'HTTP', 'HTTPS', 'HTML', 'HTTPS', 'CSS', 'JSON', 'API', 'SDK', 'IPO',
  'CEO', 'CTO', 'NASDAQ', 'NYSE', 'BTC', 'ETH', 'USD', 'EUR', 'GBP', 'JPY',
  'IBAN', 'IVA', 'CIF', 'DNI', 'NIE', 'NUEVO', 'GRATIS', 'HOY', 'PRO',
  'PROMO', 'OFF', 'NEW', 'TOP', 'BIG', 'BEST',
]);

// Forex / crypto ticker patterns. A 6-letter pure-uppercase string that
// follows `<currency><currency>` is almost always a trading pair (EURUSD,
// BTCEUR, GBPJPY) and almost never a real discount code. We block them at
// the regex layer because the enumerable-list approach is endless.
const TICKER_PAIR_REGEX = /^[A-Z]{3}(?:USD|USDT|USDC|EUR|EURO|GBP|JPY|CHF|CAD|AUD|NZD|MXN|BTC|ETH|BNB|SOL|XRP|ADA|DOT|MATIC|TRX|LINK)$/;

// Hashtag / mention regex. Newsletter posts often use @handles (private
// or unresolvable) and #tags. We extract for downstream stats.
const HASHTAG_REGEX = /(?:^|\s)#([\p{L}\p{N}_]{2,30})/gu;
const MENTION_REGEX = /(?:^|\s)@([\p{L}\p{N}_.]{2,30})/gu;

// Emoji count: rather than maintain a giant Unicode emoji set, we use a
// pragmatic regex covering the dominant emoji blocks. Misses some edge
// cases (flags, compound emoji with ZWJ) but accurate enough for the
// promotional heuristic.
const EMOJI_REGEX = /[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/gu;

/**
 * Detect the dominant language of a body of text.
 * Short texts (<10 chars after stripping) are reported as 'unknown'.
 * tinyld returns ISO-639-1 codes directly (e.g. 'es', 'en'); we surface
 * empty results as 'unknown' to keep the contract stable.
 */
function detectLanguage(text) {
  if (typeof text !== 'string') return { lang: 'unknown', source: 'no-input' };
  const cleaned = text.replace(/\s+/g, ' ').trim();
  if (cleaned.length < 10) return { lang: 'unknown', source: 'too-short' };
  const lang = tinyldDetect(cleaned);
  if (!lang) return { lang: 'unknown', source: 'tinyld-empty' };
  return { lang, source: 'tinyld' };
}

function countEmojis(text) {
  if (typeof text !== 'string') return 0;
  const matches = text.match(EMOJI_REGEX);
  return matches ? matches.length : 0;
}

function extractHashtags(text) {
  if (typeof text !== 'string') return [];
  const tags = [];
  for (const m of text.matchAll(HASHTAG_REGEX)) {
    if (m[1]) tags.push(m[1].toLowerCase());
  }
  return [...new Set(tags)];
}

function extractMentions(text) {
  if (typeof text !== 'string') return [];
  const mentions = [];
  for (const m of text.matchAll(MENTION_REGEX)) {
    if (m[1]) mentions.push(m[1].toLowerCase());
  }
  return [...new Set(mentions)];
}

function extractDiscountCodes(text) {
  if (typeof text !== 'string') return [];
  const codes = new Set();
  for (const m of text.matchAll(DISCOUNT_CODE_REGEX)) {
    const candidate = m[0];
    // Skip if matches a known false positive (currencies, abbreviations, etc.)
    if (DISCOUNT_CODE_FALSE_POSITIVES.has(candidate)) continue;
    // Skip if it's all digits (could be a year, amount, etc.)
    if (/^\d+$/.test(candidate)) continue;
    // Skip 4-char all-letters that are probably acronyms not codes
    if (candidate.length === 4 && /^[A-Z]+$/.test(candidate)) continue;
    // Skip 6-letter forex/crypto ticker pairs (EURUSD, BTCEUR, GBPJPY, …)
    if (TICKER_PAIR_REGEX.test(candidate)) continue;
    codes.add(candidate);
  }
  return [...codes];
}

function extractPromotionalSignals(text) {
  if (typeof text !== 'string') return [];
  const found = [];
  for (const p of PROMOTIONAL_PATTERNS) {
    if (p.pattern.test(text)) found.push(p.name);
  }
  return found;
}

/**
 * Heuristic: a post is "likely promotional" when it triggers either an
 * explicit disclosure signal OR multiple weaker signals.
 */
function isLikelyPromotional(signals, discountCodes) {
  if (!signals || signals.length === 0) return discountCodes && discountCodes.length > 0;
  const explicit = signals.some((s) =>
    s === 'explicit_ad_disclosure' ||
    s === 'explicit_collab' ||
    s === 'affiliate_link' ||
    s === 'hashtag_ad'
  );
  if (explicit) return true;
  // Two or more weaker signals → still promotional
  return signals.length >= 2 || (signals.length >= 1 && discountCodes && discountCodes.length > 0);
}

/**
 * Run all local classifiers in one pass. Returns a structured object that
 * partially maps to the CanalPostObservation.nlp schema fields and
 * additionally exposes signals useful for grounding the LLM prompt.
 *
 * Idempotent. Pure. Safe to call on empty / null strings.
 */
function runLocalClassifiers(text) {
  const safeText = typeof text === 'string' ? text : '';
  const langResult = detectLanguage(safeText);
  const emojiCount = countEmojis(safeText);
  const hashtags = extractHashtags(safeText);
  const mentions = extractMentions(safeText);
  const discountCodes = extractDiscountCodes(safeText);
  const promotionalSignals = extractPromotionalSignals(safeText);
  const promotional = isLikelyPromotional(promotionalSignals, discountCodes);

  return {
    lang: langResult.lang,
    langSource: langResult.source,
    emojiCount,
    hashtags,
    mentions,
    discountCodes,
    promotionalSignals,
    isLikelyPromotional: promotional,
  };
}

module.exports = {
  runLocalClassifiers,
  detectLanguage,
  countEmojis,
  extractHashtags,
  extractMentions,
  extractDiscountCodes,
  extractPromotionalSignals,
  isLikelyPromotional,
  // Exposed for tests + downstream code that wants the raw pattern list
  PROMOTIONAL_PATTERNS,
};
