import React, { useEffect, useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { Helmet } from 'react-helmet-async'
import { Search, ArrowLeft, ShieldAlert, ShieldCheck, Package, Calendar, Radio, Users, Eye, Activity, DollarSign } from 'lucide-react'
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts'
import apiService from '../../../../services/api'
import {
  CASBadge,
  ScoreGauge,
  ScoreBreakdown,
  CPMBadge,
  ConfianzaBadge,
  BenchmarkBar,
  CASHistoryChart,
  FraudFlag,
} from '../../components/scoring'
import { C, NIVEL, nivelFromCAS, plataformaIcon, fuenteLabel } from '../../theme/tokens'

// ─── Helpers ─────────────────────────────────────────────────────────────────
const fmtSeg = (n) => {
  if (n == null || Number.isNaN(n)) return '--'
  if (n >= 1e6) return `${(n / 1e6).toFixed(1)}M`
  if (n >= 1e3) return `${(n / 1e3).toFixed(1)}K`
  return String(n)
}

const fmtDate = (d) => {
  if (!d) return ''
  const date = new Date(d)
  if (Number.isNaN(date.getTime())) return ''
  return date.toLocaleDateString('es-ES', { day: 'numeric', month: 'long' })
}

// Parse "+23% vs la media del nicho" → 23, or "-8% vs ..." → -8
const parseDelta = (str) => {
  if (!str || typeof str !== 'string') return null
  const m = str.match(/([+-]?)(\d+)/)
  if (!m) return null
  const sign = m[1] === '-' ? -1 : 1
  return sign * Number(m[2])
}

// ─── Section wrappers ────────────────────────────────────────────────────────
const Card = ({ children, title, style = {} }) => (
  <div
    style={{
      background: C.surface,
      border: `1px solid ${C.border}`,
      borderRadius: 16,
      padding: 20,
      ...style,
    }}
  >
    {title && (
      <div
        className="uppercase"
        style={{
          color: C.t3,
          fontSize: 11,
          letterSpacing: '0.12em',
          fontWeight: 600,
          marginBottom: 14,
        }}
      >
        {title}
      </div>
    )}
    {children}
  </div>
)

// ─── Loading skeleton ────────────────────────────────────────────────────────
function LoadingState() {
  return (
    <div className="animate-pulse" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {[180, 280, 160].map((h, i) => (
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

// ─── Error state ─────────────────────────────────────────────────────────────
function ErrorState() {
  return (
    <div
      className="text-center"
      style={{
        padding: '60px 24px',
        background: C.surface,
        border: `1px solid ${C.border}`,
        borderRadius: 16,
      }}
    >
      <div style={{ fontSize: 40, marginBottom: 12 }}>📡</div>
      <div style={{ color: C.t1, fontSize: 18, fontWeight: 600, marginBottom: 6 }}>
        Canal no encontrado
      </div>
      <div style={{ color: C.t2, fontSize: 13, marginBottom: 20 }}>
        Puede que el canal haya sido retirado o que la URL sea incorrecta.
      </div>
      <Link
        to="/marketplace"
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 8,
          background: 'transparent',
          color: C.teal,
          border: `1px solid ${C.teal}66`,
          borderRadius: 10,
          padding: '10px 18px',
          fontSize: 13,
          fontWeight: 600,
          textDecoration: 'none',
        }}
      >
        <ArrowLeft size={14} /> Volver al marketplace
      </Link>
    </div>
  )
}

// ─── Stat row ────────────────────────────────────────────────────────────────
const Stat = ({ label, value, color = C.t1 }) => (
  <div
    className="flex items-center justify-between"
    style={{
      padding: '10px 0',
      borderBottom: `1px solid ${C.border}`,
    }}
  >
    <span style={{ color: C.t2, fontSize: 12 }}>{label}</span>
    <span className="font-mono" style={{ color, fontSize: 13, fontWeight: 600 }}>
      {value}
    </span>
  </div>
)

// ─── Quick stat card ────────────────────────────────────────────────────────
const QuickStat = ({ icon: Icon, label, value, sub, color = C.teal }) => (
  <div
    style={{
      background: C.surface,
      border: `1px solid ${C.border}`,
      borderRadius: 14,
      padding: '18px 16px',
      display: 'flex',
      alignItems: 'flex-start',
      gap: 14,
    }}
  >
    <div
      style={{
        width: 40,
        height: 40,
        borderRadius: 10,
        background: `${color}15`,
        border: `1px solid ${color}30`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
      }}
    >
      <Icon size={18} color={color} />
    </div>
    <div>
      <div className="font-mono" style={{ fontSize: 22, fontWeight: 700, color: C.t1, lineHeight: 1.1, letterSpacing: '-0.02em' }}>
        {value}
      </div>
      <div style={{ fontSize: 12, color: C.t3, marginTop: 2 }}>{label}</div>
      {sub && <div style={{ fontSize: 11, color: C.t3, marginTop: 2, opacity: 0.7 }}>{sub}</div>}
    </div>
  </div>
)

// ─── Subscribers + Views chart (dual Y axis) ────────────────────────────────
const EvolutionChart = ({ snapshots }) => {
  if (!snapshots || snapshots.length < 2) {
    return (
      <div style={{ color: C.t3, fontSize: 13, textAlign: 'center', padding: '40px 0' }}>
        📊 Datos insuficientes para mostrar la evolucion (min. 2 dias)
      </div>
    )
  }

  const data = snapshots.map((s) => ({
    fecha: new Date(s.fecha).toLocaleDateString('es-ES', { day: '2-digit', month: 'short' }),
    seguidores: s.seguidores || 0,
    avg_views: s.avg_views || 0,
  }))

  const CustomTooltip = ({ active, payload, label }) => {
    if (!active || !payload?.length) return null
    return (
      <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 10, padding: '10px 14px', fontSize: 12 }}>
        <div style={{ color: C.t2, marginBottom: 6, fontWeight: 600 }}>{label}</div>
        {payload.map((p) => (
          <div key={p.dataKey} style={{ color: p.color, display: 'flex', justifyContent: 'space-between', gap: 16, marginBottom: 2 }}>
            <span>{p.dataKey === 'seguidores' ? 'Suscriptores' : 'Avg Views'}</span>
            <span className="font-mono" style={{ fontWeight: 600 }}>{fmtSeg(p.value)}</span>
          </div>
        ))}
      </div>
    )
  }

  return (
    <ResponsiveContainer width="100%" height={220}>
      <LineChart data={data} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" stroke={C.border} />
        <XAxis dataKey="fecha" tick={{ fontSize: 10, fill: C.t3 }} tickLine={false} axisLine={false} />
        <YAxis yAxisId="left" tick={{ fontSize: 10, fill: C.t3 }} tickLine={false} axisLine={false} tickFormatter={fmtSeg} />
        <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 10, fill: C.t3 }} tickLine={false} axisLine={false} tickFormatter={fmtSeg} />
        <Tooltip content={<CustomTooltip />} />
        <Legend wrapperStyle={{ fontSize: 11, color: C.t3 }} />
        <Line yAxisId="left" type="monotone" dataKey="seguidores" name="Suscriptores" stroke={C.teal} strokeWidth={2} dot={false} />
        <Line yAxisId="right" type="monotone" dataKey="avg_views" name="Avg Views" stroke="#f59e0b" strokeWidth={2} dot={false} strokeDasharray="5 5" />
      </LineChart>
    </ResponsiveContainer>
  )
}

