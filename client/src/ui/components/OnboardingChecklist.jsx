import React, { useMemo, useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  CheckCircle2, Circle, ChevronRight, X, Sparkles, Radio,
  ShieldCheck, User, DollarSign, Compass, Receipt, ArrowRight, Trophy,
  Target, CreditCard, Activity, Rocket, Search,
} from 'lucide-react'
import {
  FONT_BODY as F, FONT_DISPLAY as D,
  GREEN, greenAlpha, PURPLE, purpleAlpha, OK,
} from '../theme/tokens'

/**
 * OnboardingChecklist — universal "complete your setup" pattern.
 *
 * Works for both creator and advertiser dashboards. Role-aware in three
 * dimensions:
 *   - Accent color: green for creator, purple for advertiser
 *   - Steps: built from the role-specific buildSteps* helpers below
 *   - localStorage keys: namespaced by role so dismissals don't bleed
 *
 * Detects completion automatically from the data passed in (channels,
 * campaigns, requests, transactions), plus a few localStorage flags for
 * things that don't have a server-side state yet (profile drafts, fiscal
 * data).
 *
 * Variants:
 *   - 'banner' (default): wide horizontal banner at the top of the dashboard
 *   - 'widget': compact card for a customizable dashboard grid
 */
export default function OnboardingChecklist({
  role = 'creator',
  channels = [],
  campaigns = [],
  requests = [],
  transactions = [],
  variant = 'banner',
  onDismiss,
}) {
  const navigate = useNavigate()

  // Role-resolved tokens. Doing this inside the component (vs module-level)
  // is the price for being polymorphic — pass them down to sub-components.
  const accent = role === 'advertiser' ? PURPLE : GREEN
  const ga = role === 'advertiser' ? purpleAlpha : greenAlpha
  const dismissKey = `channelad-${role}-onboarding-dismissed-v1`
  const completeKey = `channelad-${role}-onboarding-completed-v1`

  const [dismissed, setDismissed] = useState(() => loadFlag(dismissKey))
  const [graduatedShown, setGraduatedShown] = useState(false)

  const profile = (() => {
    const key = role === 'advertiser'
      ? 'channelad-advertiser-profile-draft'
      : 'channelad-creator-profile-draft'
    try { return JSON.parse(localStorage.getItem(key) || 'null') }
    catch { return null }
  })()

  const steps = useMemo(
    () => role === 'advertiser'
      ? buildAdvertiserSteps({ campaigns, transactions, profile })
      : buildCreatorSteps({ channels, campaigns, requests, profile }),
    [role, channels, campaigns, requests, transactions, profile]
  )
  const completedCount = steps.filter(s => s.complete).length
  const total = steps.length
  const pct = total > 0 ? Math.round((completedCount / total) * 100) : 0
  const allDone = completedCount === total

  useEffect(() => {
    if (allDone) {
      const wasShownGrad = localStorage.getItem(completeKey)
      if (wasShownGrad) setGraduatedShown(true)
    }
  }, [allDone, completeKey])

  const dismiss = () => {
    saveFlag(dismissKey, 'true')
    setDismissed(true)
    onDismiss?.()
    try {
      import('../../services/api').then(mod => {
        const apiService = mod.default || mod
        const fieldKey = role === 'advertiser' ? 'perfilAnunciante' : 'perfilCreador'
        apiService.request?.('/auth/perfil', {
          method: 'PUT',
          body: JSON.stringify({ [fieldKey]: { onboardingDismissedAt: new Date().toISOString() } }),
        }).catch(() => {})
      }).catch(() => {})
    } catch {}
  }

  const markGraduated = () => {
    saveFlag(completeKey, String(Date.now()))
    setGraduatedShown(true)
  }

  if (dismissed) return null
  if (allDone && graduatedShown) return null
  if (allDone && !graduatedShown) {
    return <GraduatedView role={role} accent={accent} ga={ga} onClose={markGraduated} />
  }

  const props = { steps, pct, completedCount, total, navigate, dismiss, accent, ga, role }
  if (variant === 'widget') return <WidgetVariant {...props} />
  return <BannerVariant {...props} />
}

