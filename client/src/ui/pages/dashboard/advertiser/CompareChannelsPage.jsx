import React, { useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Plus, X, Search, Sparkles, Trophy, Columns3, Users,
  AlertTriangle, ArrowRight, Crown, BarChart3,
} from 'lucide-react'
import apiService from '../../../../services/api'
import { FONT_BODY, FONT_DISPLAY, OK, WARN, ERR, BLUE } from '../../../theme/tokens'

const PURPLE = 'var(--accent, #8B5CF6)'
const purpleAlpha = (o) => `var(--accent-dim, rgba(139,92,246,${o}))`

const MAX_CHANNELS = 5
const MIN_CHANNELS = 2

// ─── Helpers ───────────────────────────────────────────────────────────────
function fmtNum(n) {
  if (n == null) return '—'
  if (n >= 1e6) return `${(n / 1e6).toFixed(1)}M`
  if (n >= 1e3) return `${(n / 1e3).toFixed(1)}K`
  return String(n)
}

function tierColor(nivel) {
  return ({
    'S': '#FFD700', 'A': OK, 'B': BLUE, 'C': WARN, 'D': '#94a3b8',
  })[nivel] || '#94a3b8'
}

// Find which channel wins per metric (higher = better, except CPM which is lower = better)
function bestIndex(values, lowerIsBetter = false) {
  if (!values || values.length === 0) return -1
  let bestIdx = 0
  let bestVal = values[0]
  for (let i = 1; i < values.length; i++) {
    if (values[i] == null) continue
    if (bestVal == null) { bestIdx = i; bestVal = values[i]; continue }
    if (lowerIsBetter ? values[i] < bestVal : values[i] > bestVal) {
      bestIdx = i; bestVal = values[i]
    }
  }
  return bestVal == null ? -1 : bestIdx
}

// ─── Search dropdown ───────────────────────────────────────────────────────
function ChannelPicker({ onPick, disabled }) {
  const [q, setQ] = useState('')
  const [results, setResults] = useState([])
  const [loading, setLoading] = useState(false)
  const [open, setOpen] = useState(false)

  const search = useCallback(async (term) => {
    if (!term.trim()) { setResults([]); return }
    setLoading(true)
    try {
      const res = await apiService.searchChannels({ busqueda: term.trim(), limite: 8 })
      const items = res?.data?.canales || res?.data?.items || res?.data || []
      setResults(Array.isArray(items) ? items : [])
    } catch { setResults([]) }
    setLoading(false)
  }, [])

  React.useEffect(() => {
    const t = setTimeout(() => search(q), 350)
    return () => clearTimeout(t)
  }, [q, search])

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
          type="text"
          value={q}
          onChange={e => { setQ(e.target.value); setOpen(true) }}
          onFocus={() => setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 200)}
          disabled={disabled}
          placeholder={disabled ? `Máximo ${MAX_CHANNELS} canales` : 'Añadir canal por nombre o @username...'}
          style={{
            flex: 1, background: 'transparent', border: 'none', outline: 'none',
            fontSize: 13.5, color: 'var(--text)', fontFamily: FONT_BODY,
          }}
        />
      </div>
      {open && q && results.length > 0 && (
        <div style={{
          position: 'absolute', top: 'calc(100% + 4px)', left: 0, right: 0,
          background: 'var(--surface)', border: `1px solid var(--border)`,
          borderRadius: 12, boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
          maxHeight: 320, overflowY: 'auto', zIndex: 50,
        }}>
          {loading && (
            <div style={{ padding: 12, fontSize: 12, color: 'var(--muted)', textAlign: 'center' }}>Buscando...</div>
          )}
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
                  fontFamily: FONT_DISPLAY, fontSize: 13, fontWeight: 700, flexShrink: 0,
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

// ─── Channel card (header per column) ──────────────────────────────────────
function ChannelHeader({ data, onRemove }) {
  const c = data.canal || {}
  const s = data.scores || {}
  const name = c.nombre || c.nombreCanal || c.identificadorCanal || 'Canal'
  return (
    <div style={{
      background: 'var(--surface)', border: '1px solid var(--border)',
      borderRadius: 12, padding: 14, position: 'relative',
    }}>
      <button onClick={onRemove}
        style={{
          position: 'absolute', top: 8, right: 8,
          background: 'var(--bg2)', border: '1px solid var(--border)',
          borderRadius: 6, padding: '2px 6px', cursor: 'pointer',
          color: 'var(--muted)', fontSize: 12,
        }}
        title="Quitar"
      ><X size={12} /></button>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, marginBottom: 8 }}>
        <div style={{
          width: 48, height: 48, borderRadius: 12,
          background: purpleAlpha(0.12), color: PURPLE,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontFamily: FONT_DISPLAY, fontSize: 18, fontWeight: 800,
        }}>{name[0].toUpperCase()}</div>
        <div style={{ textAlign: 'center', minWidth: 0, width: '100%' }}>
          <div style={{
            fontFamily: FONT_DISPLAY, fontSize: 14, fontWeight: 700, color: 'var(--text)',
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          }}>{name}</div>
          <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 2 }}>
            {c.plataforma} {c.nicho && `· ${c.nicho}`}
          </div>
        </div>
      </div>
      <div style={{
        display: 'flex', justifyContent: 'center', gap: 6,
        paddingTop: 8, borderTop: '1px solid var(--border)',
      }}>
        <span style={{
          background: `${tierColor(s.nivel)}20`, color: tierColor(s.nivel),
          border: `1px solid ${tierColor(s.nivel)}40`,
          borderRadius: 6, padding: '2px 8px', fontSize: 11, fontWeight: 700,
        }}>Tier {s.nivel || '?'}</span>
      </div>
    </div>
  )
}

