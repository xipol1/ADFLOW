import React, { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Plus, TrendingUp, TrendingDown, Eye, MousePointer,
  DollarSign, Megaphone, ArrowUpRight, MoreHorizontal,
  Activity, Target, Zap, Clock, ChevronRight, ExternalLink,
} from 'lucide-react'
import { useAuth } from '../../../../auth/AuthContext'
import { PLATFORM_COLORS } from './mockData'
import apiService from '../../../../../services/api'
import { Sparkline } from '../shared/DashComponents'
import {
  PURPLE, purpleAlpha, FONT_BODY, FONT_DISPLAY, OK, WARN, ERR, BLUE,
} from '../../../theme/tokens'


// ─── Time-aware greeting ──────────────────────────────────────────────────────
function getGreeting(name) {
  const h = new Date().getHours()
  if (h >= 5 && h < 13)  return { text: `Buenos días, ${name}`, emoji: '☀️' }
  if (h >= 13 && h < 20) return { text: `Buenas tardes, ${name}`, emoji: '🌤️' }
  return                         { text: `Buenas noches, ${name}`, emoji: '🌙' }
}

// ─── Mini donut ring ──────────────────────────────────────────────────────────
function Ring({ pct, color, size = 48 }) {
  const r = size / 2 - 5
  const circ = 2 * Math.PI * r
  const dash = (pct / 100) * circ
  return (
    <svg width={size} height={size} style={{ flexShrink: 0, transform: 'rotate(-90deg)' }}>
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="var(--border)" strokeWidth="4.5" />
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth="4.5"
        strokeDasharray={`${dash} ${circ - dash}`} strokeLinecap="round"
        style={{ transition: 'stroke-dasharray .6s cubic-bezier(.4,0,.2,1)' }} />
    </svg>
  )
}

