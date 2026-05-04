/**
 * demographicsService — pulls real audience demographics from whichever
 * platform a Canal has OAuth-connected, normalises the response, and caches
 * it on the Canal document for cheap re-reads.
 *
 * Platforms supported today:
 *   - Instagram Business (via Meta OAuth + instagram_manage_insights scope)
 *   - LinkedIn Organization (via LinkedIn OAuth)
 *
 * Platforms intentionally NOT supported (no public API for demographics):
 *   - Telegram (no API surface)
 *   - WhatsApp (no audience insights)
 *   - Discord (no demographics endpoint)
 *   - LinkedIn personal profiles (requires Marketing partner tier)
 *
 * For unsupported channels the API returns `{ source: null }` and the
 * frontend falls back to its existing client-side estimates.
 *
 * Output shape (consistent across all platforms):
 *   {
 *     source: 'instagram' | 'linkedin_org' | null,
 *     fetchedAt: ISO date string,
 *     fresh: boolean,                   // false if served from cache past TTL
 *     gender: { hombre, mujer, otro }   // proportions 0..1, omitted if N/A
 *     age:    { '18-24', '25-34', ... } // proportions 0..1
 *     countries: { ES: 0.6, MX: 0.2, ... }
 *     cities:    { 'Madrid': 0.4, ... }
 *     languages: { 'es_ES': 0.7, ... }
 *     industries: { 'Tech': 0.3, ... }   // LinkedIn only
 *     seniority:  { 'Senior': 0.4, ... } // LinkedIn only
 *     functions:  { 'Engineering': 0.2 } // LinkedIn only
 *     raw: <platform-native blob>        // for debugging / future extraction
 *   }
 */

const Canal = require('../models/Canal');
const { decrypt } = require('../lib/encryption');
const metaService = require('./metaOAuthService');
const linkedinOrg = require('./linkedinOrgMetricsService');

// 6-hour TTL — demographics drift slowly; this matches the existing
// channel-intelligence cache cadence.
const TTL_MS = 6 * 60 * 60 * 1000;

// ─── Normalisers ─────────────────────────────────────────────────────────────

// Instagram returns gender_age as { 'F.18-24': n, 'M.25-34': n, 'U.35-44': n }
function normalizeIgGenderAge(genderAgeMap) {
  if (!genderAgeMap || typeof genderAgeMap !== 'object') return { gender: null, age: null }

  const genderTotals = { hombre: 0, mujer: 0, otro: 0 }
  const ageTotals    = { '13-17': 0, '18-24': 0, '25-34': 0, '35-44': 0, '45-54': 0, '55-64': 0, '65+': 0 }
  let total = 0

  for (const [key, value] of Object.entries(genderAgeMap)) {
    const n = Number(value) || 0
    if (n <= 0) continue
    const [g, a] = key.split('.')
    total += n
    if (g === 'M') genderTotals.hombre += n
    else if (g === 'F') genderTotals.mujer += n
    else genderTotals.otro += n
    if (ageTotals[a] !== undefined) ageTotals[a] += n
  }

  if (total === 0) return { gender: null, age: null }

  return {
    gender: {
      hombre: round3(genderTotals.hombre / total),
      mujer:  round3(genderTotals.mujer / total),
      otro:   round3(genderTotals.otro / total),
    },
    age: mapValues(ageTotals, n => round3(n / total)),
  }
}

function normalizeIgCountByLabel(map) {
  if (!map || typeof map !== 'object') return null
  const total = Object.values(map).reduce((s, v) => s + (Number(v) || 0), 0)
  if (total === 0) return null
  const out = {}
  for (const [k, v] of Object.entries(map)) {
    const n = Number(v) || 0
    if (n > 0) out[k] = round3(n / total)
  }
  return out
}

// LinkedIn follower stats arrays look like:
//   byGeoCountry: [{ followerCounts: { organicFollowerCount: 123, paidFollowerCount: 0 }, geo: 'urn:li:country:es' }, ...]
function normalizeLiBucket(arr, urnKey) {
  if (!Array.isArray(arr) || arr.length === 0) return null
  let total = 0
  const items = []
  for (const el of arr) {
    const c = (el.followerCounts?.organicFollowerCount || 0) + (el.followerCounts?.paidFollowerCount || 0)
    if (c <= 0) continue
    total += c
    const urn = el[urnKey] || ''
    const label = urn.split(':').pop() // last URN segment as a quick label
    items.push({ label, count: c })
  }
  if (total === 0) return null
  const out = {}
  for (const it of items) out[it.label] = round3(it.count / total)
  return out
}

function round3(n) { return Math.round(Number(n) * 1000) / 1000 }
function mapValues(obj, fn) { const o = {}; for (const k of Object.keys(obj)) o[k] = fn(obj[k]); return o }

// ─── Per-platform fetchers ───────────────────────────────────────────────────

