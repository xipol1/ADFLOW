import React, { useState, useCallback } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import {
  Search, Target, Sparkles, Users, AlertTriangle, ArrowRight,
  Crown, BarChart3, Filter,
} from 'lucide-react'
import apiService from '../../../../services/api'
import { FONT_BODY, FONT_DISPLAY, OK, WARN, ERR, BLUE } from '../../../theme/tokens'

const PURPLE = 'var(--accent, #8B5CF6)'
const purpleAlpha = (o) => `var(--accent-dim, rgba(139,92,246,${o}))`


// ─── Helpers ───────────────────────────────────────────────────────────────
function fmtNum(n) {
  if (n == null) return '—'
  if (n >= 1e6) return `${(n / 1e6).toFixed(1)}M`
  if (n >= 1e3) return `${(n / 1e3).toFixed(1)}K`
  return String(n)
}

function tierColor(nivel) {
  return ({ 'S': '#FFD700', 'A': OK, 'B': BLUE, 'C': WARN, 'D': '#94a3b8' })[nivel] || '#94a3b8'
}

// Similarity scoring — heuristic blend of niche / size / quality matches
function similarityScore(target, candidate) {
  if (!target || !candidate) return 0
  let score = 0

  // Niche match (40 pts)
  const tNiche = (target.canal?.nicho || '').toLowerCase()
  const cNiche = (candidate.nicho || candidate.categoria || '').toLowerCase()
  if (tNiche && tNiche === cNiche) score += 40
  else if (tNiche && cNiche && (tNiche.includes(cNiche) || cNiche.includes(tNiche))) score += 20

  // Audience size proximity (30 pts) — within 50% range = full points
  const tSubs = target.canal?.seguidores || 0
  const cSubs = candidate.seguidores || candidate.audiencia || 0
  if (tSubs > 0 && cSubs > 0) {
    const ratio = Math.min(tSubs, cSubs) / Math.max(tSubs, cSubs)
    score += Math.round(ratio * 30)
  }

  // CAS proximity (20 pts) — closer = better
  const tCAS = target.scores?.CAS || 50
  const cCAS = candidate.CAS || candidate.score || 50
  const casDiff = Math.abs(tCAS - cCAS)
  score += Math.max(0, 20 - casDiff)

  // Same platform bonus (10 pts)
  const tPlat = (target.canal?.plataforma || '').toLowerCase()
  const cPlat = (candidate.plataforma || '').toLowerCase()
  if (tPlat && tPlat === cPlat) score += 10

  return Math.min(100, Math.max(0, score))
}

// Why this matches — generate human-readable reasons
function matchReasons(target, candidate) {
  if (!target || !candidate) return []
  const reasons = []
  const tNiche = (target.canal?.nicho || '').toLowerCase()
  const cNiche = (candidate.nicho || candidate.categoria || '').toLowerCase()
  if (tNiche && tNiche === cNiche) reasons.push({ label: 'Mismo nicho', color: PURPLE })

  const tSubs = target.canal?.seguidores || 0
  const cSubs = candidate.seguidores || candidate.audiencia || 0
  if (tSubs > 0 && cSubs > 0) {
    const ratio = Math.min(tSubs, cSubs) / Math.max(tSubs, cSubs)
    if (ratio >= 0.7) reasons.push({ label: 'Audiencia similar', color: BLUE })
  }

  const tCAS = target.scores?.CAS || 50
  const cCAS = candidate.CAS || candidate.score || 50
  if (Math.abs(tCAS - cCAS) <= 8) reasons.push({ label: 'CAS similar', color: OK })

  const tPlat = (target.canal?.plataforma || '').toLowerCase()
  const cPlat = (candidate.plataforma || '').toLowerCase()
  if (tPlat && tPlat === cPlat) reasons.push({ label: 'Misma plataforma', color: WARN })

  return reasons
}


