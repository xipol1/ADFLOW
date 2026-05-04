import React, { useState, useEffect, useRef } from 'react'
import { motion, useInView, AnimatePresence } from 'framer-motion'
import { CreditCard, Shield, Send, MousePointerClick, CheckCircle2, Wallet } from 'lucide-react'
import { FONT_DISPLAY, FONT_BODY, MAX_W } from '../../theme/tokens'

const STEPS = [
  { id: 0, label: 'Anunciante paga',     icon: CreditCard,       color: '#3b82f6', detail: '500€ via Stripe' },
  { id: 1, label: 'Escrow protege',      icon: Shield,           color: '#7C3AED', detail: '500€ bloqueados' },
  { id: 2, label: 'Creator publica',     icon: Send,             color: '#f59e0b', detail: 'Post en canal' },
  { id: 3, label: 'Tracking verifica',   icon: MousePointerClick,color: '#06b6d4', detail: '127 clicks unicos' },
  { id: 4, label: 'Liberacion auto',     icon: CheckCircle2,     color: '#22c55e', detail: 'Verificado en 18h' },
  { id: 5, label: 'Creator cobra',       icon: Wallet,           color: '#10b981', detail: '500€ a tu cuenta' },
]

export default function EscrowFlowAnimation() {
  const ref = useRef(null)
  const inView = useInView(ref, { once: false, margin: '-30%' })
  const [active, setActive] = useState(0)

  useEffect(() => {
    if (!inView) return
    const t = setInterval(() => setActive(a => (a + 1) % STEPS.length), 2200)
    return () => clearInterval(t)
  }, [inView])

  return (
    <section
      ref={ref}
      style={{
        background: 'var(--bg)',
        padding: 'clamp(72px,10vw,140px) clamp(16px, 4vw, 24px)',
        overflow: 'hidden',
      }}
    >
      <div style={{ maxWidth: MAX_W, margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: 'clamp(36px, 6vw, 64px)' }}>
          <p style={{
            fontSize: 11, fontWeight: 600, textTransform: 'uppercase',
            letterSpacing: '0.12em', color: '#22c55e', marginBottom: 16,
          }}>Tu dinero, en cada paso</p>
          <h2 style={{
            fontFamily: FONT_DISPLAY, fontWeight: 700,
            fontSize: 'clamp(24px, 4vw, 44px)',
            lineHeight: 1.08, letterSpacing: '-0.03em',
            margin: '0 0 16px', color: 'var(--text)',
          }}>
            Asi protege tu pago el escrow
          </h2>
          <p style={{
            fontFamily: FONT_BODY, fontSize: 16, color: 'var(--muted)',
            maxWidth: 540, margin: '0 auto', lineHeight: 1.6,
          }}>
            Cada euro pasa por Stripe Connect. Solo se libera cuando el tracking link confirma la publicacion.
          </p>
        </div>

        {/* Flow visualization */}
        <div style={{ position: 'relative', padding: '40px 0' }}>
          {/* Track line */}
          <div className="escrow-track" style={{
            position: 'absolute', top: '50%', left: '6%', right: '6%',
            height: 3, background: 'rgba(15,23,42,0.08)', borderRadius: 2,
            transform: 'translateY(-50%)',
          }} />
          <motion.div
            className="escrow-track-fill"
            style={{
              position: 'absolute', top: '50%', left: '6%',
              height: 3, background: 'linear-gradient(90deg, #3b82f6, #7C3AED, #f59e0b, #22c55e, #10b981)',
              borderRadius: 2, transform: 'translateY(-50%)',
              width: `${((active + 1) / STEPS.length) * 88}%`,
              transition: 'width 0.8s cubic-bezier(.22,1,.36,1)',
              boxShadow: '0 0 12px rgba(124,58,237,0.4)',
            }}
          />

          {/* Animated coin moving across */}
          <motion.div
            animate={{
              left: `calc(6% + ${(active / (STEPS.length - 1)) * 88}%)`,
            }}
            transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
            className="escrow-coin"
            style={{
              position: 'absolute', top: '50%',
              transform: 'translate(-50%, -50%)',
              width: 36, height: 36, borderRadius: '50%',
              background: 'linear-gradient(135deg, #fbbf24, #f59e0b)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: '#fff', fontWeight: 700, fontSize: 16, fontFamily: FONT_DISPLAY,
              boxShadow: '0 4px 16px rgba(245,158,11,0.5), inset 0 1px 0 rgba(255,255,255,0.4)',
              zIndex: 3,
            }}
          >€</motion.div>

          {/* Steps */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: `repeat(${STEPS.length}, 1fr)`,
            position: 'relative', zIndex: 1,
          }}
          className="escrow-steps"
          >
            {STEPS.map((step, i) => {
              const isActive = i === active
              const isPast = i < active
              const Icon = step.icon
              return (
                <div key={step.id} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
                  <motion.div
                    animate={{
                      scale: isActive ? 1.15 : 1,
                      y: isActive ? -4 : 0,
                    }}
                    transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
                    style={{
                      width: 56, height: 56, borderRadius: 16,
                      background: (isActive || isPast) ? step.color : '#fff',
                      border: `2px solid ${(isActive || isPast) ? step.color : 'rgba(15,23,42,0.08)'}`,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      color: (isActive || isPast) ? '#fff' : step.color,
                      boxShadow: isActive
                        ? `0 12px 32px ${step.color}40, 0 0 0 4px ${step.color}20`
                        : '0 1px 2px rgba(15,23,42,0.04)',
                      transition: 'background 0.3s, border-color 0.3s, color 0.3s',
                      position: 'relative',
                    }}
                  >
                    <Icon size={22} strokeWidth={2} />
                    {isActive && (
                      <motion.span
                        animate={{ scale: [1, 1.4, 1], opacity: [1, 0, 1] }}
                        transition={{ duration: 1.6, repeat: Infinity }}
                        style={{
                          position: 'absolute', inset: -2,
                          borderRadius: 16,
                          border: `2px solid ${step.color}`,
                        }}
                      />
                    )}
                  </motion.div>

                  <div className="escrow-step-text" style={{ textAlign: 'center', minHeight: 50 }}>
                    <div style={{
                      fontFamily: FONT_DISPLAY, fontSize: 12, fontWeight: 700,
                      color: isActive ? step.color : 'var(--text)',
                      letterSpacing: '-0.01em',
                      transition: 'color 0.3s',
                    }}>
                      {step.label}
                    </div>
                    <AnimatePresence mode="wait">
                      {isActive && (
                        <motion.div
                          key={step.id}
                          initial={{ opacity: 0, y: 4 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -4 }}
                          style={{
                            fontSize: 11, color: 'var(--muted)',
                            marginTop: 2, fontWeight: 500,
                          }}
                        >
                          {step.detail}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Bottom note */}
        <div style={{
          textAlign: 'center', marginTop: 'clamp(32px, 5vw, 48px)',
          padding: '14px 20px',
          background: 'rgba(34,197,94,0.05)',
          border: '1px solid rgba(34,197,94,0.15)',
          borderRadius: 12,
          maxWidth: 560, margin: 'clamp(32px, 5vw, 48px) auto 0',
          fontSize: 14, color: 'var(--text)', fontWeight: 500,
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
        }}>
          <Shield size={16} style={{ color: '#22c55e' }} />
          Si la publicacion no se verifica en 48h, recuperas el 100% automaticamente
        </div>
      </div>

      <style>{`
        @media (max-width: 760px) {
          .escrow-steps { grid-template-columns: repeat(3, 1fr) !important; row-gap: 32px; }
          .escrow-track, .escrow-track-fill, .escrow-coin { display: none !important; }
        }
        /* Mobile: vertical timeline with connecting line on the left */
        @media (max-width: 480px) {
          .escrow-steps {
            grid-template-columns: 1fr !important;
            row-gap: 18px !important;
            padding-left: 28px;
            position: relative;
          }
          .escrow-steps::before {
            content: '';
            position: absolute;
            left: 27px; top: 8px; bottom: 8px;
            width: 2px;
            background: linear-gradient(to bottom, #3b82f6, #7C3AED, #f59e0b, #22c55e, #10b981);
            border-radius: 1px;
            opacity: 0.4;
          }
          .escrow-steps > div {
            flex-direction: row !important;
            align-items: center !important;
            gap: 16px !important;
            text-align: left !important;
            position: relative;
          }
          .escrow-steps > div > div:first-child {
            width: 44px !important; height: 44px !important;
            margin-left: -28px;
            flex-shrink: 0;
            border-width: 3px !important;
            box-shadow: 0 0 0 4px var(--bg, #fff) !important;
          }
          .escrow-steps > div > div:first-child svg {
            width: 18px !important; height: 18px !important;
          }
          .escrow-steps .escrow-step-text {
            min-height: auto !important;
            text-align: left !important;
          }
        }
      `}</style>
    </section>
  )
}
