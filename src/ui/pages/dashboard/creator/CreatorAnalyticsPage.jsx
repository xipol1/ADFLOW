import React, { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { Clock, TrendingUp, TrendingDown, AlertTriangle, Radio } from 'lucide-react'
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ReferenceDot,
} from 'recharts'
import { useAuth } from '../../../../auth/AuthContext'
import apiService from '../../../../../services/api'
import { C } from '../../../theme/tokens'
import { FONT_BODY as F, FONT_DISPLAY as D } from '../../../theme/tokens'
import { BenchmarkBar } from '../../../components/scoring'
import { Sparkline, ErrorBanner } from '../shared/DashComponents'

// ─── CPM formula (replicated from config/nicheBenchmarks.js) ─────────────────
const CPM_BASE = {
  whatsapp: 20, newsletter: 28, instagram: 22, telegram: 14,
  facebook: 13, discord: 9, blog: 8,
}
const calcCPM = (plat, cas) => {
  const base = CPM_BASE[plat] || 14
  if (!cas || cas <= 0) return base
  return base * Math.pow(cas / 50, 1.3)
}

// ─── Helpers ─────────────────────────────────────────────────────────────────
const fmtDate = (d) => {
  if (!d) return ''
  const dt = new Date(d)
  if (Number.isNaN(dt.getTime())) return String(d)
  return dt.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })
}

const PERIODS = [
  { key: '7d',  label: '7 días',  days: 7 },
  { key: '30d', label: '30 días', days: 30 },
  { key: '90d', label: '90 días', days: 90 },
]

// ─── Reusable section card ───────────────────────────────────────────────────
function SectionCard({ title, subtitle, children, action }) {
  return (
    <div
      style={{
        background: C.surface,
        border: `1px solid ${C.border}`,
        borderRadius: 16,
        padding: 24,
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: 20,
          gap: 12,
          flexWrap: 'wrap',
        }}
      >
        <div>
          <h3 style={{ color: C.t1, fontSize: 15, fontWeight: 700, margin: 0, fontFamily: D }}>
            {title}
          </h3>
          {subtitle && (
            <div style={{ color: C.t3, fontSize: 11, marginTop: 3 }}>{subtitle}</div>
          )}
        </div>
        {action}
      </div>
      {children}
    </div>
  )
}

// ─── Period selector ─────────────────────────────────────────────────────────
function PeriodTabs({ period, onChange }) {
  return (
    <div
      style={{
        display: 'flex',
        gap: 2,
        background: C.surfaceEl,
        borderRadius: 10,
        padding: 3,
      }}
    >
      {PERIODS.map((p) => {
        const active = period === p.key
        return (
          <button
            key={p.key}
            onClick={() => onChange(p.key)}
            className="font-mono"
            style={{
              background: active ? C.tealDim : 'transparent',
              color: active ? C.teal : C.t3,
              border: active ? `1px solid ${C.teal}44` : '1px solid transparent',
              borderRadius: 8,
              padding: '6px 14px',
              fontSize: 12,
              fontWeight: active ? 700 : 500,
              cursor: 'pointer',
              fontFamily: 'inherit',
              transition: 'all 150ms',
            }}
          >
            {p.label}
          </button>
        )
      })}
    </div>
  )
}

// ─── Custom chart tooltip ────────────────────────────────────────────────────
function ChartTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null
  return (
    <div
      style={{
        background: C.surfaceEl,
        border: `1px solid ${C.borderEl}`,
        borderRadius: 8,
        padding: 12,
        fontFamily: 'JetBrains Mono, monospace',
        fontSize: 12,
      }}
    >
      <div style={{ color: C.t2, marginBottom: 6 }}>{fmtDate(label)}</div>
      {payload.map((p) => (
        <div
          key={p.dataKey}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 16,
            color: p.color,
          }}
        >
          <span>{p.dataKey}</span>
          <span style={{ fontWeight: 600 }}>{p.value}</span>
        </div>
      ))}
    </div>
  )
}

