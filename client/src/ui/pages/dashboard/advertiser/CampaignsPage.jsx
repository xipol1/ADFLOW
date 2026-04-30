import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  RefreshCw, CreditCard, CheckCircle, XCircle, Eye, Clock, Zap,
  TrendingUp, MessageCircle, Send, ArrowRight, ExternalLink, Shield,
  BarChart3, ChevronRight, Copy, AlertCircle,
} from 'lucide-react'
import apiService from '../../../../services/api'
import DeliveryBadge from '../../../components/DeliveryBadge'
import {
  PURPLE, purpleAlpha, FONT_BODY, FONT_DISPLAY, OK, WARN, ERR, BLUE,
} from '../../../theme/tokens'

const SLATE = '#64748b'

/* ── Status pipeline config ────────────────────────────────────────────────── */
const PIPELINE = [
  { key: 'DRAFT',     label: 'Borrador',   icon: Clock,       color: SLATE,  desc: 'Pendiente de pago' },
  { key: 'PAID',      label: 'Pagada',     icon: Shield,      color: BLUE,   desc: 'Escrow activo' },
  { key: 'PUBLISHED', label: 'Publicada',  icon: Eye,         color: OK,     desc: 'En vivo' },
  { key: 'COMPLETED', label: 'Completada', icon: CheckCircle, color: '#6b7280', desc: 'Pago liberado' },
]

const STATUS_CFG = {
  DRAFT:     { color: SLATE,    bg: `${SLATE}14`, label: 'Borrador',   icon: Clock },
  PAID:      { color: BLUE,     bg: `${BLUE}14`,  label: 'Pagada',     icon: Shield },
  PUBLISHED: { color: OK,       bg: `${OK}14`,    label: 'Publicada',  icon: Eye },
  COMPLETED: { color: '#6b7280',bg: 'rgba(107,114,128,0.1)', label: 'Completada', icon: CheckCircle },
  CANCELLED: { color: ERR,      bg: `${ERR}14`,   label: 'Cancelada',  icon: XCircle },
}

const fmtDate = (d) => d ? new Date(d).toLocaleDateString('es', { day: 'numeric', month: 'short' }) : '-'
const fmtDateTime = (d) => d ? new Date(d).toLocaleString('es', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : ''

/* ── Animations (injected once) ────────────────────────────────────────────── */
const STYLES = `
@keyframes adf-fadein { from { opacity:0; transform:translateY(6px); } to { opacity:1; transform:none; } }
@keyframes adf-slidein { from { opacity:0; transform:translateX(8px); } to { opacity:1; transform:none; } }
@keyframes adf-pulse { 0%,100% { opacity:1; } 50% { opacity:.5; } }
@keyframes adf-scale { from { transform:scale(0.96); opacity:0; } to { transform:none; opacity:1; } }
.adf-row:hover { border-color: ${purpleAlpha(0.35)} !important; }
.adf-row-active { border-color: ${purpleAlpha(0.5)} !important; background: ${purpleAlpha(0.04)} !important; }
.adf-btn-primary { transition: all .15s ease; }
.adf-btn-primary:hover:not(:disabled) { transform: translateY(-1px); box-shadow: 0 6px 20px ${purpleAlpha(0.35)}; }
.adf-btn-secondary:hover { border-color: ${purpleAlpha(0.4)} !important; color: ${PURPLE} !important; }
`

/* ── Status badge ──────────────────────────────────────────────────────────── */
const StatusBadge = ({ status }) => {
  const cfg = STATUS_CFG[status] || STATUS_CFG.DRAFT
  const Icon = cfg.icon
  return (
    <span style={{
      background: cfg.bg, color: cfg.color,
      borderRadius: '8px', padding: '4px 10px',
      fontSize: '11px', fontWeight: 600, letterSpacing: '0.01em',
      display: 'inline-flex', alignItems: 'center', gap: '5px',
    }}>
      <Icon size={12} strokeWidth={2.5} /> {cfg.label}
    </span>
  )
}

/* ── Visual pipeline stepper ───────────────────────────────────────────────── */
const PipelineStepper = ({ currentStatus }) => {
  const currentIdx = PIPELINE.findIndex(s => s.key === currentStatus)
  const isCancelled = currentStatus === 'CANCELLED'

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '0', padding: '4px 0' }}>
      {PIPELINE.map((step, i) => {
        const Icon = step.icon
        const isActive = i === currentIdx
        const isDone = i < currentIdx
        const isFuture = i > currentIdx
        const color = isCancelled ? ERR : isDone ? OK : isActive ? step.color : 'var(--muted2)'

        return (
          <React.Fragment key={step.key}>
            {i > 0 && (
              <div style={{
                flex: 1, height: '2px', minWidth: '24px',
                background: isDone ? OK : isFuture ? 'var(--border)' : `linear-gradient(90deg, ${step.color}, var(--border))`,
                borderRadius: '1px', transition: 'background .3s',
              }} />
            )}
            <div style={{
              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px',
              position: 'relative', zIndex: 1,
            }}>
              <div style={{
                width: isActive ? '36px' : '28px', height: isActive ? '36px' : '28px',
                borderRadius: '50%',
                background: isDone || isActive ? color : 'var(--bg)',
                border: `2px solid ${isDone || isActive ? color : 'var(--border)'}`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                transition: 'all .25s ease',
                boxShadow: isActive ? `0 0 0 4px ${color}20` : 'none',
              }}>
                {isDone ? (
                  <CheckCircle size={14} color="#fff" strokeWidth={2.5} />
                ) : (
                  <Icon size={isActive ? 16 : 13} color={isActive ? '#fff' : 'var(--muted2)'} strokeWidth={2} />
                )}
              </div>
              <div style={{ textAlign: 'center' }}>
                <div style={{
                  fontSize: '11px', fontWeight: isActive ? 700 : 500,
                  color: isActive ? color : isDone ? 'var(--text)' : 'var(--muted2)',
                  whiteSpace: 'nowrap',
                }}>{step.label}</div>
                {isActive && (
                  <div style={{ fontSize: '10px', color: 'var(--muted)', marginTop: '1px' }}>{step.desc}</div>
                )}
              </div>
            </div>
          </React.Fragment>
        )
      })}
    </div>
  )
}

