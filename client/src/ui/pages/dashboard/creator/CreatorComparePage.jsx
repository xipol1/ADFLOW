import React, { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  GitCompare, Crown, TrendingUp, TrendingDown, Plus, X,
  Wallet, Users, Activity, Target, Star, Radio, Sparkles,
  ArrowRight, AlertTriangle, CheckCircle2, Eye, Zap,
} from 'lucide-react'
import { useAuth } from '../../../../auth/AuthContext'
import apiService from '../../../../services/api'
import { FONT_BODY as F, FONT_DISPLAY as D, GREEN, greenAlpha, OK, WARN, ERR, BLUE, PLAT_COLORS } from '../../../theme/tokens'
import { CASBadge, CPMBadge } from '../../../components/scoring'

const ACCENT = GREEN
const ga = greenAlpha
const fmtEur = (n) => `€${Math.round(Number(n) || 0).toLocaleString('es')}`
const fmtNum = (n) => Math.round(Number(n) || 0).toLocaleString('es')
const fmtPct = (n, d = 1) => `${(Number(n) || 0).toFixed(d)}%`

/**
 * CreatorComparePage — Side-by-side de canales propios.
 *
 * Espejo del CompareChannelsPage del advertiser pero centrado en el creator:
 *   - Selector de hasta 4 canales para comparar
 *   - Tabla con métricas clave + highlight del ganador
 *   - Radar chart de los 5 factores CAS
 *   - Cross-platform: Telegram vs WhatsApp vs Discord en una misma vista
 *   - Reallocation simulator: si subo precio en X y mantengo Y, ¿cuál es el lift?
 */
