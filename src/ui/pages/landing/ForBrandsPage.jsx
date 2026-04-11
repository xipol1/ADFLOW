import React, { useState, useRef } from 'react'
import { Link } from 'react-router-dom'
import { Helmet } from 'react-helmet-async'
import SEO from '../../components/SEO'
import CrossLinks from '../../components/landing/CrossLinks'
import { motion, useInView, AnimatePresence } from 'framer-motion'
import { PURPLE as A, PURPLE_DARK as AD, purpleAlpha as AG, FONT_BODY, FONT_DISPLAY, MAX_W } from '../../theme/tokens'

const F = FONT_BODY
const D = FONT_DISPLAY

/* ─── ANIMATION VARIANTS ─────────────────────────────────── */
const fadeUp = { hidden: { opacity: 0, y: 40 }, visible: (i = 0) => ({ opacity: 1, y: 0, transition: { duration: 0.6, delay: i * 0.1, ease: [0.25, 0.46, 0.45, 0.94] } }) }
const staggerContainer = { hidden: {}, visible: { transition: { staggerChildren: 0.1, delayChildren: 0.15 } } }
const staggerItem = { hidden: { opacity: 0, y: 30 }, visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] } } }
const scaleIn = { hidden: { opacity: 0, scale: 0.92 }, visible: { opacity: 1, scale: 1, transition: { duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] } } }
const slideFromLeft = { hidden: { opacity: 0, x: -50 }, visible: { opacity: 1, x: 0, transition: { duration: 0.6, ease: [0.25, 0.46, 0.45, 0.94] } } }
const slideFromRight = { hidden: { opacity: 0, x: 50 }, visible: { opacity: 1, x: 0, transition: { duration: 0.6, ease: [0.25, 0.46, 0.45, 0.94] } } }

function Section({ children, style, id }) {
  const ref = useRef(null)
  const isInView = useInView(ref, { once: true, margin: '-60px' })
  return (
    <motion.section ref={ref} id={id} style={style} initial="hidden" animate={isInView ? 'visible' : 'hidden'} variants={staggerContainer}>
      {children}
    </motion.section>
  )
}

/* ─── DATA ───────────────────────────────────────────────── */
const PLATFORMS = [
  { name: 'WhatsApp', color: '#25d366' },
  { name: 'Telegram', color: '#2aabee' },
  { name: 'Discord', color: '#5865f2' },
  { name: 'Instagram', color: '#e1306c' },
  { name: 'Facebook', color: '#1877f2' },
  { name: 'Newsletter', color: '#f59e0b' },
]

const BENEFITS = [
  { icon: '🎯', title: 'Audiencias hiper-segmentadas', desc: 'Accede a comunidades filtradas por nicho, plataforma, ubicacion y tamano. Llega exactamente a quien necesitas.' },
  { icon: '🔒', title: 'Pago protegido', desc: 'Tu dinero queda en custodia hasta que el canal publique. Si no cumple, recuperas automaticamente el 100%.' },
  { icon: '📊', title: 'Metricas verificables', desc: 'Tracking de clicks, alcance, conversiones y ROI en tiempo real desde tu dashboard. Datos que puedes auditar.' },
  { icon: '⚡', title: 'Lanza en minutos', desc: 'Busca canales, envia propuestas y lanza tu campana en menos de 10 minutos. Sin burocracia ni intermediarios.' },
  { icon: '🤖', title: 'Auto-Buy inteligente', desc: 'Configura campanas automaticas: define nicho, presupuesto y frecuencia. Channelad encuentra y contrata canales por ti.' },
  { icon: '💎', title: 'Canales verificados', desc: 'Solo canales con metricas reales verificadas. Engagement autentico, sin bots, sin inflados.' },
]

