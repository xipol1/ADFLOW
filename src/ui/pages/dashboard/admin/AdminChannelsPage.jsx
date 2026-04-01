import React, { useState } from 'react'
import { Search, Check, X } from 'lucide-react'
import { PURPLE, purpleAlpha, FONT_BODY, FONT_DISPLAY, OK, WARN, ERR, PLATFORM_BRAND } from '../../../theme/tokens'

const MOCK_CHANNELS = [
  { id: 1, name: 'Tech News Daily',     platform: 'telegram',  owner: 'Carlos Martinez', members: '12,400', status: 'Activo',             verified: true },
  { id: 2, name: 'Fitness Community',    platform: 'whatsapp',  owner: 'Maria Lopez',     members: '8,200',  status: 'Activo',             verified: true },
  { id: 3, name: 'Gaming Hub',          platform: 'discord',   owner: 'Juan Perez',      members: '45,600', status: 'Pendiente revision', verified: false },
  { id: 4, name: 'Crypto Alerts',       platform: 'telegram',  owner: 'Luis Rodriguez',  members: '3,100',  status: 'Suspendido',         verified: false },
  { id: 5, name: 'Recipe Channel',      platform: 'youtube',   owner: 'Ana Garcia',      members: '22,000', status: 'Activo',             verified: true },
  { id: 6, name: 'Fashion Trends',      platform: 'instagram', owner: 'Sofia Hernandez', members: '15,800', status: 'Pendiente revision', verified: false },
]

const STATUS_COLORS = {
  'Activo':             { color: OK,   bg: 'rgba(16,185,129,0.1)' },
  'Pendiente revision': { color: WARN, bg: 'rgba(245,158,11,0.1)' },
  'Suspendido':         { color: ERR,  bg: 'rgba(239,68,68,0.1)' },
}

export default function AdminChannelsPage() {
  const [search, setSearch] = useState('')

  const filtered = MOCK_CHANNELS.filter(c => {
    if (!search) return true
    const q = search.toLowerCase()
    return c.name.toLowerCase().includes(q) || c.owner.toLowerCase().includes(q) || c.platform.toLowerCase().includes(q)
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
        Canales
      </h1>

      {/* Search */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: '8px',
        background: 'var(--surface)', border: '1px solid var(--border)',
        borderRadius: '10px', padding: '8px 14px', maxWidth: '360px', marginBottom: '20px',
      }}>
        <Search size={16} color="var(--muted)" />
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Buscar canal, propietario o plataforma..."
          style={{
            border: 'none', outline: 'none', background: 'transparent',
            fontSize: '14px', color: 'var(--text)', fontFamily: FONT_BODY, width: '100%',
          }}
        />
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
              <th style={thStyle}>Plataforma</th>
              <th style={thStyle}>Propietario</th>
              <th style={thStyle}>Miembros</th>
              <th style={thStyle}>Estado</th>
              <th style={thStyle}>Verificado</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(c => {
              const sc = STATUS_COLORS[c.status] || STATUS_COLORS.Activo
              const plat = PLATFORM_BRAND[c.platform] || { color: '#888', bg: 'rgba(136,136,136,0.1)', label: c.platform }
              return (
                <tr key={c.id}>
                  <td style={{ ...tdStyle, fontWeight: 600 }}>{c.name}</td>
                  <td style={tdStyle}>
                    <span style={{
                      fontSize: '12px', fontWeight: 600, padding: '3px 10px',
                      borderRadius: '6px', background: plat.bg, color: plat.color,
                    }}>
                      {plat.label}
                    </span>
                  </td>
                  <td style={{ ...tdStyle, color: 'var(--muted)' }}>{c.owner}</td>
                  <td style={{ ...tdStyle, color: 'var(--muted)' }}>{c.members}</td>
                  <td style={tdStyle}>
                    <span style={{
                      fontSize: '12px', fontWeight: 600, padding: '3px 10px',
                      borderRadius: '6px', background: sc.bg, color: sc.color,
                    }}>
                      {c.status}
                    </span>
                  </td>
                  <td style={tdStyle}>
                    {c.verified ? (
                      <span style={{
                        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                        width: '24px', height: '24px', borderRadius: '50%',
                        background: 'rgba(16,185,129,0.1)',
                      }}>
                        <Check size={14} color={OK} strokeWidth={2.5} />
                      </span>
                    ) : (
                      <span style={{
                        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                        width: '24px', height: '24px', borderRadius: '50%',
                        background: 'rgba(239,68,68,0.08)',
                      }}>
                        <X size={14} color={ERR} strokeWidth={2} />
                      </span>
                    )}
                  </td>
                </tr>
              )
            })}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={6} style={{ ...tdStyle, textAlign: 'center', color: 'var(--muted)', padding: '40px 16px' }}>
                  No se encontraron canales.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
