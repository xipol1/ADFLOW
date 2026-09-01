import React from 'react'
import { Sparkles } from 'lucide-react'
import { usePlan } from '../../hooks/usePlan'
import { PURPLE, purpleAlpha, FONT_BODY as F } from '../theme/tokens'

/**
 * Tells a beta user that their Pro plan is a courtesy of the programme, not
 * something they bought.
 *
 * Without this the courtesy grant is invisible until the day it disappears.
 * Saying it up front is what makes the eventual downgrade fair rather than a
 * surprise — and it stops a beta tester assuming Pro is simply free forever.
 *
 * Renders nothing for paying customers and for free plans: `grantedReason`
 * is only 'beta' on subscriptions written by lib/betaGrant.js.
 */
export default function BetaProBanner() {
  const { subscription, plan, loading } = usePlan()

  if (loading) return null
  if (subscription?.grantedReason !== 'beta' || subscription?.status !== 'granted') return null

  const hasta = subscription.grandfatheredUntil
    ? new Date(subscription.grandfatheredUntil).toLocaleDateString('es', {
        day: 'numeric', month: 'long', year: 'numeric',
      })
    : null

  return (
    <div
      role="status"
      style={{
        display: 'flex', alignItems: 'center', gap: 9,
        background: purpleAlpha(0.08),
        border: `1px solid ${purpleAlpha(0.22)}`,
        borderRadius: 10, padding: '9px 14px', margin: '0 0 12px',
        fontFamily: F, fontSize: 13, color: 'var(--text-secondary)',
      }}
    >
      <Sparkles size={15} style={{ color: PURPLE, flexShrink: 0 }} aria-hidden="true" />
      <span>
        <strong style={{ color: 'var(--text)' }}>{plan?.label || 'Pro'} de cortesía</strong>
        {' '}mientras dure la beta
        {hasta ? `, hasta el ${hasta}` : ''}. No se te cobra nada.
      </span>
    </div>
  )
}