// ─── Section 1: CAS Evolution ────────────────────────────────────────────────
function CASEvolutionSection({ historial, period, onPeriodChange, campaignDates }) {
  const periodDays = PERIODS.find((p) => p.key === period)?.days || 30

  const data = useMemo(() => {
    if (!Array.isArray(historial) || historial.length === 0) return []
    const sorted = historial
      .slice()
      .sort((a, b) => new Date(a.fecha) - new Date(b.fecha))
    const cutoff = new Date(Date.now() - periodDays * 86400000)
    return sorted.filter((d) => new Date(d.fecha) >= cutoff)
  }, [historial, periodDays])

  // Delta computation
  const delta = useMemo(() => {
    if (data.length < 2) return null
    return data[data.length - 1].CAS - data[0].CAS
  }, [data])

  // Campaign completion dots
  const campaignDots = useMemo(() => {
    if (!campaignDates?.length || !data.length) return []
    return data.filter((d) => {
      const dDate = new Date(d.fecha).toDateString()
      return campaignDates.some((cd) => new Date(cd).toDateString() === dDate)
    })
  }, [data, campaignDates])

  if (!Array.isArray(historial) || historial.length < 2) {
    return (
      <SectionCard title="Evolución CAS" action={<PeriodTabs period={period} onChange={onPeriodChange} />}>
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            height: 200,
            color: C.t3,
            gap: 8,
          }}
        >
          <Clock size={22} />
          <span style={{ fontSize: 12 }}>Historial disponible desde mañana</span>
        </div>
      </SectionCard>
    )
  }

  return (
    <SectionCard title="Evolución CAS" action={<PeriodTabs period={period} onChange={onPeriodChange} />}>
      <ResponsiveContainer width="100%" height={320}>
        <LineChart data={data} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
          <CartesianGrid stroke={C.border} strokeDasharray="3 3" />
          <XAxis
            dataKey="fecha"
            tickFormatter={fmtDate}
            stroke={C.t3}
            tick={{ fontSize: 11, fill: C.t3 }}
            tickLine={false}
            axisLine={{ stroke: C.border }}
          />
          <YAxis
            domain={[0, 100]}
            ticks={[0, 25, 50, 75, 100]}
            stroke={C.t3}
            tick={{ fontSize: 11, fill: C.t3 }}
            tickLine={false}
            axisLine={{ stroke: C.border }}
          />
          <Tooltip content={<ChartTooltip />} cursor={{ stroke: C.borderEl }} />
          <Legend iconType="line" wrapperStyle={{ fontSize: 12, color: C.t2 }} />
          <Line type="monotone" dataKey="CAS" stroke={C.teal} strokeWidth={2.5} dot={false} activeDot={{ r: 4, fill: C.teal }} />
          <Line type="monotone" dataKey="CTF" stroke={C.adv} strokeWidth={2} strokeDasharray="4 2" dot={false} />
          <Line type="monotone" dataKey="CAP" stroke={C.cre} strokeWidth={2} strokeDasharray="2 2" dot={false} />
          {campaignDots.map((d, i) => (
            <ReferenceDot
              key={i}
              x={d.fecha}
              y={d.CAS}
              r={5}
              fill={C.gold}
              stroke={C.bg}
              strokeWidth={2}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>

      {/* Delta summary */}
      {delta !== null && (
        <div
          className="font-mono"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            marginTop: 16,
            fontSize: 13,
          }}
        >
          {delta > 0 ? (
            <TrendingUp size={14} color={C.ok} />
          ) : delta < 0 ? (
            <TrendingDown size={14} color={C.alert} />
          ) : null}
          <span style={{ color: delta > 0 ? C.ok : delta < 0 ? C.alert : C.t2, fontWeight: 600 }}>
            CAS {delta > 0 ? '+' : ''}{delta}
          </span>
          <span style={{ color: C.t3 }}>vs hace {periodDays} días</span>
        </div>
      )}
    </SectionCard>
  )
}

// ─── Section 2: Score Decomposition ──────────────────────────────────────────
const COMPONENTS = [
  { key: 'CAF', label: 'CAF', desc: 'Channel Attention Flow', hasHistory: true },
  { key: 'CTF', label: 'CTF', desc: 'Channel Trust Flow', hasHistory: true },
  { key: 'CER', label: 'CER', desc: 'Channel Engagement Rate', hasHistory: true },
  { key: 'CVS', label: 'CVS', desc: 'Channel Velocity Score', hasHistory: true },
  { key: 'CAP', label: 'CAP', desc: 'Channel Ad Performance', hasHistory: true },
]

