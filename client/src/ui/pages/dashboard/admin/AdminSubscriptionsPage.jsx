import React, { useState, useEffect, useCallback } from 'react'
import { Loader2, Award, X, Save, RefreshCw } from 'lucide-react'
import apiService from '../../../../services/api'

const D = 'Sora, sans-serif'

const PLAN_OPTIONS = [
  'creator_pro',
  'creator_enterprise',
  'advertiser_pro',
  'advertiser_enterprise',
]

const LEAD_STATUSES = ['new', 'contacted', 'qualified', 'won', 'lost']

const LEAD_STATUS_COLORS = {
  new:       '#3B82F6',
  contacted: '#F59E0B',
  qualified: '#8B5CF6',
  won:       '#10B981',
  lost:      '#64748b',
}

const fmtDate = (d) => d ? new Date(d).toLocaleDateString('es', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'

export default function AdminSubscriptionsPage() {
  const [tab, setTab] = useState('grant')
  return (
    <div style={{ maxWidth: 1080, margin: '0 auto' }}>
      <h1 style={{ color: 'var(--text)', fontSize: 22, fontWeight: 700, fontFamily: D, margin: '0 0 20px', display: 'flex', alignItems: 'center', gap: 10 }}>
        <Award size={20} style={{ color: '#8B5CF6' }} /> Suscripciones
      </h1>

      <div style={{ display: 'flex', gap: 2, background: 'var(--bg3)', borderRadius: 10, padding: 3, marginBottom: 20, width: 'fit-content' }}>
        {[
          { value: 'grant', label: 'Conceder / Revocar' },
          { value: 'leads', label: 'Leads Enterprise' },
        ].map(t => (
          <button key={t.value} onClick={() => setTab(t.value)}
            style={{ background: tab === t.value ? 'var(--accent-dim)' : 'transparent', color: tab === t.value ? 'var(--accent)' : 'var(--muted2)', border: tab === t.value ? '1px solid var(--accent)44' : '1px solid transparent', borderRadius: 8, padding: '6px 14px', fontSize: 12, fontWeight: tab === t.value ? 700 : 500, cursor: 'pointer' }}>
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'grant' ? <GrantTab /> : <LeadsTab />}
      <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
    </div>
  )
}

function GrantTab() {
  const [userId, setUserId] = useState('')
  const [plan, setPlan] = useState('creator_pro')
  const [reason, setReason] = useState('')
  const [grandfatheredUntil, setGrandfatheredUntil] = useState('')
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState(null)
  const [events, setEvents] = useState([])
  const [loadingEvents, setLoadingEvents] = useState(false)

  const loadEvents = async (id) => {
    if (!id) return
    setLoadingEvents(true)
    const res = await apiService.getSubscriptionEvents(id.trim())
    if (res?.success) setEvents(res.events || [])
    setLoadingEvents(false)
  }

  const grant = async () => {
    const id = userId.trim()
    if (!id) return setMsg({ ok: false, text: 'userId requerido' })
    setBusy(true); setMsg(null)
    const body = { plan, reason }
    if (grandfatheredUntil) body.grandfatheredUntil = grandfatheredUntil
    const res = await apiService.grantSubscription(id, body)
    if (res?.success) {
      setMsg({ ok: true, text: `Plan ${plan} concedido` })
      await loadEvents(id)
    } else {
      setMsg({ ok: false, text: res?.message || 'No se pudo conceder' })
    }
    setBusy(false)
  }

  const revoke = async () => {
    const id = userId.trim()
    if (!id) return setMsg({ ok: false, text: 'userId requerido' })
    if (!window.confirm('¿Revocar la suscripción de este usuario?')) return
    setBusy(true); setMsg(null)
    const res = await apiService.revokeSubscription(id, { reason })
    if (res?.success) {
      setMsg({ ok: true, text: 'Suscripción revocada' })
      await loadEvents(id)
    } else {
      setMsg({ ok: false, text: res?.message || 'No se pudo revocar' })
    }
    setBusy(false)
  }

  return (
    <>
      <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 16, padding: 20, marginBottom: 16 }}>
        <div style={{ color: 'var(--text)', fontSize: 14, fontWeight: 700, fontFamily: D, marginBottom: 14 }}>Conceder o revocar plan</div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
          <Field label="User ID">
            <input value={userId} onChange={e => setUserId(e.target.value)} onBlur={() => userId && loadEvents(userId)}
              placeholder="ObjectId del usuario"
              style={inputStyle} />
          </Field>
          <Field label="Plan">
            <select value={plan} onChange={e => setPlan(e.target.value)} style={inputStyle}>
              {PLAN_OPTIONS.map(p => <option key={p} value={p}>{p}</option>)}
            </select>
          </Field>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 12, marginBottom: 14 }}>
          <Field label="Motivo / nota">
            <input value={reason} onChange={e => setReason(e.target.value)} placeholder="Ej: deal cerrado con Acme Corp" style={inputStyle} />
          </Field>
          <Field label="Grandfathered hasta (opcional)">
            <input type="date" value={grandfatheredUntil} onChange={e => setGrandfatheredUntil(e.target.value)} style={inputStyle} />
          </Field>
        </div>

        <div style={{ display: 'flex', gap: 10 }}>
          <button onClick={grant} disabled={busy || !userId.trim()}
            style={{ display: 'flex', alignItems: 'center', gap: 6, background: '#8B5CF6', color: '#fff', border: 'none', borderRadius: 10, padding: '10px 18px', fontSize: 13, fontWeight: 600, cursor: busy || !userId.trim() ? 'not-allowed' : 'pointer', opacity: busy || !userId.trim() ? 0.5 : 1 }}>
            {busy ? <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> : <Save size={14} />}
            Conceder
          </button>
          <button onClick={revoke} disabled={busy || !userId.trim()}
            style={{ background: '#EF444414', color: '#EF4444', border: '1px solid #EF444444', borderRadius: 10, padding: '10px 18px', fontSize: 13, fontWeight: 600, cursor: busy || !userId.trim() ? 'not-allowed' : 'pointer' }}>
            Revocar
          </button>
        </div>

        {msg && (
          <p style={{ color: msg.ok ? '#10B981' : '#EF4444', fontSize: 12, margin: '12px 0 0' }}>{msg.text}</p>
        )}
      </div>

      <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 16, padding: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
          <div style={{ color: 'var(--text)', fontSize: 14, fontWeight: 700, fontFamily: D }}>Historial (SubscriptionEvent)</div>
          <button onClick={() => loadEvents(userId)} disabled={!userId.trim() || loadingEvents}
            style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 8, padding: '4px 10px', fontSize: 11, color: 'var(--text-secondary)', cursor: 'pointer' }}>
            <RefreshCw size={11} style={loadingEvents ? { animation: 'spin 1s linear infinite' } : null} /> Recargar
          </button>
        </div>
        {loadingEvents ? (
          <div style={{ textAlign: 'center', padding: 20 }}><Loader2 size={18} style={{ color: 'var(--muted2)', animation: 'spin 1s linear infinite' }} /></div>
        ) : events.length === 0 ? (
          <p style={{ color: 'var(--muted2)', fontSize: 12, margin: 0 }}>{userId.trim() ? 'Sin eventos para este usuario' : 'Introduce un User ID para ver el historial'}</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {events.map(e => (
              <div key={e._id} style={{ background: 'var(--bg)', borderRadius: 8, padding: '10px 14px', fontSize: 12 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                  <span style={{ color: 'var(--text)', fontWeight: 600 }}>{e.type}</span>
                  <span style={{ color: 'var(--muted2)', fontSize: 11, fontFamily: 'var(--font-mono)' }}>{fmtDate(e.createdAt)}</span>
                </div>
                <div style={{ color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)', fontSize: 11 }}>
                  {(e.fromPlan || '—')} → {(e.toPlan || '—')} · {(e.fromStatus || '—')} → {(e.toStatus || '—')}
                </div>
                {e.metadata?.reason && (
                  <div style={{ color: 'var(--muted2)', fontSize: 11, fontStyle: 'italic', marginTop: 4 }}>{e.metadata.reason}</div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  )
}

function LeadsTab() {
  const [leads, setLeads] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('')
  const [editing, setEditing] = useState(null)
  const [editStatus, setEditStatus] = useState('new')
  const [editNotes, setEditNotes] = useState('')
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState(null)

  const load = useCallback(async () => {
    setLoading(true)
    const params = filter ? { status: filter } : {}
    const res = await apiService.getSubscriptionLeads(params)
    if (res?.success) setLeads(res.leads || [])
    setLoading(false)
  }, [filter])

  useEffect(() => { load() }, [load])

  const openEdit = (lead) => {
    setEditing(lead)
    setEditStatus(lead.status || 'new')
    setEditNotes(lead.notes || '')
    setMsg(null)
  }

  const save = async () => {
    if (!editing) return
    setSaving(true)
    const res = await apiService.updateSubscriptionLead(editing._id, { status: editStatus, notes: editNotes })
    if (res?.success) {
      setEditing(null)
      await load()
    } else {
      setMsg({ ok: false, text: res?.message || 'No se pudo guardar' })
    }
    setSaving(false)
  }

  return (
    <>
      <div style={{ display: 'flex', gap: 2, background: 'var(--bg3)', borderRadius: 10, padding: 3, marginBottom: 16, width: 'fit-content' }}>
        {['', ...LEAD_STATUSES].map(s => (
          <button key={s || 'all'} onClick={() => setFilter(s)}
            style={{ background: filter === s ? 'var(--accent-dim)' : 'transparent', color: filter === s ? 'var(--accent)' : 'var(--muted2)', border: filter === s ? '1px solid var(--accent)44' : '1px solid transparent', borderRadius: 8, padding: '6px 14px', fontSize: 12, fontWeight: filter === s ? 700 : 500, cursor: 'pointer', textTransform: 'capitalize' }}>
            {s || 'Todos'}
          </button>
        ))}
      </div>

      <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 16, overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead>
            <tr style={{ borderBottom: '1px solid var(--border)' }}>
              {['Estado', 'Email', 'Rol', 'Empresa', 'Spend/Canales', 'Recibido', ''].map(h => (
                <th key={h} style={{ padding: '12px 16px', textAlign: 'left', color: 'var(--muted2)', fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={7} style={{ padding: 40, textAlign: 'center' }}><Loader2 size={20} style={{ color: 'var(--muted2)', animation: 'spin 1s linear infinite' }} /></td></tr>
            ) : leads.length === 0 ? (
              <tr><td colSpan={7} style={{ padding: 40, textAlign: 'center', color: 'var(--muted2)' }}>Sin leads en este estado</td></tr>
            ) : leads.map(l => {
              const color = LEAD_STATUS_COLORS[l.status] || '#64748b'
              return (
                <tr key={l._id} style={{ borderBottom: '1px solid var(--border)' }}>
                  <td style={{ padding: '10px 16px' }}>
                    <span style={{ background: `${color}14`, color, padding: '3px 10px', borderRadius: 6, fontSize: 11, fontWeight: 600, textTransform: 'capitalize' }}>{l.status}</span>
                  </td>
                  <td style={{ padding: '10px 16px', color: 'var(--text)', fontFamily: 'var(--font-mono)', fontSize: 12 }}>{l.email}</td>
                  <td style={{ padding: '10px 16px', color: 'var(--text-secondary)' }}>{l.role}</td>
                  <td style={{ padding: '10px 16px', color: 'var(--text-secondary)' }}>{l.company || '—'}</td>
                  <td style={{ padding: '10px 16px', color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)', fontSize: 12 }}>
                    {l.role === 'advertiser' ? `€${l.estimatedMonthlySpend || 0}/mo` : `${l.estimatedChannels || 0} canales`}
                  </td>
                  <td style={{ padding: '10px 16px', color: 'var(--muted2)', fontFamily: 'var(--font-mono)', fontSize: 12 }}>{fmtDate(l.createdAt)}</td>
                  <td style={{ padding: '10px 16px' }}>
                    <button onClick={() => openEdit(l)}
                      style={{ background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 6, padding: '3px 10px', fontSize: 11, color: 'var(--text-secondary)', cursor: 'pointer' }}>
                      Editar
                    </button>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {editing && (
        <div onClick={() => setEditing(null)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div onClick={e => e.stopPropagation()} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 16, padding: 24, width: 500, maxWidth: '90%' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
              <h2 style={{ color: 'var(--text)', fontSize: 15, fontWeight: 700, fontFamily: D, margin: 0 }}>Editar lead</h2>
              <button onClick={() => setEditing(null)} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--muted2)' }}><X size={16} /></button>
            </div>
            <p style={{ color: 'var(--text-secondary)', fontSize: 12, margin: '0 0 6px' }}><strong>{editing.email}</strong> · {editing.role} · {editing.company || '—'}</p>
            {editing.message && <p style={{ color: 'var(--muted2)', fontSize: 12, fontStyle: 'italic', margin: '0 0 16px' }}>"{editing.message}"</p>}

            <Field label="Estado">
              <select value={editStatus} onChange={e => setEditStatus(e.target.value)} style={inputStyle}>
                {LEAD_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </Field>
            <div style={{ height: 12 }} />
            <Field label="Notas (admin-only)">
              <textarea value={editNotes} onChange={e => setEditNotes(e.target.value)} rows={4}
                style={{ ...inputStyle, fontFamily: D, resize: 'vertical' }} />
            </Field>

            {msg && <p style={{ color: '#EF4444', fontSize: 12, margin: '10px 0 0' }}>{msg.text}</p>}

            <div style={{ display: 'flex', gap: 10, marginTop: 18, justifyContent: 'flex-end' }}>
              <button onClick={() => setEditing(null)} style={{ background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 8, padding: '8px 14px', fontSize: 12, color: 'var(--text-secondary)', cursor: 'pointer' }}>Cancelar</button>
              <button onClick={save} disabled={saving}
                style={{ display: 'flex', alignItems: 'center', gap: 6, background: '#8B5CF6', color: '#fff', border: 'none', borderRadius: 8, padding: '8px 16px', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
                {saving ? <Loader2 size={12} style={{ animation: 'spin 1s linear infinite' }} /> : <Save size={12} />}
                Guardar
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

function Field({ label, children }) {
  return (
    <div>
      <label style={{ display: 'block', color: 'var(--muted2)', fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 6 }}>{label}</label>
      {children}
    </div>
  )
}

const inputStyle = {
  width: '100%',
  padding: '10px 12px',
  background: 'var(--bg)',
  border: '1px solid var(--border)',
  borderRadius: 10,
  color: 'var(--text)',
  fontSize: 13,
  outline: 'none',
  boxSizing: 'border-box',
}
