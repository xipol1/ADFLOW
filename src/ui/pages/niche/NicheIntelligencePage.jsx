import React, { useState, useEffect, useMemo } from 'react'
import { useParams, Link } from 'react-router-dom'
import { Helmet } from 'react-helmet-async'
import {
  TrendingUp, TrendingDown, Users, Target, DollarSign,
  Activity, BarChart3, Clock, ArrowLeft,
} from 'lucide-react'
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts'
import apiService from '../../../../services/api'
import { C } from '../../theme/tokens'
import { CASBadge, ConfianzaBadge, KPICard } from '../../components/scoring'
import { plataformaIcon } from '../../theme/tokens'

// ─── Niche display names ─────────────────────────────────────────────────────
const NICHO_LABELS = {
  crypto: 'Crypto', finanzas: 'Finanzas', tecnologia: 'Tecnología',
  marketing: 'Marketing', ecommerce: 'Ecommerce', salud: 'Salud',
  entretenimiento: 'Entretenimiento', noticias: 'Noticias',
  deporte: 'Deporte', educacion: 'Educación', lifestyle: 'Lifestyle',
  otros: 'Otros',
}
const NICHO_ICONS = {
  crypto: '🪙', finanzas: '💰', tecnologia: '💻', marketing: '📈',
  ecommerce: '🛒', salud: '💊', entretenimiento: '🎬', noticias: '📰',
  deporte: '⚽', educacion: '📚', lifestyle: '💡', otros: '📢',
}

const PERIODS = [
  { key: 30, label: '30d' },
  { key: 90, label: '90d' },
]

// ─── Helpers ─────────────────────────────────────────────────────────────────
const fmtDate = (d) => {
  if (!d) return ''
  const dt = new Date(d)
  return Number.isNaN(dt.getTime()) ? String(d) : dt.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })
}

// ─── Section card ────────────────────────────────────────────────────────────
function SectionCard({ title, subtitle, children, action }) {
  return (
    <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 16, padding: 24 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20, gap: 12, flexWrap: 'wrap' }}>
        <div>
          <h3 style={{ color: C.t1, fontSize: 15, fontWeight: 700, margin: 0 }}>{title}</h3>
          {subtitle && <div style={{ color: C.t3, fontSize: 11, marginTop: 3 }}>{subtitle}</div>}
        </div>
        {action}
      </div>
      {children}
    </div>
  )
}

// ─── Chart tooltip ───────────────────────────────────────────────────────────
function ChartTip({ active, payload, label }) {
  if (!active || !payload?.length) return null
  return (
    <div style={{ background: C.surfaceEl, border: `1px solid ${C.borderEl}`, borderRadius: 8, padding: 12, fontFamily: 'JetBrains Mono, monospace', fontSize: 12 }}>
      <div style={{ color: C.t2, marginBottom: 6 }}>{fmtDate(label)}</div>
      {payload.map((p) => (
        <div key={p.dataKey} style={{ display: 'flex', justifyContent: 'space-between', gap: 16, color: p.color }}>
          <span>{p.name || p.dataKey}</span>
          <span style={{ fontWeight: 600 }}>{typeof p.value === 'number' ? p.value.toFixed(1) : p.value}</span>
        </div>
      ))}
    </div>
  )
}

