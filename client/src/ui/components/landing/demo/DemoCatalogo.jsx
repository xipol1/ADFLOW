import React from 'react'
import { CATALOG_CHANNELS, PLATFORM_DEMO, TIER_STYLES } from './demo-data'

const FILTERS = ['Todas', 'Telegram', 'WhatsApp', 'Tecnología', 'CPM 5–15 €', 'Tier A+']

export default function DemoCatalogo() {
  return (
    <div>
      {/* Filter row */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap', alignItems: 'center' }}>
        {FILTERS.map((f, i) => {
          const active = i === 0
          return (
            <span
              key={f}
              style={{
                padding: '5px 12px',
                borderRadius: 8,
                fontSize: 12,
                fontWeight: 500,
                background: active ? 'var(--text)' : 'var(--surface)',
                color: active ? 'var(--surface)' : 'var(--text)',
                border: `1px solid ${active ? 'var(--text)' : 'var(--border)'}`,
              }}
            >
              {f}
            </span>
          )
        })}
        <span
          style={{
            marginLeft: 'auto',
            background: 'var(--bg2)',
            borderRadius: 8,
            padding: '5px 12px',
            fontSize: 12,
            color: 'var(--muted)',
            maxWidth: 200,
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}
        >
          Buscar canales…
        </span>
      </div>

      {/* Grid */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap: 10,
        }}
        className="demo-catalog-grid"
      >
        {CATALOG_CHANNELS.map((c) => (
          <ChannelCard key={c.id} channel={c} />
        ))}
      </div>

      <style>{`
        @media (max-width: 640px) {
          .demo-catalog-grid { grid-template-columns: repeat(2, 1fr) !important; }
        }
      `}</style>
    </div>
  )
}

function ChannelCard({ channel }) {
  const platform = PLATFORM_DEMO[channel.platform]
  const tier = TIER_STYLES[channel.tier]
  return (
    <div
      style={{
        border: '1px solid var(--border)',
        borderRadius: 10,
        padding: 12,
        background: 'var(--surface)',
        transition: 'border-color 200ms',
      }}
      onMouseEnter={(e) => (e.currentTarget.style.borderColor = '#7C3AED')}
      onMouseLeave={(e) => (e.currentTarget.style.borderColor = 'var(--border)')}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
        <span
          style={{
            padding: '2px 6px',
            borderRadius: 4,
            fontSize: 9,
            fontWeight: 700,
            letterSpacing: '0.04em',
            color: '#fff',
            background: platform.color,
          }}
        >
          {platform.label}
        </span>
        <span
          style={{
            padding: '2px 6px',
            borderRadius: 4,
            fontSize: 10,
            fontWeight: 700,
            background: tier.bg,
            color: tier.text,
          }}
        >
          {channel.tier} · {channel.score}
        </span>
      </div>
      <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', marginBottom: 2 }}>
        Canal #{channel.id}
      </div>
      <div style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 10 }}>
        {channel.niche} · {channel.region} · {channel.subs}
      </div>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          paddingTop: 8,
          borderTop: '1px solid var(--border)',
        }}
      >
        <span style={{ fontSize: 9, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--muted2, #6B7280)' }}>CPM</span>
        <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text)' }}>{channel.cpm}</span>
      </div>
    </div>
  )
}
