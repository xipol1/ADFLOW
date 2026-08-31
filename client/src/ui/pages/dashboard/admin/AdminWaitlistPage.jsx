import React, { useCallback, useEffect, useState } from 'react'
import { Loader2, ChevronLeft, ChevronRight } from 'lucide-react'
import apiService from '../../../../services/api'

const D = 'Sora, sans-serif'

/**
 * The founding waitlist, joined against real accounts.
 *
 * Before this the two lived apart: signups piled up in FounderRegistration and
 * the only way to let one of them in was to find their account by hand in
 * /admin/users. Each row here carries `usuarioId` when the person has actually
 * registered, so the grant is one click.
 */
export default function AdminWaitlistPage() {
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [total, setTotal] = useState(0)
  const [soloSinAcceso, setSoloSinAcceso] = useState(false)
  const [updating, setUpdating] = useState('')
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    const res = await apiService.getAdminWaitlist({
      page,
      limit: 50,
      ...(soloSinAcceso ? { soloConCuenta: 'true', soloSinAcceso: 'true' } : {}),
    })
    if (res?.success) {
      setRows(res.data || [])
      setTotal(res.pagination?.total || 0)
      setTotalPages(res.pagination?.totalPages || 1)
    } else {
      setError(res?.message || 'No se pudo cargar la lista')
    }
    setLoading(false)
  }, [page, soloSinAcceso])

  useEffect(() => { load() }, [load])

  const conceder = async (row) => {
    if (!row.usuarioId) return
    const motivo = window.prompt(
      `Conceder acceso beta a ${row.email}.\n\nSe le enviará un email avisándole.\nMotivo (opcional):`,
      `Waitlist #${row.queuePosition} · ${row.nicho}`
    )
    if (motivo === null) return

    setUpdating(row.email)
    setError('')
    const res = await apiService.updateAdminUser(row.usuarioId, {
      betaAccess: true,
      ...(motivo ? { betaGrantReason: motivo } : {}),
    })
    if (!res?.success) setError(res?.message || 'No se pudo conceder el acceso')
    await load()
    setUpdating('')
  }

  const fmtDate = (d) => (d ? new Date(d).toLocaleDateString('es', { day: 'numeric', month: 'short', year: 'numeric' }) : '—')

  return (
    <div style={{ maxWidth: 1080, margin: '0 auto' }}>
      <h1 style={{ color: 'var(--text)', fontSize: 22, fontWeight: 700, fontFamily: D, margin: '0 0 6px' }}>Lista de espera</h1>
      <p style={{ color: 'var(--muted2)', fontSize: 13, margin: '0 0 20px' }}>
        {total} registro{total === 1 ? '' : 's'} confirmado{total === 1 ? '' : 's'} en el founding cohort.
      </p>

      {error && (
        <div role="alert" style={{ background: '#EF444414', border: '1px solid #EF444444', borderRadius: 10, padding: '10px 14px', marginBottom: 14, color: '#EF4444', fontSize: 13 }}>
          {error}
        </div>
      )}

      <label style={{ display: 'inline-flex', alignItems: 'center', gap: 8, marginBottom: 16, fontSize: 13, color: 'var(--text-secondary)', cursor: 'pointer' }}>
        <input
          type="checkbox"
          checked={soloSinAcceso}
          onChange={(e) => { setSoloSinAcceso(e.target.checked); setPage(1) }}
        />
        Solo los que tienen cuenta y siguen sin acceso
      </label>

      <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 16, overflow: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead>
            <tr style={{ borderBottom: '1px solid var(--border)' }}>
              {['#', 'Canal', 'Email', 'Nicho', 'Plataforma', 'Cuenta', 'Confirmado', ''].map((h) => (
                <th key={h} style={{ padding: '12px 16px', textAlign: 'left', color: 'var(--muted2)', fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em', whiteSpace: 'nowrap' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={8} style={{ padding: 40, textAlign: 'center' }}><Loader2 size={20} style={{ color: 'var(--muted2)', animation: 'spin 1s linear infinite' }} /></td></tr>
            ) : rows.length === 0 ? (
              <tr><td colSpan={8} style={{ padding: 40, textAlign: 'center', color: 'var(--muted2)' }}>Sin resultados</td></tr>
            ) : rows.map((r) => (
              <tr key={r.email} style={{ borderBottom: '1px solid var(--border)' }}>
                <td style={{ padding: '10px 16px', color: 'var(--muted2)', fontFamily: 'var(--font-mono)', fontSize: 12 }}>{r.queuePosition || '—'}</td>
                <td style={{ padding: '10px 16px', color: 'var(--text)', fontWeight: 600 }}>{r.handle}</td>
                <td style={{ padding: '10px 16px', color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)', fontSize: 12 }}>{r.email}</td>
                <td style={{ padding: '10px 16px', color: 'var(--text-secondary)' }}>{r.nicho}</td>
                <td style={{ padding: '10px 16px', color: 'var(--text-secondary)' }}>{r.platform}</td>
                <td style={{ padding: '10px 16px', fontSize: 12, color: r.tieneCuenta ? 'var(--text-secondary)' : 'var(--muted2)' }}>
                  {r.tieneCuenta ? (r.rol || 'sí') : 'sin registrar'}
                </td>
                <td style={{ padding: '10px 16px', color: 'var(--muted2)', fontSize: 12, fontFamily: 'var(--font-mono)' }}>{fmtDate(r.confirmedAt || r.createdAt)}</td>
                <td style={{ padding: '10px 16px' }}>
                  {r.betaAccess ? (
                    <span style={{ color: '#10B981', fontSize: 11, fontWeight: 600 }}>Con acceso</span>
                  ) : r.tieneCuenta ? (
                    <button
                      onClick={() => conceder(r)}
                      disabled={updating === r.email}
                      style={{ background: 'var(--accent-dim)', border: '1px solid var(--accent)44', borderRadius: 6, padding: '3px 10px', fontSize: 11, fontWeight: 600, color: 'var(--accent)', cursor: 'pointer' }}
                    >
                      {updating === r.email ? '...' : 'Dar acceso'}
                    </button>
                  ) : (
                    <span style={{ color: 'var(--muted2)', fontSize: 11 }}>sin cuenta</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12, marginTop: 16 }}>
          <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page <= 1}
            style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 8, padding: 6, color: 'var(--text)', cursor: page <= 1 ? 'not-allowed' : 'pointer', opacity: page <= 1 ? 0.4 : 1 }}>
            <ChevronLeft size={15} />
          </button>
          <span style={{ color: 'var(--muted2)', fontSize: 12 }}>{page} / {totalPages}</span>
          <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page >= totalPages}
            style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 8, padding: 6, color: 'var(--text)', cursor: page >= totalPages ? 'not-allowed' : 'pointer', opacity: page >= totalPages ? 0.4 : 1 }}>
            <ChevronRight size={15} />
          </button>
        </div>
      )}
    </div>
  )
}
