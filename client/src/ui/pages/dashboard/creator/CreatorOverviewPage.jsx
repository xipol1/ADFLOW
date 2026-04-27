import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Radio, Inbox, DollarSign, TrendingUp, Plus, ChevronRight, Clock, Zap, Activity, BarChart3, Wallet } from 'lucide-react'
import { useAuth } from '../../../../auth/AuthContext'
import apiService from '../../../../services/api'
import { GREEN, greenAlpha, FONT_BODY, FONT_DISPLAY, OK as _OK, WARN as _WARN, BLUE as _BLUE, PLAT_COLORS } from '../../../theme/tokens'
import { CASBadge, ScoreGauge, CPMBadge, ConfianzaBadge } from '../../../components/scoring'
import { Sparkline, ErrorBanner } from '../shared/DashComponents'
import DashboardModule from '../../../components/DashboardModule'
import MetricContext from '../../../components/MetricContext'

// ─── Design tokens ──────────────────────────────────────────────────────────
const WA  = GREEN
const WAG = greenAlpha
const A   = 'var(--accent, #8B5CF6)'
const AG  = (o) => `var(--accent-dim, rgba(139,92,246,${o}))`
const F   = FONT_BODY
const D   = FONT_DISPLAY
const OK  = _OK
const WARN = _WARN
const BLUE = _BLUE

// ─── Inline BarChart ────────────────────────────────────────────────────────
function BarChart({ data, color = WA }) {
  const max = Math.max(...data.map(d => d.value), 1)
  const [hoverIdx, setHoverIdx] = useState(null)
  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', gap: 5, height: 110, paddingBottom: 22 }}>
      {data.map((d, i) => {
        const isLast = i === data.length - 1
        const isHov  = hoverIdx === i
        const pct    = (d.value / max) * 100
        return (
          <div key={i} onMouseEnter={() => setHoverIdx(i)} onMouseLeave={() => setHoverIdx(null)}
            style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5, height: '100%', cursor: 'default' }}>
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', width: '100%' }}>
              {(isHov || isLast) && (
                <div style={{ fontSize: 10, color: isLast ? color : 'var(--muted)', fontWeight: 700, textAlign: 'center', marginBottom: 3 }}>
                  {'\u20AC'}{d.value}
                </div>
              )}
              <div style={{ width: '100%', borderRadius: '4px 4px 0 0', minHeight: 3, height: `${pct}%`,
                background: isLast ? `linear-gradient(180deg, ${color} 0%, ${color}90 100%)` : isHov ? `${color}70` : `${color}40`,
                transition: 'background .15s' }} />
            </div>
            <span style={{ fontSize: 9, color: isLast ? color : 'var(--muted)', fontWeight: isLast ? 600 : 400 }}>{d.label}</span>
          </div>
        )
      })}
    </div>
  )
}

// ─── Platform badge ─────────────────────────────────────────────────────────
const PlatBadge = ({ p }) => {
  const c = PLAT_COLORS[p] || A
  return <span style={{ background: `${c}18`, color: c, border: `1px solid ${c}35`, borderRadius: 6, padding: '2px 8px', fontSize: 11, fontWeight: 600 }}>{p}</span>
}

// ─── Period pills ───────────────────────────────────────────────────────────
const PERIOD_OPTS = [
  { key: '7d',  label: '7d' },
  { key: '30d', label: '30d' },
  { key: '90d', label: '90d' },
  { key: '12m', label: '12m' },
]

// ─── CAS factor labels ─────────────────────────────────────────────────────
const CAS_FACTORS = ['CAF', 'CTF', 'CER', 'CVS', 'CAP']
const factorColor = (v) => v >= 80 ? OK : v >= 50 ? '#f59e0b' : '#ef4444'

// ─── Nivel label ────────────────────────────────────────────────────────────
const nivelLabel = (cas) => cas >= 80 ? 'Elite' : cas >= 61 ? 'Gold' : cas >= 41 ? 'Silver' : 'Bronze'
const nivelColor = (cas) => cas >= 80 ? '#818CF8' : cas >= 61 ? '#F59E0B' : cas >= 41 ? '#94A3B8' : '#B87333'