async function fetchInstagramDemographics(canal) {
  const page = canal.metaOAuth?.connectedPages?.find(p => p.instagramBusinessId)
  if (!page) return { ok: false, reason: 'no_instagram_account' }

  const token = decryptSafe(page.pageAccessToken)
  if (!token) return { ok: false, reason: 'no_token' }

  const res = await metaService.fetchInstagramAudienceDemographics(page.instagramBusinessId, token)
  if (!res.ok) return { ok: false, reason: res.error || 'ig_fetch_failed' }
  if (res.insufficientFollowers) {
    return { ok: false, reason: 'insufficient_followers',
      message: 'Instagram solo expone demografía con ≥100 seguidores' }
  }

  const raw = res.demographics || {}
  const { gender, age } = normalizeIgGenderAge(raw.audience_gender_age)
  const countries = normalizeIgCountByLabel(raw.audience_country)
  const cities    = normalizeIgCountByLabel(raw.audience_city)
  const languages = normalizeIgCountByLabel(raw.audience_locale)

  return {
    ok: true,
    payload: {
      source: 'instagram',
      gender, age, countries, cities, languages,
      industries: null, seniority: null, functions: null,
      raw,
    },
  }
}

async function fetchLinkedinDemographics(canal) {
  const orgUrn = canal.identificadores?.linkedinUrn || ''
  if (!orgUrn.includes('organization')) {
    return { ok: false, reason: 'not_an_organization',
      message: 'LinkedIn solo expone demografía para Company Pages, no perfiles personales' }
  }
  const token = decryptSafe(canal.credenciales?.accessToken)
  if (!token) return { ok: false, reason: 'no_token' }

  const res = await linkedinOrg.getOrgFollowerStatistics(token, orgUrn)
  if (!res.ok) return { ok: false, reason: res.scopeMissing ? 'scope_missing' : (res.error || 'li_fetch_failed') }

  const d = res.demographics || {}
  return {
    ok: true,
    payload: {
      source: 'linkedin_org',
      gender: null, age: null, // LinkedIn doesn't expose gender/age for orgs
      countries: normalizeLiBucket(d.byGeoCountry, 'geo'),
      cities:    normalizeLiBucket(d.byGeo, 'geo'),
      languages: null,
      industries: normalizeLiBucket(d.byIndustry, 'industry'),
      seniority:  normalizeLiBucket(d.bySeniority, 'seniority'),
      functions:  normalizeLiBucket(d.byFunction, 'function'),
      raw: d,
    },
  }
}

function decryptSafe(value) {
  if (!value) return ''
  try { return decrypt(value) || value } catch { return value }
}

// ─── Public API ──────────────────────────────────────────────────────────────

/**
 * Get demographics for a canal. Hits the per-platform fetcher when the cache
 * is stale, otherwise returns the cached blob. Always returns something —
 * `source: null` means "no real data available, frontend should fall back to
 * estimates".
 *
 * @param {string} canalId
 * @param {{ force?: boolean }} opts
 */
async function getDemographics(canalId, opts = {}) {
  const canal = await Canal.findById(canalId)
  if (!canal) return { source: null, reason: 'not_found' }

  const cached = canal.demographicsCache
  const cacheFresh = cached?.fetchedAt &&
    (Date.now() - new Date(cached.fetchedAt).getTime() < TTL_MS)

  if (!opts.force && cacheFresh && cached.data) {
    return { ...cached.data, fetchedAt: cached.fetchedAt, fresh: false, cached: true }
  }

  // Decide which platform to query based on what's connected.
  let result = null
  if (canal.metaOAuth?.connectedPages?.some(p => p.instagramBusinessId)) {
    result = await fetchInstagramDemographics(canal)
  } else if (canal.linkedinOAuth?.organizationId || /organization/.test(canal.identificadores?.linkedinUrn || '')) {
    result = await fetchLinkedinDemographics(canal)
  } else {
    return {
      source: null,
      reason: 'no_oauth_connected',
      message: 'Conecta tu cuenta vía OAuth para ver demografía real.',
    }
  }

  if (!result.ok) {
    // Persist the error so the frontend can show why we have no real data.
    await Canal.updateOne({ _id: canalId }, {
      $set: {
        'demographicsCache.lastError': `${result.reason}${result.message ? ': ' + result.message : ''}`,
        'demographicsCache.fetchedAt': new Date(),
      },
    }).catch(() => {})
    return { source: null, reason: result.reason, message: result.message || null }
  }

  const payload = { ...result.payload, fetchedAt: new Date().toISOString(), fresh: true }
  await Canal.updateOne({ _id: canalId }, {
    $set: {
      demographicsCache: {
        source: payload.source,
        fetchedAt: new Date(),
        data: payload,
        lastError: '',
      },
    },
  }).catch(() => {})

  return payload
}

module.exports = {
  getDemographics,
  TTL_MS,
}
