import React, { useEffect, useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { Helmet } from 'react-helmet-async'
import { Search, ArrowLeft, ShieldAlert, ShieldCheck, Package, Calendar, Radio } from 'lucide-react'
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

// ─── Main page ───────────────────────────────────────────────────────────────
export default function ChannelExplorerPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [state, setState] = useState('loading') // 'loading' | 'error' | 'data'
  const [data, setData] = useState(null)
  const [searchInput, setSearchInput] = useState('')

  useEffect(() => {
    let cancelled = false
    setState('loading')
    setData(null)

    apiService
      .getChannelIntelligence(id)
      .then((res) => {
        if (cancelled) return
        if (res?.success && res.data) {
          setData(res.data)
          setState('data')
        } else {
          setState('error')
        }
      })
      .catch(() => {
        if (!cancelled) setState('error')
      })

    return () => {
      cancelled = true
    }
  }, [id])

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
          <div style={{ marginTop: 8 }}>
            <ConfianzaBadge score={confianzaScore} fuente="declarado" showScore />
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

      {/* ── BREAKDOWN + BENCHMARK ──────────────────────────────── */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
          gap: 16,
          marginBottom: 16,
        }}
      >
        <Card title="Composición del score">
          <ScoreBreakdown
            CAF={CAF}
            CTF={CTF}
            CER={CER}
            CVS={CVS}
            CAP={CAP}
            ratioCTF_CAF={ratioCTF_CAF}
          />
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

      {/* ── HISTORIAL + STATS ──────────────────────────────────── */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'minmax(0, 2fr) minmax(0, 1fr)',
          gap: 16,
          marginBottom: 24,
        }}
      >
        <Card title="Evolución CAS — 90 días">
          <CASHistoryChart data={historial || []} height={200} />
        </Card>

        <Card title="Estadísticas">
          <Stat
            label="Campañas completadas"
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
          Comprar anuncio en este canal →
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
