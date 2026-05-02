import React, { useState, useEffect, useMemo, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Inbox, Search, Filter, Send, Paperclip, Star, Archive,
  CheckCircle2, XCircle, Clock, Sparkles, ChevronLeft,
  MoreVertical, MessageSquare, AlertTriangle, Zap, Wallet,
  Building2, Eye, ArrowRight, Smile, FileText, Radio,
} from 'lucide-react'
import { useAuth } from '../../../../auth/AuthContext'
import apiService from '../../../../services/api'
import { FONT_BODY as F, FONT_DISPLAY as D, GREEN, greenAlpha, OK, WARN, ERR, BLUE } from '../../../theme/tokens'

const ACCENT = GREEN
const ga = greenAlpha
const fmtEur = (n) => `€${Math.round(Number(n) || 0).toLocaleString('es')}`

const STATUS_CFG = {
  pendiente:  { color: WARN, label: 'Pendiente'  },
  aceptada:   { color: OK,   label: 'Aceptada'   },
  rechazada:  { color: ERR,  label: 'Rechazada'  },
  PUBLISHED:  { color: OK,   label: 'Publicada'  },
  COMPLETED:  { color: '#94a3b8', label: 'Completada' },
  PAID:       { color: BLUE, label: 'Pagada'     },
  DRAFT:      { color: WARN, label: 'Borrador'   },
}

const QUICK_REPLIES = [
  { label: 'Aceptar',          tone: OK,   text: 'Hola, gracias por la propuesta. La acepto y publico en las próximas {hours}h. Te confirmo cuando esté arriba.' },
  { label: 'Pedir info',       tone: BLUE, text: 'Hola, necesito un poco más de contexto antes de aceptar. ¿Tenéis ejemplos de campañas anteriores y la creatividad final lista?' },
  { label: 'Negociar precio',  tone: WARN, text: 'Hola, gracias por contactar. Para este formato y mi audiencia mi tarifa es €{price}. ¿Encaja en vuestro presupuesto?' },
  { label: 'Rechazar (cordial)', tone: ERR, text: 'Hola, gracias por pensar en mí. Por temas de calendario / encaje no podemos seguir adelante en esta ocasión. Para otra vez será.' },
  { label: 'Reagendar',        tone: '#8B5CF6', text: 'Hola, esta semana lo tengo lleno. ¿Os encajaría publicar el {date}? Mi disponibilidad es mejor a partir de entonces.' },
]

/**
 * CreatorInboxPage — bandeja conversacional con threads.
 *
 * Cada solicitud (request) o campaña activa se trata como un thread.
 * Los "mensajes" se sintetizan a partir de eventos del modelo (status changes,
 * notas, ratings) — esto va a ser sustituido por mensajes reales cuando se
 * construya el modelo de chat. Mientras tanto la UX ya está completa:
 *
 *   - Lista filtrable a la izquierda (todas/sin leer/pendientes/archivadas)
 *   - Vista del thread a la derecha con mensajes y contexto del advertiser
 *   - Quick replies + smart suggestions con datos de la campaña
 *   - Search global
 *   - SLA badges (cuánto llevas sin responder)
 */