// ─── Section 1: Leaderboard ──────────────────────────────────────────────────
function LeaderboardSection({ data, nicho }) {
  if (!data || data.length === 0) {
    return (
      <SectionCard title={`Top canales en ${NICHO_LABELS[nicho] || nicho}`}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: 160, color: C.t3, gap: 8 }}>
          <Users size={22} />
          <span style={{ fontSize: 12 }}>Aún no hay canales verificados en este nicho</span>
        </div>
      </SectionCard>
    )
  }

  return (
    <SectionCard title={`Top ${data.length} canales en ${NICHO_LABELS[nicho] || nicho}`} subtitle="Ranking anónimo por CAS Score">
      <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        {/* Header row */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 0', borderBottom: `1px solid ${C.border}`, fontSize: 10, color: C.t3, textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: 600 }}>
          <span style={{ width: 28, textAlign: 'center' }}>#</span>
          <span style={{ flex: 1 }}>Canal</span>
          <span style={{ width: 64, textAlign: 'center' }}>Plataforma</span>
          <span style={{ width: 72, textAlign: 'center' }}>CAS</span>
          <span style={{ width: 64, textAlign: 'right' }}>CPM</span>
          <span style={{ width: 64, textAlign: 'right' }}>Trust</span>
        </div>

        {data.map((ch) => (
          <div
            key={ch.rank}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              padding: '10px 0',
              borderBottom: `1px solid ${C.border}`,
              fontSize: 12,
            }}
          >
            {/* Rank */}
            <span
              className="font-mono"
              style={{
                width: 28,
                textAlign: 'center',
                color: ch.rank <= 3 ? C.gold : C.t2,
                fontWeight: ch.rank <= 3 ? 700 : 400,
                fontSize: ch.rank <= 3 ? 14 : 12,
              }}
            >
              {ch.rank}
            </span>

            {/* Name (anonymized) */}
            <span style={{ flex: 1, color: C.t1, fontWeight: 500, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {ch.nombre}
            </span>

            {/* Platform */}
            <span style={{ width: 64, textAlign: 'center', fontSize: 16 }}>
              {plataformaIcon[ch.plataforma] || '📡'}
            </span>

            {/* CAS Badge */}
            <span style={{ width: 72, display: 'flex', justifyContent: 'center' }}>
              <CASBadge CAS={ch.CAS} nivel={ch.nivel} size="xs" />
            </span>

            {/* CPM */}
            <span className="font-mono" style={{ width: 64, textAlign: 'right', color: C.teal, fontWeight: 600 }}>
              €{(ch.CPMDinamico || 0).toFixed(1)}
            </span>

            {/* Trust */}
            <span style={{ width: 64, display: 'flex', justifyContent: 'flex-end' }}>
              <ConfianzaBadge score={ch.confianzaScore} fuente="declarado" />
            </span>
          </div>
        ))}
      </div>
    </SectionCard>
  )
}

