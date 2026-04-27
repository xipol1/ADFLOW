import React, { useState } from 'react'
import { Link } from 'react-router-dom'
import { Info, ChevronRight } from 'lucide-react'

/**
 * DashboardModule — SEMrush-style widget wrapper.
 *
 * Anatomy:
 * ┌─ HEADER ────────────────────────────────────────┐
 * │ [icon] Título        (i) tooltip   Hace 2h     │
 * ├─ BODY ──────────────────────────────────────────┤
 * │ [children]                                      │
 * ├─ FOOTER (optional) ─────────────────────────────┤
 * │                       Ver informe completo →    │
 * └─────────────────────────────────────────────────┘
 */
export default function DashboardModule({
  title,
  icon: Icon,
  tooltip,
  updatedAt,
  linkTo,
  linkLabel = 'Ver informe completo',
  children,
  action,
  noPadding = false,
}) {
  const [showTooltip, setShowTooltip] = useState(false)

  // Format "Hace Xh" from a date
  const fmtAgo = (date) => {
    if (!date) return null
    const d = new Date(date)
    if (Number.isNaN(d.getTime())) return null
    const mins = Math.round((Date.now() - d.getTime()) / 60000)
    if (mins < 1) return 'Ahora'
    if (mins < 60) return `Hace ${mins}m`
    const hrs = Math.round(mins / 60)
    if (hrs < 24) return `Hace ${hrs}h`
    const days = Math.round(hrs / 24)
    return `Hace ${days}d`
  }

  const agoText = fmtAgo(updatedAt)

  return (
    <div
      style={{
        background: 'var(--surface)',
        border: '1px solid var(--border)',
        borderRadius: 16,
        overflow: 'hidden',
        transition: 'border-color 200ms',
      }}
    >
      {/* ── Header ── */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          padding: '14px 20px',
          borderBottom: '1px solid var(--border)',
        }}
      >
        {Icon && (
          <div
            style={{
              width: 30,
              height: 30,
              borderRadius: 8,
              background: 'var(--accent-glow, rgba(124,58,237,0.08))',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            <Icon size={14} color="var(--accent, #7C3AED)" />
          </div>
        )}

        <span
          style={{
            fontSize: 14,
            fontWeight: 700,
            color: 'var(--text)',
            flex: 1,
          }}
        >
          {title}
        </span>

        {/* Tooltip (i) */}
        {tooltip && (
          <div
            style={{ position: 'relative' }}
            onMouseEnter={() => setShowTooltip(true)}
            onMouseLeave={() => setShowTooltip(false)}
          >
            <Info
              size={14}
              color="var(--muted2)"
              style={{ cursor: 'help' }}
            />
            {showTooltip && (
              <div
                style={{
                  position: 'absolute',
                  top: 22,
                  right: 0,
                  width: 220,
                  background: 'var(--surface)',
                  border: '1px solid var(--border)',
                  borderRadius: 10,
                  padding: '10px 12px',
                  fontSize: 11,
                  color: 'var(--muted)',
                  lineHeight: 1.5,
                  zIndex: 50,
                  boxShadow: '0 8px 24px rgba(0,0,0,0.15)',
                  pointerEvents: 'none',
                }}
              >
                {tooltip}
              </div>
            )}
          </div>
        )}

        {/* Timestamp */}
        {agoText && (
          <span
            style={{
              fontSize: 10,
              color: 'var(--muted2)',
              fontFamily: 'JetBrains Mono, monospace',
              flexShrink: 0,
            }}
          >
            {agoText}
          </span>
        )}

        {/* Custom action slot */}
        {action}
      </div>

      {/* ── Body ── */}
      <div style={{ padding: noPadding ? 0 : '16px 20px' }}>
        {children}
      </div>

      {/* ── Footer link ── */}
      {linkTo && (
        <Link
          to={linkTo}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'flex-end',
            gap: 6,
            padding: '10px 20px',
            borderTop: '1px solid var(--border)',
            fontSize: 12,
            fontWeight: 600,
            color: 'var(--accent, #7C3AED)',
            textDecoration: 'none',
            transition: 'opacity 150ms',
          }}
          onMouseEnter={(e) => { e.currentTarget.style.opacity = '0.8' }}
          onMouseLeave={(e) => { e.currentTarget.style.opacity = '1' }}
        >
          {linkLabel} <ChevronRight size={14} />
        </Link>
      )}
    </div>
  )
}
