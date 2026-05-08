import React, { useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { motion, useMotionValue, useSpring, useTransform } from 'framer-motion'
import {
  Check, Minus, Sparkles, ArrowRight, Radio, Zap, Building2, Crown,
} from 'lucide-react'
import { FONT_DISPLAY, FONT_BODY, MAX_W } from '../../theme/tokens'

// 3D tilt math — rotates the card based on cursor offset from its centre.
// Spring smooths the transitions; mouse leave returns to neutral.
function Card3D({ tier, index }) {
  const ref = useRef(null)
  const [hovered, setHovered] = useState(false)

  const mx = useMotionValue(0.5)
  const my = useMotionValue(0.5)

  const rotateX = useSpring(useTransform(my, [0, 1], [8, -8]), { stiffness: 200, damping: 20 })
  const rotateY = useSpring(useTransform(mx, [0, 1], [-8, 8]), { stiffness: 200, damping: 20 })
  const glareX = useTransform(mx, [0, 1], ['0%', '100%'])
  const glareY = useTransform(my, [0, 1], ['0%', '100%'])

  const handleMove = (e) => {
    const rect = ref.current.getBoundingClientRect()
    mx.set((e.clientX - rect.left) / rect.width)
    my.set((e.clientY - rect.top) / rect.height)
  }
  const handleLeave = () => {
    mx.set(0.5)
    my.set(0.5)
    setHovered(false)
  }

  const Icon = tier.icon
  const featured = tier.featured
  const isCreator = tier.audience === 'creator'

  return (
    <motion.div
      ref={ref}
      onMouseMove={handleMove}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={handleLeave}
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-80px' }}
      transition={{ duration: 0.5, delay: index * 0.08, ease: [0.22, 1, 0.36, 1] }}
      style={{
        position: 'relative',
        perspective: 1400,
        transformStyle: 'preserve-3d',
      }}
    >
      {/* Recommended ribbon — sits above the card so the tilt doesn't crop it */}
      {featured && (
        <div
          style={{
            position: 'absolute',
            top: -14,
            left: '50%',
            transform: 'translateX(-50%)',
            zIndex: 4,
            padding: '6px 14px',
            borderRadius: 999,
            background: 'linear-gradient(135deg, #8B5CF6 0%, #6D28D9 100%)',
            color: '#fff',
            fontSize: 11,
            fontWeight: 700,
            letterSpacing: '0.06em',
            textTransform: 'uppercase',
            boxShadow: '0 8px 22px -6px rgba(124,58,237,0.55)',
            display: 'flex',
            alignItems: 'center',
            gap: 6,
          }}
        >
          <Sparkles size={12} strokeWidth={2.4} />
          Recomendado
        </div>
      )}

      <motion.div
        style={{
          rotateX,
          rotateY,
          transformStyle: 'preserve-3d',
          background: featured
            ? 'linear-gradient(180deg, rgba(139,92,246,0.06) 0%, var(--surface) 60%)'
            : 'var(--surface)',
          border: `1px solid ${featured ? 'rgba(139,92,246,0.35)' : 'var(--border)'}`,
          borderRadius: 20,
          padding: '28px 24px 24px',
          minHeight: 560,
          display: 'flex',
          flexDirection: 'column',
          boxShadow: featured
            ? '0 20px 60px -20px rgba(124,58,237,0.35), 0 0 0 1px rgba(139,92,246,0.10)'
            : '0 12px 32px -16px rgba(15,23,42,0.18)',
          transition: 'box-shadow .35s, border-color .35s',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {/* Glare layer — moves with cursor */}
        <motion.div
          aria-hidden
          style={{
            position: 'absolute',
            inset: 0,
            background: `radial-gradient(circle at ${glareX} ${glareY}, ${
              isCreator ? 'rgba(37,211,102,0.18)' : 'rgba(139,92,246,0.18)'
            } 0%, transparent 55%)`,
            opacity: hovered ? 1 : 0,
            transition: 'opacity .35s',
            pointerEvents: 'none',
            transform: 'translateZ(1px)',
          }}
        />

        {/* Header — icon + tier name + audience tag */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 18, transform: 'translateZ(20px)' }}>
          <div
            style={{
              width: 44,
              height: 44,
              borderRadius: 12,
              background: `${tier.accent}14`,
              color: tier.accent,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            <Icon size={22} strokeWidth={1.9} />
          </div>
          <div>
            <div
              style={{
                fontFamily: FONT_DISPLAY,
                fontSize: 19,
                fontWeight: 700,
                letterSpacing: '-0.02em',
                color: 'var(--text)',
                lineHeight: 1.1,
              }}
            >
              {tier.name}
            </div>
            <div
              style={{
                fontSize: 11,
                fontWeight: 600,
                color: tier.accent,
                textTransform: 'uppercase',
                letterSpacing: '0.08em',
                marginTop: 4,
              }}
            >
              {tier.audienceLabel}
            </div>
          </div>
        </div>

        {/* Price */}
        <div style={{ marginBottom: 14, transform: 'translateZ(20px)' }}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
            <span
              style={{
                fontFamily: FONT_DISPLAY,
                fontSize: 38,
                fontWeight: 700,
                letterSpacing: '-0.035em',
                color: 'var(--text)',
                lineHeight: 1,
              }}
            >
              {tier.price}
            </span>
            {tier.priceSuffix && (
              <span
                style={{
                  fontSize: 13,
                  color: 'var(--muted)',
                  fontWeight: 500,
                }}
              >
                {tier.priceSuffix}
              </span>
            )}
          </div>
          <p
            style={{
              fontSize: 13,
              color: 'var(--muted)',
              margin: '8px 0 0',
              lineHeight: 1.5,
              minHeight: 38,
            }}
          >
            {tier.tagline}
          </p>
        </div>

        {/* Divider */}
        <div
          style={{
            height: 1,
            background: 'var(--border)',
            margin: '6px 0 18px',
            transform: 'translateZ(10px)',
          }}
        />

        {/* Features */}
        <ul
          style={{
            listStyle: 'none',
            padding: 0,
            margin: 0,
            display: 'flex',
            flexDirection: 'column',
            gap: 10,
            flex: 1,
            transform: 'translateZ(20px)',
          }}
        >
          {tier.features.map((f) => (
            <li
              key={f.label}
              style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: 10,
                fontSize: 13.5,
                color: f.included ? 'var(--text)' : 'var(--muted)',
                lineHeight: 1.45,
              }}
            >
              <span
                style={{
                  width: 18,
                  height: 18,
                  borderRadius: '50%',
                  background: f.included ? `${tier.accent}18` : 'var(--bg2)',
                  color: f.included ? tier.accent : 'var(--muted)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                  marginTop: 2,
                }}
              >
                {f.included ? <Check size={11} strokeWidth={3} /> : <Minus size={11} strokeWidth={3} />}
              </span>
              <span>{f.label}</span>
            </li>
          ))}
        </ul>

        {/* CTA */}
        <div style={{ marginTop: 22, transform: 'translateZ(30px)' }}>
          <Link
            to={tier.ctaHref}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
              width: '100%',
              padding: '12px 16px',
              borderRadius: 12,
              fontSize: 14,
              fontWeight: 600,
              textDecoration: 'none',
              transition: 'transform .25s, box-shadow .25s, background .25s',
              ...(featured
                ? {
                    background: 'linear-gradient(180deg, #8B5CF6 0%, #7C3AED 100%)',
                    color: '#fff',
                    boxShadow: '0 1px 0 0 rgba(255,255,255,0.18) inset, 0 12px 28px -10px rgba(124,58,237,0.5)',
                  }
                : {
                    background: 'var(--bg2)',
                    color: 'var(--text)',
                    border: '1px solid var(--border)',
                  }),
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translateY(-1px)'
              if (featured) {
                e.currentTarget.style.background = 'linear-gradient(180deg, #A78BFA 0%, #8B5CF6 100%)'
              }
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'none'
              if (featured) {
                e.currentTarget.style.background = 'linear-gradient(180deg, #8B5CF6 0%, #7C3AED 100%)'
              }
            }}
          >
            {tier.ctaLabel}
            <ArrowRight size={15} strokeWidth={2.4} />
          </Link>
        </div>
      </motion.div>
    </motion.div>
  )
}

