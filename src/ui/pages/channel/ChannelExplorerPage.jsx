import React, { useEffect, useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { Helmet } from 'react-helmet-async'
import { ArrowLeft, ChevronDown, Clock, ExternalLink } from 'lucide-react'
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, AreaChart, Area } from 'recharts'
import apiService from '../../../../services/api'
import { useAuth } from '../../../auth/AuthContext'
import { StatCard, ScoreBar, scoreLabel, Badge, ProfileSkeleton } from '../../../components/ui'

function maskText(t, show = 2) {
  if (!t || t.length <= show) return '••••••'
  return t.slice(0, show) + '•'.repeat(Math.min(t.length - show, 8))
}

// ─── Helpers ────────────────────────────────────────────────────────────────
const fmtNum = (n) => {
  if (n == null || Number.isNaN(n)) return '—'
  if (n >= 1e6) return `${(n / 1e6).toFixed(1)}M`
  if (n >= 1e3) return `${(n / 1e3).toFixed(1)}K`
  return String(n)
}

const fmtDate = (d) => {
  if (!d) return ''
  const date = new Date(d)
  if (Number.isNaN(date.getTime())) return ''
  return date.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })
}

const fmtDateFull = (d) => {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' })
}

function scoreColor(v) {
  if (v >= 90) return 'var(--gold)'
  if (v >= 75) return 'var(--accent)'
  if (v >= 60) return 'var(--blue)'
  if (v >= 40) return '#E3B341'
  return 'var(--red)'
}

const SCORE_DESCRIPTIONS = {
  CAF: 'Mide la autenticidad de la audiencia. Detecta seguidores bot o comprados comparando engagement vs suscriptores.',
  CTF: 'Evalua la credibilidad del contenido historico. Canales verificados con historial consistente puntuan mas alto.',
  CER: 'Ratio real de visualizaciones sobre suscriptores. Un canal con 10K subs y 8K views/post tiene CER superior a uno con 100K subs y 5K views/post.',
  CVS: 'Tendencia de crecimiento. Compara views de los ultimos 10 posts vs los 10 anteriores.',
  CAS: 'Frecuencia y consistencia de publicacion. Posts/semana y regularidad temporal.',
  CAP: 'Calidad del perfil de audiencia basado en metricas de interaccion y retencion.',
}

const CATEGORY_COLORS = {
  finanzas: '#F0B429', marketing: '#00D4A8', tecnologia: '#58A6FF',
  cripto: '#F59E0B', salud: '#10B981', educacion: '#8B5CF6',
  lifestyle: '#EC4899', entretenimiento: '#F97316', default: '#8B949E',
}

const PERIODS = [
  { key: 7, label: '7d' },
  { key: 14, label: '14d' },
  { key: 30, label: '30d' },
  { key: 90, label: '90d' },
]

// ─── Evolution Chart ────────────────────────────────────────────────────────
function EvolutionChart({ snapshots }) {
  if (!snapshots || snapshots.length < 2) {
    return (
      <div className="flex flex-col items-center justify-center py-12 gap-2" style={{ color: 'var(--text-secondary)' }}>
        <Clock size={24} />
        <span className="text-sm font-medium">Acumulando datos</span>
        <span className="text-xs" style={{ color: 'var(--muted2)' }}>Disponible a partir del segundo dia de tracking</span>
      </div>
    )
  }

  const data = snapshots.map((s) => ({
    date: fmtDate(s.date || s.fecha),
    subs: s.subscribers ?? s.seguidores ?? 0,
    views: s.avg_views ?? 0,
  }))

  return (
    <ResponsiveContainer width="100%" height={220}>
      <AreaChart data={data} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
        <defs>
          <linearGradient id="gradSubs" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--accent)" stopOpacity={0.15} />
            <stop offset="100%" stopColor="var(--accent)" stopOpacity={0} />
          </linearGradient>
          <linearGradient id="gradViews" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--blue)" stopOpacity={0.15} />
            <stop offset="100%" stopColor="var(--blue)" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
        <XAxis dataKey="date" tick={{ fontSize: 10, fill: 'var(--muted2)' }} tickLine={false} axisLine={false} />
        <YAxis yAxisId="left" tick={{ fontSize: 10, fill: 'var(--muted2)' }} tickLine={false} axisLine={false} tickFormatter={fmtNum} />
        <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 10, fill: 'var(--muted2)' }} tickLine={false} axisLine={false} tickFormatter={fmtNum} />
        <Tooltip
          contentStyle={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 12, fontFamily: 'var(--font-mono)' }}
          labelStyle={{ color: 'var(--text-secondary)' }}
        />
        <Area yAxisId="left" type="monotone" dataKey="subs" name="Suscriptores" stroke="var(--accent)" fill="url(#gradSubs)" strokeWidth={2} />
        <Area yAxisId="right" type="monotone" dataKey="views" name="Avg Views" stroke="var(--blue)" fill="url(#gradViews)" strokeWidth={2} strokeDasharray="5 5" />
      </AreaChart>
    </ResponsiveContainer>
  )
}

