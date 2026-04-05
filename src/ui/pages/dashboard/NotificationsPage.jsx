import React, { useState, useEffect, useCallback } from 'react'
import { Bell, Check, CheckCheck, Trash2, Filter, ChevronDown, Inbox } from 'lucide-react'
import apiService from '../../../../services/api'
import { relTime } from '../../utils/relTime'
import EmptyState from '../../components/EmptyState'
import { SkeletonTable } from '../../components/Skeleton'
import {
  PURPLE, purpleAlpha, GREEN, greenAlpha,
  FONT_BODY, FONT_DISPLAY, OK, WARN, BLUE, NOTIF_TYPE,
} from '../../theme/tokens'
import { useAuth } from '../../../auth/AuthContext'

const F = FONT_BODY
const D = FONT_DISPLAY

const FILTERS = [
  { key: 'all',    label: 'Todas' },
  { key: 'unread', label: 'Sin leer' },
  { key: 'read',   label: 'Leidas' },
]

export default function NotificationsPage() {
  const { isCreador } = useAuth()
  const accent = isCreador ? GREEN : PURPLE
  const alpha = isCreador ? greenAlpha : purpleAlpha

  const [notifications, setNotifications] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('all')

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await apiService.request('/notifications')
      if (res?.success && Array.isArray(res.data)) {
        setNotifications(res.data)
      }
    } catch (err) {
      console.error('Error loading notifications:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  const markAsRead = async (id) => {
    try {
      await apiService.markNotificationAsRead?.(id)
      setNotifications(prev => prev.map(n =>
        (n._id || n.id) === id ? { ...n, leida: true, read: true } : n
      ))
    } catch {}
  }

  const markAllRead = async () => {
    try {
      await apiService.request('/notifications/leer-todas', { method: 'PUT' })
      setNotifications(prev => prev.map(n => ({ ...n, leida: true, read: true })))
    } catch {}
  }

  const unreadCount = notifications.filter(n => !n.leida && !n.read).length

  const filtered = notifications.filter(n => {
    const isRead = n.leida || n.read
    if (filter === 'unread') return !isRead
    if (filter === 'read') return isRead
    return true
  })

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto' }}>
      {/* Header */}
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start',
        marginBottom: '24px', flexWrap: 'wrap', gap: '12px',
      }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '4px' }}>
            <h1 style={{ fontFamily: D, fontSize: '22px', fontWeight: 800, color: 'var(--text)' }}>
              Notificaciones
            </h1>
            {unreadCount > 0 && (
              <span style={{
                background: alpha(0.15), color: accent,
                borderRadius: '20px', padding: '2px 10px',
                fontSize: '12px', fontWeight: 700, fontFamily: F,
              }}>
                {unreadCount} sin leer
              </span>
            )}
          </div>
          <p style={{ fontSize: '13px', color: 'var(--muted)', fontFamily: F }}>
            Todas tus alertas y actualizaciones en un solo lugar
          </p>
        </div>

        {unreadCount > 0 && (
          <button
            onClick={markAllRead}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: '6px',
              background: 'transparent',
              border: `1px solid ${alpha(0.3)}`,
              borderRadius: '10px', padding: '9px 16px',
              fontSize: '12px', fontWeight: 600, color: accent,
              fontFamily: F, cursor: 'pointer',
              transition: 'all .15s',
            }}
            onMouseEnter={e => { e.currentTarget.style.background = alpha(0.08) }}
            onMouseLeave={e => { e.currentTarget.style.background = 'transparent' }}
          >
            <CheckCheck size={14} /> Marcar todas como leidas
          </button>
        )}
      </div>

      {/* Filters */}
      <div style={{
        display: 'flex', gap: '4px', marginBottom: '20px',
        background: 'var(--bg)', borderRadius: '10px',
        padding: '3px', border: '1px solid var(--border)',
        width: 'fit-content',
      }}>
        {FILTERS.map(f => {
          const active = f.key === filter
          return (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              style={{
                background: active ? accent : 'transparent',
                color: active ? '#fff' : 'var(--muted)',
                border: 'none', borderRadius: '8px',
                padding: '7px 16px', fontSize: '12px',
                fontWeight: active ? 600 : 400,
                fontFamily: F, cursor: 'pointer',
                transition: 'all .15s',
              }}
              onMouseEnter={e => { if (!active) e.currentTarget.style.color = 'var(--text)' }}
              onMouseLeave={e => { if (!active) e.currentTarget.style.color = 'var(--muted)' }}
            >
              {f.label}
              {f.key === 'unread' && unreadCount > 0 && (
                <span style={{
                  marginLeft: '5px', fontSize: '10px', fontWeight: 700,
                  opacity: active ? 0.8 : 0.6,
                }}>
                  ({unreadCount})
                </span>
              )}
            </button>
          )
        })}
      </div>

      {/* Content */}
      {loading ? (
        <SkeletonTable rows={6} />
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={Bell}
          title={filter === 'unread' ? 'Sin notificaciones nuevas' : filter === 'read' ? 'Sin notificaciones leidas' : 'Sin notificaciones'}
          description={
            filter === 'unread'
              ? 'Estas al dia. No tienes notificaciones sin leer.'
              : 'No hay notificaciones en esta categoria.'
          }
          accent={isCreador ? 'green' : 'purple'}
        />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          {filtered.map((n, i) => {
            const isRead = n.leida || n.read
            const tc = NOTIF_TYPE[n.type || n.tipo] || NOTIF_TYPE.info
            return (
              <NotificationCard
                key={n._id || n.id || i}
                notification={n}
                isRead={isRead}
                typeConfig={tc}
                accent={accent}
                alpha={alpha}
                onMarkRead={() => markAsRead(n._id || n.id)}
              />
            )
          })}
        </div>
      )}
    </div>
  )
}

