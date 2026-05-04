import React, { useRef, useState, useEffect } from 'react'
import { motion, useInView } from 'framer-motion'
import {
  Shield, Lock, BadgeCheck, Eye, CreditCard, MapPin,
  TrendingUp, Users, Globe, Zap, CheckCircle2, ArrowRight,
} from 'lucide-react'
import { FONT_DISPLAY, FONT_BODY, MAX_W } from '../../theme/tokens'

const spring = [0.22, 1, 0.36, 1]
const stagger = { hidden: {}, visible: { transition: { staggerChildren: 0.06, delayChildren: 0.1 } } }
const fadeUp = { hidden: { opacity: 0, y: 30 }, visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: spring } } }

function useCountUp(target, duration = 2200) {
  const [count, setCount] = useState(0)
  const ref = useRef(null)
  const started = useRef(false)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const obs = new IntersectionObserver(([e]) => {
      if (e.isIntersecting && !started.current) {
        started.current = true
        const t0 = performance.now()
        const tick = (now) => {
          const p = Math.min((now - t0) / duration, 1)
          const ease = 1 - Math.pow(1 - p, 3)
          setCount(Math.round(target * ease))
          if (p < 1) requestAnimationFrame(tick)
        }
        requestAnimationFrame(tick)
      }
    }, { threshold: 0.3 })
    obs.observe(el)
    return () => obs.disconnect()
  }, [target, duration])

  return [count, ref]
}

const METRICS = [
  { value: 2847, suffix: '', label: 'Canales verificados', icon: Users, color: '#8b5cf6' },
  { value: 7, suffix: '', label: 'Plataformas soportadas', icon: Globe, color: '#3b82f6' },
  { value: 34, suffix: '%', label: 'CTR medio vs. paid media', icon: TrendingUp, color: '#10b981' },
  { value: 100, suffix: '%', label: 'Reembolso si no publica', icon: Shield, color: '#22c55e' },
]

const SECURITY_FEATURES = [
  {
    icon: CreditCard,
    title: 'Escrow via Stripe Connect',
    desc: 'Cada pago queda protegido en escrow. Los fondos solo se liberan cuando la publicacion se verifica con tracking links.',
    color: '#8b5cf6',
  },
  {
    icon: Lock,
    title: 'Cifrado AES-256 + TLS 1.3',
    desc: 'Todos los datos en transito y en reposo estan cifrados con estandar bancario. Cumplimiento RGPD y LSSI-CE.',
    color: '#3b82f6',
  },
  {
    icon: BadgeCheck,
    title: 'Verificacion con tracking links',
    desc: 'Cada publicacion se verifica automaticamente con tracking links unicos. 3 clicks minimos en 48h para liberar fondos.',
    color: '#10b981',
  },
  {
    icon: Eye,
    title: 'Metricas auditables en real-time',
    desc: 'Clicks unicos, CPC, alcance y engagement — datos verificados que puedes auditar en cualquier momento desde tu dashboard.',
    color: '#f59e0b',
  },
]

const COMPLIANCE_BADGES = [
  { label: 'Stripe Connect', icon: CreditCard },
  { label: 'RGPD', flag: true },
  { label: 'LSSI-CE', flag: true },
  { label: 'TLS 1.3', icon: Lock },
  { label: 'AES-256', icon: Shield },
  { label: 'Madrid, ES', icon: MapPin },
]

function MetricCard({ metric, index }) {
  const [count, ref] = useCountUp(metric.value)
  const Icon = metric.icon
  const display = count >= 1000 ? `${(count / 1000).toFixed(1)}K` : count

  return (
    <motion.div
      ref={ref}
      variants={fadeUp}
      whileHover={{ y: -4, boxShadow: `0 16px 40px ${metric.color}12` }}
      style={{
        background: 'var(--surface)',
        border: '1px solid var(--border)',
        borderRadius: '20px',
        padding: 'clamp(24px, 3vw, 32px)',
        textAlign: 'center',
        transition: 'all 0.3s cubic-bezier(.22,1,.36,1)',
      }}
    >
      <div style={{
        width: '48px', height: '48px', borderRadius: '14px',
        background: `${metric.color}10`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        margin: '0 auto 16px', color: metric.color,
      }}>
        <Icon size={24} strokeWidth={1.8} />
      </div>
      <div style={{
        fontFamily: FONT_DISPLAY, fontSize: 'clamp(28px, 4vw, 40px)', fontWeight: 700,
        letterSpacing: '-0.03em', color: 'var(--text)',
      }}>
        {display}{metric.suffix}
      </div>
      <div style={{
        fontSize: '13px', color: 'var(--muted)', marginTop: '4px', fontWeight: 500,
      }}>
        {metric.label}
      </div>
    </motion.div>
  )
}

