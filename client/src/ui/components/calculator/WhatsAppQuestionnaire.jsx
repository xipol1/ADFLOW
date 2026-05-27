import React, { useState, useMemo } from 'react'
import { motion } from 'framer-motion'
import {
  ShieldCheck, Megaphone, HelpCircle, Users, Heart, Calendar,
  ArrowRight, ArrowLeft, Lock,
} from 'lucide-react'
import { FONT_DISPLAY, FONT_BODY, GREEN, greenAlpha } from '../../theme/tokens'
import { PUBLIC_COMMISSION_LABEL } from '../../theme/stats'
import { NICHES, computeChannelPricing, fmtEur } from '../../lib/channelPricing'
import { ProgressBar, ChoiceCard, PillCard } from './wizardHelpers'

// ─── Wizard visual de WhatsApp ──────────────────────────────────────────────
// WhatsApp no expone suscriptores ni engagement públicamente (privacidad por
// diseño). En lugar de simular un scraping que fallaría o de ocultarlo, este
// wizard guía al creador a aportar los datos él mismo, con la promesa
// operativa de afinar la tarifa cuando vincule la cuenta vía OAuth (flujo
// /creator/channels/link-whatsapp ya implementado).

const STEPS = ['type', 'numbers', 'niche', 'result']

const WHATSAPP_TYPES = [
  {
    id: 'channel',
    label: 'Canal (newsletter)',
    Icon: Megaphone,
    description: 'Broadcast 1→N. Suscriptores no pueden responder. Aparece en la pestaña "Actualizaciones".',
    monetizable: true,
  },
  {
    id: 'group',
    label: 'Grupo donde soy administrador',
    Icon: Users,
    description: 'Conversación N→N. Channelad monetiza Canales (newsletters), no grupos. Pero el grupo se puede convertir.',
    monetizable: false,
  },
  {
    id: 'unsure',
    label: 'No estoy seguro',
    Icon: HelpCircle,
    description: 'Te ayudamos a identificarlo en el siguiente paso.',
    monetizable: null,
  },
]

// Rangos de suscriptores en cards (más fácil que slider para móvil)
const SUBSCRIBER_BUCKETS = [
  { id: 'xs', label: '< 1.000',         min: 500,    max: 999,   midpoint: 800 },
  { id: 'sm', label: '1.000 – 5.000',    min: 1000,   max: 4999,  midpoint: 2500 },
  { id: 'md', label: '5.000 – 20.000',   min: 5000,   max: 19999, midpoint: 10000 },
  { id: 'lg', label: '20.000 – 100.000', min: 20000,  max: 99999, midpoint: 50000 },
  { id: 'xl', label: '+ 100.000',        min: 100000, max: 500000, midpoint: 200000 },
]

const REACTIONS_LEVELS = [
  { id: 'low',     label: 'Bajo',      sub: 'Menos del 0,5% reacciona',        ratio: 0.003 },
  { id: 'normal',  label: 'Normal',    sub: 'Entre 0,5% y 2% reacciona',        ratio: 0.012 },
  { id: 'good',    label: 'Bueno',     sub: 'Entre 2% y 5% reacciona',          ratio: 0.035 },
  { id: 'top',     label: 'Excelente', sub: 'Más del 5% reacciona',             ratio: 0.07 },
]

const POSTING_FREQUENCIES = [
  { id: 'occasional', label: 'Ocasional',  sub: '1-3 posts / mes',    postsPerMonth: 2 },
  { id: 'weekly',     label: 'Semanal',    sub: '4-8 posts / mes',    postsPerMonth: 6 },
  { id: 'frequent',   label: 'Frecuente',  sub: '9-20 posts / mes',   postsPerMonth: 14 },
  { id: 'daily',      label: 'Diaria',     sub: 'Más de 20 posts / mes', postsPerMonth: 30 },
]