// ─── Comparison row ────────────────────────────────────────────────────────
function CompareRow({ label, values, formatter, lowerIsBetter, hint }) {
  const winner = bestIndex(values, lowerIsBetter)
  const fmt = formatter || (v => v != null ? String(v) : '—')
  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: `200px repeat(${values.length}, 1fr)`,
      borderBottom: '1px solid var(--border)',
      alignItems: 'stretch',
    }}>
      <div style={{
        padding: '12px 16px', fontSize: 12, color: 'var(--muted)',
        fontWeight: 600, display: 'flex', flexDirection: 'column', justifyContent: 'center',
        background: 'var(--bg2)',
      }}>
        <div>{label}</div>
        {hint && <div style={{ fontSize: 10.5, color: 'var(--muted2)', marginTop: 2, fontWeight: 400 }}>{hint}</div>}
      </div>
      {values.map((v, i) => {
        const isWinner = i === winner && values.length > 1 && v != null
        return (
          <div key={i} style={{
            padding: '12px 14px',
            background: isWinner ? `${OK}08` : 'transparent',
            borderLeft: '1px solid var(--border)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
            fontFamily: FONT_DISPLAY, fontSize: 15, fontWeight: 700,
            color: v == null ? 'var(--muted2)' : 'var(--text)',
          }}>
            {fmt(v)}
            {isWinner && <Crown size={12} color={OK} />}
          </div>
        )
      })}
    </div>
  )
}