// ─── Score tooltip descriptions ─────────────────────────────────────────────
const SCORE_DESC = {
  CAF: 'Channel Authenticity Factor — Volumen de audiencia y tasa de visualizaciones',
  CTF: 'Content Trust Factor — Verificacion del canal e historial de coherencia',
  CER: 'Channel Engagement Rate — Tasa de interaccion vs benchmark del nicho',
  CVS: 'Channel Velocity Score — Tendencia de crecimiento y regularidad de publicacion',
  CAP: 'Channel Ad Performance — Rendimiento real de campanas completadas',
  CAS: 'Channel Ad Score — Puntuacion global compuesta (0-100)',
}

const CAS_LABEL = (cas) => {
  if (cas >= 80) return { text: 'Excelente', color: '#10b981' }
  if (cas >= 61) return { text: 'Bueno', color: '#00D4B8' }
  if (cas >= 41) return { text: 'Regular', color: '#f59e0b' }
  return { text: 'Bajo', color: '#ef4444' }
}

// ─── Score bar with tooltip ─────────────────────────────────────────────────
const ScoreBar = ({ label, value, desc }) => {
  const [showTip, setShowTip] = useState(false)
  const pct = Math.max(0, Math.min(100, value ?? 0))
  const isCAS = label === 'CAS'
  return (
    <div style={{ marginBottom: isCAS ? 0 : 8 }}>
      <div
        className="flex items-center justify-between"
        style={{ marginBottom: 4, position: 'relative' }}
        onMouseEnter={() => setShowTip(true)}
        onMouseLeave={() => setShowTip(false)}
      >
        <span className="font-mono" style={{ color: 'var(--muted)', fontSize: 12, fontWeight: 600, cursor: 'help' }}>
          {label}
        </span>
        <span className="font-mono" style={{ color: 'var(--text)', fontSize: 12, fontWeight: 600 }}>
          {Math.round(pct)}
        </span>
        {showTip && desc && (
          <div style={{
            position: 'absolute',
            bottom: '100%',
            left: 0,
            marginBottom: 6,
            background: C.surface,
            border: `1px solid ${C.border}`,
            borderRadius: 8,
            padding: '8px 12px',
            fontSize: 11,
            color: C.t2,
            maxWidth: 280,
            zIndex: 10,
            boxShadow: '0 4px 16px rgba(0,0,0,0.3)',
            whiteSpace: 'normal',
          }}>
            {desc}
          </div>
        )}
      </div>
      <div style={{ height: isCAS ? 8 : 5, background: 'var(--border)', borderRadius: 999, overflow: 'hidden' }}>
        <div style={{
          width: `${pct}%`,
          height: '100%',
          background: isCAS ? CAS_LABEL(pct).color : C.teal,
          borderRadius: 999,
          transition: 'width 500ms cubic-bezier(.22,1,.36,1)',
        }} />
      </div>
    </div>
  )
}

