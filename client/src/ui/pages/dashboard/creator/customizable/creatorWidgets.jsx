import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Wallet, Inbox, Star, Radio, TrendingUp, TrendingDown, Plus,
  ArrowRight, AlertTriangle, CheckCircle2, MessageSquare, Sparkles,
  Search, BarChart3, CalendarDays, Zap, Clock, Users, Target,
  StickyNote, ChevronRight, ChevronLeft,
} from 'lucide-react'
import { WIDGET_TYPES } from './CreatorWidgetRegistry'
import useWidgetSize, { rowsThatFit } from '../../advertiser/customizable/useWidgetSize'
import { FONT_BODY, FONT_DISPLAY, OK, WARN, ERR, BLUE, GREEN } from '../../../../theme/tokens'

// Creator accent colour (green) — matches the role's brand in the app.
const ACCENT = 'var(--accent, #22c55e)'
const ga = (o) => `rgba(34,197,94,${o})`

// ── Shared helpers ───────────────────────────────────────────────────────────

function Trend({ value, size = 11, inverse = false }) {
  if (value === undefined || value === null) return null
  const pos = value > 0
  const Icon = pos ? TrendingUp : TrendingDown
  const color = (inverse ? !pos : pos) ? OK : ERR
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 3,
      background: `${color}12`, border: `1px solid ${color}25`,
      borderRadius: 20, padding: '2px 8px',
      fontSize: size, fontWeight: 700, color, whiteSpace: 'nowrap',
    }}>
      <Icon size={size} strokeWidth={2.5} />{pos ? '+' : ''}{value}%
    </span>
  )
}

function MiniSparkline({ data, color = ACCENT, width = 80, height = 28 }) {
  if (!data || data.length < 2) return null
  const max = Math.max(...data); const min = Math.min(...data); const range = max - min || 1
  const points = data.map((v, i) => {
    const x = (i / (data.length - 1)) * width
    const y = height - ((v - min) / range) * (height - 4) - 2
    return `${x},${y}`
  }).join(' ')
  return <svg width={width} height={height} style={{ display: 'block' }}>
    <polyline points={points} fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
  </svg>
}

const fill = { flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }

// ── Welcome ──────────────────────────────────────────────────────────────────

function getGreeting(name) {
  const h = new Date().getHours()
  if (h >= 5 && h < 13)  return { text: `Buenos días, ${name}`, emoji: '☀️' }
  if (h >= 13 && h < 20) return { text: `Buenas tardes, ${name}`, emoji: '🌤️' }
  return { text: `Buenas noches, ${name}`, emoji: '🌙' }
}

