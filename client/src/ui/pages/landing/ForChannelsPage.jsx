import React, { useState, useRef } from 'react'
import { Link } from 'react-router-dom'
import { Helmet } from 'react-helmet-async'
import SEO from '../../components/SEO'
import CrossLinks from '../../components/landing/CrossLinks'
import EscrowFlowAnimation from '../../components/landing/EscrowFlowAnimation'
import { motion, useInView, AnimatePresence } from 'framer-motion'
import { XCircle, CheckCircle2, ArrowRight } from 'lucide-react'
import { FONT_BODY, FONT_DISPLAY, MAX_W } from '../../theme/tokens'

const F = FONT_BODY
const D = FONT_DISPLAY
const GREEN = '#25d366'
const GREEN_DARK = '#1ea952'
const greenAlpha = (o) => `rgba(37,211,102,${o})`

/* ─── ANIMATION VARIANTS ─────────────────────────────────── */
const fadeUp = {
  hidden: { opacity: 0, y: 40 },
  visible: (i = 0) => ({
    opacity: 1, y: 0,
    transition: { duration: 0.6, delay: i * 0.1, ease: [0.25, 0.46, 0.45, 0.94] },
  }),
}
const staggerContainer = { hidden: {}, visible: { transition: { staggerChildren: 0.08, delayChildren: 0.1 } } }
const staggerItem = {
  hidden: { opacity: 0, y: 30 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] } },
}
const scaleIn = {
  hidden: { opacity: 0, scale: 0.92 },
  visible: { opacity: 1, scale: 1, transition: { duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] } },
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

/* ─── DATA ───────────────────────────────────────────────── */
const PLATFORMS_SUPPORTED = [
  { name: 'WhatsApp', color: '#25d366' },
  { name: 'Telegram', color: '#2aabee' },
  { name: 'Discord', color: '#5865f2' },
  { name: 'Instagram', color: '#e1306c' },
  { name: 'Facebook', color: '#1877f2' },
  { name: 'Newsletter', color: '#f59e0b' },
]

// 6 pain cards — negative framing of how traditional networks treat creators.
// Mirror of the 3 PAIN_CARDS in ForBrandsPage but expanded to 6 because the
// creator side has more well-known griefs.
const PAIN_CARDS = [
  {
    title: 'Cobras tarde o no cobras',
    body: 'Net-60, net-90, "ajustes contables", networks que cierran. Tu trabajo se queda en su balance, no en el tuyo.',
  },
  {
    title: 'Quemas tu audiencia',
    body: 'Te empujan productos cutres porque sí pagan. Cada anuncio malo es un suscriptor menos para tu próximo lanzamiento.',
  },
  {
    title: 'No sabes qué precio cobrar',
    body: 'Pricing al ojo, undervaluation crónica. Acabas regalando plazas que valdrían 3× más en otro nicho.',
  },
  {
    title: 'Verificación que dura semanas',
    body: 'Documentos, llamadas, screenshots. Pasas un mes en onboarding antes de tocar la primera campaña.',
  },
  {
    title: 'Te obligan a exclusividad',
    body: 'Contratos que bloquean tu canal en otras plataformas. Pierdes deals mejores porque firmaste antes.',
  },
  {
    title: 'Cero métricas reales',
    body: 'Te mandan un PDF al mes. No sabes ni cuántos clicks dio cada anuncio en tu comunidad.',
  },
]

const STEPS = [
  {
    n: '01',
    icon: '📩',
    title: 'Recibes propuestas',
    desc: 'Anunciantes verificados te encuentran por nicho y plataforma. Tú filtras qué entra.',
  },
  {
    n: '02',
    icon: '✅',
    title: 'Aceptas y publicas',
    desc: 'El precio lo pones tú. El anunciante deposita en escrow antes de que muevas un dedo.',
  },
  {
    n: '03',
    icon: '🛡️',
    title: 'Verificación automática',
    desc: 'Tracking link único, 3 clicks mínimos en 48h. Sin reportes manuales, sin dudas.',
  },
  {
    n: '04',
    icon: '💸',
    title: 'Cobras al instante',
    desc: 'El escrow se libera al verificar. A tu balance. Y de ahí a tu banco cuando tú quieras.',
  },
]

