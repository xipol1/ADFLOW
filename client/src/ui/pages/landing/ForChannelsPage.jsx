import React, { useState, useRef } from 'react'
import { Link } from 'react-router-dom'
import { Helmet } from 'react-helmet-async'
import SEO from '../../components/SEO'
import CrossLinks from '../../components/landing/CrossLinks'
import EscrowFlowAnimation from '../../components/landing/EscrowFlowAnimation'
import ComparisonSection from '../../components/landing/ComparisonSection'
import EarningsCalculator from '../../components/landing/EarningsCalculator'
import RotatingWord from '../../components/landing/RotatingWord'
import EarningsCard from '../../components/landing/hero/EarningsCard'
import MiniChannelCard from '../../components/landing/hero/MiniChannelCard'
import HeroBgPattern from '../../components/landing/hero/HeroBgPattern'
import CampaignFlow from '../../components/landing/CampaignFlow'
import { DiscoverIcon, PayIcon, PublishIcon, ResultsIcon } from '../../components/landing/AnimatedFlowIcons'
import BrowserChrome from '../../components/landing/demo/BrowserChrome'
import DemoCreatorInbox from '../../components/landing/demo/DemoCreatorInbox'
import DemoCreatorPublish from '../../components/landing/demo/DemoCreatorPublish'
import DemoCreatorEarnings from '../../components/landing/demo/DemoCreatorEarnings'
import DemoCreatorPayout from '../../components/landing/demo/DemoCreatorPayout'
import { motion, useInView, AnimatePresence } from 'framer-motion'
import {
  XCircle, CheckCircle2, ArrowRight,
  Wallet, ShieldCheck, Lock, Unlock,
  Users, Search, BookOpen, TrendingUp,
  LineChart, RefreshCw, Sparkles, FlaskConical,
} from 'lucide-react'
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

// Creator-side flow steps — shape matches CampaignFlow STEPS so the same
// component renders this with props instead of duplicating the layout.
const CREATOR_FLOW_STEPS = [
  {
    num: '01',
    AnimIcon: DiscoverIcon,
    title: 'Recibes propuestas',
    desc: 'Anunciantes verificados (KYC + escrow) te encuentran por nicho, plataforma y tamaño. Llegan a tu inbox con precio, copy y plazo. Tú filtras qué entra.',
    color: '#3b82f6',
    details: ['Solo anunciantes con KYC', 'Filtro por nicho y plataforma', 'Sin spam, sin DMs cutres'],
    time: '5–30 min/día',
  },
  {
    num: '02',
    AnimIcon: PublishIcon,
    title: 'Aceptas y publicas',
    desc: 'Tú fijas el precio. El anunciante deposita el 100% en escrow Stripe Connect antes de que muevas un dedo. Publicas con el copy que te llega (o que tú reescribes) y un tracking link único.',
    color: '#16a34a',
    details: ['100% en escrow antes de publicar', 'Tú apruebas o reescribes el copy', 'Tracking link auto-generado'],
    time: '< 5 min',
  },
  {
    num: '03',
    AnimIcon: PayIcon,
    title: 'Verificación automática',
    desc: 'El tracking link cuenta clicks únicos. Cuando alcanza 3 en 48h, la publicación se valida sola — sin reportes manuales, sin esperas, sin dudas.',
    color: '#8b5cf6',
    details: ['3 clicks únicos = verificado', 'Plazo típico: 24-48h', 'Sin reportes manuales'],
    time: '24–48h',
  },
  {
    num: '04',
    AnimIcon: ResultsIcon,
    title: 'Cobras al instante',
    desc: 'El escrow se libera a tu balance. Desde ahí a tu banco SEPA cuando tú quieras — llega en 1 día hábil. Sin retenciones, sin comisiones bancarias, 100% del precio que fijaste.',
    color: '#f59e0b',
    details: ['SEPA Instant a tu banco', 'Sin retenciones ni fees', 'Reporte exportable a tu CRM'],
    time: 'Instantáneo',
  },
]

