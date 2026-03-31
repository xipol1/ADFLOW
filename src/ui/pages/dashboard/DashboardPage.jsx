import React, { useState } from 'react'
import { Navigate, useNavigate, useLocation, Link } from 'react-router-dom'
import { useAuth } from '../../../auth/AuthContext'
import AdvertiserDashboard from './AdvertiserDashboard'
import CreatorDashboard from './CreatorDashboard'
import AdminDashboard from './AdminDashboard'
import { PURPLE as A, purpleAlpha as AG, FONT_BODY as F, FONT_DISPLAY as D } from '../../theme/tokens'

const dashboardByRole = {
  admin:      AdminDashboard,
  advertiser: AdvertiserDashboard,
  anunciante: AdvertiserDashboard,
  creator:    CreatorDashboard,
  creador:    CreatorDashboard,
}

const NAV_ITEMS = [
  { icon: '⊞', label: 'Inicio',     path: '/dashboard'    },
  { icon: '🔍', label: 'Explorar',  path: '/marketplace'  },
  { icon: '⚙️', label: 'Configuración', path: '/dashboard' },
]

export default function DashboardPage() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const { pathname } = useLocation()

  const role = user?.role || user?.rol || 'advertiser'

  // Advertisers → full advertiser suite
  if (role === 'advertiser' || role === 'anunciante') {
    return <Navigate to="/advertiser" replace />
  }
  // Creators → full creator suite
  if (role === 'creator' || role === 'creador') {
    return <Navigate to="/creator" replace />
  }

  const RoleDashboard = dashboardByRole[role] || AdvertiserDashboard

  const roleLabel = {
    advertiser: 'Anunciante', anunciante: 'Anunciante',
    creator: 'Creador',       creador: 'Creador',
    admin: 'Administrador',
  }[role] || role

  const initials = user?.nombre
    ? user.nombre.slice(0, 2).toUpperCase()
    : (user?.email || 'U').slice(0, 2).toUpperCase()

  const onLogout = () => { logout(); navigate('/') }

  return (
    <div style={{ display: 'flex', gap: '0', minHeight: 'calc(100vh - 88px)' }}>

      {/* ── Sidebar ─────────────────────────────── */}
      <aside style={{
        width: '240px', flexShrink: 0,
        borderRight: '1px solid var(--border)',
        display: 'flex', flexDirection: 'column',
        padding: '24px 0',
        position: 'sticky', top: '88px', alignSelf: 'flex-start',
        maxHeight: 'calc(100vh - 88px)', overflowY: 'auto',
      }}>
        {/* Avatar + user */}
        <div style={{ padding: '0 20px 24px', borderBottom: '1px solid var(--border)' }}>
          <div style={{
            width: '48px', height: '48px', borderRadius: '50%',
            background: AG(0.2), border: `2px solid ${AG(0.4)}`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontFamily: D, fontWeight: 700, fontSize: '18px', color: A,
            marginBottom: '12px',
          }}>{initials}</div>
          <div style={{ fontFamily: D, fontWeight: 600, fontSize: '15px', color: 'var(--text)', marginBottom: '2px' }}>
            {user?.nombre || user?.email?.split('@')[0] || 'Usuario'}
          </div>
          <div style={{ fontSize: '12px', color: 'var(--muted)', marginBottom: '6px' }}>
            {user?.email}
          </div>
          <span style={{
            display: 'inline-block', padding: '2px 10px',
            background: AG(0.12), border: `1px solid ${AG(0.3)}`,
            borderRadius: '20px', fontSize: '11px', fontWeight: 600, color: A,
          }}>{roleLabel}</span>
        </div>

        {/* Nav links */}
        <nav style={{ flex: 1, padding: '16px 12px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
          {NAV_ITEMS.map(({ icon, label, path }) => {
            const active = pathname === path
            return (
              <Link key={path} to={path} style={{
                display: 'flex', alignItems: 'center', gap: '10px',
                padding: '9px 12px', borderRadius: '10px', textDecoration: 'none',
                background: active ? AG(0.12) : 'transparent',
                border: `1px solid ${active ? AG(0.25) : 'transparent'}`,
                color: active ? A : 'var(--muted)',
                fontSize: '14px', fontWeight: active ? 600 : 400,
                fontFamily: F, transition: 'all .15s',
              }}
                onMouseEnter={e => { if (!active) { e.currentTarget.style.background = 'var(--surface2)'; e.currentTarget.style.color = 'var(--text)' } }}
                onMouseLeave={e => { if (!active) { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--muted)' } }}
              >
                <span style={{ fontSize: '16px' }}>{icon}</span>
                {label}
              </Link>
            )
          })}
        </nav>

        {/* Logout */}
        <div style={{ padding: '16px 12px', borderTop: '1px solid var(--border)' }}>
          <button onClick={onLogout} style={{
            width: '100%', display: 'flex', alignItems: 'center', gap: '10px',
            padding: '9px 12px', borderRadius: '10px',
            background: 'transparent', border: '1px solid transparent',
            color: 'var(--muted)', fontSize: '14px', fontFamily: F,
            cursor: 'pointer', transition: 'all .15s',
          }}
            onMouseEnter={e => { e.currentTarget.style.background = 'rgba(239,68,68,0.08)'; e.currentTarget.style.color = '#ef4444'; e.currentTarget.style.borderColor = 'rgba(239,68,68,0.2)' }}
            onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--muted)'; e.currentTarget.style.borderColor = 'transparent' }}
          >
            <span style={{ fontSize: '16px' }}>↩</span>
            Cerrar sesión
          </button>
        </div>
      </aside>

      {/* ── Main content ─────────────────────────── */}
      <div style={{ flex: 1, padding: '28px 32px', minWidth: 0 }}>
        <RoleDashboard user={user} role={role} />
      </div>
    </div>
  )
}
