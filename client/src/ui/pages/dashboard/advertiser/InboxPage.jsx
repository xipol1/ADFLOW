import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Inbox, AlertTriangle, CheckCircle2, MessageSquare, Bell as BellIcon,
  CreditCard, ArrowRight, RefreshCw, Filter,
} from 'lucide-react'
import apiService from '../../../../services/api'
import { FONT_BODY, FONT_DISPLAY, OK, WARN, ERR, BLUE } from '../../../theme/tokens'

const PURPLE = 'var(--accent, #8B5CF6)'
const pa = (o) => `rgba(139,92,246,${o})`

const KIND_META = {
  payment_pending:  { icon: CreditCard,    color: WARN, label: 'Pago pendiente', cta: 'Pagar ahora' },
  escrow_release:   { icon: CheckCircle2,  color: OK,   label: 'Liberar escrow', cta: 'Revisar y liberar' },
  campaign_disputed:{ icon: AlertTriangle, color: ERR,  label: 'Disputa', cta: 'Ver disputa' },
  dispute_active:   { icon: AlertTriangle, color: ERR,  label: 'Disputa activa', cta: 'Ver detalle' },
  notification:     { icon: BellIcon,      color: BLUE, label: 'Notificación', cta: 'Abrir' },
}
const defaultMeta = { icon: BellIcon, color: '#94a3b8', label: 'Item', cta: 'Ver' }

const FILTERS = [
  { key: 'all',           label: 'Todo',         match: () => true },
  { key: 'payments',      label: 'Pagos',        match: (i) => i.kind === 'payment_pending' || i.kind === 'escrow_release' },
  { key: 'disputes',      label: 'Disputas',     match: (i) => i.source === 'dispute' || i.kind === 'campaign_disputed' },
  { key: 'notifications', label: 'Avisos',       match: (i) => i.source === 'notification' },
]

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

