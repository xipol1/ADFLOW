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
import { FONT_BODY, FONT_DISPLAY, OK, WARN, ERR, BLUE } from '../../../../theme/tokens'

const PURPLE = 'var(--accent, #8B5CF6)'
const pa = (o) => `rgba(139,92,246,${o})`

// ═══════════════════════════════════════════════════════════════════════════════
// SHARED MINI COMPONENTS
// ═══════════════════════════════════════════════════════════════════════════════

function Trend({ value }) {
  if (value === undefined || value === null) return null
  const pos = value > 0
  const Icon = pos ? TrendingUp : TrendingDown
  const color = pos ? OK : ERR
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 3,
      background: `${color}12`, border: `1px solid ${color}25`,
      borderRadius: 20, padding: '2px 8px', fontSize: 11, fontWeight: 700, color,
    }}>
      <Icon size={11} strokeWidth={2.5} />
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

// ═══════════════════════════════════════════════════════════════════════════════
// WELCOME WIDGET
// ═══════════════════════════════════════════════════════════════════════════════

function getGreeting(name) {
  const h = new Date().getHours()
  if (h >= 5 && h < 13)  return { text: `Buenos días, ${name}`, emoji: '☀️' }
  if (h >= 13 && h < 20) return { text: `Buenas tardes, ${name}`, emoji: '🌤️' }
  return { text: `Buenas noches, ${name}`, emoji: '🌙' }
}

function WelcomeWidget({ data, variant }) {
  const navigate = useNavigate()
  const greeting = getGreeting((data.userName || 'Usuario').split(' ')[0])
  const compact = variant === 'compact'

  return (
    <div style={{ display: 'flex', alignItems: compact ? 'center' : 'flex-start', justifyContent: 'space-between', gap: 16, height: '100%', padding: '8px 4px' }}>
      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
          <h1 style={{ fontFamily: FONT_DISPLAY, fontSize: compact ? 20 : 26, fontWeight: 800, color: 'var(--text)', letterSpacing: '-0.04em', lineHeight: 1.1, margin: 0 }}>
            {greeting.text}
          </h1>
          <span style={{ fontSize: compact ? 18 : 22 }}>{greeting.emoji}</span>
        </div>
        {!compact && (
          <p style={{ fontSize: 13, color: 'var(--muted)', margin: 0, lineHeight: 1.5 }}>
            {data.activeAds > 0
              ? <>Tienes <span style={{ color: PURPLE, fontWeight: 600 }}>{data.activeAds} {data.activeAds === 1 ? 'campaña activa' : 'campañas activas'}</span> ahora mismo</>
              : 'Resumen de tu actividad'}
          </p>
        )}
      </div>
      <button
        onClick={() => navigate('/advertiser/campaigns/new')}
        style={{
          display: 'flex', alignItems: 'center', gap: 8,
          background: PURPLE, color: '#fff', border: 'none', borderRadius: 12,
          padding: compact ? '8px 14px' : '11px 20px', fontSize: compact ? 12 : 14, fontWeight: 600,
          cursor: 'pointer', fontFamily: FONT_BODY, boxShadow: `0 4px 16px ${pa(0.35)}`,
          whiteSpace: 'nowrap', flexShrink: 0,
        }}
      >
        <Plus size={14} strokeWidth={2.5} /> Nueva campaña
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
    getSublabel: (d) => 'impresiones acumuladas',
  },
  [WIDGET_TYPES.KPI_CLICKS]: {
    icon: MousePointerClick, label: 'Clicks totales', accent: '#ec4899',
    getValue: (d) => (d.totalClicks || 0).toLocaleString('es'),
    getSublabel: (d) => 'en todas las campañas',
  },
  [WIDGET_TYPES.KPI_ROI]: {
    icon: TrendingUp, label: 'ROI estimado', accent: OK,
    getValue: (d) => {
      const spend = d.totalSpend || 0
      if (!spend) return '—'
      const views = d.totalViews || 0
      const estimatedValue = views * 0.015
      return `${((estimatedValue / spend) * 100).toFixed(0)}%`
    },
    getSublabel: () => 'basado en CPM estimado',
  },
}

