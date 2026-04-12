import React, { useState, useEffect, useCallback } from 'react'
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts'
import { Clock, Eye, EyeOff } from 'lucide-react'
import apiService from '../../../services/api'
import { C } from '../theme/tokens'

// ─── Constants ──────────────────────────────────────────────────────────────

const PERIODS = [
  { key: 7, label: '7d' },
  { key: 14, label: '14d' },
  { key: 30, label: '30d' },
  { key: 90, label: '90d' },
]

const LINES = {
  subscribers: { color: C.teal, label: 'Suscriptores', dashed: false },
  avg_views: { color: '#f59e0b', label: 'Avg Views', dashed: true },
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function fmtDate(d) {
  if (!d) return ''
  const date = new Date(d)
  if (Number.isNaN(date.getTime())) return String(d)
  return date.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })
}

function fmtNum(n) {
  if (n == null || Number.isNaN(n)) return '--'
  if (n >= 1e6) return `${(n / 1e6).toFixed(1)}M`
  if (n >= 1e3) return `${(n / 1e3).toFixed(1)}K`
  return String(n)
}

// ─── Custom tooltip ─────────────────────────────────────────────────────────

function ChartTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null
  return (
    <div
      style={{
        background: C.surface,
        border: `1px solid ${C.border}`,
        borderRadius: 10,
        padding: '10px 14px',
        fontSize: 12,
        fontFamily: 'monospace',
      }}
    >
      <div style={{ color: C.t3, marginBottom: 6, fontWeight: 600 }}>{fmtDate(label)}</div>
      {payload.map((p) => (
        <div
          key={p.dataKey}
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            gap: 16,
            color: p.color,
            marginBottom: 2,
          }}
        >
          <span>{LINES[p.dataKey]?.label || p.dataKey}</span>
          <span style={{ fontWeight: 600 }}>{fmtNum(p.value)}</span>
        </div>
      ))}
    </div>
  )
}

// ─── Loading skeleton ───────────────────────────────────────────────────────

function ChartSkeleton({ height }) {
  return (
    <div
      className="animate-pulse"
      style={{
        height,
        background: C.surfaceEl,
        borderRadius: 12,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <div
        style={{
          width: '80%',
          height: '60%',
          background: C.border,
          borderRadius: 8,
          opacity: 0.3,
        }}
      />
    </div>
  )
}

// ─── Empty state ────────────────────────────────────────────────────────────

function EmptyState({ height }) {
  return (
    <div
      style={{
        height,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 10,
        color: C.t3,
      }}
    >
      <Clock size={24} />
      <div style={{ fontSize: 13, fontWeight: 500, color: C.t2 }}>
        Acumulando datos
      </div>
      <div style={{ fontSize: 12, maxWidth: 260, textAlign: 'center' }}>
        Disponible a partir del segundo dia de tracking
      </div>
    </div>
  )
}

// ─── Toggle button ──────────────────────────────────────────────────────────

function LineToggle({ lineKey, visible, onToggle }) {
  const cfg = LINES[lineKey]
  if (!cfg) return null
  return (
    <button
      onClick={() => onToggle(lineKey)}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 5,
        padding: '4px 10px',
        borderRadius: 999,
        border: `1px solid ${visible ? cfg.color + '40' : C.border}`,
        background: visible ? cfg.color + '12' : 'transparent',
        color: visible ? cfg.color : C.t3,
        fontSize: 11,
        fontWeight: 600,
        cursor: 'pointer',
        fontFamily: 'inherit',
        transition: 'all 150ms',
      }}
    >
      {visible ? <Eye size={12} /> : <EyeOff size={12} />}
      {cfg.label}
    </button>
  )
}

// ═══════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════════════

