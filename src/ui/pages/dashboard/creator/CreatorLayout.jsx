import React, { useState, useEffect } from 'react'
import { Outlet, NavLink, useNavigate } from 'react-router-dom'
import { LayoutDashboard, Radio, Inbox, Wallet, Settings, LogOut, Menu, Bell } from 'lucide-react'
import { useAuth } from '../../../../auth/AuthContext'
import apiService from '../../../../../services/api'

const A   = '#25d366'
const AG  = (o) => `rgba(37,211,102,${o})`
const F   = "'Inter', system-ui, sans-serif"
const D   = "'Sora', system-ui, sans-serif"
const TR  = 'all 250ms cubic-bezier(.4,0,.2,1)'

const NAV = [
  { to: '/creator',          icon: LayoutDashboard, label: 'Dashboard',    end: true },
  { to: '/creator/channels', icon: Radio,           label: 'Mis Canales'             },
  { to: '/creator/requests', icon: Inbox,           label: 'Solicitudes',  badge: true },
  { to: '/creator/earnings', icon: Wallet,          label: 'Ganancias'               },
]

/* ── Sidebar nav link ──────────────────────────────────────── */
function SidebarLink({ to, icon: Icon, label, end, collapsed, badge, pendingCount }) {
  return (
    <NavLink to={to} end={end} style={{ textDecoration: 'none' }}>
      {({ isActive }) => (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            padding: collapsed ? '11px 0' : '10px 14px',
            justifyContent: collapsed ? 'center' : 'flex-start',
            borderRadius: '10px',
            cursor: 'pointer',
            background: isActive ? AG(0.12) : 'transparent',
            borderLeft: `3px solid ${isActive ? A : 'transparent'}`,
            color: isActive ? A : 'var(--muted)',
            fontFamily: F,
            fontSize: '14px',
            fontWeight: isActive ? 600 : 400,
            transition: TR,
            position: 'relative',
          }}
          onMouseEnter={e => {
            if (!isActive) {
              e.currentTarget.style.background = 'var(--bg2)'
              e.currentTarget.style.color = 'var(--text)'
            }
          }}
          onMouseLeave={e => {
            if (!isActive) {
              e.currentTarget.style.background = 'transparent'
              e.currentTarget.style.color = 'var(--muted)'
            }
          }}
        >
          <Icon size={18} strokeWidth={isActive ? 2.2 : 1.8} style={{ flexShrink: 0 }} />

          {!collapsed && (
            <>
              <span style={{ flex: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {label}
              </span>
              {badge && pendingCount > 0 && (
                <span style={{
                  background: A,
                  color: '#fff',
                  borderRadius: '20px',
                  padding: '1px 7px',
                  fontSize: '11px',
                  fontWeight: 700,
                  flexShrink: 0,
                  letterSpacing: '0.02em',
                }}>
                  {pendingCount}
                </span>
              )}
            </>
          )}

          {/* collapsed badge dot */}
          {collapsed && badge && pendingCount > 0 && (
            <span style={{
              position: 'absolute',
              top: '6px',
              right: '6px',
              width: '8px',
              height: '8px',
              borderRadius: '50%',
              background: A,
              border: '2px solid var(--surface)',
              flexShrink: 0,
            }} />
          )}
        </div>
      )}
    </NavLink>
  )
}

