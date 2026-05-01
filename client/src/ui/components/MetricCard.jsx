import React, { useState, useRef, useEffect } from 'react'
import { TrendingUp, TrendingDown, Minus, ArrowRight } from 'lucide-react'
import { FONT_BODY, FONT_DISPLAY, OK, ERR } from '../theme/tokens'

/**
 * MetricCard — Stripe-style KPI tile.
 *
 * Shows a single metric with: number, label, trend pill (delta vs prev period),
 * optional sparkline, optional sublabel, optional click target.
 *
 * Props (all optional except label + value):
 *   icon       lucide-react icon component
 *   label      "Gasto este mes"
 *   value      "€1,234" | 1234 | "12.4%"
 *   sublabel   small text under the label ("vs mes anterior")
 *   accent     hex/css color used for icon background and sparkline
 *   delta      number — % change vs previous period (positive = good for most metrics)
 *   deltaLabel "vs mes anterior" (overrides sublabel position)
 *   inverseDelta  set true for metrics where lower=better (CPA, CPC, bounce rate)
 *   spark      array of numbers for the inline sparkline
 *   onClick    if set, the whole card is clickable
 *   compact    smaller layout for dense grids
 *   ringPct    0-100, optional radial progress around the icon
 */
export default function MetricCard({
  icon: Icon,
  label,
  value,
  sublabel,
  accent = 'var(--accent, #8B5CF6)',
  delta,
  deltaLabel,
  inverseDelta = false,
  spark,
  onClick,
  compact = false,
  ringPct,
}) {
  const [hovered, setHovered] = useState(false)
  const cardRef = useRef(null)
  const [width, setWidth] = useState(220)

  useEffect(() => {
    const el = cardRef.current
    if (!el) return
    const update = () => setWidth(el.offsetWidth)
    update()
    if (typeof ResizeObserver === 'undefined') return
    const ro = new ResizeObserver(update)
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  const hasDelta = delta !== undefined && delta !== null && Number.isFinite(Number(delta))
  const numericDelta = hasDelta ? Number(delta) : 0
  // Consider the change positive depending on inverseDelta (e.g. CPA going down is "good")
  const isUp = numericDelta > 0
  const isDown = numericDelta < 0
  const isPositive = inverseDelta ? isDown : isUp
  const isNegative = inverseDelta ? isUp : isDown
  const trendColor = isPositive ? OK : isNegative ? ERR : 'var(--muted)'
  const TrendIcon = isUp ? TrendingUp : isDown ? TrendingDown : Minus

  const padding = compact ? 14 : 18
  const valueSize = compact ? 22 : 28
  const iconSize = compact ? 34 : 40

  const interactive = !!onClick
  const Element = interactive ? 'button' : 'div'

  return (
    <Element
      ref={cardRef}
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        background: 'var(--surface)',
        border: `1px solid ${hovered ? `${accent}55` : 'var(--border)'}`,
        borderRadius: 14,
        padding,
        display: 'flex',
        flexDirection: 'column',
        gap: compact ? 10 : 14,
        transition: 'border-color .15s, box-shadow .15s, transform .15s',
        transform: interactive && hovered ? 'translateY(-1px)' : 'none',
        boxShadow: interactive && hovered ? `0 6px 20px ${accent}1f` : '0 1px 3px rgba(0,0,0,0.04)',
        cursor: interactive ? 'pointer' : 'default',
        textAlign: 'left',
        width: '100%',
        fontFamily: FONT_BODY,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 }}>
        {Icon && (
          <div style={{ position: 'relative', width: iconSize, height: iconSize, flexShrink: 0 }}>
            <div style={{
              width: iconSize, height: iconSize, borderRadius: 11,
              background: `${accent}15`, border: `1px solid ${accent}25`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <Icon size={Math.round(iconSize * 0.45)} color={accent} strokeWidth={2} />
            </div>
            {Number.isFinite(ringPct) && <Ring pct={ringPct} color={accent} size={iconSize + 6} />}
          </div>
        )}

        {hasDelta && (
          <span style={{
            display: 'inline-flex', alignItems: 'center', gap: 3,
            background: `${trendColor}12`, border: `1px solid ${trendColor}25`,
            borderRadius: 20, padding: '2px 8px',
            fontSize: 11, fontWeight: 700, color: trendColor, whiteSpace: 'nowrap',
          }}>
            <TrendIcon size={11} strokeWidth={2.5} />
            {isUp ? '+' : ''}{numericDelta}%
          </span>
        )}
      </div>

      <div style={{ minWidth: 0 }}>
        <div style={{
          fontSize: valueSize, fontWeight: 800, fontFamily: FONT_DISPLAY,
          color: 'var(--text)', letterSpacing: '-0.03em', lineHeight: 1.05,
          marginBottom: 4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        }}>
          {value}
        </div>
        <div style={{ fontSize: 13, color: 'var(--muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {label}
        </div>
        {(sublabel || (deltaLabel && hasDelta)) && (
          <div style={{ fontSize: 11, color: 'var(--muted2)', marginTop: 4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {deltaLabel || sublabel}
          </div>
        )}
      </div>

      {Array.isArray(spark) && spark.length >= 2 && !compact && (
        <Sparkline data={spark} color={accent} width={Math.max(80, width - padding * 2)} height={32} />
      )}

      {interactive && (
        <div style={{
          position: 'absolute', top: 12, right: 12,
          opacity: hovered ? 1 : 0, transition: 'opacity .15s',
          pointerEvents: 'none', display: 'flex', alignItems: 'center', gap: 2,
          fontSize: 11, color: accent, fontWeight: 600,
        }}>
          <ArrowRight size={12} />
        </div>
      )}
    </Element>
  )
}

// ── Sparkline (smooth area + stroke) ──────────────────────────────────────────
export function Sparkline({ data, color = 'var(--accent, #8B5CF6)', width = 120, height = 32 }) {
  if (!data || data.length < 2) return null
  const max = Math.max(...data)
  const min = Math.min(...data)
  const range = max - min || 1
  const padY = 2
  const points = data.map((v, i) => {
    const x = (i / (data.length - 1)) * width
    const y = height - padY - ((v - min) / range) * (height - padY * 2)
    return [x, y]
  })
  const stroke = points.map(([x, y], i) => `${i === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${y.toFixed(1)}`).join(' ')
  const area = `${stroke} L ${width.toFixed(1)} ${height.toFixed(1)} L 0 ${height.toFixed(1)} Z`
  const gradId = `mc-spark-grad-${color.replace(/[^a-z0-9]/gi, '')}`
  return (
    <svg width={width} height={height} style={{ display: 'block' }}>
      <defs>
        <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.28" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={area} fill={`url(#${gradId})`} />
      <path d={stroke} fill="none" stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

// ── Ring (radial progress around the icon) ────────────────────────────────────
function Ring({ pct, color, size }) {
  const r = (size - 3) / 2
  const c = 2 * Math.PI * r
  const dash = (Math.max(0, Math.min(100, pct)) / 100) * c
  return (
    <svg width={size} height={size} style={{ position: 'absolute', top: -3, left: -3, transform: 'rotate(-90deg)' }}>
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={`${color}25`} strokeWidth={2} />
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color}
        strokeWidth={2} strokeDasharray={`${dash} ${c - dash}`} strokeLinecap="round" />
    </svg>
  )
}

// ── MetricGrid — convenience wrapper for laying out N MetricCards ─────────────
export function MetricGrid({ children, minWidth = 220 }) {
  return (
    <div style={{
      display: 'grid', gap: 12,
      gridTemplateColumns: `repeat(auto-fit, minmax(${minWidth}px, 1fr))`,
    }}>
      {children}
    </div>
  )
}

// ── Helpers ──────────────────────────────────────────────────────────────────
/**
 * Compute % delta between current and previous values.
 * Returns undefined if previous is 0 (avoid Infinity) or values invalid.
 */
export function computeDelta(current, previous) {
  if (!Number.isFinite(current) || !Number.isFinite(previous)) return undefined
  if (previous === 0) return undefined
  return Math.round(((current - previous) / previous) * 100)
}

/**
 * Bucket an array of timestamped numeric values into N evenly-spaced points
 * suitable for a sparkline. Returns at most `points` numbers.
 *
 *   bucketTimeSeries(items, getTime, getValue, 7)
 */
export function bucketTimeSeries(items, getTime, getValue, points = 12) {
  if (!Array.isArray(items) || items.length === 0) return []
  const times = items.map(getTime).filter(Number.isFinite)
  if (times.length === 0) return []
  const min = Math.min(...times)
  const max = Math.max(...times)
  const span = max - min || 1
  const buckets = new Array(points).fill(0)
  items.forEach(it => {
    const t = getTime(it)
    if (!Number.isFinite(t)) return
    const idx = Math.min(points - 1, Math.floor(((t - min) / span) * points))
    buckets[idx] += Number(getValue(it)) || 0
  })
  return buckets
}