/* ── Avatar initial ────────────────────────────────────────────────────────── */
const Avatar = ({ name, color = PURPLE, size = 28 }) => {
  const initial = (name || '?')[0].toUpperCase()
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%',
      background: `${color}18`, border: `1.5px solid ${color}40`,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: size * 0.4, fontWeight: 700, color, flexShrink: 0,
      fontFamily: FONT_DISPLAY,
    }}>{initial}</div>
  )
}

/* ── Pro chat panel ────────────────────────────────────────────────────────── */
const ChatPanel = ({ campaign, myRole = 'advertiser' }) => {
  const [draft, setDraft] = useState('')
  const [sending, setSending] = useState(false)
  const [expanded, setExpanded] = useState(true)
  const [messages, setMessages] = useState([])
  const [chatError, setChatError] = useState('')
  const scrollRef = useRef(null)
  const inputRef = useRef(null)

  // Auto-scroll on new messages
  useEffect(() => {
    if (scrollRef.current && expanded) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages.length, expanded])

  // Load messages on mount + poll every 8 seconds
  useEffect(() => {
    if (!campaign?._id || !expanded) return
    let active = true
    const fetchMessages = async () => {
      try {
        const res = await apiService.getCampaignMessages(campaign._id)
        if (res?.success && active) setMessages(res.data || [])
      } catch (err) { console.error('CampaignsPage.fetchMessages failed:', err) }
    }
    fetchMessages()
    const poll = setInterval(fetchMessages, 8000)
    return () => { active = false; clearInterval(poll) }
  }, [campaign?._id, expanded])

  const send = async () => {
    if (!draft.trim() || sending) return
    if (draft.trim().length > 2000) {
      setChatError('El mensaje no puede superar los 2000 caracteres')
      return
    }
    setChatError('')
    setSending(true)
    try {
      const res = await apiService.sendCampaignChat(campaign._id, draft.trim())
      if (res?.success) {
        setMessages(prev => [...prev, res.data])
        setDraft('')
        setChatError('')
      } else if (res?.blocked) {
        setChatError(res.message || 'Mensaje bloqueado por el sistema de moderacion')
      } else {
        setChatError(res?.message || 'Error al enviar el mensaje')
      }
    } catch {
      setChatError('Error de conexion')
    }
    setSending(false)
    inputRef.current?.focus()
  }

  const otherRole = myRole === 'advertiser' ? 'creator' : 'advertiser'
  const otherLabel = myRole === 'advertiser' ? 'Creador' : 'Anunciante'

  return (
    <div style={{
      background: 'var(--surface)', border: '1px solid var(--border)',
      borderRadius: '16px', overflow: 'hidden',
      animation: 'adf-fadein .25s ease',
    }} onClick={e => e.stopPropagation()}>
      {/* Header */}
      <button onClick={() => setExpanded(v => !v)} style={{
        width: '100%', background: 'none', border: 'none', cursor: 'pointer',
        padding: '14px 18px', display: 'flex', alignItems: 'center', gap: '10px',
        borderBottom: expanded ? '1px solid var(--border)' : 'none',
      }}>
        <div style={{
          width: '32px', height: '32px', borderRadius: '10px',
          background: `${PURPLE}12`, display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <MessageCircle size={16} color={PURPLE} />
        </div>
        <div style={{ flex: 1, textAlign: 'left' }}>
          <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text)', fontFamily: FONT_DISPLAY }}>
            Conversacion
          </div>
          <div style={{ fontSize: '11px', color: 'var(--muted)' }}>
            {messages.length} mensaje{messages.length !== 1 ? 's' : ''} con {otherLabel.toLowerCase()}
          </div>
        </div>
        {messages.filter(m => m.senderRole === otherRole).length > 0 && (
          <span style={{
            background: BLUE, color: '#fff', borderRadius: '10px',
            padding: '2px 8px', fontSize: '10px', fontWeight: 700,
          }}>Nuevo</span>
        )}
        <ChevronRight size={16} color="var(--muted)" style={{
          transform: expanded ? 'rotate(90deg)' : 'none', transition: 'transform .2s',
        }} />
      </button>

      {expanded && (
        <>
          {/* Messages */}
          <div ref={scrollRef} style={{
            minHeight: '160px', maxHeight: '340px', overflowY: 'auto',
            padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px',
            background: 'var(--bg)',
          }}>
            {messages.length === 0 ? (
              <div style={{
                textAlign: 'center', padding: '32px 16px',
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px',
              }}>
                <div style={{
                  width: '48px', height: '48px', borderRadius: '14px',
                  background: `${PURPLE}08`, border: `1px solid ${purpleAlpha(0.1)}`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <MessageCircle size={22} color={purpleAlpha(0.3)} />
                </div>
                <div>
                  <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text)', marginBottom: '4px' }}>
                    Inicia la conversacion
                  </div>
                  <div style={{ fontSize: '12px', color: 'var(--muted)', maxWidth: '260px', lineHeight: 1.5 }}>
                    Coordina detalles de publicacion, copy, fechas y formatos con {otherLabel.toLowerCase()}
                  </div>
                </div>
              </div>
            ) : messages.map((msg, i) => {
              const isMe = msg.senderRole === myRole
              const prevMsg = messages[i - 1]
              const showAvatar = !prevMsg || prevMsg.senderRole !== msg.senderRole

              return (
                <div key={msg._id || i} style={{
                  display: 'flex', gap: '8px',
                  flexDirection: isMe ? 'row-reverse' : 'row',
                  alignItems: 'flex-end',
                  animation: 'adf-fadein .2s ease',
                  marginTop: showAvatar ? '4px' : '-4px',
                }}>
                  {showAvatar ? (
                    <Avatar name={msg.senderName || msg.senderRole} color={isMe ? PURPLE : OK} size={28} />
                  ) : (
                    <div style={{ width: '28px', flexShrink: 0 }} />
                  )}
                  <div style={{
                    maxWidth: '75%',
                    background: isMe ? PURPLE : 'var(--surface)',
                    color: isMe ? '#fff' : 'var(--text)',
                    border: isMe ? 'none' : '1px solid var(--border)',
                    borderRadius: isMe
                      ? (showAvatar ? '18px 18px 4px 18px' : '18px 4px 4px 18px')
                      : (showAvatar ? '18px 18px 18px 4px' : '4px 18px 18px 4px'),
                    padding: '10px 14px',
                    boxShadow: isMe ? `0 2px 8px ${purpleAlpha(0.2)}` : '0 1px 3px rgba(0,0,0,0.04)',
                  }}>
                    {showAvatar && (
                      <div style={{
                        fontSize: '11px', fontWeight: 700, marginBottom: '3px',
                        color: isMe ? 'rgba(255,255,255,0.7)' : purpleAlpha(0.8),
                      }}>
                        {msg.senderName || msg.senderRole}
                      </div>
                    )}
                    <div style={{ fontSize: '13px', lineHeight: 1.55, whiteSpace: 'pre-wrap' }}>
                      {msg.text || msg.message}
                    </div>
                    <div style={{
                      fontSize: '10px', marginTop: '4px', textAlign: 'right',
                      color: isMe ? 'rgba(255,255,255,0.5)' : 'var(--muted2)',
                    }}>
                      {fmtDateTime(msg.createdAt)}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>

          {/* Moderation error */}
          {chatError && (
            <div style={{
              padding: '8px 16px', background: 'rgba(248,81,73,0.08)', borderTop: '1px solid rgba(248,81,73,0.2)',
              display: 'flex', alignItems: 'center', gap: '8px',
            }}>
              <AlertCircle size={14} color="var(--red, #f85149)" />
              <span style={{ fontSize: '12px', color: 'var(--red, #f85149)', lineHeight: 1.4 }}>{chatError}</span>
              <button onClick={() => setChatError('')} style={{ marginLeft: 'auto', background: 'none', border: 'none', color: 'var(--muted)', cursor: 'pointer', fontSize: '16px', padding: '0 4px' }}>×</button>
            </div>
          )}

          {/* Input bar */}
          <div style={{
            padding: '12px 16px', borderTop: chatError ? 'none' : '1px solid var(--border)',
            display: 'flex', gap: '10px', alignItems: 'flex-end',
            background: 'var(--surface)',
          }}>
            <div style={{ flex: 1, position: 'relative' }}>
              <textarea
                ref={inputRef}
                value={draft}
                onChange={e => { setDraft(e.target.value); if (chatError) setChatError('') }}
                onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() } }}
                placeholder={`Mensaje para ${otherLabel.toLowerCase()}...`}
                rows={1}
                maxLength={2000}
                style={{
                  width: '100%', background: 'var(--bg)', border: '1px solid var(--border)',
                  borderRadius: '12px', padding: '10px 14px', fontSize: '13px',
                  color: 'var(--text)', fontFamily: FONT_BODY, outline: 'none',
                  resize: 'none', lineHeight: 1.5, minHeight: '40px', maxHeight: '100px',
                  transition: 'border-color .15s', boxSizing: 'border-box',
                }}
                onFocus={e => e.target.style.borderColor = purpleAlpha(0.4)}
                onBlur={e => e.target.style.borderColor = 'var(--border)'}
              />
              {draft.length > 1500 && (
                <span style={{
                  position: 'absolute', right: '10px', bottom: '4px',
                  fontSize: '10px', color: draft.length > 1900 ? 'var(--red, #f85149)' : 'var(--muted2)',
                }}>{draft.length}/2000</span>
              )}
            </div>
            <button
              onClick={send}
              disabled={!draft.trim() || sending}
              className="adf-btn-primary"
              style={{
                width: '40px', height: '40px', borderRadius: '12px',
                background: draft.trim() ? PURPLE : 'var(--bg)',
                border: draft.trim() ? 'none' : '1px solid var(--border)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                cursor: draft.trim() && !sending ? 'pointer' : 'default',
                flexShrink: 0,
              }}
            >
              <Send size={16} color={draft.trim() ? '#fff' : 'var(--muted2)'} />
            </button>
          </div>
        </>
      )}
    </div>
  )
}

/* ── KPI Mini card ─────────────────────────────────────────────────────────── */
const KpiCard = ({ icon: Icon, label, value, color, sub }) => (
  <div style={{
    background: 'var(--surface)', border: '1px solid var(--border)',
    borderRadius: '16px', padding: '20px',
    display: 'flex', alignItems: 'center', gap: '16px',
    transition: 'border-color .15s, box-shadow .15s',
  }}
    onMouseEnter={e => { e.currentTarget.style.borderColor = `${color}40`; e.currentTarget.style.boxShadow = `0 4px 16px ${color}10` }}
    onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.boxShadow = 'none' }}
  >
    <div style={{
      width: '44px', height: '44px', borderRadius: '12px',
      background: `${color}10`, border: `1px solid ${color}20`,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      flexShrink: 0,
    }}>
      <Icon size={20} color={color} strokeWidth={2} />
    </div>
    <div style={{ minWidth: 0 }}>
      <div style={{ fontSize: '11px', color: 'var(--muted)', fontWeight: 500, marginBottom: '2px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>{label}</div>
      <div style={{ fontFamily: FONT_DISPLAY, fontSize: '24px', fontWeight: 800, color: 'var(--text)', letterSpacing: '-0.02em', lineHeight: 1.1 }}>{value}</div>
      {sub && <div style={{ fontSize: '11px', color: 'var(--muted)', marginTop: '2px' }}>{sub}</div>}
    </div>
  </div>
)

/* ── Tabs ───────────────────────────────────────────────────────────────────── */
const TABS = ['Todas', 'Borrador', 'Pagadas', 'Publicadas', 'Completadas']
const TAB_MAP = { 'Borrador': 'DRAFT', 'Pagadas': 'PAID', 'Publicadas': 'PUBLISHED', 'Completadas': 'COMPLETED' }

/* ═══════════════════════════════════════════════════════════════════════════════
   MAIN COMPONENT
   ═══════════════════════════════════════════════════════════════════════════════ */
export default function CampaignsPage() {
  const navigate = useNavigate()
  const [campaigns, setCampaigns] = useState([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [actionError, setActionError] = useState('')
  const [tab, setTab] = useState('Todas')
  const [selected, setSelected] = useState(null)
  const [actionLoading, setActionLoading] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    setLoadError('')
    try {
      const res = await apiService.getMyCampaigns()
      if (res?.success) {
        const items = res.data?.items || res.data || []
        setCampaigns(Array.isArray(items) ? items : [])
      } else {
        setLoadError(res?.message || 'No se pudieron cargar las campañas')
      }
    } catch (err) {
      console.error('CampaignsPage.load failed:', err)
      setLoadError(err?.message || 'Error de conexión. Comprueba tu internet e inténtalo de nuevo.')
    }
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  // Auto-clear action errors after 5s
  useEffect(() => {
    if (!actionError) return
    const t = setTimeout(() => setActionError(''), 5000)
    return () => clearTimeout(t)
  }, [actionError])

  const filtered = useMemo(() => {
    if (tab === 'Todas') return campaigns
    return campaigns.filter(c => c.status === TAB_MAP[tab])
  }, [campaigns, tab])

  const tabCount = (t) => t === 'Todas' ? campaigns.length : campaigns.filter(c => c.status === TAB_MAP[t]).length

  /* Actions */
  const doAction = async (id, action) => {
    setActionLoading(id)
    setActionError('')
    try {
      const res = await action(id)
      if (res?.success) {
        await load()
      } else {
        setActionError(res?.message || 'No se pudo completar la acción')
      }
    } catch (err) {
      console.error('CampaignsPage.doAction failed:', err)
      setActionError(err?.message || 'Error de conexión. Inténtalo de nuevo.')
    }
    setActionLoading('')
  }

  const doPayWithConfirm = (campaign) => {
    if (!window.confirm(
      `¿Confirmas el pago de €${campaign.price} para activar el escrow?\n\nEl importe se retendrá hasta que la campaña se complete.`
    )) return
    doAction(campaign._id, apiService.payCampaign)
  }

  const doCompleteWithConfirm = (campaign) => {
    if (!window.confirm(
      `¿Confirmas que la campaña está completada?\n\nSe liberará el pago de €${(campaign.netAmount || 0).toFixed(2)} al creador. Esta acción no se puede deshacer.`
    )) return
    doAction(campaign._id, apiService.completeCampaign)
  }

  const handleChatUpdate = (updated) => {
    setCampaigns(prev => prev.map(c => c._id === updated._id ? updated : c))
    if (selected?._id === updated._id) setSelected(updated)
  }

  /* Stats */
  const totalSpent = campaigns.filter(c => ['PAID', 'PUBLISHED', 'COMPLETED'].includes(c.status)).reduce((s, c) => s + (c.price || 0), 0)
  const activeCount = campaigns.filter(c => ['PAID', 'PUBLISHED'].includes(c.status)).length
  const completedCount = campaigns.filter(c => c.status === 'COMPLETED').length

  const isOpen = Boolean(selected)
  const sel = selected

  return (
    <div style={{ fontFamily: FONT_BODY, display: 'flex', flexDirection: 'column', gap: '24px', maxWidth: '1200px' }}>
      <style>{STYLES}</style>

      {/* ── Header ── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '16px', flexWrap: 'wrap' }}>
        <div>
          <h1 style={{ fontFamily: FONT_DISPLAY, fontSize: '28px', fontWeight: 800, color: 'var(--text)', letterSpacing: '-0.04em', marginBottom: '6px' }}>
            Mis Campanas
          </h1>
          <p style={{ fontSize: '14px', color: 'var(--muted)', lineHeight: 1.5 }}>
            Gestiona el ciclo de vida completo: pago, publicacion, chat y resultados.
          </p>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button onClick={load} className="adf-btn-secondary" style={{
            background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '10px',
            padding: '10px 14px', cursor: 'pointer', color: 'var(--muted)',
            display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', fontFamily: FONT_BODY,
            transition: 'all .15s',
          }}>
            <RefreshCw size={14} /> Actualizar
          </button>
          <button onClick={() => navigate('/advertiser/explore')} className="adf-btn-primary" style={{
            background: PURPLE, color: '#fff', border: 'none', borderRadius: '10px',
            padding: '10px 20px', fontSize: '13px', fontWeight: 600, cursor: 'pointer',
            fontFamily: FONT_BODY, display: 'flex', alignItems: 'center', gap: '6px',
            boxShadow: `0 4px 14px ${purpleAlpha(0.3)}`,
          }}>
            <Zap size={14} /> Nueva campana
          </button>
        </div>
      </div>

      {/* ── KPI grid ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '14px' }}>
        <KpiCard icon={BarChart3} label="Total" value={campaigns.length} color={PURPLE} />
        <KpiCard icon={Eye} label="Activas" value={activeCount} color={BLUE} sub="En progreso" />
        <KpiCard icon={CheckCircle} label="Completadas" value={completedCount} color={OK} />
        <KpiCard icon={CreditCard} label="Invertido" value={`€${totalSpent.toLocaleString('es')}`} color={WARN} />
      </div>

      {/* ── Tabs ── */}
      <div style={{ display: 'flex', gap: '2px', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '12px', padding: '3px', width: 'fit-content' }}>
        {TABS.map(t => {
          const active = tab === t
          const count = tabCount(t)
          return (
            <button key={t} onClick={() => setTab(t)} style={{
              background: active ? PURPLE : 'transparent',
              color: active ? '#fff' : 'var(--muted)',
              border: 'none', borderRadius: '9px', padding: '8px 14px',
              fontSize: '13px', fontWeight: active ? 600 : 400,
              cursor: 'pointer', fontFamily: FONT_BODY,
              transition: 'all .18s ease',
              display: 'flex', alignItems: 'center', gap: '6px',
            }}>
              {t}
              <span style={{
                background: active ? 'rgba(255,255,255,0.2)' : 'var(--bg)',
                borderRadius: '6px', padding: '1px 6px', fontSize: '11px',
                fontWeight: 600, minWidth: '18px', textAlign: 'center',
              }}>{count}</span>
            </button>
          )
        })}
      </div>

      {/* ── Action error banner (transient) ── */}
      {actionError && (
        <div role="alert" style={{
          background: 'rgba(239,68,68,0.08)',
          border: '1px solid rgba(239,68,68,0.25)',
          borderRadius: '12px',
          padding: '12px 16px',
          display: 'flex', alignItems: 'center', gap: '10px',
          fontSize: '13px', color: '#ef4444', fontFamily: FONT_BODY,
        }}>
          <AlertCircle size={16} />
          <span style={{ flex: 1 }}>{actionError}</span>
          <button onClick={() => setActionError('')} style={{
            background: 'none', border: 'none', cursor: 'pointer', color: '#ef4444',
            fontSize: '18px', padding: 0, lineHeight: 1,
          }} aria-label="Cerrar">×</button>
        </div>
      )}

      {/* ── Content: Split panel ── */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '80px 20px' }}>
          <div style={{ width: '40px', height: '40px', borderRadius: '12px', background: purpleAlpha(0.08), display: 'inline-flex', alignItems: 'center', justifyContent: 'center', marginBottom: '16px', animation: 'adf-pulse 1.5s infinite' }}>
            <RefreshCw size={18} color={purpleAlpha(0.4)} />
          </div>
          <div style={{ fontSize: '14px', color: 'var(--muted)' }}>Cargando campanas...</div>
        </div>
      ) : loadError ? (
        <div role="alert" style={{
          textAlign: 'center', padding: '64px 20px',
          background: 'var(--surface)', border: '1px solid rgba(239,68,68,0.25)', borderRadius: '20px',
        }}>
          <div style={{ width: '64px', height: '64px', borderRadius: '18px', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', marginBottom: '18px' }}>
            <AlertCircle size={28} color="#ef4444" />
          </div>
          <div style={{ fontFamily: FONT_DISPLAY, fontSize: '18px', fontWeight: 700, color: 'var(--text)', marginBottom: '8px' }}>
            No pudimos cargar tus campañas
          </div>
          <div style={{ fontSize: '14px', color: 'var(--muted)', marginBottom: '24px', maxWidth: '420px', margin: '0 auto 24px', lineHeight: 1.5 }}>
            {loadError}
          </div>
          <button onClick={load} style={{
            background: PURPLE, color: '#fff', border: 'none', borderRadius: '12px',
            padding: '12px 28px', fontSize: '14px', fontWeight: 600, cursor: 'pointer',
            fontFamily: FONT_BODY, boxShadow: `0 4px 16px ${purpleAlpha(0.3)}`,
            display: 'inline-flex', alignItems: 'center', gap: '8px',
          }}>
            <RefreshCw size={14} /> Reintentar
          </button>
        </div>
      ) : filtered.length === 0 ? (
        <div style={{
          textAlign: 'center', padding: '80px 20px',
          background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '20px',
        }}>
          <div style={{ width: '64px', height: '64px', borderRadius: '18px', background: purpleAlpha(0.06), border: `1px solid ${purpleAlpha(0.1)}`, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', marginBottom: '18px' }}>
            <Zap size={28} color={purpleAlpha(0.3)} />
          </div>
          <div style={{ fontFamily: FONT_DISPLAY, fontSize: '18px', fontWeight: 700, color: 'var(--text)', marginBottom: '8px' }}>Sin campanas</div>
          <div style={{ fontSize: '14px', color: 'var(--muted)', marginBottom: '24px', maxWidth: '360px', margin: '0 auto 24px', lineHeight: 1.5 }}>
            Explora canales de creadores y lanza tu primera campana de publicidad
          </div>
          <button onClick={() => navigate('/advertiser/explore')} className="adf-btn-primary" style={{
            background: PURPLE, color: '#fff', border: 'none', borderRadius: '12px',
            padding: '12px 28px', fontSize: '14px', fontWeight: 600, cursor: 'pointer',
            fontFamily: FONT_BODY, boxShadow: `0 4px 16px ${purpleAlpha(0.3)}`,
          }}>
            Explorar canales
          </button>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: isOpen ? '380px minmax(0, 1fr)' : '1fr', gap: '16px', transition: 'grid-template-columns .3s ease' }}>

          {/* ── Left: Campaign list ── */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: isOpen ? '800px' : 'none', overflowY: isOpen ? 'auto' : 'visible', paddingRight: isOpen ? '4px' : 0 }}>
            {filtered.map(c => {
              const isActive = sel?._id === c._id
              const channelName = c.channel?.nombreCanal || c.channel?.plataforma || 'Canal'
              const chatCount = c.messageCount || 0
              const cfg = STATUS_CFG[c.status] || STATUS_CFG.DRAFT

              return (
                <div key={c._id || c.id}
                  className={`adf-row ${isActive ? 'adf-row-active' : ''}`}
                  onClick={() => setSelected(isActive ? null : c)}
                  style={{
                    background: isActive ? purpleAlpha(0.04) : 'var(--surface)',
                    border: `1px solid ${isActive ? purpleAlpha(0.4) : 'var(--border)'}`,
                    borderRadius: '14px', padding: '16px 18px', cursor: 'pointer',
                    transition: 'all .15s ease',
                    animation: 'adf-fadein .2s ease',
                    position: 'relative',
                  }}
                >
                  {/* Left accent */}
                  <div style={{ position: 'absolute', left: 0, top: '12px', bottom: '12px', width: '3px', borderRadius: '0 3px 3px 0', background: isActive ? PURPLE : cfg.color, opacity: isActive ? 1 : 0.4, transition: 'opacity .15s' }} />

                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '12px' }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', marginBottom: '4px' }}>
                        <span style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text)', fontFamily: FONT_DISPLAY }}>{channelName}</span>
                        <StatusBadge status={c.status} />
                        {c.type === 'auto' && (
                          <span style={{ background: purpleAlpha(0.1), color: PURPLE, borderRadius: '6px', padding: '2px 7px', fontSize: '10px', fontWeight: 700 }}>Auto</span>
                        )}
                      </div>
                      <div style={{ fontSize: '12px', color: 'var(--muted)', marginBottom: '6px' }}>
                        {c.channel?.plataforma || ''} · {c.channel?.categoria || ''} · {fmtDate(c.createdAt)}
                      </div>
                      <div style={{ fontSize: '12px', color: 'var(--muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {c.content}
                      </div>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '4px', flexShrink: 0 }}>
                      <span style={{ fontSize: '18px', fontWeight: 700, color: 'var(--text)', fontFamily: FONT_DISPLAY }}>€{c.price}</span>
                      {chatCount > 0 && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '3px', color: PURPLE, fontSize: '11px' }}>
                          <MessageCircle size={11} /> {chatCount}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>

          {/* ── Right: Detail panel ── */}
          {isOpen && sel && (
            <div style={{
              background: 'var(--surface)', border: '1px solid var(--border)',
              borderRadius: '20px', overflow: 'hidden',
              animation: 'adf-slidein .25s ease',
              display: 'flex', flexDirection: 'column',
              maxHeight: '800px',
            }}>
              {/* Detail header */}
              <div style={{
                padding: '20px 24px', borderBottom: '1px solid var(--border)',
                background: purpleAlpha(0.02),
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
                  <div>
                    <h2 style={{ fontFamily: FONT_DISPLAY, fontSize: '20px', fontWeight: 800, color: 'var(--text)', marginBottom: '4px' }}>
                      {sel.channel?.nombreCanal || 'Canal'}
                    </h2>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                      <StatusBadge status={sel.status} />
                      {sel.type === 'auto' && (
                        <span style={{ background: purpleAlpha(0.1), color: PURPLE, borderRadius: '6px', padding: '2px 7px', fontSize: '10px', fontWeight: 700 }}>Auto-Buy</span>
                      )}
                      <span style={{ fontSize: '11px', color: 'var(--muted)' }}>Creada {fmtDateTime(sel.createdAt)}</span>
                    </div>
                  </div>
                  <button onClick={() => setSelected(null)} style={{
                    background: 'var(--bg)', border: '1px solid var(--border)',
                    borderRadius: '8px', padding: '6px 10px', cursor: 'pointer',
                    color: 'var(--muted)', fontSize: '12px', fontFamily: FONT_BODY,
                  }}>Cerrar</button>
                </div>

                {/* Pipeline */}
                <PipelineStepper currentStatus={sel.status} />
              </div>

              {/* Scrollable content */}
              <div style={{ flex: 1, overflowY: 'auto', padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>

                {/* Financials */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px' }}>
                  {[
                    { label: 'Total', val: `€${sel.price}`, color: 'var(--text)' },
                    { label: 'Comision', val: `€${(sel.commissionAmount || 0).toFixed(2)}`, color: WARN },
                    { label: 'Pago creador', val: `€${(sel.netAmount || 0).toFixed(2)}`, color: OK },
                  ].map(({ label, val, color }) => (
                    <div key={label} style={{
                      background: 'var(--bg)', border: '1px solid var(--border)',
                      borderRadius: '12px', padding: '14px', textAlign: 'center',
                    }}>
                      <div style={{ fontSize: '10px', color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '4px' }}>{label}</div>
                      <div style={{ fontFamily: FONT_DISPLAY, fontSize: '18px', fontWeight: 700, color }}>{val}</div>
                    </div>
                  ))}
                </div>

                {/* Content preview */}
                <div style={{
                  background: 'var(--bg)', border: '1px solid var(--border)',
                  borderRadius: '14px', padding: '16px',
                  borderLeft: `3px solid ${PURPLE}`,
                }}>
                  <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '10px' }}>
                    Contenido del anuncio
                  </div>
                  <div style={{ fontSize: '14px', color: 'var(--text)', lineHeight: 1.65, whiteSpace: 'pre-wrap', marginBottom: '10px' }}>
                    {sel.content}
                  </div>
                  {sel.targetUrl && (
                    <a href={sel.targetUrl} target="_blank" rel="noreferrer" style={{
                      display: 'inline-flex', alignItems: 'center', gap: '4px',
                      fontSize: '12px', color: PURPLE, textDecoration: 'none', fontWeight: 500,
                    }}>
                      <ExternalLink size={12} /> {sel.targetUrl}
                    </a>
                  )}
                </div>

                {/* Tracking */}
                {sel.tracking && (sel.tracking.clicks > 0 || sel.tracking.impressions > 0) && (
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px' }}>
                    {[
                      { label: 'Clicks', val: sel.tracking.clicks || 0 },
                      { label: 'Impresiones', val: sel.tracking.impressions || 0 },
                      { label: 'Conversiones', val: sel.tracking.conversions || 0 },
                    ].map(({ label, val }) => (
                      <div key={label} style={{ background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: '12px', padding: '12px', textAlign: 'center' }}>
                        <div style={{ fontFamily: FONT_DISPLAY, fontSize: '18px', fontWeight: 700, color: 'var(--text)' }}>{val}</div>
                        <div style={{ fontSize: '10px', color: 'var(--muted)', marginTop: '2px' }}>{label}</div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Chat */}
                {['DRAFT', 'PAID', 'PUBLISHED', 'COMPLETED'].includes(sel.status) && (
                  <ChatPanel campaign={sel} myRole="advertiser" />
                )}

                {/* Analytics link */}
                {['PUBLISHED', 'COMPLETED'].includes(sel.status) && (
                  <button onClick={(e) => { e.stopPropagation(); navigate(`/advertiser/campaigns/${sel._id}/analytics`) }} className="adf-btn-secondary" style={{
                    width: '100%', background: 'var(--bg)', border: '1px solid var(--border)',
                    borderRadius: '12px', padding: '12px 18px', fontSize: '13px', fontWeight: 600,
                    cursor: 'pointer', fontFamily: FONT_BODY, color: 'var(--text-secondary)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                    marginBottom: '4px',
                  }}>
                    <BarChart3 size={16} /> Ver analytics de campana
                  </button>
                )}

                {/* Actions */}
                <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', paddingTop: '4px' }} onClick={e => e.stopPropagation()}>
                  {sel.status === 'DRAFT' && (
                    <>
                      <button onClick={() => doPayWithConfirm(sel)} disabled={actionLoading === sel._id} className="adf-btn-primary" style={{
                        flex: 1, background: BLUE, color: '#fff', border: 'none', borderRadius: '12px',
                        padding: '13px 20px', fontSize: '14px', fontWeight: 600,
                        cursor: actionLoading === sel._id ? 'not-allowed' : 'pointer', fontFamily: FONT_BODY,
                        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                        boxShadow: `0 4px 14px ${BLUE}30`,
                      }}>
                        <Shield size={16} /> {actionLoading === sel._id ? 'Procesando...' : 'Pagar y activar escrow'}
                      </button>
                      <button onClick={() => doAction(sel._id, apiService.cancelCampaign)} disabled={actionLoading === sel._id} style={{
                        background: 'var(--bg)', color: ERR, border: `1px solid ${ERR}30`,
                        borderRadius: '12px', padding: '13px 18px', fontSize: '13px', fontWeight: 600,
                        cursor: actionLoading === sel._id ? 'not-allowed' : 'pointer', fontFamily: FONT_BODY,
                      }}>
                        Cancelar
                      </button>
                    </>
                  )}
                  {sel.status === 'PAID' && (
                    <div style={{
                      flex: 1, background: `${BLUE}08`, border: `1px solid ${BLUE}20`,
                      borderRadius: '12px', padding: '14px 18px',
                      display: 'flex', alignItems: 'center', gap: '10px',
                    }}>
                      <div style={{ animation: 'adf-pulse 2s infinite' }}>
                        <Clock size={18} color={BLUE} />
                      </div>
                      <div>
                        <div style={{ fontSize: '13px', fontWeight: 600, color: BLUE }}>Esperando al creador</div>
                        <div style={{ fontSize: '12px', color: 'var(--muted)' }}>El creador debe confirmar la publicacion del anuncio</div>
                      </div>
                    </div>
                  )}
                  {sel.status === 'PUBLISHED' && (
                    <>
                      {sel.delivery && <DeliveryBadge delivery={sel.delivery} />}
                      <button onClick={() => doCompleteWithConfirm(sel)} disabled={actionLoading === sel._id} className="adf-btn-primary" style={{
                        flex: 1, background: OK, color: '#fff', border: 'none', borderRadius: '12px',
                        padding: '13px 20px', fontSize: '14px', fontWeight: 600,
                        cursor: actionLoading === sel._id ? 'not-allowed' : 'pointer', fontFamily: FONT_BODY,
                        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                        boxShadow: `0 4px 14px ${OK}30`,
                      }}>
                        <CheckCircle size={16} /> {actionLoading === sel._id ? 'Procesando...' : 'Completar y liberar pago'}
                      </button>
                    </>
                  )}
                  {sel.status === 'COMPLETED' && (
                    <div style={{
                      flex: 1, background: `${OK}08`, border: `1px solid ${OK}20`,
                      borderRadius: '12px', padding: '14px 18px',
                      display: 'flex', alignItems: 'center', gap: '10px',
                    }}>
                      <CheckCircle size={18} color={OK} />
                      <div>
                        <div style={{ fontSize: '13px', fontWeight: 600, color: OK }}>Campana completada</div>
                        <div style={{ fontSize: '12px', color: 'var(--muted)' }}>Pago de €{(sel.netAmount || 0).toFixed(2)} liberado al creador</div>
                      </div>
                    </div>
                  )}
                  {sel.status === 'CANCELLED' && (
                    <div style={{
                      flex: 1, background: `${ERR}08`, border: `1px solid ${ERR}20`,
                      borderRadius: '12px', padding: '14px 18px',
                      display: 'flex', alignItems: 'center', gap: '10px',
                    }}>
                      <XCircle size={18} color={ERR} />
                      <div>
                        <div style={{ fontSize: '13px', fontWeight: 600, color: ERR }}>Cancelada</div>
                        <div style={{ fontSize: '12px', color: 'var(--muted)' }}>Reembolso procesado</div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
