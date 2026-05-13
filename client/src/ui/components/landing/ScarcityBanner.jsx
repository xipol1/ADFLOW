import React from 'react'

// Pre-launch scarcity for landing pages. Hooks into the hero CTA via
// #hero-cta anchor — the hero must render an element with that id somewhere
// in its email capture / form.
//
// Two palette variants:
//   - "advertiser" (default): warm amber, points at the brands batch
//   - "creator":              soft green, points at the channels batch

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
    prefix: 'Lanzamiento septiembre 2026 · ',
    slots: '200',
    middle: ' canales del batch piloto cobran sin comisión los 3 primeros meses',
    cta: 'Reservar plaza →',
  },
}

export default function ScarcityBanner({ variant = 'advertiser' } = {}) {
  const v = VARIANTS[variant] || VARIANTS.advertiser

  const handleScrollToCTA = (e) => {
    e.preventDefault()
    const target = document.getElementById('hero-cta')
    if (target) target.scrollIntoView({ behavior: 'smooth', block: 'center' })
  }

  return (
    <div
      style={{
        background: v.bg,
        borderBottom: `1px solid ${v.border}`,
        width: '100%',
      }}
    >
      <div
        style={{
          maxWidth: 1280,
          margin: '0 auto',
          padding: '10px 16px',
          textAlign: 'center',
          fontSize: 13,
          color: v.text,
          fontWeight: 500,
        }}
      >
        <span className="scarcity-prefix">{v.prefix}</span>
        <strong style={{ fontWeight: 600 }}>{v.slots}</strong>
        <span className="scarcity-prefix">{v.middle}</span>
        <span> · </span>
        <a
          href="#hero-cta"
          onClick={handleScrollToCTA}
          style={{
            color: v.text,
            fontWeight: 600,
            textDecoration: 'none',
            textUnderlineOffset: 2,
          }}
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