export default function CreatorComparePage() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [channels, setChannels] = useState([])
  const [campaigns, setCampaigns] = useState([])
  const [selectedIds, setSelectedIds] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let mounted = true
    const load = async () => {
      try {
        const [chRes, cmpRes] = await Promise.all([
          apiService.getMyChannels(),
          apiService.getCreatorCampaigns?.().catch(() => null),
        ])
        if (!mounted) return
        if (chRes?.success) {
          const items = Array.isArray(chRes.data) ? chRes.data : chRes.data?.items || []
          setChannels(items)
          const sorted = items.slice().sort((a, b) => (b.CAS || 0) - (a.CAS || 0))
          setSelectedIds(sorted.slice(0, Math.min(3, sorted.length)).map(c => c._id || c.id))
        }
        if (cmpRes?.success && Array.isArray(cmpRes.data)) setCampaigns(cmpRes.data)
      } catch (e) { console.error(e) }
      if (mounted) setLoading(false)
    }
    load()
    return () => { mounted = false }
  }, [])

  const selected = useMemo(
    () => selectedIds.map(id => channels.find(c => (c._id || c.id) === id)).filter(Boolean),
    [selectedIds, channels],
  )

  const enriched = useMemo(() => selected.map(ch => enrichChannel(ch, campaigns)), [selected, campaigns])

  const winners = useMemo(() => {
    if (enriched.length < 2) return {}
    return {
      cas:        argMaxIdx(enriched, c => c.cas),
      cpm:        argMaxIdx(enriched, c => c.cpm),
      audience:   argMaxIdx(enriched, c => c.audience),
      engagement: argMaxIdx(enriched, c => c.engagement),
      revenue:    argMaxIdx(enriched, c => c.totalRevenue),
      rating:     argMaxIdx(enriched, c => c.avgRating),
      campaigns:  argMaxIdx(enriched, c => c.completedCount),
      health:     argMaxIdx(enriched, c => c.healthScore),
    }
  }, [enriched])

  const overallWinnerIdx = useMemo(() => {
    if (enriched.length < 2) return -1
    const scores = enriched.map(c => (
      c.cas * 0.30 + (c.cpm / 30) * 100 * 0.20 + c.engagement * 100 * 50 * 0.15
      + (c.totalRevenue / 1000) * 0.15 + c.avgRating * 20 * 0.10 + c.healthScore * 0.10
    ))
    return scores.indexOf(Math.max(...scores))
  }, [enriched])

  if (loading) return <Skeleton />
  if (channels.length === 0) return <NoChannelsCTA navigate={navigate} />
  if (channels.length < 2) return <SingleChannelCTA navigate={navigate} />

  const remaining = channels.filter(c => !selectedIds.includes(c._id || c.id))

  return (
    <div style={{ fontFamily: F, display: 'flex', flexDirection: 'column', gap: 22, maxWidth: 1200 }}>

      <div>
        <h1 style={{ fontFamily: D, fontSize: 26, fontWeight: 800, color: 'var(--text)', letterSpacing: '-0.03em', margin: '0 0 6px' }}>
          Comparar canales
        </h1>
        <p style={{ fontSize: 14, color: 'var(--muted)', margin: 0 }}>
          Lado a lado: CAS, CPM, audiencia, ingresos. Detecta dónde subir precio y dónde reasignar esfuerzo.
        </p>
      </div>

      {/* Channel chips selector */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
        {selected.map((ch, i) => (
          <span key={ch._id || ch.id} style={{
            display: 'inline-flex', alignItems: 'center', gap: 6,
            background: i === overallWinnerIdx ? ga(0.12) : 'var(--surface)',
            border: `1px solid ${i === overallWinnerIdx ? ga(0.35) : 'var(--border)'}`,
            borderRadius: 20, padding: '5px 10px 5px 14px', fontSize: 12, fontWeight: 600,
            color: 'var(--text)',
          }}>
            {i === overallWinnerIdx && <Crown size={11} color="#f59e0b" />}
            {ch.nombreCanal || 'Canal'}
            {ch.CAS > 0 && <CASBadge CAS={ch.CAS} nivel={ch.nivel} size="xs" />}
            {selectedIds.length > 2 && (
              <button onClick={() => setSelectedIds(selectedIds.filter(id => id !== (ch._id || ch.id)))}
                style={{ background: 'transparent', border: 'none', cursor: 'pointer', padding: 0, color: 'var(--muted)', display: 'flex', marginLeft: 2 }}
                title="Quitar de la comparación">
                <X size={12} />
              </button>
            )}
          </span>
        ))}
        {selectedIds.length < 4 && remaining.length > 0 && (
          <ChannelAdder remaining={remaining} onAdd={(id) => setSelectedIds([...selectedIds, id])} />
        )}
      </div>

      {/* Overall winner banner */}
      {overallWinnerIdx >= 0 && enriched.length >= 2 && (
        <div style={{
          background: `linear-gradient(135deg, var(--surface) 0%, ${ga(0.08)} 100%)`,
          border: `1px solid ${ga(0.3)}`, borderRadius: 14,
          padding: 16, display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap',
        }}>
          <div style={{
            width: 44, height: 44, borderRadius: 12, flexShrink: 0,
            background: 'rgba(245,158,11,0.15)', border: '1px solid rgba(245,158,11,0.3)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <Crown size={20} color="#f59e0b" />
          </div>
          <div style={{ flex: 1, minWidth: 200 }}>
            <div style={{ fontSize: 11, color: '#f59e0b', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 3 }}>
              Mejor canal global
            </div>
            <div style={{ fontFamily: D, fontSize: 18, fontWeight: 800, color: 'var(--text)', letterSpacing: '-0.02em' }}>
              {enriched[overallWinnerIdx].nombreCanal}
            </div>
            <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 2 }}>
              Lidera en {Object.values(winners).filter(idx => idx === overallWinnerIdx).length} de 8 métricas clave
            </div>
          </div>
        </div>
      )}

      {/* Comparison table */}
      <ComparisonTable channels={enriched} winners={winners} />

      {/* Radar chart of CAS factors */}
      {enriched.length >= 2 && enriched.some(c => c.cas > 0) && (
        <RadarSection channels={enriched} />
      )}

      {/* Reallocation simulator */}
      <ReallocationSimulator channels={enriched} />

      {/* Insights */}
      <ComparisonInsights channels={enriched} winners={winners} navigate={navigate} />
    </div>
  )
}

