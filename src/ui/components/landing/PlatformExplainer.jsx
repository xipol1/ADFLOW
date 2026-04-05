import React from 'react'
import { motion, useInView } from 'framer-motion'
import { useRef } from 'react'
import { TrendingUp, Users, Heart } from 'lucide-react'
import { FONT_DISPLAY, FONT_BODY, MAX_W, PURPLE, GREEN } from '../../theme/tokens'

const spring = [0.22, 1, 0.36, 1]
const slideLeft = { hidden: { opacity: 0, x: -60 }, visible: { opacity: 1, x: 0, transition: { duration: 0.8, ease: spring } } }
const slideRight = { hidden: { opacity: 0, x: 60 }, visible: { opacity: 1, x: 0, transition: { duration: 0.8, ease: spring } } }
const stagger = { hidden: {}, visible: { transition: { staggerChildren: 0.08, delayChildren: 0.2 } } }
const fadeUp = { hidden: { opacity: 0, y: 24 }, visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: spring } } }

const BULLETS = [
  { icon: Users,      text: 'Audiencias imposibles de alcanzar con ads tradicionales' },
  { icon: TrendingUp, text: 'Engagement 15-45% vs 0.5-2% en paid media' },
  { icon: Heart,      text: 'Confianza nativa: tu mensaje viene de un lider de comunidad' },
]

export default function PlatformExplainer() {
  const ref = useRef(null)
  const inView = useInView(ref, { once: true, margin: '-100px' })

  return (
    <section
      ref={ref}
      style={{
        background: 'var(--bg)',
        padding: 'clamp(72px,10vw,140px) clamp(16px, 4vw, 24px)',
      }}
    >
      <div className="explainer-grid" style={{
        maxWidth: MAX_W, margin: '0 auto',
        display: 'grid', gridTemplateColumns: '1.1fr 0.9fr', gap: 'clamp(32px, 6vw, 80px)',
        alignItems: 'center',
      }}>
        {/* Text side */}
        <motion.div
          initial="hidden"
          animate={inView ? 'visible' : 'hidden'}
          variants={slideLeft}
        >
          <p style={{
            fontSize: '11px', fontWeight: 600, textTransform: 'uppercase',
            letterSpacing: '0.12em', color: 'var(--accent)', marginBottom: '16px',
          }}>
            El marketplace que faltaba
          </p>

          <h2 style={{
            fontFamily: FONT_DISPLAY, fontWeight: 700,
            fontSize: 'clamp(28px, 3.5vw, 44px)',
            lineHeight: 1.08, letterSpacing: '-0.03em',
            margin: '0 0 24px', color: 'var(--text)',
          }}>
            Publicidad que la gente quiere ver
          </h2>

          <p style={{
            fontFamily: FONT_BODY, fontSize: '17px', lineHeight: 1.7,
            color: 'var(--muted)', margin: '0 0 36px', maxWidth: '480px',
          }}>
            Channelad es el marketplace que conecta anunciantes con propietarios de canales
            en WhatsApp, Telegram, Discord, Instagram, Facebook y Newsletter.
            Pagos protegidos con escrow via Stripe y metricas verificadas con tracking links.
          </p>

          <motion.div variants={stagger} initial="hidden" animate={inView ? 'visible' : 'hidden'}>
            {BULLETS.map((b, i) => (
              <motion.div
                key={i}
                variants={fadeUp}
                style={{
                  display: 'flex', alignItems: 'flex-start', gap: '14px',
                  marginBottom: '20px',
                }}
              >
                <div style={{
                  width: '40px', height: '40px', borderRadius: '10px',
                  background: 'var(--accent-surface, rgba(124,58,237,0.04))',
                  border: '1px solid var(--border)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  flexShrink: 0, color: 'var(--accent)',
                }}>
                  <b.icon size={18} strokeWidth={2} />
                </div>
                <span style={{
                  fontSize: '15px', lineHeight: 1.6, color: 'var(--text-secondary, var(--text))',
                  paddingTop: '8px',
                }}>
                  {b.text}
                </span>
              </motion.div>
            ))}
          </motion.div>
        </motion.div>

        {/* Visual diagram */}
        <motion.div
          initial="hidden"
          animate={inView ? 'visible' : 'hidden'}
          variants={slideRight}
          style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '24px' }}
        >
          {/* Advertiser card */}
          <motion.div
            whileHover={{ y: -4 }}
            style={{
              background: 'var(--surface)',
              border: '1px solid var(--border)',
              borderRadius: '20px',
              padding: '28px 32px',
              boxShadow: 'var(--shadow-sm)',
              width: '100%', maxWidth: '340px',
              borderTop: `3px solid ${PURPLE}`,
            }}
          >
            <div style={{
              width: '44px', height: '44px', borderRadius: '12px',
              background: `rgba(124,58,237,0.08)`, marginBottom: '16px',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '20px',
            }}>
              📣
            </div>
            <h3 style={{ fontFamily: FONT_DISPLAY, fontWeight: 600, fontSize: '18px', margin: '0 0 6px', color: 'var(--text)' }}>
              Anunciantes
            </h3>
            <p style={{ fontSize: '14px', color: 'var(--muted)', margin: 0, lineHeight: 1.5 }}>
              Marcas que buscan audiencias comprometidas en comunidades reales
            </p>
          </motion.div>

          {/* Connector */}
          <div style={{
            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px',
            color: 'var(--muted2)',
          }}>
            <div style={{ width: '2px', height: '20px', background: 'var(--border-med)' }} />
            <div style={{
              width: '44px', height: '44px', borderRadius: '50%',
              background: 'var(--surface)', border: '1px solid var(--border-med)',
              boxShadow: 'var(--shadow-md)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontFamily: FONT_DISPLAY, fontSize: '11px', fontWeight: 700,
              color: 'var(--accent)', letterSpacing: '-0.02em',
            }}>
              C·ad
            </div>
            <div style={{ width: '2px', height: '20px', background: 'var(--border-med)' }} />
          </div>

          {/* Creator card */}
          <motion.div
            whileHover={{ y: -4 }}
            style={{
              background: 'var(--surface)',
              border: '1px solid var(--border)',
              borderRadius: '20px',
              padding: '28px 32px',
              boxShadow: 'var(--shadow-sm)',
              width: '100%', maxWidth: '340px',
              borderTop: `3px solid ${GREEN}`,
            }}
          >
            <div style={{
              width: '44px', height: '44px', borderRadius: '12px',
              background: `rgba(37,211,102,0.08)`, marginBottom: '16px',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '20px',
            }}>
              💰
            </div>
            <h3 style={{ fontFamily: FONT_DISPLAY, fontWeight: 600, fontSize: '18px', margin: '0 0 6px', color: 'var(--text)' }}>
              Creadores de canales
            </h3>
            <p style={{ fontSize: '14px', color: 'var(--muted)', margin: 0, lineHeight: 1.5 }}>
              Propietarios de comunidades en WhatsApp, Telegram, Discord e Instagram
            </p>
          </motion.div>
        </motion.div>
      </div>

      {/* Responsive: stack on mobile */}
      <style>{`
        @media (max-width: 768px) {
          .explainer-grid { grid-template-columns: 1fr !important; gap: 36px !important; }
        }
      `}</style>
    </section>
  )
}
