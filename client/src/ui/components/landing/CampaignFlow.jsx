import React, { useRef, useState } from 'react'
import { motion, useInView } from 'framer-motion'
import {
  Search, CreditCard, Send, BarChart3, ArrowRight, CheckCircle2,
  Shield, Zap, Eye, Clock,
} from 'lucide-react'
import { FONT_DISPLAY, FONT_BODY, MAX_W, PURPLE } from '../../theme/tokens'
import { DiscoverIcon, PayIcon, PublishIcon, ResultsIcon } from './AnimatedFlowIcons'

const spring = [0.22, 1, 0.36, 1]
const stagger = { hidden: {}, visible: { transition: { staggerChildren: 0.15, delayChildren: 0.2 } } }

const STEPS = [
  {
    num: '01',
    AnimIcon: DiscoverIcon,
    title: 'Descubre',
    desc: 'Explora el marketplace. Filtra por plataforma, nicho, audiencia y precio. Todas las metricas son verificables con tracking links.',
    color: '#3b82f6',
    details: ['2,847 canales verificados', 'WhatsApp, Telegram, Discord', 'Filtros por nicho y audiencia'],
    time: '2 min',
  },
  {
    num: '02',
    AnimIcon: PayIcon,
    title: 'Paga seguro',
    desc: 'Define tu campana y paga via Stripe. Tus fondos quedan protegidos en escrow hasta que la publicacion se verifica.',
    color: '#8b5cf6',
    details: ['Escrow via Stripe Connect', 'Reembolso automatico si no publica', 'Sin minimos, sin permanencia'],
    time: '1 min',
  },
  {
    num: '03',
    AnimIcon: PublishIcon,
    title: 'Se publica',
    desc: 'El creador publica tu mensaje en su comunidad. La verificacion es automatica mediante tracking links con clicks unicos.',
    color: '#10b981',
    details: ['Publicacion verificada con tracking', 'Notificacion en tiempo real', 'Verificacion automatica en 48h'],
    time: '24-48h',
  },
  {
    num: '04',
    AnimIcon: ResultsIcon,
    title: 'Resultados reales',
    desc: 'Metricas verificadas: clicks unicos, CPC, alcance y engagement. Fondos del escrow liberados automaticamente.',
    color: '#f59e0b',
    details: ['Clicks unicos verificados', 'CPC y ROAS en real-time', 'Escrow liberado automaticamente'],
    time: 'Instantaneo',
  },
]

function StepCard({ step, index, isActive, onHover }) {
  const AnimIcon = step.AnimIcon

  return (
    <motion.div
      variants={{
        hidden: { opacity: 0, y: 40, scale: 0.95 },
        visible: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.6, ease: spring } },
      }}
      onMouseEnter={() => onHover(index)}
      style={{
        position: 'relative',
        background: isActive ? `${step.color}06` : 'var(--surface)',
        border: `1px solid ${isActive ? step.color + '30' : 'var(--border)'}`,
        borderRadius: '20px',
        padding: 'clamp(24px, 3vw, 32px)',
        cursor: 'default',
        transition: 'all 0.35s cubic-bezier(.22,1,.36,1)',
        transform: isActive ? 'translateY(-6px)' : 'none',
        boxShadow: isActive
          ? `0 20px 50px ${step.color}15, 0 0 0 1px ${step.color}10`
          : 'var(--shadow-sm)',
      }}
    >
      {/* Step number */}
      <div style={{
        position: 'absolute', top: '-14px', left: '24px',
        width: '28px', height: '28px', borderRadius: '8px',
        background: isActive ? step.color : 'var(--surface)',
        border: isActive ? 'none' : '1px solid var(--border-med)',
        boxShadow: 'var(--shadow-sm)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontFamily: FONT_DISPLAY, fontSize: '10px', fontWeight: 700,
        color: isActive ? '#fff' : 'var(--muted)',
        transition: 'all 0.3s',
      }}>
        {step.num}
      </div>

      {/* Header */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: '12px',
        marginBottom: '14px', marginTop: '4px',
      }}>
        <div style={{
          width: '56px', height: '56px', borderRadius: '14px',
          background: `${step.color}10`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          transition: 'transform 0.3s',
          transform: isActive ? 'scale(1.08)' : 'none',
        }}>
          <AnimIcon color={step.color} active={isActive} />
        </div>
        <div>
          <h3 style={{
            fontFamily: FONT_DISPLAY, fontWeight: 700,
            fontSize: 'clamp(16px, 2.5vw, 20px)', margin: 0,
            color: 'var(--text)', letterSpacing: '-0.02em',
          }}>
            {step.title}
          </h3>
          <div style={{
            display: 'flex', alignItems: 'center', gap: '4px',
            fontSize: '11px', color: step.color, fontWeight: 600, marginTop: '2px',
          }}>
            <Clock size={10} />
            {step.time}
          </div>
        </div>
      </div>

      <p style={{
        fontSize: '13px', color: 'var(--muted)',
        margin: '0 0 16px', lineHeight: 1.6,
      }}>
        {step.desc}
      </p>

      {/* Detail chips */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
        {step.details.map((detail, i) => (
          <motion.div
            key={i}
            initial={false}
            animate={{
              opacity: isActive ? 1 : 0.6,
              x: isActive ? 0 : -4,
            }}
            transition={{ duration: 0.3, delay: i * 0.05 }}
            style={{
              display: 'flex', alignItems: 'center', gap: '6px',
              fontSize: '11px', color: isActive ? 'var(--text)' : 'var(--muted)',
              fontWeight: 500,
            }}
          >
            <CheckCircle2 size={12} style={{ color: step.color, flexShrink: 0 }} />
            {detail}
          </motion.div>
        ))}
      </div>
    </motion.div>
  )
}

