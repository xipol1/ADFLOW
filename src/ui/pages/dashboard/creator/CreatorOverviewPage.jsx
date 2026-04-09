import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Radio, Inbox, DollarSign, TrendingUp, Plus, ChevronRight, Clock, Check, X, Zap, Activity } from 'lucide-react'
import { useAuth } from '../../../../auth/AuthContext'
import apiService from '../../../../../services/api'
import { GREEN, greenAlpha, PURPLE, purpleAlpha, FONT_BODY, FONT_DISPLAY, OK as _OK, WARN as _WARN, BLUE as _BLUE, PLAT_COLORS } from '../../../theme/tokens'
import { C, nivelFromCAS } from '../../../theme/tokens'
import { CASBadge, ScoreGauge, CPMBadge, ConfianzaBadge, BenchmarkBar } from '../../../components/scoring'
import { Sparkline, ErrorBanner } from '../shared/DashComponents'

const WA  = GREEN
const WAG = greenAlpha
const A   = PURPLE
const AG  = purpleAlpha
const F   = FONT_BODY
const D   = FONT_DISPLAY
const OK  = _OK
const WARN = _WARN
const BLUE = _BLUE

// ─── Bar chart ─────────────────────────────────────────────────────────────────
function BarChart({ data, color = WA }) {
  const max = Math.max(...data.map(d => d.value), 1)
  const [hoverIdx, setHoverIdx] = useState(null)

  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', gap: '5px', height: '100px', paddingBottom: '20px' }}>
      {data.map((d, i) => {
        const isLast = i === data.length - 1
        const isHov  = hoverIdx === i
        const pct    = (d.value / max) * 100

        return (
          <div key={i}
            onMouseEnter={() => setHoverIdx(i)}
            onMouseLeave={() => setHoverIdx(null)}
            style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '5px', height: '100%', cursor: 'default' }}
          >
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', width: '100%' }}>
              {(isHov || isLast) && (
                <div style={{ fontSize: '10px', color: isLast ? color : 'var(--muted)', fontWeight: 700, textAlign: 'center', marginBottom: '3px' }}>€{d.value}</div>
              )}
              <div style={{ width: '100%', borderRadius: '4px 4px 0 0', minHeight: '3px', height: `${pct}%`,
                background: isLast ? `linear-gradient(180deg, ${color} 0%, ${color}90 100%)` : isHov ? `${color}70` : `${color}40`,
                transition: 'background .15s' }} />
            </div>
            <span style={{ fontSize: '9px', color: isLast ? color : 'var(--muted)', fontWeight: isLast ? 600 : 400 }}>{d.label}</span>
          </div>
        )
      })}
    </div>
  )
}