// ─── KPI Card ─────────────────────────────────────────────────────────────────
function KpiCard({ icon: Icon, label, value, change, changeLabel, sparkData, color = PURPLE, accent, ring }) {
  const [hovered, setHovered] = useState(false)
  const isPositive = change > 0
  const TrendIcon = isPositive ? TrendingUp : TrendingDown
  const trendColor = isPositive ? OK : ERR

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        background: 'var(--surface)',
        border: `1px solid ${hovered ? purpleAlpha(0.35) : 'var(--border)'}`,
        borderRadius: '16px',
        padding: '22px',
        display: 'flex',
        flexDirection: 'column',
        gap: '14px',
        transition: 'border-color .2s, box-shadow .2s, transform .2s',
        transform: hovered ? 'translateY(-2px)' : 'none',
        boxShadow: hovered ? `0 8px 32px ${purpleAlpha(0.1)}` : '0 1px 4px rgba(0,0,0,0.06)',
        cursor: 'default',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* subtle gradient overlay on hover */}
      <div style={{
        position: 'absolute', inset: 0, borderRadius: '16px',
        background: hovered ? purpleAlpha(0.03) : 'transparent',
        transition: 'background .2s', pointerEvents: 'none',
      }} />

      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', zIndex: 1 }}>
        <div style={{
          width: '40px', height: '40px', borderRadius: '11px',
          background: `${accent || PURPLE}15`,
          border: `1px solid ${accent || PURPLE}25`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <Icon size={18} color={accent || PURPLE} strokeWidth={2} />
        </div>
        {ring !== undefined && <Ring pct={ring} color={accent || PURPLE} size={44} />}
        {sparkData && !ring && <Sparkline data={sparkData} color={accent || PURPLE} />}
      </div>

      <div style={{ zIndex: 1 }}>
        <div style={{
          fontSize: '28px', fontWeight: 800, fontFamily: FONT_DISPLAY, color: 'var(--text)',
          letterSpacing: '-0.03em', lineHeight: 1.1, marginBottom: '4px',
        }}>
          {value}
        </div>
        <div style={{ fontSize: '13px', color: 'var(--muted)', marginBottom: '8px' }}>{label}</div>

        {change !== undefined && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
            <div style={{
              display: 'flex', alignItems: 'center', gap: '3px',
              background: `${trendColor}12`, border: `1px solid ${trendColor}25`,
              borderRadius: '20px', padding: '2px 8px',
            }}>
              <TrendIcon size={11} color={trendColor} strokeWidth={2.5} />
              <span style={{ fontSize: '11px', fontWeight: 700, color: trendColor }}>
                {isPositive ? '+' : ''}{change}%
              </span>
            </div>
            {changeLabel && <span style={{ fontSize: '11px', color: 'var(--muted2)' }}>{changeLabel}</span>}
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Bar chart (monthly spend) ────────────────────────────────────────────────
function BarChart({ data }) {
  const max = Math.max(...data.map(d => d.value))
  const [hoverIdx, setHoverIdx] = useState(null)
  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', gap: '6px', height: '120px', paddingBottom: '20px' }}>
      {data.map((d, i) => {
        const isLast = i === data.length - 1
        const isHov  = hoverIdx === i
        const pct    = (d.value / max) * 100

        return (
          <div key={i}
            onMouseEnter={() => setHoverIdx(i)}
            onMouseLeave={() => setHoverIdx(null)}
            style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px', height: '100%', cursor: 'default' }}
          >
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', width: '100%' }}>
              {(isHov || isLast) && (
                <div style={{ fontSize: '11px', color: isLast ? PURPLE : 'var(--muted)', fontWeight: 700, textAlign: 'center', marginBottom: '4px' }}>
                  €{d.value}
                </div>
              )}
              <div style={{
                width: '100%', borderRadius: '6px 6px 0 0', minHeight: '4px',
                height: `${pct}%`,
                background: isLast
                  ? `linear-gradient(180deg, ${purpleAlpha(0.9)} 0%, ${PURPLE} 100%)`
                  : isHov
                    ? purpleAlpha(0.5)
                    : purpleAlpha(0.3),
                transition: 'background .15s, height .4s cubic-bezier(.4,0,.2,1)',
              }} />
            </div>
            <span style={{ fontSize: '10px', color: isLast ? PURPLE : 'var(--muted)', fontWeight: isLast ? 600 : 400, whiteSpace: 'nowrap' }}>
              {d.label}
            </span>
          </div>
        )
      })}
    </div>
  )
}

// ─── SVG donut chart ──────────────────────────────────────────────────────────
function Donut({ segments, total, size = 148 }) {
  const r = 52, cx = size / 2, cy = size / 2
  const circ = 2 * Math.PI * r
  let offset = 0

  const arcs = segments.map(s => {
    const frac  = total > 0 ? s.value / total : 0
    const sweep = frac * circ - 3
    const start = offset
    offset += frac * circ
    return { ...s, dasharray: `${Math.max(0, sweep)} ${circ}`, dashoffset: -start }
  })

  return (
    <svg width={size} height={size} style={{ transform: 'rotate(-90deg)', flexShrink: 0 }}>
      <circle cx={cx} cy={cy} r={r} fill="none" stroke="var(--border)" strokeWidth="16" />
      {arcs.map((arc, i) => (
        <circle key={i} cx={cx} cy={cy} r={r} fill="none"
          stroke={arc.color} strokeWidth="16"
          strokeDasharray={arc.dasharray}
          strokeDashoffset={arc.dashoffset}
          strokeLinecap="round"
          style={{ transition: 'stroke-dasharray .5s ease' }}
        />
      ))}
    </svg>
  )
}

// ─── Campaign row ─────────────────────────────────────────────────────────────
function CampaignRow({ ad, isLast }) {
  const [hovered, setHovered] = useState(false)
  const navigate = useNavigate()

  // Normalize status for both mock data and API data
  const statusCfg = {
    activo:     { color: OK,   bg: `${OK}12`,   label: 'Activo'    },
    pendiente:  { color: WARN, bg: `${WARN}12`,  label: 'Pendiente' },
    completado: { color: '#94a3b8', bg: 'rgba(148,163,184,0.1)', label: 'Complet.' },
    pausado:    { color: '#f97316', bg: 'rgba(249,115,22,0.1)', label: 'Pausado' },
    DRAFT:      { color: WARN, bg: `${WARN}12`,  label: 'Borrador'  },
    PAID:       { color: BLUE, bg: `${BLUE}12`,   label: 'Pagada'    },
    PUBLISHED:  { color: OK,   bg: `${OK}12`,     label: 'Activo'    },
    COMPLETED:  { color: '#94a3b8', bg: 'rgba(148,163,184,0.1)', label: 'Complet.' },
    CANCELLED:  { color: ERR,  bg: `${ERR}12`,    label: 'Cancelada' },
  }[ad.status] || { color: '#94a3b8', bg: 'rgba(148,163,184,0.1)', label: ad.status }

  // Support both mock (ad.platform / ad.channel) and API (ad.channel.plataforma / ad.channel.nombreCanal)
  const channelName = typeof ad.channel === 'object' ? ad.channel?.nombreCanal : ad.channel || ''
  const platform = typeof ad.channel === 'object' ? ad.channel?.plataforma : ad.platform || ''
  const platColor = PLATFORM_COLORS[platform] || PURPLE
  const views = ad.tracking?.impressions || ad.views || 0
  const clicks = ad.tracking?.clicks || ad.clicks || 0
  const ctr = views > 0 ? ((clicks / views) * 100).toFixed(1) : (ad.ctr || 0)
  const spent = ad.price || ad.spent || ad.budget || 0

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: 'grid',
        gridTemplateColumns: '1fr 80px 72px 72px 80px',
        alignItems: 'center',
        padding: '13px 20px',
        borderBottom: isLast ? 'none' : '1px solid var(--border)',
        background: hovered ? 'var(--bg2)' : 'transparent',
        transition: 'background .12s',
        cursor: 'pointer',
        gap: '12px',
      }}
      onClick={() => navigate('/advertiser/campaigns')}
    >
      <div style={{ minWidth: 0 }}>
        <div style={{ fontSize: '13.5px', fontWeight: 600, color: 'var(--text)', marginBottom: '3px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {ad.title || ad.content?.slice(0, 50) || 'Campaña'}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: platColor, flexShrink: 0 }} />
          <span style={{ fontSize: '11px', color: 'var(--muted)' }}>{channelName}</span>
        </div>
      </div>
      <div style={{ fontSize: '13px', color: 'var(--text)', fontWeight: 500 }}>{views.toLocaleString('es')}</div>
      <div style={{ fontSize: '13px', color: Number(ctr) > 4 ? OK : 'var(--text)', fontWeight: 600 }}>{ctr}%</div>
      <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text)' }}>€{spent}</div>
      <span style={{
        background: statusCfg.bg, color: statusCfg.color,
        border: `1px solid ${statusCfg.color}35`,
        borderRadius: '20px', padding: '3px 9px', fontSize: '11px', fontWeight: 600,
        whiteSpace: 'nowrap', display: 'inline-block',
      }}>
        {statusCfg.label}
      </span>
    </div>
  )
}