// ─── Section 2: Market Trends ────────────────────────────────────────────────
function TrendsSection({ data, period, onPeriodChange, nicho }) {
  const delta = useMemo(() => {
    if (!data || data.length < 2) return null
    const first = data[0]
    const last = data[data.length - 1]
    return {
      cas: Math.round(((last.avgCAS || 0) - (first.avgCAS || 0)) * 10) / 10,
      cpm: Math.round(((last.avgCPM || 0) - (first.avgCPM || 0)) * 100) / 100,
    }
  }, [data])

  const periodTabs = (
    <div style={{ display: 'flex', gap: 2, background: C.surfaceEl, borderRadius: 10, padding: 3 }}>
      {PERIODS.map((p) => {
        const active = period === p.key
        return (
          <button key={p.key} onClick={() => onPeriodChange(p.key)} className="font-mono"
            style={{
              background: active ? C.tealDim : 'transparent',
              color: active ? C.teal : C.t3,
              border: active ? `1px solid ${C.teal}44` : '1px solid transparent',
              borderRadius: 8, padding: '6px 14px', fontSize: 12,
              fontWeight: active ? 700 : 500, cursor: 'pointer', fontFamily: 'inherit',
            }}
          >{p.label}</button>
        )
      })}
    </div>
  )

  if (!data || data.length < 2) {
    return (
      <SectionCard title="Tendencias del mercado" action={periodTabs}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: 200, color: C.t3, gap: 8 }}>
          <Clock size={22} />
          <span style={{ fontSize: 12 }}>Datos de tendencia disponibles próximamente</span>
        </div>
      </SectionCard>
    )
  }

  return (
    <SectionCard title={`Tendencias — ${NICHO_LABELS[nicho] || nicho}`} action={periodTabs}>
      <ResponsiveContainer width="100%" height={280}>
        <LineChart data={data} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
          <CartesianGrid stroke={C.border} strokeDasharray="3 3" />
          <XAxis dataKey="fecha" tickFormatter={fmtDate} stroke={C.t3} tick={{ fontSize: 11, fill: C.t3 }} tickLine={false} axisLine={{ stroke: C.border }} />
          <YAxis yAxisId="cas" domain={[0, 100]} ticks={[0, 25, 50, 75, 100]} stroke={C.t3} tick={{ fontSize: 11, fill: C.t3 }} tickLine={false} axisLine={{ stroke: C.border }} />
          <YAxis yAxisId="cpm" orientation="right" stroke={C.t3} tick={{ fontSize: 11, fill: C.t3 }} tickLine={false} axisLine={{ stroke: C.border }} tickFormatter={(v) => `€${v}`} />
          <Tooltip content={<ChartTip />} cursor={{ stroke: C.borderEl }} />
          <Legend iconType="line" wrapperStyle={{ fontSize: 12, color: C.t2 }} />
          <Line yAxisId="cas" type="monotone" dataKey="avgCAS" name="CAS medio" stroke={C.teal} strokeWidth={2.5} dot={false} />
          <Line yAxisId="cas" type="monotone" dataKey="avgCTF" name="CTF medio" stroke={C.adv} strokeWidth={2} strokeDasharray="4 2" dot={false} />
          <Line yAxisId="cpm" type="monotone" dataKey="avgCPM" name="CPM medio" stroke={C.gold} strokeWidth={2} strokeDasharray="2 2" dot={false} />
        </LineChart>
      </ResponsiveContainer>

      {/* Delta summary */}
      {delta && (
        <div style={{ display: 'flex', gap: 20, marginTop: 16, flexWrap: 'wrap' }}>
          <div className="font-mono" style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13 }}>
            {delta.cas >= 0 ? <TrendingUp size={14} color={C.ok} /> : <TrendingDown size={14} color={C.alert} />}
            <span style={{ color: delta.cas >= 0 ? C.ok : C.alert, fontWeight: 600 }}>
              CAS {delta.cas > 0 ? '+' : ''}{delta.cas}
            </span>
            <span style={{ color: C.t3 }}>vs hace {period}d</span>
          </div>
          <div className="font-mono" style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13 }}>
            {delta.cpm <= 0 ? <TrendingDown size={14} color={C.ok} /> : <TrendingUp size={14} color={C.warn} />}
            <span style={{ color: delta.cpm <= 0 ? C.ok : C.warn, fontWeight: 600 }}>
              CPM {delta.cpm > 0 ? '+' : ''}€{delta.cpm.toFixed(1)}
            </span>
          </div>
        </div>
      )}
    </SectionCard>
  )
}

