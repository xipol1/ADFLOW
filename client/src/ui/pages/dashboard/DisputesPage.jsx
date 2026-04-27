import React, { useEffect, useState, useCallback, useRef } from 'react'
import { ShieldAlert, Plus, ArrowLeft, Send, X, Clock, CheckCircle, AlertCircle, Search as SearchIcon, MessageCircle } from 'lucide-react'
import apiService from '../../../services/api'
import { ErrorBanner } from './shared/DashComponents'
import EmptyState from '../../components/EmptyState'
import { SkeletonTable } from '../../components/Skeleton'
import { relTime } from '../../utils/relTime'
import {
  PURPLE, purpleAlpha, FONT_BODY, FONT_DISPLAY, OK, WARN, ERR, BLUE,
} from '../../theme/tokens'

// ── Status config ─────────────────────────────────────────────────────────────
const STATUS_CFG = {
  open:                { label: 'Abierta',             color: WARN,    bg: `${WARN}14`, icon: Clock       },
  under_review:        { label: 'En revision',         color: BLUE,    bg: `${BLUE}14`, icon: SearchIcon  },
  resolved_advertiser: { label: 'Resuelta (Anunciante)', color: OK,    bg: `${OK}14`,   icon: CheckCircle },
  resolved_creator:    { label: 'Resuelta (Creador)',  color: OK,      bg: `${OK}14`,   icon: CheckCircle },
  closed:              { label: 'Cerrada',             color: '#6b7280', bg: 'rgba(107,114,128,0.1)', icon: CheckCircle },
}

const REASON_LABELS = {
  not_published:  'No publicado',
  wrong_content:  'Contenido incorrecto',
  late_delivery:  'Entrega tardia',
  fraud:          'Fraude',
  other:          'Otro',
}

const F = FONT_BODY
const D = FONT_DISPLAY

// ── Status badge ──────────────────────────────────────────────────────────────
function StatusBadge({ status }) {
  const cfg = STATUS_CFG[status] || STATUS_CFG.open
  const Icon = cfg.icon
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: '5px',
      background: cfg.bg, color: cfg.color,
      borderRadius: '8px', padding: '4px 10px',
      fontSize: '11px', fontWeight: 600, fontFamily: F,
      letterSpacing: '0.01em', whiteSpace: 'nowrap',
    }}>
      <Icon size={12} strokeWidth={2.5} /> {cfg.label}
    </span>
  )
}

// ── Input style helper ────────────────────────────────────────────────────────
const inputStyle = (focused) => ({
  width: '100%', boxSizing: 'border-box',
  background: 'var(--bg)',
  border: `1px solid ${focused ? purpleAlpha(0.5) : 'var(--border-med)'}`,
  borderRadius: '11px', padding: '11px 14px',
  fontSize: '14px', color: 'var(--text)', fontFamily: F, outline: 'none',
  boxShadow: focused ? `0 0 0 3px ${purpleAlpha(0.07)}` : 'none',
  transition: 'border-color .15s, box-shadow .15s',
})

