import React, { useState, useEffect, useCallback } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Helmet } from 'react-helmet-async'
import { CheckCircle, XCircle, ExternalLink, X, Loader2 } from 'lucide-react'
import apiService from '../../../../services/api'
import { Badge, TableRowSkeleton } from '../../../components/ui'

const STATUS_TABS = [
  { key: 'pending_review', label: '⏳ Pendientes', color: 'var(--gold)' },
  { key: 'approved', label: '✅ Aprobados', color: 'var(--accent)' },
  { key: 'rejected', label: '❌ Rechazados', color: 'var(--red)' },
]

const SOURCE_FILTERS = [
  { key: '', label: 'Todos' },
  { key: 'tgstat', label: 'MTProto' },
  { key: 'social_graph', label: 'Grafo social' },
  { key: 'manual', label: 'Manual' },
]

const SOURCE_COLORS = { tgstat: 'var(--blue)', social_graph: '#8B5CF6', telemetr: 'var(--gold)', manual: 'var(--text-secondary)' }

const fmtNum = (n) => { if (n == null) return '—'; if (n >= 1e6) return `${(n / 1e6).toFixed(1)}M`; if (n >= 1e3) return `${(n / 1e3).toFixed(1)}K`; return String(n) }
const fmtDate = (d) => d ? new Date(d).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' }) : '—'

// ── Reject modal ────────────────────────────────────────────────────────
function RejectModal({ candidate, onClose, onReject }) {
  const [reason, setReason] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const handleSubmit = async () => { setSubmitting(true); await onReject(candidate._id || candidate.id, reason); setSubmitting(false); onClose() }

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/50" onClick={onClose} />
      <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-[400px] max-w-[90vw] rounded-xl p-6" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-base font-bold" style={{ color: 'var(--text)' }}>Rechazar @{candidate.username}</h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted2)' }}><X size={18} /></button>
        </div>
        <select
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          className="w-full rounded-lg px-3 py-2.5 text-sm mb-3"
          style={{ background: 'var(--bg)', border: '1px solid var(--border)', color: 'var(--text)', fontFamily: 'var(--font-sans)' }}
        >
          <option value="">Selecciona un motivo...</option>
          <option value="Canal inactivo">Canal inactivo</option>
          <option value="Spam">Spam</option>
          <option value="Contenido inapropiado">Contenido inapropiado</option>
          <option value="Pocos suscriptores">Pocos suscriptores</option>
          <option value="Otro">Otro</option>
        </select>
        <div className="flex gap-2 justify-end">
          <button onClick={onClose} className="px-4 py-2 rounded-lg text-sm font-medium" style={{ border: '1px solid var(--border)', background: 'transparent', color: 'var(--text-secondary)', cursor: 'pointer' }}>Cancelar</button>
          <button onClick={handleSubmit} disabled={submitting} className="px-4 py-2 rounded-lg text-sm font-semibold" style={{ background: 'var(--red)', color: '#fff', border: 'none', cursor: submitting ? 'not-allowed' : 'pointer', opacity: submitting ? 0.7 : 1 }}>
            {submitting ? 'Rechazando...' : 'Confirmar rechazo'}
          </button>
        </div>
      </div>
    </>
  )
}