export default function RealDataSection() {
  const ref = useRef(null)
  const inView = useInView(ref, { once: true, margin: '-80px' })

  return (
    <section ref={ref} style={{ background: 'var(--bg)', padding: 'clamp(72px,10vw,140px) clamp(16px, 4vw, 24px)' }}>
      <div style={{ maxWidth: MAX_W, margin: '0 auto' }}>

        {/* ── Metrics section ── */}
        <div style={{ textAlign: 'center', marginBottom: 'clamp(36px, 6vw, 56px)' }}>
          <p style={{
            fontSize: '11px', fontWeight: 600, textTransform: 'uppercase',
            letterSpacing: '0.12em', color: 'var(--accent)', marginBottom: '16px',
          }}>
            Datos reales, no promesas
          </p>
          <h2 style={{
            fontFamily: FONT_DISPLAY, fontWeight: 700,
            fontSize: 'clamp(24px, 4vw, 44px)',
            lineHeight: 1.08, letterSpacing: '-0.03em',
            margin: 0, color: 'var(--text)',
          }}>
            Numeros que puedes verificar
          </h2>
        </div>

        <motion.div
          initial="hidden"
          animate={inView ? 'visible' : 'hidden'}
          variants={stagger}
          className="metrics-grid"
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(4, 1fr)',
            gap: '16px',
            marginBottom: 'clamp(72px, 10vw, 120px)',
          }}
        >
          {METRICS.map((m, i) => (
            <MetricCard key={i} metric={m} index={i} />
          ))}
        </motion.div>

        {/* ── Security section ── */}
        <div style={{ textAlign: 'center', marginBottom: 'clamp(36px, 6vw, 56px)' }}>
          <p style={{
            fontSize: '11px', fontWeight: 600, textTransform: 'uppercase',
            letterSpacing: '0.12em', color: '#22c55e', marginBottom: '16px',
          }}>
            Seguridad y cumplimiento
          </p>
          <h2 style={{
            fontFamily: FONT_DISPLAY, fontWeight: 700,
            fontSize: 'clamp(24px, 4vw, 44px)',
            lineHeight: 1.08, letterSpacing: '-0.03em',
            margin: '0 0 16px', color: 'var(--text)',
          }}>
            Tu dinero, siempre protegido
          </h2>
          <p style={{
            fontFamily: FONT_BODY, fontSize: '16px', color: 'var(--muted)',
            maxWidth: '520px', margin: '0 auto', lineHeight: 1.6,
          }}>
            Cada transaccion pasa por escrow. Cada publicacion se verifica automaticamente.
            Si algo falla, recuperas tu dinero.
          </p>
        </div>

        {/* Security cards */}
        <motion.div
          initial="hidden"
          animate={inView ? 'visible' : 'hidden'}
          variants={stagger}
          className="security-grid"
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(2, 1fr)',
            gap: '16px',
            marginBottom: '48px',
          }}
        >
          {SECURITY_FEATURES.map((feat, i) => {
            const Icon = feat.icon
            return (
              <motion.div
                key={i}
                variants={fadeUp}
                whileHover={{ y: -3 }}
                style={{
                  background: 'var(--surface)',
                  border: '1px solid var(--border)',
                  borderRadius: '20px',
                  padding: 'clamp(24px, 3vw, 32px)',
                  transition: 'transform 0.3s cubic-bezier(.22,1,.36,1), box-shadow 0.3s',
                }}
              >
                <div style={{
                  display: 'flex', alignItems: 'center', gap: '12px',
                  marginBottom: '14px',
                }}>
                  <div style={{
                    width: '44px', height: '44px', borderRadius: '12px',
                    background: `${feat.color}10`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    color: feat.color,
                  }}>
                    <Icon size={22} strokeWidth={1.8} />
                  </div>
                  <h3 style={{
                    fontFamily: FONT_DISPLAY, fontWeight: 600,
                    fontSize: 'clamp(15px, 2.5vw, 18px)',
                    margin: 0, color: 'var(--text)', letterSpacing: '-0.02em',
                  }}>
                    {feat.title}
                  </h3>
                </div>
                <p style={{
                  fontSize: '14px', color: 'var(--muted)',
                  margin: 0, lineHeight: 1.6,
                }}>
                  {feat.desc}
                </p>
              </motion.div>
            )
          })}
        </motion.div>

        {/* Compliance badges */}
        <motion.div
          initial="hidden"
          animate={inView ? 'visible' : 'hidden'}
          variants={stagger}
          style={{
            display: 'flex', flexWrap: 'wrap', justifyContent: 'center',
            gap: '12px', marginBottom: '24px',
          }}
        >
          {COMPLIANCE_BADGES.map((badge, i) => (
            <motion.div
              key={i}
              variants={fadeUp}
              whileHover={{ scale: 1.05 }}
              style={{
                display: 'flex', alignItems: 'center', gap: '8px',
                padding: '10px 18px', borderRadius: '12px',
                background: 'var(--surface)',
                border: '1px solid var(--border)',
                boxShadow: 'var(--shadow-xs)',
                fontSize: '13px', fontWeight: 500,
                color: 'var(--text-secondary, var(--text))',
                cursor: 'default',
              }}
            >
              {badge.flag
                ? <span style={{ fontSize: '16px' }}>🇪🇺</span>
                : <badge.icon size={16} strokeWidth={1.8} style={{ color: 'var(--accent)' }} />
              }
              {badge.label}
            </motion.div>
          ))}
        </motion.div>

        <motion.p
          initial={{ opacity: 0 }}
          animate={inView ? { opacity: 1 } : {}}
          transition={{ delay: 0.8 }}
          style={{
            textAlign: 'center',
            fontSize: '13px', color: 'var(--muted)',
            fontWeight: 400,
          }}
        >
          Channelad SL · CIF: BXXXXXXX · Registrada en Madrid, Espana
        </motion.p>
      </div>

      <style>{`
        @media (max-width: 900px) {
          .metrics-grid { grid-template-columns: 1fr 1fr !important; }
        }
        @media (max-width: 520px) {
          .metrics-grid { grid-template-columns: 1fr !important; }
          .security-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </section>
  )
}
