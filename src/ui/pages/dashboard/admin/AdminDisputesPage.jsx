import React, { useState } from 'react'
import { X } from 'lucide-react'
import { PURPLE, purpleAlpha, FONT_BODY, FONT_DISPLAY, OK, WARN, ERR, BLUE } from '../../../theme/tokens'

const MOCK_DISPUTES = [
  { id: 'DSP-001', advertiser: 'Carlos Martinez', creator: 'Maria Lopez',     reason: 'Contenido no entregado',        status: 'Abierta',     date: '2026-03-18' },
  { id: 'DSP-002', advertiser: 'Luis Rodriguez',  creator: 'Sofia Hernandez', reason: 'Metricas no coinciden',          status: 'En revision', date: '2026-03-15' },
  { id: 'DSP-003', advertiser: 'Ana Garcia',      creator: 'Juan Perez',      reason: 'Publicacion fuera de plazo',    status: 'Resuelta',    date: '2026-02-28' },
  { id: 'DSP-004', advertiser: 'Carlos Martinez', creator: 'Ana Garcia',      reason: 'Calidad del contenido inferior', status: 'Abierta',     date: '2026-03-22' },
  { id: 'DSP-005', advertiser: 'Luis Rodriguez',  creator: 'Maria Lopez',     reason: 'Pago no recibido',              status: 'Cerrada',     date: '2026-01-10' },
]

const STATUS_COLORS = {
  'Abierta':     { color: WARN, bg: 'rgba(245,158,11,0.1)' },
  'En revision': { color: BLUE, bg: 'rgba(59,130,246,0.1)' },
  'Resuelta':    { color: OK,   bg: 'rgba(16,185,129,0.1)' },
  'Cerrada':     { color: 'var(--muted)', bg: 'var(--bg)' },
}

export default function AdminDisputesPage() {
  const [selected, setSelected] = useState(null)

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
        Disputas
      </h1>

      <div style={{ display: 'flex', gap: '24px' }}>
        {/* Table */}
        <div style={{
          flex: 1, background: 'var(--surface)', border: '1px solid var(--border)',
          borderRadius: '16px', overflow: 'hidden',
        }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                <th style={thStyle}>ID</th>
                <th style={thStyle}>Anunciante</th>
                <th style={thStyle}>Creador</th>
                <th style={thStyle}>Motivo</th>
                <th style={thStyle}>Estado</th>
                <th style={thStyle}>Fecha</th>
              </tr>
            </thead>
            <tbody>
              {MOCK_DISPUTES.map(d => {
                const sc = STATUS_COLORS[d.status] || STATUS_COLORS.Cerrada
                const isSelected = selected?.id === d.id
                return (
                  <tr
                    key={d.id}
                    onClick={() => setSelected(d)}
                    style={{
                      cursor: 'pointer',
                      background: isSelected ? purpleAlpha(0.05) : 'transparent',
                    }}
                  >
                    <td style={{ ...tdStyle, fontWeight: 600, color: PURPLE, fontSize: '13px' }}>{d.id}</td>
                    <td style={tdStyle}>{d.advertiser}</td>
                    <td style={tdStyle}>{d.creator}</td>
                    <td style={{ ...tdStyle, color: 'var(--muted)', fontSize: '13px', maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {d.reason}
                    </td>
                    <td style={tdStyle}>
                      <span style={{
                        fontSize: '12px', fontWeight: 600, padding: '3px 10px',
                        borderRadius: '6px', background: sc.bg, color: sc.color,
                      }}>
                        {d.status}
                      </span>
                    </td>
                    <td style={{ ...tdStyle, color: 'var(--muted)', fontSize: '13px' }}>{d.date}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        {/* Detail panel */}
        {selected && (
          <div style={{
            width: '320px', minWidth: '320px',
            background: 'var(--surface)', border: '1px solid var(--border)',
            borderRadius: '16px', padding: '24px',
            alignSelf: 'flex-start',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <span style={{ fontFamily: FONT_DISPLAY, fontWeight: 700, fontSize: '16px', color: 'var(--text)' }}>
                {selected.id}
              </span>
              <button
                onClick={() => setSelected(null)}
                style={{
                  background: 'none', border: 'none', cursor: 'pointer',
                  color: 'var(--muted)', padding: '4px',
                }}
              >
                <X size={16} />
              </button>
            </div>

            {[
              { label: 'Anunciante', value: selected.advertiser },
              { label: 'Creador', value: selected.creator },
              { label: 'Motivo', value: selected.reason },
              { label: 'Fecha', value: selected.date },
            ].map(item => (
              <div key={item.label} style={{ marginBottom: '16px' }}>
                <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--muted)', textTransform: 'uppercase', marginBottom: '4px' }}>
                  {item.label}
                </div>
                <div style={{ fontSize: '14px', color: 'var(--text)', lineHeight: 1.5 }}>
                  {item.value}
                </div>
              </div>
            ))}

            <div style={{ marginBottom: '20px' }}>
              <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--muted)', textTransform: 'uppercase', marginBottom: '4px' }}>
                Estado
              </div>
              <span style={{
                fontSize: '12px', fontWeight: 600, padding: '4px 12px',
                borderRadius: '6px',
                background: (STATUS_COLORS[selected.status] || STATUS_COLORS.Cerrada).bg,
                color: (STATUS_COLORS[selected.status] || STATUS_COLORS.Cerrada).color,
              }}>
                {selected.status}
              </span>
            </div>

            <div style={{ display: 'flex', gap: '8px' }}>
              <button style={{
                flex: 1, padding: '10px', borderRadius: '10px', fontSize: '13px', fontWeight: 600,
                background: PURPLE, color: '#fff', border: 'none', cursor: 'pointer', fontFamily: FONT_BODY,
              }}>
                Revisar
              </button>
              <button style={{
                flex: 1, padding: '10px', borderRadius: '10px', fontSize: '13px', fontWeight: 600,
                background: 'var(--bg)', color: 'var(--text)', border: '1px solid var(--border)',
                cursor: 'pointer', fontFamily: FONT_BODY,
              }}>
                Cerrar
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
