/**
 * useFeatures — read deploy-time feature flags from /api/features.
 *
 * The endpoint is public and cached 60s on the CDN; we cache 5min in memory
 * so the SPA only makes the call once per session. Components consume the
 * hook directly; FeatureGate is the declarative wrapper.
 *
 * Usage:
 *   const { features, loading } = useFeatures()
 *   if (!features.whatsapp) return <ComingSoon feature="whatsapp" />
 */
import { useState, useEffect } from 'react'
import apiService from '../services/api'

const TTL_MS = 5 * 60 * 1000

// Module-level cache (survives across mounts during the same session).
let cached = null
let cachedAt = 0
let inflight = null

const DEFAULTS = {
  payments: false,
  telegram: false,
  whatsapp: false,
  r2Storage: false,
  subscriptions: false,
  googleAuth: false,
  pushNotifications: false,
  sentry: false,
}

async function fetchFeatures() {
  const res = await apiService.request('/features', { auth: false })
  return (res && res.success && res.features) ? { ...DEFAULTS, ...res.features } : DEFAULTS
}

export default function useFeatures() {
  const fresh = cached && (Date.now() - cachedAt < TTL_MS)
  const [features, setFeatures] = useState(() => (fresh ? cached : DEFAULTS))
  const [loading, setLoading] = useState(() => !fresh)

  useEffect(() => {
    if (fresh) return
    if (!inflight) {
      inflight = fetchFeatures()
        .then(f => { cached = f; cachedAt = Date.now(); return f })
        .finally(() => { inflight = null })
    }
    let cancelled = false
    inflight.then(f => {
      if (!cancelled) {
        setFeatures(f)
        setLoading(false)
      }
    })
    return () => { cancelled = true }
  }, [fresh])

  return { features, loading }
}
