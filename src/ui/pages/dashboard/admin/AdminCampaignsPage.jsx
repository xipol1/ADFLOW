import React, { useState, useEffect, useCallback } from 'react'
import { Loader2, ChevronLeft, ChevronRight } from 'lucide-react'
import apiService from '../../../../../services/api'

const D = 'Sora, sans-serif'
const STATUSES = ['', 'DRAFT', 'PAID', 'PUBLISHED', 'COMPLETED', 'CANCELLED', 'DISPUTED']
const STATUS_COLORS = { DRAFT: '#64748b', PAID: '#3B82F6', PUBLISHED: '#10B981', COMPLETED: '#6b7280', CANCELLED: '#EF4444', DISPUTED: '#EF4444', EXPIRED: '#F59E0B' }
const fmtDate = (d) => d ? new Date(d).toLocaleDateString('es', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : '—'

export default function AdminCampaignsPage() {
  const [campaigns, setCampaigns] = useState([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const [totalPages, setTotalPages] = useState(1)
  const [status, setStatus] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    const params = { page, limit: 20 }
    if (status) params.status = status
    const res = await apiService.getAdminCampaigns(params)
    if (res?.success) {
      setCampaigns(res.data)
      setTotal(res.pagination?.total || 0)
      setTotalPages(res.pagination?.totalPages || 1)
    }
    setLoading(false)
  }, [page, status])

  useEffect(() => { load() }, [load])

  return (
    <div style={{ maxWidth: 1080, margin: '0 auto' }}>
      <h1 style={{ color: 'var(--text)', fontSize: 22, fontWeight: 700, fontFamily: D, margin: '0 0 20px' }}>Campanas</h1>

      <div style={{ display: 'flex', gap: 2, background: 'var(--bg3)', borderRadius: 10, padding: 3, marginBottom: 16, flexWrap: 'wrap' }}>
        {STATUSES.map(s => (
          <button key={s} onClick={() => { setStatus(s); setPage(1) }}
            style={{ background: status === s ? 'var(--accent-dim)' : 'transparent', color: status === s ? 'var(--accent)' : 'var(--muted2)', border: status === s ? '1px solid var(--accent)44' : '1px solid transparent', borderRadius: 8, padding: '6px 12px', fontSize: 11, fontWeight: status === s ? 700 : 500, cursor: 'pointer' }}>
            {s || 'Todas'}
          </button>
        ))}
      </div>

      <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 16, overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead>
            <tr style={{ borderBottom: '1px solid var(--border)' }}>
              {['Canal', 'Anunciante', 'Status', 'Precio', 'Net', 'Creada', 'Publicada', 'Completada'].map(h => (
                <th key={h} style={{ padding: '12px 16px', textAlign: 'left', color: 'var(--muted2)', fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={8} style={{ padding: 40, textAlign: 'center' }}><Loader2 size={20} style={{ color: 'var(--muted2)', animation: 'spin 1s linear infinite' }} /></td></tr>
            ) : campaigns.length === 0 ? (
              <tr><td colSpan={8} style={{ padding: 40, textAlign: 'center', color: 'var(--muted2)' }}>Sin campanas</td></tr>
            ) : campaigns.map(c => (
              <tr key={c._id} style={{ borderBottom: '1px solid var(--border)' }}>
                <td style={{ padding: '10px 16px', color: 'var(--text)', fontWeight: 600, maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.channel?.nombreCanal || '—'}</td>
                <td style={{ padding: '10px 16px', color: 'var(--text-secondary)', fontSize: 12 }}>{c.advertiser?.nombre || c.advertiser?.email || '—'}</td>
                <td style={{ padding: '10px 16px' }}>
                  <span style={{ background: `${STATUS_COLORS[c.status] || '#64748b'}14`, color: STATUS_COLORS[c.status] || '#64748b', padding: '3px 10px', borderRadius: 6, fontSize: 11, fontWeight: 600 }}>{c.status}</span>
                </td>
                <td style={{ padding: '10px 16px', color: 'var(--text)', fontFamily: 'var(--font-mono)', fontSize: 12, fontWeight: 600 }}>€{Number(c.price || 0).toFixed(0)}</td>
                <td style={{ padding: '10px 16px', color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)', fontSize: 12 }}>€{Number(c.netAmount || 0).toFixed(0)}</td>
                <td style={{ padding: '10px 16px', color: 'var(--muted2)', fontSize: 11, fontFamily: 'var(--font-mono)' }}>{fmtDate(c.createdAt)}</td>
                <td style={{ padding: '10px 16px', color: 'var(--muted2)', fontSize: 11, fontFamily: 'var(--font-mono)' }}>{fmtDate(c.publishedAt)}</td>
                <td style={{ padding: '10px 16px', color: 'var(--muted2)', fontSize: 11, fontFamily: 'var(--font-mono)' }}>{fmtDate(c.completedAt)}</td>
              </tr>
            ))}
          </tbody>
        </table>
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
