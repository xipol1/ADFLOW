import React, { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  BellRing, Bell, Check, CheckCheck, Inbox, Wallet, Star,
  Radio, AlertTriangle, Sparkles, MessageSquare, ArrowRight,
  Trash2, Filter, Clock, Building2,
} from 'lucide-react'
import apiService from '../../../../services/api'
import { FONT_BODY as F, FONT_DISPLAY as D, GREEN, greenAlpha, OK, WARN, ERR, BLUE } from '../../../theme/tokens'
import { ErrorBanner, useConfirm } from '../shared/DashComponents'

const ACCENT = GREEN
const ga = greenAlpha
const READ_KEY = 'channelad-creator-notifications-read-v1'
const DISMISSED_KEY = 'channelad-creator-notifications-dismissed-v1'

const TYPE_CFG = {
  request:  { color: WARN, icon: Inbox,         label: 'Solicitud',   path: '/creator/requests' },
  payment:  { color: OK,   icon: Wallet,        label: 'Pago',        path: '/creator/earnings' },
  rating:   { color: '#f59e0b', icon: Star,     label: 'Rating',      path: '/creator/requests' },
  channel:  { color: BLUE, icon: Radio,         label: 'Canal',       path: '/creator/channels' },
  alert:    { color: ERR,  icon: AlertTriangle, label: 'Alerta',      path: '/creator' },
  system:   { color: 'var(--muted)', icon: Bell,label: 'Sistema',     path: '/creator/settings' },
  ai:       { color: '#8B5CF6', icon: Sparkles, label: 'IA',          path: '/creator' },
  message:  { color: ACCENT, icon: MessageSquare, label: 'Mensaje',   path: '/creator/inbox' },
  brand:    { color: BLUE, icon: Building2,     label: 'Brand',       path: '/creator/brands' },
}

/**
 * CreatorNotificationsPage — Centro de notificaciones filtrable.
 *
 * Sintetiza eventos de campañas/requests/payments en notificaciones tipadas.
 * Lectura/descarte persiste en localStorage. Click en una notificación
 * navega al destino relevante. Bulk actions: marcar todo como leído,
 * archivar todo.
 */
