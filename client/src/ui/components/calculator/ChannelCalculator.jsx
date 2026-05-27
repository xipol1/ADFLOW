import React, { useState, useMemo, useRef, useEffect } from 'react'
import { motion, useInView } from 'framer-motion'
import {
  Wallet, TrendingUp, Calendar, Sparkles, Heart, Package,
  Lock, ArrowRight, Send, MessageCircle, Megaphone, Mail,
} from 'lucide-react'
import { FONT_DISPLAY, FONT_BODY, MAX_W, GREEN, PURPLE, greenAlpha, purpleAlpha } from '../../theme/tokens'
import { PUBLIC_COMMISSION_LABEL } from '../../theme/stats'
import {
  PLATFORMS, NICHES, FORMATS,
  computeChannelPricing, fmtEur, fmtFollowers,
} from '../../lib/channelPricing'
import WhatsAppQuestionnaire from './WhatsAppQuestionnaire'
import EmailCaptureCard from './EmailCaptureCard'
import {
  ProgressBar, ChoiceCard, PillCard, WizardSlider, WizardFooter,
} from './wizardHelpers'

// ─── Definición de pasos del wizard ─────────────────────────────────────────
// Step 1: elegir plataforma (4 cards grandes con icono).
// Step 2: elegir nicho (grid 12 cards).
// Step 3: tus datos (3 sliders: subs, reacciones, posts/mes).
// Step 4: formato + resultado (pills de formato arriba + outputs en directo).
//
// Si el usuario elige WhatsApp en Step 1, salta al WhatsAppQuestionnaire
// directamente — porque WhatsApp no expone datos públicos y necesita su
// propio flujo guiado con CTA de OAuth.

const STEPS = ['platform', 'niche', 'numbers', 'result']

const PLATFORM_ICON = {
  telegram:   Send,
  whatsapp:   MessageCircle,
  discord:    MessageCircle,
  newsletter: Mail,
}

const PLATFORM_DESCRIPTIONS = {
  telegram:   'Canales públicos hispanohablantes con CPM medio del marketplace.',
  whatsapp:   'Open rate 75-90%. Datos no públicos: rellenamos por cuestionario.',
  discord:    'Engagement alto entre miembros activos (60-80% tasa de lectura).',
  newsletter: 'CPM más alto del catálogo. Audiencias B2B premium.',
}

// ─── Helper: tarjeta de resultado destacada ─────────────────────────────────
function ResultCard({ icon: Icon, label, value, sub, big = false, accent = GREEN }) {
  return (
    <div style={{
      background: big ? `linear-gradient(180deg, ${accent}10 0%, ${accent}04 100%)` : 'var(--surface)',
      border: `1px solid ${big ? `${accent}30` : 'var(--border)'}`,
      borderRadius: 14,
      padding: big ? '20px 22px' : '14px 16px',
      boxShadow: big ? `0 12px 32px -16px ${accent}40` : 'none',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
        <div style={{
          width: 26, height: 26, borderRadius: 7,
          background: `${accent}18`, color: accent,
          display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
        }}>
          <Icon size={13} strokeWidth={2.4} />
        </div>
        <span style={{
          fontSize: 11, color: 'var(--muted)', fontWeight: 500,
          textTransform: 'uppercase', letterSpacing: '0.06em',
        }}>{label}</span>
      </div>
      <div style={{
        fontFamily: FONT_DISPLAY,
        fontSize: big ? 'clamp(28px, 4vw, 40px)' : 22,
        fontWeight: 700,
        letterSpacing: '-0.03em',
        color: 'var(--text)',
        lineHeight: 1,
        fontVariantNumeric: 'tabular-nums',
      }}>{value}</div>
      {sub && (
        <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 6, fontWeight: 500 }}>{sub}</div>
      )}
    </div>
  )
}

function FormatPriceTile({ format, accent, highlighted }) {
  return (
    <div style={{
      padding: '14px 12px',
      borderRadius: 12,
      background: highlighted ? `${accent}10` : 'var(--bg2)',
      border: `1px solid ${highlighted ? `${accent}40` : 'var(--border)'}`,
      textAlign: 'center',
      transition: 'all .2s',
    }}>
      <div style={{
        fontFamily: FONT_DISPLAY, fontSize: 20, fontWeight: 700,
        color: highlighted ? accent : 'var(--text)',
        fontVariantNumeric: 'tabular-nums',
      }}>
        {fmtEur(format.price)}
      </div>
      <div style={{
        fontSize: 10.5, color: 'var(--muted)',
        textTransform: 'uppercase', letterSpacing: '0.04em',
        marginTop: 4, fontWeight: 600,
      }}>{format.label}</div>
    </div>
  )
}