const FAQS = [
  {
    q: '¿Es gratis registrar mi canal?',
    a: 'Sí, completamente. Cobramos solo cuando completas una campaña pagada — un 10% sobre el importe que el anunciante deposita. Si no publicas, no pagas nada.',
  },
  {
    q: '¿Qué plataformas puedo registrar?',
    a: 'Telegram, WhatsApp, Discord, newsletters (Substack, Beehiiv, ConvertKit, Mailchimp), Instagram y Facebook. Cada plataforma tiene un proceso de verificación automatizado distinto, todos en menos de 10 minutos.',
  },
  {
    q: '¿Cómo se verifica que el canal es mío?',
    a: 'Publicamos un tracking link único en tu canal. Cuando alcanza 3 clicks únicos en 48h, queda verificado automáticamente. Sin documentos, sin llamadas, sin esperas.',
  },
  {
    q: '¿Cuándo cobro después de publicar?',
    a: 'El escrow se libera automáticamente al verificarse la publicación (típicamente en 24–48h). Pasa a tu balance al instante. Desde ahí lo retiras a tu banco SEPA o IBAN cuando quieras — llega en 1 día hábil.',
  },
  {
    q: '¿Hay un mínimo de seguidores?',
    a: 'No. Aceptamos canales de cualquier tamaño. Los anunciantes filtran por nicho, audiencia activa y CPM, no por número total. Un canal de 800 suscriptores B2B SaaS suele cobrar más que uno de 80.000 lifestyle genérico.',
  },
  {
    q: '¿Puedo rechazar campañas que no encajan?',
    a: 'Sí, sin penalización. Tú decides qué publicar y qué no. Channelad nunca te obliga a aceptar nada. Bajar tu rate de aceptación al 30% no afecta a tu visibilidad en el marketplace.',
  },
  {
    q: '¿Tengo que ser exclusivo de Channelad?',
    a: 'Nunca. Sigue trabajando con quien quieras: networks, deals directos, afiliación. Channelad es una capa más, no un sustituto. Cero contratos de exclusividad.',
  },
  {
    q: '¿Cómo decide el anunciante qué pagar?',
    a: 'Tú fijas tu precio mínimo. El anunciante propone. Channelad muestra benchmarks por nicho para que ninguno de los dos esté fuera de mercado. Si os ponéis de acuerdo, el escrow se activa.',
  },
]

const PRICING_INCLUDES = [
  'Aparición en marketplace verificado',
  'Pago en escrow Stripe Connect',
  'Verificación automática con tracking',
  'Pricing Optimizer + benchmarks por nicho',
  'Inbox + dashboard real-time',
  'Soporte en español 24/7',
]

const PRICING_CHIPS = [
  'Sin fee de alta',
  'Sin mínimos mensuales',
  'Sin permanencia',
  'Pago en EU',
]

/* ─── INCOME CALCULATOR ──────────────────────────────────── */
function IncomeCalculator() {
  const [members, setMembers] = useState(5000)
  const [postsPerMonth, setPostsPerMonth] = useState(4)
  const pricePerPost = Math.round(Math.max(30, Math.min(800, members * 0.08)))
  const monthlyIncome = pricePerPost * postsPerMonth
  const yearlyIncome = monthlyIncome * 12
  const advertiserPays = Math.round(pricePerPost * 1.20)

  return (
    <motion.div variants={scaleIn} style={{
      background: 'var(--surface)', border: '1px solid var(--border)',
      borderRadius: '24px', padding: '40px', maxWidth: '700px', margin: '0 auto',
      position: 'relative', overflow: 'hidden',
    }}>
      <div style={{ position: 'absolute', top: '-60px', right: '-60px', width: '180px', height: '180px', borderRadius: '50%', background: greenAlpha(0.04), pointerEvents: 'none' }} />
      <h3 style={{ fontFamily: D, fontSize: '22px', fontWeight: 700, color: 'var(--text)', marginBottom: '28px', textAlign: 'center' }}>
        Calcula tus ingresos potenciales
      </h3>
      <div style={{ marginBottom: '28px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
          <label style={{ fontSize: '14px', color: 'var(--muted)', fontFamily: F }}>Miembros en tu canal</label>
          <span style={{ fontSize: '16px', fontWeight: 700, color: GREEN, fontFamily: D }}>{members.toLocaleString()}</span>
        </div>
        <input type="range" min="500" max="100000" step="500" value={members} onChange={e => setMembers(Number(e.target.value))}
          style={{ width: '100%', accentColor: GREEN, height: '6px', cursor: 'pointer' }} />
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: 'var(--muted2)', marginTop: '4px' }}><span>500</span><span>100.000</span></div>
      </div>
      <div style={{ marginBottom: '32px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
          <label style={{ fontSize: '14px', color: 'var(--muted)', fontFamily: F }}>Publicaciones al mes</label>
          <span style={{ fontSize: '16px', fontWeight: 700, color: GREEN, fontFamily: D }}>{postsPerMonth}</span>
        </div>
        <input type="range" min="1" max="30" step="1" value={postsPerMonth} onChange={e => setPostsPerMonth(Number(e.target.value))}
          style={{ width: '100%', accentColor: GREEN, height: '6px', cursor: 'pointer' }} />
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: 'var(--muted2)', marginTop: '4px' }}><span>1</span><span>30</span></div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', background: greenAlpha(0.06), borderRadius: '16px', padding: '24px', border: `1px solid ${greenAlpha(0.12)}` }}>
        {[
          { label: 'Tú cobras/post', val: `€${pricePerPost}`, color: GREEN },
          { label: 'El anunciante paga', val: `€${advertiserPays}`, color: 'var(--muted)' },
          { label: 'Tu ingreso mensual', val: `€${monthlyIncome.toLocaleString()}`, color: GREEN },
          { label: 'Tu ingreso anual', val: `€${yearlyIncome.toLocaleString()}`, color: 'var(--text)' },
        ].map(m => (
          <div key={m.label} style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '12px', color: 'var(--muted)', marginBottom: '6px' }}>{m.label}</div>
            <div style={{ fontFamily: D, fontSize: '26px', fontWeight: 700, color: m.color }}>{m.val}</div>
          </div>
        ))}
      </div>
      <p style={{ fontSize: '11px', color: 'var(--muted2)', textAlign: 'center', marginTop: '14px' }}>* Tú cobras el 100% de tu precio. Channelad cobra una comisión del 20% al anunciante.</p>
    </motion.div>
  )
}