const TIERS = [
  {
    id: 'free',
    name: 'Canales',
    audience: 'creator',
    audienceLabel: 'Para creadores',
    icon: Radio,
    accent: '#25d366',
    price: 'Gratis',
    priceSuffix: 'siempre',
    tagline: 'Registra tu canal, aparece en el marketplace y recibe solicitudes de marcas.',
    features: [
      { label: 'Aparición en marketplace verificado', included: true },
      { label: 'Inbox de solicitudes de marcas', included: true },
      { label: 'Analytics básico de tu canal', included: true },
      { label: 'Pagos directos al cierre de campaña', included: true },
      { label: 'Sin retenciones ni fees ocultos', included: true },
      { label: 'Audit pack premium', included: false },
      { label: 'Pricing optimizer + A/B test lab', included: false },
    ],
    ctaLabel: 'Registrar canal',
    ctaHref: '/para-canales',
  },
  {
    id: 'pro',
    name: 'Pro',
    audience: 'advertiser',
    audienceLabel: 'Para anunciantes',
    icon: Zap,
    accent: '#8B5CF6',
    featured: true,
    price: '€79',
    priceSuffix: '/ mes',
    tagline: 'Las +30 herramientas completas. Lanza, mide y optimiza sin techo.',
    features: [
      { label: 'Marketplace + Niche Heatmap + Lookalikes', included: true },
      { label: 'Analytics dashboard tiempo real', included: true },
      { label: 'A/B Test Lab + ROI Forecast', included: true },
      { label: 'Audience Insights + Cohort Analysis', included: true },
      { label: 'Bulk Launcher hasta 50 campañas/día', included: true },
      { label: 'Soporte por email (24h)', included: true },
      { label: 'White-label reports + multi-cuenta', included: false },
    ],
    ctaLabel: 'Empezar prueba',
    ctaHref: '/auth/register',
  },
  {
    id: 'agency',
    name: 'Agency',
    audience: 'advertiser',
    audienceLabel: 'Para agencias',
    icon: Building2,
    accent: '#3b82f6',
    price: '€299',
    priceSuffix: '/ mes',
    tagline: 'Multi-cuenta, white-label y herramientas avanzadas para gestionar varios clientes.',
    features: [
      { label: 'Todo lo de Pro', included: true },
      { label: 'Multi-cuenta (hasta 5 clientes)', included: true },
      { label: 'White-label reports con tu marca', included: true },
      { label: 'Bulk Launcher avanzado + automatizaciones', included: true },
      { label: 'Priority support (4h)', included: true },
      { label: 'Onboarding 1:1 con experto', included: true },
      { label: 'API access + SLA', included: false },
    ],
    ctaLabel: 'Solicitar demo',
    ctaHref: '/soporte',
  },
  {
    id: 'enterprise',
    name: 'Enterprise',
    audience: 'advertiser',
    audienceLabel: 'Custom',
    icon: Crown,
    accent: '#f59e0b',
    price: 'Custom',
    priceSuffix: '· €1–3K / mes',
    tagline: 'Para retailers, holdings y agencias grandes. Hecho a medida.',
    features: [
      { label: 'Todo lo de Agency, sin límites', included: true },
      { label: 'API access + SLA garantizado (99,9%)', included: true },
      { label: 'Manager dedicado + soporte 24/7', included: true },
      { label: 'DPA personalizado + auditorías', included: true },
      { label: 'White-label completo (subdominio propio)', included: true },
      { label: 'Integraciones a medida (CRM, BI, etc.)', included: true },
      { label: 'Onboarding y formación equipo', included: true },
    ],
    ctaLabel: 'Hablar con ventas',
    ctaHref: '/soporte',
  },
]