/* ── CreatorLayout ─────────────────────────────────────────── */
export default function CreatorLayout() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [collapsed, setCollapsed]   = useState(false)
  const [notifOpen, setNotifOpen]   = useState(false)

  const nombre   = user?.nombre || 'Creador'
  const email    = user?.email  || ''
  const initials = nombre.slice(0, 2).toUpperCase()

  const [requests, setRequests] = useState([])
  const [notifications, setNotifications] = useState([])

  useEffect(() => {
    let cancelled = false
    const load = async () => {
      try {
        const [reqRes, notifRes] = await Promise.all([
          apiService.getAdsForCreator().catch(() => null),
          apiService.getMyNotifications().catch(() => null),
        ])
        if (cancelled) return
        if (reqRes?.success && Array.isArray(reqRes.data)) {
          setRequests(reqRes.data.map(a => ({
            id: a._id || a.id,
            advertiser: a.anunciante?.nombre || a.advertiser || 'Anunciante',
            channel: a.canal?.nombreCanal || a.channel || '',
            title: a.titulo || a.title || '',
            budget: a.presupuesto || a.budget || 0,
            platform: a.canal?.plataforma || a.platform || '',
            status: a.estado || a.status || 'pendiente',
            receivedAt: a.createdAt ? new Date(a.createdAt).toLocaleDateString('es') : '',
            message: a.descripcion || a.message || '',
            category: a.categoria || a.category || '',
          })))
        }
        if (notifRes?.success && Array.isArray(notifRes.data)) {
          setNotifications(notifRes.data)
        }
      } catch { /* empty state */ }
    }
    load()
    // Poll notifications every 30s
    const interval = setInterval(async () => {
      try {
        const res = await apiService.getMyNotifications()
        if (!cancelled && res?.success && Array.isArray(res.data)) {
          setNotifications(res.data)
        }
      } catch {}
    }, 30000)
    return () => { cancelled = true; clearInterval(interval) }
  }, [])

  const pendingRequests = requests.filter(r => r.status === 'pendiente').length
  const unreadNotifs = notifications.filter(n => !n.leida).length

  const onLogout = () => { logout(); navigate('/') }
  const sw = collapsed ? 64 : 240

  return (
    <div style={{
      display: 'flex',
      minHeight: '100vh',
      background: 'var(--bg)',
      fontFamily: F,
    }}>

      {/* ── Sidebar ───────────────────────────────────── */}
      <aside style={{
        width: `${sw}px`,
        flexShrink: 0,
        background: 'var(--surface)',
        borderRight: '1px solid var(--border)',
        display: 'flex',
        flexDirection: 'column',
        position: 'sticky',
        top: 0,
        height: '100vh',
        transition: `width 250ms cubic-bezier(.4,0,.2,1)`,
        overflow: 'hidden',
        zIndex: 30,
      }}>

        {/* ── Header: logo + collapse ── */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: collapsed ? 'center' : 'space-between',
          padding: collapsed ? '0 12px' : '0 20px',
          borderBottom: '1px solid var(--border)',
          minHeight: '64px',
          flexShrink: 0,
        }}>
          {!collapsed && (
            <span style={{
              fontFamily: D,
              fontWeight: 800,
              fontSize: '20px',
              letterSpacing: '-0.5px',
              color: 'var(--text)',
              userSelect: 'none',
            }}>
              Ad<span style={{ color: A }}>flow</span>
            </span>
          )}
          <button
            onClick={() => setCollapsed(c => !c)}
            aria-label="Toggle sidebar"
            style={{
              background: 'var(--bg2)',
              border: '1px solid var(--border)',
              borderRadius: '8px',
              padding: '6px',
              cursor: 'pointer',
              color: 'var(--muted)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
              transition: TR,
            }}
            onMouseEnter={e => { e.currentTarget.style.color = 'var(--text)'; e.currentTarget.style.borderColor = 'var(--border-med)' }}
            onMouseLeave={e => { e.currentTarget.style.color = 'var(--muted)'; e.currentTarget.style.borderColor = 'var(--border)' }}
          >
            <Menu size={16} />
          </button>
        </div>

        {/* ── User section ── */}
        {!collapsed ? (
          <div style={{
            padding: '14px 20px',
            borderBottom: '1px solid var(--border)',
            flexShrink: 0,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              {/* Avatar */}
              <div style={{
                width: '38px',
                height: '38px',
                borderRadius: '50%',
                flexShrink: 0,
                background: `linear-gradient(135deg, ${AG(0.25)} 0%, ${AG(0.12)} 100%)`,
                border: `1.5px solid ${AG(0.4)}`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '14px',
                fontWeight: 700,
                color: A,
                fontFamily: D,
                letterSpacing: '0.02em',
              }}>
                {initials}
              </div>
              {/* Info */}
              <div style={{ minWidth: 0, flex: 1 }}>
                <div style={{
                  fontSize: '13px',
                  fontWeight: 600,
                  color: 'var(--text)',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  lineHeight: 1.3,
                }}>
                  {nombre}
                </div>
                <div style={{
                  fontSize: '11px',
                  color: 'var(--muted)',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  marginTop: '1px',
                  marginBottom: '4px',
                }}>
                  {email}
                </div>
                <span style={{
                  display: 'inline-block',
                  fontSize: '10px',
                  fontWeight: 600,
                  letterSpacing: '0.03em',
                  background: AG(0.1),
                  border: `1px solid ${AG(0.3)}`,
                  color: A,
                  borderRadius: '10px',
                  padding: '1px 7px',
                }}>
                  Creador
                </span>
              </div>
            </div>
          </div>
        ) : (
          /* Collapsed: avatar only */
          <div style={{
            padding: '12px 0',
            display: 'flex',
            justifyContent: 'center',
            borderBottom: '1px solid var(--border)',
            flexShrink: 0,
          }}>
            <div style={{
              width: '36px',
              height: '36px',
              borderRadius: '50%',
              background: `linear-gradient(135deg, ${AG(0.25)} 0%, ${AG(0.12)} 100%)`,
              border: `1.5px solid ${AG(0.4)}`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '13px',
              fontWeight: 700,
              color: A,
              fontFamily: D,
            }}>
              {initials}
            </div>
          </div>
        )}

        {/* ── Nav links ── */}
        <nav style={{
          flex: 1,
          padding: '10px 8px',
          display: 'flex',
          flexDirection: 'column',
          gap: '2px',
          overflowY: 'auto',
          overflowX: 'hidden',
        }}>
          {NAV.map(item => (
            <SidebarLink
              key={item.to}
              {...item}
              collapsed={collapsed}
              pendingCount={pendingRequests}
            />
          ))}
        </nav>

        {/* ── Footer: settings + logout ── */}
        <div style={{
          padding: '10px 8px',
          borderTop: '1px solid var(--border)',
          display: 'flex',
          flexDirection: 'column',
          gap: '2px',
          flexShrink: 0,
        }}>
          <SidebarLink
            to="/creator/settings"
            icon={Settings}
            label="Configuración"
            collapsed={collapsed}
          />
          <button
            onClick={onLogout}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              padding: collapsed ? '11px 0' : '10px 14px',
              justifyContent: collapsed ? 'center' : 'flex-start',
              borderRadius: '10px',
              borderLeft: '3px solid transparent',
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              color: 'var(--muted)',
              fontSize: '14px',
              fontFamily: F,
              fontWeight: 400,
              width: '100%',
              transition: TR,
            }}
            onMouseEnter={e => {
              e.currentTarget.style.background = 'rgba(239,68,68,0.08)'
              e.currentTarget.style.color = '#ef4444'
            }}
            onMouseLeave={e => {
              e.currentTarget.style.background = 'transparent'
              e.currentTarget.style.color = 'var(--muted)'
            }}
          >
            <LogOut size={18} strokeWidth={1.8} style={{ flexShrink: 0 }} />
            {!collapsed && (
              <span style={{ whiteSpace: 'nowrap' }}>Cerrar sesión</span>
            )}
          </button>
        </div>
      </aside>

      {/* ── Main area ──────────────────────────────────── */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, overflow: 'hidden' }}>

        {/* ── Top bar ── */}
        <header style={{
          height: '56px',
          background: 'rgba(var(--surface-rgb, 255,255,255), 0.85)',
          backdropFilter: 'blur(12px)',
          WebkitBackdropFilter: 'blur(12px)',
          borderBottom: '1px solid var(--border)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'flex-end',
          padding: '0 24px',
          gap: '10px',
          position: 'sticky',
          top: 0,
          zIndex: 20,
          flexShrink: 0,
        }}>

          {/* Bell with notifications badge */}
          <div style={{ position: 'relative' }}>
            <button
              onClick={() => setNotifOpen(o => !o)}
              aria-label="Notificaciones"
              style={{
                background: 'var(--bg)',
                border: '1px solid var(--border)',
                borderRadius: '10px',
                padding: '7px',
                cursor: 'pointer',
                color: notifOpen ? A : 'var(--muted)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                position: 'relative',
                transition: TR,
              }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--border-med)'; e.currentTarget.style.color = 'var(--text)' }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.color = notifOpen ? A : 'var(--muted)' }}
            >
              <Bell size={17} strokeWidth={1.8} />
              {(unreadNotifs > 0 || pendingRequests > 0) && (
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
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  border: '2px solid var(--surface)',
                  fontFamily: F,
                }}>
                  {unreadNotifs || pendingRequests}
                </span>
              )}
            </button>

            {/* Notification dropdown */}
            {notifOpen && (
              <div
                style={{
                  position: 'absolute',
                  top: 'calc(100% + 10px)',
                  right: 0,
                  width: '320px',
                  background: 'var(--surface)',
                  border: '1px solid var(--border)',
                  borderRadius: '14px',
                  boxShadow: '0 16px 48px rgba(0,0,0,0.22)',
                  zIndex: 100,
                  overflow: 'hidden',
                  maxHeight: '420px',
                }}
              >
                <div style={{
                  padding: '12px 16px',
                  borderBottom: '1px solid var(--border)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                }}>
                  <span style={{ fontFamily: D, fontWeight: 600, fontSize: '13px', color: 'var(--text)' }}>
                    Notificaciones
                  </span>
                  {unreadNotifs > 0 && (
                    <button
                      onClick={async () => {
                        try {
                          await apiService.request('/notifications/leer-todas', { method: 'PUT' })
                          setNotifications(prev => prev.map(n => ({ ...n, leida: true })))
                        } catch {}
                      }}
                      style={{ background: 'none', border: 'none', color: A, fontSize: '11px', fontWeight: 600, cursor: 'pointer', fontFamily: F }}
                    >
                      Marcar todas como leídas
                    </button>
                  )}
                </div>
                <div style={{ overflowY: 'auto', maxHeight: '320px' }}>
                  {notifications.length === 0 && pendingRequests === 0 ? (
                    <div style={{ padding: '24px 16px', textAlign: 'center', color: 'var(--muted)', fontSize: '13px' }}>
                      No hay notificaciones
                    </div>
                  ) : (
                    <>
                      {notifications.slice(0, 8).map(n => (
                        <div
                          key={n._id || n.id}
                          onClick={async () => {
                            if (!n.leida) {
                              try {
                                await apiService.markNotificationAsRead(n._id || n.id)
                                setNotifications(prev => prev.map(x => (x._id || x.id) === (n._id || n.id) ? { ...x, leida: true } : x))
                              } catch {}
                            }
                            if (n.metadata?.campaignId) {
                              setNotifOpen(false)
                              navigate('/creator/requests')
                            }
                          }}
                          style={{
                            padding: '10px 16px',
                            display: 'flex',
                            alignItems: 'flex-start',
                            gap: '10px',
                            borderBottom: '1px solid var(--border)',
                            cursor: 'pointer',
                            background: n.leida ? 'transparent' : AG(0.04),
                            transition: TR,
                          }}
                          onMouseEnter={e => { e.currentTarget.style.background = 'var(--bg2)' }}
                          onMouseLeave={e => { e.currentTarget.style.background = n.leida ? 'transparent' : AG(0.04) }}
                        >
                          {!n.leida && (
                            <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: A, flexShrink: 0, marginTop: '5px' }} />
                          )}
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontSize: '13px', fontWeight: n.leida ? 400 : 600, color: 'var(--text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                              {n.titulo || n.title || 'Notificación'}
                            </div>
                            <div style={{ fontSize: '11px', color: 'var(--muted)', marginTop: '2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {n.mensaje || n.message || ''}
                            </div>
                            <div style={{ fontSize: '10px', color: 'var(--muted2)', marginTop: '3px' }}>
                              {n.createdAt ? new Date(n.createdAt).toLocaleDateString('es', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) : ''}
                            </div>
                          </div>
                          {n.prioridad === 'alta' && (
                            <span style={{ fontSize: '9px', fontWeight: 700, color: '#ef4444', background: 'rgba(239,68,68,0.1)', borderRadius: '4px', padding: '1px 5px', flexShrink: 0 }}>
                              Alta
                            </span>
                          )}
                        </div>
                      ))}
                      {pendingRequests > 0 && (
                        <div style={{ padding: '10px 16px' }}>
                          <button
                            onClick={() => { setNotifOpen(false); navigate('/creator/requests') }}
                            style={{
                              width: '100%',
                              background: AG(0.1),
                              border: `1px solid ${AG(0.25)}`,
                              borderRadius: '8px',
                              padding: '8px',
                              cursor: 'pointer',
                              color: A,
                              fontSize: '13px',
                              fontWeight: 600,
                              fontFamily: F,
                              transition: TR,
                            }}
                            onMouseEnter={e => { e.currentTarget.style.background = AG(0.18) }}
                            onMouseLeave={e => { e.currentTarget.style.background = AG(0.1) }}
                          >
                            Ver solicitudes pendientes ({pendingRequests})
                          </button>
                        </div>
                      )}
                    </>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Role badge */}
          <span style={{
            display: 'inline-flex',
            alignItems: 'center',
            background: AG(0.1),
            border: `1px solid ${AG(0.3)}`,
            borderRadius: '20px',
            padding: '3px 11px',
            fontSize: '11px',
            fontWeight: 600,
            color: A,
            letterSpacing: '0.02em',
            fontFamily: F,
            userSelect: 'none',
          }}>
            Creador
          </span>
        </header>

        {/* ── Page content ── */}
        <main style={{ flex: 1, padding: '28px', overflowY: 'auto' }}>
          <Outlet />
        </main>
      </div>
    </div>
  )
}
