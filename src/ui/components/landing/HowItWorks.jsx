import React, { useRef } from 'react'
import { motion, useInView } from 'framer-motion'
import { Search, MousePointerClick, Send, TrendingUp } from 'lucide-react'
import { FONT_DISPLAY, FONT_BODY, MAX_W } from '../../theme/tokens'

const spring = [0.22, 1, 0.36, 1]
const stagger = { hidden: {}, visible: { transition: { staggerChildren: 0.1, delayChildren: 0.1 } } }
const fadeUp = { hidden: { opacity: 0, y: 40 }, visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: spring } } }

const STEPS = [
  {
    num: '01',
    icon: Search,
    title: 'Explora el marketplace',
    desc: 'Filtra canales por nicho, plataforma, tamano de audiencia y precio. Todas las metricas son verificables.',
  },
  {
    num: '02',
    icon: MousePointerClick,
    title: 'Configura y paga seguro',
    desc: 'Define tu campana y paga via Stripe. Los fondos quedan protegidos en escrow hasta la verificacion.',
  },
  {
    num: '03',
    icon: Send,
    title: 'Publicacion verificada',
    desc: 'El creador publica tu mensaje. La verificacion es automatica mediante tracking links con clicks unicos.',
  },
  {
    num: '04',
    icon: TrendingUp,
    title: 'Fondos liberados',
    desc: 'Campana verificada, escrow liberado automaticamente. Metricas de clicks, CPC y alcance en tu dashboard.',
  },
]

export default function HowItWorks() {
  const ref = useRef(null)
  const inView = useInView(ref, { once: true, margin: '-100px' })

  return (
    <section
      ref={ref}
      id="como-funciona"
      style={{
        background: 'var(--bg2)',
        padding: 'clamp(72px,10vw,140px) clamp(16px, 4vw, 24px)',
      }}
    >
      <div style={{ maxWidth: MAX_W, margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: 'clamp(36px, 6vw, 64px)' }}>
          <p style={{
            fontSize: '11px', fontWeight: 600, textTransform: 'uppercase',
            letterSpacing: '0.12em', color: 'var(--accent)', marginBottom: '16px',
          }}>
            Simple por diseno
          </p>
          <h2 style={{
            fontFamily: FONT_DISPLAY, fontWeight: 700,
            fontSize: 'clamp(24px, 4vw, 44px)',
            lineHeight: 1.08, letterSpacing: '-0.03em',
            margin: 0, color: 'var(--text)',
          }}>
            De la idea al resultado en 4 pasos
          </h2>
        </div>

        <motion.div
          className="how-steps-grid"
          initial="hidden"
          animate={inView ? 'visible' : 'hidden'}
          variants={stagger}
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(4, 1fr)',
            gap: '20px',
            position: 'relative',
          }}
        >
          {/* Connector line (desktop only) */}
          <div className="how-connector" style={{
            position: 'absolute',
            top: '56px', left: '12.5%', right: '12.5%',
            height: '2px', background: 'var(--border-med)',
            zIndex: 0,
          }} />

          {STEPS.map((step, i) => (
            <motion.div
              key={i}
              variants={fadeUp}
              whileHover={{ y: -4 }}
              style={{
                position: 'relative', zIndex: 1,
                background: 'var(--surface)',
                border: '1px solid var(--border)',
                borderRadius: '20px',
                padding: 'clamp(20px, 3vw, 32px) clamp(16px, 2.5vw, 24px)',
                boxShadow: 'var(--shadow-sm)',
                textAlign: 'center',
                transition: 'transform 0.3s cubic-bezier(.22,1,.36,1), box-shadow 0.3s',
              }}
            >
              {/* Step number badge */}
              <div style={{
                position: 'absolute', top: '-12px', left: '50%', transform: 'translateX(-50%)',
                width: '28px', height: '28px', borderRadius: '8px',
                background: i === 0 ? 'var(--accent)' : 'var(--surface)',
                border: i === 0 ? 'none' : '1px solid var(--border-med)',
                boxShadow: 'var(--shadow-sm)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontFamily: "'Sora', sans-serif", fontSize: '10px', fontWeight: 700,
                color: i === 0 ? '#fff' : 'var(--muted)',
              }}>
                {step.num}
              </div>

              <div style={{
                width: '48px', height: '48px', borderRadius: '14px',
                background: 'var(--accent-surface, rgba(124,58,237,0.04))',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                margin: '12px auto 16px', color: 'var(--accent)',
              }}>
                <step.icon size={22} strokeWidth={1.8} />
              </div>

              <h3 style={{
                fontFamily: FONT_DISPLAY, fontWeight: 600,
                fontSize: 'clamp(14px, 2.5vw, 16px)', margin: '0 0 8px',
                color: 'var(--text)', letterSpacing: '-0.02em',
              }}>
                {step.title}
              </h3>
              <p style={{
                fontSize: '13px', color: 'var(--muted)',
                margin: 0, lineHeight: 1.6,
              }}>
                {step.desc}
              </p>
            </motion.div>
          ))}
        </motion.div>

        {/* CTA */}
        <div style={{ textAlign: 'center', marginTop: 'clamp(36px, 6vw, 56px)' }}>
          <motion.a
            href="/auth/register"
            className="cta-shift"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: '8px',
              color: '#fff',
              padding: '14px 28px', borderRadius: '12px',
              fontSize: '15px', fontWeight: 600,
              textDecoration: 'none',
            }}
          >
            Empieza ahora
          </motion.a>
        </div>
      </div>

      <style>{`
        @media (max-width: 900px) {
          .how-steps-grid { grid-template-columns: 1fr 1fr !important; }
          .how-connector { display: none !important; }
        }
        @media (max-width: 520px) {
          .how-steps-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </section>
  )
}
