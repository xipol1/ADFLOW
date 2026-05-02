import React, { useMemo, useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  TrendingUp, TrendingDown, AlertTriangle, Sparkles,
  ArrowRight, ChevronDown, ChevronUp, Wallet, Inbox,
  Radio, Star, X, RotateCcw,
} from 'lucide-react'
import { FONT_BODY, FONT_DISPLAY, OK, WARN, ERR, BLUE } from '../theme/tokens'

const GREEN = 'var(--accent, #22c55e)'
const ga = (o) => `rgba(34,197,94,${o})`
const DISMISS_KEY = 'channelad-creator-insights-dismissed-v1'

/**
 * SmartInsightsCreator — recomendaciones IA específicas para creadores.
 *
 * Mismo patrón rule-based determinista que SmartInsights del advertiser,
 * pero con reglas adaptadas al lado creator: solicitudes pendientes,
 * canales sin verificar, oportunidades de subir precio, CAS bajo, etc.
 *
 * Cada insight es descartable (X) y la decisión persiste en localStorage.
 * Si re-aparece después de descartado (datos cambiaron), se vuelve a mostrar.
 */
export default function SmartInsightsCreator({
  channels = [],
  requests = [],
  campaigns = [],
  className,
  maxItems = 5,
  startCollapsed = false,
}) {
  const navigate = useNavigate()
  const [expanded, setExpanded] = useState(!startCollapsed)
  const [dismissed, setDismissed] = useState(() => loadDismissed())

  const insights = useMemo(
    () => generateInsights({ channels, requests, campaigns }),
    [channels, requests, campaigns],
  )

  const visibleInsights = insights.filter(i => !dismissed[i.id])
  const hasDismissed = Object.keys(dismissed).length > 0

  const dismiss = (id) => {
    const next = { ...dismissed, [id]: Date.now() }
    setDismissed(next)
    saveDismissed(next)
  }

  const restoreAll = () => {
    setDismissed({})
    saveDismissed({})
  }

  if (insights.length === 0) {
    return (
      <div className={className} style={containerStyle}>
        <Header count={0} expanded={expanded} setExpanded={setExpanded} />
        <EmptyState />
      </div>
    )
  }

  if (visibleInsights.length === 0) {
    return (
      <div className={className} style={containerStyle}>
        <Header
          count={0}
          dismissedCount={Object.keys(dismissed).length}
          onRestore={restoreAll}
          expanded={expanded}
          setExpanded={setExpanded}
        />
        <AllDismissedState onRestore={restoreAll} />
      </div>
    )
  }

  // Collapsed: show top 2 high-priority insights
  // Expanded: show up to maxItems
  const visible = expanded ? visibleInsights.slice(0, maxItems) : visibleInsights.slice(0, 2)

  return (
    <div className={className} style={containerStyle}>
      <Header
        count={visibleInsights.length}
        dismissedCount={hasDismissed ? Object.keys(dismissed).length : 0}
        onRestore={hasDismissed ? restoreAll : undefined}
        expanded={expanded}
        setExpanded={setExpanded}
        showToggle={visibleInsights.length > 2}
      />

      <div style={{
        display: 'flex', flexDirection: 'column', gap: 8,
        overflow: 'auto', minHeight: 0, flex: 1,
      }}>
        {visible.map((ins) => (
          <InsightCard key={ins.id} ins={ins} navigate={navigate} onDismiss={() => dismiss(ins.id)} />
        ))}
        {!expanded && visibleInsights.length > 2 && (
          <button onClick={() => setExpanded(true)} style={{
            background: 'transparent', border: '1px dashed var(--border)', borderRadius: 9,
            padding: '8px 12px', fontSize: 11.5, color: 'var(--muted)', fontWeight: 600,
            cursor: 'pointer', fontFamily: FONT_BODY,
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5,
          }}>
            Ver {visibleInsights.length - 2} {visibleInsights.length - 2 === 1 ? 'más' : 'más'} <ChevronDown size={11} />
          </button>
        )}
      </div>
    </div>
  )
}

