import React, { useState, useEffect, useMemo, useCallback } from 'react'
import {
  Repeat, Search, Inbox, Send, Activity, CheckCircle2, X,
  Users, Radio, ArrowRight, Clock, Star, Sparkles, AlertCircle,
  ChevronRight, Calendar, MessageSquare,
} from 'lucide-react'
import apiService from '../../../../services/api'
import { FONT_BODY as F, FONT_DISPLAY as D, GREEN, greenAlpha, OK, WARN, ERR, BLUE } from '../../../theme/tokens'

const ACCENT = GREEN
const ga = greenAlpha
const fmtFollowers = (n) => {
  const v = Number(n) || 0
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M`
  if (v >= 1_000) return `${(v / 1_000).toFixed(1)}K`
  return String(v)
}
const STATUS_LABEL = {
  propuesto:        { label: 'Propuesto',          color: BLUE },
  aceptado:         { label: 'Aceptado',           color: OK   },
  publicado_a:      { label: 'Tú publicaste',      color: WARN },
  publicado_b:      { label: 'Esperando tu post',  color: WARN },
  publicado_ambos:  { label: 'Ambos publicados',   color: OK   },
  completado:       { label: 'Completado',         color: '#8B5CF6' },
  rechazado:        { label: 'Rechazado',          color: ERR  },
  expirado:         { label: 'Expirado',           color: 'var(--muted)' },
  cancelado:        { label: 'Cancelado',          color: 'var(--muted)' },
}

/**
 * CreatorSwapsPage — Intercambio de menciones entre canales (Fase 1).
 *
 * Inspirado en Substack Recommendations + Beehiiv Boosts pero para canales
 * de mensajería (Telegram, WhatsApp, Discord, Instagram). Sin dinero — los
 * dos creators se mencionan mutuamente y miden conversión via tracking links.
 *
 * Tabs:
 *  - Descubrir: candidatos ranked por matchScore
 *  - Recibidos: propuestas pendientes que tienes que responder
 *  - Enviados: tus propuestas a la espera de respuesta
 *  - Activos: aceptados, en publicación, en tracking
 *  - Histórico: completados, rechazados, expirados
 */
export default function CreatorSwapsPage() {
  const [tab, setTab] = useState('descubrir')
  const [channels, setChannels] = useState([])
  const [selectedChannelId, setSelectedChannelId] = useState('')
  const [loading, setLoading] = useState(true)
  const [partners, setPartners] = useState([])
  const [swaps, setSwaps] = useState([])
  const [proposeTo, setProposeTo] = useState(null) // partner being proposed to
  const [detail, setDetail] = useState(null)        // swap being viewed
  const [toast, setToast] = useState(null)

  const showToast = (msg, ok = true) => { setToast({ msg, ok }); setTimeout(() => setToast(null), 2500) }

  // ── Initial load: my channels ──
  useEffect(() => {
    let mounted = true
    apiService.getMyChannels().then(res => {
      if (!mounted) return
      const list = res?.success ? (Array.isArray(res.data) ? res.data : res.data?.items || []) : []
      setChannels(list)
      if (list.length && !selectedChannelId) setSelectedChannelId(list[0]._id || list[0].id)
      setLoading(false)
    }).catch(() => { if (mounted) setLoading(false) })
    return () => { mounted = false }
  }, [])

  // ── Reload partners when channel changes ──
  const loadPartners = useCallback(async () => {
    if (!selectedChannelId) return
    try {
      const res = await apiService.discoverSwapPartners(selectedChannelId)
      if (res?.success) setPartners(Array.isArray(res.data) ? res.data : [])
    } catch {}
  }, [selectedChannelId])

  // ── Reload swaps ──
  const loadSwaps = useCallback(async () => {
    try {
      const res = await apiService.listMySwaps('all')
      if (res?.success) setSwaps(Array.isArray(res.data) ? res.data : [])
    } catch {}
  }, [])

  useEffect(() => { loadPartners() }, [loadPartners])
  useEffect(() => { loadSwaps() }, [loadSwaps])

  // ── Counts per tab ──
  const counts = useMemo(() => {
    const me = (selectedChannelId || '').toString()
    return {
      recibidos: swaps.filter(s => s.status === 'propuesto' && String(s.recipient?._id || s.recipient) !== me).length,
      enviados:  swaps.filter(s => s.status === 'propuesto').length,
      activos:   swaps.filter(s => ['aceptado', 'publicado_a', 'publicado_b', 'publicado_ambos'].includes(s.status)).length,
    }
  }, [swaps, selectedChannelId])

  // ── Actions ──
  const handlePropose = async (mensaje) => {
    if (!proposeTo) return
    try {
      const res = await apiService.createSwap({
        requesterChannel: selectedChannelId,
        recipientChannel: proposeTo._id,
        propuesta: { mensaje, formato: 'post_simple', duracionHoras: 24 },
      })
      if (res?.success) {
        showToast('Propuesta enviada')
        setProposeTo(null)
        loadSwaps(); loadPartners()
      } else {
        showToast(res?.message || 'Error al enviar', false)
      }
    } catch (e) { showToast('Error de conexión', false) }
  }

  const handleAccept = async (id) => {
    try {
      const res = await apiService.acceptSwap(id)
      if (res?.success) { showToast('Aceptado'); loadSwaps() }
      else showToast(res?.message || 'Error', false)
    } catch { showToast('Error de conexión', false) }
  }

  const handleReject = async (id) => {
    if (!confirm('¿Rechazar esta propuesta?')) return
    try {
      const res = await apiService.rejectSwap(id)
      if (res?.success) { showToast('Rechazado'); loadSwaps() }
      else showToast(res?.message || 'Error', false)
    } catch { showToast('Error de conexión', false) }
  }

  // ── Empty state when no channels ──
  if (!loading && !channels.length) {
    return (
      <div style={{ fontFamily: F, padding: 60, textAlign: 'center', maxWidth: 480, margin: '0 auto' }}>
        <div style={{
          width: 64, height: 64, borderRadius: 18, background: ga(0.15),
          border: `1px solid ${ga(0.3)}`, display: 'flex', alignItems: 'center',
          justifyContent: 'center', margin: '0 auto 16px',
        }}>
          <Repeat size={28} color={ACCENT} />
        </div>
        <h2 style={{ fontFamily: D, fontSize: 22, fontWeight: 800, color: 'var(--text)', margin: '0 0 8px' }}>
          Necesitas un canal
        </h2>
        <p style={{ fontSize: 14, color: 'var(--muted)', lineHeight: 1.5, margin: 0 }}>
          Para intercambiar menciones primero registra al menos un canal.
        </p>
      </div>
    )
  }

  return (
    <div style={{ fontFamily: F, display: 'flex', flexDirection: 'column', gap: 18 }}>
      {/* Header */}
      <Header />

      {/* Channel selector */}
      <ChannelSelector
        channels={channels}
        selectedId={selectedChannelId}
        onChange={setSelectedChannelId}
      />

      {/* Tabs */}
      <Tabs tab={tab} onChange={setTab} counts={counts} />

      {/* Content */}
      {tab === 'descubrir' && (
        <DiscoverTab partners={partners} onPropose={setProposeTo} loading={loading} />
      )}
      {tab === 'recibidos' && (
        <SwapsList
          swaps={swaps.filter(s => s.status === 'propuesto')}
          role="incoming"
          onAccept={handleAccept}
          onReject={handleReject}
          onView={setDetail}
        />
      )}
      {tab === 'enviados' && (
        <SwapsList
          swaps={swaps.filter(s => s.status === 'propuesto')}
          role="outgoing"
          onView={setDetail}
        />
      )}
      {tab === 'activos' && (
        <SwapsList
          swaps={swaps.filter(s => ['aceptado', 'publicado_a', 'publicado_b', 'publicado_ambos'].includes(s.status))}
          role="active"
          onView={setDetail}
        />
      )}
      {tab === 'historico' && (
        <SwapsList
          swaps={swaps.filter(s => ['completado', 'rechazado', 'expirado', 'cancelado'].includes(s.status))}
          role="history"
          onView={setDetail}
        />
      )}

      {/* Modals */}
      {proposeTo && (
        <ProposeModal partner={proposeTo} onClose={() => setProposeTo(null)} onConfirm={handlePropose} />
      )}
      {detail && (
        <SwapDetailModal swap={detail} onClose={() => setDetail(null)} />
      )}

      {/* Toast */}
      {toast && (
        <div style={{
          position: 'fixed', bottom: 24, right: 24, zIndex: 1000,
          background: toast.ok ? OK : ERR, color: '#fff', borderRadius: 10,
          padding: '10px 16px', fontSize: 13, fontWeight: 700, fontFamily: F,
          boxShadow: '0 8px 24px rgba(0,0,0,0.2)',
        }}>
          {toast.msg}
        </div>
      )}
    </div>
  )
}

// ─── Header ────────────────────────────────────────────────────────────────
function Header() {
  return (
    <div>
      <h1 style={{
        fontFamily: D, fontSize: 26, fontWeight: 800, color: 'var(--text)',
        letterSpacing: '-0.03em', margin: '0 0 6px', display: 'flex', alignItems: 'center', gap: 10,
      }}>
        <Repeat size={26} color={ACCENT} /> Colaboraciones
      </h1>
      <p style={{ fontSize: 14, color: 'var(--muted)', margin: 0, maxWidth: 720, lineHeight: 1.5 }}>
        Intercambia menciones con otros creators de tu nicho. Los dos os mencionáis mutuamente
        y medimos quién os trajo seguidores con tracking links — sin dinero, solo crecimiento.
      </p>
    </div>
  )
}

// ─── Channel selector ─────────────────────────────────────────────────────
function ChannelSelector({ channels, selectedId, onChange }) {
  if (channels.length <= 1) return null
  return (
    <div style={{
      background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12,
      padding: '10px 14px', display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap',
    }}>
      <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--muted)' }}>Canal:</span>
      <select value={selectedId} onChange={e => onChange(e.target.value)} style={{
        background: 'var(--bg)', color: 'var(--text)', border: '1px solid var(--border)',
        borderRadius: 8, padding: '6px 10px', fontSize: 13, fontWeight: 600, fontFamily: F, cursor: 'pointer',
      }}>
        {channels.map(c => (
          <option key={c._id || c.id} value={c._id || c.id}>
            {c.nombreCanal} · {c.plataforma} · {fmtFollowers(c.estadisticas?.seguidores)} seg.
          </option>
        ))}
      </select>
    </div>
  )
}

// ─── Tabs ──────────────────────────────────────────────────────────────────
function Tabs({ tab, onChange, counts }) {
  const items = [
    { id: 'descubrir', label: 'Descubrir', icon: Search },
    { id: 'recibidos', label: 'Recibidos', icon: Inbox, count: counts.recibidos },
    { id: 'enviados',  label: 'Enviados',  icon: Send, count: counts.enviados },
    { id: 'activos',   label: 'Activos',   icon: Activity, count: counts.activos },
    { id: 'historico', label: 'Histórico', icon: Clock },
  ]
  return (
    <div style={{
      display: 'flex', gap: 4, borderBottom: '1px solid var(--border)', overflowX: 'auto',
    }}>
      {items.map(it => {
        const Icon = it.icon
        const active = tab === it.id
        return (
          <button key={it.id} onClick={() => onChange(it.id)} style={{
            background: 'transparent', border: 'none', borderBottom: `2px solid ${active ? ACCENT : 'transparent'}`,
            color: active ? ACCENT : 'var(--muted)',
            padding: '10px 16px', fontSize: 13, fontWeight: 700, fontFamily: F, cursor: 'pointer',
            display: 'flex', alignItems: 'center', gap: 7, whiteSpace: 'nowrap',
            transition: 'color .15s, border-color .15s',
          }}>
            <Icon size={14} /> {it.label}
            {it.count > 0 && (
              <span style={{
                background: ACCENT, color: '#fff', fontSize: 10, fontWeight: 800,
                borderRadius: 20, padding: '1px 7px', lineHeight: 1.4,
              }}>
                {it.count}
              </span>
            )}
          </button>
        )
      })}
    </div>
  )
}

// ─── Discover tab ──────────────────────────────────────────────────────────
function DiscoverTab({ partners, onPropose, loading }) {
  if (loading) return <Loading />
  if (!partners.length) {
    return <Empty
      icon={Search}
      title="Sin candidatos por ahora"
      subtitle="Cuando haya más canales activos en tu nicho los verás aquí ordenados por compatibilidad."
    />
  }
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 12 }}>
      {partners.map(p => <PartnerCard key={p._id} partner={p} onPropose={() => onPropose(p)} />)}
    </div>
  )
}

function PartnerCard({ partner, onPropose }) {
  const score = partner.matchScore || 0
  const scoreColor = score >= 70 ? OK : score >= 40 ? WARN : 'var(--muted)'
  return (
    <div style={{
      background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 14,
      padding: 16, display: 'flex', flexDirection: 'column', gap: 12,
      transition: 'border-color .15s, transform .15s',
    }}
      onMouseEnter={e => { e.currentTarget.style.borderColor = ga(0.4); e.currentTarget.style.transform = 'translateY(-1px)' }}
      onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.transform = 'none' }}
    >
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{
          width: 38, height: 38, borderRadius: 10, flexShrink: 0,
          background: partner.foto ? `url(${partner.foto}) center/cover` : ga(0.15),
          border: `1px solid ${ga(0.3)}`, display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          {!partner.foto && <Radio size={16} color={ACCENT} />}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {partner.nombreCanal}
          </div>
          <div style={{ fontSize: 11.5, color: 'var(--muted)' }}>
            {partner.plataforma} · {fmtFollowers(partner.seguidores)} seguidores
            {partner.categoria && ` · ${partner.categoria}`}
          </div>
        </div>
        {partner.verificado && (
          <CheckCircle2 size={16} color={OK} />
        )}
      </div>

      {/* Bio */}
      {partner.bio && (
        <div style={{ fontSize: 12, color: 'var(--muted)', lineHeight: 1.4, maxHeight: 60, overflow: 'hidden' }}>
          {partner.bio}
        </div>
      )}

      {/* Match score */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <div style={{ flex: 1, height: 6, borderRadius: 3, background: 'var(--bg2)', overflow: 'hidden' }}>
          <div style={{ width: `${score}%`, height: '100%', background: scoreColor, transition: 'width .4s' }} />
        </div>
        <span style={{ fontSize: 11, fontWeight: 700, color: scoreColor, minWidth: 32, textAlign: 'right' }}>
          {score}% match
        </span>
      </div>

      {/* CTA */}
      <button onClick={onPropose} style={{
        background: ACCENT, color: '#fff', border: 'none', borderRadius: 9,
        padding: '8px 14px', fontSize: 12.5, fontWeight: 700, cursor: 'pointer', fontFamily: F,
        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
      }}>
        <Repeat size={13} /> Proponer intercambio
      </button>
    </div>
  )
}

// ─── Swaps list (recibidos/enviados/activos/histórico) ─────────────────────
function SwapsList({ swaps, role, onAccept, onReject, onView }) {
  if (!swaps.length) {
    const messages = {
      incoming: { title: 'Sin propuestas pendientes', sub: 'Las propuestas de otros creators aparecerán aquí.' },
      outgoing: { title: 'No has enviado propuestas', sub: 'Ve a Descubrir y propón un intercambio.' },
      active:   { title: 'Sin colaboraciones activas', sub: 'Cuando aceptes una propuesta aparecerá aquí.' },
      history:  { title: 'Sin histórico todavía', sub: 'Tus colaboraciones completadas se guardarán aquí.' },
    }
    const m = messages[role] || messages.history
    return <Empty icon={Inbox} title={m.title} subtitle={m.sub} />
  }
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {swaps.map(s => (
        <SwapRow key={s._id} swap={s} role={role} onAccept={onAccept} onReject={onReject} onView={onView} />
      ))}
    </div>
  )
}

function SwapRow({ swap, role, onAccept, onReject, onView }) {
  const status = STATUS_LABEL[swap.status] || { label: swap.status, color: 'var(--muted)' }
  const otherChannel = role === 'incoming' ? swap.requesterChannel : swap.recipientChannel
  const otherUser = role === 'incoming' ? swap.requester : swap.recipient

  return (
    <div style={{
      background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12,
      padding: 14, display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap',
    }}>
      <div style={{
        width: 36, height: 36, borderRadius: 9, flexShrink: 0,
        background: ga(0.12), border: `1px solid ${ga(0.25)}`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <Radio size={15} color={ACCENT} />
      </div>
      <div style={{ flex: 1, minWidth: 200 }}>
        <div style={{ fontSize: 13.5, fontWeight: 700, color: 'var(--text)' }}>
          {otherChannel?.nombreCanal || 'Canal'}
          <span style={{ fontWeight: 500, color: 'var(--muted)', marginLeft: 8, fontSize: 12 }}>
            · {otherChannel?.plataforma} · {fmtFollowers(otherChannel?.estadisticas?.seguidores)}
          </span>
        </div>
        <div style={{ fontSize: 11.5, color: 'var(--muted)', marginTop: 2 }}>
          {otherUser?.nombre || otherUser?.email || 'Creator'} · {new Date(swap.createdAt).toLocaleDateString('es')}
        </div>
      </div>
      <span style={{
        background: `${status.color}15`, color: status.color, border: `1px solid ${status.color}40`,
        borderRadius: 20, padding: '3px 10px', fontSize: 11, fontWeight: 700,
      }}>
        {status.label}
      </span>
      <div style={{ display: 'flex', gap: 6 }}>
        {role === 'incoming' && (
          <>
            <button onClick={() => onAccept(swap._id)} style={btnPrimary}>Aceptar</button>
            <button onClick={() => onReject(swap._id)} style={btnGhost}>Rechazar</button>
          </>
        )}
        <button onClick={() => onView(swap)} style={btnGhost}>
          Ver <ChevronRight size={12} />
        </button>
      </div>
    </div>
  )
}

// ─── Propose modal ─────────────────────────────────────────────────────────
function ProposeModal({ partner, onClose, onConfirm }) {
  const [mensaje, setMensaje] = useState('')
  return (
    <ModalShell onClose={onClose} title="Proponer intercambio" icon={Repeat}>
      <div style={{ marginBottom: 14 }}>
        <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 6 }}>Vas a proponer a:</div>
        <div style={{
          background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 10,
          padding: 12, display: 'flex', alignItems: 'center', gap: 10,
        }}>
          <div style={{
            width: 36, height: 36, borderRadius: 9, flexShrink: 0,
            background: ga(0.15), border: `1px solid ${ga(0.3)}`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <Radio size={15} color={ACCENT} />
          </div>
          <div>
            <div style={{ fontSize: 13.5, fontWeight: 700, color: 'var(--text)' }}>{partner.nombreCanal}</div>
            <div style={{ fontSize: 11.5, color: 'var(--muted)' }}>
              {partner.plataforma} · {fmtFollowers(partner.seguidores)} seguidores · {partner.matchScore}% match
            </div>
          </div>
        </div>
      </div>

      <label style={{ display: 'block', marginBottom: 14 }}>
        <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text)', marginBottom: 6 }}>
          Mensaje (opcional)
        </div>
        <textarea
          value={mensaje}
          onChange={e => setMensaje(e.target.value)}
          placeholder="Hola! Llevo viendo tu canal hace tiempo. ¿Te apetece que nos mencionemos mutuamente la semana que viene?"
          maxLength={1000}
          rows={4}
          style={{
            width: '100%', boxSizing: 'border-box', background: 'var(--bg)',
            border: '1px solid var(--border)', borderRadius: 10, padding: '10px 12px',
            fontSize: 13, color: 'var(--text)', fontFamily: F, resize: 'vertical',
          }}
        />
        <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 4 }}>
          {mensaje.length}/1000
        </div>
      </label>

      <div style={{
        background: ga(0.06), border: `1px solid ${ga(0.18)}`, borderRadius: 10,
        padding: 12, fontSize: 12, color: 'var(--muted)', lineHeight: 1.5, marginBottom: 14,
      }}>
        <strong style={{ color: 'var(--text)' }}>Cómo funciona:</strong> Si {partner.nombreCanal} acepta,
        os pondréis de acuerdo en una fecha. Cada uno publicará una mención del otro en su canal,
        usando un tracking link para medir cuántos seguidores os trajo el intercambio.
      </div>

      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
        <button onClick={onClose} style={btnGhost}>Cancelar</button>
        <button onClick={() => onConfirm(mensaje)} style={btnPrimary}>Enviar propuesta</button>
      </div>
    </ModalShell>
  )
}

// ─── Detail modal ──────────────────────────────────────────────────────────
function SwapDetailModal({ swap, onClose }) {
  const status = STATUS_LABEL[swap.status] || { label: swap.status, color: 'var(--muted)' }
  return (
    <ModalShell onClose={onClose} title="Detalle del intercambio" icon={Repeat}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
        <span style={{
          background: `${status.color}15`, color: status.color, border: `1px solid ${status.color}40`,
          borderRadius: 20, padding: '3px 10px', fontSize: 11, fontWeight: 700,
        }}>
          {status.label}
        </span>
        <span style={{ fontSize: 11.5, color: 'var(--muted)' }}>
          Creado el {new Date(swap.createdAt).toLocaleDateString('es')}
        </span>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 14 }}>
        <ChannelMini label="Solicitante" channel={swap.requesterChannel} />
        <ChannelMini label="Destinatario" channel={swap.recipientChannel} />
      </div>

      {swap.propuesta?.mensaje && (
        <div style={{
          background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 10,
          padding: 12, marginBottom: 14,
        }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--muted)', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Mensaje
          </div>
          <div style={{ fontSize: 13, color: 'var(--text)', lineHeight: 1.5, whiteSpace: 'pre-wrap' }}>
            {swap.propuesta.mensaje}
          </div>
        </div>
      )}

      {(swap.resultados?.clicksRequester > 0 || swap.resultados?.clicksRecipient > 0) && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 14 }}>
          <Stat label="Clicks (Solicitante)" value={swap.resultados.clicksRequester} />
          <Stat label="Clicks (Destinatario)" value={swap.resultados.clicksRecipient} />
        </div>
      )}

      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
        <button onClick={onClose} style={btnGhost}>Cerrar</button>
      </div>
    </ModalShell>
  )
}

function ChannelMini({ label, channel }) {
  return (
    <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 10, padding: 10 }}>
      <div style={{ fontSize: 10.5, fontWeight: 600, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 }}>
        {label}
      </div>
      <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)' }}>
        {channel?.nombreCanal || '—'}
      </div>
      <div style={{ fontSize: 11.5, color: 'var(--muted)' }}>
        {channel?.plataforma} · {fmtFollowers(channel?.estadisticas?.seguidores)}
      </div>
    </div>
  )
}

function Stat({ label, value }) {
  return (
    <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 10, padding: 10 }}>
      <div style={{ fontSize: 18, fontWeight: 800, color: 'var(--text)', fontFamily: D }}>{value}</div>
      <div style={{ fontSize: 11, color: 'var(--muted)' }}>{label}</div>
    </div>
  )
}

// ─── Generic UI ────────────────────────────────────────────────────────────
function ModalShell({ children, title, icon: Icon, onClose }) {
  return (
    <div onClick={onClose} style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', zIndex: 999,
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20,
    }}>
      <div onClick={e => e.stopPropagation()} style={{
        background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 16,
        maxWidth: 540, width: '100%', maxHeight: '90vh', overflow: 'auto',
        padding: 22, fontFamily: F,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
          {Icon && (
            <div style={{
              width: 32, height: 32, borderRadius: 9,
              background: ga(0.15), border: `1px solid ${ga(0.3)}`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <Icon size={15} color={ACCENT} />
            </div>
          )}
          <h2 style={{ fontFamily: D, fontSize: 17, fontWeight: 800, color: 'var(--text)', margin: 0, flex: 1 }}>
            {title}
          </h2>
          <button onClick={onClose} style={{
            background: 'transparent', border: 'none', cursor: 'pointer', padding: 4, color: 'var(--muted)',
          }}>
            <X size={18} />
          </button>
        </div>
        {children}
      </div>
    </div>
  )
}

function Empty({ icon: Icon, title, subtitle }) {
  return (
    <div style={{ textAlign: 'center', padding: '50px 20px', color: 'var(--muted)' }}>
      <div style={{
        width: 52, height: 52, borderRadius: 14, background: 'var(--bg2)',
        border: '1px solid var(--border)', display: 'flex', alignItems: 'center',
        justifyContent: 'center', margin: '0 auto 12px',
      }}>
        <Icon size={22} color="var(--muted)" />
      </div>
      <div style={{ fontFamily: D, fontSize: 15, fontWeight: 700, color: 'var(--text)', marginBottom: 4 }}>
        {title}
      </div>
      <div style={{ fontSize: 13, color: 'var(--muted)', maxWidth: 360, margin: '0 auto', lineHeight: 1.5 }}>
        {subtitle}
      </div>
    </div>
  )
}

function Loading() {
  return (
    <div style={{ textAlign: 'center', padding: 40, color: 'var(--muted)', fontSize: 13 }}>
      Cargando...
    </div>
  )
}

const btnPrimary = {
  background: ACCENT, color: '#fff', border: 'none', borderRadius: 8,
  padding: '7px 12px', fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: F,
  display: 'inline-flex', alignItems: 'center', gap: 5,
}
const btnGhost = {
  background: 'var(--bg2)', color: 'var(--text)', border: '1px solid var(--border)',
  borderRadius: 8, padding: '7px 12px', fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: F,
  display: 'inline-flex', alignItems: 'center', gap: 5,
}
