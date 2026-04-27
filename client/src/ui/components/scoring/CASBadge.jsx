import React from 'react'
import { NIVEL, nivelFromCAS } from '../../theme/tokens'

// Pill badge showing the CAS score + level.
// Pure, presentational. No fetching, no state, no effects.
const SIZES = {
  xs: { h: 20, px: 8,  fs: 11, gap: 0 },
  sm: { h: 24, px: 10, fs: 12, gap: 4 },
  md: { h: 28, px: 12, fs: 13, gap: 6 },
  lg: { h: 36, px: 14, fs: 14, gap: 8 },
}

export default function CASBadge({ CAS, nivel, size = 'md' }) {
  if (CAS == null || Number.isNaN(CAS)) return null
  const lvl = (nivel && NIVEL[nivel]) || nivelFromCAS(CAS)
  const color = lvl.color
  const s = SIZES[size] || SIZES.md

  const bg = `${color}26`      // ~15% alpha
  const border = `${color}66`  // ~40% alpha

  const label = (() => {
    if (size === 'xs') return `${CAS}`
    if (size === 'sm') return `CAS ${CAS}`
    if (size === 'lg') {
      return (
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: s.gap }}>
          <span>{lvl.label}</span>
          <span style={{ opacity: 0.35 }}>·</span>
          <span style={{ fontSize: s.fs + 2, fontWeight: 700 }}>{CAS}</span>
        </span>
      )
    }
    return `${lvl.label} · ${CAS}`
  })()

  return (
    <span
      className="font-mono font-semibold inline-flex items-center"
      style={{
        height: s.h,
        paddingLeft: s.px,
        paddingRight: s.px,
        borderRadius: 999,
        fontSize: s.fs,
        background: bg,
        border: `1px solid ${border}`,
        color,
        lineHeight: 1,
        whiteSpace: 'nowrap',
      }}
    >
      {label}
    </span>
  )
}
