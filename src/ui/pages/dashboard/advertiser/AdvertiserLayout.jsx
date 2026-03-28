import React, { useState, useEffect, useRef } from 'react'
import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom'
import {
  LayoutDashboard, Search, Zap, Megaphone, Wallet, BarChart3,
  Settings, LogOut, Menu, Bell, X, ChevronRight,
} from 'lucide-react'
import { useAuth } from '../../../../auth/AuthContext'
import apiService from '../../../../../services/api'

// ── Design tokens ──────────────────────────────────────────────────────────
const A   = '#8b5cf6'
const AG  = (o) => `rgba(139,92,246,${o})`
const F   = "'Inter', system-ui, sans-serif"
const D   = "'Sora', system-ui, sans-serif"
const EASE = 'cubic-bezier(.4,0,.2,1)'

// ── Nav structure ──────────────────────────────────────────────────────────
const MAIN_NAV = [
  { to: '/advertiser',          icon: LayoutDashboard, label: 'Dashboard',    end: true },
  { to: '/advertiser/explore',  icon: Search,          label: 'Explorar'              },
  { to: '/advertiser/autobuy',  icon: Zap,             label: 'Auto-Buy'              },
  { to: '/advertiser/campaigns', icon: BarChart3,       label: 'Mis Campañas'          },
  { to: '/advertiser/ads',      icon: Megaphone,       label: 'Solicitudes'           },
  { to: '/advertiser/finances', icon: Wallet,          label: 'Finanzas'              },
]

const BOTTOM_NAV = [
  { to: '/advertiser/settings', icon: Settings, label: 'Configuración' },
]

// ── Relative time helper ───────────────────────────────────────────────────
function relTime(str) { return str }

// ── Notification type config ───────────────────────────────────────────────
const NOTIF_TYPE = {
  success: { emoji: '✅', color: '#22c55e', bg: 'rgba(34,197,94,0.1)' },
  info:    { emoji: 'ℹ️',  color: '#3b82f6', bg: 'rgba(59,130,246,0.1)' },
  warning: { emoji: '⚠️', color: '#f59e0b', bg: 'rgba(245,158,11,0.1)' },
}

// ── Tooltip wrapper for collapsed nav ─────────────────────────────────────
function NavTooltip({ label, visible, children }) {
  return (
    <div style={{ position: 'relative', display: 'block' }}>
      {children}
      {visible && (
        <div style={{
          position: 'absolute', left: 'calc(100% + 12px)', top: '50%',
          transform: 'translateY(-50%)',
          background: 'var(--text)', color: 'var(--bg)',
          fontSize: '12px', fontWeight: 500, fontFamily: F,
          padding: '5px 10px', borderRadius: '7px',
          whiteSpace: 'nowrap', pointerEvents: 'none', zIndex: 999,
          boxShadow: '0 4px 16px rgba(0,0,0,0.18)',
        }}>
          {label}
          <div style={{
            position: 'absolute', right: '100%', top: '50%',
            transform: 'translateY(-50%)',
            border: '5px solid transparent',
            borderRightColor: 'var(--text)',
          }} />
        </div>
      )}
    </div>
  )
}

// ── Single nav item ────────────────────────────────────────────────────────
function SidebarLink({ to, icon: Icon, label, end, collapsed }) {
  const [hovered, setHovered] = useState(false)
  const [tooltipVisible, setTooltipVisible] = useState(false)

  return (
    <NavLink to={to} end={end} style={{ textDecoration: 'none', display: 'block' }}>
      {({ isActive }) => (
        <NavTooltip label={label} visible={collapsed && tooltipVisible}>
          <div
            onMouseEnter={() => { setHovered(true); if (collapsed) setTooltipVisible(true) }}
            onMouseLeave={() => { setHovered(false); setTooltipVisible(false) }}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              padding: collapsed ? '10px 0' : '9px 13px',
              justifyContent: collapsed ? 'center' : 'flex-start',
              borderRadius: '10px',
              cursor: 'pointer',
              position: 'relative',
              background: isActive
                ? AG(0.12)
                : hovered
                  ? 'var(--surface2, rgba(255,255,255,0.04))'
                  : 'transparent',
              borderLeft: `3px solid ${isActive ? A : 'transparent'}`,
              color: isActive ? A : hovered ? 'var(--text)' : 'var(--muted)',
              fontFamily: F,
              fontSize: '13.5px',
              fontWeight: isActive ? 600 : 400,
              letterSpacing: isActive ? '-0.01em' : '0',
              transition: `background 150ms ease, color 150ms ease, border-color 150ms ease`,
              userSelect: 'none',
              marginLeft: collapsed ? 0 : '-3px', // offset border-left
            }}
          >
            <Icon
              size={17}
              strokeWidth={isActive ? 2.3 : 1.8}
              style={{ flexShrink: 0, transition: `color 150ms ease` }}
            />
            {!collapsed && (
              <span style={{
                flex: 1,
                overflow: 'hidden',
                whiteSpace: 'nowrap',
                textOverflow: 'ellipsis',
              }}>
                {label}
              </span>
            )}
            {!collapsed && isActive && (
              <ChevronRight size={13} strokeWidth={2.5} style={{ opacity: 0.5, flexShrink: 0 }} />
            )}
          </div>
        </NavTooltip>
      )}
    </NavLink>
  )
}