function ScoreDecompositionSection({ scores, historial }) {
  if (!scores) {
    return (
      <SectionCard title="Composición del score" subtitle="Desglose de los 5 componentes">
        <div style={{ color: C.t3, fontSize: 12, textAlign: 'center', padding: '24px 0' }}>
          Datos insuficientes — publica tu primer canal para ver tu puntuación
        </div>
      </SectionCard>
    )
  }

  const sorted = useMemo(() => {
    if (!Array.isArray(historial) || historial.length === 0) return []
    return historial
      .slice()
      .sort((a, b) => new Date(a.fecha) - new Date(b.fecha))
      .slice(-30)
  }, [historial])

  return (
    <SectionCard title="Composición del score" subtitle="Desglose de los 5 componentes con tendencia de 30 días">
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        {COMPONENTS.map((comp) => {
          const current = scores[comp.key] ?? null
          const sparkData = comp.hasHistory && sorted.length >= 2
            ? sorted.map((s) => s[comp.key] ?? 0)
            : null
          const delta =
            sparkData && sparkData.length >= 2
              ? sparkData[sparkData.length - 1] - sparkData[0]
              : null
          const alert = delta !== null && delta <= -10

          return (
            <div key={comp.key}>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  padding: '8px 0',
                }}
              >
                {/* Label */}
                <span
                  className="font-mono"
                  title={comp.desc}
                  style={{
                    color: C.t2,
                    fontSize: 12,
                    fontWeight: 600,
                    width: 32,
                    flexShrink: 0,
                    cursor: 'help',
                  }}
                >
                  {comp.label}
                </span>

                {/* Bar */}
                <div
                  style={{
                    flex: 1,
                    height: 6,
                    background: C.border,
                    borderRadius: 999,
                    overflow: 'hidden',
                  }}
                >
                  <div
                    style={{
                      width: `${Math.max(0, Math.min(100, current ?? 0))}%`,
                      height: '100%',
                      background: C.teal,
                      borderRadius: 999,
                      transition: 'width 400ms',
                    }}
                  />
                </div>

                {/* Current value */}
                <span
                  className="font-mono"
                  style={{ color: C.t1, fontSize: 12, fontWeight: 600, width: 28, textAlign: 'right', flexShrink: 0 }}
                >
                  {current != null ? Math.round(current) : '--'}
                </span>

                {/* Sparkline or placeholder */}
                <div style={{ width: 84, flexShrink: 0, display: 'flex', justifyContent: 'center' }}>
                  {sparkData ? (
                    <Sparkline data={sparkData} color={C.teal} w={84} h={28} />
                  ) : (
                    <span
                      className="font-mono"
                      style={{ color: C.t3, fontSize: 10 }}
                      title="Historial detallado disponible próximamente"
                    >
                      —
                    </span>
                  )}
                </div>

                {/* Delta badge */}
                <span
                  className="font-mono"
                  style={{
                    color: delta == null ? C.t3 : delta > 0 ? C.ok : delta < 0 ? C.alert : C.t2,
                    fontSize: 11,
                    fontWeight: 600,
                    width: 40,
                    textAlign: 'right',
                    flexShrink: 0,
                  }}
                >
                  {delta != null ? `${delta > 0 ? '+' : ''}${delta}` : '—'}
                </span>
              </div>

              {/* Alert */}
              {alert && (
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                    color: C.warn,
                    fontSize: 11,
                    marginLeft: 44,
                    marginTop: 2,
                  }}
                >
                  <AlertTriangle size={12} />
                  <span>
                    {comp.label} bajó {Math.abs(delta)} puntos — revisa tu {comp.desc.toLowerCase()}
                  </span>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </SectionCard>
  )
}

// ─── Section 3: Benchmark Matrix ─────────────────────────────────────────────
function BenchmarkMatrixSection({ scores, benchmark, plataforma }) {
  if (!scores || !benchmark) {
    return (
      <SectionCard title="Benchmark vs nicho">
        <div style={{ color: C.t3, fontSize: 12, textAlign: 'center', padding: '24px 0' }}>
          Necesitamos más datos para comparar tu canal con el nicho
        </div>
      </SectionCard>
    )
  }

  const { nichoMediaCTR, posicionNicho } = benchmark
  const currentCPM = scores.CPMDinamico || 0
  const benchmarkCPM = calcCPM(plataforma, 50) // CAS=50 = niche median CPM

  // Implied CTR from benchmark data
  const parseDelta = (str) => {
    if (!str) return null
    const m = String(str).match(/([+-]?)(\d+)/)
    if (!m) return null
    return (m[1] === '-' ? -1 : 1) * Number(m[2])
  }
  const ctrDelta = parseDelta(benchmark.canalCTRRatio)
  const canalCTR =
    nichoMediaCTR != null && ctrDelta != null
      ? Number(((1 + ctrDelta / 100) * nichoMediaCTR).toFixed(3))
      : null

  return (
    <SectionCard title="Benchmark vs nicho">
      {/* Position badge */}
      {posicionNicho && (
        <div
          className="font-mono"
          style={{
            background: C.tealDim,
            color: C.teal,
            border: `1px solid ${C.teal}33`,
            borderRadius: 999,
            padding: '6px 16px',
            fontSize: 12,
            fontWeight: 600,
            textAlign: 'center',
            marginBottom: 20,
          }}
        >
          Tu canal está en el {posicionNicho}
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
        {/* CTR */}
        {canalCTR != null && nichoMediaCTR != null && (
          <BenchmarkBar
            label="CTR"
            valor={Number(canalCTR.toFixed(2))}
            benchmark={Number(nichoMediaCTR.toFixed(2))}
            unidad="%"
          />
        )}

        {/* CPM (invertido) */}
        {currentCPM > 0 && (
          <BenchmarkBar
            label="CPM"
            valor={Number(currentCPM.toFixed(1))}
            benchmark={Number(benchmarkCPM.toFixed(1))}
            unidad="€"
            invertido
          />
        )}

        {/* CAS vs median */}
        {scores.CAS != null && (
          <BenchmarkBar
            label="CAS Score"
            valor={Math.round(scores.CAS)}
            benchmark={50}
          />
        )}

        {/* Engagement */}
        {scores.CER != null && (
          <BenchmarkBar
            label="Engagement"
            valor={Math.round(scores.CER)}
            benchmark={50}
          />
        )}
      </div>
    </SectionCard>
  )
}

// ─── Section 4: CPM Simulator ────────────────────────────────────────────────
function CPMSimulatorSection({ currentCAS, currentCPM, plataforma }) {
  const [targetCAS, setTargetCAS] = useState(currentCAS || 50)

  const estimatedCPM = calcCPM(plataforma, targetCAS)
  const deltaCPM = currentCPM ? estimatedCPM - currentCPM : 0
  const improvement = currentCPM && currentCPM > 0
    ? Math.max(0, Math.round((1 - estimatedCPM / currentCPM) * 100))
    : 0

  if (!currentCAS && currentCAS !== 0) {
    return (
      <SectionCard title="Simulador de CPM">
        <div style={{ color: C.t3, fontSize: 12, textAlign: 'center', padding: '24px 0' }}>
          Registra un canal para simular tu CPM
        </div>
      </SectionCard>
    )
  }

  const showSummary = targetCAS !== currentCAS

  return (
    <SectionCard
      title="Simulador de CPM"
      subtitle="Simula cómo tu CPM cambia al mejorar tu CAS Score"
    >
      {/* Slider */}
      <div style={{ marginBottom: 24 }}>
        <div
          className="font-mono"
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            marginBottom: 8,
            fontSize: 12,
            color: C.t2,
          }}
        >
          <span>CAS objetivo</span>
          <span style={{ color: C.teal, fontWeight: 700, fontSize: 16 }}>{targetCAS}</span>
        </div>
        <input
          type="range"
          min={0}
          max={100}
          step={1}
          value={targetCAS}
          onChange={(e) => setTargetCAS(Number(e.target.value))}
          style={{ width: '100%', accentColor: C.teal }}
        />
        <div
          className="font-mono"
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            marginTop: 4,
            fontSize: 10,
            color: C.t3,
          }}
        >
          <span>0</span>
          <span>50</span>
          <span>100</span>
        </div>
      </div>

      {/* Current vs Estimated */}
      <div
        style={{
          display: 'flex',
          gap: 16,
          marginBottom: 20,
          flexWrap: 'wrap',
        }}
      >
        <div
          style={{
            flex: 1,
            background: C.surfaceEl,
            borderRadius: 12,
            padding: 16,
            minWidth: 140,
          }}
        >
          <div style={{ color: C.t3, fontSize: 11, marginBottom: 6 }}>CPM actual</div>
          <div
            className="font-mono"
            style={{ color: C.t2, fontSize: 24, fontWeight: 700 }}
          >
            €{(currentCPM || 0).toFixed(1)}
          </div>
          <div className="font-mono" style={{ color: C.t3, fontSize: 11, marginTop: 4 }}>
            CAS {currentCAS}
          </div>
        </div>
        <div
          style={{
            flex: 1,
            background: C.surfaceEl,
            borderRadius: 12,
            padding: 16,
            border: showSummary ? `1px solid ${C.teal}44` : `1px solid transparent`,
            minWidth: 140,
          }}
        >
          <div style={{ color: C.t3, fontSize: 11, marginBottom: 6 }}>CPM estimado</div>
          <div
            className="font-mono"
            style={{ color: C.teal, fontSize: 24, fontWeight: 700 }}
          >
            €{estimatedCPM.toFixed(1)}
          </div>
          <div className="font-mono" style={{ color: C.t3, fontSize: 11, marginTop: 4 }}>
            CAS {targetCAS}
          </div>
        </div>
      </div>

      {/* Summary sentence */}
      {showSummary && (
        <div
          style={{
            background: deltaCPM < 0 ? C.okDim : C.warnDim,
            border: `1px solid ${deltaCPM < 0 ? `${C.ok}44` : `${C.warn}44`}`,
            borderRadius: 12,
            padding: '12px 16px',
            fontSize: 13,
            lineHeight: 1.6,
            color: deltaCPM < 0 ? C.ok : C.warn,
          }}
        >
          Si tu CAS {targetCAS > currentCAS ? 'sube' : 'baja'} de{' '}
          <strong>{currentCAS}</strong> a <strong>{targetCAS}</strong>, tu CPM{' '}
          {deltaCPM < 0 ? 'baja' : 'sube'} de{' '}
          <strong>€{(currentCPM || 0).toFixed(1)}</strong> a{' '}
          <strong>€{estimatedCPM.toFixed(1)}</strong>
          {improvement > 0 && deltaCPM < 0 && (
            <span> — atraerías ~{improvement}% más anunciantes</span>
          )}
        </div>
      )}
    </SectionCard>
  )
}

