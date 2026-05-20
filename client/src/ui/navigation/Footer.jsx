import React from 'react'
import { Link } from 'react-router-dom'
import { FONT_BODY, FONT_DISPLAY } from '../theme/tokens'

const F = FONT_BODY
const D = FONT_DISPLAY

// Columnas de navegación. /benchmark queda fuera a propósito — es privada
// (noindex, solo accesible por enlace directo en outreach).
const COLUMNS = [
  {
    title: 'Producto',
    links: [
      { label: 'Para anunciantes', to: '/para-anunciantes' },
      { label: 'Para creadores', to: '/para-canales' },
      { label: 'Canales WhatsApp', to: '/whatsapp' },
      { label: 'Marketplace', to: '/marketplace' },
      { label: 'Herramientas', to: '/herramientas' },
      { label: 'Precios', to: '/precios' },
    ],
  },
  {
    title: 'Recursos',
    links: [
      { label: 'Blog', to: '/blog' },
      { label: 'Qué es Channelad', to: '/que-es-channelad' },
      { label: 'Founding cohort', to: '/founding' },
      { label: 'Channel Audit gratis', to: '/audit' },
      { label: 'Rankings', to: '/rankings' },
    ],
  },
  {
    title: 'Legal',
    links: [
      { label: 'Privacidad', to: '/privacidad' },
      { label: 'Términos', to: '/terminos' },
      { label: 'Política de acceso WhatsApp', to: '/politica-acceso-whatsapp' },
      { label: 'Sobre nosotros', to: '/sobre-nosotros' },
      { label: 'Soporte', to: '/soporte' },
    ],
  },
]

const linkStyle = {
  fontFamily: F, fontSize: 13.5, color: 'var(--muted)',
  textDecoration: 'none', display: 'block', padding: '5px 0',
  transition: 'color .15s',
}

export default function Footer() {
  return (
    <footer
      style={{
        background: 'var(--bg2)',
        borderTop: '1px solid var(--border)',
        padding: 'clamp(48px, 6vw, 72px) clamp(20px, 5vw, 56px) 32px',
      }}
    >
      <div style={{ maxWidth: 1100, margin: '0 auto' }}>
        <div
          className="footer-grid"
          style={{
            display: 'grid',
            gridTemplateColumns: '1.4fr 1fr 1fr 1fr',
            gap: 'clamp(28px, 4vw, 56px)',
            marginBottom: 40,
          }}
        >
          {/* Brand block */}
          <div>
            <Link to="/" style={{ display: 'inline-flex', marginBottom: 14 }} aria-label="Channelad">
              <img src="/logo.svg" alt="Channelad" style={{ height: 26, width: 'auto', display: 'block' }} />
            </Link>
            <p style={{
              fontFamily: F, fontSize: 13.5, color: 'var(--muted)',
              lineHeight: 1.6, margin: '0 0 16px', maxWidth: 280,
            }}>
              Marketplace de publicidad en canales privados de WhatsApp, Telegram y Discord.
              Escrow, métricas verificadas y factura — para el mercado hispanohablante.
            </p>
            <a
              href="https://www.linkedin.com/company/112893073"
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 8,
                fontFamily: F, fontSize: 13, fontWeight: 600,
                color: 'var(--muted)', textDecoration: 'none',
                padding: '7px 12px', borderRadius: 8,
                border: '1px solid var(--border)', background: 'var(--surface)',
              }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                <path d="M19 3a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h14zM8.34 18.34V9.93H5.55v8.41h2.79zM6.95 8.78a1.62 1.62 0 1 0 0-3.23 1.62 1.62 0 0 0 0 3.23zm11.4 9.56v-4.61c0-2.46-1.31-3.6-3.06-3.6a2.64 2.64 0 0 0-2.39 1.31V9.93H10.1v8.41h2.79v-4.67c0-1.23.23-2.42 1.76-2.42 1.5 0 1.52 1.4 1.52 2.5v4.59h2.18z"/>
              </svg>
              LinkedIn
            </a>
          </div>

          {/* Nav columns */}
          {COLUMNS.map((col) => (
            <div key={col.title}>
              <h3 style={{
                fontFamily: D, fontSize: 12, fontWeight: 700,
                textTransform: 'uppercase', letterSpacing: '0.1em',
                color: 'var(--text)', margin: '0 0 10px',
              }}>
                {col.title}
              </h3>
              {col.links.map((link) => (
                <Link
                  key={link.to}
                  to={link.to}
                  style={linkStyle}
                  onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--text)' }}
                  onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--muted)' }}
                >
                  {link.label}
                </Link>
              ))}
            </div>
          ))}
        </div>

        {/* Bottom bar */}
        <div
          style={{
            borderTop: '1px solid var(--border)',
            paddingTop: 24,
            display: 'flex', flexWrap: 'wrap',
            alignItems: 'center', justifyContent: 'space-between',
            gap: 14,
          }}
        >
          <p style={{ fontFamily: F, fontSize: 12, color: 'var(--muted)', margin: 0 }}>
            © {new Date().getFullYear()} MICHI SOLUCIONS S.L. · Marketplace operado desde España
          </p>
          <p style={{
            fontFamily: F, fontSize: 11.5, color: 'var(--muted)', margin: 0,
            maxWidth: 480, lineHeight: 1.5,
          }}>
            Channelad es una plataforma independiente. No está afiliada ni respaldada por
            WhatsApp Inc., Meta Platforms, Telegram ni Discord.
          </p>
        </div>
      </div>

      <style>{`
        @media (max-width: 760px) {
          .footer-grid { grid-template-columns: 1fr 1fr !important; }
        }
        @media (max-width: 480px) {
          .footer-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </footer>
  )
}
