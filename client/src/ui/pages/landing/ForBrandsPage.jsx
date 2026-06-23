import React, { useState, lazy, Suspense } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { Helmet } from 'react-helmet-async'
import { motion, AnimatePresence } from 'framer-motion'
import { Shield, Globe, Lock, SearchX, BarChart3, AlertTriangle, ShieldCheck, Eye, BadgeCheck, XCircle, Sparkles, MessageCircle, ArrowRight } from 'lucide-react'
import SEO from '../../components/SEO'
import CrossLinks from '../../components/landing/CrossLinks'
import MotionSection, {
  fadeUp,
  staggerItem,
  scaleIn,
} from '../../components/landing/MotionSection'
import RotatingWord from '../../components/landing/RotatingWord'
import HeroBgPattern from '../../components/landing/hero/HeroBgPattern'
import MiniChannelCard from '../../components/landing/hero/MiniChannelCard'
import SettlementCard from '../../components/landing/hero/SettlementCard'

// Below-the-fold sections — lazy-loaded so they leave the entry chunk. These
// drag in the heaviest leaf components (the calculator wizard, escrow/flow
// animations, the 4 product-screen demos), none of which is visible on first
// paint. A Suspense boundary with a min-height fallback wraps each render site
// to avoid layout shift while the chunk streams in.
const BrowserChrome = lazy(() => import('../../components/landing/demo/BrowserChrome'))
const DemoCatalogo = lazy(() => import('../../components/landing/demo/DemoCatalogo'))
const DemoEscrowPayment = lazy(() => import('../../components/landing/demo/DemoEscrowPayment'))
const DemoLivePublication = lazy(() => import('../../components/landing/demo/DemoLivePublication'))
const DemoFinalResults = lazy(() => import('../../components/landing/demo/DemoFinalResults'))
const CampaignFlow = lazy(() => import('../../components/landing/CampaignFlow'))
const ComparisonSection = lazy(() => import('../../components/landing/ComparisonSection'))
const EscrowFlowAnimation = lazy(() => import('../../components/landing/EscrowFlowAnimation'))
const ChannelCalculator = lazy(() => import('../../components/calculator/ChannelCalculator'))
import {
  PURPLE as A,
  purpleAlpha as AG,
  FONT_BODY,
  FONT_DISPLAY,
  MAX_W,
  PLATFORM_BRAND,
} from '../../theme/tokens'
import { PUBLIC_COMMISSION_LABEL } from '../../theme/stats'

const F = FONT_BODY
const D = FONT_DISPLAY

// Pre-launch dataset size for section 6 (Insights stat ribbon) and the
// hero stat trio. Stored without the leading '+' so consumers can render
// '+{N}', '{N}+', etc.
const INSIGHTS_DATASET_COUNT = '3000'

// Pre-launch FAQ minimum (overridable when first verified channel lands).
const MIN_BUDGET_EUR = '30'

// Floating mini channel cards for the hero visual composition.
// Synthetic anonymized data — same convention as the Section 5 demo.
const HERO_FLOATING_CARDS = [
  { id: '009', platform: 'telegram',   tier: 'S', score: 94, niche: 'Crypto',   region: 'LATAM', subs: '41.2K', cpm: '€7,5' },
  { id: '018', platform: 'whatsapp',   tier: 'S', score: 91, niche: 'Finanzas', region: 'ES',    subs: '24.7K', cpm: '€10,9' },
  { id: '021', platform: 'telegram',   tier: 'A', score: 87, niche: 'B2B SaaS', region: 'ES',    subs: '18.3K', cpm: '€7,3', isNew: true },
]

// Words rotating in the hero H1 highlight pill.
const HERO_ROTATING_WORDS = ['Telegram', 'WhatsApp', 'Discord', 'newsletters']

/* ─── Sección 2 — Trust bar entries ──────────────────────────────────── */
const TRUST_PLATFORMS = [
  { key: 'telegram',   label: PLATFORM_BRAND.telegram.label,   color: PLATFORM_BRAND.telegram.color },
  { key: 'whatsapp',   label: PLATFORM_BRAND.whatsapp.label,   color: PLATFORM_BRAND.whatsapp.color },
  { key: 'discord',    label: PLATFORM_BRAND.discord.label,    color: PLATFORM_BRAND.discord.color },
  { key: 'instagram',  label: 'Instagram Broadcasts',          color: PLATFORM_BRAND.instagram.color },
  { key: 'newsletter', label: PLATFORM_BRAND.newsletter.label, color: '#b45309' },
]

/* ─── Sección 3 — Pain cards (estilo "Simple por diseño") ────────────── */
// Mirror the StepCard structure used in CampaignFlow: number badge + icon
// + title + small chip + description + bullet list. Each pain gets a
// distinct accent color to match the visual rhythm of the Simple por
// diseño grid.
const PAIN_CARDS = [
  {
    num: '01',
    icon: SearchX,
    color: '#b91c1c',
    title: 'Buscar canales es a ciegas',
    chip: 'Sin buscador público',
    desc:
      'Telegram, WhatsApp y Discord no tienen buscador público. Cada campaña empieza con horas de DMs, screenshots y suposiciones sobre qué canal vale la pena.',
    details: [
      'Horas perdidas en DMs y screenshots',
      'Sin métricas verificables previas',
      'Eliges casi a ciegas',
    ],
  },
  {
    num: '02',
    icon: BarChart3,
    color: '#b45309',
    title: 'No sabes cuánto pagar',
    chip: 'Sin benchmarks de CPM',
    desc:
      'Cada canal pide un precio distinto. Sin benchmarks de CPM ni quality scores, pagas lo que te diga el dueño, sin referencia para negociar.',
    details: [
      'Cada canal pone su precio',
      'Cero referencia para negociar',
      'Pagas de más o no inviertes',
    ],
  },
  {
    num: '03',
    icon: AlertTriangle,
    color: '#b91c1c',
    title: 'DMs, transferencias, cero garantía',
    chip: 'Sin escrow ni custodia',
    desc:
      'Acuerdos por mensaje directo, transferencia por adelantado a un desconocido. Si el canal no publica, no entrega o infla métricas, asumes la pérdida.',
    details: [
      'Transferencia por adelantado',
      'Sin custodia del pago',
      'Si no publica, asumes la pérdida',
    ],
  },
]

/* ─── Sección 5 — Insights capabilities ──────────────────────────────── */
const INSIGHTS_CAPS = [
  'Compara CPM benchmarks por plataforma y nicho.',
  'Detecta canales con tráfico inflado o farms de bots.',
  'Mide engagement real antes de invertir un euro.',
]

/* ─── Sección 9 — Pricing inclusions ─────────────────────────────────── */
const PRICING_INCLUDES = [
  { icon: ShieldCheck,    label: 'Catálogo de canales verificados' },
  { icon: Lock,           label: 'Pago protegido en escrow' },
  { icon: BarChart3,      label: 'Métricas certificadas por campaña' },
  { icon: Sparkles,       label: 'Acceso a Channelad Insights' },
  { icon: MessageCircle,  label: 'Soporte humano en español' },
]

