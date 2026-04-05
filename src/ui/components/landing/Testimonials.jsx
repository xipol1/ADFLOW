import React, { useRef } from 'react'
import { motion, useInView } from 'framer-motion'
import { Star } from 'lucide-react'
import { FONT_DISPLAY, FONT_BODY, MAX_W } from '../../theme/tokens'

const spring = [0.22, 1, 0.36, 1]
const stagger = { hidden: {}, visible: { transition: { staggerChildren: 0.1 } } }
const scaleIn = { hidden: { opacity: 0, scale: 0.92 }, visible: { opacity: 1, scale: 1, transition: { duration: 0.6, ease: spring } } }
const fadeUp = { hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: spring } } }

const TESTIMONIALS = [
  {
    quote: 'Pasamos de 3.20€ CPC en Meta a 0.12€ en canales de Telegram. Los numeros hablan solos.',
    name: 'Ana Ruiz',
    role: 'Fundadora, EcomMaster',
    metric: '96% menos CPC',
    initials: 'AR',
    color: '#7C3AED',
  },
  {
    quote: 'Un post en un canal de WhatsApp nos genero 340 leads en 48 horas. Ninguna campana de paid nos habia dado eso.',
    name: 'Carlos Lopez',
    role: 'Growth Lead, FitApp',
    metric: '340 leads / 48h',
    initials: 'CL',
    color: '#3B82F6',
  },
  {
    quote: 'Auto-Buy nos ahorra 15 horas semanales. Definimos criterios y Channelad lo gestiona todo.',
    name: 'Maria Garcia',
    role: 'CMO, TechStart',
    metric: '15h/semana ahorradas',
    initials: 'MG',
    color: '#10B981',
  },
]

const AGGREGATES = [
  { value: '2.4M€+', label: 'Pagados a creadores' },
  { value: '12K+', label: 'Comunidades activas' },
  { value: '15+', label: 'Paises' },
]

export default function Testimonials() {
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
      <div style={{ maxWidth: MAX_W, margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: '64px' }}>
          <p style={{
            fontSize: '11px', fontWeight: 600, textTransform: 'uppercase',
            letterSpacing: '0.12em', color: 'var(--accent)', marginBottom: '16px',
          }}>
            Historias reales
          </p>
          <h2 style={{
            fontFamily: FONT_DISPLAY, fontWeight: 700,
            fontSize: 'clamp(28px, 3.5vw, 44px)',
            lineHeight: 1.08, letterSpacing: '-0.03em',
            margin: 0, color: 'var(--text)',
          }}>
            Lo que dicen quienes ya lo usan
          </h2>
        </div>

        {/* Testimonial cards */}
        <motion.div
          initial="hidden"
          animate={inView ? 'visible' : 'hidden'}
          variants={stagger}
          className="testimonials-grid"
          style={{
            display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)',
            gap: '20px', marginBottom: '48px',
          }}
        >
          {TESTIMONIALS.map((t, i) => (
            <motion.div
              key={i}
              variants={scaleIn}
              whileHover={{ y: -4, boxShadow: 'var(--shadow-card-hover)' }}
              style={{
                background: 'var(--surface)',
                border: '1px solid var(--border)',
                borderRadius: '20px',
                padding: 'clamp(20px, 4vw, 32px)',
                boxShadow: 'var(--shadow-sm)',
                display: 'flex', flexDirection: 'column',
                transition: 'transform 0.3s cubic-bezier(.22,1,.36,1), box-shadow 0.3s',
              }}
            >
              {/* Stars */}
              <div style={{ display: 'flex', gap: '2px', marginBottom: '20px' }}>
                {[...Array(5)].map((_, s) => (
                  <Star key={s} size={16} fill="#F59E0B" color="#F59E0B" />
                ))}
              </div>

              {/* Quote */}
              <p style={{
                fontSize: '15px', lineHeight: 1.7, color: 'var(--text)',
                fontStyle: 'italic', margin: '0 0 24px', flex: 1,
              }}>
                "{t.quote}"
              </p>

              {/* Metric badge */}
              <div style={{
                display: 'inline-flex', alignSelf: 'flex-start',
                padding: '6px 14px', borderRadius: '8px',
                background: 'var(--accent-surface, rgba(124,58,237,0.04))',
                border: '1px solid var(--border)',
                fontSize: '13px', fontWeight: 700, color: 'var(--accent)',
                marginBottom: '20px', fontFamily: "'Sora', sans-serif",
              }}>
                {t.metric}
              </div>

              {/* Divider */}
              <div style={{ height: '1px', background: 'var(--border)', marginBottom: '20px' }} />

              {/* Author */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{
                  width: '40px', height: '40px', borderRadius: '50%',
                  background: t.color, display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '14px', fontWeight: 700, color: '#fff',
                }}>
                  {t.initials}
                </div>
                <div>
                  <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text)' }}>{t.name}</div>
                  <div style={{ fontSize: '13px', color: 'var(--muted)' }}>{t.role}</div>
                </div>
              </div>
            </motion.div>
          ))}
        </motion.div>

        {/* Aggregate metrics */}
        <motion.div
          initial="hidden"
          animate={inView ? 'visible' : 'hidden'}
          variants={stagger}
          style={{
            display: 'flex', justifyContent: 'center', gap: '56px', flexWrap: 'wrap',
          }}
        >
          {AGGREGATES.map((a, i) => (
            <motion.div key={i} variants={fadeUp} style={{ textAlign: 'center' }}>
              <div style={{
                fontFamily: "'Sora', sans-serif", fontSize: '28px', fontWeight: 700,
                color: 'var(--text)', letterSpacing: '-0.03em',
              }}>
                {a.value}
              </div>
              <div style={{ fontSize: '13px', color: 'var(--muted)', marginTop: '4px' }}>
                {a.label}
              </div>
            </motion.div>
          ))}
        </motion.div>

        {/* CTA */}
        <div style={{ textAlign: 'center', marginTop: '48px' }}>
          <motion.a
            href="/auth/register"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: '6px',
              color: 'var(--accent)', fontWeight: 600, fontSize: '15px',
              textDecoration: 'none',
            }}
          >
            Unete a ellos →
          </motion.a>
        </div>
      </div>

      <style>{`
        @media (max-width: 900px) {
          .testimonials-grid { grid-template-columns: 1fr !important; max-width: 480px; margin-left: auto !important; margin-right: auto !important; }
        }
      `}</style>
    </section>
  )
}