function ComparisonBar({ label, value, baseline, sub, accent }) {
  const pct = Math.max(2, Math.min(100, (value / baseline) * 100))
  return (
    <div style={{ marginBottom: 14 }}>
      <div style={{
        display: 'flex', justifyContent: 'space-between',
        alignItems: 'baseline', marginBottom: 6,
      }}>
        <span style={{
          fontSize: 13, color: 'var(--text)', fontWeight: 600, fontFamily: FONT_BODY,
        }}>{label}</span>
        <span style={{
          fontFamily: FONT_DISPLAY, fontSize: 14, fontWeight: 700,
          color: 'var(--text)', fontVariantNumeric: 'tabular-nums',
        }}>
          {fmtEur(value)}{' '}
          <span style={{ fontWeight: 500, color: 'var(--muted)', fontSize: 12 }}>/ mes</span>
        </span>
      </div>
      <div style={{
        position: 'relative', height: 8, background: 'var(--bg2)',
        borderRadius: 999, overflow: 'hidden',
      }}>
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
          style={{
            position: 'absolute', top: 0, left: 0, height: '100%',
            background: accent, borderRadius: 999,
          }}
        />
      </div>
      {sub && (
        <p style={{ fontSize: 11, color: 'var(--muted)', margin: '6px 0 0' }}>{sub}</p>
      )}
    </div>
  )
}

