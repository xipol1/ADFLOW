import React, { useState, useEffect, useRef, useCallback } from 'react'
import { ErrorBanner } from '../shared/DashComponents'
import apiService from '../../../../services/api'
import DeliveryBadge from '../../../components/DeliveryBadge'
import { FONT_BODY, FONT_DISPLAY, OK as _OK, BLUE as _BLUE, WARN, ERR } from '../../../theme/tokens'

/* ── Design tokens ─────────────────────────────────────────────────────────── */
const V  = 'var(--accent, #8B5CF6)'
const VG = (o) => `var(--accent-dim, rgba(139,92,246,${o}))`
const F  = FONT_BODY
const D  = FONT_DISPLAY
const OK = _OK
const BLUE = _BLUE
const AMBER = WARN
const RED  = ERR

/* ── Animations ────────────────────────────────────────────────────────────── */
const CSS = `
@keyframes adf-in { from { opacity:0; transform:translateY(6px); } to { opacity:1; transform:none; } }
@keyframes adf-slide { from { opacity:0; transform:translateX(-8px); } to { opacity:1; transform:none; } }
@keyframes adf-pulse { 0%,100%{opacity:1}50%{opacity:.5} }
@keyframes adf-modal { from { opacity:0; transform:scale(.97) translateY(8px); } to { opacity:1; transform:none; } }
.cr-row:hover { border-color: ${VG(0.35)} !important; transform: translateY(-1px); }
.cr-btn:hover:not(:disabled) { transform:translateY(-1px); box-shadow:0 6px 20px ${VG(0.3)}; }
`

const fmtDate = (d) => d ? new Date(d).toLocaleDateString('es', { day: 'numeric', month: 'short' }) : '-'
const fmtTime = (d) => d ? new Date(d).toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit' }) : ''
const fmtFull = (d) => d ? new Date(d).toLocaleString('es', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : ''

/* ── Pipeline config ───────────────────────────────────────────────────────── */
const STEPS = [
  { key: 'PAID',      label: 'Pendiente',  color: BLUE, icon: '📥', desc: 'Revisar y publicar' },
  { key: 'PUBLISHED', label: 'Publicada',  color: OK,   icon: '📢', desc: 'Anuncio en vivo' },
  { key: 'COMPLETED', label: 'Completada', color: '#6b7280', icon: '✓', desc: 'Pago liberado' },
]

/* ── Status badge ──────────────────────────────────────────────────────────── */
const STATUS_CFG = {
  PAID:      { color: BLUE,      bg: `${BLUE}12`, label: 'Pendiente', tab: 'Pendientes' },
  PUBLISHED: { color: OK,        bg: `${OK}12`,   label: 'Publicada', tab: 'Publicadas' },
  COMPLETED: { color: '#6b7280', bg: 'rgba(107,114,128,0.1)', label: 'Completada', tab: 'Completadas' },
  CANCELLED: { color: RED,       bg: `${RED}10`,  label: 'Rechazada', tab: 'Rechazadas' },
}

/* ── Deadline helper (48h from creation) ─────────────────────────────────── */
const DEADLINE_HOURS = 48
const getDeadline = (c) => {
  if (c.status !== 'PAID' || !c.createdAt) return null
  const dl = new Date(c.createdAt)
  dl.setHours(dl.getHours() + DEADLINE_HOURS)
  const remaining = dl - Date.now()
  if (remaining <= 0) return { text: 'Vencido', color: RED, urgent: true }
  const hrs = Math.floor(remaining / 3600000)
  const mins = Math.floor((remaining % 3600000) / 60000)
  if (hrs < 6) return { text: `${hrs}h ${mins}m`, color: RED, urgent: true }
  if (hrs < 24) return { text: `${hrs}h restantes`, color: AMBER, urgent: false }
  return { text: `${hrs}h restantes`, color: 'var(--muted)', urgent: false }
}

/* ── Chat templates ──────────────────────────────────────────────────────── */
const TEMPLATES = [
  'Gracias por tu propuesta, revisaré los detalles y te confirmo pronto.',
  'Ya he publicado el contenido en el canal. Avísame si necesitas ajustes.',
  '¿Podrías enviarme más detalles sobre el contenido o formato esperado?',
  'Necesito un poco más de tiempo para revisar. Te respondo en breve.',
]
const StatusBadge = ({ status }) => {
  const c = STATUS_CFG[status] || { color: '#94a3b8', bg: 'rgba(148,163,184,0.1)', label: status }
  return <span style={{ background: c.bg, color: c.color, borderRadius: '8px', padding: '4px 10px', fontSize: '11px', fontWeight: 600, letterSpacing: '0.01em' }}>{c.label}</span>
}

/* ── Mini pipeline ─────────────────────────────────────────────────────────── */
const MiniPipeline = ({ status }) => {
  const idx = STEPS.findIndex(s => s.key === status)
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '0' }}>
      {STEPS.map((step, i) => {
        const done = i < idx
        const active = i === idx
        const color = done ? OK : active ? step.color : 'var(--muted2)'
        return (
          <React.Fragment key={step.key}>
            {i > 0 && <div style={{ width: '28px', height: '2px', background: done ? OK : 'var(--border)', borderRadius: '1px' }} />}
            <div style={{
              width: active ? '32px' : '24px', height: active ? '32px' : '24px',
              borderRadius: '50%', background: done || active ? color : 'var(--bg)',
              border: `2px solid ${color}`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: done ? '12px' : active ? '14px' : '11px',
              color: done || active ? '#fff' : 'var(--muted2)',
              boxShadow: active ? `0 0 0 3px ${color}20` : 'none',
              transition: 'all .25s',
              fontWeight: 700,
            }}>
              {done ? '✓' : step.icon}
            </div>
          </React.Fragment>
        )
      })}
    </div>
  )
}

