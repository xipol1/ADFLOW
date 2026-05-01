import React, { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Inbox, AlertTriangle, CheckCircle2, MessageSquare, Bell as BellIcon,
  CreditCard, ArrowRight, Filter,
} from 'lucide-react'
import apiService from '../../services/api'
import { FONT_BODY, FONT_DISPLAY } from '../theme/tokens'

const PURPLE = 'var(--accent, #8B5CF6)'
const pa = (o) => `rgba(139,92,246,${o})`

const KIND_META = {
  payment_pending:  { icon: CreditCard,    color: '#f59e0b', label: 'Pago pendiente' },
  escrow_release:   { icon: CheckCircle2,  color: '#22c55e', label: 'Liberar escrow' },
  campaign_disputed:{ icon: AlertTriangle, color: '#ef4444', label: 'Disputa' },
  dispute_active:   { icon: AlertTriangle, color: '#ef4444', label: 'Disputa' },
  notification:     { icon: BellIcon,      color: '#06b6d4', label: 'Notificación' },
}
const defaultMeta = { icon: BellIcon, color: '#94a3b8', label: 'Item' }

function relativeTime(iso) {
  if (!iso) return ''
  const t = new Date(iso).getTime()
  const diff = Date.now() - t
  if (diff < 60_000) return 'ahora'
  if (diff < 3_600_000) return `hace ${Math.floor(diff / 60_000)} min`
  if (diff < 86_400_000) return `hace ${Math.floor(diff / 3_600_000)} h`
  if (diff < 7 * 86_400_000) return `hace ${Math.floor(diff / 86_400_000)} d`
  return new Date(iso).toLocaleDateString('es', { day: 'numeric', month: 'short' })
}

/**
 * InboxBell — header dropdown that aggregates everything actionable.
 * Pairs with the existing NotificationBell (which only shows
 * Notificacion docs); this one also surfaces pending payments,
 * pending escrow releases, and active disputes.
 */
