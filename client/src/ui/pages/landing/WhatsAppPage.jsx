import React, { useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { Helmet } from 'react-helmet-async'
import { motion, useInView, AnimatePresence } from 'framer-motion'
import {
  ArrowRight, CheckCircle2, XCircle, Lock, ShieldCheck,
  Wallet, MessageCircle, FileBarChart2, Calendar, Sparkles,
} from 'lucide-react'
import SEO from '../../components/SEO'
import CrossLinks from '../../components/landing/CrossLinks'
import FounderWaitlistPromoBlock from '../../components/landing/FounderWaitlistPromoBlock'
import ChannelCalculator from '../../components/calculator/ChannelCalculator'
import EscrowFlowAnimation from '../../components/landing/EscrowFlowAnimation'
import RotatingWord from '../../components/landing/RotatingWord'
import PhoneFrame from '../../components/landing/PhoneFrame'
import DemoCreatorInbox from '../../components/landing/demo/DemoCreatorInbox'
import DemoCreatorPublish from '../../components/landing/demo/DemoCreatorPublish'
import DemoCreatorEarnings from '../../components/landing/demo/DemoCreatorEarnings'
import DemoCreatorPayout from '../../components/landing/demo/DemoCreatorPayout'
import { FONT_BODY, FONT_DISPLAY, MAX_W } from '../../theme/tokens'
import { FOUNDING_RESERVED, FOUNDING_TOTAL } from '../../theme/stats'

const F = FONT_BODY
const D = FONT_DISPLAY
const GREEN = '#25d366'
const GREEN_DARK = '#1ea952'
const greenAlpha = (o) => `rgba(37,211,102,${o})`

const CAL_LINK = 'https://cal.com/rafa-ferrer-xnpskg/15min?utm_source=whatsapp_landing'
const BENCHMARK_MAIL = 'mailto:contact@channelad.io?subject=Benchmark%20canales%20WhatsApp%20ES'

const fadeUp = {
  hidden: { opacity: 0, y: 32 },
  visible: (i = 0) => ({
    opacity: 1, y: 0,
    transition: { duration: 0.55, delay: i * 0.08, ease: [0.25, 0.46, 0.45, 0.94] },
  }),
}
const staggerContainer = { hidden: {}, visible: { transition: { staggerChildren: 0.07, delayChildren: 0.05 } } }
const staggerItem = {
  hidden: { opacity: 0, y: 24 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.45, ease: [0.25, 0.46, 0.45, 0.94] } },
}

function Section({ children, style, id }) {
  const ref = useRef(null)
  const isInView = useInView(ref, { once: true, margin: '-60px' })
  return (
    <motion.section
      ref={ref}
      id={id}
      style={style}
      initial="hidden"
      animate={isInView ? 'visible' : 'hidden'}
      variants={staggerContainer}
    >
      {children}
    </motion.section>
  )
}

/* ── DATA ─────────────────────────────────────────────── */
const PAIN_CARDS = [
  {
    n: '01',
    title: 'Cobras tarde o no cobras',
    body: 'Acuerdo por DM, mitad por adelantado si tienes suerte, el resto cuando "salga la factura". Y a veces ni eso.',
  },
  {
    n: '02',
    title: 'No sabes qué pedir',
    body: 'CPMs al ojo. Acabas regalando una mención que valdría 3× más en otro canal del mismo tamaño.',
  },
  {
    n: '03',
    title: 'Quemas tu lista',
    body: 'Aceptas el patrocinio que paga porque no llega otra cosa. Cada anuncio cutre te cuesta suscriptores que tardaste meses en captar.',
  },
]

const SOLUTION_CARDS = [
  {
    Icon: Lock,
    title: 'Escrow antes de hablar',
    body: 'Stripe Connect retiene el 100% del precio antes de que aceptes. Cero acuerdos por DM sin papel.',
  },
  {
    Icon: FileBarChart2,
    title: 'Tu precio, íntegro',
    body: 'Comisión 0% para ti. Channelad cobra el 20% al anunciante encima de tu tarifa. Recibes lo que pones.',
  },
  {
    Icon: ShieldCheck,
    title: 'Tú firmas cada copy',
    body: 'Filtras por nicho, reescribes lo que chirría, rechazas sin penalización. Sin exclusividad, sin contratos de 12 meses.',
  },
]

// 4 steps, cada uno mapeado a una pantalla real del producto.
const HOW_STEPS = [
  {
    n: '01',
    title: 'Tu inbox de propuestas',
    body: 'Anunciantes con KYC ven tu canal en el marketplace. Si encaja, depositan el precio + comisión en escrow Stripe antes de hablar contigo. Aceptas, negocias o rechazas sin penalización.',
    appLabel: 'Inbox',
    sub: '3 propuestas pendientes',
    Demo: DemoCreatorInbox,
  },
  {
    n: '02',
    title: 'Publicas con copy controlado',
    body: 'Apruebas o reescribes el copy antes de publicar. Tracking link único auto-generado para cada anuncio. La verificación se valida sola al alcanzar 3 clicks únicos en 48h.',
    appLabel: 'Campaña activa',
    sub: 'Q4_SaaS · NorthFlow',
    Demo: DemoCreatorPublish,
  },
  {
    n: '03',
    title: 'Tu balance crece con cada deal',
    body: 'Cada campaña verificada libera el escrow a tu balance. Sparkline en vivo, próximo payout calculado, CPM medio comparado con la mediana de tu nicho.',
    appLabel: 'Earnings',
    sub: 'Balance 1.247 €',
    Demo: DemoCreatorEarnings,
  },
  {
    n: '04',
    title: 'Retiro SEPA a tu banco',
    body: 'Eliges cuándo retirar. SEPA Instant a tu cuenta — 1 día hábil. Sin comisiones bancarias, sin retenciones, sin "ajustes contables". 100% del precio que tú fijaste.',
    appLabel: 'Retiro confirmado',
    sub: '312 € · SEPA Instant',
    Demo: DemoCreatorPayout,
  },
]

