import React, { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  DollarSign, Megaphone, Activity, Eye, MousePointerClick,
  TrendingUp, TrendingDown, Plus, ArrowRight, AlertTriangle,
  CheckCircle2, MessageSquare, Sparkles, Search, BarChart3,
  CalendarDays, Zap, Clock, Users, Target, StickyNote,
  ExternalLink, ChevronRight, ChevronLeft,
} from 'lucide-react'
import { WIDGET_TYPES } from './WidgetRegistry'
import useWidgetSize, { rowsThatFit } from './useWidgetSize'
import SmartInsights from '../../../../components/SmartInsights'
import WidgetFrame, {
  IllustrationNoCampaigns, IllustrationNoData, IllustrationAllClear, IllustrationInbox,
} from '../../../../components/WidgetFrame'
import { FONT_BODY, FONT_DISPLAY, OK, WARN, ERR, BLUE } from '../../../../theme/tokens'

const PURPLE = 'var(--accent, #8B5CF6)'
const pa = (o) => `rgba(139,92,246,${o})`

// ═══════════════════════════════════════════════════════════════════════════════
// SHARED HELPERS
// ═══════════════════════════════════════════════════════════════════════════════

function Trend({ value, size = 11 }) {
  if (value === undefined || value === null) return null
  const pos = value > 0
  const Icon = pos ? TrendingUp : TrendingDown
  const color = pos ? OK : ERR
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 3,
      background: `${color}12`, border: `1px solid ${color}25`,
      borderRadius: 20, padding: '2px 8px', fontSize: size, fontWeight: 700, color,
      whiteSpace: 'nowrap',
    }}>
      <Icon size={size} strokeWidth={2.5} />
      {pos ? '+' : ''}{value}%
    </span>
  )
}

