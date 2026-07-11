import React, { useState, useEffect, useCallback } from 'react'
import {
  Link2, Copy, Check, MousePointerClick, Users, Clock, ExternalLink,
  ChevronDown, ChevronUp, Smartphone, Monitor, Tablet, Globe, RefreshCw,
} from 'lucide-react'
import apiService from '../../../../services/api'
import { ErrorBanner, EmptyState, StatCard } from '../shared/DashComponents'
import {
  GREEN, greenAlpha, BLUE, WARN, FONT_BODY, FONT_DISPLAY, CARD_RADIUS, BTN_RADIUS,
} from '../../../theme/tokens'

const F = FONT_BODY
const D = FONT_DISPLAY

const TYPE_LABELS = {
  campaign: { label: 'Campaña', color: GREEN },
  verification: { label: 'Verificación', color: BLUE },
  custom: { label: 'Personalizado', color: WARN },
  swap: { label: 'Colaboración', color: '#8b5cf6' },
}

function timeAgo(date) {
  if (!date) return '—'
  const s = Math.floor((Date.now() - new Date(date).getTime()) / 1000)
  if (s < 60) return 'hace un momento'
  if (s < 3600) return `hace ${Math.floor(s / 60)} min`
  if (s < 86400) return `hace ${Math.floor(s / 3600)} h`
  return `hace ${Math.floor(s / 86400)} d`
}

function targetDomain(url) {
  try { return new URL(url).hostname.replace(/^www\./, '') } catch { return url }
}

// ─── Copy button ─────────────────────────────────────────────────────────────
function CopyButton({ text }) {
  const [copied, setCopied] = useState(false)
  const copy = async (e) => {
    e.stopPropagation()
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      setTimeout(() => setCopied(false), 1600)
    } catch { /* clipboard unavailable */ }
  }
  return (
    <button
      onClick={copy}
      title="Copiar enlace"
      style={{
        display: 'inline-flex', alignItems: 'center', gap: 5,
        padding: '5px 10px', borderRadius: BTN_RADIUS, cursor: 'pointer',
        border: `1px solid ${copied ? greenAlpha(0.5) : 'var(--border)'}`,
        background: copied ? greenAlpha(0.12) : 'var(--surface)',
        color: copied ? GREEN : 'var(--muted)',
        fontFamily: F, fontSize: 12, fontWeight: 600,
        transition: 'all .15s ease', whiteSpace: 'nowrap',
      }}
    >
      {copied ? <Check size={13} /> : <Copy size={13} />}
      {copied ? 'Copiado' : 'Copiar'}
    </button>
  )
}

