import React, { useState, useEffect, useRef, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Wallet, Inbox, Star, Radio, TrendingUp, TrendingDown, Plus,
  ArrowRight, AlertTriangle, CheckCircle2, MessageSquare, Sparkles,
  Search, BarChart3, CalendarDays, Zap, Clock, Users, Target,
  StickyNote, ChevronRight, ChevronLeft, Activity, ShieldCheck,
  LineChart, Wifi, Circle,
} from 'lucide-react'
import { WIDGET_TYPES } from './CreatorWidgetRegistry'
import useWidgetSize, { rowsThatFit } from '../../advertiser/customizable/useWidgetSize'
import useSinceLastVisit from '../../../../hooks/useSinceLastVisit'
import SmartInsightsCreator from '../../../../components/SmartInsightsCreator'
import CreatorChannelDetailModal from '../../../../components/CreatorChannelDetailModal'
import CreatorRequestDetailModal from '../../../../components/CreatorRequestDetailModal'
import { CASBadge, ScoreGauge, CPMBadge, ConfianzaBadge } from '../../../../components/scoring'
import WidgetFrame, {
  IllustrationNoChannels, IllustrationNoCampaigns, IllustrationNoData,
  IllustrationAllClear, IllustrationInbox,
} from '../../../../components/WidgetFrame'
import { FONT_BODY, FONT_DISPLAY, OK, WARN, ERR, BLUE, GREEN, PLAT_COLORS } from '../../../../theme/tokens'

// Creator accent colour (green) — matches the role's brand in the app.
const ACCENT = 'var(--accent, #22c55e)'
const ga = (o) => `rgba(34,197,94,${o})`

// ── Format helpers — used across every new widget ───────────────────────────

const fmtEur = (n) => `€${Math.round(Number(n) || 0).toLocaleString('es')}`
const fmtNum = (n) => Math.round(Number(n) || 0).toLocaleString('es')
const fmtPct = (n, decimals = 0) => `${(Number(n) || 0).toFixed(decimals)}%`

function fmtRelTime(date) {
  if (!date) return ''
  const ms = Date.now() - new Date(date).getTime()
  if (ms < 0) return 'ahora'
  const sec = Math.floor(ms / 1000)
  if (sec < 5) return 'ahora'
  if (sec < 60) return `hace ${sec}s`
  const min = Math.floor(sec / 60)
  if (min < 60) return `hace ${min}m`
  const hr = Math.floor(min / 60)
  if (hr < 24) return `hace ${hr}h`
  const d = Math.floor(hr / 24)
  return `hace ${d}d`
}

// Animated count-up. Uses easeOutCubic so big numbers settle quickly.
// Skips animation if reduced motion is preferred (accessibility).
function useCountUp(target, duration = 700) {
  const [val, setVal] = useState(() => target)
  const prev = useRef(target)
  useEffect(() => {
    const reduced = typeof window !== 'undefined'
      && window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches
    if (reduced || target === prev.current) {
      prev.current = target
      setVal(target)
      return
    }
    let raf = 0, start = 0
    const from = prev.current
    const animate = (ts) => {
      if (!start) start = ts
      const t = Math.min((ts - start) / duration, 1)
      const eased = 1 - Math.pow(1 - t, 3)
      setVal(from + (target - from) * eased)
      if (t < 1) raf = requestAnimationFrame(animate)
      else prev.current = target
    }
    raf = requestAnimationFrame(animate)
    return () => cancelAnimationFrame(raf)
  }, [target, duration])
  return val
}

// Pause intervals when widget scrolls off-screen — saves CPU on busy dashboards.
function useIsVisible(ref) {
  const [visible, setVisible] = useState(true)
  useEffect(() => {
    if (!ref.current || typeof IntersectionObserver === 'undefined') return
    const obs = new IntersectionObserver(([entry]) => setVisible(entry.isIntersecting), { threshold: 0 })
    obs.observe(ref.current)
    return () => obs.disconnect()
  }, [ref])
  return visible
}

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
  const isLoading = data.loading && series.length === 0
  const isEmpty = !isLoading && series.length === 0

  return (
    <div ref={ref} style={{ height: '100%' }}>
      <WidgetFrame
        title={variant === 'mini' ? 'Ingresos' : 'Ingresos por mes'}
        icon={Wallet}
        accent={ACCENT}
        description="Ingresos liberados desde escrow agrupados por mes."
        loading={isLoading}
        empty={isEmpty ? {
          illustration: <IllustrationNoData accent={ACCENT} size={52} />,
          title: 'Sin ingresos todavía',
          description: 'Cuando se liberen tus primeros pagos verás aquí su evolución.',
        } : null}
        compact={variant === 'mini' || height < 140}
        hideHeader={variant === 'mini' && height < 80}
      >
        <EarningsBody series={series} variant={variant} width={width} height={height} />
      </WidgetFrame>
    </div>
  )
}

