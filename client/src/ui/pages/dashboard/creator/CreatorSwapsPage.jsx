import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react'
import {
  Repeat, Search, Inbox, Send, Activity, CheckCircle2, X,
  Users, Radio, ArrowRight, Clock, Star, Sparkles, AlertCircle,
  ChevronRight, Calendar, MessageSquare, Copy, Check, Link2,
} from 'lucide-react'
import apiService from '../../../../services/api'
import { useAuth } from '../../../../auth/AuthContext'
import { FONT_BODY as F, FONT_DISPLAY as D, GREEN, greenAlpha, OK, WARN, ERR, BLUE } from '../../../theme/tokens'
import { ErrorBanner, useConfirm } from '../shared/DashComponents'

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
  const { user } = useAuth()
  const currentUserId = String(user?._id || user?.id || '')
  const [tab, setTab] = useState('descubrir')
  const [channels, setChannels] = useState([])
  const [selectedChannelId, setSelectedChannelId] = useState('')
  const [loading, setLoading] = useState(true)
  const [partners, setPartners] = useState([])
  const [swaps, setSwaps] = useState([])
  const [proposeTo, setProposeTo] = useState(null) // partner being proposed to
  const [detail, setDetail] = useState(null)        // swap being viewed
  const [toast, setToast] = useState(null)
  const [loadError, setLoadError] = useState(false)
  const [partnersError, setPartnersError] = useState(false)
  const [swapsError, setSwapsError] = useState(false)
  const [retryKey, setRetryKey] = useState(0)

  const showToast = (msg, ok = true) => { setToast({ msg, ok }); setTimeout(() => setToast(null), 2500) }
  const { confirm, dialog: confirmDialog } = useConfirm()

  // ── Initial load: my channels ──
  useEffect(() => {
    let mounted = true
    setLoadError(false)
    setLoading(true)
    apiService.getMyChannels().then(res => {
      if (!mounted) return
      if (res?.success) {
        const list = Array.isArray(res.data) ? res.data : res.data?.items || []
        setChannels(list)
        if (list.length && !selectedChannelId) setSelectedChannelId(list[0]._id || list[0].id)
      } else {
        setLoadError(true)
      }
      setLoading(false)
    }).catch(() => { if (mounted) { setLoadError(true); setLoading(false) } })
    return () => { mounted = false }
  }, [retryKey])

  // ── Reload partners when channel changes ──
  const loadPartners = useCallback(async () => {
    if (!selectedChannelId) return
    setPartnersError(false)
    try {
      const res = await apiService.discoverSwapPartners(selectedChannelId)
      if (res?.success) setPartners(Array.isArray(res.data) ? res.data : [])
      else setPartnersError(true)
    } catch { setPartnersError(true) }
  }, [selectedChannelId])

  // ── Reload swaps ──
  const loadSwaps = useCallback(async () => {
    setSwapsError(false)
    try {
      const res = await apiService.listMySwaps('all')
      if (res?.success) setSwaps(Array.isArray(res.data) ? res.data : [])
      else setSwapsError(true)
    } catch { setSwapsError(true) }
  }, [])

  const retryAll = () => {
    setRetryKey(k => k + 1)
    loadPartners()
    loadSwaps()
  }

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

  // Track recently-rejected swaps for a 5-minute undo window.
  // Stored as { [swapId]: { swap, expiresAt } } — swap snapshot is what we
  // need to re-propose if the creator clicks "Deshacer".
  const [undoMap, setUndoMap] = useState({})
  useEffect(() => {
    if (Object.keys(undoMap).length === 0) return undefined
    const t = setInterval(() => {
      const now = Date.now()
      setUndoMap(prev => {
        const next = {}
        let changed = false
        for (const [k, v] of Object.entries(prev)) {
          if (v.expiresAt > now) next[k] = v
          else changed = true
        }
        return changed ? next : prev
      })
    }, 1000)
    return () => clearInterval(t)
  }, [undoMap])

  const handleUndoReject = async (swap) => {
    if (!swap) return
    try {
      const res = await apiService.createSwap({
        requesterChannel: swap.requesterChannel?._id || swap.requesterChannel,
        recipientChannel: swap.recipientChannel?._id || swap.recipientChannel,
        propuesta: swap.propuesta || { mensaje: '', formato: 'post_simple', duracionHoras: 24 },
      })
      if (res?.success) {
        showToast('Propuesta restaurada')
        setUndoMap(prev => { const n = { ...prev }; delete n[swap._id]; return n })
        loadSwaps()
      } else {
        showToast(res?.message || 'No se pudo deshacer', false)
      }
    } catch { showToast('Error de conexión', false) }
  }

  const handleReject = async (id) => {
    const ok = await confirm({
      title: 'Rechazar propuesta',
      message: '¿Rechazar esta propuesta de colaboración? Tendrás 5 minutos para deshacer.',
      confirmLabel: 'Rechazar',
      tone: 'danger',
    })
    if (!ok) return
    const swap = swaps.find(s => s._id === id)
    try {
      const res = await apiService.rejectSwap(id)
      if (res?.success) {
        showToast('Rechazado')
        if (swap) {
          setUndoMap(prev => ({
            ...prev,
            [id]: { swap, expiresAt: Date.now() + 5 * 60_000 },
          }))
        }
        loadSwaps()
      } else {
        showToast(res?.message || 'Error', false)
      }
    } catch { showToast('Error de conexión', false) }
  }

  const handleMarkPublished = async (id, messageId) => {
    try {
      const res = await apiService.markSwapPublished(id, { messageId: messageId || '' })
      if (res?.success) {
        showToast('Marcado como publicado')
        loadSwaps()
        // Refetch the open swap so the modal shows the new state
        const fresh = await apiService.getSwap(id)
        if (fresh?.success) setDetail(fresh.data)
      } else showToast(res?.message || 'Error', false)
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
      {confirmDialog}
      {/* Header */}
      <Header />

      {(loadError || partnersError || swapsError) && (
        <ErrorBanner
          message={
            loadError
              ? 'No se pudieron cargar tus canales. Verifica tu conexión.'
              : partnersError && swapsError
                ? 'No se pudieron cargar partners ni colaboraciones. Verifica tu conexión.'
                : partnersError
                  ? 'No se pudieron cargar los partners sugeridos.'
                  : 'No se pudieron cargar tus colaboraciones.'
          }
          onRetry={retryAll}
        />
      )}

      {/* Channel selector */}
      <ChannelSelector
        channels={channels}
        selectedId={selectedChannelId}
        onChange={setSelectedChannelId}
      />

      {/* Tabs */}
      <Tabs tab={tab} onChange={setTab} counts={counts} />

      {/* Undo reject banners */}
      {Object.entries(undoMap).map(([id, entry]) => (
        <UndoRejectBanner
          key={id}
          swap={entry.swap}
          expiresAt={entry.expiresAt}
          onUndo={() => handleUndoReject(entry.swap)}
          onDismiss={() => setUndoMap(prev => { const n = { ...prev }; delete n[id]; return n })}
        />
      ))}

      {/* Content */}
      {tab === 'descubrir' && (
        <div role="tabpanel" id="swap-panel-descubrir" aria-labelledby="swap-tab-descubrir">
          <DiscoverTab partners={partners} onPropose={setProposeTo} loading={loading} />
        </div>
      )}
      {tab === 'recibidos' && (
        <div role="tabpanel" id="swap-panel-recibidos" aria-labelledby="swap-tab-recibidos">
          <SwapsList
            swaps={swaps.filter(s => s.status === 'propuesto')}
            role="incoming"
            onAccept={handleAccept}
            onReject={handleReject}
            onView={setDetail}
          />
        </div>
      )}
      {tab === 'enviados' && (
        <div role="tabpanel" id="swap-panel-enviados" aria-labelledby="swap-tab-enviados">
          <SwapsList
            swaps={swaps.filter(s => s.status === 'propuesto')}
            role="outgoing"
            onView={setDetail}
          />
        </div>
      )}
      {tab === 'activos' && (
        <div role="tabpanel" id="swap-panel-activos" aria-labelledby="swap-tab-activos">
          <SwapsList
            swaps={swaps.filter(s => ['aceptado', 'publicado_a', 'publicado_b', 'publicado_ambos'].includes(s.status))}
            role="active"
            onView={setDetail}
          />
        </div>
      )}
      {tab === 'historico' && (
        <div role="tabpanel" id="swap-panel-historico" aria-labelledby="swap-tab-historico">
          <SwapsList
            swaps={swaps.filter(s => ['completado', 'rechazado', 'expirado', 'cancelado'].includes(s.status))}
            role="history"
            onView={setDetail}
          />
        </div>
      )}

      {/* Modals */}
      {proposeTo && (
        <ProposeModal partner={proposeTo} onClose={() => setProposeTo(null)} onConfirm={handlePropose} />
      )}
      {detail && (
        <SwapDetailModal
          swap={detail}
          currentUserId={currentUserId}
          onClose={() => setDetail(null)}
          onMarkPublished={handleMarkPublished}
        />
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
    <div role="tablist" aria-label="Filtros de colaboraciones" style={{
      display: 'flex', gap: 4, borderBottom: '1px solid var(--border)', overflowX: 'auto',
    }}>
      {items.map(it => {
        const Icon = it.icon
        const active = tab === it.id
        const countLabel = it.count > 0 ? ` (${it.count})` : ''
        return (
          <button
            key={it.id}
            role="tab"
            id={`swap-tab-${it.id}`}
            aria-selected={active}
            aria-controls={`swap-panel-${it.id}`}
            tabIndex={active ? 0 : -1}
            aria-label={`${it.label}${countLabel}`}
            onClick={() => onChange(it.id)}
            style={{
              background: 'transparent', border: 'none', borderBottom: `2px solid ${active ? ACCENT : 'transparent'}`,
              color: active ? ACCENT : 'var(--muted)',
              padding: '10px 16px', fontSize: 13, fontWeight: 700, fontFamily: F, cursor: 'pointer',
              display: 'flex', alignItems: 'center', gap: 7, whiteSpace: 'nowrap',
              transition: 'color .15s, border-color .15s',
            }}
          >
            <Icon size={14} aria-hidden="true" /> {it.label}
            {it.count > 0 && (
              <span aria-hidden="true" style={{
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
  const [search, setSearch] = useState('')
  const [platform, setPlatform] = useState('all')
  const [sortBy, setSortBy] = useState('match') // match | followers | platform | name

  const platforms = useMemo(
    () => Array.from(new Set(partners.map(p => p.plataforma).filter(Boolean))),
    [partners],
  )

  const filtered = useMemo(() => {
    let list = partners
    if (platform !== 'all') list = list.filter(p => p.plataforma === platform)
    if (search.trim()) {
      const q = search.toLowerCase()
      list = list.filter(p =>
        (p.nombreCanal || '').toLowerCase().includes(q) ||
        (p.categoria || '').toLowerCase().includes(q) ||
        (p.bio || '').toLowerCase().includes(q)
      )
    }
    const sorted = list.slice()
    sorted.sort((a, b) => {
      if (sortBy === 'followers') return (b.seguidores || 0) - (a.seguidores || 0)
      if (sortBy === 'name')      return (a.nombreCanal || '').localeCompare(b.nombreCanal || '')
      if (sortBy === 'platform')  return (a.plataforma || '').localeCompare(b.plataforma || '')
      return (b.matchScore || 0) - (a.matchScore || 0)
    })
    return sorted
  }, [partners, search, platform, sortBy])

  if (loading) return <Loading />
  if (!partners.length) {
    return <Empty
      icon={Search}
      title="Sin candidatos por ahora"
      subtitle="Cuando haya más canales activos en tu nicho los verás aquí ordenados por compatibilidad."
    />
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {/* Filters bar */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center' }}>
        <div style={{ position: 'relative', flex: '1 1 220px', minWidth: 180 }}>
          <Search size={13} aria-hidden="true" style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--muted)', pointerEvents: 'none' }} />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Buscar por canal, nicho o bio…"
            aria-label="Buscar partners"
            style={{
              width: '100%', boxSizing: 'border-box',
              background: 'var(--bg2)', color: 'var(--text)', border: '1px solid var(--border)',
              borderRadius: 8, padding: '7px 10px 7px 30px', fontSize: 12.5, fontFamily: F, outline: 'none',
            }}
          />
        </div>
        {platforms.length > 1 && (
          <select
            value={platform}
            onChange={e => setPlatform(e.target.value)}
            aria-label="Filtrar por plataforma"
            style={selectStyle}
          >
            <option value="all">Todas las plataformas</option>
            {platforms.map(p => <option key={p} value={p}>{p}</option>)}
          </select>
        )}
        <select
          value={sortBy}
          onChange={e => setSortBy(e.target.value)}
          aria-label="Ordenar por"
          style={selectStyle}
        >
          <option value="match">Mejor match</option>
          <option value="followers">Más seguidores</option>
          <option value="name">Nombre A-Z</option>
          <option value="platform">Plataforma</option>
        </select>
        <span style={{ fontSize: 11.5, color: 'var(--muted)', marginLeft: 'auto' }}>
          {filtered.length} de {partners.length}
        </span>
      </div>

      {filtered.length === 0 ? (
        <div style={{ padding: 30, textAlign: 'center', color: 'var(--muted)', fontSize: 13 }}>
          Ningún partner coincide con tus filtros.
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 240px), 1fr))', gap: 12 }}>
          {filtered.map(p => <PartnerCard key={p._id} partner={p} onPropose={() => onPropose(p)} />)}
        </div>
      )}
    </div>
  )
}

const selectStyle = {
  background: 'var(--bg2)', color: 'var(--text)', border: '1px solid var(--border)',
  borderRadius: 8, padding: '7px 10px', fontSize: 12.5, fontFamily: 'inherit', outline: 'none',
  cursor: 'pointer',
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

      {/* Match score with breakdown tooltip */}
      <MatchScoreBar score={score} scoreColor={scoreColor} partner={partner} />

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
function SwapDetailModal({ swap, currentUserId, onClose, onMarkPublished }) {
  const status = STATUS_LABEL[swap.status] || { label: swap.status, color: 'var(--muted)' }
  const requesterId = String(swap.requester?._id || swap.requester || '')
  const recipientId = String(swap.recipient?._id || swap.recipient || '')
  const iAmRequester = currentUserId === requesterId
  const iAmRecipient = currentUserId === recipientId

  // The TrackingUrl I should publish (the link in MY post drives traffic to the OTHER channel)
  const myContent     = iAmRequester ? swap.contenidoRequester : iAmRecipient ? swap.contenidoRecipient : null
  const partnerContent = iAmRequester ? swap.contenidoRecipient : iAmRecipient ? swap.contenidoRequester : null
  const myTrackingUrl   = myContent?.trackingUrl
  const myPublishedAt   = myContent?.publicadoEn
  const partnerPublishedAt = partnerContent?.publicadoEn
  const otherChannel = iAmRequester ? swap.recipientChannel : swap.requesterChannel

  const showTrackingFlow = ['aceptado', 'publicado_a', 'publicado_b'].includes(swap.status)
  const [messageId, setMessageId] = useState('')

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

      {/* Tracking URL + publish flow */}
      {showTrackingFlow && myTrackingUrl && (
        <div style={{
          background: ga(0.06), border: `1px solid ${ga(0.25)}`, borderRadius: 12,
          padding: 14, marginBottom: 14,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
            <Link2 size={14} color={ACCENT} />
            <div style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--text)' }}>
              Tu link para publicar
            </div>
          </div>
          <div style={{ fontSize: 11.5, color: 'var(--muted)', lineHeight: 1.5, marginBottom: 10 }}>
            Copia este enlace y publícalo en tu canal junto a una mención de <strong style={{ color: 'var(--text)' }}>{otherChannel?.nombreCanal}</strong>.
            Cada click cuenta como conversión real.
          </div>
          <CopyableUrl url={myTrackingUrl} />

          {!myPublishedAt && (
            <div style={{ marginTop: 12, paddingTop: 12, borderTop: `1px solid ${ga(0.2)}` }}>
              <div style={{ fontSize: 11.5, fontWeight: 600, color: 'var(--text)', marginBottom: 6 }}>
                Cuando publiques, márcalo aquí:
              </div>
              <div style={{ display: 'flex', gap: 6 }}>
                <input
                  type="text"
                  value={messageId}
                  onChange={e => setMessageId(e.target.value)}
                  placeholder="ID del mensaje (opcional)"
                  style={{
                    flex: 1, background: 'var(--bg)', color: 'var(--text)',
                    border: '1px solid var(--border)', borderRadius: 8,
                    padding: '7px 10px', fontSize: 12, fontFamily: F,
                  }}
                />
                <button onClick={() => onMarkPublished(swap._id, messageId)} style={btnPrimary}>
                  <CheckCircle2 size={13} /> Marcar publicado
                </button>
              </div>
            </div>
          )}

          {myPublishedAt && (
            <div style={{
              marginTop: 12, paddingTop: 12, borderTop: `1px solid ${ga(0.2)}`,
              display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: OK, fontWeight: 600,
            }}>
              <CheckCircle2 size={13} /> Publicado el {new Date(myPublishedAt).toLocaleString('es')}
              {!partnerPublishedAt && (
                <span style={{ color: 'var(--muted)', fontWeight: 500, marginLeft: 6 }}>
                  · Esperando que la otra parte publique
                </span>
              )}
            </div>
          )}
        </div>
      )}

      {(swap.resultados?.clicksRequester > 0 || swap.resultados?.clicksRecipient > 0) && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 14 }}>
          <Stat
            label={iAmRequester ? 'Clicks que diste' : 'Clicks recibidos'}
            value={swap.resultados.clicksRequester}
          />
          <Stat
            label={iAmRecipient ? 'Clicks que diste' : 'Clicks recibidos'}
            value={swap.resultados.clicksRecipient}
          />
        </div>
      )}

      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
        <button onClick={onClose} style={btnGhost}>Cerrar</button>
      </div>
    </ModalShell>
  )
}

function CopyableUrl({ url }) {
  const [copied, setCopied] = useState(false)
  const copy = async () => {
    try { await navigator.clipboard.writeText(url); setCopied(true); setTimeout(() => setCopied(false), 1500) } catch {}
  }
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 6,
      background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 9,
      padding: '7px 10px',
    }}>
      <code style={{
        flex: 1, fontSize: 12, color: 'var(--text)', fontFamily: 'ui-monospace, monospace',
        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
      }}>
        {url}
      </code>
      <button onClick={copy} title="Copiar" style={{
        background: 'transparent', border: 'none', cursor: 'pointer', padding: 4,
        color: copied ? OK : 'var(--muted)', display: 'flex',
      }}>
        {copied ? <Check size={14} /> : <Copy size={14} />}
      </button>
    </div>
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

// ─── Undo reject banner ─────────────────────────────────────────────────────
function UndoRejectBanner({ swap, expiresAt, onUndo, onDismiss }) {
  const [now, setNow] = useState(Date.now())
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(t)
  }, [])
  const remaining = Math.max(0, expiresAt - now)
  if (remaining <= 0) return null
  const sec = Math.ceil(remaining / 1000)
  const label = sec >= 60 ? `${Math.ceil(sec / 60)} min` : `${sec}s`
  const partnerName = swap?.recipientChannel?.nombreCanal || swap?.requesterChannel?.nombreCanal || 'el partner'
  return (
    <div role="status" aria-live="polite" style={{
      background: `${WARN}10`, border: `1px solid ${WARN}40`, color: 'var(--text)',
      borderRadius: 12, padding: '10px 14px', fontSize: 13,
      display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap',
    }}>
      <AlertCircle size={14} color={WARN} aria-hidden="true" />
      <span style={{ flex: 1, minWidth: 200 }}>
        Propuesta con <strong>{partnerName}</strong> rechazada. Puedes deshacer durante {label}.
      </span>
      <button onClick={onUndo} style={{
        background: WARN, color: '#fff', border: 'none', borderRadius: 8,
        padding: '6px 12px', fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: F,
      }}>Deshacer</button>
      <button onClick={onDismiss} aria-label="Descartar aviso" style={{
        background: 'transparent', color: 'var(--muted)', border: 'none', cursor: 'pointer', padding: 4, display: 'flex',
      }}>
        <X size={14} />
      </button>
    </div>
  )
}

// ─── MatchScore bar with explainer tooltip ──────────────────────────────────
function MatchScoreBar({ score, scoreColor, partner }) {
  const [hover, setHover] = useState(false)

  // Best-effort breakdown: surface what we can derive from the partner
  // record. Backend may already expose `matchBreakdown`; fall back to
  // heuristics so users always see *why* the score is what it is.
  const breakdown = useMemo(() => {
    if (Array.isArray(partner?.matchBreakdown) && partner.matchBreakdown.length > 0) {
      return partner.matchBreakdown
    }
    const items = []
    if (partner?.plataforma) items.push({ label: 'Misma plataforma', weight: '+30' })
    if (partner?.categoria) items.push({ label: `Mismo nicho (${partner.categoria})`, weight: '+25' })
    if (partner?.seguidores) {
      const k = partner.seguidores >= 1000 ? `${Math.round(partner.seguidores / 1000)}K` : partner.seguidores
      items.push({ label: `Audiencia comparable · ${k}`, weight: '+20' })
    }
    if (partner?.verificado) items.push({ label: 'Canal verificado', weight: '+15' })
    if (partner?.previousSwapsCount) items.push({ label: `${partner.previousSwapsCount} colaboraciones previas`, weight: '+10' })
    if (items.length === 0) items.push({ label: 'Sin desglose disponible', weight: '—' })
    return items
  }, [partner])

  return (
    <div style={{ position: 'relative' }}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      onFocus={() => setHover(true)}
      onBlur={() => setHover(false)}
      tabIndex={0}
      aria-label={`Match score ${score}%. Pulsa para ver el desglose.`}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <div style={{ flex: 1, height: 6, borderRadius: 3, background: 'var(--bg2)', overflow: 'hidden' }}>
          <div style={{ width: `${score}%`, height: '100%', background: scoreColor, transition: 'width .4s' }} />
        </div>
        <span style={{ fontSize: 11, fontWeight: 700, color: scoreColor, minWidth: 32, textAlign: 'right' }}>
          {score}% match
        </span>
        <AlertCircle size={11} color="var(--muted2)" aria-hidden="true" />
      </div>
      {hover && (
        <div role="tooltip" style={{
          position: 'absolute', bottom: 'calc(100% + 8px)', left: 0, right: 0, zIndex: 30,
          background: 'rgba(15,15,18,0.96)', color: '#fff', borderRadius: 10,
          padding: '10px 12px', fontSize: 11.5, lineHeight: 1.4,
          boxShadow: '0 8px 24px rgba(0,0,0,0.35)',
        }}>
          <div style={{ fontWeight: 800, marginBottom: 6, fontSize: 12 }}>¿Cómo calculamos el match?</div>
          {breakdown.map((b, i) => (
            <div key={i} style={{ display: 'flex', justifyContent: 'space-between', gap: 12, padding: '2px 0' }}>
              <span style={{ opacity: 0.85 }}>{b.label}</span>
              <span style={{ color: scoreColor, fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>{b.weight}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ─── Generic UI ────────────────────────────────────────────────────────────
function ModalShell({ children, title, icon: Icon, onClose }) {
  const dialogRef = useRef(null)
  const previouslyFocused = useRef(null)
  const titleId = useMemo(() => `modal-title-${Math.random().toString(36).slice(2, 9)}`, [])

  useEffect(() => {
    previouslyFocused.current = document.activeElement
    const onKey = (e) => {
      if (e.key === 'Escape') { e.stopPropagation(); onClose?.() }
      if (e.key === 'Tab' && dialogRef.current) {
        // Simple focus trap
        const focusables = dialogRef.current.querySelectorAll(
          'a[href], button:not([disabled]), textarea, input, select, [tabindex]:not([tabindex="-1"])'
        )
        if (focusables.length === 0) return
        const first = focusables[0]
        const last = focusables[focusables.length - 1]
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus() }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus() }
      }
    }
    document.addEventListener('keydown', onKey)
    // Move focus into dialog
    setTimeout(() => {
      const focusable = dialogRef.current?.querySelector(
        'button:not([disabled]), input, textarea, select, [tabindex]:not([tabindex="-1"])'
      )
      focusable?.focus()
    }, 0)
    return () => {
      document.removeEventListener('keydown', onKey)
      previouslyFocused.current?.focus?.()
    }
  }, [onClose])

  return (
    <div onClick={onClose} style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', zIndex: 999,
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20,
    }}>
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        onClick={e => e.stopPropagation()}
        style={{
          background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 16,
          maxWidth: 540, width: '100%', maxHeight: '90vh', overflow: 'auto',
          padding: 22, fontFamily: F,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
          {Icon && (
            <div style={{
              width: 32, height: 32, borderRadius: 9,
              background: ga(0.15), border: `1px solid ${ga(0.3)}`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <Icon size={15} color={ACCENT} aria-hidden="true" />
            </div>
          )}
          <h2 id={titleId} style={{ fontFamily: D, fontSize: 17, fontWeight: 800, color: 'var(--text)', margin: 0, flex: 1 }}>
            {title}
          </h2>
          <button
            onClick={onClose}
            aria-label="Cerrar diálogo"
            style={{
              background: 'transparent', border: 'none', cursor: 'pointer', padding: 4, color: 'var(--muted)',
            }}
          >
            <X size={18} aria-hidden="true" />
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