function KpiWidget({ data, variant, type }) {
  const cfg = KPI_CONFIGS[type]
  if (!cfg) return null
  const Icon = cfg.icon
  const value = cfg.getValue(data)
  const change = cfg.getChange?.(data)
  const sublabel = cfg.getSublabel?.(data)
  const sparkData = cfg.sparkData?.(data)
  const compact = variant === 'compact'
  const detailed = variant === 'detailed'

  return (
    <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: compact ? 8 : 14, height: '100%', padding: '4px 0' }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
        <div style={{
          width: compact ? 34 : 40, height: compact ? 34 : 40, borderRadius: 11,
          background: `${cfg.accent}15`, border: `1px solid ${cfg.accent}25`,
          display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
        }}>
          <Icon size={compact ? 15 : 18} color={cfg.accent} strokeWidth={2} />
        </div>
        <Trend value={change} />
      </div>

      <div>
        <div style={{
          fontSize: compact ? 22 : 28, fontWeight: 800, fontFamily: FONT_DISPLAY,
          color: 'var(--text)', letterSpacing: '-0.03em', lineHeight: 1.1, marginBottom: 4,
        }}>
          {value}
        </div>
        <div style={{ fontSize: 13, color: 'var(--muted)' }}>{cfg.label}</div>
        {sublabel && <div style={{ fontSize: 11, color: 'var(--muted2)', marginTop: 4 }}>{sublabel}</div>}
        {cfg.changeLabel && change !== undefined && (
          <div style={{ fontSize: 11, color: 'var(--muted2)', marginTop: 4 }}>{cfg.changeLabel}</div>
        )}
      </div>

      {(detailed || (variant === 'standard' && sparkData)) && sparkData && (
        <MiniSparkline data={sparkData} color={cfg.accent} width={200} height={36} />
      )}
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════════
// SPEND CHART WIDGET
// ═══════════════════════════════════════════════════════════════════════════════

function SpendChartWidget({ data, variant }) {
  const [hoverIdx, setHoverIdx] = useState(null)
  const spendData = data.monthlySpend || []

  if (spendData.length === 0) {
    return (
      <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--muted)', fontSize: 13 }}>
        Sin datos de gasto este periodo
      </div>
    )
  }

  const max = Math.max(...spendData.map(d => d.value), 1)
  const isLine = variant === 'line'
  const isMini = variant === 'mini'

  if (isLine) {
    const w = 300
    const h = 120
    const pad = 20
    const points = spendData.map((d, i) => {
      const x = pad + (i / Math.max(spendData.length - 1, 1)) * (w - pad * 2)
      const y = h - pad - ((d.value / max) * (h - pad * 2))
      return { x, y, ...d }
    })
    const pathD = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ')
    const areaD = `${pathD} L ${points[points.length - 1].x} ${h - pad} L ${points[0].x} ${h - pad} Z`

    return (
      <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column' }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)', marginBottom: 8, fontFamily: FONT_DISPLAY }}>Gasto mensual</div>
        <svg viewBox={`0 0 ${w} ${h}`} style={{ flex: 1, width: '100%' }} preserveAspectRatio="xMidYMid meet">
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
                <text x={p.x} y={p.y - 10} textAnchor="middle" fill={PURPLE} fontSize={11} fontWeight={700}>
                  €{p.value}
                </text>
              )}
              <text x={p.x} y={h - 4} textAnchor="middle" fill="var(--muted)" fontSize={9}>{p.label}</text>
            </g>
          ))}
        </svg>
      </div>
    )
  }

  if (isMini) {
    return (
      <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column' }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text)', marginBottom: 8, fontFamily: FONT_DISPLAY }}>Gasto</div>
        <div style={{ flex: 1, display: 'flex', alignItems: 'flex-end', gap: 4 }}>
          {spendData.map((d, i) => (
            <div key={i} style={{ flex: 1, borderRadius: '4px 4px 0 0', background: i === spendData.length - 1 ? PURPLE : pa(0.3), height: `${(d.value / max) * 100}%`, minHeight: 3, transition: 'height .3s' }} />
          ))}
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4 }}>
          <span style={{ fontSize: 9, color: 'var(--muted)' }}>{spendData[0]?.label}</span>
          <span style={{ fontSize: 9, color: PURPLE, fontWeight: 600 }}>{spendData[spendData.length - 1]?.label}</span>
        </div>
      </div>
    )
  }

  return (
    <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column' }}>
      <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)', marginBottom: 12, fontFamily: FONT_DISPLAY }}>Gasto mensual</div>
      <div style={{ flex: 1, display: 'flex', alignItems: 'flex-end', gap: 6, paddingBottom: 20, position: 'relative' }}>
        {spendData.map((d, i) => {
          const isLast = i === spendData.length - 1
          const isHov = hoverIdx === i
          const pct = (d.value / max) * 100
          return (
            <div key={i}
              onMouseEnter={() => setHoverIdx(i)} onMouseLeave={() => setHoverIdx(null)}
              style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, height: '100%', cursor: 'default' }}
            >
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', width: '100%' }}>
                {(isHov || isLast) && (
                  <div style={{ fontSize: 11, color: isLast ? PURPLE : 'var(--muted)', fontWeight: 700, textAlign: 'center', marginBottom: 4 }}>
                    €{d.value}
                  </div>
                )}
                <div style={{
                  width: '100%', borderRadius: '6px 6px 0 0', minHeight: 4, height: `${pct}%`,
                  background: isLast ? `linear-gradient(180deg, ${pa(0.9)} 0%, ${PURPLE} 100%)` : isHov ? pa(0.5) : pa(0.3),
                  transition: 'background .15s, height .4s cubic-bezier(.4,0,.2,1)',
                }} />
              </div>
              <span style={{ fontSize: 10, color: isLast ? PURPLE : 'var(--muted)', fontWeight: isLast ? 600 : 400, whiteSpace: 'nowrap' }}>
                {d.label}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════════
// CAMPAIGNS TABLE WIDGET
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
  const campaigns = data.campaigns || []

  if (campaigns.length === 0) {
    return (
      <div style={{ height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 12 }}>
        <Megaphone size={28} color="var(--muted)" strokeWidth={1.5} />
        <div style={{ fontSize: 13, color: 'var(--muted)' }}>Aún no tienes campañas</div>
        <button onClick={() => navigate('/advertiser/campaigns/new')}
          style={{ background: pa(0.1), color: PURPLE, border: `1px solid ${pa(0.3)}`, borderRadius: 8, padding: '8px 16px', fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: FONT_BODY }}>
          Crear primera campaña
        </button>
      </div>
    )
  }

  if (variant === 'cards') {
    return (
      <div style={{ height: '100%', overflow: 'auto', display: 'flex', flexDirection: 'column', gap: 2 }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)', marginBottom: 8, fontFamily: FONT_DISPLAY }}>Campañas recientes</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 10, flex: 1 }}>
          {campaigns.slice(0, 6).map(ad => {
            const st = STATUS_CFG[ad.status] || { color: '#94a3b8', label: ad.status }
            const title = ad.title || ad.content?.slice(0, 40) || 'Campaña'
            const views = ad.tracking?.impressions || ad.views || 0
            return (
              <div key={ad.id || ad._id}
                onClick={() => navigate('/advertiser/campaigns')}
                style={{
                  background: 'var(--bg2)', borderRadius: 12, padding: 14, cursor: 'pointer',
                  border: '1px solid var(--border)', transition: 'border-color .15s',
                }}
              >
                <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', marginBottom: 8, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {title}
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: 11, color: 'var(--muted)' }}>{Number(views).toLocaleString('es')} vistas</span>
                  <span style={{ background: `${st.color}12`, color: st.color, border: `1px solid ${st.color}35`, borderRadius: 20, padding: '2px 8px', fontSize: 10, fontWeight: 600 }}>
                    {st.label}
                  </span>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    )
  }

  if (variant === 'compact') {
    return (
      <div style={{ height: '100%', overflow: 'auto', display: 'flex', flexDirection: 'column' }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)', marginBottom: 8, fontFamily: FONT_DISPLAY }}>Campañas</div>
        {campaigns.slice(0, 8).map((ad, i) => {
          const st = STATUS_CFG[ad.status] || { color: '#94a3b8', label: ad.status }
          return (
            <div key={ad.id || ad._id}
              onClick={() => navigate('/advertiser/campaigns')}
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8,
                padding: '9px 0', borderBottom: i < campaigns.length - 1 ? '1px solid var(--border)' : 'none',
                cursor: 'pointer',
              }}
            >
              <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>
                {ad.title || ad.content?.slice(0, 30) || 'Campaña'}
              </span>
              <span style={{ background: `${st.color}12`, color: st.color, borderRadius: 20, padding: '2px 8px', fontSize: 10, fontWeight: 600, flexShrink: 0 }}>
                {st.label}
              </span>
            </div>
          )
        })}
      </div>
    )
  }

  // full table variant
  return (
    <div style={{ height: '100%', overflow: 'auto', display: 'flex', flexDirection: 'column' }}>
      <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)', marginBottom: 8, fontFamily: FONT_DISPLAY }}>Campañas recientes</div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 70px 60px 70px 74px', padding: '8px 0', borderBottom: '1px solid var(--border)', gap: 8 }}>
        {['Campaña', 'Vistas', 'CTR', 'Gasto', 'Estado'].map(h => (
          <div key={h} style={{ fontSize: 10, fontWeight: 600, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{h}</div>
        ))}
      </div>
      {campaigns.slice(0, 5).map((ad, i) => {
        const st = STATUS_CFG[ad.status] || { color: '#94a3b8', label: ad.status }
        const views = ad.tracking?.impressions || ad.views || 0
        const clicks = ad.tracking?.clicks || ad.clicks || 0
        const ctr = views > 0 ? ((clicks / views) * 100).toFixed(1) : '0.0'
        const spent = ad.price || ad.spent || ad.budget || 0
        return (
          <div key={ad.id || ad._id}
            onClick={() => navigate('/advertiser/campaigns')}
            style={{
              display: 'grid', gridTemplateColumns: '1fr 70px 60px 70px 74px', alignItems: 'center',
              padding: '10px 0', borderBottom: i < 4 ? '1px solid var(--border)' : 'none',
              cursor: 'pointer', gap: 8,
            }}
          >
            <div style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {ad.title || ad.content?.slice(0, 40) || 'Campaña'}
            </div>
            <div style={{ fontSize: 12, color: 'var(--text)' }}>{Number(views).toLocaleString('es')}</div>
            <div style={{ fontSize: 12, color: Number(ctr) > 4 ? OK : 'var(--text)', fontWeight: 600 }}>{ctr}%</div>
            <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text)' }}>€{spent}</div>
            <span style={{ background: `${st.color}12`, color: st.color, border: `1px solid ${st.color}35`, borderRadius: 20, padding: '2px 7px', fontSize: 10, fontWeight: 600, textAlign: 'center' }}>
              {st.label}
            </span>
          </div>
        )
      })}
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════════
// ACTION ITEMS WIDGET
// ═══════════════════════════════════════════════════════════════════════════════

function ActionItemsWidget({ data, variant }) {
  const navigate = useNavigate()
  const items = data.actionItems || []

  if (items.length === 0) {
    return (
      <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--muted)', fontSize: 13 }}>
        <CheckCircle2 size={16} style={{ marginRight: 8 }} /> Todo en orden
      </div>
    )
  }

  if (variant === 'compact') {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6, height: '100%', justifyContent: 'center' }}>
        {items.slice(0, 3).map((item, i) => {
          const Icon = item.icon
          return (
            <div key={i} onClick={item.onClick}
              style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', padding: '4px 0' }}>
              <div style={{ width: 24, height: 24, borderRadius: 6, background: `${item.color}15`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <Icon size={12} color={item.color} />
              </div>
              <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text)', flex: 1 }}>{item.title}</span>
              {item.count > 0 && <span style={{ fontSize: 10, fontWeight: 700, color: item.color }}>{item.count}</span>}
            </div>
          )
        })}
      </div>
    )
  }

  if (variant === 'list') {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4, height: '100%', overflow: 'auto' }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)', marginBottom: 4, fontFamily: FONT_DISPLAY }}>Requiere atención</div>
        {items.map((item, i) => {
          const Icon = item.icon
          return (
            <div key={i} onClick={item.onClick}
              style={{
                display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer',
                padding: '10px 8px', borderRadius: 10, transition: 'background .12s',
              }}
              onMouseEnter={e => e.currentTarget.style.background = 'var(--bg2)'}
              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
            >
              <div style={{ width: 32, height: 32, borderRadius: 8, background: `${item.color}15`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, position: 'relative' }}>
                <Icon size={15} color={item.color} />
                {item.count > 0 && <span style={{ position: 'absolute', top: -4, right: -4, minWidth: 16, height: 16, background: item.color, color: '#fff', borderRadius: 8, fontSize: 9, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{item.count}</span>}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--text)' }}>{item.title}</div>
                <div style={{ fontSize: 11, color: 'var(--muted)' }}>{item.description}</div>
              </div>
              <ChevronRight size={14} color="var(--muted)" />
            </div>
          )
        })}
      </div>
    )
  }

  // cards variant
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8, height: '100%', overflow: 'auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
        <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)', fontFamily: FONT_DISPLAY }}>Requiere atención</span>
        <span style={{ fontSize: 10, fontWeight: 700, color: PURPLE, background: pa(0.12), border: `1px solid ${pa(0.25)}`, borderRadius: 20, padding: '2px 8px' }}>
          {items.length}
        </span>
      </div>
      {items.map((item, i) => {
        const Icon = item.icon
        return (
          <button key={i} onClick={item.onClick}
            style={{
              background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 12,
              padding: 14, display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer',
              textAlign: 'left', fontFamily: FONT_BODY, transition: 'border-color .15s',
              width: '100%',
            }}
            onMouseEnter={e => e.currentTarget.style.borderColor = item.color}
            onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border)'}
          >
            <div style={{ width: 38, height: 38, borderRadius: 10, background: `${item.color}15`, border: `1px solid ${item.color}30`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, position: 'relative' }}>
              <Icon size={17} color={item.color} strokeWidth={2} />
              {item.count > 0 && <span style={{ position: 'absolute', top: -5, right: -5, minWidth: 18, height: 18, background: item.color, color: '#fff', borderRadius: 9, fontSize: 10, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', border: '2px solid var(--bg2)' }}>{item.count}</span>}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--text)', marginBottom: 2, fontFamily: FONT_DISPLAY }}>{item.title}</div>
              <div style={{ fontSize: 11, color: 'var(--muted)', lineHeight: 1.4 }}>{item.description}</div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 4, color: 'var(--muted)', fontSize: 11, fontWeight: 600, flexShrink: 0 }}>
              {item.ctaLabel} <ArrowRight size={12} />
            </div>
          </button>
        )
      })}
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════════
// QUICK ACTIONS WIDGET
// ═══════════════════════════════════════════════════════════════════════════════

