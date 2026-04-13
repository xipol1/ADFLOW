import React, { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Clock, TrendingUp, DollarSign, Target, ShoppingCart,
  Plus, X, Bookmark, AlertTriangle,
} from 'lucide-react'
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts'
import { useAuth } from '../../../../auth/AuthContext'
import apiService from '../../../../../services/api'
import { FONT_BODY as F, FONT_DISPLAY as D } from '../../../theme/tokens'
import { KPICard, CASBadge } from '../../../components/scoring'
import ChannelCard from '../../../components/ChannelCard'
import { ErrorBanner } from '../shared/DashComponents'

// ─── Period config ───────────────────────────────────────────────────────────
const PERIODS = [
  { key: '30d', label: '30 días', days: 30 },
  { key: '90d', label: '90 días', days: 90 },
  { key: '1y',  label: '1 año',   days: 365 },
]

// ─── Colors for charts ──────────────────────────────────────────────────────
const PIE_COLORS = ['var(--accent)', 'var(--accent)', 'var(--accent)', 'var(--gold)', '#EF4444', '#3B82F6', '#EC4899', 'var(--text-secondary)']

const STATUS_LABELS = {
  COMPLETED: 'Completada',
  PAID: 'Pagada',
  PUBLISHED: 'Publicada',
  CANCELLED: 'Cancelada',
  DRAFT: 'Borrador',
  EXPIRED: 'Expirada',
  DISPUTED: 'Disputada',
}

const STATUS_COLORS = {
  COMPLETED: 'var(--accent)',
  PAID: 'var(--accent)',
  PUBLISHED: 'var(--accent)',
  CANCELLED: 'var(--red)',
  DRAFT: 'var(--muted2)',
  EXPIRED: 'var(--gold)',
  DISPUTED: '#EF4444',
}

// ─── Helpers ─────────────────────────────────────────────────────────────────
const fmtMoney = (n) => {
  if (n == null) return '€0'
  return `€${Number(n).toLocaleString('es-ES', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`
}

const fmtDate = (d) => {
  if (!d) return ''
  const dt = new Date(d)
  if (Number.isNaN(dt.getTime())) return ''
  return dt.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })
}

// ─── SectionCard ─────────────────────────────────────────────────────────────
function SectionCard({ title, subtitle, children, action }) {
  return (
    <div style={{ background: 'var(--surface)', border: `1px solid ${'var(--border)'}`, borderRadius: 16, padding: 24 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20, gap: 12, flexWrap: 'wrap' }}>
        <div>
          <h3 style={{ color: 'var(--text)', fontSize: 15, fontWeight: 700, margin: 0, fontFamily: D }}>{title}</h3>
          {subtitle && <div style={{ color: 'var(--muted2)', fontSize: 11, marginTop: 3 }}>{subtitle}</div>}
        </div>
        {action}
      </div>
      {children}
    </div>
  )
}

// ─── PeriodTabs ──────────────────────────────────────────────────────────────
function PeriodTabs({ period, onChange }) {
  return (
    <div style={{ display: 'flex', gap: 2, background: 'var(--bg3)', borderRadius: 10, padding: 3 }}>
      {PERIODS.map((p) => {
        const active = period === p.key
        return (
          <button key={p.key} onClick={() => onChange(p.key)} className="font-mono"
            style={{
              background: active ? 'var(--accent-dim)' : 'transparent',
              color: active ? 'var(--accent)' : 'var(--muted2)',
              border: active ? `1px solid ${'var(--accent)'}44` : '1px solid transparent',
              borderRadius: 8, padding: '6px 14px', fontSize: 12,
              fontWeight: active ? 700 : 500, cursor: 'pointer', fontFamily: 'inherit',
            }}
          >{p.label}</button>
        )
      })}
    </div>
  )
}