// ─── Section 3: Supply vs Demand ─────────────────────────────────────────────
function SupplyDemandSection({ data, nicho }) {
  if (!data) {
    return (
      <SectionCard title="Oferta vs Demanda">
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: 120, color: C.t3, gap: 8 }}>
          <Activity size={22} />
          <span style={{ fontSize: 12 }}>Sin datos de mercado para este nicho</span>
        </div>
      </SectionCard>
    )
  }

  const {
    totalChannels, availableChannels, demandLast30d, avgCPM, avgCAS,
    priceRange, sentiment,
  } = data

  const occupancyPct = totalChannels > 0
    ? Math.round((availableChannels / totalChannels) * 100)
    : 0

  const sentimentConfig = {
    alta_demanda:  { label: 'Alta demanda — precios al alza', color: C.gold, icon: '🔥' },
    equilibrado:   { label: 'Mercado equilibrado', color: C.teal, icon: '⚖️' },
    alta_oferta:   { label: 'Alta oferta — precios competitivos', color: C.ok, icon: '📉' },
  }
  const sent = sentimentConfig[sentiment] || sentimentConfig.equilibrado

  return (
    <SectionCard title={`Mercado — ${NICHO_LABELS[nicho] || nicho}`}>
      {/* Sentiment badge */}
      <div
        style={{
          background: `${sent.color}18`,
          border: `1px solid ${sent.color}44`,
          borderRadius: 12,
          padding: '12px 16px',
          marginBottom: 20,
          display: 'flex',
          alignItems: 'center',
          gap: 10,
        }}
      >
        <span style={{ fontSize: 20 }}>{sent.icon}</span>
        <div>
          <div style={{ color: sent.color, fontSize: 14, fontWeight: 700 }}>{sent.label}</div>
          <div style={{ color: C.t3, fontSize: 11, marginTop: 2 }}>
            {demandLast30d} campañas en los últimos 30 días · {availableChannels} de {totalChannels} canales disponibles
          </div>
        </div>
      </div>

      {/* Availability gauge */}
      <div style={{ marginBottom: 20 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
          <span style={{ color: C.t2, fontSize: 12 }}>Disponibilidad</span>
          <span className="font-mono" style={{ color: C.t1, fontSize: 12, fontWeight: 600 }}>{occupancyPct}%</span>
        </div>
        <div style={{ height: 8, background: C.border, borderRadius: 999, overflow: 'hidden' }}>
          <div
            style={{
              width: `${occupancyPct}%`,
              height: '100%',
              background: occupancyPct > 60 ? C.ok : occupancyPct > 30 ? C.warn : C.alert,
              borderRadius: 999,
              transition: 'width 400ms',
            }}
          />
        </div>
      </div>

      {/* Stats grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: 12 }}>
        <div style={{ background: C.surfaceEl, borderRadius: 10, padding: 14, textAlign: 'center' }}>
          <div className="font-mono" style={{ color: C.t1, fontSize: 20, fontWeight: 700 }}>{totalChannels}</div>
          <div style={{ color: C.t3, fontSize: 10, marginTop: 2, textTransform: 'uppercase' }}>Canales</div>
        </div>
        <div style={{ background: C.surfaceEl, borderRadius: 10, padding: 14, textAlign: 'center' }}>
          <div className="font-mono" style={{ color: C.ok, fontSize: 20, fontWeight: 700 }}>{availableChannels}</div>
          <div style={{ color: C.t3, fontSize: 10, marginTop: 2, textTransform: 'uppercase' }}>Disponibles</div>
        </div>
        <div style={{ background: C.surfaceEl, borderRadius: 10, padding: 14, textAlign: 'center' }}>
          <div className="font-mono" style={{ color: C.teal, fontSize: 20, fontWeight: 700 }}>€{avgCPM.toFixed(1)}</div>
          <div style={{ color: C.t3, fontSize: 10, marginTop: 2, textTransform: 'uppercase' }}>CPM medio</div>
        </div>
        <div style={{ background: C.surfaceEl, borderRadius: 10, padding: 14, textAlign: 'center' }}>
          <div className="font-mono" style={{ color: C.gold, fontSize: 20, fontWeight: 700 }}>{demandLast30d}</div>
          <div style={{ color: C.t3, fontSize: 10, marginTop: 2, textTransform: 'uppercase' }}>Campañas/30d</div>
        </div>
        <div style={{ background: C.surfaceEl, borderRadius: 10, padding: 14, textAlign: 'center' }}>
          <div className="font-mono" style={{ color: C.t1, fontSize: 20, fontWeight: 700 }}>{avgCAS.toFixed(0)}</div>
          <div style={{ color: C.t3, fontSize: 10, marginTop: 2, textTransform: 'uppercase' }}>CAS medio</div>
        </div>
        <div style={{ background: C.surfaceEl, borderRadius: 10, padding: 14, textAlign: 'center' }}>
          <div className="font-mono" style={{ color: C.t1, fontSize: 16, fontWeight: 700 }}>
            €{priceRange.min}–{priceRange.max}
          </div>
          <div style={{ color: C.t3, fontSize: 10, marginTop: 2, textTransform: 'uppercase' }}>Rango precios</div>
        </div>
      </div>
    </SectionCard>
  )
}

// ─── Main Page ───────────────────────────────────────────────────────────────
export default function NicheIntelligencePage() {
  const { nicho } = useParams()
  const nichoNorm = (nicho || '').toLowerCase()
  const label = NICHO_LABELS[nichoNorm] || nichoNorm
  const icon = NICHO_ICONS[nichoNorm] || '📢'

  const [leaderboard, setLeaderboard] = useState(null)
  const [trends, setTrends] = useState(null)
  const [supplyDemand, setSupplyDemand] = useState(null)
  const [trendPeriod, setTrendPeriod] = useState(30)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  // Load leaderboard + supply-demand on mount
  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)

    Promise.all([
      apiService.getNicheLeaderboard(nichoNorm, 10).catch(() => null),
      apiService.getNicheSupplyDemand(nichoNorm).catch(() => null),
    ]).then(([lbRes, sdRes]) => {
      if (cancelled) return
      if (lbRes?.success) setLeaderboard(lbRes.data)
      if (sdRes?.success) setSupplyDemand(sdRes.data)
      setLoading(false)
    })

    return () => { cancelled = true }
  }, [nichoNorm])

  // Load trends (re-fetch on period change)
  useEffect(() => {
    let cancelled = false
    apiService.getNicheTrends(nichoNorm, trendPeriod)
      .then((res) => { if (!cancelled && res?.success) setTrends(res.data) })
      .catch(() => {})
    return () => { cancelled = true }
  }, [nichoNorm, trendPeriod])

  const pageTitle = `${icon} ${label} — Inteligencia de mercado · Channelad`
  const pageDesc = `Datos del mercado de publicidad en ${label}: ranking de canales, tendencias de CAS y CPM, oferta vs demanda.`

  return (
    <div style={{ background: C.bg, minHeight: '100vh', color: C.t1, fontFamily: 'DM Sans, Inter, system-ui, sans-serif' }}>
      <Helmet>
        <title>{pageTitle}</title>
        <meta name="description" content={pageDesc} />
      </Helmet>

      <div style={{ maxWidth: 900, margin: '0 auto', padding: '32px 24px' }}>
        {/* Breadcrumb */}
        <Link
          to="/marketplace"
          style={{
            display: 'inline-flex', alignItems: 'center', gap: 6,
            color: C.t3, fontSize: 12, textDecoration: 'none',
            marginBottom: 20,
          }}
        >
          <ArrowLeft size={12} /> Marketplace
        </Link>

        {/* Header */}
        <div style={{ marginBottom: 28 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 6 }}>
            <span style={{ fontSize: 32 }}>{icon}</span>
            <h1 style={{ fontSize: 28, fontWeight: 800, letterSpacing: '-0.03em', margin: 0 }}>
              {label}
            </h1>
          </div>
          <p style={{ color: C.t2, fontSize: 14, margin: 0 }}>
            Inteligencia de mercado — ranking, tendencias y oferta vs demanda
          </p>
        </div>

        {/* Loading */}
        {loading ? (
          <div className="animate-pulse" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {[300, 280, 200].map((h, i) => (
              <div key={i} style={{ height: h, background: C.surfaceEl, borderRadius: 16 }} />
            ))}
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            <LeaderboardSection data={leaderboard} nicho={nichoNorm} />
            <TrendsSection data={trends} period={trendPeriod} onPeriodChange={setTrendPeriod} nicho={nichoNorm} />
            <SupplyDemandSection data={supplyDemand} nicho={nichoNorm} />
          </div>
        )}

        {/* All niches navigation */}
        <div style={{ marginTop: 40, padding: '20px 0', borderTop: `1px solid ${C.border}` }}>
          <div style={{ color: C.t3, fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: 600, marginBottom: 12 }}>
            Otros nichos
          </div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {Object.entries(NICHO_LABELS).filter(([k]) => k !== nichoNorm).map(([key, name]) => (
              <Link
                key={key}
                to={`/niche/${key}`}
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: 4,
                  background: C.surfaceEl, border: `1px solid ${C.border}`,
                  borderRadius: 999, padding: '5px 12px',
                  color: C.t2, fontSize: 12, textDecoration: 'none',
                  transition: 'all 150ms',
                }}
                onMouseEnter={(e) => { e.currentTarget.style.borderColor = C.teal; e.currentTarget.style.color = C.teal }}
                onMouseLeave={(e) => { e.currentTarget.style.borderColor = C.border; e.currentTarget.style.color = C.t2 }}
              >
                <span>{NICHO_ICONS[key]}</span> {name}
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