// ─── Bloque visual: aviso de privacidad WhatsApp ────────────────────────────
function PrivacyBanner() {
  return (
    <div style={{
      background: greenAlpha(0.06),
      border: `1px solid ${greenAlpha(0.22)}`,
      borderRadius: 14,
      padding: '16px 18px',
      display: 'flex',
      gap: 12,
      alignItems: 'flex-start',
      marginBottom: 20,
    }}>
      <div style={{
        width: 36, height: 36, borderRadius: 10,
        background: greenAlpha(0.12),
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        flexShrink: 0,
      }}>
        <ShieldCheck size={18} style={{ color: GREEN }} strokeWidth={2.2} />
      </div>
      <div style={{ flex: 1, fontFamily: FONT_BODY }}>
        <p style={{
          margin: 0, fontSize: 14, fontWeight: 600, color: 'var(--text)', lineHeight: 1.4,
        }}>
          WhatsApp no expone datos públicos
        </p>
        <p style={{
          margin: '6px 0 0', fontSize: 13, color: 'var(--muted)', lineHeight: 1.55,
        }}>
          No podemos leer suscriptores ni reacciones de tu canal hasta que vincules tu cuenta
          (OAuth oficial de Meta, 30 segundos). Mientras tanto, dinos tú los datos y te damos
          una tarifa orientativa. Al verificar después, la ajustamos a tus números reales.
        </p>
      </div>
    </div>
  )
}