const FAQS = [
  {
    q: '¿Channelad usa la WhatsApp Business API oficial?',
    a: 'Sí. Integramos con Channel API de Meta (abierto a terceros desde marzo 2026). No hacemos scraping ni nada gris: el admin del canal vincula con OAuth y la verificación se hace con un tracking link público en el canal — no necesitamos acceder al contenido de la audiencia.',
  },
  {
    q: '¿Tengo que ceder datos de mi audiencia?',
    a: 'No. No vemos ni almacenamos números de teléfono de tus suscriptores. Solo métricas agregadas del canal (impresiones, clicks únicos, retención) que ya muestra Meta al admin.',
  },
  {
    q: '¿Cuánto me cobra Channelad?',
    a: 'Cero para el creador. La comisión del 20% se la cobramos al anunciante encima del precio que tú fijas: tú pones 500 €, el anunciante deposita 600 € en escrow, tú recibes 500 € íntegros. Los primeros 150 admins en el founding cohort tienen comisión 18% vitalicia para sus anunciantes — pricing más competitivo, más deals.',
  },
  {
    q: '¿Cuándo me llega el dinero?',
    a: 'El escrow se libera cuando el tracking link valida la publicación (típico 24-48h después de publicar). De tu balance Channelad a tu cuenta SEPA: 1 día hábil. Sin retenciones, sin "ajustes contables", sin net-60.',
  },
  {
    q: '¿Hay tamaño mínimo de canal?',
    a: 'No. Hay anunciantes pagando bien a canales de 800 suscriptores en B2B SaaS o finanzas porque la audiencia es cualificada. Lo que mata el deal es el nicho difuso, no el tamaño.',
  },
  {
    q: '¿Puedo seguir cerrando patrocinios por mi cuenta?',
    a: 'Sin problema. Channelad no pide exclusividad. Es una capa adicional, no un sustituto: las plazas que cierres directamente siguen siendo tuyas al 100%, sin comisión ni reporting obligatorio.',
  },
  {
    q: '¿Por qué un anunciante me preferiría a mí vs Telegram Ads o Meta Ads?',
    a: 'Telegram Ads y Meta Ads son CPM impersonal sin contexto editorial. Tu canal es audiencia cualificada que conoce tu voz: un patrocinio nativo bien escrito convierte 3-5× mejor que una creatividad CPM en feed. Los anunciantes B2B serios lo saben y pagan más por una mención tuya que por 10.000 impresiones broadcast.',
  },
  {
    q: '¿Cuándo lanzáis públicamente?',
    a: 'Beta cerrada para founding partners ahora (100 de 150 plazas ocupadas). Lanzamiento público con marketplace abierto: septiembre 2026. Quien entra antes del lanzamiento mantiene la comisión preferente del 18% para sus anunciantes — para siempre, también cuando el resto pase al 20%.',
  },
]


