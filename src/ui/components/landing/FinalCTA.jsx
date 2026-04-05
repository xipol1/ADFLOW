import React from 'react'
import { motion } from 'framer-motion'
import { ArrowRight } from 'lucide-react'
import { FONT_DISPLAY, FONT_BODY, MAX_W, GRADIENT_BTN } from '../../theme/tokens'

const spring = [0.22, 1, 0.36, 1]
const revealUp = {
  hidden: { opacity: 0, y: 40, filter: 'blur(6px)' },
  visible: (d = 0) => ({ opacity: 1, y: 0, filter: 'blur(0px)', transition: { duration: 0.7, ease: spring, delay: d } }),
}

export default function FinalCTA() {
  return (
    <section style={{
      position: 'relative',
      overflow: 'hidden',
      padding: 'clamp(80px,10vw,140px) clamp(16px, 4vw, 24px)',
    }}>
      {/* Aurora bg */}
      <div className="aurora-bg" />

      <motion.div
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: '-80px' }}
        style={{
          maxWidth: '640px', margin: '0 auto',
          textAlign: 'center', position: 'relative', zIndex: 2,
        }}
      >
        <motion.h2
          variants={revealUp}
          custom={0}
          style={{
            fontFamily: FONT_DISPLAY, fontWeight: 700,
            fontSize: 'clamp(28px, 4vw, 48px)',
            lineHeight: 1.08, letterSpacing: '-0.03em',
            margin: '0 0 20px', color: 'var(--text)',
          }}
        >
          Empieza hoy.{' '}
          <span className="gradient-text">Los resultados llegan manana.</span>
        </motion.h2>

        <motion.p
          variants={revealUp}
          custom={0.15}
          style={{
            fontFamily: FONT_BODY, fontSize: '18px', lineHeight: 1.7,
            color: 'var(--muted)', margin: '0 0 40px',
          }}
        >
          Tu siguiente campana esta a un click. Unete a las 340+ marcas
          que ya conectan con su audiencia ideal.
        </motion.p>

        <motion.div variants={revealUp} custom={0.3}>
          <motion.a
            href="/auth/register"
            className="cta-shift"
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: '10px',
              color: '#fff',
              padding: '18px 40px', borderRadius: '16px',
              fontSize: '18px', fontWeight: 700,
              textDecoration: 'none',
            }}
          >
            Crear cuenta gratis
            <ArrowRight size={20} strokeWidth={2.5} />
          </motion.a>
        </motion.div>

        {/* Friction reducers */}
        <motion.div
          variants={revealUp}
          custom={0.4}
          style={{
            display: 'flex', justifyContent: 'center',
            gap: '6px', flexWrap: 'wrap', marginTop: '20px',
            fontSize: '13px', color: 'var(--muted)',
          }}
        >
          {['Sin tarjeta de credito', '2 minutos de configuracion', 'Cancela cuando quieras'].map((t, i) => (
            <React.Fragment key={i}>
              {i > 0 && <span style={{ margin: '0 4px', color: 'var(--border-heavy)' }}>·</span>}
              <span>{t}</span>
            </React.Fragment>
          ))}
        </motion.div>

        <motion.div
          variants={revealUp}
          custom={0.5}
          style={{ marginTop: '24px' }}
        >
          <a
            href="/marketplace"
            style={{
              color: 'var(--muted)', fontSize: '14px', fontWeight: 500,
              textDecoration: 'none', borderBottom: '1px solid var(--border-med)',
              paddingBottom: '2px', transition: 'color 0.2s',
            }}
            onMouseEnter={e => e.currentTarget.style.color = 'var(--text)'}
            onMouseLeave={e => e.currentTarget.style.color = 'var(--muted)'}
          >
            O explora el marketplace primero
          </a>
        </motion.div>
      </motion.div>
    </section>
  )
}
