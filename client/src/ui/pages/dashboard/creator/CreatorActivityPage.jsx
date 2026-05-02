import React, { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  ClipboardCheck, Filter, Search, Clock, Wallet, Inbox,
  Radio, Star, ShieldCheck, MessageSquare, Settings,
  Building2, AlertTriangle, CheckCircle2, ArrowRight, Download,
} from 'lucide-react'
import apiService from '../../../../services/api'
import { FONT_BODY as F, FONT_DISPLAY as D, GREEN, greenAlpha, OK, WARN, ERR, BLUE } from '../../../theme/tokens'

const ACCENT = GREEN
const ga = greenAlpha
const fmtEur = (n) => `€${Math.round(Number(n) || 0).toLocaleString('es')}`

const EVENT_KIND = {
  campaign_created:   { label: 'Solicitud recibida', color: WARN, icon: Inbox },
  campaign_paid:      { label: 'Pago recibido',      color: BLUE, icon: Wallet },
  campaign_published: { label: 'Publicada',          color: OK,   icon: Radio },
  campaign_completed: { label: 'Completada',         color: ACCENT,icon: CheckCircle2 },
  campaign_cancelled: { label: 'Cancelada',          color: ERR,  icon: AlertTriangle },
  rating_received:    { label: 'Rating recibido',    color: '#f59e0b', icon: Star },
  channel_created:    { label: 'Canal añadido',      color: BLUE, icon: Radio },
  channel_verified:   { label: 'Canal verificado',   color: OK,   icon: ShieldCheck },
  oauth_connected:    { label: 'OAuth conectado',    color: OK,   icon: ShieldCheck },
  payout_requested:   { label: 'Retiro solicitado',  color: BLUE, icon: Wallet },
  message_sent:       { label: 'Mensaje enviado',    color: ACCENT, icon: MessageSquare },
  settings_changed:   { label: 'Ajustes',            color: 'var(--muted)', icon: Settings },
  brand_repeat:       { label: 'Brand recurrente',   color: '#8B5CF6', icon: Building2 },
}

/**
 * CreatorActivityPage — Timeline genérico de toda tu actividad.
 *
 * Audit log unificado: campañas, pagos, canales, OAuth, mensajes, ratings.
 * Filtrable por tipo + rango fecha. Exportable a CSV. Útil para
 * compliance, debug y revisión histórica.
 */