function QuickActionsWidget({ data, variant }) {
  const navigate = useNavigate()
  const actions = [
    { icon: Plus, label: 'Nueva campaña', path: '/advertiser/campaigns/new', color: PURPLE },
    { icon: Search, label: 'Explorar canales', path: '/advertiser/explore', color: BLUE },
    { icon: Zap, label: 'Auto-Buy', path: '/advertiser/autobuy', color: OK },
    { icon: BarChart3, label: 'Analytics', path: '/advertiser/analytics', color: '#f59e0b' },
    { icon: Target, label: 'Comparar', path: '/advertiser/analyze/compare', color: '#ec4899' },
    { icon: CalendarDays, label: 'Calendario', path: '/advertiser/analyze/calendar', color: '#06b6d4' },
  ]

  if (variant === 'compact') {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, height: '100%', flexWrap: 'wrap' }}>
        {actions.slice(0, 6).map((a, i) => {
          const Icon = a.icon
          return (
            <button key={i} onClick={() => navigate(a.path)}
              style={{
                width: 42, height: 42, borderRadius: 12, border: '1px solid var(--border)',
                background: 'var(--bg2)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                transition: 'border-color .15s, transform .15s',
              }}
              title={a.label}
              onMouseEnter={e => { e.currentTarget.style.borderColor = a.color; e.currentTarget.style.transform = 'translateY(-1px)' }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.transform = 'none' }}
            >
              <Icon size={16} color={a.color} />
            </button>
          )
        })}
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6, height: '100%' }}>
      <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)', fontFamily: FONT_DISPLAY, marginBottom: 4 }}>Acciones rápidas</div>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', flex: 1, alignContent: 'flex-start' }}>
        {actions.map((a, i) => {
          const Icon = a.icon
          return (
            <button key={i} onClick={() => navigate(a.path)}
              style={{
                display: 'flex', alignItems: 'center', gap: 8,
                background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 10,
                padding: '8px 14px', cursor: 'pointer', fontFamily: FONT_BODY,
                transition: 'border-color .15s, transform .15s', fontSize: 12, fontWeight: 500, color: 'var(--text)',
              }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = a.color; e.currentTarget.style.transform = 'translateY(-1px)' }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.transform = 'none' }}
            >
              <Icon size={14} color={a.color} strokeWidth={2} />
              {a.label}
            </button>
          )
        })}
      </div>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════════