// ─── Activity feed item ───────────────────────────────────────────────────────
const ACTIVITY = [
  { id: 1, icon: '📢', title: 'Campaña "Tech Pro 2026" aprobada', time: 'hace 2 horas', color: OK },
  { id: 2, icon: '💰', title: 'Recarga de €500 procesada', time: 'hace 5 horas', color: BLUE },
  { id: 3, icon: '📊', title: 'Campaña "Fintech España" alcanzó 50K impresiones', time: 'ayer', color: PURPLE },
  { id: 4, icon: '⏸️', title: 'Campaña "Gaming Rush" pausada automáticamente', time: 'ayer', color: WARN },
  { id: 5, icon: '✅', title: 'Pago de €350 procesado a TechReview ES', time: 'hace 2 días', color: OK },
]

// ─── Top channels ──────────────────────────────────────────────────────────────
const TOP_CHANNELS = [
  { name: 'TechReview ES', platform: 'Telegram', pct: 82, earned: '€1,240', color: '#2aabee' },
  { name: 'Marketing Daily', platform: 'Instagram', pct: 67, earned: '€860', color: '#e1306c' },
  { name: 'Business Insider ES', platform: 'Newsletter', pct: 51, earned: '€620', color: '#f59e0b' },
  { name: 'Crypto Signals', platform: 'Discord', pct: 39, earned: '€480', color: '#5865f2' },
]

