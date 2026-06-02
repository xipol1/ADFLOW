import React, { useRef } from 'react'
import { motion, useInView } from 'framer-motion'
import { FONT_BODY, FONT_DISPLAY } from '../../theme/tokens'
import InterestCounter from './InterestCounter'

const GREEN = '#25d366'
const greenAlpha = (o) => `rgba(37,211,102,${o})`

// Context-tuned copy. The component is dropped on creator-bound landings
// (/para-canales, /whatsapp) right above <CrossLinks> so the last impression
// before the footer is a live founding-cohort scarcity hook.
const COPY = {
  creator: {
    eyebrow: 'Pre-registro · cohorte septiembre',
    title: 'Asegura tu plaza antes que el marketplace público.',
    body: 'Los primeros 150 canales en español entran al founding cohort: 18% de comisión vitalicia —la más baja de la plataforma—, onboarding personal y activación antes que el marketplace abierto. Tú siempre cobras el 100%.',
  },
  whatsapp: {
    eyebrow: 'Pre-registro · cohorte septiembre',
    title: 'Reserva tu plaza WhatsApp antes del lanzamiento.',
    body: 'Solo 10 plazas por nicho en el founding cohort. Cuando se llene tu vertical, no hay forma de entrar. 18% de comisión vitalicio, la más baja de la plataforma, y activación prioritaria.',
  },
}

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] } },
}

export default function FounderWaitlistPromoBlock({ context = 'creator' }) {
  const ref = useRef(null)
  const inView = useInView(ref, { once: true, margin: '-60px' })
  const copy = COPY[context] || COPY.creator

  return (
    <section
      ref={ref}
      style={{
        padding: '72px clamp(16px,4vw,32px)',
        background: 'transparent',
        borderTop: '1px solid var(--border)',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      <div
        aria-hidden
        style={{
          position: 'absolute', inset: 0,
          background: `radial-gradient(ellipse 50% 60% at 70% 50%, ${greenAlpha(0.08)} 0%, transparent 60%)`,
          pointerEvents: 'none',
        }}
      />
      <motion.div
        initial="hidden"
        animate={inView ? 'visible' : 'hidden'}
        variants={fadeUp}
        className="co-promo-grid"
        style={{
          maxWidth: 980, margin: '0 auto',
          display: 'grid', gridTemplateColumns: '1.05fr 1fr', gap: 36, alignItems: 'center',
          position: 'relative',
        }}
      >
        <div>
          <p style={{
            fontFamily: FONT_BODY, fontSize: 11, fontWeight: 700, color: GREEN,
            textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: 10, margin: '0 0 10px',
          }}>
            {copy.eyebrow}
          </p>
          <h2 style={{
            fontFamily: FONT_DISPLAY, fontSize: 'clamp(22px, 2.6vw, 30px)', fontWeight: 700,
            letterSpacing: '-0.025em', lineHeight: 1.18, margin: '0 0 14px', color: 'var(--text)',
          }}>
            {copy.title}
          </h2>
          <p style={{
            fontFamily: FONT_BODY, fontSize: 15, color: 'var(--muted)',
            lineHeight: 1.65, margin: 0, maxWidth: 520,
          }}>
            {copy.body}
          </p>
        </div>
        <div>
          <InterestCounter variant="card" ctaLabel="Reservar mi plaza" />
        </div>
      </motion.div>
      <style>{`
        @media (max-width: 780px) {
          .co-promo-grid {
            grid-template-columns: 1fr !important;
            gap: 24px !important;
          }
        }
      `}</style>
    </section>
  )
}
