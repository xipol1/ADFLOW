import React, { useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../../auth/AuthContext'
import apiService from '../../services/api'
import { useLegalManifest, requiredDocsForRole } from '../../services/legal'

/**
 * Blocking modal shown to authenticated users who never explicitly accepted
 * the T&C and Privacy Policy (e.g. accounts created before the consent
 * checkbox rollout, or via Google OAuth). Renders nothing when consent is
 * already on file.
 *
 * Mounted globally in App.jsx — must sit inside AuthProvider.
 */
export default function TermsAcceptanceGate() {
  const { user, isAuthenticated, rol } = useAuth()
  const manifest = useLegalManifest()
  const [accepted, setAccepted] = useState({})
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  if (!isAuthenticated || !user?.requiresTermsAcceptance) return null

  // Documents required for this user's role, and whether every box is ticked.
  const docs = requiredDocsForRole(manifest, rol)
  const allAccepted = docs.length > 0 && docs.every((d) => accepted[d.slug])

  const onAccept = async () => {
    if (!allAccepted) return
    setSubmitting(true)
    setError('')
    try {
      const consents = docs.map((d) => ({ slug: d.slug, version: d.version }))
      const res = await apiService.acceptTerms(consents)
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

        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', margin: '0 0 16px' }}>
          {!manifest && (
            <p style={{ fontSize: '13px', color: 'var(--muted, #aab1bb)' }}>Cargando documentos…</p>
          )}
          {docs.map((doc) => (
            <label key={doc.slug} style={{
              display: 'flex', alignItems: 'flex-start', gap: '10px',
              fontSize: '13px', cursor: 'pointer', userSelect: 'none',
              padding: '12px', borderRadius: '10px',
              background: 'var(--surface-2, rgba(255,255,255,0.03))',
              border: '1px solid var(--border, rgba(255,255,255,0.08))',
            }}>
              <input
                type="checkbox"
                checked={!!accepted[doc.slug]}
                onChange={e => setAccepted(prev => ({ ...prev, [doc.slug]: e.target.checked }))}
                style={{ marginTop: '2px', width: '16px', height: '16px', accentColor: '#7c3aed', flexShrink: 0 }}
              />
              <span>
                He leído y acepto{' '}
                <Link to={`/legal/${doc.slug}`} target="_blank" style={{ color: '#7c3aed' }}>{doc.etiqueta || doc.titulo}</Link>.
              </span>
            </label>
          ))}
        </div>

        {error && (
          <div style={{ fontSize: '13px', color: '#ef4444', margin: '0 0 12px' }}>
            {error}
          </div>
        )}

        <button
          onClick={onAccept}
          disabled={!allAccepted || submitting}
          style={{
            width: '100%',
            background: (!allAccepted || submitting) ? 'var(--muted2, #4b5563)' : '#7c3aed',
            color: '#fff', border: 'none', borderRadius: '10px',
            padding: '13px', fontSize: '14px', fontWeight: 600,
            cursor: (!allAccepted || submitting) ? 'not-allowed' : 'pointer',
            opacity: !allAccepted ? 0.6 : 1,
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