// ─── Componente principal ───────────────────────────────────────────────────
export default function WhatsAppQuestionnaire({ onBack, oauthUrl = '/creator/channels/link-whatsapp' }) {
  const [stepIdx, setStepIdx] = useState(0)
  const [waType, setWaType] = useState(null)
  const [subsBucket, setSubsBucket] = useState(null)
  const [reactionsLevel, setReactionsLevel] = useState(null)
  const [postingFreq, setPostingFreq] = useState(null)
  const [niche, setNiche] = useState(null)

  const currentStep = STEPS[stepIdx]

  // Derivar inputs para computeChannelPricing
  const computed = useMemo(() => {
    if (!subsBucket || !reactionsLevel || !postingFreq || !niche) return null

    const bucket = SUBSCRIBER_BUCKETS.find((b) => b.id === subsBucket)
    const reac = REACTIONS_LEVELS.find((r) => r.id === reactionsLevel)
    const freq = POSTING_FREQUENCIES.find((f) => f.id === postingFreq)
    const followers = bucket.midpoint
    const reactionsPerPost = Math.round(followers * reac.ratio)

    return computeChannelPricing({
      followers,
      reactionsPerPost,
      postsPerMonth: freq.postsPerMonth,
      platform: 'whatsapp',
      niche,
      format: 'standard',
    })
  }, [subsBucket, reactionsLevel, postingFreq, niche])

  const canAdvance = useMemo(() => {
    if (currentStep === 'type')    return !!waType
    if (currentStep === 'numbers') return !!subsBucket && !!reactionsLevel && !!postingFreq
    if (currentStep === 'niche')   return !!niche
    return true
  }, [currentStep, waType, subsBucket, reactionsLevel, postingFreq, niche])

  const next = () => stepIdx < STEPS.length - 1 && setStepIdx(stepIdx + 1)
  const prev = () => stepIdx > 0 ? setStepIdx(stepIdx - 1) : onBack?.()

  return (
    <div style={{
      maxWidth: 680,
      margin: '0 auto',
      padding: '8px 4px',
      fontFamily: FONT_BODY,
    }}>
      {/* Header con back */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
        <button
          type="button"
          onClick={prev}
          style={{
            display: 'flex', alignItems: 'center', gap: 6,
            background: 'none', border: 'none', color: 'var(--muted)',
            fontSize: 13, fontWeight: 500, cursor: 'pointer', padding: 0,
            fontFamily: FONT_BODY,
          }}
        >
          <ArrowLeft size={14} strokeWidth={2.2} />
          Volver
        </button>
      </div>

      {/* Banner privacidad — solo en paso 0 */}
      {stepIdx === 0 && <PrivacyBanner />}

      {/* Progress */}
      <ProgressBar current={stepIdx} total={STEPS.length} accent={GREEN} />

      {/* Steps — sin AnimatePresence mode="wait" (provoca race con remount) */}
      <motion.div
        key={currentStep}
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
      >
          {/* ── Step 1: tipo de WhatsApp ─────────────────────────── */}
          {currentStep === 'type' && (
            <div>
              <h3 style={{
                fontFamily: FONT_DISPLAY, fontSize: 22, fontWeight: 700,
                letterSpacing: '-0.02em', margin: '0 0 8px', color: 'var(--text)',
              }}>
                ¿Qué tipo de WhatsApp tienes?
              </h3>
              <p style={{ fontSize: 14, color: 'var(--muted)', margin: '0 0 22px', lineHeight: 1.55 }}>
                Channelad monetiza Canales (broadcast 1→N). Los grupos no se monetizan directamente,
                pero te decimos si conviertes y por cuánto.
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {WHATSAPP_TYPES.map((opt) => (
                  <ChoiceCard
                    key={opt.id}
                    option={opt}
                    selected={waType === opt.id}
                    onSelect={setWaType}
                  />
                ))}
              </div>

              {waType === 'group' && (
                <div style={{
                  marginTop: 16, padding: '14px 16px',
                  background: 'rgba(245,158,11,0.08)',
                  border: '1px solid rgba(245,158,11,0.25)',
                  borderRadius: 12, fontSize: 13, color: 'var(--text)', lineHeight: 1.55,
                }}>
                  Para monetizar, conviértelo en Canal (Newsletter). Te damos la estimación de tarifa
                  igualmente — al verificar te diremos si tu grupo es apto para conversión.
                </div>
              )}
            </div>
          )}

          {/* ── Step 2: números ───────────────────────────────────── */}
          {currentStep === 'numbers' && (
            <div>
              <h3 style={{
                fontFamily: FONT_DISPLAY, fontSize: 22, fontWeight: 700,
                letterSpacing: '-0.02em', margin: '0 0 8px', color: 'var(--text)',
              }}>
                Tu canal en números
              </h3>
              <p style={{ fontSize: 14, color: 'var(--muted)', margin: '0 0 22px', lineHeight: 1.55 }}>
                Aproximado, no hace falta exacto. Lo confirmamos cuando verifiques con OAuth.
              </p>

              {/* Suscriptores */}
              <div style={{ marginBottom: 28 }}>
                <p style={{
                  fontSize: 13, fontWeight: 600, color: 'var(--text)',
                  margin: '0 0 10px', textTransform: 'uppercase', letterSpacing: '0.06em',
                }}>
                  Suscriptores activos
                </p>
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))',
                  gap: 8,
                }}>
                  {SUBSCRIBER_BUCKETS.map((b) => (
                    <motion.button
                      key={b.id}
                      type="button"
                      onClick={() => setSubsBucket(b.id)}
                      whileTap={{ scale: 0.97 }}
                      style={{
                        padding: '12px 8px',
                        borderRadius: 11,
                        border: `1px solid ${subsBucket === b.id ? GREEN : 'var(--border)'}`,
                        background: subsBucket === b.id ? `${GREEN}10` : 'var(--surface)',
                        cursor: 'pointer',
                        fontFamily: FONT_BODY,
                        fontSize: 13,
                        fontWeight: subsBucket === b.id ? 600 : 500,
                        color: subsBucket === b.id ? GREEN : 'var(--text)',
                        outline: 'none',
                        transition: 'all 0.2s',
                      }}
                    >
                      {b.label}
                    </motion.button>
                  ))}
                </div>
              </div>

              {/* Reacciones */}
              <div style={{ marginBottom: 28 }}>
                <p style={{
                  fontSize: 13, fontWeight: 600, color: 'var(--text)',
                  margin: '0 0 10px', textTransform: 'uppercase', letterSpacing: '0.06em',
                }}>
                  Reacciones medias por post
                </p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {REACTIONS_LEVELS.map((r) => (
                    <ChoiceCard
                      key={r.id}
                      option={{ ...r, Icon: Heart }}
                      selected={reactionsLevel === r.id}
                      onSelect={setReactionsLevel}
                      compact
                    />
                  ))}
                </div>
              </div>

              {/* Frecuencia */}
              <div>
                <p style={{
                  fontSize: 13, fontWeight: 600, color: 'var(--text)',
                  margin: '0 0 10px', textTransform: 'uppercase', letterSpacing: '0.06em',
                }}>
                  ¿Con qué frecuencia publicas?
                </p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {POSTING_FREQUENCIES.map((f) => (
                    <ChoiceCard
                      key={f.id}
                      option={{ ...f, Icon: Calendar }}
                      selected={postingFreq === f.id}
                      onSelect={setPostingFreq}
                      compact
                    />
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ── Step 3: nicho ─────────────────────────────────────── */}
          {currentStep === 'niche' && (
            <div>
              <h3 style={{
                fontFamily: FONT_DISPLAY, fontSize: 22, fontWeight: 700,
                letterSpacing: '-0.02em', margin: '0 0 8px', color: 'var(--text)',
              }}>
                ¿Sobre qué publicas?
              </h3>
              <p style={{ fontSize: 14, color: 'var(--muted)', margin: '0 0 22px', lineHeight: 1.55 }}>
                El nicho cambia el CPM mediano hasta ×2,5. Los premium (Finanzas, B2B SaaS, Cripto)
                tienen más demanda de anunciantes.
              </p>
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))',
                gap: 8,
              }}>
                {NICHES.map((n) => (
                  <PillCard
                    key={n.id}
                    option={n}
                    selected={niche === n.id}
                    onSelect={setNiche}
                    badge={n.mult >= 1.3 ? `Premium · ×${n.mult.toFixed(1)}` : null}
                  />
                ))}
              </div>
            </div>
          )}

          {/* ── Step 4: resultado ─────────────────────────────────── */}
          {currentStep === 'result' && computed && (
            <div>
              <h3 style={{
                fontFamily: FONT_DISPLAY, fontSize: 22, fontWeight: 700,
                letterSpacing: '-0.02em', margin: '0 0 8px', color: 'var(--text)',
              }}>
                Tu tarifa estimada
              </h3>
              <p style={{ fontSize: 14, color: 'var(--muted)', margin: '0 0 22px', lineHeight: 1.55 }}>
                Basada en tus respuestas. Para confirmar con datos reales, vincula tu cuenta
                de WhatsApp con OAuth (30 segundos, oficial de Meta).
              </p>

              {/* Tarjeta principal */}
              <div style={{
                background: `linear-gradient(180deg, ${GREEN}10 0%, ${GREEN}04 100%)`,
                border: `1px solid ${greenAlpha(0.28)}`,
                borderRadius: 16,
                padding: '24px 26px',
                marginBottom: 14,
                boxShadow: `0 12px 32px -16px ${greenAlpha(0.4)}`,
              }}>
                <p style={{
                  fontSize: 11, fontWeight: 600, textTransform: 'uppercase',
                  letterSpacing: '0.1em', color: GREEN, margin: '0 0 8px',
                }}>
                  Precio · Post estándar
                </p>
                <div style={{
                  fontFamily: FONT_DISPLAY, fontSize: 'clamp(32px, 5vw, 44px)',
                  fontWeight: 700, letterSpacing: '-0.03em', color: 'var(--text)',
                  lineHeight: 1, marginBottom: 8,
                  fontVariantNumeric: 'tabular-nums',
                }}>
                  {fmtEur(computed.pricePerFormat[0].price)}
                </div>
                <p style={{ fontSize: 13, color: 'var(--muted)', margin: 0, lineHeight: 1.5 }}>
                  El anunciante paga {fmtEur(computed.pricePerFormat[0].price * 1.2)} (tu tarifa +{' '}
                  {PUBLIC_COMMISSION_LABEL} comisión Channelad).
                </p>
              </div>

              {/* Mini-stats */}
              <div style={{
                display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 22,
              }}>
                <MiniStat
                  label="Ingreso mensual"
                  value={fmtEur(computed.monthlyEarnings)}
                  sub={`Anual: ${fmtEur(computed.yearlyEarnings)}`}
                />
                <MiniStat
                  label="CPM efectivo"
                  value={`${computed.effectiveCpm.toFixed(1)} €`}
                  sub={`Alcance ~ ${computed.reachPerPost.toLocaleString('es-ES')}`}
                />
              </div>

              {/* Tabla de formatos */}
              <div style={{
                background: 'var(--surface)',
                border: '1px solid var(--border)',
                borderRadius: 14,
                padding: '16px 18px',
                marginBottom: 24,
              }}>
                <p style={{
                  fontSize: 11, fontWeight: 600, textTransform: 'uppercase',
                  letterSpacing: '0.1em', color: 'var(--muted)', margin: '0 0 12px',
                }}>
                  Tu tarifa por formato
                </p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {computed.pricePerFormat.map((fmt) => (
                    <div
                      key={fmt.id}
                      style={{
                        display: 'flex', justifyContent: 'space-between',
                        alignItems: 'center', padding: '8px 0',
                        borderBottom: '1px solid var(--border)',
                      }}
                    >
                      <span style={{ fontSize: 14, color: 'var(--text)' }}>{fmt.label}</span>
                      <span style={{
                        fontFamily: FONT_DISPLAY, fontSize: 16, fontWeight: 700,
                        color: 'var(--text)', fontVariantNumeric: 'tabular-nums',
                      }}>
                        {fmtEur(fmt.price)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* CTA verificar — el wedge */}
              <a
                href={oauthUrl}
                style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
                  width: '100%', padding: '16px 24px', borderRadius: 12,
                  background: GREEN, color: '#fff',
                  fontSize: 15, fontWeight: 600, textDecoration: 'none',
                  fontFamily: FONT_BODY,
                  boxShadow: `0 8px 20px ${greenAlpha(0.32)}`,
                  transition: 'transform 0.15s',
                }}
                onMouseDown={(e) => e.currentTarget.style.transform = 'scale(0.98)'}
                onMouseUp={(e) => e.currentTarget.style.transform = 'scale(1)'}
                onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
              >
                <Lock size={16} strokeWidth={2.4} />
                Verificar mi canal con OAuth
                <ArrowRight size={16} strokeWidth={2.4} />
              </a>

              <p style={{
                fontSize: 12, color: 'var(--muted)',
                textAlign: 'center', marginTop: 14, lineHeight: 1.5,
              }}>
                30 segundos · Sin compartir contraseña · API oficial de Meta · Te leeremos solo las
                métricas del canal (no los mensajes privados de tu audiencia)
              </p>
            </div>
          )}
      </motion.div>

      {/* Footer navigation — solo en pasos no-result */}
      {stepIdx < STEPS.length - 1 && (
        <div style={{
          display: 'flex', justifyContent: 'space-between',
          gap: 12, marginTop: 28, paddingTop: 22,
          borderTop: '1px solid var(--border)',
        }}>
          <button
            type="button"
            onClick={prev}
            style={{
              padding: '12px 22px',
              fontSize: 14, fontWeight: 500,
              background: 'transparent', color: 'var(--muted)',
              border: '1px solid var(--border)', borderRadius: 11,
              cursor: 'pointer', fontFamily: FONT_BODY,
            }}
          >
            {stepIdx === 0 ? 'Salir' : 'Atrás'}
          </button>
          <button
            type="button"
            onClick={next}
            disabled={!canAdvance}
            style={{
              display: 'flex', alignItems: 'center', gap: 8,
              padding: '12px 24px',
              fontSize: 14, fontWeight: 600,
              background: canAdvance ? GREEN : 'var(--bg2)',
              color: canAdvance ? '#fff' : 'var(--muted)',
              border: 'none', borderRadius: 11,
              cursor: canAdvance ? 'pointer' : 'not-allowed',
              fontFamily: FONT_BODY,
              boxShadow: canAdvance ? `0 6px 16px ${greenAlpha(0.28)}` : 'none',
              transition: 'all 0.2s',
            }}
          >
            Continuar
            <ArrowRight size={14} strokeWidth={2.4} />
          </button>
        </div>
      )}
    </div>
  )
}

// ─── Helper visual ──────────────────────────────────────────────────────────
function MiniStat({ label, value, sub }) {
  return (
    <div style={{
      background: 'var(--surface)',
      border: '1px solid var(--border)',
      borderRadius: 12,
      padding: '14px 16px',
    }}>
      <p style={{
        fontSize: 10.5, fontWeight: 600, textTransform: 'uppercase',
        letterSpacing: '0.08em', color: 'var(--muted)', margin: '0 0 6px',
      }}>
        {label}
      </p>
      <div style={{
        fontFamily: FONT_DISPLAY, fontSize: 22, fontWeight: 700,
        letterSpacing: '-0.02em', color: 'var(--text)', lineHeight: 1,
        fontVariantNumeric: 'tabular-nums',
      }}>
        {value}
      </div>
      {sub && (
        <p style={{ fontSize: 11.5, color: 'var(--muted)', margin: '6px 0 0' }}>
          {sub}
        </p>
      )}
    </div>
  )
}