// ─── Search bar ────────────────────────────────────────────────────────────
function SearchBar({ value, onChange, onSubmit, loading }) {
  return (
    <form onSubmit={(e) => { e.preventDefault(); onSubmit() }}
      style={{
        background: 'var(--surface)', border: `1px solid ${purpleAlpha(0.25)}`,
        borderRadius: 16, padding: 6, display: 'flex', alignItems: 'center', gap: 6,
        boxShadow: `0 4px 20px ${purpleAlpha(0.08)}`,
      }}
    >
      <Search size={18} color={PURPLE} style={{ marginLeft: 12 }} />
      <input
        type="text" value={value} onChange={e => onChange(e.target.value)}
        placeholder="Pega un canal que te haya funcionado bien (ej: acrelianews, channelad_demo)"
        style={{
          flex: 1, background: 'transparent', border: 'none', padding: '12px 8px',
          fontSize: 15, color: 'var(--text)', outline: 'none', fontFamily: FONT_BODY,
        }}
        disabled={loading}
      />
      <button type="submit" disabled={loading || !value.trim()}
        style={{
          background: PURPLE, color: '#fff', border: 'none', borderRadius: 10,
          padding: '10px 22px', fontSize: 14, fontWeight: 600,
          cursor: loading || !value.trim() ? 'not-allowed' : 'pointer',
          opacity: loading || !value.trim() ? 0.6 : 1, fontFamily: FONT_BODY,
          display: 'flex', alignItems: 'center', gap: 6,
        }}
      >
        <Target size={14} /> {loading ? 'Buscando…' : 'Buscar similares'}
      </button>
    </form>
  )
}