export default function WhatsAppPage() {
  const [openFaq, setOpenFaq] = useState(null)
  const [activeStep, setActiveStep] = useState(0)

  const faqSchema = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: FAQS.map((f) => ({
      '@type': 'Question',
      name: f.q,
      acceptedAnswer: { '@type': 'Answer', text: f.a },
    })),
  }
  const pageSchema = {
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    name: 'Canales de WhatsApp — Channelad',
    description:
      'Monetiza tu canal de WhatsApp con anunciantes verificados. Escrow Stripe Connect, comisión 0% para el creador, sin exclusividad.',
    url: 'https://channelad.io/whatsapp',
    publisher: { '@type': 'Organization', name: 'Channelad', url: 'https://channelad.io' },
    breadcrumb: {
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Inicio', item: 'https://channelad.io/' },
        { '@type': 'ListItem', position: 2, name: 'WhatsApp', item: 'https://channelad.io/whatsapp' },
      ],
    },
  }

  const reservedPct = Math.round((FOUNDING_RESERVED / FOUNDING_TOTAL) * 100)
  const ActiveDemo = HOW_STEPS[activeStep].Demo

  return (
    // <div>, not <main>: AppLayout already provides the page's <main> landmark.
    <div
      data-testid="whatsapp-landing"
      style={{
        fontFamily: F,
        color: 'var(--text)',
        background:
          'radial-gradient(ellipse 90% 50% at 75% 8%, rgba(37,211,102,0.10) 0%, transparent 55%), radial-gradient(ellipse 60% 40% at 15% 30%, rgba(37,211,102,0.05) 0%, transparent 60%), var(--bg)',
        position: 'relative',
      }}
    >
      <Helmet>
        <script type="application/ld+json">{JSON.stringify(pageSchema)}</script>
        <script type="application/ld+json">{JSON.stringify(faqSchema)}</script>
      </Helmet>
      <SEO
        title="Canales de WhatsApp · publicidad con escrow"
        description="Marketplace para canales privados de WhatsApp en español. Comisión 0% para el creador, escrow Stripe Connect, métricas verificadas. Sin exclusividad."
        path="/whatsapp"
      />

      {/* 1 · HERO — phone con DemoCreatorInbox real */}
      <section style={{ padding: '96px 32px 60px', position: 'relative', overflow: 'hidden' }}>
        <div style={{ maxWidth: 1240, margin: '0 auto', position: 'relative', zIndex: 2 }}>
          <div className="wa-hero-grid" style={{
            display: 'grid', gridTemplateColumns: '1.05fr 1fr',
            gap: 56, alignItems: 'center',
          }}>
            {/* LEFT */}
            <div>
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: 6,
                  background: greenAlpha(0.10), border: `1px solid ${greenAlpha(0.22)}`,
                  borderRadius: 999, padding: '5px 14px', marginBottom: 22,
                  fontSize: 12, fontWeight: 600, color: GREEN,
                }}
              >
                <span style={{
                  width: 7, height: 7, borderRadius: '50%', background: GREEN,
                  boxShadow: `0 0 0 0 ${greenAlpha(0.6)}`, animation: 'wa-hero-pulse 1.8s infinite',
                }} />
                Canales privados de WhatsApp · ES y LATAM
              </motion.div>

              <motion.h1
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.1 }}
                style={{
                  fontFamily: D, fontSize: 'clamp(34px, 5vw, 58px)', fontWeight: 700,
                  letterSpacing: '-0.035em', lineHeight: 1.04, margin: '0 0 18px',
                  color: 'var(--text)',
                }}
              >
                Tu canal de WhatsApp ya tiene<br />
                <RotatingWord
                  words={[
                    'anunciantes\nesperándote',
                    'la atención que vale',
                    'demanda real',
                  ]}
                  interval={2400}
                  gradient="linear-gradient(135deg, #1ea952 0%, #25d366 100%)"
                />.
              </motion.h1>

              <motion.p
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.2 }}
                style={{
                  fontSize: 17, color: 'var(--muted)', lineHeight: 1.65,
                  maxWidth: 540, margin: '0 0 28px',
                }}
              >
                Escrow Stripe antes de cada mención. Tu precio íntegro a SEPA en 72h.{' '}
                <strong style={{ color: GREEN }}>Comisión 0% para ti</strong>. Sin exclusividad.
              </motion.p>

              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.3 }}
                style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 22 }}
              >
                <a
                  href={CAL_LINK}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    display: 'inline-flex', alignItems: 'center', gap: 8,
                    background: GREEN, color: '#fff', textDecoration: 'none',
                    borderRadius: 12, padding: '14px 24px',
                    fontSize: 15, fontWeight: 600,
                    boxShadow: `0 12px 28px -8px ${greenAlpha(0.45)}`,
                    transition: 'transform .2s, background .2s',
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = GREEN_DARK; e.currentTarget.style.transform = 'translateY(-2px)' }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = GREEN; e.currentTarget.style.transform = 'none' }}
                >
                  <MessageCircle size={16} strokeWidth={2.4} /> Cuéntanos cómo lo haces
                </a>
                <Link
                  to="/auth/register"
                  style={{
                    display: 'inline-flex', alignItems: 'center', gap: 8,
                    background: greenAlpha(0.08), color: GREEN, textDecoration: 'none',
                    borderRadius: 12, padding: '14px 22px',
                    fontSize: 15, fontWeight: 600,
                    border: `1px solid ${greenAlpha(0.22)}`,
                    transition: 'background .2s, transform .2s',
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = greenAlpha(0.14); e.currentTarget.style.transform = 'translateY(-1px)' }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = greenAlpha(0.08); e.currentTarget.style.transform = 'none' }}
                >
                  Registrar canal · gratis <ArrowRight size={16} strokeWidth={2.4} />
                </Link>
              </motion.div>

              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.4, duration: 0.5 }}
                style={{
                  fontSize: 12, color: 'var(--muted)',
                  margin: '0 0 22px', fontStyle: 'italic',
                }}
              >
                15 min con el equipo · sin venta, sin compromiso de listar nada
              </motion.p>

              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.45, duration: 0.5 }}
                style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 32 }}
              >
                {[
                  { Icon: Wallet, label: '0% comisión a creadores' },
                  { Icon: Lock, label: 'Escrow Stripe Connect' },
                  { Icon: ShieldCheck, label: 'Métricas verificadas' },
                ].map((p) => (
                  <span key={p.label}
                    style={{
                      display: 'inline-flex', alignItems: 'center', gap: 6,
                      padding: '6px 12px', borderRadius: 999,
                      background: 'var(--surface)', border: '1px solid var(--border)',
                      fontSize: 12, color: 'var(--muted)', fontWeight: 500,
                    }}>
                    <p.Icon size={13} strokeWidth={2} color={GREEN} />{p.label}
                  </span>
                ))}
              </motion.div>

              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.6, duration: 0.5 }}
                style={{
                  display: 'grid', gridTemplateColumns: 'repeat(3, auto)',
                  gap: 32, alignItems: 'baseline',
                }}
              >
                {[
                  { v: '2.500+', l: 'Canales con métricas propias' },
                  { v: <>72<span style={{ fontSize: 16 }}>h</span></>, l: 'Pago tras publicar' },
                  { v: '0%', l: 'Comisión al creador' },
                ].map((s, i) => (
                  <div key={i}>
                    <div style={{
                      fontFamily: D, fontSize: 'clamp(22px, 2.4vw, 28px)', fontWeight: 700,
                      color: GREEN, letterSpacing: '-0.025em', lineHeight: 1,
                      fontVariantNumeric: 'tabular-nums',
                    }}>{s.v}</div>
                    <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 4 }}>{s.l}</div>
                  </div>
                ))}
              </motion.div>
            </div>

            {/* RIGHT — phone con DemoCreatorInbox real */}
            <div className="wa-hero-phone" style={{
              position: 'relative', display: 'flex', justifyContent: 'center',
            }}>
              <motion.div
                initial={{ opacity: 0, y: 30, scale: 0.96 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ duration: 0.7, delay: 0.3, ease: [0.22, 1, 0.36, 1] }}
              >
                <PhoneFrame
                  appLabel="Inbox · Channelad"
                  subLabel="3 propuestas · 1.590 € en escrow"
                  width={340} height={680}
                >
                  <DemoCreatorInbox />
                </PhoneFrame>
              </motion.div>

              {/* Floating balance card */}
              <motion.div
                initial={{ opacity: 0, x: 24, y: 12 }}
                animate={{ opacity: 1, x: 0, y: 0 }}
                transition={{ delay: 0.85, duration: 0.6 }}
                style={{
                  position: 'absolute', right: -10, bottom: 30,
                  background: 'var(--surface)', border: `1px solid ${greenAlpha(0.30)}`,
                  borderRadius: 14, padding: '12px 16px', minWidth: 180,
                  boxShadow: `0 24px 50px -18px ${greenAlpha(0.35)}, 0 6px 16px -4px rgba(0,0,0,0.12)`,
                  zIndex: 4,
                }}
              >
                <div style={{ fontSize: 10, fontWeight: 700, color: GREEN, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 4 }}>
                  Balance disponible
                </div>
                <div style={{
                  fontFamily: D, fontSize: 24, fontWeight: 700, color: 'var(--text)',
                  letterSpacing: '-0.02em', display: 'flex', alignItems: 'baseline', gap: 4,
                }}>
                  1.247 €
                </div>
                <div style={{ fontSize: 11, color: 'var(--muted)', display: 'flex', alignItems: 'center', gap: 4, marginTop: 2 }}>
                  <span style={{ color: GREEN, fontWeight: 700 }}>↑ 22%</span> este mes
                </div>
              </motion.div>
            </div>
          </div>
        </div>

        <style>{`
          @keyframes wa-hero-pulse {
            0%   { box-shadow: 0 0 0 0 ${greenAlpha(0.6)}; }
            70%  { box-shadow: 0 0 0 6px ${greenAlpha(0)}; }
            100% { box-shadow: 0 0 0 0 ${greenAlpha(0)}; }
          }
          @media (max-width: 980px) {
            .wa-hero-grid { grid-template-columns: 1fr !important; gap: 48px !important; }
            .wa-hero-phone { margin-top: 8px; }
          }
        `}</style>
      </section>

      {/* 1.5 · TRUST STRIP — infraestructura verificable */}
      <Section style={{ padding: '20px 48px 50px', background: 'transparent' }}>
        <div style={{ maxWidth: MAX_W, margin: '0 auto' }}>
          <motion.p variants={fadeUp} style={{
            fontSize: 11, fontWeight: 600, textTransform: 'uppercase',
            letterSpacing: '0.14em', color: 'var(--muted)', textAlign: 'center',
            marginBottom: 22,
          }}>
            Operado sobre infraestructura verificable
          </motion.p>
          <motion.div
            variants={staggerContainer}
            style={{
              display: 'flex', justifyContent: 'center', alignItems: 'center',
              flexWrap: 'wrap', gap: 'clamp(20px, 4vw, 48px)',
            }}
          >
            {[
              { name: 'Stripe Connect', sub: 'escrow' },
              { name: 'WhatsApp Channel API', sub: 'Meta · marzo 2026' },
              { name: 'SEPA Instant', sub: '1 día hábil' },
              { name: 'MICHI SOLUCIONS S.L.', sub: 'sociedad española' },
            ].map((item) => (
              <motion.div key={item.name} variants={staggerItem}
                style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  fontSize: 13.5, color: 'var(--text)',
                  fontWeight: 600,
                }}
              >
                <span style={{
                  width: 8, height: 8, borderRadius: '50%',
                  background: GREEN, flexShrink: 0,
                  boxShadow: `0 0 10px ${greenAlpha(0.5)}`,
                }} />
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  <span>{item.name}</span>
                  <span style={{ fontSize: 11, color: 'var(--muted)', fontWeight: 500 }}>{item.sub}</span>
                </div>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </Section>

      {/* 2 · PAIN → SOLUTION */}
      <Section style={{ padding: '90px 48px', background: 'transparent' }}>
        <div style={{ maxWidth: MAX_W, margin: '0 auto' }}>
          <motion.div variants={fadeUp} style={{ textAlign: 'center', marginBottom: 48 }}>
            <p style={{
              fontSize: 11, fontWeight: 600, textTransform: 'uppercase',
              letterSpacing: '0.1em', color: '#ef4444', marginBottom: 12,
            }}>El acuerdo por DM no escala</p>
            <h2 style={{
              fontFamily: D, fontSize: 'clamp(26px, 3.2vw, 38px)', fontWeight: 700,
              letterSpacing: '-0.03em', color: 'var(--text)', maxWidth: 680, margin: '0 auto',
              lineHeight: 1.1,
            }}>
              Cobrar publicidad en WhatsApp hoy es un acto de fe.
            </h2>
          </motion.div>

          <div className="wa-grid-3" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 18, marginBottom: 56 }}>
            {PAIN_CARDS.map((p) => (
              <motion.div key={p.title} variants={staggerItem}
                whileHover={{ y: -4 }}
                style={{
                  background: 'var(--surface)', border: '1px solid var(--border)',
                  borderRadius: 18, padding: '28px',
                  position: 'relative', overflow: 'hidden',
                  transition: 'border-color .25s, box-shadow .25s',
                }}
                onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'rgba(239,68,68,0.25)'; e.currentTarget.style.boxShadow = '0 18px 50px -22px rgba(239,68,68,0.25)' }}
                onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.boxShadow = 'none' }}
              >
                <div style={{
                  position: 'absolute', top: 14, right: 18,
                  fontFamily: D, fontSize: 38, fontWeight: 700,
                  color: 'rgba(239,68,68,0.10)', lineHeight: 1, letterSpacing: '-0.04em',
                }}>{p.n}</div>
                <div style={{
                  width: 36, height: 36, borderRadius: 10,
                  background: 'rgba(239,68,68,0.10)', color: '#ef4444',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  marginBottom: 14,
                }}>
                  <XCircle size={20} strokeWidth={2} />
                </div>
                <h3 style={{
                  fontFamily: D, fontSize: 17, fontWeight: 700,
                  letterSpacing: '-0.015em', color: 'var(--text)', margin: '0 0 8px',
                }}>{p.title}</h3>
                <p style={{ fontSize: 14, color: 'var(--muted)', lineHeight: 1.6, margin: 0 }}>{p.body}</p>
              </motion.div>
            ))}
          </div>

          <motion.div variants={fadeUp} style={{ display: 'flex', justifyContent: 'center', marginBottom: 24 }}>
            <div style={{
              width: 44, height: 44, borderRadius: '50%',
              background: greenAlpha(0.10), border: `1px solid ${greenAlpha(0.22)}`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: GREEN,
            }}>
              <ArrowRight size={20} strokeWidth={2.4} style={{ transform: 'rotate(90deg)' }} />
            </div>
          </motion.div>

          <motion.div variants={fadeUp} style={{ textAlign: 'center', marginBottom: 32 }}>
            <p style={{
              fontSize: 11, fontWeight: 600, textTransform: 'uppercase',
              letterSpacing: '0.1em', color: GREEN, marginBottom: 12,
            }}>Lo que cambia con Channelad</p>
            <h2 style={{
              fontFamily: D, fontSize: 'clamp(22px, 2.6vw, 30px)', fontWeight: 700,
              letterSpacing: '-0.025em', color: 'var(--text)', margin: '0 auto', maxWidth: 620,
              lineHeight: 1.15,
            }}>
              Mismo trato, pero auditable, automatizado y a tu favor.
            </h2>
          </motion.div>

          <div className="wa-grid-3" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 18 }}>
            {SOLUTION_CARDS.map((s) => (
              <motion.div key={s.title} variants={staggerItem}
                whileHover={{ y: -4 }}
                style={{
                  background: 'var(--surface)', border: `1px solid ${greenAlpha(0.18)}`,
                  borderRadius: 18, padding: '26px',
                  transition: 'border-color .25s, box-shadow .25s',
                }}
                onMouseEnter={(e) => { e.currentTarget.style.borderColor = greenAlpha(0.35); e.currentTarget.style.boxShadow = `0 18px 50px -22px ${greenAlpha(0.30)}` }}
                onMouseLeave={(e) => { e.currentTarget.style.borderColor = greenAlpha(0.18); e.currentTarget.style.boxShadow = 'none' }}
              >
                <div style={{
                  width: 40, height: 40, borderRadius: 12,
                  background: greenAlpha(0.10), color: GREEN,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  marginBottom: 14,
                }}>
                  <s.Icon size={20} strokeWidth={2} />
                </div>
                <h3 style={{
                  fontFamily: D, fontSize: 16, fontWeight: 700,
                  letterSpacing: '-0.015em', color: 'var(--text)', margin: '0 0 8px',
                }}>{s.title}</h3>
                <p style={{ fontSize: 14, color: 'var(--muted)', lineHeight: 1.6, margin: 0 }}>{s.body}</p>
              </motion.div>
            ))}
          </div>

          <style>{`
            @media (max-width: 900px) { .wa-grid-3 { grid-template-columns: 1fr 1fr !important; } }
            @media (max-width: 600px) { .wa-grid-3 { grid-template-columns: 1fr !important; } }
          `}</style>
        </div>
      </Section>

      {/* 3 · CHANNEL CALCULATOR — followers + reactions + format → precio/ingreso */}
      <ChannelCalculator variant="landing" background="transparent" initialRole="creator" initialState={{ platform: 'whatsapp' }} />

      {/* 4 · CÓMO FUNCIONA — phone real cambiando con cada step */}
      <Section style={{ padding: '110px 48px', background: 'var(--bg2)' }}>
        <div style={{ maxWidth: MAX_W, margin: '0 auto' }}>
          <motion.div variants={fadeUp} style={{ textAlign: 'center', marginBottom: 56 }}>
            <p style={{
              fontSize: 11, fontWeight: 600, textTransform: 'uppercase',
              letterSpacing: '0.1em', color: GREEN, marginBottom: 12,
            }}>Cómo funciona en WhatsApp</p>
            <h2 style={{
              fontFamily: D, fontSize: 'clamp(26px, 3.2vw, 38px)', fontWeight: 700,
              letterSpacing: '-0.03em', color: 'var(--text)', maxWidth: 720, margin: '0 auto',
              lineHeight: 1.1,
            }}>
              Cuatro pantallas. Una propuesta entra, un pago sale.
            </h2>
          </motion.div>

          <div className="wa-how-grid" style={{
            display: 'grid', gridTemplateColumns: '1fr 1.05fr', gap: 56, alignItems: 'center',
          }}>
            {/* LEFT: phone con demo activo (cambia con el step). Sin AnimatePresence
                porque dentro de una Section con variants entra en conflicto y el
                exit nunca completa — el demo se queda atascado en el primer mount. */}
            <div style={{ display: 'flex', justifyContent: 'center', position: 'relative' }}>
              <motion.div
                key={activeStep}
                initial={{ opacity: 0, y: 14, scale: 0.97 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
              >
                <PhoneFrame
                  appLabel={HOW_STEPS[activeStep].appLabel}
                  subLabel={HOW_STEPS[activeStep].sub}
                  width={340} height={680}
                >
                  <ActiveDemo />
                </PhoneFrame>
              </motion.div>
            </div>

            {/* RIGHT: steps interactivos */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {HOW_STEPS.map((step, i) => {
                const active = i === activeStep
                return (
                  <motion.button
                    key={step.n}
                    type="button"
                    variants={staggerItem}
                    onMouseEnter={() => setActiveStep(i)}
                    onFocus={() => setActiveStep(i)}
                    onClick={() => setActiveStep(i)}
                    whileHover={{ x: 4 }}
                    style={{
                      textAlign: 'left', cursor: 'pointer',
                      background: active ? greenAlpha(0.06) : 'var(--surface)',
                      border: `1px solid ${active ? greenAlpha(0.35) : 'var(--border)'}`,
                      borderRadius: 16, padding: '20px 22px',
                      display: 'flex', gap: 16, alignItems: 'flex-start',
                      transition: 'all .25s',
                      boxShadow: active ? `0 14px 36px -18px ${greenAlpha(0.30)}` : 'none',
                    }}
                  >
                    <div style={{
                      flexShrink: 0,
                      width: 40, height: 40, borderRadius: 12,
                      background: active ? GREEN : greenAlpha(0.10),
                      color: active ? '#fff' : GREEN,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontFamily: D, fontWeight: 700, fontSize: 14,
                      transition: 'background .25s, color .25s',
                    }}>{step.n}</div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <h3 style={{
                        fontFamily: D, fontSize: 16, fontWeight: 700,
                        color: 'var(--text)', margin: '0 0 6px', lineHeight: 1.2,
                      }}>{step.title}</h3>
                      <p style={{ fontSize: 13.5, color: 'var(--muted)', lineHeight: 1.6, margin: 0 }}>
                        {step.body}
                      </p>
                    </div>
                  </motion.button>
                )
              })}
            </div>
          </div>

          <style>{`
            @media (max-width: 980px) {
              .wa-how-grid { grid-template-columns: 1fr !important; gap: 40px !important; }
            }
          `}</style>
        </div>
      </Section>

      {/* 5 · ESCROW FLOW (reused) */}
      <EscrowFlowAnimation
        background="transparent"
        sectionId="wa-escrow"
        eyebrow="Tu dinero, blindado"
        title="Cobras antes de mover un dedo."
        subtitle="El anunciante deposita el 100% del precio que tú pones en escrow Stripe Connect antes de que aceptes la propuesta. Tú publicas, el tracking link verifica, los fondos pasan a tu balance."
        variant="creator"
      />

      {/* 6 · FOUNDING COHORT */}
      <Section style={{ padding: '90px 48px', background: 'transparent' }}>
        <div style={{ maxWidth: 920, margin: '0 auto' }}>
          <motion.div variants={fadeUp}
            style={{
              background: `linear-gradient(140deg, ${greenAlpha(0.10)} 0%, transparent 70%), var(--surface)`,
              border: `1px solid ${greenAlpha(0.22)}`,
              borderRadius: 24,
              padding: 'clamp(32px, 4vw, 52px)',
              position: 'relative',
              overflow: 'hidden',
              boxShadow: `0 30px 80px -36px ${greenAlpha(0.40)}`,
            }}
          >
            <div style={{
              position: 'absolute', top: -120, right: -80, width: 320, height: 320,
              background: `radial-gradient(circle, ${greenAlpha(0.18)}, transparent 60%)`,
              pointerEvents: 'none',
            }} />

            <div className="wa-founding-grid" style={{
              display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: 36, alignItems: 'center',
              position: 'relative',
            }}>
              <div>
                <p style={{
                  fontSize: 11, fontWeight: 600, color: GREEN,
                  textTransform: 'uppercase', letterSpacing: '0.12em', margin: '0 0 14px',
                  display: 'inline-flex', alignItems: 'center', gap: 8,
                }}>
                  <Sparkles size={13} strokeWidth={2.4} /> Founding cohort · {FOUNDING_TOTAL} plazas
                </p>
                <h2 style={{
                  fontFamily: D, fontSize: 'clamp(24px, 3vw, 34px)', fontWeight: 700,
                  letterSpacing: '-0.03em', color: 'var(--text)', margin: '0 0 14px',
                  lineHeight: 1.15,
                }}>
                  Los primeros 150 admins entran con comisión preferente vitalicia.
                </h2>
                <p style={{
                  fontSize: 15, color: 'var(--muted)', lineHeight: 1.65,
                  margin: '0 0 24px',
                }}>
                  Cada anunciante que cierre contigo paga 18% de comisión en vez del 20% estándar — para
                  siempre. Pricing más competitivo significa más deals que cierran. A cambio, un caso
                  documentado y feedback honesto en las primeras semanas.
                </p>

                <ul style={{
                  listStyle: 'none', padding: 0, margin: '0 0 28px',
                  display: 'flex', flexDirection: 'column', gap: 10,
                }}>
                  {[
                    'Comisión 18% vitalicia para tus anunciantes (vs 20% estándar)',
                    'Onboarding personal, sin formularios',
                    'Caso de uso documentado tras los primeros 3 deals (con tu aprobación)',
                  ].map((item) => (
                    <li key={item} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, fontSize: 14, color: 'var(--text)', lineHeight: 1.55 }}>
                      <span style={{
                        width: 20, height: 20, borderRadius: '50%',
                        background: greenAlpha(0.15), color: GREEN,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        flexShrink: 0, marginTop: 1,
                      }}>
                        <CheckCircle2 size={12} strokeWidth={2.6} />
                      </span>
                      {item}
                    </li>
                  ))}
                </ul>

                <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                  <a
                    href={CAL_LINK}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      display: 'inline-flex', alignItems: 'center', gap: 8,
                      background: GREEN, color: '#fff', textDecoration: 'none',
                      borderRadius: 12, padding: '13px 22px',
                      fontSize: 15, fontWeight: 600,
                      boxShadow: `0 12px 28px -10px ${greenAlpha(0.50)}`,
                      transition: 'transform .2s, background .2s',
                    }}
                    onMouseEnter={(e) => { e.currentTarget.style.background = GREEN_DARK; e.currentTarget.style.transform = 'translateY(-1px)' }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = GREEN; e.currentTarget.style.transform = 'none' }}
                  >
                    <Calendar size={16} strokeWidth={2.4} /> Reservar 15 min
                  </a>
                  <a
                    href={BENCHMARK_MAIL}
                    style={{
                      display: 'inline-flex', alignItems: 'center', gap: 8,
                      background: 'var(--bg)', color: 'var(--text)', textDecoration: 'none',
                      borderRadius: 12, padding: '13px 22px',
                      fontSize: 15, fontWeight: 600,
                      border: '1px solid var(--border)',
                    }}
                  >
                    Quiero el benchmark ES
                  </a>
                </div>
              </div>

              <div style={{
                background: 'var(--bg)', border: '1px solid var(--border)',
                borderRadius: 18, padding: 22,
                display: 'flex', flexDirection: 'column', gap: 14,
              }}>
                <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                    Plazas reservadas
                  </span>
                  <span style={{ fontSize: 11, color: 'var(--muted)' }}>vitalicio</span>
                </div>
                <div style={{
                  fontFamily: D, fontSize: 40, fontWeight: 700, color: 'var(--text)',
                  letterSpacing: '-0.03em', lineHeight: 1, fontVariantNumeric: 'tabular-nums',
                }}>
                  {FOUNDING_RESERVED}
                  <span style={{ color: 'var(--muted)', fontWeight: 500 }}> / {FOUNDING_TOTAL}</span>
                </div>
                <div style={{
                  width: '100%', height: 8, borderRadius: 8,
                  background: 'rgba(255,255,255,0.06)',
                  overflow: 'hidden', position: 'relative',
                }}>
                  <div
                    style={{
                      height: '100%',
                      width: `${Math.max(reservedPct, 3)}%`,
                      background: `linear-gradient(90deg, ${GREEN}, ${GREEN_DARK})`,
                      boxShadow: `0 0 16px ${greenAlpha(0.45)}`,
                    }}
                  />
                </div>
                <div style={{
                  fontSize: 12.5, color: 'var(--muted)', lineHeight: 1.5,
                  borderTop: '1px solid var(--border)', paddingTop: 14,
                }}>
                  <strong style={{ color: GREEN }}>Quedan {FOUNDING_TOTAL - FOUNDING_RESERVED} plazas.</strong> Una vez completadas, la comisión estándar 20% pasa a aplicarse a nuevos canales.
                </div>
              </div>
            </div>

            <style>{`
              @media (max-width: 860px) {
                .wa-founding-grid { grid-template-columns: 1fr !important; }
              }
            `}</style>
          </motion.div>
        </div>
      </Section>

      {/* 6.5 · TESTIMONIOS — placeholders honestos hasta que entren los próximos 5 */}
      <Section style={{ padding: '90px 48px', background: 'var(--bg2)' }}>
        <div style={{ maxWidth: MAX_W, margin: '0 auto' }}>
          <motion.div variants={fadeUp} style={{ textAlign: 'center', marginBottom: 40 }}>
            <p style={{
              fontSize: 11, fontWeight: 600, color: GREEN,
              textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: 12,
            }}>
              Próximos testimonios · founding #{FOUNDING_RESERVED + 1}–#{FOUNDING_RESERVED + 5}
            </p>
            <h2 style={{
              fontFamily: D, fontSize: 'clamp(24px, 2.8vw, 34px)', fontWeight: 700,
              letterSpacing: '-0.025em', color: 'var(--text)', maxWidth: 720, margin: '0 auto',
              lineHeight: 1.15,
            }}>
              Los siguientes 5 admins que entren salen aquí.
            </h2>
            <p style={{
              fontSize: 14.5, color: 'var(--muted)', lineHeight: 1.6,
              maxWidth: 580, margin: '14px auto 0',
            }}>
              Con su canal, su nicho y la cifra real de su primera campaña cerrada. No inventamos
              testimonios hasta tenerlos firmados.
            </p>
          </motion.div>

          <div className="wa-testi-grid" style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
            gap: 12,
            marginBottom: 28,
          }}>
            {[0, 1, 2, 3, 4].map((i) => {
              const slot = FOUNDING_RESERVED + 1 + i
              return (
                <motion.a
                  key={slot}
                  href={CAL_LINK}
                  target="_blank"
                  rel="noopener noreferrer"
                  variants={staggerItem}
                  whileHover={{ y: -4 }}
                  style={{
                    background: 'var(--surface)',
                    border: `1px dashed ${greenAlpha(0.30)}`,
                    borderRadius: 16, padding: '20px 18px',
                    textDecoration: 'none', color: 'inherit',
                    display: 'flex', flexDirection: 'column', gap: 10,
                    transition: 'border-color .25s, box-shadow .25s',
                    cursor: 'pointer',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = greenAlpha(0.55)
                    e.currentTarget.style.boxShadow = `0 18px 50px -22px ${greenAlpha(0.30)}`
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = greenAlpha(0.30)
                    e.currentTarget.style.boxShadow = 'none'
                  }}
                >
                  <span style={{
                    display: 'inline-flex', alignItems: 'center', gap: 6,
                    fontSize: 10, fontWeight: 700, color: GREEN,
                    letterSpacing: '0.08em', textTransform: 'uppercase',
                  }}>
                    <span style={{
                      width: 6, height: 6, borderRadius: '50%', background: GREEN,
                    }} />
                    Plaza #{slot}
                  </span>
                  <div style={{
                    fontSize: 12.5, color: 'var(--muted)', lineHeight: 1.5,
                    fontStyle: 'italic', minHeight: 56,
                  }}>
                    "Aquí va tu testimonio: tu canal, tu nicho y la cifra real cerrada."
                  </div>
                  <div style={{
                    fontSize: 11, color: 'var(--text)', fontWeight: 600,
                    paddingTop: 8, borderTop: '1px solid var(--border)',
                  }}>
                    [Tu nombre] · [tu canal]<br />
                    <span style={{ color: 'var(--muted)', fontWeight: 500 }}>[X] suscriptores · [nicho]</span>
                  </div>
                </motion.a>
              )
            })}
          </div>

          <div style={{ textAlign: 'center' }}>
            <a
              href={CAL_LINK}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 8,
                background: GREEN, color: '#fff', textDecoration: 'none',
                padding: '12px 22px', borderRadius: 12,
                fontSize: 14, fontWeight: 600,
                boxShadow: `0 12px 28px -10px ${greenAlpha(0.45)}`,
              }}
            >
              <MessageCircle size={15} strokeWidth={2.4} /> Quiero reservar la mía
            </a>
          </div>

        </div>
      </Section>

      {/* 7 · FAQ */}
      <Section style={{ padding: '90px 48px 110px', background: 'transparent' }}>
        <div style={{ maxWidth: 720, margin: '0 auto' }}>
          <motion.div variants={fadeUp} style={{ textAlign: 'center', marginBottom: 40 }}>
            <p style={{ fontSize: 11, fontWeight: 600, color: GREEN, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 12 }}>FAQ</p>
            <h2 style={{ fontFamily: D, fontSize: 'clamp(24px, 2.8vw, 34px)', fontWeight: 700, letterSpacing: '-0.025em', color: 'var(--text)' }}>
              Lo que admins de canales WhatsApp suelen preguntarme primero
            </h2>
          </motion.div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {FAQS.map((faq, i) => (
              <motion.div key={i} variants={staggerItem} style={{
                background: 'var(--surface)',
                border: `1px solid ${openFaq === i ? greenAlpha(0.25) : 'var(--border)'}`,
                borderRadius: 14, overflow: 'hidden', transition: 'border-color .2s',
              }}>
                <button
                  onClick={() => setOpenFaq(openFaq === i ? null : i)}
                  aria-expanded={openFaq === i}
                  aria-controls={`wa-faq-panel-${i}`}
                  id={`wa-faq-trigger-${i}`}
                  style={{
                    width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    padding: '18px 22px', background: 'transparent', border: 'none', cursor: 'pointer', textAlign: 'left',
                  }}
                >
                  <span style={{ fontSize: 15, fontWeight: 500, color: openFaq === i ? GREEN : 'var(--text)', fontFamily: F }}>{faq.q}</span>
                  <motion.svg animate={{ rotate: openFaq === i ? 45 : 0 }} transition={{ duration: 0.3 }}
                    width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
                    style={{ color: openFaq === i ? GREEN : 'var(--muted)', flexShrink: 0, marginLeft: 16 }}>
                    <path d="M12 5v14M5 12h14"/>
                  </motion.svg>
                </button>
                <AnimatePresence>
                  {openFaq === i && (
                    <motion.div
                      id={`wa-faq-panel-${i}`}
                      role="region"
                      aria-labelledby={`wa-faq-trigger-${i}`}
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.3, ease: [0.25, 0.46, 0.45, 0.94] }}
                      style={{ overflow: 'hidden' }}
                    >
                      <div style={{ padding: '0 22px 18px' }}>
                        <p style={{ fontSize: 14, color: 'var(--muted)', lineHeight: 1.7, margin: 0 }}>{faq.a}</p>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            ))}
          </div>
        </div>
      </Section>

      {/* 8 · FINAL CTA */}
      <Section style={{ padding: '0 48px 110px', background: 'transparent' }}>
        <motion.div variants={fadeUp} style={{
          maxWidth: MAX_W, margin: '0 auto',
          background: 'linear-gradient(135deg, #052e16 0%, #064e3b 50%, #052e16 100%)',
          border: `1px solid ${greenAlpha(0.15)}`,
          borderRadius: 24, padding: 'clamp(40px, 5vw, 64px) clamp(28px, 4vw, 56px)',
          textAlign: 'center', position: 'relative', overflow: 'hidden',
        }}>
          <h2 style={{
            fontFamily: D, fontSize: 'clamp(24px, 3.2vw, 36px)', fontWeight: 700,
            color: '#fff', margin: '0 0 14px', letterSpacing: '-0.025em', lineHeight: 1.15,
          }}>
            Tu lista no es tráfico. Cobra como tal.
          </h2>
          <p style={{
            fontSize: 16, color: 'rgba(255,255,255,0.7)', lineHeight: 1.65,
            maxWidth: 540, margin: '0 auto 28px',
          }}>
            Una llamada de 15 minutos para entender si encaja para tu canal. Sin pitch, sin tarjeta,
            sin compromiso de listar nada.
          </p>
          <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
            <a
              href={CAL_LINK}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 8,
                background: GREEN, color: '#fff', textDecoration: 'none',
                padding: '14px 28px', borderRadius: 12,
                fontWeight: 600, fontSize: 15,
                boxShadow: `0 0 30px ${greenAlpha(0.35)}`,
              }}
            >
              <Calendar size={16} strokeWidth={2.4} /> Reservar llamada
            </a>
            <Link
              to="/auth/register"
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 8,
                background: 'rgba(255,255,255,0.06)', color: '#fff', textDecoration: 'none',
                padding: '14px 24px', borderRadius: 12,
                fontWeight: 600, fontSize: 15,
                border: '1px solid rgba(255,255,255,0.12)',
              }}
            >
              Registrar canal · gratis <ArrowRight size={16} strokeWidth={2.4} />
            </Link>
          </div>
        </motion.div>
      </Section>

      <FounderWaitlistPromoBlock context="whatsapp" />

      <CrossLinks exclude="/whatsapp" />
    </div>
  )
}
