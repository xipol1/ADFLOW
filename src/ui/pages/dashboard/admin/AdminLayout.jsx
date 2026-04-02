import React, { useState } from 'react'
import { Outlet, NavLink, useNavigate } from 'react-router-dom'
import {
  LayoutDashboard, Users, Radio, Megaphone, ShieldAlert, Settings,
  LogOut, Menu,
} from 'lucide-react'
import { useAuth } from '../../../../auth/AuthContext'
import { PURPLE, purpleAlpha, FONT_BODY, FONT_DISPLAY, EASE, TRANSITION } from '../../../theme/tokens'

const NAV_ITEMS = [
  { to: '/admin',          icon: LayoutDashboard, label: 'Dashboard',      end: true },
  { to: '/admin/users',    icon: Users,           label: 'Usuarios'                 },
  { to: '/admin/channels', icon: Radio,           label: 'Canales'                  },
  { to: '/admin/ads',      icon: Megaphone,       label: 'Solicitudes'              },
  { to: '/admin/disputes', icon: ShieldAlert,     label: 'Disputas'                 },
  { to: '/admin/settings', icon: Settings,        label: 'Configuracion'            },
]

function SidebarLink({ to, icon: Icon, label, end, collapsed }) {
  const [hovered, setHovered] = useState(false)

  return (
    <NavLink to={to} end={end} style={{ textDecoration: 'none', display: 'block' }}>
      {({ isActive }) => (
        <div
          onMouseEnter={() => setHovered(true)}
          onMouseLeave={() => setHovered(false)}
          style={{
            display: 'flex', alignItems: 'center', gap: '10px',
            padding: collapsed ? '10px 0' : '10px 14px',
            justifyContent: collapsed ? 'center' : 'flex-start',
            borderRadius: '10px', cursor: 'pointer',
            position: 'relative',
            background: isActive
              ? purpleAlpha(0.12)
              : hovered
                ? 'var(--surface2, rgba(255,255,255,0.04))'
                : 'transparent',
            borderLeft: `3px solid ${isActive ? PURPLE : 'transparent'}`,
            color: isActive ? PURPLE : hovered ? 'var(--text)' : 'var(--muted)',
            fontWeight: isActive ? 600 : 400,
            fontSize: '14px', fontFamily: FONT_BODY,
            letterSpacing: isActive ? '-0.01em' : '0',
            transition: `background 150ms ease, color 150ms ease, border-color 150ms ease`,
            userSelect: 'none',
            marginLeft: collapsed ? 0 : '-3px',
          }}
        >
          <Icon size={18} strokeWidth={isActive ? 2.2 : 1.8} style={{ flexShrink: 0, transition: 'color 150ms ease' }} />
          {!collapsed && (
            <span style={{ flex: 1, overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>
              {label}
            </span>
          )}
        </div>
      )}
    </NavLink>
  )
}

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
        borderRadius: '8px', padding: '6px', cursor: 'pointer',
        color: hovered ? 'var(--text)' : 'var(--muted)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        flexShrink: 0, transition: 'background 150ms ease, border-color 150ms ease, color 150ms ease',
      }}
    >
      <Menu size={15} strokeWidth={2} />
    </button>
  )
}

function LogoutButton({ collapsed, onClick }) {
  const [hovered, setHovered] = useState(false)
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: 'flex', alignItems: 'center', gap: '10px',
        width: '100%', padding: collapsed ? '10px 0' : '10px 14px',
        justifyContent: collapsed ? 'center' : 'flex-start',
        background: hovered ? 'rgba(239,68,68,0.08)' : 'transparent',
        border: 'none', borderLeft: '3px solid transparent',
        borderRadius: '10px', cursor: 'pointer',
        color: hovered ? '#ef4444' : 'var(--muted)',
        fontSize: '14px', fontFamily: FONT_BODY, fontWeight: 400,
        transition: 'background 150ms ease, color 150ms ease',
        marginLeft: collapsed ? 0 : '-3px',
      }}
    >
      <LogOut size={18} strokeWidth={1.8} style={{ flexShrink: 0 }} />
      {!collapsed && <span>Cerrar sesion</span>}
    </button>
  )
}

export default function AdminLayout() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [collapsed, setCollapsed] = useState(false)
  const sidebarW = collapsed ? 68 : 240

  const handleLogout = () => { logout(); navigate('/auth/login') }

  return (
    <div style={{ display: 'flex', minHeight: '100vh', fontFamily: FONT_BODY }}>
      {/* Sidebar */}
      <aside style={{
        width: `${sidebarW}px`, flexShrink: 0,
        background: 'var(--surface)', borderRight: '1px solid var(--border)',
        display: 'flex', flexDirection: 'column',
        position: 'sticky', top: 0, height: '100vh',
        transition: `width 250ms ${EASE}`,
        overflow: 'hidden', zIndex: 30,
      }}>
        {/* Header */}
        <div style={{
          height: 64, display: 'flex', alignItems: 'center',
          padding: collapsed ? '0 12px' : '0 20px',
          justifyContent: collapsed ? 'center' : 'space-between',
          borderBottom: '1px solid var(--border)', flexShrink: 0,
        }}>
          {!collapsed && (
            <span style={{ fontFamily: FONT_DISPLAY, fontWeight: 800, fontSize: '20px', letterSpacing: '-0.5px', color: 'var(--text)', userSelect: 'none' }}>
              Ad<span style={{ color: PURPLE }}>flow</span>
            </span>
          )}
          <ToggleButton collapsed={collapsed} onClick={() => setCollapsed(c => !c)} />
        </div>

        {/* Nav links */}
        <nav style={{ flex: 1, padding: '12px 10px', display: 'flex', flexDirection: 'column', gap: '2px' }}>
          {NAV_ITEMS.map(item => (
            <SidebarLink key={item.to} {...item} collapsed={collapsed} />
          ))}
        </nav>

        {/* User section + logout */}
        <div style={{ padding: '12px 10px', borderTop: '1px solid var(--border)' }}>
          {!collapsed && (
            <div style={{ padding: '8px 14px', marginBottom: '8px' }}>
              <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text)', marginBottom: '2px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {user?.name || 'Admin'}
              </div>
              <div style={{ fontSize: '11px', color: 'var(--muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {user?.email || ''}
              </div>
              <span style={{
                display: 'inline-block', marginTop: '4px',
                fontSize: '10px', fontWeight: 700, textTransform: 'uppercase',
                color: PURPLE, background: purpleAlpha(0.1),
                padding: '2px 8px', borderRadius: '6px',
              }}>
                Admin
              </span>
            </div>
          )}

          <LogoutButton collapsed={collapsed} onClick={handleLogout} />
        </div>
      </aside>

      {/* Main content */}
      <main style={{
        flex: 1, background: 'var(--bg)',
        overflow: 'auto', padding: '32px',
      }}>
        <Outlet />
      </main>
    </div>
  )
}
