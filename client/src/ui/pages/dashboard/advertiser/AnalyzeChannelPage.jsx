import React, { useState, useCallback } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import {
  Search, Sparkles, TrendingUp, TrendingDown, AlertTriangle,
  CheckCircle2, XCircle, Users, Eye, Activity, Target, Zap,
  ArrowRight, Info, BarChart3, ChevronRight,
} from 'lucide-react'
import apiService from '../../../../services/api'
import {
  FONT_BODY, FONT_DISPLAY, OK, WARN, ERR, BLUE,
} from '../../../theme/tokens'
import { CASBadge, ScoreGauge, ScoreBreakdown, BenchmarkBar, FraudFlag } from '../../../components/scoring'

const PURPLE = 'var(--accent, #8B5CF6)'
const purpleAlpha = (o) => `var(--accent-dim, rgba(139,92,246,${o}))`


// ─── Helpers ────────────────────────────────────────────────────────────────
function fmtNum(n) {
  if (n == null) return '—'
  if (n >= 1e6) return `${(n / 1e6).toFixed(1)}M`
  if (n >= 1e3) return `${(n / 1e3).toFixed(1)}K`
  return String(n)
}

function tierColor(nivel) {
  return ({
    'S': '#FFD700',
    'A': OK,
    'B': BLUE,
    'C': WARN,
    'D': '#94a3b8',
  })[nivel] || '#94a3b8'
}

// Recommendation engine — basic heuristics on top of scoring data
function buildRecommendation({ scores, benchmark, canal, nicheTrends }) {
  const { CAS = 0, CAF = 0, CTF = 0, CER = 0, confianzaScore = 0, flags = [] } = scores || {}
  const reasons = []
  let verdict = 'review'
  let score = 0

  // Strong signals
  if (CAS >= 75) { score += 30; reasons.push({ pos: true, text: `Score CAS de ${CAS} (top tier)` }) }
  else if (CAS >= 60) { score += 18; reasons.push({ pos: true, text: `Score CAS de ${CAS} (sólido)` }) }
  else if (CAS < 40) { score -= 20; reasons.push({ pos: false, text: `Score CAS bajo (${CAS}) — riesgo de bajo retorno` }) }

  if (CAF >= 75) { score += 15; reasons.push({ pos: true, text: `Audiencia auténtica (CAF ${CAF})` }) }
  else if (CAF < 50) { score -= 15; reasons.push({ pos: false, text: `Posible audiencia no auténtica (CAF ${CAF})` }) }

  if (CER >= 65) { score += 12; reasons.push({ pos: true, text: `Engagement por encima de la media (CER ${CER})` }) }
  else if (CER < 35) { score -= 8; reasons.push({ pos: false, text: `Engagement bajo (CER ${CER})` }) }

  if (CTF >= 70) { score += 10; reasons.push({ pos: true, text: `Contenido confiable (CTF ${CTF})` }) }

  if (confianzaScore >= 80) { score += 10; reasons.push({ pos: true, text: 'Datos verificados con alta confianza' }) }
  else if (confianzaScore < 50) { score -= 5; reasons.push({ pos: false, text: 'Datos limitados — analiza con precaución' }) }

  // Flags are deal-breakers
  if (flags.length > 0) {
    score -= flags.length * 12
    reasons.push({ pos: false, text: `${flags.length} flag${flags.length > 1 ? 's' : ''} de calidad detectado${flags.length > 1 ? 's' : ''}` })
  }

  // Niche fit signals
  if (benchmark?.percentilNicho >= 75) {
    score += 8
    reasons.push({ pos: true, text: `Top ${100 - benchmark.percentilNicho}% del nicho ${canal?.nicho || ''}` })
  }

  if (score >= 40) verdict = 'buy'
  else if (score <= -10) verdict = 'skip'
  else verdict = 'review'

  return { verdict, score, reasons }
}


