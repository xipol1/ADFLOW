import React from 'react'
import { motion, useInView } from 'framer-motion'
import { useRef } from 'react'
import { Shield, Lock, BadgeCheck, Eye, MapPin } from 'lucide-react'
import { FONT_DISPLAY, MAX_W } from '../../theme/tokens'

const spring = [0.22, 1, 0.36, 1]
const stagger = { hidden: {}, visible: { transition: { staggerChildren: 0.05 } } }
const fadeScale = { hidden: { opacity: 0, scale: 0.9 }, visible: { opacity: 1, scale: 1, transition: { duration: 0.4, ease: spring } } }

const TRUST_ITEMS = [
  { icon: Shield,     label: 'Escrow via Stripe Connect' },
  { icon: Lock,       label: 'Cifrado AES-256 + TLS' },
  { label: 'Cumple RGPD / LSSI-CE', flag: true },
  { icon: BadgeCheck,  label: 'Verificacion con tracking links' },
  { icon: MapPin,     label: 'Jurisdiccion espanola, Madrid' },
  { icon: Eye,        label: 'Metricas auditables en tiempo real' },
]

export default function TrustSection() {
  const ref = useRef(null)
  const inView = useInView(ref, { once: true, margin: '-80px' })

  return (
    <section
      ref={ref}
      id="confianza"
      style={{
        background: 'var(--bg)',
        padding: 'clamp(72px,10vw,140px) clamp(16px, 4vw, 24px)',
      }}
    >
      <div style={{ maxWidth: '800px', margin: '0 auto', textAlign: 'center' }}>
        <p style={{
          fontSize: '11px', fontWeight: 600, textTransform: 'uppercase',
          letterSpacing: '0.12em', color: 'var(--accent)', marginBottom: '16px',
        }}>
          Seguridad y cumplimiento
        </p>
        <h2 style={{
          fontFamily: FONT_DISPLAY, fontWeight: 700,
          fontSize: 'clamp(28px, 3.5vw, 44px)',
          lineHeight: 1.08, letterSpacing: '-0.03em',
          margin: '0 0 56px', color: 'var(--text)',
        }}>
          Construido sobre confianza
        </h2>

        <motion.div
          initial="hidden"
          animate={inView ? 'visible' : 'hidden'}
          variants={stagger}
          style={{
            display: 'flex', flexWrap: 'wrap', justifyContent: 'center',
            gap: '20px', marginBottom: '36px',
          }}
        >
          {TRUST_ITEMS.map((item, i) => (
            <motion.div
              key={i}
              variants={fadeScale}
              whileHover={{ scale: 1.05 }}
              style={{
                display: 'flex', alignItems: 'center', gap: '10px',
                padding: '12px 20px', borderRadius: '14px',
                background: 'var(--surface)',
                border: '1px solid var(--border)',
                boxShadow: 'var(--shadow-xs)',
                fontSize: '14px', fontWeight: 500,
                color: 'var(--text-secondary, var(--text))',
                cursor: 'default',
                transition: 'box-shadow 0.2s, border-color 0.2s',
              }}
            >
              {item.flag ? (
                <span style={{ fontSize: '18px' }}>🇪🇺</span>
              ) : (
                <item.icon size={18} strokeWidth={1.8} style={{ color: 'var(--accent)' }} />
              )}
              {item.label}
            </motion.div>
          ))}
        </motion.div>

        <motion.p
          initial={{ opacity: 0 }}
          animate={inView ? { opacity: 1 } : {}}
          transition={{ delay: 0.5 }}
          style={{
            fontSize: '13px', color: 'var(--muted)',
            fontWeight: 400,
          }}
        >
          Channelad SL · CIF: BXXXXXXX · Registrada en Madrid, Espana
        </motion.p>
      </div>
    </section>
  )
}
