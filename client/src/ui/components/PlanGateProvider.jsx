import React, { useEffect, useState } from 'react'
import PlanRequiredModal from './PlanRequiredModal'

/**
 * Listens for the global "channelad:plan-required" event fired by the API
 * client whenever an endpoint returns 402 PLAN_REQUIRED and shows the
 * upsell modal. Mount it once near the root of the app.
 */
export default function PlanGateProvider() {
  const [payload, setPayload] = useState(null)

  useEffect(() => {
    const onGate = (e) => setPayload(e?.detail || null)
    window.addEventListener('channelad:plan-required', onGate)
    return () => window.removeEventListener('channelad:plan-required', onGate)
  }, [])

  return <PlanRequiredModal payload={payload} onClose={() => setPayload(null)} />
}
