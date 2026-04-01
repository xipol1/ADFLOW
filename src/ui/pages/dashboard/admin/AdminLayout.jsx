import React, { useState } from 'react'
import { Outlet, NavLink, useNavigate } from 'react-router-dom'
import {
  LayoutDashboard, Users, Radio, Megaphone, ShieldAlert, Settings,
  LogOut, Menu,
} from 'lucide-react'
import { useAuth } from '../../../../auth/AuthContext'
import { PURPLE, purpleAlpha, FONT_BODY, FONT_DISPLAY, EASE } from '../../../theme/tokens'

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
            background: isActive ? purpleAlpha(0.10) : hovered ? purpleAlpha(0.05) : 'transparent',
            color: isActive ? PURPLE : 'var(--muted)',
            fontWeight: isActive ? 600 : 400,
            fontSize: '14px', fontFamily: FONT_BODY,
            transition: `all 200ms ${EASE}`,
          }}
        >
          <Icon size={18} strokeWidth={isActive ? 2.2 : 1.8} />
          {!collapsed && <span>{label}</span>}
        </div>
      )}
    </NavLink>
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
        width: sidebarW, minWidth: sidebarW, maxWidth: sidebarW,
        background: 'var(--surface)', borderRight: '1px solid var(--border)',
        display: 'flex', flexDirection: 'column',
        transition: `width 250ms ${EASE}, min-width 250ms ${EASE}, max-width 250ms ${EASE}`,
        overflow: 'hidden',
      }}>
        {/* Header */}
        <div style={{
          height: 64, display: 'flex', alignItems: 'center',
          padding: collapsed ? '0' : '0 18px',
          justifyContent: collapsed ? 'center' : 'space-between',
          borderBottom: '1px solid var(--border)',
        }}>
          {!collapsed && (
            <span style={{ fontFamily: FONT_DISPLAY, fontWeight: 800, fontSize: '18px', color: PURPLE }}>
              Adflow
            </span>
          )}
          <button
            onClick={() => setCollapsed(c => !c)}
            style={{
              background: 'none', border: 'none', cursor: 'pointer',
              color: 'var(--muted)', padding: '6px', borderRadius: '8px',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
          >
            <Menu size={18} />
          </button>
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

          <button
            onClick={handleLogout}
            style={{
              display: 'flex', alignItems: 'center', gap: '10px',
              width: '100%', padding: collapsed ? '10px 0' : '10px 14px',
              justifyContent: collapsed ? 'center' : 'flex-start',
              background: 'none', border: 'none', borderRadius: '10px',
              cursor: 'pointer', color: 'var(--muted)', fontSize: '14px',
              fontFamily: FONT_BODY,
            }}
          >
            <LogOut size={18} strokeWidth={1.8} />
            {!collapsed && <span>Cerrar sesion</span>}
          </button>
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
