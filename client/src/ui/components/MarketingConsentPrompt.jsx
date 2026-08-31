import React, { useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../../auth/AuthContext'
import apiService from '../../services/api'

/**
 * Diálogo único de consentimiento comercial.
 *
 * Se lo ven una sola vez las cuentas que se registraron antes de que existiera
 * la casilla de marketing en el alta: nunca dijeron ni sí ni no, así que sin
 * preguntarles no se les puede escribir nada promocional (art. 6.1.a RGPD,
 * art. 21 LSSI).
 *
 * EXIGE UNA DECISIÓN, NO UNA ACEPTACIÓN. Los dos botones tienen el mismo peso
 * visual y "No, gracias" cierra igual de rápido que el otro. Es deliberado: el
 * art. 7.4 RGPD exige que el consentimiento sea libre, y no lo sería si la
 * única salida fuese aceptar — un sí arrancado así no vale y, encima, deja
 * constancia escrita de la coacción. Por eso tampoco bloquea el acceso a la
 * plataforma: se puede aplazar (hasta MAX_APLAZAMIENTOS en el backend) y
 * seguir usando la cuenta con normalidad.
 *
 * Montado en App.jsx junto a TermsAcceptanceGate. Cede el paso a ese: los
 * documentos legales son obligatorios y van primero; esto es opcional.
 */
export default function MarketingConsentPrompt() {
  const { user, isAuthenticated, updateUser } = useAuth()
  const [enviando, setEnviando] = useState(null) // 'si' | 'no' | 'luego' | null
  const [error, setError] = useState('')

  if (!isAuthenticated) return null
  // El gate legal es bloqueante y prioritario — no apilamos dos modales.
  if (user?.requiresTermsAcceptance) return null
  if (!user?.marketingPromptPending) return null

  const responder = async (respuesta) => {
    setEnviando(respuesta)
    setError('')
    try {
      const res = await apiService.answerMarketingPrompt(respuesta)
      if (!res?.success) {
        setError(res?.message || 'No se pudo guardar tu respuesta')
        setEnviando(null)
        return
      }
      // El backend recalcula si hay que seguir preguntando. Aplazar deja
      // `marketingPromptPending` en true, pero el diálogo no reaparece en esta
      // sesión porque el propio usuario ya no está pendiente hasta recargar.
      updateUser({
        marketingPromptPending: respuesta === 'luego' ? false : res.marketingPromptPending,
        marketingOptIn: res.optIn === true,
      })
    } catch {
      setError('Error de red. Intenta de nuevo.')
      setEnviando(null)
    }
  }

  const ocupado = enviando !== null

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="marketing-prompt-title"
      style={{
        position: 'fixed', inset: 0, zIndex: 9999,
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
        <h2 id="marketing-prompt-title" style={{ fontSize: '20px', fontWeight: 700, margin: '0 0 12px' }}>
          ¿Te avisamos de las novedades?
        </h2>
        <p style={{ fontSize: '14px', lineHeight: 1.6, color: 'var(--muted, #aab1bb)', margin: '0 0 16px' }}>
          Cuando creaste tu cuenta no te preguntamos si querías recibir emails con
          novedades de producto, funcionalidades nuevas y consejos para monetizar
          tu canal. Te lo preguntamos ahora, una sola vez.
        </p>

        <div style={{
          fontSize: '13px', lineHeight: 1.6,
          color: 'var(--muted, #aab1bb)',
          background: 'var(--surface-2, rgba(255,255,255,0.03))',
          border: '1px solid var(--border, rgba(255,255,255,0.08))',
          borderRadius: '10px', padding: '14px', margin: '0 0 20px',
        }}>
          Digas lo que digas, tu cuenta funciona igual. Los avisos del servicio
          (campañas, pagos, verificación) te seguirán llegando porque forman
          parte de la plataforma. Puedes cambiar de idea cuando quieras desde{' '}
          <Link to="/account/comunicaciones" style={{ color: '#7c3aed' }}>tus preferencias</Link>.
        </div>

        {error && (
          <div role="alert" style={{ fontSize: '13px', color: '#ef4444', margin: '0 0 12px' }}>
            {error}
          </div>
        )}

        {/* Dos botones del mismo tamaño: la opción de rechazar tiene que ser
            tan fácil de encontrar y de pulsar como la de aceptar. */}
        <div style={{ display: 'flex', gap: '10px' }}>
          <button
            onClick={() => responder('no')}
            disabled={ocupado}
            style={{
              flex: 1,
              background: 'transparent',
              color: 'var(--text, #e8ebef)',
              border: '1px solid var(--border, rgba(255,255,255,0.18))',
              borderRadius: '10px',
              padding: '13px', fontSize: '14px', fontWeight: 600,
              cursor: ocupado ? 'wait' : 'pointer',
              fontFamily: 'inherit',
            }}
          >
            {enviando === 'no' ? 'Guardando…' : 'No, gracias'}
          </button>
          <button
            onClick={() => responder('si')}
            disabled={ocupado}
            style={{
              flex: 1,
              background: '#7c3aed',
              color: '#fff', border: '1px solid #7c3aed',
              borderRadius: '10px',
              padding: '13px', fontSize: '14px', fontWeight: 600,
              cursor: ocupado ? 'wait' : 'pointer',
              fontFamily: 'inherit',
            }}
          >
            {enviando === 'si' ? 'Guardando…' : 'Sí, quiero recibirlas'}
          </button>
        </div>

        <p style={{ fontSize: '11px', color: 'var(--muted2, #6b7280)', textAlign: 'center', margin: '14px 0 0' }}>
          <button
            onClick={() => responder('luego')}
            disabled={ocupado}
            style={{
              background: 'none', border: 'none', color: 'var(--muted2, #6b7280)',
              textDecoration: 'underline', cursor: ocupado ? 'wait' : 'pointer',
              fontSize: '11px', padding: 0, fontFamily: 'inherit',
            }}
          >
            Ahora no
          </button>
        </p>
      </div>
    </div>
  )
}
