/**
 * featureFlags.js
 *
 * Feature flag resolution for client-side toggles.
 *
 * Resolution order (first non-null wins):
 *   1. Cookie  (ff_<name>=on|off)            - per-user override (canary, QA)
 *   2. Env var (VITE_FF_<NAME>=on|off)        - build-time default per env
 *   3. Hard-coded default in DEFAULTS         - safety net (always OFF)
 *
 * SSR-safe: returns the hard-coded default when `document` is undefined.
 *
 * Manual override (dev/QA): window.__setFeatureFlag('landingUnification', true)
 * Persists for 30 days via cookie.
 */

const DEFAULTS = {
  // Toggle the unified landing experience: when ON, "/" renders ForBrandsPage
  // (the advertiser-focused main landing). When OFF, "/" renders the legacy
  // LandingPage (kept around in case we need it for a different surface later).
  // Default: ON. Override per-user via cookie ff_landingUnification=off, or
  // per-environment via VITE_FF_LANDING_UNIFICATION=off.
  landingUnification: true,
}

const COOKIE_PREFIX = 'ff_'
const COOKIE_TTL_DAYS = 30

function readCookie(name) {
  if (typeof document === 'undefined') return null
  const target = `${COOKIE_PREFIX}${name}=`
  const parts = document.cookie ? document.cookie.split('; ') : []
  for (const part of parts) {
    if (part.startsWith(target)) {
      try {
        return decodeURIComponent(part.slice(target.length))
      } catch {
        return part.slice(target.length)
      }
    }
  }
  return null
}

function readEnvVar(name) {
  // Vite injects import.meta.env at build time. Guard in case bundler differs.
  try {
    const key = `VITE_FF_${name.replace(/([A-Z])/g, '_$1').toUpperCase()}`
    if (typeof import.meta !== 'undefined' && import.meta.env) {
      const value = import.meta.env[key]
      if (typeof value === 'string' && value.length > 0) return value
    }
  } catch {
    // import.meta unavailable — SSR or non-Vite environment.
  }
  return null
}

function parseBoolean(raw) {
  if (raw === null || raw === undefined) return null
  const v = String(raw).trim().toLowerCase()
  if (v === 'on' || v === 'true' || v === '1' || v === 'yes') return true
  if (v === 'off' || v === 'false' || v === '0' || v === 'no') return false
  return null
}

/**
 * Returns the boolean value of a feature flag.
 * @param {string} name  - flag name (camelCase, e.g. "landingUnification")
 * @returns {boolean}
 */
export function getFeatureFlag(name) {
  const cookieValue = parseBoolean(readCookie(name))
  if (cookieValue !== null) return cookieValue

  const envValue = parseBoolean(readEnvVar(name))
  if (envValue !== null) return envValue

  return Boolean(DEFAULTS[name])
}

/**
 * Sets a feature flag override via cookie. Available on window for QA.
 * @param {string} name
 * @param {boolean} value
 */
export function setFeatureFlag(name, value) {
  if (typeof document === 'undefined') return
  const expires = new Date(Date.now() + COOKIE_TTL_DAYS * 24 * 60 * 60 * 1000).toUTCString()
  const cookieValue = value ? 'on' : 'off'
  // Note: add `; Secure` in production HTTPS environments.
  document.cookie = `${COOKIE_PREFIX}${name}=${cookieValue}; expires=${expires}; path=/; SameSite=Lax`
}

// Expose manual override hook (for QA / canary smoke tests).
if (typeof window !== 'undefined') {
  // eslint-disable-next-line no-underscore-dangle
  window.__setFeatureFlag = setFeatureFlag
}

export default { getFeatureFlag, setFeatureFlag }