export default function CreatorInboxPage() {
  const { user } = useAuth()
  const navigate = useNavigate()

  const [requests, setRequests] = useState([])
  const [campaigns, setCampaigns] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedId, setSelectedId] = useState(null)
  const [filter, setFilter] = useState('all')
  const [search, setSearch] = useState('')
  const [draft, setDraft] = useState('')
  const [archived, setArchived] = useState(() => loadArchived())
  const [readMap, setReadMap] = useState(() => loadRead())
  const [draftsByThread, setDraftsByThread] = useState(() => loadDrafts())

  const messagesEndRef = useRef(null)

  useEffect(() => {
    let mounted = true
    Promise.all([
      apiService.getAdsForCreator?.().catch(() => null),
      apiService.getCreatorCampaigns?.().catch(() => null),
    ]).then(([adRes, cmpRes]) => {
      if (!mounted) return
      if (adRes?.success && Array.isArray(adRes.data)) setRequests(adRes.data)
      if (cmpRes?.success && Array.isArray(cmpRes.data)) setCampaigns(cmpRes.data)
      setLoading(false)
    }).catch(() => mounted && setLoading(false))
    return () => { mounted = false }
  }, [])

  // Build threads from requests + active campaigns
  const threads = useMemo(() => {
    const all = []
    requests.forEach(r => all.push(buildThread(r, 'request')))
    campaigns.filter(c => ['PAID', 'PUBLISHED', 'COMPLETED'].includes(c.status))
      .forEach(c => all.push(buildThread(c, 'campaign')))
    // Sort by last message time desc
    return all.sort((a, b) => new Date(b.lastMessageAt) - new Date(a.lastMessageAt))
  }, [requests, campaigns])

  const filtered = useMemo(() => {
    let list = threads
    if (filter === 'unread')   list = list.filter(t => !readMap[t.id])
    if (filter === 'pending')  list = list.filter(t => t.status === 'pendiente' || t.status === 'PAID')
    if (filter === 'archived') list = list.filter(t => archived[t.id])
    else                       list = list.filter(t => !archived[t.id])

    if (search.trim()) {
      const q = search.toLowerCase()
      list = list.filter(t =>
        t.advertiserName.toLowerCase().includes(q) ||
        t.subject.toLowerCase().includes(q) ||
        t.lastMessagePreview.toLowerCase().includes(q),
      )
    }
    return list
  }, [threads, filter, search, archived, readMap])

  const selected = threads.find(t => t.id === selectedId) || filtered[0]

  // Auto-mark read on selection
  useEffect(() => {
    if (selected && !readMap[selected.id]) {
      const next = { ...readMap, [selected.id]: true }
      setReadMap(next)
      saveRead(next)
    }
  }, [selected?.id])

  // Restore draft
  useEffect(() => {
    if (selected) setDraft(draftsByThread[selected.id] || '')
  }, [selected?.id])

  const updateDraft = (text) => {
    setDraft(text)
    if (selected) {
      const next = { ...draftsByThread, [selected.id]: text }
      setDraftsByThread(next)
      saveDrafts(next)
    }
  }

  const sendReply = () => {
    if (!draft.trim() || !selected) return
    // In production this would POST to /api/messages or similar
    alert(`(Demo) Mensaje a enviar a ${selected.advertiserName}:\n\n${draft}`)
    const next = { ...draftsByThread }
    delete next[selected.id]
    setDraftsByThread(next)
    saveDrafts(next)
    setDraft('')
  }

  const useTemplate = (tpl) => {
    if (!selected) return
    const text = tpl.text
      .replace('{hours}', '24')
      .replace('{price}', String(selected.price || 80))
      .replace('{date}', new Date(Date.now() + 7 * 86400000).toLocaleDateString('es', { day: 'numeric', month: 'long' }))
    updateDraft(text)
  }

  const archive = (id) => {
    const next = { ...archived, [id]: !archived[id] }
    setArchived(next)
    saveArchived(next)
  }

  if (loading) return <Skeleton />

  return (
    <div style={{
      fontFamily: F, height: 'calc(100vh - 160px)',
      display: 'grid', gridTemplateColumns: '320px 1fr', gap: 0,
      background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 14,
      overflow: 'hidden',
    }} className="creator-inbox-grid">
      <style>{`
        @media (max-width: 800px) {
          .creator-inbox-grid {
            grid-template-columns: 1fr !important;
          }
          .ci-list[data-mobile-hidden="true"] { display: none !important; }
          .ci-thread[data-mobile-hidden="true"] { display: none !important; }
        }
      `}</style>

      {/* ── Left: thread list ── */}
      <div className="ci-list" data-mobile-hidden={selected ? 'true' : 'false'}
        style={{ borderRight: '1px solid var(--border)', display: 'flex', flexDirection: 'column', minHeight: 0 }}>

        {/* Header */}
        <div style={{ padding: 14, borderBottom: '1px solid var(--border)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
            <h1 style={{ fontFamily: D, fontSize: 18, fontWeight: 800, color: 'var(--text)', letterSpacing: '-0.02em', margin: 0 }}>
              Inbox
            </h1>
            <span style={{
              background: ga(0.12), color: ACCENT, border: `1px solid ${ga(0.25)}`,
              borderRadius: 20, padding: '2px 8px', fontSize: 10.5, fontWeight: 700,
              fontVariantNumeric: 'tabular-nums',
            }}>
              {threads.filter(t => !readMap[t.id] && !archived[t.id]).length} sin leer
            </span>
          </div>
          {/* Search */}
          <div style={{ position: 'relative' }}>
            <Search size={12} color="var(--muted)" style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar advertiser o asunto"
              style={{
                width: '100%', boxSizing: 'border-box',
                background: 'var(--bg2)', color: 'var(--text)', border: '1px solid var(--border)',
                borderRadius: 8, padding: '7px 10px 7px 28px', fontSize: 12, fontFamily: F, outline: 'none',
              }} />
          </div>
          {/* Filter */}
          <div style={{ display: 'flex', gap: 4, marginTop: 8, overflowX: 'auto' }}>
            {[
              { id: 'all',      label: 'Todas',     count: threads.filter(t => !archived[t.id]).length },
              { id: 'unread',   label: 'Sin leer',  count: threads.filter(t => !readMap[t.id] && !archived[t.id]).length },
              { id: 'pending',  label: 'Pendientes',count: threads.filter(t => (t.status === 'pendiente' || t.status === 'PAID') && !archived[t.id]).length },
              { id: 'archived', label: 'Archivadas',count: Object.keys(archived).filter(k => archived[k]).length },
            ].map(f => {
              const active = filter === f.id
              return (
                <button key={f.id} onClick={() => setFilter(f.id)} style={{
                  background: active ? ga(0.12) : 'var(--bg2)',
                  color: active ? ACCENT : 'var(--muted)',
                  border: `1px solid ${active ? ga(0.3) : 'var(--border)'}`,
                  borderRadius: 6, padding: '4px 9px', fontSize: 11, fontWeight: active ? 700 : 500,
                  cursor: 'pointer', fontFamily: F,
                  display: 'inline-flex', alignItems: 'center', gap: 4, whiteSpace: 'nowrap',
                }}>
                  {f.label}
                  {f.count > 0 && (
                    <span style={{ fontSize: 10, color: active ? ACCENT : 'var(--muted2)', fontVariantNumeric: 'tabular-nums' }}>
                      {f.count}
                    </span>
                  )}
                </button>
              )
            })}
          </div>
        </div>

        {/* List */}
        <div style={{ flex: 1, overflowY: 'auto' }}>
          {filtered.length === 0 ? (
            <EmptyList filter={filter} />
          ) : filtered.map(t => (
            <ThreadRow key={t.id} thread={t} active={selected?.id === t.id}
              isRead={!!readMap[t.id]} isArchived={!!archived[t.id]}
              onClick={() => setSelectedId(t.id)} hasDraft={!!draftsByThread[t.id]} />
          ))}
        </div>
      </div>

      {/* ── Right: thread view ── */}
      <div className="ci-thread" data-mobile-hidden={!selected ? 'true' : 'false'}
        style={{ display: 'flex', flexDirection: 'column', minHeight: 0 }}>
        {!selected ? (
          <EmptyThreadState />
        ) : (
          <ThreadView thread={selected}
            draft={draft} onDraftChange={updateDraft} onSend={sendReply}
            onTemplate={useTemplate} onArchive={() => archive(selected.id)}
            isArchived={!!archived[selected.id]}
            onBack={() => setSelectedId(null)}
            messagesEndRef={messagesEndRef}
            navigate={navigate}
          />
        )}
      </div>
    </div>
  )
}

// ─── Thread row (sidebar list) ──────────────────────────────────────────────
function ThreadRow({ thread, active, isRead, isArchived, onClick, hasDraft }) {
  const st = STATUS_CFG[thread.status] || { color: '#94a3b8', label: thread.status }
  const sla = computeSLA(thread)

  return (
    <button onClick={onClick} style={{
      width: '100%', textAlign: 'left',
      background: active ? ga(0.08) : 'transparent',
      border: 'none', borderBottom: '1px solid var(--border)',
      borderLeft: `3px solid ${active ? ACCENT : 'transparent'}`,
      padding: '12px 14px', cursor: 'pointer', fontFamily: F,
      display: 'flex', flexDirection: 'column', gap: 4,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
        <span style={{
          fontSize: 13, fontWeight: isRead ? 500 : 700, color: 'var(--text)',
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          flex: 1, minWidth: 0,
        }}>
          {!isRead && <span style={{ display: 'inline-block', width: 7, height: 7, borderRadius: 4, background: ACCENT, marginRight: 6, verticalAlign: 'middle' }} />}
          {thread.advertiserName}
        </span>
        <span style={{ fontSize: 10, color: 'var(--muted2)', flexShrink: 0, fontVariantNumeric: 'tabular-nums' }}>
          {fmtRelTime(thread.lastMessageAt)}
        </span>
      </div>
      <div style={{ fontSize: 11.5, color: 'var(--muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
        {hasDraft && <span style={{ color: '#f59e0b', fontWeight: 700 }}>Borrador · </span>}
        {thread.subject}
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 5, flexWrap: 'wrap' }}>
        <span style={{
          background: `${st.color}15`, color: st.color, border: `1px solid ${st.color}30`,
          borderRadius: 5, padding: '1px 6px', fontSize: 9.5, fontWeight: 700,
        }}>{st.label}</span>
        {thread.price > 0 && (
          <span style={{ fontSize: 10.5, color: 'var(--text)', fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>
            {fmtEur(thread.price)}
          </span>
        )}
        {sla && (
          <span title={sla.tip} style={{
            background: `${sla.color}10`, color: sla.color, border: `1px solid ${sla.color}30`,
            borderRadius: 5, padding: '1px 6px', fontSize: 9.5, fontWeight: 700,
            display: 'inline-flex', alignItems: 'center', gap: 3,
          }}>
            <Clock size={9} /> {sla.label}
          </span>
        )}
        {isArchived && <Archive size={11} color="var(--muted2)" />}
      </div>
    </button>
  )
}

// ─── Thread view (right panel) ──────────────────────────────────────────────
function ThreadView({ thread, draft, onDraftChange, onSend, onTemplate, onArchive, isArchived, onBack, messagesEndRef, navigate }) {
  const st = STATUS_CFG[thread.status] || { color: '#94a3b8', label: thread.status }
  const suggestion = useMemo(() => smartReplySuggestion(thread), [thread])

  return (
    <>
      {/* Thread header */}
      <div style={{
        padding: '12px 18px', borderBottom: '1px solid var(--border)',
        display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0,
      }}>
        <button onClick={onBack} className="ci-back-btn" style={{
          background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 8,
          width: 30, height: 30, display: 'none', alignItems: 'center', justifyContent: 'center',
          cursor: 'pointer', color: 'var(--text)', flexShrink: 0,
        }}>
          <ChevronLeft size={14} />
        </button>
        <style>{`@media (max-width: 800px) { .ci-back-btn { display: flex !important; } }`}</style>

        <div style={{
          width: 38, height: 38, borderRadius: 10, flexShrink: 0,
          background: ga(0.12), border: `1px solid ${ga(0.25)}`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontFamily: D, fontWeight: 800, fontSize: 14, color: ACCENT,
        }}>
          {thread.advertiserName.slice(0, 2).toUpperCase()}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)' }}>
              {thread.advertiserName}
            </span>
            <span style={{
              background: `${st.color}15`, color: st.color, border: `1px solid ${st.color}30`,
              borderRadius: 20, padding: '1px 8px', fontSize: 10, fontWeight: 700,
            }}>{st.label}</span>
          </div>
          <div style={{ fontSize: 11.5, color: 'var(--muted)' }}>
            {thread.subject} {thread.channelName && <>· {thread.channelName}</>}
          </div>
        </div>
        <button onClick={onArchive} title={isArchived ? 'Desarchivar' : 'Archivar'} style={iconBtn}>
          <Archive size={13} color={isArchived ? ACCENT : 'var(--muted)'} />
        </button>
      </div>

      {/* Messages stream */}
      <div style={{ flex: 1, overflowY: 'auto', padding: 18, display: 'flex', flexDirection: 'column', gap: 8 }}>

        {/* Context card with deal info */}
        <div style={{
          background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 10,
          padding: 12, marginBottom: 10,
        }}>
          <div style={{ fontSize: 10.5, color: 'var(--muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8 }}>
            Contexto del deal
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(110px, 1fr))', gap: 10 }}>
            <ContextItem label="Importe" value={fmtEur(thread.price)} icon={Wallet} />
            {thread.netAmount > 0 && <ContextItem label="Tu parte" value={fmtEur(thread.netAmount)} icon={Wallet} accent={OK} />}
            {thread.deadline && <ContextItem label="Deadline" value={new Date(thread.deadline).toLocaleDateString('es', { day: 'numeric', month: 'short' })} icon={Clock} accent={WARN} />}
            {thread.channelName && <ContextItem label="Canal" value={thread.channelName} icon={Radio} />}
          </div>
          {thread.targetUrl && (
            <div style={{ marginTop: 10, padding: '7px 9px', background: 'var(--surface)', borderRadius: 7, fontSize: 11.5, color: 'var(--muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              🔗 {thread.targetUrl}
            </div>
          )}
        </div>

        {/* Smart suggestion */}
        {suggestion && (
          <div style={{
            background: ga(0.06), border: `1px solid ${ga(0.25)}`, borderRadius: 10,
            padding: 12, marginBottom: 6, display: 'flex', alignItems: 'flex-start', gap: 10,
          }}>
            <div style={{
              width: 28, height: 28, borderRadius: 7, flexShrink: 0,
              background: ga(0.15), border: `1px solid ${ga(0.3)}`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <Sparkles size={13} color={ACCENT} />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 11.5, fontWeight: 700, color: ACCENT, marginBottom: 3, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                Sugerencia
              </div>
              <div style={{ fontSize: 12, color: 'var(--text)', lineHeight: 1.5 }}>
                {suggestion.text}
              </div>
              {suggestion.action && (
                <button onClick={() => onTemplate({ text: suggestion.action })} style={{
                  marginTop: 6, background: ACCENT, color: '#fff', border: 'none', borderRadius: 7,
                  padding: '5px 10px', fontSize: 11, fontWeight: 700, cursor: 'pointer', fontFamily: F,
                  display: 'inline-flex', alignItems: 'center', gap: 4,
                }}>
                  Usar esta respuesta <ArrowRight size={11} />
                </button>
              )}
            </div>
          </div>
        )}

        {/* Synthesized messages */}
        {thread.messages.map((m, i) => (
          <Message key={i} message={m} isLast={i === thread.messages.length - 1} />
        ))}

        <div ref={messagesEndRef} />
      </div>

      {/* Quick replies */}
      <div style={{ padding: '8px 14px', borderTop: '1px solid var(--border)', display: 'flex', gap: 6, overflowX: 'auto', flexShrink: 0 }}>
        {QUICK_REPLIES.map(qr => (
          <button key={qr.label} onClick={() => onTemplate(qr)} style={{
            background: 'var(--bg2)', color: qr.tone, border: `1px solid ${qr.tone}30`,
            borderRadius: 18, padding: '5px 11px', fontSize: 11.5, fontWeight: 700,
            cursor: 'pointer', fontFamily: F, whiteSpace: 'nowrap', flexShrink: 0,
            display: 'inline-flex', alignItems: 'center', gap: 4,
          }}>
            {qr.label}
          </button>
        ))}
      </div>

      {/* Composer */}
      <div style={{
        padding: 14, borderTop: '1px solid var(--border)', flexShrink: 0,
        background: 'var(--bg2)',
      }}>
        <textarea value={draft} onChange={e => onDraftChange(e.target.value)}
          placeholder={`Escribe a ${thread.advertiserName}…`}
          rows={3}
          onKeyDown={e => {
            if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) { e.preventDefault(); onSend() }
          }}
          style={{
            width: '100%', boxSizing: 'border-box', resize: 'vertical',
            background: 'var(--surface)', color: 'var(--text)', border: '1px solid var(--border)',
            borderRadius: 9, padding: 11, fontSize: 13, fontFamily: F, outline: 'none',
            lineHeight: 1.5, minHeight: 70,
          }} />
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 8 }}>
          <div style={{ display: 'flex', gap: 4 }}>
            <button title="Adjuntar (próximamente)" style={iconBtn}><Paperclip size={13} /></button>
            <button title="Emoji (próximamente)" style={iconBtn}><Smile size={13} /></button>
            <button title="Plantilla (próximamente)" style={iconBtn}><FileText size={13} /></button>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: 10.5, color: 'var(--muted2)' }}>
              ⌘+Enter para enviar
            </span>
            <button onClick={onSend} disabled={!draft.trim()} style={{
              background: draft.trim() ? ACCENT : 'var(--bg2)',
              color: draft.trim() ? '#fff' : 'var(--muted2)',
              border: draft.trim() ? 'none' : '1px solid var(--border)',
              borderRadius: 9, padding: '8px 16px', fontSize: 13, fontWeight: 700,
              cursor: draft.trim() ? 'pointer' : 'not-allowed', fontFamily: F,
              display: 'inline-flex', alignItems: 'center', gap: 6,
              boxShadow: draft.trim() ? `0 4px 14px ${ga(0.35)}` : 'none',
            }}>
              <Send size={13} /> Enviar
            </button>
          </div>
        </div>
      </div>
    </>
  )
}

function Message({ message, isLast }) {
  const isCreator = message.fromCreator
  const align = isCreator ? 'flex-end' : 'flex-start'
  const bg = isCreator ? ga(0.12) : 'var(--bg2)'
  const border = isCreator ? `1px solid ${ga(0.3)}` : '1px solid var(--border)'

  return (
    <div style={{ display: 'flex', justifyContent: align }}>
      <div style={{ maxWidth: '78%', display: 'flex', flexDirection: 'column', alignItems: align }}>
        <div style={{
          background: bg, border, borderRadius: 12,
          borderBottomRightRadius: isCreator ? 4 : 12,
          borderBottomLeftRadius: isCreator ? 12 : 4,
          padding: '9px 13px', fontSize: 13, color: 'var(--text)', lineHeight: 1.5,
          whiteSpace: 'pre-wrap', wordBreak: 'break-word',
        }}>
          {message.text}
        </div>
        <div style={{ fontSize: 10, color: 'var(--muted2)', marginTop: 3, padding: '0 4px', fontVariantNumeric: 'tabular-nums' }}>
          {new Date(message.at).toLocaleString('es', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
        </div>
      </div>
    </div>
  )
}

function ContextItem({ label, value, icon: Icon, accent }) {
  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 2 }}>
        <Icon size={10} color={accent || 'var(--muted)'} />
        <span style={{ fontSize: 10, color: 'var(--muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
          {label}
        </span>
      </div>
      <div style={{ fontFamily: D, fontSize: 14, fontWeight: 700, color: accent || 'var(--text)', letterSpacing: '-0.02em', fontVariantNumeric: 'tabular-nums' }}>
        {value}
      </div>
    </div>
  )
}

// ─── Empty states ───────────────────────────────────────────────────────────
function EmptyList({ filter }) {
  const msg = {
    unread:   { title: 'No hay sin leer', body: 'Todas leídas. Buen trabajo.' },
    pending:  { title: 'Sin pendientes',  body: 'No tienes solicitudes esperando respuesta.' },
    archived: { title: 'Sin archivadas',  body: 'Aquí verás los threads que archives.' },
    all:      { title: 'Bandeja vacía',   body: 'Cuando un advertiser te contacte aparecerá aquí.' },
  }[filter] || { title: 'Sin resultados', body: '' }
  return (
    <div style={{
      flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      gap: 8, padding: 24, textAlign: 'center', color: 'var(--muted)', fontSize: 12,
    }}>
      <Inbox size={28} color="var(--muted2)" />
      <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)' }}>{msg.title}</div>
      <div style={{ fontSize: 11.5, lineHeight: 1.5, maxWidth: 220 }}>{msg.body}</div>
    </div>
  )
}

function EmptyThreadState() {
  return (
    <div style={{
      flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      gap: 12, padding: 40, textAlign: 'center',
    }}>
      <MessageSquare size={36} color="var(--muted2)" />
      <h3 style={{ fontFamily: D, fontSize: 16, fontWeight: 700, color: 'var(--text)', margin: 0 }}>
        Selecciona un thread
      </h3>
      <p style={{ fontSize: 12.5, color: 'var(--muted)', maxWidth: 360, margin: 0, lineHeight: 1.5 }}>
        A la izquierda encuentras todos los threads abiertos con advertisers. Click para verlos.
      </p>
    </div>
  )
}

function Skeleton() {
  return (
    <div style={{
      fontFamily: F, height: 'calc(100vh - 160px)',
      display: 'grid', gridTemplateColumns: '320px 1fr',
      background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 14, overflow: 'hidden',
    }}>
      <div style={{ borderRight: '1px solid var(--border)' }}>
        {[1, 2, 3, 4, 5].map(i => (
          <div key={i} style={{ height: 70, margin: 8, background: 'var(--bg2)', borderRadius: 8, animation: 'pulse 1.5s ease infinite' }} />
        ))}
      </div>
      <div style={{ padding: 18 }}>
        <div style={{ height: 200, background: 'var(--bg2)', borderRadius: 10, animation: 'pulse 1.5s ease infinite' }} />
      </div>
    </div>
  )
}

// ─── Build threads from request/campaign data ───────────────────────────────
// Synthesizes a conversation from status events + notes until real chat exists.

function buildThread(item, kind) {
  const advertiserName = item.advertiserName || item.advertiser?.nombre || item.anunciante || 'Advertiser'
  const channelName = typeof item.channel === 'object'
    ? (item.channel?.nombreCanal || item.channel?.identificadorCanal)
    : item.channel || item.canal
  const id = `${kind}-${item._id || item.id}`
  const status = item.status

  const messages = []
  // Initial proposal
  messages.push({
    fromCreator: false,
    text: item.message || item.notes
      || `Hola, queremos publicar en ${channelName || 'tu canal'}. Importe: €${item.price || item.budget || 0}. ¿Qué te parece?`,
    at: item.createdAt,
  })

  // Status events as messages
  if (item.acceptedAt) {
    messages.push({ fromCreator: true, text: 'Acepto la propuesta. Procedo cuando tengas el pago listo.', at: item.acceptedAt })
  }
  if (status === 'PAID' || item.paidAt) {
    messages.push({ fromCreator: false, text: 'Pago realizado. Te paso la creatividad final.', at: item.paidAt || item.updatedAt })
  }
  if (item.publishedAt) {
    messages.push({ fromCreator: true, text: 'Publicado. Te mando capturas en cuanto tengamos métricas iniciales.', at: item.publishedAt })
  }
  if (status === 'COMPLETED') {
    messages.push({ fromCreator: false, text: 'Campaña completada. Gracias por el trabajo!', at: item.completedAt })
  }
  if (item.testimonial) {
    messages.push({ fromCreator: false, text: item.testimonial, at: item.completedAt || item.updatedAt })
  }

  return {
    id, kind, status,
    advertiserName,
    subject: item.title || `Campaña en ${channelName || 'tu canal'}`,
    channelName,
    price: item.price || item.budget || 0,
    netAmount: item.netAmount,
    deadline: item.deadline,
    targetUrl: item.targetUrl,
    messages,
    lastMessageAt: messages[messages.length - 1].at || item.updatedAt || item.createdAt,
    lastMessagePreview: (messages[messages.length - 1].text || '').slice(0, 80),
    raw: item,
  }
}

function smartReplySuggestion(thread) {
  if (thread.status === 'pendiente') {
    const hours = Math.round((Date.now() - new Date(thread.lastMessageAt).getTime()) / 3600000)
    if (hours > 24) {
      return {
        text: `Llevas ${hours}h sin responder. Los advertisers cierran rápido si no reciben señales. Considera al menos acusar recibo.`,
        action: 'Hola, recibido. Lo reviso hoy y te confirmo antes de las próximas horas.',
      }
    }
    return {
      text: `Propuesta nueva. Si te encaja, acepta cuanto antes — la velocidad de respuesta sube tu rating.`,
      action: `Hola, gracias por la propuesta. La acepto y publico en las próximas 24h. Te confirmo cuando esté arriba.`,
    }
  }
  if (thread.status === 'PAID') {
    return {
      text: `El advertiser ya ha pagado. Publica cuanto antes — un retraso de >24h afecta tu CAS.`,
      action: 'Pago confirmado. Programo publicación para hoy mismo. Te aviso en cuanto esté arriba.',
    }
  }
  if (thread.status === 'PUBLISHED') {
    return {
      text: 'Campaña publicada. En 24-48h envía métricas iniciales — los advertisers valoran proactividad.',
      action: 'Hola, paso métricas iniciales: vistas X, clicks Y. Te mando captura adjunta.',
    }
  }
  return null
}

function computeSLA(thread) {
  if (thread.status !== 'pendiente') return null
  const hours = (Date.now() - new Date(thread.lastMessageAt).getTime()) / 3600000
  if (hours > 48) return { label: '> 2d', color: ERR, tip: 'Más de 48h sin responder. Riesgo alto de perder al advertiser.' }
  if (hours > 24) return { label: '> 1d', color: '#f59e0b', tip: 'Más de 24h sin responder. Conviene acusar recibo.' }
  if (hours > 6)  return { label: `${Math.round(hours)}h`, color: 'var(--muted)', tip: `Llevas ${Math.round(hours)}h sin responder.` }
  return null
}

function fmtRelTime(date) {
  if (!date) return ''
  const ms = Date.now() - new Date(date).getTime()
  if (ms < 60000) return 'ahora'
  const min = Math.floor(ms / 60000)
  if (min < 60) return `${min}m`
  const hr = Math.floor(min / 60)
  if (hr < 24) return `${hr}h`
  const d = Math.floor(hr / 24)
  if (d < 7) return `${d}d`
  return new Date(date).toLocaleDateString('es', { day: 'numeric', month: 'short' })
}

// ─── Local persistence (read state, archived, drafts) ───────────────────────
const READ_KEY = 'channelad-creator-inbox-read-v1'
const ARCH_KEY = 'channelad-creator-inbox-archived-v1'
const DRAFT_KEY = 'channelad-creator-inbox-drafts-v1'

function loadRead()    { try { return JSON.parse(localStorage.getItem(READ_KEY) || '{}')   } catch { return {} } }
function saveRead(m)   { try { localStorage.setItem(READ_KEY, JSON.stringify(m))  } catch {} }
function loadArchived(){ try { return JSON.parse(localStorage.getItem(ARCH_KEY) || '{}')   } catch { return {} } }
function saveArchived(m){ try { localStorage.setItem(ARCH_KEY, JSON.stringify(m)) } catch {} }
function loadDrafts()  { try { return JSON.parse(localStorage.getItem(DRAFT_KEY) || '{}')  } catch { return {} } }
function saveDrafts(m) { try { localStorage.setItem(DRAFT_KEY, JSON.stringify(m)) } catch {} }

const iconBtn = {
  background: 'transparent', color: 'var(--muted)', border: '1px solid transparent',
  borderRadius: 7, width: 28, height: 28, padding: 0,
  display: 'inline-flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
  flexShrink: 0,
}
