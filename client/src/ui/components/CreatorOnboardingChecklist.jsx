import React, { useMemo, useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  CheckCircle2, Circle, ChevronRight, X, Sparkles, Radio,
  ShieldCheck, User, Inbox, DollarSign, Compass, Receipt,
  ArrowRight, Trophy,
} from 'lucide-react'
import { FONT_BODY as F, FONT_DISPLAY as D, GREEN, greenAlpha, OK, BLUE } from '../theme/tokens'

const ACCENT = GREEN
const ga = greenAlpha
const DISMISS_KEY = 'channelad-creator-onboarding-dismissed-v1'
const COMPLETE_KEY = 'channelad-creator-onboarding-completed-v1'

/**
 * CreatorOnboardingChecklist — Pattern universal SaaS de "completa tu setup".
 *
 * Detecta automáticamente qué pasos están completos basándose en data real:
 *   - canales[] tiene items → "Registra tu canal" ✓
 *   - canal con verificacion.tipoAcceso='oauth' → "Conecta OAuth" ✓
 *   - localStorage tiene profile draft completo → "Completa tu perfil" ✓
 *   - canal con CAS > 0 → "Obtén tu CAS Score" ✓
 *   - completedCampaigns > 0 → "Completa primera campaña" ✓
 *
 * Auto-oculta a sí mismo cuando todos los pasos están completos (con un
 * mensaje de "graduación") o cuando el creator lo descarta. Usable como:
 *   - Widget en dashboard (compact)
 *   - Banner top en Overview (default)
 *   - Standalone en /onboarding (full)
 */
export default function CreatorOnboardingChecklist({
  channels = [],
  campaigns = [],
  requests = [],
  variant = 'banner', // 'banner' | 'widget' | 'full'
  onDismiss,
}) {
  const navigate = useNavigate()
  const [dismissed, setDismissed] = useState(() => loadDismissed())
  const [graduatedShown, setGraduatedShown] = useState(false)

  const profile = (() => {
    try { return JSON.parse(localStorage.getItem('channelad-creator-profile-draft') || 'null') }
    catch { return null }
  })()

  const steps = useMemo(() => buildSteps({ channels, campaigns, requests, profile }), [channels, campaigns, requests, profile])
  const completedCount = steps.filter(s => s.complete).length
  const total = steps.length
  const pct = total > 0 ? Math.round((completedCount / total) * 100) : 0
  const allDone = completedCount === total

  // Hide if dismissed or all done + graduated
  useEffect(() => {
    if (allDone) {
      const wasShownGrad = localStorage.getItem(COMPLETE_KEY)
      if (wasShownGrad) setGraduatedShown(true)
    }
  }, [allDone])

  const dismiss = () => {
    saveDismissed(true)
    setDismissed(true)
    onDismiss?.()
  }

  const markGraduated = () => {
    localStorage.setItem(COMPLETE_KEY, String(Date.now()))
    setGraduatedShown(true)
  }

  if (dismissed) return null
  if (allDone && graduatedShown) return null

  // Show "graduation" celebration once
  if (allDone && !graduatedShown) {
    return <GraduatedView onClose={markGraduated} variant={variant} />
  }

  if (variant === 'widget') return <WidgetVariant steps={steps} pct={pct} completedCount={completedCount} total={total} navigate={navigate} dismiss={dismiss} />
  return <BannerVariant steps={steps} pct={pct} completedCount={completedCount} total={total} navigate={navigate} dismiss={dismiss} />
}