// ── Create dispute modal ──────────────────────────────────────────────────────
function CreateModal({ onClose, onCreated }) {
  const [form, setForm] = useState({ campaignId: '', reason: 'not_published', description: '' })
  const [sending, setSending] = useState(false)
  const [focusedField, setFocusedField] = useState(null)

  const update = (k, v) => setForm(prev => ({ ...prev, [k]: v }))

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.campaignId || !form.description) return
    setSending(true)
    try {
      const result = await apiService.createDispute(form)
      if (result?.success) {
        onCreated()
        onClose()
      }
    } catch {
      // silently handled — toast or banner could be added
    } finally {
      setSending(false)
    }
  }

  return (
    <div
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
      style={{
        position: 'fixed', inset: 0,
        background: 'rgba(0,0,0,0.6)',
        backdropFilter: 'blur(4px)', WebkitBackdropFilter: 'blur(4px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '20px', zIndex: 1000,
        animation: '_disp_fadeIn 200ms ease forwards',
      }}
    >
      <div style={{
        background: 'var(--surface)', borderRadius: '20px',
        width: '100%', maxWidth: '480px', overflow: 'hidden',
        boxShadow: '0 32px 80px rgba(0,0,0,0.45)',
        animation: '_disp_slideUp 250ms ease forwards',
      }}>
        {/* Accent bar */}
        <div style={{ height: '3px', background: `linear-gradient(90deg, ${PURPLE} 0%, ${BLUE} 100%)` }} />

        {/* Header */}
        <div style={{
          padding: '20px 24px', borderBottom: '1px solid var(--border)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <div>
            <div style={{ fontFamily: D, fontSize: '18px', fontWeight: 800, color: 'var(--text)' }}>
              Abrir nueva disputa
            </div>
            <div style={{ fontSize: '12px', color: 'var(--muted)', marginTop: '3px' }}>
              Sera revisada por nuestro equipo
            </div>
          </div>
          <button onClick={onClose} style={{
            background: 'var(--bg)', border: '1px solid var(--border)',
            borderRadius: '9px', padding: '8px', cursor: 'pointer',
            color: 'var(--muted)', display: 'flex',
            transition: 'border-color .15s, color .15s',
          }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--border-med)'; e.currentTarget.style.color = 'var(--text)' }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.color = 'var(--muted)' }}
          >
            <X size={16} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} style={{ padding: '24px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
            {/* Campaign ID */}
            <div>
              <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--muted)', display: 'block', marginBottom: '7px', fontFamily: F }}>
                ID de Campana <span style={{ color: PURPLE }}>*</span>
              </label>
              <input
                type="text"
                value={form.campaignId}
                onChange={e => update('campaignId', e.target.value)}
                placeholder="Ej: 6478a3f..."
                required
                onFocus={() => setFocusedField('id')}
                onBlur={() => setFocusedField(null)}
                style={inputStyle(focusedField === 'id')}
              />
            </div>

            {/* Reason */}
            <div>
              <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--muted)', display: 'block', marginBottom: '7px', fontFamily: F }}>
                Razon
              </label>
              <select
                value={form.reason}
                onChange={e => update('reason', e.target.value)}
                onFocus={() => setFocusedField('reason')}
                onBlur={() => setFocusedField(null)}
                style={{
                  ...inputStyle(focusedField === 'reason'),
                  appearance: 'none',
                  backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%2386868b' stroke-width='2.5' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E")`,
                  backgroundRepeat: 'no-repeat',
                  backgroundPosition: 'right 14px center',
                  paddingRight: '38px',
                }}
              >
                {Object.entries(REASON_LABELS).map(([val, label]) => (
                  <option key={val} value={val}>{label}</option>
                ))}
              </select>
            </div>

            {/* Description */}
            <div>
              <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--muted)', display: 'block', marginBottom: '7px', fontFamily: F }}>
                Descripcion <span style={{ color: PURPLE }}>*</span>
              </label>
              <textarea
                value={form.description}
                onChange={e => update('description', e.target.value)}
                placeholder="Describe el problema con detalle..."
                rows={4}
                required
                maxLength={2000}
                onFocus={() => setFocusedField('desc')}
                onBlur={() => setFocusedField(null)}
                style={{
                  ...inputStyle(focusedField === 'desc'),
                  resize: 'vertical',
                }}
              />
              <div style={{ fontSize: '11px', color: 'var(--muted2)', marginTop: '4px', textAlign: 'right', fontFamily: F }}>
                {form.description.length}/2000
              </div>
            </div>
          </div>

          {/* Actions */}
          <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '20px' }}>
            <button type="button" onClick={onClose} style={{
              background: 'transparent',
              border: '1px solid var(--border)',
              borderRadius: '10px', padding: '10px 20px',
              fontSize: '14px', fontWeight: 500, color: 'var(--muted)',
              fontFamily: F, cursor: 'pointer',
              transition: 'border-color .15s, color .15s',
            }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--border-med)'; e.currentTarget.style.color = 'var(--text)' }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.color = 'var(--muted)' }}
            >
              Cancelar
            </button>
            <button type="submit" disabled={sending} style={{
              background: PURPLE, color: '#fff', border: 'none',
              borderRadius: '10px', padding: '10px 24px',
              fontSize: '14px', fontWeight: 600, fontFamily: F,
              cursor: sending ? 'not-allowed' : 'pointer',
              opacity: sending ? 0.6 : 1,
              transition: 'transform .15s, box-shadow .15s, opacity .15s',
              boxShadow: `0 4px 16px ${purpleAlpha(0.3)}`,
            }}
              onMouseEnter={e => { if (!sending) { e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.boxShadow = `0 8px 24px ${purpleAlpha(0.4)}` } }}
              onMouseLeave={e => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = `0 4px 16px ${purpleAlpha(0.3)}` }}
            >
              {sending ? 'Enviando...' : 'Crear disputa'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}


