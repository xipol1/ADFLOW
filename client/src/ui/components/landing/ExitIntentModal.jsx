import React, { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Gift, ArrowRight, Sparkles } from 'lucide-react'
import { FONT_DISPLAY, FONT_BODY } from '../../theme/tokens'

const STORAGE_KEY = 'channelad_exit_intent_shown'

export default function ExitIntentModal() {
  const [open, setOpen] = useState(false)
  const [email, setEmail] = useState('')
  const [submitted, setSubmitted] = useState(false)

  useEffect(() => {
    if (typeof window === 'undefined') return
    if (sessionStorage.getItem(STORAGE_KEY)) return

    let timer
    const onLeave = (e) => {
      if (e.clientY <= 0 && !sessionStorage.getItem(STORAGE_KEY)) {
        setOpen(true)
        sessionStorage.setItem(STORAGE_KEY, '1')
      }
    }
    timer = setTimeout(() => {
      document.addEventListener('mouseleave', onLeave)
    }, 5000)
    return () => {
      clearTimeout(timer)
      document.removeEventListener('mouseleave', onLeave)
    }
  }, [])

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!email) return
    setSubmitted(true)
    setTimeout(() => {
      window.location.href = `/auth/register?email=${encodeURIComponent(email)}&promo=EARLY5`
    }, 1000)
  }

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={() => setOpen(false)}
          style={{
            position: 'fixed', inset: 0, zIndex: 200,
            background: 'rgba(15,23,42,0.55)',
            backdropFilter: 'blur(8px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: 20,
          }}
        >
          <motion.div
            initial={{ scale: 0.92, y: 20, opacity: 0 }}
            animate={{ scale: 1, y: 0, opacity: 1 }}
            exit={{ scale: 0.92, y: 20, opacity: 0 }}
            transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
            onClick={e => e.stopPropagation()}
            style={{
              background: '#fff',
              borderRadius: 20,
              maxWidth: 460, width: '100%',
              padding: '32px 28px',
              boxShadow: '0 40px 80px rgba(15,23,42,0.25), 0 0 0 1px rgba(124,58,237,0.1)',
              position: 'relative',
              overflow: 'hidden',
            }}
          >
            <div style={{
              position: 'absolute', top: -60, right: -60,
              width: 200, height: 200, borderRadius: '50%',
              background: 'radial-gradient(circle, rgba(124,58,237,0.12) 0%, transparent 70%)',
              pointerEvents: 'none',
            }} />

            <button
              onClick={() => setOpen(false)}
              aria-label="Cerrar"
              style={{
                position: 'absolute', top: 14, right: 14,
                width: 32, height: 32, borderRadius: 8,
                background: 'rgba(15,23,42,0.04)', border: 'none',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                cursor: 'pointer', color: 'var(--muted)',
              }}
            >
              <X size={16} />
            </button>

            {!submitted ? (
              <>
                <div style={{
                  width: 56, height: 56, borderRadius: 14,
                  background: 'linear-gradient(135deg, #7C3AED, #A855F7)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  marginBottom: 20, color: '#fff',
                  boxShadow: '0 8px 20px rgba(124,58,237,0.3)',
                }}>
                  <Gift size={26} />
                </div>

                <div style={{
                  display: 'inline-flex', alignItems: 'center', gap: 6,
                  background: 'rgba(124,58,237,0.08)',
                  color: '#7C3AED', fontSize: 11, fontWeight: 700,
                  textTransform: 'uppercase', letterSpacing: 0.6,
                  padding: '4px 10px', borderRadius: 6, marginBottom: 12,
                }}>
                  <Sparkles size={11} /> Solo por hoy
                </div>

                <h3 style={{
                  fontFamily: FONT_DISPLAY, fontSize: 26, fontWeight: 700,
                  letterSpacing: '-0.03em', margin: '0 0 10px', color: 'var(--text)',
                  lineHeight: 1.15,
                }}>
                  Espera — <span style={{ color: '#7C3AED' }}>+5% en creditos</span> de bienvenida
                </h3>

                <p style={{
                  fontFamily: FONT_BODY, fontSize: 15, lineHeight: 1.6,
                  color: 'var(--muted)', margin: '0 0 22px',
                }}>
                  Registrate hoy y te damos un 5% extra de creditos para tu primera campana.
                  Sin tarjeta, sin permanencia.
                </p>

                <form onSubmit={handleSubmit}>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder="tu@email.com"
                    autoFocus
                    style={{
                      width: '100%', padding: '13px 16px',
                      border: '1px solid rgba(15,23,42,0.12)',
                      borderRadius: 12, fontSize: 15,
                      fontFamily: FONT_BODY,
                      marginBottom: 12, outline: 'none',
                      transition: 'border-color 0.2s',
                      boxSizing: 'border-box',
                    }}
                    onFocus={e => e.target.style.borderColor = '#7C3AED'}
                    onBlur={e => e.target.style.borderColor = 'rgba(15,23,42,0.12)'}
                  />
                  <motion.button
                    type="submit"
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    style={{
                      width: '100%', padding: '13px 16px',
                      background: 'linear-gradient(135deg, #7C3AED, #A855F7)',
                      color: '#fff', border: 'none',
                      borderRadius: 12, fontSize: 15, fontWeight: 600,
                      fontFamily: FONT_BODY, cursor: 'pointer',
                      display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                      boxShadow: '0 4px 16px rgba(124,58,237,0.3)',
                    }}
                  >
                    Reservar mi 5% extra
                    <ArrowRight size={16} strokeWidth={2.5} />
                  </motion.button>
                </form>

                <p style={{
                  fontSize: 12, color: 'var(--muted)', textAlign: 'center',
                  marginTop: 16, marginBottom: 0,
                }}>
                  Codigo <strong style={{ color: 'var(--text)' }}>EARLY5</strong> · Sin spam · Cancela cuando quieras
                </p>
              </>
            ) : (
              <div style={{ textAlign: 'center', padding: '20px 0' }}>
                <motion.div
                  initial={{ scale: 0 }} animate={{ scale: 1 }}
                  transition={{ type: 'spring', stiffness: 200 }}
                  style={{
                    width: 64, height: 64, borderRadius: '50%',
                    background: 'rgba(34,197,94,0.12)', color: '#22c55e',
                    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 32, marginBottom: 16,
                  }}
                >✓</motion.div>
                <h3 style={{ fontFamily: FONT_DISPLAY, fontSize: 22, fontWeight: 700, margin: '0 0 8px' }}>
                  Tu 5% esta reservado
                </h3>
                <p style={{ color: 'var(--muted)', margin: 0 }}>Te llevamos al registro...</p>
              </div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