function EarningsBody({ series, variant, width, height }) {
  const max = Math.max(...series.map(s => s.value), 1)
  const isLine = variant === 'line'
  const isMini = variant === 'mini' || height < 90

  if (isLine) {
    const w = Math.max(200, width - 4); const h = Math.max(60, height - 60); const pad = h > 80 ? 20 : 12
    const points = series.map((d, i) => ({ x: pad + (i / Math.max(series.length - 1, 1)) * (w - pad * 2), y: h - pad - ((d.value / max) * (h - pad * 2)), ...d }))
    const pathD = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ')
    const areaD = `${pathD} L ${points[points.length - 1].x} ${h - pad} L ${points[0].x} ${h - pad} Z`
    return (
      <div style={{ ...fill }}>
        <svg viewBox={`0 0 ${w} ${h}`} style={{ width: '100%', height: '100%' }} preserveAspectRatio="none">
          <defs><linearGradient id="earnGrad" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={ACCENT} stopOpacity="0.3" /><stop offset="100%" stopColor={ACCENT} stopOpacity="0.02" /></linearGradient></defs>
          <path d={areaD} fill="url(#earnGrad)" />
          <path d={pathD} fill="none" stroke={ACCENT} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" />
          {h > 80 && points.map((p, i) => <text key={i} x={p.x} y={h - 4} textAnchor="middle" fill="var(--muted)" fontSize={9}>{p.label}</text>)}
        </svg>
      </div>
    )
  }
  if (isMini) {
    return (
      <div style={{ ...fill, alignItems: 'flex-end', flexDirection: 'row', gap: 4 }}>
        {series.map((d, i) => <div key={i} style={{ flex: 1, borderRadius: '4px 4px 0 0', background: i === series.length - 1 ? ACCENT : ga(0.3), height: `${(d.value / max) * 100}%`, minHeight: 3 }} />)}
      </div>
    )
  }
  return (
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

function RequestsTableWidget({ data, variant, widgetId }) {
  const navigate = useNavigate()
  const [drillDown, setDrillDown] = useState(null)
  const { ref, height } = useWidgetSize()
  const requests = data.requests || []
  const { newCount } = useSinceLastVisit(widgetId, requests, (r) => r.createdAt || r.updatedAt)
  const isLoading = data.loading && requests.length === 0
  const isEmpty = !isLoading && requests.length === 0
  const rowH = 38
  const visibleN = rowsThatFit(height - 50, rowH)
  const items = requests.slice(0, visibleN)

  return (
    <div ref={ref} style={{ height: '100%' }}>
      <WidgetFrame
        title="Solicitudes recientes"
        icon={Inbox}
        accent={WARN}
        description="Propuestas de anunciantes esperando tu respuesta. Click en una fila abre el detalle sin salir del dashboard. El badge cuenta las nuevas desde tu última visita."
        badge={{ count: newCount, label: newCount === 1 ? 'nueva' : 'nuevas' }}
        loading={isLoading}
        empty={isEmpty ? {
          illustration: <IllustrationInbox accent={WARN} size={52} />,
          title: 'Sin solicitudes nuevas',
          description: 'Cuando un anunciante quiera publicar en tus canales lo verás aquí.',
        } : null}
      >
        <div style={{ ...fill, justifyContent: 'flex-start' }}>
          {items.map((r, i) => {
            const st = STATUS_CFG[r.status] || { color: '#94a3b8', label: r.status }
            return (
              <div key={r._id || r.id} onClick={() => setDrillDown(r)}
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
      </WidgetFrame>
      {drillDown && (
        <CreatorRequestDetailModal request={drillDown} onClose={() => setDrillDown(null)} navigate={navigate} />
      )}
    </div>
  )
}

function ChannelsTableWidget({ data }) {
  const navigate = useNavigate()
  const [drillDown, setDrillDown] = useState(null)
  const { ref, width, height } = useWidgetSize()
  const channels = data.channels || []
  const isLoading = data.loading && channels.length === 0
  const isEmpty = !isLoading && channels.length === 0
  const rowH = 38
  const visibleN = rowsThatFit(height - 80, rowH)
  const items = channels.slice(0, visibleN)
  const showCAS = width > 360

  return (
    <div ref={ref} style={{ height: '100%' }}>
      <WidgetFrame
        title="Mis canales"
        icon={Radio}
        accent={ACCENT}
        description="Tus canales registrados con audiencia y Channel Authority Score (CAS). Click en una fila abre el detalle del canal."
        loading={isLoading}
        empty={isEmpty ? {
          illustration: <IllustrationNoChannels accent={ACCENT} size={52} />,
          title: 'Aún no tienes canales',
          description: 'Da de alta tu primer canal para empezar a recibir propuestas de anunciantes.',
          actionLabel: 'Registrar canal',
          onAction: () => navigate('/creator/channels/new'),
        } : null}
      >
        <div style={{ ...fill, justifyContent: 'flex-start' }}>
          <div style={{ display: 'grid', gridTemplateColumns: showCAS ? '1fr 80px 80px 60px' : '1fr 80px 60px', padding: '6px 0', borderBottom: '1px solid var(--border)', gap: 8 }}>
            {(showCAS ? ['Canal', 'Plataforma', 'Audiencia', 'CAS'] : ['Canal', 'Plataforma', 'Audiencia']).map(h => (
              <div key={h} style={{ fontSize: 9.5, fontWeight: 600, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{h}</div>
            ))}
          </div>
          {items.map((ch, i) => (
            <div key={ch._id || ch.id} onClick={() => setDrillDown(ch)}
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
      </WidgetFrame>
      {drillDown && (
        <CreatorChannelDetailModal channel={drillDown} onClose={() => setDrillDown(null)} navigate={navigate} />
      )}
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
  const isLoading = data.loading && top.length === 0
  const isEmpty = !isLoading && top.length === 0
  const rowH = 38
  const visibleN = rowsThatFit(height - 50, rowH)
  const showSecondary = width > 200

  return (
    <div ref={ref} style={{ height: '100%' }}>
      <WidgetFrame
        title="Top anunciantes"
        icon={Users}
        accent={ACCENT}
        description="Los anunciantes que más han pagado por publicar en tus canales."
        loading={isLoading}
        empty={isEmpty ? {
          illustration: <IllustrationNoData accent={ACCENT} size={52} />,
          title: 'Sin anunciantes todavía',
          description: 'Cuando recibas y aceptes tus primeras campañas verás aquí los anunciantes top.',
        } : null}
      >
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
      </WidgetFrame>
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
  const bodyH = height - 50
  const btnH = 32
  const rows = Math.max(1, Math.floor(bodyH / (btnH + 6)))
  const perRow = Math.max(1, Math.floor((width + 6) / 146))
  const maxVisible = Math.max(1, rows * perRow)
  const visible = actions.slice(0, maxVisible)
  const overflow = actions.length - visible.length

  return (
    <div ref={ref} style={{ height: '100%' }}>
      <WidgetFrame title="Acciones rápidas" icon={Zap} accent={ACCENT}
        description="Atajos a las funciones que más usas como creador.">
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
      </WidgetFrame>
    </div>
  )
}

function ActionItemsWidget({ data, variant }) {
  const { ref, height } = useWidgetSize()
  const items = data.actionItems || []
  const isLoading = data.loading && items.length === 0
  const isEmpty = !isLoading && items.length === 0
  const rowH = variant === 'compact' ? 26 : variant === 'list' ? 50 : 70
  const visibleN = rowsThatFit(height - 50, rowH)

  return (
    <div ref={ref} style={{ height: '100%' }}>
      <WidgetFrame
        title="Requiere atención"
        icon={AlertTriangle}
        accent={WARN}
        description="Items pendientes para ti: solicitudes nuevas, campañas para publicar, o tu primer canal."
        loading={isLoading}
        empty={isEmpty ? {
          illustration: <IllustrationAllClear accent={OK} size={52} />,
          title: '¡Todo en orden!',
          description: 'No tienes ningún item pendiente.',
        } : null}
      >
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
      </WidgetFrame>
    </div>
  )
}

function ActivityFeedWidget({ data, widgetId }) {
  const { ref, height } = useWidgetSize()
  const campaigns = data.creatorCampaigns || []
  const activities = campaigns.map(c => ({
    title: c.title || c.content?.slice(0, 30) || 'Campaña',
    msg: c.status === 'COMPLETED' ? 'Pago liberado' : c.status === 'PUBLISHED' ? 'Publicada en tu canal' : `Estado: ${c.status}`,
    time: c.updatedAt || c.createdAt,
    color: (STATUS_CFG[c.status] || {}).color || '#94a3b8',
  }))
  const { newCount } = useSinceLastVisit(widgetId, activities, (a) => a.time)
  const isLoading = data.loading && activities.length === 0
  const isEmpty = !isLoading && activities.length === 0
  const rowH = 44
  const visibleN = rowsThatFit(height - 50, rowH)

  return (
    <div ref={ref} style={{ height: '100%' }}>
      <WidgetFrame
        title="Actividad reciente"
        icon={Clock}
        accent={BLUE}
        description="Timeline de campañas activas en tus canales y pagos liberados. El badge muestra los eventos posteriores a tu última visita."
        badge={{ count: newCount }}
        loading={isLoading}
        empty={isEmpty ? {
          illustration: <IllustrationNoData accent={BLUE} size={52} />,
          title: 'Sin actividad reciente',
          description: 'Cuando empieces a publicar campañas verás aquí los eventos.',
        } : null}
      >
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
      </WidgetFrame>
    </div>
  )
}

function NotesWidget({ widgetId }) {
  const { ref } = useWidgetSize()
  const storageKey = `channelad-creator-notes-${widgetId}`
  const [text, setText] = useState(() => { try { return localStorage.getItem(storageKey) || '' } catch { return '' } })
  const save = (val) => { setText(val); try { localStorage.setItem(storageKey, val) } catch {} }
  return (
    <div ref={ref} style={{ height: '100%' }}>
      <WidgetFrame title="Notas" icon={StickyNote} accent={ACCENT}
        description="Bloc de notas personal — se guarda en este navegador.">
        <textarea value={text} onChange={e => save(e.target.value)} placeholder="Escribe tus notas aquí..."
          style={{ flex: 1, width: '100%', resize: 'none', border: '1px solid var(--border)', borderRadius: 10, padding: 10, fontSize: 13, background: 'var(--bg2)', color: 'var(--text)', outline: 'none', minHeight: 0 }} />
      </WidgetFrame>
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
    <div ref={ref} style={{ height: '100%' }}>
      <WidgetFrame
        title={`${monthNames[month]} ${year}`}
        icon={CalendarDays}
        accent={ACCENT}
        description="Calendario mensual de tus campañas programadas en los canales."
        menuActions={[
          { label: 'Mes anterior', icon: ChevronLeft, onClick: () => setMonthOffset(o => o - 1) },
          { label: 'Mes siguiente', icon: ChevronRight, onClick: () => setMonthOffset(o => o + 1) },
          { label: 'Hoy', icon: CalendarDays, onClick: () => setMonthOffset(0) },
        ]}
      >
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
      </WidgetFrame>
    </div>
  )
}

// ── CAS Hero ─────────────────────────────────────────────────────────────────
// Ported from the deleted classic overview — the panel showing the user's
// flagship channel with score gauge, 5-factor breakdown, CPM and trust badges.

const CAS_FACTORS = [
  { key: 'CAF', label: 'Audiencia'   },
  { key: 'CTF', label: 'Confianza'   },
  { key: 'CER', label: 'Engagement'  },
  { key: 'CVS', label: 'Estabilidad' },
  { key: 'CAP', label: 'Performance' },
]

function nivelOf(cas) {
  if (cas >= 80) return { label: 'Elite',  color: '#818CF8' }
  if (cas >= 61) return { label: 'Gold',   color: '#F59E0B' }
  if (cas >= 41) return { label: 'Silver', color: '#94A3B8' }
  return { label: 'Bronze', color: '#B87333' }
}

function CASHeroWidget({ data }) {
  const navigate = useNavigate()
  const { ref, width, height } = useWidgetSize()
  const channels = data.channels || []
  const main = channels.length
    ? channels.slice().sort((a, b) => (b.CAS || 0) - (a.CAS || 0))[0]
    : null
  const isLoading = data.loading && channels.length === 0
  const hasCAS = main && Number(main.CAS) > 0
  const isEmpty = !isLoading && !hasCAS

  // Adaptive layout breakpoints
  const tiny    = width < 360
  const compact = !tiny && width < 540
  const animatedCAS = Math.round(useCountUp(hasCAS ? Math.round(main.CAS) : 0))

  const nivel = hasCAS ? nivelOf(main.CAS) : null
  const fc = (v) => v >= 80 ? OK : v >= 50 ? '#f59e0b' : ERR

  // Average factor across the 5 — highlights what to improve next
  const factorVals = hasCAS ? CAS_FACTORS.map(f => Math.round(main[f.key] || 0)) : []
  const weakest = hasCAS && factorVals.length
    ? CAS_FACTORS[factorVals.indexOf(Math.min(...factorVals))]
    : null

  // Distance to next nivel — gives the user a clear improvement target
  const nextThreshold = hasCAS
    ? main.CAS >= 80 ? null : main.CAS >= 61 ? 80 : main.CAS >= 41 ? 61 : 41
    : null

  return (
    <div ref={ref} style={{ height: '100%' }}>
      <WidgetFrame
        title="Canal estrella"
        icon={Target}
        accent={ACCENT}
        description="Tu canal con mayor CAS Score. Muestra el gauge, 5 factores (Audiencia, Confianza, Engagement, Estabilidad, Performance), CPM dinámico y nivel de confianza. Click para ir a analytics."
        loading={isLoading}
        empty={isEmpty ? {
          illustration: <IllustrationNoChannels accent={ACCENT} size={52} />,
          title: channels.length === 0 ? 'Sin canales' : 'CAS aún no calculado',
          description: channels.length === 0
            ? 'Registra tu primer canal para obtener tu Channel Authority Score.'
            : 'Tus canales no tienen aún CAS. Conecta OAuth para calcularlo automáticamente.',
          actionLabel: channels.length === 0 ? 'Registrar canal' : 'Conectar OAuth',
          onAction: () => navigate(channels.length === 0 ? '/creator/channels/new' : '/creator/channels'),
        } : null}
        menuActions={hasCAS ? [
          { label: 'Ver analytics', icon: BarChart3, onClick: () => navigate('/creator/analytics') },
          { label: 'Mejorar CAS',   icon: TrendingUp, onClick: () => navigate('/creator/analytics?tab=cas') },
        ] : null}
      >
        {hasCAS && (
          <div
            role="button" tabIndex={0}
            onClick={() => navigate('/creator/analytics')}
            onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && navigate('/creator/analytics')}
            style={{
              ...fill, cursor: 'pointer',
              background: `linear-gradient(135deg, var(--surface) 0%, ${nivel.color}10 100%)`,
              border: `1px solid ${nivel.color}25`, borderRadius: 12,
              padding: tiny ? 10 : compact ? 12 : 16, gap: tiny ? 8 : compact ? 10 : 14,
              flexDirection: compact || tiny ? 'column' : 'row',
              alignItems: 'center',
              transition: 'border-color .2s, box-shadow .2s, transform .2s',
              outline: 'none',
            }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = `${nivel.color}55`; e.currentTarget.style.boxShadow = `0 6px 22px ${nivel.color}22`; e.currentTarget.style.transform = 'translateY(-1px)' }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = `${nivel.color}25`; e.currentTarget.style.boxShadow = 'none'; e.currentTarget.style.transform = 'none' }}
            onFocus={e => { e.currentTarget.style.borderColor = `${nivel.color}55`; e.currentTarget.style.boxShadow = `0 0 0 3px ${nivel.color}22` }}
            onBlur={e => { e.currentTarget.style.borderColor = `${nivel.color}25`; e.currentTarget.style.boxShadow = 'none' }}
          >
            {/* Left: gauge + nivel + name */}
            <div style={{ display: 'flex', alignItems: 'center', gap: tiny ? 10 : 12, flexShrink: 0, alignSelf: tiny ? 'stretch' : 'center' }}>
              <div style={{ position: 'relative', flexShrink: 0 }}>
                <ScoreGauge CAS={animatedCAS} nivel={main.nivel || nivel.label} showLabel height={6} />
              </div>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: tiny ? 13 : 14, fontWeight: 700, color: 'var(--text)', marginBottom: 4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: tiny ? '100%' : 180 }}>
                  {main.nombreCanal || main.nombre || 'Canal'}
                </div>
                <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                  <span style={{ background: `${nivel.color}18`, color: nivel.color, border: `1px solid ${nivel.color}35`, borderRadius: 6, padding: '1px 7px', fontSize: 10.5, fontWeight: 700, letterSpacing: '0.04em', textTransform: 'uppercase' }}>
                    {nivel.label}
                  </span>
                  {main.plataforma && (() => {
                    const p = main.plataforma.charAt(0).toUpperCase() + main.plataforma.slice(1)
                    const c = PLAT_COLORS[p] || ACCENT
                    return (
                      <span style={{ background: `${c}18`, color: c, border: `1px solid ${c}35`, borderRadius: 6, padding: '1px 7px', fontSize: 10.5, fontWeight: 600 }}>{p}</span>
                    )
                  })()}
                </div>
                {nextThreshold !== null && height > 130 && (
                  <div style={{ fontSize: 10.5, color: 'var(--muted)', marginTop: 5 }}>
                    {Math.round(nextThreshold - main.CAS)} pts a {nivelOf(nextThreshold).label}
                  </div>
                )}
              </div>
            </div>

            {/* Center: 5-factor mini bars */}
            <div style={{ flex: 1, display: 'flex', gap: tiny ? 5 : 8, justifyContent: 'center', flexWrap: 'wrap', minWidth: 0, alignSelf: tiny ? 'stretch' : 'center' }}>
              {CAS_FACTORS.map((f, i) => {
                const v = factorVals[i]
                const c = fc(v)
                const isWeak = weakest && weakest.key === f.key && v < 60
                return (
                  <div key={f.key} title={`${f.label} — ${v}/100`}
                    style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3, minWidth: tiny ? 30 : 36 }}>
                    <div style={{ width: tiny ? 30 : 36, height: 6, borderRadius: 3, background: 'var(--border)', overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: `${Math.min(v, 100)}%`, background: c, transition: 'width .6s cubic-bezier(.22,1,.36,1)' }} />
                    </div>
                    <span style={{ fontSize: 9, fontWeight: 700, color: c, fontFamily: 'JetBrains Mono, monospace', display: 'flex', alignItems: 'center', gap: 2 }}>
                      {f.key} {v}
                      {isWeak && <AlertTriangle size={8} color={c} />}
                    </span>
                  </div>
                )
              })}
            </div>

            {/* Right: badges */}
            {(Number(main.CPMDinamico) > 0 || main.verificacion?.confianzaScore != null) && (
              <div style={{
                display: 'flex',
                flexDirection: compact || tiny ? 'row' : 'column',
                alignItems: compact || tiny ? 'center' : 'flex-end',
                gap: 8, flexShrink: 0,
                flexWrap: 'wrap', justifyContent: 'center',
              }}>
                {Number(main.CPMDinamico) > 0 && <CPMBadge CPM={main.CPMDinamico} plataforma={main.plataforma} size={tiny ? 'sm' : 'lg'} />}
                {main.verificacion?.confianzaScore != null && (
                  <ConfianzaBadge score={main.verificacion.confianzaScore} fuente={main.verificacion.tipoAcceso} showScore />
                )}
              </div>
            )}

            {!compact && !tiny && <ChevronRight size={16} color="var(--muted)" style={{ flexShrink: 0 }} />}
          </div>
        )}
      </WidgetFrame>
    </div>
  )
}

// ── Balance Card ────────────────────────────────────────────────────────────
// The "withdraw" CTA card with green gradient, ported from classic overview.

function BalanceCardWidget({ data }) {
  const navigate = useNavigate()
  const { ref, width, height } = useWidgetSize()
  const completedCampaigns = (data.creatorCampaigns || []).filter(c => c.status === 'COMPLETED')
  const totalEarnings = completedCampaigns.reduce((s, c) => s + (c.netAmount || 0), 0)
  const pendingPayout = completedCampaigns
    .filter(c => !c.payoutAt)
    .reduce((s, c) => s + (c.netAmount || 0), 0)
  const monthly = data.monthlyEarnings || 0

  // Adaptive sizing — works from 200px-wide compact to 600px+ full
  const tiny    = width < 220 || height < 130
  const compact = !tiny && (width < 320 || height < 170)
  const showSpark = !tiny && (data.earningsSpark?.length || 0) >= 2

  // Smooth count-up — feels alive on mount and when data refreshes
  const animBalance = Math.round(useCountUp(totalEarnings))
  const animMonthly = Math.round(useCountUp(monthly))

  // No earnings yet → switch the CTA to onboarding flow
  const noEarnings = totalEarnings === 0 && !data.loading
  const ctaLabel = noEarnings ? 'Aceptar primera campaña' : 'Solicitar retiro'
  const ctaPath  = noEarnings ? '/creator/requests'        : '/creator/earnings'
  const ctaIcon  = noEarnings ? Inbox                       : Zap

  return (
    <div ref={ref} style={{ height: '100%' }}>
      <div style={{
        height: '100%',
        background: `linear-gradient(135deg, ${ACCENT} 0%, #1aa34a 100%)`,
        borderRadius: 14, padding: tiny ? 12 : compact ? 16 : 22,
        color: '#fff', position: 'relative', overflow: 'hidden',
        display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
        boxShadow: `0 4px 20px ${ga(0.25)}`,
      }}>
        {/* Subtle decorative blobs — pure CSS, no animation cost */}
        <div aria-hidden="true" style={{ position: 'absolute', top: -20, right: -20, width: 80, height: 80, borderRadius: '50%', background: 'rgba(255,255,255,0.08)' }} />
        <div aria-hidden="true" style={{ position: 'absolute', bottom: -30, left: -30, width: 100, height: 100, borderRadius: '50%', background: 'rgba(255,255,255,0.05)' }} />

        {/* Header */}
        <div style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginBottom: tiny ? 4 : 8 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
            <Wallet size={tiny ? 13 : 15} style={{ opacity: 0.9 }} />
            <span style={{ fontSize: tiny ? 11 : 12, opacity: 0.9, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              {noEarnings ? 'Sin ganancias aún' : 'Saldo total'}
            </span>
          </div>
          {monthly > 0 && !tiny && (
            <span title={`Este mes has ganado ${fmtEur(monthly)}`} style={{
              background: 'rgba(255,255,255,0.18)', border: '1px solid rgba(255,255,255,0.3)',
              borderRadius: 20, padding: '2px 8px', fontSize: 10.5, fontWeight: 700, whiteSpace: 'nowrap',
            }}>
              +{fmtEur(animMonthly)} este mes
            </span>
          )}
        </div>

        {/* Big number */}
        <div style={{ position: 'relative' }}>
          <div style={{
            fontFamily: FONT_DISPLAY,
            fontSize: tiny ? 22 : compact ? 28 : 36,
            fontWeight: 900, letterSpacing: '-0.03em',
            marginBottom: 2, lineHeight: 1.05,
            fontVariantNumeric: 'tabular-nums',
          }}>
            {fmtEur(animBalance)}
          </div>
          <div style={{ fontSize: tiny ? 10.5 : 11.5, opacity: 0.78, marginBottom: tiny ? 8 : 14 }}>
            {noEarnings
              ? 'Tu saldo aparecerá aquí cuando completes tu primera campaña.'
              : pendingPayout > 0
                ? `${fmtEur(pendingPayout)} pendientes de retiro`
                : 'Todo retirado · sin pendientes'}
          </div>

          {/* Sparkline — last 6 months trend, pure SVG */}
          {showSpark && (
            <div style={{ marginBottom: 12, opacity: 0.85 }}>
              <SparkOnDark data={data.earningsSpark} width={Math.min(width - (compact ? 36 : 48), 320)} height={tiny ? 22 : 28} />
            </div>
          )}

          {/* CTA */}
          <button onClick={() => navigate(ctaPath)} style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
            background: 'rgba(255,255,255,0.2)', border: '1px solid rgba(255,255,255,0.35)',
            borderRadius: 9, padding: tiny ? '6px 10px' : compact ? '8px 14px' : '10px 18px',
            fontSize: tiny ? 12 : 13, fontWeight: 700, color: '#fff', cursor: 'pointer',
            fontFamily: FONT_BODY, width: tiny || compact ? '100%' : 'auto',
            transition: 'background .15s, transform .15s',
          }}
            onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.3)'; e.currentTarget.style.transform = 'translateY(-1px)' }}
            onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.2)'; e.currentTarget.style.transform = 'none' }}
          >
            {React.createElement(ctaIcon, { size: tiny ? 12 : 13, ...(ctaIcon === Zap ? { fill: '#fff' } : {}) })}
            {ctaLabel}
          </button>
        </div>
      </div>
    </div>
  )
}

// White-on-green sparkline — used inside the BalanceCard
function SparkOnDark({ data, width = 200, height = 28 }) {
  if (!data || data.length < 2) return null
  const max = Math.max(...data); const min = Math.min(...data); const range = max - min || 1
  const points = data.map((v, i) => {
    const x = (i / (data.length - 1)) * width
    const y = height - ((v - min) / range) * (height - 4) - 2
    return [x, y]
  })
  const path = points.map(([x, y], i) => `${i === 0 ? 'M' : 'L'} ${x} ${y}`).join(' ')
  const area = `${path} L ${points[points.length - 1][0]} ${height} L ${points[0][0]} ${height} Z`
  return (
    <svg width={width} height={height} style={{ display: 'block' }} aria-hidden="true">
      <path d={area} fill="rgba(255,255,255,0.15)" />
      <path d={path} fill="none" stroke="#fff" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

// ── Smart Insights ──────────────────────────────────────────────────────────

function SmartInsightsWidget({ data }) {
  return (
    <div style={{ height: '100%', overflow: 'hidden' }}>
      <SmartInsightsCreator
        channels={data.channels || []}
        requests={data.requests || []}
        campaigns={data.creatorCampaigns || []}
        startCollapsed={false}
        maxItems={5}
      />
    </div>
  )
}

// ── Revenue Forecast ────────────────────────────────────────────────────────
// Predicción 90d con descomposición: base recurrente + tendencia + pipeline.
//
// Algoritmo:
//   - base = media móvil últimos 3 meses
//   - tendencia = pendiente lineal de los últimos 6 meses
//   - pipeline = solicitudes pendientes × 40% close rate + campañas pagadas × 90%
//   - confianza = f(meses de histórico, varianza, sample size)
//
// Cuando la varianza es alta o el histórico corto, la confianza baja.

function computeForecast(series, requests, campaigns) {
  if (!series || series.length < 2) return null

  const values = series.map(s => s.value)
  const n = values.length
  const mean = values.reduce((a, b) => a + b, 0) / n
  const variance = values.reduce((a, b) => a + (b - mean) ** 2, 0) / n
  const cv = mean > 0 ? Math.sqrt(variance) / mean : 1 // coefficient of variation

  // Last 3 months as the base
  const recent = values.slice(-3)
  const base = recent.reduce((a, b) => a + b, 0) / Math.max(recent.length, 1)

  // Linear trend: slope of (i, value) — negative if declining
  const slope = (() => {
    const xMean = (n - 1) / 2
    const yMean = mean
    let num = 0, den = 0
    for (let i = 0; i < n; i++) {
      num += (i - xMean) * (values[i] - yMean)
      den += (i - xMean) ** 2
    }
    return den > 0 ? num / den : 0
  })()

  // Pipeline (next 30d only — long-tail pipeline doesn't predict 90d)
  const pendingValue = (requests || [])
    .filter(r => r.status === 'pendiente')
    .reduce((s, r) => s + (r.price || r.budget || 0), 0)
  const paidValue = (campaigns || [])
    .filter(c => c.status === 'PAID')
    .reduce((s, c) => s + (c.netAmount || c.price || 0), 0)
  const pipeline30 = pendingValue * 0.40 + paidValue * 0.90

  // Project each month forward, applying trend
  const proj = (months) => Math.max(0, Math.round(base * months + slope * (months * (months + 1) / 2)))

  const next30 = Math.round(proj(1) + pipeline30)
  const next60 = Math.round(proj(2) + pipeline30)  // pipeline doesn't double — same conversions
  const next90 = Math.round(proj(3) + pipeline30)

  // Confidence in [40, 95] — based on (1) sample size, (2) variance
  const sampleConf = Math.min(1, n / 6) // 6 months → full
  const varianceConf = Math.max(0, 1 - cv * 0.6) // high variance hurts
  const conf = Math.round(40 + 55 * (sampleConf * 0.5 + varianceConf * 0.5))

  return {
    next30, next60, next90, base, slope, pipeline30, conf,
    monthlyTrend: mean > 0 ? slope / mean : 0,
    series: values,
  }
}

function RevenueForecastWidget({ data }) {
  const navigate = useNavigate()
  const { ref, width, height } = useWidgetSize()
  const series = data.earningsSeries || []
  const isLoading = data.loading && series.length === 0
  const isEmpty = !isLoading && series.length < 2

  const forecast = useMemo(
    () => computeForecast(series, data.requests, data.creatorCampaigns),
    [series, data.requests, data.creatorCampaigns],
  )

  // Animated next-30 number (the most-viewed projection)
  const animNext30 = Math.round(useCountUp(forecast?.next30 || 0))

  const tiny = width < 320 || height < 180
  const showChart = !tiny && height > 240 && width > 360

  return (
    <div ref={ref} style={{ height: '100%' }}>
      <WidgetFrame
        title="Forecast 90 días"
        icon={LineChart}
        accent={BLUE}
        description="Predicción de ingresos basada en histórico, tendencia lineal y pipeline activo (40% close rate en pendientes, 90% en pagadas). La confianza sube con más histórico y baja con varianza alta."
        loading={isLoading}
        empty={isEmpty ? {
          illustration: <IllustrationNoData accent={BLUE} size={52} />,
          title: 'Necesitamos más histórico',
          description: 'Cuando completes al menos 2 meses de campañas podremos predecir ingresos futuros.',
        } : null}
        menuActions={forecast ? [
          { label: 'Ver tendencia',  icon: BarChart3,   onClick: () => navigate('/creator/analytics?tab=forecast') },
          { label: 'Pricing optimizer', icon: Target,   onClick: () => navigate('/creator/pricing') },
        ] : null}
      >
        {forecast && (
          <div style={{ ...fill, justifyContent: 'space-between', gap: tiny ? 8 : 10 }}>

            {/* Three projection tiles */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: tiny ? 6 : 8 }}>
              {[
                { label: '30d', value: forecast.next30, accent: ACCENT, animated: animNext30 },
                { label: '60d', value: forecast.next60, accent: BLUE   },
                { label: '90d', value: forecast.next90, accent: '#8B5CF6' },
              ].map(h => (
                <div key={h.label} style={{
                  background: `${h.accent}10`, border: `1px solid ${h.accent}28`,
                  borderRadius: 9, padding: tiny ? '8px 6px' : '10px 8px', textAlign: 'center',
                }}>
                  <div style={{ fontSize: 10, color: 'var(--muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 3 }}>
                    Próximos {h.label}
                  </div>
                  <div style={{
                    fontFamily: FONT_DISPLAY,
                    fontSize: tiny ? 14 : (height < 220 ? 16 : 19),
                    fontWeight: 800, color: h.accent, letterSpacing: '-0.02em',
                    fontVariantNumeric: 'tabular-nums',
                  }}>
                    {fmtEur(h.animated ?? h.value)}
                  </div>
                </div>
              ))}
            </div>

            {/* Optional line chart — past + projected */}
            {showChart && <ForecastLineChart series={forecast.series} forecast={[forecast.next30, forecast.next60, forecast.next90]} width={width - 8} height={Math.min(80, height - 200)} />}

            {/* Breakdown: base / pipeline */}
            {height > 200 && (
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', fontSize: 10.5 }}>
                <Pill label="Base" value={fmtEur(forecast.base)} color="var(--muted)" />
                {forecast.pipeline30 > 0 && (
                  <Pill label="Pipeline 30d" value={fmtEur(forecast.pipeline30)} color={ACCENT} />
                )}
              </div>
            )}

            {/* Confidence + trend */}
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              background: 'var(--bg2)', borderRadius: 9, padding: '7px 11px', gap: 10, flexWrap: 'wrap',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 7, minWidth: 0 }}>
                <Sparkles size={12} color={BLUE} />
                <span style={{ fontSize: 11.5, color: 'var(--muted)' }}>Confianza</span>
                <span style={{
                  fontSize: 12, fontWeight: 800,
                  color: forecast.conf >= 75 ? OK : forecast.conf >= 55 ? '#f59e0b' : 'var(--muted)',
                  fontVariantNumeric: 'tabular-nums',
                }}>
                  {fmtPct(forecast.conf)}
                </span>
              </div>
              <span style={{
                fontSize: 10.5, fontWeight: 700,
                background: forecast.monthlyTrend >= 0 ? `${OK}15` : `${ERR}15`,
                color: forecast.monthlyTrend >= 0 ? OK : ERR,
                border: `1px solid ${forecast.monthlyTrend >= 0 ? OK : ERR}30`,
                borderRadius: 20, padding: '2px 8px',
                display: 'inline-flex', alignItems: 'center', gap: 3,
                whiteSpace: 'nowrap',
              }}>
                {forecast.monthlyTrend >= 0 ? <TrendingUp size={10} /> : <TrendingDown size={10} />}
                {forecast.monthlyTrend >= 0 ? '+' : ''}{(forecast.monthlyTrend * 100).toFixed(0)}%/mes
              </span>
            </div>
          </div>
        )}
      </WidgetFrame>
    </div>
  )
}

function Pill({ label, value, color }) {
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 4,
      background: 'var(--bg2)', border: '1px solid var(--border)',
      borderRadius: 6, padding: '3px 7px', fontSize: 10.5, color: 'var(--muted)',
    }}>
      {label}: <strong style={{ color, fontWeight: 700 }}>{value}</strong>
    </span>
  )
}

// Mini line chart — past data solid, projected dashed
function ForecastLineChart({ series, forecast, width, height }) {
  const all = [...series, ...forecast]
  const max = Math.max(...all, 1)
  const min = 0
  const w = Math.max(160, width)
  const h = Math.max(40, height)
  const splitX = ((series.length - 1) / (all.length - 1)) * w

  const toPoint = (v, i) => {
    const x = (i / (all.length - 1)) * w
    const y = h - ((v - min) / (max - min || 1)) * (h - 6) - 3
    return [x, y]
  }
  const pts = all.map(toPoint)
  const pathPast = series.map((v, i) => `${i === 0 ? 'M' : 'L'} ${pts[i][0]} ${pts[i][1]}`).join(' ')
  const pathProj = forecast
    .map((v, i) => {
      const idx = series.length + i
      return `${i === 0 ? `M ${pts[series.length - 1][0]} ${pts[series.length - 1][1]} L` : 'L'} ${pts[idx][0]} ${pts[idx][1]}`
    }).join(' ')

  return (
    <svg width="100%" height={h} viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" aria-hidden="true">
      <line x1={splitX} y1={0} x2={splitX} y2={h} stroke="var(--border)" strokeDasharray="2 3" />
      <path d={pathPast} fill="none" stroke={BLUE} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
      <path d={pathProj} fill="none" stroke="#8B5CF6" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" strokeDasharray="4 3" opacity="0.85" />
      {pts.map((p, i) => (
        <circle key={i} cx={p[0]} cy={p[1]} r={2.5} fill={i < series.length ? BLUE : '#8B5CF6'} />
      ))}
    </svg>
  )
}

// ── Channel Health Monitor ─────────────────────────────────────────────────
// Score combinado por canal + agregado global + filtro "necesita atención".

function healthScore(ch) {
  const cas = Number(ch.CAS) || 0
  const conf = Number(ch.verificacion?.confianzaScore) || 0
  const active = (ch.estado === 'activo' || ch.estado === 'verificado') ? 100 : 40
  const eng = Math.min(100, (Number(ch.estadisticas?.engagement) || 0) * 100 * 10) // 0-100 scaled
  return Math.round((cas * 0.45) + (conf * 0.25) + (active * 0.15) + (eng * 0.15))
}

function alertsFor(ch) {
  const out = []
  if (!Number(ch.CAS))                                   out.push({ severity: 'med',  msg: 'CAS no calculado' })
  else if (Number(ch.CAS) < 40)                          out.push({ severity: 'high', msg: `CAS bajo (${Math.round(ch.CAS)})` })
  if (!ch.verificacion?.confianzaScore)                  out.push({ severity: 'med',  msg: 'Sin verificar OAuth' })
  else if (ch.verificacion.confianzaScore < 50)          out.push({ severity: 'med',  msg: 'Verificación parcial' })
  if (ch.estado !== 'activo' && ch.estado !== 'verificado') out.push({ severity: 'high', msg: 'Canal inactivo' })
  if (Number(ch.estadisticas?.engagement) > 0
      && Number(ch.estadisticas.engagement) < 0.01)      out.push({ severity: 'low',  msg: 'Engagement < 1%' })
  return out
}

function ChannelHealthWidget({ data }) {
  const navigate = useNavigate()
  const { ref, width, height } = useWidgetSize()
  const channels = data.channels || []
  const isLoading = data.loading && channels.length === 0
  const isEmpty = !isLoading && channels.length === 0
  const [filter, setFilter] = useState('all') // 'all' | 'attention'

  const items = useMemo(() => channels
    .map(ch => {
      const score = healthScore(ch)
      const alerts = alertsFor(ch)
      return { ch, score, alerts, hasIssues: alerts.length > 0 }
    })
    .sort((a, b) => a.score - b.score),
  [channels])

  const filtered = filter === 'attention' ? items.filter(x => x.hasIssues) : items
  const aggregateScore = items.length > 0
    ? Math.round(items.reduce((s, x) => s + x.score, 0) / items.length)
    : 0
  const animAggregate = Math.round(useCountUp(aggregateScore))
  const aggColor = aggregateScore >= 70 ? OK : aggregateScore >= 40 ? '#f59e0b' : ERR
  const issuesCount = items.filter(x => x.hasIssues).length

  const tiny = width < 280 || height < 180
  const rowH = 50
  const headerH = tiny ? 0 : 56
  const visibleN = rowsThatFit(height - 60 - headerH, rowH)

  return (
    <div ref={ref} style={{ height: '100%' }}>
      <WidgetFrame
        title="Salud de canales"
        icon={ShieldCheck}
        accent="#8B5CF6"
        description="Health score = 45% CAS + 25% Confianza + 15% Engagement + 15% Estado. Ordenado de peor a mejor para que actúes sobre los que necesitan atención."
        loading={isLoading}
        empty={isEmpty ? {
          illustration: <IllustrationNoChannels accent="#8B5CF6" size={52} />,
          title: 'Sin canales',
          description: 'Registra tu primer canal para ver su salud.',
          actionLabel: 'Registrar',
          onAction: () => navigate('/creator/channels/new'),
        } : null}
      >
        <div style={{ ...fill, justifyContent: 'flex-start', gap: 8 }}>

          {/* Aggregate score header */}
          {!tiny && (
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10,
              padding: '8px 10px',
              background: `${aggColor}10`, border: `1px solid ${aggColor}28`, borderRadius: 9,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 9, minWidth: 0 }}>
                <div style={{
                  width: 36, height: 36, borderRadius: 10, flexShrink: 0,
                  background: `${aggColor}18`, border: `1px solid ${aggColor}38`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontFamily: FONT_DISPLAY, fontWeight: 800, fontSize: 14, color: aggColor,
                  fontVariantNumeric: 'tabular-nums',
                }}>
                  {animAggregate}
                </div>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: 11.5, fontWeight: 700, color: 'var(--text)' }}>
                    Score global
                  </div>
                  <div style={{ fontSize: 10.5, color: 'var(--muted)' }}>
                    {issuesCount === 0
                      ? `Los ${items.length} ${items.length === 1 ? 'canal está' : 'canales están'} sanos`
                      : `${issuesCount} ${issuesCount === 1 ? 'canal necesita' : 'canales necesitan'} atención`}
                  </div>
                </div>
              </div>
              {/* Filter toggle */}
              <div style={{ display: 'flex', gap: 2, background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 7, padding: 2 }}>
                {[
                  { id: 'all',       label: 'Todos' },
                  { id: 'attention', label: '⚠ Atención', disabled: issuesCount === 0 },
                ].map(opt => (
                  <button key={opt.id} onClick={() => !opt.disabled && setFilter(opt.id)}
                    disabled={opt.disabled}
                    style={{
                      background: filter === opt.id ? 'var(--bg2)' : 'transparent',
                      color: opt.disabled ? 'var(--muted2)' : filter === opt.id ? 'var(--text)' : 'var(--muted)',
                      border: 'none', borderRadius: 5, padding: '3px 8px',
                      fontSize: 10.5, fontWeight: filter === opt.id ? 700 : 500,
                      cursor: opt.disabled ? 'not-allowed' : 'pointer',
                      fontFamily: FONT_BODY, transition: 'all .15s',
                    }}>
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {filtered.length === 0 ? (
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 8, color: 'var(--muted)', fontSize: 12 }}>
              <CheckCircle2 size={20} color={OK} />
              <span>¡Todo en orden!</span>
            </div>
          ) : (
            <div style={{ flex: 1, minHeight: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column', gap: 6 }}>
              {filtered.slice(0, visibleN).map(({ ch, score, alerts }) => {
                const c = score >= 70 ? OK : score >= 40 ? '#f59e0b' : ERR
                const topAlert = alerts.find(a => a.severity === 'high') || alerts[0]
                return (
                  <button key={ch._id || ch.id} onClick={() => navigate('/creator/channels')}
                    style={{
                      background: 'var(--bg2)', border: `1px solid ${c}25`, borderRadius: 9,
                      padding: '7px 10px', display: 'flex', alignItems: 'center', gap: 10,
                      cursor: 'pointer', fontFamily: FONT_BODY, textAlign: 'left',
                      transition: 'border-color .15s, background .15s, transform .15s',
                    }}
                    onMouseEnter={e => { e.currentTarget.style.borderColor = `${c}55`; e.currentTarget.style.background = 'var(--surface)' }}
                    onMouseLeave={e => { e.currentTarget.style.borderColor = `${c}25`; e.currentTarget.style.background = 'var(--bg2)' }}
                  >
                    <div style={{
                      width: 34, height: 34, borderRadius: 9, flexShrink: 0,
                      background: `${c}18`, border: `1px solid ${c}35`,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontFamily: FONT_DISPLAY, fontWeight: 800, fontSize: 12.5, color: c,
                      fontVariantNumeric: 'tabular-nums',
                    }}>
                      {score}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {ch.nombreCanal || ch.nombre || 'Canal'}
                      </div>
                      <div style={{ fontSize: 10.5, color: alerts.length > 0 ? c : 'var(--muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: 4 }}>
                        {alerts.length > 0 ? <AlertTriangle size={9} /> : <CheckCircle2 size={9} />}
                        {topAlert ? topAlert.msg : 'Todo en orden'}
                      </div>
                    </div>
                    {alerts.length > 0 && (
                      <span style={{
                        background: `${c}15`, color: c, borderRadius: 20,
                        padding: '2px 7px', fontSize: 10, fontWeight: 800, flexShrink: 0,
                        fontVariantNumeric: 'tabular-nums',
                      }}>
                        {alerts.length}
                      </span>
                    )}
                  </button>
                )
              })}
              {filtered.length > visibleN && (
                <button onClick={() => navigate('/creator/channels')} style={{
                  background: 'transparent', border: 'none', color: '#8B5CF6',
                  fontSize: 11, fontWeight: 600, cursor: 'pointer', fontFamily: FONT_BODY,
                  textAlign: 'left', padding: 0, marginTop: 2,
                }}>
                  Ver {filtered.length - visibleN} más →
                </button>
              )}
            </div>
          )}
        </div>
      </WidgetFrame>
    </div>
  )
}

// ── Realtime Monitor ───────────────────────────────────────────────────────
// Live status of campaigns + activity feed. Pauses its clock when scrolled
// off-screen to save CPU. Shows real timestamps from campaign data, not
// simulated ones.

function RealtimeMonitorWidget({ data }) {
  const navigate = useNavigate()
  const containerRef = useRef(null)
  const { ref: sizeRef, width, height } = useWidgetSize()
  const visible = useIsVisible(containerRef)

  // Clock — refreshes every second only while visible
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    if (!visible) return
    const id = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(id)
  }, [visible])

  const campaigns = data.creatorCampaigns || []
  const active = campaigns.filter(c => c.status === 'PUBLISHED')
  const paid = campaigns.filter(c => c.status === 'PAID')
  const completed = campaigns.filter(c => c.status === 'COMPLETED')
  const today = completed.filter(c => {
    const d = new Date(c.completedAt || c.updatedAt)
    return d.toDateString() === new Date().toDateString()
  })
  const todayRevenue = today.reduce((s, c) => s + (c.netAmount || 0), 0)
  const animTodayRev = Math.round(useCountUp(todayRevenue))

  // Most recent events (any status change in last 24h)
  const recentEvents = useMemo(() => {
    const dayAgo = Date.now() - 24 * 60 * 60 * 1000
    return campaigns
      .filter(c => new Date(c.updatedAt || c.createdAt).getTime() > dayAgo)
      .sort((a, b) => new Date(b.updatedAt || b.createdAt) - new Date(a.updatedAt || a.createdAt))
      .slice(0, 6)
  }, [campaigns])

  const isLoading = data.loading && campaigns.length === 0
  const isEmpty = !isLoading && campaigns.length === 0
  const liveColor = active.length > 0 ? OK : 'var(--muted)'
  const isLive = active.length > 0
  const tiny = width < 280 || height < 170

  return (
    <div ref={(el) => { sizeRef.current = el; containerRef.current = el }} style={{ height: '100%' }}>
      <style>{`
        @keyframes rmPulse { 0%,100% { opacity:1 } 50% { opacity:0.35 } }
        @keyframes rmRing { 0% { box-shadow: 0 0 0 0 ${ga(0.6)} } 70% { box-shadow: 0 0 0 8px ${ga(0)} } 100% { box-shadow: 0 0 0 0 ${ga(0)} } }
        @keyframes rmFadeIn { from { opacity:0; transform: translateX(-4px) } to { opacity:1; transform: translateX(0) } }
      `}</style>
      <WidgetFrame
        title="Monitor en tiempo real"
        icon={Activity}
        accent={ACCENT}
        description="Status live de tus campañas. Muestra activas, pagadas pendientes de publicar y completadas hoy. Pausa cuando el widget no es visible para ahorrar CPU."
        loading={isLoading}
        empty={isEmpty ? {
          illustration: <IllustrationNoData accent={ACCENT} size={52} />,
          title: 'Sin actividad aún',
          description: 'Cuando aceptes y publiques campañas verás aquí su pulso en tiempo real.',
        } : null}
        menuActions={!isEmpty ? [
          { label: 'Ver solicitudes', icon: Inbox,    onClick: () => navigate('/creator/requests') },
          { label: 'Ver ganancias',   icon: Wallet,   onClick: () => navigate('/creator/earnings') },
        ] : null}
      >
        <div style={{ ...fill, justifyContent: 'flex-start', gap: tiny ? 7 : 9 }}>

          {/* Status header */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div aria-label={isLive ? 'En vivo' : 'Sin actividad'} style={{
              width: 8, height: 8, borderRadius: 4, background: liveColor, flexShrink: 0,
              animation: isLive && visible ? 'rmPulse 1.4s ease infinite, rmRing 2s ease infinite' : 'none',
            }} />
            <span style={{ fontSize: 10.5, fontWeight: 800, color: liveColor, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
              {isLive ? 'En vivo' : 'En reposo'}
            </span>
            <span style={{ fontSize: 10.5, color: 'var(--muted)', marginLeft: 'auto', fontVariantNumeric: 'tabular-nums' }}>
              {new Date(now).toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit' })}
            </span>
          </div>

          {/* Three counters */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: tiny ? 5 : 6 }}>
            <StatBox label="Activas"  value={active.length}    accent={OK}     />
            <StatBox label="Por publicar" value={paid.length} accent={BLUE}   />
            <StatBox label="Hoy"      value={today.length}    accent={ACCENT} />
          </div>

          {/* Today's revenue card */}
          <div style={{
            background: ga(0.06), border: `1px solid ${ga(0.22)}`, borderRadius: 9,
            padding: '9px 12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10,
          }}>
            <div>
              <div style={{ fontSize: 10, color: 'var(--muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Ganado hoy</div>
              <div style={{
                fontFamily: FONT_DISPLAY, fontSize: tiny ? 16 : 19, fontWeight: 800,
                color: todayRevenue > 0 ? ACCENT : 'var(--muted)',
                letterSpacing: '-0.02em', lineHeight: 1.1,
                fontVariantNumeric: 'tabular-nums',
              }}>
                {fmtEur(animTodayRev)}
              </div>
            </div>
            <Wifi size={tiny ? 16 : 18} color={isLive ? ACCENT : 'var(--muted2)'} strokeWidth={2} />
          </div>

          {/* Recent activity feed */}
          {height > 240 && recentEvents.length > 0 && (
            <div style={{ flex: 1, minHeight: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
              <div style={{ fontSize: 10, color: 'var(--muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 5 }}>
                Últimas 24h
              </div>
              <div style={{ flex: 1, minHeight: 0, overflow: 'auto', display: 'flex', flexDirection: 'column' }}>
                {recentEvents.map((c, i) => {
                  const ts = c.updatedAt || c.createdAt
                  const statusInfo = STATUS_CFG[c.status] || { color: '#94a3b8', label: c.status }
                  const channelName = typeof c.channel === 'object' ? c.channel?.nombreCanal : c.channel
                  return (
                    <div key={c._id || i} style={{
                      display: 'flex', alignItems: 'center', gap: 8,
                      padding: '6px 0', borderBottom: i < recentEvents.length - 1 ? '1px solid var(--border)' : 'none',
                      animation: 'rmFadeIn .25s ease',
                    }}>
                      <Circle size={6} fill={statusInfo.color} color={statusInfo.color} style={{ flexShrink: 0 }} />
                      <span style={{ fontSize: 11.5, color: 'var(--text)', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', minWidth: 0 }}>
                        {c.title || channelName || 'Campaña'}
                      </span>
                      <span style={{ fontSize: 10, color: statusInfo.color, fontWeight: 600, textTransform: 'lowercase', flexShrink: 0 }}>
                        {statusInfo.label.toLowerCase()}
                      </span>
                      <span style={{ fontSize: 10, color: 'var(--muted2)', flexShrink: 0, whiteSpace: 'nowrap', minWidth: 56, textAlign: 'right' }}>
                        {fmtRelTime(ts)}
                      </span>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </div>
      </WidgetFrame>
    </div>
  )
}

function StatBox({ label, value, accent }) {
  const animated = Math.round(useCountUp(value))
  return (
    <div style={{
      background: `${accent}10`, border: `1px solid ${accent}25`, borderRadius: 8,
      padding: '7px 6px', textAlign: 'center',
    }}>
      <div style={{
        fontFamily: FONT_DISPLAY, fontSize: 17, fontWeight: 800, color: accent,
        letterSpacing: '-0.02em', lineHeight: 1.1,
        fontVariantNumeric: 'tabular-nums',
      }}>
        {animated}
      </div>
      <div style={{ fontSize: 9.5, color: 'var(--muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em', marginTop: 2 }}>
        {label}
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
    case WIDGET_TYPES.KPI_CAS_HERO:      return <CASHeroWidget {...props} />
    case WIDGET_TYPES.EARNINGS_CHART:    return <EarningsChartWidget {...props} />
    case WIDGET_TYPES.REQUESTS_TABLE:    return <RequestsTableWidget {...props} />
    case WIDGET_TYPES.CHANNELS_TABLE:    return <ChannelsTableWidget {...props} />
    case WIDGET_TYPES.TOP_ADVERTISERS:   return <TopAdvertisersWidget {...props} />
    case WIDGET_TYPES.ACTIVITY_FEED:     return <ActivityFeedWidget {...props} />
    case WIDGET_TYPES.QUICK_ACTIONS:     return <QuickActionsWidget {...props} />
    case WIDGET_TYPES.ACTION_ITEMS:      return <ActionItemsWidget {...props} />
    case WIDGET_TYPES.NOTES:             return <NotesWidget {...props} />
    case WIDGET_TYPES.CAMPAIGN_CALENDAR: return <CalendarWidget {...props} />
    case WIDGET_TYPES.BALANCE_CARD:      return <BalanceCardWidget {...props} />
    case WIDGET_TYPES.SMART_INSIGHTS:    return <SmartInsightsWidget {...props} />
    case WIDGET_TYPES.REVENUE_FORECAST:  return <RevenueForecastWidget {...props} />
    case WIDGET_TYPES.CHANNEL_HEALTH:    return <ChannelHealthWidget {...props} />
    case WIDGET_TYPES.REALTIME_MONITOR:  return <RealtimeMonitorWidget {...props} />
    default: return <div style={{ color: 'var(--muted)', fontSize: 13 }}>Widget desconocido: {type}</div>
  }
}
