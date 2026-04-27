import React from 'react'
import { Link } from 'react-router-dom'
import { PURPLE, purpleAlpha, FONT_BODY, FONT_DISPLAY, TRANSITION } from '../theme/tokens'

export default function NotFoundPage() {
  return (
    <div style={{
      background: 'var(--bg)', color: 'var(--text)', fontFamily: FONT_BODY,
      minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}>
      <div style={{ textAlign: 'center', maxWidth: '480px', padding: '48px 24px' }}>

        {/* 404 number */}
        <div style={{
          fontFamily: FONT_DISPLAY, fontSize: '96px', fontWeight: 900,
          color: PURPLE, letterSpacing: '-4px', lineHeight: 1, marginBottom: '16px',
        }}>
          404
        </div>

        {/* Heading */}
        <h1 style={{
          fontFamily: FONT_DISPLAY, fontSize: '24px', fontWeight: 700,
          marginBottom: '12px',
        }}>
          Pagina no encontrada
        </h1>

        {/* Subtext */}
        <p style={{
          fontSize: '15px', color: 'var(--muted)', lineHeight: 1.7,
          marginBottom: '32px',
        }}>
          La pagina que buscas no existe o ha sido movida.
        </p>

        {/* Buttons */}
        <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap' }}>
          <Link to="/" style={{
            background: PURPLE, color: '#fff', borderRadius: '10px',
            padding: '12px 28px', fontSize: '14px', fontWeight: 700,
            textDecoration: 'none', fontFamily: FONT_BODY,
            transition: TRANSITION,
          }}>
            Volver al inicio
          </Link>
          <Link to="/marketplace" style={{
            background: 'var(--surface)', color: 'var(--text)',
            border: '1px solid var(--border)', borderRadius: '10px',
            padding: '12px 28px', fontSize: '14px', fontWeight: 600,
            textDecoration: 'none', fontFamily: FONT_BODY,
            transition: TRANSITION,
          }}>
            Explorar marketplace
          </Link>
        </div>
      </div>
    </div>
  )
}
