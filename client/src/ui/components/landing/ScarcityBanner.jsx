import React from 'react'

// Pre-launch scarcity for the advertiser landing. Hooks into the hero CTA
// via #hero-cta anchor — the hero must render an element with that id
// somewhere in its email capture.
const PILOT_SLOTS = '50'

export default function ScarcityBanner() {
  const handleScrollToCTA = (e) => {
    e.preventDefault()
    const target = document.getElementById('hero-cta')
    if (target) target.scrollIntoView({ behavior: 'smooth', block: 'center' })
  }

  return (
    <div
      style={{
        background: '#FEF3C7',
        borderBottom: '1px solid #FDE68A',
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
          color: '#92400E',
          fontWeight: 500,
        }}
      >
        <span className="scarcity-prefix">Lanzamiento Q1 2026 · </span>
        <strong style={{ fontWeight: 600 }}>{PILOT_SLOTS} plazas</strong>
        <span className="scarcity-prefix"> para el batch piloto</span>
        <span> · </span>
        <a
          href="#hero-cta"
          onClick={handleScrollToCTA}
          style={{
            color: '#92400E',
            fontWeight: 600,
            textDecoration: 'none',
            textUnderlineOffset: 2,
          }}
          onMouseEnter={(e) => (e.currentTarget.style.textDecoration = 'underline')}
          onMouseLeave={(e) => (e.currentTarget.style.textDecoration = 'none')}
        >
          Solicitar →
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
