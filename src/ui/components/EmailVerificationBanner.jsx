import React, { useState } from 'react'
import { useAuth } from '../../auth/AuthContext'
import { WARN, FONT_BODY } from '../theme/tokens'
import apiService from '../../../services/api'

export default function EmailVerificationBanner() {
  const { user } = useAuth()
  const [dismissed, setDismissed] = useState(false)
  const [resending, setResending] = useState(false)
  const [resent, setResent] = useState(false)

  if (!user || user.emailVerificado || dismissed) return null

  const handleResend = async () => {
    setResending(true)
    try {
      await apiService.request('/auth/reenviar-verificacion', {
        method: 'POST',
        body: JSON.stringify({ email: user.email }),
      })
      setResent(true)
    } catch {}
    setResending(false)
  }

  return (
    <div style={{
      background: 'rgba(245,158,11,0.08)',
      borderBottom: `1px solid rgba(245,158,11,0.2)`,
      padding: '10px 20px',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      gap: '12px', flexWrap: 'wrap',
      fontFamily: FONT_BODY, fontSize: '13px',
    }}>
      <span style={{ color: WARN, fontWeight: 600 }}>
        Verifica tu email para desbloquear todas las funciones
      </span>
      {resent ? (
        <span style={{ color: '#10b981', fontWeight: 500 }}>Email enviado</span>
      ) : (
        <button onClick={handleResend} disabled={resending} style={{
          background: WARN, color: '#fff', border: 'none',
          borderRadius: '6px', padding: '4px 12px',
          fontSize: '12px', fontWeight: 600, cursor: 'pointer',
          fontFamily: FONT_BODY, opacity: resending ? 0.6 : 1,
        }}>
          {resending ? 'Enviando...' : 'Reenviar email'}
        </button>
      )}
      <button onClick={() => setDismissed(true)} style={{
        background: 'none', border: 'none', cursor: 'pointer',
        color: 'var(--muted)', fontSize: '16px', padding: '0 4px',
        lineHeight: 1,
      }}>x</button>
    </div>
  )
}
