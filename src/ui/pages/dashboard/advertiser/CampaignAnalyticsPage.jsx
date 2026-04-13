import React, { useState, useEffect, useMemo } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  ArrowLeft, MousePointerClick, Users, Monitor, Smartphone,
  Tablet, Globe, Link2, BarChart3, TrendingUp, ExternalLink,
  Clock, Eye, CheckCircle, Shield, XCircle, Loader2,
} from 'lucide-react'
import {
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid,
  Tooltip, PieChart, Pie, Cell, BarChart, Bar,
} from 'recharts'
import apiService from '../../../../../services/api'
import { FONT_BODY as F, FONT_DISPLAY as D } from '../../../theme/tokens'

// ─── Period config ───────────────────────────────────────────────────────────
const PERIODS = [
  { key: '7d',  label: '7d' },
  { key: '30d', label: '30d' },
  { key: '90d', label: '90d' },
]

const STATUS_CFG = {
  DRAFT:     { color: '#64748b', label: 'Borrador',   icon: Clock },
  PAID:      { color: '#3B82F6', label: 'Pagada',     icon: Shield },
  PUBLISHED: { color: 'var(--accent)', label: 'Publicada', icon: Eye },
  COMPLETED: { color: '#6b7280', label: 'Completada', icon: CheckCircle },
  CANCELLED: { color: '#EF4444', label: 'Cancelada',  icon: XCircle },
  DISPUTED:  { color: '#EF4444', label: 'Disputada',  icon: XCircle },
}

const PIE_COLORS = ['var(--accent)', '#3B82F6', '#F59E0B', '#8B5CF6', '#EC4899', '#64748b']

// ─── Helpers ─────────────────────────────────────────────────────────────────
const fmtNum = (n) => {
  if (n == null) return '0'
  if (n >= 1e6) return `${(n / 1e6).toFixed(1)}M`
  if (n >= 1e3) return `${(n / 1e3).toFixed(1)}K`
  return String(n)
}

const fmtDate = (d) => {
  if (!d) return ''
  const dt = new Date(d)
  return dt.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })
}

const fmtHour = (d) => {
  if (!d) return ''
  const dt = new Date(d)
  return `${dt.getDate()}/${dt.getMonth() + 1} ${String(dt.getHours()).padStart(2, '0')}h`
}

const pct = (part, total) => total > 0 ? `${((part / total) * 100).toFixed(1)}%` : '0%'

// ─── SectionCard ─────────────────────────────────────────────────────────────
function SectionCard({ title, subtitle, children, action }) {
  return (
    <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 16, padding: 24 }}>
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
          <button key={p.key} onClick={() => onChange(p.key)}
            style={{
              background: active ? 'var(--accent-dim)' : 'transparent',
              color: active ? 'var(--accent)' : 'var(--muted2)',
              border: active ? '1px solid var(--accent)44' : '1px solid transparent',
              borderRadius: 8, padding: '6px 14px', fontSize: 12,
              fontWeight: active ? 700 : 500, cursor: 'pointer',
              fontFamily: 'var(--font-mono)',
            }}
          >{p.label}</button>
        )
      })}
    </div>
  )
}