// ─── Main ──────────────────────────────────────────────────────────────────
export default function CompareChannelsPage() {
  const navigate = useNavigate()
  const [channels, setChannels] = useState([])  // [{ id, name, data }]
  const [loadingId, setLoadingId] = useState(null)
  const [error, setError] = useState('')

  const addChannel = async (id, name) => {
    if (channels.length >= MAX_CHANNELS) return
    if (channels.some(c => c.id === id)) { setError('Este canal ya está en la comparación'); return }
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

  const removeChannel = (id) => {
    setChannels(prev => prev.filter(c => c.id !== id))
  }

  // Build comparison rows from data
  const buildValues = (path) => channels.map(c => path(c.data))

  // Compute "verdict" — best for what
  const verdicts = (() => {
    if (channels.length < 2) return []
    const out = []
    const reachIdx = bestIndex(channels.map(c => c.data?.canal?.seguidores))
    const engagementIdx = bestIndex(channels.map(c => c.data?.scores?.CER))
    const valueIdx = bestIndex(channels.map(c => c.data?.scores?.CPMDinamico), true)
    const overallIdx = bestIndex(channels.map(c => c.data?.scores?.CAS))
    if (reachIdx >= 0) out.push({ label: 'Mayor alcance', name: channels[reachIdx]?.name, color: BLUE })
    if (engagementIdx >= 0) out.push({ label: 'Mejor engagement', name: channels[engagementIdx]?.name, color: OK })
    if (valueIdx >= 0) out.push({ label: 'Mejor precio (CPM)', name: channels[valueIdx]?.name, color: WARN })
    if (overallIdx >= 0) out.push({ label: 'Mejor score global (CAS)', name: channels[overallIdx]?.name, color: PURPLE })
    return out
  })()

  return (
    <div style={{ fontFamily: FONT_BODY, display: 'flex', flexDirection: 'column', gap: 24, maxWidth: 1200 }}>

      {/* Header */}
      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
          <div style={{
            width: 40, height: 40, borderRadius: 12,
            background: purpleAlpha(0.12), border: `1px solid ${purpleAlpha(0.25)}`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <Columns3 size={20} color={PURPLE} />
          </div>
          <h1 style={{
            fontFamily: FONT_DISPLAY, fontSize: 28, fontWeight: 800,
            color: 'var(--text)', letterSpacing: '-0.04em', lineHeight: 1.1, margin: 0,
          }}>
            Comparar canales
          </h1>
        </div>
        <p style={{ fontSize: 14, color: 'var(--muted)', lineHeight: 1.5 }}>
          Selecciona de 2 a 5 canales y compara scoring, CPM, audiencia y engagement lado a lado.
        </p>
      </div>

      {/* Picker */}
      <div style={{
        background: 'var(--surface)', border: '1px solid var(--border)',
        borderRadius: 14, padding: 16, display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap',
      }}>
        <ChannelPicker onPick={addChannel} disabled={channels.length >= MAX_CHANNELS} />
        <span style={{
          fontSize: 11, fontWeight: 600, color: 'var(--muted)',
          background: 'var(--bg2)', borderRadius: 16, padding: '4px 10px',
        }}>
          {channels.length}/{MAX_CHANNELS}
        </span>
        {loadingId && (
          <span style={{ fontSize: 12, color: PURPLE }}>Cargando...</span>
        )}
      </div>

      {error && (
        <div role="alert" style={{
          background: `${ERR}10`, border: `1px solid ${ERR}30`, color: ERR,
          borderRadius: 10, padding: '10px 14px', fontSize: 13,
          display: 'flex', alignItems: 'center', gap: 8,
        }}>
          <AlertTriangle size={14} /> {error}
        </div>
      )}

      {/* Empty state */}
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
            <Columns3 size={28} color={PURPLE} />
          </div>
          <h3 style={{ fontFamily: FONT_DISPLAY, fontSize: 17, fontWeight: 700, color: 'var(--text)', marginBottom: 6 }}>
            Empieza añadiendo canales
          </h3>
          <p style={{ fontSize: 13, color: 'var(--muted)', maxWidth: 460, margin: '0 auto', lineHeight: 1.6 }}>
            Pega usernames o busca por nombre. La comparación se actualiza en tiempo real cuando añades cada canal.
          </p>
        </div>
      )}

      {/* Single channel waiting state */}
      {channels.length === 1 && (
        <div style={{
          background: `${WARN}08`, border: `1px solid ${WARN}30`,
          borderRadius: 12, padding: '14px 18px',
          display: 'flex', alignItems: 'center', gap: 10, fontSize: 13,
        }}>
          <Sparkles size={16} color={WARN} />
          <span style={{ color: 'var(--text)' }}>
            Añade al menos otro canal para empezar la comparación.
          </span>
        </div>
      )}

      {/* Comparison */}
      {channels.length >= MIN_CHANNELS && (
        <>
          {/* Headers row */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: `200px repeat(${channels.length}, 1fr)`,
            gap: 0,
          }}>
            <div /> {/* empty corner */}
            {channels.map(c => (
              <div key={c.id} style={{ paddingLeft: 8 }}>
                <ChannelHeader data={c.data} onRemove={() => removeChannel(c.id)} />
              </div>
            ))}
          </div>

          {/* Verdict cards */}
          {verdicts.length > 0 && (
            <div style={{
              background: 'var(--surface)', border: `1px solid ${purpleAlpha(0.2)}`,
              borderRadius: 14, padding: 18,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                <Trophy size={16} color={PURPLE} />
                <h3 style={{ fontFamily: FONT_DISPLAY, fontSize: 14, fontWeight: 700, color: 'var(--text)', margin: 0 }}>
                  Mejor en cada dimensión
                </h3>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 10 }}>
                {verdicts.map((v, i) => (
                  <div key={i} style={{
                    background: `${v.color}08`, border: `1px solid ${v.color}30`,
                    borderRadius: 10, padding: '12px 14px',
                  }}>
                    <div style={{ fontSize: 11, color: v.color, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 }}>
                      {v.label}
                    </div>
                    <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {v.name}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Comparison table */}
          <div style={{
            background: 'var(--surface)', border: '1px solid var(--border)',
            borderRadius: 14, overflow: 'hidden',
          }}>
            <CompareRow
              label="Seguidores"
              values={buildValues(d => d?.canal?.seguidores)}
              formatter={fmtNum}
              hint="Audiencia total"
            />
            <CompareRow
              label="CAS"
              values={buildValues(d => d?.scores?.CAS)}
              hint="Score global"
            />
            <CompareRow
              label="CAF"
              values={buildValues(d => d?.scores?.CAF)}
              hint="Audiencia auténtica"
            />
            <CompareRow
              label="CER"
              values={buildValues(d => d?.scores?.CER)}
              hint="Engagement ratio"
            />
            <CompareRow
              label="CTF"
              values={buildValues(d => d?.scores?.CTF)}
              hint="Confianza del contenido"
            />
            <CompareRow
              label="CVS"
              values={buildValues(d => d?.scores?.CVS)}
              hint="Tendencia de crecimiento"
            />
            <CompareRow
              label="CAP"
              values={buildValues(d => d?.scores?.CAP)}
              hint="Calidad de la audiencia"
            />
            <CompareRow
              label="CPM dinámico"
              values={buildValues(d => d?.scores?.CPMDinamico)}
              formatter={v => v != null ? `€${Number(v).toFixed(2)}` : '—'}
              lowerIsBetter
              hint="Coste por 1.000 imp."
            />
            <CompareRow
              label="Confianza datos"
              values={buildValues(d => d?.scores?.confianzaScore)}
              formatter={v => v != null ? `${v}/100` : '—'}
              hint="Verificación"
            />
          </div>

          {/* CTAs to drill into individual analysis */}
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            {channels.map(c => (
              <button key={c.id}
                onClick={() => navigate(`/advertiser/analyze/channel?q=${encodeURIComponent(c.data?.canal?.identificadorCanal || c.id)}`)}
                style={{
                  background: 'var(--bg2)', border: `1px solid ${purpleAlpha(0.2)}`,
                  borderRadius: 10, padding: '8px 14px',
                  fontSize: 12, fontWeight: 600, color: PURPLE,
                  cursor: 'pointer', fontFamily: FONT_BODY,
                  display: 'flex', alignItems: 'center', gap: 6,
                }}
              >
                <BarChart3 size={12} /> Análisis completo de {c.name}
                <ArrowRight size={11} />
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  )
}