// ── Dispute detail view ───────────────────────────────────────────────────────
function DisputeDetail({ dispute, onBack }) {
  const [newMessage, setNewMessage] = useState('')
  const [sending, setSending] = useState(false)
  const [detail, setDetail] = useState(dispute)
  const [msgFocused, setMsgFocused] = useState(false)
  const messagesEnd = useRef(null)
  const messagesRef = useRef(null)

  const isClosed = ['resolved_advertiser', 'resolved_creator', 'closed'].includes(detail.status)

  const handleSend = async (e) => {
    e.preventDefault()
    if (!newMessage.trim()) return
    setSending(true)
    try {
      const result = await apiService.addDisputeMessage(detail._id, newMessage.trim())
      if (result?.success) {
        setDetail(result.data)
        setNewMessage('')
      }
    } catch {
      // network error — message not sent
    } finally {
      setSending(false)
    }
  }

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto' }}>
      {/* Back button */}
      <button
        onClick={onBack}
        style={{
          display: 'inline-flex', alignItems: 'center', gap: '6px',
          background: 'none', border: 'none', cursor: 'pointer',
          color: PURPLE, fontSize: '13px', fontWeight: 600,
          fontFamily: F, padding: '4px 0', marginBottom: '20px',
          transition: 'opacity .15s',
        }}
        onMouseEnter={e => { e.currentTarget.style.opacity = '0.7' }}
        onMouseLeave={e => { e.currentTarget.style.opacity = '1' }}
      >
        <ArrowLeft size={16} strokeWidth={2} /> Volver a disputas
      </button>

      {/* Main card */}
      <div style={{
        background: 'var(--surface)',
        border: '1px solid var(--border)',
        borderRadius: '18px',
        overflow: 'hidden',
        boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
      }}>
        {/* Header */}
        <div style={{
          padding: '20px 24px',
          borderBottom: '1px solid var(--border)',
          display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start',
          flexWrap: 'wrap', gap: '12px',
        }}>
          <div>
            <h2 style={{
              fontFamily: D, fontSize: '18px', fontWeight: 800,
              color: 'var(--text)', marginBottom: '4px',
            }}>
              Disputa #{detail._id?.slice(-6)}
            </h2>
            <div style={{ fontSize: '13px', color: 'var(--muted)', fontFamily: F }}>
              Abierta por {detail.openedBy?.nombre || 'Usuario'} · {relTime(detail.createdAt)}
            </div>
          </div>
          <StatusBadge status={detail.status} />
        </div>

        {/* Reason */}
        <div style={{ padding: '16px 24px', borderBottom: '1px solid var(--border)', display: 'flex', gap: '8px', alignItems: 'center' }}>
          <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--muted)', fontFamily: F }}>Razon:</span>
          <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text)', fontFamily: F }}>
            {REASON_LABELS[detail.reason] || detail.reason}
          </span>
        </div>

        {/* Resolution banner */}
        {detail.resolution && (
          <div style={{
            margin: '16px 24px', padding: '14px 16px',
            background: `${OK}08`, border: `1px solid ${OK}25`,
            borderRadius: '12px',
          }}>
            <div style={{ fontSize: '12px', fontWeight: 700, color: OK, marginBottom: '4px', fontFamily: F }}>
              Resolucion
            </div>
            <div style={{ fontSize: '13px', color: 'var(--text)', lineHeight: 1.5, fontFamily: F }}>
              {detail.resolution}
            </div>
          </div>
        )}

        {/* Messages */}
        <div style={{ padding: '20px 24px', borderTop: '1px solid var(--border)' }}>
          <h3 style={{
            fontFamily: D, fontSize: '14px', fontWeight: 700,
            color: 'var(--text)', marginBottom: '16px',
            display: 'flex', alignItems: 'center', gap: '6px',
          }}>
            <MessageCircle size={15} strokeWidth={2} /> Mensajes
          </h3>

          <div ref={messagesRef} style={{ maxHeight: '380px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '16px' }}>
            {(detail.messages || []).length === 0 ? (
              <div style={{ textAlign: 'center', padding: '24px', color: 'var(--muted)', fontSize: '13px', fontFamily: F }}>
                Sin mensajes aun
              </div>
            ) : (detail.messages || []).map((m, i) => (
              <div key={i} style={{
                background: 'var(--bg)',
                border: '1px solid var(--border)',
                borderRadius: '12px', padding: '12px 16px',
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                  <span style={{ fontSize: '12px', fontWeight: 600, color: PURPLE, fontFamily: F }}>
                    {m.sender?.nombre || 'Usuario'}
                  </span>
                  <span style={{ fontSize: '11px', color: 'var(--muted2)', fontFamily: F }}>
                    {relTime(m.createdAt)}
                  </span>
                </div>
                <div style={{ fontSize: '13px', color: 'var(--text)', lineHeight: 1.5, fontFamily: F }}>
                  {m.text}
                </div>
              </div>
            ))}
            <div ref={messagesEnd} />
          </div>

          {/* Reply form */}
          {!isClosed && (
            <form onSubmit={handleSend} style={{ display: 'flex', gap: '10px' }}>
              <input
                type="text"
                value={newMessage}
                onChange={e => setNewMessage(e.target.value)}
                placeholder="Escribe un mensaje..."
                onFocus={() => setMsgFocused(true)}
                onBlur={() => setMsgFocused(false)}
                style={{
                  ...inputStyle(msgFocused),
                  flex: 1,
                }}
              />
              <button
                type="submit"
                disabled={sending || !newMessage.trim()}
                style={{
                  background: PURPLE, color: '#fff', border: 'none',
                  borderRadius: '11px', padding: '0 18px',
                  cursor: (sending || !newMessage.trim()) ? 'not-allowed' : 'pointer',
                  opacity: (sending || !newMessage.trim()) ? 0.5 : 1,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  transition: 'opacity .15s, transform .15s',
                  flexShrink: 0,
                }}
                onMouseEnter={e => { if (!sending && newMessage.trim()) e.currentTarget.style.transform = 'translateY(-1px)' }}
                onMouseLeave={e => { e.currentTarget.style.transform = 'none' }}
              >
                <Send size={16} strokeWidth={2} />
              </button>
            </form>
          )}

          {isClosed && (
            <div style={{
              textAlign: 'center', padding: '14px',
              background: 'var(--bg)', borderRadius: '12px',
              border: '1px solid var(--border)',
              fontSize: '13px', color: 'var(--muted)', fontFamily: F,
            }}>
              Esta disputa esta cerrada. No se pueden enviar mas mensajes.
            </div>
          )}
        </div>
      </div>
    </div>
  )
}


// ── Dispute row card ──────────────────────────────────────────────────────────
function DisputeCard({ dispute, onClick }) {
  const [hovered, setHovered] = useState(false)

  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        background: 'var(--surface)',
        border: `1px solid ${hovered ? purpleAlpha(0.35) : 'var(--border)'}`,
        borderRadius: '14px', padding: '18px 20px',
        cursor: 'pointer',
        display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start',
        gap: '12px',
        transition: 'border-color .18s, transform .18s, box-shadow .18s',
        transform: hovered ? 'translateY(-1px)' : 'none',
        boxShadow: hovered ? `0 6px 24px ${purpleAlpha(0.08)}` : '0 1px 4px rgba(0,0,0,0.04)',
      }}
    >
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontFamily: D, fontSize: '14px', fontWeight: 700, color: 'var(--text)', marginBottom: '4px' }}>
          Disputa #{dispute._id?.slice(-6)}
        </div>
        <div style={{ fontSize: '12px', color: 'var(--muted)', fontFamily: F, marginBottom: '2px' }}>
          {REASON_LABELS[dispute.reason] || dispute.reason}
        </div>
        <div style={{ fontSize: '11px', color: 'var(--muted2)', fontFamily: F }}>
          {relTime(dispute.createdAt)}
        </div>
      </div>
      <StatusBadge status={dispute.status} />
    </div>
  )
}


