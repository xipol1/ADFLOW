import React from 'react'
import { C } from '../../theme/tokens'

// Dense KPI tile: label · number · trend · context.
// Hover is handled by CSS :hover via a small inline-style trick + class.
export default function KPICard({
  label,
  valor,
  trend,
  context,
  color,
  icon,
  onClick,
}) {
  const clickable = typeof onClick === 'function'
  const valColor = color || C.t1

  let trendEl = null
  if (trend != null && trend !== '') {
    const str = String(trend).trim()
    let tcolor = C.t2
    let arrow = ''
    if (str.startsWith('+')) {
      tcolor = C.ok
      arrow = '↑ '
    } else if (str.startsWith('-')) {
      tcolor = C.alert
      arrow = '↓ '
    }
    trendEl = (
      <span className="font-mono" style={{ color: tcolor, fontSize: 13 }}>
        {arrow}{str}
      </span>
    )
  }

  return (
    <div
      onClick={onClick}
      className="kpi-card"
      style={{
        minHeight: 112,
        padding: 20,
        background: C.surface,
        border: `1px solid ${C.border}`,
        borderRadius: 12,
        cursor: clickable ? 'pointer' : 'default',
        transition: 'all 200ms cubic-bezier(.22,1,.36,1)',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.borderColor = C.borderEl
        if (clickable) e.currentTarget.style.boxShadow = `0 0 0 1px ${C.teal}`
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.borderColor = C.border
        e.currentTarget.style.boxShadow = 'none'
      }}
    >
      <div className="flex items-center justify-between">
        <span
          className="uppercase"
          style={{
            color: C.t3,
            fontSize: 11,
            letterSpacing: '0.12em',
            fontWeight: 600,
          }}
        >
          {label}
        </span>
        {icon && <span style={{ color: C.t3 }}>{icon}</span>}
      </div>

      <div>
        <div className="flex items-baseline" style={{ gap: 10 }}>
          <span
            className="font-mono"
            style={{
              color: valColor,
              fontSize: 26,
              fontWeight: 600,
              lineHeight: 1.1,
            }}
          >
            {valor}
          </span>
          {trendEl}
        </div>
        {context && (
          <div style={{ color: C.t3, fontSize: 11, marginTop: 4 }}>{context}</div>
        )}
      </div>
    </div>
  )
}
