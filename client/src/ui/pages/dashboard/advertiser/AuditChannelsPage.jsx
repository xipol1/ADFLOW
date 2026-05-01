import React, { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  ClipboardList, Play, RotateCcw, Download, AlertTriangle,
  CheckCircle2, XCircle, Sparkles, BarChart3, Filter,
  Trash2, ExternalLink,
} from 'lucide-react'
import apiService from '../../../../services/api'
import { FONT_BODY, FONT_DISPLAY, OK, WARN, ERR, BLUE } from '../../../theme/tokens'

const PURPLE = 'var(--accent, #8B5CF6)'
const purpleAlpha = (o) => `var(--accent-dim, rgba(139,92,246,${o}))`

const MAX_CHANNELS = 50
const CONCURRENCY = 4

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

// Normalize a raw input: strip URLs, @, etc.
function normalizeUsername(raw) {
  return String(raw || '')
    .trim()
    .replace(/^https?:\/\//i, '')
    .replace(/^(t\.me|telegram\.me|instagram\.com|youtube\.com\/c|youtube\.com\/@)\//i, '')
    .replace(/^@/, '')
    .replace(/\/.*$/, '')
}

// Concurrency-limited Promise.all
async function mapWithConcurrency(items, fn, concurrency = 4, onProgress) {
  const results = new Array(items.length)
  let inFlight = 0
  let nextIndex = 0
  let done = 0

  return new Promise((resolve) => {
    const launch = () => {
      while (inFlight < concurrency && nextIndex < items.length) {
        const i = nextIndex++
        inFlight++
        Promise.resolve(fn(items[i], i)).then(r => {
          results[i] = r
          inFlight--
          done++
          onProgress?.(done, items.length)
          if (done === items.length) resolve(results)
          else launch()
        })
      }
    }
    if (items.length === 0) resolve([])
    else launch()
  })
}

// Audit a single username — try direct lookup, fall back to fuzzy search
async function auditOne(rawUsername) {
  const username = normalizeUsername(rawUsername)
  if (!username) return { input: rawUsername, found: false, reason: 'vacío' }

  let resolvedId = null
  if (/^[0-9a-fA-F]{24}$/.test(username)) resolvedId = username
  else {
    const lookup = await apiService.getChannelByUsername(username).catch(() => null)
    if (lookup?.success && lookup.data?.id) resolvedId = lookup.data.id
    else {
      const search = await apiService.searchChannels({ busqueda: username, limite: 1 }).catch(() => null)
      const items = search?.data?.canales || search?.data?.items || search?.data || []
      if (items[0]) resolvedId = items[0].id || items[0]._id
    }
  }

  if (!resolvedId) return { input: rawUsername, username, found: false, reason: 'no encontrado' }

  const intel = await apiService.getChannelIntelligence(resolvedId).catch(() => null)
  if (!intel?.success || !intel.data) return { input: rawUsername, username, found: false, reason: 'sin datos' }

  const c = intel.data.canal || {}
  const s = intel.data.scores || {}
  return {
    input: rawUsername,
    username,
    found: true,
    id: c.id || c._id || resolvedId,
    name: c.nombre || c.nombreCanal || c.identificadorCanal || username,
    plataforma: c.plataforma,
    nicho: c.nicho || c.categoria,
    seguidores: c.seguidores,
    CAS: s.CAS, CAF: s.CAF, CTF: s.CTF, CER: s.CER, CVS: s.CVS, CAP: s.CAP,
    nivel: s.nivel,
    cpm: s.CPMDinamico,
    confianza: s.confianzaScore,
    flags: Array.isArray(s.flags) ? s.flags.length : 0,
  }
}

// Generate CSV string from rows
function rowsToCSV(rows) {
  const headers = ['input', 'username', 'found', 'name', 'plataforma', 'nicho', 'seguidores', 'CAS', 'CAF', 'CTF', 'CER', 'CVS', 'CAP', 'nivel', 'CPM', 'confianza', 'flags', 'reason']
  const lines = [headers.join(',')]
  for (const r of rows) {
    const vals = headers.map(h => {
      const v = r[h]
      if (v == null) return ''
      if (typeof v === 'string' && (v.includes(',') || v.includes('"') || v.includes('\n'))) {
        return `"${v.replace(/"/g, '""')}"`
      }
      return String(v)
    })
    lines.push(vals.join(','))
  }
  return lines.join('\n')
}

function downloadFile(filename, content, type = 'text/csv') {
  const blob = new Blob([content], { type })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url; a.download = filename; a.click()
  URL.revokeObjectURL(url)
}


// ─── Main ──────────────────────────────────────────────────────────────────
export default function AuditChannelsPage() {
  const navigate = useNavigate()
  const [text, setText] = useState('')
  const [running, setRunning] = useState(false)
  const [progress, setProgress] = useState({ done: 0, total: 0 })
  const [rows, setRows] = useState([])
  const [filter, setFilter] = useState('all')  // all | found | notfound | flagged | low
  const [error, setError] = useState('')

  // Parse the textarea — split by lines, commas, spaces; dedupe; cap
  const parsed = useMemo(() => {
    const tokens = text.split(/[\n,;\s]+/).map(t => t.trim()).filter(Boolean)
    const seen = new Set()
    const out = []
    for (const t of tokens) {
      const norm = normalizeUsername(t).toLowerCase()
      if (!norm || seen.has(norm)) continue
      seen.add(norm)
      out.push(t)
      if (out.length >= MAX_CHANNELS) break
    }
    return out
  }, [text])

  const runAudit = async () => {
    if (parsed.length === 0) { setError('Pega al menos un username'); return }
    setError(''); setRunning(true); setRows([]); setProgress({ done: 0, total: parsed.length })

    try {
      const results = await mapWithConcurrency(parsed, auditOne, CONCURRENCY, (done, total) => {
        setProgress({ done, total })
      })
      setRows(results)
    } catch (e) {
      setError(e.message || 'Error en la auditoría')
    }
    setRunning(false)
  }

  const reset = () => { setText(''); setRows([]); setError(''); setProgress({ done: 0, total: 0 }) }

  // Filter / sort the result rows
  const visible = useMemo(() => {
    return rows.filter(r => {
      if (filter === 'all') return true
      if (filter === 'found') return r.found
      if (filter === 'notfound') return !r.found
      if (filter === 'flagged') return r.found && (r.flags > 0)
      if (filter === 'low') return r.found && (r.CAS != null && r.CAS < 50)
      return true
    })
  }, [rows, filter])

  // Aggregate stats
  const stats = useMemo(() => {
    const found = rows.filter(r => r.found)
    const avgCAS = found.length
      ? Math.round(found.reduce((s, r) => s + (r.CAS || 0), 0) / found.length)
      : 0
    const totalReach = found.reduce((s, r) => s + (r.seguidores || 0), 0)
    const flagged = found.filter(r => r.flags > 0).length
    const low = found.filter(r => r.CAS != null && r.CAS < 50).length
    return {
      total: rows.length,
      found: found.length,
      notFound: rows.length - found.length,
      avgCAS, totalReach, flagged, low,
    }
  }, [rows])

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
            <ClipboardList size={20} color={PURPLE} />
          </div>
          <h1 style={{
            fontFamily: FONT_DISPLAY, fontSize: 28, fontWeight: 800,
            color: 'var(--text)', letterSpacing: '-0.04em', lineHeight: 1.1, margin: 0,
          }}>
            Auditoría bulk
          </h1>
        </div>
        <p style={{ fontSize: 14, color: 'var(--muted)', lineHeight: 1.5 }}>
          Pega hasta {MAX_CHANNELS} usernames y obtén un reporte con scoring, flags y CPM de todos en un click. Exportable a CSV.
        </p>
      </div>

      {/* Input */}
      <div style={{
        background: 'var(--surface)', border: '1px solid var(--border)',
        borderRadius: 14, padding: 18,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
          <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Lista de canales
          </label>
          <span style={{ fontSize: 11, color: 'var(--muted)' }}>
            {parsed.length}/{MAX_CHANNELS} canales válidos detectados
          </span>
        </div>
        <textarea
          value={text}
          onChange={e => setText(e.target.value)}
          placeholder={`Pega aquí (uno por línea o separados por coma):\n\nacrelianews\n@channelad_demo\nhttps://t.me/8020ai`}
          rows={6}
          disabled={running}
          style={{
            width: '100%', boxSizing: 'border-box',
            background: 'var(--bg)', border: `1px solid ${purpleAlpha(0.18)}`,
            borderRadius: 10, padding: '12px 14px',
            fontSize: 13, lineHeight: 1.5, color: 'var(--text)',
            fontFamily: 'monospace', outline: 'none', resize: 'vertical',
          }}
        />
        <div style={{ display: 'flex', gap: 8, marginTop: 12, flexWrap: 'wrap' }}>
          <button onClick={runAudit} disabled={running || parsed.length === 0}
            style={{
              background: PURPLE, color: '#fff', border: 'none', borderRadius: 10,
              padding: '10px 18px', fontSize: 13, fontWeight: 700,
              cursor: running || parsed.length === 0 ? 'not-allowed' : 'pointer',
              opacity: running || parsed.length === 0 ? 0.6 : 1,
              fontFamily: FONT_BODY, display: 'flex', alignItems: 'center', gap: 6,
            }}>
            <Play size={13} /> {running ? 'Procesando...' : `Auditar ${parsed.length || 0} canales`}
          </button>
          {(text || rows.length > 0) && (
            <button onClick={reset} disabled={running}
              style={{
                background: 'var(--bg2)', color: 'var(--muted)',
                border: '1px solid var(--border)', borderRadius: 10,
                padding: '10px 14px', fontSize: 12, fontWeight: 600,
                cursor: 'pointer', fontFamily: FONT_BODY,
                display: 'flex', alignItems: 'center', gap: 6,
              }}>
              <RotateCcw size={12} /> Limpiar
            </button>
          )}
        </div>

        {running && (
          <div style={{ marginTop: 14 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--muted)', marginBottom: 6 }}>
              <span>Procesando con concurrencia {CONCURRENCY}…</span>
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

      {/* Stats summary */}
      {rows.length > 0 && !running && (
        <>
          <div style={{
            display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 10,
          }}>
            {[
              { label: 'Encontrados', val: `${stats.found}/${stats.total}`, color: OK },
              { label: 'No encontrados', val: stats.notFound, color: ERR },
              { label: 'CAS medio', val: stats.avgCAS, color: PURPLE },
              { label: 'Alcance total', val: fmtNum(stats.totalReach), color: BLUE },
              { label: 'Con flags', val: stats.flagged, color: WARN },
              { label: 'CAS < 50', val: stats.low, color: '#f97316' },
            ].map(s => (
              <div key={s.label} style={{
                background: 'var(--surface)', border: '1px solid var(--border)',
                borderRadius: 12, padding: 12,
              }}>
                <div style={{ fontSize: 10.5, color: 'var(--muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 4 }}>
                  {s.label}
                </div>
                <div style={{ fontFamily: FONT_DISPLAY, fontSize: 22, fontWeight: 800, color: s.color }}>
                  {s.val}
                </div>
              </div>
            ))}
          </div>

          {/* Filters + export */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            <Filter size={14} color="var(--muted)" />
            <span style={{ fontSize: 12, color: 'var(--muted)', fontWeight: 600 }}>Filtrar:</span>
            {[
              { key: 'all',      label: 'Todos' },
              { key: 'found',    label: 'Encontrados' },
              { key: 'notfound', label: 'No encontrados' },
              { key: 'flagged',  label: 'Con flags' },
              { key: 'low',      label: 'CAS bajo' },
            ].map(f => {
              const active = filter === f.key
              return (
                <button key={f.key} onClick={() => setFilter(f.key)} style={{
                  background: active ? PURPLE : 'var(--surface)',
                  color: active ? '#fff' : 'var(--muted)',
                  border: `1px solid ${active ? PURPLE : 'var(--border)'}`,
                  borderRadius: 8, padding: '5px 12px',
                  fontSize: 12, fontWeight: 600, cursor: 'pointer',
                  fontFamily: FONT_BODY,
                }}>{f.label}</button>
              )
            })}
            <span style={{ flex: 1 }} />
            <button onClick={() => downloadFile(`audit-${Date.now()}.csv`, rowsToCSV(rows))}
              style={{
                background: 'var(--bg2)', border: '1px solid var(--border)',
                borderRadius: 8, padding: '6px 14px', fontSize: 12, fontWeight: 600,
                color: 'var(--text)', cursor: 'pointer', fontFamily: FONT_BODY,
                display: 'flex', alignItems: 'center', gap: 6,
              }}>
              <Download size={12} /> Exportar CSV
            </button>
          </div>

          {/* Results table */}
          <div style={{
            background: 'var(--surface)', border: '1px solid var(--border)',
            borderRadius: 14, overflow: 'auto',
          }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 900 }}>
              <thead>
                <tr style={{ background: 'var(--bg2)', borderBottom: '1px solid var(--border)' }}>
                  {['Input', 'Canal', 'Plataforma', 'Nicho', 'Subs', 'CAS', 'CAF', 'CER', 'CTF', 'CPM', 'Tier', 'Flags', 'Acciones'].map(h => (
                    <th key={h} style={{
                      padding: '10px 12px', textAlign: 'left',
                      fontSize: 11, fontWeight: 700, color: 'var(--muted)',
                      textTransform: 'uppercase', letterSpacing: '0.04em',
                      whiteSpace: 'nowrap',
                    }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {visible.map((r, i) => {
                  if (!r.found) {
                    return (
                      <tr key={i} style={{ borderBottom: '1px solid var(--border)' }}>
                        <td style={{ padding: '10px 12px', fontSize: 12, color: 'var(--text)', fontFamily: 'monospace' }}>{r.input}</td>
                        <td colSpan={11} style={{
                          padding: '10px 12px', fontSize: 12, color: ERR,
                          display: 'flex', alignItems: 'center', gap: 6,
                        }}>
                          <XCircle size={12} /> {r.reason || 'No encontrado'}
                        </td>
                        <td />
                      </tr>
                    )
                  }
                  return (
                    <tr key={i} style={{
                      borderBottom: '1px solid var(--border)',
                      background: r.flags > 0 ? `${ERR}05` : (r.CAS != null && r.CAS < 50) ? `${WARN}05` : 'transparent',
                    }}>
                      <td style={{ padding: '10px 12px', fontSize: 11, color: 'var(--muted)', fontFamily: 'monospace', maxWidth: 120, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {r.input}
                      </td>
                      <td style={{ padding: '10px 12px', fontSize: 12.5, color: 'var(--text)', fontWeight: 600, maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {r.name}
                      </td>
                      <td style={{ padding: '10px 12px', fontSize: 12, color: 'var(--muted)' }}>{r.plataforma || '—'}</td>
                      <td style={{ padding: '10px 12px', fontSize: 12, color: 'var(--muted)' }}>{r.nicho || '—'}</td>
                      <td style={{ padding: '10px 12px', fontSize: 12, color: 'var(--text)', fontFamily: 'monospace', textAlign: 'right' }}>
                        {fmtNum(r.seguidores)}
                      </td>
                      <td style={{ padding: '10px 12px', fontSize: 12, fontFamily: 'monospace', textAlign: 'right', color: r.CAS >= 70 ? OK : r.CAS >= 50 ? BLUE : ERR, fontWeight: 700 }}>
                        {r.CAS ?? '—'}
                      </td>
                      <td style={{ padding: '10px 12px', fontSize: 12, fontFamily: 'monospace', textAlign: 'right', color: 'var(--text)' }}>{r.CAF ?? '—'}</td>
                      <td style={{ padding: '10px 12px', fontSize: 12, fontFamily: 'monospace', textAlign: 'right', color: 'var(--text)' }}>{r.CER ?? '—'}</td>
                      <td style={{ padding: '10px 12px', fontSize: 12, fontFamily: 'monospace', textAlign: 'right', color: 'var(--text)' }}>{r.CTF ?? '—'}</td>
                      <td style={{ padding: '10px 12px', fontSize: 12, fontFamily: 'monospace', textAlign: 'right', color: 'var(--text)' }}>
                        {r.cpm != null ? `€${Number(r.cpm).toFixed(1)}` : '—'}
                      </td>
                      <td style={{ padding: '10px 12px' }}>
                        {r.nivel && (
                          <span style={{
                            background: `${tierColor(r.nivel)}20`, color: tierColor(r.nivel),
                            border: `1px solid ${tierColor(r.nivel)}40`,
                            borderRadius: 5, padding: '1px 7px', fontSize: 10, fontWeight: 700,
                          }}>{r.nivel}</span>
                        )}
                      </td>
                      <td style={{ padding: '10px 12px' }}>
                        {r.flags > 0 ? (
                          <span style={{
                            background: `${ERR}15`, color: ERR, fontWeight: 700,
                            borderRadius: 5, padding: '1px 6px', fontSize: 11,
                            display: 'inline-flex', alignItems: 'center', gap: 3,
                          }}>
                            <AlertTriangle size={10} /> {r.flags}
                          </span>
                        ) : (
                          <CheckCircle2 size={12} color={OK} />
                        )}
                      </td>
                      <td style={{ padding: '10px 8px', whiteSpace: 'nowrap' }}>
                        <button onClick={() => navigate(`/advertiser/analyze/channel?q=${encodeURIComponent(r.username || r.id)}`)}
                          title="Analizar"
                          style={{
                            background: 'none', border: '1px solid var(--border)',
                            borderRadius: 6, padding: '4px 8px', cursor: 'pointer',
                            color: 'var(--muted)', fontSize: 11,
                          }}>
                          <ExternalLink size={11} />
                        </button>
                      </td>
                    </tr>
                  )
                })}
                {visible.length === 0 && (
                  <tr>
                    <td colSpan={13} style={{ padding: '40px', textAlign: 'center', color: 'var(--muted)', fontSize: 13 }}>
                      No hay resultados para este filtro.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </>
      )}

      {/* Empty state */}
      {rows.length === 0 && !running && !error && (
        <div style={{
          background: 'var(--surface)', border: '1px dashed var(--border)',
          borderRadius: 18, padding: '40px 24px', textAlign: 'center',
        }}>
          <div style={{
            width: 64, height: 64, borderRadius: 18,
            background: purpleAlpha(0.08), border: `1px solid ${purpleAlpha(0.18)}`,
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center', marginBottom: 16,
          }}>
            <Sparkles size={28} color={PURPLE} />
          </div>
          <h3 style={{ fontFamily: FONT_DISPLAY, fontSize: 17, fontWeight: 700, color: 'var(--text)', marginBottom: 6 }}>
            Pega tu lista para empezar
          </h3>
          <p style={{ fontSize: 13, color: 'var(--muted)', maxWidth: 480, margin: '0 auto', lineHeight: 1.6 }}>
            Acepta usernames con o sin <code>@</code>, URLs <code>t.me/</code> o IDs directos. Filas inválidas se filtran. Procesa hasta {MAX_CHANNELS} en paralelo.
          </p>
        </div>
      )}
    </div>
  )
}
