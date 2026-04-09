import React from 'react'
import { C } from '../../theme/tokens'

// Two stacked bars comparing "Tú" vs "Nicho". Supports inverted metrics (CPM).
export default function BenchmarkBar({
  valor,
  benchmark,
  label,
  unidad = '',
  invertido = false,
}) {
  if (valor == null || benchmark == null) return null

  const max = Math.max(valor, benchmark, 0.0001)
  const youPct = (valor / max) * 100
  const benchPct = (benchmark / max) * 100

  // Color logic
  const youBetter = invertido ? valor < benchmark : valor > benchmark
  const youColor = youBetter ? C.ok : C.warn

  // Delta
  const deltaPct = benchmark === 0
    ? 0
    : ((valor - benchmark) / benchmark) * 100
  const effectiveBetter = invertido ? deltaPct < 0 : deltaPct > 0
  const deltaColor = effectiveBetter ? C.ok : C.alert
  const deltaSign = deltaPct >= 0 ? '+' : ''
  const deltaStr = `${deltaSign}${deltaPct.toFixed(0)}% vs nicho`

  const formatVal = (v) => (unidad ? `${v}${unidad}` : v)

  return (
    <div className="w-full">
      <div className="flex justify-between items-baseline mb-2">
        <span style={{ color: C.t2, fontSize: 12 }}>{label}</span>
        <span
          className="font-mono"
          style={{ color: deltaColor, fontSize: 13, fontWeight: 600 }}
        >
          {deltaStr}
        </span>
      </div>

      <div className="flex items-center" style={{ gap: 8, marginBottom: 4 }}>
        <span className="font-mono" style={{ color: C.t3, fontSize: 10, width: 28 }}>
          Tú
        </span>
        <div
          style={{
            flex: 1,
            height: 6,
            background: C.border,
            borderRadius: 999,
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              width: `${youPct}%`,
              height: '100%',
              background: youColor,
              borderRadius: 999,
              transition: 'width 400ms cubic-bezier(.22,1,.36,1)',
            }}
          />
        </div>
        <span className="font-mono" style={{ color: C.t1, fontSize: 11, width: 44, textAlign: 'right' }}>
          {formatVal(valor)}
        </span>
      </div>

      <div className="flex items-center" style={{ gap: 8 }}>
        <span className="font-mono" style={{ color: C.t3, fontSize: 10, width: 28 }}>
          Nicho
        </span>
        <div
          style={{
            flex: 1,
            height: 6,
            background: C.border,
            borderRadius: 999,
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              width: `${benchPct}%`,
              height: '100%',
              background: C.t3,
              borderRadius: 999,
            }}
          />
        </div>
        <span className="font-mono" style={{ color: C.t2, fontSize: 11, width: 44, textAlign: 'right' }}>
          {formatVal(benchmark)}
        </span>
      </div>
    </div>
  )
}
