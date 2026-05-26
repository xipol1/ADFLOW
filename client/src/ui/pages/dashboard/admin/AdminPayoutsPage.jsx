import React, { useState, useEffect, useCallback } from 'react'
import { Loader2, RefreshCw, ExternalLink, Wallet, CheckCircle, AlertTriangle, Clock, X } from 'lucide-react'
import apiService from '../../../../services/api'

const D = 'Sora, sans-serif'

const STATUSES = [
  { value: '',            label: 'Activos' },   // default: pending+processing+failed
  { value: 'pending',     label: 'Pending' },
  { value: 'processing',  label: 'Processing' },
  { value: 'failed',      label: 'Failed' },
  { value: 'succeeded',   label: 'Succeeded' },
]

const STATUS_COLORS = {
  pending:    '#F59E0B',
  processing: '#3B82F6',
  failed:     '#EF4444',
  succeeded:  '#10B981',
}

const STATUS_ICONS = {
  pending:    Clock,
  processing: Loader2,
  failed:     AlertTriangle,
  succeeded:  CheckCircle,
}

const fmtDate = (d) => d ? new Date(d).toLocaleDateString('es', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : '—'
const fmtMoney = (cents) => typeof cents === 'number' ? `€${(cents / 100).toFixed(2)}` : '—'

export default function AdminPayoutsPage() {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [status, setStatus] = useState('')
  const [retrying, setRetrying] = useState('')
  const [detail, setDetail] = useState(null)
  const [msg, setMsg] = useState(null)

  const load = useCallback(async () => {
    setLoading(true)
    const params = { limit: 100 }
    if (status) params.status = status
    const res = await apiService.getAdminPayouts(params)
    if (res?.success) setItems(res.data?.items || [])
    setLoading(false)
  }, [status])

  useEffect(() => { load() }, [load])

  const retry = async (id) => {
    setRetrying(id)
    setMsg(null)
    const res = await apiService.retryAdminPayout(id)
    if (res?.success) {
      setMsg({ ok: true, text: 'Reintento exitoso' })
      await load()
    } else {
      setMsg({ ok: false, text: res?.message || 'Reintento falló' })
    }
    setRetrying('')
  }

  const openDetail = async (id) => {
    setDetail({ loading: true })
    const res = await apiService.getAdminPayout(id)
    if (res?.success) setDetail({ data: res.data })
    else setDetail({ error: res?.message || 'No encontrada' })
  }

  return (
    <div style={{ maxWidth: 1080, margin: '0 auto' }}>
      <h1 style={{ color: 'var(--text)', fontSize: 22, fontWeight: 700, fontFamily: D, margin: '0 0 20px', display: 'flex', alignItems: 'center', gap: 10 }}>
        <Wallet size={20} style={{ color: '#3B82F6' }} /> Pagos a creadores
      </h1>

      <div style={{ display: 'flex', gap: 2, background: 'var(--bg3)', borderRadius: 10, padding: 3, marginBottom: 16 }}>
        {STATUSES.map(s => (
          <button key={s.value} onClick={() => setStatus(s.value)}
            style={{ background: status === s.value ? 'var(--accent-dim)' : 'transparent', color: status === s.value ? 'var(--accent)' : 'var(--muted2)', border: status === s.value ? '1px solid var(--accent)44' : '1px solid transparent', borderRadius: 8, padding: '6px 14px', fontSize: 12, fontWeight: status === s.value ? 700 : 500, cursor: 'pointer' }}>
            {s.label}
          </button>
        ))}
      </div>

      {msg && (
        <div style={{ background: msg.ok ? '#10B98114' : '#EF444414', color: msg.ok ? '#10B981' : '#EF4444', border: `1px solid ${msg.ok ? '#10B981' : '#EF4444'}44`, borderRadius: 10, padding: '10px 14px', fontSize: 13, marginBottom: 12 }}>
          {msg.text}
        </div>
      )}

      <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 16, overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead>
            <tr style={{ borderBottom: '1px solid var(--border)' }}>
              {['Estado', 'Creador', 'Importe', 'Intentos', 'Actualizado', 'Error', ''].map(h => (
                <th key={h} style={{ padding: '12px 16px', textAlign: 'left', color: 'var(--muted2)', fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={7} style={{ padding: 40, textAlign: 'center' }}><Loader2 size={20} style={{ color: 'var(--muted2)', animation: 'spin 1s linear infinite' }} /></td></tr>
            ) : items.length === 0 ? (
              <tr><td colSpan={7} style={{ padding: 40, textAlign: 'center', color: 'var(--muted2)' }}>Sin payouts en este estado</td></tr>
            ) : items.map(it => {
              const st = it.status
              const color = STATUS_COLORS[st] || '#64748b'
              const Icon = STATUS_ICONS[st] || Clock
              return (
                <tr key={it._id} style={{ borderBottom: '1px solid var(--border)' }}>
                  <td style={{ padding: '10px 16px' }}>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: `${color}14`, color, padding: '3px 10px', borderRadius: 6, fontSize: 11, fontWeight: 600, textTransform: 'capitalize' }}>
                      <Icon size={11} style={st === 'processing' ? { animation: 'spin 1s linear infinite' } : null} /> {st}
                    </span>
                  </td>
                  <td style={{ padding: '10px 16px', color: 'var(--text)', fontWeight: 600 }}>
                    {it.creator?.nombre || it.creator?.email || '—'}
                    {it.creator?.email && it.creator?.nombre && (
                      <div style={{ color: 'var(--muted2)', fontSize: 11, fontWeight: 400, fontFamily: 'var(--font-mono)' }}>{it.creator.email}</div>
                    )}
                  </td>
                  <td style={{ padding: '10px 16px', color: 'var(--text)', fontFamily: 'var(--font-mono)', fontWeight: 600 }}>{fmtMoney(it.amount)}</td>
                  <td style={{ padding: '10px 16px', color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)' }}>{it.attempts ?? 0}</td>
                  <td style={{ padding: '10px 16px', color: 'var(--muted2)', fontSize: 12, fontFamily: 'var(--font-mono)' }}>{fmtDate(it.updatedAt)}</td>
                  <td style={{ padding: '10px 16px', color: '#EF4444', fontSize: 11, maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={it.lastError || ''}>
                    {it.lastError ? it.lastError.slice(0, 40) + (it.lastError.length > 40 ? '…' : '') : '—'}
                  </td>
                  <td style={{ padding: '10px 16px' }}>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <button onClick={() => openDetail(it._id)} title="Ver detalle"
                        style={{ background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 6, padding: '3px 8px', fontSize: 11, color: 'var(--text-secondary)', cursor: 'pointer' }}>
                        <ExternalLink size={11} />
                      </button>
                      {(st === 'failed' || st === 'pending') && (
                        <button onClick={() => retry(it._id)} disabled={retrying === it._id} title="Reintentar Stripe"
                          style={{ display: 'inline-flex', alignItems: 'center', gap: 4, background: '#3B82F614', color: '#3B82F6', border: '1px solid #3B82F644', borderRadius: 6, padding: '3px 10px', fontSize: 11, fontWeight: 600, cursor: 'pointer' }}>
                          {retrying === it._id ? <Loader2 size={11} style={{ animation: 'spin 1s linear infinite' }} /> : <><RefreshCw size={11} /> Retry</>}
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {detail && (
        <div onClick={() => setDetail(null)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div onClick={e => e.stopPropagation()} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 16, padding: 24, maxWidth: 600, width: '90%', maxHeight: '80vh', overflow: 'auto' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
              <h2 style={{ color: 'var(--text)', fontSize: 16, fontWeight: 700, fontFamily: D, margin: 0 }}>PayoutAttempt detail</h2>
              <button onClick={() => setDetail(null)} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--muted2)' }}><X size={16} /></button>
            </div>
            {detail.loading && <Loader2 size={20} style={{ color: 'var(--muted2)', animation: 'spin 1s linear infinite' }} />}
            {detail.error && <p style={{ color: '#EF4444' }}>{detail.error}</p>}
            {detail.data && (
              <pre style={{ background: 'var(--bg)', padding: 12, borderRadius: 8, fontSize: 11, color: 'var(--text-secondary)', overflow: 'auto', maxHeight: '60vh', fontFamily: 'var(--font-mono)' }}>
                {JSON.stringify(detail.data, null, 2)}
              </pre>
            )}
          </div>
        </div>
      )}

      <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
    </div>
  )
}
