import React, { useState, useEffect, useCallback } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Helmet } from 'react-helmet-async'
import {
  CheckCircle, XCircle, ExternalLink, X, Loader2,
} from 'lucide-react'
import apiService from '../../../../services/api'
import { C } from '../../theme/tokens'

// ─── Constants ──────────────────────────────────────────────────────────────

const FONT = "'DM Sans', 'Inter', system-ui, sans-serif"

const STATUS_TABS = [
  { key: 'pending_review', label: 'Pendientes', color: '#f59e0b' },
  { key: 'approved', label: 'Aprobados', color: C.ok },
  { key: 'rejected', label: 'Rechazados', color: C.alert },
]

const SOURCE_FILTERS = [
  { key: '', label: 'Todas' },
  { key: 'tgstat', label: 'TGStat' },
  { key: 'social_graph', label: 'Social Graph' },
  { key: 'manual', label: 'Manual' },
]

const fmtNum = (n) => {
  if (n == null) return '--'
  if (n >= 1e6) return `${(n / 1e6).toFixed(1)}M`
  if (n >= 1e3) return `${(n / 1e3).toFixed(1)}K`
  return String(n)
}

const fmtDate = (d) => {
  if (!d) return '--'
  return new Date(d).toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: '2-digit' })
}

// ─── Reject modal ───────────────────────────────────────────────────────────

function RejectModal({ candidate, onClose, onReject }) {
  const [reason, setReason] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const handleSubmit = async () => {
    setSubmitting(true)
    await onReject(candidate._id || candidate.id, reason)
    setSubmitting(false)
    onClose()
  }

  return (
    <>
      <div
        onClick={onClose}
        style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 100 }}
      />
      <div
        style={{
          position: 'fixed',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          background: C.surface,
          border: `1px solid ${C.border}`,
          borderRadius: 16,
          padding: 24,
          width: 400,
          maxWidth: '90vw',
          zIndex: 101,
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: C.t1 }}>
            Rechazar @{candidate.username}
          </h3>
          <button
            onClick={onClose}
            style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4 }}
          >
            <X size={18} color={C.t3} />
          </button>
        </div>

        <textarea
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="Motivo del rechazo (opcional)..."
          rows={3}
          style={{
            width: '100%',
            boxSizing: 'border-box',
            background: C.bg,
            border: `1px solid ${C.border}`,
            borderRadius: 10,
            padding: 12,
            color: C.t1,
            fontSize: 13,
            fontFamily: FONT,
            resize: 'vertical',
            outline: 'none',
            marginBottom: 16,
          }}
        />

        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          <button
            onClick={onClose}
            style={{
              padding: '8px 16px',
              borderRadius: 8,
              border: `1px solid ${C.border}`,
              background: 'transparent',
              color: C.t2,
              fontSize: 13,
              fontWeight: 600,
              cursor: 'pointer',
              fontFamily: FONT,
            }}
          >
            Cancelar
          </button>
          <button
            onClick={handleSubmit}
            disabled={submitting}
            style={{
              padding: '8px 16px',
              borderRadius: 8,
              border: 'none',
              background: C.alert,
              color: '#fff',
              fontSize: 13,
              fontWeight: 600,
              cursor: submitting ? 'not-allowed' : 'pointer',
              fontFamily: FONT,
              opacity: submitting ? 0.7 : 1,
            }}
          >
            {submitting ? 'Rechazando...' : 'Rechazar'}
          </button>
        </div>
      </div>
    </>
  )
}

// ─── Table skeleton ─────────────────────────────────────────────────────────