const STEPS = [
  { n: '01', icon: '🔍', title: 'Explora el marketplace', desc: 'Filtra por plataforma, nicho, precio, rating y tamano de audiencia. Compara canales con metricas reales y reviews de otros anunciantes.' },
  { n: '02', icon: '📝', title: 'Envia tu propuesta', desc: 'Elige un canal, define tu mensaje, formato y presupuesto. El creador recibe tu propuesta y decide si acepta o negocia.' },
  { n: '03', icon: '🚀', title: 'Campana en vivo', desc: 'El canal publica tu anuncio. Recibes notificaciones en tiempo real y metricas de rendimiento desde tu dashboard.' },
  { n: '04', icon: '📈', title: 'Mide y escala', desc: 'Analiza resultados, identifica los canales con mejor ROI y escala tus campanas repitiendo con los que mejor funcionan.' },
]

const COMPARISONS = [
  { feature: 'Coste por click promedio', ads: '€0.80 - €3.50', channelad: '€0.05 - €0.30' },
  { feature: 'Engagement rate', ads: '0.5% - 2%', channelad: '15% - 45%' },
  { feature: 'Confianza del mensaje', ads: 'Anuncio (baja)', channelad: 'Recomendacion (alta)' },
  { feature: 'Segmentacion', ads: 'Algoritmica', channelad: 'Por comunidad real' },
  { feature: 'Tiempo de setup', ads: '2-5 dias', channelad: '10 minutos' },
  { feature: 'Fraude/bots', ads: '20-40% trafico falso', channelad: 'Metricas verificadas' },
]

const FAQS = [
  { q: 'Cuanto cuesta anunciarse?', a: 'Los precios los fija cada canal. Encontraras opciones desde €50 hasta €1.000+ por publicacion segun el tamano de la audiencia y el nicho. No hay costes fijos ni suscripciones.' },
  { q: 'Que pasa si el canal no publica?', a: 'Si el canal no cumple en el plazo acordado, el pago custodiado se devuelve automaticamente a tu balance. No pierdes dinero.' },
  { q: 'Puedo ver metricas antes de contratar?', a: 'Si. Cada canal muestra sus metricas verificadas: seguidores, engagement rate, reviews de otros anunciantes y precio por publicacion.' },
  { q: 'Que es Auto-Buy?', a: 'Es nuestro sistema automatizado de contratacion. Define tu nicho, presupuesto y frecuencia, y Channelad encuentra y contrata canales que cumplen tus criterios automaticamente.' },
  { q: 'Puedo hacer campanas multi-canal?', a: 'Si. Puedes contratar multiples canales en diferentes plataformas desde una sola campana. El dashboard unifica todas las metricas.' },
  { q: 'Hay requisitos para anunciarse?', a: 'Solo necesitas una cuenta verificada y fondos en tu balance. No hay minimos de gasto ni contratos a largo plazo.' },
]

const TESTIMONIALS = [
  { name: 'David Torres', role: 'CEO, ShopFast', quote: 'Pasamos de €3.20 CPC en Meta Ads a €0.12 en canales de Telegram. El ROI es incomparable.', avatar: 'DT', color: A },
  { name: 'Laura Sanchez', role: 'Head of Growth, FitPro', quote: 'El engagement en WhatsApp es brutal. Un solo post nos genero 340 leads cualificados.', avatar: 'LS', color: '#25d366' },
  { name: 'Miguel Reyes', role: 'Marketing Director, TechNow', quote: 'Auto-Buy nos ahorra 15 horas semanales. Definimos criterios y Channelad hace el resto.', avatar: 'MR', color: '#2aabee' },
]

/* ═══════════════════════════════════════════════════════════
   MAIN COMPONENT
   ═══════════════════════════════════════════════════════════ */