// ── Logout button ─────────────────────────────────────────────────────────
function LogoutButton({ collapsed, onClick }) {
  const [hovered, setHovered] = useState(false)
  const [tooltipVisible, setTooltipVisible] = useState(false)

  return (
    <NavTooltip label="Cerrar sesión" visible={collapsed && tooltipVisible}>
      <button
        onClick={onClick}
        onMouseEnter={() => { setHovered(true); if (collapsed) setTooltipVisible(true) }}
        onMouseLeave={() => { setHovered(false); setTooltipVisible(false) }}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          padding: collapsed ? '10px 0' : '9px 13px',
          justifyContent: collapsed ? 'center' : 'flex-start',
          borderRadius: '10px',
          cursor: 'pointer',
          width: '100%',
          background: hovered ? 'rgba(239,68,68,0.08)' : 'transparent',
          border: 'none',
          borderLeft: '3px solid transparent',
          color: hovered ? '#ef4444' : 'var(--muted)',
          fontSize: '13.5px',
          fontFamily: F,
          fontWeight: 400,
          transition: `background 150ms ease, color 150ms ease`,
          marginLeft: collapsed ? 0 : '-3px',
        }}
      >
        <LogOut size={17} strokeWidth={1.8} style={{ flexShrink: 0 }} />
        {!collapsed && <span>Cerrar sesión</span>}
      </button>
    </NavTooltip>
  )
}

// ── Sidebar toggle button ─────────────────────────────────────────────────
function ToggleButton({ collapsed, onClick }) {
  const [hovered, setHovered] = useState(false)

  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      title={collapsed ? 'Expandir sidebar' : 'Colapsar sidebar'}
      style={{
        background: hovered ? 'var(--bg2)' : 'transparent',
        border: `1px solid ${hovered ? 'var(--border-med)' : 'var(--border)'}`,
        borderRadius: '8px',
        padding: '6px',
        cursor: 'pointer',
        color: hovered ? 'var(--text)' : 'var(--muted)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
        transition: `background 150ms ease, border-color 150ms ease, color 150ms ease`,
      }}
    >
      <Menu size={15} strokeWidth={2} />
    </button>
  )
}

