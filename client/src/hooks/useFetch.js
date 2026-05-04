import { useState, useEffect, useCallback, useRef } from 'react'

/**
 * useFetch — standardized loader for API calls with proper error surfacing.
 *
 * Replaces the silent `.catch(() => {})` pattern. Distinguishes between
 * "loading", "error" and "loaded with possibly empty data" so the UI can
 * render the right state.
 *
 * Usage:
 *   const { data, loading, error, retry } = useFetch(
 *     () => apiService.getMyChannels(),
 *     [],
 *     { initial: [], select: r => r?.success ? (r.data ?? []) : [] }
 *   )
 *
 *   if (error) return <ErrorBanner message={error} onRetry={retry} />
 */
export function useFetch(fetcher, deps = [], opts = {}) {
  const {
    initial = null,
    select = (r) => (r?.success ? r.data : r),
    errorMessage = 'No se pudieron cargar los datos. Verifica tu conexión.',
    skip = false,
  } = opts

  const [data, setData] = useState(initial)
  const [loading, setLoading] = useState(!skip)
  const [error, setError] = useState(null)
  const [retryKey, setRetryKey] = useState(0)
  const mountedRef = useRef(true)

  useEffect(() => () => { mountedRef.current = false }, [])

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const stableFetcher = useCallback(fetcher, deps)

  useEffect(() => {
    if (skip) { setLoading(false); return }
    let cancelled = false
    setLoading(true)
    setError(null)
    stableFetcher()
      .then((res) => {
        if (cancelled) return
        if (res && typeof res === 'object' && res.success === false) {
          setError(res.message || errorMessage)
          return
        }
        try {
          setData(select(res))
        } catch {
          setError(errorMessage)
        }
      })
      .catch(() => { if (!cancelled) setError(errorMessage) })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [stableFetcher, retryKey, skip, errorMessage, select])

  const retry = useCallback(() => {
    setError(null)
    setRetryKey((k) => k + 1)
  }, [])

  return { data, loading, error, retry, setData }
}

/**
 * useMultiFetch — like useFetch but for several parallel fetchers.
 * Each fetcher is independent: if one fails, others can still succeed.
 * Errors are aggregated; the page can decide whether partial data is usable.
 *
 * Usage:
 *   const { data, loading, errors, hasError, retry } = useMultiFetch({
 *     channels: () => apiService.getMyChannels(),
 *     campaigns: () => apiService.getCreatorCampaigns(),
 *   })
 */
export function useMultiFetch(fetchersMap, deps = []) {
  const [data, setData] = useState({})
  const [loading, setLoading] = useState(true)
  const [errors, setErrors] = useState({})
  const [retryKey, setRetryKey] = useState(0)

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const stableMap = useCallback(() => fetchersMap, deps)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setErrors({})
    const map = stableMap()
    const keys = Object.keys(map)
    Promise.all(keys.map((k) => Promise.resolve()
      .then(() => map[k]())
      .then((res) => ({ k, res, ok: true }))
      .catch(() => ({ k, ok: false }))
    )).then((results) => {
      if (cancelled) return
      const newData = {}
      const newErrors = {}
      results.forEach(({ k, res, ok }) => {
        if (!ok) { newErrors[k] = true; return }
        if (res && typeof res === 'object' && res.success === false) {
          newErrors[k] = true
          return
        }
        newData[k] = res?.success ? res.data : res
      })
      setData(newData)
      setErrors(newErrors)
      setLoading(false)
    })
    return () => { cancelled = true }
  }, [stableMap, retryKey])

  const retry = useCallback(() => setRetryKey((k) => k + 1), [])
  const hasError = Object.keys(errors).length > 0
  const allFailed = hasError && Object.keys(errors).length === Object.keys(fetchersMap).length

  return { data, loading, errors, hasError, allFailed, retry }
}
