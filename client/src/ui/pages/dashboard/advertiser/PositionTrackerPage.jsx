import React, { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Bookmark, BookmarkPlus, Search, X, RefreshCw, TrendingUp, TrendingDown,
  Minus, AlertTriangle, Sparkles, BarChart3, Bell, Trash2,
} from 'lucide-react'
import apiService from '../../../../services/api'
import { FONT_BODY, FONT_DISPLAY, OK, WARN, ERR, BLUE } from '../../../theme/tokens'

const PURPLE = 'var(--accent, #8B5CF6)'
const purpleAlpha = (o) => `var(--accent-dim, rgba(139,92,246,${o}))`

const STORAGE_KEY = 'channelad-watchlist'
const SNAPSHOT_KEY = 'channelad-watchlist-snapshots'  // last seen scoring per channel
const POLL_INTERVAL_MS = 60000  // 60s

const fmtNum = (n) => n == null ? '—' : n >= 1e6 ? `${(n / 1e6).toFixed(1)}M` : n >= 1e3 ? `${(n / 1e3).toFixed(1)}K` : String(n)

function tierColor(nivel) {
  return ({ 'S': '#FFD700', 'A': OK, 'B': BLUE, 'C': WARN, 'D': '#94a3b8' })[nivel] || '#94a3b8'
}

// Compute CAS-change severity
function changeSeverity(delta) {
  if (delta == null || delta === 0) return { color: 'var(--muted)', icon: Minus, level: 'neutral' }
  if (delta >= 5) return { color: OK, icon: TrendingUp, level: 'good' }
  if (delta > 0) return { color: BLUE, icon: TrendingUp, level: 'minor-good' }
  if (delta <= -10) return { color: ERR, icon: TrendingDown, level: 'critical' }
  if (delta <= -5) return { color: WARN, icon: TrendingDown, level: 'warn' }
  return { color: WARN, icon: TrendingDown, level: 'minor-bad' }
}

// ─── Picker — simple search w/ debounced dropdown ──────────────────────────
function ChannelPicker({ onPick }) {
  const [q, setQ] = useState('')
  const [results, setResults] = useState([])
  const [loading, setLoading] = useState(false)
  const [open, setOpen] = useState(false)

  useEffect(() => {
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
      }}>
        <Search size={16} color={PURPLE} />
        <input
          type="text" value={q} onChange={e => { setQ(e.target.value); setOpen(true) }}
          onFocus={() => setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 200)}
          placeholder="Añadir canal a vigilar..."
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
                onMouseDown={e => { e.preventDefault(); onPick({ id, name, identificadorCanal: c.identificadorCanal, plataforma: c.plataforma, nicho: c.nicho || c.categoria }); setQ(''); setResults([]); setOpen(false) }}
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
                    {c.plataforma} {c.categoria && `· ${c.categoria}`}
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


