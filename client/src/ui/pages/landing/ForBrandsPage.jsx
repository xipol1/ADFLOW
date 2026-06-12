import React, { useState, lazy, Suspense } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { Helmet } from 'react-helmet-async'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Shield, Globe, Lock, ShieldCheck, BarChart3, Sparkles, MessageCircle,
  ArrowRight, XCircle, CheckCircle2,
} from 'lucide-react'
import SEO from '../../components/SEO'
import CrossLinks from '../../components/landing/CrossLinks'
import MotionSection, { fadeUp } from '../../components/landing/MotionSection'
import BrowserChrome from '../../components/landing/demo/BrowserChrome'
import DemoCatalogo from '../../components/landing/demo/DemoCatalogo'
import { FONT_BODY, FONT_DISPLAY, PLATFORM_BRAND } from '../../theme/tokens'
import { TYPE, SPACE, ACCENT } from '../../theme/landingScale'
import { PUBLIC_COMMISSION_LABEL, CHANNELS_TRACKED_LABEL } from '../../theme/stats'

// Below-the-fold product screens stay lazy so they leave the entry chunk.
// The hero catalog (BrowserChrome + DemoCatalogo) is eager: it IS the LCP
// visual and must paint with the first chunk.
const StickyScrollTour = lazy(() => import('../../components/landing/StickyScrollTour'))
const DemoEscrowPayment = lazy(() => import('../../components/landing/demo/DemoEscrowPayment'))
const DemoLivePublication = lazy(() => import('../../components/landing/demo/DemoLivePublication'))
const DemoFinalResults = lazy(() => import('../../components/landing/demo/DemoFinalResults'))

const F = FONT_BODY
const D = FONT_DISPLAY

// Pre-launch FAQ minimum (overridable when first verified channel lands).
const MIN_BUDGET_EUR = '30'

// '+2.500' — single source with the rest of the site (theme/stats.js).
const CHANNELS_LABEL = CHANNELS_TRACKED_LABEL.split(' ')[0]

/* ─── Sección 2 — Trust bar entries ──────────────────────────────────── */
const TRUST_PLATFORMS = [
  { key: 'telegram',   label: PLATFORM_BRAND.telegram.label,   color: PLATFORM_BRAND.telegram.color },
  { key: 'whatsapp',   label: PLATFORM_BRAND.whatsapp.label,   color: PLATFORM_BRAND.whatsapp.color },
  { key: 'discord',    label: PLATFORM_BRAND.discord.label,    color: PLATFORM_BRAND.discord.color },
  { key: 'instagram',  label: 'Instagram Broadcasts',          color: PLATFORM_BRAND.instagram.color },
  { key: 'newsletter', label: PLATFORM_BRAND.newsletter.label, color: '#b45309' },
]

/* ─── Sección 3 — Tour steps (texto del rail) ────────────────────────── */
const TOUR_STEPS = [
  {
    kicker: 'Descubre',
    title: 'Explora el catálogo verificado',
    desc: 'Filtra por plataforma, nicho, audiencia y precio. Cada canal entra al catálogo con verificación técnica y métricas propias, no con screenshots.',
  },
  {
    kicker: 'Paga seguro',
    title: 'El dinero queda en escrow',
    desc: 'Defines la campaña y pagas con Stripe. Los fondos quedan retenidos hasta que la publicación se verifica. Si el canal no publica, se devuelven.',
  },
  {
    kicker: 'Se publica',
    title: 'Publicación verificada, no prometida',
    desc: 'El creador publica en su comunidad y los tracking links confirman la entrega de forma automática. Lo sigues en vivo desde el panel.',
  },
  {
    kicker: 'Mide',
    title: 'Resultados que puedes auditar',
    desc: 'Clics únicos, CTR y CPM efectivo de cada campaña. Cuando la entrega se confirma, el escrow se libera. Sin negociar, sin perseguir a nadie.',
  },
]

/* ─── Sección 4 — Por qué es seguro ──────────────────────────────────── */
const SAFE_MONEY = [
  'El pago queda retenido hasta que el canal publica y verificamos la entrega.',
  'Si no se cumple lo acordado, el importe vuelve íntegro a tu método de pago.',
  'La liberación es automática tras la verificación. Ninguna parte puede saltársela.',
]
const SAFE_DATA = [
  'Compara CPM benchmarks por plataforma y nicho antes de reservar.',
  'Detecta canales con tráfico inflado o farms de bots.',
  'Mide engagement real con seis métricas propias calculadas sobre el catálogo.',
]

