import React, { useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { Helmet } from 'react-helmet-async'
import { motion, useInView, AnimatePresence } from 'framer-motion'
import {
  ArrowRight, CheckCircle2, Calendar, MessageCircle,
  Sparkles, Percent, Headphones, FileText, GitBranch, Quote,
} from 'lucide-react'
import SEO from '../../components/SEO'
import CrossLinks from '../../components/landing/CrossLinks'
import ChannelOnePromoBlock from '../../components/landing/ChannelOnePromoBlock'
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

const CAL_LINK = 'https://cal.com/rafa-ferrer-xnpskg/15min?utm_source=founding_landing'
const CONTACT_MAIL = 'mailto:contact@channelad.io?subject=Founding%20cohort%20Channelad'

const fadeUp = {
  hidden: { opacity: 0, y: 30 },
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
  const inView = useInView(ref, { once: true, margin: '-60px' })
  return (
    <motion.section
      ref={ref}
      id={id}
      style={style}
      initial="hidden"
      animate={inView ? 'visible' : 'hidden'}
      variants={staggerContainer}
    >
      {children}
    </motion.section>
  )
}

const BENEFITS = [
  {
    Icon: Percent,
    title: 'Comisión 18% vitalicia',
    body: 'Tus anunciantes pagan 18% en vez del 20% estándar — para siempre, mientras tu canal siga activo. Tarifas más competitivas significan más propuestas que cierran.',
  },
  {
    Icon: Headphones,
    title: 'Onboarding personal',
    body: 'Sin formularios ni colas de soporte. El equipo te acompaña en la vinculación del canal y activa tu primera campaña contigo, paso a paso.',
  },
  {
    Icon: FileText,
    title: 'Tu caso, documentado',
    body: 'Tras tus primeros 3 deals y con tu aprobación, documentamos tu caso real — cifras incluidas. Aparece en las landings de Channelad como prueba social.',
  },
  {
    Icon: GitBranch,
    title: 'Voz en el roadmap',
    body: 'Tu feedback de las primeras semanas pesa. Lo que pidan los founding partners se prioriza antes que cualquier petición posterior vía soporte.',
  },
]

const WE_ASK = [
  'Feedback honesto en las primeras semanas — qué falla, qué falta, qué sobra.',
  'Disposición a cerrar tus primeras campañas reales por la plataforma.',
  'Permitir que documentemos tu caso tras 3 deals (siempre con tu aprobación previa).',
]

const COMPARE_ROWS = [
  { label: 'Comisión al anunciante', founding: '18% · vitalicio', standard: '20%' },
  { label: 'Onboarding', founding: 'Personal 1:1', standard: 'Self-service' },
  { label: 'Caso documentado en landings', founding: 'Sí', standard: 'No' },
  { label: 'Prioridad en el roadmap', founding: 'Sí', standard: 'Vía soporte' },
  { label: 'Coste para el creador', founding: '0 €', standard: '0 €' },
  { label: 'Exclusividad / permanencia', founding: 'Ninguna', standard: 'Ninguna' },
]

// Pantallas reales del producto — lo que el founding partner usa desde el día 1.
const PRODUCT_SCREENS = [
  {
    n: '01',
    title: 'Tu inbox de propuestas',
    body: 'Anunciantes con KYC te encuentran por nicho y tamaño. Llegan con precio, copy y plazo. Aceptas, negocias o rechazas sin penalización.',
    appLabel: 'Inbox',
    sub: '3 propuestas · 1.590 € en escrow',
    Demo: DemoCreatorInbox,
  },
  {
    n: '02',
    title: 'Publicas con tu copy',
    body: 'Apruebas o reescribes el anuncio. Tracking link único auto-generado. La verificación se valida sola al alcanzar 3 clicks en 48h.',
    appLabel: 'Campaña activa',
    sub: 'Q4_SaaS · NorthFlow',
    Demo: DemoCreatorPublish,
  },
  {
    n: '03',
    title: 'Tu balance crece',
    body: 'Cada campaña verificada libera el escrow a tu balance. Sparkline en vivo, próximo payout calculado, CPM medio comparado con tu nicho.',
    appLabel: 'Earnings',
    sub: 'Balance 1.247 €',
    Demo: DemoCreatorEarnings,
  },
  {
    n: '04',
    title: 'Retiras a tu banco',
    body: 'SEPA Instant a tu cuenta — 1 día hábil. Sin comisiones bancarias, sin retenciones. 100% del precio que tú fijaste.',
    appLabel: 'Retiro confirmado',
    sub: '312 € · SEPA Instant',
    Demo: DemoCreatorPayout,
  },
]

const STEPS = [
  {
    n: '01',
    title: 'Reservas 15 minutos',
    body: 'Una llamada corta con el equipo. Sin pitch: nos cuentas tu canal, te contamos el modelo, vemos juntos si encaja.',
  },
  {
    n: '02',
    title: 'Vinculas tu canal',
    body: 'Si encaja, vinculas el canal de WhatsApp (o Telegram / Discord). Verificación con tracking link en 5 minutos, sin documentos.',
  },
  {
    n: '03',
    title: 'Entras en el cohort',
    body: 'Quedas registrado como founding partner: 18% vitalicio fijado, acceso al toolkit y a la línea directa con el equipo.',
  },
  {
    n: '04',
    title: 'Activamos tu primera campaña',
    body: 'El equipo gestiona contigo el primer deal de principio a fin. A partir de ahí, el marketplace funciona solo.',
  },
]

const FAQS = [
  {
    q: '¿El 18% lo pago yo o el anunciante?',
    a: 'El anunciante, siempre. Channelad nunca cobra comisión al creador: tú recibes el 100% del precio que fijas. La comisión (18% founding vs 20% estándar) se suma encima de tu precio y la paga quien anuncia. Una comisión más baja hace tus tarifas más competitivas, así que cierras más deals.',
  },
  {
    q: '¿Hasta cuándo dura el "vitalicio"?',
    a: 'Mientras tu canal siga activo en Channelad. No hay renovación, no hay letra pequeña, no hay fecha de caducidad. Si entras como founding partner, tus anunciantes pagan 18% el primer mes y el año diez.',
  },
  {
    q: '¿Qué pasa cuando se ocupen las 150 plazas?',
    a: `Actualmente hay ${FOUNDING_RESERVED} de ${FOUNDING_TOTAL} reservadas. Cuando se completen, la comisión para canales nuevos pasa al 20% estándar. Los ${FOUNDING_TOTAL} founding partners mantienen su 18% para siempre — esa es toda la ventaja de entrar antes.`,
  },
  {
    q: '¿Cuánto cuesta ser founding partner?',
    a: 'Cero. El founding cohort es gratis, igual que el resto de la plataforma para creadores. No hay fee de alta, ni cuota mensual, ni coste oculto. Lo que pedimos no es dinero — es feedback y disposición a cerrar tus primeras campañas reales.',
  },
  {
    q: '¿Y si entro y no me convence?',
    a: 'Te vas cuando quieras, sin penalización. No hay permanencia ni exclusividad: puedes seguir cerrando patrocinios por tu cuenta o con otras plataformas en paralelo. Channelad es una capa más, no un contrato que te ate.',
  },
  {
    q: '¿Tengo que dejar que publiquéis mi caso sí o sí?',
    a: 'No. Documentar tu caso siempre requiere tu aprobación previa — texto y cifras incluidos. Puedes ser founding partner y mantener tu caso totalmente privado. La documentación es una opción que te ofrecemos, no una obligación.',
  },
]

export default function FoundingPage() {
  const [openFaq, setOpenFaq] = useState(null)
  const [activeScreen, setActiveScreen] = useState(0)
  const reservedPct = Math.round((FOUNDING_RESERVED / FOUNDING_TOTAL) * 100)
  const remaining = FOUNDING_TOTAL - FOUNDING_RESERVED
  const ActiveDemo = PRODUCT_SCREENS[activeScreen].Demo

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
    name: 'Founding cohort — Channelad',
    description: `Los primeros ${FOUNDING_TOTAL} admins entran con comisión 18% vitalicia. ${remaining} plazas disponibles.`,
    url: 'https://channelad.io/founding',
    publisher: { '@type': 'Organization', name: 'Channelad', url: 'https://channelad.io' },
    breadcrumb: {
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Inicio', item: 'https://channelad.io/' },
        { '@type': 'ListItem', position: 2, name: 'Founding cohort', item: 'https://channelad.io/founding' },
      ],
    },
  }

  return (
    // <div>, not <main>: AppLayout already provides the page's <main> landmark.
    <div
      data-testid="founding-page"
      style={{
        fontFamily: F,
        color: 'var(--text)',
        background:
          'radial-gradient(ellipse 90% 50% at 70% 6%, rgba(37,211,102,0.10) 0%, transparent 55%), var(--bg)',
        position: 'relative',
      }}
    >
      <Helmet>
        <script type="application/ld+json">{JSON.stringify(pageSchema)}</script>
        <script type="application/ld+json">{JSON.stringify(faqSchema)}</script>
      </Helmet>
      <SEO
        title="Founding cohort · comisión 18% vitalicia"
        description={`Los primeros ${FOUNDING_TOTAL} admins de canales privados entran con comisión 18% vitalicia para sus anunciantes. ${remaining} plazas disponibles. Sin coste, sin permanencia.`}
        path="/founding"
      />

      {/* 1 · HERO — texto + phone con DemoCreatorEarnings */}
      <section style={{ padding: '100px 32px 60px', position: 'relative', overflow: 'hidden' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto' }}>
          <div className="fd-hero-grid" style={{
            display: 'grid', gridTemplateColumns: '1.1fr 1fr',
            gap: 52, alignItems: 'center',
          }}>
            {/* LEFT */}
            <div>
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: 7,
                  background: greenAlpha(0.10), border: `1px solid ${greenAlpha(0.24)}`,
                  borderRadius: 999, padding: '5px 14px', marginBottom: 22,
                  fontSize: 12, fontWeight: 600, color: GREEN,
                }}
              >
                <span style={{
                  width: 7, height: 7, borderRadius: '50%', background: GREEN,
                  boxShadow: `0 0 0 0 ${greenAlpha(0.6)}`, animation: 'fd-pulse 1.8s infinite',
                }} />
                Founding cohort · {remaining} plazas disponibles
              </motion.div>

              <motion.h1
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.1 }}
                style={{
                  fontFamily: D, fontSize: 'clamp(34px, 4.6vw, 54px)', fontWeight: 700,
                  letterSpacing: '-0.035em', lineHeight: 1.05, margin: '0 0 18px',
                }}
              >
                Entra entre los primeros {FOUNDING_TOTAL}.{' '}
                <span style={{
                  background: 'linear-gradient(135deg, #1ea952 0%, #25d366 100%)',
                  WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
                  backgroundClip: 'text',
                }}>Fija tu 18% para siempre.</span>
              </motion.h1>

              <motion.p
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.2 }}
                style={{ fontSize: 17, color: 'var(--muted)', lineHeight: 1.65, maxWidth: 520, margin: '0 0 24px' }}
              >
                Los founding partners de Channelad fijan una comisión del 18% para sus anunciantes —
                vitalicia. Cuando se ocupen las {FOUNDING_TOTAL} plazas, los canales nuevos pasan al 20%.
              </motion.p>

              {/* Progreso inline */}
              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.28 }}
                style={{ marginBottom: 26, maxWidth: 420 }}
              >
                <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 8 }}>
                  <span style={{
                    fontFamily: D, fontSize: 17, fontWeight: 700, color: 'var(--text)',
                    fontVariantNumeric: 'tabular-nums',
                  }}>
                    {FOUNDING_RESERVED} <span style={{ color: 'var(--muted)', fontWeight: 500 }}>/ {FOUNDING_TOTAL} reservadas</span>
                  </span>
                  <span style={{ fontSize: 12, fontWeight: 700, color: GREEN }}>{remaining} libres</span>
                </div>
                <div style={{
                  width: '100%', height: 8, borderRadius: 8,
                  background: 'var(--surface)', border: '1px solid var(--border)', overflow: 'hidden',
                }}>
                  <div style={{
                    height: '100%', width: `${reservedPct}%`,
                    background: `linear-gradient(90deg, ${GREEN}, ${GREEN_DARK})`,
                    boxShadow: `0 0 14px ${greenAlpha(0.5)}`,
                  }} />
                </div>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.36 }}
                style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 14 }}
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
                  <Calendar size={16} strokeWidth={2.4} /> Reservar mi plaza · 15 min
                </a>
                <Link
                  to="/whatsapp"
                  style={{
                    display: 'inline-flex', alignItems: 'center', gap: 8,
                    background: greenAlpha(0.08), color: GREEN, textDecoration: 'none',
                    borderRadius: 12, padding: '14px 22px',
                    fontSize: 15, fontWeight: 600,
                    border: `1px solid ${greenAlpha(0.22)}`,
                  }}
                >
                  Ver cómo funciona <ArrowRight size={16} strokeWidth={2.4} />
                </Link>
              </motion.div>

              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.45, duration: 0.5 }}
                style={{ fontSize: 12, color: 'var(--muted)', fontStyle: 'italic', margin: 0 }}
              >
                Sin coste · sin permanencia · sin exclusividad · 15 min sin pitch
              </motion.p>
            </div>

            {/* RIGHT — phone con DemoCreatorEarnings */}
            <div className="fd-hero-phone" style={{ position: 'relative', display: 'flex', justifyContent: 'center' }}>
              <motion.div
                initial={{ opacity: 0, y: 30, scale: 0.96 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ duration: 0.7, delay: 0.3, ease: [0.22, 1, 0.36, 1] }}
              >
                <PhoneFrame
                  appLabel="Earnings · Channelad"
                  subLabel="Balance 1.247 € · +22% mes"
                  width={336} height={668}
                >
                  <DemoCreatorEarnings />
                </PhoneFrame>
              </motion.div>

              {/* Floating badge — 18% */}
              <motion.div
                initial={{ opacity: 0, x: -20, y: -10 }}
                animate={{ opacity: 1, x: 0, y: 0 }}
                transition={{ delay: 0.85, duration: 0.55 }}
                style={{
                  position: 'absolute', left: -16, top: 90,
                  background: 'var(--surface)', border: `1px solid ${greenAlpha(0.30)}`,
                  borderRadius: 14, padding: '12px 16px',
                  boxShadow: `0 22px 46px -18px ${greenAlpha(0.35)}`,
                  zIndex: 4,
                }}
              >
                <div style={{ fontSize: 10, fontWeight: 700, color: GREEN, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 2 }}>
                  Comisión founding
                </div>
                <div style={{
                  fontFamily: D, fontSize: 26, fontWeight: 700, color: 'var(--text)',
                  letterSpacing: '-0.03em', lineHeight: 1,
                }}>
                  18% <span style={{ fontSize: 13, color: 'var(--muted)', fontWeight: 500 }}>vitalicio</span>
                </div>
              </motion.div>
            </div>
          </div>
        </div>

        <style>{`
          @keyframes fd-pulse {
            0%   { box-shadow: 0 0 0 0 ${greenAlpha(0.6)}; }
            70%  { box-shadow: 0 0 0 6px ${greenAlpha(0)}; }
            100% { box-shadow: 0 0 0 0 ${greenAlpha(0)}; }
          }
          @media (max-width: 920px) {
            .fd-hero-grid { grid-template-columns: 1fr !important; gap: 44px !important; }
          }
        `}</style>
      </section>

      {/* 1.5 · TRUST STRIP */}
      <Section style={{ padding: '12px 48px 56px', background: 'transparent' }}>
        <div style={{ maxWidth: MAX_W, margin: '0 auto' }}>
          <motion.p variants={fadeUp} style={{
            fontSize: 11, fontWeight: 600, textTransform: 'uppercase',
            letterSpacing: '0.14em', color: 'var(--muted)', textAlign: 'center', marginBottom: 22,
          }}>
            Operado sobre infraestructura verificable
          </motion.p>
          <motion.div variants={staggerContainer}
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
                style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 13.5, color: 'var(--text)', fontWeight: 600 }}
              >
                <span style={{
                  width: 8, height: 8, borderRadius: '50%', background: GREEN, flexShrink: 0,
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

      {/* 2 · QUÉ INCLUYE */}
      <Section style={{ padding: '72px 48px', background: 'transparent' }}>
        <div style={{ maxWidth: MAX_W, margin: '0 auto' }}>
          <motion.div variants={fadeUp} style={{ textAlign: 'center', marginBottom: 48 }}>
            <p style={{
              fontSize: 11, fontWeight: 600, color: GREEN,
              textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 12,
            }}>Qué incluye</p>
            <h2 style={{
              fontFamily: D, fontSize: 'clamp(26px, 3.2vw, 38px)', fontWeight: 700,
              letterSpacing: '-0.03em', maxWidth: 680, margin: '0 auto', lineHeight: 1.1,
            }}>
              Cuatro ventajas que solo tienen los primeros {FOUNDING_TOTAL}.
            </h2>
          </motion.div>

          <div className="fd-grid-2" style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 18 }}>
            {BENEFITS.map((b, i) => (
              <motion.div key={b.title} variants={staggerItem}
                whileHover={{ y: -4 }}
                style={{
                  background: 'var(--surface)', border: `1px solid ${greenAlpha(0.18)}`,
                  borderRadius: 18, padding: '28px', position: 'relative', overflow: 'hidden',
                  transition: 'border-color .25s, box-shadow .25s',
                }}
                onMouseEnter={(e) => { e.currentTarget.style.borderColor = greenAlpha(0.35); e.currentTarget.style.boxShadow = `0 18px 50px -22px ${greenAlpha(0.30)}` }}
                onMouseLeave={(e) => { e.currentTarget.style.borderColor = greenAlpha(0.18); e.currentTarget.style.boxShadow = 'none' }}
              >
                <div style={{
                  position: 'absolute', top: 14, right: 18,
                  fontFamily: D, fontSize: 38, fontWeight: 700,
                  color: greenAlpha(0.08), lineHeight: 1, letterSpacing: '-0.04em',
                }}>{`0${i + 1}`}</div>
                <div style={{
                  width: 44, height: 44, borderRadius: 12,
                  background: greenAlpha(0.10), color: GREEN,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  marginBottom: 16,
                }}>
                  <b.Icon size={22} strokeWidth={2} />
                </div>
                <h3 style={{
                  fontFamily: D, fontSize: 18, fontWeight: 700,
                  letterSpacing: '-0.015em', margin: '0 0 8px',
                }}>{b.title}</h3>
                <p style={{ fontSize: 14, color: 'var(--muted)', lineHeight: 1.6, margin: 0 }}>{b.body}</p>
              </motion.div>
            ))}
          </div>

          <style>{`@media (max-width: 720px) { .fd-grid-2 { grid-template-columns: 1fr !important; } }`}</style>
        </div>
      </Section>

      {/* 3 · ESTO ES LO QUE USARÁS — phone interactivo con demos reales */}
      <Section style={{ padding: '90px 48px', background: 'var(--bg2)' }}>
        <div style={{ maxWidth: MAX_W, margin: '0 auto' }}>
          <motion.div variants={fadeUp} style={{ textAlign: 'center', marginBottom: 52 }}>
            <p style={{
              fontSize: 11, fontWeight: 600, color: GREEN,
              textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 12,
            }}>Esto es lo que usarás</p>
            <h2 style={{
              fontFamily: D, fontSize: 'clamp(26px, 3.2vw, 38px)', fontWeight: 700,
              letterSpacing: '-0.03em', maxWidth: 700, margin: '0 auto', lineHeight: 1.1,
            }}>
              No es una promesa. Es la plataforma, ya construida.
            </h2>
          </motion.div>

          <div className="fd-product-grid" style={{
            display: 'grid', gridTemplateColumns: '1fr 1.05fr', gap: 56, alignItems: 'center',
          }}>
            {/* LEFT — phone con demo activo */}
            <div style={{ display: 'flex', justifyContent: 'center' }}>
              <motion.div
                key={activeScreen}
                initial={{ opacity: 0, y: 14, scale: 0.97 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
              >
                <PhoneFrame
                  appLabel={PRODUCT_SCREENS[activeScreen].appLabel}
                  subLabel={PRODUCT_SCREENS[activeScreen].sub}
                  width={336} height={668}
                >
                  <ActiveDemo />
                </PhoneFrame>
              </motion.div>
            </div>

            {/* RIGHT — screens interactivas */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {PRODUCT_SCREENS.map((screen, i) => {
                const active = i === activeScreen
                return (
                  <motion.button
                    key={screen.n}
                    type="button"
                    variants={staggerItem}
                    onMouseEnter={() => setActiveScreen(i)}
                    onFocus={() => setActiveScreen(i)}
                    onClick={() => setActiveScreen(i)}
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
                    }}>{screen.n}</div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <h3 style={{
                        fontFamily: D, fontSize: 16, fontWeight: 700,
                        margin: '0 0 6px', lineHeight: 1.2,
                      }}>{screen.title}</h3>
                      <p style={{ fontSize: 13.5, color: 'var(--muted)', lineHeight: 1.6, margin: 0 }}>
                        {screen.body}
                      </p>
                    </div>
                  </motion.button>
                )
              })}
            </div>
          </div>

          <style>{`
            @media (max-width: 980px) {
              .fd-product-grid { grid-template-columns: 1fr !important; gap: 40px !important; }
            }
          `}</style>
        </div>
      </Section>

      {/* 4 · QUÉ PEDIMOS A CAMBIO */}
      <Section style={{ padding: '80px 48px', background: 'transparent' }}>
        <div style={{ maxWidth: 840, margin: '0 auto' }}>
          <motion.div variants={fadeUp} style={{ textAlign: 'center', marginBottom: 36 }}>
            <p style={{
              fontSize: 11, fontWeight: 600, color: GREEN,
              textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 12,
            }}>El trato, claro</p>
            <h2 style={{
              fontFamily: D, fontSize: 'clamp(24px, 2.8vw, 32px)', fontWeight: 700,
              letterSpacing: '-0.025em', maxWidth: 620, margin: '0 auto', lineHeight: 1.15,
            }}>
              No es gratis-gratis. Es un trato — y preferimos decirlo.
            </h2>
            <p style={{
              fontSize: 15, color: 'var(--muted)', lineHeight: 1.6,
              maxWidth: 560, margin: '14px auto 0',
            }}>
              No te cobramos nada. Pero entrar pronto tiene un porqué: nos ayudas a construir bien.
              Esto es lo que esperamos de ti a cambio del 18% vitalicio.
            </p>
          </motion.div>

          <motion.div variants={fadeUp} style={{
            background: 'var(--surface)', border: '1px solid var(--border)',
            borderRadius: 18, padding: 'clamp(24px, 3vw, 32px)',
          }}>
            <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 16 }}>
              {WE_ASK.map((item) => (
                <li key={item} style={{ display: 'flex', alignItems: 'flex-start', gap: 12, fontSize: 15, color: 'var(--text)', lineHeight: 1.55 }}>
                  <span style={{
                    width: 24, height: 24, borderRadius: '50%',
                    background: greenAlpha(0.15), color: GREEN,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    flexShrink: 0, marginTop: 1,
                  }}>
                    <CheckCircle2 size={14} strokeWidth={2.6} />
                  </span>
                  {item}
                </li>
              ))}
            </ul>
          </motion.div>
        </div>
      </Section>

      {/* 5 · COMPARATIVA */}
      <Section style={{ padding: '80px 48px', background: 'var(--bg2)' }}>
        <div style={{ maxWidth: 880, margin: '0 auto' }}>
          <motion.div variants={fadeUp} style={{ textAlign: 'center', marginBottom: 40 }}>
            <p style={{
              fontSize: 11, fontWeight: 600, color: GREEN,
              textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 12,
            }}>Founding vs estándar</p>
            <h2 style={{
              fontFamily: D, fontSize: 'clamp(24px, 2.8vw, 32px)', fontWeight: 700,
              letterSpacing: '-0.025em', lineHeight: 1.15,
            }}>
              La misma plataforma. Mejores condiciones para siempre.
            </h2>
          </motion.div>

          <motion.div variants={fadeUp} style={{
            background: 'var(--surface)', border: '1px solid var(--border)',
            borderRadius: 16, overflow: 'hidden',
          }}>
            <div style={{
              display: 'grid', gridTemplateColumns: '1.4fr 1fr 1fr',
              background: greenAlpha(0.06),
              borderBottom: `1px solid ${greenAlpha(0.20)}`,
            }}>
              <div style={{ padding: '14px 18px' }} />
              <div style={{
                padding: '14px 18px', textAlign: 'center',
                fontFamily: D, fontSize: 13, fontWeight: 700, color: GREEN,
                borderLeft: `1px solid ${greenAlpha(0.15)}`,
              }}>
                Founding<br /><span style={{ fontSize: 10, color: 'var(--muted)', fontWeight: 500 }}>primeros {FOUNDING_TOTAL}</span>
              </div>
              <div style={{
                padding: '14px 18px', textAlign: 'center',
                fontFamily: D, fontSize: 13, fontWeight: 700, color: 'var(--muted)',
                borderLeft: '1px solid var(--border)',
              }}>
                Estándar<br /><span style={{ fontSize: 10, fontWeight: 500 }}>tras lanzamiento</span>
              </div>
            </div>
            {COMPARE_ROWS.map((row, i) => (
              <div key={row.label} style={{
                display: 'grid', gridTemplateColumns: '1.4fr 1fr 1fr',
                borderBottom: i < COMPARE_ROWS.length - 1 ? '1px solid var(--border)' : 'none',
                fontSize: 13.5,
              }}>
                <div style={{ padding: '14px 18px', color: 'var(--text)', fontWeight: 500 }}>{row.label}</div>
                <div style={{
                  padding: '14px 18px', textAlign: 'center',
                  color: GREEN, fontWeight: 700,
                  borderLeft: `1px solid ${greenAlpha(0.15)}`,
                  background: greenAlpha(0.03),
                }}>{row.founding}</div>
                <div style={{
                  padding: '14px 18px', textAlign: 'center',
                  color: 'var(--muted)', fontWeight: 500,
                  borderLeft: '1px solid var(--border)',
                }}>{row.standard}</div>
              </div>
            ))}
          </motion.div>
        </div>
      </Section>

      {/* 6 · CÓMO ENTRAR */}
      <Section style={{ padding: '80px 48px', background: 'transparent' }}>
        <div style={{ maxWidth: MAX_W, margin: '0 auto' }}>
          <motion.div variants={fadeUp} style={{ textAlign: 'center', marginBottom: 48 }}>
            <p style={{
              fontSize: 11, fontWeight: 600, color: GREEN,
              textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 12,
            }}>Cómo entrar</p>
            <h2 style={{
              fontFamily: D, fontSize: 'clamp(26px, 3.2vw, 38px)', fontWeight: 700,
              letterSpacing: '-0.03em', lineHeight: 1.1,
            }}>
              De la llamada al cohort, en cuatro pasos.
            </h2>
          </motion.div>

          <div className="fd-steps" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16 }}>
            {STEPS.map((s, i) => (
              <motion.div key={s.n} variants={staggerItem}
                style={{
                  background: 'var(--surface)', border: '1px solid var(--border)',
                  borderRadius: 16, padding: '24px', position: 'relative',
                }}
              >
                {i < STEPS.length - 1 && (
                  <div className="fd-step-arrow" style={{
                    position: 'absolute', right: -12, top: '50%', transform: 'translateY(-50%)',
                    color: greenAlpha(0.4), zIndex: 2,
                  }}>
                    <ArrowRight size={18} strokeWidth={2.4} />
                  </div>
                )}
                <div style={{
                  width: 34, height: 34, borderRadius: 9,
                  background: greenAlpha(0.10), color: GREEN,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontFamily: D, fontWeight: 700, fontSize: 13, marginBottom: 14,
                }}>{s.n}</div>
                <h3 style={{
                  fontFamily: D, fontSize: 15, fontWeight: 700,
                  margin: '0 0 8px', lineHeight: 1.2,
                }}>{s.title}</h3>
                <p style={{ fontSize: 13, color: 'var(--muted)', lineHeight: 1.6, margin: 0 }}>{s.body}</p>
              </motion.div>
            ))}
          </div>

          <style>{`
            @media (max-width: 1024px) {
              .fd-steps { grid-template-columns: 1fr 1fr !important; }
              .fd-step-arrow { display: none; }
            }
            @media (max-width: 560px) { .fd-steps { grid-template-columns: 1fr !important; } }
          `}</style>
        </div>
      </Section>

      {/* 7 · FAQ */}
      <Section style={{ padding: '80px 48px', background: 'var(--bg2)' }}>
        <div style={{ maxWidth: 720, margin: '0 auto' }}>
          <motion.div variants={fadeUp} style={{ textAlign: 'center', marginBottom: 40 }}>
            <p style={{ fontSize: 11, fontWeight: 600, color: GREEN, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 12 }}>FAQ</p>
            <h2 style={{ fontFamily: D, fontSize: 'clamp(24px, 2.8vw, 34px)', fontWeight: 700, letterSpacing: '-0.025em' }}>
              Lo que preguntan antes de reservar plaza
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
                  aria-controls={`fd-faq-panel-${i}`}
                  id={`fd-faq-trigger-${i}`}
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
                      id={`fd-faq-panel-${i}`}
                      role="region"
                      aria-labelledby={`fd-faq-trigger-${i}`}
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
      <Section style={{ padding: '80px 48px 110px', background: 'transparent' }}>
        <motion.div variants={fadeUp} style={{
          maxWidth: MAX_W, margin: '0 auto',
          background: 'linear-gradient(135deg, #052e16 0%, #064e3b 50%, #052e16 100%)',
          border: `1px solid ${greenAlpha(0.15)}`,
          borderRadius: 24, padding: 'clamp(40px, 5vw, 64px) clamp(28px, 4vw, 56px)',
          textAlign: 'center', position: 'relative', overflow: 'hidden',
        }}>
          <Quote size={40} strokeWidth={1.6} style={{ color: greenAlpha(0.4), marginBottom: 16 }} />
          <h2 style={{
            fontFamily: D, fontSize: 'clamp(24px, 3.2vw, 36px)', fontWeight: 700,
            color: '#fff', margin: '0 0 14px', letterSpacing: '-0.025em', lineHeight: 1.15,
          }}>
            {remaining} plazas. Después, el 18% deja de estar disponible.
          </h2>
          <p style={{
            fontSize: 16, color: 'rgba(255,255,255,0.7)', lineHeight: 1.65,
            maxWidth: 540, margin: '0 auto 28px',
          }}>
            Una llamada de 15 minutos para ver si tu canal encaja. Sin pitch, sin tarjeta, sin
            compromiso de listar nada hasta que tú quieras.
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
              <Calendar size={16} strokeWidth={2.4} /> Reservar mi plaza
            </a>
            <a
              href={CONTACT_MAIL}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 8,
                background: 'rgba(255,255,255,0.06)', color: '#fff', textDecoration: 'none',
                padding: '14px 24px', borderRadius: 12,
                fontWeight: 600, fontSize: 15,
                border: '1px solid rgba(255,255,255,0.12)',
              }}
            >
              <MessageCircle size={16} strokeWidth={2.4} /> Escribir por email
            </a>
          </div>
        </motion.div>
      </Section>

      <ChannelOnePromoBlock context="founding" />

      <CrossLinks exclude="/founding" />
    </div>
  )
}