/* ── Avatar ─────────────────────────────────────────────────────────────────── */
const Av = ({ name, color = V, size = 28 }) => (
  <div style={{
    width: size, height: size, borderRadius: '50%',
    background: `${color}15`, border: `1.5px solid ${color}35`,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontSize: size * 0.38, fontWeight: 700, color, flexShrink: 0, fontFamily: D,
  }}>{(name || '?')[0].toUpperCase()}</div>
)

/* ── Pro Chat ──────────────────────────────────────────────────────────────── */
const ChatPanel = ({ campaign, onSent }) => {
  const [draft, setDraft] = useState('')
  const [sending, setSending] = useState(false)
  const [showTpl, setShowTpl] = useState(false)
  const [msgs, setMsgs] = useState([])
  const [chatError, setChatError] = useState('')
  const scrollRef = useRef(null)
  const inputRef = useRef(null)

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight
  }, [msgs.length])

  // Load messages + poll every 8 seconds
  useEffect(() => {
    if (!campaign?._id) return
    let active = true
    const fetchMessages = async () => {
      try {
        const r = await apiService.getCampaignMessages(campaign._id)
        if (r?.success && active) setMsgs(r.data || [])
      } catch (err) { console.error('CreatorRequestsPage.fetchMessages failed:', err) }
    }
    fetchMessages()
    const poll = setInterval(fetchMessages, 8000)
    return () => { active = false; clearInterval(poll) }
  }, [campaign?._id])

  const send = async () => {
    if (!draft.trim() || sending) return
    if (draft.trim().length > 2000) {
      setChatError('El mensaje no puede superar los 2000 caracteres')
      return
    }
    setChatError('')
    setSending(true)
    try {
      const r = await apiService.sendCampaignChat(campaign._id, draft.trim())
      if (r?.success) {
        setMsgs(prev => [...prev, r.data])
        setDraft('')
        setChatError('')
      } else if (r?.blocked) {
        setChatError(r.message || 'Mensaje bloqueado por el sistema de moderacion')
      } else {
        setChatError(r?.message || 'Error al enviar el mensaje')
      }
    } catch {
      setChatError('Error de conexion')
    }
    setSending(false)
    inputRef.current?.focus()
  }

  return (
    <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '16px', overflow: 'hidden' }}>
      {/* Header */}
      <div style={{ padding: '14px 18px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: '10px' }}>
        <div style={{ width: '32px', height: '32px', borderRadius: '10px', background: `${V}10`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <span style={{ fontSize: '16px' }}>💬</span>
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text)', fontFamily: D }}>Conversacion</div>
          <div style={{ fontSize: '11px', color: 'var(--muted)' }}>{msgs.length} mensaje{msgs.length !== 1 ? 's' : ''}</div>
        </div>
      </div>

      {/* Messages */}
      <div ref={scrollRef} style={{ minHeight: '160px', maxHeight: '340px', overflowY: 'auto', padding: '16px', display: 'flex', flexDirection: 'column', gap: '10px', background: 'var(--bg)' }}>
        {msgs.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '32px 16px' }}>
            <div style={{ width: '48px', height: '48px', borderRadius: '14px', background: `${V}08`, border: `1px solid ${VG(0.1)}`, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', marginBottom: '10px' }}>
              <span style={{ fontSize: '22px' }}>💬</span>
            </div>
            <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text)', marginBottom: '4px' }}>Inicia la conversacion</div>
            <div style={{ fontSize: '12px', color: 'var(--muted)', maxWidth: '260px', margin: '0 auto', lineHeight: 1.5 }}>
              Coordina fechas, formato y detalles de publicacion con el anunciante
            </div>
          </div>
        ) : msgs.map((m, i) => {
          const isMe = m.senderRole === 'creator'
          const prev = msgs[i - 1]
          const showAv = !prev || prev.senderRole !== m.senderRole
          return (
            <div key={m._id || i} style={{
              display: 'flex', gap: '8px',
              flexDirection: isMe ? 'row-reverse' : 'row',
              alignItems: 'flex-end',
              animation: 'adf-in .2s ease',
              marginTop: showAv ? '4px' : '-4px',
            }}>
              {showAv ? <Av name={m.senderName || m.senderRole} color={isMe ? V : BLUE} size={28} /> : <div style={{ width: 28 }} />}
              <div style={{
                maxWidth: '75%',
                background: isMe ? V : 'var(--surface)',
                color: isMe ? '#fff' : 'var(--text)',
                border: isMe ? 'none' : '1px solid var(--border)',
                borderRadius: isMe
                  ? (showAv ? '18px 18px 4px 18px' : '18px 4px 4px 18px')
                  : (showAv ? '18px 18px 18px 4px' : '4px 18px 18px 4px'),
                padding: '10px 14px',
                boxShadow: isMe ? `0 2px 8px ${VG(0.2)}` : '0 1px 3px rgba(0,0,0,0.04)',
              }}>
                {showAv && <div style={{ fontSize: '11px', fontWeight: 700, marginBottom: '3px', color: isMe ? 'rgba(255,255,255,0.7)' : `${BLUE}cc` }}>{m.senderName || m.senderRole}</div>}
                <div style={{ fontSize: '13px', lineHeight: 1.55, whiteSpace: 'pre-wrap' }}>{m.text || m.message}</div>
                <div style={{ fontSize: '10px', marginTop: '4px', textAlign: 'right', color: isMe ? 'rgba(255,255,255,0.5)' : 'var(--muted2)' }}>{fmtFull(m.createdAt)}</div>
              </div>
            </div>
          )
        })}
      </div>

      {/* Templates dropdown */}
      {showTpl && (
        <div style={{ padding: '8px 16px 0', borderTop: '1px solid var(--border)', display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--muted)', marginBottom: '2px' }}>Respuestas rapidas</div>
          {TEMPLATES.map((t, i) => (
            <button key={i} onClick={() => { setDraft(t); setShowTpl(false); inputRef.current?.focus() }}
              style={{
                background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: '10px',
                padding: '8px 12px', fontSize: '12px', color: 'var(--text)', cursor: 'pointer',
                fontFamily: F, textAlign: 'left', lineHeight: 1.4, transition: 'border-color .15s',
              }}
              onMouseEnter={e => e.currentTarget.style.borderColor = VG(0.4)}
              onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border)'}
            >{t}</button>
          ))}
        </div>
      )}

      {/* Moderation error */}
      {chatError && (
        <div style={{
          padding: '8px 16px', background: `${RED}08`, borderTop: `1px solid ${RED}20`,
          display: 'flex', alignItems: 'center', gap: '8px',
        }}>
          <span style={{ fontSize: '14px' }}>⚠️</span>
          <span style={{ fontSize: '12px', color: RED, lineHeight: 1.4, flex: 1 }}>{chatError}</span>
          <button onClick={() => setChatError('')} style={{ background: 'none', border: 'none', color: 'var(--muted)', cursor: 'pointer', fontSize: '16px', padding: '0 4px' }}>×</button>
        </div>
      )}

      {/* Input */}
      <div style={{ padding: '12px 16px', borderTop: (showTpl || chatError) ? 'none' : '1px solid var(--border)', display: 'flex', gap: '10px', alignItems: 'flex-end' }}>
        {/* Templates toggle */}
        <button onClick={() => setShowTpl(p => !p)} title="Respuestas rapidas" style={{
          width: '40px', height: '40px', borderRadius: '12px',
          background: showTpl ? VG(0.1) : 'var(--bg)', border: `1px solid ${showTpl ? VG(0.3) : 'var(--border)'}`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          cursor: 'pointer', flexShrink: 0, transition: 'all .15s', fontSize: '16px',
        }}>⚡</button>
        <div style={{ flex: 1, position: 'relative' }}>
          <textarea ref={inputRef} value={draft} onChange={e => { setDraft(e.target.value); if (chatError) setChatError('') }}
            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() } }}
            placeholder="Mensaje al anunciante..." rows={1} maxLength={2000}
            style={{ width: '100%', background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: '12px', padding: '10px 14px', fontSize: '13px', color: 'var(--text)', fontFamily: F, outline: 'none', resize: 'none', lineHeight: 1.5, minHeight: '40px', maxHeight: '100px', transition: 'border-color .15s', boxSizing: 'border-box' }}
            onFocus={e => e.target.style.borderColor = VG(0.4)}
            onBlur={e => e.target.style.borderColor = 'var(--border)'}
          />
          {draft.length > 1500 && (
            <span style={{ position: 'absolute', right: '10px', bottom: '4px', fontSize: '10px', color: draft.length > 1900 ? RED : 'var(--muted2)' }}>{draft.length}/2000</span>
          )}
        </div>
        <button onClick={send} disabled={!draft.trim() || sending} className="cr-btn" style={{
          width: '40px', height: '40px', borderRadius: '12px',
          background: draft.trim() ? V : 'var(--bg)', border: draft.trim() ? 'none' : '1px solid var(--border)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          cursor: draft.trim() && !sending ? 'pointer' : 'default', flexShrink: 0, transition: 'all .15s',
        }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={draft.trim() ? '#fff' : 'var(--muted2)'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 2L11 13"/><path d="M22 2L15 22L11 13L2 9L22 2Z"/></svg>
        </button>
      </div>
    </div>
  )
}

