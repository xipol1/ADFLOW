import React, { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { Mail, ShieldCheck } from 'lucide-react'
import SEO from '../../components/SEO'
import apiService from '../../../services/api'
import { PURPLE, purpleAlpha, FONT_BODY } from '../../theme/tokens'

const F = FONT_BODY

function formatDate(dt) {
  if (!dt) return null
  try {
    return new Date(dt).toLocaleDateString('es-ES', { day: '2-digit', month: 'long', year: 'numeric' })
  } catch {
    return null
  }
}

/**
 * Preferencias de comunicación.
 *
 * Cumple dos cosas a la vez: da la vía de retirada del consentimiento "tan
 * fácil como fue darlo" (art. 7.3 RGPD) y es el único sitio donde una cuenta
 * ya existente puede DAR el consentimiento comercial sin que tengamos que
 * mandarle un email pidiéndoselo — porque ese email pidiendo consentimiento
 * sería en sí mismo una comunicación comercial y necesitaría el consentimiento
 * que aún no tenemos.
 *
 * El bloque de emails operativos no es un interruptor a propósito: van por
 * ejecución de contrato (art. 6.1.b) y no se pueden desactivar sin cerrar la
 * cuenta.
 */
export default function CommunicationsPage() {
  const [prefs, setPrefs] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [feedback, setFeedback] = useState(null)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const res = await apiService.getCommunicationPreferences()
        if (!cancelled) setPrefs(res?.preferencias || null)
      } catch (e) {
        if (!cancelled) setError(e?.message || 'No se pudieron cargar tus preferencias')
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => { cancelled = true }
  }, [])

  const toggle = async (next) => {
    setSaving(true); setFeedback(null)
    // Optimista: el interruptor responde al instante y se revierte si falla.
    const previo = prefs
    setPrefs((p) => ({ ...p, marketingOptIn: next }))
    try {
      const res = await apiService.updateCommunicationPreferences(next)
      if (!res?.success) throw new Error(res?.message || 'No se pudo guardar')
      setPrefs((p) => ({ ...p, ...res.preferencias }))
      setFeedback({
        kind: 'success',
        msg: next
          ? 'Hecho. Te escribiremos solo cuando haya algo que merezca la pena.'
          : 'Hecho. No recibirás más emails con novedades ni promociones.',
      })
    } catch (e) {
      setPrefs(previo)
      setFeedback({ kind: 'error', msg: e?.message || 'No se pudo guardar el cambio' })
    } finally {
      setSaving(false)
    }
  }

  const optIn = prefs?.marketingOptIn === true
  const desde = formatDate(prefs?.marketingOptInAt)

  return (
    <main
      data-testid="communications-page"
      style={{
        fontFamily: F,
        color: 'var(--text)',
        background: 'var(--bg)',
        minHeight: '100vh',
        padding: '32px 16px 80px',
      }}
    >
      <SEO
        title="Preferencias de comunicación"
        description="Decide qué emails quieres recibir de Channelad."
        path="/account/comunicaciones"
        type="website"
        noindex
      />

      <div style={{ maxWidth: 760, margin: '0 auto' }}>
        <h1 style={{ fontSize: 28, fontWeight: 800, letterSpacing: '-0.02em', margin: '0 0 8px' }}>
          Preferencias de comunicación
        </h1>
        <p style={{ margin: '0 0 24px', fontSize: 15, color: 'var(--text-muted)', lineHeight: 1.6 }}>
          Tú decides qué te llega. Puedes cambiarlo cuando quieras, sin dar explicaciones.
        </p>

        {loading && (
          <p style={{ fontSize: 14, color: 'var(--text-muted)' }}>Cargando tus preferencias…</p>
        )}

        {error && (
          <div role="alert" style={{ padding: 14, borderRadius: 12, background: 'rgba(220,38,38,0.06)', color: '#dc2626', fontSize: 14 }}>
            {error}
          </div>
        )}

        {!loading && !error && (
          <>
            <motion.section
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.25 }}
              style={{
                padding: 24,
                borderRadius: 18,
                background: 'var(--surface)',
                border: `1px solid ${optIn ? purpleAlpha(0.25) : 'var(--border)'}`,
                marginBottom: 20,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14 }}>
                <Mail size={20} style={{ color: PURPLE, flexShrink: 0, marginTop: 2 }} aria-hidden="true" />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <h2 style={{ margin: '0 0 6px', fontSize: 18, fontWeight: 700 }}>
                    Novedades de producto
                  </h2>
                  <p style={{ margin: '0 0 16px', fontSize: 14, color: 'var(--text-muted)', lineHeight: 1.6 }}>
                    {prefs?.texto || 'Emails con novedades de producto, funcionalidades nuevas y consejos para monetizar tu canal.'}
                  </p>

                  <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: saving ? 'wait' : 'pointer', fontSize: 14 }}>
                    <input
                      type="checkbox"
                      checked={optIn}
                      disabled={saving}
                      onChange={(e) => toggle(e.target.checked)}
                      style={{ width: 17, height: 17, accentColor: PURPLE, flexShrink: 0 }}
                    />
                    <span style={{ fontWeight: 600 }}>
                      {optIn ? 'Suscrito' : 'No suscrito'}
                    </span>
                  </label>

                  {optIn && desde && (
                    <p style={{ margin: '10px 0 0', fontSize: 12, color: 'var(--text-muted)' }}>
                      Consentimiento registrado el {desde}.
                    </p>
                  )}

                  {feedback && (
                    <p
                      role="status"
                      style={{
                        margin: '12px 0 0',
                        fontSize: 13,
                        color: feedback.kind === 'error' ? '#dc2626' : '#16a34a',
                      }}
                    >
                      {feedback.msg}
                    </p>
                  )}
                </div>
              </div>
            </motion.section>

            <section
              style={{
                padding: 24,
                borderRadius: 18,
                background: 'var(--surface)',
                border: '1px solid var(--border)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14 }}>
                <ShieldCheck size={20} style={{ color: 'var(--text-muted)', flexShrink: 0, marginTop: 2 }} aria-hidden="true" />
                <div>
                  <h2 style={{ margin: '0 0 6px', fontSize: 18, fontWeight: 700 }}>
                    Emails del servicio
                  </h2>
                  <p style={{ margin: 0, fontSize: 14, color: 'var(--text-muted)', lineHeight: 1.6 }}>
                    Verificación de cuenta, recuperación de contraseña, propuestas de campaña,
                    publicaciones, pagos y disputas. Forman parte del funcionamiento de tu cuenta,
                    así que se envían siempre mientras la tengas abierta. No llevan publicidad.
                  </p>
                </div>
              </div>
            </section>
          </>
        )}
      </div>
    </main>
  )
}