// ─── Search bar ─────────────────────────────────────────────────────────────
function SearchBar({ value, onChange, onSubmit, loading }) {
  return (
    <form
      onSubmit={(e) => { e.preventDefault(); onSubmit() }}
      style={{
        background: 'var(--surface)',
        border: `1px solid ${purpleAlpha(0.25)}`,
        borderRadius: 16,
        padding: 6,
        display: 'flex',
        alignItems: 'center',
        gap: 6,
        boxShadow: `0 4px 20px ${purpleAlpha(0.08)}`,
      }}
    >
      <Search size={18} color={PURPLE} style={{ marginLeft: 12 }} />
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Pega un username (@canal) o URL del canal a analizar"
        style={{
          flex: 1,
          background: 'transparent',
          border: 'none',
          padding: '12px 8px',
          fontSize: 15,
          color: 'var(--text)',
          outline: 'none',
          fontFamily: FONT_BODY,
        }}
        disabled={loading}
      />
      <button
        type="submit"
        disabled={loading || !value.trim()}
        style={{
          background: PURPLE,
          color: '#fff',
          border: 'none',
          borderRadius: 10,
          padding: '10px 22px',
          fontSize: 14,
          fontWeight: 600,
          cursor: loading || !value.trim() ? 'not-allowed' : 'pointer',
          opacity: loading || !value.trim() ? 0.6 : 1,
          fontFamily: FONT_BODY,
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          transition: 'transform .15s, box-shadow .15s',
        }}
      >
        <Sparkles size={14} />
        {loading ? 'Analizando…' : 'Analizar'}
      </button>
    </form>
  )
}