// ─── Banner variant — wide horizontal at top of Dashboard ───────────────────
function BannerVariant({ steps, pct, completedCount, total, navigate, dismiss }) {
  const [expanded, setExpanded] = useState(false)
  const nextStep = steps.find(s => !s.complete)

  return (
    <div style={{
      background: `linear-gradient(135deg, var(--surface) 0%, ${ga(0.06)} 100%)`,
      border: `1px solid ${ga(0.3)}`, borderRadius: 14,
      padding: 18, fontFamily: F, position: 'relative',
    }}>
      <button onClick={dismiss} title="Ocultar" aria-label="Ocultar checklist"
        style={{
          position: 'absolute', top: 10, right: 10, width: 26, height: 26, borderRadius: 6,
          background: 'transparent', border: 'none', color: 'var(--muted2)', cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: 0.6,
        }}
        onMouseEnter={e => { e.currentTarget.style.opacity = 1; e.currentTarget.style.background = 'var(--bg2)' }}
        onMouseLeave={e => { e.currentTarget.style.opacity = 0.6; e.currentTarget.style.background = 'transparent' }}
      >
        <X size={13} />
      </button>

      <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: expanded ? 16 : 0, flexWrap: 'wrap' }}>
        <div style={{
          width: 50, height: 50, borderRadius: 14, flexShrink: 0,
          background: ga(0.15), border: `1px solid ${ga(0.3)}`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          position: 'relative',
        }}>
          <svg width="50" height="50" style={{ position: 'absolute', top: 0, left: 0, transform: 'rotate(-90deg)' }}>
            <circle cx="25" cy="25" r="22" fill="none" stroke="var(--border)" strokeWidth="3" />
            <circle cx="25" cy="25" r="22" fill="none" stroke={ACCENT} strokeWidth="3"
              strokeDasharray={`${(pct / 100) * 138} 138`} strokeLinecap="round"
              style={{ transition: 'stroke-dasharray .6s cubic-bezier(.22,1,.36,1)' }} />
          </svg>
          <span style={{ fontFamily: D, fontSize: 13, fontWeight: 800, color: ACCENT, fontVariantNumeric: 'tabular-nums', position: 'relative' }}>
            {pct}%
          </span>
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontFamily: D, fontSize: 17, fontWeight: 800, color: 'var(--text)', letterSpacing: '-0.02em', marginBottom: 2 }}>
            Completa tu setup como creator
          </div>
          <div style={{ fontSize: 12.5, color: 'var(--muted)' }}>
            {completedCount}/{total} pasos · {nextStep ? `Siguiente: ${nextStep.title}` : '¡Casi terminas!'}
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          {nextStep && (
            <button onClick={() => navigate(nextStep.path)} style={primaryBtn}>
              {nextStep.cta} <ArrowRight size={12} />
            </button>
          )}
          <button onClick={() => setExpanded(e => !e)} style={iconBtn}>
            <ChevronRight size={13} style={{ transform: expanded ? 'rotate(90deg)' : 'rotate(0deg)', transition: 'transform .2s' }} />
          </button>
        </div>
      </div>

      {expanded && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 10 }}>
          {steps.map(s => <StepCard key={s.id} step={s} navigate={navigate} />)}
        </div>
      )}
    </div>
  )
}

