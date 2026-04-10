import React from 'react'
import { TrendingUp, TrendingDown } from 'lucide-react'
import { C } from '../theme/tokens'

/**
 * MetricContext — contextualizes a metric with temporal delta + niche percentile.
 *
 * Usage:
 *   <MetricContext delta="+18%" deltaLabel="vs mes anterior" percentil="Top 15%" nicho="crypto" />
 *
 * Renders as a compact inline row below the main metric value.
 */
export default function MetricContext({ delta, deltaLabel, percentil, nicho }) {
  if (!delta && !percentil) return null

  // Parse delta direction
  const deltaStr = String(delta || '')
  const isPositive = deltaStr.startsWith('+')
  const isNegative = deltaStr.startsWith('-')
  const deltaColor = isPositive ? C.ok : isNegative ? C.alert : 'var(--muted)'

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        flexWrap: 'wrap',
        marginTop: 4,
      }}
    >
      {/* Delta */}
      {delta && (
        <span
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 3,
            fontSize: 11,
            fontFamily: 'JetBrains Mono, monospace',
            color: deltaColor,
            fontWeight: 600,
          }}
        >
          {isPositive ? (
            <TrendingUp size={11} />
          ) : isNegative ? (
            <TrendingDown size={11} />
          ) : null}
          {deltaStr}
          {deltaLabel && (
            <span style={{ fontWeight: 400, color: 'var(--muted)', marginLeft: 2 }}>
              {deltaLabel}
            </span>
          )}
        </span>
      )}

      {/* Percentile badge */}
      {percentil && (
        <span
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 4,
            background: `${C.teal}18`,
            color: C.teal,
            border: `1px solid ${C.teal}33`,
            borderRadius: 999,
            padding: '1px 8px',
            fontSize: 10,
            fontWeight: 600,
            fontFamily: 'JetBrains Mono, monospace',
            whiteSpace: 'nowrap',
          }}
        >
          {percentil}
          {nicho && (
            <span style={{ opacity: 0.7 }}>
              · {nicho}
            </span>
          )}
        </span>
      )}
    </div>
  )
}
