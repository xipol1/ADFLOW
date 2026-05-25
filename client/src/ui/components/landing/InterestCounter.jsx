import React, { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Users, ArrowRight } from 'lucide-react'
import { FONT_BODY, FONT_DISPLAY } from '../../theme/tokens'
import { CAP, COUNTER_LABEL } from '../../theme/channelOne'

const GREEN = '#25d366'
const greenAlpha = (o) => `rgba(37,211,102,${o})`

/**
 * Public-facing "canales interesados" counter for Channel One.
 *
 * Reads /api/channel-one/counter. The label is intentionally
 * "interesados" (not "pre-registrados") because the number aggregates
 * multiple interest signals — see config/channelOne.js for the rules.
 *
 * Variants:
 *   - hero   → big number, full-width, used as a section block
 *   - inline → one-liner badge, used in headers/CTAs
 *   - card   → bordered card for footers/sidebars
 */
export default function InterestCounter({ variant = 'hero', ctaLabel = 'Reserva tu slot' }) {
  const [data, setData] = useState(null)
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    let alive = true
    fetch('/api/channel-one/counter')
      .then(r => r.json())
      .then(json => {
        if (!alive) return
        if (json?.success && json.data) setData(json.data)
        setLoaded(true)
      })
      .catch(() => { if (alive) setLoaded(true) })
    return () => { alive = false }
  }, [])

  // Optimistic anchor while the API resolves — avoids the "0 / 1000" flash.
  const displayed = data?.displayed ?? 247
  const cap = data?.cap ?? CAP
  const remaining = data?.remaining ?? Math.max(0, cap - displayed)
  const pct = data?.percentFull ?? Math.round((displayed / cap) * 100)

  if (variant === 'inline') {
    return (
      <Link
        to="/channel-one"
        style={{
          display: 'inline-flex', alignItems: 'center', gap: 8,
          background: greenAlpha(0.10), border: `1px solid ${greenAlpha(0.30)}`,
          borderRadius: 999, padding: '6px 14px',
          textDecoration: 'none', color: GREEN,
          fontFamily: FONT_BODY, fontSize: 13, fontWeight: 600,
          fontVariantNumeric: 'tabular-nums',
        }}
      >
        <Users size={14} strokeWidth={2.2} />
        {displayed.toLocaleString('es-ES')} {COUNTER_LABEL}
        <ArrowRight size={13} strokeWidth={2.4} style={{ opacity: 0.7 }} />
      </Link>
    )
  }

  if (variant === 'card') {
    return (
      <div style={{
        background: 'var(--surface)', border: `1px solid ${greenAlpha(0.25)}`,
        borderRadius: 16, padding: 22,
      }}>
        <div style={{
          fontSize: 10, fontWeight: 700, color: GREEN,
          textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: 8,
        }}>
          Channel One · pre-registro
        </div>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 12 }}>
          <span style={{
            fontFamily: FONT_DISPLAY, fontSize: 34, fontWeight: 700,
            letterSpacing: '-0.03em', color: 'var(--text)',
            fontVariantNumeric: 'tabular-nums', lineHeight: 1,
          }}>
            {displayed.toLocaleString('es-ES')}
          </span>
          <span style={{ fontSize: 13, color: 'var(--muted)' }}>
            / {cap.toLocaleString('es-ES')} {COUNTER_LABEL}
          </span>
        </div>
        <div style={{
          width: '100%', height: 6, borderRadius: 6,
          background: 'var(--bg2)', overflow: 'hidden', marginBottom: 14,
        }}>
          <div style={{
            height: '100%', width: `${pct}%`,
            background: `linear-gradient(90deg, ${GREEN}, #1ea952)`,
            transition: 'width .6s ease-out',
          }} />
        </div>
        <Link
          to="/channel-one"
          style={{
            display: 'inline-flex', alignItems: 'center', gap: 6,
            color: GREEN, textDecoration: 'none',
            fontSize: 13, fontWeight: 600,
          }}
        >
          {ctaLabel} ({remaining.toLocaleString('es-ES')} libres) <ArrowRight size={14} strokeWidth={2.4} />
        </Link>
      </div>
    )
  }

  // hero (default)
  return (
    <div
      data-testid="interest-counter-hero"
      style={{
        display: 'inline-flex', flexDirection: 'column', alignItems: 'flex-start',
        gap: 10, padding: '18px 22px',
        background: 'var(--surface)', border: `1px solid ${greenAlpha(0.25)}`,
        borderRadius: 18, minWidth: 280,
        boxShadow: `0 18px 50px -28px ${greenAlpha(0.35)}`,
      }}
    >
      <div style={{
        display: 'inline-flex', alignItems: 'center', gap: 6,
        fontSize: 10, fontWeight: 700, color: GREEN,
        textTransform: 'uppercase', letterSpacing: '0.12em',
      }}>
        <span style={{
          width: 6, height: 6, borderRadius: '50%', background: GREEN,
          boxShadow: `0 0 0 0 ${greenAlpha(0.6)}`, animation: 'ic-pulse 1.8s infinite',
        }} />
        Channel One · pre-registro abierto
      </div>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 10 }}>
        <span style={{
          fontFamily: FONT_DISPLAY, fontSize: 42, fontWeight: 700,
          letterSpacing: '-0.035em', color: 'var(--text)',
          fontVariantNumeric: 'tabular-nums', lineHeight: 1,
          opacity: loaded ? 1 : 0.7,
          transition: 'opacity .25s',
        }}>
          {displayed.toLocaleString('es-ES')}
        </span>
        <span style={{ fontSize: 14, color: 'var(--muted)', fontWeight: 500 }}>
          / {cap.toLocaleString('es-ES')} {COUNTER_LABEL}
        </span>
      </div>
      <div style={{
        width: '100%', height: 7, borderRadius: 7,
        background: 'var(--bg2)', overflow: 'hidden',
      }}>
        <div style={{
          height: '100%', width: `${pct}%`,
          background: `linear-gradient(90deg, ${GREEN}, #1ea952)`,
          boxShadow: `0 0 12px ${greenAlpha(0.5)}`,
          transition: 'width .8s ease-out',
        }} />
      </div>
      <div style={{ fontSize: 11, color: 'var(--muted)' }}>
        {remaining.toLocaleString('es-ES')} slots libres · cohorte se cierra al llegar a {cap.toLocaleString('es-ES')}
      </div>
      <style>{`
        @keyframes ic-pulse {
          0%   { box-shadow: 0 0 0 0 ${greenAlpha(0.6)}; }
          70%  { box-shadow: 0 0 0 6px ${greenAlpha(0)}; }
          100% { box-shadow: 0 0 0 0 ${greenAlpha(0)}; }
        }
      `}</style>
    </div>
  )
}
