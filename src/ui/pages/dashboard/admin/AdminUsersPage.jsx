import React, { useState } from 'react'
import { Search } from 'lucide-react'
import { PURPLE, purpleAlpha, FONT_BODY, FONT_DISPLAY, OK, WARN, ERR } from '../../../theme/tokens'

const MOCK_USERS = [
  { id: 1, name: 'Carlos Martinez',  email: 'carlos@example.com',  rol: 'anunciante', status: 'Activo',     date: '2025-11-12' },
  { id: 2, name: 'Maria Lopez',      email: 'maria@example.com',   rol: 'creador',    status: 'Activo',     date: '2025-12-03' },
  { id: 3, name: 'Juan Perez',       email: 'juan@example.com',    rol: 'admin',      status: 'Activo',     date: '2025-08-21' },
  { id: 4, name: 'Ana Garcia',       email: 'ana@example.com',     rol: 'creador',    status: 'Pendiente',  date: '2026-01-15' },
  { id: 5, name: 'Luis Rodriguez',   email: 'luis@example.com',    rol: 'anunciante', status: 'Suspendido', date: '2025-10-28' },
  { id: 6, name: 'Sofia Hernandez',  email: 'sofia@example.com',   rol: 'creador',    status: 'Activo',     date: '2026-02-09' },
]

const STATUS_COLORS = {
  Activo:     { color: OK,   bg: 'rgba(16,185,129,0.1)' },
  Pendiente:  { color: WARN, bg: 'rgba(245,158,11,0.1)' },
  Suspendido: { color: ERR,  bg: 'rgba(239,68,68,0.1)' },
}

const ROLE_LABELS = { anunciante: 'Anunciante', creador: 'Creador', admin: 'Admin' }

const FILTERS = [
  { key: 'all',         label: 'Todos' },
  { key: 'anunciante',  label: 'Anunciantes' },
  { key: 'creador',     label: 'Creadores' },
  { key: 'admin',       label: 'Admins' },
]

export default function AdminUsersPage() {
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState('all')

  const filtered = MOCK_USERS.filter(u => {
    if (filter !== 'all' && u.rol !== filter) return false
    if (search && !u.name.toLowerCase().includes(search.toLowerCase()) && !u.email.toLowerCase().includes(search.toLowerCase())) return false
    return true
  })

  const thStyle = {
    textAlign: 'left', padding: '12px 16px', fontSize: '12px',
    fontWeight: 600, color: 'var(--muted)', textTransform: 'uppercase',
    letterSpacing: '0.5px', borderBottom: '1px solid var(--border)',
  }

  const tdStyle = {
    padding: '14px 16px', fontSize: '14px', color: 'var(--text)',
    borderBottom: '1px solid var(--border)',
  }

  return (
    <div style={{ fontFamily: FONT_BODY, maxWidth: 1100 }}>
      <h1 style={{ fontFamily: FONT_DISPLAY, fontSize: '24px', fontWeight: 800, color: 'var(--text)', marginBottom: '24px' }}>
        Usuarios
      </h1>

      {/* Search + Filters */}
      <div style={{ display: 'flex', gap: '12px', marginBottom: '20px', flexWrap: 'wrap', alignItems: 'center' }}>
        <div style={{
          display: 'flex', alignItems: 'center', gap: '8px',
          background: 'var(--surface)', border: '1px solid var(--border)',
          borderRadius: '10px', padding: '8px 14px', flex: '1 1 240px', maxWidth: '360px',
        }}>
          <Search size={16} color="var(--muted)" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Buscar por nombre o email..."
            style={{
              border: 'none', outline: 'none', background: 'transparent',
              fontSize: '14px', color: 'var(--text)', fontFamily: FONT_BODY, width: '100%',
            }}
          />
        </div>
        <div style={{ display: 'flex', gap: '6px' }}>
          {FILTERS.map(f => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              style={{
                padding: '7px 16px', borderRadius: '8px', fontSize: '13px', fontWeight: 500,
                border: 'none', cursor: 'pointer', fontFamily: FONT_BODY,
                background: filter === f.key ? purpleAlpha(0.1) : 'var(--surface)',
                color: filter === f.key ? PURPLE : 'var(--muted)',
                outline: filter === f.key ? `1px solid ${purpleAlpha(0.3)}` : '1px solid var(--border)',
              }}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div style={{
        background: 'var(--surface)', border: '1px solid var(--border)',
        borderRadius: '16px', overflow: 'hidden',
      }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              <th style={thStyle}>Nombre</th>
              <th style={thStyle}>Email</th>
              <th style={thStyle}>Rol</th>
              <th style={thStyle}>Estado</th>
              <th style={thStyle}>Registrado</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(u => {
              const sc = STATUS_COLORS[u.status] || STATUS_COLORS.Activo
              return (
                <tr key={u.id}>
                  <td style={{ ...tdStyle, fontWeight: 600 }}>{u.name}</td>
                  <td style={{ ...tdStyle, color: 'var(--muted)' }}>{u.email}</td>
                  <td style={tdStyle}>
                    <span style={{
                      fontSize: '12px', fontWeight: 600, padding: '3px 10px',
                      borderRadius: '6px', background: purpleAlpha(0.08), color: PURPLE,
                    }}>
                      {ROLE_LABELS[u.rol] || u.rol}
                    </span>
                  </td>
                  <td style={tdStyle}>
                    <span style={{
                      fontSize: '12px', fontWeight: 600, padding: '3px 10px',
                      borderRadius: '6px', background: sc.bg, color: sc.color,
                    }}>
                      {u.status}
                    </span>
                  </td>
                  <td style={{ ...tdStyle, color: 'var(--muted)', fontSize: '13px' }}>{u.date}</td>
                </tr>
              )
            })}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={5} style={{ ...tdStyle, textAlign: 'center', color: 'var(--muted)', padding: '40px 16px' }}>
                  No se encontraron usuarios.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