export default function ForBrandsPage() {
  const [openFaq, setOpenFaq] = useState(null)

  return (
    <main style={{ fontFamily: F, color: 'var(--text)', background: 'var(--bg)' }}>
      <Helmet>
        <script type="application/ld+json">{JSON.stringify({
          '@context': 'https://schema.org', '@type': 'WebPage', name: 'Publicidad en comunidades para marcas — Channelad',
          description: 'Compra publicidad en canales verificados de WhatsApp, Telegram y Discord.',
          url: 'https://www.channelad.io/para-anunciantes',
          publisher: { '@type': 'Organization', name: 'Channelad', url: 'https://www.channelad.io' },
          breadcrumb: { '@type': 'BreadcrumbList', itemListElement: [
            { '@type': 'ListItem', position: 1, name: 'Inicio', item: 'https://www.channelad.io/' },
            { '@type': 'ListItem', position: 2, name: 'Para marcas', item: 'https://www.channelad.io/para-anunciantes' },
          ]},
        })}</script>
      </Helmet>
      <SEO
        title="Publicidad en comunidades para marcas"
        description="Compra publicidad en canales verificados de WhatsApp, Telegram y Discord. Desde 50 euros por publicacion. Pagos custodiados, metricas verificadas y sin suscripciones."
        path="/para-anunciantes"
        type="website"
      />

      {/* ══════════════════════════════════════════════════════
          HERO
      ══════════════════════════════════════════════════════ */}
      <section style={{
        padding: '120px 48px 100px', textAlign: 'center',
        position: 'relative', overflow: 'hidden',
        minHeight: '80vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <div className="hero-orb-1" />
        <div className="hero-orb-2" />

        <div style={{ position: 'relative', zIndex: 1, maxWidth: '820px', margin: '0 auto' }}>
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: '6px',
              background: AG(0.1), border: `1px solid ${AG(0.2)}`,
              borderRadius: '99px', padding: '5px 16px', marginBottom: '28px',
              fontSize: '12px', fontWeight: 600, color: A,
            }}
          >
            📣 Para marcas y anunciantes
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.35 }}
            style={{
              fontFamily: D, fontSize: 'clamp(40px, 5.5vw, 64px)', fontWeight: 700,
              letterSpacing: '-0.04em', lineHeight: 1.05, marginBottom: '24px',
            }}
          >
            Anuncia donde tu{' '}
            <span className="gradient-text">audiencia confia</span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.5 }}
            style={{ fontSize: '18px', color: 'var(--muted)', lineHeight: 1.7, maxWidth: '560px', margin: '0 auto 40px' }}
          >
            Publica tu mensaje en comunidades reales de WhatsApp, Telegram, Discord e Instagram.
            Mayor engagement, menor coste, resultados medibles.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.65, duration: 0.5 }}
            style={{ display: 'flex', gap: '14px', justifyContent: 'center', flexWrap: 'wrap', marginBottom: '48px' }}
          >
            <Link to="/marketplace" className="btn-glow" style={{
              background: A, color: '#fff', textDecoration: 'none',
              borderRadius: '12px', padding: '14px 32px',
              fontSize: '15px', fontWeight: 600,
              boxShadow: `0 0 24px ${AG(0.3)}`,
              transition: 'all .25s',
            }}
              onMouseEnter={e => { e.currentTarget.style.background = AD; e.currentTarget.style.transform = 'translateY(-3px) scale(1.02)'; e.currentTarget.style.boxShadow = `0 0 40px ${AG(0.45)}` }}
              onMouseLeave={e => { e.currentTarget.style.background = A; e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = `0 0 24px ${AG(0.3)}` }}
            >Explorar canales</Link>
            <Link to="/auth/register" style={{
              background: AG(0.08), color: A, textDecoration: 'none',
              borderRadius: '12px', padding: '14px 28px',
              fontSize: '15px', fontWeight: 600,
              border: `1px solid ${AG(0.2)}`,
              transition: 'all .2s',
            }}
              onMouseEnter={e => { e.currentTarget.style.background = AG(0.15); e.currentTarget.style.transform = 'translateY(-2px)' }}
              onMouseLeave={e => { e.currentTarget.style.background = AG(0.08); e.currentTarget.style.transform = 'none' }}
            >Crear cuenta gratis</Link>
          </motion.div>

          {/* Platforms */}
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.8, duration: 0.5 }}
            style={{ display: 'flex', gap: '10px', justifyContent: 'center', flexWrap: 'wrap' }}>
            {PLATFORMS.map((p, i) => (
              <motion.div key={p.name} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.85 + i * 0.06 }}
                style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '6px 12px', borderRadius: '99px', background: 'var(--surface)', border: '1px solid var(--border)', fontSize: '12px', color: 'var(--muted)', fontWeight: 500 }}>
                <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: p.color, boxShadow: `0 0 6px ${p.color}40` }} />
                {p.name}
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ── METRICS ──────────────────────────────────────── */}
      <Section style={{ padding: '48px 48px', background: 'var(--bg)' }}>
        <div style={{ maxWidth: MAX_W, margin: '0 auto' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px' }}>
            {[
              { label: 'Canales disponibles', value: '12.400+' },
              { label: 'Campanas lanzadas', value: '8.900+' },
              { label: 'CPC promedio', value: '€0.15' },
              { label: 'Engagement medio', value: '32%' },
            ].map(m => (
              <motion.div key={m.label} variants={staggerItem} whileHover={{ scale: 1.03, y: -4 }} style={{
                textAlign: 'center', padding: '24px',
                background: 'var(--surface)', borderRadius: '16px',
                border: '1px solid var(--border)', transition: 'box-shadow .3s',
              }}
                onMouseEnter={e => e.currentTarget.style.boxShadow = '0 16px 40px rgba(0,0,0,0.25)'}
                onMouseLeave={e => e.currentTarget.style.boxShadow = 'none'}
              >
                <div style={{ fontFamily: D, fontSize: '30px', fontWeight: 700, color: A, marginBottom: '4px' }}>{m.value}</div>
                <div style={{ fontSize: '13px', color: 'var(--muted)' }}>{m.label}</div>
              </motion.div>
            ))}
          </div>
        </div>
      </Section>

      {/* ── BENEFITS ─────────────────────────────────────── */}
      <Section style={{ padding: '110px 48px', background: 'var(--bg2)' }}>
        <div style={{ maxWidth: MAX_W, margin: '0 auto' }}>
          <motion.div variants={fadeUp} style={{ textAlign: 'center', marginBottom: '56px' }}>
            <p style={{ fontSize: '11px', fontWeight: 600, color: A, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '12px' }}>Ventajas</p>
            <h2 style={{ fontFamily: D, fontSize: 'clamp(26px, 3vw, 36px)', fontWeight: 700, letterSpacing: '-0.025em', color: 'var(--text)' }}>
              Por que anunciarse con <span className="gradient-text">Channelad</span>
            </h2>
          </motion.div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '20px' }}>
            {BENEFITS.map(b => (
              <motion.div key={b.title} variants={staggerItem}
                whileHover={{ y: -8, scale: 1.02, transition: { duration: 0.25 } }}
                style={{
                  background: 'var(--surface)', border: '1px solid var(--border)',
                  borderRadius: '18px', padding: '32px', transition: 'box-shadow .3s, border-color .3s',
                }}
                onMouseEnter={e => { e.currentTarget.style.boxShadow = '0 20px 48px rgba(0,0,0,0.3)'; e.currentTarget.style.borderColor = AG(0.2) }}
                onMouseLeave={e => { e.currentTarget.style.boxShadow = 'none'; e.currentTarget.style.borderColor = 'var(--border)' }}
              >
                <motion.div whileHover={{ rotate: [0, -8, 8, 0], transition: { duration: 0.4 } }}
                  style={{ fontSize: '32px', marginBottom: '16px', width: '56px', height: '56px', borderRadius: '14px', background: AG(0.08), border: `1px solid ${AG(0.15)}`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                >{b.icon}</motion.div>
                <h3 style={{ fontFamily: D, fontSize: '17px', fontWeight: 600, marginBottom: '8px', color: 'var(--text)' }}>{b.title}</h3>
                <p style={{ fontSize: '14px', color: 'var(--muted)', lineHeight: 1.7, margin: 0 }}>{b.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </Section>

      {/* ── HOW IT WORKS ─────────────────────────────────── */}
      <Section style={{ padding: '110px 48px', background: 'var(--bg)' }}>
        <div style={{ maxWidth: MAX_W, margin: '0 auto' }}>
          <motion.div variants={fadeUp} style={{ textAlign: 'center', marginBottom: '56px' }}>
            <p style={{ fontSize: '11px', fontWeight: 600, color: A, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '12px' }}>Proceso</p>
            <h2 style={{ fontFamily: D, fontSize: 'clamp(26px, 3vw, 36px)', fontWeight: 700, letterSpacing: '-0.025em', color: 'var(--text)' }}>Lanza tu campana en 4 pasos</h2>
          </motion.div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '20px' }}>
            {STEPS.map((s, i) => (
              <motion.div key={s.n} variants={staggerItem}
                whileHover={{ y: -8, scale: 1.02, transition: { duration: 0.25 } }}
                style={{
                  background: 'var(--surface)', border: '1px solid var(--border)',
                  borderRadius: '16px', padding: '28px 22px', textAlign: 'center',
                  transition: 'box-shadow .3s, border-color .3s',
                }}
                onMouseEnter={e => { e.currentTarget.style.boxShadow = '0 20px 48px rgba(0,0,0,0.3)'; e.currentTarget.style.borderColor = AG(0.15) }}
                onMouseLeave={e => { e.currentTarget.style.boxShadow = 'none'; e.currentTarget.style.borderColor = 'var(--border)' }}
              >
                <motion.div whileHover={{ rotate: [0, -5, 5, 0], transition: { duration: 0.4 } }}
                  style={{
                    width: '60px', height: '60px', borderRadius: '16px',
                    background: i === 0 ? AG(0.12) : 'var(--bg2)',
                    border: `1px solid ${i === 0 ? AG(0.25) : 'var(--border)'}`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    margin: '0 auto 20px', fontSize: '26px',
                  }}
                >{s.icon}</motion.div>
                <span style={{ fontFamily: D, fontSize: '11px', fontWeight: 700, color: A, opacity: 0.5 }}>{s.n}</span>
                <h3 style={{ fontFamily: D, fontSize: '15px', fontWeight: 600, color: 'var(--text)', marginBottom: '8px', marginTop: '6px' }}>{s.title}</h3>
                <p style={{ fontSize: '13px', color: 'var(--muted)', lineHeight: 1.7, margin: 0 }}>{s.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </Section>

      {/* ── COMPARISON TABLE ──────────────────────────────── */}
      <Section style={{ padding: '110px 48px', background: 'var(--bg2)' }}>
        <div style={{ maxWidth: '800px', margin: '0 auto' }}>
          <motion.div variants={fadeUp} style={{ textAlign: 'center', marginBottom: '56px' }}>
            <p style={{ fontSize: '11px', fontWeight: 600, color: A, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '12px' }}>Comparativa</p>
            <h2 style={{ fontFamily: D, fontSize: 'clamp(26px, 3vw, 36px)', fontWeight: 700, letterSpacing: '-0.025em', color: 'var(--text)' }}>Ads tradicionales vs Channelad</h2>
          </motion.div>

          <motion.div variants={scaleIn} style={{
            background: 'var(--surface)', border: '1px solid var(--border)',
            borderRadius: '20px', overflow: 'hidden',
          }}>
            {/* Header */}
            <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr 1fr', padding: '16px 24px', borderBottom: '1px solid var(--border)', background: 'var(--bg2)' }}>
              <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--muted2)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Metrica</span>
              <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--muted2)', textTransform: 'uppercase', letterSpacing: '0.06em', textAlign: 'center' }}>Ads tradicionales</span>
              <span style={{ fontSize: '12px', fontWeight: 600, color: A, textTransform: 'uppercase', letterSpacing: '0.06em', textAlign: 'center' }}>Channelad</span>
            </div>
            {/* Rows */}
            {COMPARISONS.map((c, i) => (
              <motion.div key={c.feature}
                initial={{ opacity: 0, x: -20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.06 }}
                style={{
                  display: 'grid', gridTemplateColumns: '1.4fr 1fr 1fr', padding: '16px 24px',
                  borderBottom: i < COMPARISONS.length - 1 ? '1px solid var(--border)' : 'none',
                  transition: 'background .15s',
                }}
                onMouseEnter={e => e.currentTarget.style.background = 'var(--bg2)'}
                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
              >
                <span style={{ fontSize: '14px', fontWeight: 500, color: 'var(--text)' }}>{c.feature}</span>
                <span style={{ fontSize: '13px', color: 'var(--muted)', textAlign: 'center' }}>{c.ads}</span>
                <span style={{ fontSize: '13px', color: A, fontWeight: 600, textAlign: 'center' }}>{c.channelad}</span>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </Section>

      {/* ── TESTIMONIALS ─────────────────────────────────── */}
      <Section style={{ padding: '110px 48px', background: 'var(--bg)' }}>
        <div style={{ maxWidth: MAX_W, margin: '0 auto' }}>
          <motion.div variants={fadeUp} style={{ textAlign: 'center', marginBottom: '56px' }}>
            <p style={{ fontSize: '11px', fontWeight: 600, color: A, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '12px' }}>Testimonios</p>
            <h2 style={{ fontFamily: D, fontSize: 'clamp(26px, 3vw, 36px)', fontWeight: 700, letterSpacing: '-0.025em', color: 'var(--text)' }}>Resultados que hablan solos</h2>
          </motion.div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '20px' }}>
            {TESTIMONIALS.map((t, i) => (
              <motion.div key={i} variants={scaleIn}
                whileHover={{ y: -6, scale: 1.02, transition: { duration: 0.25 } }}
                style={{
                  background: 'var(--surface)', border: '1px solid var(--border)',
                  borderRadius: '16px', padding: '28px', transition: 'box-shadow .3s',
                }}
                onMouseEnter={e => e.currentTarget.style.boxShadow = '0 20px 48px rgba(0,0,0,0.3)'}
                onMouseLeave={e => e.currentTarget.style.boxShadow = 'none'}
              >
                <div style={{ display: 'flex', gap: '2px', marginBottom: '16px' }}>
                  {[...Array(5)].map((_, j) => <span key={j} style={{ color: '#f59e0b', fontSize: '14px' }}>★</span>)}
                </div>
                <p style={{ fontSize: '14px', lineHeight: 1.7, color: 'var(--text)', marginBottom: '24px', fontStyle: 'italic', fontWeight: 300 }}>"{t.quote}"</p>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: `${t.color}18`, border: `1px solid ${t.color}30`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px', fontWeight: 700, color: t.color }}>{t.avatar}</div>
                  <div>
                    <p style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text)' }}>{t.name}</p>
                    <p style={{ fontSize: '12px', color: 'var(--muted)' }}>{t.role}</p>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </Section>

      {/* ── FAQ ───────────────────────────────────────────── */}
      <Section style={{ padding: '110px 48px', background: 'var(--bg2)' }}>
        <div style={{ maxWidth: '720px', margin: '0 auto' }}>
          <motion.div variants={fadeUp} style={{ textAlign: 'center', marginBottom: '48px' }}>
            <p style={{ fontSize: '11px', fontWeight: 600, color: A, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '12px' }}>FAQ</p>
            <h2 style={{ fontFamily: D, fontSize: 'clamp(26px, 3vw, 36px)', fontWeight: 700, letterSpacing: '-0.025em', color: 'var(--text)' }}>Preguntas frecuentes</h2>
          </motion.div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {FAQS.map((faq, i) => (
              <motion.div key={i} variants={staggerItem} style={{
                background: 'var(--surface)', border: `1px solid ${openFaq === i ? AG(0.2) : 'var(--border)'}`,
                borderRadius: '14px', overflow: 'hidden', transition: 'border-color .2s',
              }}>
                <button onClick={() => setOpenFaq(openFaq === i ? null : i)} style={{
                  width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '20px 24px', background: 'transparent', border: 'none', cursor: 'pointer', textAlign: 'left',
                }}>
                  <span style={{ fontSize: '15px', fontWeight: 500, color: openFaq === i ? A : 'var(--text)', fontFamily: F }}>{faq.q}</span>
                  <motion.svg animate={{ rotate: openFaq === i ? 45 : 0 }} transition={{ duration: 0.3 }}
                    width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
                    style={{ color: openFaq === i ? A : 'var(--muted)', flexShrink: 0, marginLeft: '16px' }}>
                    <path d="M12 5v14M5 12h14"/>
                  </motion.svg>
                </button>
                <AnimatePresence>
                  {openFaq === i && (
                    <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.35, ease: [0.25, 0.46, 0.45, 0.94] }} style={{ overflow: 'hidden' }}>
                      <div style={{ padding: '0 24px 20px' }}>
                        <p style={{ fontSize: '14px', color: 'var(--muted)', lineHeight: 1.7 }}>{faq.a}</p>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            ))}
          </div>
        </div>
      </Section>

      {/* ── CTA BANNER ───────────────────────────────────── */}
      <Section style={{ padding: '0 48px 110px', background: 'var(--bg2)' }}>
        <motion.div variants={scaleIn} style={{
          maxWidth: MAX_W, margin: '0 auto',
          background: 'linear-gradient(135deg, #0d0718 0%, #130b24 50%, #0d0718 100%)',
          border: `1px solid ${AG(0.15)}`,
          borderRadius: '24px', padding: '64px 56px', textAlign: 'center',
          position: 'relative', overflow: 'hidden',
        }}>
          <div className="dot-pattern" style={{ position: 'absolute', inset: 0, opacity: 0.25, pointerEvents: 'none' }} />
          <div style={{ position: 'relative', zIndex: 1 }}>
            <div style={{ fontSize: '36px', marginBottom: '16px' }}>📈</div>
            <h2 style={{ fontFamily: D, fontSize: '28px', fontWeight: 700, color: '#fff', marginBottom: '12px', letterSpacing: '-0.02em' }}>
              Empieza a anunciarte hoy
            </h2>
            <p style={{ fontSize: '16px', color: 'rgba(255,255,255,0.55)', lineHeight: 1.7, maxWidth: '460px', margin: '0 auto 32px' }}>
              Explora el marketplace, encuentra tu audiencia ideal y lanza tu primera campana en minutos. Sin contratos ni compromisos.
            </p>
            <div style={{ display: 'flex', gap: '14px', justifyContent: 'center', flexWrap: 'wrap' }}>
              <Link to="/marketplace" style={{
                display: 'inline-block', background: A, color: '#fff',
                padding: '14px 32px', borderRadius: '12px',
                fontWeight: 600, fontSize: '15px', textDecoration: 'none',
                boxShadow: `0 0 30px ${AG(0.35)}`,
                transition: 'all .2s',
              }}
                onMouseEnter={e => { e.currentTarget.style.background = AD; e.currentTarget.style.transform = 'translateY(-2px)' }}
                onMouseLeave={e => { e.currentTarget.style.background = A; e.currentTarget.style.transform = 'none' }}
              >Explorar marketplace</Link>
              <Link to="/auth/register" style={{
                display: 'inline-block', background: 'rgba(255,255,255,0.08)', color: '#fff',
                padding: '14px 28px', borderRadius: '12px',
                fontWeight: 600, fontSize: '15px', textDecoration: 'none',
                border: '1px solid rgba(255,255,255,0.12)',
                transition: 'all .2s',
              }}
                onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.14)'; e.currentTarget.style.transform = 'translateY(-2px)' }}
                onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.08)'; e.currentTarget.style.transform = 'none' }}
              >Crear cuenta gratis</Link>
            </div>
          </div>
        </motion.div>
      </Section>

      <CrossLinks exclude="/para-anunciantes" />
    </main>
  )
}
