import React, { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Grid3x3, TrendingUp, TrendingDown, Minus, Flame, Zap,
  AlertTriangle, ArrowRight, RefreshCw, Filter, Map,
} from 'lucide-react'
import apiService from '../../../../services/api'
import { FONT_BODY, FONT_DISPLAY, OK, WARN, ERR, BLUE } from '../../../theme/tokens'

const PURPLE = 'var(--accent, #8B5CF6)'
const purpleAlpha = (o) => `var(--accent-dim, rgba(139,92,246,${o}))`

// ─── Niche metadata (icons + display names) ────────────────────────────────
const NICHES = [
  { key: 'crypto',          label: 'Cripto',          emoji: '₿' },
  { key: 'finanzas',        label: 'Finanzas',        emoji: '💰' },
  { key: 'tecnologia',      label: 'Tecnología',      emoji: '💻' },
  { key: 'marketing',       label: 'Marketing',       emoji: '📣' },
  { key: 'ecommerce',       label: 'Ecommerce',       emoji: '🛒' },
  { key: 'salud',           label: 'Salud',           emoji: '🩺' },
  { key: 'entretenimiento', label: 'Entretenimiento', emoji: '🎬' },
  { key: 'noticias',        label: 'Noticias',        emoji: '📰' },
  { key: 'deporte',         label: 'Deporte',         emoji: '⚽' },
  { key: 'educacion',       label: 'Educación',       emoji: '🎓' },
  { key: 'lifestyle',       label: 'Lifestyle',       emoji: '🌿' },
  { key: 'otros',           label: 'Otros',           emoji: '🗂️' },
]

// ─── Opportunity scoring ───────────────────────────────────────────────────
function computeOpportunity({ trends, supply }) {
  if (!trends && !supply) return { score: null, label: 'Sin datos', color: '#94a3b8' }
  let s = 50
  // Quality bias
  if (trends?.casPromedio) {
    if (trends.casPromedio >= 70) s += 15
    else if (trends.casPromedio < 50) s -= 10
  }
  // Demand vs supply
  if (supply?.estado === 'high-demand') s += 25
  else if (supply?.estado === 'high-supply') s -= 15
  // CPM efficiency
  if (trends?.cpmPromedio != null && trends.cpmPromedio < 18) s += 5

  s = Math.max(0, Math.min(100, s))
  let color, label, emoji
  if (s >= 70)      { color = OK;   label = 'Alta oportunidad';  emoji = '🔥' }
  else if (s >= 50) { color = BLUE; label = 'Equilibrado';        emoji = '⚖️' }
  else if (s >= 30) { color = WARN; label = 'Saturado';           emoji = '⚠️' }
  else              { color = ERR;  label = 'Evitar';             emoji = '🚫' }
  return { score: s, label, color, emoji }
}

// ─── Niche card ────────────────────────────────────────────────────────────
function NicheCard({ niche, info, loading, onClick }) {
  const opp = info ? computeOpportunity(info) : null

  return (
    <button
      onClick={onClick}
      disabled={loading || !info}
      style={{
        background: 'var(--surface)',
        border: `1px solid ${opp?.color ? `${opp.color}40` : 'var(--border)'}`,
        borderRadius: 14,
        padding: 16,
        cursor: info ? 'pointer' : 'default',
        textAlign: 'left',
        fontFamily: FONT_BODY,
        position: 'relative',
        overflow: 'hidden',
        transition: 'transform .15s, box-shadow .15s',
        opacity: loading ? 0.55 : 1,
      }}
      onMouseEnter={e => { if (info) { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = `0 6px 20px ${opp?.color || PURPLE}20` } }}
      onMouseLeave={e => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = 'none' }}
    >
      {/* Color bar at top */}
      {opp && (
        <div style={{
          position: 'absolute', top: 0, left: 0, right: 0, height: 3,
          background: opp.color,
        }} />
      )}

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
        <div style={{
          width: 38, height: 38, borderRadius: 10,
          background: 'var(--bg2)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 20, flexShrink: 0,
        }}>{niche.emoji}</div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontFamily: FONT_DISPLAY, fontSize: 14, fontWeight: 700, color: 'var(--text)' }}>
            {niche.label}
          </div>
          {opp ? (
            <div style={{ fontSize: 11, color: opp.color, fontWeight: 600, marginTop: 2 }}>
              {opp.emoji} {opp.label}
            </div>
          ) : (
            <div style={{ fontSize: 11, color: 'var(--muted2)', marginTop: 2 }}>
              {loading ? 'Cargando...' : 'Sin datos'}
            </div>
          )}
        </div>
      </div>

      {/* Metrics grid */}
      {info && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
          <div style={{ background: 'var(--bg2)', borderRadius: 8, padding: '8px 10px' }}>
            <div style={{ fontSize: 10, color: 'var(--muted)', fontWeight: 600, marginBottom: 2 }}>CAS medio</div>
            <div style={{ fontFamily: FONT_DISPLAY, fontSize: 16, fontWeight: 800, color: 'var(--text)' }}>
              {info.trends?.casPromedio != null ? Number(info.trends.casPromedio).toFixed(0) : '—'}
            </div>
          </div>
          <div style={{ background: 'var(--bg2)', borderRadius: 8, padding: '8px 10px' }}>
            <div style={{ fontSize: 10, color: 'var(--muted)', fontWeight: 600, marginBottom: 2 }}>CPM medio</div>
            <div style={{ fontFamily: FONT_DISPLAY, fontSize: 16, fontWeight: 800, color: 'var(--text)' }}>
              {info.trends?.cpmPromedio != null ? `€${Number(info.trends.cpmPromedio).toFixed(1)}` : '—'}
            </div>
          </div>
        </div>
      )}

      {/* Supply / demand pill */}
      {info?.supply && (
        <div style={{ marginTop: 10, paddingTop: 10, borderTop: '1px solid var(--border)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--muted)' }}>
            <span>{info.supply.canalesActivos != null ? `${info.supply.canalesActivos} canales` : ''}</span>
            <span>{info.supply.demanda30d != null ? `${info.supply.demanda30d} camp/30d` : ''}</span>
          </div>
        </div>
      )}

      {/* Opportunity score bar */}
      {opp?.score != null && (
        <div style={{ marginTop: 10 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: 'var(--muted)', marginBottom: 4 }}>
            <span>Oportunidad</span>
            <span style={{ fontWeight: 700, color: opp.color }}>{opp.score}/100</span>
          </div>
          <div style={{ height: 5, background: 'var(--border)', borderRadius: 3, overflow: 'hidden' }}>
            <div style={{
              height: '100%', width: `${opp.score}%`, borderRadius: 3,
              background: `linear-gradient(90deg, ${opp.color}80, ${opp.color})`,
              transition: 'width .5s ease',
            }} />
          </div>
        </div>
      )}
    </button>
  )
}