// ─── KPI Card ────────────────────────────────────────────────────────────────
function KpiCard({ icon: Icon, label, value, sub, color = 'var(--accent)' }) {
  return (
    <div style={{
      background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 14,
      padding: '18px 16px', display: 'flex', flexDirection: 'column', gap: 6,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <div style={{ width: 32, height: 32, borderRadius: 10, background: `${color}14`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Icon size={16} style={{ color }} />
        </div>
        <span style={{ color: 'var(--muted2)', fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>{label}</span>
      </div>
      <span style={{ color: 'var(--text)', fontSize: 26, fontWeight: 700, fontFamily: 'var(--font-mono)', lineHeight: 1 }}>{value}</span>
      {sub && <span style={{ color: 'var(--muted2)', fontSize: 11 }}>{sub}</span>}
    </div>
  )
}

// ─── Chart tooltip ───────────────────────────────────────────────────────────
function ChartTooltipContent({ active, payload, label }) {
  if (!active || !payload?.length) return null
  return (
    <div style={{ background: 'var(--bg3)', border: '1px solid var(--border-med)', borderRadius: 8, padding: 12, fontFamily: 'var(--font-mono)', fontSize: 12 }}>
      <div style={{ color: 'var(--text-secondary)', marginBottom: 6 }}>{label}</div>
      {payload.map((p) => (
        <div key={p.dataKey} style={{ display: 'flex', justifyContent: 'space-between', gap: 16, color: p.color || 'var(--text)' }}>
          <span>{p.name || p.dataKey}</span>
          <span style={{ fontWeight: 600 }}>{p.value}</span>
        </div>
      ))}
    </div>
  )
}

// ─── Device icon ─────────────────────────────────────────────────────────────
function DeviceIcon({ device, size = 14 }) {
  switch (device) {
    case 'desktop': return <Monitor size={size} />
    case 'mobile':  return <Smartphone size={size} />
    case 'tablet':  return <Tablet size={size} />
    default:        return <Globe size={size} />
  }
}

// ═════════════════════════════════════════════════════════════════════════════
export default function CampaignAnalyticsPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [period, setPeriod] = useState('30d')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [data, setData] = useState(null)
  const [campaign, setCampaign] = useState(null)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError('')

    const load = async () => {
      try {
        const [analyticsRes, campaignsRes] = await Promise.all([
          apiService.getCampaignAnalytics(id, { period }),
          apiService.getMyCampaigns(),
        ])

        if (cancelled) return

        if (analyticsRes?.success) {
          setData(analyticsRes.data)
        } else {
          setError(analyticsRes?.message || 'Error cargando analytics')
        }

        if (campaignsRes?.success && campaignsRes.data) {
          const found = campaignsRes.data.find(c => (c._id || c.id) === id)
          if (found) setCampaign(found)
        }
      } catch {
        if (!cancelled) setError('Error de conexion')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    load()
    return () => { cancelled = true }
  }, [id, period])

  // ── Derived data ──
  const clickTimeline = useMemo(() => {
    if (!data?.clickTimeline?.length) return []
    return data.clickTimeline.map(d => ({
      ...d,
      label: period === '7d' ? fmtHour(d.date) : fmtDate(d.date),
    }))
  }, [data, period])

  const deviceData = useMemo(() => {
    if (!data?.deviceBreakdown) return []
    return Object.entries(data.deviceBreakdown)
      .filter(([, v]) => v > 0)
      .map(([name, value]) => ({ name, value }))
  }, [data])

  const totalClicks = data?.totals?.totalClicks || 0
  const uniqueClicks = data?.totals?.uniqueClicks || 0
  const ctr = totalClicks > 0 && campaign?.price
    ? ((uniqueClicks / totalClicks) * 100).toFixed(1)
    : null

  const statusCfg = STATUS_CFG[data?.status] || STATUS_CFG.DRAFT
  const StatusIcon = statusCfg.icon

  // ── LOADING ──
  if (loading) {
    return (
      <div style={{ minHeight: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Loader2 size={28} style={{ color: 'var(--accent)', animation: 'spin 1s linear infinite' }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
      </div>
    )
  }

  // ── ERROR ──
  if (error || !data) {
    return (
      <div style={{ padding: 32 }}>
        <button onClick={() => navigate(-1)} style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, marginBottom: 24 }}>
          <ArrowLeft size={16} /> Volver
        </button>
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 16, padding: '48px 24px', textAlign: 'center' }}>
          <div style={{ fontSize: 32, marginBottom: 12 }}>📊</div>
          <h2 style={{ color: 'var(--text)', fontSize: 18, fontWeight: 700, margin: '0 0 8px' }}>Sin datos de analytics</h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: 13, margin: 0 }}>{error || 'No se encontraron datos para esta campana.'}</p>
        </div>
      </div>
    )
  }

  return (
    <div style={{ padding: '0 0 48px', maxWidth: 1080, margin: '0 auto' }}>
      {/* ── Header ── */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button onClick={() => navigate('/advertiser/campaigns')} style={{ background: 'none', border: '1px solid var(--border)', borderRadius: 10, width: 36, height: 36, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'var(--text-secondary)' }}>
            <ArrowLeft size={16} />
          </button>
          <div>
            <h1 style={{ color: 'var(--text)', fontSize: 20, fontWeight: 700, fontFamily: D, margin: 0 }}>
              Analytics de campana
            </h1>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4 }}>
              <span style={{
                background: statusCfg.color + '14', color: statusCfg.color,
                borderRadius: 8, padding: '3px 10px', fontSize: 11, fontWeight: 600,
                display: 'inline-flex', alignItems: 'center', gap: 4,
              }}>
                <StatusIcon size={12} /> {statusCfg.label}
              </span>
              {campaign?.channel?.nombreCanal && (
                <span style={{ color: 'var(--muted2)', fontSize: 12 }}>
                  · {campaign.channel.nombreCanal}
                </span>
              )}
              {data?.price > 0 && (
                <span style={{ color: 'var(--text-secondary)', fontSize: 12, fontFamily: 'var(--font-mono)', fontWeight: 600 }}>
                  · €{Number(data.price).toFixed(0)}
                </span>
              )}
            </div>
          </div>
        </div>
        <PeriodTabs period={period} onChange={setPeriod} />
      </div>

      {/* ── KPI Grid ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12, marginBottom: 20 }}>
        <KpiCard icon={MousePointerClick} label="Clicks totales" value={fmtNum(totalClicks)} color="var(--accent)" />
        <KpiCard icon={Users} label="Clicks unicos" value={fmtNum(uniqueClicks)} sub={totalClicks > 0 ? `${pct(uniqueClicks, totalClicks)} del total` : undefined} color="#3B82F6" />
        <KpiCard icon={Link2} label="Tracking links" value={data?.totals?.trackingLinks || 0} color="#8B5CF6" />
        <KpiCard icon={TrendingUp} label="CTR estimado" value={ctr ? `${ctr}%` : '—'} color="#F59E0B" />
      </div>

      {/* ── Click Timeline ── */}
      <div style={{ marginBottom: 20 }}>
        <SectionCard title="Evolucion de clicks" subtitle={period === '7d' ? 'Granularidad por hora' : 'Granularidad diaria'}>
          {clickTimeline.length > 0 ? (
            <ResponsiveContainer width="100%" height={260}>
              <AreaChart data={clickTimeline} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                <defs>
                  <linearGradient id="gradClicks" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="var(--accent)" stopOpacity={0.2} />
                    <stop offset="100%" stopColor="var(--accent)" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="gradUnique" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#3B82F6" stopOpacity={0.15} />
                    <stop offset="100%" stopColor="#3B82F6" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="label" tick={{ fontSize: 10, fill: 'var(--muted2)' }} tickLine={false} axisLine={false} />
                <YAxis tick={{ fontSize: 10, fill: 'var(--muted2)' }} tickLine={false} axisLine={false} />
                <Tooltip content={<ChartTooltipContent />} />
                <Area type="monotone" dataKey="totalClicks" name="Total" stroke="var(--accent)" fill="url(#gradClicks)" strokeWidth={2} />
                <Area type="monotone" dataKey="uniqueClicks" name="Unicos" stroke="#3B82F6" fill="url(#gradUnique)" strokeWidth={2} strokeDasharray="5 5" />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--muted2)', fontSize: 13 }}>
              <Clock size={24} style={{ marginBottom: 8, opacity: 0.5 }} />
              <div>Sin datos de clicks en este periodo</div>
            </div>
          )}
        </SectionCard>
      </div>

      {/* ── Breakdowns grid ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 20, marginBottom: 20 }}>

        {/* Device breakdown */}
        <SectionCard title="Dispositivos" subtitle="Distribucion por tipo de dispositivo">
          {deviceData.length > 0 ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
              <ResponsiveContainer width={140} height={140}>
                <PieChart>
                  <Pie data={deviceData} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={35} outerRadius={60} paddingAngle={3} strokeWidth={0}>
                    {deviceData.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 8 }}>
                {deviceData.map((d, i) => (
                  <div key={d.name} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <div style={{ width: 8, height: 8, borderRadius: '50%', background: PIE_COLORS[i % PIE_COLORS.length] }} />
                      <DeviceIcon device={d.name} />
                      <span style={{ color: 'var(--text-secondary)', fontSize: 12, textTransform: 'capitalize' }}>{d.name}</span>
                    </div>
                    <span style={{ color: 'var(--text)', fontSize: 13, fontWeight: 600, fontFamily: 'var(--font-mono)' }}>
                      {d.value} <span style={{ color: 'var(--muted2)', fontSize: 10, fontWeight: 400 }}>{pct(d.value, totalClicks)}</span>
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div style={{ textAlign: 'center', padding: '32px 0', color: 'var(--muted2)', fontSize: 13 }}>Sin datos</div>
          )}
        </SectionCard>

        {/* Country breakdown */}
        <SectionCard title="Paises" subtitle="Top paises por clicks">
          {data?.countryBreakdown?.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {data.countryBreakdown.slice(0, 8).map((c, i) => {
                const w = totalClicks > 0 ? (c.clicks / totalClicks) * 100 : 0
                return (
                  <div key={c.country} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span style={{ color: 'var(--text-secondary)', fontSize: 12, minWidth: 80, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.country}</span>
                    <div style={{ flex: 1, height: 6, borderRadius: 3, background: 'var(--border)', overflow: 'hidden' }}>
                      <div style={{ height: '100%', borderRadius: 3, background: PIE_COLORS[i % PIE_COLORS.length], width: `${Math.max(w, 2)}%`, transition: 'width 0.5s ease' }} />
                    </div>
                    <span style={{ color: 'var(--text)', fontSize: 12, fontWeight: 600, fontFamily: 'var(--font-mono)', minWidth: 40, textAlign: 'right' }}>{c.clicks}</span>
                  </div>
                )
              })}
            </div>
          ) : (
            <div style={{ textAlign: 'center', padding: '32px 0', color: 'var(--muted2)', fontSize: 13 }}>Sin datos</div>
          )}
        </SectionCard>
      </div>

      {/* ── Referrers + UTM ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 20, marginBottom: 20 }}>

        {/* Referrer breakdown */}
        <SectionCard title="Fuentes de trafico" subtitle="De donde vienen los clicks">
          {data?.refererBreakdown?.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {data.refererBreakdown.slice(0, 6).map((r) => (
                <div key={r.referer} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid var(--border)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
                    <ExternalLink size={12} style={{ color: 'var(--muted2)', flexShrink: 0 }} />
                    <span style={{ color: 'var(--text-secondary)', fontSize: 12, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.referer}</span>
                  </div>
                  <span style={{ color: 'var(--text)', fontSize: 12, fontWeight: 600, fontFamily: 'var(--font-mono)', marginLeft: 12, flexShrink: 0 }}>{r.clicks}</span>
                </div>
              ))}
            </div>
          ) : (
            <div style={{ textAlign: 'center', padding: '32px 0', color: 'var(--muted2)', fontSize: 13 }}>Sin datos</div>
          )}
        </SectionCard>

        {/* Browser breakdown */}
        <SectionCard title="Navegadores" subtitle="Distribucion por browser">
          {data?.browserBreakdown?.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {data.browserBreakdown.slice(0, 6).map((b, i) => {
                const w = totalClicks > 0 ? (b.clicks / totalClicks) * 100 : 0
                return (
                  <div key={b.browser} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span style={{ color: 'var(--text-secondary)', fontSize: 12, minWidth: 80, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{b.browser}</span>
                    <div style={{ flex: 1, height: 6, borderRadius: 3, background: 'var(--border)', overflow: 'hidden' }}>
                      <div style={{ height: '100%', borderRadius: 3, background: PIE_COLORS[i % PIE_COLORS.length], width: `${Math.max(w, 2)}%`, transition: 'width 0.5s ease' }} />
                    </div>
                    <span style={{ color: 'var(--text)', fontSize: 12, fontWeight: 600, fontFamily: 'var(--font-mono)', minWidth: 40, textAlign: 'right' }}>{b.clicks}</span>
                  </div>
                )
              })}
            </div>
          ) : (
            <div style={{ textAlign: 'center', padding: '32px 0', color: 'var(--muted2)', fontSize: 13 }}>Sin datos</div>
          )}
        </SectionCard>
      </div>

      {/* ── UTM Sources (if any) ── */}
      {data?.utmBreakdown?.length > 0 && data.utmBreakdown[0]?.source !== 'none' && (
        <SectionCard title="UTM Sources" subtitle="Campanas de trafico etiquetadas">
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 8 }}>
            {data.utmBreakdown.filter(u => u.source !== 'none').map((u) => (
              <div key={u.source} style={{
                background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 10,
                padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: 4,
              }}>
                <span style={{ color: 'var(--text)', fontSize: 13, fontWeight: 600, fontFamily: 'var(--font-mono)' }}>{u.clicks}</span>
                <span style={{ color: 'var(--muted2)', fontSize: 11, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{u.source}</span>
              </div>
            ))}
          </div>
        </SectionCard>
      )}
    </div>
  )
}
