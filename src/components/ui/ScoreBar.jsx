import React, { useState } from 'react'

function scoreColor(v) {
  if (v >= 90) return 'var(--gold, #F0B429)'
  if (v >= 75) return 'var(--accent, #00D4A8)'
  if (v >= 60) return 'var(--blue, #58A6FF)'
  if (v >= 40) return '#E3B341'
  return 'var(--red, #F85149)'
}

export function scoreLabel(v) {
  if (v >= 90) return 'Elite'
  if (v >= 75) return 'Excelente'
  if (v >= 60) return 'Bueno'
  if (v >= 40) return 'Regular'
  return 'Bajo'
}

export default function ScoreBar({ label, value, description }) {
  const [showTip, setShowTip] = useState(false)
  const pct = Math.max(0, Math.min(100, value ?? 0))
  const color = scoreColor(pct)

  return (
    <div
      className="relative"
      onMouseEnter={() => setShowTip(true)}
      onMouseLeave={() => setShowTip(false)}
    >
      <div className="flex items-center justify-between mb-1">
        <span
          className="text-[11px] font-semibold tracking-wide cursor-help"
          style={{ color: 'var(--text-secondary, #8B949E)', fontFamily: 'var(--font-mono)' }}
        >
          {label}
        </span>
        <span
          className="text-xs font-medium"
          style={{ color, fontFamily: 'var(--font-mono)' }}
        >
          {Math.round(pct)}
        </span>
      </div>
      <div className="h-1 rounded-full overflow-hidden" style={{ background: 'var(--border, #21262D)' }}>
        <div
          className="h-full rounded-full transition-all duration-500 ease-out"
          style={{ width: `${pct}%`, background: color }}
        />
      </div>

      {showTip && description && (
        <div
          className="absolute z-20 bottom-full left-0 mb-2 px-3 py-2 rounded-lg text-[11px] leading-relaxed max-w-[260px]"
          style={{
            background: 'var(--bg3, #161B22)',
            border: '1px solid var(--border-med, #30363D)',
            color: 'var(--text-secondary, #8B949E)',
            boxShadow: 'var(--shadow-lg)',
          }}
        >
          {description}
        </div>
      )}
    </div>
  )
}
