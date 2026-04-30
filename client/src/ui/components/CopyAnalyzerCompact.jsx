import React, { useMemo } from 'react'
import { CheckCircle2, AlertTriangle, XCircle, TrendingUp, Lightbulb } from 'lucide-react'
import { analyzeCopy } from '../lib/copyAnalyzer'
import { FONT_BODY, FONT_DISPLAY, OK, WARN, ERR, BLUE } from '../theme/tokens'

const PURPLE = 'var(--accent, #8B5CF6)'

const VERDICT_COLOR = {
  empty: '#94a3b8',
  rework: ERR,
  review: WARN,
  good: BLUE,
  great: OK,
}

const VERDICT_LABEL = {
  empty: 'Sin copy',
  rework: 'Rehazlo',
  review: 'Revísalo',
  good: 'Bueno',
  great: 'Excelente',
}


/**
 * Compact inline analyzer — designed to live below a copy textarea.
 * Shows score gauge, top 3 issues, predicted CTR, and 1-2 suggestions.
 */
export default function CopyAnalyzerCompact({ text }) {
  const r = useMemo(() => analyzeCopy(text), [text])

  if (!text || r.verdict === 'empty') return null

  const color = VERDICT_COLOR[r.verdict] || '#94a3b8'
  const label = VERDICT_LABEL[r.verdict] || ''

  // Show only failed/warning checks (top 3)
  const issues = r.checks.filter(c => c.status === 'fail' || c.status === 'warn').slice(0, 3)

  return (
    <div style={{
      background: `${color}06`,
      border: `1px solid ${color}30`,
      borderRadius: 12,
      padding: '12px 14px',
      marginTop: 8,
      fontFamily: FONT_BODY,
      display: 'flex',
      flexDirection: 'column',
      gap: 10,
    }}>
      {/* Top row: score + verdict + CTR */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
        <div style={{
          display: 'flex', alignItems: 'center', gap: 8,
          background: `${color}14`, border: `1px solid ${color}40`,
          borderRadius: 20, padding: '4px 12px',
        }}>
          <div style={{
            width: 6, height: 6, borderRadius: '50%', background: color,
          }} />
          <span style={{ fontSize: 12, fontWeight: 700, color }}>
            {label} · {r.score}/100
          </span>
        </div>
        {r.predictedCtr !== null && (
          <div style={{
            display: 'flex', alignItems: 'center', gap: 4,
            fontSize: 11, color: 'var(--muted)',
          }}>
            <TrendingUp size={11} />
            CTR estimado: <strong style={{ color: 'var(--text)' }}>{r.predictedCtr.toFixed(2)}%</strong>
          </div>
        )}
      </div>

      {/* Issues */}
      {issues.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          {issues.map(c => {
            const Icon = c.status === 'fail' ? XCircle : AlertTriangle
            const cColor = c.status === 'fail' ? ERR : WARN
            return (
              <div key={c.id} style={{
                display: 'flex', alignItems: 'flex-start', gap: 6,
                fontSize: 12, color: 'var(--muted)', lineHeight: 1.4,
              }}>
                <Icon size={12} color={cColor} strokeWidth={2.4} style={{ flexShrink: 0, marginTop: 2 }} />
                <span><strong style={{ color: 'var(--text)' }}>{c.label}:</strong> {c.detail}</span>
              </div>
            )
          })}
        </div>
      )}

      {/* Top suggestion */}
      {r.suggestions.length > 0 && (
        <div style={{
          display: 'flex', alignItems: 'flex-start', gap: 6,
          padding: '8px 10px',
          background: 'var(--surface)',
          borderRadius: 8,
          fontSize: 12, color: 'var(--text)', lineHeight: 1.45,
        }}>
          <Lightbulb size={12} color={PURPLE} style={{ flexShrink: 0, marginTop: 2 }} />
          <span>{r.suggestions[0]}</span>
        </div>
      )}

      {/* All-clear */}
      {issues.length === 0 && r.suggestions.length === 0 && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: 6,
          fontSize: 12, color: OK,
        }}>
          <CheckCircle2 size={12} strokeWidth={2.4} />
          <span>Copy sólido. Sin problemas detectados.</span>
        </div>
      )}
    </div>
  )
}
