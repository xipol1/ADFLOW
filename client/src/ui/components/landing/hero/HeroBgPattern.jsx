import React from 'react'

/**
 * HeroBgPattern — atmospheric background for the hero composition.
 * Layered radial gradients (cool blue + warm purple) + soft noise texture
 * + ambient glow behind the focal card. Pointer-events disabled so floating
 * cards stay fully interactive.
 *
 * Aim: Stripe / Linear / Vercel dashboard feel — depth without flatness.
 */
export default function HeroBgPattern() {
  return (
    <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', overflow: 'hidden' }} aria-hidden="true">
      {/* Cool blue wash from upper-left */}
      <div
        style={{
          position: 'absolute',
          top: '-20%',
          left: '-10%',
          width: '60%',
          height: '70%',
          background:
            'radial-gradient(ellipse at center, rgba(99, 102, 241, 0.18) 0%, rgba(99, 102, 241, 0) 65%)',
          filter: 'blur(40px)',
        }}
      />
      {/* Warm purple wash from lower-right */}
      <div
        style={{
          position: 'absolute',
          bottom: '-10%',
          right: '-15%',
          width: '70%',
          height: '80%',
          background:
            'radial-gradient(ellipse at center, rgba(168, 85, 247, 0.16) 0%, rgba(168, 85, 247, 0) 60%)',
          filter: 'blur(50px)',
        }}
      />
      {/* Tight ambient glow centered — sits behind the SettlementCard focal point */}
      <div
        style={{
          position: 'absolute',
          bottom: '5%',
          right: '5%',
          width: 480,
          height: 480,
          background:
            'radial-gradient(circle at center, rgba(124, 58, 237, 0.22) 0%, rgba(124, 58, 237, 0) 60%)',
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
        <filter id="hero-noise">
          <feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves="2" stitchTiles="stitch" />
          <feColorMatrix type="saturate" values="0" />
        </filter>
        <rect width="100%" height="100%" filter="url(#hero-noise)" />
      </svg>
      {/* Sparse dot pattern — almost invisible, just enough texture */}
      <svg
        style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', opacity: 0.03 }}
        xmlns="http://www.w3.org/2000/svg"
      >
        <pattern id="hero-dot-pattern" width="28" height="28" patternUnits="userSpaceOnUse">
          <circle cx="2" cy="2" r="1" fill="#7C3AED" />
        </pattern>
        <rect width="100%" height="100%" fill="url(#hero-dot-pattern)" />
      </svg>
    </div>
  )
}