// ─── KPI card ─────────────────────────────────────────────────────────────────
function KpiCard({ icon: Icon, label, value, sub, subColor, sparkData, accent = WA }) {
  const [hov, setHov] = useState(false)
  return (
    <div
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        background: 'var(--surface)',
        border: `1px solid ${hov ? `${accent}55` : 'var(--border)'}`,
        borderRadius: '16px', padding: '22px',
        transition: 'border-color .2s, transform .2s, box-shadow .2s',
        transform: hov ? 'translateY(-2px)' : 'none',
        boxShadow: hov ? `0 8px 28px ${accent}18` : '0 1px 4px rgba(0,0,0,0.05)',
        display: 'flex', flexDirection: 'column', gap: '12px',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
        <div style={{ width: '40px', height: '40px', borderRadius: '11px', background: `${accent}18`, border: `1px solid ${accent}28`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Icon size={18} color={accent} strokeWidth={2} />
        </div>
        {sparkData && <Sparkline data={sparkData} color={accent} />}
      </div>
      <div>
        <div style={{ fontFamily: D, fontSize: '28px', fontWeight: 800, color: 'var(--text)', letterSpacing: '-0.03em', lineHeight: 1.1, marginBottom: '4px' }}>{value}</div>
        <div style={{ fontSize: '13px', color: 'var(--muted)', marginBottom: sub ? '6px' : 0 }}>{label}</div>
        {sub && (
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', background: `${subColor || OK}12`, borderRadius: '20px', padding: '2px 8px' }}>
            <span style={{ fontSize: '11px', fontWeight: 700, color: subColor || OK }}>{sub}</span>
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Platform badge ───────────────────────────────────────────────────────────
const PlatBadge = ({ p }) => {
  const c = PLAT_COLORS[p] || A
  return <span style={{ background: `${c}18`, color: c, border: `1px solid ${c}35`, borderRadius: '6px', padding: '2px 8px', fontSize: '11px', fontWeight: 600 }}>{p}</span>
}

// ─── Add channel modal ────────────────────────────────────────────────────────
const AddChannelModal = ({ onClose }) => {
  const [step, setStep] = useState(1)
  const [form, setForm] = useState({ name: '', platform: 'Telegram', url: '', audience: '', price: '', category: '', desc: '' })
  const update = (k, v) => setForm(p => ({ ...p, [k]: v }))
  const PLATFORMS = ['Telegram', 'WhatsApp', 'Discord', 'Instagram', 'Newsletter', 'Facebook']
  const CATEGORIES = ['Tecnología', 'Marketing', 'Negocios', 'Gaming', 'Fitness', 'Finanzas', 'Ecommerce']
  const inp = { width: '100%', boxSizing: 'border-box', background: 'var(--bg)', border: '1px solid var(--border-med)', borderRadius: '11px', padding: '11px 14px', fontSize: '14px', color: 'var(--text)', fontFamily: F, outline: 'none' }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.65)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px', backdropFilter: 'blur(4px)' }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div style={{ background: 'var(--surface)', borderRadius: '22px', width: '100%', maxWidth: '500px', overflow: 'hidden', boxShadow: '0 32px 80px rgba(0,0,0,0.45)' }}>
        <div style={{ height: '4px', background: `linear-gradient(90deg, ${WA} 0%, ${OK} 100%)` }} />

        <div style={{ padding: '24px 28px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <div style={{ fontFamily: D, fontSize: '18px', fontWeight: 800, color: 'var(--text)' }}>Registrar canal</div>
            <div style={{ fontSize: '12px', color: 'var(--muted)', marginTop: '3px' }}>Paso {step} de 2 · Será revisado por el equipo</div>
          </div>
          <button onClick={onClose} style={{ background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: '9px', padding: '8px', cursor: 'pointer', color: 'var(--muted)', display: 'flex' }}><X size={16} /></button>
        </div>

        {/* Progress bar */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0', padding: '16px 28px', borderBottom: '1px solid var(--border)' }}>
          {['Información básica', 'Monetización'].map((s, i) => (
            <div key={i} style={{ paddingRight: i === 0 ? '12px' : 0, paddingLeft: i === 1 ? '12px' : 0 }}>
              <div style={{ height: '4px', borderRadius: '2px', background: step > i ? WA : 'var(--border)', marginBottom: '5px', transition: 'background .3s' }} />
              <span style={{ fontSize: '11px', fontWeight: step > i ? 600 : 400, color: step > i ? WA : 'var(--muted2)' }}>{s}</span>
            </div>
          ))}
        </div>

        <div style={{ padding: '20px 28px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {step === 1 && <>
            <div><label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--muted)', display: 'block', marginBottom: '7px' }}>Nombre del canal *</label><input value={form.name} onChange={e => update('name', e.target.value)} placeholder="Ej: Tech Insights ES" style={inp} /></div>
            <div><label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--muted)', display: 'block', marginBottom: '8px' }}>Plataforma *</label>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>{PLATFORMS.map(p => {
                const c = PLAT_COLORS[p] || A
                return <button key={p} onClick={() => update('platform', p)} style={{ background: form.platform === p ? c : 'var(--bg)', border: `1px solid ${form.platform === p ? c : 'var(--border)'}`, borderRadius: '20px', padding: '6px 14px', fontSize: '12px', fontWeight: 600, color: form.platform === p ? '#fff' : 'var(--muted)', cursor: 'pointer', fontFamily: F, transition: 'all .15s' }}>{p}</button>
              })}</div>
            </div>
            <div><label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--muted)', display: 'block', marginBottom: '7px' }}>Enlace al canal</label><input value={form.url} onChange={e => update('url', e.target.value)} placeholder="https://t.me/tucanal" style={inp} /></div>
            <div><label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--muted)', display: 'block', marginBottom: '7px' }}>Audiencia aproximada</label><input type="number" value={form.audience} onChange={e => update('audience', e.target.value)} placeholder="15000" style={inp} /></div>
          </>}
          {step === 2 && <>
            <div><label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--muted)', display: 'block', marginBottom: '7px' }}>Precio por publicación (€) *</label><input type="number" value={form.price} onChange={e => update('price', e.target.value)} placeholder="250" style={inp} /></div>
            <div><label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--muted)', display: 'block', marginBottom: '8px' }}>Categoría</label>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>{CATEGORIES.map(c => <button key={c} onClick={() => update('category', c)} style={{ background: form.category === c ? WA : 'var(--bg)', border: `1px solid ${form.category === c ? WA : 'var(--border)'}`, borderRadius: '20px', padding: '6px 12px', fontSize: '12px', fontWeight: 600, color: form.category === c ? '#fff' : 'var(--muted)', cursor: 'pointer', fontFamily: F }}>{c}</button>)}</div>
            </div>
            <div><label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--muted)', display: 'block', marginBottom: '7px' }}>Descripción</label><textarea value={form.desc} onChange={e => update('desc', e.target.value)} placeholder="Describe tu canal, audiencia y tipo de contenido..." rows={3} style={{ ...inp, resize: 'none' }} /></div>
          </>}
        </div>

        <div style={{ padding: '16px 28px', borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', gap: '10px' }}>
          <button onClick={() => step > 1 ? setStep(1) : onClose()} style={{ background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: '11px', padding: '11px 20px', fontSize: '13px', cursor: 'pointer', color: 'var(--text)', fontFamily: F }}>
            {step > 1 ? '← Volver' : 'Cancelar'}
          </button>
          <button onClick={async () => {
            if (step < 2) return setStep(2)
            // Submit to API
            try {
              const payload = {
                nombreCanal: form.name,
                plataforma: form.platform,
                enlace: form.url,
                audiencia: Number(form.audience) || 0,
                precio: Number(form.price) || 0,
                categoria: form.category,
                descripcion: form.desc,
              }
              const res = await apiService.createChannel(payload)
              if (res?.success) {
                onClose(res.data) // pass new channel back
              } else {
                alert(res?.message || 'Error al registrar el canal')
              }
            } catch (err) {
              alert('Error de conexión al registrar el canal')
            }
          }} style={{ background: WA, color: '#fff', border: 'none', borderRadius: '11px', padding: '11px 26px', fontSize: '13px', fontWeight: 700, cursor: 'pointer', fontFamily: F, boxShadow: `0 4px 14px ${WAG(0.35)}` }}>
            {step === 2 ? '✓ Enviar para revisión' : 'Siguiente →'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Mock sparklines ──────────────────────────────────────────────────────────
const EARN_SPARK = [820, 940, 870, 1100, 1050, 1280, 1190, 1380, 1310, 1520, 1480, 1730]
const VIEWS_SPARK = [11, 13, 12, 15, 14, 17, 16, 19, 18, 22, 21, 24]
const REQ_SPARK   = [2, 4, 3, 5, 4, 6, 5, 7, 6, 8, 7, 9]

// ─── Period selector options ─────────────────────────────────────────────────
const PERIOD_OPTS = [
  { key: '7d', label: '7 dias' },
  { key: '30d', label: '30 dias' },
  { key: '90d', label: '90 dias' },
  { key: '12m', label: '12 meses' },
]
const getPeriodMs = (key) => {
  if (key === '7d') return 7 * 86400000
  if (key === '30d') return 30 * 86400000
  if (key === '90d') return 90 * 86400000
  return 365 * 86400000
}

// ─── Main page ────────────────────────────────────────────────────────────────
export default function CreatorOverviewPage() {
  const { user } = useAuth()
  const navigate = useNavigate()
  // Modal removed — now navigates to /creator/channels/new
  const [channels, setChannels] = useState([])
  const [requests, setRequests] = useState([])
  const [creatorCampaigns, setCreatorCampaigns] = useState([])
  const [period, setPeriod] = useState('30d')
  const [fetchError, setFetchError] = useState(null)
  const [retryKey, setRetryKey] = useState(0)

  useEffect(() => {
    let mounted = true
    const load = async () => {
      try {
        // Fetch all three data sources in parallel
        const [chRes, adsRes, cmpRes] = await Promise.all([
          apiService.getMyChannels().catch(() => null),
          apiService.getAdsForCreator().catch(() => null),
          apiService.getCreatorCampaigns().catch(() => null),
        ])
        if (!mounted) return
        const chData = chRes?.success ? (Array.isArray(chRes.data) ? chRes.data : chRes.data?.items || []) : []
        const adsData = adsRes?.success && Array.isArray(adsRes.data) ? adsRes.data : []
        const cmpData = cmpRes?.success ? (Array.isArray(cmpRes.data) ? cmpRes.data : cmpRes.data?.items || []) : []
        setChannels(chData)
        setRequests(adsData)
        setCreatorCampaigns(cmpData)
      } catch (err) {
        console.error('CreatorOverviewPage load error:', err)
        if (mounted) setFetchError('No se pudieron cargar los datos. Verifica tu conexion.')
      }
    }
    load()
    return () => { mounted = false }
  }, [retryKey])

  const nombre  = user?.nombre || 'Creador'
  const nameFirst = nombre.split(' ')[0]

  // Period-aware filtering
  const periodMs = getPeriodMs(period)
  const periodStart = new Date(Date.now() - periodMs)
  const filteredCampaigns = creatorCampaigns.filter(c => new Date(c.createdAt) >= periodStart)

  // Compute KPIs from real campaign data
  const campaignEarnings = filteredCampaigns.filter(c => c.status === 'COMPLETED').reduce((s, c) => s + (c.netAmount || 0), 0)
  const totalEarnings  = channels.reduce((s, c) => s + (c.totalEarnings || 0), 0) + campaignEarnings
  const monthEarnings  = channels.reduce((s, c) => s + (c.earningsThisMonth || 0), 0) + campaignEarnings
  const activeChannels = channels.filter(c => c.estado === 'activo' || c.estado === 'verificado' || c.status === 'activo').length || channels.length
  const pendingReqs    = requests.filter(r => r.status === 'pendiente').length + creatorCampaigns.filter(c => c.status === 'PAID').length
  const balance        = campaignEarnings || 930

  // Month-over-month change
  const now = new Date()
  const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1)
  const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1)
  const thisMonthEarn = creatorCampaigns.filter(c => c.status === 'COMPLETED' && new Date(c.completedAt || c.createdAt) >= thisMonthStart).reduce((s, c) => s + (c.netAmount || 0), 0)
  const lastMonthEarn = creatorCampaigns.filter(c => c.status === 'COMPLETED' && new Date(c.completedAt || c.createdAt) >= lastMonthStart && new Date(c.completedAt || c.createdAt) < thisMonthStart).reduce((s, c) => s + (c.netAmount || 0), 0)
  const momChange = lastMonthEarn > 0 ? Math.round(((thisMonthEarn - lastMonthEarn) / lastMonthEarn) * 100) : null
  const momLabel = momChange !== null ? `${momChange >= 0 ? '+' : ''}${momChange}% vs mes anterior` : '+18% vs mes anterior'

  // Build activity feed from real campaigns
  const activityFeed = creatorCampaigns.slice().sort((a, b) => new Date(b.updatedAt || b.createdAt) - new Date(a.updatedAt || a.createdAt)).slice(0, 6).map(c => ({
    id: c._id,
    icon: c.status === 'PAID' ? '📥' : c.status === 'PUBLISHED' ? '📢' : c.status === 'COMPLETED' ? '💰' : c.status === 'CANCELLED' ? '✕' : '📋',
    color: c.status === 'PAID' ? BLUE : c.status === 'PUBLISHED' ? OK : c.status === 'COMPLETED' ? WA : '#ef4444',
    title: c.status === 'PAID' ? 'Nueva solicitud' : c.status === 'PUBLISHED' ? 'Publicada' : c.status === 'COMPLETED' ? 'Pago recibido' : 'Cancelada',
    desc: `${typeof c.channel === 'object' ? c.channel?.nombreCanal : 'Canal'} — €${(c.netAmount || 0).toFixed(2)}`,
    time: new Date(c.updatedAt || c.createdAt).toLocaleDateString('es', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }),
  }))

  // Compute real sparkline from campaigns
  const earnSparkData = creatorCampaigns.length > 0 ? (() => {
    const buckets = Array(12).fill(0)
    creatorCampaigns.filter(c => c.status === 'COMPLETED').forEach(c => {
      const d = new Date(c.completedAt || c.createdAt)
      const monthsAgo = (now.getFullYear() - d.getFullYear()) * 12 + now.getMonth() - d.getMonth()
      if (monthsAgo >= 0 && monthsAgo < 12) buckets[11 - monthsAgo] += (c.netAmount || 0)
    })
    return buckets
  })() : EARN_SPARK

  // Compute real bar chart data
  const barChartData = creatorCampaigns.length > 0 ? (() => {
    const result = []
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
      const label = d.toLocaleDateString('es', { month: 'short' })
      const value = Math.round(creatorCampaigns.filter(c => c.status === 'COMPLETED').reduce((s, c) => {
        const cd = new Date(c.completedAt || c.createdAt)
        return cd.getFullYear() === d.getFullYear() && cd.getMonth() === d.getMonth() ? s + (c.netAmount || 0) : s
      }, 0))
      result.push({ label, value })
    }
    return result
  })() : [
    { label: 'Oct', value: Math.round(totalEarnings * 0.08) },
    { label: 'Nov', value: Math.round(totalEarnings * 0.12) },
    { label: 'Dic', value: Math.round(totalEarnings * 0.2) },
    { label: 'Ene', value: Math.round(totalEarnings * 0.1) },
    { label: 'Feb', value: Math.round(totalEarnings * 0.15) },
    { label: 'Mar', value: monthEarnings || Math.round(totalEarnings * 0.25) },
  ]

  const h = new Date().getHours()
  const greeting = h < 13 ? `Buenos días, ${nameFirst}` : h < 20 ? `Buenas tardes, ${nameFirst}` : `Buenas noches, ${nameFirst}`

  // ── Main channel selection (for CAS Hero) ──────────────────────────────
  // If the creator has multiple channels, default to the one with the
  // highest CAS. The user can override via the header select below.
  const [selectedChannelId, setSelectedChannelId] = useState(null)
  const mainChannel = (() => {
    if (!channels.length) return null
    if (selectedChannelId) {
      const found = channels.find(c => (c._id || c.id) === selectedChannelId)
      if (found) return found
    }
    // Default: the channel with the highest CAS, or the first one
    const sorted = channels.slice().sort((a, b) => (b.CAS || 0) - (a.CAS || 0))
    return sorted[0]
  })()
  const mainChannelHasCAS = mainChannel && Number(mainChannel.CAS) > 0

  return (
    <div style={{ fontFamily: F, display: 'flex', flexDirection: 'column', gap: '28px', maxWidth: '1150px' }}>

      {/* ── Header ── */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
            <h1 style={{ fontFamily: D, fontSize: '28px', fontWeight: 800, color: 'var(--text)', letterSpacing: '-0.04em', lineHeight: 1.1 }}>
              {greeting} 👋
            </h1>
          </div>
          <p style={{ fontSize: '14px', color: 'var(--muted)' }}>
            {activeChannels} canales activos · <span style={{ color: WA, fontWeight: 500 }}>{pendingReqs} solicitudes pendientes</span>
          </p>
        </div>
        <button
          onClick={() => navigate('/creator/channels/new')}
          style={{ display: 'flex', alignItems: 'center', gap: '8px', background: WA, color: '#fff', border: 'none', borderRadius: '12px', padding: '11px 20px', fontSize: '14px', fontWeight: 700, cursor: 'pointer', fontFamily: F, boxShadow: `0 4px 16px ${WAG(0.4)}`, transition: 'transform .15s, box-shadow .15s' }}
          onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.boxShadow = `0 8px 24px ${WAG(0.45)}` }}
          onMouseLeave={e => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = `0 4px 16px ${WAG(0.4)}` }}
        >
          <Plus size={16} strokeWidth={2.5} /> Registrar canal
        </button>
      </div>

      {fetchError && <ErrorBanner message={fetchError} onRetry={() => { setFetchError(null); setRetryKey(k => k + 1) }} style={{ marginBottom: '20px' }} />}

      {/* ── Channel selector (only if multiple channels) ── */}
      {channels.length > 1 && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 12, color: 'var(--muted)', fontFamily: F }}>Canal activo:</span>
          <select
            value={(mainChannel && (mainChannel._id || mainChannel.id)) || ''}
            onChange={(e) => setSelectedChannelId(e.target.value)}
            style={{
              background: 'var(--surface)',
              color: 'var(--text)',
              border: '1px solid var(--border)',
              borderRadius: 10,
              padding: '8px 14px',
              fontSize: 13,
              fontFamily: F,
              outline: 'none',
              cursor: 'pointer',
            }}
          >
            {channels.map((ch) => (
              <option key={ch._id || ch.id} value={ch._id || ch.id}>
                {ch.nombreCanal || ch.nombre || 'Canal'} · {ch.plataforma || ''}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* ── CAS Hero ── */}
      {mainChannelHasCAS ? (
        <div
          style={{
            position: 'relative',
            background: 'var(--surface)',
            border: `1px solid ${C.borderEl}`,
            borderRadius: 16,
            padding: '20px 22px',
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              position: 'absolute',
              inset: 0,
              background: `radial-gradient(circle at top right, ${C.tealGlow}, transparent 60%)`,
              pointerEvents: 'none',
            }}
          />
          <div style={{ display: 'flex', alignItems: 'center', gap: 24, flexWrap: 'wrap', position: 'relative' }}>
            <div style={{ flex: 1, minWidth: 220 }}>
              <div className="font-mono" style={{ fontSize: 12, color: C.t2, marginBottom: 6 }}>
                @{mainChannel.nombreCanal || mainChannel.nombre || 'canal'}
              </div>
              <ScoreGauge CAS={mainChannel.CAS} nivel={mainChannel.nivel} showLabel height={8} />
              <div className="font-mono" style={{ display: 'flex', gap: 12, marginTop: 10, fontSize: 11, color: C.t3 }}>
                {mainChannel.CAF != null && <span>CAF {Math.round(mainChannel.CAF)}</span>}
                {mainChannel.CTF != null && <span>CTF {Math.round(mainChannel.CTF)}</span>}
                {mainChannel.CAP != null && <span>CAP {Math.round(mainChannel.CAP)}</span>}
              </div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 10 }}>
              {Number(mainChannel.CPMDinamico) > 0 && (
                <CPMBadge CPM={mainChannel.CPMDinamico} plataforma={mainChannel.plataforma} size="lg" />
              )}
              {mainChannel.verificacion?.confianzaScore != null && (
                <ConfianzaBadge
                  score={mainChannel.verificacion.confianzaScore}
                  fuente={mainChannel.verificacion.tipoAcceso}
                  showScore
                />
              )}
            </div>
          </div>
        </div>
      ) : channels.length > 0 ? (
        <div
          style={{
            background: 'var(--surface)',
            border: '1px dashed var(--border)',
            borderRadius: 14,
            padding: '16px 20px',
            color: 'var(--muted)',
            fontSize: 13,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 12,
            flexWrap: 'wrap',
          }}
        >
          <span>Verifica tu canal para obtener tu CAS Score</span>
          <button
            onClick={() => navigate('/creator/channels')}
            style={{
              background: 'transparent',
              color: C.teal,
              border: `1px solid ${C.teal}66`,
              borderRadius: 8,
              padding: '6px 14px',
              fontSize: 12,
              fontWeight: 600,
              cursor: 'pointer',
              fontFamily: F,
            }}
          >
            Verificar canal →
          </button>
        </div>
      ) : null}

      {/* ── Period selector ── */}
      <div style={{ display: 'flex', gap: '2px', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '12px', padding: '3px', width: 'fit-content' }}>
        {PERIOD_OPTS.map(p => {
          const active = period === p.key
          return (
            <button key={p.key} onClick={() => setPeriod(p.key)} style={{
              background: active ? WA : 'transparent', color: active ? '#fff' : 'var(--muted)',
              border: 'none', borderRadius: '9px', padding: '8px 14px', fontSize: '13px',
              fontWeight: active ? 600 : 400, cursor: 'pointer', fontFamily: F, transition: 'all .18s',
            }}>{p.label}</button>
          )
        })}
      </div>

      {/* ── KPI grid ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: '14px' }}>
        <KpiCard icon={DollarSign} label="Ganancias este mes" value={`€${monthEarnings.toLocaleString('es')}`} sub={momLabel} subColor={momChange !== null && momChange < 0 ? '#ef4444' : OK} sparkData={earnSparkData} accent={WA} />
        <KpiCard icon={Radio} label="Canales activos" value={activeChannels} sub={`${channels.length} total`} accent={A} sparkData={[2, 3, 3, 3, 4, 4, 4, 4, 4, 4, 4, activeChannels]} />
        <KpiCard icon={Inbox} label="Solicitudes pendientes" value={pendingReqs} sub={pendingReqs > 0 ? 'Requieren respuesta' : 'Al dia'} subColor={pendingReqs > 0 ? WARN : OK} sparkData={REQ_SPARK} accent={WARN} />
        <KpiCard icon={TrendingUp} label="Ganancias totales" value={`€${totalEarnings.toLocaleString('es')}`} sub="Desde el inicio" accent={OK} sparkData={earnSparkData.map(v => v * 0.6)} />
      </div>

      {/* ── Quick actions ── */}
      <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
        {[
          { label: 'Responder solicitudes', icon: '📥', color: BLUE, to: '/creator/requests' },
          { label: 'Actualizar disponibilidad', icon: '📅', color: A, to: '/creator/channels' },
          { label: 'Solicitar retiro', icon: '💸', color: WA, to: '/creator/earnings' },
          { label: 'Ajustes de perfil', icon: '⚙️', color: '#6b7280', to: '/creator/settings' },
        ].map(a => (
          <button key={a.label} onClick={() => navigate(a.to)} style={{
            display: 'flex', alignItems: 'center', gap: '8px',
            background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '12px',
            padding: '10px 16px', fontSize: '13px', fontWeight: 600, color: 'var(--text)',
            cursor: 'pointer', fontFamily: F, transition: 'all .15s',
          }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = `${a.color}50`; e.currentTarget.style.transform = 'translateY(-1px)' }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.transform = 'none' }}
          >
            <span style={{ fontSize: '16px' }}>{a.icon}</span>
            {a.label}
          </button>
        ))}
      </div>

      {/* ── 2-col layout ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.6fr) minmax(280px, 1fr)', gap: '20px' }}>

        {/* ── Left column ── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>

          {/* Active channels */}
          <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '18px', overflow: 'hidden' }}>
            <div style={{ padding: '18px 22px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <h2 style={{ fontFamily: D, fontSize: '15px', fontWeight: 700, color: 'var(--text)', marginBottom: '2px' }}>Mis Canales</h2>
                <p style={{ fontSize: '12px', color: 'var(--muted)' }}>{channels.length} canales registrados</p>
              </div>
              <button onClick={() => navigate('/creator/channels')} style={{ display: 'flex', alignItems: 'center', gap: '5px', background: 'none', border: 'none', fontSize: '13px', color: WA, cursor: 'pointer', fontWeight: 600, fontFamily: F }}>
                Ver todos <ChevronRight size={14} />
              </button>
            </div>
            {channels.map((ch, i) => {
              const plat = ch.plataforma || ch.platform || ''
              const platLabel = plat.charAt(0).toUpperCase() + plat.slice(1)
              const platColor = PLAT_COLORS[platLabel] || A
              const name = ch.nombreCanal || ch.name || ch.identificadorCanal || 'Canal'
              const audience = ch.estadisticas?.seguidores || ch.audience || 0
              const price = ch.precio || ch.pricePerPost || 0
              const earnings = ch.earningsThisMonth || 0
              const status = ch.estado || ch.status || 'pendiente'
              const isActive = status === 'activo' || status === 'verificado'
              return (
                <div key={ch._id || ch.id} style={{ padding: '15px 22px', borderBottom: i < channels.length - 1 ? '1px solid var(--border)' : 'none', display: 'flex', alignItems: 'center', gap: '14px', transition: 'background .12s' }}
                  onMouseEnter={e => { e.currentTarget.style.background = 'var(--bg2)' }}
                  onMouseLeave={e => { e.currentTarget.style.background = 'transparent' }}
                >
                  {/* Platform icon */}
                  <div style={{ width: '44px', height: '44px', borderRadius: '12px', background: `${platColor}18`, border: `1px solid ${platColor}30`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px', flexShrink: 0 }}>
                    {plat === 'telegram' ? '✈️' : plat === 'whatsapp' ? '💬' : plat === 'discord' ? '🎮' : plat === 'instagram' ? '📸' : '📧'}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '5px', flexWrap: 'wrap' }}>
                      <span style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text)' }}>{name}</span>
                      {Number(ch.CAS) > 0 && <CASBadge CAS={ch.CAS} nivel={ch.nivel} size="xs" />}
                      <PlatBadge p={platLabel} />
                      {ch.verificado && <span style={{ fontSize: '10px', color: OK, fontWeight: 700, display: 'flex', alignItems: 'center', gap: '3px' }}>✓ Verificado</span>}
                    </div>
                    <div style={{ display: 'flex', gap: '14px', fontSize: '12px', color: 'var(--muted)', flexWrap: 'wrap' }}>
                      <span>{audience.toLocaleString('es')} suscriptores</span>
                      <span>{price > 0 ? `€${price}/post` : 'Sin precio'}</span>
                      {earnings > 0 && <span style={{ color: OK, fontWeight: 600 }}>+€{earnings} este mes</span>}
                    </div>
                  </div>
                  {/* Health indicator */}
                  <div style={{ textAlign: 'right', flexShrink: 0 }}>
                    <div style={{ height: '32px', width: '60px', display: 'flex', alignItems: 'flex-end', gap: '3px', justifyContent: 'flex-end' }}>
                      {[40, 60, 50, 70, 65, 80].map((v, j) => (
                        <div key={j} style={{ width: '6px', borderRadius: '2px 2px 0 0', height: `${(v/80)*100}%`, background: j === 5 ? platColor : `${platColor}45` }} />
                      ))}
                    </div>
                  </div>
                  <span style={{ background: isActive ? `${OK}12` : `${WARN}12`, color: isActive ? OK : WARN, border: `1px solid ${isActive ? `${OK}25` : `${WARN}25`}`, borderRadius: '20px', padding: '3px 10px', fontSize: '11px', fontWeight: 600, whiteSpace: 'nowrap', flexShrink: 0 }}>
                    {isActive ? '● Activo' : '● Pendiente'}
                  </span>
                </div>
              )
            })}
          </div>

          {/* Pending requests */}
          <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '18px', overflow: 'hidden' }}>
            <div style={{ padding: '18px 22px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <h2 style={{ fontFamily: D, fontSize: '15px', fontWeight: 700, color: 'var(--text)' }}>Solicitudes pendientes</h2>
                {pendingReqs > 0 && (
                  <span style={{ background: `${WARN}18`, color: WARN, border: `1px solid ${WARN}35`, borderRadius: '20px', padding: '2px 8px', fontSize: '11px', fontWeight: 700 }}>
                    {pendingReqs}
                  </span>
                )}
              </div>
              <button onClick={() => navigate('/creator/requests')} style={{ display: 'flex', alignItems: 'center', gap: '5px', background: 'none', border: 'none', fontSize: '13px', color: WA, cursor: 'pointer', fontWeight: 600, fontFamily: F }}>
                Ver todas <ChevronRight size={14} />
              </button>
            </div>

            {requests.filter(r => r.status === 'pendiente').length === 0 ? (
              <div style={{ padding: '40px', textAlign: 'center' }}>
                <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: `${OK}12`, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px', fontSize: '22px' }}>✓</div>
                <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text)', marginBottom: '4px' }}>Al día</div>
                <div style={{ fontSize: '13px', color: 'var(--muted)' }}>No hay solicitudes pendientes de respuesta</div>
              </div>
            ) : (
              requests.filter(r => r.status === 'pendiente').slice(0, 3).map((req, i, arr) => (
                <div key={req.id} style={{ padding: '18px 22px', borderBottom: i < arr.length - 1 ? '1px solid var(--border)' : 'none' }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '14px', flexWrap: 'wrap' }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text)', marginBottom: '4px' }}>{req.title}</div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px', flexWrap: 'wrap' }}>
                        <span style={{ fontSize: '12px', color: 'var(--muted)' }}>{req.advertiser}</span>
                        <span style={{ width: '3px', height: '3px', borderRadius: '50%', background: 'var(--muted2)' }} />
                        <span style={{ fontSize: '12px', color: 'var(--muted)' }}>{req.channel}</span>
                        <span style={{ width: '3px', height: '3px', borderRadius: '50%', background: 'var(--muted2)' }} />
                        <span style={{ display: 'flex', alignItems: 'center', gap: '3px', fontSize: '11px', color: 'var(--muted2)' }}><Clock size={10} /> {req.receivedAt}</span>
                      </div>
                      <p style={{ fontSize: '13px', color: 'var(--muted)', fontStyle: 'italic', lineHeight: 1.4, margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
                        "{req.message}"
                      </p>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '10px', flexShrink: 0 }}>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontFamily: D, fontSize: '22px', fontWeight: 800, color: 'var(--text)', letterSpacing: '-0.02em' }}>€{req.budget}</div>
                        <div style={{ fontSize: '11px', color: 'var(--muted)' }}>oferta</div>
                      </div>
                      <div style={{ display: 'flex', gap: '7px' }}>
                        <button style={{ display: 'flex', alignItems: 'center', gap: '5px', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: '9px', padding: '7px 13px', fontSize: '12px', fontWeight: 600, color: '#ef4444', cursor: 'pointer', fontFamily: F }}>
                          <X size={12} /> Rechazar
                        </button>
                        <button onClick={() => navigate('/creator/requests')} style={{ display: 'flex', alignItems: 'center', gap: '5px', background: WA, border: 'none', borderRadius: '9px', padding: '7px 14px', fontSize: '12px', fontWeight: 700, color: '#fff', cursor: 'pointer', fontFamily: F, boxShadow: `0 3px 10px ${WAG(0.3)}` }}>
                          <Check size={12} /> Aceptar
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* ── Right column ── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>

          {/* Earnings chart */}
          <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '18px', padding: '20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
              <h3 style={{ fontFamily: D, fontSize: '14px', fontWeight: 700, color: 'var(--text)' }}>Ganancias mensuales</h3>
              <span style={{ fontSize: '11px', color: 'var(--muted)' }}>Últimos 6 meses</span>
            </div>
            <p style={{ fontSize: '12px', color: 'var(--muted)', marginBottom: '14px' }}>Tendencia de ingresos</p>
            <BarChart data={barChartData} color={WA} />
          </div>

          {/* Activity feed */}
          <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '18px', overflow: 'hidden' }}>
            <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Activity size={14} color={WA} />
                <h3 style={{ fontFamily: D, fontSize: '14px', fontWeight: 700, color: 'var(--text)' }}>Actividad reciente</h3>
              </div>
              <button onClick={() => navigate('/creator/requests')} style={{ background: 'none', border: 'none', fontSize: '12px', color: WA, cursor: 'pointer', fontFamily: F, fontWeight: 600 }}>Ver todo</button>
            </div>
            <div style={{ padding: '4px 0' }}>
              {(activityFeed.length > 0 ? activityFeed : [
                { id: 1, icon: '📥', color: BLUE, title: 'Nueva solicitud', desc: 'Tech Insights ES — €450', time: 'Hace 2h' },
                { id: 2, icon: '💰', color: WA, title: 'Pago recibido', desc: 'Marketing Pro WA — €180', time: 'Ayer' },
                { id: 3, icon: '📢', color: OK, title: 'Publicada', desc: 'Dev & Code ES — €380', time: 'Hace 3 dias' },
              ]).map((a, i, arr) => (
                <div key={a.id} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '11px 20px', borderBottom: i < arr.length - 1 ? '1px solid var(--border)' : 'none', transition: 'background .1s' }}
                  onMouseEnter={e => e.currentTarget.style.background = 'var(--bg2)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                >
                  <div style={{ width: '34px', height: '34px', borderRadius: '9px', background: `${a.color}12`, border: `1px solid ${a.color}20`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '15px', flexShrink: 0 }}>
                    {a.icon}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text)', marginBottom: '2px' }}>{a.title}</div>
                    <div style={{ fontSize: '11px', color: 'var(--muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{a.desc}</div>
                  </div>
                  <span style={{ fontSize: '11px', color: 'var(--muted2)', whiteSpace: 'nowrap', flexShrink: 0 }}>{a.time}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Balance withdrawal card */}
          <div style={{ background: `linear-gradient(135deg, ${WA} 0%, #1aa34a 100%)`, borderRadius: '18px', padding: '20px', color: '#fff', position: 'relative', overflow: 'hidden' }}>
            <div style={{ position: 'absolute', top: '-20px', right: '-20px', width: '80px', height: '80px', borderRadius: '50%', background: 'rgba(255,255,255,0.08)' }} />
            <div style={{ fontSize: '12px', opacity: 0.85, marginBottom: '6px' }}>Saldo para retirar</div>
            <div style={{ fontFamily: D, fontSize: '32px', fontWeight: 900, letterSpacing: '-0.03em', marginBottom: '4px' }}>€{balance}</div>
            <div style={{ fontSize: '12px', opacity: 0.75, marginBottom: '16px' }}>Disponible inmediatamente</div>
            <div style={{ height: '4px', background: 'rgba(255,255,255,0.2)', borderRadius: '2px', overflow: 'hidden', marginBottom: '16px' }}>
              <div style={{ height: '100%', width: '65%', background: 'rgba(255,255,255,0.7)', borderRadius: '2px' }} />
            </div>
            <button onClick={() => navigate('/creator/earnings')} style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'rgba(255,255,255,0.2)', border: '1px solid rgba(255,255,255,0.35)', borderRadius: '10px', padding: '9px 18px', fontSize: '13px', fontWeight: 700, color: '#fff', cursor: 'pointer', fontFamily: F, width: '100%', justifyContent: 'center' }}>
              <Zap size={14} fill="#fff" /> Solicitar retiro
            </button>
          </div>
        </div>
      </div>

      {/* Channel registration is now a full page at /creator/channels/new */}
    </div>
  )
}