/* ─── Sección 5 — Comparativa (fusión problema + comparison) ─────────── */
const COMPARE_ROWS = [
  { label: 'Encontrar canales', dm: 'Horas de DMs y screenshots',        cl: 'Catálogo con métricas verificadas' },
  { label: 'Saber cuánto pagar', dm: 'El precio que diga el dueño',      cl: 'Benchmarks de CPM por nicho' },
  { label: 'Pagar',              dm: 'Transferencia por adelantado',     cl: 'Escrow: se libera al verificar' },
  { label: 'Medir',              dm: 'Capturas que envía el propietario', cl: 'Tracking links y métricas certificadas' },
]

/* ─── Sección 6 — Pricing inclusions ─────────────────────────────────── */
const PRICING_INCLUDES = [
  { icon: ShieldCheck,   label: 'Catálogo de canales verificados' },
  { icon: Lock,          label: 'Pago protegido en escrow' },
  { icon: BarChart3,     label: 'Métricas certificadas por campaña' },
  { icon: Sparkles,      label: 'Acceso a Channelad Insights' },
  { icon: MessageCircle, label: 'Soporte humano en español' },
]

/* ─── Sección 7 — FAQ (sincronizada con el JSON-LD FAQPage de abajo) ── */
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
   SMALL BUILDING BLOCKS
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
        fontSize: TYPE.label.fontSize,
        fontWeight: 500,
        color: 'var(--text)',
      }}
    >
      <Icon size={13} strokeWidth={2} style={{ flexShrink: 0 }} />
      {label}
    </span>
  )
}

function HeroStat({ value, label }) {
  return (
    <div>
      <p
        style={{
          fontFamily: FONT_DISPLAY,
          ...TYPE.titleM,
          fontWeight: 700,
          color: 'var(--text)',
          margin: 0,
        }}
      >
        {value}
      </p>
      <p style={{ ...TYPE.label, color: 'var(--muted)', margin: '6px 0 0' }}>{label}</p>
    </div>
  )
}

// Kicker + H2 (+ intro) header shared by every section.
function SectionHeader({ eyebrow, title, intro, align = 'center' }) {
  return (
    <motion.div
      variants={fadeUp}
      style={{
        textAlign: align,
        maxWidth: SPACE.maxText,
        margin: align === 'center' ? `0 auto ${SPACE.gapL}px` : `0 0 ${SPACE.gapL}px`,
      }}
    >
      <p style={{ ...TYPE.label, color: ACCENT, margin: '0 0 12px' }}>{eyebrow}</p>
      <h2 style={{ ...TYPE.displayL, fontFamily: D, color: 'var(--text)', margin: 0, textWrap: 'balance' }}>{title}</h2>
      {intro && (
        <p style={{ ...TYPE.bodyL, color: 'var(--muted)', margin: '16px 0 0' }}>{intro}</p>
      )}
    </motion.div>
  )
}

function Section({ id, surface = false, children, style }) {
  return (
    <MotionSection
      id={id}
      style={{
        padding: `${SPACE.sectionY} ${SPACE.gutter}`,
        background: surface ? 'var(--bg2)' : 'transparent',
        ...style,
      }}
    >
      <div style={{ maxWidth: SPACE.maxSection, margin: '0 auto' }}>{children}</div>
    </MotionSection>
  )
}

function CtaButton({ as: Tag = 'button', children, ...props }) {
  const base = {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    background: ACCENT,
    color: '#fff',
    border: 'none',
    borderRadius: 12,
    padding: '13px 28px',
    fontSize: TYPE.bodyM.fontSize,
    fontWeight: 600,
    fontFamily: F,
    cursor: 'pointer',
    textDecoration: 'none',
    transition: 'background .2s ease',
  }
  return (
    <Tag
      {...props}
      style={{ ...base, ...(props.style || {}) }}
      onMouseEnter={(e) => { e.currentTarget.style.background = '#6D28D9' }}
      onMouseLeave={(e) => { e.currentTarget.style.background = ACCENT }}
    >
      {children}
    </Tag>
  )
}