// ─── Mock sparklines ──────────────────────────────────────────────────────────
const SPEND_SPARK  = [320, 410, 380, 450, 520, 490, 610, 580, 670, 720, 700, 830]
const VIEWS_SPARK  = [8200, 9100, 8800, 10200, 11500, 10900, 12400, 13100, 12800, 14200, 15100, 16800]
const CLICKS_SPARK = [210, 280, 260, 310, 340, 320, 390, 410, 380, 440, 470, 520]
const CTR_SPARK    = [2.6, 3.1, 2.9, 3.0, 2.9, 2.9, 3.1, 3.1, 3.0, 3.1, 3.1, 3.1]

// ─── Platform spend ───────────────────────────────────────────────────────────
const PLATFORM_SPEND = [
  { label: 'Telegram',   value: 1240, color: '#2aabee' },
  { label: 'Instagram',  value: 860,  color: '#e1306c' },
  { label: 'Newsletter', value: 620,  color: WARN },
  { label: 'Discord',    value: 480,  color: '#5865f2' },
]
const PLAT_TOTAL = PLATFORM_SPEND.reduce((s, p) => s + p.value, 0)

// ─── Main page ────────────────────────────────────────────────────────────────
export default function OverviewPage() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [campaigns, setCampaigns] = useState([])
  const [loading, setLoading] = useState(true)
  const [monthlySpend, setMonthlySpend] = useState([])

  useEffect(() => {
    let mounted = true
    const load = async () => {
      try {
        const [campsRes, txRes] = await Promise.all([
          apiService.getMyCampaigns().catch(() => null),
          apiService.getMyTransactions().catch(() => null),
        ])
        if (!mounted) return
        if (campsRes?.success) {
          const items = Array.isArray(campsRes.data) ? campsRes.data : Array.isArray(campsRes.data?.items) ? campsRes.data.items : []
          setCampaigns(items)
        }
        if (txRes?.success) {
          const txItems = Array.isArray(txRes.data) ? txRes.data : Array.isArray(txRes.data?.items) ? txRes.data.items : []
          const labels = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic']
          const buckets = {}
          txItems.forEach(tx => {
            const d = new Date(tx.paidAt || tx.createdAt)
            if (isNaN(d.getTime())) return
            const key = `${d.getFullYear()}-${d.getMonth()}`
            if (!buckets[key]) buckets[key] = { label: labels[d.getMonth()], value: 0, ts: d.getTime() }
            buckets[key].value += Math.abs(tx.amount || 0)
          })
          const sorted = Object.values(buckets).sort((a, b) => a.ts - b.ts).slice(-6)
          if (sorted.length > 0) setMonthlySpend(sorted)
        }
      } catch { /* use empty state */ }
      if (mounted) setLoading(false)
    }
    load()
    return () => { mounted = false }
  }, [])

  const nombre   = user?.nombre || user?.name || 'Usuario'
  const greeting = getGreeting(nombre.split(' ')[0])

  // Compute KPIs from real campaign data
  const totalSpend  = campaigns.reduce((s, c) => s + (c.price || c.spent || c.budget || 0), 0)
  const totalViews  = campaigns.reduce((s, a) => s + (a.tracking?.impressions || a.views || 0), 0)
  const totalClicks = campaigns.reduce((s, a) => s + (a.tracking?.clicks || a.clicks || 0), 0)
  const avgCtr      = totalViews > 0 ? ((totalClicks / totalViews) * 100).toFixed(1) : '0.0'
  const activeAds   = campaigns.filter(a => a.status === 'activo' || a.status === 'PUBLISHED' || a.status === 'PAID').length

  const budgetTotal = campaigns.reduce((s, c) => s + (c.price || c.budget || 0), 0) || 5000
  const spentTotal  = campaigns.filter(c => c.status !== 'DRAFT' && c.status !== 'CANCELLED').reduce((s, c) => s + (c.price || c.spent || 0), 0)
  const budgetUsed  = budgetTotal > 0 ? Math.round((spentTotal / budgetTotal) * 100) : 0

  return (
    <div style={{ fontFamily: FONT_BODY, display: 'flex', flexDirection: 'column', gap: '28px', maxWidth: '1200px' }}>

      {/* ── Header ── */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
            <h1 style={{ fontFamily: FONT_DISPLAY, fontSize: '28px', fontWeight: 800, color: 'var(--text)', letterSpacing: '-0.04em', lineHeight: 1.1 }}>
              {greeting.text}
            </h1>
            <span style={{ fontSize: '24px' }}>{greeting.emoji}</span>
          </div>
          <p style={{ fontSize: '14px', color: 'var(--muted)', lineHeight: 1.5 }}>
            Resumen de tu actividad · <span style={{ color: PURPLE, fontWeight: 500 }}>{activeAds} campañas activas</span>
          </p>
        </div>
        <button
          onClick={() => navigate('/advertiser/explore')}
          style={{
            display: 'flex', alignItems: 'center', gap: '8px',
            background: PURPLE, color: '#fff', border: 'none', borderRadius: '12px',
            padding: '11px 20px', fontSize: '14px', fontWeight: 600,
            cursor: 'pointer', fontFamily: FONT_BODY, boxShadow: `0 4px 16px ${purpleAlpha(0.35)}`,
            transition: 'transform .15s, box-shadow .15s',
          }}
          onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.boxShadow = `0 8px 24px ${purpleAlpha(0.4)}` }}
          onMouseLeave={e => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = `0 4px 16px ${purpleAlpha(0.35)}` }}
        >
          <Plus size={16} strokeWidth={2.5} /> Nueva campaña
        </button>
      </div>

      {/* ── KPI grid ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '14px' }}>
        <KpiCard
          icon={DollarSign} label="Gasto este mes" value={`€${totalSpend.toLocaleString('es')}`}
          change={12} changeLabel="vs mes anterior"
          sparkData={SPEND_SPARK} accent={A}
        />
        <KpiCard
          icon={Eye} label="Impresiones totales" value={totalViews >= 1000 ? `${(totalViews/1000).toFixed(0)}K` : totalViews}
          change={18} changeLabel="vs mes anterior"
          sparkData={VIEWS_SPARK} accent={BLUE}
        />
        <KpiCard
          icon={MousePointer} label="Clicks totales" value={totalClicks.toLocaleString('es')}
          change={9} changeLabel="vs mes anterior"
          sparkData={CLICKS_SPARK} accent={OK}
        />
        <KpiCard
          icon={Activity} label="CTR promedio" value={`${avgCtr}%`}
          change={2} changeLabel="vs mes anterior"
          sparkData={CTR_SPARK} accent={WARN}
        />
        <KpiCard
          icon={Target} label="Presupuesto usado" value={`${budgetUsed}%`}
          change={-5} changeLabel={`de €${budgetTotal.toLocaleString('es')}`}
          ring={budgetUsed} accent={A}
        />
      </div>

      {/* ── 2-col main layout ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.6fr) minmax(280px, 1fr)', gap: '20px' }}>

        {/* ── Left column ── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>

          {/* Monthly spend chart */}
          <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '18px', overflow: 'hidden' }}>
            <div style={{ padding: '20px 24px 0', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <h2 style={{ fontFamily: FONT_DISPLAY, fontSize: '15px', fontWeight: 700, color: 'var(--text)', marginBottom: '2px' }}>Gasto mensual</h2>
                <p style={{ fontSize: '12px', color: 'var(--muted)' }}>Últimos 12 meses</p>
              </div>
              <div style={{ display: 'flex', gap: '8px' }}>
                {['3M', '6M', '12M'].map((l, i) => (
                  <button key={l} style={{
                    background: i === 2 ? purpleAlpha(0.1) : 'transparent',
                    border: `1px solid ${i === 2 ? purpleAlpha(0.3) : 'var(--border)'}`,
                    borderRadius: '8px', padding: '4px 10px', fontSize: '12px',
                    color: i === 2 ? PURPLE : 'var(--muted)', cursor: 'pointer', fontFamily: FONT_BODY,
                  }}>{l}</button>
                ))}
              </div>
            </div>
            <div style={{ padding: '16px 24px 20px' }}>
              <BarChart data={monthlySpend.length > 0 ? monthlySpend : []} />
            </div>
          </div>

          {/* Top campaigns table */}
          <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '18px', overflow: 'hidden' }}>
            <div style={{ padding: '18px 20px 14px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <h2 style={{ fontFamily: FONT_DISPLAY, fontSize: '15px', fontWeight: 700, color: 'var(--text)', marginBottom: '2px' }}>Campañas recientes</h2>
                <p style={{ fontSize: '12px', color: 'var(--muted)' }}>{campaigns.length} campañas en total</p>
              </div>
              <button
                onClick={() => navigate('/advertiser/ads')}
                style={{ display: 'flex', alignItems: 'center', gap: '5px', background: 'none', border: 'none', fontSize: '13px', color: PURPLE, cursor: 'pointer', fontWeight: 600, fontFamily: FONT_BODY }}
              >
                Ver todas <ChevronRight size={14} />
              </button>
            </div>

            {/* Table header */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 80px 72px 72px 80px', padding: '10px 20px', borderBottom: '1px solid var(--border)', background: 'var(--bg2)', gap: '12px' }}>
              {['Campaña', 'Vistas', 'CTR', 'Gasto', 'Estado'].map(h => (
                <div key={h} style={{ fontSize: '11px', fontWeight: 600, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{h}</div>
              ))}
            </div>

            {campaigns.slice(0, 5).map((ad, i) => (
              <CampaignRow key={ad.id || ad._id} ad={ad} isLast={i === Math.min(4, campaigns.length - 1)} />
            ))}
          </div>
        </div>

        {/* ── Right column ── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>

          {/* Platform spend donut */}
          <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '18px', padding: '20px' }}>
            <h2 style={{ fontFamily: FONT_DISPLAY, fontSize: '15px', fontWeight: 700, color: 'var(--text)', marginBottom: '4px' }}>Gasto por plataforma</h2>
            <p style={{ fontSize: '12px', color: 'var(--muted)', marginBottom: '18px' }}>Este mes</p>

            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '20px', position: 'relative' }}>
              <Donut segments={PLATFORM_SPEND} total={PLAT_TOTAL} size={148} />
              <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', textAlign: 'center' }}>
                <div style={{ fontFamily: FONT_DISPLAY, fontSize: '20px', fontWeight: 800, color: 'var(--text)', letterSpacing: '-0.02em' }}>
                  €{(PLAT_TOTAL / 1000).toFixed(1)}K
                </div>
                <div style={{ fontSize: '10px', color: 'var(--muted)', marginTop: '1px' }}>Total</div>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {PLATFORM_SPEND.map(p => (
                <div key={p.label} style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: p.color, flexShrink: 0 }} />
                  <span style={{ flex: 1, fontSize: '13px', color: 'var(--text)' }}>{p.label}</span>
                  <div style={{ flex: 2, height: '4px', background: 'var(--border)', borderRadius: '2px', overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${(p.value / PLAT_TOTAL) * 100}%`, background: p.color, borderRadius: '2px', transition: 'width .5s ease' }} />
                  </div>
                  <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text)', minWidth: '48px', textAlign: 'right' }}>€{p.value}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Top channels */}
          <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '18px', overflow: 'hidden' }}>
            <div style={{ padding: '18px 20px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <h2 style={{ fontFamily: FONT_DISPLAY, fontSize: '15px', fontWeight: 700, color: 'var(--text)' }}>Top canales</h2>
              <button
                onClick={() => navigate('/advertiser/explore')}
                style={{ background: 'none', border: 'none', fontSize: '12px', color: PURPLE, cursor: 'pointer', fontWeight: 600, fontFamily: FONT_BODY }}
              >Explorar</button>
            </div>
            {TOP_CHANNELS.map((ch, i) => (
              <div key={ch.name} style={{ padding: '13px 20px', borderBottom: i < TOP_CHANNELS.length - 1 ? '1px solid var(--border)' : 'none' }}
                onMouseEnter={e => { e.currentTarget.style.background = 'var(--bg2)' }}
                onMouseLeave={e => { e.currentTarget.style.background = 'transparent' }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '7px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div style={{ width: '28px', height: '28px', borderRadius: '8px', background: `${ch.color}18`, border: `1px solid ${ch.color}30`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <span style={{ fontSize: '14px' }}>{
                        ch.platform === 'Telegram' ? '✈️' :
                        ch.platform === 'Instagram' ? '📸' :
                        ch.platform === 'Newsletter' ? '📧' : '💬'
                      }</span>
                    </div>
                    <div>
                      <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text)' }}>{ch.name}</div>
                      <div style={{ fontSize: '10px', color: 'var(--muted)' }}>{ch.platform}</div>
                    </div>
                  </div>
                  <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text)' }}>{ch.earned}</span>
                </div>
                <div style={{ height: '4px', background: 'var(--border)', borderRadius: '2px', overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${ch.pct}%`, background: `linear-gradient(90deg, ${ch.color} 0%, ${ch.color}80 100%)`, borderRadius: '2px', transition: 'width .5s ease' }} />
                </div>
              </div>
            ))}
          </div>

          {/* Activity feed */}
          <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '18px', overflow: 'hidden' }}>
            <div style={{ padding: '18px 20px', borderBottom: '1px solid var(--border)' }}>
              <h2 style={{ fontFamily: FONT_DISPLAY, fontSize: '15px', fontWeight: 700, color: 'var(--text)' }}>Actividad reciente</h2>
            </div>
            <div style={{ padding: '8px 0' }}>
              {ACTIVITY.map((item, i) => (
                <div key={item.id} style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', padding: '11px 20px' }}
                  onMouseEnter={e => { e.currentTarget.style.background = 'var(--bg2)' }}
                  onMouseLeave={e => { e.currentTarget.style.background = 'transparent' }}
                >
                  <div style={{ width: '32px', height: '32px', borderRadius: '9px', background: `${item.color}12`, border: `1px solid ${item.color}25`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: '14px' }}>
                    {item.icon}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: '13px', fontWeight: 500, color: 'var(--text)', lineHeight: 1.4 }}>{item.title}</div>
                    <div style={{ fontSize: '11px', color: 'var(--muted)', marginTop: '2px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <Clock size={10} />
                      {item.time}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Quick budget widget */}
          <div style={{ background: `linear-gradient(135deg, ${PURPLE} 0%, #7c3aed 100%)`, borderRadius: '18px', padding: '20px', color: '#fff' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
              <div>
                <div style={{ fontSize: '12px', opacity: 0.8, marginBottom: '4px' }}>Presupuesto mensual</div>
                <div style={{ fontFamily: FONT_DISPLAY, fontSize: '26px', fontWeight: 800, letterSpacing: '-0.03em' }}>€{(budgetTotal * budgetUsed / 100).toLocaleString('es')}</div>
                <div style={{ fontSize: '12px', opacity: 0.7, marginTop: '2px' }}>de €{budgetTotal.toLocaleString('es')} usados</div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontFamily: FONT_DISPLAY, fontSize: '28px', fontWeight: 800 }}>{budgetUsed}%</div>
              </div>
            </div>
            <div style={{ height: '6px', background: 'rgba(255,255,255,0.2)', borderRadius: '3px', overflow: 'hidden', marginBottom: '14px' }}>
              <div style={{ height: '100%', width: `${budgetUsed}%`, background: 'rgba(255,255,255,0.85)', borderRadius: '3px' }} />
            </div>
            <button
              onClick={() => navigate('/advertiser/finances')}
              style={{ background: 'rgba(255,255,255,0.18)', border: '1px solid rgba(255,255,255,0.3)', borderRadius: '9px', padding: '8px 16px', fontSize: '13px', fontWeight: 600, color: '#fff', cursor: 'pointer', fontFamily: FONT_BODY }}
            >
              Ver finanzas →
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