// ═══════════════════════════════════════════════════════════════════════════
export default function CandidatesReviewPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const activeStatus = searchParams.get('status') || 'pending_review'
  const activeSource = searchParams.get('source') || ''
  const page = Math.max(1, Number(searchParams.get('page')) || 1)

  const [candidates, setCandidates] = useState([])
  const [pagination, setPagination] = useState({ total: 0, pages: 1 })
  const [loading, setLoading] = useState(true)
  const [rejectTarget, setRejectTarget] = useState(null)
  const [actionId, setActionId] = useState(null)
  const [toast, setToast] = useState(null)

  const setParam = useCallback((key, value) => {
    setSearchParams((prev) => { const n = new URLSearchParams(prev); if (!value) n.delete(key); else n.set(key, value); if (key !== 'page') n.delete('page'); return n })
  }, [setSearchParams])

  useEffect(() => {
    let c = false; setLoading(true)
    apiService.getCandidates({ status: activeStatus, source: activeSource, page, limit: 25 }).then((res) => {
      if (c) return; if (res?.success) { setCandidates(res.data || []); setPagination(res.pagination || { total: 0, pages: 1 }) }
    }).catch(() => { if (!c) setCandidates([]) }).finally(() => { if (!c) setLoading(false) })
    return () => { c = true }
  }, [activeStatus, activeSource, page])

  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(null), 4000) }

  const handleApprove = async (cid) => {
    setActionId(cid)
    try {
      const res = await apiService.approveCandidate(cid)
      if (res?.success) { setCandidates((p) => p.filter((c) => (c._id || c.id) !== cid)); showToast(`Canal anadido al marketplace ✓`) }
    } catch {}
    setActionId(null)
  }

  const handleReject = async (cid, reason) => {
    setActionId(cid)
    try { await apiService.rejectCandidate(cid, reason); setCandidates((p) => p.filter((c) => (c._id || c.id) !== cid)); showToast('Canal rechazado') } catch {}
    setActionId(null)
  }

  const pendingCount = activeStatus === 'pending_review' ? pagination.total : null
  const th = 'px-3 py-2.5 text-[10px] font-bold uppercase tracking-widest whitespace-nowrap text-left'

  return (
    <div className="min-h-screen" style={{ fontFamily: 'var(--font-sans)' }}>
      <Helmet><title>Candidatos · Admin · Channelad</title></Helmet>

      {/* Header */}
      <div className="flex items-baseline justify-between mb-5">
        <div>
          <h1 className="text-xl font-bold" style={{ color: 'var(--text)' }}>Candidatos descubiertos</h1>
          <p className="text-sm mt-0.5" style={{ color: 'var(--text-secondary)' }}>
            {pendingCount != null ? `${pendingCount} pendiente${pendingCount !== 1 ? 's' : ''} de revision` : `${candidates.length} de ${pagination.total}`}
          </p>
        </div>
        {pendingCount != null && pendingCount > 0 && (
          <span className="px-2.5 py-1 rounded-full text-xs font-bold" style={{ background: 'var(--accent-dim)', color: 'var(--accent)', border: '1px solid var(--accent-border)' }}>{pendingCount}</span>
        )}
      </div>

      {/* Status tabs */}
      <div className="flex gap-1 mb-4 p-1 rounded-lg" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
        {STATUS_TABS.map((t) => (
          <button key={t.key} onClick={() => setParam('status', t.key)}
            className="px-4 py-2 rounded-md text-[13px] font-medium whitespace-nowrap"
            style={{ background: activeStatus === t.key ? t.color : 'transparent', color: activeStatus === t.key ? '#fff' : 'var(--text-secondary)', border: 'none', cursor: 'pointer' }}
          >{t.label}</button>
        ))}
      </div>

      {/* Source filter */}
      <div className="flex gap-2 mb-5">
        {SOURCE_FILTERS.map((sf) => (
          <button key={sf.key} onClick={() => setParam('source', sf.key)}
            className="px-3 py-1.5 rounded-full text-xs font-medium"
            style={{ border: `1px solid ${activeSource === sf.key ? 'var(--accent)' : 'var(--border)'}`, background: activeSource === sf.key ? 'var(--accent-dim)' : 'transparent', color: activeSource === sf.key ? 'var(--accent)' : 'var(--text-secondary)', cursor: 'pointer' }}
          >{sf.label}</button>
        ))}
      </div>

      {/* Table */}
      <div className="rounded-xl overflow-hidden" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
        {loading ? (
          <table className="w-full"><tbody>{Array.from({ length: 6 }).map((_, i) => <TableRowSkeleton key={i} cols={7} />)}</tbody></table>
        ) : candidates.length === 0 ? (
          <div className="text-center py-16">
            <div className="text-3xl mb-3">📭</div>
            <p className="text-sm font-medium" style={{ color: 'var(--text)' }}>No hay candidatos {STATUS_TABS.find((t) => t.key === activeStatus)?.label?.replace(/[⏳✅❌] /, '').toLowerCase()}</p>
            <p className="text-xs mt-1" style={{ color: 'var(--muted2)' }}>Los candidatos se descubren automaticamente via MTProto</p>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="w-full" style={{ minWidth: 750, borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: 'var(--bg3)' }}>
                  <th className={th} style={{ color: 'var(--text-secondary)' }}>Canal</th>
                  <th className={`${th} text-right`} style={{ color: 'var(--text-secondary)' }}>Subs</th>
                  <th className={`${th} text-right`} style={{ color: 'var(--text-secondary)' }}>Avg Views</th>
                  <th className={`${th} text-right`} style={{ color: 'var(--text-secondary)' }}>Engagement</th>
                  <th className={th} style={{ color: 'var(--text-secondary)' }}>Fuente</th>
                  <th className={th} style={{ color: 'var(--text-secondary)' }}>Descubierto</th>
                  <th className={`${th} text-center`} style={{ color: 'var(--text-secondary)' }}>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {candidates.map((c) => {
                  const cid = c._id || c.id
                  const m = c.raw_metrics || {}
                  const isActioning = actionId === cid
                  const srcColor = SOURCE_COLORS[c.source] || 'var(--text-secondary)'

                  return (
                    <tr key={cid} style={{ borderBottom: '1px solid var(--border)', opacity: isActioning ? 0.4 : 1, transition: 'opacity 300ms' }}>
                      <td className="px-3 py-3">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold flex-shrink-0" style={{ background: 'var(--bg3)', color: 'var(--accent)' }}>
                            {(c.username || '?').charAt(0).toUpperCase()}
                          </div>
                          <div className="min-w-0">
                            <div className="text-sm font-medium" style={{ color: 'var(--text)' }}>@{c.username}</div>
                            {m.title && <div className="text-[11px] truncate" style={{ color: 'var(--muted2)', maxWidth: 180 }}>{m.title}</div>}
                          </div>
                        </div>
                      </td>
                      <td className="px-3 py-3 text-right text-sm" style={{ fontFamily: 'var(--font-mono)', color: 'var(--text)' }}>{fmtNum(m.subscribers)}</td>
                      <td className="px-3 py-3 text-right text-xs" style={{ fontFamily: 'var(--font-mono)', color: 'var(--text-secondary)' }}>{m.avg_views != null ? fmtNum(m.avg_views) : '—'}</td>
                      <td className="px-3 py-3 text-right text-xs" style={{ fontFamily: 'var(--font-mono)', color: 'var(--text-secondary)' }}>{m.engagement_rate != null ? `${(m.engagement_rate * 100).toFixed(1)}%` : '—'}</td>
                      <td className="px-3 py-3">
                        <span className="inline-block px-2 py-0.5 rounded-md text-[10px] font-semibold uppercase" style={{ background: `${srcColor}12`, color: srcColor, border: `1px solid ${srcColor}25` }}>{c.source}</span>
                      </td>
                      <td className="px-3 py-3 text-xs" style={{ color: 'var(--muted2)' }}>{fmtDate(c.scraped_at)}</td>
                      <td className="px-3 py-3">
                        <div className="flex gap-1.5 justify-center">
                          {activeStatus === 'pending_review' && (
                            <>
                              <button onClick={() => handleApprove(cid)} disabled={isActioning} className="flex items-center gap-1 px-2.5 py-1.5 rounded-md text-[11px] font-semibold" style={{ background: 'var(--accent)', color: '#080C10', border: 'none', cursor: isActioning ? 'not-allowed' : 'pointer' }}>
                                {isActioning ? <Loader2 size={10} className="animate-spin" /> : <CheckCircle size={10} />} Aprobar
                              </button>
                              <button onClick={() => setRejectTarget(c)} disabled={isActioning} className="flex items-center gap-1 px-2.5 py-1.5 rounded-md text-[11px] font-semibold" style={{ border: '1px solid var(--red)', background: 'transparent', color: 'var(--red)', cursor: isActioning ? 'not-allowed' : 'pointer' }}>
                                <XCircle size={10} /> Rechazar
                              </button>
                            </>
                          )}
                          <a href={`https://tgstat.com/channel/@${c.username}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 px-2 py-1.5 rounded-md text-[11px]" style={{ border: '1px solid var(--border)', color: 'var(--muted2)' }}>
                            <ExternalLink size={10} /> TG
                          </a>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-6 right-6 z-50 px-4 py-3 rounded-lg text-sm font-medium shadow-lg animate-fadeIn" style={{ background: 'var(--accent)', color: '#080C10' }}>
          {toast}
        </div>
      )}

      {rejectTarget && <RejectModal candidate={rejectTarget} onClose={() => setRejectTarget(null)} onReject={handleReject} />}
    </div>
  )
}
