import React, { useState } from 'react'
import { Link } from 'react-router-dom'
import { PURPLE, purpleAlpha, FONT_BODY, FONT_DISPLAY } from '../../theme/tokens'

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!email.trim()) return
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim() }),
      })
      const data = await res.json()
      if (data.success) {
        setSent(true)
      } else {
        setError(data.message || 'No pudimos procesar tu solicitud. Intenta de nuevo.')
      }
    } catch {
      setError('Error de conexión. Intenta de nuevo.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{
      fontFamily: FONT_BODY,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      minHeight: '80vh', padding: '40px 20px',
    }}>
      <div style={{
        background: 'var(--surface)', border: '1px solid var(--border)',
        borderRadius: '20px', padding: '48px 40px', maxWidth: '420px', width: '100%',
        textAlign: 'center', boxShadow: '0 8px 32px rgba(0,0,0,0.08)',
      }}>
        {!sent ? (
          <>
            <div style={{
              width: '56px', height: '56px', borderRadius: '16px',
              background: purpleAlpha(0.1), display: 'flex', alignItems: 'center', justifyContent: 'center',
              margin: '0 auto 20px', fontSize: '24px',
            }}>
              🔑
            </div>

            <h2 style={{ fontFamily: FONT_DISPLAY, fontSize: '22px', fontWeight: 800, color: 'var(--text)', marginBottom: '8px' }}>
              Recuperar contraseña
            </h2>
            <p style={{ fontSize: '14px', color: 'var(--muted)', marginBottom: '28px', lineHeight: 1.6 }}>
              Introduce tu correo electronico y te enviaremos las instrucciones para restablecer tu contraseña.
            </p>

            <form onSubmit={handleSubmit}>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="tu@email.com"
                required
                style={{
                  width: '100%', padding: '12px 14px', fontSize: '14px', fontFamily: FONT_BODY,
                  background: 'var(--bg)', color: 'var(--text)',
                  border: '1px solid var(--border)', borderRadius: '10px',
                  outline: 'none', marginBottom: '16px', boxSizing: 'border-box',
                }}
              />

              {error && (
                <p style={{ fontSize: '13px', color: '#ef4444', marginBottom: '12px', textAlign: 'left' }}>{error}</p>
              )}

              <button
                type="submit"
                disabled={loading}
                style={{
                  width: '100%', background: loading ? 'var(--muted2)' : PURPLE,
                  color: '#fff', border: 'none', borderRadius: '10px',
                  padding: '13px', fontSize: '14px', fontWeight: 600,
                  cursor: loading ? 'not-allowed' : 'pointer', fontFamily: FONT_BODY,
                  marginBottom: '16px',
                }}
              >
                {loading ? 'Enviando...' : 'Enviar instrucciones'}
              </button>
            </form>

            <Link to="/auth/login" style={{ fontSize: '13px', color: PURPLE, textDecoration: 'none', fontWeight: 500 }}>
              ← Volver al login
            </Link>
          </>
        ) : (
          <>
            <div style={{
              width: '56px', height: '56px', borderRadius: '16px',
              background: 'rgba(16,185,129,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center',
              margin: '0 auto 20px', fontSize: '24px',
            }}>
              ✉️
            </div>

            <h2 style={{ fontFamily: FONT_DISPLAY, fontSize: '22px', fontWeight: 800, color: 'var(--text)', marginBottom: '8px' }}>
              Revisa tu correo
            </h2>
            <p style={{ fontSize: '14px', color: 'var(--muted)', marginBottom: '28px', lineHeight: 1.6 }}>
              Si existe una cuenta con <strong style={{ color: 'var(--text)' }}>{email}</strong>, recibiras un email con las instrucciones para restablecer tu contraseña.
            </p>

            <Link to="/auth/login" style={{
              display: 'inline-block', background: PURPLE, color: '#fff',
              borderRadius: '10px', padding: '12px 32px', fontSize: '14px',
              fontWeight: 700, textDecoration: 'none', fontFamily: FONT_BODY,
            }}>
              Volver al login
            </Link>
          </>
        )}
      </div>
    </div>
  )
}
