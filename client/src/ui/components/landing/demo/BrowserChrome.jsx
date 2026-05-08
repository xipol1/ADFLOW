import React from 'react'

/**
 * BrowserChrome — neutral browser-window frame for product mockups.
 * Theme-aware via CSS variables (var(--surface), var(--border), var(--bg2)).
 */
export default function BrowserChrome({ url, children }) {
  return (
    <div
      style={{
        background: 'var(--surface)',
        border: '1px solid var(--border)',
        borderRadius: 12,
        boxShadow: '0 4px 24px rgba(15,17,21,0.08)',
        overflow: 'hidden',
      }}
    >
      <div
        style={{
          background: 'var(--bg2)',
          borderBottom: '1px solid var(--border)',
          padding: '10px 16px',
          display: 'flex',
          alignItems: 'center',
          gap: 12,
        }}
      >
        <div style={{ display: 'flex', gap: 6 }}>
          <span style={{ width: 10, height: 10, borderRadius: '50%', background: '#FF5F57' }} />
          <span style={{ width: 10, height: 10, borderRadius: '50%', background: '#FEBC2E' }} />
          <span style={{ width: 10, height: 10, borderRadius: '50%', background: '#28C840' }} />
        </div>
        <div
          style={{
            flex: 1,
            maxWidth: 320,
            background: 'var(--surface)',
            border: '1px solid var(--border)',
            borderRadius: 6,
            padding: '4px 10px',
            fontSize: 11,
            color: 'var(--muted)',
            fontFamily: "'JetBrains Mono', ui-monospace, monospace",
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}
        >
          {url}
        </div>
      </div>
      <div style={{ padding: 20 }}>{children}</div>
    </div>
  )
}