// ─── Componente principal ───────────────────────────────────────────────────
export default function ChannelCalculator({
  variant = 'landing',
  sectionId = 'channel-calculator',
  background = 'var(--bg)',
  showComparison,
  title,
  subtitle,
  initialState = {},
} = {}) {
  const ref = useRef(null)
  const inView = useInView(ref, { once: true, margin: '-80px' })

  const isBlog = variant === 'blog'
  const accent = isBlog ? PURPLE : GREEN
  const includeComparison = showComparison ?? (variant === 'landing')

  // ── Estado del wizard ──
  const [stepIdx, setStepIdx] = useState(0)
  const currentStep = STEPS[stepIdx]

  // ── Selecciones ──
  const [platform, setPlatform] = useState(initialState.platform ?? null)
  const [niche, setNiche]       = useState(initialState.niche ?? null)
  const [followers, setFollowers] = useState(initialState.followers ?? 8000)
  const [reactionsPerPost, setReactions] = useState(initialState.reactionsPerPost ?? 120)
  const [postsPerMonth, setPosts] = useState(initialState.postsPerMonth ?? 4)
  const [format, setFormat] = useState(initialState.format ?? 'standard')

  // ── Modo WhatsApp: si la plataforma elegida es WhatsApp, sustituimos el
  //    wizard normal por el cuestionario WA. WhatsApp no expone datos
  //    públicamente, así que su flujo es distinto y termina en un CTA de
  //    OAuth verificación. ──
  const whatsappMode = platform === 'whatsapp'

  const result = useMemo(
    () => computeChannelPricing({
      followers, reactionsPerPost, postsPerMonth,
      platform: platform || 'telegram',
      niche: niche || 'b2bsaas',
      format,
    }),
    [followers, reactionsPerPost, postsPerMonth, platform, niche, format]
  )

  // ── Navegación ──
  const canAdvance = useMemo(() => {
    if (currentStep === 'platform') return !!platform
    if (currentStep === 'niche')    return !!niche
    if (currentStep === 'numbers')  return true
    return true
  }, [currentStep, platform, niche])

  const goNext = () => stepIdx < STEPS.length - 1 && setStepIdx(stepIdx + 1)
  const goBack = () => stepIdx > 0 && setStepIdx(stepIdx - 1)
  const reset = () => {
    setStepIdx(0); setPlatform(null); setNiche(null)
  }

  // ── Auto-advance al elegir plataforma o nicho (UX más fluido) ──
  // Cuando el usuario hace click en una opción que es "una de N" (no
  // requiere mezcla con otras), avanzamos automáticamente al siguiente
  // paso tras un pequeño delay. Si elige WhatsApp, en lugar de avanzar
  // entra al cuestionario WA.
  const handlePlatformSelect = (id) => {
    setPlatform(id)
    if (id === 'whatsapp') return // El render detecta whatsappMode y monta el WA wizard.
    setTimeout(() => setStepIdx(1), 220)
  }

  const handleNicheSelect = (id) => {
    setNiche(id)
    setTimeout(() => setStepIdx(2), 220)
  }

  // ── Render del contenido del paso actual ──
  function StepContent() {
    if (currentStep === 'platform') {
      return (
        <div>
          <StepHeader
            title="¿En qué plataforma está tu canal?"
            subtitle="Cada plataforma tiene un CPM mediano distinto. Selecciona la principal."
          />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {PLATFORMS.map((p) => (
              <ChoiceCard
                key={p.id}
                option={{
                  ...p,
                  Icon: PLATFORM_ICON[p.id] || Megaphone,
                  description: PLATFORM_DESCRIPTIONS[p.id],
                }}
                selected={platform === p.id}
                onSelect={handlePlatformSelect}
                accent={accent}
              />
            ))}
          </div>
        </div>
      )
    }

    if (currentStep === 'niche') {
      return (
        <div>
          <StepHeader
            title="¿Sobre qué publicas?"
            subtitle="El nicho cambia el CPM mediano hasta ×2,5. Los premium (Finanzas, B2B SaaS, Cripto) concentran la demanda de anunciantes."
          />
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))',
            gap: 10,
          }}>
            {NICHES.map((n) => (
              <PillCard
                key={n.id}
                option={n}
                selected={niche === n.id}
                onSelect={handleNicheSelect}
                badge={n.mult >= 1.3 ? `Premium · ×${n.mult.toFixed(1)}` : null}
                accent={accent}
              />
            ))}
          </div>
        </div>
      )
    }

    if (currentStep === 'numbers') {
      return (
        <div>
          <StepHeader
            title="Tus números"
            subtitle="Ajusta los tres valores. Los resultados se calculan en directo."
          />
          <WizardSlider
            label="Suscriptores activos"
            value={followers}
            min={500} max={500000} step={500}
            onChange={setFollowers}
            formatValue={fmtFollowers}
            accent={accent}
            hint="Audiencia que realmente recibe la notificación. Si tienes 60% silenciado, descuéntalos."
          />
          <WizardSlider
            label={`Reacciones medias por post · ${result.engagement.label}`}
            value={reactionsPerPost}
            min={0}
            max={Math.max(50, Math.round(followers * 0.1))}
            step={5}
            onChange={setReactions}
            formatValue={(v) => v === 0 ? '—' : v.toLocaleString('es-ES')}
            accent={accent}
            hint="Más reacciones = mejor engagement → ajustamos el CPM al alza hasta +25%."
          />
          <WizardSlider
            label="Posts patrocinados / mes"
            value={postsPerMonth}
            min={1} max={30} step={1}
            onChange={setPosts}
            accent={accent}
            hint="Frecuencia de publicaciones patrocinadas (excluyendo contenido orgánico)."
          />
        </div>
      )
    }

    if (currentStep === 'result') {
      return (
        <div>
          <StepHeader
            title="Tu tarifa"
            subtitle="Estimación basada en tus respuestas y CPMs medianos de +2.500 canales en seguimiento propio."
          />

          {/* Selector de formato */}
          <div style={{ marginBottom: 24 }}>
            <p style={{
              fontSize: 13, fontWeight: 600, color: 'var(--text)',
              margin: '0 0 10px', textTransform: 'uppercase', letterSpacing: '0.06em',
              fontFamily: FONT_BODY,
            }}>
              Formato destacado
            </p>
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
              gap: 8,
            }}>
              {FORMATS.map((f) => (
                <PillCard
                  key={f.id}
                  option={f}
                  selected={format === f.id}
                  onSelect={setFormat}
                  accent={accent}
                />
              ))}
            </div>
          </div>

          {/* Tarjeta principal */}
          <ResultCard
            icon={Wallet}
            label={`Precio · ${result.featuredFormatLabel}`}
            value={fmtEur(result.featuredFormatPrice)}
            sub={`El anunciante paga ${fmtEur(result.featuredFormatPrice * 1.2)} (tu tarifa + ${PUBLIC_COMMISSION_LABEL} comisión Channelad).`}
            big
            accent={accent}
          />

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginTop: 14 }}>
            <ResultCard
              icon={TrendingUp}
              label="Ingreso mensual"
              value={fmtEur(result.monthlyEarnings)}
              sub={`Anual: ${fmtEur(result.yearlyEarnings)}`}
              accent={accent}
            />
            <ResultCard
              icon={Calendar}
              label="CPM efectivo"
              value={`${result.effectiveCpm.toFixed(1)} €`}
              sub={`Alcance ~ ${result.reachPerPost.toLocaleString('es-ES')} por post`}
              accent={accent}
            />
          </div>

          {/* Tabla de formatos */}
          <div style={{ marginTop: 22 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
              <Package size={14} strokeWidth={2.4} style={{ color: accent }} />
              <span style={{
                fontSize: 11, fontWeight: 600, textTransform: 'uppercase',
                letterSpacing: '0.1em', color: 'var(--muted)',
              }}>Tu tarifa por formato</span>
            </div>
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))',
              gap: 10,
            }}>
              {result.pricePerFormat.map((fmt) => (
                <FormatPriceTile
                  key={fmt.id}
                  format={fmt}
                  highlighted={fmt.id === format}
                  accent={accent}
                />
              ))}
            </div>
          </div>

          {/* Comparativa (solo landing) */}
          {includeComparison && (
            <div style={{ marginTop: 28 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
                <Sparkles size={14} strokeWidth={2.4} style={{ color: accent }} />
                <span style={{
                  fontSize: 11, fontWeight: 600, textTransform: 'uppercase',
                  letterSpacing: '0.1em', color: 'var(--muted)',
                }}>Frente a alternativas con el mismo alcance</span>
              </div>
              <ComparisonBar
                label="Channelad"
                value={result.monthlyEarnings}
                baseline={result.monthlyEarnings}
                accent={accent}
                sub="Pago en 72 horas tras publicar, sin exclusividad."
              />
              <ComparisonBar
                label="Networks tradicionales"
                value={result.comparisons.networks}
                baseline={result.monthlyEarnings}
                accent="rgba(239,68,68,0.55)"
                sub="30–50% comisión, pago a 60-90 días."
              />
              <ComparisonBar
                label="Adsense"
                value={result.comparisons.adsense}
                baseline={result.monthlyEarnings}
                accent="rgba(99,102,241,0.55)"
                sub="Solo si desvías tráfico web — no aplica a canales privados."
              />
            </div>
          )}

          {/* Captura email — opt-in opcional para recibir el reporte detallado */}
          <EmailCaptureCard
            snapshot={{
              platform, niche, followers, reactionsPerPost, postsPerMonth, format,
              featuredFormatPrice: result.featuredFormatPrice,
              monthlyEarnings:     result.monthlyEarnings,
              yearlyEarnings:      result.yearlyEarnings,
              effectiveCpm:        result.effectiveCpm,
              reachPerPost:        result.reachPerPost,
            }}
            source={isBlog ? 'blog_calculator' : 'calculator'}
            accent={accent}
          />

          {/* Botón empezar de nuevo */}
          <div style={{ marginTop: 22, textAlign: 'center' }}>
            <button
              type="button"
              onClick={reset}
              style={{
                background: 'none', border: 'none',
                color: 'var(--muted)', fontSize: 13, fontWeight: 500,
                cursor: 'pointer', fontFamily: FONT_BODY,
              }}
            >
              ← Empezar de nuevo
            </button>
          </div>
        </div>
      )
    }

    return null
  }

  // ── WhatsAppQuestionnaire monta cuando la plataforma elegida es WhatsApp ──
  const wizardBody = whatsappMode ? (
    <WhatsAppQuestionnaire onBack={() => { setPlatform(null); setStepIdx(0) }} />
  ) : (
    <>
      <ProgressBar current={stepIdx} total={STEPS.length} accent={accent} />
      {/* Sin AnimatePresence mode="wait" para evitar atascar el render entre
          pasos. Usamos motion.div con key dinámica para forzar remount + fade
          in del paso nuevo, sin esperar exit. */}
      <motion.div
        key={currentStep}
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
      >
        <StepContent />
      </motion.div>

      {/* Footer de navegación: en Step 4 lo ocultamos (el "Empezar de nuevo"
          ya cumple la función de volver atrás) */}
      {stepIdx < STEPS.length - 1 && (
        <WizardFooter
          onBack={goBack}
          onNext={goNext}
          canAdvance={canAdvance}
          backLabel={stepIdx === 0 ? 'Empezar de nuevo' : 'Atrás'}
          accent={accent}
        />
      )}
      {/* En Step 4 ofrecemos solo el "Atrás" minimalista por si quieren
          modificar los datos sin reset */}
      {stepIdx === STEPS.length - 1 && (
        <div style={{ marginTop: 18, textAlign: 'center' }}>
          <button
            type="button"
            onClick={goBack}
            style={{
              background: 'none', border: '1px solid var(--border)',
              color: 'var(--muted)', fontSize: 13, fontWeight: 500,
              padding: '8px 16px', borderRadius: 10,
              cursor: 'pointer', fontFamily: FONT_BODY,
              marginRight: 8,
            }}
          >
            ← Ajustar mis datos
          </button>
        </div>
      )}
    </>
  )

  const headerTitle = title ?? (
    isBlog
      ? 'Calculadora de tarifa por canal'
      : '¿Cuánto puede ganar tu canal este mes?'
  )
  const headerSubtitle = subtitle ?? (
    isBlog
      ? 'Responde 3 preguntas y te damos la tarifa orientativa con CPMs reales del mercado.'
      : 'Responde 3 preguntas. Estimación basada en CPMs medianos de +2.500 canales con métricas propias.'
  )

  const HeaderEl = (
    <div style={{ textAlign: 'center', marginBottom: 'clamp(28px, 4vw, 48px)' }}>
      <p style={{
        fontSize: 11, fontWeight: 600, textTransform: 'uppercase',
        letterSpacing: '0.12em', color: accent, marginBottom: 14,
      }}>Calculadora de tarifa</p>
      <h2 style={{
        fontFamily: FONT_DISPLAY, fontWeight: 700,
        fontSize: isBlog ? 'clamp(22px, 3vw, 30px)' : 'clamp(28px, 4vw, 44px)',
        lineHeight: 1.1, letterSpacing: '-0.035em',
        margin: '0 0 14px', color: 'var(--text)',
      }}>{headerTitle}</h2>
      <p style={{
        fontFamily: FONT_BODY, fontSize: isBlog ? 14 : 16, color: 'var(--muted)',
        maxWidth: 600, margin: '0 auto', lineHeight: 1.6,
      }}>{headerSubtitle}</p>
    </div>
  )

  const CardEl = (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
      style={{
        background: 'var(--surface)',
        border: '1px solid var(--border)',
        borderRadius: isBlog ? 18 : 24,
        overflow: 'hidden',
        boxShadow: isBlog
          ? '0 8px 24px -12px rgba(15,23,42,0.12)'
          : '0 24px 60px -24px rgba(15,23,42,0.18)',
        padding: `clamp(${isBlog ? 22 : 28}px, ${isBlog ? '3vw' : '4vw'}, ${isBlog ? 32 : 40}px)`,
        maxWidth: 720, margin: '0 auto',
      }}
    >
      {wizardBody}
    </motion.div>
  )

  const FooterEl = (
    <p style={{
      textAlign: 'center', marginTop: 22, fontSize: 12,
      color: 'var(--muted)', maxWidth: 600,
      marginLeft: 'auto', marginRight: 'auto',
    }}>
      Estimación basada en CPM mediano del nicho, ajustada por tasa de reacciones · Margen ±18% · Datos actualizados {new Date().toLocaleDateString('es-ES')}
    </p>
  )

  // Blog variant: sin section wrapper, encaja dentro del flujo del artículo.
  if (isBlog) {
    return (
      <div ref={ref} id={sectionId} style={{ margin: '32px 0' }}>
        {CardEl}
        {FooterEl}
      </div>
    )
  }

  // Landing variant (default): section completa con header arriba.
  return (
    <section
      ref={ref}
      id={sectionId}
      style={{
        background,
        padding: 'clamp(72px, 10vw, 120px) clamp(16px, 4vw, 24px)',
      }}
    >
      <div style={{ maxWidth: MAX_W, margin: '0 auto' }}>
        {HeaderEl}
        {CardEl}
        {FooterEl}
      </div>
    </section>
  )
}

// ─── Helper inline: header de cada paso ─────────────────────────────────────
function StepHeader({ title, subtitle }) {
  return (
    <div style={{ marginBottom: 22 }}>
      <h3 style={{
        fontFamily: FONT_DISPLAY, fontSize: 22, fontWeight: 700,
        letterSpacing: '-0.02em', margin: '0 0 8px', color: 'var(--text)',
      }}>{title}</h3>
      <p style={{ fontSize: 14, color: 'var(--muted)', margin: 0, lineHeight: 1.55 }}>
        {subtitle}
      </p>
    </div>
  )
}
