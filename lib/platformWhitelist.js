/**
 * Platform Whitelist — single source of truth for which platforms Channelad
 * accepts as channels.
 *
 * Channels with `plataforma` outside ALLOWED_PLATFORMS are rejected at every
 * entry point (manual declaration, OAuth callbacks, platform-connect tokens,
 * discovery jobs). REJECTED_PLATFORMS exists so we can return a tailored 400
 * message for the platforms users most often try to add but that aren't
 * supported — instead of a generic "unknown platform" error.
 *
 * To add a platform: append to ALLOWED_PLATFORMS, then implement the
 * connector + verification flow in lib/platformConnectors.js. The Canal
 * schema enum will refuse persistence until both are wired.
 */

const ALLOWED_PLATFORMS = Object.freeze([
  'telegram',
  'discord',
  'whatsapp',
  'instagram',
  'facebook',
  'linkedin',
  'newsletter',
]);

// Platforms users frequently ask about but that we deliberately don't
// support. Listed explicitly so the API returns a friendly "not supported"
// instead of falling through to a generic "unknown platform" message.
const REJECTED_PLATFORMS = Object.freeze(['youtube', 'tiktok', 'twitch']);

const ALLOWED_SET = new Set(ALLOWED_PLATFORMS);
const REJECTED_SET = new Set(REJECTED_PLATFORMS);

function normalizePlatform(p) {
  return String(p || '').trim().toLowerCase();
}

function isAllowed(p) {
  return ALLOWED_SET.has(normalizePlatform(p));
}

function isExplicitlyRejected(p) {
  return REJECTED_SET.has(normalizePlatform(p));
}

/**
 * Throws a tagged error if `platform` is not in the whitelist. Callers in
 * controllers should catch the error and surface a 400 with the embedded
 * `code` so the client can localize the message.
 */
function assertAllowed(platform) {
  const p = normalizePlatform(platform);
  if (ALLOWED_SET.has(p)) return p;

  const err = new Error(
    REJECTED_SET.has(p)
      ? `La plataforma "${p}" no está soportada en Channelad.`
      : `Plataforma "${p}" desconocida o no soportada.`
  );
  err.status = 400;
  err.code = REJECTED_SET.has(p) ? 'PLATFORM_NOT_SUPPORTED' : 'PLATFORM_UNKNOWN';
  err.platform = p;
  throw err;
}

module.exports = {
  ALLOWED_PLATFORMS,
  REJECTED_PLATFORMS,
  normalizePlatform,
  isAllowed,
  isExplicitlyRejected,
  assertAllowed,
};
