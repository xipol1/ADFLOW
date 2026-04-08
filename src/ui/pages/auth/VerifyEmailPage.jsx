import React, { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useAuth } from '../../../auth/AuthContext'
import apiService from '../../../../services/api'
import { PURPLE as A, FONT_BODY as F, FONT_DISPLAY as D, OK } from '../../theme/tokens'

export default function VerifyEmailPage() {
  const { token } = useParams()
  const navigate = useNavigate()
  const { setAuthFromVerification } = useAuth()
  const [status, setStatus] = useState('verifying') // verifying | success | error
  const [message, setMessage] = useState('')

  useEffect(() => {
    if (!token) {
      setStatus('error')
      setMessage('Token de verificación no proporcionado.')
      return
    }

    apiService.verifyEmail(token).then(res => {
      if (res?.success) {
        setStatus('success')
        setMessage(res.message || 'Email verificado correctamente.')
        // Auto-login with fresh tokens if provided
        if (res.token && res.user && setAuthFromVerification) {
          setAuthFromVerification(res.token, res.refreshToken, res.user)
        }
      } else {
        setStatus('error')
        setMessage(res?.message || 'Token inválido o expirado.')
      }
    }).catch(() => {
      setStatus('error')
      setMessage('Error de conexión al verificar el email.')
    })
  }, [token])

  return (
    <div style={{
      fontFamily: F,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '60vh',
      padding: '40px 20px',
    }}>
      <div style={{
        background: 'var(--surface, #fff)',
        border: '1px solid var(--border, #e5e7eb)',
        borderRadius: '20px',
        padding: '48px 40px',
        maxWidth: '420px',
        width: '100%',
        textAlign: 'center',
        boxShadow: '0 8px 32px rgba(0,0,0,0.08)',
      }}>
        {status === 'verifying' && (
          <>
            <div style={{ fontSize: '40px', marginBottom: '16px' }}>⏳</div>
            <h2 style={{ fontFamily: D, fontSize: '22px', fontWeight: 800, color: 'var(--text, #111)', marginBottom: '8px' }}>
              Verificando email...
            </h2>
            <p style={{ fontSize: '14px', color: 'var(--muted, #666)' }}>Un momento por favor.</p>
          </>
        )}

        {status === 'success' && (
          <>
            <div style={{
              width: '64px', height: '64px', borderRadius: '50%',
              background: `${OK}15`, display: 'flex', alignItems: 'center', justifyContent: 'center',
              margin: '0 auto 20px', fontSize: '28px',
            }}>
              ✓
            </div>
            <h2 style={{ fontFamily: D, fontSize: '22px', fontWeight: 800, color: 'var(--text, #111)', marginBottom: '8px' }}>
              Email verificado
            </h2>
            <p style={{ fontSize: '14px', color: 'var(--muted, #666)', marginBottom: '24px', lineHeight: 1.6 }}>
              {message}
            </p>
            <button
              onClick={() => navigate('/dashboard')}
              style={{
                background: A, color: '#fff', border: 'none', borderRadius: '12px',
                padding: '12px 32px', fontSize: '14px', fontWeight: 700,
                cursor: 'pointer', fontFamily: F,
              }}
            >
              Ir al dashboard
            </button>
          </>
        )}

        {status === 'error' && (
          <>
            <div style={{ fontSize: '40px', marginBottom: '16px' }}>⚠️</div>
            <h2 style={{ fontFamily: D, fontSize: '22px', fontWeight: 800, color: 'var(--text, #111)', marginBottom: '8px' }}>
              Error de verificación
            </h2>
            <p style={{ fontSize: '14px', color: 'var(--muted, #666)', marginBottom: '24px', lineHeight: 1.6 }}>
              {message}
            </p>
            <button
              onClick={() => navigate('/auth/login')}
              style={{
                background: 'var(--bg, #f3f4f6)', color: 'var(--text, #111)',
                border: '1px solid var(--border, #e5e7eb)', borderRadius: '12px',
                padding: '12px 32px', fontSize: '14px', fontWeight: 600,
                cursor: 'pointer', fontFamily: F,
              }}
            >
              Volver al login
            </button>
          </>
        )}
      </div>
    </div>
  )
}
