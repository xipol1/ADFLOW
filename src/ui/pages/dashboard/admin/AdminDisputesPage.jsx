import React, { useState, useEffect, useCallback } from 'react'
import { Loader2, ChevronLeft, ChevronRight, AlertTriangle, CheckCircle } from 'lucide-react'
import apiService from '../../../../../services/api'

const D = 'Sora, sans-serif'
const STATUSES = ['', 'open', 'pending', 'resolved', 'rejected']
const STATUS_COLORS = { open: '#EF4444', pending: '#F59E0B', OPEN: '#EF4444', PENDING: '#F59E0B', resolved: '#10B981', RESOLVED: '#10B981', rejected: '#64748b', REJECTED: '#64748b' }
const fmtDate = (d) => d ? new Date(d).toLocaleDateString('es', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : '—'

export default function AdminDisputesPage() {
  const [disputes, setDisputes] = useState([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const [totalPages, setTotalPages] = useState(1)
  const [status, setStatus] = useState('')
  const [resolving, setResolving] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    const params = { page, limit: 20 }
    if (status) params.status = status
    const res = await apiService.getAdminDisputes(params)
    if (res?.success) {
      setDisputes(res.data)
      setTotal(res.pagination?.total || 0)
      setTotalPages(res.pagination?.totalPages || 1)
    }
    setLoading(false)
  }, [page, status])

  useEffect(() => { load() }, [load])

  const resolve = async (id, favor) => {
    setResolving(id)
    await apiService.resolveAdminDispute(id, { status: 'resolved', resolvedInFavorOf: favor, resolution: `Resuelto a favor del ${favor}` })
    await load()
    setResolving('')
  }

  return (
    <div style={{ maxWidth: 1080, margin: '0 auto' }}>
      <h1 style={{ color: 'var(--text)', fontSize: 22, fontWeight: 700, fontFamily: D, margin: '0 0 20px' }}>Disputas</h1>

      <div style={{ display: 'flex', gap: 2, background: 'var(--bg3)', borderRadius: 10, padding: 3, marginBottom: 16 }}>
        {STATUSES.map(s => (
          <button key={s} onClick={() => { setStatus(s); setPage(1) }}
            style={{ background: status === s ? 'var(--accent-dim)' : 'transparent', color: status === s ? 'var(--accent)' : 'var(--muted2)', border: status === s ? '1px solid var(--accent)44' : '1px solid transparent', borderRadius: 8, padding: '6px 14px', fontSize: 12, fontWeight: status === s ? 700 : 500, cursor: 'pointer', textTransform: 'capitalize' }}>
            {s || 'Todas'}
          </button>
        ))}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: 40 }}><Loader2 size={20} style={{ color: 'var(--muted2)', animation: 'spin 1s linear infinite' }} /></div>
        ) : disputes.length === 0 ? (
          <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 16, padding: 40, textAlign: 'center', color: 'var(--muted2)' }}>
            <CheckCircle size={24} style={{ marginBottom: 8, opacity: 0.5 }} />
            <div>Sin disputas</div>
          </div>
        ) : disputes.map(d => {
          const st = (d.status || '').toLowerCase()
          const color = STATUS_COLORS[st] || STATUS_COLORS[d.status] || '#64748b'
          return (
            <div key={d._id} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 14, padding: '16px 20px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <AlertTriangle size={16} style={{ color }} />
                  <span style={{ background: `${color}14`, color, padding: '3px 10px', borderRadius: 6, fontSize: 11, fontWeight: 600, textTransform: 'capitalize' }}>{d.status}</span>
                  <span style={{ color: 'var(--muted2)', fontSize: 11, fontFamily: 'var(--font-mono)' }}>{fmtDate(d.createdAt)}</span>
                </div>
                {d.campana?.price && <span style={{ color: 'var(--text)', fontFamily: 'var(--font-mono)', fontSize: 13, fontWeight: 600 }}>€{d.campana.price}</span>}
              </div>
              <div style={{ display: 'flex', gap: 20, fontSize: 12, marginBottom: 10 }}>
                <div><span style={{ color: 'var(--muted2)' }}>Creador: </span><span style={{ color: 'var(--text-secondary)' }}>{d.creador?.nombre || d.creador?.email || '—'}</span></div>
                <div><span style={{ color: 'var(--muted2)' }}>Anunciante: </span><span style={{ color: 'var(--text-secondary)' }}>{d.anunciante?.nombre || d.anunciante?.email || '—'}</span></div>
              </div>
              {d.motivo && <p style={{ color: 'var(--text-secondary)', fontSize: 13, margin: '0 0 10px', lineHeight: 1.5 }}>{d.motivo}</p>}
              {d.resolution && <p style={{ color: '#10B981', fontSize: 12, margin: '0 0 10px', fontStyle: 'italic' }}>{d.resolution}</p>}
              {(st === 'open' || st === 'pending') && (
                <div style={{ display: 'flex', gap: 8 }}>
                  <button onClick={() => resolve(d._id, 'creador')} disabled={resolving === d._id}
                    style={{ background: '#10B98114', color: '#10B981', border: '1px solid #10B98144', borderRadius: 8, padding: '6px 14px', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
                    {resolving === d._id ? '...' : 'Favor creador'}
                  </button>
                  <button onClick={() => resolve(d._id, 'anunciante')} disabled={resolving === d._id}
                    style={{ background: '#3B82F614', color: '#3B82F6', border: '1px solid #3B82F644', borderRadius: 8, padding: '6px 14px', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
                    {resolving === d._id ? '...' : 'Favor anunciante'}
                  </button>
                </div>
              )}
            </div>
          )
        })}
      </div>

      {totalPages > 1 && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12, marginTop: 16 }}>
          <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 8, padding: '6px 10px', cursor: page === 1 ? 'not-allowed' : 'pointer', color: 'var(--text-secondary)' }}><ChevronLeft size={14} /></button>
          <span style={{ color: 'var(--text-secondary)', fontSize: 12, fontFamily: 'var(--font-mono)' }}>{page} / {totalPages} ({total})</span>
          <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 8, padding: '6px 10px', cursor: page === totalPages ? 'not-allowed' : 'pointer', color: 'var(--text-secondary)' }}><ChevronRight size={14} /></button>
        </div>
      )}
      <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
    </div>
  )
}
