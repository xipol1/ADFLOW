import React from 'react'
import { Link } from 'react-router-dom'
import { FONT_BODY, FONT_DISPLAY, PURPLE, purpleAlpha } from '../../theme/tokens'

const ALL_LINKS = [
  { to: '/para-anunciantes', label: 'Para anunciantes', desc: 'Encuentra canales verificados para tu marca', icon: '📢', color: PURPLE },
  { to: '/para-canales', label: 'Para creadores', desc: 'Monetiza tu comunidad con publicidad nativa', icon: '💰', color: '#25d366' },
  { to: '/marketplace', label: 'Marketplace', desc: 'Explora canales por nicho, plataforma y precio', icon: '🔍', color: '#3b82f6' },
  { to: '/blog', label: 'Blog', desc: 'Guias sobre publicidad en comunidades', icon: '📖', color: '#f59e0b' },
]

export default function CrossLinks({ exclude = '' }) {
  const links = ALL_LINKS.filter(l => l.to !== exclude)

  return (
    <section style={{ padding: '48px clamp(16px,4vw,24px)', background: 'var(--bg2)', borderTop: '1px solid var(--border)', borderBottom: '1px solid var(--border)' }}>
      <div style={{ maxWidth: '880px', margin: '0 auto' }}>
        <p style={{ fontFamily: FONT_DISPLAY, fontSize: '14px', fontWeight: 600, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.5px', textAlign: 'center', marginBottom: '20px' }}>
          Tambien te puede interesar
        </p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px' }}>
          {links.map(link => (
            <Link
              key={link.to}
              to={link.to}
              style={{
                display: 'flex', alignItems: 'center', gap: '12px',
                padding: '16px', borderRadius: '12px',
                border: '1px solid var(--border)', background: 'var(--bg)',
                textDecoration: 'none', color: 'inherit',
                transition: 'transform 0.2s, box-shadow 0.2s',
              }}
              onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.06)' }}
              onMouseLeave={e => { e.currentTarget.style.transform = ''; e.currentTarget.style.boxShadow = '' }}
            >
              <span style={{ fontSize: '22px', flexShrink: 0 }}>{link.icon}</span>
              <div>
                <span style={{ fontFamily: FONT_BODY, fontSize: '14px', fontWeight: 600, color: link.color, display: 'block' }}>{link.label}</span>
                <span style={{ fontFamily: FONT_BODY, fontSize: '12px', color: 'var(--muted)' }}>{link.desc}</span>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  )
}