// ─── Sort options ──────────────────────────────────────────────────────────
const SORT_OPTIONS = [
  { key: 'opportunity', label: 'Oportunidad' },
  { key: 'cas',         label: 'CAS más alto' },
  { key: 'cpm-low',     label: 'CPM más bajo' },
  { key: 'demand',      label: 'Demanda' },
  { key: 'name',        label: 'Alfabético' },
]

// ─── Main ──────────────────────────────────────────────────────────────────
export default function NicheHeatmapPage() {
  const navigate = useNavigate()
  const [nicheData, setNicheData] = useState({})  // { [nicheKey]: { trends, supply } }
  const [loading, setLoading] = useState(true)
  const [sort, setSort] = useState('opportunity')
  const [error, setError] = useState('')

  const loadAll = async () => {
    setLoading(true); setError('')
    try {
      const results = await Promise.all(NICHES.map(async (n) => {
        const [trends, supply] = await Promise.all([
          apiService.getNicheTrends(n.key, 30).catch(() => null),
          apiService.getNicheSupplyDemand(n.key).catch(() => null),
        ])
        return [n.key, {
          trends: trends?.success ? trends.data : null,
          supply: supply?.success ? supply.data : null,
        }]
      }))
      setNicheData(Object.fromEntries(results))
    } catch (e) {
      setError(e.message || 'Error al cargar nichos')
    }
    setLoading(false)
  }

  useEffect(() => { loadAll() }, [])

  // Sorted niches
  const sortedNiches = useMemo(() => {
    const arr = NICHES.map(n => ({
      ...n,
      info: nicheData[n.key],
      opp: nicheData[n.key] ? computeOpportunity(nicheData[n.key]) : null,
    }))
    arr.sort((a, b) => {
      switch (sort) {
        case 'cas':         return (b.info?.trends?.casPromedio || 0) - (a.info?.trends?.casPromedio || 0)
        case 'cpm-low':     return (a.info?.trends?.cpmPromedio || 999) - (b.info?.trends?.cpmPromedio || 999)
        case 'demand':      return (b.info?.supply?.demanda30d || 0) - (a.info?.supply?.demanda30d || 0)
        case 'name':        return a.label.localeCompare(b.label)
        case 'opportunity':
        default:            return (b.opp?.score || 0) - (a.opp?.score || 0)
      }
    })
    return arr
  }, [nicheData, sort])

  // Aggregate stats for the header
  const stats = useMemo(() => {
    const niches = Object.values(nicheData).filter(n => n?.trends || n?.supply)
    const high = niches.filter(n => {
      const o = computeOpportunity(n)
      return o.score >= 70
    }).length
    const sat = niches.filter(n => {
      const o = computeOpportunity(n)
      return o.score < 30
    }).length
    return { total: NICHES.length, withData: niches.length, high, sat }
  }, [nicheData])

  return (
    <div style={{ fontFamily: FONT_BODY, display: 'flex', flexDirection: 'column', gap: 24, maxWidth: 1200 }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
            <div style={{
              width: 40, height: 40, borderRadius: 12,
              background: purpleAlpha(0.12), border: `1px solid ${purpleAlpha(0.25)}`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <Map size={20} color={PURPLE} />
            </div>
            <h1 style={{
              fontFamily: FONT_DISPLAY, fontSize: 28, fontWeight: 800,
              color: 'var(--text)', letterSpacing: '-0.04em', lineHeight: 1.1, margin: 0,
            }}>
              Heatmap de nichos
            </h1>
          </div>
          <p style={{ fontSize: 14, color: 'var(--muted)', lineHeight: 1.5 }}>
            Vista general del mercado: oportunidad, CPM medio, demanda y oferta por nicho.
          </p>
        </div>
        <button onClick={loadAll} disabled={loading}
          style={{
            background: 'var(--surface)', border: '1px solid var(--border)',
            borderRadius: 10, padding: '8px 14px', cursor: loading ? 'wait' : 'pointer',
            color: 'var(--muted)', display: 'flex', alignItems: 'center', gap: 6,
            fontSize: 12, fontWeight: 600, fontFamily: FONT_BODY,
          }}>
          <RefreshCw size={12} className={loading ? 'animate-spin' : ''} />
          Actualizar
        </button>
      </div>

      {/* Summary KPIs */}
      <div style={{
        display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12,
      }}>
        {[
          { label: 'Nichos analizados', val: `${stats.withData}/${stats.total}`, color: PURPLE, icon: Grid3x3 },
          { label: 'Alta oportunidad',  val: stats.high,  color: OK,  icon: Flame },
          { label: 'Saturados',         val: stats.sat,   color: ERR, icon: AlertTriangle },
          { label: 'Equilibrados',      val: stats.withData - stats.high - stats.sat, color: BLUE, icon: Minus },
        ].map(s => (
          <div key={s.label} style={{
            background: 'var(--surface)', border: '1px solid var(--border)',
            borderRadius: 12, padding: 14,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
              <s.icon size={14} color={s.color} />
              <span style={{ fontSize: 11, color: 'var(--muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                {s.label}
              </span>
            </div>
            <div style={{ fontFamily: FONT_DISPLAY, fontSize: 24, fontWeight: 800, color: 'var(--text)' }}>
              {s.val}
            </div>
          </div>
        ))}
      </div>

      {/* Sort */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
        <Filter size={14} color="var(--muted)" />
        <span style={{ fontSize: 12, color: 'var(--muted)', fontWeight: 600 }}>Ordenar por:</span>
        {SORT_OPTIONS.map(opt => {
          const active = sort === opt.key
          return (
            <button key={opt.key} onClick={() => setSort(opt.key)} style={{
              background: active ? PURPLE : 'var(--surface)',
              color: active ? '#fff' : 'var(--muted)',
              border: `1px solid ${active ? PURPLE : 'var(--border)'}`,
              borderRadius: 8, padding: '5px 12px',
              fontSize: 12, fontWeight: 600, cursor: 'pointer',
              fontFamily: FONT_BODY,
            }}>{opt.label}</button>
          )
        })}
      </div>

      {error && (
        <div role="alert" style={{
          background: `${ERR}10`, border: `1px solid ${ERR}30`, color: ERR,
          borderRadius: 10, padding: '10px 14px', fontSize: 13,
        }}>{error}</div>
      )}

      {/* Heatmap grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))',
        gap: 14,
      }}>
        {sortedNiches.map(n => (
          <NicheCard
            key={n.key}
            niche={n}
            info={n.info}
            loading={loading && !n.info}
            onClick={() => navigate(`/advertiser/explore?categoria=${encodeURIComponent(n.key)}`)}
          />
        ))}
      </div>

      {/* Legend */}
      <div style={{
        background: 'var(--surface)', border: '1px solid var(--border)',
        borderRadius: 12, padding: 16,
      }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 10 }}>
          Cómo se calcula la oportunidad
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 10, fontSize: 12, color: 'var(--text)' }}>
          {[
            { color: OK,   icon: '🔥', text: '≥70: alta demanda + buena calidad + CPM razonable' },
            { color: BLUE, icon: '⚖️', text: '50-69: oferta y demanda equilibradas' },
            { color: WARN, icon: '⚠️', text: '30-49: nicho saturado o calidad media' },
            { color: ERR,  icon: '🚫', text: '<30: sobre oferta o señales débiles' },
          ].map((l, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{
                width: 8, height: 8, borderRadius: '50%', background: l.color, flexShrink: 0,
              }} />
              <span style={{ color: 'var(--muted)' }}><span>{l.icon}</span> {l.text}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