const FAQS = [
  {
    q: '¿Cuánto me cobra Channelad?',
    a: 'Cero. Channelad añade un 20% sobre el precio que tú fijas y se lo cobra al anunciante — nunca a ti. Si pones un precio de 500 €, el anunciante deposita 600 € en escrow, Channelad se queda 100 € y tú recibes 500 € íntegros. La plataforma es gratis para el creador para siempre, sin fee de alta, sin comisiones por publicación, sin costes ocultos.',
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
  'Toolkit básico (Audience Insights, Discover, Brand CRM, Forecast)',
  'Inbox + dashboard real-time',
  'Soporte humano en español',
]

// Creator-side growth toolkit. Marketplace + escrow + dashboards básicos
// son siempre gratis. Las herramientas avanzadas (IA, automation, premium
// templates) entran con el plan Pro — el desglose por tier vive en
// /herramientas (SubscriptionTiers3D).
//
// tier: 'free' | 'pro' — determines the badge rendered on the card.
const GROWTH_TOOLS = [
  {
    Icon: Users,
    title: 'Audience Insights',
    desc: 'Demografía básica, intereses y momentos de máxima actividad de tu comunidad. Para entender quién te lee.',
    tier: 'free',
  },
  {
    Icon: Search,
    title: 'Discover',
    desc: 'Explora anunciantes y creadores que están pagando en tu nicho. Acelera tu primer deal sin esperar a que te encuentren.',
    tier: 'free',
  },
  {
    Icon: BookOpen,
    title: 'Brand CRM',
    desc: 'Lleva el control de qué anunciantes han trabajado contigo, cuánto pagaron y cuándo volver a contactarlos. Tu pipeline en un sitio.',
    tier: 'free',
  },
  {
    Icon: TrendingUp,
    title: 'Earnings Forecast',
    desc: 'Predice tus ingresos del próximo mes con tu pipeline actual y los patrones de tu nicho. Planifica con datos.',
    tier: 'free',
  },
  {
    Icon: LineChart,
    title: 'Pricing Optimizer',
    desc: 'IA entrenada con 3.000+ canales con métricas propias que sugiere tu precio óptimo cada mes según nicho, tamaño y actividad del marketplace. Deja de regalar plazas.',
    tier: 'pro',
  },
  {
    Icon: RefreshCw,
    title: 'Cross-promo & Swaps',
    desc: 'Match automático con creadores complementarios verificados. Intercambia menciones y crece sin depender de paid media.',
    tier: 'pro',
  },
  {
    Icon: Sparkles,
    title: 'Content Studio',
    desc: 'Biblioteca premium de templates de copy, hooks y CTAs validados con tracking real en cada plataforma.',
    tier: 'pro',
  },
  {
    Icon: FlaskConical,
    title: 'A/B Test Lab',
    desc: 'Testea hooks, copy y formatos antes de publicar al 100%. Significancia estadística sin esperar 30 días.',
    tier: 'pro',
  },
]

const PRICING_CHIPS = [
  'Sin fee de alta',
  'Sin mínimos mensuales',
  'Sin compromiso',
  'Pago en EU',
]

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
    <main
      data-testid="for-channels-page"
      style={{
        fontFamily: F,
        color: 'var(--text)',
        // Page-level wash that bleeds across all sections so they feel
        // continuous (mirrors ForBrandsPage). Sections below are mostly
        // `background: transparent` so this gradient shows through.
        background:
          'radial-gradient(ellipse 90% 50% at 75% 8%, rgba(34, 197, 94, 0.08) 0%, transparent 55%), radial-gradient(ellipse 60% 40% at 15% 30%, rgba(74, 222, 128, 0.05) 0%, transparent 60%), var(--bg)',
        position: 'relative',
      }}
    >
      <Helmet>
        <script type="application/ld+json">{JSON.stringify(pageSchema)}</script>
        <script type="application/ld+json">{JSON.stringify(faqSchema)}</script>
      </Helmet>
      <SEO
        title="Monetiza tu canal de WhatsApp, Telegram o Discord"
        description="Gratis para creadores: lista tu canal, recibe propuestas verificadas y cobra el 100% de tu precio en escrow. Toolkit de crecimiento incluido."
        path="/para-canales"
      />

      {/* ══════════════════════════════════════════════════════
          1 · HERO (Phase 2: split 60/40 layout, RotatingWord, EarningsCard
          centerpiece, 3 floating MiniChannelCards. Mirrors the advertiser
          hero composition — same premium feel, creator-side data).
      ══════════════════════════════════════════════════════ */}
      <section style={{
        padding: '108px 32px 88px',
        position: 'relative',
        overflow: 'hidden',
      }}>
        {/* Unified atmospheric bg — green theme. Replaces the two patchy orbs
            so the gradient blends across the whole section, no harsh edges. */}
        <HeroBgPattern theme="creator" />

        <div style={{
          position: 'relative', zIndex: 2,
          maxWidth: 1280, margin: '0 auto', width: '100%',
        }}>
          <div className="creator-hero-grid" style={{
            display: 'grid', gridTemplateColumns: '1fr 1.05fr',
            gap: 56, alignItems: 'center',
          }}>
            {/* LEFT — text + CTA */}
            <div className="creator-hero-text">
              {/* Eyebrow */}
              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.1 }}
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: 6,
                  background: greenAlpha(0.10), border: `1px solid ${greenAlpha(0.22)}`,
                  borderRadius: 999, padding: '5px 14px', marginBottom: 24,
                  fontSize: 12, fontWeight: 600, color: GREEN,
                }}
              >
                <Wallet size={13} strokeWidth={2.2} /> Para canales y creadores
              </motion.div>

              {/* H1 with RotatingWord */}
              <motion.h1
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.25 }}
                style={{
                  fontFamily: D, fontSize: 'clamp(36px, 5vw, 60px)', fontWeight: 700,
                  letterSpacing: '-0.04em', lineHeight: 1.04, margin: '0 0 18px',
                  color: 'var(--text)',
                }}
              >
                Monetiza tu{' '}
                <RotatingWord
                  words={['comunidad', 'newsletter', 'tráfico', 'suscriptores']}
                  interval={2400}
                  gradient="linear-gradient(135deg, #16a34a 0%, #25d366 100%)"
                />
                <br />
                sin perder el control.
              </motion.h1>

              {/* Subtitle */}
              <motion.p
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.4 }}
                style={{
                  fontSize: 17, color: 'var(--muted)', lineHeight: 1.65,
                  maxWidth: 520, margin: '0 0 30px',
                }}
              >
                Pon tu canal en el marketplace, recibe propuestas verificadas y cobra el 100% del precio que tú fijas. La comisión la cobramos al anunciante, no a ti.
              </motion.p>

              {/* CTAs */}
              <motion.div
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.55, duration: 0.5 }}
                style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 24 }}
              >
                <Link
                  id="hero-cta"
                  to="/auth/register"
                  style={{
                    display: 'inline-flex', alignItems: 'center', gap: 8,
                    background: GREEN, color: '#fff', textDecoration: 'none',
                    borderRadius: 12, padding: '14px 28px',
                    fontSize: 15, fontWeight: 600,
                    boxShadow: `0 12px 28px -8px ${greenAlpha(0.45)}, 0 1px 0 0 rgba(255,255,255,0.18) inset`,
                    transition: 'transform .2s, background .2s, box-shadow .2s',
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = GREEN_DARK; e.currentTarget.style.transform = 'translateY(-2px)' }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = GREEN; e.currentTarget.style.transform = 'none' }}
                >
                  Registrar canal · 0% para ti
                  <ArrowRight size={16} strokeWidth={2.4} />
                </Link>
                <a
                  href="#how-it-works"
                  style={{
                    display: 'inline-flex', alignItems: 'center', gap: 8,
                    background: greenAlpha(0.08), color: GREEN, textDecoration: 'none',
                    borderRadius: 12, padding: '14px 22px',
                    fontSize: 15, fontWeight: 600,
                    border: `1px solid ${greenAlpha(0.20)}`,
                    transition: 'background .2s, transform .2s',
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = greenAlpha(0.14); e.currentTarget.style.transform = 'translateY(-1px)' }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = greenAlpha(0.08); e.currentTarget.style.transform = 'none' }}
                >
                  Ver cómo funciona ↓
                </a>
              </motion.div>

              {/* Trust pills — 4 incl. 0% comisión */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.7, duration: 0.5 }}
                style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 28 }}
              >
                {[
                  { Icon: Wallet, label: '0% comisión a creadores' },
                  { Icon: ShieldCheck, label: 'Verificación en 5 min' },
                  { Icon: Lock, label: 'Pago en escrow' },
                  { Icon: Unlock, label: 'Sin exclusividad' },
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

              {/* 3-stat ribbon */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.85, duration: 0.5 }}
                style={{
                  display: 'grid', gridTemplateColumns: 'repeat(3, auto)',
                  gap: 32, alignItems: 'baseline',
                }}
              >
                {[
                  { v: '100%', l: 'Cobras tu precio fijado' },
                  { v: '72h', l: 'Pago tras publicar' },
                  { v: 'Día 1', l: 'Acceso al toolkit' },
                ].map((s) => (
                  <div key={s.l}>
                    <div style={{
                      fontFamily: D, fontSize: 'clamp(22px, 2.4vw, 28px)', fontWeight: 700,
                      color: GREEN, letterSpacing: '-0.025em', lineHeight: 1,
                    }}>{s.v}</div>
                    <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 4 }}>{s.l}</div>
                  </div>
                ))}
              </motion.div>
            </div>

            {/* RIGHT — visual composition. Mirrors the advertiser hero
                exactly: fixed-height container, EarningsCard absolute-anchored
                bottom-right, 3 floats with explicit pixel offsets and slight
                tilt for organic feel. */}
            <div className="creator-hero-visual" style={{
              position: 'relative', height: 720, width: '100%',
            }}>
              {/* Card 1 — solid white, top-left of composition */}
              <motion.div
                className="creator-float-1"
                initial={{ opacity: 0, y: 24, rotate: -10, filter: 'blur(8px)' }}
                animate={{ opacity: 1, y: 0, rotate: -4, filter: 'blur(0px)' }}
                transition={{ duration: 0.7, delay: 0.5, ease: [0.22, 1, 0.36, 1] }}
                style={{ position: 'absolute', top: 0, left: 0, zIndex: 13 }}
              >
                <MiniChannelCard
                  channel={{ id: '057', platform: 'newsletter', tier: 'A', niche: 'B2B SaaS', region: 'ES', subs: '6.4K', cpm: '22 €', score: 85 }}
                  driftAmount={6}
                  driftDuration={7.5}
                  solid
                />
              </motion.div>

              {/* Card 2 — translucent, top-right corner */}
              <motion.div
                className="creator-float-2"
                initial={{ opacity: 0, y: 24, rotate: 8, filter: 'blur(8px)' }}
                animate={{ opacity: 1, y: 0, rotate: 5, filter: 'blur(0px)' }}
                transition={{ duration: 0.7, delay: 0.65, ease: [0.22, 1, 0.36, 1] }}
                style={{ position: 'absolute', top: 60, right: -8, zIndex: 12 }}
              >
                <MiniChannelCard
                  channel={{ id: '018', platform: 'whatsapp', tier: 'S', niche: 'Finanzas', region: 'ES', subs: '24.7K', cpm: '15 €', score: 91 }}
                  driftAmount={5}
                  driftDuration={6.8}
                />
              </motion.div>

              {/* Card 3 — telegram crypto, lower-left of EarningsCard */}
              <motion.div
                className="creator-float-3"
                initial={{ opacity: 0, y: 24, rotate: -7, filter: 'blur(8px)' }}
                animate={{ opacity: 1, y: 0, rotate: -3, filter: 'blur(0px)' }}
                transition={{ duration: 0.7, delay: 0.8, ease: [0.22, 1, 0.36, 1] }}
                style={{ position: 'absolute', top: 460, left: -16, zIndex: 12 }}
              >
                <MiniChannelCard
                  channel={{ id: '009', platform: 'telegram', tier: 'S', niche: 'Crypto', region: 'LATAM', subs: '41.2K', cpm: '14 €', score: 94 }}
                  driftAmount={7}
                  driftDuration={8.2}
                />
              </motion.div>

              {/* EarningsCard — focal point, anchored bottom-right */}
              <motion.div
                initial={{ opacity: 0, y: 36, scale: 0.94, filter: 'blur(10px)' }}
                animate={{ opacity: 1, y: 0, scale: 1, filter: 'blur(0px)' }}
                transition={{ duration: 0.8, delay: 0.9, ease: [0.22, 1, 0.36, 1] }}
                style={{ position: 'absolute', bottom: 0, right: 8, zIndex: 20 }}
                className="creator-hero-earnings"
              >
                <EarningsCard />
              </motion.div>
            </div>
          </div>
        </div>

        <style>{`
          @media (max-width: 1024px) {
            .creator-hero-grid { grid-template-columns: 1fr 1fr !important; gap: 32px !important; }
            .creator-float-3 { display: none; }
          }
          @media (max-width: 768px) {
            .creator-hero-grid { grid-template-columns: 1fr !important; gap: 48px !important; }
            .creator-float-1, .creator-float-2 { display: none; }
            .creator-hero-visual { height: 580px !important; }
            .creator-hero-earnings { position: static !important; display: flex; justify-content: center; }
          }
        `}</style>
      </section>

      {/* ══════════════════════════════════════════════════════
          2 · TRUST BAR PLATFORMS
      ══════════════════════════════════════════════════════ */}
      <Section style={{ padding: '40px 48px 80px', background: 'transparent' }}>
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
      <Section style={{ padding: '32px 48px 88px', background: 'transparent' }}>
        <div style={{ maxWidth: MAX_W, margin: '0 auto' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px' }} className="creator-stats-grid">
            {[
              { label: 'Pago tras publicar', value: '72h' },
              { label: 'Plataformas integradas', value: '6' },
              { label: 'Acceso al toolkit', value: 'Día 1' },
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
        background: 'linear-gradient(180deg, transparent 0%, rgba(239,68,68,0.03) 50%, transparent 100%)',
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
          5 · EARNINGS CALCULATOR (Phase 2: replaces IncomeCalculator with
          richer simulator + comparison vs Adsense / Patreon / networks)
      ══════════════════════════════════════════════════════ */}
      <EarningsCalculator background="transparent" />

      {/* ══════════════════════════════════════════════════════
          6 · HOW IT WORKS (Phase 3: CampaignFlow with creator-side steps
          + 4 product demos shown via BrowserChrome on hover/active step)
      ══════════════════════════════════════════════════════ */}
      <CampaignFlow
        background="var(--bg2)"
        sectionId="how-it-works"
        eyebrow="Cómo funciona"
        title="De propuesta a payout en 4 pasos."
        subtitle="Sin papeleos, sin contratos, sin perseguir pagos."
        accentColor={GREEN}
        steps={CREATOR_FLOW_STEPS}
        screens={[
          (
            <BrowserChrome url="channelad.io/creator/inbox" key="screen-1">
              <DemoCreatorInbox />
            </BrowserChrome>
          ),
          (
            <BrowserChrome url="channelad.io/creator/campañas/q4-saas/publicar" key="screen-2">
              <DemoCreatorPublish />
            </BrowserChrome>
          ),
          (
            <BrowserChrome url="channelad.io/creator/earnings" key="screen-3">
              <DemoCreatorEarnings />
            </BrowserChrome>
          ),
          (
            <BrowserChrome url="channelad.io/creator/earnings/withdraw" key="screen-4">
              <DemoCreatorPayout />
            </BrowserChrome>
          ),
        ]}
      />

      {/* ══════════════════════════════════════════════════════
          7 · ESCROW FLOW (reused from advertiser, creator copy)
      ══════════════════════════════════════════════════════ */}
      <EscrowFlowAnimation
        background="transparent"
        sectionId="creator-escrow"
        eyebrow="Tu dinero, blindado"
        title="Cobras antes de mover un dedo."
        subtitle="El anunciante deposita el 100% del precio en escrow Stripe Connect antes de que aceptes la propuesta. Tú publicas, el sistema verifica, los fondos se liberan a tu balance."
        variant="creator"
      />

      {/* ══════════════════════════════════════════════════════
          7.5 · COMPARISON (creator variant — vs networks tradicionales)
      ══════════════════════════════════════════════════════ */}
      <ComparisonSection variant="creator" sectionId="creator-comparison" background="var(--bg2)" />

      {/* ══════════════════════════════════════════════════════
          7.6 · GROWTH TOOLKIT — herramientas para crecer audiencia y
          monetizar mejor (no solo el marketplace, también todo lo que
          rodea para que el canal escale).
      ══════════════════════════════════════════════════════ */}
      <Section style={{ padding: '110px 48px', background: 'transparent' }}>
        <div style={{ maxWidth: MAX_W, margin: '0 auto' }}>
          <motion.div variants={fadeUp} style={{ textAlign: 'center', marginBottom: 'clamp(40px, 5vw, 64px)' }}>
            <p style={{
              fontSize: 11, fontWeight: 600, color: GREEN,
              textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: 14,
            }}>
              Toolkit de crecimiento
            </p>
            <h2 style={{
              fontFamily: D, fontSize: 'clamp(28px, 4vw, 46px)', fontWeight: 700,
              letterSpacing: '-0.035em', color: 'var(--text)', margin: '0 0 16px',
              lineHeight: 1.06, maxWidth: 760, marginLeft: 'auto', marginRight: 'auto',
            }}>
              Más que marketplace: las herramientas que tu canal necesita para escalar.
            </h2>
            <p style={{
              fontFamily: F, fontSize: 16, color: 'var(--muted)',
              maxWidth: 660, margin: '0 auto', lineHeight: 1.6,
            }}>
              4 herramientas básicas gratis para todos los creadores. 4 avanzadas con plan Pro
              — IA, automatización y testing estadístico para escalar audiencia y CPM sin depender de paid media.
            </p>
          </motion.div>

          <div className="growth-grid" style={{
            display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16,
          }}>
            {GROWTH_TOOLS.map((tool) => {
              const isPro = tool.tier === 'pro'
              return (
                <motion.div key={tool.title} variants={staggerItem}
                  whileHover={{ y: -4 }}
                  transition={{ duration: 0.25 }}
                  style={{
                    position: 'relative',
                    background: 'var(--surface)',
                    border: '1px solid var(--border)',
                    borderRadius: 18,
                    padding: '24px 22px',
                    transition: 'border-color .3s, box-shadow .3s',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = isPro ? 'rgba(124,58,237,0.30)' : greenAlpha(0.30)
                    e.currentTarget.style.boxShadow = isPro
                      ? '0 18px 50px -22px rgba(124,58,237,0.30)'
                      : `0 18px 50px -22px ${greenAlpha(0.30)}`
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = 'var(--border)'
                    e.currentTarget.style.boxShadow = 'none'
                  }}
                >
                  {/* Tier badge — top-right corner */}
                  <span
                    style={{
                      position: 'absolute',
                      top: 14, right: 14,
                      fontSize: 9, fontWeight: 700,
                      letterSpacing: '0.08em',
                      padding: '3px 8px',
                      borderRadius: 5,
                      background: isPro ? 'rgba(124,58,237,0.12)' : greenAlpha(0.14),
                      color: isPro ? '#7C3AED' : '#16a34a',
                      textTransform: 'uppercase',
                    }}
                  >
                    {isPro ? 'Pro' : 'Gratis'}
                  </span>

                  <div style={{
                    width: 44, height: 44, borderRadius: 12,
                    background: isPro ? 'rgba(124,58,237,0.10)' : greenAlpha(0.10),
                    border: `1px solid ${isPro ? 'rgba(124,58,237,0.18)' : greenAlpha(0.18)}`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    color: isPro ? '#7C3AED' : '#16a34a',
                    marginBottom: 14,
                  }}>
                    <tool.Icon size={20} strokeWidth={2} />
                  </div>
                  <h3 style={{
                    fontFamily: D, fontSize: 16, fontWeight: 700,
                    letterSpacing: '-0.015em', color: 'var(--text)',
                    margin: '0 0 8px',
                  }}>
                    {tool.title}
                  </h3>
                  <p style={{
                    fontSize: 13, color: 'var(--muted)',
                    lineHeight: 1.55, margin: 0,
                  }}>
                    {tool.desc}
                  </p>
                </motion.div>
              )
            })}
          </div>

          <div style={{ textAlign: 'center', marginTop: 36 }}>
            <Link
              to="/herramientas"
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 8,
                padding: '11px 22px', borderRadius: 10,
                background: 'var(--surface)', color: 'var(--text)',
                border: '1px solid var(--border)',
                fontSize: 14, fontWeight: 600,
                textDecoration: 'none',
                transition: 'border-color .2s, transform .2s',
              }}
              onMouseEnter={(e) => { e.currentTarget.style.borderColor = greenAlpha(0.30); e.currentTarget.style.transform = 'translateY(-1px)' }}
              onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.transform = 'none' }}
            >
              Ver el toolkit completo y planes
              <ArrowRight size={14} strokeWidth={2.4} />
            </Link>
            <p style={{
              fontSize: 12, color: 'var(--muted)',
              maxWidth: 560, margin: '14px auto 0', lineHeight: 1.55,
            }}>
              Marketplace, escrow y herramientas básicas siempre gratis para creadores.
              Las 4 avanzadas requieren plan Pro — sin permanencia, cancela cuando quieras.
            </p>
          </div>

          <style>{`
            @media (max-width: 1100px) {
              .growth-grid { grid-template-columns: repeat(2, 1fr) !important; }
            }
            @media (max-width: 540px) {
              .growth-grid { grid-template-columns: 1fr !important; }
            }
          `}</style>
        </div>
      </Section>

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
              Gratis para creadores. Siempre.
            </h2>
            <p style={{ fontSize: 16, color: 'var(--muted)', maxWidth: 620, margin: '0 auto', lineHeight: 1.6 }}>
              Channelad nunca te cobra a ti. La comisión la cobramos al anunciante por encima del precio que tú fijas. Tú recibes el 100% de tu precio en escrow.
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
              {/* Left — coste para el creador (cero) + cómo funciona la comisión */}
              <div style={{ padding: 'clamp(36px, 4vw, 48px)', borderRight: '1px solid var(--border)' }} className="creator-pricing-left">
                <p style={{
                  fontSize: 11, fontWeight: 600, color: GREEN,
                  textTransform: 'uppercase', letterSpacing: '0.12em', margin: '0 0 14px',
                }}>Lo que pagas</p>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 18 }}>
                  <span style={{ fontFamily: D, fontSize: 'clamp(46px, 6vw, 68px)', fontWeight: 700, letterSpacing: '-0.04em', color: GREEN, lineHeight: 1 }}>0 €</span>
                  <span style={{ fontSize: 15, color: 'var(--muted)', fontWeight: 500 }}>para ti, siempre</span>
                </div>
                <p style={{ fontSize: 13.5, color: 'var(--muted)', lineHeight: 1.6, margin: '0 0 18px' }}>
                  La comisión Channelad se la cobramos al <strong style={{ color: 'var(--text)' }}>anunciante</strong>, no a ti. Tú recibes el 100% del precio que pongas — sin descuentos, sin sorpresas.
                </p>

                <div style={{
                  background: greenAlpha(0.06),
                  border: `1px solid ${greenAlpha(0.18)}`,
                  borderRadius: 14, padding: 22, marginBottom: 16,
                }}>
                  <p style={{ fontSize: 11, fontWeight: 600, color: GREEN, textTransform: 'uppercase', letterSpacing: '0.1em', margin: '0 0 12px' }}>Ejemplo · tu precio = 500 €</p>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8, fontSize: 14 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text)' }}>
                      <span>Tu precio listado</span>
                      <strong style={{ fontVariantNumeric: 'tabular-nums' }}>500 €</strong>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--muted)' }}>
                      <span>Comisión Channelad (20% sobre tu precio, al anunciante)</span>
                      <span style={{ fontVariantNumeric: 'tabular-nums' }}>+100 €</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--muted)' }}>
                      <span>El anunciante deposita en escrow</span>
                      <span style={{ fontVariantNumeric: 'tabular-nums' }}>600 €</span>
                    </div>
                    <div style={{
                      display: 'flex', justifyContent: 'space-between',
                      borderTop: '1px dashed var(--border)', paddingTop: 8, marginTop: 4,
                      color: GREEN, fontWeight: 700,
                    }}>
                      <span>Tu ingreso neto</span>
                      <span style={{ fontVariantNumeric: 'tabular-nums' }}>500 € · 100%</span>
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
                  Registrar canal · 0% para ti
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
      <Section style={{ padding: '110px 48px', background: 'transparent' }}>
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
                <button
                  onClick={() => setOpenFaq(openFaq === i ? null : i)}
                  aria-expanded={openFaq === i}
                  aria-controls={`creator-faq-panel-${i}`}
                  id={`creator-faq-trigger-${i}`}
                  style={{
                    width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    padding: '20px 24px', background: 'transparent', border: 'none', cursor: 'pointer', textAlign: 'left',
                  }}
                >
                  <span style={{ fontSize: '15px', fontWeight: 500, color: openFaq === i ? GREEN : 'var(--text)', fontFamily: F }}>{faq.q}</span>
                  <motion.svg animate={{ rotate: openFaq === i ? 45 : 0 }} transition={{ duration: 0.3 }}
                    width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
                    style={{ color: openFaq === i ? GREEN : 'var(--muted)', flexShrink: 0, marginLeft: '16px' }}>
                    <path d="M12 5v14M5 12h14"/>
                  </motion.svg>
                </button>
                <AnimatePresence>
                  {openFaq === i && (
                    <motion.div
                      id={`creator-faq-panel-${i}`}
                      role="region"
                      aria-labelledby={`creator-faq-trigger-${i}`}
                      initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}
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
      <Section style={{ padding: '0 48px 110px', background: 'transparent' }}>
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
              Registra tu canal hoy y aparece en el marketplace antes del lanzamiento de septiembre 2026.
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
                Registrar canal · 0% para ti
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
              Sin tarjeta · 5 min de alta · Cancela cuando quieras
            </p>
          </div>
        </motion.div>
      </Section>

      <CrossLinks exclude="/para-canales" />
    </main>
  )
}
