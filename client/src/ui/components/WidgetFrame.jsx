import React, { useState, useRef, useEffect, useCallback } from 'react'
import { createPortal } from 'react-dom'
import {
  Info, MoreHorizontal, RefreshCw, Maximize2, Download, X,
} from 'lucide-react'
import { FONT_BODY, FONT_DISPLAY } from '../theme/tokens'

/**
 * WidgetFrame — Standardised header + body + states for ANY widget.
 *
 * Datadog-inspired uniform anatomy:
 *   ┌──────────────────────────────────────────────────────┐
 *   │ [icon] Title  [i tooltip]            [⋯ menu]        │  ← header (32px)
 *   ├──────────────────────────────────────────────────────┤
 *   │                                                      │
 *   │  body (children — auto-fits via parent useWidgetSize) │
 *   │                                                      │
 *   └──────────────────────────────────────────────────────┘
 *
 * Drop-in replacement for any widget body. The outer card (drag handle,
 * edit-mode controls, resize handles) is still owned by the customizable
 * dashboard's `.adflow-widget-card` — WidgetFrame lives INSIDE the body.
 *
 * State precedence: loading > empty > error > children. Each is its own
 * first-class slot (Sprout Seeds pattern).
 *
 * Props:
 *   title         string                                   (required)
 *   icon          lucide-react icon component             (optional)
 *   description   string for the `i` tooltip               (optional)
 *   accent        css color (default: var(--accent))
 *   menuActions   [{ label, icon, onClick, danger? }]      (optional)
 *   loading       boolean — show skeleton                  (default false)
 *   skeleton      ReactNode rendered when loading           (optional)
 *   empty         { illustration?, title, description, actionLabel?, onAction?, secondaryLabel?, onSecondary? }
 *                  null/undefined → not empty, render children
 *   error         { message, onRetry? }                    (optional)
 *   footer        ReactNode rendered below body             (optional)
 *   children      widget body
 *   compact       reduces header height (default false)
 *   hideHeader    true → no header at all (compact KPI cards) (default false)
 *   badge         { count, label?, tone? } — small pill rendered next to the
 *                 title, e.g. { count: 3, label: 'nuevos', tone: 'accent' }
 *                 The count is the source of truth; nothing renders if 0.
 */