// ── Notification card ─────────────────────────────────────────────────────────
function NotificationCard({ notification: n, isRead, typeConfig: tc, accent, alpha, onMarkRead }) {
  const [hovered, setHovered] = useState(false)

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: 'flex', alignItems: 'flex-start', gap: '14px',
        padding: '16px 18px',
        background: isRead
          ? (hovered ? 'var(--bg2)' : 'var(--surface)')
          : (hovered ? alpha(0.06) : alpha(0.03)),
        border: `1px solid ${hovered ? alpha(0.25) : 'var(--border)'}`,
        borderRadius: '14px',
        transition: 'all .15s ease',
        cursor: 'pointer',
      }}
      onClick={onMarkRead}
    >
      {/* Type icon */}
      <div style={{
        width: '38px', height: '38px', borderRadius: '10px',
        background: tc.bg,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        flexShrink: 0, fontSize: '17px', lineHeight: 1,
      }}>
        {tc.emoji}
      </div>

      {/* Content */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between',
          gap: '8px', marginBottom: '3px',
        }}>
          <div style={{
            fontSize: '13px', fontWeight: isRead ? 400 : 600,
            color: 'var(--text)', fontFamily: F,
            lineHeight: 1.4,
          }}>
            {n.titulo || n.title || 'Notificacion'}
          </div>
          <div style={{
            fontSize: '11px', color: 'var(--muted2)',
            fontFamily: F, whiteSpace: 'nowrap', flexShrink: 0,
          }}>
            {relTime(n.createdAt || n.time)}
          </div>
        </div>

        <div style={{
          fontSize: '12px', color: 'var(--muted)',
          fontFamily: F, lineHeight: 1.5,
        }}>
          {n.mensaje || n.message || n.desc || ''}
        </div>

        {/* Priority badge */}
        {(n.prioridad === 'alta' || n.priority === 'high') && (
          <span style={{
            display: 'inline-block', marginTop: '6px',
            fontSize: '10px', fontWeight: 700,
            color: '#ef4444', background: 'rgba(239,68,68,0.1)',
            borderRadius: '4px', padding: '2px 7px',
            fontFamily: F,
          }}>
            Prioridad alta
          </span>
        )}
      </div>

      {/* Unread dot */}
      {!isRead && (
        <div style={{
          width: '8px', height: '8px', borderRadius: '50%',
          background: accent, flexShrink: 0, marginTop: '6px',
        }} />
      )}
    </div>
  )
}