// ─── Chart tooltip ───────────────────────────────────────────────────────────
function ChartTooltipContent({ active, payload, label }) {
  if (!active || !payload?.length) return null
  return (
    <div style={{ background: 'var(--bg3)', border: `1px solid ${'var(--border-med)'}`, borderRadius: 8, padding: 12, fontFamily: 'JetBrains Mono, monospace', fontSize: 12 }}>
      <div style={{ color: 'var(--text-secondary)', marginBottom: 6 }}>{label}</div>
      {payload.map((p) => (
        <div key={p.dataKey} style={{ display: 'flex', justifyContent: 'space-between', gap: 16, color: p.color || 'var(--text)' }}>
          <span>{p.name || p.dataKey}</span>
          <span style={{ fontWeight: 600 }}>{fmtMoney(p.value)}</span>
        </div>
      ))}
    </div>
  )
}

// ─── Section 1: Campaign Performance ─────────────────────────────────────────
function CampaignPerformanceSection({ campaigns, period }) {
  const periodDays = PERIODS.find((p) => p.key === period)?.days || 30
  const cutoff = new Date(Date.now() - periodDays * 86400000)

  const filtered = useMemo(() =>
    campaigns.filter((c) => new Date(c.createdAt) >= cutoff),
    [campaigns, cutoff]
  )

  const completed = filtered.filter((c) => c.status === 'COMPLETED')
  const totalSpend = filtered.reduce((s, c) => s + (c.price || 0), 0)
  const completedSpend = completed.reduce((s, c) => s + (c.price || 0), 0)
  const avgCPM = completed.length > 0 ? completedSpend / completed.length : 0

  // Monthly bar chart data
  const barData = useMemo(() => {
    const now = new Date()
    const months = period === '1y' ? 12 : period === '90d' ? 3 : 1
    const result = []
    for (let i = months - 1; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
      const label = d.toLocaleDateString('es', { month: 'short' })
      const monthCampaigns = campaigns.filter((c) => {
        const cd = new Date(c.createdAt)
        return cd.getFullYear() === d.getFullYear() && cd.getMonth() === d.getMonth()
      })
      result.push({
        label,
        gasto: monthCampaigns.reduce((s, c) => s + (c.price || 0), 0),
        completadas: monthCampaigns.filter((c) => c.status === 'COMPLETED').length,
      })
    }
    return result
  }, [campaigns, period])

  if (campaigns.length === 0) {
    return (
      <SectionCard title="Rendimiento de campañas">
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: 200, color: 'var(--muted2)', gap: 8 }}>
          <Target size={22} />
          <span style={{ fontSize: 12 }}>Lanza tu primera campaña para ver analytics</span>
        </div>
      </SectionCard>
    )
  }

  return (
    <SectionCard title="Rendimiento de campañas">
      {/* KPI row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12, marginBottom: 24 }}>
        <KPICard label="Gasto total" valor={fmtMoney(totalSpend)} icon={<DollarSign size={16} />} color={'var(--accent)'} />
        <KPICard label="Completadas" valor={completed.length} context={`de ${filtered.length} campañas`} icon={<Target size={16} />} />
        <KPICard label="Coste medio" valor={fmtMoney(avgCPM)} context="por campaña" icon={<ShoppingCart size={16} />} />
        <KPICard label="Tasa éxito" valor={filtered.length > 0 ? `${Math.round((completed.length / filtered.length) * 100)}%` : '--'} color={completed.length > 0 ? 'var(--accent)' : 'var(--text-secondary)'} icon={<TrendingUp size={16} />} />
      </div>

      {/* Monthly spend chart */}
      {barData.length > 1 && (
        <div style={{ marginBottom: 24 }}>
          <div style={{ color: 'var(--muted2)', fontSize: 11, marginBottom: 10, textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: 600 }}>
            Gasto mensual
          </div>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={barData} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
              <CartesianGrid stroke={'var(--border)'} strokeDasharray="3 3" />
              <XAxis dataKey="label" stroke={'var(--muted2)'} tick={{ fontSize: 11, fill: 'var(--muted2)' }} tickLine={false} axisLine={{ stroke: 'var(--border)' }} />
              <YAxis stroke={'var(--muted2)'} tick={{ fontSize: 11, fill: 'var(--muted2)' }} tickLine={false} axisLine={{ stroke: 'var(--border)' }} tickFormatter={(v) => `€${v}`} />
              <Tooltip content={<ChartTooltipContent />} cursor={{ fill: `${'var(--accent)'}11` }} />
              <Bar dataKey="gasto" name="Gasto" fill={'var(--accent)'} radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Campaign table */}
      <div style={{ color: 'var(--muted2)', fontSize: 11, marginBottom: 10, textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: 600 }}>
        Últimas campañas
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
        {filtered.slice(0, 10).map((c) => {
          const chName = typeof c.channel === 'object' ? c.channel?.nombreCanal : 'Canal'
          const statusColor = STATUS_COLORS[c.status] || 'var(--muted2)'
          return (
            <div
              key={c._id}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                padding: '10px 0',
                borderBottom: `1px solid ${'var(--border)'}`,
                fontSize: 12,
              }}
            >
              <span style={{ color: statusColor, fontSize: 8 }}>●</span>
              <span style={{ color: 'var(--text)', fontWeight: 600, flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {chName}
              </span>
              <span className="font-mono" style={{ color: 'var(--text-secondary)', flexShrink: 0 }}>
                {fmtMoney(c.price)}
              </span>
              <span style={{ color: statusColor, fontSize: 10, fontWeight: 600, flexShrink: 0, background: `${statusColor}18`, padding: '2px 8px', borderRadius: 999 }}>
                {STATUS_LABELS[c.status] || c.status}
              </span>
              <span style={{ color: 'var(--muted2)', flexShrink: 0, fontSize: 11 }}>
                {fmtDate(c.createdAt)}
              </span>
            </div>
          )
        })}
      </div>
    </SectionCard>
  )
}

