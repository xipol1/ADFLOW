import { useEffect, useState, useCallback } from 'react'
import apiService from '../services/api'

/**
 * usePlan — single source of truth for the user's current subscription on the
 * client. Wraps GET /api/subscriptions/me, exposes the resolved plan key,
 * feature flags, limits and refreshers for after-checkout reload.
 *
 * Returns:
 *   {
 *     planKey, plan: { label, tier, features, limits },
 *     subscription, trialDays,
 *     loading, error, refresh, hasFeature(name), getLimit(key)
 *   }
 *
 * Callers should rely on hasFeature() / getLimit() rather than reading
 * plan.features directly — same fail-closed semantics as lib/plans on the
 * server, so client-side gates can't drift from the source of truth.
 */
export function usePlan() {
  const [state, setState] = useState({ loading: true, error: null, data: null })

  const load = useCallback(async () => {
    try {
      const res = await apiService.getMySubscription()
      if (!res?.success) throw new Error(res?.message || 'No se pudo cargar el plan')
      setState({ loading: false, error: null, data: res })
    } catch (e) {
      setState({ loading: false, error: e?.message || 'Error', data: null })
    }
  }, [])

  useEffect(() => { load() }, [load])

  const data = state.data || {}
  const hasFeature = useCallback(
    (name) => Boolean(data?.plan?.features?.[name]),
    [data]
  )
  const getLimit = useCallback(
    (key) => {
      const v = data?.plan?.limits?.[key]
      return typeof v === 'number' ? v : 0
    },
    [data]
  )

  return {
    planKey: data.planKey || null,
    plan: data.plan || null,
    subscription: data.subscription || null,
    trialDays: data.trialDays || 14,
    loading: state.loading,
    error: state.error,
    refresh: load,
    hasFeature,
    getLimit,
  }
}

export default usePlan
