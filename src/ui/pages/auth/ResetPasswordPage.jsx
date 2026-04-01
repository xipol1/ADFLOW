import React, { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { PURPLE, purpleAlpha, FONT_BODY, FONT_DISPLAY, OK, ERR } from '../../theme/tokens'

export default function ResetPasswordPage() {
  const { token } = useParams()
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  const validate = () => {
    if (password.length < 8) return 'La contrasena debe tener al menos 8 caracteres.'
    if (password !== confirm) return 'Las contrasenas no coinciden.'
    return ''
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    const err = validate()
    if (err) { setError(err); return }
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, password }),
      })
      const data = await res.json()
      if (data.success) {
        setSuccess(true)
      } else {
        setError(data.message || 'No pudimos restablecer tu contrasena. Intenta de nuevo.')
      }
    } catch {
      setError('Error de conexion. Intenta de nuevo.')
    } finally {
      setLoading(false)
    }
  }

  const inputStyle = {
    width: '100%', padding: '12px 14px', fontSize: '14px', fontFamily: FONT_BODY,
    background: 'var(--bg)', color: 'var(--text)',
    border: '1px solid var(--border)', borderRadius: '10px',
    outline: 'none', marginBottom: '16px', boxSizing: 'border-box',
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
        {!success ? (
          <>
            <div style={{
              width: '56px', height: '56px', borderRadius: '16px',
              background: purpleAlpha(0.1), display: 'flex', alignItems: 'center', justifyContent: 'center',
              margin: '0 auto 20px', fontSize: '24px',
            }}>
              🔒
            </div>

            <h2 style={{ fontFamily: FONT_DISPLAY, fontSize: '22px', fontWeight: 800, color: 'var(--text)', marginBottom: '8px' }}>
              Restablecer contrasena
            </h2>
            <p style={{ fontSize: '14px', color: 'var(--muted)', marginBottom: '28px', lineHeight: 1.6 }}>
              Ingresa tu nueva contrasena. Debe tener al menos 8 caracteres.
            </p>

            <form onSubmit={handleSubmit}>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="Nueva contrasena"
                required
                style={inputStyle}
              />
              <input
                type="password"
                value={confirm}
                onChange={e => setConfirm(e.target.value)}
                placeholder="Confirmar contrasena"
                required
                style={inputStyle}
              />

              {error && (
                <p style={{ fontSize: '13px', color: ERR, marginBottom: '12px', textAlign: 'left' }}>{error}</p>
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
                {loading ? 'Restableciendo...' : 'Restablecer contrasena'}
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
              background: `${OK}18`, display: 'flex', alignItems: 'center', justifyContent: 'center',
              margin: '0 auto 20px', fontSize: '24px',
            }}>
              ✓
            </div>

            <h2 style={{ fontFamily: FONT_DISPLAY, fontSize: '22px', fontWeight: 800, color: 'var(--text)', marginBottom: '8px' }}>
              Contrasena actualizada
            </h2>
            <p style={{ fontSize: '14px', color: 'var(--muted)', marginBottom: '28px', lineHeight: 1.6 }}>
              Tu contrasena ha sido restablecida exitosamente. Ya puedes iniciar sesion con tu nueva contrasena.
            </p>

            <Link to="/auth/login" style={{
              display: 'inline-block', background: PURPLE, color: '#fff',
              borderRadius: '10px', padding: '12px 32px', fontSize: '14px',
              fontWeight: 700, textDecoration: 'none', fontFamily: FONT_BODY,
            }}>
              Ir al login
            </Link>
          </>
        )}
      </div>
    </div>
  )
}