// ─── Main page ───────────────────────────────────────────────────────────────
export default function ChannelExplorerPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [state, setState] = useState('loading') // 'loading' | 'error' | 'data'
  const [data, setData] = useState(null)
  const [snapshots, setSnapshots] = useState([])
  const [searchInput, setSearchInput] = useState('')

  // Detect if param is a MongoDB ObjectId or a username
  const isObjectId = /^[a-f\d]{24}$/i.test(id)

  useEffect(() => {
    let cancelled = false
    setState('loading')
    setData(null)
    setSnapshots([])

    const loadData = async () => {
      let channelId = id

      // If param is a username, resolve to ID first
      if (!isObjectId) {
        try {
          const resolved = await apiService.getChannelByUsername(id)
          if (resolved?.success && resolved.data?.id) {
            channelId = resolved.data.id
          } else {
            if (!cancelled) setState('error')
            return
          }
        } catch {
          if (!cancelled) setState('error')
          return
        }
      }

      try {
        const [intelRes, snapRes] = await Promise.all([
          apiService.getChannelIntelligence(channelId),
          apiService.getChannelSnapshots(channelId, 30).catch(() => ({ success: false })),
        ])

        if (cancelled) return
        if (intelRes?.success && intelRes.data) {
          setData(intelRes.data)
          setState('data')
        } else {
          setState('error')
        }
        if (snapRes?.success && Array.isArray(snapRes.data)) {
          setSnapshots(snapRes.data)
        }
      } catch {
        if (!cancelled) setState('error')
      }
    }

    loadData()
    return () => { cancelled = true }
  }, [id, isObjectId])

  // ── Layout shell ────────────────────────────────────────────────────
  const Shell = ({ children }) => (
    <div
      style={{
        background: C.bg,
        minHeight: '100vh',
        color: C.t1,
        fontFamily: 'DM Sans, Inter, system-ui, sans-serif',
      }}
    >
      <div style={{ maxWidth: 900, margin: '0 auto', padding: '32px 24px' }}>
        {/* ── Search bar ── */}
        <form
          onSubmit={(e) => {
            e.preventDefault()
            // Placeholder — full search UX lives in the marketplace. If the
            // input looks like a channel id we let the user jump there.
            const q = searchInput.trim()
            if (!q) return
            navigate(`/marketplace?q=${encodeURIComponent(q)}`)
          }}
          style={{ position: 'relative', marginBottom: 28 }}
        >
          <Search
            size={16}
            color={C.t3}
            style={{
              position: 'absolute',
              left: 16,
              top: '50%',
              transform: 'translateY(-50%)',
              pointerEvents: 'none',
            }}
          />
          <input
            type="text"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Buscar canal por @nombre, URL de WhatsApp o Discord..."
            style={{
              width: '100%',
              boxSizing: 'border-box',
              background: C.surface,
              border: `1px solid ${C.border}`,
              borderRadius: 12,
              padding: '12px 16px 12px 44px',
              color: C.t1,
              fontSize: 14,
              fontFamily: 'inherit',
              outline: 'none',
              transition: 'border-color 150ms',
            }}
            onFocus={(e) => { e.target.style.borderColor = C.teal }}
            onBlur={(e) => { e.target.style.borderColor = C.border }}
          />
        </form>

        {children}
      </div>
    </div>
  )

  // ── LOADING ─────────────────────────────────────────────────────────
  if (state === 'loading') {
    return (
      <Shell>
        <LoadingState />
      </Shell>
    )
  }

  // ── ERROR ───────────────────────────────────────────────────────────
  if (state === 'error' || !data) {
    return (
      <Shell>
        <Helmet>
          <title>Canal no encontrado · Channelad</title>
          <meta name="robots" content="noindex,nofollow" />
        </Helmet>
        <ErrorState />
      </Shell>
    )
  }

  // ── DATA ────────────────────────────────────────────────────────────
  const { canal, scores, historial, benchmark, campanias } = data
  const { nombre, plataforma, nicho, seguidores } = canal || {}
  const {
    CAS, CAF, CTF, CER, CVS, CAP,
    nivel, CPMDinamico, ratioCTF_CAF, confianzaScore, flags = [],
  } = scores || {}

  const lvl = (nivel && NIVEL[nivel]) || nivelFromCAS(CAS || 0)
  const pIcon = plataformaIcon[plataforma] || '📡'
  const nicheDelta = parseDelta(benchmark?.canalCTRRatio)

  // Used by the final featured ChannelCard; this is the value requested
  // explicitly in Block C — pipe `campanias.disponible` through as prop.
  const disponible = Boolean(campanias?.disponible)

  // Build the canal shape expected by ChannelCard/scoring components
  // eslint-disable-next-line no-unused-vars
  const canalForCard = {
    id: canal.id,
    nombre,
    plataforma,
    nicho,
    seguidores,
    CAS, CAF, CTF, CER, CVS, CAP, nivel,
    CPMDinamico,
    verificacion: { confianzaScore, tipoAcceso: 'declarado' },
    antifraude: { ratioCTF_CAF, flags },
    historial,
  }

  const pageTitle = `@${nombre} · CAS ${CAS} · Channelad`
  const pageDesc = `Canal verificado en ${plataforma}. CAS ${CAS}/100 (${lvl.label}). CPM €${Number(CPMDinamico || 0).toFixed(1)}. ${campanias?.completadas || 0} campañas completadas.`

  return (
    <Shell>
      <Helmet>
        <title>{pageTitle}</title>
        <meta name="description" content={pageDesc} />
        <meta property="og:title" content={pageTitle} />
        <meta property="og:description" content={pageDesc} />
        <meta property="og:type" content="profile" />
      </Helmet>

      {/* ── HEADER ──────────────────────────────────────────────── */}
      <div className="flex items-start" style={{ gap: 16, marginBottom: 24 }}>
        <div
          className="flex items-center justify-center"
          style={{
            width: 56,
            height: 56,
            borderRadius: 14,
            background: C.tealDim,
            border: `1px solid ${C.teal}33`,
            color: C.teal,
            fontSize: 24,
            fontWeight: 700,
            flexShrink: 0,
          }}
        >
          {(nombre || '?').charAt(0).toUpperCase()}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <h1
            style={{
              color: C.t1,
              fontSize: 26,
              fontWeight: 700,
              margin: 0,
              marginBottom: 6,
              letterSpacing: '-0.02em',
            }}
          >
            @{nombre || '—'}
          </h1>
          <div className="font-mono flex items-center" style={{ gap: 8, color: C.t3, fontSize: 12, flexWrap: 'wrap' }}>
            <span>{pIcon}</span>
            <span>{plataforma || '--'}</span>
            <span>·</span>
            <span>{nicho || 'otros'}</span>
            <span>·</span>
            <span>{fmtSeg(seguidores)} seguidores</span>
          </div>
          <div style={{ marginTop: 8, display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
            <ConfianzaBadge score={confianzaScore} fuente="declarado" showScore />
            {nicho && (
              <Link
                to={`/niche/${nicho}`}
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: 4,
                  color: C.teal, fontSize: 11, fontWeight: 600,
                  textDecoration: 'none', opacity: 0.8,
                }}
                onMouseEnter={(e) => { e.currentTarget.style.opacity = '1' }}
                onMouseLeave={(e) => { e.currentTarget.style.opacity = '0.8' }}
              >
                📊 Ver mercado {nicho} →
              </Link>
            )}
            {Array.isArray(flags) && flags.length > 0 && (
              <span
                className="font-mono"
                style={{
                  marginLeft: 10,
                  background: 'rgba(148,163,184,0.15)',
                  color: C.silver,
                  border: `1px solid ${C.silver}44`,
                  padding: '2px 8px',
                  borderRadius: 999,
                  fontSize: 10,
                  fontWeight: 600,
                }}
              >
                {flags[0].replace(/_/g, ' ')}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* ── QUICK STATS ──────────────────────────────────────────── */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
          gap: 12,
          marginBottom: 16,
        }}
      >
        <QuickStat icon={Users} label="Suscriptores" value={fmtSeg(seguidores)} color={C.teal} />
        <QuickStat
          icon={Eye}
          label="Avg Views (20 posts)"
          value={snapshots.length > 0 && snapshots[snapshots.length - 1].avg_views
            ? fmtSeg(snapshots[snapshots.length - 1].avg_views)
            : '--'}
          color="#8b5cf6"
        />
        <QuickStat
          icon={Activity}
          label="Engagement Rate"
          value={snapshots.length > 0 && snapshots[snapshots.length - 1].engagement_rate != null
            ? `${(snapshots[snapshots.length - 1].engagement_rate * 100).toFixed(1)}%`
            : '--'}
          color="#f59e0b"
        />
        <QuickStat
          icon={DollarSign}
          label="Precio / post"
          value={CPMDinamico > 0 ? `€${Number(CPMDinamico).toFixed(0)}` : '--'}
          sub={CPMDinamico > 0 ? 'CPM dinamico' : 'No configurado'}
          color="#10b981"
        />
      </div>

      {/* ── CAS HERO ────────────────────────────────────────────── */}
      <div
        style={{
          background: C.surface,
          border: `1px solid ${C.borderEl}`,
          borderRadius: 20,
          padding: 24,
          marginBottom: 16,
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {/* subtle teal glow backdrop */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background: `radial-gradient(circle at top right, ${C.tealGlow}, transparent 60%)`,
            pointerEvents: 'none',
          }}
        />
        <div
          className="flex justify-between items-start"
          style={{ gap: 20, position: 'relative', flexWrap: 'wrap' }}
        >
          <div>
            <div
              className="uppercase"
              style={{
                color: C.t3,
                fontSize: 11,
                letterSpacing: '0.12em',
                fontWeight: 600,
                marginBottom: 8,
              }}
            >
              CAS Score
            </div>
            <div
              className="font-mono"
              style={{
                fontSize: 56,
                fontWeight: 700,
                color: lvl.color,
                lineHeight: 1,
                letterSpacing: '-0.04em',
              }}
            >
              {CAS ?? '--'}
            </div>
            <div style={{ marginTop: 10 }}>
              {CAS != null && <CASBadge CAS={CAS} nivel={nivel} size="lg" />}
            </div>
            <div style={{ color: C.t3, fontSize: 11, marginTop: 8 }}>
              Actualizado hoy
            </div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 8 }}>
            {CPMDinamico > 0 && <CPMBadge CPM={CPMDinamico} plataforma={plataforma} size="lg" />}
          </div>
        </div>
        <div style={{ marginTop: 20, position: 'relative' }}>
          {CAS != null && <ScoreGauge CAS={CAS} nivel={nivel} showLabel height={12} />}
        </div>
      </div>

      {/* ── SCORE BREAKDOWN (enhanced with tooltips) ─────────────── */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
          gap: 16,
          marginBottom: 16,
        }}
      >
        <Card title="Composicion del score">
          {/* CAS total hero */}
          {CAS != null && (
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, marginBottom: 16 }}>
              <span className="font-mono" style={{ fontSize: 36, fontWeight: 700, color: CAS_LABEL(CAS).color, lineHeight: 1 }}>
                {Math.round(CAS)}
              </span>
              <span style={{ fontSize: 14, fontWeight: 600, color: CAS_LABEL(CAS).color }}>
                {CAS_LABEL(CAS).text}
              </span>
              <span style={{ fontSize: 11, color: C.t3 }}>/100</span>
            </div>
          )}
          <ScoreBar label="CAF" value={CAF} desc={SCORE_DESC.CAF} />
          <ScoreBar label="CTF" value={CTF} desc={SCORE_DESC.CTF} />
          <ScoreBar label="CER" value={CER} desc={SCORE_DESC.CER} />
          <ScoreBar label="CVS" value={CVS} desc={SCORE_DESC.CVS} />
          <ScoreBar label="CAP" value={CAP} desc={SCORE_DESC.CAP} />
          <div style={{ marginTop: 8 }}>
            <ScoreBar label="CAS" value={CAS} desc={SCORE_DESC.CAS} />
          </div>
          {ratioCTF_CAF != null && ratioCTF_CAF < 0.6 && (
            <div style={{ marginTop: 12 }}>
              <FraudFlag ratioCTF_CAF={ratioCTF_CAF} flags={flags} />
            </div>
          )}
        </Card>

        <Card title="Rendimiento en el nicho">
          {benchmark?.nichoMediaCTR != null && nicheDelta != null ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
              <BenchmarkBar
                label="CTR"
                valor={Number(((1 + nicheDelta / 100) * benchmark.nichoMediaCTR).toFixed(2))}
                benchmark={Number(benchmark.nichoMediaCTR.toFixed(2))}
                unidad="%"
              />
              {CPMDinamico > 0 && (
                <BenchmarkBar
                  label="CPM"
                  valor={Number(CPMDinamico.toFixed(1))}
                  benchmark={Number((CPMDinamico * 1.15).toFixed(1))}
                  unidad="€"
                  invertido
                />
              )}
              {benchmark.posicionNicho && (
                <div
                  className="font-mono"
                  style={{
                    color: C.teal,
                    fontSize: 12,
                    padding: '8px 12px',
                    background: C.tealDim,
                    border: `1px solid ${C.teal}33`,
                    borderRadius: 10,
                    textAlign: 'center',
                  }}
                >
                  {benchmark.posicionNicho}
                </div>
              )}
            </div>
          ) : (
            <div style={{ color: C.t3, fontSize: 12, textAlign: 'center', padding: '20px 0' }}>
              Benchmark del nicho no disponible
            </div>
          )}
        </Card>
      </div>

      {/* ── EVOLUTION CHART (subscribers + views) ────────────────── */}
      <Card title="Evolucion — ultimos 30 dias" style={{ marginBottom: 16 }}>
        <EvolutionChart snapshots={snapshots} />
      </Card>

      {/* ── HISTORIAL + STATS ──────────────────────────────────── */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'minmax(0, 2fr) minmax(0, 1fr)',
          gap: 16,
          marginBottom: 24,
        }}
      >
        <Card title="Evolucion CAS — 90 dias">
          <CASHistoryChart data={historial || []} height={200} />
        </Card>

        <Card title="Estadisticas">
          <Stat
            label="Campanas completadas"
            value={campanias?.completadas ?? 0}
          />
          <Stat
            label="Disponibilidad"
            value={disponible ? '✅ Disponible' : '⏳ Ocupado'}
            color={disponible ? C.ok : C.warn}
          />
          {nicheDelta != null && (
            <Stat
              label="CTR vs nicho"
              value={`${nicheDelta >= 0 ? '+' : ''}${nicheDelta}%`}
              color={nicheDelta >= 0 ? C.ok : C.warn}
            />
          )}
          <Stat
            label="Fuente de datos"
            value={fuenteLabel.declarado || 'Decl.'}
          />
        </Card>
      </div>

      {/* ── CTA ─────────────────────────────────────────────────── */}
      <div className="text-center" style={{ marginTop: 32, marginBottom: 16 }}>
        <button
          onClick={() => navigate(`/advertiser/explore?canal=${encodeURIComponent(canal.id)}`)}
          style={{
            background: C.teal,
            color: C.bg,
            border: 'none',
            borderRadius: 12,
            padding: '14px 32px',
            fontSize: 15,
            fontWeight: 700,
            cursor: 'pointer',
            fontFamily: 'inherit',
            boxShadow: `0 8px 24px ${C.teal}33`,
            transition: 'transform 150ms, box-shadow 150ms',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'translateY(-1px)'
            e.currentTarget.style.boxShadow = `0 12px 32px ${C.teal}4D`
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'none'
            e.currentTarget.style.boxShadow = `0 8px 24px ${C.teal}33`
          }}
        >
          Contratar publicidad en este canal →
        </button>
        <div
          className="flex items-center justify-center"
          style={{ gap: 8, color: C.t3, fontSize: 11, marginTop: 10 }}
        >
          <ShieldCheck size={12} />
          <span>Pago protegido por escrow · Métricas verificadas</span>
        </div>
      </div>
    </Shell>
  )
}