export default function SubscriptionTiers3D() {
  return (
    <section
      style={{
        padding: 'clamp(72px, 10vw, 120px) clamp(16px, 4vw, 24px)',
        background:
          'radial-gradient(ellipse 90% 50% at 50% 0%, rgba(124,58,237,0.06) 0%, transparent 60%), var(--bg)',
        position: 'relative',
      }}
    >
      <div style={{ maxWidth: MAX_W, margin: '0 auto' }}>
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: 'clamp(48px, 6vw, 72px)' }}>
          <p
            style={{
              fontSize: 11,
              fontWeight: 600,
              textTransform: 'uppercase',
              letterSpacing: '0.12em',
              color: '#8B5CF6',
              marginBottom: 16,
            }}
          >
            Planes de acceso
          </p>
          <h2
            style={{
              fontFamily: FONT_DISPLAY,
              fontWeight: 700,
              fontSize: 'clamp(28px, 4.4vw, 46px)',
              lineHeight: 1.08,
              letterSpacing: '-0.035em',
              margin: '0 0 16px',
              color: 'var(--text)',
            }}
          >
            Elige cómo accedes al toolkit
          </h2>
          <p
            style={{
              fontFamily: FONT_BODY,
              fontSize: 16,
              color: 'var(--muted)',
              maxWidth: 580,
              margin: '0 auto',
              lineHeight: 1.6,
            }}
          >
            Los canales acceden gratis para captar marcas. Las marcas eligen el plan según el
            volumen y sofisticación que necesiten. La comisión por campaña se factura aparte.
          </p>
        </div>

        {/* Tier grid */}
        <div
          className="subscription-grid"
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(4, 1fr)',
            gap: 18,
            alignItems: 'start',
          }}
        >
          {TIERS.map((tier, i) => (
            <Card3D key={tier.id} tier={tier} index={i} />
          ))}
        </div>

        <p
          style={{
            textAlign: 'center',
            marginTop: 40,
            fontSize: 13,
            color: 'var(--muted)',
            maxWidth: 540,
            marginLeft: 'auto',
            marginRight: 'auto',
          }}
        >
          Todos los planes incluyen escrow, pago en EU y cumplimiento GDPR. Cancela cuando
          quieras — sin permanencia.
        </p>

        <style>{`
          @media (max-width: 1080px) {
            .subscription-grid { grid-template-columns: repeat(2, 1fr) !important; }
          }
          @media (max-width: 600px) {
            .subscription-grid { grid-template-columns: 1fr !important; }
          }
        `}</style>
      </div>
    </section>
  )
}
