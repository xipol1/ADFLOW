import React, { useState, useEffect, useRef } from 'react'
import { motion, useScroll, useTransform, AnimatePresence } from 'framer-motion'
import { ArrowRight, Play, Megaphone, Wallet } from 'lucide-react'
import { PURPLE, FONT_DISPLAY, FONT_BODY, MAX_W } from '../../theme/tokens'

/* ── Count-up hook ─────────────────────────────────────── */
function useCountUp(target, duration = 2000, startOnView = true) {
  const [count, setCount] = useState(0)
  const ref = useRef(null)
  const started = useRef(false)

  useEffect(() => {
    if (!startOnView) return
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
  }, [target, duration, startOnView])

  return [count, ref]
}

/* ── Animation variants ────────────────────────────────── */
const spring = [0.22, 1, 0.36, 1]

const revealUp = {
  hidden: { opacity: 0, y: 60 },
  visible: (d = 0) => ({ opacity: 1, y: 0, transition: { duration: 0.8, ease: spring, delay: d } }),
}

/* ── Hero content for each phase ─────────────────────── */
const HERO_PHASES = {
  // GREEN = Advertisers/Brands
  green: {
    pill: { icon: Megaphone, text: '+340 marcas ya anuncian con nosotros' },
    headline: ['Tu marca,', 'donde importa'],
    accent: ['donde importa'],
    subtitle: 'Publica en comunidades reales de WhatsApp, Telegram y Discord. Pago protegido con escrow, metricas verificadas con tracking links y un CPC medio de €0.12.',
    cta: 'Explorar canales',
    ctaHref: '/marketplace',
    ctaSecondary: 'Crear cuenta gratis',
    ctaSecondaryHref: '/auth/register',
    metrics: [
      { value: 12400, suffix: '+', label: 'Canales verificados' },
      { value: 0.12, suffix: '€', label: 'CPC medio', decimals: 2, prefix: '' },
      { value: 45, suffix: '%', label: 'Engagement medio' },
    ],
    frictions: ['Pago protegido con escrow', 'Metricas verificables', 'Sin permanencia'],
  },
  // PURPLE = Creators
  purple: {
    pill: { icon: Wallet, text: '+2.400 creadores ya monetizan sus canales' },
    headline: ['Tu comunidad', 'ya tiene valor'],
    accent: ['ya tiene valor'],
    subtitle: 'Registra tu canal, pon tu precio y cobra automaticamente. Fondos protegidos en escrow via Stripe, verificacion en minutos y cobro del 100% de tu tarifa.',
    cta: 'Registrar mi canal',
    ctaHref: '/auth/register?role=creator',
    ctaSecondary: 'Ver como funciona',
    ctaSecondaryHref: '#como-funciona',
    metrics: [
      { value: 2400, suffix: '+', label: 'Canales activos' },
      { value: 100, suffix: '%', label: 'Tu cobras todo' },
      { value: 2.4, suffix: 'M€', label: 'Pagados a creadores', decimals: 1 },
    ],
    frictions: ['Cobro automatico', 'Sin exclusividad', 'Verificacion en minutos'],
  },
}

/* ── Text swap animation ──────────────────────────────── */
const textSwap = {
  initial: { opacity: 0, y: 20, filter: 'blur(4px)' },
  animate: { opacity: 1, y: 0, filter: 'blur(0px)', transition: { duration: 0.8, ease: spring } },
  exit: { opacity: 0, y: -20, filter: 'blur(4px)', transition: { duration: 0.5, ease: spring } },
}