function TableSkeleton() {
  return (
    <div className="animate-pulse">
      {Array.from({ length: 6 }).map((_, i) => (
        <div
          key={i}
          style={{
            height: 56,
            borderBottom: `1px solid ${C.border}`,
            display: 'flex',
            alignItems: 'center',
            padding: '0 16px',
            gap: 16,
          }}
        >
          <div style={{ width: 120, height: 12, background: C.surfaceEl, borderRadius: 4 }} />
          <div style={{ width: 60, height: 12, background: C.surfaceEl, borderRadius: 4 }} />
          <div style={{ width: 60, height: 12, background: C.surfaceEl, borderRadius: 4 }} />
          <div style={{ flex: 1 }} />
          <div style={{ width: 80, height: 28, background: C.surfaceEl, borderRadius: 6 }} />
        </div>
      ))}
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
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
  const [actionLoading, setActionLoading] = useState(null) // candidate ID being actioned

  const setParam = useCallback((key, value) => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev)
      if (!value) next.delete(key)
      else next.set(key, value)
      if (key !== 'page') next.delete('page')
      return next
    })
  }, [setSearchParams])

  // Fetch candidates
  useEffect(() => {
    let cancelled = false
    setLoading(true)

    apiService
      .getCandidates({ status: activeStatus, source: activeSource, page, limit: 25 })
      .then((res) => {
        if (cancelled) return
        if (res?.success) {
          setCandidates(res.data || [])
          setPagination(res.pagination || { total: 0, pages: 1 })
        }
      })
      .catch(() => {
        if (!cancelled) setCandidates([])
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => { cancelled = true }
  }, [activeStatus, activeSource, page])

  const handleApprove = async (id) => {
    setActionLoading(id)
    try {
      const res = await apiService.approveCandidate(id)
      if (res?.success) {
        setCandidates((prev) => prev.filter((c) => (c._id || c.id) !== id))
        setPagination((prev) => ({ ...prev, total: Math.max(0, prev.total - 1) }))
      }
    } catch { /* silent */ }
    setActionLoading(null)
  }

  const handleReject = async (id, reason) => {
    setActionLoading(id)
    try {
      const res = await apiService.rejectCandidate(id, reason)
      if (res?.success) {
        setCandidates((prev) => prev.filter((c) => (c._id || c.id) !== id))
        setPagination((prev) => ({ ...prev, total: Math.max(0, prev.total - 1) }))
      }
    } catch { /* silent */ }
    setActionLoading(null)
  }

  const pendingCount = activeStatus === 'pending_review' ? pagination.total : null

  const thStyle = {
    padding: '10px 12px',
    fontSize: 10,
    fontWeight: 700,
    color: C.t3,
    textTransform: 'uppercase',
    letterSpacing: '0.08em',
    whiteSpace: 'nowrap',
    borderBottom: `1px solid ${C.border}`,
    textAlign: 'left',
  }

  return (
    <div style={{ fontFamily: FONT, minHeight: '100vh' }}>
      <Helmet>
        <title>Revision de Candidatos · Admin · Channelad</title>
      </Helmet>

      {/* ── HEADER ──────────────────────────────────────────────── */}
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 24, fontWeight: 800, color: 'var(--text)', margin: 0, letterSpacing: '-0.02em' }}>
          Revision de Candidatos
        </h1>
        <p style={{ fontSize: 13, color: 'var(--muted)', margin: '4px 0 0' }}>
          {pendingCount != null
            ? `${pendingCount} candidato${pendingCount !== 1 ? 's' : ''} pendiente${pendingCount !== 1 ? 's' : ''} de revision`
            : `Mostrando ${candidates.length} de ${pagination.total} resultados`}
        </p>
      </div>

      {/* ── STATUS TABS ─────────────────────────────────────────── */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 16, padding: 4, background: 'var(--surface)', borderRadius: 12, border: `1px solid var(--border)` }}>
        {STATUS_TABS.map((tab) => {
          const active = activeStatus === tab.key
          return (
            <button
              key={tab.key}
              onClick={() => setParam('status', tab.key)}
              style={{
                padding: '8px 18px',
                borderRadius: 8,
                border: 'none',
                background: active ? tab.color : 'transparent',
                color: active ? '#fff' : 'var(--muted)',
                fontSize: 13,
                fontWeight: active ? 700 : 500,
                cursor: 'pointer',
                fontFamily: FONT,
                transition: 'all 150ms',
              }}
            >
              {tab.label}
            </button>
          )
        })}
      </div>

      {/* ── SOURCE FILTER ───────────────────────────────────────── */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 20 }}>
        {SOURCE_FILTERS.map((sf) => {
          const active = activeSource === sf.key
          return (
            <button
              key={sf.key}
              onClick={() => setParam('source', sf.key)}
              style={{
                padding: '5px 12px',
                borderRadius: 999,
                border: active ? `1px solid ${C.teal}` : '1px solid var(--border)',
                background: active ? `${C.teal}15` : 'transparent',
                color: active ? C.teal : 'var(--muted)',
                fontSize: 12,
                fontWeight: 600,
                cursor: 'pointer',
                fontFamily: FONT,
              }}
            >
              {sf.label}
            </button>
          )
        })}
      </div>

      {/* ── TABLE ───────────────────────────────────────────────── */}
      <div
        style={{
          background: 'var(--surface)',
          border: '1px solid var(--border)',
          borderRadius: 16,
          overflow: 'hidden',
        }}
      >
        {loading ? (
          <TableSkeleton />
        ) : candidates.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '48px 24px', color: 'var(--muted)' }}>
            <div style={{ fontSize: 36, marginBottom: 8 }}>📭</div>
            <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)', marginBottom: 4 }}>
              No hay candidatos {STATUS_TABS.find((t) => t.key === activeStatus)?.label.toLowerCase()}
            </div>
            <div style={{ fontSize: 12 }}>Los candidatos se descubren automaticamente via TGStat</div>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 750 }}>
              <thead>
                <tr style={{ background: `${C.bg}80` }}>
                  <th style={thStyle}>@Username</th>
                  <th style={{ ...thStyle, textAlign: 'right' }}>Suscriptores</th>
                  <th style={{ ...thStyle, textAlign: 'right' }}>Avg Views</th>
                  <th style={{ ...thStyle, textAlign: 'right' }}>Engagement</th>
                  <th style={thStyle}>Fuente</th>
                  <th style={thStyle}>Descubierto</th>
                  <th style={{ ...thStyle, textAlign: 'center' }}>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {candidates.map((c) => {
                  const cid = c._id || c.id
                  const m = c.raw_metrics || {}
                  const isActioning = actionLoading === cid

                  return (
                    <tr
                      key={cid}
                      style={{
                        borderBottom: `1px solid var(--border)`,
                        opacity: isActioning ? 0.5 : 1,
                        transition: 'opacity 200ms',
                      }}
                    >
                      <td style={{ padding: '12px', fontSize: 13 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <div
                            style={{
                              width: 32,
                              height: 32,
                              borderRadius: 8,
                              background: C.surfaceEl,
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontSize: 13,
                              fontWeight: 700,
                              color: C.teal,
                              flexShrink: 0,
                            }}
                          >
                            {(c.username || '?').charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <div style={{ fontWeight: 600, color: 'var(--text)' }}>@{c.username}</div>
                            {m.title && (
                              <div style={{ fontSize: 11, color: 'var(--muted)', maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                {m.title}
                              </div>
                            )}
                          </div>
                        </div>
                      </td>
                      <td style={{ padding: '12px', textAlign: 'right', fontFamily: 'monospace', fontSize: 13, color: 'var(--text)' }}>
                        {fmtNum(m.subscribers)}
                      </td>
                      <td style={{ padding: '12px', textAlign: 'right', fontFamily: 'monospace', fontSize: 13, color: 'var(--muted)' }}>
                        {m.avg_views != null ? fmtNum(m.avg_views) : '--'}
                      </td>
                      <td style={{ padding: '12px', textAlign: 'right', fontFamily: 'monospace', fontSize: 13, color: 'var(--muted)' }}>
                        {m.engagement_rate != null ? `${(m.engagement_rate * 100).toFixed(1)}%` : '--'}
                      </td>
                      <td style={{ padding: '12px' }}>
                        <span
                          style={{
                            padding: '2px 8px',
                            borderRadius: 999,
                            fontSize: 10,
                            fontWeight: 600,
                            background: c.source === 'tgstat' ? '#8b5cf615' : `${C.teal}15`,
                            color: c.source === 'tgstat' ? '#8b5cf6' : C.teal,
                            border: `1px solid ${c.source === 'tgstat' ? '#8b5cf630' : C.teal + '30'}`,
                            textTransform: 'uppercase',
                          }}
                        >
                          {c.source}
                        </span>
                      </td>
                      <td style={{ padding: '12px', fontSize: 12, color: 'var(--muted)' }}>
                        {fmtDate(c.scraped_at)}
                      </td>
                      <td style={{ padding: '12px' }}>
                        <div style={{ display: 'flex', gap: 6, justifyContent: 'center' }}>
                          {activeStatus === 'pending_review' && (
                            <>
                              <button
                                onClick={() => handleApprove(cid)}
                                disabled={isActioning}
                                title="Aprobar"
                                style={{
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: 4,
                                  padding: '6px 12px',
                                  borderRadius: 8,
                                  border: 'none',
                                  background: C.ok,
                                  color: '#fff',
                                  fontSize: 11,
                                  fontWeight: 600,
                                  cursor: isActioning ? 'not-allowed' : 'pointer',
                                  fontFamily: FONT,
                                }}
                              >
                                {isActioning ? <Loader2 size={12} className="animate-spin" /> : <CheckCircle size={12} />}
                                Aprobar
                              </button>
                              <button
                                onClick={() => setRejectTarget(c)}
                                disabled={isActioning}
                                title="Rechazar"
                                style={{
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: 4,
                                  padding: '6px 12px',
                                  borderRadius: 8,
                                  border: `1px solid ${C.alert}40`,
                                  background: 'transparent',
                                  color: C.alert,
                                  fontSize: 11,
                                  fontWeight: 600,
                                  cursor: isActioning ? 'not-allowed' : 'pointer',
                                  fontFamily: FONT,
                                }}
                              >
                                <XCircle size={12} />
                                Rechazar
                              </button>
                            </>
                          )}
                          <a
                            href={`https://tgstat.com/channel/@${c.username}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            title="Ver en TGStat"
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: 4,
                              padding: '6px 10px',
                              borderRadius: 8,
                              border: `1px solid var(--border)`,
                              background: 'transparent',
                              color: 'var(--muted)',
                              fontSize: 11,
                              fontWeight: 600,
                              textDecoration: 'none',
                            }}
                          >
                            <ExternalLink size={12} />
                            TGStat
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

      {/* ── PAGINATION ──────────────────────────────────────────── */}
      {pagination.pages > 1 && (
        <div style={{ display: 'flex', justifyContent: 'center', gap: 6, marginTop: 24 }}>
          {Array.from({ length: Math.min(pagination.pages, 10) }).map((_, i) => {
            const p = i + 1
            return (
              <button
                key={p}
                onClick={() => setParam('page', String(p))}
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 8,
                  border: page === p ? `1px solid ${C.teal}` : `1px solid var(--border)`,
                  background: page === p ? `${C.teal}15` : 'transparent',
                  color: page === p ? C.teal : 'var(--text)',
                  fontSize: 13,
                  fontWeight: page === p ? 700 : 500,
                  cursor: 'pointer',
                  fontFamily: 'monospace',
                }}
              >
                {p}
              </button>
            )
          })}
        </div>
      )}

      {/* ── REJECT MODAL ────────────────────────────────────────── */}
      {rejectTarget && (
        <RejectModal
          candidate={rejectTarget}
          onClose={() => setRejectTarget(null)}
          onReject={handleReject}
        />
      )}
    </div>
  )
}