export default function CampaignFlow() {
  const ref = useRef(null)
  const inView = useInView(ref, { once: true, margin: '-80px' })
  const [activeStep, setActiveStep] = useState(0)

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
        {/* Header */}
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
            margin: '0 0 16px', color: 'var(--text)',
          }}>
            De la idea al resultado, sin friccion
          </h2>
          <p style={{
            fontFamily: FONT_BODY, fontSize: '16px', color: 'var(--muted)',
            maxWidth: '480px', margin: '0 auto', lineHeight: 1.6,
          }}>
            4 pasos. Pago protegido en cada uno. Metricas reales al final.
          </p>
        </div>

        {/* Progress bar */}
        <div style={{
          maxWidth: '600px', margin: '0 auto clamp(28px, 4vw, 40px)',
          display: 'flex', alignItems: 'center', gap: '4px',
        }}
        className="flow-progress-bar"
        >
          {STEPS.map((step, i) => (
            <React.Fragment key={i}>
              <motion.div
                animate={{
                  background: i <= activeStep ? step.color : 'var(--border)',
                  scale: i === activeStep ? 1.3 : 1,
                }}
                transition={{ duration: 0.3 }}
                style={{
                  width: '10px', height: '10px', borderRadius: '50%',
                  cursor: 'pointer', flexShrink: 0,
                }}
                onClick={() => setActiveStep(i)}
              />
              {i < STEPS.length - 1 && (
                <motion.div
                  animate={{
                    background: i < activeStep
                      ? `linear-gradient(90deg, ${STEPS[i].color}, ${STEPS[i + 1].color})`
                      : 'var(--border)',
                  }}
                  style={{ flex: 1, height: '2px', borderRadius: '1px' }}
                />
              )}
            </React.Fragment>
          ))}
        </div>

        {/* Step cards */}
        <motion.div
          className="flow-steps-grid"
          initial="hidden"
          animate={inView ? 'visible' : 'hidden'}
          variants={stagger}
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(4, 1fr)',
            gap: '16px',
            position: 'relative',
          }}
        >
          {STEPS.map((step, i) => (
            <StepCard
              key={i}
              step={step}
              index={i}
              isActive={i === activeStep}
              onHover={setActiveStep}
            />
          ))}
        </motion.div>

        {/* Bottom trust badges */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          gap: '24px', flexWrap: 'wrap', marginTop: 'clamp(36px, 5vw, 56px)',
        }}>
          {[
            { icon: Shield, text: 'Escrow en cada transaccion', color: '#22c55e' },
            { icon: Zap, text: 'Verificacion automatica', color: '#f59e0b' },
            { icon: Eye, text: 'Metricas 100% auditables', color: '#3b82f6' },
          ].map((badge, i) => (
            <div key={i} style={{
              display: 'flex', alignItems: 'center', gap: '8px',
              fontSize: '13px', fontWeight: 500, color: 'var(--text-secondary, var(--muted))',
            }}>
              <div style={{
                width: '32px', height: '32px', borderRadius: '8px',
                background: `${badge.color}10`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: badge.color,
              }}>
                <badge.icon size={16} strokeWidth={2} />
              </div>
              {badge.text}
            </div>
          ))}
        </div>
      </div>

      <style>{`
        @media (max-width: 900px) {
          .flow-steps-grid { grid-template-columns: 1fr 1fr !important; }
        }
        @media (max-width: 520px) {
          .flow-steps-grid { grid-template-columns: 1fr !important; }
          .flow-progress-bar { display: none !important; }
        }
      `}</style>
    </section>
  )
}
