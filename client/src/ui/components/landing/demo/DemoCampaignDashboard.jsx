import React from 'react'
import { CAMPAIGN_DATA } from './demo-data'

export default function DemoCampaignDashboard() {
  const c = CAMPAIGN_DATA
  return (
    <div>
      {/* Header */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 18,
          gap: 12,
          flexWrap: 'wrap',
        }}
      >
        <div>
          <h3 style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)', margin: 0 }}>{c.name}</h3>
          <p style={{ fontSize: 11, color: 'var(--muted)', margin: 0, marginTop: 2 }}>{c.publishedAt}</p>
        </div>
        <span
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            background: 'rgba(34,197,94,0.14)',
            color: '#16a34a',
            padding: '6px 12px',
            borderRadius: 999,
            fontSize: 11,
            fontWeight: 600,
            whiteSpace: 'nowrap',
          }}
        >
          <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#16a34a' }} />
          {c.status}
        </span>
      </div>

      {/* Stat cards */}
      <div
        style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10, marginBottom: 18 }}
        className="demo-campaign-stats"
      >
        {c.stats.map((s) => (
          <StatCard key={s.label} stat={s} />
        ))}
      </div>

      {/* Chart */}
      <div
        style={{
          background: 'var(--bg2)',
          border: '1px solid var(--border)',
          borderRadius: 8,
          padding: 14,
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 12 }}>
          <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text)' }}>Impresiones · primeras 24 h</span>
          <span style={{ fontSize: 11, color: 'var(--muted)' }}>Verificadas por Channelad</span>
        </div>
        <ImpressionChart points={c.series} />
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            marginTop: 6,
            fontSize: 10,
            color: 'var(--muted)',
          }}
        >
          <span>0 h</span>
          <span>6 h</span>
          <span>12 h</span>
          <span>18 h</span>
          <span>24 h</span>
        </div>
      </div>

      <style>{`
        @media (max-width: 768px) {
          .demo-campaign-stats { grid-template-columns: repeat(2, 1fr) !important; }
        }
      `}</style>
    </div>
  )
}

function StatCard({ stat }) {
  return (
    <div
      style={{
        background: 'var(--bg2)',
        border: '1px solid var(--border)',
        borderRadius: 8,
        padding: 12,
      }}
    >
      <div
        style={{
          fontSize: 10,
          color: 'var(--muted)',
          textTransform: 'uppercase',
          letterSpacing: '0.08em',
          fontWeight: 600,
          marginBottom: 6,
        }}
      >
        {stat.label}
      </div>
      <div
        style={{
          fontSize: 22,
          fontWeight: 700,
          color: 'var(--text)',
          letterSpacing: '-0.02em',
          lineHeight: 1,
          fontFamily: "'Sora', system-ui, sans-serif",
        }}
      >
        {stat.value}
        {stat.suffix && <span style={{ fontSize: 14, color: 'var(--muted)' }}>{stat.suffix}</span>}
      </div>
      <div style={{ fontSize: 11, color: '#16a34a', marginTop: 4, fontWeight: 500 }}>{stat.delta}</div>
    </div>
  )
}

function ImpressionChart({ points }) {
  const W = 600
  const H = 140
  const step = W / (points.length - 1)
  const path = points.map((y, i) => `${i === 0 ? 'M' : 'L'}${(i * step).toFixed(2)},${y}`).join(' ')
  const area = `${path} L${W},${H} L0,${H} Z`
  // Peak = lowest Y value (inverted axis)
  const minY = Math.min(...points)
  const peakIdx = points.indexOf(minY)
  const peakX = peakIdx * step
  const peakY = points[peakIdx]
  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', height: 120, display: 'block' }} preserveAspectRatio="none">
      <defs>
        <linearGradient id="campGrad" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor="#7C3AED" stopOpacity="0.22" />
          <stop offset="100%" stopColor="#7C3AED" stopOpacity="0" />
        </linearGradient>
      </defs>
      <line x1="0" y1="35" x2={W} y2="35" stroke="var(--border)" strokeWidth="1" />
      <line x1="0" y1="70" x2={W} y2="70" stroke="var(--border)" strokeWidth="1" />
      <line x1="0" y1="105" x2={W} y2="105" stroke="var(--border)" strokeWidth="1" />
      <path d={area} fill="url(#campGrad)" />
      <path d={path} fill="none" stroke="#7C3AED" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx={peakX} cy={peakY} r="8" fill="#7C3AED" fillOpacity="0.2" />
      <circle cx={peakX} cy={peakY} r="4" fill="#7C3AED" />
    </svg>
  )
}
