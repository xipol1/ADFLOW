import React from 'react'
import { SCORE_DETAIL_CHANNEL } from './demo-data'

export default function DemoScoreDetail() {
  const c = SCORE_DETAIL_CHANNEL
  return (
    <div>
      {/* Header */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          paddingBottom: 14,
          borderBottom: '1px solid var(--border)',
          marginBottom: 18,
          gap: 12,
        }}
      >
        <div>
          <h3 style={{ fontSize: 15, fontWeight: 700, color: 'var(--text)', margin: 0, marginBottom: 2 }}>
            {c.name}
          </h3>
          <p style={{ fontSize: 11, color: 'var(--muted)', margin: 0 }}>{c.meta}</p>
        </div>
        <span
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 4,
            background: 'rgba(34,197,94,0.14)',
            color: '#16a34a',
            padding: '4px 8px',
            borderRadius: 4,
            fontSize: 10,
            fontWeight: 600,
            whiteSpace: 'nowrap',
          }}
        >
          ✓ Verificado con conexión
        </span>
      </div>

      {/* Body grid */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '220px 1fr',
          gap: 24,
        }}
        className="demo-score-grid"
      >
        {/* Hero score block */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            padding: 20,
            borderRadius: 10,
            border: '1px solid rgba(124,58,237,0.22)',
            background: 'linear-gradient(135deg, rgba(124,58,237,0.08) 0%, rgba(124,58,237,0.16) 100%)',
          }}
        >
          <div
            style={{
              fontSize: 56,
              fontWeight: 800,
              color: '#7C3AED',
              lineHeight: 1,
              letterSpacing: '-0.03em',
              fontFamily: "'Sora', system-ui, sans-serif",
            }}
          >
            {c.cas}
          </div>
          <div
            style={{
              fontSize: 11,
              color: 'var(--muted)',
              textTransform: 'uppercase',
              letterSpacing: '0.08em',
              fontWeight: 600,
              marginTop: 6,
            }}
          >
            CAS Score
          </div>
          <div
            style={{
              background: '#7C3AED',
              color: '#fff',
              padding: '4px 14px',
              borderRadius: 999,
              fontSize: 11,
              fontWeight: 700,
              marginTop: 12,
            }}
          >
            Tier {c.tier}
          </div>
          <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 14, textAlign: 'center' }}>
            Top <strong style={{ color: 'var(--text)' }}>{c.benchmarkPercentile}%</strong> en {c.niche} {c.region}
          </div>
        </div>

        {/* Metric bars + sparkline */}
        <div>
          {c.metrics.map((m) => (
            <MetricBar key={m.code} metric={m} />
          ))}

          <div style={{ marginTop: 16, paddingTop: 14, borderTop: '1px solid var(--border)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 8 }}>
              <span style={{ fontSize: 11, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 600 }}>
                CAS · Últimos 90 días
              </span>
              <span style={{ fontSize: 11, color: '#16a34a', fontWeight: 600 }}>↑ {c.trendDelta}</span>
            </div>
            <Sparkline points={c.sparkline} />
          </div>
        </div>
      </div>

      <style>{`
        @media (max-width: 768px) {
          .demo-score-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </div>
  )
}

function MetricBar({ metric }) {
  return (
    <div style={{ marginBottom: 10 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
        <span style={{ fontSize: 11, color: 'var(--text)', fontWeight: 600 }}>
          {metric.code} · {metric.label}
        </span>
        <span style={{ fontSize: 11, color: 'var(--text)', fontWeight: 700 }}>{metric.value} / 100</span>
      </div>
      <div style={{ height: 6, background: 'var(--bg2)', borderRadius: 999, overflow: 'hidden' }}>
        <div
          style={{
            height: '100%',
            width: `${metric.value}%`,
            background: 'linear-gradient(90deg, #7C3AED, #A855F7)',
            borderRadius: 999,
          }}
        />
      </div>
    </div>
  )
}

function Sparkline({ points }) {
  const W = 400
  const H = 60
  const step = W / (points.length - 1)
  const path = points.map((y, i) => `${i === 0 ? 'M' : 'L'}${(i * step).toFixed(2)},${y}`).join(' ')
  const area = `${path} L${W},${H} L0,${H} Z`
  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', height: 50, display: 'block' }} preserveAspectRatio="none">
      <defs>
        <linearGradient id="sparkGrad" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor="#7C3AED" stopOpacity="0.18" />
          <stop offset="100%" stopColor="#7C3AED" stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={area} fill="url(#sparkGrad)" />
      <path d={path} fill="none" stroke="#7C3AED" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}
