import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ArrowRight, ArrowLeft, X, Sparkles } from 'lucide-react'
import { FONT_DISPLAY, FONT_BODY } from '../../theme/tokens'

const STORAGE_KEY = 'channelad_dashboard_tour_done'

// Selectors target sidebar nav items via href (stable, no DashboardLayout changes needed)
const STEPS = [
  {
    selector: 'aside a[href$="/advertiser"], a[href$="/advertiser/"]',
    title: 'Tu panel de control',
    body: 'Aqui ves de un vistazo todas tus campanas activas, gasto y rendimiento del dia.',
    placement: 'right',
  },
  {
    selector: 'a[href$="/advertiser/explore"]',
    title: 'Explora el marketplace',
    body: 'Filtra entre 2,847 canales por nicho, plataforma y precio. Cada canal esta verificado.',
    placement: 'right',
  },
  {
    selector: 'a[href$="/advertiser/campaigns"]',
    title: 'Lanza tu primera campana',
    body: 'Wizard guiado en 4 pasos: canal, copy, presupuesto y pago seguro con escrow.',
    placement: 'right',
  },
  {
    selector: 'a[href$="/advertiser/analyze/realtime"]',
    title: 'Mide en tiempo real',
    body: 'Clicks unicos, CPC, alcance y ROAS verificados con tracking links.',
    placement: 'right',
  },
  {
    selector: 'a[href$="/advertiser/finances"]',
    title: 'Tu dinero, protegido',
    body: 'Cada euro pasa por escrow Stripe. Si la publicacion no se verifica, recuperas el 100%.',
    placement: 'right',
  },
]

function getRect(selector) {
  if (typeof document === 'undefined') return null
  const el = document.querySelector(selector)
  if (!el) return null
  return el.getBoundingClientRect()
}

