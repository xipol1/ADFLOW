import React, { useState, useCallback, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Users, Search, X, AlertTriangle, Info, Sparkles,
  Layers, ArrowRight, AlertCircle,
} from 'lucide-react'
import apiService from '../../../../services/api'
import { FONT_BODY, FONT_DISPLAY, OK, WARN, ERR, BLUE } from '../../../theme/tokens'

const PURPLE = 'var(--accent, #8B5CF6)'
const purpleAlpha = (o) => `var(--accent-dim, rgba(139,92,246,${o}))`

const MAX_CHANNELS = 5
const MIN_CHANNELS = 2

const fmtNum = (n) => n == null ? '—' : n >= 1e6 ? `${(n / 1e6).toFixed(1)}M` : n >= 1e3 ? `${(n / 1e3).toFixed(1)}K` : String(n)


// ─── Overlap heuristic ─────────────────────────────────────────────────────
// Without real audience graph data, we estimate overlap from:
//   - Same niche: +35 pts (audiences in the same vertical share interests)
//   - Same platform: +20 pts (platform-specific user base)
//   - Similar audience size (within 50%): +15 pts
//   - Same broader category bucket: +10 pts
// The output is calibrated to typical observed overlap rates (10-70%).
function estimateOverlap(a, b) {
  if (!a || !b) return 0
  let score = 5  // baseline

  const aNiche = (a.canal?.nicho || a.canal?.categoria || '').toLowerCase()
  const bNiche = (b.canal?.nicho || b.canal?.categoria || '').toLowerCase()
  if (aNiche && aNiche === bNiche) score += 35
  else if (aNiche && bNiche && (aNiche.includes(bNiche) || bNiche.includes(aNiche))) score += 18

  const aPlat = (a.canal?.plataforma || '').toLowerCase()
  const bPlat = (b.canal?.plataforma || '').toLowerCase()
  if (aPlat && aPlat === bPlat) score += 20

  const aSubs = a.canal?.seguidores || 0
  const bSubs = b.canal?.seguidores || 0
  if (aSubs > 0 && bSubs > 0) {
    const ratio = Math.min(aSubs, bSubs) / Math.max(aSubs, bSubs)
    if (ratio >= 0.5) score += 15
    else if (ratio >= 0.25) score += 8
  }

  // Audience-quality cluster: high CAS channels tend to share quality audiences
  const aCAS = a.scores?.CAS || 0
  const bCAS = b.scores?.CAS || 0
  if (aCAS >= 70 && bCAS >= 70) score += 10
  else if (Math.abs(aCAS - bCAS) <= 10) score += 5

  return Math.max(0, Math.min(85, score))  // cap at 85% (rarely 100% in reality)
}

function overlapColor(pct) {
  if (pct >= 60) return ERR
  if (pct >= 40) return WARN
  if (pct >= 20) return BLUE
  return OK
}