export default function ChannelHistoryChart({ channelId, days: initialDays = 30, height = 240 }) {
  const [days, setDays] = useState(initialDays)
  const [data, setData] = useState([])
  const [loading, setLoading] = useState(true)
  const [visible, setVisible] = useState({ subscribers: true, avg_views: true })

  const toggleLine = useCallback((key) => {
    setVisible((prev) => ({ ...prev, [key]: !prev[key] }))
  }, [])

  // Fetch snapshots
  useEffect(() => {
    if (!channelId) {
      setData([])
      setLoading(false)
      return
    }

    let cancelled = false
    setLoading(true)

    apiService
      .getChannelSnapshots(channelId, days)
      .then((res) => {
        if (cancelled) return
        if (res?.success && Array.isArray(res.data)) {
          setData(
            res.data.map((s) => ({
              date: s.date || s.fecha,
              subscribers: s.subscribers ?? s.seguidores ?? 0,
              avg_views: s.avg_views ?? null,
            })),
          )
        } else {
          setData([])
        }
      })
      .catch(() => {
        if (!cancelled) setData([])
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => { cancelled = true }
  }, [channelId, days])

  // ── Period selector + toggles ─────────────────────────────────────────
  const controls = (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: 8,
        marginBottom: 12,
      }}
    >
      {/* Period selector */}
      <div
        style={{
          display: 'flex',
          gap: 2,
          padding: 3,
          background: C.surfaceEl,
          borderRadius: 8,
        }}
      >
        {PERIODS.map((p) => (
          <button
            key={p.key}
            onClick={() => setDays(p.key)}
            style={{
              padding: '4px 12px',
              borderRadius: 6,
              border: 'none',
              background: days === p.key ? C.teal : 'transparent',
              color: days === p.key ? C.bg : C.t3,
              fontSize: 11,
              fontWeight: days === p.key ? 700 : 500,
              cursor: 'pointer',
              fontFamily: 'inherit',
              transition: 'all 120ms',
            }}
          >
            {p.label}
          </button>
        ))}
      </div>

      {/* Line toggles */}
      <div style={{ display: 'flex', gap: 6 }}>
        <LineToggle lineKey="subscribers" visible={visible.subscribers} onToggle={toggleLine} />
        <LineToggle lineKey="avg_views" visible={visible.avg_views} onToggle={toggleLine} />
      </div>
    </div>
  )

  // ── Render ────────────────────────────────────────────────────────────
  return (
    <div>
      {controls}

      {loading ? (
        <ChartSkeleton height={height} />
      ) : data.length < 2 ? (
        <EmptyState height={height} />
      ) : (
        <ResponsiveContainer width="100%" height={height}>
          <LineChart data={data} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke={C.border} />
            <XAxis
              dataKey="date"
              tickFormatter={fmtDate}
              tick={{ fontSize: 10, fill: C.t3 }}
              tickLine={false}
              axisLine={false}
            />
            {visible.subscribers && (
              <YAxis
                yAxisId="left"
                tick={{ fontSize: 10, fill: C.t3 }}
                tickLine={false}
                axisLine={false}
                tickFormatter={fmtNum}
              />
            )}
            {visible.avg_views && (
              <YAxis
                yAxisId="right"
                orientation="right"
                tick={{ fontSize: 10, fill: C.t3 }}
                tickLine={false}
                axisLine={false}
                tickFormatter={fmtNum}
              />
            )}
            <Tooltip content={<ChartTooltip />} />
            {visible.subscribers && (
              <Line
                yAxisId="left"
                type="monotone"
                dataKey="subscribers"
                name="Suscriptores"
                stroke={LINES.subscribers.color}
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 4, fill: LINES.subscribers.color }}
              />
            )}
            {visible.avg_views && (
              <Line
                yAxisId="right"
                type="monotone"
                dataKey="avg_views"
                name="Avg Views"
                stroke={LINES.avg_views.color}
                strokeWidth={2}
                strokeDasharray="5 5"
                dot={false}
                activeDot={{ r: 4, fill: LINES.avg_views.color }}
              />
            )}
          </LineChart>
        </ResponsiveContainer>
      )}
    </div>
  )
}
