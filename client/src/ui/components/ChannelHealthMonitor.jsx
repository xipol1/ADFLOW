import React, { useState, useEffect, useMemo } from 'react'
import { Activity, TrendingUp, TrendingDown, Minus, Users, Eye, BarChart3 } from 'lucide-react'
import apiService from '../../services/api'
import { FONT_BODY, FONT_DISPLAY, OK, WARN, ERR, BLUE } from '../theme/tokens'

const PURPLE = 'var(--accent, #8B5CF6)'
const purpleAlpha = (o) => `var(--accent-dim, rgba(139,92,246,${o}))`


/**
 * ChannelHealthMonitor
 * Compares channel snapshots from BEFORE the campaign launched against
 * snapshots from DURING/AFTER, and shows health-of-the-channel deltas.
 *
 * Uses apiService.getChannelSnapshots(channelId, days).
 *
 * Props:
 *   channelId   — Mongo id of the channel (required)
 *   campaignAt  — ISO date string when the campaign was paid/published.
 *                 Used as the cutover point. Falls back to halfway.
 *   plataforma  — 'telegram' | 'instagram' | 'youtube' | ... (optional)
 */
export default function ChannelHealthMonitor({ channelId, campaignAt, plataforma }) {
  const [snapshots, setSnapshots] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!channelId) return
    let cancelled = false
    setLoading(true); setError('')
    apiService.getChannelSnapshots(channelId, 60)
      .then(res => {
        if (cancelled) return
        if (res?.success && Array.isArray(res.data)) setSnapshots(res.data)
        else setError('Sin datos de snapshot')
      })
      .catch(() => { if (!cancelled) setError('No se pudieron cargar las métricas') })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [channelId])

  // Split snapshots into baseline (before campaign) vs during/after
  const split = useMemo(() => {
    if (!snapshots || snapshots.length < 2) return null
    const sorted = [...snapshots].sort((a, b) => {
      const da = new Date(a.date || a.fecha).getTime()
      const db = new Date(b.date || b.fecha).getTime()
      return da - db
    })
    const cutoverTs = campaignAt ? new Date(campaignAt).getTime() : sorted[Math.floor(sorted.length / 2)] && new Date(sorted[Math.floor(sorted.length / 2)].date || sorted[Math.floor(sorted.length / 2)].fecha).getTime()
    const baseline = sorted.filter(s => new Date(s.date || s.fecha).getTime() < cutoverTs)
    const during = sorted.filter(s => new Date(s.date || s.fecha).getTime() >= cutoverTs)
    return { baseline, during, all: sorted }
  }, [snapshots, campaignAt])

  if (!channelId) return null

  if (loading) {
    return (
      <div style={{
        background: 'var(--bg)', border: `1px solid ${purpleAlpha(0.18)}`,
        borderRadius: 12, padding: 14,
        animation: 'pulse 1.5s ease-in-out infinite',
        fontSize: 12, color: 'var(--muted)',
      }}>
        Cargando salud del canal…
      </div>
    )
  }

  if (error || !split || split.all.length < 2) {
    return (
      <div style={{
        background: 'var(--bg)', border: `1px solid var(--border)`,
        borderRadius: 12, padding: 14,
        fontSize: 12, color: 'var(--muted)',
        display: 'flex', alignItems: 'center', gap: 8,
      }}>
        <Activity size={13} />
        Aún no hay suficientes snapshots para evaluar la salud del canal durante la campaña.
      </div>
    )
  }

  // Compute deltas
  const avg = (arr, key) => arr.length === 0 ? null : arr.reduce((s, x) => s + (Number(x[key]) || 0), 0) / arr.length
  const last = (arr, key) => arr.length === 0 ? null : Number(arr[arr.length - 1][key]) || 0

  const isTelegram = plataforma === 'telegram'
  const secondaryKey = isTelegram ? 'avg_views' : 'CAS'
  const secondaryLabel = isTelegram ? 'Vistas medias' : 'Score CAS'
  const secondaryIcon = isTelegram ? Eye : BarChart3

  const subsBefore = avg(split.baseline, 'subscribers') ?? avg(split.baseline, 'seguidores')
  const subsDuring = last(split.during, 'subscribers') ?? last(split.during, 'seguidores')
  const secBefore = avg(split.baseline, secondaryKey)
  const secDuring = last(split.during, secondaryKey)

  function delta(a, b) {
    if (a == null || b == null || a === 0) return null
    return ((b - a) / a) * 100
  }

  const subsDelta = delta(subsBefore, subsDuring)
  const secDelta = delta(secBefore, secDuring)

  // Build a tiny sparkline over all snapshots for the secondary metric
  const sparkData = split.all.map(s => Number(s[secondaryKey]) || 0)
  const sparkMax = Math.max(...sparkData, 1)
  const sparkMin = Math.min(...sparkData)
  const sparkRange = Math.max(sparkMax - sparkMin, 1)

  // Cutover index in the spark
  const cutoverTs = campaignAt ? new Date(campaignAt).getTime() : null
  const cutoverIdx = cutoverTs
    ? split.all.findIndex(s => new Date(s.date || s.fecha).getTime() >= cutoverTs)
    : Math.floor(split.all.length / 2)

  function metricRow({ icon: Icon, label, before, after, deltaPct, format = (n) => n != null ? Number(n).toLocaleString('es', { maximumFractionDigits: 1 }) : '—' }) {
    const trendColor = deltaPct == null ? 'var(--muted)' : deltaPct > 1 ? OK : deltaPct < -1 ? ERR : 'var(--muted)'
    const TrendIcon = deltaPct == null ? Minus : deltaPct > 1 ? TrendingUp : deltaPct < -1 ? TrendingDown : Minus
    return (
      <div style={{
        display: 'grid', gridTemplateColumns: '1fr auto auto auto', gap: 10, alignItems: 'center',
        padding: '8px 10px',
        background: 'var(--surface)', border: '1px solid var(--border)',
        borderRadius: 8,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--text)' }}>
          <Icon size={12} color={PURPLE} />
          <strong>{label}</strong>
        </div>
        <div style={{ fontSize: 11, color: 'var(--muted)' }}>
          Antes: <strong style={{ color: 'var(--text)' }}>{format(before)}</strong>
        </div>
        <div style={{ fontSize: 11, color: 'var(--muted)' }}>
          Ahora: <strong style={{ color: 'var(--text)' }}>{format(after)}</strong>
        </div>
        <div style={{
          display: 'flex', alignItems: 'center', gap: 3,
          background: `${trendColor}14`, border: `1px solid ${trendColor}30`,
          borderRadius: 14, padding: '2px 8px',
          color: trendColor, fontSize: 11, fontWeight: 700,
        }}>
          <TrendIcon size={10} strokeWidth={2.4} />
          {deltaPct == null ? '—' : `${deltaPct > 0 ? '+' : ''}${deltaPct.toFixed(1)}%`}
        </div>
      </div>
    )
  }

  return (
    <div style={{
      background: 'var(--bg)', border: `1px solid ${purpleAlpha(0.2)}`,
      borderRadius: 12, padding: 14,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <Activity size={13} color={PURPLE} />
          <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Salud del canal · baseline vs durante campaña
          </span>
        </div>
        <span style={{ fontSize: 10, color: 'var(--muted2)' }}>
          {split.baseline.length} snap antes · {split.during.length} durante
        </span>
      </div>

      {/* Sparkline with cutover marker */}
      <div style={{ position: 'relative', height: 40, marginBottom: 12 }}>
        <svg width="100%" height="40" style={{ overflow: 'visible' }} preserveAspectRatio="none" viewBox={`0 0 ${Math.max(sparkData.length - 1, 1)} 40`}>
          {/* Pre-campaign segment */}
          <polyline
            fill="none" stroke="var(--muted2)" strokeWidth="1.5"
            points={sparkData.slice(0, Math.max(cutoverIdx + 1, 1)).map((v, i) =>
              `${i},${40 - ((v - sparkMin) / sparkRange) * 32 - 4}`
            ).join(' ')}
          />
          {/* During-campaign segment */}
          <polyline
            fill="none" stroke={PURPLE} strokeWidth="2"
            points={sparkData.slice(cutoverIdx).map((v, i) =>
              `${cutoverIdx + i},${40 - ((v - sparkMin) / sparkRange) * 32 - 4}`
            ).join(' ')}
          />
          {/* Cutover line */}
          {cutoverIdx > 0 && cutoverIdx < sparkData.length - 1 && (
            <line
              x1={cutoverIdx} y1="0" x2={cutoverIdx} y2="40"
              stroke={PURPLE} strokeDasharray="2 2" strokeWidth="1" opacity="0.4"
            />
          )}
        </svg>
        <div style={{
          position: 'absolute', bottom: -4, right: 0,
          fontSize: 9, color: 'var(--muted2)',
        }}>
          {secondaryLabel}
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {metricRow({
          icon: Users,
          label: 'Suscriptores',
          before: subsBefore,
          after: subsDuring,
          deltaPct: subsDelta,
        })}
        {metricRow({
          icon: secondaryIcon,
          label: secondaryLabel,
          before: secBefore,
          after: secDuring,
          deltaPct: secDelta,
        })}
      </div>
    </div>
  )
}