/* ─── Sección 10 — FAQ ───────────────────────────────────────────────── */
const FAQS = [
  {
    q: '¿Qué es el escrow y cómo me protege?',
    a: 'El escrow retiene tu pago hasta que el canal publica el anuncio y verificamos la entrega. Si el canal no cumple los términos acordados (fecha, formato o alcance mínimo), recuperas el importe íntegro de forma automática. Tú no pagas hasta que tu campaña sale al aire y se mide.',
  },
  {
    q: '¿Cómo verificáis los canales?',
    a: 'Cada canal pasa por verificación con conexión técnica antes de entrar al catálogo: comprobamos identidad del propietario, métricas históricas, calidad de audiencia y detección de bots con nuestro Scoring Engine. Renovamos la verificación periódicamente para que las métricas que ves en plataforma reflejen la realidad y no un screenshot de hace seis meses.',
  },
  {
    q: '¿Puedo cancelar una campaña?',
    a: 'Sí, mientras la campaña no haya pasado al estado de publicación. Una vez el canal ha publicado el anuncio, la cancelación depende del acuerdo concreto y de la política del canal. Antes de eso, cancelas desde el panel y recuperas el 100% del escrow en tu método de pago original en pocos días.',
  },
  {
    q: '¿Qué métricas voy a recibir?',
    a: 'Impresiones, clics, CTR y CPM efectivo de cada campaña. Para canales que lo permiten (newsletters e Instagram Broadcasts vía API), las métricas son nativas del proveedor. Para Telegram, WhatsApp y Discord, Channelad combina datos del canal, tracking links propios y verificación cruzada para certificar la entrega.',
  },
  {
    q: '¿Cumple con el RGPD?',
    a: 'Sí. Channelad opera bajo legislación española y europea. Solo procesamos datos agregados de campaña, nunca datos personales de la audiencia del canal. El responsable del canal mantiene el control sobre su comunidad. Tienes el detalle completo en nuestra política de privacidad y firmamos DPA bajo petición para clientes empresariales.',
  },
  {
    q: '¿En qué se diferencia de Google Ads o Meta Ads?',
    a: 'Google y Meta venden inventario en plataformas abiertas. Channelad cubre el inventario que ellos no pueden tocar: canales privados de Telegram, WhatsApp, Discord, newsletters e Instagram Broadcasts. Es complementario, no competidor. Si tu audiencia pasa el día en grupos privados, ahí no llegan ni Google ni Meta, da igual cuánto pujes.',
  },
  {
    q: '¿Cuál es el presupuesto mínimo?',
    a: `No hay mínimo de cuenta en Channelad. Cada canal fija su propio precio mínimo por campaña, normalmente desde ${MIN_BUDGET_EUR} €. Puedes empezar con una sola campaña en un canal pequeño para validar la métrica, y escalar a varios canales en paralelo cuando los datos respalden la inversión. Sin compromisos ni mínimos mensuales.`,
  },
  {
    q: '¿Necesito firmar un contrato?',
    a: 'No. Aceptas las condiciones generales al crear la cuenta y eso cubre el uso del marketplace y de Insights. Cada campaña se rige por las condiciones específicas que ves antes de pagar. Si tu empresa necesita un contrato marco, un DPA personalizado o facturación consolidada, escríbenos y lo gestionamos sin coste adicional.',
  },
]

/* ═══════════════════════════════════════════════════════════════════════
   HERO HELPERS — small inline components
   ═══════════════════════════════════════════════════════════════════════ */
function TrustPill({ icon: Icon, label }) {
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
        background: 'var(--bg2)',
        border: '1px solid var(--border)',
        borderRadius: 999,
        padding: '5px 12px',
        fontSize: 12,
        fontWeight: 500,
        color: 'var(--text)',
      }}
    >
      <Icon size={13} strokeWidth={2} style={{ flexShrink: 0 }} />
      {label}
    </span>
  )
}


function SettlementTrustRibbon() {
  return (
    <div
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 14,
        padding: '8px 18px',
        background: 'rgba(255, 255, 255, 0.7)',
        backdropFilter: 'blur(16px) saturate(140%)',
        WebkitBackdropFilter: 'blur(16px) saturate(140%)',
        border: '1px solid rgba(255, 255, 255, 0.6)',
        borderRadius: 999,
        fontSize: 11.5,
        color: 'rgba(15, 17, 21, 0.65)',
        fontWeight: 500,
        boxShadow: '0 8px 24px -8px rgba(15, 17, 21, 0.10)',
      }}
    >
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
        <ShieldCheck size={12} strokeWidth={2.2} />
        Seguro
      </span>
      <span style={{ width: 1, height: 11, background: 'rgba(15, 17, 21, 0.10)' }} />
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
        <Eye size={12} strokeWidth={2.2} />
        Transparente
      </span>
      <span style={{ width: 1, height: 11, background: 'rgba(15, 17, 21, 0.10)' }} />
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
        <BadgeCheck size={12} strokeWidth={2.2} />
        Verificado
      </span>
    </div>
  )
}

function HeroStat({ value, label }) {
  return (
    <div>
      <p
        style={{
          fontFamily: FONT_DISPLAY,
          fontSize: 28,
          fontWeight: 800,
          color: PURPLE_FROM_TOKENS,
          letterSpacing: '-0.02em',
          lineHeight: 1,
          margin: 0,
        }}
      >
        {value}
      </p>
      <p
        style={{
          fontSize: 11,
          color: 'var(--muted)',
          marginTop: 6,
          textTransform: 'uppercase',
          letterSpacing: '0.08em',
          fontWeight: 600,
          margin: '6px 0 0 0',
        }}
      >
        {label}
      </p>
    </div>
  )
}

// Local alias so HeroStat (defined outside the component) doesn't reach for
// the renamed `A` import inside the component body.
const PURPLE_FROM_TOKENS = '#7C3AED'

function PricingChip({ children }) {
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
        padding: '5px 10px',
        borderRadius: 999,
        background: 'var(--surface)',
        border: '1px solid var(--border)',
        fontSize: 11.5,
        color: 'var(--text)',
        fontWeight: 500,
      }}
    >
      <span style={{ width: 5, height: 5, borderRadius: '50%', background: '#7C3AED' }} />
      {children}
    </span>
  )
}

function ComparisonBar({ label, value, suffix, highlight = false }) {
  // Render a horizontal commission bar normalized to a 50% reference width.
  // 50 was picked because no realistic alternative exceeds it; keeps the
  // visual relative without anchoring to 100% (which would dwarf both bars).
  const widthPct = Math.min((value / 50) * 100, 100)
  const barColor = highlight ? '#7C3AED' : '#9CA3AF'
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 6 }}>
        <span style={{ fontSize: 13, color: 'var(--text)', fontWeight: highlight ? 600 : 500 }}>{label}</span>
        <span style={{ fontSize: 13, color: highlight ? '#7C3AED' : 'var(--muted)', fontWeight: 600 }}>
          {value}{suffix}
        </span>
      </div>
      <div
        style={{
          height: 8,
          background: 'var(--surface)',
          borderRadius: 999,
          overflow: 'hidden',
          border: '1px solid var(--border)',
        }}
      >
        <div
          style={{
            height: '100%',
            width: `${widthPct}%`,
            background: highlight
              ? 'linear-gradient(90deg, #7C3AED, #A855F7)'
              : barColor,
            borderRadius: 999,
            transition: 'width .8s ease',
          }}
        />
      </div>
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════════════════
   MAIN COMPONENT
   ═══════════════════════════════════════════════════════════════════════ */
