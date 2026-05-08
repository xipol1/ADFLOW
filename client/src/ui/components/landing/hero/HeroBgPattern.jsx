import React from 'react'

/**
 * HeroBgPattern — atmospheric background for the hero composition.
 * Layered radial gradients + soft noise texture + ambient glow behind the
 * focal card. Pointer-events disabled so floating cards stay fully
 * interactive. Aim: Stripe / Linear / Vercel dashboard feel — depth without
 * flatness.
 *
 * theme:
 *   - "advertiser" (default): cool blue + warm purple, purple ambient.
 *   - "creator":              soft mint + spring green, green ambient.
 */

const THEMES = {
  advertiser: {
    wash1: 'rgba(99, 102, 241, 0.18)',  // cool blue from upper-left
    wash2: 'rgba(168, 85, 247, 0.16)',  // warm purple from lower-right
    ambient: 'rgba(124, 58, 237, 0.22)',
    dot: '#7C3AED',
  },
  creator: {
    wash1: 'rgba(74, 222, 128, 0.16)',  // mint from upper-left
    wash2: 'rgba(34, 197, 94, 0.18)',   // spring green from lower-right
    ambient: 'rgba(22, 163, 74, 0.22)',
    dot: '#16A34A',
  },
}

export default function HeroBgPattern({ theme = 'advertiser' } = {}) {
  const t = THEMES[theme] || THEMES.advertiser

  return (
    <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', overflow: 'hidden' }} aria-hidden="true">
      {/* Wash from upper-left */}
      <div
        style={{
          position: 'absolute',
          top: '-20%',
          left: '-10%',
          width: '60%',
          height: '70%',
          background: `radial-gradient(ellipse at center, ${t.wash1} 0%, transparent 65%)`,
          filter: 'blur(40px)',
        }}
      />
      {/* Wash from lower-right */}
      <div
        style={{
          position: 'absolute',
          bottom: '-10%',
          right: '-15%',
          width: '70%',
          height: '80%',
          background: `radial-gradient(ellipse at center, ${t.wash2} 0%, transparent 60%)`,
          filter: 'blur(50px)',
        }}
      />
      {/* Tight ambient glow centered — sits behind the focal card */}
      <div
        style={{
          position: 'absolute',
          bottom: '5%',
          right: '5%',
          width: 480,
          height: 480,
          background: `radial-gradient(circle at center, ${t.ambient} 0%, transparent 60%)`,
          filter: 'blur(60px)',
        }}
      />
      {/* Noise — SVG fractal turbulence at very low opacity, mix-blend overlay */}
      <svg
        style={{
          position: 'absolute',
          inset: 0,
          width: '100%',
          height: '100%',
          opacity: 0.06,
          mixBlendMode: 'overlay',
        }}
        xmlns="http://www.w3.org/2000/svg"
      >
        <filter id={`hero-noise-${theme}`}>
          <feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves="2" stitchTiles="stitch" />
          <feColorMatrix type="saturate" values="0" />
        </filter>
        <rect width="100%" height="100%" filter={`url(#hero-noise-${theme})`} />
      </svg>
      {/* Sparse dot pattern — almost invisible, just enough texture */}
      <svg
        style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', opacity: 0.03 }}
        xmlns="http://www.w3.org/2000/svg"
      >
        <pattern id={`hero-dot-pattern-${theme}`} width="28" height="28" patternUnits="userSpaceOnUse">
          <circle cx="2" cy="2" r="1" fill={t.dot} />
        </pattern>
        <rect width="100%" height="100%" fill={`url(#hero-dot-pattern-${theme})`} />
      </svg>
    </div>
  )
}
