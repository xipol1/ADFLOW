import React from 'react'

export default function StatCard({ label, value, change, changeDirection = 'neutral', suffix = '' }) {
  const changeColor =
    changeDirection === 'up' ? 'var(--accent, #8B5CF6)' :
    changeDirection === 'down' ? 'var(--red, #F85149)' :
    'var(--text-secondary, #8B949E)'

  const arrow = changeDirection === 'up' ? '↑' : changeDirection === 'down' ? '↓' : ''

  return (
    <div
      className="rounded-xl p-4 flex flex-col justify-between min-h-[88px]"
      style={{ background: 'var(--surface, #0D1117)', border: '1px solid var(--border, #21262D)' }}
    >
      <span className="text-[11px] font-medium uppercase tracking-wider" style={{ color: 'var(--text-secondary, #8B949E)' }}>
        {label}
      </span>
      <div className="flex items-end justify-between gap-2 mt-2">
        <span className="text-2xl font-medium leading-none" style={{ fontFamily: 'var(--font-mono)', color: 'var(--text, #E6EDF3)' }}>
          {value}{suffix && <span className="text-sm ml-0.5 opacity-60">{suffix}</span>}
        </span>
        {change != null && (
          <span className="text-xs font-semibold whitespace-nowrap pb-0.5" style={{ color: changeColor, fontFamily: 'var(--font-mono)' }}>
            {arrow} {typeof change === 'number' ? `${change > 0 ? '+' : ''}${change}%` : change}
          </span>
        )}
      </div>
    </div>
  )
}