export default function CreatorNotificationsPage() {
  const navigate = useNavigate()
  const [campaigns, setCampaigns] = useState([])
  const [requests, setRequests] = useState([])
  const [channels, setChannels] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('all')
  const [readMap, setReadMap] = useState(() => loadJSON(READ_KEY, {}))
  const [dismissed, setDismissed] = useState(() => loadJSON(DISMISSED_KEY, {}))
  const [loadError, setLoadError] = useState(false)
  const [retryKey, setRetryKey] = useState(0)
  const { confirm, dialog: confirmDialog } = useConfirm()

  useEffect(() => {
    let mounted = true
    setLoading(true)
    setLoadError(false)
    let anyOk = false
    let anyFail = false
    Promise.all([
      apiService.getCreatorCampaigns?.().catch(() => { anyFail = true; return null }),
      apiService.getAdsForCreator?.().catch(() => { anyFail = true; return null }),
      apiService.getMyChannels().catch(() => { anyFail = true; return null }),
    ]).then(([cmpRes, adRes, chRes]) => {
      if (!mounted) return
      if (cmpRes?.success && Array.isArray(cmpRes.data)) { setCampaigns(cmpRes.data); anyOk = true }
      if (adRes?.success && Array.isArray(adRes.data)) { setRequests(adRes.data); anyOk = true }
      if (chRes?.success) { setChannels(Array.isArray(chRes.data) ? chRes.data : chRes.data?.items || []); anyOk = true }
      else if (chRes !== null) anyFail = true
      if (anyFail && !anyOk) setLoadError(true)
      setLoading(false)
    }).catch(() => mounted && (setLoadError(true), setLoading(false)))
    return () => { mounted = false }
  }, [retryKey])

  const notifications = useMemo(() => synthesizeNotifications({ campaigns, requests, channels }), [campaigns, requests, channels])
  const visible = notifications.filter(n => !dismissed[n.id])
  const filtered = filter === 'all' ? visible : filter === 'unread' ? visible.filter(n => !readMap[n.id]) : visible.filter(n => n.type === filter)

  const counts = useMemo(() => {
    const out = { all: visible.length, unread: visible.filter(n => !readMap[n.id]).length }
    Object.keys(TYPE_CFG).forEach(t => { out[t] = visible.filter(n => n.type === t).length })
    return out
  }, [visible, readMap])

  const markAllRead = () => { const next = { ...readMap }; visible.forEach(n => { next[n.id] = true }); setReadMap(next); saveJSON(READ_KEY, next) }
  const dismissAll = async () => {
    const ok = await confirm({
      title: 'Archivar notificaciones',
      message: `¿Archivar las ${filtered.length} notificaciones visibles? Podrás seguir viéndolas en el filtro "Archivadas".`,
      confirmLabel: 'Archivar',
      tone: 'warning',
    })
    if (!ok) return
    const next = { ...dismissed }
    filtered.forEach(n => { next[n.id] = true })
    setDismissed(next)
    saveJSON(DISMISSED_KEY, next)
  }
  const onClick = (n) => {
    const next = { ...readMap, [n.id]: true }; setReadMap(next); saveJSON(READ_KEY, next)
    if (n.path) navigate(n.path)
  }
  const onDismiss = (id) => { const next = { ...dismissed, [id]: Date.now() }; setDismissed(next); saveJSON(DISMISSED_KEY, next) }

  return (
    <div style={{ fontFamily: F, display: 'flex', flexDirection: 'column', gap: 18, maxWidth: 900 }}>
      {confirmDialog}
      {loadError && (
        <ErrorBanner
          message="No se pudieron cargar tus notificaciones. Verifica tu conexión."
          onRetry={() => setRetryKey(k => k + 1)}
        />
      )}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
        <div>
          <h1 style={{ fontFamily: D, fontSize: 26, fontWeight: 800, color: 'var(--text)', letterSpacing: '-0.03em', margin: '0 0 6px' }}>
            Notificaciones
          </h1>
          <p style={{ fontSize: 14, color: 'var(--muted)', margin: 0 }}>
            Todo lo que necesitas saber sobre tus canales, campañas y pagos.
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          {counts.unread > 0 && (
            <button onClick={markAllRead} style={iconBtn}>
              <CheckCheck size={13} /> Marcar todo leído
            </button>
          )}
          {filtered.length > 0 && (
            <button onClick={dismissAll} style={{ ...iconBtn, color: ERR, borderColor: `${ERR}30` }}>
              <Trash2 size={13} /> Archivar
            </button>
          )}
        </div>
      </div>

      {/* Filter tabs */}
      <div style={{ display: 'flex', gap: 4, overflowX: 'auto', borderBottom: '1px solid var(--border)', paddingBottom: 0 }}>
        {[
          { id: 'all',     label: 'Todas',    color: ACCENT },
          { id: 'unread',  label: 'Sin leer', color: ACCENT },
          ...Object.entries(TYPE_CFG).map(([id, cfg]) => ({ id, label: cfg.label, color: cfg.color })),
        ].filter(t => t.id === 'all' || t.id === 'unread' || counts[t.id] > 0).map(t => {
          const active = filter === t.id
          return (
            <button key={t.id} onClick={() => setFilter(t.id)} style={{
              background: 'transparent', border: 'none',
              borderBottom: `2px solid ${active ? t.color : 'transparent'}`,
              color: active ? 'var(--text)' : 'var(--muted)',
              fontSize: 12.5, fontWeight: active ? 700 : 500,
              padding: '9px 14px', cursor: 'pointer', fontFamily: F,
              display: 'inline-flex', alignItems: 'center', gap: 6,
              marginBottom: -1, whiteSpace: 'nowrap',
            }}>
              {t.label}
              {counts[t.id] > 0 && (
                <span style={{
                  background: active ? `${t.color}20` : 'var(--bg2)',
                  color: active ? t.color : 'var(--muted2)',
                  borderRadius: 20, padding: '0 6px', fontSize: 10, fontWeight: 800,
                  fontVariantNumeric: 'tabular-nums',
                }}>
                  {counts[t.id]}
                </span>
              )}
            </button>
          )
        })}
      </div>

      {loading ? (
        <div style={{ height: 400, background: 'var(--bg2)', borderRadius: 12, animation: 'pulse 1.5s ease infinite' }} />
      ) : filtered.length === 0 ? (
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 14, padding: 60, textAlign: 'center' }}>
          <BellRing size={36} color="var(--muted2)" style={{ margin: '0 auto 12px' }} />
          <div style={{ fontFamily: D, fontSize: 16, fontWeight: 700, color: 'var(--text)' }}>
            {filter === 'unread' ? 'Todas leídas' : 'Sin notificaciones'}
          </div>
          <div style={{ fontSize: 12.5, color: 'var(--muted)', marginTop: 6 }}>
            {filter === 'unread' ? 'Buen trabajo. Cuando llegue algo nuevo lo verás aquí.' : 'Cuando haya actividad en tus canales aparecerá aquí.'}
          </div>
        </div>
      ) : (
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, overflow: 'hidden' }}>
          {filtered.map((n, i) => (
            <NotifRow key={n.id} n={n} isRead={!!readMap[n.id]} onClick={() => onClick(n)} onDismiss={() => onDismiss(n.id)} isLast={i === filtered.length - 1} />
          ))}
        </div>
      )}
    </div>
  )
}