// ─── Header ─────────────────────────────────────────────────────────────────
function Header({ count, dismissedCount = 0, onRestore, expanded, setExpanded, showToggle = false }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10, flexShrink: 0, gap: 8 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
        <div style={{
          width: 28, height: 28, borderRadius: 8, flexShrink: 0,
          background: ga(0.15), border: `1px solid ${ga(0.3)}`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <Sparkles size={14} color={GREEN} />
        </div>
        <span style={{ fontFamily: FONT_DISPLAY, fontSize: 14, fontWeight: 700, color: 'var(--text)', letterSpacing: '-0.02em', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          Insights inteligentes
        </span>
        {count > 0 && (
          <span style={{
            fontSize: 10.5, fontWeight: 800, color: GREEN,
            background: ga(0.12), border: `1px solid ${ga(0.25)}`,
            borderRadius: 20, padding: '1px 7px', flexShrink: 0,
            fontVariantNumeric: 'tabular-nums',
          }}>
            {count}
          </span>
        )}
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
        {onRestore && (
          <button onClick={onRestore} title={`Restaurar ${dismissedCount} descartado${dismissedCount === 1 ? '' : 's'}`}
            style={iconBtn} aria-label="Restaurar descartados">
            <RotateCcw size={11} />
          </button>
        )}
        {showToggle && (
          <button onClick={() => setExpanded(e => !e)}
            style={{
              background: 'transparent', border: 'none', cursor: 'pointer',
              color: 'var(--muted)', fontSize: 11.5, fontWeight: 600,
              display: 'flex', alignItems: 'center', gap: 4, fontFamily: FONT_BODY,
              padding: '4px 6px', borderRadius: 6,
            }}>
            {expanded ? <>Menos <ChevronUp size={11} /></> : <>Ver todos <ChevronDown size={11} /></>}
          </button>
        )}
      </div>
    </div>
  )
}

// ─── Insight card ───────────────────────────────────────────────────────────
function InsightCard({ ins, navigate, onDismiss }) {
  const Icon = ins.icon
  const handleClick = (e) => {
    if (e.target.closest('[data-dismiss-btn]')) return
    if (ins.path) navigate(ins.path)
  }
  return (
    <div onClick={handleClick}
      role={ins.path ? 'button' : undefined}
      tabIndex={ins.path ? 0 : undefined}
      onKeyDown={(e) => ins.path && (e.key === 'Enter' || e.key === ' ') && navigate(ins.path)}
      style={{
        position: 'relative',
        display: 'flex', alignItems: 'flex-start', gap: 10,
        padding: '10px 12px 10px 12px', borderRadius: 10,
        background: `${ins.color}08`,
        border: `1px solid ${ins.color}22`,
        cursor: ins.path ? 'pointer' : 'default',
        transition: 'background .12s, border-color .12s, transform .12s',
        flexShrink: 0,
        outline: 'none',
      }}
      onMouseEnter={e => { if (ins.path) { e.currentTarget.style.background = `${ins.color}14`; e.currentTarget.style.borderColor = `${ins.color}44`; e.currentTarget.style.transform = 'translateY(-1px)' } }}
      onMouseLeave={e => { e.currentTarget.style.background = `${ins.color}08`; e.currentTarget.style.borderColor = `${ins.color}22`; e.currentTarget.style.transform = 'none' }}
      onFocus={e => { e.currentTarget.style.boxShadow = `0 0 0 3px ${ins.color}22` }}
      onBlur={e => { e.currentTarget.style.boxShadow = 'none' }}
    >
      <div style={{
        width: 28, height: 28, borderRadius: 7, flexShrink: 0,
        background: `${ins.color}15`, border: `1px solid ${ins.color}30`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <Icon size={13} color={ins.color} strokeWidth={2.2} />
      </div>
      <div style={{ flex: 1, minWidth: 0, paddingRight: 18 }}>
        <div style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--text)', marginBottom: 2 }}>
          {ins.title}
        </div>
        <div style={{ fontSize: 11.5, color: 'var(--muted)', lineHeight: 1.4 }}>
          {ins.body}
        </div>
        {ins.path && (
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 3, color: ins.color, fontSize: 11, fontWeight: 700, marginTop: 6 }}>
            {ins.cta || 'Ver'} <ArrowRight size={11} />
          </div>
        )}
      </div>
      <button data-dismiss-btn onClick={(e) => { e.stopPropagation(); onDismiss() }}
        title="Descartar" aria-label="Descartar"
        style={{
          position: 'absolute', top: 6, right: 6,
          width: 20, height: 20, borderRadius: 5, flexShrink: 0,
          background: 'transparent', border: 'none',
          color: 'var(--muted2)', cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          opacity: 0.55, transition: 'opacity .15s, background .15s',
        }}
        onMouseEnter={e => { e.currentTarget.style.opacity = 1; e.currentTarget.style.background = 'var(--bg2)' }}
        onMouseLeave={e => { e.currentTarget.style.opacity = 0.55; e.currentTarget.style.background = 'transparent' }}
      >
        <X size={12} />
      </button>
    </div>
  )
}

// ─── Empty / all-dismissed states ───────────────────────────────────────────
function EmptyState() {
  return (
    <div style={{
      flex: 1, minHeight: 0,
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      gap: 8, padding: '20px 16px', textAlign: 'center',
    }}>
      <div style={{
        width: 36, height: 36, borderRadius: 10,
        background: ga(0.1), border: `1px solid ${ga(0.25)}`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <Sparkles size={16} color={GREEN} />
      </div>
      <div style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--text)' }}>
        Todo en orden
      </div>
      <div style={{ fontSize: 11, color: 'var(--muted)', lineHeight: 1.5, maxWidth: 240 }}>
        No hay nada urgente. Las recomendaciones aparecerán aquí cuando detectemos oportunidades.
      </div>
    </div>
  )
}

function AllDismissedState({ onRestore }) {
  return (
    <div style={{
      flex: 1, minHeight: 0,
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      gap: 8, padding: '20px 16px', textAlign: 'center',
    }}>
      <div style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--text)' }}>
        Has descartado todos los insights
      </div>
      <button onClick={onRestore} style={{
        background: ga(0.12), color: GREEN, border: `1px solid ${ga(0.3)}`,
        borderRadius: 8, padding: '6px 12px', fontSize: 11.5, fontWeight: 700,
        cursor: 'pointer', fontFamily: FONT_BODY,
        display: 'inline-flex', alignItems: 'center', gap: 5,
      }}>
        <RotateCcw size={11} /> Restaurar todos
      </button>
    </div>
  )
}

// ─── Persistence ────────────────────────────────────────────────────────────
function loadDismissed() {
  if (typeof localStorage === 'undefined') return {}
  try {
    const raw = localStorage.getItem(DISMISS_KEY)
    if (!raw) return {}
    const parsed = JSON.parse(raw)
    // Auto-expire after 14 days — recommendations may be relevant again later
    const cutoff = Date.now() - 14 * 24 * 60 * 60 * 1000
    const filtered = {}
    for (const [k, ts] of Object.entries(parsed)) {
      if (typeof ts === 'number' && ts > cutoff) filtered[k] = ts
    }
    return filtered
  } catch { return {} }
}

function saveDismissed(map) {
  if (typeof localStorage === 'undefined') return
  try { localStorage.setItem(DISMISS_KEY, JSON.stringify(map)) } catch {}
}

// ─── Styles ─────────────────────────────────────────────────────────────────
const containerStyle = {
  background: 'var(--surface)',
  border: `1px solid ${ga(0.2)}`,
  borderRadius: 14, padding: 16,
  fontFamily: FONT_BODY,
  height: '100%',
  display: 'flex',
  flexDirection: 'column',
  minHeight: 0,
}

const iconBtn = {
  background: 'var(--bg2)', color: 'var(--muted)',
  border: '1px solid var(--border)', borderRadius: 6,
  width: 24, height: 22, display: 'flex', alignItems: 'center', justifyContent: 'center',
  cursor: 'pointer', flexShrink: 0,
}

// ─── Rules ──────────────────────────────────────────────────────────────────
function generateInsights({ channels, requests, campaigns }) {
  const all = [
    rulePendingRequests(requests, campaigns),
    rulePaidUnpublished(campaigns),
    ruleNoChannels(channels),
    ruleLowCAS(channels),
    ruleHighPerformerScale(campaigns, channels),
    rulePricingOpportunity(campaigns, channels),
    ruleStaleRequests(requests),
    ruleVerificationPending(channels),
  ].filter(Boolean)

  all.sort((a, b) => (a.priority || 50) - (b.priority || 50))
  return all
}

function rulePendingRequests(requests, campaigns) {
  const pendingReq = requests.filter(r => r.status === 'pendiente').length
  const pendingPaid = campaigns.filter(c => c.status === 'PAID').length
  const total = pendingReq + pendingPaid
  if (total === 0) return null
  return {
    id: 'pending-requests',
    icon: Inbox,
    color: WARN,
    priority: 5,
    title: `${total} ${total === 1 ? 'solicitud sin responder' : 'solicitudes sin responder'}`,
    body: pendingPaid > 0
      ? `Tienes ${pendingPaid} ${pendingPaid === 1 ? 'campaña pagada' : 'campañas pagadas'} esperando publicación. Cada hora cuenta para tu rating.`
      : 'Anunciantes esperando tu respuesta. La velocidad de respuesta afecta tu CAS.',
    cta: 'Responder',
    path: '/creator/requests',
  }
}

function rulePaidUnpublished(campaigns) {
  const stalePaid = campaigns.filter(c => {
    if (c.status !== 'PAID') return false
    const days = (Date.now() - new Date(c.updatedAt || c.createdAt).getTime()) / 86400000
    return days >= 1
  })
  if (stalePaid.length === 0) return null
  return {
    id: 'paid-stale',
    icon: AlertTriangle,
    color: ERR,
    priority: 1,
    title: `${stalePaid.length} ${stalePaid.length === 1 ? 'campaña pagada sin publicar' : 'campañas pagadas sin publicar'}`,
    body: 'Llevas más de 24h sin publicar campañas pagadas. Riesgo de disputa y bajada de rating.',
    cta: 'Publicar ahora',
    path: '/creator/requests',
  }
}

function ruleNoChannels(channels) {
  if (channels.length > 0) return null
  return {
    id: 'no-channels',
    icon: Radio,
    color: GREEN,
    priority: 10,
    title: 'Aún no tienes canales',
    body: 'Registra tu primer canal de Telegram, WhatsApp o Discord para empezar a recibir propuestas.',
    cta: 'Empezar',
    path: '/creator/channels/new',
  }
}

function ruleLowCAS(channels) {
  const withCAS = channels.filter(c => Number(c.CAS) > 0)
  if (withCAS.length === 0) return null
  const lowCAS = withCAS.filter(c => c.CAS < 40)
  if (lowCAS.length === 0) return null
  const ch = lowCAS[0]
  return {
    id: 'low-cas',
    icon: TrendingDown,
    color: WARN,
    priority: 25,
    title: `CAS bajo en ${ch.nombreCanal || 'tu canal'}`,
    body: `${ch.nombreCanal || 'Tu canal'} tiene CAS ${Math.round(ch.CAS)}. Conecta OAuth y verifica métricas para subir tu autoridad.`,
    cta: 'Mejorar',
    path: '/creator/analytics',
  }
}

function ruleHighPerformerScale(campaigns, channels) {
  const completed = campaigns.filter(c => c.status === 'COMPLETED')
  if (completed.length < 3) return null
  const channelMap = {}
  completed.forEach(c => {
    const name = typeof c.channel === 'object' ? c.channel?.nombreCanal : c.channel || '?'
    if (!channelMap[name]) channelMap[name] = { name, revenue: 0, count: 0, ratings: [] }
    channelMap[name].revenue += (c.netAmount || c.price || 0)
    channelMap[name].count++
    if (Number(c.rating) > 0) channelMap[name].ratings.push(Number(c.rating))
  })
  const top = Object.values(channelMap)
    .map(x => ({ ...x, avgRating: x.ratings.length ? x.ratings.reduce((s, r) => s + r, 0) / x.ratings.length : 0 }))
    .filter(x => x.count >= 2 && x.avgRating >= 4.5)
    .sort((a, b) => b.revenue - a.revenue)[0]
  if (!top) return null
  return {
    id: 'top-performer',
    icon: TrendingUp,
    color: OK,
    priority: 30,
    title: `${top.name} es tu canal estrella`,
    body: `${top.count} campañas completadas, rating ${top.avgRating.toFixed(1)}★. Sube precio o solicita más promoción.`,
    cta: 'Ver pricing',
    path: '/creator/pricing',
  }
}

function rulePricingOpportunity(campaigns) {
  const completed = campaigns.filter(c => c.status === 'COMPLETED')
  if (completed.length < 5) return null
  const ratings = completed.filter(c => Number(c.rating) > 0).map(c => Number(c.rating))
  if (ratings.length < 3) return null
  const avg = ratings.reduce((s, r) => s + r, 0) / ratings.length
  if (avg < 4.5) return null
  return {
    id: 'pricing-up',
    icon: Wallet,
    color: BLUE,
    priority: 40,
    title: 'Puedes subir tus precios',
    body: `Rating medio ${avg.toFixed(1)}★ tras ${ratings.length} campañas. El mercado paga más por tu calidad.`,
    cta: 'Optimizar',
    path: '/creator/pricing',
  }
}

function ruleStaleRequests(requests) {
  const stale = requests.filter(r => {
    if (r.status !== 'pendiente') return false
    const days = (Date.now() - new Date(r.createdAt).getTime()) / 86400000
    return days >= 2
  })
  if (stale.length === 0) return null
  return {
    id: 'stale-requests',
    icon: AlertTriangle,
    color: WARN,
    priority: 15,
    title: `${stale.length} ${stale.length === 1 ? 'solicitud lleva' : 'solicitudes llevan'} más de 2 días`,
    body: 'Sin responder a tiempo, los anunciantes se irán. Responde aunque sea para rechazar.',
    cta: 'Revisar',
    path: '/creator/requests',
  }
}

function ruleVerificationPending(channels) {
  const unverified = channels.filter(c => {
    const score = c.verificacion?.confianzaScore
    return score == null || score < 40
  })
  if (unverified.length === 0 || channels.length === 0) return null
  return {
    id: 'verify-channels',
    icon: Star,
    color: '#f59e0b',
    priority: 35,
    title: `Verifica ${unverified.length} ${unverified.length === 1 ? 'canal' : 'canales'}`,
    body: 'Los canales verificados reciben 3× más propuestas. Conecta OAuth para subir tu Confianza.',
    cta: 'Verificar',
    path: '/creator/channels',
  }
}