// ─── Banner variant — wide horizontal at top of Dashboard ───────────────────
function BannerVariant({ steps, pct, completedCount, total, navigate, dismiss, accent, ga, role }) {
  const [expanded, setExpanded] = useState(false)
  const nextStep = steps.find(s => !s.complete)
  const subjectLabel = role === 'advertiser' ? 'advertiser' : 'creator'

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
            <circle cx="25" cy="25" r="22" fill="none" stroke={accent} strokeWidth="3"
              strokeDasharray={`${(pct / 100) * 138} 138`} strokeLinecap="round"
              style={{ transition: 'stroke-dasharray .6s cubic-bezier(.22,1,.36,1)' }} />
          </svg>
          <span style={{ fontFamily: D, fontSize: 13, fontWeight: 800, color: accent, fontVariantNumeric: 'tabular-nums', position: 'relative' }}>
            {pct}%
          </span>
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontFamily: D, fontSize: 17, fontWeight: 800, color: 'var(--text)', letterSpacing: '-0.02em', marginBottom: 2 }}>
            Completa tu setup como {subjectLabel}
          </div>
          <div style={{ fontSize: 12.5, color: 'var(--muted)' }}>
            {completedCount}/{total} pasos · {nextStep ? `Siguiente: ${nextStep.title}` : '¡Casi terminas!'}
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          {nextStep && (
            <button onClick={() => navigate(nextStep.path)} style={primaryBtnStyle(accent, ga)}>
              {nextStep.cta} <ArrowRight size={12} />
            </button>
          )}
          <button onClick={() => setExpanded(e => !e)} style={iconBtnStyle}>
            <ChevronRight size={13} style={{ transform: expanded ? 'rotate(90deg)' : 'rotate(0deg)', transition: 'transform .2s' }} />
          </button>
        </div>
      </div>

      {expanded && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 10 }}>
          {steps.map(s => <StepCard key={s.id} step={s} navigate={navigate} accent={accent} ga={ga} />)}
        </div>
      )}
    </div>
  )
}

// ─── Widget variant — compact for inside customizable dashboard ─────────────
function WidgetVariant({ steps, pct, completedCount, total, navigate, accent, ga }) {
  return (
    <div style={{
      height: '100%', display: 'flex', flexDirection: 'column',
      background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12,
      padding: 14, fontFamily: F, gap: 10,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <Sparkles size={15} color={accent} />
        <span style={{ fontFamily: D, fontSize: 13, fontWeight: 700, color: 'var(--text)', flex: 1 }}>
          Tu setup
        </span>
        <span style={{
          background: ga(0.12), color: accent, border: `1px solid ${ga(0.25)}`,
          borderRadius: 20, padding: '1px 8px', fontSize: 10.5, fontWeight: 800,
          fontVariantNumeric: 'tabular-nums',
        }}>
          {completedCount}/{total}
        </span>
      </div>

      <div style={{ height: 6, borderRadius: 3, background: 'var(--bg2)', overflow: 'hidden' }}>
        <div style={{
          height: '100%', width: `${pct}%`, background: `linear-gradient(90deg, ${ga(0.6)}, ${accent})`,
          transition: 'width .8s cubic-bezier(.22,1,.36,1)',
        }} />
      </div>

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 4, overflow: 'auto', minHeight: 0 }}>
        {steps.map(s => (
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
        ))}
      </div>
    </div>
  )
}

function StepCard({ step, navigate, accent, ga }) {
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
          {step.complete ? <CheckCircle2 size={13} color={OK} /> : <Icon size={13} color={accent} strokeWidth={2.2} />}
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

function GraduatedView({ role, accent, ga, onClose }) {
  const isAdvertiser = role === 'advertiser'
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
        <Trophy size={26} color={accent} />
      </div>
      <div style={{ flex: 1, minWidth: 200 }}>
        <div style={{ fontFamily: D, fontSize: 19, fontWeight: 800, color: 'var(--text)', letterSpacing: '-0.02em', marginBottom: 4 }}>
          ¡Setup completo! 🎉
        </div>
        <div style={{ fontSize: 13, color: 'var(--muted)', lineHeight: 1.5 }}>
          {isAdvertiser
            ? 'Has terminado todos los pasos. Tu cuenta está lista para lanzar campañas en serio.'
            : 'Has terminado todos los pasos de setup. Tu perfil está listo para que advertisers te encuentren.'}
        </div>
      </div>
    </div>
  )
}

// ─── Step builders ──────────────────────────────────────────────────────────
function buildCreatorSteps({ channels, campaigns, requests, profile }) {
  const completed = campaigns.filter(c => c.status === 'COMPLETED')
  const hasOAuth = channels.some(c => c.verificacion?.tipoAcceso === 'oauth')
  const hasCAS = channels.some(c => Number(c.CAS) > 0)
  const profileComplete = profile && profile.displayName && profile.headline && profile.bio
  const hasResponded = requests.some(r => r.status !== 'pendiente') || campaigns.some(c => c.status !== 'DRAFT')
  const hasPricingSet = (profile?.packages || []).length > 0

  return [
    { id: 'channel', icon: Radio, title: 'Registra tu primer canal', description: 'Telegram, WhatsApp, Discord o Instagram', cta: 'Registrar canal', estimate: '~3 min', complete: channels.length > 0, path: '/creator/channels/new' },
    { id: 'oauth', icon: ShieldCheck, title: 'Conecta OAuth', description: 'Verifica métricas reales para subir tu Confianza', cta: 'Conectar', estimate: '~2 min', complete: hasOAuth, path: '/creator/channels' },
    { id: 'cas', icon: Sparkles, title: 'Obtén tu CAS Score', description: 'Channel Authority Score — métrica que ven advertisers', cta: 'Calcular', estimate: 'Auto al verificar', complete: hasCAS, path: '/creator/analytics' },
    { id: 'profile', icon: User, title: 'Completa tu perfil público', description: 'Bio, headline, redes — lo que ven advertisers', cta: 'Editar perfil', estimate: '~5 min', complete: profileComplete, path: '/creator/profile' },
    { id: 'pricing', icon: DollarSign, title: 'Define tus tarifas', description: 'Packages standard/premium para tu media-kit', cta: 'Configurar pricing', estimate: '~3 min', complete: hasPricingSet, path: '/creator/pricing' },
    { id: 'discover', icon: Compass, title: 'Explora briefs abiertos', description: 'Aplica a campañas que encajan con tus canales', cta: 'Ver Discover', estimate: '~5 min', complete: hasResponded || requests.length > 0, path: '/creator/discover' },
    { id: 'first-campaign', icon: Trophy, title: 'Completa tu primera campaña', description: 'Acepta una solicitud, publica y cobra', cta: 'Ir al Inbox', estimate: 'Variable', complete: completed.length > 0, path: '/creator/inbox' },
    { id: 'fiscal', icon: Receipt, title: 'Datos fiscales', description: 'NIF, dirección, IRPF — para emitir facturas', cta: 'Configurar', estimate: '~3 min', complete: hasFiscalData('channelad-creator-fiscal-v1'), path: '/creator/billing' },
  ]
}

