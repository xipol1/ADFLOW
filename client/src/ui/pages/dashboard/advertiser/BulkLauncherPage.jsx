import React, { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Rocket, Search, X, Plus, Trash2, Play, AlertTriangle,
  CheckCircle2, Loader2, Sparkles, Info, ListChecks,
} from 'lucide-react'
import apiService from '../../../../services/api'
import { analyzeCopy } from '../../../lib/copyAnalyzer'
import { FONT_BODY, FONT_DISPLAY, OK, WARN, ERR, BLUE } from '../../../theme/tokens'

const PURPLE = 'var(--accent, #8B5CF6)'
const purpleAlpha = (o) => `var(--accent-dim, rgba(139,92,246,${o}))`

const MAX_CHANNELS = 20
const MAX_VARIANTS = 5
const LAUNCH_CONCURRENCY = 3

const fmtMoney = (n) => `€${Math.round(n || 0).toLocaleString('es')}`

// Concurrency-limited Promise pool (mirrors AuditChannelsPage)
async function mapWithConcurrency(items, fn, concurrency, onProgress) {
  const results = new Array(items.length)
  let inFlight = 0, nextIndex = 0, done = 0
  return new Promise(resolve => {
    const launch = () => {
      while (inFlight < concurrency && nextIndex < items.length) {
        const i = nextIndex++
        inFlight++
        Promise.resolve(fn(items[i], i)).then(r => {
          results[i] = r; inFlight--; done++; onProgress?.(done, items.length)
          if (done === items.length) resolve(results); else launch()
        })
      }
    }
    if (items.length === 0) resolve([]); else launch()
  })
}