export default function CreatorActivityPage() {
  const navigate = useNavigate()
  const [campaigns, setCampaigns] = useState([])
  const [requests, setRequests] = useState([])
  const [channels, setChannels] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('all')
  const [search, setSearch] = useState('')
  const [dateFrom, setDateFrom] = useState(() => { const d = new Date(); d.setDate(d.getDate() - 90); return d.toISOString().slice(0, 10) })
  const [dateTo, setDateTo] = useState(() => new Date().toISOString().slice(0, 10))

  useEffect(() => {
    let mounted = true
    Promise.all([
      apiService.getCreatorCampaigns?.().catch(() => null),
      apiService.getAdsForCreator?.().catch(() => null),
      apiService.getMyChannels(),
    ]).then(([cmpRes, adRes, chRes]) => {
      if (!mounted) return
      if (cmpRes?.success && Array.isArray(cmpRes.data)) setCampaigns(cmpRes.data)
      if (adRes?.success && Array.isArray(adRes.data)) setRequests(adRes.data)
      if (chRes?.success) setChannels(Array.isArray(chRes.data) ? chRes.data : chRes.data?.items || [])
      setLoading(false)
    }).catch(() => mounted && setLoading(false))
    return () => { mounted = false }
  }, [])

  const events = useMemo(() => buildEvents({ campaigns, requests, channels }), [campaigns, requests, channels])

  const filtered = useMemo(() => {
    const from = new Date(dateFrom).getTime()
    const to = new Date(dateTo + 'T23:59:59').getTime()
    let list = events.filter(e => {
      const t = new Date(e.at).getTime()
      return t >= from && t <= to
    })
    if (filter !== 'all') list = list.filter(e => e.kind === filter)
    if (search.trim()) {
      const q = search.toLowerCase()
      list = list.filter(e => e.title.toLowerCase().includes(q) || (e.detail || '').toLowerCase().includes(q))
    }
    return list.sort((a, b) => new Date(b.at) - new Date(a.at))
  }, [events, filter, search, dateFrom, dateTo])

  // Group by day
  const grouped = useMemo(() => {
    const map = {}
    filtered.forEach(e => {
      const d = new Date(e.at)
      const key = d.toLocaleDateString('es', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
      if (!map[key]) map[key] = []
      map[key].push(e)
    })
    return map
  }, [filtered])

  const exportCsv = () => {
    if (filtered.length === 0) return
    const rows = [
      ['Fecha', 'Tipo', 'Título', 'Detalle', 'Importe'].join(','),
      ...filtered.map(e => [
        new Date(e.at).toISOString(),
        EVENT_KIND[e.kind]?.label || e.kind,
        `"${e.title.replace(/"/g, '""')}"`,
        `"${(e.detail || '').replace(/"/g, '""')}"`,
        e.amount || '',
      ].join(',')),
    ]
    const blob = new Blob([rows.join('\n')], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url; a.download = `activity-${dateFrom}-${dateTo}.csv`
    document.body.appendChild(a); a.click(); document.body.removeChild(a)
    setTimeout(() => URL.revokeObjectURL(url), 100)
  }

  const counts = useMemo(() => {
    const out = { all: events.length }
    Object.keys(EVENT_KIND).forEach(k => { out[k] = events.filter(e => e.kind === k).length })
    return out
  }, [events])

  return (
    <div style={{ fontFamily: F, display: 'flex', flexDirection: 'column', gap: 20, maxWidth: 1100 }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
        <div>
          <h1 style={{ fontFamily: D, fontSize: 26, fontWeight: 800, color: 'var(--text)', letterSpacing: '-0.03em', margin: '0 0 6px' }}>
            Actividad
          </h1>
          <p style={{ fontSize: 14, color: 'var(--muted)', margin: 0 }}>
            Timeline unificado de todo lo que ocurre en tu cuenta — campañas, pagos, canales, mensajes.
          </p>
        </div>
        <button onClick={exportCsv} disabled={filtered.length === 0} style={{
          background: 'var(--surface)', color: 'var(--text)', border: '1px solid var(--border)',
          borderRadius: 9, padding: '8px 13px', fontSize: 12.5, fontWeight: 600,
          cursor: filtered.length === 0 ? 'not-allowed' : 'pointer', fontFamily: F,
          display: 'inline-flex', alignItems: 'center', gap: 5, opacity: filtered.length === 0 ? 0.5 : 1,
        }}>
          <Download size={12} /> Exportar CSV
        </button>
      </div>

      {/* Filters */}
      <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, padding: 12, display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
        <div style={{ position: 'relative', flex: 1, minWidth: 180 }}>
          <Search size={13} color="var(--muted)" style={{ position: 'absolute', left: 11, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar evento, brand, canal…"
            style={{
              width: '100%', boxSizing: 'border-box',
              background: 'var(--bg2)', color: 'var(--text)', border: '1px solid var(--border)',
              borderRadius: 8, padding: '7px 11px 7px 32px', fontSize: 12.5, fontFamily: F, outline: 'none',
            }} />
        </div>
        <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} style={inputDate} />
        <span style={{ color: 'var(--muted)', fontSize: 12 }}>—</span>
        <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} style={inputDate} />
        <select value={filter} onChange={e => setFilter(e.target.value)} style={inputDate}>
          <option value="all">Todos los tipos · {counts.all}</option>
          {Object.entries(EVENT_KIND).filter(([k]) => counts[k] > 0).map(([k, cfg]) => (
            <option key={k} value={k}>{cfg.label} · {counts[k]}</option>
          ))}
        </select>
      </div>

      {loading ? (
        <div style={{ height: 400, background: 'var(--bg2)', borderRadius: 12, animation: 'pulse 1.5s ease infinite' }} />
      ) : filtered.length === 0 ? (
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 14, padding: 60, textAlign: 'center' }}>
          <ClipboardCheck size={36} color="var(--muted2)" style={{ margin: '0 auto 12px' }} />
          <div style={{ fontFamily: D, fontSize: 16, fontWeight: 700, color: 'var(--text)' }}>Sin eventos en este periodo</div>
          <div style={{ fontSize: 12.5, color: 'var(--muted)', marginTop: 6 }}>Ajusta el rango de fechas o cambia el filtro.</div>
        </div>
      ) : (
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, overflow: 'hidden' }}>
          {Object.entries(grouped).map(([day, list]) => (
            <div key={day}>
              <div style={{ padding: '10px 16px', background: 'var(--bg2)', borderBottom: '1px solid var(--border)', fontSize: 11, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.06em', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span>{day}</span>
                <span style={{ color: 'var(--muted2)', fontWeight: 600, textTransform: 'none', letterSpacing: 0 }}>{list.length} {list.length === 1 ? 'evento' : 'eventos'}</span>
              </div>
              {list.map((e, i) => <EventRow key={e.id} e={e} navigate={navigate} isLast={i === list.length - 1} />)}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function EventRow({ e, navigate, isLast }) {
  const cfg = EVENT_KIND[e.kind] || { label: e.kind, color: 'var(--muted)', icon: Clock }
  const Icon = cfg.icon
  return (
    <div onClick={() => e.path && navigate(e.path)} style={{
      padding: '12px 16px',
      borderBottom: isLast ? 'none' : '1px solid var(--border)',
      display: 'flex', alignItems: 'center', gap: 12,
      cursor: e.path ? 'pointer' : 'default',
      transition: 'background .15s',
    }}
      onMouseEnter={ev => { if (e.path) ev.currentTarget.style.background = 'var(--bg2)' }}
      onMouseLeave={ev => { if (e.path) ev.currentTarget.style.background = 'transparent' }}
    >
      <div style={{
        width: 32, height: 32, borderRadius: 9, flexShrink: 0,
        background: `${cfg.color}15`, border: `1px solid ${cfg.color}30`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <Icon size={13} color={cfg.color} strokeWidth={2.2} />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 2, flexWrap: 'wrap' }}>
          <span style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--text)' }}>{e.title}</span>
          <span style={{
            background: `${cfg.color}10`, color: cfg.color, border: `1px solid ${cfg.color}25`,
            borderRadius: 5, padding: '1px 6px', fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em',
          }}>{cfg.label}</span>
        </div>
        {e.detail && <div style={{ fontSize: 11.5, color: 'var(--muted)', lineHeight: 1.4 }}>{e.detail}</div>}
      </div>
      {e.amount !== undefined && (
        <span style={{ fontFamily: D, fontSize: 13, fontWeight: 700, color: 'var(--text)', fontVariantNumeric: 'tabular-nums', flexShrink: 0 }}>
          {fmtEur(e.amount)}
        </span>
      )}
      <span style={{ fontSize: 10.5, color: 'var(--muted2)', fontVariantNumeric: 'tabular-nums', flexShrink: 0, minWidth: 50, textAlign: 'right' }}>
        {new Date(e.at).toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit' })}
      </span>
    </div>
  )
}

function buildEvents({ campaigns, requests, channels }) {
  const events = []
  campaigns.forEach(c => {
    const channelName = typeof c.channel === 'object' ? c.channel?.nombreCanal : c.channel
    const advertiser = c.advertiserName || 'advertiser'
    if (c.createdAt) events.push({ id: `c-${c._id}-create`, kind: 'campaign_created', at: c.createdAt, title: `Solicitud de ${advertiser}`, detail: `${channelName || 'canal'} · €${c.price || 0}`, path: '/creator/requests' })
    if (c.paidAt)    events.push({ id: `c-${c._id}-paid`,   kind: 'campaign_paid',    at: c.paidAt,    title: `${advertiser} ha pagado`, detail: channelName, amount: c.netAmount, path: '/creator/requests' })
    if (c.publishedAt) events.push({ id: `c-${c._id}-pub`,  kind: 'campaign_published', at: c.publishedAt, title: 'Campaña publicada', detail: channelName, path: '/creator/requests' })
    if (c.completedAt) events.push({ id: `c-${c._id}-done`, kind: 'campaign_completed', at: c.completedAt, title: 'Campaña completada', detail: `${channelName} · ${advertiser}`, amount: c.netAmount, path: '/creator/earnings' })
    if (c.rating)    events.push({ id: `c-${c._id}-rate`,  kind: 'rating_received',  at: c.completedAt || c.updatedAt, title: `${c.rating} ★ de ${advertiser}`, detail: c.testimonial?.slice(0, 60), path: '/creator/profile' })
    if (c.cancelledAt) events.push({ id: `c-${c._id}-cancel`, kind: 'campaign_cancelled', at: c.cancelledAt, title: 'Campaña cancelada', detail: `${channelName} · ${advertiser}`, path: '/creator/requests' })
  })
  channels.forEach(ch => {
    if (ch.createdAt) events.push({ id: `ch-${ch._id}-add`, kind: 'channel_created', at: ch.createdAt, title: `Canal añadido: ${ch.nombreCanal}`, detail: `Plataforma: ${ch.plataforma}`, path: '/creator/channels' })
    if (ch.verificacion?.tipoAcceso === 'oauth' && ch.verificacion?.connectedAt) {
      events.push({ id: `ch-${ch._id}-oauth`, kind: 'oauth_connected', at: ch.verificacion.connectedAt, title: `OAuth conectado en ${ch.nombreCanal}`, detail: `Confianza score: ${ch.verificacion.confianzaScore}%`, path: '/creator/channels' })
    }
  })
  return events
}

const inputDate = {
  background: 'var(--bg2)', color: 'var(--text)', border: '1px solid var(--border)',
  borderRadius: 7, padding: '6px 10px', fontSize: 12, fontFamily: F, outline: 'none',
}