// ACTIVITY FEED WIDGET
// ═══════════════════════════════════════════════════════════════════════════════

function ActivityFeedWidget({ data, variant }) {
  const campaigns = data.campaigns || []
  const activities = campaigns.slice(0, 8).map((c, i) => {
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

  if (activities.length === 0) {
    return (
      <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--muted)', fontSize: 13 }}>
        Sin actividad reciente
      </div>
    )
  }

  const compact = variant === 'compact'

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4, height: '100%', overflow: 'auto' }}>
      <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)', marginBottom: 4, fontFamily: FONT_DISPLAY }}>Actividad reciente</div>
      {activities.slice(0, compact ? 4 : 8).map((a, i) => (
        <div key={i} style={{ display: 'flex', gap: 10, padding: '8px 0', borderBottom: '1px solid var(--border)' }}>
          <div style={{ width: 8, height: 8, borderRadius: 4, background: a.color, marginTop: 5, flexShrink: 0 }} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{a.title}</div>
            <div style={{ fontSize: 11, color: 'var(--muted)' }}>{a.msg}</div>
          </div>
          {a.time && (
            <span style={{ fontSize: 10, color: 'var(--muted2)', flexShrink: 0 }}>
              {new Date(a.time).toLocaleDateString('es', { day: 'numeric', month: 'short' })}
            </span>
          )}
        </div>
      ))}
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════════
// TOP CHANNELS WIDGET
// ═══════════════════════════════════════════════════════════════════════════════