function NotifRow({ n, isRead, onClick, onDismiss, isLast }) {
  const cfg = TYPE_CFG[n.type] || TYPE_CFG.system
  const Icon = cfg.icon
  return (
    <div onClick={onClick} role="button" tabIndex={0}
      onKeyDown={e => (e.key === 'Enter' || e.key === ' ') && onClick()}
      style={{
        display: 'flex', alignItems: 'flex-start', gap: 12,
        padding: '14px 16px',
        borderBottom: isLast ? 'none' : '1px solid var(--border)',
        cursor: 'pointer',
        background: isRead ? 'transparent' : ga(0.04),
        borderLeft: `3px solid ${isRead ? 'transparent' : cfg.color}`,
        transition: 'background .15s', outline: 'none',
      }}
      onMouseEnter={e => e.currentTarget.style.background = isRead ? 'var(--bg2)' : ga(0.08)}
      onMouseLeave={e => e.currentTarget.style.background = isRead ? 'transparent' : ga(0.04)}
    >
      <div style={{
        width: 36, height: 36, borderRadius: 10, flexShrink: 0,
        background: `${cfg.color}15`, border: `1px solid ${cfg.color}30`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <Icon size={15} color={cfg.color} strokeWidth={2.2} />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 2, flexWrap: 'wrap' }}>
          <span style={{ fontSize: 13, fontWeight: isRead ? 600 : 800, color: 'var(--text)' }}>
            {n.title}
          </span>
          <span style={{
            background: `${cfg.color}10`, color: cfg.color, border: `1px solid ${cfg.color}25`,
            borderRadius: 5, padding: '1px 6px', fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em',
          }}>
            {cfg.label}
          </span>
        </div>
        <div style={{ fontSize: 12, color: 'var(--muted)', lineHeight: 1.5 }}>{n.body}</div>
        <div style={{ fontSize: 10.5, color: 'var(--muted2)', marginTop: 4, display: 'flex', alignItems: 'center', gap: 4 }}>
          <Clock size={9} /> {fmtRel(n.at)}
        </div>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0 }}>
        {!isRead && <span style={{ width: 7, height: 7, borderRadius: 4, background: cfg.color }} />}
        <button onClick={(e) => { e.stopPropagation(); onDismiss() }} title="Archivar"
          style={{
            background: 'transparent', border: 'none', color: 'var(--muted2)', cursor: 'pointer',
            padding: 4, borderRadius: 5, display: 'flex',
          }}
          onMouseEnter={e => e.currentTarget.style.background = 'var(--surface)'}
          onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
          <Trash2 size={11} />
        </button>
      </div>
    </div>
  )
}