/* ═══════════════════════════════════════════════════════════════════════
   MAIN COMPONENT
   ═══════════════════════════════════════════════════════════════════════ */
export default function ForBrandsPage() {
  const [openFaq, setOpenFaq] = useState(null)
  const [heroEmail, setHeroEmail] = useState('')
  const [heroForm, setHeroForm] = useState({ status: 'idle', message: '' })
  const location = useLocation()
  const isOnRootPath = location?.pathname === '/' || location?.pathname === ''

  const handleHeroEmailSubmit = async (e) => {
    e.preventDefault()
    if (!heroEmail.includes('@') || heroForm.status === 'loading') return
    setHeroForm({ status: 'loading', message: '' })
    try {
      const res = await fetch('/api/founder-waitlist/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: heroEmail, source: 'home-hero' }),
      })
      const data = await res.json().catch(() => ({}))
      if (res.ok && data.success !== false) {
        setHeroForm({
          status: 'success',
          message: data.message || 'Registro recibido. Revisa tu email para confirmar tu plaza.',
        })
        setHeroEmail('')
      } else {
        setHeroForm({
          status: 'error',
          message: data.message || 'No hemos podido registrarte. Inténtalo de nuevo.',
        })
      }
    } catch {
      setHeroForm({ status: 'error', message: 'Sin conexión con el servidor. Inténtalo de nuevo.' })
    }
  }

  const seoTitle = isOnRootPath
    ? 'Channelad — Publicidad en canales privados verificados'
    : 'Publicidad en canales privados para marcas'
  const seoDescription = isOnRootPath
    ? 'Channelad conecta tu marca con canales verificados de Telegram, WhatsApp, Discord y newsletters. Pago en escrow, métricas certificadas y benchmarks de CPM antes de pagar.'
    : 'Compra publicidad en canales verificados de Telegram, WhatsApp, Discord y newsletters. Pago en escrow, métricas certificadas, benchmarks de CPM antes de pagar.'
  const seoPath = isOnRootPath ? '/' : '/para-anunciantes'

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
    // Background: flat var(--bg). The accent lives only in CTAs, focus and
    // one datum per section — never in page-level gradients.
    <div
      data-testid="for-brands-page"
      style={{
        fontFamily: F,
        color: 'var(--text)',
        background: 'var(--bg)',
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
      <SEO title={seoTitle} description={seoDescription} path={seoPath} type="website" />

      {/* ══════════════════════════════════════════════════════════════════
          1 · HERO — one idea, one product visual.
          Fully static markup (no motion components): the hero is prerendered
          as a snapshot into #root (scripts/snapshot-home.js), so the mounted
          render must match the painted snapshot exactly.
          ══════════════════════════════════════════════════════════════════ */}
      <section
        style={{
          padding: `${SPACE.sectionY} ${SPACE.gutter} clamp(48px, 6vw, 88px)`,
          position: 'relative',
        }}
      >
        <div style={{ maxWidth: SPACE.maxSection, margin: '0 auto' }}>
          <div
            className="hero-split"
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1.05fr',
              gap: SPACE.gapL,
              alignItems: 'center',
            }}
          >
            {/* ─── LEFT — text ─── */}
            <div>
              <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 8, marginBottom: SPACE.gapS }}>
                <TrustPill icon={Shield} label="GDPR" />
                <TrustPill icon={Globe} label="Hosting EU" />
                <TrustPill icon={Lock} label="Pago en escrow" />
              </div>

              <h1
                style={{
                  fontFamily: D,
                  ...TYPE.displayXl,
                  color: 'var(--text)',
                  margin: `0 0 ${SPACE.gapS}px`,
                }}
              >
                Anuncia donde Google y Meta no llegan.
              </h1>

              <p
                style={{
                  ...TYPE.bodyL,
                  color: 'var(--muted)',
                  maxWidth: 520,
                  margin: `0 0 ${SPACE.gapM}px`,
                }}
              >
                Canales verificados de Telegram, WhatsApp, Discord y newsletters.
                Pago en escrow y benchmarks de CPM antes de pagar.
              </p>

              <form
                id="hero-cta"
                onSubmit={handleHeroEmailSubmit}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  background: 'var(--bg2)',
                  border: '1px solid var(--border)',
                  borderRadius: 999,
                  padding: 6,
                  maxWidth: 440,
                  marginBottom: 14,
                  transition: 'border-color .2s',
                }}
                onFocusCapture={(e) => { e.currentTarget.style.borderColor = ACCENT }}
                onBlurCapture={(e) => { e.currentTarget.style.borderColor = 'var(--border)' }}
              >
                <input
                  type="email"
                  required
                  placeholder="Tu email"
                  aria-label="Tu email"
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
                  disabled={heroForm.status === 'loading'}
                  style={{
                    background: ACCENT,
                    color: '#fff',
                    border: 'none',
                    borderRadius: 999,
                    padding: '11px 22px',
                    fontSize: 14,
                    fontWeight: 600,
                    cursor: heroForm.status === 'loading' ? 'wait' : 'pointer',
                    whiteSpace: 'nowrap',
                    fontFamily: F,
                    transition: 'background .2s ease',
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = '#6D28D9' }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = ACCENT }}
                >
                  {heroForm.status === 'loading' ? 'Enviando…' : 'Reservar plaza'}
                </button>
              </form>

              <div style={{ minHeight: 22, marginBottom: 8 }} aria-live="polite">
                {heroForm.message && (
                  <p
                    style={{
                      fontSize: 13,
                      color: heroForm.status === 'success' ? '#15803d' : '#b91c1c',
                      fontWeight: 500,
                      margin: 0,
                    }}
                  >
                    {heroForm.status === 'success' ? '✓ ' : ''}{heroForm.message}
                  </p>
                )}
              </div>

              <a
                href="#how-it-works"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                  fontSize: 14,
                  fontWeight: 500,
                  color: 'var(--text)',
                  textDecoration: 'none',
                }}
              >
                Ver cómo funciona <ArrowRight size={14} strokeWidth={2.2} />
              </a>
            </div>

            {/* ─── RIGHT — the product itself, anonymized channel data ─── */}
            <div className="hero-visual">
              <BrowserChrome url="channelad.io/explorar">
                <DemoCatalogo />
              </BrowserChrome>
            </div>
          </div>

          {/* Full-width stat strip — closes the hero, no dead air on either
              column. One divider, three figures, done. */}
          <div
            style={{
              marginTop: SPACE.gapL,
              paddingTop: SPACE.gapM,
              borderTop: '1px solid var(--border)',
              display: 'flex',
              gap: 'clamp(32px, 8vw, 120px)',
              flexWrap: 'wrap',
            }}
          >
            <HeroStat value={CHANNELS_LABEL} label="Canales analizados" />
            <HeroStat value="5" label="Plataformas cubiertas" />
            <HeroStat value="Día 1" label="Pago en escrow" />
          </div>
        </div>

        <style>{`
          @media (max-width: 900px) {
            .hero-split { grid-template-columns: 1fr !important; }
          }
          /* Keyboard focus — same accent ring everywhere on the page. */
          [data-testid="for-brands-page"] a:focus-visible,
          [data-testid="for-brands-page"] button:focus-visible {
            outline: 2px solid ${ACCENT};
            outline-offset: 2px;
          }
          /* The email input signals focus via the form's border (see
             onFocusCapture); a second ring inside the pill reads as noise. */
          [data-testid="for-brands-page"] #hero-cta input:focus-visible {
            outline: none;
          }
          [data-testid="for-brands-page"] .faq-item {
            transition: border-color .15s ease, background .15s ease;
          }
          [data-testid="for-brands-page"] .faq-item:hover {
            border-color: var(--border-med, #c4c9d2);
            background: var(--bg2);
          }
        `}</style>
      </section>

      {/* ══════════════════════════════════════════════════════════════════
          2 · TRUST BAR — platforms covered (no client logos pre-launch)
          ══════════════════════════════════════════════════════════════════ */}
      <MotionSection style={{ padding: `clamp(24px, 3vw, 40px) ${SPACE.gutter} clamp(40px, 5vw, 64px)` }}>
        <motion.div variants={fadeUp} style={{ maxWidth: SPACE.maxSection, margin: '0 auto' }}>
          <p style={{ ...TYPE.label, color: 'var(--muted)', textAlign: 'center', margin: '0 0 20px' }}>
            Operamos en las plataformas de comunidad que importan
          </p>
          <div style={{ display: 'flex', gap: 14, justifyContent: 'center', flexWrap: 'wrap', alignItems: 'center' }}>
            {TRUST_PLATFORMS.map((p) => (
              <span
                key={p.key}
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
                <span style={{ width: 8, height: 8, borderRadius: '50%', background: p.color }} />
                {p.label}
              </span>
            ))}
          </div>
        </motion.div>
      </MotionSection>

      {/* ══════════════════════════════════════════════════════════════════
          3 · CÓMO FUNCIONA — sticky scroll tour over real product screens
          ══════════════════════════════════════════════════════════════════ */}
      <Suspense fallback={<div style={{ minHeight: 900 }} aria-hidden="true" />}>
        <StickyScrollTour
          sectionId="how-it-works"
          eyebrow="Cómo funciona"
          title="De la idea al resultado"
          subtitle="Cuatro pasos. El pago, protegido en todos."
          steps={TOUR_STEPS}
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
          4 · POR QUÉ ES SEGURO — escrow + datos (fusión Insights/Escrow)
          ══════════════════════════════════════════════════════════════════ */}
      <Section id="por-que-seguro" surface>
        <SectionHeader
          eyebrow="Seguridad"
          title="Datos antes. Dinero protegido."
          intro="Cada campaña se decide con benchmarks y se paga con escrow. Las dos cosas, de serie."
        />
        <div
          className="safe-split"
          style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: SPACE.gapM }}
        >
          {[
            { title: 'Tu dinero', items: SAFE_MONEY },
            { title: 'Tus decisiones', items: SAFE_DATA },
          ].map((col) => (
            <motion.div
              key={col.title}
              variants={fadeUp}
              style={{
                background: 'var(--surface)',
                border: '1px solid var(--border)',
                borderRadius: 16,
                padding: SPACE.gapM,
              }}
            >
              <h3 style={{ ...TYPE.titleM, fontFamily: D, color: 'var(--text)', margin: `0 0 ${SPACE.gapS}px` }}>
                {col.title}
              </h3>
              <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                {col.items.map((item, i) => (
                  <li
                    key={i}
                    style={{
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: 12,
                      padding: '12px 0',
                      borderBottom: i < col.items.length - 1 ? '1px solid var(--border)' : 'none',
                      ...TYPE.bodyM,
                      color: 'var(--text)',
                    }}
                  >
                    <CheckCircle2 size={18} strokeWidth={2} style={{ color: ACCENT, flexShrink: 0, marginTop: 2 }} />
                    {item}
                  </li>
                ))}
              </ul>
            </motion.div>
          ))}
        </div>
        <motion.p
          variants={fadeUp}
          style={{
            ...TYPE.bodyM,
            color: 'var(--muted)',
            textAlign: 'center',
            maxWidth: SPACE.maxText,
            margin: `${SPACE.gapM}px auto 0`,
          }}
        >
          El scoring es continuo sobre {CHANNELS_LABEL} canales de Telegram, WhatsApp, Discord y
          newsletters. Cifras agregadas de plataforma, nunca datos de un creador concreto.
        </motion.p>
      </Section>

      {/* ══════════════════════════════════════════════════════════════════
          5 · COMPARATIVA — acuerdos por DM vs Channelad (fusión problema +
              comparison: cada fila es un pain y su resolución)
          ══════════════════════════════════════════════════════════════════ */}
      <Section id="comparativa">
        <SectionHeader
          eyebrow="Comparativa"
          title="Lo que cambia con Channelad"
          intro="Hoy una campaña en canales privados se negocia por mensaje directo. Así queda cada paso."
        />
        <motion.div variants={fadeUp} style={{ maxWidth: 880, margin: '0 auto', overflowX: 'auto' }}>
          <table
            style={{
              width: '100%',
              borderCollapse: 'collapse',
              background: 'var(--surface)',
              border: '1px solid var(--border)',
              borderRadius: 16,
              overflow: 'hidden',
            }}
          >
            <thead>
              <tr>
                {/* td, not empty th — axe empty-table-header */}
                <td style={compareCell({ header: true })} aria-hidden="true"></td>
                <th scope="col" style={compareCell({ header: true })}>Por DM, hoy</th>
                <th scope="col" style={{ ...compareCell({ header: true }), color: ACCENT }}>Con Channelad</th>
              </tr>
            </thead>
            <tbody>
              {COMPARE_ROWS.map((row, i) => (
                <tr key={row.label}>
                  <td style={{ ...compareCell({ last: i === COMPARE_ROWS.length - 1 }), fontWeight: 600 }}>
                    {row.label}
                  </td>
                  <td style={{ ...compareCell({ last: i === COMPARE_ROWS.length - 1 }), color: 'var(--muted)' }}>
                    <span style={{ display: 'inline-flex', alignItems: 'flex-start', gap: 8 }}>
                      <XCircle size={15} style={{ color: 'var(--muted)', flexShrink: 0, marginTop: 2 }} />
                      {row.dm}
                    </span>
                  </td>
                  <td style={compareCell({ last: i === COMPARE_ROWS.length - 1 })}>
                    <span style={{ display: 'inline-flex', alignItems: 'flex-start', gap: 8 }}>
                      <CheckCircle2 size={15} style={{ color: ACCENT, flexShrink: 0, marginTop: 2 }} />
                      {row.cl}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </motion.div>
      </Section>

      {/* ══════════════════════════════════════════════════════════════════
          6 · PRECIO — flat table, no effects
          ══════════════════════════════════════════════════════════════════ */}
      <Section id="pricing" surface>
        <SectionHeader
          eyebrow="Precio"
          title="Una comisión. Nada más."
          intro="Sin fee de alta, sin mínimos mensuales, sin contratos anuales."
        />
        <motion.div
          variants={fadeUp}
          style={{
            maxWidth: 880,
            margin: '0 auto',
            background: 'var(--surface)',
            border: '1px solid var(--border)',
            borderRadius: 16,
            overflow: 'hidden',
          }}
        >
          <div className="pricing-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr' }}>
            {/* Left: number + worked example */}
            <div className="pricing-left" style={{ padding: SPACE.gapL, borderRight: '1px solid var(--border)' }}>
              <p style={{ ...TYPE.label, color: 'var(--muted)', margin: '0 0 14px' }}>Comisión única</p>
              <div
                style={{
                  fontFamily: D,
                  fontSize: 'clamp(56px, 7vw, 88px)',
                  fontWeight: 800,
                  lineHeight: 1,
                  letterSpacing: '-0.05em',
                  // Neutral on purpose: the section's only purple is the CTA.
                  color: 'var(--text)',
                  marginBottom: 8,
                }}
              >
                {PUBLIC_COMMISSION_LABEL}
              </div>
              <p style={{ ...TYPE.label, color: 'var(--muted)', margin: `0 0 ${SPACE.gapM}px` }}>
                sobre el GMV de cada campaña
              </p>

              <div style={{ borderTop: '1px solid var(--border)', paddingTop: SPACE.gapS }}>
                <p style={{ ...TYPE.label, color: 'var(--muted)', margin: '0 0 12px' }}>
                  Ejemplo · campaña de 1.000 €
                </p>
                {[
                  { label: 'Channelad', value: '200 €', strong: true },
                  { label: 'Agencia tradicional (≥35% + retainer)', value: '≥ 550 €' },
                ].map((r) => (
                  <div
                    key={r.label}
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'baseline',
                      padding: '6px 0',
                      fontSize: TYPE.bodyM.fontSize,
                    }}
                  >
                    <span style={{ color: r.strong ? 'var(--text)' : 'var(--muted)', fontWeight: r.strong ? 600 : 400 }}>
                      {r.label}
                    </span>
                    <span
                      style={{
                        color: r.strong ? 'var(--text)' : 'var(--muted)',
                        fontWeight: r.strong ? 700 : 500,
                        fontVariantNumeric: 'tabular-nums',
                      }}
                    >
                      {r.value}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Right: includes + CTA */}
            <div className="pricing-right" style={{ padding: SPACE.gapL, display: 'flex', flexDirection: 'column' }}>
              <p style={{ ...TYPE.label, color: 'var(--muted)', margin: '0 0 18px' }}>Qué incluye</p>
              <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 14, flex: 1 }}>
                {PRICING_INCLUDES.map((inc) => {
                  const Icon = inc.icon
                  return (
                    <li key={inc.label} style={{ display: 'flex', alignItems: 'center', gap: 12, fontSize: 14, color: 'var(--text)' }}>
                      <Icon size={17} strokeWidth={1.9} style={{ color: 'var(--muted)', flexShrink: 0 }} />
                      <span style={{ fontWeight: 500 }}>{inc.label}</span>
                    </li>
                  )
                })}
              </ul>
              <CtaButton as={Link} to="/auth/register" style={{ marginTop: SPACE.gapM, width: '100%' }}>
                Reservar plaza
                <ArrowRight size={16} strokeWidth={2.4} />
              </CtaButton>
            </div>
          </div>
          <div
            style={{
              borderTop: '1px solid var(--border)',
              padding: '14px 24px',
              textAlign: 'center',
              fontSize: 13,
              color: 'var(--muted)',
            }}
          >
            Sin fee de alta · Sin mínimos mensuales · Sin compromiso · Escrow incluido
          </div>
        </motion.div>

        <style>{`
          @media (max-width: 760px) {
            .pricing-grid { grid-template-columns: 1fr !important; }
            .pricing-left { border-right: none !important; border-bottom: 1px solid var(--border); }
          }
          @media (max-width: 900px) {
            .safe-split { grid-template-columns: 1fr !important; }
          }
        `}</style>
      </Section>

      {/* ══════════════════════════════════════════════════════════════════
          7 · FAQ + CTA FINAL
          ══════════════════════════════════════════════════════════════════ */}
      <Section id="faq">
        <SectionHeader eyebrow="FAQ" title="Preguntas frecuentes" />
        <div style={{ maxWidth: 760, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 8 }}>
          {FAQS.map((faq, i) => {
            const open = openFaq === i
            return (
              <div
                key={i}
                className="faq-item"
                style={{
                  background: 'var(--surface)',
                  border: '1px solid var(--border)',
                  borderRadius: 14,
                  overflow: 'hidden',
                }}
              >
                <button
                  onClick={() => setOpenFaq(open ? null : i)}
                  aria-expanded={open}
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
                >
                  <span style={{ fontSize: TYPE.bodyM.fontSize, fontWeight: 500, color: 'var(--text)', fontFamily: F }}>
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
                    style={{ color: 'var(--muted)', flexShrink: 0 }}
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
              </div>
            )
          })}
        </div>

        {/* Final CTA — flat dark panel, one CTA */}
        <motion.div
          variants={fadeUp}
          style={{
            maxWidth: SPACE.maxSection,
            margin: `${SPACE.sectionY} auto 0`,
            background: '#0F1115',
            border: '1px solid var(--border)',
            borderRadius: 20,
            padding: `${SPACE.gapL}px ${SPACE.gapM}px`,
            textAlign: 'center',
          }}
        >
          <h2 style={{ fontFamily: D, ...TYPE.displayL, color: '#fff', margin: '0 0 14px', textWrap: 'balance' }}>
            Tu primera campaña, sin DMs.
          </h2>
          <p
            style={{
              ...TYPE.bodyM,
              color: 'rgba(255,255,255,0.65)',
              maxWidth: 560,
              margin: `0 auto ${SPACE.gapM}px`,
            }}
          >
            Plazas limitadas. Verificamos cada anunciante — KYC, dominio y método de pago —
            para mantener la calidad del catálogo.
          </p>
          <CtaButton as={Link} to="/auth/register">
            Reservar plaza
          </CtaButton>
          <p
            style={{
              fontSize: 11,
              color: 'rgba(255,255,255,0.4)',
              margin: `${SPACE.gapS}px 0 0`,
              paddingTop: 20,
              borderTop: '1px solid rgba(255,255,255,0.08)',
            }}
          >
            Operado por MICHI SOLUCIONS S.L. (en constitución) · Madrid · Solo te escribimos sobre tu
            cuenta. Cancela el aviso cuando quieras desde cualquier email.
          </p>
        </motion.div>
      </Section>

      <CrossLinks exclude="/para-anunciantes" />
    </div>
  )
}

// Flat comparison-table cell styles. Header cells get the kicker treatment.
function compareCell({ header = false, last = false } = {}) {
  return {
    padding: '16px 20px',
    textAlign: 'left',
    fontSize: header ? TYPE.label.fontSize : TYPE.bodyM.fontSize,
    lineHeight: 1.5,
    ...(header
      ? { ...TYPE.label, color: 'var(--muted)', borderBottom: '1px solid var(--border)' }
      : { borderBottom: last ? 'none' : '1px solid var(--border)', color: 'var(--text)' }),
  }
}