// ─── Main ──────────────────────────────────────────────────────────────────
export default function PositionTrackerPage() {
  const navigate = useNavigate()
  const [watchlist, setWatchlist] = useState(() => {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]') } catch { return [] }
  })
  const [snapshots, setSnapshots] = useState(() => {
    try { return JSON.parse(localStorage.getItem(SNAPSHOT_KEY) || '{}') } catch { return {} }
  })
  const [data, setData] = useState({})  // { [id]: { canal, scores } }
  const [loading, setLoading] = useState(false)
  const [lastUpdate, setLastUpdate] = useState(null)
  const [error, setError] = useState('')

  // Persist watchlist
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(watchlist))
  }, [watchlist])

  const refreshAll = useCallback(async () => {
    if (watchlist.length === 0) return
    setLoading(true); setError('')
    try {
      const results = await Promise.all(
        watchlist.map(w => apiService.getChannelIntelligence(w.id).catch(() => null))
      )
      const next = {}
      const newSnaps = { ...snapshots }
      results.forEach((r, i) => {
        const id = watchlist[i].id
        if (r?.success && r.data) {
          next[id] = r.data
          // Update snapshot only if changed (so we keep prev value for delta)
          const newCAS = r.data.scores?.CAS
          const stored = newSnaps[id]
          if (!stored || stored.CAS !== newCAS) {
            // Save NEW snapshot — but keep "previous" for diff
            newSnaps[id] = {
              CAS: newCAS,
              prevCAS: stored?.CAS != null ? stored.CAS : newCAS,
              seguidores: r.data.canal?.seguidores,
              prevSeguidores: stored?.seguidores != null ? stored.seguidores : r.data.canal?.seguidores,
              ts: Date.now(),
            }
          }
        }
      })
      setData(next)
      setSnapshots(newSnaps)
      localStorage.setItem(SNAPSHOT_KEY, JSON.stringify(newSnaps))
      setLastUpdate(Date.now())
    } catch (e) {
      setError(e.message || 'Error al actualizar')
    }
    setLoading(false)
  }, [watchlist, snapshots])

  // Initial load + autopoll every 60s
  useEffect(() => {
    refreshAll()
    const i = setInterval(refreshAll, POLL_INTERVAL_MS)
    return () => clearInterval(i)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [watchlist.length])

  const addToWatchlist = (channel) => {
    if (watchlist.some(w => w.id === channel.id)) return
    setWatchlist(prev => [...prev, channel])
  }

  const removeFromWatchlist = (id) => {
    setWatchlist(prev => prev.filter(w => w.id !== id))
    setData(prev => { const x = { ...prev }; delete x[id]; return x })
  }

  // Detect alerts (channels that dropped significantly)
  const alerts = watchlist.filter(w => {
    const snap = snapshots[w.id]
    if (!snap || snap.prevCAS == null) return false
    return (snap.CAS - snap.prevCAS) <= -5
  })

  return (
    <div style={{ fontFamily: FONT_BODY, display: 'flex', flexDirection: 'column', gap: 24, maxWidth: 1100 }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
            <div style={{
              width: 40, height: 40, borderRadius: 12,
              background: purpleAlpha(0.12), border: `1px solid ${purpleAlpha(0.25)}`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <Bookmark size={20} color={PURPLE} />
            </div>
            <h1 style={{
              fontFamily: FONT_DISPLAY, fontSize: 28, fontWeight: 800,
              color: 'var(--text)', letterSpacing: '-0.04em', lineHeight: 1.1, margin: 0,
            }}>
              Watchlist de canales
            </h1>
          </div>
          <p style={{ fontSize: 14, color: 'var(--muted)', lineHeight: 1.5 }}>
            Marca canales para vigilar. Recibe alertas cuando su CAS o seguidores caen significativamente.
          </p>
        </div>
        <button onClick={refreshAll} disabled={loading || watchlist.length === 0}
          style={{
            background: 'var(--surface)', border: '1px solid var(--border)',
            borderRadius: 10, padding: '8px 14px', cursor: loading ? 'wait' : 'pointer',
            color: 'var(--muted)', display: 'flex', alignItems: 'center', gap: 6,
            fontSize: 12, fontWeight: 600, fontFamily: FONT_BODY,
          }}>
          <RefreshCw size={12} className={loading ? 'animate-spin' : ''} />
          Actualizar
        </button>
      </div>

      {/* Picker */}
      <div style={{
        background: 'var(--surface)', border: '1px solid var(--border)',
        borderRadius: 12, padding: 12,
        display: 'flex', gap: 10, alignItems: 'center',
      }}>
        <ChannelPicker onPick={addToWatchlist} />
        <span style={{
          fontSize: 11, fontWeight: 600, color: 'var(--muted)',
          background: 'var(--bg2)', borderRadius: 16, padding: '4px 10px',
          flexShrink: 0,
        }}>
          {watchlist.length} en watchlist
        </span>
      </div>

      {/* Alerts */}
      {alerts.length > 0 && (
        <div style={{
          background: `${WARN}10`, border: `1px solid ${WARN}40`,
          borderRadius: 14, padding: 16,
          display: 'flex', alignItems: 'flex-start', gap: 12,
        }}>
          <div style={{
            width: 36, height: 36, borderRadius: 10,
            background: `${WARN}20`, display: 'flex', alignItems: 'center', justifyContent: 'center',
            flexShrink: 0,
          }}>
            <Bell size={18} color={WARN} />
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontFamily: FONT_DISPLAY, fontSize: 14, fontWeight: 700, color: WARN, marginBottom: 4 }}>
              {alerts.length} {alerts.length === 1 ? 'alerta' : 'alertas'} de bajada
            </div>
            <div style={{ fontSize: 12, color: 'var(--text)' }}>
              {alerts.map(a => a.name).join(' · ')} {alerts.length > 1 ? 'han bajado' : 'ha bajado'} su CAS desde el último snapshot.
            </div>
          </div>
        </div>
      )}

      {error && (
        <div role="alert" style={{
          background: `${ERR}10`, border: `1px solid ${ERR}30`, color: ERR,
          borderRadius: 10, padding: '10px 14px', fontSize: 13,
        }}>{error}</div>
      )}

      {/* Empty */}
      {watchlist.length === 0 && (
        <div style={{
          background: 'var(--surface)', border: '1px dashed var(--border)',
          borderRadius: 18, padding: '60px 28px', textAlign: 'center',
        }}>
          <div style={{
            width: 64, height: 64, borderRadius: 18,
            background: purpleAlpha(0.08), border: `1px solid ${purpleAlpha(0.18)}`,
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center', marginBottom: 16,
          }}>
            <BookmarkPlus size={28} color={PURPLE} />
          </div>
          <h3 style={{ fontFamily: FONT_DISPLAY, fontSize: 17, fontWeight: 700, color: 'var(--text)', marginBottom: 6 }}>
            Tu watchlist está vacía
          </h3>
          <p style={{ fontSize: 13, color: 'var(--muted)', maxWidth: 460, margin: '0 auto', lineHeight: 1.6 }}>
            Añade canales arriba para empezar a vigilarlos. Cada {POLL_INTERVAL_MS / 1000}s comprobamos si han cambiado.
          </p>
        </div>
      )}

      {/* Cards */}
      {watchlist.length > 0 && (
        <div style={{
          display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 12,
        }}>
          {watchlist.map(w => {
            const intel = data[w.id]
            const snap = snapshots[w.id]
            const cas = intel?.scores?.CAS
            const subs = intel?.canal?.seguidores
            const tier = intel?.scores?.nivel
            const casDelta = snap && snap.prevCAS != null ? cas - snap.prevCAS : null
            const subsDelta = snap && snap.prevSeguidores != null ? subs - snap.prevSeguidores : null
            const sev = changeSeverity(casDelta)
            const SevIcon = sev.icon

            return (
              <div key={w.id} style={{
                background: 'var(--surface)',
                border: `1px solid ${sev.level === 'critical' || sev.level === 'warn' ? sev.color + '40' : 'var(--border)'}`,
                borderRadius: 14, padding: 16,
                position: 'relative',
              }}>
                {/* Severity stripe */}
                {(sev.level === 'critical' || sev.level === 'warn') && (
                  <div style={{
                    position: 'absolute', top: 0, left: 0, right: 0, height: 3,
                    background: sev.color, borderRadius: '14px 14px 0 0',
                  }} />
                )}

                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                  <div style={{
                    width: 36, height: 36, borderRadius: 10,
                    background: purpleAlpha(0.1), color: PURPLE,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontFamily: FONT_DISPLAY, fontSize: 14, fontWeight: 800,
                    flexShrink: 0,
                  }}>{w.name[0].toUpperCase()}</div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontFamily: FONT_DISPLAY, fontSize: 14, fontWeight: 700, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {w.name}
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--muted)' }}>
                      {w.plataforma} {w.nicho && `· ${w.nicho}`}
                    </div>
                  </div>
                  {tier && (
                    <span style={{
                      background: `${tierColor(tier)}20`, color: tierColor(tier),
                      border: `1px solid ${tierColor(tier)}40`,
                      borderRadius: 5, padding: '1px 6px', fontSize: 10, fontWeight: 700,
                    }}>{tier}</span>
                  )}
                </div>

                <div style={{
                  display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 12,
                }}>
                  <div style={{ background: 'var(--bg2)', borderRadius: 8, padding: '8px 10px' }}>
                    <div style={{ fontSize: 10, color: 'var(--muted)', fontWeight: 700, marginBottom: 2 }}>CAS</div>
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
                      <span style={{ fontFamily: FONT_DISPLAY, fontSize: 18, fontWeight: 800, color: 'var(--text)' }}>
                        {cas ?? '—'}
                      </span>
                      {casDelta != null && casDelta !== 0 && (
                        <span style={{
                          fontSize: 11, fontWeight: 700, color: sev.color,
                          display: 'flex', alignItems: 'center', gap: 2,
                        }}>
                          <SevIcon size={10} />
                          {casDelta > 0 ? '+' : ''}{casDelta}
                        </span>
                      )}
                    </div>
                  </div>
                  <div style={{ background: 'var(--bg2)', borderRadius: 8, padding: '8px 10px' }}>
                    <div style={{ fontSize: 10, color: 'var(--muted)', fontWeight: 700, marginBottom: 2 }}>Seguidores</div>
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
                      <span style={{ fontFamily: FONT_DISPLAY, fontSize: 18, fontWeight: 800, color: 'var(--text)' }}>
                        {fmtNum(subs)}
                      </span>
                      {subsDelta != null && subsDelta !== 0 && (
                        <span style={{
                          fontSize: 11, fontWeight: 700,
                          color: subsDelta > 0 ? OK : ERR,
                        }}>
                          {subsDelta > 0 ? '+' : ''}{fmtNum(Math.abs(subsDelta))}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: 6 }}>
                  <button onClick={() => navigate(`/advertiser/analyze/channel?q=${encodeURIComponent(w.identificadorCanal || w.id)}`)}
                    style={{
                      flex: 1, background: 'var(--bg2)', border: '1px solid var(--border)',
                      borderRadius: 8, padding: '6px 10px', fontSize: 11, fontWeight: 600,
                      cursor: 'pointer', color: 'var(--muted)', fontFamily: FONT_BODY,
                      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4,
                    }}>
                    <BarChart3 size={11} /> Analizar
                  </button>
                  <button onClick={() => removeFromWatchlist(w.id)}
                    title="Quitar de watchlist"
                    style={{
                      background: 'var(--bg2)', border: '1px solid var(--border)',
                      borderRadius: 8, padding: '6px 10px', cursor: 'pointer',
                      color: 'var(--muted)',
                    }}>
                    <Trash2 size={11} />
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {lastUpdate && watchlist.length > 0 && (
        <div style={{ fontSize: 11, color: 'var(--muted2)', textAlign: 'center' }}>
          Última actualización: {new Date(lastUpdate).toLocaleTimeString('es')}. Auto-refresh cada {POLL_INTERVAL_MS / 1000}s.
        </div>
      )}
    </div>
  )
}