// ═══════════════════════════════════════════════════════════════════════════
export default function ChannelExplorerPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { isAuthenticated } = useAuth()
  const [state, setState] = useState('loading')
  const [data, setData] = useState(null)
  const [snapshots, setSnapshots] = useState([])
  const [days, setDays] = useState(30)
  const [descExpanded, setDescExpanded] = useState(false)

  const isObjectId = /^[a-f\d]{24}$/i.test(id)

  useEffect(() => {
    let cancelled = false
    setState('loading')
    setData(null)
    setSnapshots([])

    const load = async () => {
      let channelId = id
      if (!isObjectId) {
        try {
          const resolved = await apiService.getChannelByUsername(id)
          if (resolved?.success && resolved.data?.id) channelId = resolved.data.id
          else { if (!cancelled) setState('error'); return }
        } catch { if (!cancelled) setState('error'); return }
      }

      try {
        const [intelRes, snapRes] = await Promise.all([
          apiService.getChannelIntelligence(channelId),
          apiService.getChannelSnapshots(channelId, days).catch(() => ({ success: false })),
        ])
        if (cancelled) return
        if (intelRes?.success && intelRes.data) { setData(intelRes.data); setState('data') }
        else setState('error')
        if (snapRes?.success && Array.isArray(snapRes.data)) setSnapshots(snapRes.data)
      } catch { if (!cancelled) setState('error') }
    }

    load()
    return () => { cancelled = true }
  }, [id, isObjectId, days])

  // ── LOADING ────────────────────────────────────────────────
  if (state === 'loading') {
    return (
      <div className="min-h-screen" style={{ background: 'var(--bg)' }}>
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8">
          <ProfileSkeleton />
        </div>
      </div>
    )
  }

  // ── ERROR ──────────────────────────────────────────────────
  if (state === 'error' || !data) {
    return (
      <div className="min-h-screen" style={{ background: 'var(--bg)' }}>
        <Helmet><title>Canal no encontrado · Channelad</title></Helmet>
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8">
          <div className="rounded-xl text-center py-20" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
            <div className="text-4xl mb-3">📡</div>
            <h2 className="text-lg font-semibold mb-1" style={{ color: 'var(--text)' }}>Canal no encontrado</h2>
            <p className="text-sm mb-6" style={{ color: 'var(--text-secondary)' }}>Puede que haya sido retirado o la URL sea incorrecta.</p>
            <Link to="/explore" className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium" style={{ border: '1px solid var(--border)', color: 'var(--text-secondary)' }}>
              <ArrowLeft size={14} /> Volver a explorar
            </Link>
          </div>
        </div>
      </div>
    )
  }

  // ── DATA ───────────────────────────────────────────────────
  const { canal, scores, historial, benchmark, campanias } = data
  const { nombre, plataforma, nicho, seguidores, descripcion } = canal || {}
  const { CAS, CAF, CTF, CER, CVS, CAP, nivel, CPMDinamico, ratioCTF_CAF, confianzaScore, flags = [] } = scores || {}

  const catColor = CATEGORY_COLORS[(nicho || '').toLowerCase()] || CATEGORY_COLORS.default
  const disponible = Boolean(campanias?.disponible)
  const lastSnap = snapshots.length > 0 ? snapshots[snapshots.length - 1] : null
  const longDesc = descripcion && descripcion.length > 200

  return (
    <div className="min-h-screen" style={{ background: 'var(--bg)', fontFamily: 'var(--font-sans)' }}>
      <Helmet>
        <title>{`@${nombre} · CAS ${CAS} · Channelad`}</title>
        <meta name="description" content={`Canal ${plataforma} verificado. CAS ${CAS}/100 (${scoreLabel(CAS || 0)}). CPM €${Number(CPMDinamico || 0).toFixed(1)}.`} />
      </Helmet>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8">

        {/* ── SECTION 1: HERO ──────────────────────────────────── */}
        <div className="rounded-xl p-6 mb-4" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
          <div className="flex items-start gap-4 sm:gap-5">
            {/* Avatar */}
            <div
              className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl flex items-center justify-center text-2xl sm:text-3xl font-bold flex-shrink-0"
              style={{ background: `${catColor}12`, color: catColor, border: `1px solid ${catColor}25` }}
            >
              {isAuthenticated ? (nombre || '?').charAt(0).toUpperCase() : '?'}
            </div>

            <div className="flex-1 min-w-0">
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight" style={{ color: 'var(--text)' }}>
                {isAuthenticated ? `@${nombre || '—'}` : `@${maskText(nombre)}`}
              </h1>
              <div className="flex items-center flex-wrap gap-2 mt-2">
                <Badge label={plataforma || '—'} variant="platform" platform={plataforma} />
                {nicho && <Badge label={nicho} variant="category" />}
                {confianzaScore >= 60 && <Badge label="Verificado" variant="verified" />}
              </div>

              {/* Description */}
              {descripcion && (
                <div className="mt-3">
                  <p className="text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                    {longDesc && !descExpanded ? descripcion.slice(0, 200) + '...' : descripcion}
                  </p>
                  {longDesc && (
                    <button onClick={() => setDescExpanded(!descExpanded)} className="text-xs font-medium mt-1" style={{ color: 'var(--accent)', background: 'none', border: 'none', cursor: 'pointer' }}>
                      {descExpanded ? 'Ver menos' : 'Ver mas'}
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Claim banner */}
          {canal && !canal.claimed && (
            <div className="mt-4 flex items-center justify-between gap-3 flex-wrap rounded-lg px-4 py-3" style={{ background: 'var(--accent-dim)', border: '1px solid var(--accent-border)' }}>
              <div>
                <span className="text-sm font-medium" style={{ color: 'var(--text)' }}>Eres el admin de este canal?</span>
                <span className="text-xs ml-2" style={{ color: 'var(--text-secondary)' }}>Reclamalo para gestionar tu publicidad</span>
              </div>
              <button onClick={() => navigate(`/claim/${canal.id}`)} className="text-xs font-semibold px-3 py-1.5 rounded-md" style={{ border: '1px solid var(--accent)', color: 'var(--accent)', background: 'transparent', cursor: 'pointer' }}>
                Reclamar
              </button>
            </div>
          )}
        </div>

        {/* ── SECTION 2: STATS ─────────────────────────────────── */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
          <StatCard label="Suscriptores" value={fmtNum(seguidores)} />
          <StatCard label="Avg Views" value={lastSnap?.avg_views != null ? fmtNum(lastSnap.avg_views) : '—'} />
          <StatCard label="Engagement" value={lastSnap?.engagement_rate != null ? `${(lastSnap.engagement_rate * 100).toFixed(1)}` : '—'} suffix="%" />
          <StatCard label="€/post" value={isAuthenticated ? (CPMDinamico > 0 ? `€${Number(CPMDinamico).toFixed(0)}` : '—') : '€••'} />
        </div>

        {/* ── SECTION 3: SCORE BREAKDOWN ───────────────────────── */}
        <div className="rounded-xl p-5 sm:p-6 mb-4" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
          <div className="flex items-baseline justify-between mb-5">
            <div>
              <h2 className="text-sm font-semibold" style={{ color: 'var(--text-secondary)' }}>Score ChannelAd</h2>
              <p className="text-[10px] mt-0.5" style={{ color: 'var(--muted2)' }}>Calculado sobre 6 dimensiones de calidad</p>
            </div>
            {CAS != null && (
              <div className="text-right">
                <span className="text-3xl sm:text-4xl font-medium" style={{ color: scoreColor(CAS), fontFamily: 'var(--font-mono)' }}>{Math.round(CAS)}</span>
                <span className="block text-xs font-semibold mt-0.5" style={{ color: scoreColor(CAS) }}>{scoreLabel(CAS)}</span>
              </div>
            )}
          </div>

          <div className="space-y-3">
            <ScoreBar label="CAF" value={CAF} description={SCORE_DESCRIPTIONS.CAF} />
            <ScoreBar label="CTF" value={CTF} description={SCORE_DESCRIPTIONS.CTF} />
            <ScoreBar label="CER" value={CER} description={SCORE_DESCRIPTIONS.CER} />
            <ScoreBar label="CVS" value={CVS} description={SCORE_DESCRIPTIONS.CVS} />
            <ScoreBar label="CAS" value={CAS} description={SCORE_DESCRIPTIONS.CAS} />
            <ScoreBar label="CAP" value={CAP} description={SCORE_DESCRIPTIONS.CAP} />
          </div>
        </div>

        {/* ── SECTION 4: EVOLUTION CHART ───────────────────────── */}
        <div className="rounded-xl p-5 sm:p-6 mb-4" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold" style={{ color: 'var(--text-secondary)' }}>Evolucion</h2>
            <div className="flex gap-1 p-0.5 rounded-md" style={{ background: 'var(--bg3)' }}>
              {PERIODS.map((p) => (
                <button
                  key={p.key}
                  onClick={() => setDays(p.key)}
                  className="px-2.5 py-1 rounded text-[11px] font-medium"
                  style={{
                    background: days === p.key ? 'var(--accent)' : 'transparent',
                    color: days === p.key ? '#080C10' : 'var(--muted2)',
                    border: 'none', cursor: 'pointer',
                  }}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>
          <EvolutionChart snapshots={snapshots} />
        </div>

        {/* ── SECTION 5: INFO GRID ─────────────────────────────── */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
          {[
            { label: 'Ultimo post', value: lastSnap?.last_post_date ? fmtDateFull(lastSnap.last_post_date) : '—' },
            { label: 'Frecuencia', value: lastSnap?.post_frequency ? `${lastSnap.post_frequency} posts/sem` : '—' },
            { label: 'Tendencia', value: lastSnap?.views_trend > 0 ? '📈 Creciendo' : lastSnap?.views_trend < 0 ? '📉 Bajando' : '→ Estable' },
            { label: 'Campanas', value: `${campanias?.completadas ?? 0} completadas` },
          ].map((item) => (
            <div key={item.label} className="rounded-lg px-3 py-3" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
              <span className="text-[10px] font-medium uppercase tracking-wider block" style={{ color: 'var(--muted2)' }}>{item.label}</span>
              <span className="text-sm font-medium mt-1 block" style={{ color: 'var(--text)', fontFamily: 'var(--font-mono)' }}>{item.value}</span>
            </div>
          ))}
        </div>

        {/* ── SECTION 6: CTA ───────────────────────────────────── */}
        <div className="text-center mb-8">
          <button
            onClick={() => navigate(`/advertiser/explore?canal=${encodeURIComponent(canal.id)}`)}
            className="px-8 py-3 rounded-xl text-base font-bold transition-all"
            style={{ background: 'var(--accent)', color: '#080C10', border: 'none', cursor: 'pointer', boxShadow: 'var(--shadow-btn-glow)' }}
            onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.filter = 'brightness(1.1)' }}
            onMouseLeave={(e) => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.filter = 'none' }}
          >
            Contratar publicidad en este canal →
          </button>
          <p className="text-[11px] mt-3 flex items-center justify-center gap-1.5" style={{ color: 'var(--muted2)' }}>
            Pago protegido por escrow · Metricas verificadas
          </p>
        </div>
      </div>
    </div>
  )
}