/* ═══════════════════════════════════════════════════════════
   MAIN COMPONENT
   ═══════════════════════════════════════════════════════════ */
export default function ForChannelsPage() {
  const [openFaq, setOpenFaq] = useState(null)

  // FAQPage schema — emitted alongside WebPage + BreadcrumbList for richer SERP.
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
    name: 'Monetiza tu canal — Channelad',
    description:
      'Registra tu canal gratis y empieza a ganar dinero con publicidad en WhatsApp, Telegram o Discord.',
    url: 'https://channelad.io/para-canales',
    publisher: { '@type': 'Organization', name: 'Channelad', url: 'https://channelad.io' },
    breadcrumb: {
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Inicio', item: 'https://channelad.io/' },
        { '@type': 'ListItem', position: 2, name: 'Para canales', item: 'https://channelad.io/para-canales' },
      ],
    },
  }

  return (
    <main data-testid="for-channels-page" style={{ fontFamily: F, color: 'var(--text)', background: 'var(--bg)' }}>
      <Helmet>
        <script type="application/ld+json">{JSON.stringify(pageSchema)}</script>
        <script type="application/ld+json">{JSON.stringify(faqSchema)}</script>
      </Helmet>
      <SEO
        title="Monetiza tu canal de WhatsApp, Telegram o Discord"
        description="Registra tu canal gratis y empieza a ganar dinero con publicidad. Sin mínimo de seguidores. Pagos protegidos y solo 10% de comisión por campaña completada."
        path="/para-canales"
      />

      {/* ══════════════════════════════════════════════════════
          1 · HERO (Phase 1: minor copy tweaks, hero-cta anchor)
      ══════════════════════════════════════════════════════ */}
      <section style={{
        padding: '120px 48px 100px', textAlign: 'center',
        position: 'relative', overflow: 'hidden',
        minHeight: '80vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <div style={{
          position: 'absolute', width: '600px', height: '400px',
          borderRadius: '40% 60% 70% 30% / 40% 50% 60% 50%',
          background: `radial-gradient(ellipse, ${greenAlpha(0.15)} 0%, transparent 70%)`,
          top: '-15%', left: '20%', filter: 'blur(60px)', pointerEvents: 'none',
          animation: 'orbFloat1 12s ease-in-out infinite',
        }} />
        <div style={{
          position: 'absolute', width: '400px', height: '350px',
          borderRadius: '60% 40% 30% 70% / 50% 60% 40% 50%',
          background: `radial-gradient(ellipse, ${greenAlpha(0.08)} 0%, transparent 65%)`,
          top: '10%', right: '10%', filter: 'blur(70px)', pointerEvents: 'none',
          animation: 'orbFloat2 15s ease-in-out infinite',
        }} />

        <div style={{ position: 'relative', zIndex: 1, maxWidth: '800px', margin: '0 auto' }}>
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: '6px',
              background: greenAlpha(0.1), border: `1px solid ${greenAlpha(0.2)}`,
              borderRadius: '99px', padding: '5px 16px', marginBottom: '28px',
              fontSize: '12px', fontWeight: 600, color: GREEN,
            }}
          >
            💰 Para canales y creadores
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
            Monetiza tu{' '}
            <span style={{
              background: `linear-gradient(135deg, #34d399 0%, #25d366 40%, #10b981 100%)`,
              backgroundSize: '200% auto',
              WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
              animation: 'shimmer 4s linear infinite',
            }}>comunidad</span>{' '}
            sin perder el control.
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.5 }}
            style={{ fontSize: '18px', color: 'var(--muted)', lineHeight: 1.7, maxWidth: '560px', margin: '0 auto 40px' }}
          >
            Pon tu canal en el marketplace, recibe propuestas verificadas y cobra automáticamente al publicar. Sin contratos, sin exclusividad, sin perseguir pagos.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.65, duration: 0.5 }}
            style={{ display: 'flex', gap: '14px', justifyContent: 'center', flexWrap: 'wrap', marginBottom: '48px' }}
          >
            <Link
              id="hero-cta"
              to="/auth/register"
              className="btn-glow"
              style={{
                background: GREEN, color: '#fff', textDecoration: 'none',
                borderRadius: '12px', padding: '14px 32px',
                fontSize: '15px', fontWeight: 600,
                boxShadow: `0 0 24px ${greenAlpha(0.3)}`,
                transition: 'all .25s',
              }}
              onMouseEnter={e => { e.currentTarget.style.background = GREEN_DARK; e.currentTarget.style.transform = 'translateY(-3px) scale(1.02)'; e.currentTarget.style.boxShadow = `0 0 40px ${greenAlpha(0.45)}` }}
              onMouseLeave={e => { e.currentTarget.style.background = GREEN; e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = `0 0 24px ${greenAlpha(0.3)}` }}
            >
              Registrar mi canal · Gratis
            </Link>
            <a
              href="#how-it-works"
              style={{
                background: greenAlpha(0.08), color: GREEN, textDecoration: 'none',
                borderRadius: '12px', padding: '14px 28px',
                fontSize: '15px', fontWeight: 600,
                border: `1px solid ${greenAlpha(0.2)}`,
                transition: 'all .2s',
              }}
              onMouseEnter={e => { e.currentTarget.style.background = greenAlpha(0.15); e.currentTarget.style.transform = 'translateY(-2px)' }}
              onMouseLeave={e => { e.currentTarget.style.background = greenAlpha(0.08); e.currentTarget.style.transform = 'none' }}
            >
              Ver cómo funciona ↓
            </a>
          </motion.div>

          {/* Trust pills (3) — replaces 6 platform pills as plan section 1 specifies */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.8, duration: 0.5 }}
            style={{ display: 'flex', gap: '10px', justifyContent: 'center', flexWrap: 'wrap' }}
          >
            {[
              { icon: '🛡️', label: 'Verificación en 5 min' },
              { icon: '💰', label: 'Pago en escrow' },
              { icon: '🔓', label: 'Cero exclusividad' },
            ].map((p) => (
              <div key={p.label}
                style={{
                  display: 'flex', alignItems: 'center', gap: '6px',
                  padding: '6px 14px', borderRadius: '99px',
                  background: 'var(--surface)', border: '1px solid var(--border)',
                  fontSize: '12px', color: 'var(--muted)', fontWeight: 500,
                }}
              >
                <span>{p.icon}</span>
                {p.label}
              </div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════
          2 · TRUST BAR PLATFORMS
      ══════════════════════════════════════════════════════ */}
      <Section style={{ padding: '40px 48px 80px', background: 'var(--bg)' }}>
        <div style={{ maxWidth: MAX_W, margin: '0 auto' }}>
          <motion.p variants={fadeUp} style={{
            fontSize: 11, fontWeight: 600, textTransform: 'uppercase',
            letterSpacing: '0.12em', color: 'var(--muted)', textAlign: 'center', marginBottom: 24,
          }}>
            Funciona en las plataformas que ya usas
          </motion.p>
          <motion.div
            variants={staggerContainer}
            style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', flexWrap: 'wrap', gap: 32 }}
          >
            {PLATFORMS_SUPPORTED.map((p) => (
              <motion.div key={p.name} variants={staggerItem}
                style={{
                  display: 'flex', alignItems: 'center', gap: 8,
                  padding: '8px 16px', borderRadius: 12,
                  fontSize: 14, fontWeight: 600, color: 'var(--muted)',
                }}>
                <span style={{ width: 10, height: 10, borderRadius: '50%', background: p.color, boxShadow: `0 0 8px ${p.color}55` }} />
                {p.name}
              </motion.div>
            ))}
          </motion.div>
        </div>
      </Section>

      {/* ══════════════════════════════════════════════════════
          3 · METRICS STRIP (updated numbers per plan)
      ══════════════════════════════════════════════════════ */}
      <Section style={{ padding: '32px 48px 88px', background: 'var(--bg)' }}>
        <div style={{ maxWidth: MAX_W, margin: '0 auto' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px' }} className="creator-stats-grid">
            {[
              { label: 'Canales monetizando', value: '1.000+' },
              { label: 'Pagado a creadores', value: '€2,8M' },
              { label: 'Plataformas integradas', value: '6' },
              { label: 'Fee de alta', value: '0%' },
            ].map((m) => (
              <motion.div key={m.label} variants={staggerItem} whileHover={{ scale: 1.03, y: -4 }} style={{
                textAlign: 'center', padding: '24px',
                background: 'var(--surface)', borderRadius: '16px',
                border: '1px solid var(--border)', transition: 'box-shadow .3s',
              }}
                onMouseEnter={e => e.currentTarget.style.boxShadow = `0 16px 40px ${greenAlpha(0.10)}`}
                onMouseLeave={e => e.currentTarget.style.boxShadow = 'none'}
              >
                <div style={{ fontFamily: D, fontSize: '30px', fontWeight: 700, color: GREEN, marginBottom: '4px' }}>{m.value}</div>
                <div style={{ fontSize: '13px', color: 'var(--muted)' }}>{m.label}</div>
              </motion.div>
            ))}
          </div>
        </div>
      </Section>

      {/* ══════════════════════════════════════════════════════
          4 · PAIN CARDS — replaces the 6 emoji benefits
      ══════════════════════════════════════════════════════ */}
      <Section style={{
        padding: '110px 48px',
        background: 'linear-gradient(180deg, var(--bg) 0%, rgba(239,68,68,0.025) 50%, var(--bg) 100%)',
      }}>
        <div style={{ maxWidth: MAX_W, margin: '0 auto' }}>
          <motion.div variants={fadeUp} style={{ textAlign: 'center', marginBottom: '56px' }}>
            <p style={{
              fontSize: 11, fontWeight: 600, textTransform: 'uppercase',
              letterSpacing: '0.1em', color: '#ef4444', marginBottom: 12,
            }}>El problema con monetizar hoy</p>
            <h2 style={{
              fontFamily: D, fontSize: 'clamp(28px, 3.4vw, 42px)', fontWeight: 700,
              letterSpacing: '-0.03em', color: 'var(--text)', maxWidth: 720, margin: '0 auto',
              lineHeight: 1.1,
            }}>
              Las networks tradicionales te tratan como mercancía.
            </h2>
          </motion.div>
          <div className="pain-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 18 }}>
            {PAIN_CARDS.map((p) => (
              <motion.div key={p.title} variants={staggerItem}
                whileHover={{ y: -4, transition: { duration: 0.25 } }}
                style={{
                  background: 'var(--surface)', border: '1px solid var(--border)',
                  borderRadius: 18, padding: '28px',
                  transition: 'border-color .3s, box-shadow .3s',
                }}
                onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'rgba(239,68,68,0.25)'; e.currentTarget.style.boxShadow = '0 18px 50px -22px rgba(239,68,68,0.25)' }}
                onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.boxShadow = 'none' }}
              >
                <div style={{
                  width: 40, height: 40, borderRadius: 12,
                  background: 'rgba(239,68,68,0.10)', color: '#ef4444',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  marginBottom: 14,
                }}>
                  <XCircle size={22} strokeWidth={2} />
                </div>
                <h3 style={{
                  fontFamily: D, fontSize: 17, fontWeight: 700,
                  letterSpacing: '-0.015em', color: 'var(--text)',
                  margin: '0 0 8px',
                }}>{p.title}</h3>
                <p style={{ fontSize: 14, color: 'var(--muted)', lineHeight: 1.6, margin: 0 }}>
                  {p.body}
                </p>
              </motion.div>
            ))}
          </div>
          <motion.p variants={fadeUp} style={{
            textAlign: 'center', marginTop: 48, fontSize: 16,
            color: 'var(--text)', fontWeight: 500, maxWidth: 660,
            marginLeft: 'auto', marginRight: 'auto',
          }}>
            Anunciar en tu comunidad no debería significar perder el control de tu comunidad.
          </motion.p>
          <style>{`
            @media (max-width: 900px) {
              .pain-grid { grid-template-columns: 1fr 1fr !important; }
            }
            @media (max-width: 600px) {
              .pain-grid { grid-template-columns: 1fr !important; }
              .creator-stats-grid { grid-template-columns: 1fr 1fr !important; }
            }
          `}</style>
        </div>
      </Section>

      {/* ══════════════════════════════════════════════════════
          5 · INCOME CALCULATOR (Phase 1 keeps existing component)
      ══════════════════════════════════════════════════════ */}
      <Section style={{ padding: '110px 48px', background: 'var(--bg)' }}>
        <div style={{ maxWidth: MAX_W, margin: '0 auto' }}>
          <motion.div variants={fadeUp} style={{ textAlign: 'center', marginBottom: '48px' }}>
            <p style={{ fontSize: '11px', fontWeight: 600, color: GREEN, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '12px' }}>Calculadora</p>
            <h2 style={{ fontFamily: D, fontSize: 'clamp(26px, 3vw, 36px)', fontWeight: 700, letterSpacing: '-0.025em', color: 'var(--text)' }}>
              ¿Cuánto puede ganar tu canal este mes?
            </h2>
            <p style={{ fontSize: 15, color: 'var(--muted)', maxWidth: 540, margin: '12px auto 0', lineHeight: 1.6 }}>
              Estimación basada en CPM medios reales de 2.847 canales activos. No es un guess, es benchmark.
            </p>
          </motion.div>
          <IncomeCalculator />
        </div>
      </Section>

      {/* ══════════════════════════════════════════════════════
          6 · HOW IT WORKS (Phase 1 keeps lightweight version)
      ══════════════════════════════════════════════════════ */}
      <Section id="how-it-works" style={{ padding: '110px 48px', background: 'var(--bg2)' }}>
        <div style={{ maxWidth: '880px', margin: '0 auto' }}>
          <motion.div variants={fadeUp} style={{ textAlign: 'center', marginBottom: '56px' }}>
            <p style={{ fontSize: '11px', fontWeight: 600, color: GREEN, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '12px' }}>Cómo funciona</p>
            <h2 style={{ fontFamily: D, fontSize: 'clamp(26px, 3.4vw, 40px)', fontWeight: 700, letterSpacing: '-0.025em', color: 'var(--text)', lineHeight: 1.1 }}>
              De propuesta a payout en 4 pasos.
            </h2>
            <p style={{ fontSize: 15, color: 'var(--muted)', marginTop: 12 }}>
              Sin papeleos, sin contratos, sin perseguir nada.
            </p>
          </motion.div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {STEPS.map((s, i) => (
              <motion.div key={s.n} variants={staggerItem}
                whileHover={{ x: 8, transition: { duration: 0.2 } }}
                style={{
                  display: 'flex', gap: '20px', alignItems: 'flex-start',
                  background: 'var(--surface)', border: '1px solid var(--border)',
                  borderRadius: '18px', padding: '24px 28px',
                  transition: 'box-shadow .3s, border-color .3s',
                }}
                onMouseEnter={e => { e.currentTarget.style.boxShadow = `0 12px 32px ${greenAlpha(0.10)}`; e.currentTarget.style.borderColor = greenAlpha(0.2) }}
                onMouseLeave={e => { e.currentTarget.style.boxShadow = 'none'; e.currentTarget.style.borderColor = 'var(--border)' }}
              >
                <div style={{
                  width: '52px', height: '52px', borderRadius: '14px', flexShrink: 0,
                  background: i === 0 ? greenAlpha(0.1) : 'var(--bg2)',
                  border: `1px solid ${i === 0 ? greenAlpha(0.2) : 'var(--border)'}`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '22px',
                }}>{s.icon}</div>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
                    <span style={{ fontFamily: D, fontSize: '11px', fontWeight: 700, color: GREEN, opacity: 0.7 }}>{s.n}</span>
                    <h3 style={{ fontFamily: D, fontSize: '17px', fontWeight: 600, color: 'var(--text)', margin: 0 }}>{s.title}</h3>
                  </div>
                  <p style={{ fontSize: '14px', color: 'var(--muted)', lineHeight: 1.65, margin: 0 }}>{s.desc}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </Section>

      {/* ══════════════════════════════════════════════════════
          7 · ESCROW FLOW (reused from advertiser, creator copy)
      ══════════════════════════════════════════════════════ */}
      <EscrowFlowAnimation
        background="var(--bg)"
        sectionId="creator-escrow"
        eyebrow="Tu dinero, blindado"
        title="Cobras antes de mover un dedo."
        subtitle="El anunciante deposita el 100% del precio en escrow Stripe Connect antes de que aceptes la propuesta. Tú publicas, el sistema verifica, los fondos se liberan a tu balance."
      />

      {/* ══════════════════════════════════════════════════════
          8 · PRICING (premium 2-col card)
      ══════════════════════════════════════════════════════ */}
      <Section style={{ padding: '110px 48px', background: 'var(--bg2)' }}>
        <div style={{ maxWidth: 1080, margin: '0 auto' }}>
          <motion.div variants={fadeUp} style={{ textAlign: 'center', marginBottom: 48 }}>
            <p style={{ fontSize: 11, fontWeight: 600, color: GREEN, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 12 }}>Pricing</p>
            <h2 style={{
              fontFamily: D, fontSize: 'clamp(28px, 3.4vw, 42px)', fontWeight: 700,
              letterSpacing: '-0.03em', color: 'var(--text)', margin: '0 0 14px',
              lineHeight: 1.1,
            }}>
              Gratis registrarte. Solo cobramos si tú cobras.
            </h2>
            <p style={{ fontSize: 16, color: 'var(--muted)', maxWidth: 600, margin: '0 auto', lineHeight: 1.6 }}>
              Una comisión del 10% sobre las campañas que completas. Sin fee de alta, sin costes ocultos, sin permanencia.
            </p>
          </motion.div>

          {/* Premium pricing card — 2 columns on desktop */}
          <motion.div variants={scaleIn} style={{
            background: 'var(--surface)',
            border: `1px solid ${greenAlpha(0.20)}`,
            borderRadius: 24,
            overflow: 'hidden',
            boxShadow: `0 30px 80px -30px ${greenAlpha(0.30)}`,
            position: 'relative',
          }}>
            <div style={{
              position: 'absolute', inset: 0, pointerEvents: 'none',
              background: `radial-gradient(ellipse 60% 40% at 50% 0%, ${greenAlpha(0.06)} 0%, transparent 60%)`,
            }} />

            <div className="creator-pricing-grid" style={{
              display: 'grid', gridTemplateColumns: '1.1fr 1fr', gap: 0, position: 'relative',
            }}>
              {/* Left — comisión + ejemplo */}
              <div style={{ padding: 'clamp(36px, 4vw, 48px)', borderRight: '1px solid var(--border)' }} className="creator-pricing-left">
                <p style={{
                  fontSize: 11, fontWeight: 600, color: GREEN,
                  textTransform: 'uppercase', letterSpacing: '0.12em', margin: '0 0 14px',
                }}>Comisión única</p>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 18 }}>
                  <span style={{ fontFamily: D, fontSize: 'clamp(46px, 6vw, 68px)', fontWeight: 700, letterSpacing: '-0.04em', color: 'var(--text)', lineHeight: 1 }}>10%</span>
                  <span style={{ fontSize: 15, color: 'var(--muted)', fontWeight: 500 }}>solo si cobras</span>
                </div>

                <div style={{
                  background: greenAlpha(0.06),
                  border: `1px solid ${greenAlpha(0.18)}`,
                  borderRadius: 14, padding: 22, marginBottom: 16,
                }}>
                  <p style={{ fontSize: 11, fontWeight: 600, color: GREEN, textTransform: 'uppercase', letterSpacing: '0.1em', margin: '0 0 12px' }}>Ejemplo · campaña de 500 €</p>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8, fontSize: 14 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text)' }}>
                      <span>Tu pago bruto</span>
                      <strong style={{ fontVariantNumeric: 'tabular-nums' }}>500 €</strong>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--muted)' }}>
                      <span>Comisión Channelad (10%)</span>
                      <span style={{ fontVariantNumeric: 'tabular-nums' }}>−50 €</span>
                    </div>
                    <div style={{
                      display: 'flex', justifyContent: 'space-between',
                      borderTop: '1px dashed var(--border)', paddingTop: 8, marginTop: 4,
                      color: GREEN, fontWeight: 700,
                    }}>
                      <span>Tu ingreso neto</span>
                      <span style={{ fontVariantNumeric: 'tabular-nums' }}>450 €</span>
                    </div>
                    <p style={{ fontSize: 12, color: 'var(--muted)', margin: '6px 0 0' }}>
                      En menos de 48h en tu balance · Networks tradicionales: 250–350 € en 60-90 días.
                    </p>
                  </div>
                </div>

                <Link to="/auth/register" style={{
                  display: 'inline-flex', alignItems: 'center', gap: 8,
                  background: GREEN, color: '#fff', textDecoration: 'none',
                  padding: '13px 24px', borderRadius: 12,
                  fontSize: 15, fontWeight: 600,
                  boxShadow: `0 12px 28px -10px ${greenAlpha(0.50)}`,
                  transition: 'transform .2s, background .2s, box-shadow .2s',
                }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = GREEN_DARK; e.currentTarget.style.transform = 'translateY(-1px)' }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = GREEN; e.currentTarget.style.transform = 'none' }}
                >
                  Registrar mi canal · Gratis
                  <ArrowRight size={16} strokeWidth={2.4} />
                </Link>
              </div>

              {/* Right — qué incluye */}
              <div style={{ padding: 'clamp(36px, 4vw, 48px)' }} className="creator-pricing-right">
                <p style={{
                  fontSize: 11, fontWeight: 600, color: 'var(--muted)',
                  textTransform: 'uppercase', letterSpacing: '0.12em', margin: '0 0 18px',
                }}>Todo incluido, desde el día 1</p>
                <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {PRICING_INCLUDES.map((inc) => (
                    <li key={inc} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, fontSize: 14, color: 'var(--text)', lineHeight: 1.5 }}>
                      <span style={{
                        width: 22, height: 22, borderRadius: '50%',
                        background: greenAlpha(0.15), color: GREEN,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        flexShrink: 0, marginTop: 1,
                      }}>
                        <CheckCircle2 size={13} strokeWidth={2.6} />
                      </span>
                      {inc}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </motion.div>

          {/* Pricing chips */}
          <motion.div variants={staggerContainer} style={{
            display: 'flex', flexWrap: 'wrap', justifyContent: 'center',
            gap: 10, marginTop: 28,
          }}>
            {PRICING_CHIPS.map((c) => (
              <motion.span key={c} variants={staggerItem} style={{
                fontSize: 12, fontWeight: 600,
                padding: '7px 14px', borderRadius: 999,
                background: 'var(--surface)', color: 'var(--text)',
                border: '1px solid var(--border)',
              }}>
                {c}
              </motion.span>
            ))}
          </motion.div>

          <style>{`
            @media (max-width: 800px) {
              .creator-pricing-grid { grid-template-columns: 1fr !important; }
              .creator-pricing-left { border-right: none !important; border-bottom: 1px solid var(--border) !important; }
            }
          `}</style>
        </div>
      </Section>

      {/* ══════════════════════════════════════════════════════
          9 · FAQ (8 questions + FAQPage schema)
      ══════════════════════════════════════════════════════ */}
      <Section style={{ padding: '110px 48px', background: 'var(--bg)' }}>
        <div style={{ maxWidth: '720px', margin: '0 auto' }}>
          <motion.div variants={fadeUp} style={{ textAlign: 'center', marginBottom: '48px' }}>
            <p style={{ fontSize: '11px', fontWeight: 600, color: GREEN, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '12px' }}>FAQ</p>
            <h2 style={{ fontFamily: D, fontSize: 'clamp(26px, 3vw, 36px)', fontWeight: 700, letterSpacing: '-0.025em', color: 'var(--text)' }}>Preguntas frecuentes</h2>
          </motion.div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {FAQS.map((faq, i) => (
              <motion.div key={i} variants={staggerItem} style={{
                background: 'var(--surface)', border: `1px solid ${openFaq === i ? greenAlpha(0.25) : 'var(--border)'}`,
                borderRadius: '14px', overflow: 'hidden', transition: 'border-color .2s',
              }}>
                <button onClick={() => setOpenFaq(openFaq === i ? null : i)} style={{
                  width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '20px 24px', background: 'transparent', border: 'none', cursor: 'pointer', textAlign: 'left',
                }}>
                  <span style={{ fontSize: '15px', fontWeight: 500, color: openFaq === i ? GREEN : 'var(--text)', fontFamily: F }}>{faq.q}</span>
                  <motion.svg animate={{ rotate: openFaq === i ? 45 : 0 }} transition={{ duration: 0.3 }}
                    width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
                    style={{ color: openFaq === i ? GREEN : 'var(--muted)', flexShrink: 0, marginLeft: '16px' }}>
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

      {/* ══════════════════════════════════════════════════════
          10 · FINAL CTA (rewritten copy + green tone)
      ══════════════════════════════════════════════════════ */}
      <Section style={{ padding: '0 48px 110px', background: 'var(--bg)' }}>
        <motion.div variants={scaleIn} style={{
          maxWidth: MAX_W, margin: '0 auto',
          background: `linear-gradient(135deg, #052e16 0%, #064e3b 50%, #052e16 100%)`,
          border: `1px solid ${greenAlpha(0.15)}`,
          borderRadius: '24px', padding: 'clamp(48px, 6vw, 72px) clamp(28px, 4vw, 56px)', textAlign: 'center',
          position: 'relative', overflow: 'hidden',
        }}>
          <div className="dot-pattern" style={{ position: 'absolute', inset: 0, opacity: 0.25, pointerEvents: 'none' }} />
          <div style={{ position: 'relative', zIndex: 1 }}>
            <h2 style={{
              fontFamily: D, fontSize: 'clamp(26px, 3.4vw, 38px)', fontWeight: 700,
              color: '#fff', margin: '0 0 14px', letterSpacing: '-0.025em', lineHeight: 1.15,
            }}>
              Tu comunidad es valiosa. Cobra como tal.
            </h2>
            <p style={{
              fontSize: 16, color: 'rgba(255,255,255,0.7)', lineHeight: 1.65,
              maxWidth: 540, margin: '0 auto 32px',
            }}>
              Registra tu canal hoy y aparece en el marketplace antes del lanzamiento de Q1 2026.
            </p>
            <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap', marginBottom: 18 }}>
              <Link to="/auth/register" style={{
                display: 'inline-flex', alignItems: 'center', gap: 8,
                background: GREEN, color: '#fff',
                padding: '14px 28px', borderRadius: 12,
                fontWeight: 600, fontSize: 15, textDecoration: 'none',
                boxShadow: `0 0 30px ${greenAlpha(0.35)}`,
                transition: 'all .2s',
              }}
                onMouseEnter={e => { e.currentTarget.style.background = GREEN_DARK; e.currentTarget.style.transform = 'translateY(-2px)' }}
                onMouseLeave={e => { e.currentTarget.style.background = GREEN; e.currentTarget.style.transform = 'none' }}
              >
                Registrar mi canal · Gratis
                <ArrowRight size={16} strokeWidth={2.4} />
              </Link>
              <Link to="/marketplace" style={{
                display: 'inline-flex', alignItems: 'center', gap: 8,
                background: 'rgba(255,255,255,0.06)', color: '#fff',
                padding: '14px 24px', borderRadius: 12,
                fontWeight: 600, fontSize: 15, textDecoration: 'none',
                border: '1px solid rgba(255,255,255,0.12)',
                transition: 'all .2s',
              }}
                onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.10)' }}
                onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.06)' }}
              >
                Ver marketplace
              </Link>
            </div>
            <p style={{
              fontSize: 12, color: 'rgba(255,255,255,0.5)', margin: 0,
            }}>
              Sin tarjeta · 5 min de setup · Cancelar en cualquier momento
            </p>
          </div>
        </motion.div>
      </Section>

      <CrossLinks exclude="/para-canales" />
    </main>
  )
}
