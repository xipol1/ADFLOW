import React, { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'

const STORAGE_KEY = 'channelad-cookie-consent'

function readConsent() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

function writeConsent(consent) {
  const payload = { ...consent, ts: Date.now(), v: 1 }
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(payload)) } catch {}

  if (typeof window.gtag === 'function') {
    window.gtag('consent', 'update', {
      ad_storage:           consent.marketing ? 'granted' : 'denied',
      analytics_storage:    consent.analytics ? 'granted' : 'denied',
      ad_user_data:         consent.marketing ? 'granted' : 'denied',
      ad_personalization:   consent.marketing ? 'granted' : 'denied',
    })
  }
  if (consent.analytics && typeof window.__channeladLoadAhrefs === 'function') {
    window.__channeladLoadAhrefs()
  }
}

export default function CookieBanner() {
  const [show, setShow] = useState(false)
  const [details, setDetails] = useState(false)
  const [analytics, setAnalytics] = useState(true)
  const [marketing, setMarketing] = useState(false)

  useEffect(() => {
    if (!readConsent()) setShow(true)
    const onOpen = () => { setDetails(true); setShow(true) }
    window.addEventListener('channelad:open-cookie-settings', onOpen)
    return () => window.removeEventListener('channelad:open-cookie-settings', onOpen)
  }, [])

  if (!show) return null

  const acceptAll = () => {
    writeConsent({ necessary: true, analytics: true, marketing: true })
    setShow(false)
  }
  const rejectAll = () => {
    writeConsent({ necessary: true, analytics: false, marketing: false })
    setShow(false)
  }
  const savePrefs = () => {
    writeConsent({ necessary: true, analytics, marketing })
    setShow(false)
  }

  return (
    <div
      role="dialog"
      aria-live="polite"
      aria-label="Aviso de cookies"
      style={{
        position: 'fixed',
        left: '16px', right: '16px', bottom: '16px',
        zIndex: 9999,
        maxWidth: '640px',
        margin: '0 auto',
        background: 'var(--surface, #0f1216)',
        color: 'var(--text, #e8ebef)',
        border: '1px solid var(--border, rgba(255,255,255,0.08))',
        borderRadius: '14px',
        boxShadow: '0 12px 40px rgba(0,0,0,0.35)',
        padding: '18px 20px',
        fontFamily: 'Inter, system-ui, sans-serif',
        fontSize: '14px',
        lineHeight: 1.5,
      }}
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        <div>
          <strong style={{ display: 'block', fontSize: '15px', marginBottom: '6px' }}>
            Usamos cookies
          </strong>
          <span style={{ color: 'var(--muted, #aab1bb)' }}>
            Channelad y proveedores de confianza usamos cookies propias y de terceros
            para fines técnicos (necesarios para el funcionamiento), analíticos
            (medir uso y rendimiento) y, opcionalmente, de marketing. Puedes
            aceptar todas, rechazarlas o configurarlas en cualquier momento.
            Tienes derecho a acceder, rectificar, suprimir, oponerte y portar
            tus datos según se detalla en la{' '}
            <Link to="/privacidad" style={{ color: '#7c3aed' }}>Política de privacidad</Link>.
          </span>
        </div>

        {details && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', padding: '10px 0', borderTop: '1px solid var(--border, rgba(255,255,255,0.08))' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '10px', opacity: 0.7 }}>
              <input type="checkbox" checked readOnly />
              <span><strong>Necesarias</strong> — requeridas para el funcionamiento del sitio.</span>
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' }}>
              <input type="checkbox" checked={analytics} onChange={e => setAnalytics(e.target.checked)} />
              <span><strong>Analíticas</strong> — nos ayudan a entender el uso del sitio (Google Analytics, Ahrefs).</span>
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' }}>
              <input type="checkbox" checked={marketing} onChange={e => setMarketing(e.target.checked)} />
              <span><strong>Marketing</strong> — personalización de anuncios y remarketing.</span>
            </label>
          </div>
        )}

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', justifyContent: 'flex-end' }}>
          {!details && (
            <button onClick={() => setDetails(true)} style={btnGhost}>
              Configurar
            </button>
          )}
          <button onClick={rejectAll} style={btnSecondary}>
            Rechazar
          </button>
          {details ? (
            <button onClick={savePrefs} style={btnPrimary}>
              Guardar preferencias
            </button>
          ) : (
            <button onClick={acceptAll} style={btnPrimary}>
              Aceptar todas
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

const btnPrimary = {
  background: '#7c3aed', color: '#fff', border: 'none',
  padding: '10px 16px', borderRadius: '10px',
  fontWeight: 600, fontSize: '13px', cursor: 'pointer',
}
const btnSecondary = {
  background: 'transparent', color: 'var(--text, #e8ebef)',
  border: '1px solid var(--border, rgba(255,255,255,0.18))',
  padding: '10px 16px', borderRadius: '10px',
  fontWeight: 600, fontSize: '13px', cursor: 'pointer',
}
const btnGhost = {
  background: 'transparent', color: 'var(--muted, #aab1bb)',
  border: 'none',
  padding: '10px 12px', borderRadius: '10px',
  fontWeight: 500, fontSize: '13px', cursor: 'pointer',
}