export default function WidgetFrame({
  title,
  icon: Icon,
  description,
  accent = 'var(--accent, #8B5CF6)',
  menuActions,
  loading = false,
  skeleton,
  empty,
  error,
  footer,
  children,
  compact = false,
  hideHeader = false,
  badge,
}) {
  const [tooltipOpen, setTooltipOpen] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef(null)
  const tooltipRef = useRef(null)

  // Close menu on outside click
  useEffect(() => {
    if (!menuOpen) return
    const handler = (e) => { if (menuRef.current && !menuRef.current.contains(e.target)) setMenuOpen(false) }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [menuOpen])

  const headerHeight = hideHeader ? 0 : compact ? 26 : 32
  const hasMenu = Array.isArray(menuActions) && menuActions.length > 0

  return (
    <div style={{
      height: '100%', minHeight: 0,
      display: 'flex', flexDirection: 'column',
      fontFamily: FONT_BODY,
    }}>
      {/* ── Header ── */}
      {!hideHeader && (
        <div style={{
          height: headerHeight, flexShrink: 0,
          display: 'flex', alignItems: 'center', gap: 8,
          marginBottom: compact ? 6 : 10,
          minWidth: 0,
        }}>
          {Icon && (
            <div style={{
              width: compact ? 22 : 24, height: compact ? 22 : 24, borderRadius: 7,
              background: `${accent}15`, border: `1px solid ${accent}25`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              flexShrink: 0,
            }}>
              <Icon size={compact ? 11 : 13} color={accent} strokeWidth={2.2} />
            </div>
          )}

          <h3 style={{
            fontFamily: FONT_DISPLAY,
            fontSize: compact ? 12 : 13.5,
            fontWeight: 700,
            color: 'var(--text)',
            letterSpacing: '-0.02em',
            margin: 0,
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            minWidth: 0,
            flex: badge?.count > 0 ? '0 1 auto' : 1,
          }}>
            {title}
          </h3>

          {/* "+N nuevos" pill — Hootsuite-beating "since last visit" baseline */}
          {badge?.count > 0 && (
            <span style={{
              flexShrink: 0,
              fontSize: compact ? 10 : 10.5,
              fontWeight: 700,
              color: '#fff',
              background: accent,
              borderRadius: 20,
              padding: compact ? '1px 7px' : '2px 8px',
              letterSpacing: '0.02em',
              animation: 'wfBadgePop .25s ease',
              boxShadow: `0 1px 4px ${accent}55`,
            }}>
              <style>{`@keyframes wfBadgePop { from { opacity:0; transform: scale(0.7) } to { opacity:1; transform: scale(1) } }`}</style>
              +{badge.count} {badge.label || 'nuevos'}
            </span>
          )}
          {badge?.count > 0 && <div style={{ flex: 1, minWidth: 0 }} />}

          {/* `i` info tooltip — Grafana/Datadog convention */}
          {description && (
            <div ref={tooltipRef} style={{ position: 'relative', flexShrink: 0 }}
              onMouseEnter={() => setTooltipOpen(true)}
              onMouseLeave={() => setTooltipOpen(false)}
            >
              <button
                style={{
                  width: 18, height: 18, borderRadius: 9, border: 'none',
                  background: 'transparent', color: 'var(--muted)',
                  cursor: 'help', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  padding: 0,
                }}
                aria-label="Más información"
              >
                <Info size={12} />
              </button>
              {tooltipOpen && (
                <div role="tooltip" style={{
                  position: 'absolute', top: 24, right: -4, zIndex: 50,
                  background: 'var(--bg)', border: '1px solid var(--border)',
                  borderRadius: 8, padding: '8px 10px',
                  fontSize: 11.5, color: 'var(--text)', lineHeight: 1.4,
                  width: 220, boxShadow: '0 8px 24px rgba(0,0,0,0.18)',
                  pointerEvents: 'none',
                }}>
                  {description}
                </div>
              )}
            </div>
          )}

          {/* Per-widget actions menu — Datadog pattern */}
          {hasMenu && (
            <div ref={menuRef} style={{ position: 'relative', flexShrink: 0 }}>
              <button
                onClick={() => setMenuOpen(o => !o)}
                style={{
                  width: 22, height: 22, borderRadius: 7, border: '1px solid transparent',
                  background: menuOpen ? 'var(--bg2)' : 'transparent',
                  color: menuOpen ? 'var(--text)' : 'var(--muted)',
                  cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  padding: 0,
                }}
                onMouseEnter={(e) => { if (!menuOpen) { e.currentTarget.style.background = 'var(--bg2)'; e.currentTarget.style.color = 'var(--text)' } }}
                onMouseLeave={(e) => { if (!menuOpen) { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--muted)' } }}
                aria-label="Acciones del widget"
              >
                <MoreHorizontal size={13} />
              </button>
              {menuOpen && (
                <div style={{
                  position: 'absolute', top: 26, right: 0, zIndex: 30,
                  background: 'var(--bg)', border: '1px solid var(--border)',
                  borderRadius: 10, padding: 4, minWidth: 170,
                  boxShadow: '0 12px 36px rgba(0,0,0,0.25)',
                }}>
                  {menuActions.map((a, i) => {
                    const ActionIcon = a.icon
                    return (
                      <button key={i}
                        onClick={() => { setMenuOpen(false); a.onClick?.() }}
                        style={{
                          width: '100%', textAlign: 'left',
                          padding: '7px 10px', borderRadius: 6, border: 'none',
                          background: 'transparent',
                          color: a.danger ? '#ef4444' : 'var(--text)',
                          fontSize: 12.5, fontWeight: 500, fontFamily: FONT_BODY,
                          cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8,
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.background = a.danger ? 'rgba(239,68,68,0.1)' : 'var(--bg2)'}
                        onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                      >
                        {ActionIcon && <ActionIcon size={13} />}
                        {a.label}
                      </button>
                    )
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ── Body (state precedence: loading > error > empty > children) ── */}
      <div style={{ flex: 1, minHeight: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
        {loading ? (
          skeleton || <DefaultSkeleton />
        ) : error ? (
          <ErrorState message={error.message} onRetry={error.onRetry} />
        ) : empty ? (
          <CompactEmptyState {...empty} accent={accent} />
        ) : (
          children
        )}
      </div>

      {/* ── Footer ── */}
      {footer && (
        <div style={{ flexShrink: 0, marginTop: 6, paddingTop: 6, borderTop: '1px solid var(--border)' }}>
          {footer}
        </div>
      )}
    </div>
  )
}

// ─── Default skeleton (used when no custom skeleton is passed) ─────────────────
function DefaultSkeleton() {
  return (
    <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', gap: 8, padding: 4 }}>
      <style>{`@keyframes wfPulse { 0%,100%{opacity:1} 50%{opacity:0.4} }`}</style>
      <div style={{ width: '60%', height: 14, borderRadius: 6, background: 'var(--border)', animation: 'wfPulse 1.6s ease infinite' }} />
      <div style={{ width: '40%', height: 28, borderRadius: 8, background: 'var(--border)', animation: 'wfPulse 1.6s ease infinite' }} />
      <div style={{ flex: 1, borderRadius: 8, background: 'var(--border)', animation: 'wfPulse 1.6s ease infinite', minHeight: 40 }} />
    </div>
  )
}

// ─── Error state — used when error prop is set ─────────────────────────────────
function ErrorState({ message, onRetry }) {
  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 8, padding: 20, textAlign: 'center' }}>
      <div style={{ width: 36, height: 36, borderRadius: 18, background: 'rgba(239,68,68,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <X size={16} color="#ef4444" />
      </div>
      <div style={{ fontSize: 12.5, color: 'var(--text)', fontWeight: 600 }}>
        {message || 'No se pudo cargar este widget'}
      </div>
      {onRetry && (
        <button onClick={onRetry}
          style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 8, padding: '6px 12px', fontSize: 11.5, fontWeight: 600, color: 'var(--text)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5, fontFamily: FONT_BODY }}>
          <RefreshCw size={11} /> Reintentar
        </button>
      )}
    </div>
  )
}

// ─── Compact empty state — used inside widgets ────────────────────────────────
function CompactEmptyState({ illustration, icon: Icon, title, description, actionLabel, onAction, secondaryLabel, onSecondary, accent }) {
  return (
    <div style={{
      flex: 1, minHeight: 0,
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      textAlign: 'center', padding: '12px 16px', gap: 10,
    }}>
      {illustration ? (
        <div style={{ marginBottom: 2 }}>{illustration}</div>
      ) : Icon ? (
        <div style={{
          width: 48, height: 48, borderRadius: 14,
          background: `${accent}10`, border: `1px dashed ${accent}30`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <Icon size={20} color={accent} strokeWidth={1.7} />
        </div>
      ) : null}

      {title && (
        <div style={{ fontFamily: FONT_DISPLAY, fontSize: 13, fontWeight: 700, color: 'var(--text)', letterSpacing: '-0.01em' }}>
          {title}
        </div>
      )}
      {description && (
        <div style={{ fontSize: 11.5, color: 'var(--muted)', lineHeight: 1.5, maxWidth: 280 }}>
          {description}
        </div>
      )}
      {actionLabel && onAction && (
        <button onClick={onAction}
          style={{
            background: accent, color: '#fff', border: 'none', borderRadius: 9,
            padding: '7px 14px', fontSize: 12, fontWeight: 600, cursor: 'pointer',
            fontFamily: FONT_BODY, marginTop: 4,
            boxShadow: `0 3px 10px ${accent}33`,
          }}>
          {actionLabel}
        </button>
      )}
      {secondaryLabel && onSecondary && (
        <button onClick={onSecondary}
          style={{
            background: 'transparent', border: 'none', color: accent,
            fontSize: 11, fontWeight: 600, cursor: 'pointer', fontFamily: FONT_BODY,
            padding: '2px 0',
          }}>
          {secondaryLabel}
        </button>
      )}
    </div>
  )
}

// ─── Marketplace-themed inline SVG illustrations (use as `illustration` prop) ──
//
// Each is sized 64×64 by default (good for inside-widget contexts) and uses
// currentColor so they tint with the parent's color. Designed to be small,
// subtle, and immediately recognisable for the Channelad context.

function _SvgWrapper({ size = 64, accent, children }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" fill="none" style={{ display: 'block', color: accent }}>
      {children}
    </svg>
  )
}

export function IllustrationNoChannels({ size, accent = 'var(--accent)' }) {
  return (
    <_SvgWrapper size={size} accent={accent}>
      <rect x="10" y="14" width="44" height="32" rx="6" stroke="currentColor" strokeWidth="1.6" opacity="0.35" />
      <circle cx="22" cy="26" r="3" fill="currentColor" opacity="0.55" />
      <rect x="28" y="23" width="20" height="3" rx="1.5" fill="currentColor" opacity="0.4" />
      <rect x="28" y="29" width="14" height="3" rx="1.5" fill="currentColor" opacity="0.25" />
      <rect x="14" y="38" width="36" height="3" rx="1.5" fill="currentColor" opacity="0.2" />
      <circle cx="50" cy="50" r="9" fill="currentColor" opacity="0.12" />
      <path d="M48 50 l2 2 l4 -4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" opacity="0.85" />
    </_SvgWrapper>
  )
}

export function IllustrationNoCampaigns({ size, accent = 'var(--accent)' }) {
  return (
    <_SvgWrapper size={size} accent={accent}>
      <path d="M14 30 L42 18 L42 42 L14 30 Z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" opacity="0.4" />
      <path d="M42 22 L52 22 M42 30 L54 30 M42 38 L52 38" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" opacity="0.55" />
      <circle cx="20" cy="50" r="4" stroke="currentColor" strokeWidth="1.6" opacity="0.4" />
      <path d="M20 46 L20 30" stroke="currentColor" strokeWidth="1.6" opacity="0.3" />
    </_SvgWrapper>
  )
}

export function IllustrationAllClear({ size, accent = 'var(--accent)' }) {
  return (
    <_SvgWrapper size={size} accent={accent}>
      <circle cx="32" cy="32" r="22" stroke="currentColor" strokeWidth="1.6" opacity="0.3" />
      <circle cx="32" cy="32" r="14" fill="currentColor" opacity="0.12" />
      <path d="M24 32 l6 6 l12 -12" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
    </_SvgWrapper>
  )
}

export function IllustrationNoData({ size, accent = 'var(--accent)' }) {
  return (
    <_SvgWrapper size={size} accent={accent}>
      <rect x="8" y="44" width="6" height="12" rx="1.5" fill="currentColor" opacity="0.2" />
      <rect x="18" y="36" width="6" height="20" rx="1.5" fill="currentColor" opacity="0.3" />
      <rect x="28" y="28" width="6" height="28" rx="1.5" fill="currentColor" opacity="0.4" />
      <rect x="38" y="42" width="6" height="14" rx="1.5" fill="currentColor" opacity="0.25" />
      <rect x="48" y="34" width="6" height="22" rx="1.5" fill="currentColor" opacity="0.35" />
      <path d="M14 22 q12 -10 24 0 q5 4 12 -2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" fill="none" opacity="0.5" strokeDasharray="2 3" />
    </_SvgWrapper>
  )
}

export function IllustrationInbox({ size, accent = 'var(--accent)' }) {
  return (
    <_SvgWrapper size={size} accent={accent}>
      <path d="M10 32 L10 48 a4 4 0 0 0 4 4 h36 a4 4 0 0 0 4 -4 L54 32" stroke="currentColor" strokeWidth="1.6" opacity="0.5" fill="none" />
      <path d="M10 32 L18 14 h28 L54 32 H40 a8 8 0 0 1 -16 0 H10 Z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" opacity="0.4" fill="currentColor" fillOpacity="0.06" />
    </_SvgWrapper>
  )
}

// ─── Default per-type menu actions builder ────────────────────────────────────
//
// Convenience: returns a sensible default menu of [Refresh, Fullscreen,
// Export CSV] given the right callbacks. Widgets don't need to wire up the
// same boilerplate for every type.
export function defaultMenu({ onRefresh, onExpand, onExport }) {
  const menu = []
  if (onRefresh) menu.push({ label: 'Actualizar', icon: RefreshCw, onClick: onRefresh })
  if (onExpand) menu.push({ label: 'Pantalla completa', icon: Maximize2, onClick: onExpand })
  if (onExport) menu.push({ label: 'Exportar CSV', icon: Download, onClick: onExport })
  return menu
}