function TopChannelsWidget({ data, variant }) {
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
  const channels = Object.values(channelMap).sort((a, b) => b.views - a.views).slice(0, 5)

  if (channels.length === 0) {
    return (
      <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--muted)', fontSize: 13 }}>
        Sin datos de canales
      </div>
    )
  }

  const compact = variant === 'compact'

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4, height: '100%', overflow: 'auto' }}>
      <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)', marginBottom: 4, fontFamily: FONT_DISPLAY }}>Top canales</div>
      {channels.map((ch, i) => (
        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0', borderBottom: i < channels.length - 1 ? '1px solid var(--border)' : 'none' }}>
          <div style={{ width: 28, height: 28, borderRadius: 8, background: pa(0.1), display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, color: PURPLE, flexShrink: 0 }}>
            {i + 1}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{ch.name}</div>
            {!compact && <div style={{ fontSize: 11, color: 'var(--muted)' }}>{ch.count} campaña{ch.count !== 1 ? 's' : ''}</div>}
          </div>
          <div style={{ textAlign: 'right', flexShrink: 0 }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text)' }}>{ch.views.toLocaleString('es')} vistas</div>
            {!compact && <div style={{ fontSize: 11, color: 'var(--muted)' }}>€{ch.spent}</div>}
          </div>
        </div>
      ))}
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════════
// BUDGET DONUT WIDGET
// ═══════════════════════════════════════════════════════════════════════════════