// ─── Verdict banner ─────────────────────────────────────────────────────────
function VerdictBanner({ verdict, score, channelName, onCreateCampaign }) {
  const cfg = {
    buy:    { color: OK,   icon: CheckCircle2, title: 'Recomendado', desc: 'Buen perfil para tu campaña.' },
    skip:   { color: ERR,  icon: XCircle,      title: 'No recomendado', desc: 'El canal presenta señales de riesgo.' },
    review: { color: WARN, icon: AlertTriangle,title: 'Revisar antes de comprar', desc: 'Hay señales mixtas. Analiza el detalle abajo.' },
  }[verdict]
  const Icon = cfg.icon

  return (
    <div style={{
      background: `${cfg.color}10`,
      border: `1px solid ${cfg.color}40`,
      borderRadius: 16,
      padding: '20px 24px',
      display: 'flex',
      alignItems: 'center',
      gap: 18,
      flexWrap: 'wrap',
    }}>
      <div style={{
        width: 56, height: 56, borderRadius: 14,
        background: `${cfg.color}20`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        flexShrink: 0,
      }}>
        <Icon size={28} color={cfg.color} strokeWidth={2} />
      </div>
      <div style={{ flex: 1, minWidth: 200 }}>
        <div style={{ fontFamily: FONT_DISPLAY, fontSize: 18, fontWeight: 800, color: 'var(--text)', marginBottom: 2 }}>
          {cfg.title}
        </div>
        <div style={{ fontSize: 13, color: 'var(--muted)' }}>
          {cfg.desc} {channelName && <span style={{ color: 'var(--text)', fontWeight: 600 }}>· {channelName}</span>}
        </div>
      </div>
      <div style={{
        background: 'var(--surface)', border: `1px solid ${cfg.color}30`,
        borderRadius: 10, padding: '8px 14px',
        display: 'flex', alignItems: 'center', gap: 8,
      }}>
        <span style={{ fontSize: 11, color: 'var(--muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Score</span>
        <span style={{ fontFamily: FONT_DISPLAY, fontSize: 22, fontWeight: 800, color: cfg.color }}>{score > 0 ? `+${score}` : score}</span>
      </div>
      {verdict === 'buy' && onCreateCampaign && (
        <button
          onClick={onCreateCampaign}
          style={{
            background: cfg.color, color: '#fff', border: 'none',
            borderRadius: 10, padding: '10px 18px',
            fontSize: 13, fontWeight: 700, cursor: 'pointer',
            display: 'flex', alignItems: 'center', gap: 6,
            fontFamily: FONT_BODY,
          }}
        >
          Crear campaña <ArrowRight size={14} />
        </button>
      )}
    </div>
  )
}


// ─── Main ───────────────────────────────────────────────────────────────────
export default function AnalyzeChannelPage() {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const [query, setQuery] = useState(searchParams.get('q') || '')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [data, setData] = useState(null)
  const [niche, setNiche] = useState(null)
  const [similar, setSimilar] = useState([])
  const [matches, setMatches] = useState([])  // multiple-match suggestions

  const analyzeById = useCallback(async (resolvedId) => {
    setLoading(true); setError(''); setData(null); setNiche(null); setSimilar([]); setMatches([])
    try {
      const intel = await apiService.getChannelIntelligence(resolvedId)
      if (!intel?.success || !intel.data) {
        setError('No se pudo cargar la información del canal.')
        setLoading(false); return
      }
      setData(intel.data)
      const nicho = intel.data.canal?.nicho
      if (nicho) {
        const [trends, supply, leaderboard] = await Promise.all([
          apiService.getNicheTrends(nicho, 30).catch(() => null),
          apiService.getNicheSupplyDemand(nicho).catch(() => null),
          apiService.getNicheLeaderboard(nicho, 8).catch(() => null),
        ])
        setNiche({
          trends: trends?.success ? trends.data : null,
          supply: supply?.success ? supply.data : null,
        })
        if (leaderboard?.success && Array.isArray(leaderboard.data)) {
          const currentId = intel.data.canal?.id || intel.data.canal?._id
          setSimilar(leaderboard.data.filter(c => (c.id || c._id) !== currentId).slice(0, 5))
        }
      }
    } catch (e) {
      console.error('AnalyzeChannel.analyzeById failed:', e)
      setError(e.message || 'Error al cargar el canal')
    }
    setLoading(false)
  }, [])

  const runAnalysis = useCallback(async () => {
    const raw = (query || '').trim()
    if (!raw) return
    setLoading(true); setError(''); setData(null); setNiche(null); setSimilar([]); setMatches([])

    // Normalize input: strip @, t.me/, https://, etc.
    const cleaned = raw
      .replace(/^https?:\/\//i, '')
      .replace(/^(t\.me|telegram\.me|instagram\.com|youtube\.com\/c|youtube\.com\/@)\//i, '')
      .replace(/^@/, '')
      .replace(/\/.*$/, '')

    setSearchParams({ q: raw }, { replace: true })

    try {
      let resolvedId = null
      // Try direct ID first (24-char ObjectId)
      if (/^[0-9a-fA-F]{24}$/.test(cleaned)) {
        resolvedId = cleaned
      } else {
        const lookup = await apiService.getChannelByUsername(cleaned).catch(() => null)
        if (lookup?.success && lookup.data?.id) resolvedId = lookup.data.id
      }

      // Fallback: full-text search across name/description/category/identifier
      if (!resolvedId) {
        const search = await apiService.searchChannels({ busqueda: cleaned, limite: 8 }).catch(() => null)
        const items = search?.data?.canales || search?.data?.items || search?.data || []
        if (Array.isArray(items) && items.length === 1) {
          // Single match — analyze directly
          resolvedId = items[0].id || items[0]._id
        } else if (Array.isArray(items) && items.length > 1) {
          // Multiple matches — let user pick
          setMatches(items.slice(0, 8))
          setLoading(false)
          return
        }
      }

      if (!resolvedId) {
        setError(`No encontramos canales que coincidan con "${cleaned}". Prueba con un username (ej: acrelianews, channelad_demo) o el nombre del canal.`)
        setLoading(false)
        return
      }

      const intel = await apiService.getChannelIntelligence(resolvedId)
      if (!intel?.success || !intel.data) {
        setError('No se pudo cargar la información del canal.')
        setLoading(false)
        return
      }
      setData(intel.data)

      // Fetch niche context in parallel (best-effort)
      const nicho = intel.data.canal?.nicho
      if (nicho) {
        const [trends, supply, leaderboard] = await Promise.all([
          apiService.getNicheTrends(nicho, 30).catch(() => null),
          apiService.getNicheSupplyDemand(nicho).catch(() => null),
          apiService.getNicheLeaderboard(nicho, 8).catch(() => null),
        ])
        setNiche({
          trends: trends?.success ? trends.data : null,
          supply: supply?.success ? supply.data : null,
        })
        // Filter out the current channel from leaderboard
        if (leaderboard?.success && Array.isArray(leaderboard.data)) {
          const currentId = intel.data.canal?.id || intel.data.canal?._id
          setSimilar(leaderboard.data.filter(c =>
            (c.id || c._id) !== currentId
          ).slice(0, 5))
        }
      }
    } catch (e) {
      console.error('AnalyzeChannel.runAnalysis failed:', e)
      setError(e.message || 'Error al analizar el canal')
    }
    setLoading(false)
  }, [query, setSearchParams])

  // Auto-run on mount if URL has ?q=
  React.useEffect(() => {
    if (searchParams.get('q') && !data && !loading) runAnalysis()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const recommendation = data ? buildRecommendation({
    scores: data.scores,
    benchmark: data.benchmark,
    canal: data.canal,
    nicheTrends: niche?.trends,
  }) : null

  const canal = data?.canal
  const scores = data?.scores
  const flags = scores?.flags || []

  return (
    <div style={{ fontFamily: FONT_BODY, display: 'flex', flexDirection: 'column', gap: 24, maxWidth: 1100 }}>

      {/* Header */}
      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
          <div style={{
            width: 40, height: 40, borderRadius: 12,
            background: purpleAlpha(0.12),
            border: `1px solid ${purpleAlpha(0.25)}`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <BarChart3 size={20} color={PURPLE} />
          </div>
          <h1 style={{
            fontFamily: FONT_DISPLAY, fontSize: 28, fontWeight: 800,
            color: 'var(--text)', letterSpacing: '-0.04em', lineHeight: 1.1,
            margin: 0,
          }}>
            Analizar canal
          </h1>
        </div>
        <p style={{ fontSize: 14, color: 'var(--muted)', lineHeight: 1.5 }}>
          Pega cualquier canal y obtén un reporte completo: scoring, audiencia, benchmark del nicho y recomendación de compra.
        </p>
      </div>

      {/* Search */}
      <SearchBar value={query} onChange={setQuery} onSubmit={runAnalysis} loading={loading} />

      {/* Error */}
      {error && (
        <div role="alert" style={{
          background: `${ERR}10`, border: `1px solid ${ERR}30`, color: ERR,
          borderRadius: 12, padding: '12px 16px', fontSize: 13,
          display: 'flex', alignItems: 'center', gap: 10,
        }}>
          <AlertTriangle size={16} /> <span>{error}</span>
        </div>
      )}

      {/* Empty state — initial */}
      {!data && !loading && !error && matches.length === 0 && (
        <div style={{
          background: 'var(--surface)', border: '1px dashed var(--border)',
          borderRadius: 18, padding: '60px 28px', textAlign: 'center',
        }}>
          <div style={{
            width: 64, height: 64, borderRadius: 18,
            background: purpleAlpha(0.08), border: `1px solid ${purpleAlpha(0.18)}`,
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            marginBottom: 16,
          }}>
            <Sparkles size={28} color={PURPLE} />
          </div>
          <h3 style={{ fontFamily: FONT_DISPLAY, fontSize: 17, fontWeight: 700, color: 'var(--text)', marginBottom: 6 }}>
            Empieza por buscar un canal
          </h3>
          <p style={{ fontSize: 13, color: 'var(--muted)', maxWidth: 460, margin: '0 auto 16px', lineHeight: 1.6 }}>
            El análisis incluye scoring CAS/CAF/CER/CTF, comparativa con el nicho, oferta y demanda, y recomendación de compra.
          </p>
          <div style={{ display: 'flex', justifyContent: 'center', gap: 6, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 11, color: 'var(--muted2)' }}>Ejemplos:</span>
            {['acrelianews', 'channelad_demo', '8020ai'].map(ex => (
              <button key={ex}
                onClick={() => { setQuery(ex); setTimeout(runAnalysis, 0) }}
                style={{
                  background: purpleAlpha(0.08), color: PURPLE,
                  border: `1px solid ${purpleAlpha(0.2)}`, borderRadius: 6,
                  padding: '2px 8px', fontSize: 11, fontWeight: 600,
                  cursor: 'pointer', fontFamily: FONT_BODY,
                }}
              >{ex}</button>
            ))}
          </div>
        </div>
      )}

      {/* Multiple matches — let user pick */}
      {matches.length > 0 && !loading && (
        <div style={{
          background: 'var(--surface)', border: '1px solid var(--border)',
          borderRadius: 16, padding: 20,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
            <Search size={16} color={PURPLE} />
            <h3 style={{ fontFamily: FONT_DISPLAY, fontSize: 14, fontWeight: 700, color: 'var(--text)', margin: 0 }}>
              {matches.length} {matches.length === 1 ? 'coincidencia' : 'coincidencias'} para «{query}»
            </h3>
            <span style={{ fontSize: 11, color: 'var(--muted)', marginLeft: 'auto' }}>
              Selecciona el canal a analizar
            </span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {matches.map(m => {
              const id = m.id || m._id
              const name = m.nombreCanal || m.nombre || m.identificadorCanal || 'Canal'
              return (
                <button key={id}
                  onClick={() => analyzeById(id)}
                  style={{
                    background: 'var(--bg2)', border: '1px solid var(--border)',
                    borderRadius: 10, padding: '12px 14px',
                    display: 'flex', alignItems: 'center', gap: 12,
                    cursor: 'pointer', fontFamily: FONT_BODY, textAlign: 'left',
                    transition: 'border-color .15s',
                  }}
                  onMouseEnter={e => e.currentTarget.style.borderColor = purpleAlpha(0.4)}
                  onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border)'}
                >
                  <div style={{
                    width: 36, height: 36, borderRadius: 10,
                    background: purpleAlpha(0.1), color: PURPLE,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontFamily: FONT_DISPLAY, fontSize: 14, fontWeight: 800,
                    flexShrink: 0,
                  }}>{name[0].toUpperCase()}</div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13.5, fontWeight: 700, color: 'var(--text)' }}>{name}</div>
                    <div style={{ fontSize: 11.5, color: 'var(--muted)', display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                      {m.identificadorCanal && <span>{m.identificadorCanal}</span>}
                      {m.plataforma && <span>· {m.plataforma}</span>}
                      {m.categoria && <span>· {m.categoria}</span>}
                      {m.seguidores != null && <span>· {fmtNum(m.seguidores)} seg.</span>}
                    </div>
                  </div>
                  <ArrowRight size={14} color="var(--muted)" />
                </button>
              )
            })}
          </div>
        </div>
      )}

      {/* Loading skeleton */}
      {loading && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {[80, 120, 200].map((h, i) => (
            <div key={i} style={{
              background: 'var(--surface)', border: '1px solid var(--border)',
              borderRadius: 14, height: h,
              animation: 'pulse 1.5s ease-in-out infinite',
            }} />
          ))}
        </div>
      )}

      {/* Results */}
      {data && !loading && (
        <>
          {/* Verdict */}
          <VerdictBanner
            verdict={recommendation.verdict}
            score={recommendation.score}
            channelName={canal?.nombre}
            onCreateCampaign={() => navigate(`/advertiser/campaigns/new?channel=${data.canal?.id || data.canal?._id}`)}
          />

          {/* Channel hero */}
          <div style={{
            background: 'var(--surface)', border: '1px solid var(--border)',
            borderRadius: 16, padding: 24,
            display: 'grid', gridTemplateColumns: 'auto 1fr auto', gap: 24,
            alignItems: 'center',
          }}>
            <div style={{
              width: 64, height: 64, borderRadius: 16,
              background: purpleAlpha(0.1), border: `1px solid ${purpleAlpha(0.2)}`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontFamily: FONT_DISPLAY, fontSize: 22, fontWeight: 800, color: PURPLE,
            }}>
              {(canal?.nombre || '?')[0].toUpperCase()}
            </div>
            <div style={{ minWidth: 0 }}>
              <h2 style={{ fontFamily: FONT_DISPLAY, fontSize: 22, fontWeight: 800, color: 'var(--text)', marginBottom: 4, letterSpacing: '-0.02em' }}>
                {canal?.nombre || 'Canal sin nombre'}
              </h2>
              <div style={{ display: 'flex', gap: 14, color: 'var(--muted)', fontSize: 13, flexWrap: 'wrap' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  <Users size={12} /> {fmtNum(canal?.seguidores)} seguidores
                </span>
                {canal?.plataforma && <span>· {canal.plataforma}</span>}
                {canal?.nicho && <span>· {canal.nicho}</span>}
              </div>
              {canal?.descripcion && (
                <p style={{ fontSize: 12.5, color: 'var(--muted2)', marginTop: 8, lineHeight: 1.5, maxWidth: 540 }}>
                  {canal.descripcion.slice(0, 180)}{canal.descripcion.length > 180 ? '…' : ''}
                </p>
              )}
            </div>
            <div style={{ textAlign: 'center', flexShrink: 0 }}>
              <div style={{
                width: 76, height: 76, borderRadius: '50%',
                background: `${tierColor(scores?.nivel)}15`,
                border: `2px solid ${tierColor(scores?.nivel)}50`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                marginBottom: 6,
              }}>
                <span style={{ fontFamily: FONT_DISPLAY, fontSize: 32, fontWeight: 900, color: tierColor(scores?.nivel) }}>
                  {scores?.nivel || '?'}
                </span>
              </div>
              <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--muted)' }}>Nivel</div>
            </div>
          </div>

          {/* Reasons grid */}
          <div style={{
            background: 'var(--surface)', border: '1px solid var(--border)',
            borderRadius: 16, padding: 24,
          }}>
            <h3 style={{ fontFamily: FONT_DISPLAY, fontSize: 15, fontWeight: 700, color: 'var(--text)', marginBottom: 14 }}>
              Por qué {recommendation.verdict === 'buy' ? 'recomendamos comprar' : recommendation.verdict === 'skip' ? 'desaconsejamos' : 'recomendamos revisar'}
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {recommendation.reasons.map((r, i) => (
                <div key={i} style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  padding: '10px 14px',
                  background: r.pos ? `${OK}08` : `${ERR}08`,
                  border: `1px solid ${r.pos ? OK : ERR}25`,
                  borderRadius: 10,
                }}>
                  {r.pos
                    ? <CheckCircle2 size={16} color={OK} strokeWidth={2.4} />
                    : <XCircle size={16} color={ERR} strokeWidth={2.4} />}
                  <span style={{ fontSize: 13, color: 'var(--text)' }}>{r.text}</span>
                </div>
              ))}
              {recommendation.reasons.length === 0 && (
                <div style={{ fontSize: 13, color: 'var(--muted)', padding: 12, textAlign: 'center' }}>
                  Datos insuficientes para una recomendación firme.
                </div>
              )}
            </div>
          </div>

          {/* Scoring breakdown */}
          <div style={{
            background: 'var(--surface)', border: '1px solid var(--border)',
            borderRadius: 16, padding: 24,
            display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 24,
          }}>
            <div>
              <h3 style={{ fontFamily: FONT_DISPLAY, fontSize: 15, fontWeight: 700, color: 'var(--text)', marginBottom: 16 }}>
                Scoring detallado
              </h3>
              <ScoreBreakdown scores={scores} />
            </div>

            <div>
              <h3 style={{ fontFamily: FONT_DISPLAY, fontSize: 15, fontWeight: 700, color: 'var(--text)', marginBottom: 16 }}>
                CPM dinámico estimado
              </h3>
              <div style={{ fontFamily: FONT_DISPLAY, fontSize: 36, fontWeight: 900, color: PURPLE, letterSpacing: '-0.03em', marginBottom: 6 }}>
                €{scores?.CPMDinamico?.toFixed?.(2) || '—'}
              </div>
              <p style={{ fontSize: 12, color: 'var(--muted)', lineHeight: 1.5, marginBottom: 14 }}>
                Coste estimado por cada 1.000 impresiones según scoring + ajuste de nicho.
              </p>
              {scores?.confianzaScore != null && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--muted)' }}>
                  <Info size={12} />
                  Confianza de los datos: <strong style={{ color: 'var(--text)' }}>{scores.confianzaScore}/100</strong>
                </div>
              )}
            </div>
          </div>

          {/* Niche benchmark */}
          {niche?.trends && (
            <div style={{
              background: 'var(--surface)', border: '1px solid var(--border)',
              borderRadius: 16, padding: 24,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16, flexWrap: 'wrap', gap: 8 }}>
                <h3 style={{ fontFamily: FONT_DISPLAY, fontSize: 15, fontWeight: 700, color: 'var(--text)', margin: 0 }}>
                  Benchmark vs nicho «{canal?.nicho}»
                </h3>
                {niche.supply?.estado && (
                  <span style={{
                    fontSize: 11, fontWeight: 600,
                    background: niche.supply.estado === 'high-demand' ? `${WARN}15` : `${OK}12`,
                    color: niche.supply.estado === 'high-demand' ? WARN : OK,
                    border: `1px solid ${niche.supply.estado === 'high-demand' ? WARN : OK}30`,
                    borderRadius: 20, padding: '3px 10px',
                  }}>
                    {niche.supply.estado === 'high-demand' ? 'Alta demanda' : niche.supply.estado === 'high-supply' ? 'Sobre oferta' : 'Equilibrado'}
                  </span>
                )}
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 14 }}>
                {[
                  { label: 'CAS medio nicho', value: niche.trends.casPromedio, suffix: '', color: PURPLE },
                  { label: 'CTF medio nicho', value: niche.trends.ctfPromedio, suffix: '', color: BLUE },
                  { label: 'CPM medio nicho', value: niche.trends.cpmPromedio, suffix: '€', color: WARN, prefix: '€' },
                ].map(m => (
                  <div key={m.label} style={{
                    background: 'var(--bg2)', borderRadius: 12, padding: 14,
                  }}>
                    <div style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600 }}>
                      {m.label}
                    </div>
                    <div style={{ fontFamily: FONT_DISPLAY, fontSize: 22, fontWeight: 800, color: m.color }}>
                      {m.prefix || ''}{Number(m.value || 0).toFixed(1)}{m.suffix || ''}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Similar channels — cross-sell */}
          {similar.length > 0 && (
            <div style={{
              background: 'var(--surface)', border: '1px solid var(--border)',
              borderRadius: 16, padding: 24,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14, flexWrap: 'wrap', gap: 8 }}>
                <h3 style={{ fontFamily: FONT_DISPLAY, fontSize: 15, fontWeight: 700, color: 'var(--text)', margin: 0 }}>
                  Canales similares en «{canal?.nicho}»
                </h3>
                <span style={{ fontSize: 11, color: 'var(--muted)' }}>
                  {similar.length} alternativa{similar.length === 1 ? '' : 's'} relevante{similar.length === 1 ? '' : 's'}
                </span>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 12 }}>
                {similar.map((ch) => {
                  const chId = ch.id || ch._id
                  const chCAS = ch.scores?.CAS ?? ch.CAS ?? 0
                  const chCPM = ch.scores?.CPMDinamico ?? ch.CPMDinamico ?? 0
                  const chSubs = ch.seguidores ?? ch.subscribers ?? 0
                  const chTier = ch.scores?.nivel ?? ch.nivel ?? '?'
                  const chName = ch.nombre || ch.name || 'Canal'
                  const chPlat = ch.plataforma || ch.platform || ''
                  return (
                    <div key={chId || chName} style={{
                      background: 'var(--bg)',
                      border: '1px solid var(--border)',
                      borderRadius: 12,
                      padding: 14,
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 10,
                      transition: 'border-color .15s, transform .15s',
                      cursor: chId ? 'pointer' : 'default',
                    }}
                      onMouseEnter={e => { e.currentTarget.style.borderColor = purpleAlpha(0.4); e.currentTarget.style.transform = 'translateY(-1px)' }}
                      onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.transform = 'none' }}
                      onClick={() => {
                        if (!chId) return
                        // Re-analyze this channel
                        setQuery(chName)
                        setSearchParams({ q: chName }, { replace: true })
                        setData(null)
                        setSimilar([])
                        setNiche(null)
                        // Trigger analysis with the new id directly
                        setTimeout(() => {
                          setLoading(true)
                          apiService.getChannelIntelligence(chId).then(intel => {
                            if (intel?.success && intel.data) {
                              setData(intel.data)
                              const n = intel.data.canal?.nicho
                              if (n) {
                                Promise.all([
                                  apiService.getNicheTrends(n, 30).catch(() => null),
                                  apiService.getNicheSupplyDemand(n).catch(() => null),
                                  apiService.getNicheLeaderboard(n, 8).catch(() => null),
                                ]).then(([t, s, l]) => {
                                  setNiche({ trends: t?.success ? t.data : null, supply: s?.success ? s.data : null })
                                  if (l?.success && Array.isArray(l.data)) {
                                    setSimilar(l.data.filter(c => (c.id || c._id) !== chId).slice(0, 5))
                                  }
                                })
                              }
                            }
                            setLoading(false)
                            window.scrollTo({ top: 0, behavior: 'smooth' })
                          })
                        }, 50)
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div style={{
                          width: 36, height: 36, borderRadius: 10,
                          background: purpleAlpha(0.1),
                          border: `1px solid ${purpleAlpha(0.2)}`,
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontFamily: FONT_DISPLAY, fontSize: 14, fontWeight: 800, color: PURPLE,
                          flexShrink: 0,
                        }}>
                          {chName[0]?.toUpperCase() || '?'}
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{
                            fontSize: 13, fontWeight: 700, color: 'var(--text)',
                            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                          }}>
                            {chName}
                          </div>
                          <div style={{ fontSize: 11, color: 'var(--muted)', display: 'flex', gap: 6 }}>
                            <span>{chPlat}</span>
                            <span>·</span>
                            <span>{fmtNum(chSubs)} subs</span>
                          </div>
                        </div>
                        <div style={{
                          width: 32, height: 32, borderRadius: 8,
                          background: `${tierColor(chTier)}15`,
                          border: `1px solid ${tierColor(chTier)}40`,
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontFamily: FONT_DISPLAY, fontSize: 14, fontWeight: 800, color: tierColor(chTier),
                          flexShrink: 0,
                        }}>
                          {chTier}
                        </div>
                      </div>

                      <div style={{ display: 'flex', gap: 14, fontSize: 11, paddingTop: 8, borderTop: '1px solid var(--border)' }}>
                        <div>
                          <div style={{ color: 'var(--muted)', marginBottom: 2 }}>CAS</div>
                          <strong style={{ fontFamily: FONT_DISPLAY, fontSize: 14, color: 'var(--text)' }}>{Number(chCAS).toFixed(0)}</strong>
                        </div>
                        <div>
                          <div style={{ color: 'var(--muted)', marginBottom: 2 }}>CPM</div>
                          <strong style={{ fontFamily: FONT_DISPLAY, fontSize: 14, color: 'var(--text)' }}>€{Number(chCPM).toFixed(2)}</strong>
                        </div>
                        <button
                          style={{
                            marginLeft: 'auto',
                            background: 'none', border: 'none',
                            color: PURPLE, fontWeight: 600, fontSize: 11,
                            cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 3,
                            fontFamily: FONT_BODY, padding: 0,
                          }}
                        >
                          Analizar <ChevronRight size={11} />
                        </button>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* Flags warning */}
          {flags.length > 0 && (
            <div style={{
              background: `${ERR}08`, border: `1px solid ${ERR}30`,
              borderRadius: 16, padding: 20,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                <AlertTriangle size={18} color={ERR} />
                <h3 style={{ fontFamily: FONT_DISPLAY, fontSize: 15, fontWeight: 700, color: ERR, margin: 0 }}>
                  Señales de riesgo detectadas ({flags.length})
                </h3>
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {flags.map((f, i) => (
                  <span key={i} style={{
                    background: 'var(--surface)',
                    border: `1px solid ${ERR}40`,
                    color: ERR,
                    borderRadius: 8, padding: '4px 10px',
                    fontSize: 11, fontWeight: 600,
                  }}>{typeof f === 'string' ? f : (f.tipo || f.type || 'flag')}</span>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