// ─── Channel adder ──────────────────────────────────────────────────────────
function ChannelAdder({ remaining, onAdd }) {
  const [open, setOpen] = useState(false)
  return (
    <div style={{ position: 'relative' }}>
      <button onClick={() => setOpen(o => !o)} style={{
        display: 'inline-flex', alignItems: 'center', gap: 6,
        background: 'transparent', color: ACCENT, border: `1px dashed ${ga(0.4)}`,
        borderRadius: 20, padding: '5px 12px', fontSize: 12, fontWeight: 600,
        cursor: 'pointer', fontFamily: F,
      }}>
        <Plus size={12} /> Añadir canal
      </button>
      {open && (
        <>
          <div onClick={() => setOpen(false)} style={{ position: 'fixed', inset: 0, zIndex: 998 }} />
          <div style={{
            position: 'absolute', top: 'calc(100% + 6px)', left: 0, zIndex: 999,
            background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 10,
            boxShadow: '0 12px 36px rgba(0,0,0,0.25)', minWidth: 220, maxHeight: 280, overflowY: 'auto',
          }}>
            {remaining.map(c => (
              <button key={c._id || c.id} onClick={() => { onAdd(c._id || c.id); setOpen(false) }} style={{
                width: '100%', textAlign: 'left', background: 'transparent', border: 'none',
                padding: '9px 12px', cursor: 'pointer', fontFamily: F,
                display: 'flex', alignItems: 'center', gap: 8,
                borderBottom: '1px solid var(--border)',
              }}>
                <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', flex: 1 }}>
                  {c.nombreCanal || 'Canal'}
                </span>
                <span style={{ fontSize: 10.5, color: 'var(--muted)' }}>{c.plataforma}</span>
                {c.CAS > 0 && <CASBadge CAS={c.CAS} nivel={c.nivel} size="xs" />}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  )
}

// ─── Comparison table ───────────────────────────────────────────────────────
function ComparisonTable({ channels, winners }) {
  const rows = [
    { key: 'cas',          label: 'CAS Score',     icon: Target,    fmt: (v) => Math.round(v) || '—' },
    { key: 'cpm',          label: 'CPM dinámico',  icon: Wallet,    fmt: (v) => v ? `€${v.toFixed(2)}` : '—' },
    { key: 'audience',     label: 'Audiencia',     icon: Users,     fmt: fmtNum },
    { key: 'engagement',   label: 'Engagement',    icon: Activity,  fmt: (v) => v ? fmtPct(v * 100, 2) : '—' },
    { key: 'completedCount', label: 'Campañas',    icon: TrendingUp,fmt: (v) => v || 0 },
    { key: 'totalRevenue', label: 'Ingresos totales', icon: Wallet, fmt: fmtEur },
    { key: 'avgRating',    label: 'Rating medio',  icon: Star,      fmt: (v) => v ? `${v.toFixed(1)} ★` : '—' },
    { key: 'healthScore',  label: 'Health',        icon: Sparkles,  fmt: (v) => Math.round(v) || '—' },
  ]

  return (
    <div style={{
      background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12,
      overflow: 'hidden',
    }}>
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 600 }}>
          <thead>
            <tr style={{ background: 'var(--bg2)' }}>
              <th style={{ ...thStyle, width: 180, position: 'sticky', left: 0, background: 'var(--bg2)', zIndex: 1 }}>
                Métrica
              </th>
              {channels.map((ch, i) => {
                const platColor = PLAT_COLORS[(ch.plataforma || '').charAt(0).toUpperCase() + (ch.plataforma || '').slice(1)] || ACCENT
                return (
                  <th key={ch._id || ch.id} style={{ ...thStyle, minWidth: 160, textAlign: 'left' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                      <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 200 }}>
                        {ch.nombreCanal || 'Canal'}
                      </span>
                      <span style={{
                        background: `${platColor}18`, color: platColor,
                        border: `1px solid ${platColor}35`, borderRadius: 5,
                        padding: '1px 6px', fontSize: 10, fontWeight: 600, alignSelf: 'flex-start',
                      }}>
                        {ch.plataforma}
                      </span>
                    </div>
                  </th>
                )
              })}
            </tr>
          </thead>
          <tbody>
            {rows.map(row => {
              const Icon = row.icon
              const winnerIdx = winners[row.key]
              return (
                <tr key={row.key} style={{ borderTop: '1px solid var(--border)' }}>
                  <td style={{ ...tdStyle, position: 'sticky', left: 0, background: 'var(--surface)', zIndex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 7, color: 'var(--muted)' }}>
                      <Icon size={12} color={ACCENT} strokeWidth={2.2} />
                      <span style={{ fontSize: 12.5, fontWeight: 600 }}>{row.label}</span>
                    </div>
                  </td>
                  {channels.map((ch, i) => {
                    const isWinner = winnerIdx === i && channels.length >= 2
                    const v = ch[row.key]
                    return (
                      <td key={ch._id || ch.id} style={tdStyle}>
                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                          <span style={{
                            fontFamily: D, fontSize: 14, fontWeight: 700,
                            color: isWinner ? OK : 'var(--text)',
                            fontVariantNumeric: 'tabular-nums',
                          }}>
                            {row.fmt(v)}
                          </span>
                          {isWinner && (
                            <span title="Ganador en esta métrica" style={{
                              background: `${OK}15`, border: `1px solid ${OK}30`,
                              borderRadius: 4, padding: '1px 4px', display: 'inline-flex',
                            }}>
                              <Crown size={9} color={OK} />
                            </span>
                          )}
                        </div>
                      </td>
                    )
                  })}
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// ─── Radar chart ────────────────────────────────────────────────────────────
function RadarSection({ channels }) {
  const factors = ['CAF', 'CTF', 'CER', 'CVS', 'CAP']
  const labels = ['Audiencia', 'Confianza', 'Engagement', 'Estabilidad', 'Performance']
  const colors = [ACCENT, BLUE, '#8B5CF6', '#ec4899']
  const size = 280
  const cx = size / 2
  const cy = size / 2
  const r = size / 2 - 30

  const pointFor = (val, axisIdx) => {
    const angle = (axisIdx / 5) * Math.PI * 2 - Math.PI / 2
    const dist = (val / 100) * r
    return [cx + dist * Math.cos(angle), cy + dist * Math.sin(angle)]
  }

  return (
    <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, padding: 18 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
        <Target size={15} color={ACCENT} />
        <h3 style={{ fontFamily: D, fontSize: 15, fontWeight: 700, color: 'var(--text)', margin: 0, letterSpacing: '-0.02em' }}>
          Comparativa de factores CAS
        </h3>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 24, flexWrap: 'wrap', justifyContent: 'center' }}>
        <svg width={size} height={size}>
          {/* Background grid */}
          {[0.25, 0.5, 0.75, 1].map(scale => {
            const points = factors.map((_, i) => {
              const angle = (i / 5) * Math.PI * 2 - Math.PI / 2
              return `${cx + r * scale * Math.cos(angle)},${cy + r * scale * Math.sin(angle)}`
            }).join(' ')
            return <polygon key={scale} points={points} fill="none" stroke="var(--border)" strokeWidth="1" />
          })}
          {/* Axes */}
          {factors.map((f, i) => {
            const angle = (i / 5) * Math.PI * 2 - Math.PI / 2
            return <line key={f} x1={cx} y1={cy} x2={cx + r * Math.cos(angle)} y2={cy + r * Math.sin(angle)} stroke="var(--border)" strokeWidth="1" />
          })}
          {/* Channel polygons */}
          {channels.map((ch, idx) => {
            const c = colors[idx % colors.length]
            const pts = factors.map((f, i) => pointFor(ch[f] || 0, i))
            const path = pts.map(([x, y]) => `${x},${y}`).join(' ')
            return (
              <g key={ch._id || ch.id}>
                <polygon points={path} fill={c} fillOpacity="0.15" stroke={c} strokeWidth="2" />
                {pts.map(([x, y], i) => <circle key={i} cx={x} cy={y} r="3" fill={c} />)}
              </g>
            )
          })}
          {/* Labels */}
          {labels.map((label, i) => {
            const angle = (i / 5) * Math.PI * 2 - Math.PI / 2
            const x = cx + (r + 18) * Math.cos(angle)
            const y = cy + (r + 18) * Math.sin(angle)
            return (
              <text key={label} x={x} y={y} fontSize="11" fill="var(--muted)" textAnchor="middle" dominantBaseline="middle" fontWeight="600">
                {label}
              </text>
            )
          })}
        </svg>

        {/* Legend */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {channels.map((ch, idx) => (
            <div key={ch._id || ch.id} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{ width: 14, height: 14, borderRadius: 3, background: colors[idx % colors.length] }} />
              <span style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--text)' }}>
                {ch.nombreCanal}
              </span>
              <span style={{ fontSize: 11, color: 'var(--muted)' }}>
                CAS {Math.round(ch.cas) || 0}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// ─── Reallocation simulator ─────────────────────────────────────────────────
// "Si subo precio en X canal, ¿cuánto extra gano vs perder bookings?"
function ReallocationSimulator({ channels }) {
  const [adjustments, setAdjustments] = useState({})

  const sims = channels.map(ch => {
    const id = ch._id || ch.id
    const adj = adjustments[id] ?? 0 // percent change: -50 to +100
    const newPrice = (ch.cpm || 0) * (1 + adj / 100)
    // Simple elasticity model: +1% price → -0.4% volume
    const elasticity = -0.4
    const volumeChange = elasticity * adj
    const baseRevenue = ch.totalRevenue || ch.cpm * 12 || 100
    const newRevenue = baseRevenue * (1 + adj / 100) * (1 + volumeChange / 100)
    return { ch, adj, newPrice, newRevenue, delta: newRevenue - baseRevenue, baseRevenue }
  })

  const totalBase = sims.reduce((s, x) => s + x.baseRevenue, 0)
  const totalNew = sims.reduce((s, x) => s + x.newRevenue, 0)
  const totalDelta = totalNew - totalBase

  return (
    <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, padding: 18 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
        <Zap size={15} color={ACCENT} />
        <h3 style={{ fontFamily: D, fontSize: 15, fontWeight: 700, color: 'var(--text)', margin: 0, letterSpacing: '-0.02em' }}>
          Simulador de pricing
        </h3>
      </div>
      <p style={{ fontSize: 12, color: 'var(--muted)', margin: '0 0 14px 0', lineHeight: 1.5 }}>
        Mueve los sliders para simular qué pasa si subes (o bajas) precio en cada canal.
        Modelo: cada +1% de precio reduce ~0.4% de volumen (elasticidad típica del mercado).
      </p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {sims.map(s => (
          <div key={s.ch._id || s.ch.id} style={{
            background: 'var(--bg2)', borderRadius: 10, padding: 12,
            display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap',
          }}>
            <div style={{ minWidth: 140, flex: 1 }}>
              <div style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--text)', marginBottom: 2 }}>
                {s.ch.nombreCanal}
              </div>
              <div style={{ fontSize: 10.5, color: 'var(--muted)' }}>
                Base: {fmtEur(s.baseRevenue)} · CPM €{(s.ch.cpm || 0).toFixed(2)}
              </div>
            </div>
            <div style={{ flex: 2, minWidth: 200, display: 'flex', alignItems: 'center', gap: 10 }}>
              <input type="range" min="-50" max="100" value={s.adj}
                onChange={e => setAdjustments({ ...adjustments, [s.ch._id || s.ch.id]: Number(e.target.value) })}
                style={{ flex: 1, accentColor: ACCENT }}
              />
              <span style={{
                fontFamily: D, fontSize: 14, fontWeight: 800,
                color: s.adj > 0 ? OK : s.adj < 0 ? ERR : 'var(--muted)',
                minWidth: 50, textAlign: 'right', fontVariantNumeric: 'tabular-nums',
              }}>
                {s.adj > 0 ? '+' : ''}{s.adj}%
              </span>
            </div>
            <div style={{
              background: s.delta >= 0 ? `${OK}10` : `${ERR}10`,
              border: `1px solid ${s.delta >= 0 ? OK : ERR}30`,
              borderRadius: 8, padding: '6px 10px', minWidth: 110, textAlign: 'right',
            }}>
              <div style={{ fontSize: 9.5, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.04em', fontWeight: 700 }}>
                Δ ingresos
              </div>
              <div style={{
                fontFamily: D, fontSize: 14, fontWeight: 800,
                color: s.delta >= 0 ? OK : ERR, fontVariantNumeric: 'tabular-nums',
              }}>
                {s.delta >= 0 ? '+' : ''}{fmtEur(s.delta)}
              </div>
            </div>
          </div>
        ))}
      </div>

      <div style={{
        marginTop: 12, padding: '10px 14px',
        background: totalDelta >= 0 ? ga(0.08) : `${ERR}08`,
        border: `1px solid ${totalDelta >= 0 ? ga(0.3) : `${ERR}30`}`,
        borderRadius: 9, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap',
      }}>
        <div>
          <div style={{ fontSize: 11, color: 'var(--muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            Resultado total simulado
          </div>
          <div style={{ fontFamily: D, fontSize: 18, fontWeight: 800, color: totalDelta >= 0 ? OK : ERR, fontVariantNumeric: 'tabular-nums' }}>
            {totalDelta >= 0 ? '+' : ''}{fmtEur(totalDelta)} <span style={{ fontSize: 12, color: 'var(--muted)', fontWeight: 600 }}>vs base</span>
          </div>
        </div>
        <button onClick={() => setAdjustments({})} style={{
          background: 'transparent', color: 'var(--muted)', border: '1px solid var(--border)',
          borderRadius: 8, padding: '6px 12px', fontSize: 11.5, fontWeight: 600,
          cursor: 'pointer', fontFamily: F,
        }}>
          Restablecer
        </button>
      </div>
    </div>
  )
}

// ─── Insights / recommendations ─────────────────────────────────────────────
function ComparisonInsights({ channels, winners, navigate }) {
  const insights = useMemo(() => {
    const out = []
    if (channels.length < 2) return out

    // Find biggest gap between top and bottom CAS
    const cass = channels.map(c => c.cas).filter(v => v > 0)
    if (cass.length >= 2) {
      const max = Math.max(...cass)
      const min = Math.min(...cass)
      if (max - min > 30) {
        const top = channels[winners.cas]
        const bottom = channels.find(c => c.cas === min)
        out.push({
          icon: AlertTriangle, color: WARN, priority: 1,
          title: `Brecha de ${Math.round(max - min)} pts entre tu mejor y peor canal`,
          body: `${top.nombreCanal} (CAS ${Math.round(max)}) vs ${bottom?.nombreCanal} (CAS ${Math.round(min)}). Considera si vale la pena seguir invirtiendo en el de menor score o reasignar.`,
        })
      }
    }

    // Underpriced (high CAS, low CPM)
    channels.forEach(ch => {
      if (ch.cas > 60 && ch.cpm > 0 && ch.cpm < 10) {
        out.push({
          icon: TrendingUp, color: OK, priority: 5,
          title: `${ch.nombreCanal} está infravalorado`,
          body: `CAS ${Math.round(ch.cas)} pero CPM solo €${ch.cpm.toFixed(2)}. Sube precio sin perder bookings.`,
          cta: 'Ver pricing',
          path: '/creator/pricing',
        })
      }
    })

    // Cross-platform diversity
    const platforms = new Set(channels.map(c => c.plataforma))
    if (platforms.size === 1) {
      out.push({
        icon: Sparkles, color: BLUE, priority: 20,
        title: 'Solo estás en una plataforma',
        body: `Todos tus canales son de ${[...platforms][0]}. Diversifica añadiendo otra plataforma para reducir riesgo.`,
        cta: 'Registrar canal',
        path: '/creator/channels/new',
      })
    } else if (platforms.size >= 3) {
      out.push({
        icon: CheckCircle2, color: OK, priority: 15,
        title: `Diversificación cross-platform`,
        body: `Tienes presencia en ${platforms.size} plataformas. Es un punto fuerte para advertisers que buscan reach amplio.`,
      })
    }

    // Best performer
    if (winners.revenue !== undefined && channels[winners.revenue].totalRevenue > 0) {
      const winner = channels[winners.revenue]
      const total = channels.reduce((s, c) => s + (c.totalRevenue || 0), 0)
      const share = total > 0 ? (winner.totalRevenue / total) * 100 : 0
      if (share > 60) {
        out.push({
          icon: Target, color: '#f59e0b', priority: 10,
          title: `${share.toFixed(0)}% de tus ingresos vienen de ${winner.nombreCanal}`,
          body: 'Diversifica: si este canal pierde tracción, tus ingresos caen igual. Refuerza los otros.',
        })
      }
    }

    return out.sort((a, b) => a.priority - b.priority).slice(0, 4)
  }, [channels, winners])

  if (insights.length === 0) return null

  return (
    <div style={{ background: 'var(--surface)', border: `1px solid ${ga(0.25)}`, borderRadius: 12, padding: 18 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
        <Sparkles size={15} color={ACCENT} />
        <h3 style={{ fontFamily: D, fontSize: 15, fontWeight: 700, color: 'var(--text)', margin: 0, letterSpacing: '-0.02em' }}>
          Conclusiones
        </h3>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {insights.map((ins, i) => {
          const Icon = ins.icon
          return (
            <div key={i} onClick={() => ins.path && navigate(ins.path)} style={{
              display: 'flex', alignItems: 'flex-start', gap: 10,
              background: `${ins.color}08`, border: `1px solid ${ins.color}25`,
              borderRadius: 10, padding: '10px 12px',
              cursor: ins.path ? 'pointer' : 'default',
              transition: 'background .12s, border-color .12s',
            }}
              onMouseEnter={e => { if (ins.path) { e.currentTarget.style.background = `${ins.color}14`; e.currentTarget.style.borderColor = `${ins.color}40` } }}
              onMouseLeave={e => { e.currentTarget.style.background = `${ins.color}08`; e.currentTarget.style.borderColor = `${ins.color}25` }}
            >
              <div style={{
                width: 28, height: 28, borderRadius: 7, flexShrink: 0,
                background: `${ins.color}15`, border: `1px solid ${ins.color}30`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <Icon size={13} color={ins.color} strokeWidth={2.2} />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--text)', marginBottom: 2 }}>
                  {ins.title}
                </div>
                <div style={{ fontSize: 11.5, color: 'var(--muted)', lineHeight: 1.4 }}>
                  {ins.body}
                </div>
              </div>
              {ins.path && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 3, color: ins.color, fontSize: 11, fontWeight: 700, flexShrink: 0 }}>
                  {ins.cta} <ArrowRight size={11} />
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ─── Helpers ────────────────────────────────────────────────────────────────
function enrichChannel(ch, campaigns) {
  const id = String(ch._id || ch.id)
  const myCampaigns = campaigns.filter(c => {
    const cid = typeof c.channel === 'object' ? String(c.channel?._id || c.channel?.id || '') : ''
    return cid === id
  })
  const completed = myCampaigns.filter(c => c.status === 'COMPLETED')
  const totalRevenue = completed.reduce((s, c) => s + (c.netAmount || 0), 0)
  const ratings = completed.filter(c => Number(c.rating) > 0).map(c => Number(c.rating))
  const avgRating = ratings.length ? ratings.reduce((s, r) => s + r, 0) / ratings.length : 0

  const cas = Number(ch.CAS) || 0
  const verified = Number(ch.verificacion?.confianzaScore) || 0
  const eng = Number(ch.estadisticas?.engagement) || 0
  const active = (ch.estado === 'activo' || ch.estado === 'verificado') ? 100 : 40
  const healthScore = Math.round(cas * 0.45 + verified * 0.25 + Math.min(100, eng * 1000) * 0.15 + active * 0.15)

  return {
    ...ch,
    cas,
    cpm: Number(ch.CPMDinamico) || 0,
    audience: ch.estadisticas?.seguidores || ch.audiencia || ch.seguidores || 0,
    engagement: eng,
    completedCount: completed.length,
    totalRevenue,
    avgRating,
    healthScore,
    CAF: Number(ch.CAF) || 0,
    CTF: Number(ch.CTF) || 0,
    CER: Number(ch.CER) || 0,
    CVS: Number(ch.CVS) || 0,
    CAP: Number(ch.CAP) || 0,
  }
}

function argMaxIdx(arr, fn) {
  let bestIdx = -1, bestVal = -Infinity
  arr.forEach((x, i) => { const v = fn(x); if (v > bestVal) { bestVal = v; bestIdx = i } })
  return bestIdx
}

function NoChannelsCTA({ navigate }) {
  return (
    <div style={{ fontFamily: F, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '50vh', gap: 14, textAlign: 'center', padding: 40 }}>
      <GitCompare size={36} color="var(--muted2)" />
      <h2 style={{ fontFamily: D, fontSize: 20, fontWeight: 700, color: 'var(--text)', margin: 0 }}>
        Necesitas canales para comparar
      </h2>
      <button onClick={() => navigate('/creator/channels/new')} style={primaryBtn}>
        Registrar canal →
      </button>
    </div>
  )
}

function SingleChannelCTA({ navigate }) {
  return (
    <div style={{ fontFamily: F, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '50vh', gap: 14, textAlign: 'center', padding: 40 }}>
      <GitCompare size={36} color="var(--muted2)" />
      <h2 style={{ fontFamily: D, fontSize: 20, fontWeight: 700, color: 'var(--text)', margin: 0 }}>
        Necesitas al menos 2 canales para comparar
      </h2>
      <p style={{ fontSize: 14, color: 'var(--muted)', maxWidth: 420, margin: 0, lineHeight: 1.5 }}>
        Comparar lado a lado revela dónde subir precio, dónde reasignar esfuerzo y qué plataforma rinde mejor.
      </p>
      <button onClick={() => navigate('/creator/channels/new')} style={primaryBtn}>
        Añadir segundo canal →
      </button>
    </div>
  )
}

function Skeleton() {
  return (
    <div style={{ fontFamily: F, display: 'flex', flexDirection: 'column', gap: 22, maxWidth: 1200 }}>
      {[60, 40, 80, 280, 220, 200].map((h, i) => (
        <div key={i} style={{ height: h, background: 'var(--bg2)', borderRadius: 12, animation: 'pulse 1.5s ease infinite' }} />
      ))}
    </div>
  )
}

const thStyle = { textAlign: 'left', padding: '12px 14px', fontSize: 11, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }
const tdStyle = { padding: '12px 14px', fontSize: 13, color: 'var(--text)' }
const primaryBtn = {
  background: ACCENT, color: '#fff', border: 'none', borderRadius: 9,
  padding: '9px 16px', fontSize: 13, fontWeight: 700,
  cursor: 'pointer', fontFamily: F, display: 'inline-flex', alignItems: 'center', gap: 6,
  boxShadow: `0 4px 14px ${ga(0.35)}`,
}