export default function DashboardTour({ force = false }) {
  const [active, setActive] = useState(false)
  const [step, setStep] = useState(0)
  const [rect, setRect] = useState(null)

  useEffect(() => {
    if (typeof window === 'undefined') return
    // Only fire on advertiser overview page to avoid interrupting users mid-task
    const path = window.location.pathname.replace(/\/$/, '')
    const onOverview = path === '/advertiser'
    if (force || (!localStorage.getItem(STORAGE_KEY) && onOverview)) {
      const t = setTimeout(() => setActive(true), 800)
      return () => clearTimeout(t)
    }
  }, [force])

  useEffect(() => {
    if (!active) return
    const update = () => setRect(getRect(STEPS[step].selector))
    update()
    window.addEventListener('resize', update)
    window.addEventListener('scroll', update, true)
    return () => {
      window.removeEventListener('resize', update)
      window.removeEventListener('scroll', update, true)
    }
  }, [active, step])

  const finish = () => {
    setActive(false)
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(STORAGE_KEY, '1')
    }
  }

  if (!active) return null

  const current = STEPS[step]
  const isLast = step === STEPS.length - 1

  // Tooltip position
  let tooltipStyle = {
    position: 'fixed', zIndex: 10001,
    width: 320, maxWidth: 'calc(100vw - 32px)',
  }
  if (rect) {
    if (current.placement === 'right') {
      tooltipStyle.left = Math.min(rect.right + 12, window.innerWidth - 340)
      tooltipStyle.top = Math.max(rect.top, 16)
    } else {
      tooltipStyle.left = Math.max(16, Math.min(rect.left, window.innerWidth - 340))
      tooltipStyle.top = rect.bottom + 12
    }
  } else {
    tooltipStyle.left = '50%'
    tooltipStyle.top = '50%'
    tooltipStyle.transform = 'translate(-50%, -50%)'
  }

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        style={{
          position: 'fixed', inset: 0, zIndex: 10000, pointerEvents: 'none',
        }}
      >
        {/* Spotlight overlay using SVG mask */}
        {rect && (
          <svg
            width="100%" height="100%"
            style={{ position: 'absolute', inset: 0, pointerEvents: 'auto' }}
            onClick={finish}
          >
            <defs>
              <mask id="tour-mask">
                <rect width="100%" height="100%" fill="white" />
                <rect
                  x={rect.left - 6}
                  y={rect.top - 6}
                  width={rect.width + 12}
                  height={rect.height + 12}
                  rx={12}
                  fill="black"
                />
              </mask>
            </defs>
            <rect
              width="100%" height="100%"
              fill="rgba(15,23,42,0.65)"
              mask="url(#tour-mask)"
            />
            <motion.rect
              x={rect.left - 6}
              y={rect.top - 6}
              width={rect.width + 12}
              height={rect.height + 12}
              rx={12}
              fill="none"
              stroke="#7C3AED"
              strokeWidth={2}
              animate={{ opacity: [1, 0.4, 1] }}
              transition={{ duration: 2, repeat: Infinity }}
            />
          </svg>
        )}

        <motion.div
          key={step}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.25 }}
          style={{
            ...tooltipStyle,
            background: '#fff',
            borderRadius: 14,
            padding: 20,
            boxShadow: '0 20px 50px rgba(15,23,42,0.2), 0 0 0 1px rgba(15,23,42,0.06)',
            pointerEvents: 'auto',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
            <div style={{
              display: 'inline-flex', alignItems: 'center', gap: 6,
              fontSize: 11, fontWeight: 700, color: '#7C3AED',
              background: 'rgba(124,58,237,0.08)',
              padding: '3px 10px', borderRadius: 6,
              textTransform: 'uppercase', letterSpacing: 0.6,
            }}>
              <Sparkles size={11} /> Paso {step + 1} de {STEPS.length}
            </div>
            <button
              onClick={finish}
              aria-label="Cerrar tour"
              style={{
                background: 'transparent', border: 'none',
                cursor: 'pointer', color: 'var(--muted)',
                padding: 4, display: 'flex',
              }}
            ><X size={16} /></button>
          </div>

          <h3 style={{
            fontFamily: FONT_DISPLAY, fontSize: 18, fontWeight: 700,
            margin: '0 0 8px', letterSpacing: '-0.02em', color: 'var(--text)',
          }}>{current.title}</h3>
          <p style={{
            fontFamily: FONT_BODY, fontSize: 14, lineHeight: 1.5,
            color: 'var(--muted)', margin: '0 0 18px',
          }}>{current.body}</p>

          {/* Progress dots */}
          <div style={{ display: 'flex', gap: 4, marginBottom: 16 }}>
            {STEPS.map((_, i) => (
              <div key={i} style={{
                flex: 1, height: 3, borderRadius: 2,
                background: i <= step ? '#7C3AED' : 'rgba(15,23,42,0.08)',
                transition: 'background 0.3s',
              }} />
            ))}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
            <button
              onClick={() => step > 0 && setStep(step - 1)}
              disabled={step === 0}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 4,
                background: 'transparent', border: 'none',
                color: step === 0 ? 'rgba(15,23,42,0.3)' : 'var(--muted)',
                fontSize: 13, fontWeight: 500,
                cursor: step === 0 ? 'not-allowed' : 'pointer',
                padding: '8px 4px',
              }}
            >
              <ArrowLeft size={14} /> Anterior
            </button>
            <motion.button
              onClick={() => isLast ? finish() : setStep(step + 1)}
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 6,
                background: 'linear-gradient(135deg, #7C3AED, #A855F7)',
                color: '#fff', border: 'none',
                padding: '9px 16px', borderRadius: 10,
                fontSize: 13, fontWeight: 600, cursor: 'pointer',
                boxShadow: '0 4px 12px rgba(124,58,237,0.25)',
              }}
            >
              {isLast ? 'Empezar' : 'Siguiente'}
              <ArrowRight size={14} strokeWidth={2.5} />
            </motion.button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}
