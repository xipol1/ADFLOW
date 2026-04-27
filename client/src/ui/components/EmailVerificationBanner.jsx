import React, { useState } from 'react'
import { useAuth } from '../../auth/AuthContext'
import { WARN, FONT_BODY, FONT_DISPLAY } from '../theme/tokens'
import apiService from '../../services/api'
import { Mail, RefreshCw, CheckCircle, AlertTriangle } from 'lucide-react'

/**
 * EmailVerificationBanner — Non-dismissible banner + overlay gate.
 * Blocks dashboard interaction until the user verifies their email.
 * Shows a prominent banner with resend functionality and a subtle
 * overlay that prevents clicks on the content beneath.
 */
export default function EmailVerificationBanner() {
  const { user } = useAuth()
  const [resending, setResending] = useState(false)
  const [resent, setResent] = useState(false)
  const [cooldown, setCooldown] = useState(0)

  if (!user || user.emailVerificado) return null

  const handleResend = async () => {
    if (resending || cooldown > 0) return
    setResending(true)
    try {
      await apiService.request('/auth/reenviar-verificacion', {
        method: 'POST',
        body: JSON.stringify({ email: user.email }),
      })
      setResent(true)
      // 60s cooldown to prevent spam
      setCooldown(60)
      const interval = setInterval(() => {
        setCooldown(prev => {
          if (prev <= 1) { clearInterval(interval); return 0 }
          return prev - 1
        })
      }, 1000)
    } catch {}
    setResending(false)
  }

  const handleRefresh = () => {
    window.location.reload()
  }

  return (
    <>
      {/* Semi-transparent overlay to prevent dashboard interaction */}
      <div style={{
        position: 'fixed', inset: 0,
        background: 'rgba(0,0,0,0.04)',
        zIndex: 90, pointerEvents: 'none',
      }} />

      {/* Banner — high z-index, always visible */}
      <div style={{
        position: 'relative', zIndex: 100,
        background: 'linear-gradient(135deg, rgba(245,158,11,0.1) 0%, rgba(245,158,11,0.05) 100%)',
        border: `1px solid rgba(245,158,11,0.25)`,
        borderRadius: '12px',
        padding: '20px 24px',
        marginBottom: '20px',
        fontFamily: FONT_BODY,
      }}>
        <div style={{
          display: 'flex', alignItems: 'flex-start', gap: '16px',
          flexWrap: 'wrap',
        }}>
          <div style={{
            background: 'rgba(245,158,11,0.15)',
            borderRadius: '10px', padding: '10px',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            flexShrink: 0,
          }}>
            <Mail size={24} style={{ color: WARN }} />
          </div>

          <div style={{ flex: 1, minWidth: '200px' }}>
            <h3 style={{
              margin: '0 0 4px', fontSize: '15px', fontWeight: 700,
              color: 'var(--fg, #111)', fontFamily: FONT_DISPLAY,
            }}>
              Verifica tu email para continuar
            </h3>
            <p style={{
              margin: 0, fontSize: '13px', color: 'var(--muted, #666)',
              lineHeight: 1.5,
            }}>
              Hemos enviado un enlace de verificacion a <strong>{user.email}</strong>.
              Revisa tu bandeja de entrada (y spam) para activar tu cuenta.
            </p>

            <div style={{
              display: 'flex', gap: '10px', marginTop: '14px',
              flexWrap: 'wrap', alignItems: 'center',
            }}>
              {resent && cooldown > 0 ? (
                <span style={{
                  display: 'flex', alignItems: 'center', gap: '6px',
                  color: '#10b981', fontWeight: 600, fontSize: '13px',
                }}>
                  <CheckCircle size={14} />
                  Email enviado — puedes reenviar en {cooldown}s
                </span>
              ) : (
                <button onClick={handleResend} disabled={resending || cooldown > 0} style={{
                  background: WARN, color: '#fff', border: 'none',
                  borderRadius: '8px', padding: '8px 16px',
                  fontSize: '13px', fontWeight: 600, cursor: 'pointer',
                  fontFamily: FONT_BODY, opacity: resending ? 0.6 : 1,
                  display: 'flex', alignItems: 'center', gap: '6px',
                  transition: 'opacity 0.2s',
                }}>
                  <RefreshCw size={14} style={{
                    animation: resending ? 'spin 1s linear infinite' : 'none',
                  }} />
                  {resending ? 'Enviando...' : 'Reenviar email de verificacion'}
                </button>
              )}

              <button onClick={handleRefresh} style={{
                background: 'transparent', border: '1px solid var(--border, #ddd)',
                borderRadius: '8px', padding: '8px 16px',
                fontSize: '13px', fontWeight: 500, cursor: 'pointer',
                color: 'var(--muted, #666)', fontFamily: FONT_BODY,
                display: 'flex', alignItems: 'center', gap: '6px',
              }}>
                <CheckCircle size={14} />
                Ya verifique, recargar
              </button>
            </div>
          </div>

          <div style={{
            display: 'flex', alignItems: 'center', gap: '6px',
            background: 'rgba(245,158,11,0.1)',
            borderRadius: '8px', padding: '6px 12px',
            flexShrink: 0,
          }}>
            <AlertTriangle size={14} style={{ color: WARN }} />
            <span style={{
              fontSize: '11px', fontWeight: 600, color: WARN,
              textTransform: 'uppercase', letterSpacing: '0.5px',
            }}>
              Acceso limitado
            </span>
          </div>
        </div>
      </div>

      <style>{`@keyframes spin { from { transform: rotate(0deg) } to { transform: rotate(360deg) } }`}</style>
    </>
  )
}