function MiniSparkline({ data, color = PURPLE, width = 80, height = 28 }) {
  if (!data || data.length < 2) return null
  const max = Math.max(...data)
  const min = Math.min(...data)
  const range = max - min || 1
  const points = data.map((v, i) => {
    const x = (i / (data.length - 1)) * width
    const y = height - ((v - min) / range) * (height - 4) - 2
    return `${x},${y}`
  }).join(' ')
  return (
    <svg width={width} height={height} style={{ display: 'block' }}>
      <polyline points={points} fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

// Fill helper: a div that grows to fill remaining vertical space
const fill = { flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }

// ═══════════════════════════════════════════════════════════════════════════════
// WELCOME WIDGET
// ═══════════════════════════════════════════════════════════════════════════════

function getGreeting(name) {
  const h = new Date().getHours()
  if (h >= 5 && h < 13)  return { text: `Buenos días, ${name}`, emoji: '☀️' }
  if (h >= 13 && h < 20) return { text: `Buenas tardes, ${name}`, emoji: '🌤️' }
  return { text: `Buenas noches, ${name}`, emoji: '🌙' }
}

function WelcomeWidget({ data }) {
  const navigate = useNavigate()
  const { ref, width, height } = useWidgetSize()
  const greeting = getGreeting((data.userName || 'Usuario').split(' ')[0])
  const compact = width < 480 || height < 90
  const tiny = height < 60

  return (
    <div ref={ref} style={{
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      gap: 12, height: '100%', padding: '4px 4px',
    }}>
      <div style={{ minWidth: 0, flex: 1 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: tiny ? 0 : 2 }}>
          <h1 style={{
            fontFamily: FONT_DISPLAY, fontSize: tiny ? 16 : compact ? 18 : 24,
            fontWeight: 800, color: 'var(--text)', letterSpacing: '-0.04em',
            lineHeight: 1.1, margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          }}>
            {greeting.text}
          </h1>
          {!tiny && <span style={{ fontSize: compact ? 16 : 22 }}>{greeting.emoji}</span>}
        </div>
        {!compact && (
          <p style={{ fontSize: 13, color: 'var(--muted)', margin: 0, lineHeight: 1.5, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {data.activeAds > 0
              ? <>Tienes <span style={{ color: PURPLE, fontWeight: 600 }}>{data.activeAds} {data.activeAds === 1 ? 'campaña activa' : 'campañas activas'}</span> ahora mismo</>
              : 'Resumen de tu actividad'}
          </p>
        )}
      </div>
      <button
        onClick={() => navigate('/advertiser/campaigns/new')}
        style={{
          display: 'flex', alignItems: 'center', gap: 6,
          background: PURPLE, color: '#fff', border: 'none', borderRadius: 10,
          padding: tiny ? '6px 10px' : compact ? '8px 12px' : '10px 18px',
          fontSize: tiny ? 11 : compact ? 12 : 13, fontWeight: 600,
          cursor: 'pointer', fontFamily: FONT_BODY, boxShadow: `0 4px 14px ${pa(0.3)}`,
          whiteSpace: 'nowrap', flexShrink: 0,
        }}
      >
        <Plus size={tiny ? 12 : 14} strokeWidth={2.5} /> {tiny ? '' : 'Nueva campaña'}
      </button>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════════
// KPI WIDGETS
// ═══════════════════════════════════════════════════════════════════════════════

const KPI_CONFIGS = {
  [WIDGET_TYPES.KPI_SPEND]: {
    icon: DollarSign, label: 'Gasto este mes', accent: PURPLE,
    getValue: (d) => `€${(d.totalSpend || 0).toLocaleString('es')}`,
    getChange: (d) => d.spendDelta,
    changeLabel: 'vs mes anterior',
    sparkData: (d) => d.monthlySpend?.map(m => m.value),
  },
  [WIDGET_TYPES.KPI_CAMPAIGNS]: {
    icon: Megaphone, label: 'Campañas activas', accent: OK,
    getValue: (d) => d.activeAds ?? 0,
    getSublabel: (d) => `${d.totalCampaigns ?? 0} totales`,
  },
  [WIDGET_TYPES.KPI_CTR]: {
    icon: Activity, label: 'CTR promedio', accent: BLUE,
    getValue: (d) => `${d.avgCtr ?? '0.0'}%`,
    getSublabel: (d) => `${(d.totalClicks || 0).toLocaleString('es')} clicks`,
  },
  [WIDGET_TYPES.KPI_VIEWS]: {
    icon: Eye, label: 'Vistas totales', accent: '#f59e0b',
    getValue: (d) => (d.totalViews || 0).toLocaleString('es'),
    getSublabel: () => 'impresiones acumuladas',
  },
  [WIDGET_TYPES.KPI_CLICKS]: {
    icon: MousePointerClick, label: 'Clicks totales', accent: '#ec4899',
    getValue: (d) => (d.totalClicks || 0).toLocaleString('es'),
    getSublabel: () => 'en todas las campañas',
  },
  [WIDGET_TYPES.KPI_ROI]: {
    // Label adapts: "ROI real" if we have real conversions in scope,
    // otherwise "ROI estimado" with a CPM-based heuristic.
    icon: TrendingUp, accent: OK,
    getLabel: (d) => d.realRoi?.hasRealData ? 'ROI real' : 'ROI estimado',
    getValue: (d) => {
      // Prefer the closed-loop ROI from /api/conversions/me if available
      if (d.realRoi?.hasRealData) {
        return `${Math.round(d.realRoi.roi)}%`
      }
      const spend = d.totalSpend || 0
      if (!spend) return '—'
      const views = d.totalViews || 0
      const estimatedValue = views * 0.015
      return `${((estimatedValue / spend) * 100).toFixed(0)}%`
    },
    getSublabel: (d) => d.realRoi?.hasRealData
      ? `${d.realRoi.conversions} conversiones · €${d.realRoi.revenue} ingresos`
      : 'basado en CPM estimado',
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
  const label = cfg.getLabel?.(data) || cfg.label

  // Auto-scale to box size — no scrolling, content adapts
  const tiny = width < 160 || height < 110
  const small = !tiny && (width < 220 || height < 150)
  const showSpark = sparkData && height > 180
  const showSublabel = sublabel && !tiny && height > 130
  const showChangeLabel = cfg.changeLabel && change !== undefined && height > 160

  const valueFontSize = tiny ? 18 : small ? 22 : Math.min(32, Math.max(22, width / 8))
  const iconSize = tiny ? 28 : small ? 34 : 40

  return (
    <div ref={ref} style={{
      display: 'flex', flexDirection: 'column',
      justifyContent: tiny ? 'center' : 'space-between',
      gap: tiny ? 4 : 10, height: '100%', minHeight: 0,
    }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 6 }}>
        <div style={{
          width: iconSize, height: iconSize, borderRadius: 11,
          background: `${cfg.accent}15`, border: `1px solid ${cfg.accent}25`,
          display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
        }}>
          <Icon size={Math.round(iconSize * 0.45)} color={cfg.accent} strokeWidth={2} />
        </div>
        <Trend value={change} size={tiny ? 10 : 11} />
      </div>

      <div style={{ minHeight: 0, overflow: 'hidden' }}>
        <div style={{
          fontSize: valueFontSize, fontWeight: 800, fontFamily: FONT_DISPLAY,
          color: 'var(--text)', letterSpacing: '-0.03em', lineHeight: 1.05,
          marginBottom: tiny ? 2 : 4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        }}>
          {value}
        </div>
        <div style={{ fontSize: tiny ? 11 : 13, color: 'var(--muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: 4 }}>
          {label}
          {type === WIDGET_TYPES.KPI_ROI && data.realRoi?.hasRealData && (
            <span title="Datos reales de conversiones tracked"
              style={{ fontSize: 9, fontWeight: 700, color: cfg.accent, background: `${cfg.accent}18`, border: `1px solid ${cfg.accent}40`, borderRadius: 6, padding: '1px 5px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              real
            </span>
          )}
        </div>
        {showSublabel && (
          <div style={{ fontSize: 11, color: 'var(--muted2)', marginTop: 4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {sublabel}
          </div>
        )}
        {showChangeLabel && (
          <div style={{ fontSize: 11, color: 'var(--muted2)', marginTop: 4 }}>{cfg.changeLabel}</div>
        )}
      </div>

      {showSpark && (
        <div style={{ height: 36, marginTop: 4 }}>
          <MiniSparkline data={sparkData} color={cfg.accent} width={width - 4} height={36} />
        </div>
      )}
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════════
// SPEND CHART WIDGET
// ═══════════════════════════════════════════════════════════════════════════════

function SpendChartWidget({ data, variant }) {
  const [hoverIdx, setHoverIdx] = useState(null)
  const { ref, width, height } = useWidgetSize()
  const spendData = data.monthlySpend || []
  const isLoading = data.loading && spendData.length === 0
  const isEmpty = !isLoading && spendData.length === 0

  return (
    <div ref={ref} style={{ height: '100%' }}>
      <WidgetFrame
        title={variant === 'mini' ? 'Gasto' : 'Gasto mensual'}
        icon={DollarSign}
        accent={PURPLE}
        description="Gasto acumulado en campañas publicadas y completadas, agrupado por mes."
        loading={isLoading}
        empty={isEmpty ? {
          illustration: <IllustrationNoData accent={PURPLE} size={56} />,
          title: 'Aún no hay gasto registrado',
          description: 'Cuando lances tu primera campaña verás aquí su evolución mensual.',
        } : null}
        compact={variant === 'mini' || height < 140}
        hideHeader={variant === 'mini' && height < 80}
      >
        <SpendChartBody data={spendData} variant={variant} width={width} height={height} hoverIdx={hoverIdx} setHoverIdx={setHoverIdx} />
      </WidgetFrame>
    </div>
  )
}

function SpendChartBody({ data: spendData, variant, width, height, hoverIdx, setHoverIdx }) {
  const max = Math.max(...spendData.map(d => d.value), 1)
  const isLine = variant === 'line'
  const isMini = variant === 'mini'

  if (isLine) {
    const w = Math.max(200, width - 4)
    const h = Math.max(60, height - 60)
    const pad = h > 80 ? 20 : 12
    const points = spendData.map((d, i) => {
      const x = pad + (i / Math.max(spendData.length - 1, 1)) * (w - pad * 2)
      const y = h - pad - ((d.value / max) * (h - pad * 2))
      return { x, y, ...d }
    })
    const pathD = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ')
    const areaD = `${pathD} L ${points[points.length - 1].x} ${h - pad} L ${points[0].x} ${h - pad} Z`

    return (
      <div style={{ ...fill, position: 'relative' }}>
        <svg viewBox={`0 0 ${w} ${h}`} style={{ width: '100%', height: '100%' }} preserveAspectRatio="none">
          <defs>
            <linearGradient id="spendGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={PURPLE} stopOpacity="0.3" />
              <stop offset="100%" stopColor={PURPLE} stopOpacity="0.02" />
            </linearGradient>
          </defs>
          <path d={areaD} fill="url(#spendGrad)" />
          <path d={pathD} fill="none" stroke={PURPLE} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" />
          {points.map((p, i) => (
            <g key={i}>
              <circle cx={p.x} cy={p.y} r={hoverIdx === i ? 5 : 3} fill={PURPLE} stroke="#fff" strokeWidth={2}
                style={{ cursor: 'pointer' }}
                onMouseEnter={() => setHoverIdx(i)} onMouseLeave={() => setHoverIdx(null)}
              />
              {hoverIdx === i && (
                <text x={p.x} y={p.y - 10} textAnchor="middle" fill={PURPLE} fontSize={11} fontWeight={700}>€{p.value}</text>
              )}
              {h > 80 && <text x={p.x} y={h - 4} textAnchor="middle" fill="var(--muted)" fontSize={9}>{p.label}</text>}
            </g>
          ))}
        </svg>
      </div>
    )
  }

  if (isMini || height < 110) {
    return (
      <div style={{ ...fill }}>
        <div style={{ ...fill, alignItems: 'flex-end', flexDirection: 'row', gap: 4 }}>
          {spendData.map((d, i) => (
            <div key={i} style={{
              flex: 1, borderRadius: '4px 4px 0 0',
              background: i === spendData.length - 1 ? PURPLE : pa(0.3),
              height: `${(d.value / max) * 100}%`, minHeight: 3,
              transition: 'height .3s',
            }} />
          ))}
        </div>
        {height > 80 && (
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4 }}>
            <span style={{ fontSize: 9, color: 'var(--muted)' }}>{spendData[0]?.label}</span>
            <span style={{ fontSize: 9, color: PURPLE, fontWeight: 600 }}>{spendData[spendData.length - 1]?.label}</span>
          </div>
        )}
      </div>
    )
  }

  // Bars
  return (
    <div style={{ ...fill, alignItems: 'flex-end', flexDirection: 'row', gap: 6, paddingBottom: height > 140 ? 18 : 4, position: 'relative' }}>
      {spendData.map((d, i) => {
        const isLast = i === spendData.length - 1
        const isHov = hoverIdx === i
        const pct = (d.value / max) * 100
        return (
          <div key={i}
            onMouseEnter={() => setHoverIdx(i)} onMouseLeave={() => setHoverIdx(null)}
            style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, height: '100%', cursor: 'default' }}
          >
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', width: '100%', minHeight: 0 }}>
              {(isHov || isLast) && height > 100 && (
                <div style={{ fontSize: 10, color: isLast ? PURPLE : 'var(--muted)', fontWeight: 700, textAlign: 'center', marginBottom: 4 }}>
                  €{d.value}
                </div>
              )}
              <div style={{
                width: '100%', borderRadius: '6px 6px 0 0', minHeight: 4, height: `${pct}%`,
                background: isLast ? `linear-gradient(180deg, ${pa(0.9)} 0%, ${PURPLE} 100%)` : isHov ? pa(0.5) : pa(0.3),
                transition: 'background .15s, height .4s cubic-bezier(.4,0,.2,1)',
              }} />
            </div>
            {height > 110 && (
              <span style={{ fontSize: 10, color: isLast ? PURPLE : 'var(--muted)', fontWeight: isLast ? 600 : 400, whiteSpace: 'nowrap' }}>
                {d.label}
              </span>
            )}
          </div>
        )
      })}
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════════
// CAMPAIGNS TABLE WIDGET — adaptive rows (no scroll)
// ═══════════════════════════════════════════════════════════════════════════════

const STATUS_CFG = {
  DRAFT:      { color: WARN, label: 'Borrador' },
  PAID:       { color: BLUE, label: 'Pagada' },
  PUBLISHED:  { color: OK,   label: 'Activa' },
  COMPLETED:  { color: '#94a3b8', label: 'Completada' },
  CANCELLED:  { color: ERR,  label: 'Cancelada' },
}

function CampaignsTableWidget({ data, variant }) {
  const navigate = useNavigate()
  const { ref, width, height } = useWidgetSize()
  const campaigns = data.campaigns || []
  const isLoading = data.loading && campaigns.length === 0
  const isEmpty = !isLoading && campaigns.length === 0

  return (
    <div ref={ref} style={{ height: '100%' }}>
      <WidgetFrame
        title={variant === 'compact' ? 'Campañas' : 'Campañas recientes'}
        icon={Megaphone}
        accent={PURPLE}
        description="Tus campañas más recientes con vistas, CTR, gasto y estado."
        loading={isLoading}
        empty={isEmpty ? {
          illustration: <IllustrationNoCampaigns accent={PURPLE} size={52} />,
          title: 'Aún no tienes campañas',
          description: 'Lanza tu primera campaña en uno de los miles de canales del marketplace.',
          actionLabel: 'Crear campaña',
          onAction: () => navigate('/advertiser/campaigns/new'),
          secondaryLabel: 'Explorar canales',
          onSecondary: () => navigate('/advertiser/explore'),
        } : null}
        compact={height < 130}
      >
        <CampaignsTableBody campaigns={campaigns} variant={variant} width={width} height={height} navigate={navigate} />
      </WidgetFrame>
    </div>
  )
}

function CampaignsTableBody({ campaigns, variant, width, height, navigate }) {
  // ── Cards variant ──────────────────────────────────────────────────────────
  if (variant === 'cards') {
    const cardH = 76
    const colMin = 180
    const cols = Math.max(1, Math.floor(width / colMin))
    const rowsAvail = rowsThatFit(height - 50, cardH + 10)
    const visibleN = Math.max(1, cols * rowsAvail)
    const items = campaigns.slice(0, visibleN)

    return (
      <>
        <div style={{ ...fill, display: 'grid', gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))`, gap: 8 }}>
          {items.map(ad => {
            const st = STATUS_CFG[ad.status] || { color: '#94a3b8', label: ad.status }
            const title = ad.title || ad.content?.slice(0, 40) || 'Campaña'
            const views = ad.tracking?.impressions || ad.views || 0
            return (
              <div key={ad.id || ad._id}
                onClick={() => navigate('/advertiser/campaigns')}
                style={{
                  background: 'var(--bg2)', borderRadius: 10, padding: 12, cursor: 'pointer',
                  border: '1px solid var(--border)', display: 'flex', flexDirection: 'column', gap: 6, minHeight: 0,
                }}
              >
                <div style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {title}
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 6 }}>
                  <span style={{ fontSize: 10.5, color: 'var(--muted)' }}>{Number(views).toLocaleString('es')} vistas</span>
                  <span style={{ background: `${st.color}12`, color: st.color, border: `1px solid ${st.color}35`, borderRadius: 20, padding: '1px 7px', fontSize: 10, fontWeight: 600 }}>
                    {st.label}
                  </span>
                </div>
              </div>
            )
          })}
        </div>
        {campaigns.length > visibleN && (
          <button onClick={() => navigate('/advertiser/campaigns')}
            style={{ marginTop: 6, fontSize: 11, color: PURPLE, background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600, fontFamily: FONT_BODY, textAlign: 'left' }}>
            Ver {campaigns.length - visibleN} más →
          </button>
        )}
      </>
    )
  }

  // ── Compact list variant ──────────────────────────────────────────────────
  if (variant === 'compact') {
    const rowH = 32
    const visibleN = rowsThatFit(height - 50, rowH)
    const items = campaigns.slice(0, visibleN)

    return (
      <div style={{ ...fill, justifyContent: 'flex-start' }}>
        {items.map((ad, i) => {
          const st = STATUS_CFG[ad.status] || { color: '#94a3b8', label: ad.status }
          return (
            <div key={ad.id || ad._id}
              onClick={() => navigate('/advertiser/campaigns')}
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8,
                padding: '7px 0', borderBottom: i < items.length - 1 ? '1px solid var(--border)' : 'none',
                cursor: 'pointer', minWidth: 0,
              }}
            >
              <span style={{ fontSize: 12.5, fontWeight: 500, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1, minWidth: 0 }}>
                {ad.title || ad.content?.slice(0, 30) || 'Campaña'}
              </span>
              <span style={{ background: `${st.color}12`, color: st.color, borderRadius: 20, padding: '2px 7px', fontSize: 10, fontWeight: 600, flexShrink: 0 }}>
                {st.label}
              </span>
            </div>
          )
        })}
      </div>
    )
  }

  // ── Full table variant ────────────────────────────────────────────────────
  const tableHeaderH = 30
  const rowH = 38
  const visibleN = rowsThatFit(height - 50 - tableHeaderH, rowH)
  const items = campaigns.slice(0, visibleN)
  const showCols = width > 360
  const showAllCols = width > 480

  return (
    <div style={{ ...fill, justifyContent: 'flex-start' }}>
      <div style={{
        display: 'grid',
        gridTemplateColumns: showAllCols ? '1fr 60px 50px 60px 70px' : showCols ? '1fr 60px 70px' : '1fr 70px',
        padding: '6px 0', borderBottom: '1px solid var(--border)', gap: 8,
      }}>
        {(showAllCols ? ['Campaña','Vistas','CTR','Gasto','Estado'] : showCols ? ['Campaña','Vistas','Estado'] : ['Campaña','Estado']).map(h => (
          <div key={h} style={{ fontSize: 9.5, fontWeight: 600, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{h}</div>
        ))}
      </div>
      {items.map((ad, i) => {
        const st = STATUS_CFG[ad.status] || { color: '#94a3b8', label: ad.status }
        const views = ad.tracking?.impressions || ad.views || 0
        const clicks = ad.tracking?.clicks || ad.clicks || 0
        const ctr = views > 0 ? ((clicks / views) * 100).toFixed(1) : '0.0'
        const spent = ad.price || ad.spent || ad.budget || 0
        return (
          <div key={ad.id || ad._id}
            onClick={() => navigate('/advertiser/campaigns')}
            style={{
              display: 'grid',
              gridTemplateColumns: showAllCols ? '1fr 60px 50px 60px 70px' : showCols ? '1fr 60px 70px' : '1fr 70px',
              alignItems: 'center', padding: '8px 0',
              borderBottom: i < items.length - 1 ? '1px solid var(--border)' : 'none',
              cursor: 'pointer', gap: 8, minWidth: 0,
            }}
          >
            <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {ad.title || ad.content?.slice(0, 40) || 'Campaña'}
            </div>
            {showCols && <div style={{ fontSize: 11.5, color: 'var(--text)' }}>{Number(views).toLocaleString('es')}</div>}
            {showAllCols && <div style={{ fontSize: 11.5, color: Number(ctr) > 4 ? OK : 'var(--text)', fontWeight: 600 }}>{ctr}%</div>}
            {showAllCols && <div style={{ fontSize: 11.5, fontWeight: 600, color: 'var(--text)' }}>€{spent}</div>}
            <span style={{ background: `${st.color}12`, color: st.color, border: `1px solid ${st.color}35`, borderRadius: 20, padding: '2px 6px', fontSize: 10, fontWeight: 600, textAlign: 'center' }}>
              {st.label}
            </span>
          </div>
        )
      })}
      {campaigns.length > visibleN && (
        <button onClick={() => navigate('/advertiser/campaigns')}
          style={{ marginTop: 4, fontSize: 11, color: PURPLE, background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600, fontFamily: FONT_BODY, textAlign: 'left' }}>
          Ver {campaigns.length - visibleN} más →
        </button>
      )}
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════════
// ACTION ITEMS WIDGET
// ═══════════════════════════════════════════════════════════════════════════════

function ActionItemsWidget({ data, variant }) {
  const { ref, width, height } = useWidgetSize()
  const items = data.actionItems || []
  const isLoading = data.loading && items.length === 0
  const isEmpty = !isLoading && items.length === 0

  return (
    <div ref={ref} style={{ height: '100%' }}>
      <WidgetFrame
        title="Requiere atención"
        icon={AlertTriangle}
        accent={WARN}
        description="Items que necesitan tu atención: pagos pendientes, campañas para liberar, mensajes sin leer."
        loading={isLoading}
        empty={isEmpty ? {
          illustration: <IllustrationAllClear accent={OK} size={52} />,
          title: '¡Todo en orden!',
          description: 'No tienes ningún item pendiente. Buen momento para lanzar nuevas campañas.',
        } : null}
        compact={variant === 'compact' || height < 100}
      >
        <ActionItemsBody items={items} variant={variant} height={height} />
      </WidgetFrame>
    </div>
  )
}

function ActionItemsBody({ items, variant, height }) {
  if (variant === 'compact') {
    const rowH = 26
    const visibleN = rowsThatFit(height - 50, rowH)
    return (
      <div style={{ ...fill, justifyContent: 'space-around', gap: 4 }}>
        {items.slice(0, visibleN).map((item, i) => {
          const Icon = item.icon
          return (
            <div key={i} onClick={item.onClick}
              style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', minWidth: 0 }}>
              <div style={{ width: 22, height: 22, borderRadius: 6, background: `${item.color}15`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <Icon size={11} color={item.color} />
              </div>
              <span style={{ fontSize: 11.5, fontWeight: 600, color: 'var(--text)', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.title}</span>
              {item.count > 0 && <span style={{ fontSize: 10, fontWeight: 700, color: item.color, flexShrink: 0 }}>{item.count}</span>}
            </div>
          )
        })}
      </div>
    )
  }

  if (variant === 'list') {
    const rowH = 50
    const visibleN = rowsThatFit(height - 50, rowH)
    return (
      <div style={{ ...fill, justifyContent: 'flex-start' }}>
        {items.slice(0, visibleN).map((item, i) => {
          const Icon = item.icon
          return (
            <div key={i} onClick={item.onClick}
              style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', padding: '8px 6px', borderRadius: 8, transition: 'background .12s' }}
              onMouseEnter={e => e.currentTarget.style.background = 'var(--bg2)'}
              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
            >
              <div style={{ width: 30, height: 30, borderRadius: 8, background: `${item.color}15`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, position: 'relative' }}>
                <Icon size={14} color={item.color} />
                {item.count > 0 && <span style={{ position: 'absolute', top: -3, right: -3, minWidth: 14, height: 14, background: item.color, color: '#fff', borderRadius: 7, fontSize: 9, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{item.count}</span>}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.title}</div>
                <div style={{ fontSize: 10.5, color: 'var(--muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.description}</div>
              </div>
              <ChevronRight size={13} color="var(--muted)" />
            </div>
          )
        })}
      </div>
    )
  }

  // Cards variant
  const rowH = 70
  const visibleN = rowsThatFit(height - 50, rowH)
  return (
    <div style={{ ...fill, gap: 6, justifyContent: 'flex-start' }}>
      {items.slice(0, visibleN).map((item, i) => {
        const Icon = item.icon
        return (
          <button key={i} onClick={item.onClick}
            style={{
              background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 10,
              padding: 10, display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer',
              textAlign: 'left', fontFamily: FONT_BODY, transition: 'border-color .15s',
              width: '100%', minWidth: 0,
            }}
            onMouseEnter={e => e.currentTarget.style.borderColor = item.color}
            onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border)'}
          >
            <div style={{ width: 34, height: 34, borderRadius: 9, background: `${item.color}15`, border: `1px solid ${item.color}30`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, position: 'relative' }}>
              <Icon size={15} color={item.color} strokeWidth={2} />
              {item.count > 0 && <span style={{ position: 'absolute', top: -4, right: -4, minWidth: 16, height: 16, background: item.color, color: '#fff', borderRadius: 8, fontSize: 9, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', border: '2px solid var(--bg2)' }}>{item.count}</span>}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text)', marginBottom: 1, fontFamily: FONT_DISPLAY, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.title}</div>
              <div style={{ fontSize: 10.5, color: 'var(--muted)', lineHeight: 1.3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.description}</div>
            </div>
            <ArrowRight size={12} color="var(--muted)" style={{ flexShrink: 0 }} />
          </button>
        )
      })}
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════════
// QUICK ACTIONS WIDGET
// ═══════════════════════════════════════════════════════════════════════════════

function QuickActionsWidget({ variant }) {
  const navigate = useNavigate()
  const { ref, width, height } = useWidgetSize()
  const actions = [
    { icon: Plus, label: 'Nueva campaña', path: '/advertiser/campaigns/new', color: PURPLE },
    { icon: Search, label: 'Explorar canales', path: '/advertiser/explore', color: BLUE },
    { icon: Zap, label: 'Auto-Buy', path: '/advertiser/autobuy', color: OK },
    { icon: BarChart3, label: 'Analytics', path: '/advertiser/analytics', color: '#f59e0b' },
    { icon: Target, label: 'Comparar', path: '/advertiser/analyze/compare', color: '#ec4899' },
    { icon: CalendarDays, label: 'Calendario', path: '/advertiser/analyze/calendar', color: '#06b6d4' },
  ]

  if (variant === 'compact' || (width < 250 && height < 90)) {
    const btnSize = Math.min(42, height - 16)
    return (
      <div ref={ref} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, height: '100%', flexWrap: 'wrap' }}>
        {actions.map((a, i) => {
          const Icon = a.icon
          return (
            <button key={i} onClick={() => navigate(a.path)}
              style={{
                width: btnSize, height: btnSize, borderRadius: 10, border: '1px solid var(--border)',
                background: 'var(--bg2)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                transition: 'border-color .15s, transform .15s',
              }}
              title={a.label}
              onMouseEnter={e => { e.currentTarget.style.borderColor = a.color; e.currentTarget.style.transform = 'translateY(-1px)' }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.transform = 'none' }}
            >
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
      <WidgetFrame
        title="Acciones rápidas"
        icon={Zap}
        accent={PURPLE}
        description="Atajos a las funciones que más usas en la plataforma."
      >
        <div style={{ ...fill, flexDirection: 'row', gap: 6, flexWrap: 'wrap', alignContent: 'flex-start', overflow: 'hidden' }}>
          {visible.map((a, i) => {
            const Icon = a.icon
            return (
              <button key={i} onClick={() => navigate(a.path)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 7,
                  background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 9,
                  padding: '7px 12px', cursor: 'pointer', fontFamily: FONT_BODY,
                  transition: 'border-color .15s, transform .15s', fontSize: 12, fontWeight: 500, color: 'var(--text)',
                  whiteSpace: 'nowrap', flexShrink: 0,
                }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = a.color; e.currentTarget.style.transform = 'translateY(-1px)' }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.transform = 'none' }}
              >
                <Icon size={13} color={a.color} strokeWidth={2} />
                {a.label}
              </button>
            )
          })}
          {overflow > 0 && (
            <span style={{ alignSelf: 'center', fontSize: 11, color: 'var(--muted)', padding: '0 4px' }}>
              +{overflow}
            </span>
          )}
        </div>
      </WidgetFrame>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════════
// ACTIVITY FEED WIDGET
// ═══════════════════════════════════════════════════════════════════════════════

function ActivityFeedWidget({ data }) {
  const { ref, height } = useWidgetSize()
  const campaigns = data.campaigns || []
  const activities = campaigns.map(c => {
    const statusMsg = {
      DRAFT: 'Campaña creada como borrador',
      PAID: 'Pago procesado correctamente',
      PUBLISHED: 'Anuncio publicado en el canal',
      COMPLETED: 'Campaña completada',
      CANCELLED: 'Campaña cancelada',
    }
    return {
      title: c.title || c.content?.slice(0, 30) || 'Campaña',
      msg: statusMsg[c.status] || `Estado: ${c.status}`,
      time: c.updatedAt || c.createdAt,
      color: (STATUS_CFG[c.status] || {}).color || '#94a3b8',
    }
  })

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
        description="Timeline de cambios en tus campañas: nuevas, publicadas, completadas, canceladas."
        loading={isLoading}
        empty={isEmpty ? {
          illustration: <IllustrationNoData accent={BLUE} size={52} />,
          title: 'Sin actividad reciente',
          description: 'Cuando lances o gestiones campañas verás aquí los eventos.',
        } : null}
      >
        <div style={{ ...fill, justifyContent: 'flex-start' }}>
          {activities.slice(0, visibleN).map((a, i) => (
            <div key={i} style={{ display: 'flex', gap: 8, padding: '7px 0', borderBottom: i < Math.min(visibleN, activities.length) - 1 ? '1px solid var(--border)' : 'none', minWidth: 0 }}>
              <div style={{ width: 7, height: 7, borderRadius: 4, background: a.color, marginTop: 5, flexShrink: 0 }} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 11.5, fontWeight: 600, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{a.title}</div>
                <div style={{ fontSize: 10.5, color: 'var(--muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{a.msg}</div>
              </div>
              {a.time && (
                <span style={{ fontSize: 10, color: 'var(--muted2)', flexShrink: 0 }}>
                  {new Date(a.time).toLocaleDateString('es', { day: 'numeric', month: 'short' })}
                </span>
              )}
            </div>
          ))}
        </div>
      </WidgetFrame>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════════
// TOP CHANNELS WIDGET
// ═══════════════════════════════════════════════════════════════════════════════

function TopChannelsWidget({ data, variant }) {
  const { ref, width, height } = useWidgetSize()
  const campaigns = data.campaigns || []
  const channelMap = {}
  campaigns.forEach(c => {
    const name = typeof c.channel === 'object' ? c.channel?.nombreCanal : c.channel || 'Desconocido'
    if (!channelMap[name]) channelMap[name] = { name, views: 0, clicks: 0, spent: 0, count: 0 }
    channelMap[name].views += (c.tracking?.impressions || c.views || 0)
    channelMap[name].clicks += (c.tracking?.clicks || c.clicks || 0)
    channelMap[name].spent += (c.price || c.spent || 0)
    channelMap[name].count++
  })
  const channels = Object.values(channelMap).sort((a, b) => b.views - a.views)
  const isLoading = data.loading && channels.length === 0
  const isEmpty = !isLoading && channels.length === 0
  const rowH = 38
  const visibleN = rowsThatFit(height - 50, rowH)
  const showSecondary = variant !== 'compact' && width > 200

  return (
    <div ref={ref} style={{ height: '100%' }}>
      <WidgetFrame
        title="Top canales"
        icon={Users}
        accent={PURPLE}
        description="Los canales con más vistas acumuladas en tus campañas."
        loading={isLoading}
        empty={isEmpty ? {
          illustration: <IllustrationNoData accent={PURPLE} size={52} />,
          title: 'Sin datos de canales',
          description: 'Cuando tus campañas empiecen a recibir vistas verás aquí los mejores canales.',
        } : null}
      >
        <div style={{ ...fill, justifyContent: 'flex-start' }}>
          {channels.slice(0, visibleN).map((ch, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '7px 0', borderBottom: i < Math.min(visibleN, channels.length) - 1 ? '1px solid var(--border)' : 'none', minWidth: 0 }}>
              <div style={{ width: 24, height: 24, borderRadius: 7, background: pa(0.1), display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, color: PURPLE, flexShrink: 0 }}>
                {i + 1}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{ch.name}</div>
                {showSecondary && <div style={{ fontSize: 10.5, color: 'var(--muted)' }}>{ch.count} campaña{ch.count !== 1 ? 's' : ''}</div>}
              </div>
              <div style={{ textAlign: 'right', flexShrink: 0 }}>
                <div style={{ fontSize: 11.5, fontWeight: 600, color: 'var(--text)' }}>{ch.views.toLocaleString('es')}</div>
                {showSecondary && <div style={{ fontSize: 10.5, color: 'var(--muted)' }}>€{ch.spent}</div>}
              </div>
            </div>
          ))}
        </div>
      </WidgetFrame>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════════
// BUDGET DONUT WIDGET
// ═══════════════════════════════════════════════════════════════════════════════

function BudgetDonutWidget({ data }) {
  const { ref, width, height } = useWidgetSize()
  const campaigns = data.campaigns || []
  const statusBuckets = {}
  campaigns.forEach(c => {
    const key = c.status || 'OTHER'
    if (!statusBuckets[key]) statusBuckets[key] = 0
    statusBuckets[key] += (c.price || c.spent || 0)
  })
  const entries = Object.entries(statusBuckets).filter(([, v]) => v > 0)
  const total = entries.reduce((s, [, v]) => s + v, 0)

  const isLoading = data.loading && total === 0
  const isEmpty = !isLoading && total === 0
  const colors = [PURPLE, OK, BLUE, WARN, ERR, '#ec4899', '#06b6d4']
  const isHorizontal = width > height + 40
  const size = Math.min(
    isHorizontal ? height - 60 : width - 16,
    isHorizontal ? width / 2 - 16 : height - 110,
    150,
  )
  const safeSize = Math.max(60, size)
  const strokeW = Math.max(10, Math.round(safeSize / 8))
  const r = (safeSize - strokeW) / 2
  const circ = 2 * Math.PI * r
  let offset = 0
  const showLegend = (isHorizontal ? width > 220 : height > 180)

  return (
    <div ref={ref} style={{ height: '100%' }}>
      <WidgetFrame
        title="Distribución de presupuesto"
        icon={DollarSign}
        accent={PURPLE}
        description="Cómo se reparte tu gasto por estado de campaña."
        loading={isLoading}
        empty={isEmpty ? {
          illustration: <IllustrationNoData accent={PURPLE} size={52} />,
          title: 'Sin datos de presupuesto',
          description: 'Cuando tengas campañas pagadas verás aquí el desglose.',
        } : null}
      >
        <div style={{
          ...fill,
          flexDirection: isHorizontal ? 'row' : 'column',
          alignItems: 'center', justifyContent: 'center', gap: 14, minHeight: 0,
        }}>
          <svg width={safeSize} height={safeSize} style={{ flexShrink: 0 }}>
            {entries.map(([key, val], i) => {
              const pct = val / total
              const dash = circ * pct
              const gap = circ - dash
              const rot = offset
              offset += pct * 360
              return (
                <circle key={key} cx={safeSize / 2} cy={safeSize / 2} r={r}
                  fill="none" stroke={colors[i % colors.length]} strokeWidth={strokeW}
                  strokeDasharray={`${dash} ${gap}`}
                  strokeDashoffset={0}
                  transform={`rotate(${rot - 90} ${safeSize / 2} ${safeSize / 2})`}
                  strokeLinecap="round"
                />
              )
            })}
            <text x={safeSize / 2} y={safeSize / 2} textAnchor="middle" dominantBaseline="central"
              fill="var(--text)" fontSize={Math.round(safeSize / 8)} fontWeight={700} fontFamily={FONT_DISPLAY}>
              €{total.toLocaleString('es')}
            </text>
          </svg>
          {showLegend && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4, minWidth: 0 }}>
              {entries.map(([key, val], i) => {
                const label = STATUS_CFG[key]?.label || key
                return (
                  <div key={key} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <div style={{ width: 8, height: 8, borderRadius: 2, background: colors[i % colors.length], flexShrink: 0 }} />
                    <span style={{ fontSize: 11, color: 'var(--muted)' }}>{label}</span>
                    <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--text)' }}>€{val}</span>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </WidgetFrame>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════════
// NOTES WIDGET
// ═══════════════════════════════════════════════════════════════════════════════

function NotesWidget({ widgetId }) {
  const { ref, height } = useWidgetSize()
  const storageKey = `channelad-notes-${widgetId}`
  const [text, setText] = useState(() => {
    try { return localStorage.getItem(storageKey) || '' } catch { return '' }
  })
  const save = (val) => {
    setText(val)
    try { localStorage.setItem(storageKey, val) } catch {}
  }
  return (
    <div ref={ref} style={{ height: '100%' }}>
      <WidgetFrame
        title="Notas"
        icon={StickyNote}
        accent={PURPLE}
        description="Bloc de notas personal — se guarda automáticamente en este navegador."
      >
        <textarea
          value={text}
          onChange={e => save(e.target.value)}
          placeholder="Escribe tus notas aquí..."
          style={{
            flex: 1, width: '100%', resize: 'none', border: '1px solid var(--border)',
            borderRadius: 10, padding: 10, fontSize: 13, fontFamily: FONT_BODY,
            background: 'var(--bg2)', color: 'var(--text)', outline: 'none',
            lineHeight: 1.5, minHeight: 0,
          }}
          onFocus={e => e.currentTarget.style.borderColor = PURPLE}
          onBlur={e => e.currentTarget.style.borderColor = 'var(--border)'}
        />
      </WidgetFrame>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════════
// CAMPAIGN CALENDAR WIDGET
// ═══════════════════════════════════════════════════════════════════════════════

function CampaignCalendarWidget({ data, variant }) {
  const { ref, height } = useWidgetSize()
  const [monthOffset, setMonthOffset] = useState(0)
  const now = new Date()
  const viewDate = new Date(now.getFullYear(), now.getMonth() + monthOffset, 1)
  const year = viewDate.getFullYear()
  const month = viewDate.getMonth()
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const firstDay = new Date(year, month, 1).getDay()
  const campaigns = data.campaigns || []

  const campaignDates = {}
  campaigns.forEach(c => {
    const d = new Date(c.createdAt || c.startDate)
    if (!isNaN(d.getTime()) && d.getMonth() === month && d.getFullYear() === year) {
      const day = d.getDate()
      if (!campaignDates[day]) campaignDates[day] = []
      campaignDates[day].push(c)
    }
  })

  const monthNames = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre']
  const dayNames = ['L', 'M', 'X', 'J', 'V', 'S', 'D']
  const adjustedFirst = (firstDay + 6) % 7

  if (variant === 'compact') {
    const startOfWeek = new Date()
    startOfWeek.setDate(startOfWeek.getDate() - ((startOfWeek.getDay() + 6) % 7))
    const weekDays = Array.from({ length: 7 }, (_, i) => {
      const d = new Date(startOfWeek)
      d.setDate(d.getDate() + i)
      return d
    })
    return (
      <div ref={ref} style={{ height: '100%' }}>
        <WidgetFrame title="Esta semana" icon={CalendarDays} accent={PURPLE}
          description="Vista de los próximos 7 días con tus campañas programadas.">
          <div style={{ ...fill, display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 4 }}>
            {weekDays.map((d, i) => {
              const isToday = d.toDateString() === now.toDateString()
              const hasCampaign = campaigns.some(c => {
                const cd = new Date(c.createdAt || c.startDate)
                return cd.toDateString() === d.toDateString()
              })
              return (
                <div key={i} style={{
                  display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 4,
                  padding: 6, borderRadius: 8,
                  background: isToday ? pa(0.1) : 'transparent',
                  border: isToday ? `1px solid ${pa(0.3)}` : '1px solid transparent',
                }}>
                  <span style={{ fontSize: 10, color: 'var(--muted)', fontWeight: 500 }}>{dayNames[i]}</span>
                  <span style={{ fontSize: 14, fontWeight: isToday ? 700 : 500, color: isToday ? PURPLE : 'var(--text)' }}>{d.getDate()}</span>
                  {hasCampaign && <div style={{ width: 5, height: 5, borderRadius: 3, background: PURPLE }} />}
                </div>
              )
            })}
          </div>
        </WidgetFrame>
      </div>
    )
  }

  return (
    <div ref={ref} style={{ height: '100%' }}>
      <WidgetFrame
        title={`${monthNames[month]} ${year}`}
        icon={CalendarDays}
        accent={PURPLE}
        description="Calendario mensual con marcadores en los días que tienen campañas programadas."
        menuActions={[
          { label: 'Mes anterior', icon: ChevronLeft, onClick: () => setMonthOffset(o => o - 1) },
          { label: 'Mes siguiente', icon: ChevronRight, onClick: () => setMonthOffset(o => o + 1) },
          { label: 'Hoy', icon: CalendarDays, onClick: () => setMonthOffset(0) },
        ]}
      >
        <div style={{ ...fill, display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gridAutoRows: '1fr', gap: 2 }}>
          {dayNames.map(d => (
            <div key={d} style={{ fontSize: 10, fontWeight: 600, color: 'var(--muted)', textAlign: 'center', padding: '4px 0' }}>{d}</div>
          ))}
          {Array.from({ length: adjustedFirst }).map((_, i) => <div key={`e-${i}`} />)}
          {Array.from({ length: daysInMonth }, (_, i) => i + 1).map(day => {
            const isToday = day === now.getDate() && month === now.getMonth() && year === now.getFullYear()
            const hasCampaign = !!campaignDates[day]
            return (
              <div key={day} style={{
                display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                borderRadius: 6, position: 'relative',
                background: isToday ? pa(0.15) : 'transparent',
                cursor: hasCampaign ? 'pointer' : 'default',
                minWidth: 0,
              }}>
                <span style={{ fontSize: 11, fontWeight: isToday ? 700 : 400, color: isToday ? PURPLE : 'var(--text)' }}>{day}</span>
                {hasCampaign && <div style={{ width: 4, height: 4, borderRadius: 2, background: PURPLE, marginTop: 1 }} />}
              </div>
            )
          })}
        </div>
      </WidgetFrame>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════════
// SMART INSIGHTS WIDGET
// ═══════════════════════════════════════════════════════════════════════════════

function SmartInsightsWidget({ data }) {
  return (
    <div style={{ height: '100%', overflow: 'hidden' }}>
      <SmartInsights
        campaigns={data.campaigns || []}
        creditsBalance={data.creditsBalance || 0}
        spendDelta={data.spendDelta}
        startCollapsed={false}
        maxItems={4}
      />
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════════
// WIDGET RENDERER
// ═══════════════════════════════════════════════════════════════════════════════

export default function WidgetRenderer({ type, variant, data, widgetId }) {
  const props = { data, variant, type, widgetId }
  switch (type) {
    case WIDGET_TYPES.WELCOME:           return <WelcomeWidget {...props} />
    case WIDGET_TYPES.KPI_SPEND:
    case WIDGET_TYPES.KPI_CAMPAIGNS:
    case WIDGET_TYPES.KPI_CTR:
    case WIDGET_TYPES.KPI_VIEWS:
    case WIDGET_TYPES.KPI_CLICKS:
    case WIDGET_TYPES.KPI_ROI:           return <KpiWidget {...props} />
    case WIDGET_TYPES.SPEND_CHART:       return <SpendChartWidget {...props} />
    case WIDGET_TYPES.CAMPAIGNS_TABLE:   return <CampaignsTableWidget {...props} />
    case WIDGET_TYPES.ACTION_ITEMS:      return <ActionItemsWidget {...props} />
    case WIDGET_TYPES.QUICK_ACTIONS:     return <QuickActionsWidget {...props} />
    case WIDGET_TYPES.ACTIVITY_FEED:     return <ActivityFeedWidget {...props} />
    case WIDGET_TYPES.TOP_CHANNELS:      return <TopChannelsWidget {...props} />
    case WIDGET_TYPES.BUDGET_DONUT:      return <BudgetDonutWidget {...props} />
    case WIDGET_TYPES.NOTES:             return <NotesWidget {...props} />
    case WIDGET_TYPES.CAMPAIGN_CALENDAR: return <CampaignCalendarWidget {...props} />
    case WIDGET_TYPES.SMART_INSIGHTS:    return <SmartInsightsWidget {...props} />
    default: return <div style={{ color: 'var(--muted)', fontSize: 13 }}>Widget desconocido: {type}</div>
  }
}