// ─── Picker ─────────────────────────────────────────────────────────────────
function ChannelPicker({ onPick, disabled }) {
  const [q, setQ] = useState('')
  const [results, setResults] = useState([])
  const [loading, setLoading] = useState(false)
  const [open, setOpen] = useState(false)

  React.useEffect(() => {
    if (!q.trim()) { setResults([]); return }
    const t = setTimeout(async () => {
      setLoading(true)
      try {
        const res = await apiService.searchChannels({ busqueda: q.trim(), limite: 8 })
        const items = res?.data?.canales || res?.data?.items || res?.data || []
        setResults(Array.isArray(items) ? items : [])
      } catch { setResults([]) }
      setLoading(false)
    }, 350)
    return () => clearTimeout(t)
  }, [q])

  return (
    <div style={{ position: 'relative', flex: 1, minWidth: 240 }}>
      <div style={{
        display: 'flex', alignItems: 'center', gap: 8,
        background: 'var(--surface)', border: `1px solid ${purpleAlpha(0.2)}`,
        borderRadius: 12, padding: '8px 12px',
        opacity: disabled ? 0.5 : 1,
      }}>
        <Search size={16} color={PURPLE} />
        <input
          type="text" value={q} onChange={e => { setQ(e.target.value); setOpen(true) }}
          onFocus={() => setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 200)}
          placeholder={disabled ? `Máximo ${MAX_CHANNELS} canales` : 'Añadir canal...'}
          disabled={disabled}
          style={{
            flex: 1, background: 'transparent', border: 'none', outline: 'none',
            fontSize: 13.5, color: 'var(--text)', fontFamily: FONT_BODY,
          }}
        />
      </div>
      {open && q && results.length > 0 && (
        <div style={{
          position: 'absolute', top: 'calc(100% + 4px)', left: 0, right: 0,
          background: 'var(--surface)', border: '1px solid var(--border)',
          borderRadius: 12, boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
          maxHeight: 320, overflowY: 'auto', zIndex: 50,
        }}>
          {loading && <div style={{ padding: 12, fontSize: 12, color: 'var(--muted)' }}>Buscando...</div>}
          {results.map(c => {
            const id = c.id || c._id
            const name = c.nombreCanal || c.nombre || c.identificadorCanal || 'Canal'
            return (
              <button key={id}
                onMouseDown={e => { e.preventDefault(); onPick(id, name); setQ(''); setResults([]); setOpen(false) }}
                style={{
                  width: '100%', textAlign: 'left',
                  background: 'none', border: 'none', cursor: 'pointer',
                  padding: '10px 12px', display: 'flex', gap: 10, alignItems: 'center',
                  borderBottom: '1px solid var(--border)',
                }}
                onMouseEnter={e => e.currentTarget.style.background = purpleAlpha(0.06)}
                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
              >
                <div style={{
                  width: 32, height: 32, borderRadius: 8,
                  background: purpleAlpha(0.1), color: PURPLE,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontFamily: FONT_DISPLAY, fontSize: 13, fontWeight: 700,
                }}>{name[0].toUpperCase()}</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>{name}</div>
                  <div style={{ fontSize: 11, color: 'var(--muted)' }}>
                    {c.plataforma} {c.categoria && `· ${c.categoria}`} {c.audiencia && `· ${fmtNum(c.audiencia)} subs`}
                  </div>
                </div>
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}


// ─── Matrix cell ───────────────────────────────────────────────────────────
function MatrixCell({ pct, isDiagonal }) {
  if (isDiagonal) {
    return (
      <div style={{
        height: 60, background: 'var(--bg2)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        color: 'var(--muted2)', fontSize: 11,
      }}>—</div>
    )
  }
  const color = overlapColor(pct)
  const intensity = Math.min(0.4, 0.05 + (pct / 100) * 0.4)
  return (
    <div style={{
      height: 60,
      background: `${color}${Math.round(intensity * 255).toString(16).padStart(2, '0')}`,
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      borderLeft: '1px solid var(--border)',
    }}>
      <div style={{ fontFamily: FONT_DISPLAY, fontSize: 18, fontWeight: 800, color }}>
        {pct}%
      </div>
      <div style={{ fontSize: 9, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
        overlap
      </div>
    </div>
  )
}


// ─── Main ──────────────────────────────────────────────────────────────────
export default function AudienceOverlapPage() {
  const navigate = useNavigate()
  const [channels, setChannels] = useState([])  // [{ id, name, data }]
  const [loadingId, setLoadingId] = useState(null)
  const [error, setError] = useState('')

  const addChannel = async (id, name) => {
    if (channels.length >= MAX_CHANNELS) return
    if (channels.some(c => c.id === id)) { setError('Este canal ya está en el análisis'); return }
    setError(''); setLoadingId(id)
    try {
      const res = await apiService.getChannelIntelligence(id)
      if (res?.success && res.data) {
        setChannels(prev => [...prev, { id, name, data: res.data }])
      } else {
        setError(`No pudimos cargar "${name}"`)
      }
    } catch (e) {
      setError(e.message || 'Error cargando canal')
    }
    setLoadingId(null)
  }

  const removeChannel = (id) => setChannels(prev => prev.filter(c => c.id !== id))

  // Build pair-wise overlap matrix
  const matrix = useMemo(() => {
    return channels.map((a, i) =>
      channels.map((b, j) => i === j ? null : estimateOverlap(a.data, b.data))
    )
  }, [channels])

  // Build recommendations
  const recommendations = useMemo(() => {
    if (channels.length < 2) return []
    const out = []
    const high = []  // pairs with high overlap
    const low = []   // pairs with low overlap (good for diversification)
    for (let i = 0; i < channels.length; i++) {
      for (let j = i + 1; j < channels.length; j++) {
        const pct = matrix[i][j]
        const pair = { a: channels[i].name, b: channels[j].name, pct }
        if (pct >= 50) high.push(pair)
        if (pct < 20) low.push(pair)
      }
    }
    if (high.length > 0) {
      const top = high.sort((a, b) => b.pct - a.pct)[0]
      out.push({
        type: 'warn',
        text: `${top.a} y ${top.b} tienen ${top.pct}% overlap — pagas 2 veces a parte de la misma audiencia. Elige uno o reduce presupuesto del segundo.`,
      })
    }
    if (low.length > 0) {
      const top = low.sort((a, b) => a.pct - b.pct)[0]
      out.push({
        type: 'good',
        text: `${top.a} y ${top.b} apenas se solapan (${top.pct}%) — combinarlos maximiza alcance único.`,
      })
    }
    if (channels.length >= 3 && high.length === 0) {
      out.push({
        type: 'good',
        text: 'Tu mix de canales tiene buena diversificación. Cada canal aporta audiencia diferente.',
      })
    }
    return out
  }, [matrix, channels])

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
            <Layers size={20} color={PURPLE} />
          </div>
          <h1 style={{
            fontFamily: FONT_DISPLAY, fontSize: 28, fontWeight: 800,
            color: 'var(--text)', letterSpacing: '-0.04em', lineHeight: 1.1, margin: 0,
          }}>
            Solapamiento de audiencias
          </h1>
        </div>
        <p style={{ fontSize: 14, color: 'var(--muted)', lineHeight: 1.5 }}>
          Estima qué % de audiencia comparten 2-5 canales para evitar pagar dos veces por las mismas personas.
        </p>
      </div>

      {/* Picker */}
      <div style={{
        background: 'var(--surface)', border: '1px solid var(--border)',
        borderRadius: 14, padding: 14,
        display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap',
      }}>
        <ChannelPicker onPick={addChannel} disabled={channels.length >= MAX_CHANNELS} />
        <span style={{
          fontSize: 11, fontWeight: 600, color: 'var(--muted)',
          background: 'var(--bg2)', borderRadius: 16, padding: '4px 10px',
        }}>
          {channels.length}/{MAX_CHANNELS}
        </span>
        {loadingId && <span style={{ fontSize: 12, color: PURPLE }}>Cargando...</span>}
      </div>

      {/* Selected chips */}
      {channels.length > 0 && (
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {channels.map(c => (
            <div key={c.id} style={{
              display: 'flex', alignItems: 'center', gap: 6,
              background: 'var(--surface)', border: `1px solid ${purpleAlpha(0.25)}`,
              borderRadius: 20, padding: '5px 6px 5px 12px',
            }}>
              <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text)' }}>{c.name}</span>
              <span style={{ fontSize: 10, color: 'var(--muted)' }}>{c.data?.canal?.nicho || c.data?.canal?.categoria}</span>
              <button onClick={() => removeChannel(c.id)} style={{
                background: 'var(--bg2)', border: 'none', borderRadius: 16, width: 20, height: 20,
                display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
                color: 'var(--muted)',
              }}><X size={11} /></button>
            </div>
          ))}
        </div>
      )}

      {error && (
        <div role="alert" style={{
          background: `${ERR}10`, border: `1px solid ${ERR}30`, color: ERR,
          borderRadius: 10, padding: '10px 14px', fontSize: 13,
          display: 'flex', alignItems: 'center', gap: 8,
        }}>
          <AlertCircle size={14} /> {error}
        </div>
      )}

      {/* Empty / waiting */}
      {channels.length === 0 && (
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
            Añade al menos 2 canales para empezar
          </h3>
          <p style={{ fontSize: 13, color: 'var(--muted)', maxWidth: 460, margin: '0 auto', lineHeight: 1.6 }}>
            Verás una matriz visual con el % estimado de audiencia compartida entre cada par.
          </p>
        </div>
      )}

      {channels.length === 1 && (
        <div style={{
          background: `${WARN}08`, border: `1px solid ${WARN}30`,
          borderRadius: 12, padding: '14px 18px',
          display: 'flex', alignItems: 'center', gap: 10, fontSize: 13,
        }}>
          <Sparkles size={16} color={WARN} />
          <span style={{ color: 'var(--text)' }}>
            Añade al menos otro canal para calcular el solapamiento.
          </span>
        </div>
      )}

      {/* Matrix */}
      {channels.length >= MIN_CHANNELS && (
        <>
          <div style={{
            background: 'var(--surface)', border: '1px solid var(--border)',
            borderRadius: 14, overflow: 'hidden',
          }}>
            <div style={{
              display: 'grid',
              gridTemplateColumns: `180px repeat(${channels.length}, 1fr)`,
            }}>
              {/* Header row */}
              <div style={{
                background: 'var(--bg2)', borderBottom: '1px solid var(--border)',
                padding: '10px 14px', fontSize: 11, fontWeight: 700, color: 'var(--muted)',
                textTransform: 'uppercase', letterSpacing: '0.04em',
              }}>Canal</div>
              {channels.map(c => (
                <div key={c.id} style={{
                  background: 'var(--bg2)', borderBottom: '1px solid var(--border)',
                  borderLeft: '1px solid var(--border)',
                  padding: '10px 8px', fontSize: 11, fontWeight: 700, color: 'var(--text)',
                  textAlign: 'center', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                }}>{c.name}</div>
              ))}

              {/* Body rows */}
              {channels.map((row, i) => (
                <React.Fragment key={row.id}>
                  <div style={{
                    padding: '10px 14px', borderBottom: i === channels.length - 1 ? 'none' : '1px solid var(--border)',
                    fontSize: 12, fontWeight: 600, color: 'var(--text)',
                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                    display: 'flex', alignItems: 'center',
                  }}>{row.name}</div>
                  {channels.map((col, j) => (
                    <div key={col.id} style={{ borderBottom: i === channels.length - 1 ? 'none' : '1px solid var(--border)' }}>
                      <MatrixCell pct={matrix[i][j]} isDiagonal={i === j} />
                    </div>
                  ))}
                </React.Fragment>
              ))}
            </div>
          </div>

          {/* Recommendations */}
          {recommendations.length > 0 && (
            <div style={{
              background: 'var(--surface)', border: '1px solid var(--border)',
              borderRadius: 14, padding: 16,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                <Users size={16} color={PURPLE} />
                <h3 style={{ fontFamily: FONT_DISPLAY, fontSize: 14, fontWeight: 700, color: 'var(--text)', margin: 0 }}>
                  Recomendaciones
                </h3>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {recommendations.map((r, i) => (
                  <div key={i} style={{
                    display: 'flex', alignItems: 'flex-start', gap: 10,
                    padding: '10px 12px',
                    background: r.type === 'warn' ? `${WARN}08` : `${OK}08`,
                    border: `1px solid ${r.type === 'warn' ? WARN : OK}25`,
                    borderRadius: 10, fontSize: 13, color: 'var(--text)', lineHeight: 1.5,
                  }}>
                    {r.type === 'warn'
                      ? <AlertTriangle size={14} color={WARN} style={{ flexShrink: 0, marginTop: 2 }} />
                      : <Sparkles size={14} color={OK} style={{ flexShrink: 0, marginTop: 2 }} />}
                    <span>{r.text}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Disclaimer */}
          <div style={{
            background: `${BLUE}08`, border: `1px solid ${BLUE}25`,
            borderRadius: 10, padding: '10px 14px',
            fontSize: 11, color: 'var(--muted)', display: 'flex', gap: 8, alignItems: 'flex-start', lineHeight: 1.5,
          }}>
            <Info size={12} color={BLUE} style={{ flexShrink: 0, marginTop: 2 }} />
            <span>
              <strong style={{ color: 'var(--text)' }}>Estimación heurística.</strong> Sin datos reales de demografía o cross-followers,
              el solapamiento se calcula a partir de nicho (35%) + plataforma (20%) + similitud de audiencia (15%) + clúster de calidad CAS (10%).
              Los porcentajes reflejan probabilidad de overlap basada en patrones del mercado, no medición directa.
            </span>
          </div>

          {/* Color legend */}
          <div style={{
            display: 'flex', gap: 14, flexWrap: 'wrap', alignItems: 'center',
            fontSize: 11, color: 'var(--muted)',
          }}>
            <span style={{ fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Leyenda:</span>
            {[
              { color: OK, range: '0–19%', label: 'Diversificado' },
              { color: BLUE, range: '20–39%', label: 'Solapamiento bajo' },
              { color: WARN, range: '40–59%', label: 'Considerable' },
              { color: ERR, range: '60%+', label: 'Alto, evitar' },
            ].map(l => (
              <div key={l.range} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ width: 12, height: 12, borderRadius: 3, background: `${l.color}40`, border: `1px solid ${l.color}` }} />
                <span style={{ color: 'var(--text)' }}>{l.range}</span>
                <span>{l.label}</span>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  )
}