// ─── Platform emoji ─────────────────────────────────────────────────────────
const platEmoji = (p) => {
  const m = { telegram: '\u2708\uFE0F', whatsapp: '\uD83D\uDCAC', discord: '\uD83C\uDFAE', instagram: '\uD83D\uDCF8', newsletter: '\uD83D\uDCE7', facebook: '\uD83D\uDCD8' }
  return m[(p || '').toLowerCase()] || '\uD83D\uDCE1'
}

// ─── Keyframes (injected once) ──────────────────────────────────────────────
let _injected = false
function injectCSS() {
  if (_injected || typeof document === 'undefined') return
  const s = document.createElement('style')
  s.textContent = `
    @keyframes ce-in { from { opacity:0; transform:translateY(16px) } to { opacity:1; transform:translateY(0) } }
    @keyframes ce-pulse { 0%,100% { opacity:1 } 50% { opacity:.5 } }
    .ce-skel { animation: ce-pulse 1.5s ease-in-out infinite; background: var(--border); border-radius: 12px; }
  `
  document.head.appendChild(s)
  _injected = true
}

// ═══════════════════════════════════════════════════════════════════════════
// Main page
// ═══════════════════════════════════════════════════════════════════════════
export default function CreatorOverviewPage() {
  const { user } = useAuth()
  const navigate = useNavigate()
  injectCSS()

  const [channels, setChannels] = useState([])
  const [requests, setRequests] = useState([])
  const [creatorCampaigns, setCreatorCampaigns] = useState([])
  const [period, setPeriod] = useState('30d')
  const [fetchError, setFetchError] = useState(null)
  const [retryKey, setRetryKey] = useState(0)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let mounted = true
    const load = async () => {
      try {
        const [chRes, adsRes, cmpRes] = await Promise.all([
          apiService.getMyChannels().catch(() => null),
          apiService.getAdsForCreator().catch(() => null),
          apiService.getCreatorCampaigns().catch(() => null),
        ])
        if (!mounted) return
        setChannels(chRes?.success ? (Array.isArray(chRes.data) ? chRes.data : chRes.data?.items || []) : [])
        setRequests(adsRes?.success && Array.isArray(adsRes.data) ? adsRes.data : [])
        setCreatorCampaigns(cmpRes?.success && Array.isArray(cmpRes.data) ? cmpRes.data : [])
      } catch {
        if (mounted) setFetchError('No se pudieron cargar los datos.')
      }
      if (mounted) setLoading(false)
    }
    load()
    return () => { mounted = false }
  }, [retryKey])

  // ── Computed values ─────────────────────────────────────────────────────
  const now = new Date()

  const mainChannel = (() => {
    if (!channels.length) return null
    const sorted = channels.slice().sort((a, b) => (b.CAS || 0) - (a.CAS || 0))
    return sorted[0]
  })()

  const activeChannels = channels.filter(c => c.estado === 'activo' || c.estado === 'verificado' || c.status === 'activo').length || channels.length
  const pendingRequests = requests.filter(r => r.status === 'pendiente').length + creatorCampaigns.filter(c => c.status === 'PAID').length
  const completedCampaigns = creatorCampaigns.filter(c => c.status === 'COMPLETED')

  const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1)
  const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1)
  const thisMonthEarnings = completedCampaigns
    .filter(c => new Date(c.completedAt || c.createdAt) >= thisMonthStart)
    .reduce((s, c) => s + (c.netAmount || 0), 0)
  const lastMonthEarnings = completedCampaigns
    .filter(c => { const d = new Date(c.completedAt || c.createdAt); return d >= lastMonthStart && d < thisMonthStart })
    .reduce((s, c) => s + (c.netAmount || 0), 0)
  const totalEarnings = completedCampaigns.reduce((s, c) => s + (c.netAmount || 0), 0)

  const avgCAS = (() => {
    const valid = channels.filter(c => Number(c.CAS) > 0)
    return valid.length ? Math.round(valid.reduce((s, c) => s + c.CAS, 0) / valid.length) : 0
  })()

  const avgCPM = (() => {
    const valid = channels.filter(c => Number(c.CPMDinamico) > 0)
    return valid.length ? +(valid.reduce((s, c) => s + c.CPMDinamico, 0) / valid.length).toFixed(2) : 0
  })()

  const balance = totalEarnings
  const monthOverMonth = lastMonthEarnings > 0
    ? Math.round(((thisMonthEarnings - lastMonthEarnings) / lastMonthEarnings) * 100)
    : null
  const momLabel = monthOverMonth !== null ? `${monthOverMonth >= 0 ? '+' : ''}${monthOverMonth}%` : null

  // 6-month bar chart
  const monthlyData = (() => {
    const result = []
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
      const label = d.toLocaleDateString('es', { month: 'short' })
      const value = Math.round(completedCampaigns.reduce((s, c) => {
        const cd = new Date(c.completedAt || c.createdAt)
        return cd.getFullYear() === d.getFullYear() && cd.getMonth() === d.getMonth() ? s + (c.netAmount || 0) : s
      }, 0))
      result.push({ label, value })
    }
    return result
  })()
  const earnSparkData = monthlyData.map(m => m.value)

  // Activity feed
  const activityFeed = creatorCampaigns.slice()
    .sort((a, b) => new Date(b.updatedAt || b.createdAt) - new Date(a.updatedAt || a.createdAt))
    .slice(0, 8)
    .map(c => ({
      id: c._id,
      icon: c.status === 'PAID' ? '\uD83D\uDCE5' : c.status === 'PUBLISHED' ? '\uD83D\uDCE2' : c.status === 'COMPLETED' ? '\uD83D\uDCB0' : '\u2715',
      label: c.status === 'PAID' ? 'Nueva solicitud' : c.status === 'PUBLISHED' ? 'Publicada' : c.status === 'COMPLETED' ? 'Pago recibido' : 'Cancelada',
      color: c.status === 'PAID' ? BLUE : c.status === 'PUBLISHED' ? OK : c.status === 'COMPLETED' ? WA : '#ef4444',
      desc: `${typeof c.channel === 'object' ? c.channel?.nombreCanal : 'Canal'} \u2014 \u20AC${(c.netAmount || 0).toFixed(0)}`,
      time: (() => {
        const ms = Date.now() - new Date(c.updatedAt || c.createdAt).getTime()
        const mins = Math.floor(ms / 60000)
        if (mins < 60) return `Hace ${mins}m`
        const hrs = Math.floor(mins / 60)
        if (hrs < 24) return `Hace ${hrs}h`
        return `Hace ${Math.floor(hrs / 24)}d`
      })(),
    }))

  // Period label
  const periodLabel = { '7d': 'Resumen semanal', '30d': 'Resumen mensual', '90d': 'Resumen trimestral', '12m': 'Resumen anual' }[period]

  // ── Loading state ─────────────────────────────────────────────────────
  if (loading) {
    return (
      <div style={{ fontFamily: F, display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 16, maxWidth: 1150 }}>
        {[1, 2, 3, 4].map(i => (
          <div key={i} className="ce-skel" style={{ height: 140, borderRadius: 16 }} />
        ))}
      </div>
    )
  }

  // ── Empty state (no channels) ─────────────────────────────────────────
  if (!loading && channels.length === 0 && !fetchError) {
    return (
      <div style={{ fontFamily: F, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: '80px 24px', maxWidth: 420, margin: '0 auto' }}>
        <div style={{ width: 64, height: 64, borderRadius: 18, background: `${WA}14`, border: `1px solid ${WA}30`, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 20 }}>
          <Radio size={28} color={WA} />
        </div>
        <h2 style={{ fontFamily: D, fontSize: 22, fontWeight: 800, color: 'var(--text)', marginBottom: 8 }}>
          Registra tu primer canal
        </h2>
        <p style={{ fontSize: 14, color: 'var(--muted)', lineHeight: 1.6, marginBottom: 24 }}>
          Conecta un canal de Telegram, WhatsApp, Discord u otra plataforma para empezar a recibir solicitudes de campañas y monetizar tu audiencia.
        </p>
        <button
          onClick={() => navigate('/creator/channels/new')}
          style={{ display: 'flex', alignItems: 'center', gap: 8, background: WA, color: '#fff', border: 'none', borderRadius: 12, padding: '13px 28px', fontSize: 15, fontWeight: 700, cursor: 'pointer', fontFamily: F, boxShadow: `0 6px 20px ${WAG(0.35)}` }}
        >
          <Plus size={18} strokeWidth={2.5} /> Registrar canal
        </button>
      </div>
    )
  }

  // ═══════════════════════════════════════════════════════════════════════
  // Main render
  // ═══════════════════════════════════════════════════════════════════════
  return (
    <div style={{ fontFamily: F, display: 'flex', flexDirection: 'column', gap: 24, maxWidth: 1150, animation: 'ce-in .4s ease-out' }}>

      {/* ── 1. WELCOME HEADER ── */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>
        <div>
          <h1 style={{ fontFamily: D, fontSize: 28, fontWeight: 800, color: 'var(--text)', letterSpacing: '-0.04em', lineHeight: 1.1, margin: 0 }}>
            Dashboard
          </h1>
          <p style={{ fontSize: 13, color: 'var(--muted)', marginTop: 6 }}>
            {periodLabel} &middot; {activeChannels} canal{activeChannels !== 1 ? 'es' : ''} activo{activeChannels !== 1 ? 's' : ''}
          </p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          {/* Period pills */}
          <div style={{ display: 'flex', gap: 2, background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 10, padding: 3 }}>
            {PERIOD_OPTS.map(p => {
              const active = period === p.key
              return (
                <button key={p.key} onClick={() => setPeriod(p.key)} style={{
                  background: active ? WA : 'transparent', color: active ? '#fff' : 'var(--muted)',
                  border: 'none', borderRadius: 8, padding: '6px 12px', fontSize: 12,
                  fontWeight: active ? 700 : 400, cursor: 'pointer', fontFamily: F, transition: 'all .15s',
                }}>{p.label}</button>
              )
            })}
          </div>
          <button
            onClick={() => navigate('/creator/channels/new')}
            style={{ display: 'flex', alignItems: 'center', gap: 7, background: WA, color: '#fff', border: 'none', borderRadius: 11, padding: '10px 18px', fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: F, boxShadow: `0 4px 14px ${WAG(0.35)}`, transition: 'transform .15s' }}
            onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-1px)' }}
            onMouseLeave={e => { e.currentTarget.style.transform = 'none' }}
          >
            <Plus size={15} strokeWidth={2.5} /> Registrar canal
          </button>
        </div>
      </div>

      {fetchError && <ErrorBanner message={fetchError} onRetry={() => { setFetchError(null); setRetryKey(k => k + 1) }} />}

      {/* ── 2. SMART RECOMMENDATIONS ── */}
      {(() => {
        const recs = []
        if (pendingRequests > 0)
          recs.push({ icon: '\uD83D\uDCE5', text: `Tienes ${pendingRequests} solicitud${pendingRequests > 1 ? 'es' : ''} pendiente${pendingRequests > 1 ? 's' : ''}`, link: '/creator/requests', cta: 'Responder' })
        if (mainChannel && Number(mainChannel.CAS) > 0 && Number(mainChannel.CAS) < 40)
          recs.push({ icon: '\uD83D\uDCCA', text: `Tu CAS es ${mainChannel.CAS} \u2014 conecta OAuth para mejorar tu CTF`, link: '/creator/analytics', cta: 'Ver analytics' })
        if (channels.length > 0 && channels.every(c => !c.CAS || Number(c.CAS) === 0))
          recs.push({ icon: '\uD83D\uDD0D', text: 'Verifica al menos un canal para obtener tu CAS Score', link: '/creator/channels', cta: 'Verificar' })
        if (!recs.length) return null
        return (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {recs.map((r, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, background: `${WA}08`, border: `1px solid ${WA}22`, borderRadius: 12, padding: '10px 16px' }}>
                <span style={{ fontSize: 17, flexShrink: 0 }}>{r.icon}</span>
                <span style={{ flex: 1, fontSize: 12, color: 'var(--text)', lineHeight: 1.4 }}>{r.text}</span>
                <button onClick={() => navigate(r.link)} style={{ background: `${WA}18`, color: WA, border: `1px solid ${WA}40`, borderRadius: 8, padding: '5px 12px', fontSize: 11, fontWeight: 600, cursor: 'pointer', fontFamily: F, flexShrink: 0, whiteSpace: 'nowrap' }}>
                  {r.cta} &rarr;
                </button>
              </div>
            ))}
          </div>
        )
      })()}

      {/* ── 3. KPI STRIP ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: 12 }}>
        {[
          { icon: DollarSign, label: 'Ganancias mes', value: `\u20AC${Math.round(thisMonthEarnings).toLocaleString('es')}`, accent: WA, spark: earnSparkData,
            sub: momLabel, subColor: monthOverMonth !== null && monthOverMonth < 0 ? '#ef4444' : OK },
          { icon: TrendingUp, label: 'Ganancias totales', value: `\u20AC${Math.round(totalEarnings).toLocaleString('es')}`, accent: OK, spark: earnSparkData.map(v => v * 0.6),
            sub: `${completedCampaigns.length} campa\u00F1as` },
          { icon: Radio, label: 'Canales activos', value: activeChannels, accent: BLUE, spark: null,
            sub: `${channels.length} total` },
          { icon: Inbox, label: 'Pendientes', value: pendingRequests, accent: pendingRequests > 0 ? WARN : OK, spark: null,
            sub: pendingRequests > 0 ? 'Requieren respuesta' : 'Al d\u00EDa', subColor: pendingRequests > 0 ? WARN : OK },
          { icon: Zap, label: 'CAS Score', value: avgCAS || '\u2014', accent: nivelColor(avgCAS), spark: null,
            sub: avgCAS > 0 ? nivelLabel(avgCAS) : 'Sin datos', subColor: nivelColor(avgCAS) },
          { icon: Activity, label: 'CPM medio', value: avgCPM > 0 ? `\u20AC${avgCPM}` : '\u2014', accent: WA, spark: null,
            sub: 'por 1K impresiones' },
        ].map((k, i) => (
          <KpiInline key={i} {...k} />
        ))}
      </div>

      {/* ── 4. CAS HERO COMPACT ── */}
      {mainChannel && Number(mainChannel.CAS) > 0 && (
        <div
          onClick={() => navigate('/creator/analytics')}
          style={{
            background: 'linear-gradient(135deg, var(--surface) 0%, rgba(139,92,246,0.03) 100%)',
            border: '1px solid var(--border)', borderRadius: 16, padding: '18px 22px',
            display: 'flex', alignItems: 'center', gap: 20, flexWrap: 'wrap', cursor: 'pointer',
            transition: 'border-color .2s, box-shadow .2s',
          }}
          onMouseEnter={e => { e.currentTarget.style.borderColor = `${WA}50`; e.currentTarget.style.boxShadow = `0 4px 20px ${WAG(0.1)}` }}
          onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.boxShadow = 'none' }}
        >
          {/* Left: gauge + name */}
          <div style={{ flex: '0 0 auto', display: 'flex', alignItems: 'center', gap: 14 }}>
            <ScoreGauge CAS={mainChannel.CAS} nivel={mainChannel.nivel} showLabel height={6} />
            <div>
              <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)', marginBottom: 2 }}>
                {mainChannel.nombreCanal || mainChannel.nombre || 'Canal'}
              </div>
              <PlatBadge p={(mainChannel.plataforma || '').charAt(0).toUpperCase() + (mainChannel.plataforma || '').slice(1)} />
            </div>
          </div>

          {/* Center: 5-factor mini bars */}
          <div style={{ flex: 1, minWidth: 200, display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap' }}>
            {CAS_FACTORS.map(f => {
              const val = Math.round(mainChannel[f] || 0)
              return (
                <div key={f} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3, minWidth: 36 }}>
                  <div style={{ width: 36, height: 6, borderRadius: 3, background: 'var(--border)', overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${Math.min(val, 100)}%`, borderRadius: 3, background: factorColor(val), transition: 'width .4s ease-out' }} />
                  </div>
                  <span style={{ fontSize: 9, fontWeight: 700, color: factorColor(val), fontFamily: 'JetBrains Mono, monospace' }}>{f} {val}</span>
                </div>
              )
            })}
          </div>

          {/* Right: CPM + Confianza */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 8, flexShrink: 0 }}>
            {Number(mainChannel.CPMDinamico) > 0 && <CPMBadge CPM={mainChannel.CPMDinamico} plataforma={mainChannel.plataforma} size="lg" />}
            {mainChannel.verificacion?.confianzaScore != null && (
              <ConfianzaBadge score={mainChannel.verificacion.confianzaScore} fuente={mainChannel.verificacion.tipoAcceso} showScore />
            )}
          </div>

          <ChevronRight size={16} color="var(--muted)" style={{ flexShrink: 0 }} />
        </div>
      )}

      {/* ── 5. TWO-COLUMN GRID ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: 20 }}>

        {/* ── LEFT COLUMN ── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

          {/* Revenue Chart */}
          <DashboardModule title="Ganancias mensuales" icon={DollarSign}
            tooltip="Ingresos netos por campañas completadas (comisi\u00F3n descontada)."
            linkTo="/creator/earnings" linkLabel="Ver detalle">
            <p style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 12 }}>
              Tendencia de ingresos &mdash; {'\u00FA'}ltimos 6 meses
            </p>
            <BarChart data={monthlyData} color={WA} />
          </DashboardModule>

          {/* Channel Performance */}
          <DashboardModule title="Mis canales" icon={Radio}
            tooltip={`${channels.length} canales registrados.`}
            linkTo="/creator/channels" linkLabel="Gestionar canales" noPadding>
            {channels.map((ch, i) => {
              const plat = ch.plataforma || ch.platform || ''
              const platLabel = plat.charAt(0).toUpperCase() + plat.slice(1)
              const platColor = PLAT_COLORS[platLabel] || WA
              const name = ch.nombreCanal || ch.name || ch.identificadorCanal || 'Canal'
              const audience = ch.estadisticas?.seguidores || ch.audience || 0
              const price = ch.precio || ch.pricePerPost || 0
              const earnings = ch.earningsThisMonth || 0
              const status = ch.estado || ch.status || 'pendiente'
              const isActive = status === 'activo' || status === 'verificado'
              return (
                <div key={ch._id || ch.id} style={{ padding: '14px 20px', borderBottom: i < channels.length - 1 ? '1px solid var(--border)' : 'none', display: 'flex', alignItems: 'center', gap: 12, transition: 'background .1s' }}
                  onMouseEnter={e => { e.currentTarget.style.background = 'var(--bg2)' }}
                  onMouseLeave={e => { e.currentTarget.style.background = 'transparent' }}>
                  <div style={{ width: 40, height: 40, borderRadius: 10, background: `${platColor}14`, border: `1px solid ${platColor}28`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, flexShrink: 0 }}>
                    {platEmoji(plat)}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4, flexWrap: 'wrap' }}>
                      <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)' }}>{name}</span>
                      {Number(ch.CAS) > 0 && <CASBadge CAS={ch.CAS} nivel={ch.nivel} size="xs" />}
                      <span style={{ background: isActive ? `${OK}14` : `${WARN}14`, color: isActive ? OK : WARN, borderRadius: 20, padding: '1px 8px', fontSize: 10, fontWeight: 600 }}>
                        {isActive ? 'Activo' : 'Pendiente'}
                      </span>
                    </div>
                    <div style={{ display: 'flex', gap: 12, fontSize: 11, color: 'var(--muted)' }}>
                      <span>{audience.toLocaleString('es')} subs</span>
                      {Number(ch.CPMDinamico) > 0 && <span>{'\u20AC'}{ch.CPMDinamico} CPM</span>}
                      {earnings > 0 && <span style={{ color: OK, fontWeight: 600 }}>+{'\u20AC'}{earnings}</span>}
                    </div>
                  </div>
                  {earnSparkData.some(v => v > 0) && (
                    <Sparkline data={earnSparkData} color={platColor} />
                  )}
                </div>
              )
            })}
          </DashboardModule>

          {/* Pending Requests */}
          {pendingRequests > 0 && (
            <DashboardModule title="Solicitudes pendientes" icon={Inbox}
              tooltip="Solicitudes que requieren tu respuesta."
              linkTo="/creator/requests" linkLabel="Ver todas" noPadding
              action={<span style={{ background: `${WARN}18`, color: WARN, border: `1px solid ${WARN}35`, borderRadius: 20, padding: '2px 8px', fontSize: 11, fontWeight: 700 }}>{pendingRequests}</span>}>
              {requests.filter(r => r.status === 'pendiente').slice(0, 5).map((req, i, arr) => (
                <div key={req.id || i} style={{ padding: '14px 20px', borderBottom: i < arr.length - 1 ? '1px solid var(--border)' : 'none', display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', marginBottom: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {req.channel || 'Canal'} &middot; {req.advertiser || 'Anunciante'}
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--muted)' }}>
                      {'\u20AC'}{req.budget || 0}
                    </div>
                  </div>
                  <button onClick={() => navigate('/creator/requests')} style={{ background: WA, color: '#fff', border: 'none', borderRadius: 8, padding: '6px 14px', fontSize: 11, fontWeight: 700, cursor: 'pointer', fontFamily: F }}>
                    Responder
                  </button>
                </div>
              ))}
              {/* Also show PAID campaigns as pending */}
              {creatorCampaigns.filter(c => c.status === 'PAID').slice(0, 3).map((c, i) => (
                <div key={c._id || i} style={{ padding: '14px 20px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', marginBottom: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {typeof c.channel === 'object' ? c.channel?.nombreCanal : 'Canal'} &middot; Campa{'\u00F1'}a
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--muted)' }}>
                      {'\u20AC'}{(c.netAmount || 0).toFixed(0)}
                    </div>
                  </div>
                  <button onClick={() => navigate('/creator/requests')} style={{ background: WA, color: '#fff', border: 'none', borderRadius: 8, padding: '6px 14px', fontSize: 11, fontWeight: 700, cursor: 'pointer', fontFamily: F }}>
                    Ver
                  </button>
                </div>
              ))}
            </DashboardModule>
          )}
        </div>

        {/* ── RIGHT COLUMN ── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

          {/* Activity Feed */}
          <DashboardModule title="Actividad reciente" icon={Activity}
            tooltip="{'\u00DA'}ltimas campañas y solicitudes."
            linkTo="/creator/requests" linkLabel="Ver todo" noPadding>
            {activityFeed.length > 0 ? activityFeed.map((a, i, arr) => (
              <div key={a.id || i} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '11px 20px', borderBottom: i < arr.length - 1 ? '1px solid var(--border)' : 'none', transition: 'background .1s' }}
                onMouseEnter={e => { e.currentTarget.style.background = 'var(--bg2)' }}
                onMouseLeave={e => { e.currentTarget.style.background = 'transparent' }}>
                <div style={{ width: 32, height: 32, borderRadius: 8, background: `${a.color}12`, border: `1px solid ${a.color}20`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, flexShrink: 0 }}>
                  {a.icon}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text)', marginBottom: 1 }}>{a.label}</div>
                  <div style={{ fontSize: 11, color: 'var(--muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{a.desc}</div>
                </div>
                <span style={{ fontSize: 10, color: 'var(--muted2)', whiteSpace: 'nowrap', flexShrink: 0 }}>{a.time}</span>
              </div>
            )) : (
              <div style={{ padding: '36px 20px', textAlign: 'center' }}>
                <div style={{ fontSize: 28, marginBottom: 8 }}>{'\uD83D\uDCCB'}</div>
                <div style={{ fontSize: 13, color: 'var(--muted)' }}>A{'\u00FA'}n no hay actividad</div>
              </div>
            )}
          </DashboardModule>

          {/* Balance Card (custom green gradient, no DashboardModule) */}
          <div style={{ background: `linear-gradient(135deg, ${WA} 0%, #1aa34a 100%)`, borderRadius: 18, padding: '22px', color: '#fff', position: 'relative', overflow: 'hidden' }}>
            <div style={{ position: 'absolute', top: -20, right: -20, width: 80, height: 80, borderRadius: '50%', background: 'rgba(255,255,255,0.08)' }} />
            <div style={{ position: 'absolute', bottom: -30, left: -30, width: 100, height: 100, borderRadius: '50%', background: 'rgba(255,255,255,0.05)' }} />
            <div style={{ position: 'relative' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                <Wallet size={16} style={{ opacity: 0.85 }} />
                <span style={{ fontSize: 12, opacity: 0.85, fontWeight: 600 }}>Saldo disponible</span>
              </div>
              <div style={{ fontFamily: D, fontSize: 34, fontWeight: 900, letterSpacing: '-0.03em', marginBottom: 4 }}>
                {'\u20AC'}{Math.round(balance).toLocaleString('es')}
              </div>
              <div style={{ fontSize: 12, opacity: 0.7, marginBottom: 18 }}>Disponible inmediatamente</div>
              <button onClick={() => navigate('/creator/earnings')} style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                background: 'rgba(255,255,255,0.2)', border: '1px solid rgba(255,255,255,0.35)',
                borderRadius: 10, padding: '10px 18px', fontSize: 13, fontWeight: 700,
                color: '#fff', cursor: 'pointer', fontFamily: F, width: '100%',
                transition: 'background .15s',
              }}
                onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.3)' }}
                onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.2)' }}
              >
                <Zap size={14} fill="#fff" /> Solicitar retiro
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Inline KPI card (lightweight, no shared import) ────────────────────────
function KpiInline({ icon: Icon, label, value, sub, subColor, accent = WA, spark }) {
  const [hov, setHov] = useState(false)
  return (
    <div onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)} style={{
      background: 'var(--surface)', border: `1px solid ${hov ? `${accent}50` : 'var(--border)'}`,
      borderRadius: 14, padding: '18px 18px 16px', transition: 'border-color .2s, transform .2s, box-shadow .2s',
      transform: hov ? 'translateY(-2px)' : 'none',
      boxShadow: hov ? `0 6px 24px ${accent}15` : '0 1px 3px rgba(0,0,0,0.04)',
      display: 'flex', flexDirection: 'column', gap: 10,
    }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
        <div style={{ width: 36, height: 36, borderRadius: 10, background: `${accent}14`, border: `1px solid ${accent}25`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Icon size={16} color={accent} strokeWidth={2} />
        </div>
        {spark && spark.some(v => v > 0) && <Sparkline data={spark} color={accent} />}
      </div>
      <div>
        <div style={{ fontFamily: D, fontSize: 24, fontWeight: 800, color: 'var(--text)', letterSpacing: '-0.03em', lineHeight: 1.1, marginBottom: 3 }}>
          {value}
        </div>
        <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: sub ? 5 : 0 }}>{label}</div>
        {sub && (
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 4, background: `${subColor || OK}12`, borderRadius: 20, padding: '2px 8px' }}>
            <span style={{ fontSize: 10, fontWeight: 700, color: subColor || OK }}>{sub}</span>
          </div>
        )}
      </div>
    </div>
  )
}