// ─── Main Page ───────────────────────────────────────────────────────────────
export default function CreatorAnalyticsPage() {
  const { user } = useAuth()
  const navigate = useNavigate()

  const [channels, setChannels] = useState([])
  const [selectedChannelId, setSelectedChannelId] = useState(null)
  const [intelligence, setIntelligence] = useState(null)
  const [campaigns, setCampaigns] = useState([])
  const [period, setPeriod] = useState('30d')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [retryKey, setRetryKey] = useState(0)

  // 1. Load channels list
  useEffect(() => {
    let mounted = true
    const load = async () => {
      try {
        const res = await apiService.getMyChannels()
        if (!mounted) return
        const items = res?.success
          ? Array.isArray(res.data) ? res.data : res.data?.items || []
          : []
        setChannels(items)
        if (items.length > 0 && !selectedChannelId) {
          // Default: highest CAS
          const best = items.slice().sort((a, b) => (b.CAS || 0) - (a.CAS || 0))
          setSelectedChannelId(best[0]._id || best[0].id)
        }
      } catch (err) {
        if (mounted) setError('No se pudieron cargar los canales')
      }
    }
    load()
    return () => { mounted = false }
  }, [retryKey])

  // 2. Load intelligence for selected channel
  useEffect(() => {
    if (!selectedChannelId) {
      setIntelligence(null)
      setLoading(false)
      return
    }
    let mounted = true
    setLoading(true)
    const load = async () => {
      try {
        const [intRes, cmpRes] = await Promise.all([
          apiService.getChannelIntelligence(selectedChannelId).catch(() => null),
          apiService.getCreatorAnalytics({ period }).catch(() => null),
        ])
        if (!mounted) return
        if (intRes?.success && intRes.data) {
          setIntelligence(intRes.data)
        } else {
          setIntelligence(null)
        }
        // Extract campaign completion dates for chart annotations
        if (cmpRes?.success) {
          const timeline = cmpRes.data?.campaignsTimeline || cmpRes.data?.campaigns || []
          const completedDates = Array.isArray(timeline)
            ? timeline
                .filter((c) => c.status === 'COMPLETED' && c.completedAt)
                .map((c) => c.completedAt)
            : []
          setCampaigns(completedDates)
        }
      } catch {
        if (mounted) setError('Error al cargar las analíticas')
      } finally {
        if (mounted) setLoading(false)
      }
    }
    load()
    return () => { mounted = false }
  }, [selectedChannelId, retryKey, period])

  // ── Derived data ──────────────────────────────────────────────────────
  const scores = intelligence?.scores || null
  const historial = intelligence?.historial || []
  const benchmark = intelligence?.benchmark || null
  const plataforma = intelligence?.canal?.plataforma || channels.find(c => (c._id || c.id) === selectedChannelId)?.plataforma || 'telegram'

  // ── No channels → CTA ─────────────────────────────────────────────────
  if (!loading && channels.length === 0) {
    return (
      <div
        style={{
          fontFamily: F,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '50vh',
          gap: 16,
          padding: 40,
          textAlign: 'center',
        }}
      >
        <Radio size={36} color={C.t3} />
        <h2 style={{ color: C.t1, fontSize: 20, fontWeight: 700, fontFamily: D, margin: 0 }}>
          Registra tu primer canal para ver analytics
        </h2>
        <p style={{ color: C.t2, fontSize: 14, maxWidth: 400 }}>
          Una vez que tu canal esté verificado, podrás ver tu CAS Score, benchmarks
          del nicho y simular tu CPM óptimo.
        </p>
        <button
          onClick={() => navigate('/creator/channels/new')}
          style={{
            background: C.teal,
            color: C.bg,
            border: 'none',
            borderRadius: 10,
            padding: '12px 24px',
            fontSize: 14,
            fontWeight: 700,
            cursor: 'pointer',
            fontFamily: F,
          }}
        >
          Registrar canal →
        </button>
      </div>
    )
  }

  // ── Loading skeleton ──────────────────────────────────────────────────
  if (loading && !intelligence) {
    return (
      <div
        className="animate-pulse"
        style={{
          fontFamily: F,
          display: 'flex',
          flexDirection: 'column',
          gap: 20,
          maxWidth: 960,
        }}
      >
        {[360, 240, 200, 180].map((h, i) => (
          <div
            key={i}
            style={{
              height: h,
              background: C.surfaceEl,
              borderRadius: 16,
            }}
          />
        ))}
      </div>
    )
  }

  return (
    <div
      style={{
        fontFamily: F,
        display: 'flex',
        flexDirection: 'column',
        gap: 20,
        maxWidth: 960,
      }}
    >
      {/* Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 16,
          flexWrap: 'wrap',
        }}
      >
        <div>
          <h1
            style={{
              fontFamily: D,
              fontSize: 24,
              fontWeight: 800,
              color: 'var(--text)',
              letterSpacing: '-0.03em',
              marginBottom: 4,
            }}
          >
            Analytics
          </h1>
          <p style={{ fontSize: 13, color: 'var(--muted)' }}>
            Evolución, composición y benchmark de tu canal
          </p>
        </div>

        {/* Channel selector */}
        {channels.length > 1 && (
          <select
            value={selectedChannelId || ''}
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
                {ch.nombreCanal || 'Canal'} · {ch.plataforma || ''}
              </option>
            ))}
          </select>
        )}
      </div>

      {error && (
        <ErrorBanner
          message={error}
          onRetry={() => {
            setError(null)
            setRetryKey((k) => k + 1)
          }}
        />
      )}

      {/* Section 1 */}
      <CASEvolutionSection
        historial={historial}
        period={period}
        onPeriodChange={setPeriod}
        campaignDates={campaigns}
      />

      {/* Section 2 */}
      <ScoreDecompositionSection scores={scores} historial={historial} />

      {/* Section 3 */}
      <BenchmarkMatrixSection
        scores={scores}
        benchmark={benchmark}
        plataforma={plataforma}
      />

      {/* Section 4 */}
      <CPMSimulatorSection
        currentCAS={scores?.CAS}
        currentCPM={scores?.CPMDinamico}
        plataforma={plataforma}
      />
    </div>
  )
}