const iconBtn = {
  background: 'var(--bg2)', color: 'var(--text)', border: '1px solid var(--border)',
  borderRadius: 8, padding: '7px 11px', fontSize: 12, fontWeight: 600,
  cursor: 'pointer', fontFamily: F, display: 'inline-flex', alignItems: 'center', gap: 5,
}

function synthesizeNotifications({ campaigns, requests, channels }) {
  const out = []
  // New requests
  requests.filter(r => r.status === 'pendiente').forEach(r => {
    out.push({
      id: `req-${r._id || r.id}`, type: 'request', at: r.createdAt,
      title: `Nueva solicitud de ${r.advertiserName || 'advertiser'}`,
      body: `Importe €${r.price || r.budget || 0} para ${typeof r.channel === 'object' ? r.channel?.nombreCanal : r.channel || 'tu canal'}.`,
      path: '/creator/requests',
    })
  })
  // Paid campaigns waiting publication
  campaigns.filter(c => c.status === 'PAID').forEach(c => {
    out.push({
      id: `paid-${c._id || c.id}`, type: 'payment', at: c.paidAt || c.updatedAt || c.createdAt,
      title: 'Pago recibido — listo para publicar',
      body: `${c.advertiserName || 'Un advertiser'} ha pagado €${c.netAmount || c.price || 0}. Publica para liberar el escrow.`,
      path: '/creator/requests',
    })
  })
  // Completed campaigns
  campaigns.filter(c => c.status === 'COMPLETED').slice(0, 20).forEach(c => {
    out.push({
      id: `done-${c._id || c.id}`, type: 'payment', at: c.completedAt || c.updatedAt,
      title: 'Cobro liberado de escrow',
      body: `Has cobrado €${c.netAmount || 0} de ${c.advertiserName || 'advertiser'}. Disponible en saldo.`,
      path: '/creator/earnings',
    })
    if (Number(c.rating) >= 4) {
      out.push({
        id: `rating-${c._id || c.id}`, type: 'rating', at: c.completedAt || c.updatedAt,
        title: `Te valoraron con ${c.rating} ★`,
        body: `${c.advertiserName || 'El advertiser'} dejó una valoración alta tras la campaña.`,
        path: '/creator/profile',
      })
    }
  })
  // Channels needing attention
  channels.filter(c => Number(c.CAS) > 0 && Number(c.CAS) < 40).forEach(c => {
    out.push({
      id: `lowcas-${c._id || c.id}`, type: 'alert', at: Date.now() - 3600 * 1000,
      title: `CAS bajo en ${c.nombreCanal}`,
      body: `Tu canal tiene CAS ${Math.round(c.CAS)}. Mejora la verificación y engagement para subir.`,
      path: '/creator/analytics',
    })
  })
  // Smart suggestions
  if (campaigns.filter(c => c.status === 'COMPLETED').length >= 5) {
    out.push({
      id: 'ai-pricing', type: 'ai', at: Date.now() - 7200 * 1000,
      title: 'Insight IA: puedes subir precios',
      body: 'Tienes histórico suficiente para incrementar tarifas en tus canales mejor valorados.',
      path: '/creator/pricing',
    })
  }
  // Sort desc by date
  return out.sort((a, b) => new Date(b.at) - new Date(a.at))
}

function loadJSON(key, fallback) { try { return JSON.parse(localStorage.getItem(key) || JSON.stringify(fallback)) } catch { return fallback } }
function saveJSON(key, val) { try { localStorage.setItem(key, JSON.stringify(val)) } catch {} }

function fmtRel(date) {
  const ms = Date.now() - new Date(date).getTime()
  if (ms < 60000) return 'ahora'
  const min = Math.floor(ms / 60000)
  if (min < 60) return `hace ${min}m`
  const hr = Math.floor(min / 60)
  if (hr < 24) return `hace ${hr}h`
  const d = Math.floor(hr / 24)
  if (d < 7) return `hace ${d}d`
  return new Date(date).toLocaleDateString('es', { day: 'numeric', month: 'short' })
}