// ── Notification bell + dropdown ───────────────────────────────────────────
function NotificationBell({ notifications }) {
  const [open, setOpen] = useState(false)
  const [items, setItems] = useState(notifications)
  const [bellHovered, setBellHovered] = useState(false)
  const ref = useRef(null)
  const unread = items.filter(n => !n.read).length

  useEffect(() => {
    if (!open) return
    function handle(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', handle)
    return () => document.removeEventListener('mousedown', handle)
  }, [open])

  function markAllRead() {
    setItems(prev => prev.map(n => ({ ...n, read: true })))
  }

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button
        onClick={() => setOpen(v => !v)}
        onMouseEnter={() => setBellHovered(true)}
        onMouseLeave={() => setBellHovered(false)}
        style={{
          background: bellHovered ? 'var(--bg2)' : 'var(--bg)',
          border: `1px solid ${open ? AG(0.4) : 'var(--border)'}`,
          borderRadius: '10px',
          padding: '8px',
          cursor: 'pointer',
          color: open ? A : bellHovered ? 'var(--text)' : 'var(--muted)',
          display: 'flex',
          alignItems: 'center',
          position: 'relative',
          transition: `background 150ms ease, border-color 150ms ease, color 150ms ease`,
        }}
      >
        <Bell size={17} strokeWidth={open ? 2.2 : 1.8} />
        {unread > 0 && (
          <span style={{
            position: 'absolute',
            top: '-5px',
            right: '-5px',
            background: A,
            color: '#fff',
            borderRadius: '50%',
            width: '17px',
            height: '17px',
            fontSize: '10px',
            fontWeight: 700,
            fontFamily: F,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            border: '2px solid var(--bg)',
            lineHeight: 1,
          }}>
            {unread}
          </span>
        )}
      </button>

      {open && (
        <div style={{
          position: 'absolute',
          top: 'calc(100% + 10px)',
          right: 0,
          width: '360px',
          background: 'var(--surface)',
          backdropFilter: 'blur(16px)',
          WebkitBackdropFilter: 'blur(16px)',
          border: '1px solid var(--border)',
          borderRadius: '16px',
          boxShadow: '0 20px 60px rgba(0,0,0,0.3), 0 0 0 1px rgba(255,255,255,0.04)',
          zIndex: 200,
          overflow: 'hidden',
          animation: 'notif-in 160ms ease forwards',
        }}>
          {/* Dropdown header */}
          <div style={{
            padding: '14px 16px 12px',
            borderBottom: '1px solid var(--border)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontFamily: D, fontWeight: 700, fontSize: '14px', color: 'var(--text)' }}>
                Notificaciones
              </span>
              {unread > 0 && (
                <span style={{
                  background: AG(0.15),
                  color: A,
                  borderRadius: '20px',
                  padding: '1px 7px',
                  fontSize: '11px',
                  fontWeight: 700,
                  fontFamily: F,
                }}>
                  {unread} nuevas
                </span>
              )}
            </div>
            <button
              onClick={markAllRead}
              style={{
                background: 'none',
                border: 'none',
                fontSize: '12px',
                fontWeight: 500,
                color: unread > 0 ? A : 'var(--muted)',
                cursor: unread > 0 ? 'pointer' : 'default',
                fontFamily: F,
                padding: '2px 0',
                opacity: unread > 0 ? 1 : 0.5,
              }}
            >
              Marcar todas leídas
            </button>
          </div>

          {/* Notification list */}
          <div style={{ maxHeight: '340px', overflowY: 'auto' }}>
            {items.map((n, i) => {
              const tc = NOTIF_TYPE[n.type] || NOTIF_TYPE.info
              return (
                <div
                  key={n.id}
                  style={{
                    padding: '12px 16px',
                    borderBottom: i < items.length - 1 ? '1px solid var(--border)' : 'none',
                    background: n.read ? 'transparent' : AG(0.04),
                    display: 'flex',
                    gap: '11px',
                    alignItems: 'flex-start',
                    transition: 'background 150ms ease',
                    cursor: 'pointer',
                  }}
                  onMouseEnter={e => { e.currentTarget.style.background = 'var(--bg2)' }}
                  onMouseLeave={e => { e.currentTarget.style.background = n.read ? 'transparent' : AG(0.04) }}
                >
                  {/* Type icon chip */}
                  <div style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: '8px',
                    background: tc.bg,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                    fontSize: '15px',
                    lineHeight: 1,
                  }}>
                    {tc.emoji}
                  </div>

                  {/* Content */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{
                      fontSize: '13px',
                      fontWeight: 600,
                      color: 'var(--text)',
                      marginBottom: '2px',
                      fontFamily: F,
                    }}>
                      {n.title}
                    </div>
                    <div style={{
                      fontSize: '12px',
                      color: 'var(--muted)',
                      lineHeight: 1.45,
                      fontFamily: F,
                    }}>
                      {n.desc}
                    </div>
                    <div style={{
                      fontSize: '11px',
                      color: 'var(--muted2)',
                      marginTop: '5px',
                      fontFamily: F,
                    }}>
                      {relTime(n.time)}
                    </div>
                  </div>

                  {/* Unread dot */}
                  {!n.read && (
                    <div style={{
                      width: '7px',
                      height: '7px',
                      borderRadius: '50%',
                      background: A,
                      flexShrink: 0,
                      marginTop: '5px',
                    }} />
                  )}
                </div>
              )
            })}
          </div>

          {/* Footer */}
          <div style={{
            padding: '10px 16px',
            borderTop: '1px solid var(--border)',
            textAlign: 'center',
          }}>
            <button style={{
              background: 'none',
              border: 'none',
              fontSize: '12px',
              color: A,
              cursor: 'pointer',
              fontFamily: F,
              fontWeight: 500,
            }}>
              Ver todas las notificaciones
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

// ── Avatar component ───────────────────────────────────────────────────────
function Avatar({ initials, size = 48 }) {
  return (
    <div style={{
      width: `${size}px`,
      height: `${size}px`,
      borderRadius: '50%',
      flexShrink: 0,
      background: `linear-gradient(135deg, ${AG(0.35)} 0%, ${AG(0.18)} 100%)`,
      border: `1.5px solid ${AG(0.45)}`,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontSize: `${Math.round(size * 0.31)}px`,
      fontWeight: 700,
      color: A,
      fontFamily: D,
      letterSpacing: '0.02em',
      boxShadow: `0 0 0 3px ${AG(0.08)}`,
    }}>
      {initials}
    </div>
  )
}

// ── Main layout ────────────────────────────────────────────────────────────
export default function AdvertiserLayout() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

  const [collapsed, setCollapsed] = useState(false)
  const [notifications, setNotifications] = useState([])

  useEffect(() => {
    let cancelled = false
    const fetchNotifs = () => {
      apiService.request('/notifications').then(res => {
        if (!cancelled && res?.success) setNotifications(res.data || [])
      }).catch(() => {})
    }
    fetchNotifs()
    const interval = setInterval(fetchNotifs, 30000)
    return () => { cancelled = true; clearInterval(interval) }
  }, [])

  const nombre   = user?.nombre || user?.email?.split('@')[0] || 'Usuario'
  const email    = user?.email  || ''
  const initials = nombre.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()

  const SIDEBAR_W = collapsed ? 68 : 240

  const onLogout = () => { logout(); navigate('/') }

  return (
    <div style={{
      display: 'flex',
      minHeight: '100vh',
      background: 'var(--bg)',
      fontFamily: F,
      position: 'relative',
    }}>
      {/* keyframe injection */}
      <style>{`
        @keyframes notif-in {
          from { opacity: 0; transform: translateY(-6px) scale(0.97); }
          to   { opacity: 1; transform: translateY(0)    scale(1); }
        }
        /* thin scrollbar */
        ::-webkit-scrollbar { width: 5px; height: 5px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: var(--border-med, rgba(255,255,255,0.1)); border-radius: 99px; }
      `}</style>

      {/* ── Sidebar ─────────────────────────────────────────────────────── */}
      <aside style={{
        width: `${SIDEBAR_W}px`,
        flexShrink: 0,
        background: 'var(--surface)',
        borderRight: '1px solid var(--border)',
        display: 'flex',
        flexDirection: 'column',
        position: 'sticky',
        top: 0,
        height: '100vh',
        transition: `width 250ms ${EASE}`,
        overflow: 'hidden',
        zIndex: 30,
      }}>

        {/* ── Header: logo + toggle ──────────────────────────────────────── */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: collapsed ? 'center' : 'space-between',
          padding: collapsed ? '0 14px' : '0 16px 0 20px',
          height: '56px',
          borderBottom: '1px solid var(--border)',
          flexShrink: 0,
          gap: '8px',
        }}>
          {/* Logo */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            overflow: 'hidden',
            flex: collapsed ? '0 0 auto' : '1',
          }}>
            {/* Logo mark — always visible */}
            <div style={{
              width: '28px',
              height: '28px',
              borderRadius: '8px',
              background: `linear-gradient(135deg, ${A} 0%, #7c3aed 100%)`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
              boxShadow: `0 2px 8px ${AG(0.35)}`,
            }}>
              <Zap size={15} color="#fff" strokeWidth={2.5} fill="#fff" />
            </div>

            {/* Word-mark — hidden when collapsed */}
            {!collapsed && (
              <span style={{
                fontFamily: D,
                fontWeight: 800,
                fontSize: '18px',
                letterSpacing: '-0.5px',
                color: 'var(--text)',
                whiteSpace: 'nowrap',
              }}>
                Ad<span style={{ color: A }}>flow</span>
              </span>
            )}
          </div>

          <ToggleButton collapsed={collapsed} onClick={() => setCollapsed(v => !v)} />
        </div>

        {/* ── User section ───────────────────────────────────────────────── */}
        <div style={{
          borderBottom: '1px solid var(--border)',
          flexShrink: 0,
          padding: collapsed ? '14px 10px' : '14px 16px',
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          overflow: 'hidden',
          justifyContent: collapsed ? 'center' : 'flex-start',
        }}>
          <Avatar initials={initials} size={collapsed ? 36 : 42} />

          {!collapsed && (
            <div style={{ minWidth: 0, flex: 1 }}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '7px',
                marginBottom: '1px',
              }}>
                <span style={{
                  fontSize: '13.5px',
                  fontWeight: 700,
                  fontFamily: D,
                  color: 'var(--text)',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  maxWidth: '110px',
                }}>
                  {nombre}
                </span>
                {/* Role badge */}
                <span style={{
                  background: AG(0.12),
                  border: `1px solid ${AG(0.25)}`,
                  color: A,
                  borderRadius: '20px',
                  padding: '1px 7px',
                  fontSize: '10px',
                  fontWeight: 700,
                  fontFamily: F,
                  letterSpacing: '0.02em',
                  whiteSpace: 'nowrap',
                  flexShrink: 0,
                }}>
                  Anunciante
                </span>
              </div>
              <div style={{
                fontSize: '11.5px',
                color: 'var(--muted)',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                fontFamily: F,
              }}>
                {email}
              </div>
            </div>
          )}
        </div>

        {/* ── Main nav ───────────────────────────────────────────────────── */}
        <nav style={{
          flex: 1,
          padding: collapsed ? '10px 8px' : '10px 10px',
          display: 'flex',
          flexDirection: 'column',
          gap: '2px',
          overflowY: 'auto',
          overflowX: 'hidden',
        }}>
          {/* Section label */}
          {!collapsed && (
            <div style={{
              fontSize: '10px',
              fontWeight: 600,
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
              color: 'var(--muted2)',
              fontFamily: F,
              padding: '2px 13px 6px',
              userSelect: 'none',
            }}>
              Menu
            </div>
          )}
          {MAIN_NAV.map(item => (
            <SidebarLink key={item.to} {...item} collapsed={collapsed} />
          ))}
        </nav>

        {/* ── Bottom nav ─────────────────────────────────────────────────── */}
        <div style={{
          padding: collapsed ? '10px 8px' : '10px 10px',
          borderTop: '1px solid var(--border)',
          display: 'flex',
          flexDirection: 'column',
          gap: '2px',
          flexShrink: 0,
        }}>
          {BOTTOM_NAV.map(item => (
            <SidebarLink key={item.to} {...item} collapsed={collapsed} />
          ))}
          <LogoutButton collapsed={collapsed} onClick={onLogout} />
        </div>
      </aside>

      {/* ── Main area ───────────────────────────────────────────────────── */}
      <div style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        minWidth: 0,
        overflow: 'hidden',
      }}>

        {/* ── Top bar ─────────────────────────────────────────────────────── */}
        <header style={{
          height: '56px',
          background: 'rgba(var(--surface-rgb, 17,17,17), 0.85)',
          backdropFilter: 'blur(12px)',
          WebkitBackdropFilter: 'blur(12px)',
          borderBottom: '1px solid var(--border)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 24px',
          position: 'sticky',
          top: 0,
          zIndex: 20,
          gap: '12px',
          flexShrink: 0,
        }}>
          {/* Left: current page breadcrumb */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            {(() => {
              const cur = [...MAIN_NAV, ...BOTTOM_NAV].find(n =>
                n.end
                  ? location.pathname === n.to
                  : location.pathname.startsWith(n.to)
              )
              return cur ? (
                <>
                  <cur.icon size={14} color={A} strokeWidth={2} />
                  <span style={{
                    fontSize: '13px',
                    fontWeight: 500,
                    color: 'var(--muted)',
                    fontFamily: F,
                  }}>
                    {cur.label}
                  </span>
                </>
              ) : null
            })()}
          </div>

          {/* Right: notifications + role badge */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <NotificationBell notifications={notifications} />

            {/* Role badge */}
            <div style={{
              background: AG(0.1),
              border: `1px solid ${AG(0.22)}`,
              borderRadius: '20px',
              padding: '4px 12px',
              fontSize: '11.5px',
              fontWeight: 600,
              color: A,
              fontFamily: F,
              letterSpacing: '0.02em',
              userSelect: 'none',
            }}>
              Anunciante
            </div>

            {/* Avatar chip */}
            <div style={{
              width: '32px',
              height: '32px',
              borderRadius: '50%',
              background: `linear-gradient(135deg, ${AG(0.35)} 0%, ${AG(0.18)} 100%)`,
              border: `1.5px solid ${AG(0.4)}`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '11px',
              fontWeight: 700,
              color: A,
              fontFamily: D,
              cursor: 'default',
              userSelect: 'none',
              flexShrink: 0,
            }}>
              {initials}
            </div>
          </div>
        </header>

        {/* ── Page content ─────────────────────────────────────────────── */}
        <main style={{
          flex: 1,
          padding: '28px',
          overflowY: 'auto',
          overflowX: 'hidden',
        }}>
          <Outlet />
        </main>
      </div>
    </div>
  )
}
