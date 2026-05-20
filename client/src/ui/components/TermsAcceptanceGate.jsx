import React, { useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../../auth/AuthContext'
import apiService from '../../services/api'

/**
 * Blocking modal shown to authenticated users who never explicitly accepted
 * the T&C and Privacy Policy (e.g. accounts created before the consent
 * checkbox rollout, or via Google OAuth). Renders nothing when consent is
 * already on file.
 *
 * Mounted globally in App.jsx — must sit inside AuthProvider.
 */
export default function TermsAcceptanceGate() {
  const { user, isAuthenticated } = useAuth()
  const [accepted, setAccepted] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  if (!isAuthenticated || !user?.requiresTermsAcceptance) return null

  const onAccept = async () => {
    if (!accepted) return
    setSubmitting(true)
    setError('')
    try {
      const res = await apiService.acceptTerms('2026-05-05')
      if (!res?.success) {
        setError(res?.message || 'No se pudo registrar la aceptación')
        setSubmitting(false)
        return
      }
      // Persist updated user (now without requiresTermsAcceptance) so the
      // gate stops rendering. AuthContext rehydrates from localStorage on
      // the next mount; reload is the simplest way to refresh state across
      // every consumer.
      try {
        if (res.user) localStorage.setItem('user', JSON.stringify(res.user))
      } catch {}
      window.location.reload()
    } catch (e) {
      setError('Error de red. Intenta de nuevo.')
      setSubmitting(false)
    }
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Aceptación de términos"
      style={{
        position: 'fixed', inset: 0, zIndex: 10000,
        background: 'rgba(8, 12, 16, 0.85)',
        backdropFilter: 'blur(8px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '20px',
      }}
    >
      <div style={{
        maxWidth: '520px', width: '100%',
        background: 'var(--surface, #0f1216)',
        color: 'var(--text, #e8ebef)',
        border: '1px solid var(--border, rgba(255,255,255,0.08))',
        borderRadius: '16px',
        padding: '28px',
        boxShadow: '0 20px 60px rgba(0,0,0,0.5)',
        fontFamily: 'Inter, system-ui, sans-serif',
      }}>
        <h2 style={{ fontSize: '20px', fontWeight: 700, margin: '0 0 12px' }}>
          Actualización de Términos
        </h2>
        <p style={{ fontSize: '14px', lineHeight: 1.6, color: 'var(--muted, #aab1bb)', margin: '0 0 20px' }}>
          Hemos actualizado nuestros Términos de uso y Política de privacidad
          para cumplir con el RGPD. Para continuar usando Channelad necesitamos
          que los revises y los aceptes.
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', margin: '0 0 20px' }}>
          <Link to="/terminos" target="_blank" style={linkStyle}>
            → Leer Términos de uso
          </Link>
          <Link to="/privacidad" target="_blank" style={linkStyle}>
            → Leer Política de privacidad
          </Link>
        </div>

        <label style={{
          display: 'flex', alignItems: 'flex-start', gap: '10px',
          fontSize: '13px', cursor: 'pointer', userSelect: 'none',
          padding: '12px', borderRadius: '10px',
          background: 'var(--surface-2, rgba(255,255,255,0.03))',
          border: '1px solid var(--border, rgba(255,255,255,0.08))',
          margin: '0 0 16px',
        }}>
          <input
            type="checkbox"
            checked={accepted}
            onChange={e => setAccepted(e.target.checked)}
            style={{ marginTop: '2px', width: '16px', height: '16px', accentColor: '#7c3aed', flexShrink: 0 }}
          />
          <span>
            He leído y acepto los <Link to="/terminos" target="_blank" style={{ color: '#7c3aed' }}>Términos de uso</Link> y la{' '}
            <Link to="/privacidad" target="_blank" style={{ color: '#7c3aed' }}>Política de privacidad</Link>.
          </span>
        </label>

        {error && (
          <div style={{ fontSize: '13px', color: '#ef4444', margin: '0 0 12px' }}>
            {error}
          </div>
        )}

        <button
          onClick={onAccept}
          disabled={!accepted || submitting}
          style={{
            width: '100%',
            background: (!accepted || submitting) ? 'var(--muted2, #4b5563)' : '#7c3aed',
            color: '#fff', border: 'none', borderRadius: '10px',
            padding: '13px', fontSize: '14px', fontWeight: 600,
            cursor: (!accepted || submitting) ? 'not-allowed' : 'pointer',
            opacity: !accepted ? 0.6 : 1,
            transition: 'opacity .2s',
          }}
        >
          {submitting ? 'Guardando…' : 'Aceptar y continuar'}
        </button>

        <p style={{ fontSize: '11px', color: 'var(--muted2, #6b7280)', textAlign: 'center', margin: '14px 0 0' }}>
          Si no aceptas, puedes <button
            onClick={() => { localStorage.clear(); window.location.href = '/' }}
            style={{ background: 'none', border: 'none', color: 'var(--muted2)', textDecoration: 'underline', cursor: 'pointer', fontSize: '11px', padding: 0 }}
          >cerrar sesión</button>.
        </p>
      </div>
    </div>
  )
}

const linkStyle = {
  fontSize: '13px',
  color: '#7c3aed',
  textDecoration: 'none',
  padding: '4px 0',
}
