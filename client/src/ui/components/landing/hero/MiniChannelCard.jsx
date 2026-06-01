import React, { useRef } from 'react'
// `m` keeps this hero card on the LazyMotion runtime (provider in App.jsx).
// Aliased to `motion` so the JSX (motion.div) is unchanged.
import { m as motion } from 'framer-motion'
import { PLATFORM_DEMO, TIER_STYLES } from '../demo/demo-data'

/**
 * MiniChannelCard — compact 200px channel card used as a floating element
 * in the hero composition. Premium feel: translucent surface, backdrop blur,
 * soft long shadow, hover lift.
 *
 * Idle float (driftAmount, driftDuration) animates the card on a slow loop
 * so the composition never feels frozen. Each instance picks up a slightly
 * different phase via a deterministic offset based on channel id.
 */
export default function MiniChannelCard({ channel, driftAmount = 6, driftDuration = 7, solid = false }) {
  const platform = PLATFORM_DEMO[channel?.platform]
  const tier = TIER_STYLES[channel?.tier]
  const hoverRef = useRef(false)

  if (!platform || !tier) return null

  // Deterministic phase shift so 3 cards drift out of sync.
  const phase = (parseInt(channel.id, 10) % 5) * 0.4

  return (
    <motion.div
      animate={{
        y: [0, -driftAmount, 0, driftAmount * 0.6, 0],
      }}
      transition={{
        duration: driftDuration,
        repeat: Infinity,
        ease: 'easeInOut',
        delay: phase,
      }}
      whileHover={{
        y: -10,
        transition: { duration: 0.3, ease: [0.22, 1, 0.36, 1] },
      }}
      style={{
        background: solid ? '#FFFFFF' : 'rgba(255, 255, 255, 0.72)',
        backdropFilter: solid ? 'none' : 'blur(20px) saturate(140%)',
        WebkitBackdropFilter: solid ? 'none' : 'blur(20px) saturate(140%)',
        border: solid ? '1px solid rgba(15, 17, 21, 0.06)' : '1px solid rgba(255, 255, 255, 0.6)',
        borderRadius: 14,
        padding: 13,
        width: 208,
        boxShadow: solid
          ? '0 1px 0 0 rgba(255, 255, 255, 0.9) inset, 0 28px 56px -16px rgba(76, 29, 149, 0.22), 0 10px 28px -8px rgba(15, 17, 21, 0.14)'
          : '0 1px 0 0 rgba(255, 255, 255, 0.7) inset, 0 24px 48px -16px rgba(76, 29, 149, 0.18), 0 8px 24px -8px rgba(15, 17, 21, 0.10)',
        cursor: 'default',
        position: 'relative',
      }}
      ref={(el) => {
        if (!el) return
        // Track hover so we can intensify shadow on enter without React re-renders.
        // Two distinct states (solid / translucent) — keep them separate so the
        // hover feel stays consistent with the resting style.
        const restShadow = solid
          ? '0 1px 0 0 rgba(255, 255, 255, 0.9) inset, 0 28px 56px -16px rgba(76, 29, 149, 0.22), 0 10px 28px -8px rgba(15, 17, 21, 0.14)'
          : '0 1px 0 0 rgba(255, 255, 255, 0.7) inset, 0 24px 48px -16px rgba(76, 29, 149, 0.18), 0 8px 24px -8px rgba(15, 17, 21, 0.10)'
        const hoverShadow = solid
          ? '0 1px 0 0 rgba(255, 255, 255, 1) inset, 0 36px 70px -16px rgba(124, 58, 237, 0.32), 0 14px 36px -8px rgba(15, 17, 21, 0.18)'
          : '0 1px 0 0 rgba(255, 255, 255, 0.85) inset, 0 32px 60px -16px rgba(124, 58, 237, 0.30), 0 12px 32px -8px rgba(15, 17, 21, 0.14)'
        const restBg = solid ? '#FFFFFF' : 'rgba(255, 255, 255, 0.72)'
        const hoverBg = solid ? '#FFFFFF' : 'rgba(255, 255, 255, 0.85)'
        el.onmouseenter = () => {
          hoverRef.current = true
          el.style.boxShadow = hoverShadow
          el.style.background = hoverBg
        }
        el.onmouseleave = () => {
          hoverRef.current = false
          el.style.boxShadow = restShadow
          el.style.background = restBg
        }
      }}
    >
      {channel.isNew && (
        <span
          style={{
            position: 'absolute',
            top: -8,
            left: 12,
            padding: '2px 8px',
            borderRadius: 5,
            fontSize: 9,
            fontWeight: 700,
            letterSpacing: '0.08em',
            color: '#fff',
            background: 'linear-gradient(135deg, #f59e0b, #f97316)',
            boxShadow: '0 4px 12px -4px rgba(249, 115, 22, 0.5)',
          }}
        >
          NEW
        </span>
      )}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
        <span
          style={{
            padding: '2px 7px',
            borderRadius: 5,
            fontSize: 8,
            fontWeight: 700,
            letterSpacing: '0.05em',
            color: '#fff',
            background: platform.ink || platform.color,
            boxShadow: `0 4px 12px -4px ${platform.color}80`,
          }}
        >
          {platform.label}
        </span>
        {!channel.isNew && (
          <span
            style={{
              padding: '2px 7px',
              borderRadius: 5,
              fontSize: 10,
              fontWeight: 700,
              background: tier.bg,
              color: tier.text,
            }}
          >
            {channel.tier} · {channel.score}
          </span>
        )}
      </div>
      <div style={{ fontSize: 12.5, fontWeight: 600, color: '#0F1115', marginBottom: 2, letterSpacing: '-0.01em' }}>
        Canal #{channel.id}
      </div>
      <div style={{ fontSize: 11, color: 'rgba(15, 17, 21, 0.66)', marginBottom: 10, fontWeight: 500 }}>
        {channel.niche} · {channel.region} · {channel.subs}
      </div>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          paddingTop: 8,
          borderTop: '1px solid rgba(15, 17, 21, 0.06)',
        }}
      >
        <span style={{ fontSize: 9, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'rgba(15, 17, 21, 0.64)', fontWeight: 600 }}>
          CPM
        </span>
        <span style={{ fontSize: 11.5, fontWeight: 700, color: '#0F1115', letterSpacing: '-0.01em' }}>{channel.cpm}</span>
      </div>
    </motion.div>
  )
}