function buildAdvertiserSteps({ campaigns, transactions, profile }) {
  const completed = campaigns.filter(c => c.status === 'COMPLETED')
  const paid = campaigns.filter(c => ['PAID', 'PUBLISHED', 'COMPLETED'].includes(c.status))
  const hasRecharge = transactions.some(t => t.tipo === 'recarga' && t.status === 'paid')
  const hasTracking = (() => {
    try { return localStorage.getItem('channelad-advertiser-tracking-configured-v1') === 'true' }
    catch { return false }
  })()
  const profileComplete = profile && (profile.companyName || profile.brandName) && profile.industry

  return [
    { id: 'fiscal', icon: Receipt, title: 'Datos fiscales', description: 'NIF/CIF, dirección — obligatorio para crear campañas', cta: 'Configurar', estimate: '~3 min', complete: hasFiscalData('channelad-advertiser-fiscal-v1'), path: '/advertiser/settings' },
    { id: 'brand', icon: User, title: 'Completa tu perfil de marca', description: 'Nombre, sector, logo — lo que ven los creators', cta: 'Editar perfil', estimate: '~4 min', complete: profileComplete, path: '/advertiser/settings' },
    { id: 'recharge', icon: CreditCard, title: 'Recarga tu saldo', description: 'Pagas campañas desde tu wallet, no por transacción', cta: 'Recargar', estimate: '~2 min', complete: hasRecharge, path: '/advertiser/finances' },
    { id: 'tracking', icon: Activity, title: 'Configura tracking', description: 'Pixel o postback para medir conversiones reales', cta: 'Configurar', estimate: '~5 min', complete: hasTracking, path: '/advertiser/tracking-setup' },
    { id: 'explore', icon: Search, title: 'Explora el marketplace', description: 'Encuentra canales que encajan con tu audiencia', cta: 'Explorar', estimate: '~5 min', complete: paid.length > 0, path: '/advertiser/explore' },
    { id: 'first-campaign', icon: Rocket, title: 'Lanza tu primera campaña', description: 'Wizard guiado: canal, copy, presupuesto, pago', cta: 'Crear campaña', estimate: '~10 min', complete: campaigns.length > 0, path: '/advertiser/campaigns/new' },
    { id: 'completed-campaign', icon: Trophy, title: 'Cierra tu primera campaña', description: 'El creator publica, midamos ROI verificado', cta: 'Ver campañas', estimate: 'Variable', complete: completed.length > 0, path: '/advertiser/campaigns' },
    { id: 'goal', icon: Target, title: 'Define un objetivo de spend', description: 'Marca un budget mensual y monitorea ROAS', cta: 'Ir a finanzas', estimate: '~2 min', complete: hasMonthlyGoal(), path: '/advertiser/finances' },
  ]
}

// ─── Persistence helpers ────────────────────────────────────────────────────
function loadFlag(key) {
  try { return localStorage.getItem(key) === 'true' } catch { return false }
}
function saveFlag(key, value) {
  try { localStorage.setItem(key, value) } catch {}
}
function hasFiscalData(key) {
  try {
    const f = JSON.parse(localStorage.getItem(key) || 'null')
    return !!(f?.nif && f?.address && f?.businessName)
  } catch { return false }
}
function hasMonthlyGoal() {
  try { return !!localStorage.getItem('channelad-advertiser-monthly-budget-v1') } catch { return false }
}

// ─── Styles ─────────────────────────────────────────────────────────────────
function primaryBtnStyle(accent, ga) {
  return {
    background: accent, color: '#fff', border: 'none', borderRadius: 8,
    padding: '7px 13px', fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: F,
    display: 'inline-flex', alignItems: 'center', gap: 5,
    boxShadow: `0 4px 14px ${ga(0.35)}`,
  }
}
const iconBtnStyle = {
  background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 7,
  width: 26, height: 26, display: 'flex', alignItems: 'center', justifyContent: 'center',
  cursor: 'pointer', color: 'var(--muted)',
}