/* ── Detail modal ──────────────────────────────────────────────────────────── */
const DetailModal = ({ campaign: c, onClose, onConfirm, onComplete, onDecline, onChat, busy }) => {
  const ch = c.channel || {}
  const adv = c.advertiser || {}

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px', backdropFilter: 'blur(6px)' }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div style={{
        background: 'var(--surface)', borderRadius: '24px', width: '100%', maxWidth: '720px',
        maxHeight: '92vh', overflow: 'hidden', display: 'flex', flexDirection: 'column',
        boxShadow: '0 32px 80px rgba(0,0,0,0.35)', animation: 'adf-modal .25s ease',
      }}>
        {/* Header gradient */}
        <div style={{
          padding: '24px 28px 20px', borderBottom: '1px solid var(--border)',
          background: `linear-gradient(135deg, ${VG(0.04)} 0%, transparent 100%)`,
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '18px' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
                <h2 style={{ fontFamily: D, fontSize: '22px', fontWeight: 800, color: 'var(--text)' }}>{ch.nombreCanal || 'Canal'}</h2>
                <StatusBadge status={c.status} />
                {(() => { const dl = getDeadline(c); return dl ? (
                  <span style={{ background: `${dl.color}12`, color: dl.color, borderRadius: '8px', padding: '4px 10px', fontSize: '11px', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '4px', animation: dl.urgent ? 'adf-pulse 1.5s infinite' : 'none' }}>
                    ⏱ {dl.text}
                  </span>
                ) : null })()}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Av name={adv.nombre || adv.email || 'A'} color={BLUE} size={22} />
                <span style={{ fontSize: '13px', color: 'var(--muted)' }}>
                  <strong style={{ color: 'var(--text)' }}>{adv.nombre || adv.email || 'Anunciante'}</strong> · {ch.plataforma || ''} · {fmtDate(c.createdAt)}
                </span>
              </div>
            </div>
            <button onClick={onClose} style={{ background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: '10px', padding: '8px 14px', cursor: 'pointer', color: 'var(--muted)', fontSize: '13px', fontFamily: F, fontWeight: 500 }}>
              Cerrar
            </button>
          </div>

          {/* Pipeline */}
          <MiniPipeline status={c.status} />
        </div>

        {/* Scrollable body */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '24px 28px', display: 'flex', flexDirection: 'column', gap: '18px' }}>

          {/* Financial cards */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div style={{
              background: `${OK}08`, border: `1px solid ${OK}20`, borderRadius: '14px', padding: '18px',
              display: 'flex', alignItems: 'center', gap: '14px',
            }}>
              <div style={{ width: '44px', height: '44px', borderRadius: '12px', background: `${OK}15`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <span style={{ fontSize: '20px' }}>💰</span>
              </div>
              <div>
                <div style={{ fontSize: '11px', color: OK, fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Tu pago neto</div>
                <div style={{ fontFamily: D, fontSize: '26px', fontWeight: 800, color: OK, letterSpacing: '-0.02em' }}>€{(c.netAmount || 0).toFixed(2)}</div>
              </div>
            </div>
            <div style={{
              background: `${BLUE}08`, border: `1px solid ${BLUE}20`, borderRadius: '14px', padding: '18px',
              display: 'flex', alignItems: 'center', gap: '14px',
            }}>
              <div style={{ width: '44px', height: '44px', borderRadius: '12px', background: `${BLUE}15`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <span style={{ fontSize: '20px' }}>🔒</span>
              </div>
              <div>
                <div style={{ fontSize: '11px', color: BLUE, fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.04em' }}>En escrow</div>
                <div style={{ fontFamily: D, fontSize: '26px', fontWeight: 800, color: BLUE, letterSpacing: '-0.02em' }}>€{c.price}</div>
                <div style={{ fontSize: '11px', color: 'var(--muted)' }}>Comision: €{(c.commissionAmount || 0).toFixed(2)} ({Math.round((c.commissionRate || 0) * 100)}%)</div>
              </div>
            </div>
          </div>

          {/* Ad content */}
          <div style={{ background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: '16px', padding: '18px', borderLeft: `3px solid ${V}` }}>
            <div style={{ fontSize: '11px', fontWeight: 600, color: V, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '10px' }}>Contenido del anuncio</div>
            <div style={{ fontSize: '14px', color: 'var(--text)', lineHeight: 1.65, whiteSpace: 'pre-wrap', marginBottom: '10px' }}>{c.content}</div>
            {c.targetUrl && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginTop: '4px' }}>
                <div style={{ fontSize: '11px', color: 'var(--muted)', fontWeight: 600 }}>URL del anunciante:</div>
                <a href={c.targetUrl} target="_blank" rel="noreferrer" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '12px', color: V, textDecoration: 'none', fontWeight: 500 }}>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
                  {c.targetUrl}
                </a>
                {c.trackingUrl && c.trackingUrl !== c.targetUrl && (
                  <div style={{ marginTop: '8px', padding: '10px 14px', background: 'var(--accent-dim, rgba(139,92,246,0.06))', border: '1px solid var(--accent-border, rgba(139,92,246,0.19))', borderRadius: '10px' }}>
                    <div style={{ fontSize: '11px', color: 'var(--accent)', fontWeight: 700, marginBottom: '4px' }}>🔗 Link de tracking (usa ESTE en la publicacion):</div>
                    <code style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text)', fontFamily: 'var(--font-mono, monospace)', wordBreak: 'break-all' }}>
                      {c.trackingUrl}
                    </code>
                    <button
                      onClick={() => { navigator.clipboard?.writeText(c.trackingUrl) }}
                      style={{ marginLeft: '8px', background: 'none', border: 'none', color: 'var(--accent)', cursor: 'pointer', fontSize: '11px', fontWeight: 600 }}
                    >Copiar</button>
                    <div style={{ fontSize: '10px', color: 'var(--muted)', marginTop: '6px' }}>
                      Este link redirige a la URL del anunciante y registra clicks unicos, CPC y alcance automaticamente.
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Media attachments */}
          {c.mediaUrls?.length > 0 && (
            <div style={{ background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: '16px', padding: '18px' }}>
              <div style={{ fontSize: '11px', fontWeight: 600, color: V, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '12px' }}>Archivos adjuntos</div>
              <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                {c.mediaUrls.map((url, i) => (
                  <a key={i} href={url} target="_blank" rel="noreferrer" style={{
                    display: 'flex', alignItems: 'center', gap: '8px',
                    background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '10px',
                    padding: '8px 14px', fontSize: '12px', color: V, textDecoration: 'none', fontWeight: 500,
                    transition: 'border-color .15s',
                  }}
                    onMouseEnter={e => e.currentTarget.style.borderColor = VG(0.4)}
                    onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border)'}
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"/></svg>
                    Archivo {i + 1}
                  </a>
                ))}
              </div>
            </div>
          )}

          {/* Brief structured */}
          {(c.objective || c.audience || c.deliverables) && (
            <div style={{ background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: '16px', padding: '18px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ fontSize: '11px', fontWeight: 600, color: V, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Brief de la campana</div>
              {c.objective && (
                <div>
                  <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--muted)', marginBottom: '3px' }}>Objetivo</div>
                  <div style={{ fontSize: '13px', color: 'var(--text)', lineHeight: 1.5 }}>{c.objective}</div>
                </div>
              )}
              {c.audience && (
                <div>
                  <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--muted)', marginBottom: '3px' }}>Audiencia objetivo</div>
                  <div style={{ fontSize: '13px', color: 'var(--text)', lineHeight: 1.5 }}>{c.audience}</div>
                </div>
              )}
              {c.deliverables && (
                <div>
                  <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--muted)', marginBottom: '3px' }}>Entregables</div>
                  <div style={{ fontSize: '13px', color: 'var(--text)', lineHeight: 1.5 }}>{c.deliverables}</div>
                </div>
              )}
            </div>
          )}

          {/* Message preview (how it will look in the channel) */}
          {c.status === 'PAID' && c.content && (
            <div style={{ background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: '16px', padding: '18px' }}>
              <div style={{ fontSize: '11px', fontWeight: 600, color: V, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '12px' }}>
                👁️ Vista previa del mensaje
              </div>
              <div style={{ background: 'var(--surface)', borderRadius: '12px', padding: '16px', border: '1px solid var(--border)' }}>
                <div style={{ fontSize: '14px', color: 'var(--text)', lineHeight: 1.7, whiteSpace: 'pre-wrap' }}>
                  {c.content}
                  {c.targetUrl && (
                    <span style={{ display: 'block', marginTop: '8px' }}>
                      <span style={{ color: V, textDecoration: 'underline' }}>
                        {c.trackingUrl || c.targetUrl}
                      </span>
                    </span>
                  )}
                </div>
              </div>
              <div style={{ fontSize: '11px', color: 'var(--muted)', marginTop: '8px' }}>
                Asi se vera el mensaje en tu canal. Puedes editar antes de publicar chateando con el anunciante.
              </div>
            </div>
          )}

          {/* Chat */}
          <ChatPanel campaign={c} onSent={onChat} />

          {/* Actions */}
          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
            {c.status === 'PAID' && (
              <>
                <button onClick={() => onConfirm(c._id)} disabled={busy} className="cr-btn" style={{
                  flex: 1, background: OK, color: '#fff', border: 'none', borderRadius: '14px',
                  padding: '16px', fontSize: '15px', fontWeight: 700, fontFamily: F,
                  cursor: busy ? 'not-allowed' : 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px',
                  boxShadow: `0 6px 24px ${OK}35`, transition: 'all .15s',
                }}>
                  {busy ? (
                    <div style={{ animation: 'adf-pulse 1s infinite' }}>Procesando...</div>
                  ) : (
                    <>
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
                      Confirmar publicacion
                    </>
                  )}
                </button>
                <button onClick={() => { if (window.confirm('¿Seguro que deseas rechazar esta solicitud? El pago sera devuelto al anunciante.')) onDecline(c._id) }} disabled={busy} style={{
                  background: 'transparent', color: RED, border: `1.5px solid ${RED}40`, borderRadius: '14px',
                  padding: '16px 24px', fontSize: '14px', fontWeight: 600, fontFamily: F,
                  cursor: busy ? 'not-allowed' : 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                  transition: 'all .15s',
                }}
                  onMouseEnter={e => { e.currentTarget.style.background = `${RED}08`; e.currentTarget.style.borderColor = RED }}
                  onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.borderColor = `${RED}40` }}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={RED} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                  Rechazar
                </button>
              </>
            )}
            {c.status === 'PUBLISHED' && (
              <>
              {c.delivery && <DeliveryBadge delivery={c.delivery} />}
              <button onClick={() => onComplete(c._id)} disabled={busy} className="cr-btn" style={{
                flex: 1, background: V, color: '#fff', border: 'none', borderRadius: '14px',
                padding: '16px', fontSize: '15px', fontWeight: 700, fontFamily: F,
                cursor: busy ? 'not-allowed' : 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px',
                boxShadow: `0 6px 24px ${VG(0.35)}`, transition: 'all .15s',
              }}>
                {busy ? 'Procesando...' : 'Marcar como completada'}
              </button>
              </>
            )}
            {c.status === 'CANCELLED' && (
              <div style={{
                flex: 1, background: `${RED}08`, border: `1px solid ${RED}20`,
                borderRadius: '14px', padding: '16px', textAlign: 'center',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px',
              }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={RED} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                <div>
                  <div style={{ fontSize: '14px', fontWeight: 700, color: RED }}>Rechazada</div>
                  <div style={{ fontSize: '12px', color: 'var(--muted)' }}>Pago devuelto al anunciante</div>
                </div>
              </div>
            )}
            {c.status === 'COMPLETED' && (
              <div style={{
                flex: 1, background: `${OK}08`, border: `1px solid ${OK}20`,
                borderRadius: '14px', padding: '16px', textAlign: 'center',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px',
              }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={OK} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
                <div>
                  <div style={{ fontSize: '14px', fontWeight: 700, color: OK }}>Completada</div>
                  <div style={{ fontSize: '12px', color: 'var(--muted)' }}>Pago de €{(c.netAmount || 0).toFixed(2)} liberado</div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════════════════════════
   MAIN
   ═══════════════════════════════════════════════════════════════════════════════ */
const TABS = ['Todas', 'Pendientes', 'Publicadas', 'Completadas', 'Rechazadas']

export default function CreatorRequestsPage() {
  const [tab, setTab] = useState('Todas')
  const [campaigns, setCampaigns] = useState([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState(null)
  const [busy, setBusy] = useState(false)
  const [fetchError, setFetchError] = useState(null)
  const [retryKey, setRetryKey] = useState(0)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const r = await apiService.getCreatorCampaigns()
      if (r?.success && Array.isArray(r.data)) setCampaigns(r.data)
    } catch {
      setFetchError('No se pudieron cargar los datos. Verifica tu conexion.')
    }
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load, retryKey])

  const filtered = campaigns.filter(c => {
    if (tab === 'Todas') return true
    return STATUS_CFG[c.status]?.tab === tab
  })
  const tabCount = (t) => t === 'Todas' ? campaigns.length : campaigns.filter(c => STATUS_CFG[c.status]?.tab === t).length

  const [actionError, setActionError] = useState(null)

  const doAction = async (id, apiFn, expectedStatus) => {
    setBusy(true)
    setActionError(null)
    try {
      const r = await apiFn(id)
      if (r?.success) {
        await load()
        // Refresh selected campaign with fresh data from the reloaded list
        setCampaigns(prev => {
          const fresh = prev.find(c => c._id === id)
          if (fresh) setSelected(s => s?._id === id ? fresh : s)
          return prev
        })
      } else {
        setActionError(r?.message || 'Error al procesar la accion')
      }
    } catch {
      setActionError('Error de conexion. Intenta de nuevo.')
    }
    setBusy(false)
  }

  const doConfirm = (id) => doAction(id, apiService.confirmCampaign.bind(apiService), 'PUBLISHED')
  const doComplete = (id) => doAction(id, apiService.completeCampaign.bind(apiService), 'COMPLETED')
  const doDecline = (id) => doAction(id, apiService.cancelCampaign.bind(apiService), 'CANCELLED')
  const doChat = (updated) => {
    setCampaigns(prev => prev.map(c => c._id === updated._id ? updated : c))
    setSelected(updated)
  }

  const pending = campaigns.filter(c => c.status === 'PAID').length
  const published = campaigns.filter(c => c.status === 'PUBLISHED').length
  const earned = campaigns.filter(c => c.status === 'COMPLETED').reduce((s, c) => s + (c.netAmount || 0), 0)
  const declined = campaigns.filter(c => c.status === 'CANCELLED').length

  return (
    <div style={{ fontFamily: F, display: 'flex', flexDirection: 'column', gap: '24px', maxWidth: '1060px' }}>
      <style>{CSS}</style>

      {/* Header */}
      <div>
        <h1 style={{ fontFamily: D, fontSize: '28px', fontWeight: 800, color: 'var(--text)', letterSpacing: '-0.04em', marginBottom: '6px' }}>
          Solicitudes
        </h1>
        <p style={{ fontSize: '14px', color: 'var(--muted)', lineHeight: 1.5 }}>
          Revisa campanas contratadas, chatea con anunciantes y confirma publicaciones.
        </p>
      </div>

      {fetchError && <ErrorBanner message={fetchError} onRetry={() => { setFetchError(null); setRetryKey(k => k + 1) }} />}
      {actionError && <ErrorBanner message={actionError} onRetry={() => setActionError(null)} />}

      {/* KPIs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '14px' }}>
        {[
          { label: 'Pendientes', val: pending, color: BLUE, icon: '📥', sub: 'Requieren accion' },
          { label: 'En vivo', val: published, color: OK, icon: '📢', sub: 'Publicadas ahora' },
          { label: 'Ganado', val: `€${earned.toFixed(2)}`, color: V, icon: '💰', sub: 'Total completado' },
          { label: 'Rechazadas', val: declined, color: RED, icon: '✕', sub: 'Devueltas' },
        ].map(({ label, val, color, icon, sub }) => (
          <div key={label} style={{
            background: 'var(--surface)', border: '1px solid var(--border)',
            borderRadius: '16px', padding: '20px',
            display: 'flex', alignItems: 'center', gap: '14px',
            transition: 'border-color .15s, box-shadow .15s',
          }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = `${color}40`; e.currentTarget.style.boxShadow = `0 4px 16px ${color}10` }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.boxShadow = 'none' }}
          >
            <div style={{
              width: '44px', height: '44px', borderRadius: '12px',
              background: `${color}10`, border: `1px solid ${color}20`,
              display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px', flexShrink: 0,
            }}>{icon}</div>
            <div>
              <div style={{ fontSize: '11px', color: 'var(--muted)', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.04em' }}>{label}</div>
              <div style={{ fontFamily: D, fontSize: '24px', fontWeight: 800, color, letterSpacing: '-0.02em', lineHeight: 1.1 }}>{val}</div>
              <div style={{ fontSize: '11px', color: 'var(--muted)', marginTop: '2px' }}>{sub}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '2px', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '12px', padding: '3px', overflowX: 'auto', WebkitOverflowScrolling: 'touch', scrollbarWidth: 'none' }}>
        {TABS.map(t => {
          const active = tab === t
          return (
            <button key={t} onClick={() => setTab(t)} style={{
              background: active ? V : 'transparent', color: active ? '#fff' : 'var(--muted)',
              border: 'none', borderRadius: '9px', padding: '8px 14px', fontSize: '13px',
              fontWeight: active ? 600 : 400, cursor: 'pointer', fontFamily: F,
              transition: 'all .18s', display: 'flex', alignItems: 'center', gap: '6px',
              whiteSpace: 'nowrap', flex: '0 0 auto',
            }}>
              {t}
              <span style={{
                background: active ? 'rgba(255,255,255,0.2)' : 'var(--bg)',
                borderRadius: '6px', padding: '1px 6px', fontSize: '11px', fontWeight: 600, minWidth: '18px', textAlign: 'center',
              }}>{tabCount(t)}</span>
            </button>
          )
        })}
      </div>

      {/* List */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '80px 20px' }}>
          <div style={{ width: '40px', height: '40px', borderRadius: '12px', background: VG(0.08), display: 'inline-flex', alignItems: 'center', justifyContent: 'center', marginBottom: '16px', animation: 'adf-pulse 1.5s infinite' }}>
            <span style={{ fontSize: '18px' }}>📥</span>
          </div>
          <div style={{ fontSize: '14px', color: 'var(--muted)' }}>Cargando solicitudes...</div>
        </div>
      ) : filtered.length === 0 ? (
        <div style={{
          textAlign: 'center', padding: '80px 20px',
          background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '20px',
        }}>
          <div style={{ width: '64px', height: '64px', borderRadius: '18px', background: VG(0.06), border: `1px solid ${VG(0.1)}`, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', marginBottom: '18px', fontSize: '28px' }}>📭</div>
          <div style={{ fontFamily: D, fontSize: '18px', fontWeight: 700, color: 'var(--text)', marginBottom: '8px' }}>Sin solicitudes</div>
          <div style={{ fontSize: '14px', color: 'var(--muted)', maxWidth: '340px', margin: '0 auto', lineHeight: 1.5 }}>
            {tab === 'Todas'
              ? 'Cuando un anunciante contrate uno de tus canales, la solicitud aparecera aqui.'
              : 'No hay solicitudes en esta categoria.'}
          </div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {filtered.map(c => {
            const chName = c.channel?.nombreCanal || 'Canal'
            const advName = c.advertiser?.nombre || c.advertiser?.email || 'Anunciante'
            const chatLen = (c.chat || []).length
            const advMsgs = (c.chat || []).filter(m => m.senderRole === 'advertiser').length
            const cfg = STATUS_CFG[c.status] || {}

            return (
              <div key={c._id} className="cr-row" onClick={() => setSelected(c)}
                style={{
                  background: 'var(--surface)',
                  border: `1px solid ${c.status === 'PAID' ? `${BLUE}30` : 'var(--border)'}`,
                  borderRadius: '16px', padding: '18px 20px', cursor: 'pointer',
                  transition: 'all .15s ease', animation: 'adf-in .2s ease',
                  position: 'relative',
                }}
              >
                {/* Left accent */}
                <div style={{ position: 'absolute', left: 0, top: '12px', bottom: '12px', width: '3px', borderRadius: '0 3px 3px 0', background: cfg.color || BLUE, opacity: 0.5 }} />

                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '16px' }}>
                  <div style={{ display: 'flex', gap: '14px', flex: 1, minWidth: 0 }}>
                    <Av name={advName} color={BLUE} size={40} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', marginBottom: '4px' }}>
                        <span style={{ fontSize: '15px', fontWeight: 600, color: 'var(--text)', fontFamily: D }}>{chName}</span>
                        <StatusBadge status={c.status} />
                        {c.type === 'auto' && <span style={{ background: VG(0.1), color: V, borderRadius: '6px', padding: '2px 7px', fontSize: '10px', fontWeight: 700 }}>Auto</span>}
                        {(() => { const dl = getDeadline(c); return dl ? (
                          <span style={{ background: `${dl.color}12`, color: dl.color, borderRadius: '6px', padding: '2px 8px', fontSize: '10px', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '3px', animation: dl.urgent ? 'adf-pulse 1.5s infinite' : 'none' }}>⏱ {dl.text}</span>
                        ) : null })()}
                      </div>
                      <div style={{ fontSize: '12px', color: 'var(--muted)', marginBottom: '6px' }}>
                        <strong style={{ color: 'var(--text)', fontWeight: 500 }}>{advName}</strong> · {c.channel?.plataforma || ''} · {fmtDate(c.createdAt)}
                      </div>
                      <div style={{ fontSize: '12px', color: 'var(--muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {c.content}
                      </div>
                      {chatLen > 0 && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginTop: '6px', color: V, fontSize: '11px', fontWeight: 500 }}>
                          💬 {chatLen} mensaje{chatLen > 1 ? 's' : ''}
                          {advMsgs > 0 && <span style={{ background: BLUE, color: '#fff', borderRadius: '8px', padding: '1px 6px', fontSize: '10px', fontWeight: 700, marginLeft: '4px' }}>{advMsgs} nuevo{advMsgs > 1 ? 's' : ''}</span>}
                        </div>
                      )}
                    </div>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '6px', flexShrink: 0 }}>
                    <span style={{ fontFamily: D, fontSize: '20px', fontWeight: 800, color: OK, letterSpacing: '-0.02em' }}>€{(c.netAmount || 0).toFixed(2)}</span>
                    <span style={{ fontSize: '10px', color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.03em' }}>tu pago</span>
                    {c.status === 'PAID' && (
                      <button onClick={e => { e.stopPropagation(); doConfirm(c._id) }}
                        className="cr-btn" style={{
                          background: OK, border: 'none', borderRadius: '10px', padding: '8px 16px',
                          fontSize: '12px', fontWeight: 600, color: '#fff', cursor: 'pointer', fontFamily: F,
                          boxShadow: `0 3px 10px ${OK}30`, transition: 'all .15s',
                          display: 'flex', alignItems: 'center', gap: '5px',
                        }}>
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                        Confirmar
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Modal */}
      {selected && (
        <DetailModal
          campaign={selected}
          onClose={() => setSelected(null)}
          onConfirm={doConfirm}
          onComplete={doComplete}
          onDecline={doDecline}
          onChat={doChat}
          busy={busy}
        />
      )}
    </div>
  )
}