// ── Main DisputesPage ─────────────────────────────────────────────────────────
export default function DisputesPage() {
  const [disputes, setDisputes] = useState([])
  const [loading, setLoading] = useState(true)
  const [fetchError, setFetchError] = useState(null)
  const [selectedDispute, setSelectedDispute] = useState(null)
  const [showCreateModal, setShowCreateModal] = useState(false)

  const loadDisputes = useCallback(async () => {
    setLoading(true)
    try {
      const result = await apiService.getMyDisputes()
      if (result?.success) {
        setDisputes(result.data?.items || [])
      }
    } catch {
      setFetchError('No se pudieron cargar los datos. Verifica tu conexion.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { loadDisputes() }, [loadDisputes])

  const loadDisputeDetail = async (id) => {
    try {
      const result = await apiService.getDispute(id)
      if (result?.success) setSelectedDispute(result.data)
    } catch {
      // dispute detail load failed silently
    }
  }

  // ── Detail view ─────────────────────────────────────────────────────────────
  if (selectedDispute) {
    return (
      <DisputeDetail
        dispute={selectedDispute}
        onBack={() => setSelectedDispute(null)}
      />
    )
  }

  // ── List view ───────────────────────────────────────────────────────────────
  return (
    <div style={{ maxWidth: '800px', margin: '0 auto' }}>
      {/* Keyframes */}
      <style>{`
        @keyframes _disp_fadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes _disp_slideUp { from { opacity: 0; transform: translateY(16px) scale(0.97); } to { opacity: 1; transform: none; } }
      `}</style>

      {/* Page header */}
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        marginBottom: '24px', flexWrap: 'wrap', gap: '12px',
      }}>
        <div>
          <h1 style={{ fontFamily: D, fontSize: '22px', fontWeight: 800, color: 'var(--text)', marginBottom: '4px' }}>
            Disputas
          </h1>
          <p style={{ fontSize: '13px', color: 'var(--muted)', fontFamily: F }}>
            Gestiona y resuelve disputas con tus campanas
          </p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          style={{
            display: 'inline-flex', alignItems: 'center', gap: '7px',
            background: PURPLE, color: '#fff', border: 'none',
            borderRadius: '10px', padding: '10px 20px',
            fontSize: '13px', fontWeight: 600, fontFamily: F,
            cursor: 'pointer',
            transition: 'transform .15s, box-shadow .15s',
            boxShadow: `0 4px 16px ${purpleAlpha(0.3)}`,
          }}
          onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.boxShadow = `0 8px 24px ${purpleAlpha(0.4)}` }}
          onMouseLeave={e => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = `0 4px 16px ${purpleAlpha(0.3)}` }}
        >
          <Plus size={16} strokeWidth={2.5} /> Abrir disputa
        </button>
      </div>

      {/* Error */}
      {fetchError && (
        <div style={{ marginBottom: '16px' }}>
          <ErrorBanner
            message={fetchError}
            onRetry={() => { setFetchError(null); loadDisputes() }}
          />
        </div>
      )}

      {/* Loading skeleton */}
      {loading ? (
        <SkeletonTable rows={4} />
      ) : disputes.length === 0 ? (
        /* Empty state */
        <EmptyState
          icon={ShieldAlert}
          title="Sin disputas activas"
          description="No tienes disputas abiertas. Si tienes un problema con alguna campana, puedes abrir una disputa y nuestro equipo la revisara."
          actionLabel="Abrir disputa"
          onAction={() => setShowCreateModal(true)}
        />
      ) : (
        /* Dispute list */
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {disputes.map(d => (
            <DisputeCard
              key={d._id}
              dispute={d}
              onClick={() => loadDisputeDetail(d._id)}
            />
          ))}
        </div>
      )}

      {/* Create modal */}
      {showCreateModal && (
        <CreateModal
          onClose={() => setShowCreateModal(false)}
          onCreated={loadDisputes}
        />
      )}
    </div>
  )
}
