/**
 * Legal manifest (frontend side).
 *
 * Fetches the build-generated manifest at /legal/manifest.json (produced by
 * scripts/legal-build.js, the SAME file the backend reads from config/) and
 * caches it for the session. Drives:
 *   - the role-aware clickwrap checkboxes on the registration form,
 *   - the TermsAcceptanceGate,
 *   - the canonical document viewer.
 *
 * Keeping a single fetched source means the checkbox labels/links and the
 * accepted {slug, version} always match what the backend validates against.
 */
import { useEffect, useState } from 'react'

let _cache = null

export function fetchLegalManifest() {
  if (_cache) return _cache
  _cache = fetch('/legal/manifest.json', { cache: 'no-cache' })
    .then((r) => (r.ok ? r.json() : { documents: {}, required: {} }))
    .catch(() => ({ documents: {}, required: {} }))
  return _cache
}

/**
 * Document entries a role must accept, in order. Uses the role as the manifest
 * key directly (mirrors the backend), so unknown roles → [].
 */
export function requiredDocsForRole(manifest, role) {
  const slugs = manifest?.required?.[role] || []
  return slugs.map((s) => manifest?.documents?.[s]).filter(Boolean)
}

/** {slug, version} pairs for a role — the shape sent in the consent payload. */
export function consentPayloadForRole(manifest, role) {
  return requiredDocsForRole(manifest, role).map((d) => ({ slug: d.slug, version: d.version }))
}

/** React hook: returns the manifest (null while loading). */
export function useLegalManifest() {
  const [manifest, setManifest] = useState(null)
  useEffect(() => {
    let alive = true
    fetchLegalManifest().then((m) => { if (alive) setManifest(m) })
    return () => { alive = false }
  }, [])
  return manifest
}