function BudgetDonutWidget({ data, variant }) {
  const campaigns = data.campaigns || []
  const statusBuckets = {}
  campaigns.forEach(c => {
    const key = c.status || 'OTHER'
    if (!statusBuckets[key]) statusBuckets[key] = 0
    statusBuckets[key] += (c.price || c.spent || 0)
  })
  const entries = Object.entries(statusBuckets).filter(([, v]) => v > 0)
  const total = entries.reduce((s, [, v]) => s + v, 0)

  if (total === 0) {
    return (
      <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--muted)', fontSize: 13 }}>
        Sin datos de presupuesto
      </div>
    )
  }

  const colors = [PURPLE, OK, BLUE, WARN, ERR, '#ec4899', '#06b6d4']
  const compact = variant === 'compact'
  const size = compact ? 80 : 110
  const strokeW = compact ? 12 : 16
  const r = (size - strokeW) / 2
  const circ = 2 * Math.PI * r
  let offset = 0

  return (
    <div style={{ display: 'flex', alignItems: compact ? 'center' : 'flex-start', gap: 16, height: '100%', flexDirection: compact ? 'row' : 'column', justifyContent: 'center' }}>
      {!compact && <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)', fontFamily: FONT_DISPLAY }}>Distribución</div>}
      <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
        <svg width={size} height={size} style={{ flexShrink: 0 }}>
          {entries.map(([key, val], i) => {
            const pct = val / total
            const dash = circ * pct
            const gap = circ - dash
            const rot = offset
            offset += pct * 360
            return (
              <circle key={key} cx={size / 2} cy={size / 2} r={r}
                fill="none" stroke={colors[i % colors.length]} strokeWidth={strokeW}
                strokeDasharray={`${dash} ${gap}`}
                strokeDashoffset={0}
                transform={`rotate(${rot - 90} ${size / 2} ${size / 2})`}
                strokeLinecap="round"
              />
            )
          })}
          <text x={size / 2} y={size / 2} textAnchor="middle" dominantBaseline="central"
            fill="var(--text)" fontSize={compact ? 12 : 14} fontWeight={700} fontFamily={FONT_DISPLAY}>
            €{total.toLocaleString('es')}
          </text>
        </svg>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
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
      </div>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════════
// NOTES WIDGET
// ═══════════════════════════════════════════════════════════════════════════════

function NotesWidget({ widgetId }) {
  const storageKey = `channelad-notes-${widgetId}`
  const [text, setText] = useState(() => {
    try { return localStorage.getItem(storageKey) || '' } catch { return '' }
  })
  const save = (val) => {
    setText(val)
    try { localStorage.setItem(storageKey, val) } catch {}
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', gap: 6 }}>
      <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)', fontFamily: FONT_DISPLAY }}>Notas</div>
      <textarea
        value={text}
        onChange={e => save(e.target.value)}
        placeholder="Escribe tus notas aquí..."
        style={{
          flex: 1, width: '100%', resize: 'none', border: '1px solid var(--border)',
          borderRadius: 10, padding: 12, fontSize: 13, fontFamily: FONT_BODY,
          background: 'var(--bg2)', color: 'var(--text)', outline: 'none',
          lineHeight: 1.6,
        }}
        onFocus={e => e.currentTarget.style.borderColor = PURPLE}
        onBlur={e => e.currentTarget.style.borderColor = 'var(--border)'}
      />
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════════
// CAMPAIGN CALENDAR WIDGET
// ═══════════════════════════════════════════════════════════════════════════════

function CampaignCalendarWidget({ data, variant }) {
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
    startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay() + 1)
    const weekDays = Array.from({ length: 7 }, (_, i) => {
      const d = new Date(startOfWeek)
      d.setDate(d.getDate() + i)
      return d
    })
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6, height: '100%' }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)', fontFamily: FONT_DISPLAY }}>Esta semana</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 4, flex: 1 }}>
          {weekDays.map((d, i) => {
            const isToday = d.toDateString() === now.toDateString()
            const hasCampaign = campaigns.some(c => {
              const cd = new Date(c.createdAt || c.startDate)
              return cd.toDateString() === d.toDateString()
            })
            return (
              <div key={i} style={{
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
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
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8, height: '100%' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <button onClick={() => setMonthOffset(o => o - 1)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted)', padding: 4 }}>
          <ChevronLeft size={16} />
        </button>
        <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)', fontFamily: FONT_DISPLAY }}>
          {monthNames[month]} {year}
        </span>
        <button onClick={() => setMonthOffset(o => o + 1)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted)', padding: 4 }}>
          <ChevronRight size={16} />
        </button>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 2 }}>
        {dayNames.map(d => (
          <div key={d} style={{ fontSize: 10, fontWeight: 600, color: 'var(--muted)', textAlign: 'center', padding: '4px 0' }}>{d}</div>
        ))}
        {Array.from({ length: adjustedFirst }).map((_, i) => <div key={`e-${i}`} />)}
        {Array.from({ length: daysInMonth }, (_, i) => i + 1).map(day => {
          const isToday = day === now.getDate() && month === now.getMonth() && year === now.getFullYear()
          const hasCampaign = !!campaignDates[day]
          return (
            <div key={day} style={{
              textAlign: 'center', padding: '5px 2px', borderRadius: 6, position: 'relative',
              background: isToday ? pa(0.15) : 'transparent',
              cursor: hasCampaign ? 'pointer' : 'default',
            }}>
              <span style={{ fontSize: 12, fontWeight: isToday ? 700 : 400, color: isToday ? PURPLE : 'var(--text)' }}>{day}</span>
              {hasCampaign && <div style={{ width: 4, height: 4, borderRadius: 2, background: PURPLE, margin: '2px auto 0' }} />}
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════════
// WIDGET RENDERER (dispatches to the right component)
// ═══════════════════════════════════════════════════════════════════════════════

export default function WidgetRenderer({ type, variant, data, widgetId }) {
  const props = { data, variant, type, widgetId }

  switch (type) {
    case WIDGET_TYPES.WELCOME:          return <WelcomeWidget {...props} />
    case WIDGET_TYPES.KPI_SPEND:
    case WIDGET_TYPES.KPI_CAMPAIGNS:
    case WIDGET_TYPES.KPI_CTR:
    case WIDGET_TYPES.KPI_VIEWS:
    case WIDGET_TYPES.KPI_CLICKS:
    case WIDGET_TYPES.KPI_ROI:          return <KpiWidget {...props} />
    case WIDGET_TYPES.SPEND_CHART:      return <SpendChartWidget {...props} />
    case WIDGET_TYPES.CAMPAIGNS_TABLE:  return <CampaignsTableWidget {...props} />
    case WIDGET_TYPES.ACTION_ITEMS:     return <ActionItemsWidget {...props} />
    case WIDGET_TYPES.QUICK_ACTIONS:    return <QuickActionsWidget {...props} />
    case WIDGET_TYPES.ACTIVITY_FEED:    return <ActivityFeedWidget {...props} />
    case WIDGET_TYPES.TOP_CHANNELS:     return <TopChannelsWidget {...props} />
    case WIDGET_TYPES.BUDGET_DONUT:     return <BudgetDonutWidget {...props} />
    case WIDGET_TYPES.NOTES:            return <NotesWidget {...props} />
    case WIDGET_TYPES.CAMPAIGN_CALENDAR: return <CampaignCalendarWidget {...props} />
    default: return <div style={{ color: 'var(--muted)', fontSize: 13 }}>Widget desconocido: {type}</div>
  }
}
