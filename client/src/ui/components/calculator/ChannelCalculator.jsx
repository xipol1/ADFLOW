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
import UrlInputCard from './UrlInputCard'
import MediaKitScoreCard from './MediaKitScoreCard'
import BenchmarkCard from './BenchmarkCard'
import RoleSelectionScreen from './RoleSelectionScreen'
import MultiChannelInput from './MultiChannelInput'
import MediaKitConsolidated from './MediaKitConsolidated'
import AdvertiserResultCard from './AdvertiserResultCard'
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
  initialRole = null,    // 'creator' | 'advertiser' | null (muestra toggle)
} = {}) {
  const ref = useRef(null)
  const inView = useInView(ref, { once: true, margin: '-80px' })

  // ── Rol del usuario: creator o advertiser.
  // - Si initialRole viene por prop (páginas dedicadas /para-canales o
  //   /para-anunciantes), el rol queda fijado y arrancamos directos al wizard.
  // - Si no hay initialRole, mostramos primero RoleSelectionScreen para que
  //   el usuario elija de forma explícita. Una vez elige, roleConfirmed=true
  //   y el wizard arranca normalmente. ──
  const [role, setRole] = useState(initialRole || 'creator')
  const [roleConfirmed, setRoleConfirmed] = useState(!!initialRole)
  const showRoleToggle = !initialRole

  const isAdvertiser = role === 'advertiser'
  const isBlog = variant === 'blog'
  // Accent: advertiser siempre púrpura (paleta del anunciante en el sitio);
  // creator es verde, salvo en blog que es púrpura para encajar con el artículo.
  const accent = isAdvertiser ? PURPLE : (isBlog ? PURPLE : GREEN)
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

  // ── Inputs de modo anunciante ──
  // Un anunciante razona en "precio por publicación" + "número de
  // publicaciones que compro", no en "presupuesto mensual abstracto".
  const [pricePerPost, setPricePerPost] = useState(initialState.pricePerPost ?? 100)
  const [postsPlanned, setPostsPlanned] = useState(initialState.postsPlanned ?? 4)

  // Datos opcionales del canal que vienen del analyzer del link (no inputs
  // del wizard). Si están, el MediaKitScoreCard puede evaluar los items de
  // foto, descripción, nombre, verified. Si no, esos items fallan (honesto).
  const [channelMeta, setChannelMeta] = useState({
    name:         initialState.name         ?? '',
    description:  initialState.description  ?? '',
    profileImage: initialState.profileImage ?? '',
    verified:     initialState.verified     ?? false,
  })

  // Media-kit multi-canal: cuando hay 2+ canales analizados, Step 4 muestra
  // la vista consolidada en lugar de la tarjeta single. Cada canal tiene
  // su propio platform + followers; nicho/reacciones/posts/format son
  // compartidos por todos.
  const [multiMode, setMultiMode] = useState(false)
  const [multiChannels, setMultiChannels] = useState([])

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
          {/* Toggle modo: 1 canal vs media kit (varios canales) */}
          <ModeToggle multiMode={multiMode} onChange={setMultiMode} accent={accent} />

          {/* Atajo: pega el link (single) o varios links (media kit) */}
          {multiMode ? (
            <MultiChannelInput
              accent={accent}
              onSwitchToSingle={() => { setMultiMode(false); setMultiChannels([]) }}
              onAnalyzedAll={(channels) => {
                setMultiChannels(channels)
                // Si todos los canales tienen una plataforma común, la
                // ponemos en el state; si no, dejamos la actual.
                const platforms = new Set(channels.map((c) => c.platform).filter(Boolean))
                if (platforms.size === 1) {
                  setPlatform([...platforms][0])
                }
                // Usar el canal más grande como representante para metadata
                const biggest = [...channels].sort((a, b) => (b.followers || 0) - (a.followers || 0))[0]
                if (biggest) {
                  setFollowers(biggest.followers || 0)
                  setChannelMeta({
                    name:         biggest.name || '',
                    description:  biggest.description || '',
                    profileImage: biggest.profileImage || '',
                    verified:     !!biggest.verified,
                  })
                }
                // Saltar a Step 2 (nicho) — el creador comparte nicho
                // entre todos sus canales en >90% de los casos.
                setStepIdx(1)
              }}
            />
          ) : (
            <UrlInputCard
              accent={accent}
              onAnalyzed={(snapshot) => {
                if (snapshot.platform) setPlatform(snapshot.platform)
                if (snapshot.followers) setFollowers(snapshot.followers)
                // Guardar metadatos del canal para que el MediaKitScoreCard
                // pueda evaluar foto/descripción/verified más adelante.
                setChannelMeta({
                  name:         snapshot.name         || '',
                  description:  snapshot.description  || '',
                  profileImage: snapshot.profileImage || '',
                  verified:     !!snapshot.verified,
                })
                // Saltar al Step 3 (datos) — el usuario revisa los sliders
                // y completa los que falten antes del resultado final.
                setStepIdx(2)
              }}
              onWhatsApp={() => setPlatform('whatsapp')}
            />
          )}
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
      // Inputs distintos según el rol del usuario
      if (isAdvertiser) {
        const totalBudget = pricePerPost * postsPlanned
        return (
          <div>
            <StepHeader
              title="Tu campaña"
              subtitle="Ajusta el precio por publicación y cuántas publicaciones planeas. El alcance se calcula en directo."
            />
            <WizardSlider
              label="Precio por publicación"
              value={pricePerPost}
              min={20} max={5000} step={10}
              onChange={setPricePerPost}
              formatValue={(v) => v.toLocaleString('es-ES') + ' €'}
              accent={accent}
              hint="Lo que pagas a Channelad por un post patrocinado en el canal elegido. La comisión del 20% va incluida en este importe — el creador recibe el precio íntegro que él lista."
            />
            <WizardSlider
              label="Publicaciones planeadas"
              value={postsPlanned}
              min={1} max={30} step={1}
              onChange={setPostsPlanned}
              formatValue={(v) => v === 1 ? '1 publicación' : `${v} publicaciones`}
              accent={accent}
              hint={`Cuántos posts patrocinados compras en total. Budget total: ${totalBudget.toLocaleString('es-ES')} €.`}
            />
          </div>
        )
      }
      return (
        <div>
          <StepHeader
            title="Tus números"
            subtitle="Ajusta los tres valores. Los resultados se calculan en directo."
          />
          <WizardSlider
            label="Suscriptores activos"
            value={followers}
            min={500} max={2000000} step={500}
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
      // Vista de anunciante: alcance/clicks/comparativa con paid media.
      if (isAdvertiser) {
        return (
          <div>
            <StepHeader
              title="Lo que consigues con tu campaña"
              subtitle="Estimación basada en CPMs medianos de canales reales del marketplace. Cambia presupuesto en el paso anterior para recalcular."
            />
            <AdvertiserResultCard
              pricePerPost={pricePerPost}
              postsPlanned={postsPlanned}
              platform={platform}
              niche={niche}
              accent={accent}
            />

            {/* Empezar de nuevo */}
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

      return (
        <div>
          {/* Media kit consolidado: solo cuando hay >=2 canales analizados */}
          {multiMode && multiChannels.length >= 2 && (
            <div style={{ marginBottom: 28, paddingBottom: 24, borderBottom: '1px solid var(--border)' }}>
              <MediaKitConsolidated
                channels={multiChannels}
                niche={niche}
                reactionsPerPost={reactionsPerPost}
                postsPerMonth={postsPerMonth}
                format={format}
                accent={accent}
              />
            </div>
          )}

          <StepHeader
            title={multiMode && multiChannels.length >= 2 ? 'Tarifa por canal' : 'Tu tarifa'}
            subtitle={
              multiMode && multiChannels.length >= 2
                ? 'Estos son los detalles del canal principal del media kit. Cambia formato para ver cómo varía.'
                : 'Estimación basada en tus respuestas y CPMs medianos de +2.500 canales en seguimiento propio.'
            }
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

          {/* Score media-kit ready — diagnóstico visual antes de la captura */}
          <MediaKitScoreCard
            snapshot={{
              platform, niche, followers, reactionsPerPost, postsPerMonth, format,
              name:         channelMeta.name,
              description:  channelMeta.description,
              profileImage: channelMeta.profileImage,
              verified:     channelMeta.verified,
            }}
            accent={accent}
          />

          {/* Benchmark vs cohorte (plataforma + nicho + tamaño) */}
          <BenchmarkCard
            platform={platform}
            niche={niche}
            followers={followers}
            accent={accent}
          />

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
      }}>{isAdvertiser ? 'Calculadora de campaña' : 'Calculadora de tarifa'}</p>
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

  // Mini botón "Cambiar de modo" en el wizard (solo cuando el usuario eligió
  // role libremente, no cuando está fijado por initialRole en una página
  // dedicada).
  const SwitchRoleButton = (
    showRoleToggle && roleConfirmed && (
      <div style={{
        display: 'flex', justifyContent: 'flex-end', marginBottom: 14,
      }}>
        <button
          type="button"
          onClick={() => { setRoleConfirmed(false); reset() }}
          style={{
            background: 'none', border: '1px solid var(--border)',
            color: 'var(--muted)', fontSize: 12, fontWeight: 500,
            padding: '6px 12px', borderRadius: 999,
            cursor: 'pointer', fontFamily: FONT_BODY,
            display: 'inline-flex', alignItems: 'center', gap: 6,
          }}
        >
          ← Cambiar de modo
        </button>
      </div>
    )
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
        maxWidth: roleConfirmed ? 720 : 880, margin: '0 auto',
        transition: 'max-width 0.4s',
      }}
    >
      {!roleConfirmed ? (
        <RoleSelectionScreen
          onSelect={(r) => { setRole(r); setRoleConfirmed(true); reset() }}
        />
      ) : (
        <>
          {SwitchRoleButton}
          {wizardBody}
        </>
      )}
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

// ─── ModeToggle: 1 canal vs Media kit (2-5) ────────────────────────────────
function ModeToggle({ multiMode, onChange, accent }) {
  const Option = ({ value, label, sub }) => {
    const active = multiMode === value
    return (
      <button
        type="button"
        onClick={() => onChange(value)}
        style={{
          flex: 1,
          padding: '10px 14px',
          borderRadius: 10,
          border: 'none',
          background: active ? 'var(--surface)' : 'transparent',
          color: active ? 'var(--text)' : 'var(--muted)',
          fontFamily: FONT_BODY,
          fontSize: 13,
          fontWeight: active ? 600 : 500,
          cursor: 'pointer',
          textAlign: 'center',
          boxShadow: active ? '0 2px 6px rgba(15,23,42,0.08)' : 'none',
          transition: 'all 0.2s',
        }}
      >
        <div>{label}</div>
        {sub && (
          <div style={{
            fontSize: 11, color: active ? accent : 'var(--muted)',
            marginTop: 2, fontWeight: 500,
          }}>{sub}</div>
        )}
      </button>
    )
  }
  return (
    <div style={{
      display: 'flex',
      background: 'var(--bg2)',
      borderRadius: 12,
      padding: 4,
      gap: 4,
      marginBottom: 16,
    }}>
      <Option value={false} label="Un canal" sub="Análisis individual" />
      <Option value={true}  label="Media kit" sub="2-5 canales · vista consolidada" />
    </div>
  )
}