// ─── Section 2: Spend Analysis ───────────────────────────────────────────────
function SpendAnalysisSection({ campaigns }) {
  const completed = campaigns.filter((c) => c.status === 'COMPLETED')

  // By platform
  const byPlatform = useMemo(() => {
    const map = {}
    completed.forEach((c) => {
      const plat = typeof c.channel === 'object'
        ? c.channel?.plataforma || 'otro'
        : 'otro'
      map[plat] = (map[plat] || 0) + (c.price || 0)
    })
    return Object.entries(map)
      .map(([name, value]) => ({ name, value: Math.round(value) }))
      .sort((a, b) => b.value - a.value)
  }, [completed])

  // By niche
  const byNiche = useMemo(() => {
    const map = {}
    completed.forEach((c) => {
      const nicho = typeof c.channel === 'object'
        ? c.channel?.categoria || 'otros'
        : 'otros'
      map[nicho] = (map[nicho] || 0) + (c.price || 0)
    })
    return Object.entries(map)
      .map(([name, value]) => ({ name, value: Math.round(value) }))
      .sort((a, b) => b.value - a.value)
  }, [completed])

  const totalSpend = completed.reduce((s, c) => s + (c.price || 0), 0)
  const topChannel = useMemo(() => {
    const map = {}
    completed.forEach((c) => {
      const name = typeof c.channel === 'object' ? c.channel?.nombreCanal : 'Canal'
      map[name] = (map[name] || 0) + (c.price || 0)
    })
    const sorted = Object.entries(map).sort((a, b) => b[1] - a[1])
    return sorted[0]?.[0] || '--'
  }, [completed])

  if (completed.length === 0) {
    return (
      <SectionCard title="Análisis de gasto">
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: 160, color: 'var(--muted2)', gap: 8 }}>
          <DollarSign size={22} />
          <span style={{ fontSize: 12 }}>Completa campañas para ver el análisis de gasto</span>
        </div>
      </SectionCard>
    )
  }

  const PieLabel = ({ name, value, cx, cy, midAngle, outerRadius }) => {
    const RADIAN = Math.PI / 180
    const radius = outerRadius + 24
    const x = cx + radius * Math.cos(-midAngle * RADIAN)
    const y = cy + radius * Math.sin(-midAngle * RADIAN)
    if (value / totalSpend < 0.05) return null
    return (
      <text x={x} y={y} fill={'var(--text-secondary)'} textAnchor={x > cx ? 'start' : 'end'} dominantBaseline="central" style={{ fontSize: 11, fontFamily: 'JetBrains Mono, monospace' }}>
        {name}
      </text>
    )
  }

  return (
    <SectionCard title="Análisis de gasto" subtitle={`${completed.length} campañas completadas · ${fmtMoney(totalSpend)} total`}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 24, marginBottom: 20 }}>
        {/* By platform */}
        {byPlatform.length > 0 && (
          <div>
            <div style={{ color: 'var(--muted2)', fontSize: 11, marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: 600 }}>
              Por plataforma
            </div>
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie data={byPlatform} cx="50%" cy="50%" outerRadius={70} innerRadius={40} dataKey="value" label={PieLabel} labelLine={false} strokeWidth={2} stroke={'var(--bg)'}>
                  {byPlatform.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                </Pie>
                <Tooltip formatter={(v) => fmtMoney(v)} contentStyle={{ background: 'var(--bg3)', border: `1px solid ${'var(--border-med)'}`, borderRadius: 8, fontSize: 12 }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* By niche */}
        {byNiche.length > 0 && (
          <div>
            <div style={{ color: 'var(--muted2)', fontSize: 11, marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: 600 }}>
              Por nicho
            </div>
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie data={byNiche} cx="50%" cy="50%" outerRadius={70} innerRadius={40} dataKey="value" label={PieLabel} labelLine={false} strokeWidth={2} stroke={'var(--bg)'}>
                  {byNiche.map((_, i) => <Cell key={i} fill={PIE_COLORS[(i + 3) % PIE_COLORS.length]} />)}
                </Pie>
                <Tooltip formatter={(v) => fmtMoney(v)} contentStyle={{ background: 'var(--bg3)', border: `1px solid ${'var(--border-med)'}`, borderRadius: 8, fontSize: 12 }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {/* Summary stats */}
      <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', padding: '16px 0', borderTop: `1px solid ${'var(--border)'}` }}>
        <div>
          <div style={{ color: 'var(--muted2)', fontSize: 10, textTransform: 'uppercase', marginBottom: 2 }}>Canal más usado</div>
          <div className="font-mono" style={{ color: 'var(--text)', fontSize: 13, fontWeight: 600 }}>{topChannel}</div>
        </div>
        <div>
          <div style={{ color: 'var(--muted2)', fontSize: 10, textTransform: 'uppercase', marginBottom: 2 }}>Nicho principal</div>
          <div className="font-mono" style={{ color: 'var(--text)', fontSize: 13, fontWeight: 600 }}>{byNiche[0]?.name || '--'}</div>
        </div>
        <div>
          <div style={{ color: 'var(--muted2)', fontSize: 10, textTransform: 'uppercase', marginBottom: 2 }}>CPM medio</div>
          <div className="font-mono" style={{ color: 'var(--accent)', fontSize: 13, fontWeight: 600 }}>
            {completed.length > 0 ? fmtMoney(totalSpend / completed.length) : '--'}
          </div>
        </div>
      </div>
    </SectionCard>
  )
}

// ─── Section 3: Watchlist ────────────────────────────────────────────────────
function WatchlistSection({ lists, onRefresh }) {
  const [creating, setCreating] = useState(false)
  const [newName, setNewName] = useState('')
  const [saving, setSaving] = useState(false)
  const navigate = useNavigate()

  const handleCreate = async () => {
    if (!newName.trim()) return
    setSaving(true)
    try {
      await apiService.createList({ nombre: newName.trim() })
      setNewName('')
      setCreating(false)
      onRefresh()
    } catch { /* silent */ }
    finally { setSaving(false) }
  }

  const handleRemoveChannel = async (listId, channelId) => {
    try {
      await apiService.removeChannelFromList(listId, channelId)
      onRefresh()
    } catch { /* silent */ }
  }

  const mapWatchlistChannel = (ch) => ({
    id: ch._id || ch.id || ch,
    nombre: ch.nombreCanal || ch.nombre || 'Canal',
    plataforma: ch.plataforma || '',
    nicho: ch.categoria || '',
    seguidores: ch.estadisticas?.seguidores || 0,
    CAS: ch.CAS,
    nivel: ch.nivel,
    CPMDinamico: ch.CPMDinamico,
    verificacion: ch.verificacion,
    antifraude: ch.antifraude,
  })

  return (
    <SectionCard
      title="Watchlist"
      subtitle="Canales guardados para seguimiento"
      action={
        !creating && (
          <button
            onClick={() => setCreating(true)}
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              background: 'var(--accent-dim)', color: 'var(--accent)',
              border: `1px solid ${'var(--accent)'}44`, borderRadius: 8,
              padding: '6px 14px', fontSize: 12, fontWeight: 600,
              cursor: 'pointer', fontFamily: 'inherit',
            }}
          >
            <Plus size={14} /> Nueva lista
          </button>
        )
      }
    >
      {/* Create list form */}
      {creating && (
        <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
          <input
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="Nombre de la lista..."
            onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
            autoFocus
            style={{
              flex: 1, background: 'var(--bg3)', border: `1px solid ${'var(--border-med)'}`,
              borderRadius: 8, padding: '8px 12px', fontSize: 13,
              color: 'var(--text)', outline: 'none', fontFamily: F,
            }}
          />
          <button
            onClick={handleCreate}
            disabled={saving || !newName.trim()}
            style={{
              background: 'var(--accent)', color: 'var(--bg)', border: 'none', borderRadius: 8,
              padding: '8px 16px', fontSize: 12, fontWeight: 700, cursor: 'pointer',
              opacity: saving || !newName.trim() ? 0.5 : 1,
            }}
          >
            Crear
          </button>
          <button
            onClick={() => { setCreating(false); setNewName('') }}
            style={{ background: 'transparent', border: `1px solid ${'var(--border)'}`, borderRadius: 8, padding: '8px', cursor: 'pointer', color: 'var(--muted2)', display: 'flex' }}
          >
            <X size={14} />
          </button>
        </div>
      )}

      {(!lists || lists.length === 0) ? (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: 160, color: 'var(--muted2)', gap: 8 }}>
          <Bookmark size={22} />
          <span style={{ fontSize: 12 }}>Guarda canales desde el Explore para seguirlos aquí</span>
          <button
            onClick={() => navigate('/advertiser/explore')}
            style={{
              background: 'transparent', color: 'var(--accent)',
              border: `1px solid ${'var(--accent)'}66`, borderRadius: 8,
              padding: '6px 14px', fontSize: 12, fontWeight: 600,
              cursor: 'pointer', fontFamily: F, marginTop: 8,
            }}
          >
            Explorar canales →
          </button>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {lists.map((list) => (
            <div key={list._id || list.id}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                <Bookmark size={14} color={'var(--accent)'} />
                <span style={{ color: 'var(--text)', fontSize: 13, fontWeight: 600 }}>
                  {list.nombre || 'Lista sin nombre'}
                </span>
                <span className="font-mono" style={{ color: 'var(--muted2)', fontSize: 11 }}>
                  · {(list.canales || []).length} canales
                </span>
              </div>
              {(!list.canales || list.canales.length === 0) ? (
                <div style={{ color: 'var(--muted2)', fontSize: 12, padding: '8px 0 0 22px' }}>
                  Lista vacía — añade canales desde Explorar
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6, paddingLeft: 22 }}>
                  {list.canales.map((ch) => {
                    const chId = typeof ch === 'string' ? ch : ch._id || ch.id
                    const isPopulated = typeof ch === 'object' && ch.nombreCanal
                    return (
                      <div key={chId} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        {isPopulated ? (
                          <div style={{ flex: 1 }}>
                            <ChannelCard
                              canal={mapWatchlistChannel(ch)}
                              variant="compact"
                              mode="advertiser"
                              onSelect={() => navigate(`/channel/${chId}`)}
                              onCTA={() => navigate(`/advertiser/explore`)}
                            />
                          </div>
                        ) : (
                          <div style={{ flex: 1, color: 'var(--text-secondary)', fontSize: 12, fontFamily: 'JetBrains Mono, monospace' }}>
                            Canal {String(chId).slice(-6)}
                          </div>
                        )}
                        <button
                          onClick={() => handleRemoveChannel(list._id || list.id, chId)}
                          title="Eliminar de la lista"
                          style={{
                            background: 'transparent', border: 'none',
                            color: 'var(--muted2)', cursor: 'pointer', padding: 4,
                            flexShrink: 0,
                          }}
                        >
                          <X size={12} />
                        </button>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </SectionCard>
  )
}

// ─── Main Page ───────────────────────────────────────────────────────────────
export default function AdvertiserAnalyticsPage() {
  const { user } = useAuth()
  const navigate = useNavigate()

  const [campaigns, setCampaigns] = useState([])
  const [lists, setLists] = useState([])
  const [period, setPeriod] = useState('30d')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [retryKey, setRetryKey] = useState(0)

  useEffect(() => {
    let mounted = true
    setLoading(true)
    const load = async () => {
      try {
        const [cmpRes, listRes] = await Promise.all([
          apiService.getMyCampaigns().catch(() => null),
          apiService.getMyLists().catch(() => null),
        ])
        if (!mounted) return

        if (cmpRes?.success) {
          const items = Array.isArray(cmpRes.data) ? cmpRes.data : cmpRes.data?.items || []
          setCampaigns(items)
        }
        if (listRes?.success) {
          const items = Array.isArray(listRes.data) ? listRes.data : listRes.data?.items || []
          setLists(items)
        }
      } catch {
        if (mounted) setError('No se pudieron cargar las analíticas')
      } finally {
        if (mounted) setLoading(false)
      }
    }
    load()
    return () => { mounted = false }
  }, [retryKey])

  const refreshLists = () => {
    apiService.getMyLists().then((res) => {
      if (res?.success) {
        const items = Array.isArray(res.data) ? res.data : res.data?.items || []
        setLists(items)
      }
    }).catch(() => {})
  }

  // ── Loading ───────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="animate-pulse" style={{ fontFamily: F, display: 'flex', flexDirection: 'column', gap: 20, maxWidth: 960 }}>
        {[280, 240, 180].map((h, i) => (
          <div key={i} style={{ height: h, background: 'var(--bg3)', borderRadius: 16 }} />
        ))}
      </div>
    )
  }

  return (
    <div style={{ fontFamily: F, display: 'flex', flexDirection: 'column', gap: 20, maxWidth: 960 }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
        <div>
          <h1 style={{ fontFamily: D, fontSize: 24, fontWeight: 800, color: 'var(--text)', letterSpacing: '-0.03em', marginBottom: 4 }}>
            Analytics
          </h1>
          <p style={{ fontSize: 13, color: 'var(--muted)' }}>
            Rendimiento de campañas, gasto y seguimiento de canales
          </p>
        </div>
        <PeriodTabs period={period} onChange={setPeriod} />
      </div>

      {error && (
        <ErrorBanner message={error} onRetry={() => { setError(null); setRetryKey((k) => k + 1) }} />
      )}

      {/* Section 1 */}
      <CampaignPerformanceSection campaigns={campaigns} period={period} />

      {/* Section 2 */}
      <SpendAnalysisSection campaigns={campaigns} />

      {/* Section 3 */}
      <WatchlistSection lists={lists} onRefresh={refreshLists} />
    </div>
  )
}