// ─── Widget variant — compact for inside customizable dashboard ─────────────
function WidgetVariant({ steps, pct, completedCount, total, navigate, dismiss }) {
  const nextStep = steps.find(s => !s.complete)
  return (
    <div style={{
      height: '100%', display: 'flex', flexDirection: 'column',
      background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12,
      padding: 14, fontFamily: F, gap: 10,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <Sparkles size={15} color={ACCENT} />
        <span style={{ fontFamily: D, fontSize: 13, fontWeight: 700, color: 'var(--text)', flex: 1 }}>
          Tu setup
        </span>
        <span style={{
          background: ga(0.12), color: ACCENT, border: `1px solid ${ga(0.25)}`,
          borderRadius: 20, padding: '1px 8px', fontSize: 10.5, fontWeight: 800,
          fontVariantNumeric: 'tabular-nums',
        }}>
          {completedCount}/{total}
        </span>
      </div>

      {/* Progress bar */}
      <div style={{ height: 6, borderRadius: 3, background: 'var(--bg2)', overflow: 'hidden' }}>
        <div style={{
          height: '100%', width: `${pct}%`, background: `linear-gradient(90deg, ${ga(0.6)}, ${ACCENT})`,
          transition: 'width .8s cubic-bezier(.22,1,.36,1)',
        }} />
      </div>

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 4, overflow: 'auto', minHeight: 0 }}>
        {steps.map(s => {
          const Icon = s.icon
          return (
            <button key={s.id} onClick={() => !s.complete && navigate(s.path)}
              style={{
                background: 'transparent', border: 'none', textAlign: 'left',
                padding: '6px 0', fontFamily: F, cursor: s.complete ? 'default' : 'pointer',
                display: 'flex', alignItems: 'center', gap: 8, opacity: s.complete ? 0.55 : 1,
              }}>
              {s.complete ? <CheckCircle2 size={13} color={OK} /> : <Circle size={13} color="var(--muted)" />}
              <span style={{ fontSize: 11.5, color: 'var(--text)', fontWeight: s.complete ? 500 : 600, textDecoration: s.complete ? 'line-through' : 'none', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {s.title}
              </span>
              {!s.complete && <ChevronRight size={11} color="var(--muted)" />}
            </button>
          )
        })}
      </div>
    </div>
  )
}

// ─── Step card (used in banner) ─────────────────────────────────────────────
function StepCard({ step, navigate }) {
  const Icon = step.icon
  return (
    <div onClick={() => !step.complete && navigate(step.path)}
      style={{
        background: step.complete ? `${OK}08` : 'var(--bg2)',
        border: `1px solid ${step.complete ? `${OK}25` : 'var(--border)'}`,
        borderRadius: 10, padding: 12,
        cursor: step.complete ? 'default' : 'pointer',
        transition: 'border-color .15s, background .15s, transform .15s',
      }}
      onMouseEnter={e => { if (!step.complete) { e.currentTarget.style.borderColor = ga(0.4); e.currentTarget.style.background = ga(0.06); e.currentTarget.style.transform = 'translateY(-1px)' } }}
      onMouseLeave={e => { if (!step.complete) { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.background = 'var(--bg2)'; e.currentTarget.style.transform = 'none' } }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
        <div style={{
          width: 30, height: 30, borderRadius: 8, flexShrink: 0,
          background: step.complete ? `${OK}18` : ga(0.12),
          border: `1px solid ${step.complete ? `${OK}30` : ga(0.25)}`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          {step.complete ? <CheckCircle2 size={13} color={OK} /> : <Icon size={13} color={ACCENT} strokeWidth={2.2} />}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 12.5, fontWeight: 700, color: step.complete ? 'var(--muted)' : 'var(--text)', textDecoration: step.complete ? 'line-through' : 'none', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {step.title}
          </div>
          {!step.complete && <div style={{ fontSize: 10.5, color: 'var(--muted)' }}>{step.estimate}</div>}
        </div>
      </div>
      <div style={{ fontSize: 11, color: 'var(--muted)', lineHeight: 1.4, marginLeft: 40 }}>
        {step.complete ? '¡Hecho!' : step.description}
      </div>
    </div>
  )
}

// ─── Graduation view — celebrates 100% ──────────────────────────────────────
function GraduatedView({ onClose }) {
  return (
    <div style={{
      background: `linear-gradient(135deg, ${ga(0.1)} 0%, ${ga(0.05)} 100%)`,
      border: `1px solid ${ga(0.4)}`, borderRadius: 14,
      padding: 22, fontFamily: F, position: 'relative',
      display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap',
    }}>
      <button onClick={onClose} title="Cerrar"
        style={{
          position: 'absolute', top: 10, right: 10, width: 26, height: 26, borderRadius: 6,
          background: 'transparent', border: 'none', color: 'var(--muted2)', cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
        <X size={13} />
      </button>
      <div style={{
        width: 60, height: 60, borderRadius: 18, flexShrink: 0,
        background: ga(0.2), border: `2px solid ${ga(0.4)}`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <Trophy size={26} color={ACCENT} />
      </div>
      <div style={{ flex: 1, minWidth: 200 }}>
        <div style={{ fontFamily: D, fontSize: 19, fontWeight: 800, color: 'var(--text)', letterSpacing: '-0.02em', marginBottom: 4 }}>
          ¡Perfil completo! 🎉
        </div>
        <div style={{ fontSize: 13, color: 'var(--muted)', lineHeight: 1.5 }}>
          Has terminado todos los pasos de setup. Tu perfil está listo para que advertisers te encuentren.
        </div>
      </div>
    </div>
  )
}

// ─── Step builders ──────────────────────────────────────────────────────────
function buildSteps({ channels, campaigns, requests, profile }) {
  const completed = campaigns.filter(c => c.status === 'COMPLETED')
  const hasOAuth = channels.some(c => c.verificacion?.tipoAcceso === 'oauth')
  const hasCAS = channels.some(c => Number(c.CAS) > 0)
  const profileComplete = profile && profile.displayName && profile.headline && profile.bio
  const hasResponded = requests.some(r => r.status !== 'pendiente') || campaigns.some(c => c.status !== 'DRAFT')
  const hasPricingSet = (profile?.packages || []).length > 0

  return [
    {
      id: 'channel', icon: Radio,
      title: 'Registra tu primer canal',
      description: 'Telegram, WhatsApp, Discord o Instagram',
      cta: 'Registrar canal',
      estimate: '~3 min',
      complete: channels.length > 0,
      path: '/creator/channels/new',
    },
    {
      id: 'oauth', icon: ShieldCheck,
      title: 'Conecta OAuth',
      description: 'Verifica métricas reales para subir tu Confianza',
      cta: 'Conectar',
      estimate: '~2 min',
      complete: hasOAuth,
      path: '/creator/channels',
    },
    {
      id: 'cas', icon: Sparkles,
      title: 'Obtén tu CAS Score',
      description: 'Channel Authority Score — métrica que ven advertisers',
      cta: 'Calcular',
      estimate: 'Auto al verificar',
      complete: hasCAS,
      path: '/creator/analytics',
    },
    {
      id: 'profile', icon: User,
      title: 'Completa tu perfil público',
      description: 'Bio, headline, redes — lo que ven advertisers',
      cta: 'Editar perfil',
      estimate: '~5 min',
      complete: profileComplete,
      path: '/creator/profile',
    },
    {
      id: 'pricing', icon: DollarSign,
      title: 'Define tus tarifas',
      description: 'Packages standard/premium para tu media-kit',
      cta: 'Configurar pricing',
      estimate: '~3 min',
      complete: hasPricingSet,
      path: '/creator/pricing',
    },
    {
      id: 'discover', icon: Compass,
      title: 'Explora briefs abiertos',
      description: 'Aplica a campañas que encajan con tus canales',
      cta: 'Ver Discover',
      estimate: '~5 min',
      complete: hasResponded || requests.length > 0,
      path: '/creator/discover',
    },
    {
      id: 'first-campaign', icon: Trophy,
      title: 'Completa tu primera campaña',
      description: 'Acepta una solicitud, publica y cobra',
      cta: 'Ir al Inbox',
      estimate: 'Variable',
      complete: completed.length > 0,
      path: '/creator/inbox',
    },
    {
      id: 'fiscal', icon: Receipt,
      title: 'Datos fiscales',
      description: 'NIF, dirección, IRPF — para emitir facturas',
      cta: 'Configurar',
      estimate: '~3 min',
      complete: (() => {
        try {
          const f = JSON.parse(localStorage.getItem('channelad-creator-fiscal-v1') || 'null')
          return !!(f?.nif && f?.address && f?.businessName)
        } catch { return false }
      })(),
      path: '/creator/billing',
    },
  ]
}

// ─── Persistence ────────────────────────────────────────────────────────────
function loadDismissed() {
  try { return localStorage.getItem(DISMISS_KEY) === 'true' } catch { return false }
}
function saveDismissed(v) {
  try { localStorage.setItem(DISMISS_KEY, String(v)) } catch {}
}

const primaryBtn = {
  background: ACCENT, color: '#fff', border: 'none', borderRadius: 8,
  padding: '7px 13px', fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: F,
  display: 'inline-flex', alignItems: 'center', gap: 5,
  boxShadow: `0 4px 14px ${ga(0.35)}`,
}
const iconBtn = {
  background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 7,
  width: 26, height: 26, display: 'flex', alignItems: 'center', justifyContent: 'center',
  cursor: 'pointer', color: 'var(--muted)',
}