function WelcomeWidget({ data }) {
  const navigate = useNavigate()
  const { ref, width, height } = useWidgetSize()
  const greeting = getGreeting((data.userName || 'Creador').split(' ')[0])
  const compact = width < 480 || height < 90
  const tiny = height < 60
  const pending = data.pendingRequests || 0

  return (
    <div ref={ref} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, height: '100%', padding: '4px 4px' }}>
      <div style={{ minWidth: 0, flex: 1 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: tiny ? 0 : 2 }}>
          <h1 style={{ fontFamily: FONT_DISPLAY, fontSize: tiny ? 16 : compact ? 18 : 24, fontWeight: 800, color: 'var(--text)', letterSpacing: '-0.04em', lineHeight: 1.1, margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {greeting.text}
          </h1>
          {!tiny && <span style={{ fontSize: compact ? 16 : 22 }}>{greeting.emoji}</span>}
        </div>
        {!compact && (
          <p style={{ fontSize: 13, color: 'var(--muted)', margin: 0, lineHeight: 1.5, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {pending > 0
              ? <>Tienes <span style={{ color: ACCENT, fontWeight: 600 }}>{pending} {pending === 1 ? 'solicitud pendiente' : 'solicitudes pendientes'}</span> de respuesta</>
              : 'Todo al día — sin solicitudes pendientes'}
          </p>
        )}
      </div>
      <button onClick={() => navigate('/creator/requests')} style={{
        display: 'flex', alignItems: 'center', gap: 6,
        background: ACCENT, color: '#fff', border: 'none', borderRadius: 10,
        padding: tiny ? '6px 10px' : compact ? '8px 12px' : '10px 18px',
        fontSize: tiny ? 11 : compact ? 12 : 13, fontWeight: 600,
        cursor: 'pointer', fontFamily: FONT_BODY, boxShadow: `0 4px 14px ${ga(0.3)}`,
        whiteSpace: 'nowrap', flexShrink: 0,
      }}>
        <Inbox size={tiny ? 12 : 14} strokeWidth={2.5} /> {tiny ? '' : 'Ver solicitudes'}
      </button>
    </div>
  )
}

// ── KPI configs ──────────────────────────────────────────────────────────────

const KPI_CONFIGS = {
  [WIDGET_TYPES.KPI_EARNINGS]: {
    icon: Wallet, label: 'Ingresos del mes', accent: ACCENT,
    getValue: (d) => `€${(d.monthlyEarnings || 0).toLocaleString('es')}`,
    getChange: (d) => d.earningsDelta,
    changeLabel: 'vs mes anterior',
    sparkData: (d) => d.earningsSpark,
  },
  [WIDGET_TYPES.KPI_PENDING_REQ]: {
    icon: Inbox, label: 'Solicitudes pendientes', accent: WARN,
    getValue: (d) => d.pendingRequests ?? 0,
    getSublabel: (d) => `${d.totalRequests ?? 0} totales recibidas`,
  },
  [WIDGET_TYPES.KPI_RATING]: {
    icon: Star, label: 'Rating medio', accent: '#f59e0b',
    getValue: (d) => d.avgRating ? `${d.avgRating.toFixed(1)} ★` : '—',
    getSublabel: (d) => `${d.ratingCount ?? 0} valoraciones`,
  },
  [WIDGET_TYPES.KPI_CHANNELS]: {
    icon: Radio, label: 'Canales activos', accent: BLUE,
    getValue: (d) => d.activeChannels ?? 0,
    getSublabel: (d) => `${d.totalChannels ?? 0} totales`,
  },
  [WIDGET_TYPES.KPI_COMPLETED]: {
    icon: TrendingUp, label: 'Campañas completadas', accent: OK,
    getValue: (d) => d.completedCampaigns ?? 0,
    getSublabel: () => 'históricas',
  },
  [WIDGET_TYPES.KPI_CAS_AVG]: {
    icon: Target, label: 'CAS promedio', accent: '#ec4899',
    getValue: (d) => d.avgCAS ? Math.round(d.avgCAS) : '—',
    getSublabel: () => 'Channel Authority Score',
  },
}

function KpiWidget({ data, type }) {
  const cfg = KPI_CONFIGS[type]
  const { ref, width, height } = useWidgetSize()
  if (!cfg) return null

  const Icon = cfg.icon
  const value = cfg.getValue(data)
  const change = cfg.getChange?.(data)
  const sublabel = cfg.getSublabel?.(data)
  const sparkData = cfg.sparkData?.(data)
  const tiny = width < 160 || height < 110
  const small = !tiny && (width < 220 || height < 150)
  const showSpark = sparkData && height > 180
  const showSublabel = sublabel && !tiny && height > 130
  const showChangeLabel = cfg.changeLabel && change !== undefined && height > 160
  const valueFontSize = tiny ? 18 : small ? 22 : Math.min(32, Math.max(22, width / 8))
  const iconSize = tiny ? 28 : small ? 34 : 40

  return (
    <div ref={ref} style={{
      display: 'flex', flexDirection: 'column', justifyContent: tiny ? 'center' : 'space-between',
      gap: tiny ? 4 : 10, height: '100%', minHeight: 0,
    }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 6 }}>
        <div style={{ width: iconSize, height: iconSize, borderRadius: 11, background: `${cfg.accent}15`, border: `1px solid ${cfg.accent}25`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <Icon size={Math.round(iconSize * 0.45)} color={cfg.accent} strokeWidth={2} />
        </div>
        <Trend value={change} size={tiny ? 10 : 11} />
      </div>
      <div style={{ minHeight: 0, overflow: 'hidden' }}>
        <div style={{ fontSize: valueFontSize, fontWeight: 800, fontFamily: FONT_DISPLAY, color: 'var(--text)', letterSpacing: '-0.03em', lineHeight: 1.05, marginBottom: tiny ? 2 : 4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {value}
        </div>
        <div style={{ fontSize: tiny ? 11 : 13, color: 'var(--muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {cfg.label}
        </div>
        {showSublabel && <div style={{ fontSize: 11, color: 'var(--muted2)', marginTop: 4 }}>{sublabel}</div>}
        {showChangeLabel && <div style={{ fontSize: 11, color: 'var(--muted2)', marginTop: 4 }}>{cfg.changeLabel}</div>}
      </div>
      {showSpark && <div style={{ height: 36, marginTop: 4 }}><MiniSparkline data={sparkData} color={cfg.accent} width={width - 4} height={36} /></div>}
    </div>
  )
}

// ── Earnings chart ───────────────────────────────────────────────────────────

function EarningsChartWidget({ data, variant }) {
  const { ref, width, height } = useWidgetSize()
  const series = data.earningsSeries || []
  const showHeader = height > 100
  if (series.length === 0) {
    return <div ref={ref} style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--muted)', fontSize: 13 }}>Sin ingresos en el periodo</div>
  }
  const max = Math.max(...series.map(s => s.value), 1)
  const isLine = variant === 'line'
  const isMini = variant === 'mini' || height < 90

  if (isLine) {
    const w = Math.max(200, width - 4); const h = Math.max(60, height - (showHeader ? 32 : 4)); const pad = h > 80 ? 20 : 12
    const points = series.map((d, i) => ({ x: pad + (i / Math.max(series.length - 1, 1)) * (w - pad * 2), y: h - pad - ((d.value / max) * (h - pad * 2)), ...d }))
    const pathD = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ')
    const areaD = `${pathD} L ${points[points.length - 1].x} ${h - pad} L ${points[0].x} ${h - pad} Z`
    return (
      <div ref={ref} style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', minHeight: 0 }}>
        {showHeader && <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)', marginBottom: 6, fontFamily: FONT_DISPLAY }}>Ingresos por mes</div>}
        <div style={{ ...fill }}>
          <svg viewBox={`0 0 ${w} ${h}`} style={{ width: '100%', height: '100%' }} preserveAspectRatio="none">
            <defs><linearGradient id="earnGrad" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={ACCENT} stopOpacity="0.3" /><stop offset="100%" stopColor={ACCENT} stopOpacity="0.02" /></linearGradient></defs>
            <path d={areaD} fill="url(#earnGrad)" />
            <path d={pathD} fill="none" stroke={ACCENT} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" />
            {h > 80 && points.map((p, i) => <text key={i} x={p.x} y={h - 4} textAnchor="middle" fill="var(--muted)" fontSize={9}>{p.label}</text>)}
          </svg>
        </div>
      </div>
    )
  }
  if (isMini) {
    return (
      <div ref={ref} style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', minHeight: 0 }}>
        {height > 60 && <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text)', marginBottom: 4, fontFamily: FONT_DISPLAY }}>Ingresos</div>}
        <div style={{ ...fill, alignItems: 'flex-end', flexDirection: 'row', gap: 4 }}>
          {series.map((d, i) => <div key={i} style={{ flex: 1, borderRadius: '4px 4px 0 0', background: i === series.length - 1 ? ACCENT : ga(0.3), height: `${(d.value / max) * 100}%`, minHeight: 3 }} />)}
        </div>
      </div>
    )
  }
  // bars
  return (
    <div ref={ref} style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', minHeight: 0 }}>
      {showHeader && <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)', marginBottom: 8, fontFamily: FONT_DISPLAY }}>Ingresos por mes</div>}
      <div style={{ ...fill, alignItems: 'flex-end', flexDirection: 'row', gap: 6, paddingBottom: height > 140 ? 18 : 4 }}>
        {series.map((d, i) => {
          const isLast = i === series.length - 1
          return (
            <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, height: '100%' }}>
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', width: '100%', minHeight: 0 }}>
                {isLast && height > 100 && <div style={{ fontSize: 10, color: ACCENT, fontWeight: 700, textAlign: 'center', marginBottom: 4 }}>€{d.value}</div>}
                <div style={{ width: '100%', borderRadius: '6px 6px 0 0', minHeight: 4, height: `${(d.value / max) * 100}%`, background: isLast ? `linear-gradient(180deg, ${ga(0.9)} 0%, ${ACCENT} 100%)` : ga(0.3), transition: 'height .4s' }} />
              </div>
              {height > 110 && <span style={{ fontSize: 10, color: isLast ? ACCENT : 'var(--muted)', fontWeight: isLast ? 600 : 400 }}>{d.label}</span>}
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ── Requests / Channels / Top advertisers tables ────────────────────────────

const STATUS_CFG = {
  pendiente:  { color: WARN, label: 'Pendiente'  },
  aceptada:   { color: OK,   label: 'Aceptada'   },
  rechazada:  { color: ERR,  label: 'Rechazada'  },
  PUBLISHED:  { color: OK,   label: 'Publicada'  },
  COMPLETED:  { color: '#94a3b8', label: 'Completada' },
  PAID:       { color: BLUE, label: 'Pagada'     },
  DRAFT:      { color: WARN, label: 'Borrador'   },
}

function RequestsTableWidget({ data, variant }) {
  const navigate = useNavigate()
  const { ref, height } = useWidgetSize()
  const requests = data.requests || []
  if (requests.length === 0) {
    return <div ref={ref} style={{ height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 10 }}>
      <Inbox size={26} color="var(--muted)" strokeWidth={1.5} />
      <div style={{ fontSize: 13, color: 'var(--muted)' }}>No hay solicitudes nuevas</div>
    </div>
  }
  const headerH = height > 110 ? 22 : 0
  const rowH = 38
  const visibleN = rowsThatFit(height - headerH, rowH)
  const items = requests.slice(0, visibleN)

  return (
    <div ref={ref} style={{ height: '100%', display: 'flex', flexDirection: 'column', minHeight: 0 }}>
      {headerH > 0 && <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)', marginBottom: 6, fontFamily: FONT_DISPLAY }}>Solicitudes recientes</div>}
      <div style={{ ...fill, justifyContent: 'flex-start' }}>
        {items.map((r, i) => {
          const st = STATUS_CFG[r.status] || { color: '#94a3b8', label: r.status }
          return (
            <div key={r._id || r.id} onClick={() => navigate('/creator/requests')}
              style={{ display: 'grid', gridTemplateColumns: '1fr 60px 80px', alignItems: 'center', padding: '8px 0', borderBottom: i < items.length - 1 ? '1px solid var(--border)' : 'none', cursor: 'pointer', gap: 8 }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {r.advertiserName || r.title || 'Anunciante'}
              </div>
              <div style={{ fontSize: 11.5, fontWeight: 600, color: 'var(--text)' }}>€{r.price || 0}</div>
              <span style={{ background: `${st.color}12`, color: st.color, border: `1px solid ${st.color}35`, borderRadius: 20, padding: '2px 6px', fontSize: 10, fontWeight: 600, textAlign: 'center' }}>{st.label}</span>
            </div>
          )
        })}
      </div>
      {requests.length > visibleN && (
        <button onClick={() => navigate('/creator/requests')}
          style={{ marginTop: 4, fontSize: 11, color: ACCENT, background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600, textAlign: 'left' }}>
          Ver {requests.length - visibleN} más →
        </button>
      )}
    </div>
  )
}

function ChannelsTableWidget({ data }) {
  const navigate = useNavigate()
  const { ref, width, height } = useWidgetSize()
  const channels = data.channels || []
  if (channels.length === 0) {
    return <div ref={ref} style={{ height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 10 }}>
      <Radio size={26} color="var(--muted)" strokeWidth={1.5} />
      <div style={{ fontSize: 13, color: 'var(--muted)' }}>Aún no tienes canales</div>
      <button onClick={() => navigate('/creator/channels/new')}
        style={{ background: ga(0.1), color: ACCENT, border: `1px solid ${ga(0.3)}`, borderRadius: 8, padding: '7px 14px', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
        Registrar canal
      </button>
    </div>
  }
  const headerH = height > 110 ? 22 : 0
  const rowH = 38
  const visibleN = rowsThatFit(height - headerH - 30, rowH)
  const items = channels.slice(0, visibleN)
  const showCAS = width > 360

  return (
    <div ref={ref} style={{ height: '100%', display: 'flex', flexDirection: 'column', minHeight: 0 }}>
      {headerH > 0 && <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)', marginBottom: 6, fontFamily: FONT_DISPLAY }}>Mis canales</div>}
      <div style={{ ...fill, justifyContent: 'flex-start' }}>
        <div style={{ display: 'grid', gridTemplateColumns: showCAS ? '1fr 80px 80px 60px' : '1fr 80px 60px', padding: '6px 0', borderBottom: '1px solid var(--border)', gap: 8 }}>
          {(showCAS ? ['Canal', 'Plataforma', 'Audiencia', 'CAS'] : ['Canal', 'Plataforma', 'Audiencia']).map(h => (
            <div key={h} style={{ fontSize: 9.5, fontWeight: 600, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{h}</div>
          ))}
        </div>
        {items.map((ch, i) => (
          <div key={ch._id || ch.id} onClick={() => navigate('/creator/channels')}
            style={{ display: 'grid', gridTemplateColumns: showCAS ? '1fr 80px 80px 60px' : '1fr 80px 60px', alignItems: 'center', padding: '8px 0', borderBottom: i < items.length - 1 ? '1px solid var(--border)' : 'none', cursor: 'pointer', gap: 8 }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {ch.nombreCanal || ch.nombre || 'Canal'}
            </div>
            <div style={{ fontSize: 11.5, color: 'var(--text)' }}>{ch.plataforma || '—'}</div>
            {showCAS && <div style={{ fontSize: 11.5, color: 'var(--text)' }}>{(ch.seguidores || ch.audiencia || 0).toLocaleString('es')}</div>}
            <div style={{ fontSize: 11.5, color: ACCENT, fontWeight: 700, textAlign: 'right' }}>{ch.CAS ? Math.round(ch.CAS) : '—'}</div>
          </div>
        ))}
      </div>
    </div>
  )
}

function TopAdvertisersWidget({ data }) {
  const { ref, width, height } = useWidgetSize()
  const campaigns = data.creatorCampaigns || []
  const map = {}
  campaigns.forEach(c => {
    const name = c.advertiserName || c.advertiser?.nombre || 'Anunciante'
    if (!map[name]) map[name] = { name, count: 0, revenue: 0 }
    map[name].count++
    map[name].revenue += (c.netAmount || c.price || 0)
  })
  const top = Object.values(map).sort((a, b) => b.revenue - a.revenue).slice(0, 5)
  if (top.length === 0) return <div ref={ref} style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--muted)', fontSize: 13 }}>Sin anunciantes aún</div>

  const headerH = height > 90 ? 22 : 0
  const rowH = 38
  const visibleN = rowsThatFit(height - headerH, rowH)
  const showSecondary = width > 200

  return (
    <div ref={ref} style={{ display: 'flex', flexDirection: 'column', gap: 4, height: '100%', minHeight: 0 }}>
      {headerH > 0 && <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)', marginBottom: 4, fontFamily: FONT_DISPLAY }}>Top anunciantes</div>}
      <div style={{ ...fill, justifyContent: 'flex-start' }}>
        {top.slice(0, visibleN).map((a, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '7px 0', borderBottom: i < Math.min(visibleN, top.length) - 1 ? '1px solid var(--border)' : 'none' }}>
            <div style={{ width: 24, height: 24, borderRadius: 7, background: ga(0.1), display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, color: ACCENT }}>{i + 1}</div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{a.name}</div>
              {showSecondary && <div style={{ fontSize: 10.5, color: 'var(--muted)' }}>{a.count} campaña{a.count !== 1 ? 's' : ''}</div>}
            </div>
            <div style={{ fontSize: 11.5, fontWeight: 600, color: ACCENT }}>€{Math.round(a.revenue)}</div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Quick Actions / Action items / Activity / Notes / Calendar ────────────────

function QuickActionsWidget({ variant }) {
  const navigate = useNavigate()
  const { ref, width, height } = useWidgetSize()
  const actions = [
    { icon: Plus, label: 'Registrar canal', path: '/creator/channels/new', color: ACCENT },
    { icon: Inbox, label: 'Ver solicitudes', path: '/creator/requests', color: WARN },
    { icon: Wallet, label: 'Solicitar retiro', path: '/creator/earnings', color: BLUE },
    { icon: BarChart3, label: 'Analytics', path: '/creator/analytics', color: '#f59e0b' },
    { icon: Target, label: 'Pricing', path: '/creator/pricing', color: '#ec4899' },
  ]
  if (variant === 'compact' || (width < 250 && height < 90)) {
    const btnSize = Math.min(42, height - 16)
    return (
      <div ref={ref} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, height: '100%', flexWrap: 'wrap' }}>
        {actions.map((a, i) => {
          const Icon = a.icon
          return (
            <button key={i} onClick={() => navigate(a.path)} title={a.label}
              style={{ width: btnSize, height: btnSize, borderRadius: 10, border: '1px solid var(--border)', background: 'var(--bg2)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Icon size={Math.round(btnSize * 0.4)} color={a.color} />
            </button>
          )
        })}
      </div>
    )
  }
  const headerH = height > 80 ? 24 : 0
  const bodyH = height - headerH
  const btnH = 32
  const rows = Math.max(1, Math.floor(bodyH / (btnH + 6)))
  const perRow = Math.max(1, Math.floor((width + 6) / 146))
  const maxVisible = Math.max(1, rows * perRow)
  const visible = actions.slice(0, maxVisible)
  const overflow = actions.length - visible.length

  return (
    <div ref={ref} style={{ display: 'flex', flexDirection: 'column', gap: 6, height: '100%', minHeight: 0 }}>
      {headerH > 0 && <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)', fontFamily: FONT_DISPLAY }}>Acciones rápidas</div>}
      <div style={{ ...fill, flexDirection: 'row', gap: 6, flexWrap: 'wrap', alignContent: 'flex-start', overflow: 'hidden' }}>
        {visible.map((a, i) => {
          const Icon = a.icon
          return (
            <button key={i} onClick={() => navigate(a.path)}
              style={{ display: 'flex', alignItems: 'center', gap: 7, background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 9, padding: '7px 12px', cursor: 'pointer', fontSize: 12, fontWeight: 500, color: 'var(--text)', whiteSpace: 'nowrap' }}>
              <Icon size={13} color={a.color} strokeWidth={2} /> {a.label}
            </button>
          )
        })}
        {overflow > 0 && <span style={{ alignSelf: 'center', fontSize: 11, color: 'var(--muted)' }}>+{overflow}</span>}
      </div>
    </div>
  )
}

function ActionItemsWidget({ data, variant }) {
  const { ref, height } = useWidgetSize()
  const items = data.actionItems || []
  if (items.length === 0) {
    return <div ref={ref} style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--muted)', fontSize: 13, gap: 8 }}>
      <CheckCircle2 size={16} /> Todo en orden
    </div>
  }
  const rowH = variant === 'compact' ? 26 : variant === 'list' ? 50 : 70
  const headerH = height > 110 ? 28 : 0
  const visibleN = rowsThatFit(height - headerH, rowH)

  return (
    <div ref={ref} style={{ display: 'flex', flexDirection: 'column', gap: 6, height: '100%', minHeight: 0 }}>
      {headerH > 0 && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)', fontFamily: FONT_DISPLAY }}>Requiere atención</span>
          <span style={{ fontSize: 10, fontWeight: 700, color: ACCENT, background: ga(0.12), border: `1px solid ${ga(0.25)}`, borderRadius: 20, padding: '1px 7px' }}>{items.length}</span>
        </div>
      )}
      <div style={{ ...fill, gap: 6, justifyContent: 'flex-start' }}>
        {items.slice(0, visibleN).map((item, i) => {
          const Icon = item.icon
          return (
            <button key={i} onClick={item.onClick}
              style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 10, padding: 10, display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', textAlign: 'left', fontFamily: FONT_BODY, width: '100%' }}>
              <div style={{ width: 34, height: 34, borderRadius: 9, background: `${item.color}15`, border: `1px solid ${item.color}30`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, position: 'relative' }}>
                <Icon size={15} color={item.color} strokeWidth={2} />
                {item.count > 0 && <span style={{ position: 'absolute', top: -4, right: -4, minWidth: 16, height: 16, background: item.color, color: '#fff', borderRadius: 8, fontSize: 9, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', border: '2px solid var(--bg2)' }}>{item.count}</span>}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text)', marginBottom: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.title}</div>
                <div style={{ fontSize: 10.5, color: 'var(--muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.description}</div>
              </div>
              <ArrowRight size={12} color="var(--muted)" />
            </button>
          )
        })}
      </div>
    </div>
  )
}

function ActivityFeedWidget({ data }) {
  const { ref, height } = useWidgetSize()
  const campaigns = data.creatorCampaigns || []
  const activities = campaigns.map(c => ({
    title: c.title || c.content?.slice(0, 30) || 'Campaña',
    msg: c.status === 'COMPLETED' ? 'Pago liberado' : c.status === 'PUBLISHED' ? 'Publicada en tu canal' : `Estado: ${c.status}`,
    time: c.updatedAt || c.createdAt,
    color: (STATUS_CFG[c.status] || {}).color || '#94a3b8',
  }))
  if (activities.length === 0) return <div ref={ref} style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--muted)', fontSize: 13 }}>Sin actividad reciente</div>
  const rowH = 44
  const headerH = height > 90 ? 22 : 0
  const visibleN = rowsThatFit(height - headerH, rowH)
  return (
    <div ref={ref} style={{ display: 'flex', flexDirection: 'column', gap: 4, height: '100%', minHeight: 0 }}>
      {headerH > 0 && <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)', marginBottom: 4, fontFamily: FONT_DISPLAY }}>Actividad reciente</div>}
      <div style={{ ...fill, justifyContent: 'flex-start' }}>
        {activities.slice(0, visibleN).map((a, i) => (
          <div key={i} style={{ display: 'flex', gap: 8, padding: '7px 0', borderBottom: i < Math.min(visibleN, activities.length) - 1 ? '1px solid var(--border)' : 'none' }}>
            <div style={{ width: 7, height: 7, borderRadius: 4, background: a.color, marginTop: 5, flexShrink: 0 }} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 11.5, fontWeight: 600, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{a.title}</div>
              <div style={{ fontSize: 10.5, color: 'var(--muted)' }}>{a.msg}</div>
            </div>
            {a.time && <span style={{ fontSize: 10, color: 'var(--muted2)' }}>{new Date(a.time).toLocaleDateString('es', { day: 'numeric', month: 'short' })}</span>}
          </div>
        ))}
      </div>
    </div>
  )
}

function NotesWidget({ widgetId }) {
  const { ref, height } = useWidgetSize()
  const storageKey = `channelad-creator-notes-${widgetId}`
  const [text, setText] = useState(() => { try { return localStorage.getItem(storageKey) || '' } catch { return '' } })
  const save = (val) => { setText(val); try { localStorage.setItem(storageKey, val) } catch {} }
  return (
    <div ref={ref} style={{ display: 'flex', flexDirection: 'column', height: '100%', gap: 6, minHeight: 0 }}>
      {height > 90 && <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)', fontFamily: FONT_DISPLAY }}>Notas</div>}
      <textarea value={text} onChange={e => save(e.target.value)} placeholder="Escribe tus notas aquí..."
        style={{ flex: 1, width: '100%', resize: 'none', border: '1px solid var(--border)', borderRadius: 10, padding: 10, fontSize: 13, background: 'var(--bg2)', color: 'var(--text)', outline: 'none', minHeight: 0 }} />
    </div>
  )
}

function CalendarWidget({ data, variant }) {
  const { ref, height } = useWidgetSize()
  const [monthOffset, setMonthOffset] = useState(0)
  const now = new Date()
  const viewDate = new Date(now.getFullYear(), now.getMonth() + monthOffset, 1)
  const year = viewDate.getFullYear(); const month = viewDate.getMonth()
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const firstDay = new Date(year, month, 1).getDay()
  const adjustedFirst = (firstDay + 6) % 7
  const monthNames = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre']
  const dayNames = ['L','M','X','J','V','S','D']
  const campaigns = data.creatorCampaigns || []
  const dates = {}
  campaigns.forEach(c => {
    const d = new Date(c.createdAt || c.startDate)
    if (!isNaN(d.getTime()) && d.getMonth() === month && d.getFullYear() === year) {
      const day = d.getDate(); if (!dates[day]) dates[day] = []; dates[day].push(c)
    }
  })

  return (
    <div ref={ref} style={{ display: 'flex', flexDirection: 'column', gap: 6, height: '100%', minHeight: 0 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <button onClick={() => setMonthOffset(o => o - 1)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted)', padding: 4 }}><ChevronLeft size={16} /></button>
        <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)', fontFamily: FONT_DISPLAY }}>{monthNames[month]} {year}</span>
        <button onClick={() => setMonthOffset(o => o + 1)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted)', padding: 4 }}><ChevronRight size={16} /></button>
      </div>
      <div style={{ ...fill, display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gridAutoRows: '1fr', gap: 2 }}>
        {dayNames.map(d => <div key={d} style={{ fontSize: 10, fontWeight: 600, color: 'var(--muted)', textAlign: 'center', padding: '4px 0' }}>{d}</div>)}
        {Array.from({ length: adjustedFirst }).map((_, i) => <div key={`e-${i}`} />)}
        {Array.from({ length: daysInMonth }, (_, i) => i + 1).map(day => {
          const isToday = day === now.getDate() && month === now.getMonth() && year === now.getFullYear()
          const has = !!dates[day]
          return (
            <div key={day} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', borderRadius: 6, background: isToday ? ga(0.15) : 'transparent' }}>
              <span style={{ fontSize: 11, fontWeight: isToday ? 700 : 400, color: isToday ? ACCENT : 'var(--text)' }}>{day}</span>
              {has && <div style={{ width: 4, height: 4, borderRadius: 2, background: ACCENT, marginTop: 1 }} />}
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ── Renderer ────────────────────────────────────────────────────────────────

export default function CreatorWidgetRenderer({ type, variant, data, widgetId }) {
  const props = { data, variant, type, widgetId }
  switch (type) {
    case WIDGET_TYPES.WELCOME:           return <WelcomeWidget {...props} />
    case WIDGET_TYPES.KPI_EARNINGS:
    case WIDGET_TYPES.KPI_PENDING_REQ:
    case WIDGET_TYPES.KPI_RATING:
    case WIDGET_TYPES.KPI_CHANNELS:
    case WIDGET_TYPES.KPI_COMPLETED:
    case WIDGET_TYPES.KPI_CAS_AVG:       return <KpiWidget {...props} />
    case WIDGET_TYPES.EARNINGS_CHART:    return <EarningsChartWidget {...props} />
    case WIDGET_TYPES.REQUESTS_TABLE:    return <RequestsTableWidget {...props} />
    case WIDGET_TYPES.CHANNELS_TABLE:    return <ChannelsTableWidget {...props} />
    case WIDGET_TYPES.TOP_ADVERTISERS:   return <TopAdvertisersWidget {...props} />
    case WIDGET_TYPES.ACTIVITY_FEED:     return <ActivityFeedWidget {...props} />
    case WIDGET_TYPES.QUICK_ACTIONS:     return <QuickActionsWidget {...props} />
    case WIDGET_TYPES.ACTION_ITEMS:      return <ActionItemsWidget {...props} />
    case WIDGET_TYPES.NOTES:             return <NotesWidget {...props} />
    case WIDGET_TYPES.CAMPAIGN_CALENDAR: return <CalendarWidget {...props} />
    default: return <div style={{ color: 'var(--muted)', fontSize: 13 }}>Widget desconocido: {type}</div>
  }
}
