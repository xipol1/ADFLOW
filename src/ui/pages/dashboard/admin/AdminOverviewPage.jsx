import React from 'react'
import { useNavigate } from 'react-router-dom'
import { Users, Radio, Megaphone, ShieldAlert } from 'lucide-react'
import { useAuth } from '../../../../auth/AuthContext'
import { PURPLE, purpleAlpha, FONT_BODY, FONT_DISPLAY, BLUE, WARN, ERR } from '../../../theme/tokens'

const STATS = [
  { label: 'Total Usuarios',     value: '2,450', icon: Users,       color: PURPLE, bg: purpleAlpha(0.1) },
  { label: 'Total Canales',      value: '890',   icon: Radio,       color: BLUE,   bg: 'rgba(59,130,246,0.1)' },
  { label: 'Solicitudes Activas', value: '124',   icon: Megaphone,   color: WARN,   bg: 'rgba(245,158,11,0.1)' },
  { label: 'Disputas Abiertas',  value: '8',     icon: ShieldAlert, color: ERR,    bg: 'rgba(239,68,68,0.1)' },
]

const ACTIONS = [
  { label: 'Gestionar usuarios', to: '/admin/users',    color: PURPLE },
  { label: 'Moderar canales',    to: '/admin/channels', color: BLUE },
  { label: 'Ver disputas',       to: '/admin/disputes', color: ERR },
]

export default function AdminOverviewPage() {
  const { user } = useAuth()
  const navigate = useNavigate()

  return (
    <div style={{ fontFamily: FONT_BODY, maxWidth: 1100 }}>
      {/* Header */}
      <h1 style={{ fontFamily: FONT_DISPLAY, fontSize: '24px', fontWeight: 800, color: 'var(--text)', marginBottom: '4px' }}>
        Panel de Administracion
      </h1>
      <p style={{ fontSize: '14px', color: 'var(--muted)', marginBottom: '32px' }}>
        Hola, {user?.name || 'Admin'}. Aqui tienes un resumen de la plataforma.
      </p>

      {/* Stat cards */}
      <div style={{
        display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
        gap: '16px', marginBottom: '40px',
      }}>
        {STATS.map(s => {
          const Icon = s.icon
          return (
            <div key={s.label} style={{
              background: 'var(--surface)', border: '1px solid var(--border)',
              borderRadius: '16px', padding: '24px',
            }}>
              <div style={{
                width: '42px', height: '42px', borderRadius: '12px',
                background: s.bg, display: 'flex', alignItems: 'center', justifyContent: 'center',
                marginBottom: '14px',
              }}>
                <Icon size={20} color={s.color} strokeWidth={1.8} />
              </div>
              <div style={{ fontSize: '13px', color: 'var(--muted)', marginBottom: '4px' }}>{s.label}</div>
              <div style={{ fontSize: '28px', fontWeight: 800, fontFamily: FONT_DISPLAY, color: 'var(--text)' }}>{s.value}</div>
            </div>
          )
        })}
      </div>

      {/* Quick actions */}
      <h2 style={{ fontFamily: FONT_DISPLAY, fontSize: '16px', fontWeight: 700, color: 'var(--text)', marginBottom: '16px' }}>
        Acciones rapidas
      </h2>
      <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
        {ACTIONS.map(a => (
          <button
            key={a.to}
            onClick={() => navigate(a.to)}
            style={{
              background: a.color, color: '#fff', border: 'none',
              borderRadius: '10px', padding: '12px 24px',
              fontSize: '14px', fontWeight: 600, cursor: 'pointer',
              fontFamily: FONT_BODY,
            }}
          >
            {a.label}
          </button>
        ))}
      </div>
    </div>
  )
}