// ─── Lookalike row ─────────────────────────────────────────────────────────
function LookalikeRow({ candidate, similarity, reasons, target, onAnalyze, onCreateCampaign }) {
  const id = candidate.id || candidate._id
  const name = candidate.nombreCanal || candidate.nombre || candidate.identificadorCanal || 'Canal'
  const cas = candidate.CAS || candidate.score
  const subs = candidate.seguidores || candidate.audiencia

  const simColor = similarity >= 75 ? OK : similarity >= 50 ? BLUE : similarity >= 30 ? WARN : ERR

  return (
    <div style={{
      background: 'var(--surface)', border: '1px solid var(--border)',
      borderRadius: 12, padding: 14,
      display: 'grid', gridTemplateColumns: '40px 1fr auto auto auto', gap: 14,
      alignItems: 'center',
    }}>
      <div style={{
        width: 40, height: 40, borderRadius: 10,
        background: purpleAlpha(0.12), color: PURPLE,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontFamily: FONT_DISPLAY, fontSize: 16, fontWeight: 800, flexShrink: 0,
      }}>{name[0].toUpperCase()}</div>

      <div style={{ minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
          <span style={{
            fontFamily: FONT_DISPLAY, fontSize: 14, fontWeight: 700, color: 'var(--text)',
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          }}>{name}</span>
          {candidate.nivel && (
            <span style={{
              background: `${tierColor(candidate.nivel)}20`, color: tierColor(candidate.nivel),
              border: `1px solid ${tierColor(candidate.nivel)}40`,
              borderRadius: 5, padding: '1px 6px', fontSize: 10, fontWeight: 700,
            }}>{candidate.nivel}</span>
          )}
        </div>
        <div style={{ display: 'flex', gap: 8, fontSize: 11.5, color: 'var(--muted)', flexWrap: 'wrap' }}>
          {candidate.plataforma && <span>{candidate.plataforma}</span>}
          {(candidate.nicho || candidate.categoria) && <span>· {candidate.nicho || candidate.categoria}</span>}
          {subs != null && <span>· {fmtNum(subs)} subs</span>}
        </div>
        {reasons.length > 0 && (
          <div style={{ display: 'flex', gap: 5, marginTop: 6, flexWrap: 'wrap' }}>
            {reasons.map((r, i) => (
              <span key={i} style={{
                fontSize: 10, fontWeight: 700, color: r.color,
                background: `${r.color}10`, border: `1px solid ${r.color}30`,
                borderRadius: 6, padding: '2px 6px',
              }}>{r.label}</span>
            ))}
          </div>
        )}
      </div>

      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: 10, color: 'var(--muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 2 }}>CAS</div>
        <div style={{ fontFamily: FONT_DISPLAY, fontSize: 16, fontWeight: 800, color: 'var(--text)' }}>
          {cas != null ? cas : '—'}
        </div>
      </div>

      <div style={{ textAlign: 'center', minWidth: 70 }}>
        <div style={{ fontSize: 10, color: 'var(--muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 2 }}>Similitud</div>
        <div style={{
          fontFamily: FONT_DISPLAY, fontSize: 18, fontWeight: 800, color: simColor,
        }}>{similarity}%</div>
      </div>

      <div style={{ display: 'flex', gap: 6 }}>
        <button onClick={onAnalyze}
          style={{
            background: 'var(--bg2)', border: '1px solid var(--border)',
            borderRadius: 8, padding: '7px 12px',
            fontSize: 11, fontWeight: 600, cursor: 'pointer',
            fontFamily: FONT_BODY, color: 'var(--muted)',
            display: 'flex', alignItems: 'center', gap: 4,
          }}
          title="Analizar este canal en detalle"
        >
          <BarChart3 size={11} /> Analizar
        </button>
        <button onClick={onCreateCampaign}
          style={{
            background: PURPLE, border: 'none', borderRadius: 8, padding: '7px 12px',
            fontSize: 11, fontWeight: 700, cursor: 'pointer',
            color: '#fff', fontFamily: FONT_BODY,
            display: 'flex', alignItems: 'center', gap: 4,
          }}
          title="Crear campaña en este canal"
        >
          Campaña <ArrowRight size={10} />
        </button>
      </div>
    </div>
  )
}


// ─── Main ──────────────────────────────────────────────────────────────────
export default function LookalikeChannelsPage() {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const [query, setQuery] = useState(searchParams.get('q') || '')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [target, setTarget] = useState(null)
  const [results, setResults] = useState([])
  const [minSim, setMinSim] = useState(30)

  const runSearch = useCallback(async () => {
    const raw = (query || '').trim()
    if (!raw) return
    setLoading(true); setError(''); setTarget(null); setResults([])

    const cleaned = raw
      .replace(/^https?:\/\//i, '')
      .replace(/^(t\.me|telegram\.me|instagram\.com|youtube\.com\/c|youtube\.com\/@)\//i, '')
      .replace(/^@/, '').replace(/\/.*$/, '')

    setSearchParams({ q: raw }, { replace: true })

    try {
      // Resolve the target channel
      let resolvedId = null
      if (/^[0-9a-fA-F]{24}$/.test(cleaned)) {
        resolvedId = cleaned
      } else {
        const lookup = await apiService.getChannelByUsername(cleaned).catch(() => null)
        if (lookup?.success && lookup.data?.id) resolvedId = lookup.data.id
        else {
          // Fallback to fuzzy search and take top result
          const search = await apiService.searchChannels({ busqueda: cleaned, limite: 1 }).catch(() => null)
          const items = search?.data?.canales || search?.data?.items || search?.data || []
          if (items[0]) resolvedId = items[0].id || items[0]._id
        }
      }
      if (!resolvedId) {
        setError(`No encontramos "${cleaned}". Verifica el username.`)
        setLoading(false); return
      }

      const intel = await apiService.getChannelIntelligence(resolvedId)
      if (!intel?.success || !intel.data) {
        setError('No se pudo cargar el canal de referencia.')
        setLoading(false); return
      }
      setTarget(intel.data)

      const targetCanal = intel.data.canal || {}
      const targetId = targetCanal.id || targetCanal._id || resolvedId

      // Fetch candidates from multiple sources for richer results
      const [leaderboard, sameCategory] = await Promise.all([
        targetCanal.nicho ? apiService.getNicheLeaderboard(targetCanal.nicho, 30).catch(() => null) : Promise.resolve(null),
        apiService.searchChannels({
          categoria: targetCanal.categoria || targetCanal.nicho,
          plataforma: targetCanal.plataforma,
          limite: 30,
        }).catch(() => null),
      ])

      // Merge candidates, dedupe
      const pool = []
      const seen = new Set([String(targetId)])
      const addAll = (items) => {
        if (!Array.isArray(items)) return
        for (const it of items) {
          const id = String(it.id || it._id || '')
          if (!id || seen.has(id)) continue
          seen.add(id)
          pool.push(it)
        }
      }
      if (leaderboard?.success) addAll(leaderboard.data)
      addAll(sameCategory?.data?.canales || sameCategory?.data?.items || sameCategory?.data || [])

      // Score and sort
      const scored = pool.map(c => ({
        candidate: c,
        similarity: similarityScore(intel.data, c),
        reasons: matchReasons(intel.data, c),
      }))
      scored.sort((a, b) => b.similarity - a.similarity)
      setResults(scored.slice(0, 15))
    } catch (e) {
      console.error('LookalikeChannels.runSearch failed:', e)
      setError(e.message || 'Error al buscar similares')
    }
    setLoading(false)
  }, [query, setSearchParams])

  React.useEffect(() => {
    if (searchParams.get('q') && !target && !loading) runSearch()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const filtered = results.filter(r => r.similarity >= minSim)

  return (
    <div style={{ fontFamily: FONT_BODY, display: 'flex', flexDirection: 'column', gap: 24, maxWidth: 1100 }}>

      {/* Header */}
      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
          <div style={{
            width: 40, height: 40, borderRadius: 12,
            background: purpleAlpha(0.12), border: `1px solid ${purpleAlpha(0.25)}`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <Target size={20} color={PURPLE} />
          </div>
          <h1 style={{
            fontFamily: FONT_DISPLAY, fontSize: 28, fontWeight: 800,
            color: 'var(--text)', letterSpacing: '-0.04em', lineHeight: 1.1, margin: 0,
          }}>
            Canales similares
          </h1>
        </div>
        <p style={{ fontSize: 14, color: 'var(--muted)', lineHeight: 1.5 }}>
          Encuentra canales parecidos al que ya te ha funcionado. Mismo nicho, plataforma, audiencia y calidad.
        </p>
      </div>

      <SearchBar value={query} onChange={setQuery} onSubmit={runSearch} loading={loading} />

      {error && (
        <div role="alert" style={{
          background: `${ERR}10`, border: `1px solid ${ERR}30`, color: ERR,
          borderRadius: 12, padding: '12px 16px', fontSize: 13,
          display: 'flex', alignItems: 'center', gap: 10,
        }}>
          <AlertTriangle size={16} /> <span>{error}</span>
        </div>
      )}

      {/* Empty state */}
      {!target && !loading && !error && (
        <div style={{
          background: 'var(--surface)', border: '1px dashed var(--border)',
          borderRadius: 18, padding: '60px 28px', textAlign: 'center',
        }}>
          <div style={{
            width: 64, height: 64, borderRadius: 18,
            background: purpleAlpha(0.08), border: `1px solid ${purpleAlpha(0.18)}`,
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center', marginBottom: 16,
          }}>
            <Sparkles size={28} color={PURPLE} />
          </div>
          <h3 style={{ fontFamily: FONT_DISPLAY, fontSize: 17, fontWeight: 700, color: 'var(--text)', marginBottom: 6 }}>
            Empieza con un canal de referencia
          </h3>
          <p style={{ fontSize: 13, color: 'var(--muted)', maxWidth: 480, margin: '0 auto', lineHeight: 1.6 }}>
            La similitud se calcula a partir de nicho (40%), audiencia (30%), CAS (20%) y plataforma (10%).
          </p>
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {[60, 60, 60].map((h, i) => (
            <div key={i} style={{
              background: 'var(--surface)', border: '1px solid var(--border)',
              borderRadius: 12, height: h,
              animation: 'pulse 1.5s ease-in-out infinite',
            }} />
          ))}
        </div>
      )}

      {/* Target reference card */}
      {target && !loading && (
        <div style={{
          background: `${PURPLE}06`, border: `1px solid ${purpleAlpha(0.3)}`,
          borderRadius: 14, padding: 18,
          display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap',
        }}>
          <div style={{
            width: 48, height: 48, borderRadius: 12,
            background: PURPLE, color: '#fff',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontFamily: FONT_DISPLAY, fontSize: 18, fontWeight: 800,
          }}>{(target.canal?.nombre || '?')[0].toUpperCase()}</div>
          <div style={{ flex: 1, minWidth: 200 }}>
            <div style={{ fontSize: 11, color: PURPLE, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 2 }}>
              Canal de referencia
            </div>
            <div style={{ fontFamily: FONT_DISPLAY, fontSize: 18, fontWeight: 800, color: 'var(--text)' }}>
              {target.canal?.nombre || target.canal?.identificadorCanal || 'Canal'}
            </div>
            <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 2 }}>
              {target.canal?.plataforma} · {target.canal?.nicho} · {fmtNum(target.canal?.seguidores)} subs · CAS {target.scores?.CAS}
            </div>
          </div>
          <div style={{
            background: 'var(--surface)', border: `1px solid ${purpleAlpha(0.2)}`,
            borderRadius: 10, padding: '8px 12px',
          }}>
            <div style={{ fontSize: 10, color: 'var(--muted)' }}>Encontrados</div>
            <div style={{ fontFamily: FONT_DISPLAY, fontSize: 18, fontWeight: 800, color: PURPLE }}>
              {filtered.length} similares
            </div>
          </div>
        </div>
      )}

      {/* Filter */}
      {target && !loading && results.length > 0 && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          <Filter size={14} color="var(--muted)" />
          <span style={{ fontSize: 12, color: 'var(--muted)', fontWeight: 600 }}>Similitud mínima:</span>
          {[0, 30, 50, 70].map(n => {
            const active = minSim === n
            return (
              <button key={n} onClick={() => setMinSim(n)} style={{
                background: active ? PURPLE : 'var(--surface)',
                color: active ? '#fff' : 'var(--muted)',
                border: `1px solid ${active ? PURPLE : 'var(--border)'}`,
                borderRadius: 8, padding: '5px 10px', fontSize: 12, fontWeight: 600,
                cursor: 'pointer', fontFamily: FONT_BODY,
              }}>{n}%+</button>
            )
          })}
        </div>
      )}

      {/* Results */}
      {target && !loading && (
        filtered.length === 0 ? (
          <div style={{
            background: 'var(--surface)', border: '1px dashed var(--border)',
            borderRadius: 14, padding: '40px 24px', textAlign: 'center',
            color: 'var(--muted)', fontSize: 13,
          }}>
            {results.length === 0
              ? 'No encontramos canales similares en el nicho. Prueba con otro canal de referencia.'
              : `Ningún canal supera el ${minSim}% de similitud. Baja el filtro para ver más opciones.`}
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {filtered.map((r, i) => {
              const id = r.candidate.id || r.candidate._id
              const username = r.candidate.identificadorCanal || id
              return (
                <LookalikeRow
                  key={id}
                  candidate={r.candidate}
                  similarity={r.similarity}
                  reasons={r.reasons}
                  target={target}
                  onAnalyze={() => navigate(`/advertiser/analyze/channel?q=${encodeURIComponent(username)}`)}
                  onCreateCampaign={() => navigate(`/advertiser/campaigns/new?channel=${id}`)}
                />
              )
            })}
          </div>
        )
      )}
    </div>
  )
}
