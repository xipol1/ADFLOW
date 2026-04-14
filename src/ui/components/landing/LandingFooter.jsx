import React, { useState } from 'react'
import { Link } from 'react-router-dom'
import { FONT_DISPLAY, FONT_BODY, MAX_W, PURPLE } from '../../theme/tokens'

const COLUMNS = [
  {
    title: 'Plataforma',
    links: [
      { label: 'Para anunciantes', to: '/para-anunciantes' },
      { label: 'Para canales', to: '/para-canales' },
      { label: 'Marketplace', to: '/marketplace' },
      { label: 'Precios', to: '#precios' },
    ],
  },
  {
    title: 'Recursos',
    links: [
      { label: 'Blog', to: '/blog' },
      { label: 'Centro de ayuda', to: '/soporte' },
      { label: 'Estado del servicio', to: '#' },
      { label: 'API (pronto)', to: '#' },
    ],
  },
  {
    title: 'Legal',
    links: [
      { label: 'Sobre nosotros', to: '/sobre-nosotros' },
      { label: 'Privacidad', to: '/privacidad' },
      { label: 'Terminos', to: '/terminos' },
      { label: 'Cookies', to: '/privacidad' },
      { label: 'Soporte', to: '/soporte' },
    ],
  },
]

export default function LandingFooter() {
  const [email, setEmail] = useState('')
  const [subscribed, setSubscribed] = useState(false)

  const handleNewsletterSubmit = (e) => {
    e.preventDefault()
    if (email.includes('@')) {
      setSubscribed(true)
      setEmail('')
    }
  }

  return (
    <footer style={{
      background: 'var(--bg2)',
      borderTop: '1px solid var(--border)',
    }}>
      {/* Newsletter bar */}
      <div className="footer-newsletter" style={{
        maxWidth: MAX_W, margin: '0 auto',
        padding: '40px clamp(16px, 4vw, 24px)',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        flexWrap: 'wrap', gap: '20px',
        borderBottom: '1px solid var(--border)',
      }}>
        <div style={{ maxWidth: '360px', minWidth: 0 }}>
          <h3 style={{
            fontFamily: FONT_DISPLAY, fontWeight: 600, fontSize: '16px',
            margin: '0 0 6px', color: 'var(--text)',
          }}>
            Cada semana, lo mejor del marketplace en tu bandeja.
          </h3>
          <p style={{ fontSize: '13px', color: 'var(--muted)', margin: 0 }}>
            Canales trending, nuevas categorias y consejos para optimizar tus campanas.
          </p>
        </div>

        {subscribed ? (
          <div style={{
            padding: '12px 24px', borderRadius: '12px',
            background: 'rgba(37,211,102,0.08)',
            color: '#25d366', fontSize: '14px', fontWeight: 600,
          }}>
            Suscrito correctamente \u2713
          </div>
        ) : (
          <form onSubmit={handleNewsletterSubmit} className="footer-newsletter-form" style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="tu@email.com"
              required
              style={{
                padding: '12px 16px', borderRadius: '10px',
                border: '1px solid var(--border-med)',
                background: 'var(--surface)',
                color: 'var(--text)',
                fontSize: '14px', width: '220px', minWidth: 0,
                outline: 'none',
                transition: 'border-color 0.2s',
              }}
              onFocus={e => e.currentTarget.style.borderColor = 'var(--accent)'}
              onBlur={e => e.currentTarget.style.borderColor = 'var(--border-med)'}
            />
            <button
              type="submit"
              aria-label="Suscribirse al newsletter"
              style={{
                padding: '12px 20px', borderRadius: '10px',
                background: 'var(--accent)', color: '#fff',
                fontSize: '14px', fontWeight: 600,
                border: 'none', cursor: 'pointer',
                transition: 'opacity 0.2s', whiteSpace: 'nowrap',
              }}
              onMouseEnter={e => e.currentTarget.style.opacity = '0.9'}
              onMouseLeave={e => e.currentTarget.style.opacity = '1'}
            >
              Suscribirme
            </button>
          </form>
        )}
      </div>

      {/* Footer grid */}
      <div className="footer-grid" style={{
        maxWidth: MAX_W, margin: '0 auto',
        padding: '40px clamp(16px, 4vw, 24px)',
        display: 'grid',
        gridTemplateColumns: '1.5fr 1fr 1fr 1fr',
        gap: '32px',
      }}>
        {/* Brand column */}
        <div>
          <Link to="/" style={{
            fontFamily: FONT_DISPLAY, fontWeight: 700,
            fontSize: '20px', letterSpacing: '-0.5px',
            color: 'var(--text)', textDecoration: 'none',
            display: 'inline-block', marginBottom: '14px',
          }}>
            Channel<span style={{ color: PURPLE }}>ad</span>
          </Link>
          <p style={{
            fontSize: '14px', color: 'var(--muted)', lineHeight: 1.6,
            margin: '0 0 20px', maxWidth: '240px',
          }}>
            El marketplace de publicidad nativa en comunidades. Conecta marcas con audiencias reales.
          </p>
          {/* Social links placeholder */}
          <div style={{ display: 'flex', gap: '12px' }}>
            {['LinkedIn', 'X', 'Instagram'].map(s => (
              <span key={s} style={{
                width: '32px', height: '32px', borderRadius: '8px',
                background: 'var(--surface)', border: '1px solid var(--border)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '11px', color: 'var(--muted)',
                cursor: 'pointer',
              }}>
                {s[0]}
              </span>
            ))}
          </div>
        </div>

        {/* Link columns */}
        {COLUMNS.map((col, i) => (
          <div key={i}>
            <h5 style={{
              fontSize: '12px', fontWeight: 600, textTransform: 'uppercase',
              letterSpacing: '0.08em', color: 'var(--muted)',
              margin: '0 0 16px',
            }}>
              {col.title}
            </h5>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {col.links.map((link, j) => (
                <Link
                  key={j}
                  to={link.to}
                  style={{
                    fontSize: '14px', color: 'var(--text-secondary, var(--muted))',
                    textDecoration: 'none', transition: 'color 0.15s',
                  }}
                  onMouseEnter={e => e.currentTarget.style.color = 'var(--text)'}
                  onMouseLeave={e => e.currentTarget.style.color = 'var(--text-secondary, var(--muted))'}
                >
                  {link.label}
                </Link>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Bottom bar */}
      <div className="footer-bottom" style={{
        maxWidth: MAX_W, margin: '0 auto',
        padding: '20px clamp(16px, 4vw, 24px)',
        borderTop: '1px solid var(--border)',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        flexWrap: 'wrap', gap: '12px',
        fontSize: '13px', color: 'var(--muted)',
      }}>
        <span>{'\u00A9'} 2026 Channelad. Todos los derechos reservados.</span>
        <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap' }}>
          <Link to="/privacidad" style={{ color: 'var(--muted)', textDecoration: 'none' }}>Privacidad</Link>
          <Link to="/terminos" style={{ color: 'var(--muted)', textDecoration: 'none' }}>Terminos</Link>
          <span>{'Hecho en Espana \u{1F1EA}\u{1F1F8}'}</span>
        </div>
      </div>

      <style>{`
        @media (max-width: 768px) {
          .footer-grid { grid-template-columns: 1fr 1fr !important; }
          .footer-newsletter { flex-direction: column; align-items: flex-start !important; }
          .footer-newsletter-form { width: 100%; }
          .footer-newsletter-form input { flex: 1 !important; width: auto !important; min-width: 0 !important; }
        }
        @media (max-width: 480px) {
          .footer-grid { grid-template-columns: 1fr !important; gap: 28px !important; }
          .footer-bottom { flex-direction: column; align-items: flex-start !important; gap: 8px !important; }
        }
      `}</style>
    </footer>
  )
}
