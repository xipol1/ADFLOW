import React, { useState, useEffect, useCallback } from 'react'
import { Trophy, Loader2, UserPlus, X } from 'lucide-react'
import apiService from '../../../../services/api'

const D = 'Sora, sans-serif'

export default function AdminFoundersPage() {
  const [founders, setFounders] = useState([])
  const [cohort, setCohort] = useState({ granted: 0, cohortSize: 40, remaining: 40, full: false })
  const [loading, setLoading] = useState(true)
  const [email, setEmail] = useState('')
  const [granting, setGranting] = useState(false)
  const [revoking, setRevoking] = useState('')
  const [msg, setMsg] = useState(null)

  const load = useCallback(async () => {
    setLoading(true)
    const res = await apiService.getAdminFounders()
    if (res?.success) {
      setFounders(res.data.founders || [])
      setCohort(res.data.cohort || { granted: 0, cohortSize: 40, remaining: 40, full: false })
    }
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  const grant = async () => {
    const e = email.trim().toLowerCase()
    if (!e) return
    setGranting(true)
    setMsg(null)
    const res = await apiService.grantFounder(e)
    if (res?.success) {
      setMsg({ ok: true, text: res.alreadyFounder ? `${e} ya era fundador` : `${e} ahora es Canal Fundador` })
      setEmail('')
      await load()
    } else {
      setMsg({ ok: false, text: res?.message || 'No se pudo conceder' })
    }
    setGranting(false)
  }

  const revoke = async (id, name) => {
    if (!window.confirm(`¿Revocar el tier de fundador de ${name}?`)) return
    setRevoking(id)
    const res = await apiService.revokeFounder(id)
    if (res?.success) await load()
    else setMsg({ ok: false, text: res?.message || 'No se pudo revocar' })
    setRevoking('')
  }

  const fmtDate = (d) => d ? new Date(d).toLocaleDateString('es', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'
  const pct = cohort.cohortSize > 0 ? Math.min(100, (cohort.granted / cohort.cohortSize) * 100) : 0

  return (
    <div style={{ maxWidth: 1080, margin: '0 auto' }}>
      <h1 style={{ color: 'var(--text)', fontSize: 22, fontWeight: 700, fontFamily: D, margin: '0 0 20px', display: 'flex', alignItems: 'center', gap: 10 }}>
        <Trophy size={20} style={{ color: '#8b5cf6' }} /> Canal Fundador
      </h1>

      {/* Cohort status */}
      <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 16, padding: 20, marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 10 }}>
          <span style={{ color: 'var(--text)', fontSize: 15, fontWeight: 700, fontFamily: D }}>Plazas de la cohorte</span>
          <span style={{ color: 'var(--text-secondary)', fontSize: 13, fontFamily: 'var(--font-mono)' }}>
            {cohort.granted} / {cohort.cohortSize} · {cohort.remaining} libres
          </span>
        </div>
        <div style={{ height: 8, background: 'var(--bg)', borderRadius: 999, overflow: 'hidden' }}>
          <div style={{ width: `${pct}%`, height: '100%', background: 'linear-gradient(90deg, #8b5cf6, #ec4899)', transition: 'width 300ms' }} />
        </div>
        {cohort.full && (
          <p style={{ color: '#F0B429', fontSize: 12, margin: '10px 0 0' }}>
            Cohorte completa — el funnel del bot ya no ofrece plaza fundador.
          </p>
        )}
      </div>

      {/* Grant form */}
      <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 16, padding: 20, marginBottom: 16 }}>
        <div style={{ color: 'var(--text)', fontSize: 14, fontWeight: 700, fontFamily: D, marginBottom: 10 }}>
          Conceder plaza manualmente
        </div>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <input
            value={email}
            onChange={e => setEmail(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && grant()}
            placeholder="Email del usuario..."
            type="email"
            style={{ flex: 1, minWidth: 220, padding: '10px 12px', background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 10, color: 'var(--text)', fontSize: 13, outline: 'none' }}
          />
          <button
            onClick={grant}
            disabled={granting || !email.trim()}
            style={{ display: 'flex', alignItems: 'center', gap: 6, background: '#8b5cf6', color: '#fff', border: 'none', borderRadius: 10, padding: '10px 18px', fontSize: 13, fontWeight: 600, cursor: granting || !email.trim() ? 'not-allowed' : 'pointer', opacity: granting || !email.trim() ? 0.5 : 1 }}
          >
            {granting ? <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> : <UserPlus size={14} />}
            Conceder
          </button>
        </div>
        {msg && (
          <p style={{ color: msg.ok ? '#10B981' : '#EF4444', fontSize: 12, margin: '10px 0 0' }}>{msg.text}</p>
        )}
      </div>

      {/* Founders table */}
      <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 16, overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead>
            <tr style={{ borderBottom: '1px solid var(--border)' }}>
              {['Nombre', 'Email', 'Rol', 'Estado', 'Registro', ''].map(h => (
                <th key={h} style={{ padding: '12px 16px', textAlign: 'left', color: 'var(--muted2)', fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={6} style={{ padding: 40, textAlign: 'center' }}><Loader2 size={20} style={{ color: 'var(--muted2)', animation: 'spin 1s linear infinite' }} /></td></tr>
            ) : founders.length === 0 ? (
              <tr><td colSpan={6} style={{ padding: 40, textAlign: 'center', color: 'var(--muted2)' }}>Aún no hay fundadores</td></tr>
            ) : founders.map(f => {
              const activated = !!f.founderFirstPaidCampaignAt
              return (
                <tr key={f._id} style={{ borderBottom: '1px solid var(--border)' }}>
                  <td style={{ padding: '10px 16px', color: 'var(--text)', fontWeight: 600 }}>{f.nombre || '—'}</td>
                  <td style={{ padding: '10px 16px', color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)', fontSize: 12 }}>{f.email}</td>
                  <td style={{ padding: '10px 16px', color: 'var(--text-secondary)', fontSize: 12 }}>{f.rol}</td>
                  <td style={{ padding: '10px 16px' }}>
                    <span style={{ background: activated ? '#10B98114' : '#F0B42914', color: activated ? '#10B981' : '#F0B429', padding: '3px 10px', borderRadius: 6, fontSize: 11, fontWeight: 600 }}>
                      {activated ? 'Activado' : 'Garantía activa (0%)'}
                    </span>
                  </td>
                  <td style={{ padding: '10px 16px', color: 'var(--muted2)', fontSize: 12, fontFamily: 'var(--font-mono)' }}>{fmtDate(f.createdAt)}</td>
                  <td style={{ padding: '10px 16px' }}>
                    <button
                      onClick={() => revoke(f._id, f.nombre || f.email)}
                      disabled={revoking === f._id}
                      title="Revocar tier de fundador"
                      style={{ display: 'flex', alignItems: 'center', gap: 4, background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 6, padding: '3px 10px', fontSize: 11, fontWeight: 600, color: '#EF4444', cursor: 'pointer' }}
                    >
                      {revoking === f._id ? '...' : <><X size={11} /> Revocar</>}
                    </button>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
      <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
    </div>
  )
}
