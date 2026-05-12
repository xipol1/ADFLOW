import React from 'react'
import { Link } from 'react-router-dom'
import { Sparkles, Lock, ArrowRight } from 'lucide-react'
import { usePlan } from '../../hooks/usePlan'
import { PURPLE, purpleAlpha, FONT_BODY } from '../theme/tokens'

const F = FONT_BODY

/**
 * Frontend-side feature gate. If the current user's plan doesn't unlock
 * the named feature, render a polished upsell card instead of the page.
 *
 * Usage:
 *   <ProGate feature="lookalike" label="Canales similares">
 *     <LookalikeChannelsPage />
 *   </ProGate>
 *
 * The backend is the source of truth — every gated route should ALSO use
 * requiereSubscription({feature}) so anyone hitting the API directly
 * bounces the same way. This component is purely UX.
 */
export default function ProGate({ feature, label, children }) {
  const { plan, planKey, hasFeature, loading } = usePlan()

  if (loading) {
    return (
      <div style={{ padding: 48, fontFamily: F, color: 'var(--text-muted)' }}>
        Cargando plan…
      </div>
    )
  }

  if (hasFeature(feature)) return children

  // Pick the Pro plan that matches the user's role for the CTA.
  const suggested = planKey?.startsWith('creator') ? 'creator_pro' : 'advertiser_pro'

  return (
    <main
      data-testid="pro-gate"
      style={{
        fontFamily: F,
        color: 'var(--text)',
        minHeight: '60vh',
        display: 'grid',
        placeItems: 'center',
        padding: '48px 16px',
        background:
          'radial-gradient(ellipse 70% 40% at 50% 0%, rgba(124, 58, 237, 0.06) 0%, transparent 60%), var(--bg)',
      }}
    >
      <div
        style={{
          maxWidth: 520,
          width: '100%',
          textAlign: 'center',
          background: 'var(--surface)',
          border: `1px solid ${purpleAlpha(0.25)}`,
          borderRadius: 20,
          padding: 32,
          boxShadow: `0 16px 60px ${purpleAlpha(0.12)}`,
        }}
      >
        <div
          style={{
            width: 56,
            height: 56,
            borderRadius: 16,
            background: purpleAlpha(0.12),
            display: 'grid',
            placeItems: 'center',
            margin: '0 auto 16px',
          }}
        >
          <Lock size={26} style={{ color: PURPLE }} />
        </div>
        <div
          style={{
            fontSize: 12,
            fontWeight: 700,
            letterSpacing: '0.06em',
            textTransform: 'uppercase',
            color: PURPLE,
            marginBottom: 6,
          }}
        >
          Función Pro
        </div>
        <h1 style={{ margin: '0 0 8px', fontSize: 24, fontWeight: 800, letterSpacing: '-0.01em' }}>
          {label || 'Esta herramienta requiere Pro'}
        </h1>
        <p style={{ margin: '0 0 22px', fontSize: 15, color: 'var(--text-muted)', lineHeight: 1.55 }}>
          Tu plan actual ({plan?.label || 'Free'}) no incluye esta función. Mejora a Pro y desbloquea
          {suggested === 'advertiser_pro'
            ? ' comisión rebajada al 15%, bulk launcher, lookalike, A/B testing, atribución multi-touch y más'
            : ' analytics avanzados, canales ilimitados, API y prioridad en el ranking'}
          .
        </p>
        <div
          style={{
            padding: 12,
            borderRadius: 12,
            background: 'var(--surface-2)',
            border: '1px solid var(--border)',
            fontSize: 13,
            color: 'var(--text-muted)',
            marginBottom: 22,
          }}
        >
          14 días gratis · sin tarjeta · cancela cuando quieras
        </div>
        <div style={{ display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap' }}>
          <Link
            to="/pricing"
            style={{
              padding: '12px 20px',
              borderRadius: 12,
              fontSize: 14,
              fontWeight: 600,
              fontFamily: F,
              background: PURPLE,
              color: '#fff',
              textDecoration: 'none',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
            }}
          >
            <Sparkles size={16} />
            Ver planes
            <ArrowRight size={14} />
          </Link>
          <Link
            to={suggested.startsWith('creator') ? '/creator' : '/advertiser'}
            style={{
              padding: '12px 20px',
              borderRadius: 12,
              fontSize: 14,
              fontWeight: 600,
              fontFamily: F,
              background: 'transparent',
              color: 'var(--text)',
              textDecoration: 'none',
              border: '1px solid var(--border)',
              display: 'inline-flex',
              alignItems: 'center',
            }}
          >
            Volver al dashboard
          </Link>
        </div>
      </div>
    </main>
  )
}