export default function InboxBell({ accentColor = PURPLE, accentAlpha = pa, role = 'advertiser' }) {
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)
  const [hovered, setHovered] = useState(false)
  const [items, setItems] = useState([])
  const [counts, setCounts] = useState({ total: 0 })
  const [loading, setLoading] = useState(false)
  const [filter, setFilter] = useState('all')
  const ref = useRef(null)

  // Lightweight count poll for badge — refreshes every 60s
  useEffect(() => {
    let cancelled = false
    const tick = async () => {
      try {
        const res = await apiService.getInboxCount()
        if (!cancelled && res?.success) setCounts(res.data || { total: 0 })
      } catch {}
    }
    tick()
    const id = setInterval(tick, 60_000)
    return () => { cancelled = true; clearInterval(id) }
  }, [])

  // Full fetch when dropdown opens
  useEffect(() => {
    if (!open) return
    let cancelled = false
    const load = async () => {
      setLoading(true)
      try {
        const res = await apiService.getInbox()
        if (!cancelled && res?.success) {
          setItems(res.data?.items || [])
          setCounts(res.data?.counts || { total: 0 })
        }
      } catch {}
      if (!cancelled) setLoading(false)
    }
    load()
    return () => { cancelled = true }
  }, [open])

  // Close on click-outside
  useEffect(() => {
    if (!open) return
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  const filtered = filter === 'all' ? items : items.filter(it => {
    if (filter === 'payments') return it.kind === 'payment_pending' || it.kind === 'escrow_release'
    if (filter === 'disputes') return it.source === 'dispute' || it.kind === 'campaign_disputed'
    if (filter === 'notifications') return it.source === 'notification'
    return true
  })

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button
        onClick={() => setOpen(o => !o)}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        title="Bandeja de entrada"
        style={{
          background: hovered || open ? 'var(--bg2)' : 'var(--bg)',
          border: `1px solid ${open ? accentAlpha(0.4) : 'var(--border)'}`,
          borderRadius: 10, padding: 8, cursor: 'pointer',
          color: open ? accentColor : hovered ? 'var(--text)' : 'var(--muted)',
          display: 'flex', alignItems: 'center', position: 'relative',
          transition: 'background 150ms, border-color 150ms, color 150ms',
        }}
      >
        <Inbox size={18} strokeWidth={open ? 2.2 : 1.8} />
        {counts.total > 0 && (
          <span style={{
            position: 'absolute', top: -5, right: -5,
            background: accentColor, color: '#fff',
            borderRadius: '50%', minWidth: 17, height: 17, padding: '0 4px',
            fontSize: 10, fontWeight: 700, fontFamily: FONT_BODY,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            border: '2px solid var(--bg)', lineHeight: 1,
          }}>
            {counts.total > 99 ? '99+' : counts.total}
          </span>
        )}
      </button>

      {open && (
        <div style={{
          position: 'absolute', top: 'calc(100% + 10px)', right: 0,
          width: 400, maxWidth: 'calc(100vw - 40px)', maxHeight: '70vh',
          background: 'var(--bg)', border: '1px solid var(--border)',
          borderRadius: 14, boxShadow: '0 16px 48px rgba(0,0,0,0.25)',
          overflow: 'hidden', zIndex: 1000,
          display: 'flex', flexDirection: 'column',
          fontFamily: FONT_BODY,
          animation: 'inboxFadeIn 180ms ease',
        }}>
          <style>{`@keyframes inboxFadeIn { from { opacity:0; transform: translateY(-6px) } to { opacity:1; transform: translateY(0) } }`}</style>

          {/* Header */}
          <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <div style={{ fontFamily: FONT_DISPLAY, fontSize: 15, fontWeight: 700, color: 'var(--text)', letterSpacing: '-0.02em' }}>
                Bandeja de entrada
              </div>
              <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 2 }}>
                {counts.total > 0 ? `${counts.total} item${counts.total === 1 ? '' : 's'} pendiente${counts.total === 1 ? '' : 's'}` : 'Todo al día'}
              </div>
            </div>
            <button onClick={() => { setOpen(false); navigate('/advertiser/inbox') }}
              style={{
                background: 'transparent', border: 'none', color: accentColor,
                fontSize: 11.5, fontWeight: 600, cursor: 'pointer', fontFamily: FONT_BODY,
                display: 'flex', alignItems: 'center', gap: 3,
              }}
            >
              Ver todo <ArrowRight size={11} />
            </button>
          </div>

          {/* Filters */}
          <div style={{ display: 'flex', gap: 4, padding: '8px 12px', borderBottom: '1px solid var(--border)', overflowX: 'auto' }}>
            {[
              { key: 'all', label: 'Todo', count: counts.total },
              { key: 'payments', label: 'Pagos', count: (counts.payment_pending || 0) + (counts.escrow_release || 0) },
              { key: 'disputes', label: 'Disputas', count: counts.disputes || 0 },
              { key: 'notifications', label: 'Avisos', count: counts.notifications || 0 },
            ].map(f => {
              const active = filter === f.key
              return (
                <button key={f.key} onClick={() => setFilter(f.key)}
                  style={{
                    padding: '5px 10px', borderRadius: 8, fontSize: 11.5, fontWeight: 600,
                    background: active ? accentAlpha(0.12) : 'transparent',
                    color: active ? accentColor : 'var(--muted)',
                    border: `1px solid ${active ? accentAlpha(0.3) : 'transparent'}`,
                    cursor: 'pointer', fontFamily: FONT_BODY, whiteSpace: 'nowrap',
                  }}
                >
                  {f.label}{f.count > 0 ? ` · ${f.count}` : ''}
                </button>
              )
            })}
          </div>

          {/* Items */}
          <div style={{ flex: 1, overflow: 'auto', minHeight: 0 }}>
            {loading ? (
              <div style={{ padding: 40, textAlign: 'center', color: 'var(--muted)', fontSize: 13 }}>Cargando...</div>
            ) : filtered.length === 0 ? (
              <div style={{ padding: 40, textAlign: 'center', color: 'var(--muted)', fontSize: 13 }}>
                <CheckCircle2 size={28} color="#22c55e" style={{ margin: '0 auto 8px', display: 'block' }} />
                Todo en orden
              </div>
            ) : (
              filtered.map(item => {
                const meta = KIND_META[item.kind] || defaultMeta
                const Icon = meta.icon
                return (
                  <div key={item.id}
                    onClick={() => { setOpen(false); navigate(item.ctaPath) }}
                    style={{
                      padding: '12px 14px', borderBottom: '1px solid var(--border)',
                      display: 'flex', alignItems: 'flex-start', gap: 10, cursor: 'pointer',
                      transition: 'background .12s',
                    }}
                    onMouseEnter={e => e.currentTarget.style.background = 'var(--bg2)'}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                  >
                    <div style={{
                      width: 32, height: 32, borderRadius: 9,
                      background: `${meta.color}15`, border: `1px solid ${meta.color}30`,
                      display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                    }}>
                      <Icon size={14} color={meta.color} strokeWidth={2} />
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 6 }}>
                        <span style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {item.title}
                        </span>
                        <span style={{ fontSize: 10.5, color: 'var(--muted2)', flexShrink: 0 }}>
                          {relativeTime(item.updatedAt)}
                        </span>
                      </div>
                      <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {item.description}
                      </div>
                      {(item.amount !== undefined || item.channelName) && (
                        <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
                          {item.channelName && (
                            <span style={{ fontSize: 10, color: 'var(--muted2)' }}>📢 {item.channelName}</span>
                          )}
                          {item.amount !== undefined && (
                            <span style={{ fontSize: 10, color: meta.color, fontWeight: 600 }}>€{item.amount}</span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                )
              })
            )}
          </div>
        </div>
      )}
    </div>
  )
}