// ─── Picker ─────────────────────────────────────────────────────────────────
function ChannelPicker({ onPick, disabled }) {
  const [q, setQ] = useState('')
  const [results, setResults] = useState([])
  const [open, setOpen] = useState(false)

  useEffect(() => {
    if (!q.trim()) { setResults([]); return }
    const t = setTimeout(async () => {
      try {
        const res = await apiService.searchChannels({ busqueda: q.trim(), limite: 8 })
        const items = res?.data?.canales || res?.data?.items || res?.data || []
        setResults(Array.isArray(items) ? items : [])
      } catch { setResults([]) }
    }, 350)
    return () => clearTimeout(t)
  }, [q])

  return (
    <div style={{ position: 'relative', flex: 1, minWidth: 240 }}>
      <div style={{
        display: 'flex', alignItems: 'center', gap: 8,
        background: 'var(--surface)', border: `1px solid ${purpleAlpha(0.2)}`,
        borderRadius: 12, padding: '8px 12px', opacity: disabled ? 0.5 : 1,
      }}>
        <Search size={16} color={PURPLE} />
        <input type="text" value={q} onChange={e => { setQ(e.target.value); setOpen(true) }}
          onFocus={() => setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 200)}
          placeholder={disabled ? `Máximo ${MAX_CHANNELS}` : 'Añadir canal...'}
          disabled={disabled}
          style={{
            flex: 1, background: 'transparent', border: 'none', outline: 'none',
            fontSize: 13.5, color: 'var(--text)', fontFamily: FONT_BODY,
          }} />
      </div>
      {open && q && results.length > 0 && (
        <div style={{
          position: 'absolute', top: 'calc(100% + 4px)', left: 0, right: 0,
          background: 'var(--surface)', border: '1px solid var(--border)',
          borderRadius: 12, boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
          maxHeight: 320, overflowY: 'auto', zIndex: 50,
        }}>
          {results.map(c => {
            const id = c.id || c._id
            const name = c.nombreCanal || c.nombre || c.identificadorCanal || 'Canal'
            const price = c.CPMDinamico || c.precio || 0
            return (
              <button key={id}
                onMouseDown={e => { e.preventDefault(); onPick({
                  id, name,
                  plataforma: c.plataforma, categoria: c.categoria,
                  price, audiencia: c.audiencia,
                }); setQ(''); setResults([]); setOpen(false) }}
                style={{
                  width: '100%', textAlign: 'left',
                  background: 'none', border: 'none', cursor: 'pointer',
                  padding: '10px 12px', display: 'flex', gap: 10, alignItems: 'center',
                  borderBottom: '1px solid var(--border)',
                }}
                onMouseEnter={e => e.currentTarget.style.background = purpleAlpha(0.06)}
                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
              >
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>{name}</div>
                  <div style={{ fontSize: 11, color: 'var(--muted)' }}>
                    {c.plataforma} {c.categoria && `· ${c.categoria}`}
                  </div>
                </div>
                <span style={{ fontSize: 12, fontWeight: 700, color: PURPLE, fontFamily: FONT_DISPLAY }}>
                  €{price}
                </span>
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}


// ─── Main ──────────────────────────────────────────────────────────────────
export default function BulkLauncherPage() {
  const navigate = useNavigate()
  const [channels, setChannels] = useState([])
  const [variants, setVariants] = useState([''])
  const [targetUrl, setTargetUrl] = useState('')
  const [error, setError] = useState('')
  const [launching, setLaunching] = useState(false)
  const [progress, setProgress] = useState({ done: 0, total: 0 })
  const [results, setResults] = useState(null)
  const [autoPay, setAutoPay] = useState(false)

  const addChannel = (c) => {
    if (channels.length >= MAX_CHANNELS) return
    if (channels.some(x => x.id === c.id)) return
    setChannels(prev => [...prev, c])
  }
  const removeChannel = (id) => setChannels(prev => prev.filter(c => c.id !== id))
  const addVariant = () => setVariants(prev => prev.length < MAX_VARIANTS ? [...prev, ''] : prev)
  const removeVariant = (i) => setVariants(prev => prev.filter((_, idx) => idx !== i))
  const setVariant = (i, v) => setVariants(prev => prev.map((x, idx) => idx === i ? v : x))

  const validVariants = variants.filter(v => v.trim().length > 0)
  const totalCampaigns = channels.length * validVariants.length
  const totalCost = channels.reduce((s, c) => s + (c.price || 0), 0) * validVariants.length

  // Validation
  const canLaunch = channels.length > 0 && validVariants.length > 0 && targetUrl.trim().length > 0 && !launching

  const launchAll = async () => {
    if (!canLaunch) return
    setError(''); setResults(null); setLaunching(true)

    // Build all (channel × variant) combinations
    const jobs = []
    for (const ch of channels) {
      for (const v of validVariants) jobs.push({ channelId: ch.id, channelName: ch.name, content: v.trim() })
    }
    setProgress({ done: 0, total: jobs.length })

    try {
      const out = await mapWithConcurrency(jobs, async (job) => {
        try {
          const res = await apiService.createCampaign({
            channel: job.channelId,
            content: job.content,
            targetUrl: targetUrl.trim(),
          })
          if (!res?.success) return { ...job, ok: false, msg: res?.message || 'Falló' }
          const created = res.data
          let paid = false
          if (autoPay && created?._id) {
            const pay = await apiService.payCampaign(created._id).catch(() => null)
            paid = pay?.success === true
          }
          return { ...job, ok: true, id: created?._id, paid }
        } catch (e) {
          return { ...job, ok: false, msg: e.message || 'Error' }
        }
      }, LAUNCH_CONCURRENCY, (done, total) => setProgress({ done, total }))

      setResults(out)
    } catch (e) {
      setError(e.message || 'Error en el lanzamiento masivo')
    }
    setLaunching(false)
  }

  const reset = () => {
    setChannels([]); setVariants(['']); setTargetUrl(''); setResults(null); setError('')
  }

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
            <Rocket size={20} color={PURPLE} />
          </div>
          <h1 style={{
            fontFamily: FONT_DISPLAY, fontSize: 28, fontWeight: 800,
            color: 'var(--text)', letterSpacing: '-0.04em', lineHeight: 1.1, margin: 0,
          }}>
            Bulk Campaign Launcher
          </h1>
        </div>
        <p style={{ fontSize: 14, color: 'var(--muted)', lineHeight: 1.5 }}>
          Lanza múltiples campañas a la vez: combina N canales × M variantes de copy en un solo click.
        </p>
      </div>

      {results ? (
        // ── Results ───────────────────────────────────────────────────────
        <>
          <div style={{
            background: results.every(r => r.ok) ? `${OK}10` : `${WARN}10`,
            border: `1px solid ${results.every(r => r.ok) ? OK : WARN}40`,
            borderRadius: 14, padding: 18,
            display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap',
          }}>
            {results.every(r => r.ok)
              ? <CheckCircle2 size={28} color={OK} />
              : <AlertTriangle size={28} color={WARN} />}
            <div style={{ flex: 1, minWidth: 200 }}>
              <div style={{ fontFamily: FONT_DISPLAY, fontSize: 18, fontWeight: 800, color: 'var(--text)', marginBottom: 4 }}>
                {results.filter(r => r.ok).length} de {results.length} campañas lanzadas
              </div>
              <div style={{ fontSize: 13, color: 'var(--muted)' }}>
                {autoPay ? `${results.filter(r => r.paid).length} pagadas automáticamente.` : 'Quedan en estado borrador. Págalas individualmente para activar.'}
              </div>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={() => navigate('/advertiser/campaigns')}
                style={{
                  background: PURPLE, color: '#fff', border: 'none', borderRadius: 10,
                  padding: '10px 16px', fontSize: 12, fontWeight: 700, cursor: 'pointer',
                  fontFamily: FONT_BODY,
                }}>
                Ver mis campañas
              </button>
              <button onClick={reset}
                style={{
                  background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 10,
                  padding: '10px 16px', fontSize: 12, fontWeight: 600, cursor: 'pointer',
                  fontFamily: FONT_BODY, color: 'var(--text)',
                }}>
                Lanzar otro batch
              </button>
            </div>
          </div>

          <div style={{
            background: 'var(--surface)', border: '1px solid var(--border)',
            borderRadius: 14, overflow: 'hidden',
          }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: 'var(--bg2)', borderBottom: '1px solid var(--border)' }}>
                  {['Canal', 'Variante', 'Estado', 'ID'].map(h => (
                    <th key={h} style={{ padding: '10px 14px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {results.map((r, i) => (
                  <tr key={i} style={{ borderBottom: i < results.length - 1 ? '1px solid var(--border)' : 'none' }}>
                    <td style={{ padding: '10px 14px', fontSize: 12.5, color: 'var(--text)', fontWeight: 600 }}>{r.channelName}</td>
                    <td style={{ padding: '10px 14px', fontSize: 12, color: 'var(--muted)', maxWidth: 360, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {r.content}
                    </td>
                    <td style={{ padding: '10px 14px', fontSize: 12 }}>
                      {r.ok
                        ? <span style={{ color: OK, display: 'flex', alignItems: 'center', gap: 4 }}><CheckCircle2 size={12} />{r.paid ? 'Pagada' : 'Creada'}</span>
                        : <span style={{ color: ERR, display: 'flex', alignItems: 'center', gap: 4 }}><AlertTriangle size={12} />{r.msg}</span>}
                    </td>
                    <td style={{ padding: '10px 14px', fontSize: 11, color: 'var(--muted)', fontFamily: 'monospace' }}>
                      {r.id ? String(r.id).slice(-6) : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      ) : (
        // ── Form ──────────────────────────────────────────────────────────
        <>
          {/* Step 1: Channels */}
          <div style={{
            background: 'var(--surface)', border: '1px solid var(--border)',
            borderRadius: 14, padding: 18,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
              <div style={{
                width: 28, height: 28, borderRadius: 8,
                background: PURPLE, color: '#fff',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontFamily: FONT_DISPLAY, fontWeight: 800, fontSize: 14,
              }}>1</div>
              <h3 style={{ fontFamily: FONT_DISPLAY, fontSize: 14, fontWeight: 700, color: 'var(--text)', margin: 0 }}>
                Selecciona canales ({channels.length}/{MAX_CHANNELS})
              </h3>
            </div>
            <ChannelPicker onPick={addChannel} disabled={channels.length >= MAX_CHANNELS} />
            {channels.length > 0 && (
              <div style={{ marginTop: 12, display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {channels.map(c => (
                  <div key={c.id} style={{
                    display: 'flex', alignItems: 'center', gap: 6,
                    background: 'var(--bg2)', border: `1px solid ${purpleAlpha(0.2)}`,
                    borderRadius: 20, padding: '5px 6px 5px 12px',
                  }}>
                    <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text)' }}>{c.name}</span>
                    <span style={{ fontSize: 10, color: PURPLE, fontWeight: 700 }}>€{c.price || 0}</span>
                    <button onClick={() => removeChannel(c.id)} style={{
                      background: 'var(--surface)', border: 'none', borderRadius: 16, width: 20, height: 20,
                      display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
                      color: 'var(--muted)',
                    }}><X size={11} /></button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Step 2: Variants */}
          <div style={{
            background: 'var(--surface)', border: '1px solid var(--border)',
            borderRadius: 14, padding: 18,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{
                  width: 28, height: 28, borderRadius: 8,
                  background: PURPLE, color: '#fff',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontFamily: FONT_DISPLAY, fontWeight: 800, fontSize: 14,
                }}>2</div>
                <h3 style={{ fontFamily: FONT_DISPLAY, fontSize: 14, fontWeight: 700, color: 'var(--text)', margin: 0 }}>
                  Variantes de copy ({validVariants.length})
                </h3>
              </div>
              {variants.length < MAX_VARIANTS && (
                <button onClick={addVariant} style={{
                  background: purpleAlpha(0.1), color: PURPLE, border: `1px solid ${purpleAlpha(0.3)}`,
                  borderRadius: 8, padding: '5px 10px', fontSize: 11, fontWeight: 700, cursor: 'pointer',
                  display: 'flex', alignItems: 'center', gap: 4, fontFamily: FONT_BODY,
                }}>
                  <Plus size={11} /> Añadir variante
                </button>
              )}
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {variants.map((v, i) => {
                const a = analyzeCopy(v)
                return (
                  <div key={i}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                      <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase' }}>
                        Variante {String.fromCharCode(65 + i)}
                      </span>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        {v && a.score > 0 && (
                          <span style={{
                            fontSize: 10, fontWeight: 700,
                            color: a.score >= 70 ? OK : a.score >= 50 ? BLUE : WARN,
                          }}>Score {a.score}/100 · CTR ~{a.predictedCtr?.toFixed(2)}%</span>
                        )}
                        {variants.length > 1 && (
                          <button onClick={() => removeVariant(i)} style={{
                            background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted)',
                          }}><Trash2 size={11} /></button>
                        )}
                      </div>
                    </div>
                    <textarea
                      value={v} onChange={e => setVariant(i, e.target.value)}
                      placeholder={`Texto de la variante ${String.fromCharCode(65 + i)}...`}
                      rows={3}
                      style={{
                        width: '100%', boxSizing: 'border-box',
                        background: 'var(--bg)', border: `1px solid ${purpleAlpha(0.18)}`,
                        borderRadius: 10, padding: '10px 12px', fontSize: 13, lineHeight: 1.5,
                        color: 'var(--text)', fontFamily: FONT_BODY, outline: 'none', resize: 'vertical',
                      }}
                    />
                  </div>
                )
              })}
            </div>
          </div>

          {/* Step 3: Target URL */}
          <div style={{
            background: 'var(--surface)', border: '1px solid var(--border)',
            borderRadius: 14, padding: 18,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
              <div style={{
                width: 28, height: 28, borderRadius: 8,
                background: PURPLE, color: '#fff',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontFamily: FONT_DISPLAY, fontWeight: 800, fontSize: 14,
              }}>3</div>
              <h3 style={{ fontFamily: FONT_DISPLAY, fontSize: 14, fontWeight: 700, color: 'var(--text)', margin: 0 }}>
                URL de destino
              </h3>
            </div>
            <input type="url" value={targetUrl} onChange={e => setTargetUrl(e.target.value)}
              placeholder="https://tu-web.com/landing"
              style={{
                width: '100%', boxSizing: 'border-box',
                background: 'var(--bg)', border: `1px solid ${purpleAlpha(0.18)}`,
                borderRadius: 10, padding: '10px 14px', fontSize: 13,
                color: 'var(--text)', fontFamily: FONT_BODY, outline: 'none',
              }}
            />
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 12, fontSize: 12, color: 'var(--text)', cursor: 'pointer' }}>
              <input type="checkbox" checked={autoPay} onChange={e => setAutoPay(e.target.checked)} />
              Pagar automáticamente todas las campañas tras crearlas
            </label>
          </div>

          {/* Summary */}
          <div style={{
            background: `${PURPLE}06`, border: `1px solid ${purpleAlpha(0.25)}`,
            borderRadius: 14, padding: 18,
            display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap',
          }}>
            <ListChecks size={20} color={PURPLE} />
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 12, color: 'var(--muted)' }}>Resumen del lanzamiento</div>
              <div style={{ fontFamily: FONT_DISPLAY, fontSize: 17, fontWeight: 800, color: 'var(--text)' }}>
                {channels.length} canales × {validVariants.length || 0} variantes = <span style={{ color: PURPLE }}>{totalCampaigns}</span> campañas
              </div>
              <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 2 }}>
                Coste estimado: <strong style={{ color: 'var(--text)' }}>{fmtMoney(totalCost)}</strong>
                {autoPay ? ' (se cargará al confirmar)' : ' (pagable después)'}
              </div>
            </div>
            <button onClick={launchAll} disabled={!canLaunch}
              style={{
                background: canLaunch ? PURPLE : 'var(--bg2)',
                color: canLaunch ? '#fff' : 'var(--muted)',
                border: 'none', borderRadius: 12, padding: '12px 24px',
                fontSize: 14, fontWeight: 800, cursor: canLaunch ? 'pointer' : 'not-allowed',
                fontFamily: FONT_BODY, display: 'flex', alignItems: 'center', gap: 8,
                opacity: canLaunch ? 1 : 0.5,
              }}>
              {launching
                ? <><Loader2 size={14} className="animate-spin" /> Lanzando...</>
                : <><Play size={14} /> Lanzar {totalCampaigns} campañas</>}
            </button>
          </div>

          {launching && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--muted)' }}>
                <span>Concurrencia {LAUNCH_CONCURRENCY}, esto puede tardar...</span>
                <span style={{ fontWeight: 700, color: PURPLE }}>{progress.done}/{progress.total}</span>
              </div>
              <div style={{ height: 6, background: 'var(--bg2)', borderRadius: 3, overflow: 'hidden' }}>
                <div style={{
                  height: '100%', width: `${(progress.done / Math.max(1, progress.total)) * 100}%`,
                  background: PURPLE, borderRadius: 3, transition: 'width .3s',
                }} />
              </div>
            </div>
          )}

          {error && (
            <div role="alert" style={{
              background: `${ERR}10`, border: `1px solid ${ERR}30`, color: ERR,
              borderRadius: 10, padding: '10px 14px', fontSize: 13,
            }}>{error}</div>
          )}

          <div style={{
            background: `${BLUE}08`, border: `1px solid ${BLUE}25`,
            borderRadius: 10, padding: '10px 14px',
            fontSize: 11, color: 'var(--muted)', display: 'flex', gap: 8, alignItems: 'flex-start', lineHeight: 1.5,
          }}>
            <Info size={12} color={BLUE} style={{ flexShrink: 0, marginTop: 2 }} />
            <span>
              Las campañas se crean con tu URL de destino y los textos de cada variante. Cada combinación canal+variante
              es una campaña independiente. Después podrás analizarlas en el A/B Test Lab para identificar la variante
              ganadora.
            </span>
          </div>
        </>
      )}
    </div>
  )
}