export default function InboxPage() {
  const navigate = useNavigate()
  const [items, setItems] = useState([])
  const [counts, setCounts] = useState({ total: 0 })
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [filter, setFilter] = useState('all')

  const load = async () => {
    setRefreshing(true)
    try {
      const res = await apiService.getInbox()
      if (res?.success) {
        setItems(res.data?.items || [])
        setCounts(res.data?.counts || { total: 0 })
      }
    } catch (err) { console.error('InboxPage.load failed:', err) }
    setLoading(false)
    setRefreshing(false)
  }
  useEffect(() => { load() }, [])

  const visible = items.filter((FILTERS.find(f => f.key === filter) || FILTERS[0]).match)

  return (
    <div style={{ fontFamily: FONT_BODY, maxWidth: 980, margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18, gap: 12, flexWrap: 'wrap' }}>
        <div>
          <h1 style={{ fontFamily: FONT_DISPLAY, fontSize: 26, fontWeight: 800, color: 'var(--text)', letterSpacing: '-0.03em', margin: 0, display: 'flex', alignItems: 'center', gap: 10 }}>
            <Inbox size={24} color={PURPLE} /> Bandeja de entrada
          </h1>
          <p style={{ fontSize: 13, color: 'var(--muted)', margin: '4px 0 0 0' }}>
            {counts.total > 0
              ? <>Tienes <strong style={{ color: 'var(--text)' }}>{counts.total} item{counts.total === 1 ? '' : 's'}</strong> que requieren tu atención</>
              : 'Todo está al día — ningún item pendiente'}
          </p>
        </div>
        <button onClick={load} disabled={refreshing}
          style={{
            display: 'flex', alignItems: 'center', gap: 6,
            background: 'var(--bg2)', color: 'var(--text)', border: '1px solid var(--border)',
            borderRadius: 10, padding: '8px 14px', fontSize: 13, fontWeight: 600,
            cursor: refreshing ? 'wait' : 'pointer', fontFamily: FONT_BODY,
          }}
        >
          <RefreshCw size={13} style={{ animation: refreshing ? 'spin 1s linear infinite' : 'none' }} />
          <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
          Actualizar
        </button>
      </div>

      {/* Filter pills */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 14, flexWrap: 'wrap' }}>
        {FILTERS.map(f => {
          const count = items.filter(f.match).length
          const active = filter === f.key
          return (
            <button key={f.key} onClick={() => setFilter(f.key)}
              style={{
                padding: '8px 14px', borderRadius: 10, fontSize: 12.5, fontWeight: 600,
                background: active ? PURPLE : 'var(--bg2)',
                color: active ? '#fff' : 'var(--muted)',
                border: `1px solid ${active ? PURPLE : 'var(--border)'}`,
                cursor: 'pointer', fontFamily: FONT_BODY,
                display: 'flex', alignItems: 'center', gap: 6,
              }}
            >
              {f.label}
              {count > 0 && (
                <span style={{
                  background: active ? 'rgba(255,255,255,0.25)' : pa(0.12),
                  color: active ? '#fff' : PURPLE,
                  borderRadius: 20, padding: '1px 7px', fontSize: 10.5, fontWeight: 700,
                }}>{count}</span>
              )}
            </button>
          )
        })}
      </div>

      {/* Items list */}
      {loading ? (
        <div style={{ padding: 80, textAlign: 'center', color: 'var(--muted)', fontSize: 14 }}>Cargando...</div>
      ) : visible.length === 0 ? (
        <div style={{
          padding: 60, textAlign: 'center',
          background: 'var(--surface)', border: '1px dashed var(--border)', borderRadius: 16,
        }}>
          <CheckCircle2 size={36} color={OK} style={{ margin: '0 auto 12px', display: 'block' }} />
          <div style={{ fontFamily: FONT_DISPLAY, fontSize: 16, fontWeight: 700, color: 'var(--text)', marginBottom: 4 }}>
            Todo en orden
          </div>
          <div style={{ fontSize: 13, color: 'var(--muted)' }}>
            {filter === 'all' ? 'No tienes nada pendiente ahora mismo' : 'No hay items en esta categoría'}
          </div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {visible.map(item => {
            const meta = KIND_META[item.kind] || defaultMeta
            const Icon = meta.icon
            return (
              <button key={item.id}
                onClick={() => navigate(item.ctaPath)}
                style={{
                  background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 14,
                  padding: 16, display: 'flex', alignItems: 'center', gap: 14, cursor: 'pointer',
                  textAlign: 'left', fontFamily: FONT_BODY, transition: 'border-color .15s, transform .15s, box-shadow .15s',
                  width: '100%',
                }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = meta.color; e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.boxShadow = `0 6px 20px ${meta.color}1a` }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = 'none' }}
              >
                <div style={{
                  width: 44, height: 44, borderRadius: 11,
                  background: `${meta.color}15`, border: `1px solid ${meta.color}30`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                }}>
                  <Icon size={19} color={meta.color} strokeWidth={2} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3 }}>
                    <span style={{ fontSize: 13.5, fontWeight: 700, color: 'var(--text)', fontFamily: FONT_DISPLAY }}>
                      {item.title}
                    </span>
                    <span style={{
                      fontSize: 10, fontWeight: 600, color: meta.color,
                      background: `${meta.color}12`, padding: '1px 7px', borderRadius: 6,
                    }}>
                      {meta.label}
                    </span>
                    <span style={{ fontSize: 10.5, color: 'var(--muted2)', marginLeft: 'auto' }}>
                      {relativeTime(item.updatedAt)}
                    </span>
                  </div>
                  <div style={{ fontSize: 12.5, color: 'var(--muted)', lineHeight: 1.4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {item.description}
                  </div>
                  {(item.amount !== undefined || item.channelName) && (
                    <div style={{ display: 'flex', gap: 12, marginTop: 6 }}>
                      {item.channelName && (
                        <span style={{ fontSize: 11, color: 'var(--muted)' }}>📢 <strong style={{ color: 'var(--text)' }}>{item.channelName}</strong></span>
                      )}
                      {item.amount !== undefined && (
                        <span style={{ fontSize: 11, color: meta.color, fontWeight: 700 }}>€{item.amount}</span>
                      )}
                    </div>
                  )}
                </div>
                <div style={{
                  display: 'flex', alignItems: 'center', gap: 4,
                  fontSize: 12, fontWeight: 600, color: meta.color, flexShrink: 0,
                }}>
                  {item.ctaLabel || meta.cta}
                  <ArrowRight size={13} />
                </div>
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
