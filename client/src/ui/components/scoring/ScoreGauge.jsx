import React from 'react'
import { C, NIVEL, nivelFromCAS } from '../../theme/tokens'

// Horizontal gauge (0-100) with optional level/score caption.
export default function ScoreGauge({ CAS, nivel, showLabel = false, height = 8 }) {
  if (CAS == null || Number.isNaN(CAS)) return null
  const lvl = (nivel && NIVEL[nivel]) || nivelFromCAS(CAS)
  const color = lvl.color
  const pct = Math.max(0, Math.min(100, CAS))

  return (
    <div className="w-full">
      <div
        style={{
          height,
          background: 'var(--border)',
          borderRadius: 999,
          overflow: 'hidden',
          position: 'relative',
        }}
      >
        <div
          style={{
            width: `${pct}%`,
            height: '100%',
            background: `linear-gradient(90deg, ${color}CC 0%, ${color} 100%)`,
            borderRadius: 999,
            transition: 'width 400ms cubic-bezier(.22,1,.36,1)',
          }}
        />
      </div>
      {showLabel && (
        <div className="flex justify-between mt-2 font-mono text-xs">
          <span
            className="uppercase tracking-widest"
            style={{ color, fontWeight: 600 }}
          >
            {lvl.label}
          </span>
          <span style={{ color: 'var(--muted)' }}>{pct} / 100</span>
        </div>
      )}
    </div>
  )
}
