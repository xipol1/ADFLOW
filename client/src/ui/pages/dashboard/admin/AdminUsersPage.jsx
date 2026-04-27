import React, { useState, useEffect, useCallback } from 'react'
import { Users, Search, Loader2, Shield, ChevronLeft, ChevronRight } from 'lucide-react'
import apiService from '../../../../services/api'

const D = 'Sora, sans-serif'
const ROLES = ['', 'creator', 'advertiser', 'admin']
const ROLE_LABELS = { '': 'Todos', creator: 'Creator', advertiser: 'Advertiser', admin: 'Admin' }
const ROLE_COLORS = { creator: '#10B981', advertiser: '#8B5CF6', admin: '#EF4444' }

export default function AdminUsersPage() {
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const [totalPages, setTotalPages] = useState(1)
  const [search, setSearch] = useState('')
  const [role, setRole] = useState('')
  const [updating, setUpdating] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    const params = { page, limit: 20 }
    if (search) params.search = search
    if (role) params.role = role
    const res = await apiService.getAdminUsers(params)
    if (res?.success) {
      setUsers(res.data)
      setTotal(res.pagination?.total || 0)
      setTotalPages(res.pagination?.totalPages || 1)
    }
    setLoading(false)
  }, [page, search, role])

  useEffect(() => { load() }, [load])

  const toggleAccess = async (id, current) => {
    setUpdating(id)
    await apiService.updateAdminUser(id, { fullAccess: !current })
    await load()
    setUpdating('')
  }

  const fmtDate = (d) => d ? new Date(d).toLocaleDateString('es', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'

  return (
    <div style={{ maxWidth: 1080, margin: '0 auto' }}>
      <h1 style={{ color: 'var(--text)', fontSize: 22, fontWeight: 700, fontFamily: D, margin: '0 0 20px' }}>Usuarios</h1>

      <div style={{ display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap' }}>
        <div style={{ flex: 1, minWidth: 200, position: 'relative' }}>
          <Search size={14} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--muted2)' }} />
          <input value={search} onChange={e => { setSearch(e.target.value); setPage(1) }} placeholder="Buscar por nombre o email..."
            style={{ width: '100%', padding: '10px 12px 10px 34px', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 10, color: 'var(--text)', fontSize: 13, outline: 'none' }} />
        </div>
        <div style={{ display: 'flex', gap: 2, background: 'var(--bg3)', borderRadius: 10, padding: 3 }}>
          {ROLES.map(r => (
            <button key={r} onClick={() => { setRole(r); setPage(1) }}
              style={{ background: role === r ? 'var(--accent-dim)' : 'transparent', color: role === r ? 'var(--accent)' : 'var(--muted2)', border: role === r ? '1px solid var(--accent)44' : '1px solid transparent', borderRadius: 8, padding: '6px 14px', fontSize: 12, fontWeight: role === r ? 700 : 500, cursor: 'pointer' }}>
              {ROLE_LABELS[r]}
            </button>
          ))}
        </div>
      </div>

      <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 16, overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead>
            <tr style={{ borderBottom: '1px solid var(--border)' }}>
              {['Nombre', 'Email', 'Rol', 'Verificado', 'Full Access', 'Registro', ''].map(h => (
                <th key={h} style={{ padding: '12px 16px', textAlign: 'left', color: 'var(--muted2)', fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={7} style={{ padding: 40, textAlign: 'center' }}><Loader2 size={20} style={{ color: 'var(--muted2)', animation: 'spin 1s linear infinite' }} /></td></tr>
            ) : users.length === 0 ? (
              <tr><td colSpan={7} style={{ padding: 40, textAlign: 'center', color: 'var(--muted2)' }}>Sin resultados</td></tr>
            ) : users.map(u => (
              <tr key={u._id} style={{ borderBottom: '1px solid var(--border)' }}>
                <td style={{ padding: '10px 16px', color: 'var(--text)', fontWeight: 600 }}>{u.nombre || '—'}</td>
                <td style={{ padding: '10px 16px', color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)', fontSize: 12 }}>{u.email}</td>
                <td style={{ padding: '10px 16px' }}>
                  <span style={{ background: `${ROLE_COLORS[u.rol] || '#64748b'}14`, color: ROLE_COLORS[u.rol] || '#64748b', padding: '3px 10px', borderRadius: 6, fontSize: 11, fontWeight: 600 }}>{u.rol}</span>
                </td>
                <td style={{ padding: '10px 16px', color: u.emailVerified ? '#10B981' : 'var(--muted2)', fontSize: 12 }}>{u.emailVerified ? 'Si' : 'No'}</td>
                <td style={{ padding: '10px 16px' }}>
                  <button onClick={() => toggleAccess(u._id, u.fullAccess)} disabled={updating === u._id}
                    style={{ background: u.fullAccess ? '#10B98114' : 'var(--bg)', border: `1px solid ${u.fullAccess ? '#10B98144' : 'var(--border)'}`, borderRadius: 6, padding: '3px 10px', fontSize: 11, fontWeight: 600, color: u.fullAccess ? '#10B981' : 'var(--muted2)', cursor: 'pointer' }}>
                    {updating === u._id ? '...' : u.fullAccess ? 'Full' : 'Demo'}
                  </button>
                </td>
                <td style={{ padding: '10px 16px', color: 'var(--muted2)', fontSize: 12, fontFamily: 'var(--font-mono)' }}>{fmtDate(u.createdAt)}</td>
                <td style={{ padding: '10px 16px' }}>
                  {u.referralCode && <span style={{ color: 'var(--muted2)', fontSize: 11 }}>ref:{u.referralCode}</span>}
                </td>
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
