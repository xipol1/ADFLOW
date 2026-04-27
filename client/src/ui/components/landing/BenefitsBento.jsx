import React from 'react'
import { motion, useInView } from 'framer-motion'
import { useRef } from 'react'
import { Target, ShieldCheck, BarChart3, Zap, Wallet, Lock, DollarSign, Unlock } from 'lucide-react'
import { FONT_DISPLAY, FONT_BODY, MAX_W, PURPLE, GREEN } from '../../theme/tokens'

const spring = [0.22, 1, 0.36, 1]
const stagger = { hidden: {}, visible: { transition: { staggerChildren: 0.06, delayChildren: 0.1 } } }
const slideLeft = { hidden: { opacity: 0, x: -40 }, visible: { opacity: 1, x: 0, transition: { duration: 0.7, ease: spring } } }
const slideRight = { hidden: { opacity: 0, x: 40 }, visible: { opacity: 1, x: 0, transition: { duration: 0.7, ease: spring } } }
const scaleUp = { hidden: { opacity: 0, scale: 0.92 }, visible: { opacity: 1, scale: 1, transition: { duration: 0.5, ease: spring } } }

const ADVERTISER_FEATURES = [
  { icon: Target, title: 'Canales verificados por nicho', desc: 'Filtra por plataforma, tamano de audiencia, categoria y precio. Todos los canales pasan verificacion con tracking links.', span: true },
  { icon: ShieldCheck, title: 'Escrow via Stripe', desc: 'Tu pago queda protegido en escrow. Si no se publica, recuperas el 100%.' },
  { icon: BarChart3, title: 'Metricas auditables', desc: 'Clicks unicos, CPC, alcance — verificados con tracking links en tiempo real.' },
  { icon: Zap, title: 'Sin permanencia', desc: 'Paga solo por campana completada. Sin suscripciones, sin minimos.' },
]

const CREATOR_FEATURES = [
  { icon: DollarSign, title: 'Cobra el 100% de tu tarifa', desc: 'Tu pones el precio por publicacion. La comision del 20% la paga el anunciante, no tu.', span: true },
  { icon: Wallet, title: 'Cobro automatico', desc: 'Publicas, se verifica con tracking links, los fondos del escrow se liberan a tu cuenta.' },
  { icon: Unlock, title: 'Sin exclusividad', desc: 'Publica en las plataformas que quieras. Sin permanencia ni bloqueos.' },
  { icon: Lock, title: 'Verificacion rapida', desc: 'Verificamos tu canal con un tracking link automatico. 3 clicks unicos en 48h.' },
]

function FeatureCard({ icon: Icon, title, desc, span, accentColor }) {
  return (
    <motion.div
      variants={scaleUp}
      whileHover={{ y: -4, boxShadow: 'var(--shadow-card-hover)' }}
      className={span ? 'feature-card-span' : 'feature-card'}
      style={{
        background: 'var(--surface)',
        border: '1px solid var(--border)',
        borderRadius: '20px',
        padding: span ? 'clamp(20px, 4vw, 32px)' : 'clamp(18px, 3vw, 28px)',
        gridColumn: span ? '1 / -1' : undefined,
        transition: 'transform 0.3s cubic-bezier(.22,1,.36,1), box-shadow 0.3s cubic-bezier(.22,1,.36,1)',
      }}
    >
      <div style={{
        width: '44px', height: '44px', borderRadius: '12px',
        background: `${accentColor}11`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        color: accentColor, marginBottom: '16px',
      }}>
        <Icon size={20} strokeWidth={2} />
      </div>
      <h4 style={{
        fontFamily: FONT_DISPLAY, fontWeight: 600, fontSize: span ? 'clamp(16px, 3vw, 20px)' : 'clamp(14px, 2.5vw, 16px)',
        margin: '0 0 8px', color: 'var(--text)', letterSpacing: '-0.02em',
      }}>
        {title}
      </h4>
      <p style={{
        fontSize: '14px', color: 'var(--muted)', margin: 0, lineHeight: 1.6,
      }}>
        {desc}
      </p>
    </motion.div>
  )
}

function SuperCard({ title, cta, ctaHref, features, accentColor, variants }) {
  return (
    <motion.div
      variants={variants}
      style={{
        background: 'var(--surface)',
        border: '1px solid var(--border)',
        borderRadius: '24px',
        padding: 'clamp(20px, 4vw, 36px)',
        boxShadow: 'var(--shadow-sm)',
        borderTop: `3px solid ${accentColor}`,
      }}
    >
      <h3 style={{
        fontFamily: FONT_DISPLAY, fontWeight: 700,
        fontSize: 'clamp(18px, 3vw, 22px)', letterSpacing: '-0.02em',
        margin: '0 0 24px', color: 'var(--text)',
      }}>
        {title}
      </h3>

      <motion.div variants={stagger} initial="hidden" whileInView="visible" viewport={{ once: true }}>
        <div className="bento-feature-grid" style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: '12px',
        }}>
          {features.map((f, i) => (
            <FeatureCard key={i} {...f} accentColor={accentColor} />
          ))}
        </div>
      </motion.div>

      <motion.a
        href={ctaHref}
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        style={{
          display: 'inline-flex', alignItems: 'center', gap: '8px',
          marginTop: '24px', padding: '12px 24px', borderRadius: '12px',
          background: `${accentColor}12`,
          color: accentColor, fontWeight: 600, fontSize: '14px',
          textDecoration: 'none',
          border: `1px solid ${accentColor}22`,
          transition: 'background 0.2s',
        }}
      >
        {cta}
      </motion.a>
    </motion.div>
  )
}

export default function BenefitsBento() {
  const ref = useRef(null)
  const inView = useInView(ref, { once: true, margin: '-100px' })

  return (
    <section
      ref={ref}
      style={{
        background: 'var(--bg2)',
        padding: 'clamp(72px,10vw,140px) clamp(16px, 4vw, 24px)',
      }}
    >
      <div style={{ maxWidth: MAX_W, margin: '0 auto' }}>
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: 'clamp(36px, 6vw, 64px)' }}>
          <p style={{
            fontSize: '11px', fontWeight: 600, textTransform: 'uppercase',
            letterSpacing: '0.12em', color: 'var(--accent)', marginBottom: '16px',
          }}>
            Valor para todos
          </p>
          <h2 style={{
            fontFamily: FONT_DISPLAY, fontWeight: 700,
            fontSize: 'clamp(24px, 4vw, 44px)',
            lineHeight: 1.08, letterSpacing: '-0.03em',
            margin: 0, color: 'var(--text)',
          }}>
            Dos lados, un mismo marketplace
          </h2>
        </div>

        {/* Bento grid */}
        <motion.div
          className="bento-main-grid"
          initial="hidden"
          animate={inView ? 'visible' : 'hidden'}
          style={{
            display: 'grid', gridTemplateColumns: '1fr 1fr',
            gap: 'clamp(16px, 3vw, 28px)',
          }}
        >
          <SuperCard
            title="Quiero anunciarme"
            cta="Explorar canales"
            ctaHref="/marketplace"
            features={ADVERTISER_FEATURES}
            accentColor={PURPLE}
            variants={slideLeft}
          />
          <SuperCard
            title="Quiero monetizar mi canal"
            cta="Registrar mi canal"
            ctaHref="/onboarding/register"
            features={CREATOR_FEATURES}
            accentColor={GREEN}
            variants={slideRight}
          />
        </motion.div>
      </div>

      <style>{`
        @media (max-width: 900px) {
          .bento-main-grid { grid-template-columns: 1fr !important; }
        }
        @media (max-width: 640px) {
          .bento-feature-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </section>
  )
}