// ─── Mini horizontal breakdown bar (devices / countries) ─────────────────────
function BreakdownBars({ title, rows, total }) {
  if (!rows.length) return null
  return (
    <div style={{ flex: '1 1 220px', minWidth: 200 }}>
      <div style={{ fontFamily: D, fontSize: 12, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 10 }}>
        {title}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {rows.map(({ label, value, icon }) => {
          const pct = total > 0 ? Math.round((value / total) * 100) : 0
          return (
            <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, width: 92, fontFamily: F, fontSize: 12, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {icon}{label}
              </span>
              <div style={{ flex: 1, height: 6, borderRadius: 3, background: 'var(--border)', overflow: 'hidden' }}>
                <div style={{ width: `${pct}%`, height: '100%', borderRadius: 3, background: `linear-gradient(90deg, ${greenAlpha(0.9)}, ${greenAlpha(0.55)})`, transition: 'width .4s cubic-bezier(.4,0,.2,1)' }} />
              </div>
              <span style={{ width: 60, textAlign: 'right', fontFamily: F, fontSize: 12, fontWeight: 600, color: 'var(--muted)' }}>
                {value} · {pct}%
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ─── Expanded analytics panel (lazy-loaded per link) ─────────────────────────
function LinkAnalytics({ linkId }) {
  const [data, setData] = useState(null)
  const [error, setError] = useState(null)

  useEffect(() => {
    let cancelled = false
    apiService.getLinkAnalytics(linkId)
      .then(res => { if (!cancelled) res?.success ? setData(res.data) : setError('No se pudo cargar el detalle') })
      .catch(() => { if (!cancelled) setError('No se pudo cargar el detalle') })
    return () => { cancelled = true }
  }, [linkId])

  if (error) return <div style={{ padding: '14px 0', fontFamily: F, fontSize: 13, color: 'var(--muted)' }}>{error}</div>
  if (!data) return <div style={{ padding: '14px 0', fontFamily: F, fontSize: 13, color: 'var(--muted)' }}>Cargando detalle…</div>

  const devices = data.stats?.devices || {}
  const deviceRows = [
    { label: 'Móvil', value: devices.mobile || 0, icon: <Smartphone size={12} /> },
    { label: 'Escritorio', value: devices.desktop || 0, icon: <Monitor size={12} /> },
    { label: 'Tablet', value: devices.tablet || 0, icon: <Tablet size={12} /> },
  ].filter(r => r.value > 0)
  const deviceTotal = deviceRows.reduce((a, r) => a + r.value, 0)

  const countries = Object.entries(data.stats?.countries || {})
    .sort((a, b) => b[1] - a[1]).slice(0, 6)
    .map(([label, value]) => ({ label: label || '??', value, icon: <Globe size={12} /> }))
  const countryTotal = countries.reduce((a, r) => a + r.value, 0)

  const recent = (data.clicks || []).slice(-8).reverse()

  return (
    <div style={{ borderTop: '1px solid var(--border)', marginTop: 14, paddingTop: 14, display: 'flex', flexDirection: 'column', gap: 18 }}>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 24 }}>
        <BreakdownBars title="Dispositivos" rows={deviceRows} total={deviceTotal} />
        <BreakdownBars title="Países" rows={countries} total={countryTotal} />
      </div>

      {recent.length > 0 && (
        <div>
          <div style={{ fontFamily: D, fontSize: 12, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>
            Últimos clicks
          </div>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {recent.map((c, i) => (
              <div key={i} style={{
                display: 'flex', alignItems: 'center', gap: 10, padding: '7px 0', flexWrap: 'wrap',
                borderBottom: i < recent.length - 1 ? '1px solid var(--border)' : 'none',
                fontFamily: F, fontSize: 12, color: 'var(--text)',
              }}>
                {c.device === 'mobile' ? <Smartphone size={13} color={GREEN} /> : c.device === 'tablet' ? <Tablet size={13} color={GREEN} /> : <Monitor size={13} color={GREEN} />}
                <span style={{ fontWeight: 600 }}>{c.os || 'Desconocido'}</span>
                <span style={{ color: 'var(--muted)' }}>{c.browser || ''}</span>
                {c.country && <span style={{ color: 'var(--muted)' }}>· {c.country}</span>}
                <span style={{ marginLeft: 'auto', color: 'var(--muted)' }}>{timeAgo(c.timestamp)}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Single link card ────────────────────────────────────────────────────────
function LinkCard({ link }) {
  const [expanded, setExpanded] = useState(false)
  const type = TYPE_LABELS[link.type] || TYPE_LABELS.custom
  const channelName = link.channel?.nombreCanal

  return (
    <div
      style={{
        background: 'var(--surface)', border: '1px solid var(--border)',
        borderRadius: CARD_RADIUS, padding: '16px 20px', cursor: 'pointer',
        transition: 'border-color .15s ease',
      }}
      onClick={() => setExpanded(e => !e)}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
        {/* Left: identity */}
        <div style={{ flex: '1 1 260px', minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 5, flexWrap: 'wrap' }}>
            <span style={{
              padding: '2px 8px', borderRadius: 6, fontSize: 10.5, fontWeight: 700,
              fontFamily: F, letterSpacing: '0.03em', textTransform: 'uppercase',
              color: type.color, background: `${type.color}1a`, border: `1px solid ${type.color}33`,
            }}>
              {type.label}
            </span>
            {channelName && (
              <span style={{ fontFamily: F, fontSize: 12, fontWeight: 600, color: 'var(--muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 220 }}>
                {channelName}
              </span>
            )}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, minWidth: 0 }}>
            <Link2 size={13} color={GREEN} style={{ flexShrink: 0 }} />
            <span style={{ fontFamily: F, fontSize: 13.5, fontWeight: 600, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {link.trackingUrl?.replace(/^https?:\/\//, '')}
            </span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginTop: 3 }}>
            <ExternalLink size={11} color="var(--muted)" style={{ flexShrink: 0 }} />
            <span style={{ fontFamily: F, fontSize: 12, color: 'var(--muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              → {targetDomain(link.targetUrl)}
            </span>
          </div>
        </div>

        {/* Middle: stats */}
        <div style={{ display: 'flex', gap: 22, alignItems: 'center' }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontFamily: D, fontSize: 19, fontWeight: 800, color: 'var(--text)' }}>{link.stats?.totalClicks ?? 0}</div>
            <div style={{ fontFamily: F, fontSize: 10.5, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Clicks</div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontFamily: D, fontSize: 19, fontWeight: 800, color: GREEN }}>{link.stats?.uniqueClicks ?? 0}</div>
            <div style={{ fontFamily: F, fontSize: 10.5, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Únicos</div>
          </div>
          <div style={{ textAlign: 'center', minWidth: 74 }}>
            <div style={{ fontFamily: F, fontSize: 12.5, fontWeight: 600, color: 'var(--text)' }}>{timeAgo(link.stats?.lastClickAt)}</div>
            <div style={{ fontFamily: F, fontSize: 10.5, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Último</div>
          </div>
        </div>

        {/* Right: actions */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginLeft: 'auto' }}>
          <CopyButton text={link.trackingUrl} />
          {expanded ? <ChevronUp size={16} color="var(--muted)" /> : <ChevronDown size={16} color="var(--muted)" />}
        </div>
      </div>

      {expanded && <div onClick={e => e.stopPropagation()}><LinkAnalytics linkId={link._id} /></div>}
    </div>
  )
}

// ─── Main page ───────────────────────────────────────────────────────────────
export default function CreatorLinksPage() {
  const [links, setLinks] = useState(null)
  const [loading, setLoading] = useState(true)
  const [fetchError, setFetchError] = useState(null)
  const [refreshing, setRefreshing] = useState(false)

  const load = useCallback(async (isRefresh = false) => {
    isRefresh ? setRefreshing(true) : setLoading(true)
    setFetchError(null)
    try {
      const res = await apiService.getMyTrackingLinks()
      if (res?.success) setLinks(res.data || [])
      else setFetchError(res?.message || 'No se pudieron cargar tus enlaces')
    } catch (err) {
      setFetchError(err?.message || 'No se pudieron cargar tus enlaces')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  const totals = (links || []).reduce(
    (acc, l) => {
      acc.clicks += l.stats?.totalClicks || 0
      acc.unique += l.stats?.uniqueClicks || 0
      const t = l.stats?.lastClickAt ? new Date(l.stats.lastClickAt).getTime() : 0
      if (t > acc.last) acc.last = t
      return acc
    },
    { clicks: 0, unique: 0, last: 0 }
  )

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <style>{`@keyframes spin { from { transform: rotate(0deg) } to { transform: rotate(360deg) } }`}</style>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
        <div>
          <h1 style={{ margin: 0, fontFamily: D, fontSize: 24, fontWeight: 800, color: 'var(--text)', letterSpacing: '-0.02em' }}>
            Mis enlaces
          </h1>
          <p style={{ margin: '6px 0 0', fontFamily: F, fontSize: 13.5, color: 'var(--muted)', maxWidth: 560, lineHeight: 1.5 }}>
            Rendimiento de tus enlaces de tracking: cada click en tus publicaciones queda registrado con dispositivo y país. Los bots y las previews de WhatsApp no cuentan como clicks únicos.
          </p>
        </div>
        <button
          onClick={() => load(true)}
          disabled={refreshing}
          style={{
            display: 'inline-flex', alignItems: 'center', gap: 6, padding: '8px 14px',
            borderRadius: BTN_RADIUS, border: '1px solid var(--border)', background: 'var(--surface)',
            color: 'var(--text)', fontFamily: F, fontSize: 13, fontWeight: 600,
            cursor: refreshing ? 'default' : 'pointer', opacity: refreshing ? 0.6 : 1,
          }}
        >
          <RefreshCw size={14} style={refreshing ? { animation: 'spin 1s linear infinite' } : undefined} />
          Actualizar
        </button>
      </div>

      {fetchError && <ErrorBanner message={fetchError} onRetry={() => load()} />}

      {/* KPI row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))', gap: 16 }}>
        <StatCard icon={<Link2 size={18} />} label="Enlaces activos" value={loading ? '—' : String((links || []).filter(l => l.active !== false).length)} accent={GREEN} />
        <StatCard icon={<MousePointerClick size={18} />} label="Clicks totales" value={loading ? '—' : String(totals.clicks)} accent={GREEN} />
        <StatCard icon={<Users size={18} />} label="Clicks únicos" value={loading ? '—' : String(totals.unique)} accent={BLUE} />
        <StatCard icon={<Clock size={18} />} label="Último click" value={loading ? '—' : timeAgo(totals.last || null)} accent={WARN} />
      </div>

      {/* Links list */}
      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {[0, 1, 2].map(i => (
            <div key={i} style={{ height: 86, borderRadius: CARD_RADIUS, border: '1px solid var(--border)', background: 'var(--surface)', opacity: 0.5 }} />
          ))}
        </div>
      ) : (links || []).length === 0 ? (
        <EmptyState
          icon="🔗"
          title="Aún no tienes enlaces de tracking"
          desc="Cuando publiques una campaña o crees un enlace de verificación, verás aquí sus clicks en tiempo real."
        />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {links.map(l => <LinkCard key={l._id} link={l} />)}
        </div>
      )}
    </div>
  )
}
