/**
 * platformDetector — dado un link arbitrario, decide a qué analyzer va.
 *
 * Devuelve { platform, externalId, normalizedUrl } o null si no se reconoce.
 *
 * Plataformas soportadas:
 *   - telegram          → t.me/{username}  (o telegram.me/...)
 *   - telegram_invite   → t.me/+{invite}   (links privados, no se analizan a fondo)
 *   - whatsapp_channel  → whatsapp.com/channel/{slug}
 *   - whatsapp_group    → chat.whatsapp.com/{invite}
 *   - discord           → discord.gg/{code}  o discord.com/invite/{code}
 *   - newsletter        → *.substack.com / *.beehiiv.com / similar
 *
 * NO incluye Instagram / TikTok / YouTube / X — no las soportamos todavía.
 */

const RX = {
  telegram:        /^https?:\/\/(?:www\.)?(?:t|telegram)\.me\/([A-Za-z0-9_]{3,32})(?:\/.*)?$/i,
  telegramInvite:  /^https?:\/\/(?:www\.)?(?:t|telegram)\.me\/\+([A-Za-z0-9_-]+)\/?$/i,
  whatsappChannel: /^https?:\/\/(?:www\.)?whatsapp\.com\/channel\/([A-Za-z0-9_-]+)(?:\/.*)?$/i,
  whatsappGroup:   /^https?:\/\/chat\.whatsapp\.com\/([A-Za-z0-9_-]+)(?:\/.*)?$/i,
  discord:         /^https?:\/\/(?:www\.)?(?:discord\.gg|discord\.com\/invite|discordapp\.com\/invite)\/([A-Za-z0-9_-]+)(?:\/.*)?$/i,
  substack:        /^https?:\/\/([A-Za-z0-9_-]+)\.substack\.com(?:\/.*)?$/i,
  beehiiv:         /^https?:\/\/([A-Za-z0-9_-]+)\.beehiiv\.com(?:\/.*)?$/i,
};

/**
 * Normaliza una URL antes de detectarla:
 *  - trim, lowercase del host
 *  - quita tracking params (utm_*, fbclid, gclid, ref…)
 *  - quita trailing slashes superflouos
 */
function normalizeUrl(rawUrl) {
  if (!rawUrl || typeof rawUrl !== 'string') return null;
  let url;
  try {
    url = new URL(rawUrl.trim());
  } catch {
    return null;
  }

  // Limpiar query params de tracking
  const stripParams = ['fbclid', 'gclid', 'mc_cid', 'mc_eid', 'ref', 'referrer'];
  for (const key of [...url.searchParams.keys()]) {
    if (key.startsWith('utm_') || stripParams.includes(key.toLowerCase())) {
      url.searchParams.delete(key);
    }
  }

  // Lowercase host
  url.hostname = url.hostname.toLowerCase();

  // Quitar trailing slash si no es la raíz
  let out = url.toString();
  if (out.endsWith('/') && url.pathname !== '/') out = out.slice(0, -1);
  return out;
}

/**
 * detectPlatform(url) → { platform, externalId, normalizedUrl } | null
 */
function detectPlatform(rawUrl) {
  const url = normalizeUrl(rawUrl);
  if (!url) return null;

  // Orden importa: invite de telegram va antes que telegram normal
  let m;
  if ((m = url.match(RX.telegramInvite))) {
    return { platform: 'telegram_invite', externalId: m[1], normalizedUrl: url };
  }
  if ((m = url.match(RX.telegram))) {
    return { platform: 'telegram', externalId: m[1], normalizedUrl: url };
  }
  if ((m = url.match(RX.whatsappChannel))) {
    return { platform: 'whatsapp_channel', externalId: m[1], normalizedUrl: url };
  }
  if ((m = url.match(RX.whatsappGroup))) {
    return { platform: 'whatsapp_group', externalId: m[1], normalizedUrl: url };
  }
  if ((m = url.match(RX.discord))) {
    return { platform: 'discord', externalId: m[1], normalizedUrl: url };
  }
  if ((m = url.match(RX.substack))) {
    return { platform: 'newsletter', subtype: 'substack', externalId: m[1], normalizedUrl: url };
  }
  if ((m = url.match(RX.beehiiv))) {
    return { platform: 'newsletter', subtype: 'beehiiv', externalId: m[1], normalizedUrl: url };
  }

  return null;
}

module.exports = { detectPlatform, normalizeUrl };