export default function ForBrandsPage() {
  const [openFaq, setOpenFaq] = useState(null)
  const [heroEmail, setHeroEmail] = useState('')
  const [heroEmailSubmitted, setHeroEmailSubmitted] = useState(false)
  const location = useLocation()
  const isOnRootPath = location?.pathname === '/' || location?.pathname === ''

  const handleHeroEmailSubmit = (e) => {
    e.preventDefault()
    if (!heroEmail || !heroEmail.includes('@')) return
    // No backend wired yet — just acknowledge so the user gets feedback.
    // Wire to a real waitlist endpoint when one exists.
    setHeroEmailSubmitted(true)
    setHeroEmail('')
    setTimeout(() => setHeroEmailSubmitted(false), 4000)
  }

  const seoTitle = isOnRootPath
    ? 'Channelad — Publicidad en canales privados verificados'
    : 'Publicidad en canales privados para marcas'
  const seoDescription = isOnRootPath
    ? 'Channelad conecta tu marca con canales verificados de Telegram, WhatsApp, Discord y newsletters. Pago en escrow, métricas certificadas y benchmarks de CPM antes de pagar.'
    : 'Compra publicidad en canales verificados de Telegram, WhatsApp, Discord y newsletters. Pago en escrow, métricas certificadas, benchmarks de CPM antes de pagar.'
  const seoPath = isOnRootPath ? '/' : '/para-anunciantes'
  // Only the /para-anunciantes view has an EN counterpart (/en/for-advertisers);
  // the homepage (/) must not claim it. undefined → SEO emits no hreflang.
  const seoAlternates = isOnRootPath ? undefined : [
    { hreflang: 'es', href: 'https://channelad.io/para-anunciantes' },
    { hreflang: 'en', href: 'https://channelad.io/en/for-advertisers' },
    { hreflang: 'x-default', href: 'https://channelad.io/para-anunciantes' },
  ]

  const structuredData = isOnRootPath
    ? {
        '@context': 'https://schema.org',
        '@type': 'WebSite',
        name: 'Channelad',
        url: 'https://channelad.io/',
        description:
          'Marketplace de publicidad en canales privados verificados de Telegram, WhatsApp, Discord y newsletters.',
        publisher: { '@type': 'Organization', name: 'Channelad', url: 'https://channelad.io' },
        potentialAction: {
          '@type': 'SearchAction',
          target: {
            '@type': 'EntryPoint',
            urlTemplate: 'https://channelad.io/marketplace?q={search_term_string}',
          },
          'query-input': 'required name=search_term_string',
        },
      }
    : {
        '@context': 'https://schema.org',
        '@type': 'WebPage',
        name: 'Publicidad en canales privados para marcas — Channelad',
        description:
          'Compra publicidad en canales verificados de Telegram, WhatsApp, Discord y newsletters.',
        url: 'https://channelad.io/para-anunciantes',
        publisher: { '@type': 'Organization', name: 'Channelad', url: 'https://channelad.io' },
        breadcrumb: {
          '@type': 'BreadcrumbList',
          itemListElement: [
            { '@type': 'ListItem', position: 1, name: 'Inicio', item: 'https://channelad.io/' },
            { '@type': 'ListItem', position: 2, name: 'Para marcas', item: 'https://channelad.io/para-anunciantes' },
          ],
        },
      }

  return (
    // <div>, not <main>: AppLayout already renders the page's <main> landmark.
    // A nested second <main> fails axe "landmark-no-duplicate-main".
    <div
      data-testid="for-brands-page"
      style={{
        fontFamily: F,
        color: 'var(--text)',
        background:
          'radial-gradient(ellipse 90% 50% at 75% 8%, rgba(124, 58, 237, 0.08) 0%, transparent 55%), radial-gradient(ellipse 60% 40% at 15% 30%, rgba(99, 102, 241, 0.05) 0%, transparent 60%), var(--bg)',
        position: 'relative',
      }}
    >
      <Helmet>
        <script type="application/ld+json">{JSON.stringify(structuredData)}</script>
        <script type="application/ld+json">{JSON.stringify({
          '@context': 'https://schema.org',
          '@type': 'FAQPage',
          mainEntity: FAQS.map((f) => ({
            '@type': 'Question',
            name: f.q,
            acceptedAnswer: { '@type': 'Answer', text: f.a },
          })),
        })}</script>
      </Helmet>
      <SEO title={seoTitle} description={seoDescription} path={seoPath} type="website" alternates={seoAlternates} />

      {/* Page-scoped responsive rules. Targets the section nodes inside the
          ForBrandsPage main only — the data-testid scope keeps it from
          leaking to other pages that share AppLayout. */}
      <style>{`
        @media (max-width: 768px) {
          [data-testid="for-brands-page"] > section {
            padding-top: 64px !important;
            padding-bottom: 64px !important;
            padding-left: 20px !important;
            padding-right: 20px !important;
          }
          [data-testid="for-brands-page"] > section.lp-section--trust {
            padding-top: 56px !important;
            padding-bottom: 56px !important;
          }
        }
      `}</style>

      {/* ══════════════════════════════════════════════════════════════════
          1 · HERO — split layout (text + visual composition)
          ══════════════════════════════════════════════════════════════════ */}
      <section
        style={{
          padding: '108px 32px 88px',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        <div style={{ maxWidth: 1280, margin: '0 auto' }}>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1.05fr',
              gap: 56,
              alignItems: 'center',
            }}
            className="hero-split"
          >
            {/* ─── LEFT COLUMN ─────────────────────────────────── */}
            <div>
              {/* (a) Trust pills.
                  initial={false}: the hero is prerendered as a static snapshot
                  into #root (scripts/snapshot-home.js → build injects into
                  home.html). Keeping entrance animations here would make React
                  re-animate from opacity:0 on mount, flashing over the painted
                  snapshot. Static = snapshot matches the mounted render exactly. */}
              <motion.div
                initial={false}
                animate={{ opacity: 1, y: 0 }}
                style={{
                  display: 'flex',
                  flexWrap: 'wrap',
                  alignItems: 'center',
                  gap: 8,
                  marginBottom: 24,
                }}
              >
                <TrustPill icon={Shield} label="GDPR" />
                <TrustPill icon={Globe} label="Hosting EU" />
                <TrustPill icon={Lock} label="Pago en escrow" />
              </motion.div>

              {/* (b) H1 with rotating word.
                  LCP-critical: rendered visible (no opacity/blur fade-in) so the
                  paint isn't deferred until an animation completes. Only a small
                  translate plays in. */}
              <motion.h1
                initial={false}
                animate={{ y: 0 }}
                style={{
                  fontFamily: D,
                  fontSize: 'clamp(40px, 5.2vw, 64px)',
                  fontWeight: 700,
                  letterSpacing: '-0.035em',
                  lineHeight: 1.02,
                  color: 'var(--text)',
                  marginBottom: 22,
                  marginTop: 0,
                }}
              >
                Tu audiencia ya vive en{' '}
                <RotatingWord words={HERO_ROTATING_WORDS} />.
              </motion.h1>

              {/* (c) Sub — measured LCP element. Kept fully opaque from the
                  first frame so LCP isn't gated on an opacity transition. */}
              <motion.p
                initial={false}
                animate={{ y: 0 }}
                style={{
                  fontSize: 17,
                  color: 'var(--muted)',
                  lineHeight: 1.65,
                  maxWidth: 540,
                  marginBottom: 32,
                  marginTop: 0,
                }}
              >
                Channelad conecta tu marca con canales verificados de Telegram, WhatsApp, Discord y
                newsletters. Pago en escrow, métricas certificadas y benchmarks de CPM antes de pagar.
              </motion.p>

              {/* (d) Email capture inline */}
              <motion.form
                id="hero-cta"
                onSubmit={handleHeroEmailSubmit}
                initial={false}
                animate={{ opacity: 1, y: 0 }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  background: 'var(--bg2)',
                  border: '1px solid var(--border)',
                  borderRadius: 999,
                  padding: 6,
                  maxWidth: 440,
                  marginBottom: 14,
                  transition: 'border-color .2s, background .2s',
                }}
                onFocusCapture={(e) => {
                  e.currentTarget.style.borderColor = A
                  e.currentTarget.style.background = 'var(--surface)'
                }}
                onBlurCapture={(e) => {
                  e.currentTarget.style.borderColor = 'var(--border)'
                  e.currentTarget.style.background = 'var(--bg2)'
                }}
              >
                <input
                  type="email"
                  required
                  placeholder="Tu email"
                  value={heroEmail}
                  onChange={(e) => setHeroEmail(e.target.value)}
                  style={{
                    flex: 1,
                    background: 'transparent',
                    border: 'none',
                    outline: 'none',
                    padding: '8px 16px',
                    fontSize: 14,
                    color: 'var(--text)',
                    fontFamily: F,
                  }}
                />
                <button
                  type="submit"
                  data-testid="for-brands-cta-explore"
                  style={{
                    background: 'linear-gradient(180deg, #8B5CF6 0%, #7C3AED 100%)',
                    color: '#fff',
                    border: 'none',
                    borderRadius: 999,
                    padding: '11px 22px',
                    fontSize: 14,
                    fontWeight: 600,
                    cursor: 'pointer',
                    whiteSpace: 'nowrap',
                    fontFamily: F,
                    letterSpacing: '-0.005em',
                    boxShadow:
                      '0 1px 0 0 rgba(255,255,255,0.18) inset, 0 8px 20px -6px rgba(124,58,237,0.45), 0 2px 6px -2px rgba(124,58,237,0.30)',
                    transition: 'transform .25s cubic-bezier(.22,1,.36,1), box-shadow .25s, background .25s',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = 'linear-gradient(180deg, #A78BFA 0%, #8B5CF6 100%)'
                    e.currentTarget.style.transform = 'translateY(-1px)'
                    e.currentTarget.style.boxShadow =
                      '0 1px 0 0 rgba(255,255,255,0.25) inset, 0 14px 28px -8px rgba(124,58,237,0.55), 0 4px 10px -2px rgba(124,58,237,0.35)'
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'linear-gradient(180deg, #8B5CF6 0%, #7C3AED 100%)'
                    e.currentTarget.style.transform = 'none'
                    e.currentTarget.style.boxShadow =
                      '0 1px 0 0 rgba(255,255,255,0.18) inset, 0 8px 20px -6px rgba(124,58,237,0.45), 0 2px 6px -2px rgba(124,58,237,0.30)'
                  }}
                >
                  Reservar plaza
                </button>
              </motion.form>

              <AnimatePresence>
                {heroEmailSubmitted && (
                  <motion.p
                    initial={{ opacity: 0, y: -4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    style={{
                      fontSize: 13,
                      color: '#15803d',
                      fontWeight: 500,
                      margin: 0,
                      marginBottom: 14,
                    }}
                  >
                    ✓ Te avisamos cuando abramos el batch piloto.
                  </motion.p>
                )}
              </AnimatePresence>

              {/* (e) 3-stat trust ribbon */}
              <motion.div
                initial={false}
                animate={{ opacity: 1 }}
                style={{
                  display: 'flex',
                  gap: 32,
                  paddingTop: 18,
                  flexWrap: 'wrap',
                }}
              >
                <HeroStat value={`${INSIGHTS_DATASET_COUNT}+`} label="Canales analizados" />
                <HeroStat value="5" label="Plataformas cubiertas" />
                <HeroStat value="Día 1" label="Pago en escrow" />
              </motion.div>
            </div>

            {/* ─── RIGHT COLUMN ─ visual composition ──────────── */}
            <div
              className="hero-visual"
              style={{
                position: 'relative',
                height: 760,
                width: '100%',
              }}
            >
              <HeroBgPattern />

              {/* Ambient glow behind the SettlementCard — large, soft, low
                  opacity. Sits between the bg pattern and the cards. */}
              <div
                aria-hidden="true"
                className="hero-ambient-glow"
                style={{
                  position: 'absolute',
                  bottom: -40,
                  right: -60,
                  width: 560,
                  height: 560,
                  background:
                    'radial-gradient(circle at center, rgba(124, 58, 237, 0.28) 0%, rgba(99, 102, 241, 0.16) 40%, rgba(124, 58, 237, 0) 70%)',
                  filter: 'blur(60px)',
                  zIndex: 0,
                  pointerEvents: 'none',
                }}
              />

              {/* Floating mini channel cards (hidden < md). Positioning
                  mirrors the target composition: card 1 above-center, card 2
                  to the right (slightly lower), card 3 with NEW badge on the
                  left of the SettlementCard. */}
              {/* Card 1 — solid white, top of composition above the
                  SettlementCard. Visually anchors the hero. */}
              <motion.div
                className="hero-float-1"
                initial={false}
                animate={{ opacity: 1, y: 0, rotate: -4, filter: 'blur(0px)' }}
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  zIndex: 13,
                }}
              >
                <MiniChannelCard channel={HERO_FLOATING_CARDS[0]} driftAmount={6} driftDuration={7.5} solid />
              </motion.div>

              {/* Card 2 — translucent, top-right corner, clear of card 1 */}
              <motion.div
                className="hero-float-2"
                initial={false}
                animate={{ opacity: 1, y: 0, rotate: 5, filter: 'blur(0px)' }}
                style={{
                  position: 'absolute',
                  top: 60,
                  right: -8,
                  zIndex: 12,
                }}
              >
                <MiniChannelCard channel={HERO_FLOATING_CARDS[1]} driftAmount={5} driftDuration={6.8} />
              </motion.div>

              {/* Card 3 — NEW, lower-left of SettlementCard, well below cards 1+2 */}
              <motion.div
                className="hero-float-3"
                initial={false}
                animate={{ opacity: 1, y: 0, rotate: -3, filter: 'blur(0px)' }}
                style={{
                  position: 'absolute',
                  top: 460,
                  left: -16,
                  zIndex: 12,
                }}
              >
                <MiniChannelCard channel={HERO_FLOATING_CARDS[2]} driftAmount={7} driftDuration={8.2} />
              </motion.div>

              {/* Settlement card foreground + trust ribbon below */}
              <motion.div
                initial={false}
                animate={{ opacity: 1, y: 0, scale: 1, filter: 'blur(0px)' }}
                style={{
                  position: 'absolute',
                  bottom: 0,
                  right: 8,
                  zIndex: 20,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: 14,
                }}
                className="hero-settlement"
              >
                <SettlementCard />
                <SettlementTrustRibbon />
              </motion.div>
            </div>
          </div>
        </div>

        <style>{`
          @media (max-width: 1024px) {
            .hero-split { grid-template-columns: 1fr 1fr !important; gap: 32px !important; }
            .hero-float-3 { display: none; }
          }
          @media (max-width: 768px) {
            .hero-split { grid-template-columns: 1fr !important; gap: 48px !important; }
            .hero-float-1, .hero-float-2 { display: none; }
            .hero-visual { height: auto !important; min-height: 520px; display: flex; justify-content: center; align-items: center; }
            .hero-settlement { position: relative !important; bottom: auto !important; right: auto !important; }
          }
        `}</style>
      </section>

      {/* ══════════════════════════════════════════════════════════════════
          2 · TRUST BAR
          ══════════════════════════════════════════════════════════════════ */}
      <MotionSection style={{ padding: '80px 48px', background: 'transparent' }} className="lp-section lp-section--trust">
        <div style={{ maxWidth: MAX_W, margin: '0 auto' }}>
          <p
            style={{
              fontSize: 11,
              fontWeight: 600,
              color: 'var(--muted2, #6B7280)',
              textTransform: 'uppercase',
              letterSpacing: '0.12em',
              textAlign: 'center',
              marginBottom: 20,
            }}
          >
            Operamos en las plataformas de comunidad que importan
          </p>
          <div
            style={{
              display: 'flex',
              gap: 14,
              justifyContent: 'center',
              flexWrap: 'wrap',
              alignItems: 'center',
            }}
          >
            {TRUST_PLATFORMS.map((p) => (
              <motion.div
                key={p.key}
                variants={staggerItem}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 8,
                  padding: '8px 14px',
                  borderRadius: 99,
                  background: 'var(--surface)',
                  border: '1px solid var(--border)',
                  fontSize: 13,
                  fontWeight: 500,
                  color: 'var(--text)',
                }}
              >
                <span
                  style={{
                    width: 8,
                    height: 8,
                    borderRadius: '50%',
                    background: p.color,
                    boxShadow: `0 0 6px ${p.color}55`,
                  }}
                />
                {p.label}
                {p.tag && (
                  <span
                    style={{
                      fontSize: 10,
                      color: 'var(--muted)',
                      fontStyle: 'italic',
                      marginLeft: 4,
                    }}
                  >
                    · {p.tag}
                  </span>
                )}
              </motion.div>
            ))}
          </div>
        </div>
      </MotionSection>

      {/* ══════════════════════════════════════════════════════════════════
          3 · PROBLEM
          ══════════════════════════════════════════════════════════════════ */}
      <MotionSection style={{ padding: '100px 48px', background: 'transparent' }}>
        <div style={{ maxWidth: MAX_W, margin: '0 auto' }}>
          <motion.div variants={fadeUp} style={{ textAlign: 'center', marginBottom: 56, maxWidth: 720, margin: '0 auto 56px' }}>
            <p
              style={{
                fontSize: 11,
                fontWeight: 600,
                color: A,
                textTransform: 'uppercase',
                letterSpacing: '0.1em',
                marginBottom: 12,
              }}
            >
              El problema
            </p>
            <h2
              style={{
                fontFamily: D,
                fontSize: 'clamp(28px, 3.4vw, 40px)',
                fontWeight: 700,
                letterSpacing: '-0.025em',
                color: 'var(--text)',
                lineHeight: 1.15,
              }}
            >
              El presupuesto sigue en Meta y Google. La atención, no.
            </h2>
          </motion.div>

          <div
            style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}
            className="pain-grid"
          >
            {PAIN_CARDS.map((p) => {
              const Icon = p.icon
              return (
                <motion.div
                  key={p.title}
                  variants={staggerItem}
                  whileHover={{ y: -6, transition: { duration: 0.25 } }}
                  style={{
                    position: 'relative',
                    background: 'var(--surface)',
                    border: '1px solid var(--border)',
                    borderRadius: 20,
                    padding: 'clamp(24px, 3vw, 32px)',
                    transition: 'all 0.35s cubic-bezier(.22,1,.36,1)',
                    boxShadow: 'var(--shadow-sm)',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = `${p.color}06`
                    e.currentTarget.style.borderColor = `${p.color}30`
                    e.currentTarget.style.boxShadow = `0 20px 50px ${p.color}15, 0 0 0 1px ${p.color}10`
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'var(--surface)'
                    e.currentTarget.style.borderColor = 'var(--border)'
                    e.currentTarget.style.boxShadow = 'var(--shadow-sm)'
                  }}
                >
                  {/* Step number badge — absolute, top-left */}
                  <div
                    style={{
                      position: 'absolute',
                      top: -14,
                      left: 24,
                      width: 28,
                      height: 28,
                      borderRadius: 8,
                      background: p.color,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontFamily: D,
                      fontSize: 10,
                      fontWeight: 700,
                      color: '#fff',
                      boxShadow: `0 4px 12px -4px ${p.color}80`,
                    }}
                  >
                    {p.num}
                  </div>

                  {/* Header — icon + title + chip */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14, marginTop: 4 }}>
                    <div
                      style={{
                        width: 56,
                        height: 56,
                        borderRadius: 14,
                        background: `${p.color}10`,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                      }}
                    >
                      <Icon size={26} color={p.color} strokeWidth={1.8} />
                    </div>
                    <div>
                      <h3
                        style={{
                          fontFamily: D,
                          fontWeight: 700,
                          fontSize: 'clamp(16px, 2.5vw, 20px)',
                          margin: 0,
                          color: 'var(--text)',
                          letterSpacing: '-0.02em',
                          lineHeight: 1.15,
                        }}
                      >
                        {p.title}
                      </h3>
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 6,
                          fontSize: 11,
                          color: p.color,
                          fontWeight: 600,
                          marginTop: 4,
                        }}
                      >
                        <span
                          style={{
                            width: 6,
                            height: 6,
                            borderRadius: '50%',
                            background: p.color,
                            flexShrink: 0,
                          }}
                        />
                        {p.chip}
                      </div>
                    </div>
                  </div>

                  <p style={{ fontSize: 13, color: 'var(--muted)', margin: '0 0 16px', lineHeight: 1.6 }}>
                    {p.desc}
                  </p>

                  {/* Detail bullets — XCircle to convey the items as pain points */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {p.details.map((detail, i) => (
                      <div
                        key={i}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 6,
                          fontSize: 11,
                          color: 'var(--text)',
                          fontWeight: 500,
                        }}
                      >
                        <XCircle size={12} style={{ color: p.color, flexShrink: 0 }} />
                        {detail}
                      </div>
                    ))}
                  </div>
                </motion.div>
              )
            })}
          </div>

          <motion.p
            variants={fadeUp}
            style={{
              textAlign: 'center',
              marginTop: 48,
              fontSize: 16,
              color: 'var(--text)',
              fontWeight: 500,
              maxWidth: 720,
              marginLeft: 'auto',
              marginRight: 'auto',
            }}
          >
            Anunciar donde está tu audiencia no debería ser más arriesgado que anunciar en Google Ads.
          </motion.p>

          <style>{`
            @media (max-width: 900px) {
              .pain-grid { grid-template-columns: 1fr !important; }
            }
          `}</style>
        </div>
      </MotionSection>

      {/* ══════════════════════════════════════════════════════════════════
          4 · SOLUTION / HOW IT WORKS — reuses CampaignFlow from main landing
             ("Simple por diseño · De la idea al resultado, sin fricción").
             Each step card binds a real product screen; hovering a card
             unfolds the matching screen below the grid.
          ══════════════════════════════════════════════════════════════════ */}
      <Suspense fallback={<div style={{ minHeight: 720 }} aria-hidden="true" />}>
        <CampaignFlow
          background="transparent"
          sectionId="how-it-works"
          screens={[
            (
              <BrowserChrome url="channelad.io/explorar" key="screen-1">
                <DemoCatalogo />
              </BrowserChrome>
            ),
            (
              <BrowserChrome url="channelad.io/checkout/q4-test" key="screen-2">
                <DemoEscrowPayment />
              </BrowserChrome>
            ),
            (
              <BrowserChrome url="channelad.io/campanas/q4-test/en-vivo" key="screen-3">
                <DemoLivePublication />
              </BrowserChrome>
            ),
            (
              <BrowserChrome url="channelad.io/campanas/q4-test/resultados" key="screen-4">
                <DemoFinalResults />
              </BrowserChrome>
            ),
          ]}
        />
      </Suspense>

      {/* ══════════════════════════════════════════════════════════════════
          5 · INSIGHTS PREVIEW — theme-adaptive (light + dark)
             Local CSS variables swap based on [data-theme] so the section
             integrates with the page background instead of forcing dark.
          ══════════════════════════════════════════════════════════════════ */}
      <MotionSection
        className="lp-insights-section"
        style={{
          padding: '100px 48px',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        <div style={{ maxWidth: MAX_W, margin: '0 auto', position: 'relative', zIndex: 1 }}>
          <motion.div variants={fadeUp} style={{ marginBottom: 36, maxWidth: 720 }}>
            <p
              style={{
                fontSize: 11,
                fontWeight: 600,
                color: 'var(--insights-accent)',
                textTransform: 'uppercase',
                letterSpacing: '0.12em',
                marginBottom: 14,
              }}
            >
              Channelad Insights
            </p>
            <h2
              style={{
                fontFamily: D,
                fontSize: 'clamp(28px, 3.4vw, 42px)',
                fontWeight: 700,
                letterSpacing: '-0.025em',
                color: 'var(--insights-text)',
                marginBottom: 16,
                lineHeight: 1.15,
              }}
            >
              Datos antes de pagar, no después.
            </h2>
            <p style={{ fontSize: 16, color: 'var(--insights-text-muted)', lineHeight: 1.7, margin: 0 }}>
              Channelad Insights te da CPM benchmarks, scoring de calidad y detección de bots de
              cualquier canal antes de hacer la primera reserva. Con{' '}
              <strong style={{ color: 'var(--insights-text)' }}>6 métricas propietarias</strong>{' '}
              (CAS, CAF, CTF, CER, CVS, CAP) que ningún competidor puede ofrecerte hoy.
            </p>
          </motion.div>

          <div
            style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: 48, alignItems: 'center' }}
            className="insights-split"
          >
            <motion.ul variants={staggerItem} style={{ listStyle: 'none', padding: 0, margin: 0 }}>
              {INSIGHTS_CAPS.map((cap, i) => (
                <li
                  key={i}
                  style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: 14,
                    padding: '14px 0',
                    borderBottom: i < INSIGHTS_CAPS.length - 1 ? '1px solid var(--insights-divider)' : 'none',
                    fontSize: 15,
                    color: 'var(--insights-text)',
                    lineHeight: 1.6,
                  }}
                >
                  <span
                    style={{
                      width: 24,
                      height: 24,
                      borderRadius: 6,
                      background: 'var(--insights-check-bg)',
                      color: 'var(--insights-accent)',
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                      fontSize: 13,
                      fontWeight: 700,
                    }}
                  >
                    ✓
                  </span>
                  {cap}
                </li>
              ))}
              <li style={{ marginTop: 24 }}>
                <a
                  href="#"
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 6,
                    color: 'var(--insights-accent)',
                    fontSize: 14,
                    fontWeight: 600,
                    textDecoration: 'none',
                  }}
                >
                  Conoce Channelad Insights →
                </a>
              </li>
            </motion.ul>

            {/* Stat ribbon */}
            <motion.div
              variants={scaleIn}
              style={{
                background: 'var(--insights-card-bg)',
                border: '1px solid var(--insights-card-border)',
                borderRadius: 20,
                padding: 32,
                textAlign: 'center',
              }}
            >
              <div
                style={{
                  fontFamily: D,
                  fontSize: 'clamp(48px, 6vw, 72px)',
                  fontWeight: 800,
                  color: 'var(--insights-accent)',
                  lineHeight: 1,
                  letterSpacing: '-0.04em',
                }}
              >
                {INSIGHTS_DATASET_COUNT}+
              </div>
              <div
                style={{
                  fontSize: 13,
                  color: 'var(--insights-text-muted)',
                  marginTop: 10,
                  textTransform: 'uppercase',
                  letterSpacing: '0.1em',
                  fontWeight: 600,
                }}
              >
                canales analizados
              </div>
              <div
                style={{
                  fontSize: 12,
                  color: 'var(--insights-text-soft)',
                  marginTop: 16,
                  paddingTop: 16,
                  borderTop: '1px solid var(--insights-divider)',
                  lineHeight: 1.6,
                }}
              >
                Telegram, WhatsApp, Discord y newsletters. Scoring continuo, no snapshots.
              </div>
            </motion.div>
          </div>

          <style>{`
            /* Light theme (default) — soft purple-tinted background, dark text. */
            .lp-insights-section {
              background:
                radial-gradient(ellipse 90% 55% at 80% 20%, rgba(168, 85, 247, 0.14) 0%, transparent 60%),
                linear-gradient(180deg, rgba(124, 58, 237, 0.04) 0%, rgba(168, 85, 247, 0.10) 100%);
              --insights-text: #0F1115;
              --insights-text-muted: rgba(15, 17, 21, 0.62);
              --insights-text-soft: rgba(15, 17, 21, 0.45);
              --insights-accent: #7C3AED;
              --insights-divider: rgba(15, 17, 21, 0.08);
              --insights-card-bg: rgba(124, 58, 237, 0.06);
              --insights-card-border: rgba(124, 58, 237, 0.20);
              --insights-check-bg: rgba(124, 58, 237, 0.12);
            }
            /* Dark theme — keep the deep "spotlight" feel. */
            [data-theme="dark"] .lp-insights-section {
              background: linear-gradient(180deg, #0F1115 0%, #1a0f2e 100%);
              --insights-text: #fff;
              --insights-text-muted: rgba(255, 255, 255, 0.65);
              --insights-text-soft: rgba(255, 255, 255, 0.50);
              --insights-accent: #A855F7;
              --insights-divider: rgba(255, 255, 255, 0.08);
              --insights-card-bg: rgba(168, 85, 247, 0.08);
              --insights-card-border: rgba(168, 85, 247, 0.22);
              --insights-check-bg: rgba(168, 85, 247, 0.18);
            }
            @media (max-width: 900px) {
              .insights-split { grid-template-columns: 1fr !important; }
            }
          `}</style>
        </div>
      </MotionSection>

      {/* ══════════════════════════════════════════════════════════════════
          6 · COMPARISON — reuses ComparisonSection from main landing
             ("Paid Ads vs. Channelad" two-card layout with VS badge).
          ══════════════════════════════════════════════════════════════════ */}
      <Suspense fallback={<div style={{ minHeight: 560 }} aria-hidden="true" />}>
        <ComparisonSection background="transparent" sectionId="comparativa" />
      </Suspense>

      {/* ══════════════════════════════════════════════════════════════════
          7 · ESCROW FLOW — "Tu dinero, en cada paso"
             Reuses EscrowFlowAnimation from main landing + adds explanatory
             cards (one per step, two-sentence detail). Active step in the
             timeline highlights the matching card and vice versa.
          ══════════════════════════════════════════════════════════════════ */}
      <Suspense fallback={<div style={{ minHeight: 560 }} aria-hidden="true" />}>
        <EscrowFlowAnimation background="transparent" sectionId="escrow-flow" />
      </Suspense>

      {/* ══════════════════════════════════════════════════════════════════
          8 · CALCULADORA DE CAMPAÑA — el mismo ChannelCalculator unificado
             pero con role="advertiser": inputs presupuesto + duración,
             outputs alcance + comparativa con Meta/Google.
          ══════════════════════════════════════════════════════════════════ */}
      <Suspense fallback={<div style={{ minHeight: 640 }} aria-hidden="true" />}>
        <ChannelCalculator
          variant="landing"
          sectionId="calculadora"
          background="transparent"
          initialRole="advertiser"
        />
      </Suspense>

      {/* ══════════════════════════════════════════════════════════════════
          9 · PRICING — premium 2-col card with savings example + CTA
          ══════════════════════════════════════════════════════════════════ */}
      <MotionSection style={{ padding: '100px 48px', background: 'transparent', position: 'relative' }}>
        <div style={{ maxWidth: 980, margin: '0 auto', position: 'relative' }}>
          {/* Header */}
          <motion.div variants={fadeUp} style={{ textAlign: 'center', marginBottom: 56 }}>
            <p
              style={{
                fontSize: 11,
                fontWeight: 600,
                color: A,
                textTransform: 'uppercase',
                letterSpacing: '0.1em',
                marginBottom: 12,
              }}
            >
              Pricing
            </p>
            <h2
              style={{
                fontFamily: D,
                fontSize: 'clamp(28px, 3.4vw, 42px)',
                fontWeight: 700,
                letterSpacing: '-0.03em',
                color: 'var(--text)',
                marginBottom: 14,
                lineHeight: 1.1,
              }}
            >
              Precio sin sorpresas
            </h2>
            <p style={{ fontSize: 16, color: 'var(--muted)', lineHeight: 1.7, margin: 0, maxWidth: 560, marginLeft: 'auto', marginRight: 'auto' }}>
              Una sola comisión sobre el GMV de cada campaña. Cero fee de alta, cero costes ocultos,
              cero contratos anuales.
            </p>
          </motion.div>

          {/* Premium pricing card — translucent surface, ambient glow, 2-col grid */}
          <div style={{ position: 'relative' }}>
            {/* Ambient glow behind */}
            <div
              aria-hidden="true"
              style={{
                position: 'absolute',
                inset: '-40px -60px',
                background:
                  'radial-gradient(ellipse 80% 60% at 50% 50%, rgba(124, 58, 237, 0.18) 0%, transparent 70%)',
                filter: 'blur(50px)',
                pointerEvents: 'none',
                zIndex: 0,
              }}
            />

            <motion.div
              variants={scaleIn}
              style={{
                position: 'relative',
                zIndex: 1,
                background: 'var(--surface)',
                border: `1px solid ${AG(0.22)}`,
                borderRadius: 24,
                boxShadow: `0 1px 0 0 rgba(255,255,255,0.7) inset, 0 40px 80px -24px ${AG(0.22)}, 0 16px 40px -12px rgba(15, 17, 21, 0.08)`,
                overflow: 'hidden',
              }}
            >
              {/* Top reflective highlight */}
              <div
                aria-hidden="true"
                style={{
                  position: 'absolute',
                  top: 0,
                  left: '15%',
                  right: '15%',
                  height: 1,
                  background:
                    'linear-gradient(90deg, transparent 0%, rgba(124,58,237,0.35) 50%, transparent 100%)',
                }}
              />

              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr',
                  gap: 0,
                }}
                className="pricing-card-grid"
              >
                {/* ─── LEFT: 20% + comparison + savings example ─── */}
                <div
                  style={{
                    padding: 'clamp(32px, 4vw, 48px)',
                    borderRight: '1px solid var(--border)',
                  }}
                  className="pricing-left"
                >
                  <p
                    style={{
                      fontSize: 11,
                      fontWeight: 700,
                      color: A,
                      textTransform: 'uppercase',
                      letterSpacing: '0.14em',
                      marginBottom: 14,
                      marginTop: 0,
                    }}
                  >
                    Comisión única
                  </p>

                  {/* Big 20% with gradient */}
                  <div
                    style={{
                      fontFamily: D,
                      fontSize: 'clamp(64px, 8vw, 96px)',
                      fontWeight: 800,
                      lineHeight: 1,
                      letterSpacing: '-0.05em',
                      marginBottom: 8,
                      background: 'linear-gradient(135deg, #7C3AED 0%, #A855F7 100%)',
                      WebkitBackgroundClip: 'text',
                      WebkitTextFillColor: 'transparent',
                      backgroundClip: 'text',
                    }}
                  >
                    {PUBLIC_COMMISSION_LABEL}
                  </div>
                  <div
                    style={{
                      fontSize: 13,
                      color: 'var(--muted)',
                      textTransform: 'uppercase',
                      letterSpacing: '0.1em',
                      fontWeight: 600,
                      marginBottom: 28,
                    }}
                  >
                    sobre el GMV de cada campaña
                  </div>

                  {/* Comparison bars */}
                  <div
                    style={{
                      padding: '18px 20px',
                      background: 'var(--bg2)',
                      borderRadius: 12,
                      border: '1px solid var(--border)',
                      marginBottom: 18,
                    }}
                  >
                    <ComparisonBar label="Channelad" value={20} suffix="% sobre GMV" highlight />
                    <div style={{ height: 12 }} />
                    <ComparisonBar label="Agencia tradicional" value={35} suffix="% + retainer" />
                  </div>

                  {/* Savings example — concrete numbers */}
                  <div
                    style={{
                      padding: 16,
                      background: 'linear-gradient(135deg, rgba(34,197,94,0.06) 0%, rgba(34,197,94,0.10) 100%)',
                      border: '1px solid rgba(34, 197, 94, 0.20)',
                      borderRadius: 12,
                    }}
                  >
                    <p
                      style={{
                        fontSize: 10,
                        fontWeight: 700,
                        color: '#15803d',
                        textTransform: 'uppercase',
                        letterSpacing: '0.12em',
                        margin: 0,
                        marginBottom: 10,
                      }}
                    >
                      Ejemplo · campaña de 1.000 €
                    </p>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 6, fontSize: 13 }}>
                      <span style={{ color: 'var(--text)', fontWeight: 500 }}>Channelad</span>
                      <span style={{ color: 'var(--text)', fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>200 €</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 10, fontSize: 13 }}>
                      <span style={{ color: 'var(--muted)' }}>Agencia tradicional</span>
                      <span style={{ color: 'var(--muted)', fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>≥ 550 €</span>
                    </div>
                    <div
                      style={{
                        paddingTop: 10,
                        borderTop: '1px solid rgba(34, 197, 94, 0.15)',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'baseline',
                      }}
                    >
                      <span style={{ fontSize: 12, color: '#15803d', fontWeight: 600 }}>Ahorras hasta</span>
                      <span
                        style={{
                          fontSize: 17,
                          color: '#15803d',
                          fontWeight: 800,
                          letterSpacing: '-0.02em',
                          fontFamily: D,
                          fontVariantNumeric: 'tabular-nums',
                        }}
                      >
                        350 € · 64%
                      </span>
                    </div>
                  </div>
                </div>

                {/* ─── RIGHT: Qué incluye + CTA ─── */}
                <div
                  style={{
                    padding: 'clamp(32px, 4vw, 48px)',
                    display: 'flex',
                    flexDirection: 'column',
                  }}
                  className="pricing-right"
                >
                  <p
                    style={{
                      fontSize: 11,
                      fontWeight: 700,
                      color: A,
                      textTransform: 'uppercase',
                      letterSpacing: '0.14em',
                      marginBottom: 22,
                      marginTop: 0,
                    }}
                  >
                    Qué incluye
                  </p>

                  <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 14, flex: 1 }}>
                    {PRICING_INCLUDES.map((inc) => {
                      const Icon = inc.icon
                      return (
                        <li
                          key={inc.label}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 14,
                            fontSize: 14,
                            color: 'var(--text)',
                          }}
                        >
                          <span
                            style={{
                              width: 36,
                              height: 36,
                              borderRadius: 10,
                              background: AG(0.10),
                              border: `1px solid ${AG(0.18)}`,
                              color: A,
                              display: 'inline-flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              flexShrink: 0,
                            }}
                          >
                            <Icon size={17} strokeWidth={1.9} />
                          </span>
                          <span style={{ fontWeight: 500 }}>{inc.label}</span>
                        </li>
                      )
                    })}
                  </ul>

                  {/* CTA — premium gradient button */}
                  <Link
                    to="/auth/register"
                    style={{
                      marginTop: 28,
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 8,
                      width: '100%',
                      padding: '14px 24px',
                      borderRadius: 12,
                      background: 'linear-gradient(180deg, #8B5CF6 0%, #7C3AED 100%)',
                      color: '#fff',
                      fontSize: 15,
                      fontWeight: 600,
                      letterSpacing: '-0.005em',
                      textDecoration: 'none',
                      fontFamily: F,
                      boxShadow:
                        '0 1px 0 0 rgba(255,255,255,0.18) inset, 0 12px 28px -8px rgba(124,58,237,0.45), 0 4px 10px -2px rgba(124,58,237,0.30)',
                      transition: 'transform .25s cubic-bezier(.22,1,.36,1), box-shadow .25s, background .25s',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = 'linear-gradient(180deg, #A78BFA 0%, #8B5CF6 100%)'
                      e.currentTarget.style.transform = 'translateY(-1px)'
                      e.currentTarget.style.boxShadow =
                        '0 1px 0 0 rgba(255,255,255,0.25) inset, 0 18px 36px -8px rgba(124,58,237,0.55), 0 6px 14px -2px rgba(124,58,237,0.35)'
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = 'linear-gradient(180deg, #8B5CF6 0%, #7C3AED 100%)'
                      e.currentTarget.style.transform = 'none'
                      e.currentTarget.style.boxShadow =
                        '0 1px 0 0 rgba(255,255,255,0.18) inset, 0 12px 28px -8px rgba(124,58,237,0.45), 0 4px 10px -2px rgba(124,58,237,0.30)'
                    }}
                  >
                    Reservar plaza
                    <ArrowRight size={16} strokeWidth={2.4} />
                  </Link>
                </div>
              </div>

              {/* Footer chips — full width below the grid */}
              <div
                style={{
                  borderTop: '1px solid var(--border)',
                  background: 'var(--bg2)',
                  padding: '16px 24px',
                  display: 'flex',
                  gap: 18,
                  justifyContent: 'center',
                  flexWrap: 'wrap',
                  fontSize: 12,
                  color: 'var(--muted)',
                }}
              >
                <PricingChip>Sin fee de alta</PricingChip>
                <PricingChip>Sin mínimos mensuales</PricingChip>
                <PricingChip>Sin compromiso</PricingChip>
                <PricingChip>Escrow incluido</PricingChip>
              </div>
            </motion.div>
          </div>
        </div>

        <style>{`
          @media (max-width: 760px) {
            .pricing-card-grid { grid-template-columns: 1fr !important; }
            .pricing-left { border-right: none !important; border-bottom: 1px solid var(--border); }
          }
        `}</style>
      </MotionSection>

      {/* ══════════════════════════════════════════════════════════════════
          10 · FAQ
          ══════════════════════════════════════════════════════════════════ */}
      <MotionSection style={{ padding: '100px 48px', background: 'transparent' }}>
        <div style={{ maxWidth: 760, margin: '0 auto' }}>
          <motion.div variants={fadeUp} style={{ textAlign: 'center', marginBottom: 48 }}>
            <p
              style={{
                fontSize: 11,
                fontWeight: 600,
                color: A,
                textTransform: 'uppercase',
                letterSpacing: '0.1em',
                marginBottom: 12,
              }}
            >
              FAQ
            </p>
            <h2
              style={{
                fontFamily: D,
                fontSize: 'clamp(26px, 3vw, 36px)',
                fontWeight: 700,
                letterSpacing: '-0.025em',
                color: 'var(--text)',
              }}
            >
              Preguntas frecuentes
            </h2>
          </motion.div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {FAQS.map((faq, i) => {
              const open = openFaq === i
              return (
                <motion.div
                  key={i}
                  variants={staggerItem}
                  style={{
                    background: 'var(--surface)',
                    border: `1px solid ${open ? AG(0.22) : 'var(--border)'}`,
                    borderRadius: 14,
                    overflow: 'hidden',
                    transition: 'border-color .2s',
                  }}
                >
                  <button
                    onClick={() => setOpenFaq(open ? null : i)}
                    style={{
                      width: '100%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '20px 24px',
                      background: 'transparent',
                      border: 'none',
                      cursor: 'pointer',
                      textAlign: 'left',
                      gap: 16,
                    }}
                    aria-expanded={open}
                  >
                    <span style={{ fontSize: 15, fontWeight: 500, color: open ? A : 'var(--text)', fontFamily: F }}>
                      {faq.q}
                    </span>
                    <motion.svg
                      animate={{ rotate: open ? 45 : 0 }}
                      transition={{ duration: 0.3 }}
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      style={{ color: open ? A : 'var(--muted)', flexShrink: 0 }}
                    >
                      <path d="M12 5v14M5 12h14" />
                    </motion.svg>
                  </button>
                  <AnimatePresence>
                    {open && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.3, ease: [0.25, 0.46, 0.45, 0.94] }}
                        style={{ overflow: 'hidden' }}
                      >
                        <div style={{ padding: '0 24px 20px' }}>
                          <p style={{ fontSize: 14, color: 'var(--muted)', lineHeight: 1.7, margin: 0 }}>
                            {faq.a}
                          </p>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              )
            })}
          </div>
        </div>
      </MotionSection>

      {/* ══════════════════════════════════════════════════════════════════
          11 · FINAL CTA + FOOTER
          ══════════════════════════════════════════════════════════════════ */}
      <MotionSection style={{ padding: '0 48px 100px', background: 'transparent' }}>
        <motion.div
          variants={scaleIn}
          style={{
            maxWidth: MAX_W,
            margin: '0 auto',
            background: 'linear-gradient(135deg, #0F1115 0%, #1a0f2e 50%, #0F1115 100%)',
            border: `1px solid ${AG(0.18)}`,
            borderRadius: 24,
            padding: '64px 56px',
            textAlign: 'center',
            position: 'relative',
            overflow: 'hidden',
          }}
        >
          <div className="dot-pattern" style={{ position: 'absolute', inset: 0, opacity: 0.25, pointerEvents: 'none' }} />
          <div style={{ position: 'relative', zIndex: 1 }}>
            <h2
              style={{
                fontFamily: D,
                fontSize: 'clamp(28px, 3.4vw, 40px)',
                fontWeight: 700,
                color: '#fff',
                marginBottom: 14,
                letterSpacing: '-0.02em',
                lineHeight: 1.15,
              }}
            >
              Tu primera campaña, sin DMs.
            </h2>
            <p
              style={{
                fontSize: 16,
                color: 'rgba(255,255,255,0.65)',
                lineHeight: 1.7,
                maxWidth: 560,
                margin: '0 auto 32px',
              }}
            >
              Plazas limitadas. Verificamos cada anunciante: KYC, dominio y método de pago.
              Para mantener la calidad del catálogo.
            </p>
            <div style={{ display: 'flex', gap: 14, justifyContent: 'center', flexWrap: 'wrap', marginBottom: 24 }}>
              <Link
                to="/auth/register"
                style={{
                  display: 'inline-block',
                  background: A,
                  color: '#fff',
                  padding: '14px 36px',
                  borderRadius: 12,
                  fontWeight: 600,
                  fontSize: 15,
                  textDecoration: 'none',
                  boxShadow: `0 0 30px ${AG(0.35)}`,
                  transition: 'all .2s',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = '#A855F7'
                  e.currentTarget.style.transform = 'translateY(-2px)'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = A
                  e.currentTarget.style.transform = 'none'
                }}
              >
                Reservar plaza
              </Link>
            </div>
            <p
              style={{
                fontSize: 11,
                color: 'rgba(255,255,255,0.4)',
                margin: 0,
                paddingTop: 20,
                borderTop: '1px solid rgba(255,255,255,0.08)',
              }}
            >
              Operado por MICHI SOLUCIONS S.L. (en constitución) · Madrid · Solo te escribimos sobre tu
              cuenta. Cancela el aviso cuando quieras desde cualquier email.
            </p>
          </div>
        </motion.div>
      </MotionSection>

      <CrossLinks exclude="/para-anunciantes" />
    </div>
  )
}
