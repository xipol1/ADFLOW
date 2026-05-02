import React, { useEffect } from 'react'
import {
  X, Calendar, Inbox, Activity, ArrowRight, Send, Wallet, MessageSquare,
  CheckCircle2, XCircle, Radio, Building2,
} from 'lucide-react'
import { FONT_BODY, FONT_DISPLAY, OK, WARN, ERR, BLUE, GREEN, greenAlpha } from '../theme/tokens'

const ACCENT = GREEN
const ga = greenAlpha

const STATUS_CFG = {
  pendiente:  { color: WARN, label: 'Pendiente'  },
  aceptada:   { color: OK,   label: 'Aceptada'   },
  rechazada:  { color: ERR,  label: 'Rechazada'  },
  PUBLISHED:  { color: OK,   label: 'Publicada'  },
  COMPLETED:  { color: '#94a3b8', label: 'Completada' },
  PAID:       { color: BLUE, label: 'Pagada'     },
  DRAFT:      { color: WARN, label: 'Borrador'   },
}

/**
 * CreatorRequestDetailModal — drill-down for ad requests/campaigns.
 * Reutilizable para tanto solicitudes pendientes como campañas activas.
 */
export default function CreatorRequestDetailModal({ request, onClose, onAccept, onReject, navigate }) {
  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handler)
    document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', handler)
      document.body.style.overflow = ''
    }
  }, [onClose])

  if (!request) return null

  const status = request.status
  const st = STATUS_CFG[status] || { color: '#94a3b8', label: status || '—' }
  const isPending = status === 'pendiente'
  const channelName = typeof request.channel === 'object'
    ? (request.channel?.nombreCanal || request.channel?.identificadorCanal)
    : request.channel || request.canal
  const advertiserName = request.advertiserName || request.advertiser?.nombre || request.anunciante || 'Anunciante'
  const price = request.price || request.budget || request.netAmount || 0
  const id = request._id || request.id

  const handleBackdrop = (e) => { if (e.target === e.currentTarget) onClose() }

  return (
    <div onClick={handleBackdrop} style={{
      position: 'fixed', inset: 0, zIndex: 9999,
      background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(6px)',
      display: 'flex', justifyContent: 'flex-end',
      animation: 'cdmFadeIn .18s ease', fontFamily: FONT_BODY,
    }}>
      <style>{`
        @keyframes cdmFadeIn { from { opacity:0 } to { opacity:1 } }
        @keyframes cdmSlideIn { from { transform: translateX(40px); opacity:0 } to { transform: translateX(0); opacity:1 } }
        @media (max-width: 640px) {
          .crm-panel { width: 100% !important; max-width: 100% !important; }
        }
      `}</style>

      <div className="crm-panel" style={{
        width: 460, maxWidth: '100%', height: '100%',
        background: 'var(--bg)', borderLeft: '1px solid var(--border)',
        boxShadow: '-12px 0 36px rgba(0,0,0,0.25)',
        display: 'flex', flexDirection: 'column', overflow: 'hidden',
        animation: 'cdmSlideIn .22s cubic-bezier(.22,1,.36,1)',
      }}>

        <div style={{
          padding: '18px 22px', borderBottom: '1px solid var(--border)',
          display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12,
        }}>
          <div style={{ minWidth: 0, flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
              <div style={{
                width: 32, height: 32, borderRadius: 9,
                background: ga(0.12), border: `1px solid ${ga(0.25)}`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <Inbox size={15} color={ACCENT} strokeWidth={2} />
              </div>
              <span style={{
                background: `${st.color}14`, color: st.color, border: `1px solid ${st.color}35`,
                borderRadius: 20, padding: '2px 9px', fontSize: 11, fontWeight: 700,
              }}>{st.label}</span>
            </div>
            <h2 style={{
              fontFamily: FONT_DISPLAY, fontSize: 18, fontWeight: 800,
              color: 'var(--text)', letterSpacing: '-0.02em', margin: 0,
              wordBreak: 'break-word',
            }}>
              {request.title || `Propuesta de ${advertiserName}`}
            </h2>
            {channelName && (
              <div style={{ fontSize: 12.5, color: 'var(--muted)', marginTop: 4 }}>
                <Radio size={11} style={{ display: 'inline', verticalAlign: 'middle', marginRight: 4 }} />
                {channelName}
              </div>
            )}
          </div>
          <button onClick={onClose} style={{
            background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 9,
            width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'pointer', color: 'var(--muted)', flexShrink: 0,
          }}>
            <X size={16} />
          </button>
        </div>

        <div style={{ flex: 1, overflow: 'auto', padding: '18px 22px' }}>
          <div style={{
            display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: 8,
            marginBottom: 18,
          }}>
            <KpiTile icon={Wallet} label="Importe bruto" value={`€${price}`} accent={ACCENT} />
            {Number(request.netAmount) > 0 && (
              <KpiTile icon={Wallet} label="Tu parte (neto)" value={`€${request.netAmount}`} accent={OK} />
            )}
            {request.deadline && (
              <KpiTile icon={Calendar} label="Deadline" value={fmtDateShort(request.deadline)} accent={WARN} />
            )}
            {Number(request.rating) > 0 && (
              <KpiTile icon={Activity} label="Rating dado" value={`${request.rating}★`} accent="#f59e0b" />
            )}
          </div>

          <Section title="Anunciante">
            <div style={{ background: 'var(--bg2)', borderRadius: 10, padding: 14, display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{
                width: 36, height: 36, borderRadius: 9, background: ga(0.12), border: `1px solid ${ga(0.25)}`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <Building2 size={16} color={ACCENT} />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)' }}>{advertiserName}</div>
                {request.advertiser?.email && (
                  <div style={{ fontSize: 11.5, color: 'var(--muted)' }}>{request.advertiser.email}</div>
                )}
              </div>
            </div>
          </Section>

          {request.content && (
            <Section title="Contenido propuesto">
              <div style={{
                fontSize: 13, color: 'var(--text)', lineHeight: 1.6,
                background: 'var(--bg2)', borderRadius: 10, padding: 14,
                whiteSpace: 'pre-wrap', wordBreak: 'break-word',
                maxHeight: 200, overflow: 'auto',
              }}>
                {request.content}
              </div>
            </Section>
          )}

          {request.targetUrl && (
            <Section title="URL de destino">
              <a href={request.targetUrl} target="_blank" rel="noopener noreferrer"
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: 6,
                  fontSize: 12.5, color: ACCENT, fontWeight: 600,
                  textDecoration: 'none',
                  background: ga(0.08), border: `1px solid ${ga(0.2)}`,
                  borderRadius: 8, padding: '6px 10px',
                }}>
                {request.targetUrl.length > 50 ? request.targetUrl.slice(0, 50) + '…' : request.targetUrl}
              </a>
            </Section>
          )}

          {request.notes && (
            <Section title="Notas">
              <div style={{
                fontSize: 12.5, color: 'var(--text)', lineHeight: 1.5,
                background: 'var(--bg2)', borderRadius: 10, padding: 12,
              }}>
                <MessageSquare size={12} style={{ display: 'inline', verticalAlign: 'middle', marginRight: 6, color: 'var(--muted)' }} />
                {request.notes}
              </div>
            </Section>
          )}

          <Section title="Cronología">
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {request.createdAt && <TimelineRow icon={Calendar} label="Recibida" value={fmtDate(request.createdAt)} />}
              {request.acceptedAt && <TimelineRow icon={CheckCircle2} label="Aceptada" value={fmtDate(request.acceptedAt)} accent={OK} />}
              {request.rejectedAt && <TimelineRow icon={XCircle} label="Rechazada" value={fmtDate(request.rejectedAt)} accent={ERR} />}
              {request.publishedAt && <TimelineRow icon={Send} label="Publicada" value={fmtDate(request.publishedAt)} accent={OK} />}
              {request.completedAt && <TimelineRow icon={Activity} label="Completada" value={fmtDate(request.completedAt)} />}
              {request.deadline && <TimelineRow icon={Calendar} label="Deadline" value={fmtDate(request.deadline)} accent={WARN} />}
            </div>
          </Section>
        </div>

        <div style={{
          padding: '14px 22px', borderTop: '1px solid var(--border)',
          background: 'var(--bg2)', display: 'flex', gap: 8, flexWrap: 'wrap',
        }}>
          {isPending && onReject && (
            <button onClick={() => onReject(request)} style={{
              background: 'transparent', border: `1px solid ${ERR}40`, borderRadius: 9,
              padding: '9px 14px', fontSize: 13, fontWeight: 600, color: ERR,
              cursor: 'pointer', fontFamily: FONT_BODY,
              display: 'flex', alignItems: 'center', gap: 6,
            }}>
              <XCircle size={14} /> Rechazar
            </button>
          )}
          <button onClick={onClose} style={{
            background: 'transparent', border: '1px solid var(--border)', borderRadius: 9,
            padding: '9px 14px', fontSize: 13, fontWeight: 600, color: 'var(--text)',
            cursor: 'pointer', fontFamily: FONT_BODY,
          }}>
            Cerrar
          </button>
          <div style={{ flex: 1 }} />
          {isPending && onAccept ? (
            <button onClick={() => onAccept(request)} style={{
              background: ACCENT, color: '#fff', border: 'none', borderRadius: 9,
              padding: '9px 14px', fontSize: 13, fontWeight: 600,
              cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6,
              fontFamily: FONT_BODY, boxShadow: `0 4px 14px ${ga(0.35)}`,
            }}>
              <CheckCircle2 size={14} /> Aceptar
            </button>
          ) : (
            <button onClick={() => { onClose(); navigate(`/creator/requests?id=${id}`) }} style={{
              background: ACCENT, color: '#fff', border: 'none', borderRadius: 9,
              padding: '9px 14px', fontSize: 13, fontWeight: 600,
              cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6,
              fontFamily: FONT_BODY, boxShadow: `0 4px 14px ${ga(0.35)}`,
            }}>
              Ver completa <ArrowRight size={13} />
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

function KpiTile({ icon: Icon, label, value, accent }) {
  return (
    <div style={{
      background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 10,
      padding: '10px 12px', display: 'flex', flexDirection: 'column', gap: 4, minHeight: 0,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <Icon size={11} color={accent} strokeWidth={2.2} />
        <span style={{ fontSize: 10.5, color: 'var(--muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
          {label}
        </span>
      </div>
      <div style={{ fontSize: 18, fontWeight: 800, color: 'var(--text)', fontFamily: FONT_DISPLAY, letterSpacing: '-0.02em' }}>
        {value}
      </div>
    </div>
  )
}

function Section({ title, children }) {
  return (
    <div style={{ marginBottom: 16 }}>
      <div style={{
        fontSize: 11, fontWeight: 700, color: 'var(--muted)',
        textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6,
      }}>{title}</div>
      {children}
    </div>
  )
}

function TimelineRow({ icon: Icon, label, value, accent = 'var(--muted)' }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12.5, color: 'var(--text)' }}>
      <Icon size={12} color={accent} />
      <span style={{ color: 'var(--muted)' }}>{label}:</span>
      <span style={{ fontWeight: 600 }}>{value}</span>
    </div>
  )
}

function fmtDate(d) {
  const date = new Date(d)
  if (isNaN(date.getTime())) return '—'
  return date.toLocaleDateString('es', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}

function fmtDateShort(d) {
  const date = new Date(d)
  if (isNaN(date.getTime())) return '—'
  return date.toLocaleDateString('es', { day: 'numeric', month: 'short' })
}
