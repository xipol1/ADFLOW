import React, { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'

// Pre-launch scarcity for landing pages. Hooks into the hero CTA via
// #hero-cta anchor — the hero must render an element with that id somewhere
// in its email capture / form.
//
// Two palette variants:
//   - "advertiser" (default): warm amber, points at the brands batch (anchors #hero-cta)
//   - "creator":              soft green, surfaces the live founding-cohort counter
//                             and links straight to /founding (cross-surface funnel)

const VARIANTS = {
  advertiser: {
    bg: '#FEF3C7',
    border: '#FDE68A',
    text: '#92400E',
    prefix: 'Lanzamiento septiembre 2026 · ',
    slots: '50',
    middle: ' plazas para el batch piloto',
    cta: 'Reservar plaza →',
  },
  creator: {
    bg: '#DCFCE7',
    border: '#BBF7D0',
    text: '#166534',
    prefix: 'Founding cohort · ',
    middle: ' canales reservan plaza · 18% de comisión vitalicio, la más baja',
    cta: 'Reservar mi plaza →',
  },
}

const FOUNDER_CAP = 150

export default function ScarcityBanner({ variant = 'advertiser' } = {}) {
  const v = VARIANTS[variant] || VARIANTS.advertiser
  const isCreator = variant === 'creator'

  // Live counter — only fetched for the creator variant since it points
  // at the founding-cohort funnel. Falls back to the optimistic anchor (96)
  // so the banner renders something sensible while the request resolves.
  const [counter, setCounter] = useState(null)
  useEffect(() => {
    if (!isCreator) return
    let alive = true
    fetch('/api/founder-waitlist/counter')
      .then(r => r.json())
      .then(j => { if (alive && j?.success && j.data) setCounter(j.data) })
      .catch(() => {})
    return () => { alive = false }
  }, [isCreator])

  const handleScrollToCTA = (e) => {
    e.preventDefault()
    const target = document.getElementById('hero-cta')
    if (target) target.scrollIntoView({ behavior: 'smooth', block: 'center' })
  }

  // Creator: dynamic count + hard link to /founding (cross-surface).
  // Advertiser: legacy in-page anchor scroll.
  if (isCreator) {
    const displayed = counter?.displayed ?? 96
    const cap = counter?.cap ?? FOUNDER_CAP
    return (
      <div style={{ background: v.bg, borderBottom: `1px solid ${v.border}`, width: '100%' }}>
        <div
          style={{
            maxWidth: 1280, margin: '0 auto',
            padding: '10px 16px', textAlign: 'center',
            fontSize: 13, color: v.text, fontWeight: 500,
          }}
        >
          <span style={{
            display: 'inline-block', width: 7, height: 7, borderRadius: '50%',
            background: v.text, marginRight: 8, verticalAlign: 'middle',
            animation: 'sb-pulse 1.8s infinite',
          }} />
          <span className="scarcity-prefix">{v.prefix}</span>
          <strong style={{ fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>
            {displayed.toLocaleString('es-ES')}/{cap.toLocaleString('es-ES')}
          </strong>
          <span className="scarcity-prefix">{v.middle}</span>
          <span> · </span>
          <Link
            to="/founding"
            style={{
              color: v.text, fontWeight: 700, textDecoration: 'none', textUnderlineOffset: 2,
            }}
            onMouseEnter={(e) => (e.currentTarget.style.textDecoration = 'underline')}
            onMouseLeave={(e) => (e.currentTarget.style.textDecoration = 'none')}
          >
            {v.cta}
          </Link>
        </div>
        <style>{`
          @keyframes sb-pulse {
            0%   { box-shadow: 0 0 0 0 rgba(22,101,52,0.55); }
            70%  { box-shadow: 0 0 0 5px rgba(22,101,52,0); }
            100% { box-shadow: 0 0 0 0 rgba(22,101,52,0); }
          }
          @media (max-width: 640px) {
            .scarcity-prefix { display: none; }
          }
        `}</style>
      </div>
    )
  }

  // Advertiser (legacy behaviour, unchanged).
  return (
    <div style={{ background: v.bg, borderBottom: `1px solid ${v.border}`, width: '100%' }}>
      <div
        style={{
          maxWidth: 1280, margin: '0 auto',
          padding: '10px 16px', textAlign: 'center',
          fontSize: 13, color: v.text, fontWeight: 500,
        }}
      >
        <span className="scarcity-prefix">{v.prefix}</span>
        <strong style={{ fontWeight: 600 }}>{v.slots}</strong>
        <span className="scarcity-prefix">{v.middle}</span>
        <span> · </span>
        <a
          href="#hero-cta"
          onClick={handleScrollToCTA}
          style={{ color: v.text, fontWeight: 600, textDecoration: 'none', textUnderlineOffset: 2 }}
          onMouseEnter={(e) => (e.currentTarget.style.textDecoration = 'underline')}
          onMouseLeave={(e) => (e.currentTarget.style.textDecoration = 'none')}
        >
          {v.cta}
        </a>
      </div>
      <style>{`
        @media (max-width: 640px) {
          .scarcity-prefix { display: none; }
        }
      `}</style>
    </div>
  )
}