export default function HeroSection() {
  const sectionRef = useRef(null)
  const { scrollYProgress } = useScroll({ target: sectionRef, offset: ['start start', 'end start'] })
  const heroY = useTransform(scrollYProgress, [0, 1], [0, 200])
  const heroOpacity = useTransform(scrollYProgress, [0, 0.6], [1, 0])

  // Listen to data-accent attribute changes
  const [phase, setPhase] = useState('purple')

  useEffect(() => {
    const check = () => {
      const accent = document.documentElement.dataset.accent
      setPhase(accent === 'green' ? 'green' : 'purple')
    }
    check()
    const obs = new MutationObserver(check)
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ['data-accent'] })
    return () => obs.disconnect()
  }, [])

  const hero = HERO_PHASES[phase]
  const PillIcon = hero.pill.icon

  return (
    <section
      ref={sectionRef}
      className="hero-section"
      style={{
        position: 'relative', minHeight: '92vh',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        overflow: 'hidden', padding: 'clamp(100px, 18vw, 160px) 20px clamp(60px, 10vw, 100px)',
      }}
    >
      {/* Mesh gradient bg */}
      <div className="hero-mesh-1" />
      <div className="hero-mesh-2" />
      <div className="hero-mesh-3" />

      <motion.div
        style={{ y: heroY, opacity: heroOpacity }}
        initial="hidden"
        animate="visible"
      >
        <div style={{
          maxWidth: '720px', margin: '0 auto',
          textAlign: 'center', position: 'relative', zIndex: 2,
        }}>
          {/* Social proof pill */}
          <motion.div variants={revealUp} custom={0.2}>
            <AnimatePresence mode="wait">
              <motion.div
                key={phase + '-pill'}
                {...textSwap}
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: '10px',
                  padding: '6px 16px 6px 8px', borderRadius: '99px',
                  background: 'var(--surface)', border: '1px solid var(--border)',
                  boxShadow: 'var(--shadow-sm)', marginBottom: '32px',
                  fontSize: '13px', color: 'var(--muted)', fontWeight: 500,
                }}
              >
                <div style={{
                  width: '28px', height: '28px', borderRadius: '50%',
                  background: 'var(--accent-surface, rgba(124,58,237,0.06))',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <PillIcon size={14} style={{ color: 'var(--accent)' }} />
                </div>
                <span>{hero.pill.text}</span>
              </motion.div>
            </AnimatePresence>
          </motion.div>

          {/* Headline */}
          <motion.div variants={revealUp} custom={0.4}>
            <AnimatePresence mode="wait">
              <motion.h1
                key={phase + '-h1'}
                {...textSwap}
                style={{
                  fontFamily: FONT_DISPLAY, fontWeight: 700,
                  fontSize: 'clamp(42px, 6vw, 76px)',
                  lineHeight: 1.05, letterSpacing: '-0.04em',
                  margin: '0 0 24px',
                }}
              >
                {hero.headline.map((line, i) => (
                  <div key={i}>
                    {hero.accent.includes(line)
                      ? <span className="gradient-text">{line}</span>
                      : line
                    }
                  </div>
                ))}
              </motion.h1>
            </AnimatePresence>
          </motion.div>

          {/* Subtitle */}
          <motion.div variants={revealUp} custom={0.6}>
            <AnimatePresence mode="wait">
              <motion.p
                key={phase + '-sub'}
                {...textSwap}
                style={{
                  fontFamily: FONT_BODY, fontSize: 'clamp(15px, 3.5vw, 18px)', lineHeight: 1.7,
                  color: 'var(--muted)', fontWeight: 400,
                  maxWidth: '560px', margin: '0 auto clamp(24px, 5vw, 40px)',
                  letterSpacing: '-0.01em', padding: '0 4px',
                }}
              >
                {hero.subtitle}
              </motion.p>
            </AnimatePresence>
          </motion.div>

          {/* CTA Group */}
          <motion.div variants={revealUp} custom={0.8}>
            <AnimatePresence mode="wait">
              <motion.div
                key={phase + '-cta'}
                {...textSwap}
                style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  gap: '14px', flexWrap: 'wrap', marginBottom: '24px',
                }}
              >
                <motion.a
                  href={hero.ctaHref}
                  className="cta-shift hero-cta-primary"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  style={{
                    display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                    color: '#fff',
                    padding: '15px 32px', borderRadius: '14px',
                    fontSize: 'clamp(14px, 3.5vw, 16px)', fontWeight: 600,
                    textDecoration: 'none',
                    minWidth: '0',
                  }}
                >
                  {hero.cta}
                  <ArrowRight size={18} strokeWidth={2.5} />
                </motion.a>

                <motion.a
                  href={hero.ctaSecondaryHref}
                  className="hero-cta-secondary"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  style={{
                    display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                    background: 'var(--surface)', color: 'var(--text)',
                    padding: '15px 28px', borderRadius: '14px',
                    fontSize: 'clamp(14px, 3.5vw, 16px)', fontWeight: 600,
                    border: '1px solid var(--border-med)',
                    boxShadow: 'var(--shadow-sm)',
                    transition: 'all 0.2s',
                    textDecoration: 'none',
                  }}
                >
                  {hero.ctaSecondary}
                </motion.a>
              </motion.div>
            </AnimatePresence>
          </motion.div>

          {/* Friction reducers */}
          <motion.div variants={revealUp} custom={0.9}>
            <AnimatePresence mode="wait">
              <motion.div
                key={phase + '-fric'}
                {...textSwap}
                style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  gap: '6px', flexWrap: 'wrap', marginBottom: '56px',
                  fontSize: '13px', color: 'var(--muted)',
                }}
              >
                {hero.frictions.map((t, i) => (
                  <React.Fragment key={i}>
                    {i > 0 && <span style={{ color: 'var(--border-med)', margin: '0 4px' }}>·</span>}
                    <span>{t}</span>
                  </React.Fragment>
                ))}
              </motion.div>
            </AnimatePresence>
          </motion.div>

          {/* Metrics */}
          <motion.div
            variants={revealUp}
            custom={1.0}
            className="hero-metrics"
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              gap: 'clamp(24px, 5vw, 48px)', flexWrap: 'wrap',
            }}
          >
            <AnimatePresence mode="wait">
              <motion.div
                key={phase + '-metrics'}
                {...textSwap}
                style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  gap: 'clamp(24px, 5vw, 48px)', flexWrap: 'wrap',
                }}
              >
                {hero.metrics.map((m, i) => (
                  <MetricCounter key={phase + '-' + i} {...m} />
                ))}
              </motion.div>
            </AnimatePresence>
          </motion.div>
        </div>
      </motion.div>
    </section>
  )
}

function MetricCounter({ value, suffix = '', prefix = '', label, decimals = 0 }) {
  const [count, ref] = useCountUp(value, 2200)
  const display = decimals > 0
    ? count.toFixed(decimals)
    : count >= 1000 ? `${(count / 1000).toFixed(1)}K` : count

  return (
    <div ref={ref} style={{ textAlign: 'center' }}>
      <div style={{
        fontFamily: "'Sora', sans-serif", fontSize: 'clamp(24px, 5vw, 32px)', fontWeight: 700,
        letterSpacing: '-0.03em', color: 'var(--text)',
      }}>
        {prefix}{display}{suffix}
      </div>
      <div style={{ fontSize: '13px', color: 'var(--muted)', marginTop: '4px', fontWeight: 500 }}>
        {label}
      </div>
    </div>
  )
}
