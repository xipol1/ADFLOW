import React, { useState, useMemo, useCallback } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Check, ArrowLeft, Sparkles, Zap, Building2 } from 'lucide-react'
import SEO from '../../components/SEO'
import apiService from '../../../services/api'
import { useAuth } from '../../../auth/AuthContext'
import { PURPLE, purpleAlpha, FONT_BODY, MAX_W } from '../../theme/tokens'

const F = FONT_BODY

// Local mirror of config/plans.js — kept intentionally small (price + feature
// labels for marketing). The server is still the source of truth for what a
// subscription actually unlocks; this object only drives the marketing page.
const TIERS = {
  creator_free: {
    label: 'Creator',
    role: 'creator',
    tier: 'free',
    monthly: 0,
    annual: 0,
    headline: 'Lanza tus canales y empieza a monetizar',
    bullets: [
      'Hasta 2 canales en marketplace',
      'Pagos automáticos vía Stripe Connect',
      'Analytics básicos del canal',
      'Soporte por email',
    ],
    cta: 'Empezar gratis',
  },
  creator_pro: {
    label: 'Creator Pro',
    role: 'creator',
    tier: 'pro',
    monthly: 15,
    annual: 144,
    badge: 'Más popular',
    headline: 'Multiplica visibilidad y desbloquea analytics avanzados',
    bullets: [
      'Canales ilimitados en marketplace',
      'Prioridad en ranking y descubrimiento',
      'Cohort, benchmark y overlap entre canales',
      'API personal + export CSV/JSON',
      'URL custom channelad.io/c/tunombre',
      'Badge Pro verificado',
      'Soporte prioritario',
    ],
    cta: 'Probar 14 días gratis',
  },
  advertiser_free: {
    label: 'Advertiser',
    role: 'advertiser',
    tier: 'free',
    monthly: 0,
    annual: 0,
    headline: 'Lanza campañas en comunidades reales sin coste fijo',
    bullets: [
      'Comisión 20% sobre el coste de la campaña',
      'Hasta 1.000 conversiones/mes',
      'Atribución last-touch (ventana 7d)',
      'Marketplace + análisis básicos de canal',
    ],
    cta: 'Empezar gratis',
  },
  advertiser_pro: {
    label: 'Advertiser Pro',
    role: 'advertiser',
    tier: 'pro',
    monthly: 49,
    annual: 470.4,
    badge: 'Ahorra desde €980/mes',
    headline: 'Baja la comisión y desbloquea suite completa de growth',
    bullets: [
      'Comisión 15% (5pp menos vs Free)',
      'Bulk Launcher / Autobuy ilimitado',
      'Lookalike, niche heatmap, audience insights',
      'A/B Test Lab + Forecast ROI + Realtime Monitor',
      'Conversiones ilimitadas + atribución multi-touch (90d)',
      'Webhooks salientes',
      'Soporte prioritario',
    ],
    cta: 'Probar 14 días gratis',
  },
}

const STD_COMMISSION_FREE = 0.20
const STD_COMMISSION_PRO  = 0.15
const PRO_MONTHLY = 49

function formatEuro(value, decimals = 0) {
  return new Intl.NumberFormat('es-ES', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value)
}

function PriceTag({ tier, interval }) {
  if (tier.monthly === 0) {
    return (
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
        <span style={{ fontSize: 44, fontWeight: 800, letterSpacing: '-0.02em' }}>Gratis</span>
      </div>
    )
  }
  const monthly = interval === 'annual' ? tier.annual / 12 : tier.monthly
  return (
    <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
      <span style={{ fontSize: 44, fontWeight: 800, letterSpacing: '-0.02em' }}>
        {formatEuro(monthly, monthly < 10 ? 2 : 0)}
      </span>
      <span style={{ fontSize: 14, color: 'var(--text-muted)' }}>/mes</span>
      {interval === 'annual' && (
        <span
          style={{
            fontSize: 12,
            color: PURPLE,
            background: purpleAlpha(0.12),
            padding: '2px 8px',
            borderRadius: 999,
            marginLeft: 6,
            fontWeight: 600,
          }}
        >
          facturación anual
        </span>
      )}
    </div>
  )
}

function TierCard({ planKey, tier, interval, onCheckout, loadingKey, currentPlanKey }) {
  const isCurrent = currentPlanKey === planKey
  const isPaid = tier.monthly > 0
  const isLoading = loadingKey === planKey
  const handleClick = () => {
    if (!isPaid) return // free plans live by registering, not by checkout
    onCheckout(planKey, interval)
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-40px' }}
      transition={{ duration: 0.4 }}
      style={{
        position: 'relative',
        borderRadius: 20,
        background: 'var(--surface)',
        border: tier.tier === 'pro' ? `1px solid ${purpleAlpha(0.35)}` : '1px solid var(--border)',
        padding: 28,
        display: 'flex',
        flexDirection: 'column',
        gap: 18,
        boxShadow: tier.tier === 'pro' ? `0 16px 60px ${purpleAlpha(0.18)}` : '0 4px 20px rgba(0,0,0,0.04)',
        overflow: 'hidden',
      }}
    >
      {tier.badge && (
        <div
          style={{
            position: 'absolute',
            top: 16,
            right: 16,
            fontSize: 11,
            fontWeight: 700,
            letterSpacing: '0.04em',
            color: PURPLE,
            background: purpleAlpha(0.12),
            padding: '4px 10px',
            borderRadius: 999,
          }}
        >
          {tier.badge}
        </div>
      )}
      <div>
        <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
          {tier.role === 'creator' ? 'Para canales' : 'Para anunciantes'}
        </div>
        <h3 style={{ margin: '6px 0 4px', fontSize: 22, fontWeight: 700 }}>{tier.label}</h3>
        <p style={{ margin: 0, fontSize: 14, color: 'var(--text-muted)', minHeight: 40 }}>{tier.headline}</p>
      </div>

      <PriceTag tier={tier} interval={interval} />

      <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'grid', gap: 10 }}>
        {tier.bullets.map((b) => (
          <li key={b} style={{ display: 'flex', alignItems: 'flex-start', gap: 8, fontSize: 14, color: 'var(--text)' }}>
            <Check size={16} style={{ color: PURPLE, flexShrink: 0, marginTop: 2 }} />
            <span>{b}</span>
          </li>
        ))}
      </ul>

      <button
        type="button"
        disabled={isCurrent || isLoading}
        onClick={handleClick}
        aria-label={isCurrent ? 'Plan actual' : tier.cta}
        style={{
          marginTop: 'auto',
          padding: '12px 18px',
          borderRadius: 12,
          fontSize: 14,
          fontWeight: 600,
          fontFamily: F,
          cursor: isCurrent || isLoading ? 'default' : 'pointer',
          border: 'none',
          background: isCurrent
            ? 'transparent'
            : tier.tier === 'pro' ? PURPLE : 'var(--surface-2)',
          color: isCurrent ? 'var(--text-muted)' : tier.tier === 'pro' ? '#fff' : 'var(--text)',
          opacity: isLoading ? 0.7 : 1,
          transition: 'background 120ms ease, transform 120ms ease',
        }}
      >
        {isCurrent ? 'Tu plan actual' : isLoading ? 'Redirigiendo…' : isPaid ? tier.cta : tier.cta}
      </button>
    </motion.div>
  )
}

/**
 * Break-even calculator for Advertiser Pro.
 * Comisión Free 20% vs Pro 15% → cada €100 de spend ahorra €5. Pro cuesta €49/mes.
 * Punto de equilibrio: ~€980/mes de campaign spend.
 */
function BreakEvenCalculator() {
  const [spend, setSpend] = useState(1500)

  const { saved, netDelta, beSpend } = useMemo(() => {
    const monthlyFree = spend * STD_COMMISSION_FREE
    const monthlyPro  = spend * STD_COMMISSION_PRO
    const saved = monthlyFree - monthlyPro
    const netDelta = saved - PRO_MONTHLY
    const beSpend = PRO_MONTHLY / (STD_COMMISSION_FREE - STD_COMMISSION_PRO)
    return { saved, netDelta, beSpend }
  }, [spend])

  return (
    <section
      style={{
        margin: '64px auto 0',
        padding: 28,
        borderRadius: 24,
        background: 'var(--surface)',
        border: `1px solid ${purpleAlpha(0.25)}`,
        maxWidth: 900,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
        <Sparkles size={18} style={{ color: PURPLE }} />
        <h2 style={{ margin: 0, fontSize: 22, fontWeight: 700 }}>Calculadora de ahorro Advertiser Pro</h2>
      </div>
      <p style={{ margin: '0 0 18px', fontSize: 14, color: 'var(--text-muted)' }}>
        Pro baja tu comisión del 20% al 15%. Estima cuánto ahorras y desde qué nivel de spend Pro se paga solo.
      </p>

      <label htmlFor="spend" style={{ fontSize: 13, fontWeight: 600 }}>
        Tu spend mensual estimado: <span style={{ color: PURPLE }}>{formatEuro(spend, 0)}</span>
      </label>
      <input
        id="spend"
        type="range"
        min={100}
        max={20000}
        step={50}
        value={spend}
        onChange={(e) => setSpend(Number(e.target.value))}
        style={{ width: '100%', marginTop: 8, accentColor: PURPLE }}
        aria-valuemin={100}
        aria-valuemax={20000}
        aria-valuenow={spend}
      />
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>
        <span>€100</span>
        <span>€20.000</span>
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap: 16,
          marginTop: 24,
        }}
      >
        <CalcStat label="Ahorro en comisión" value={formatEuro(saved, 0)} accent />
        <CalcStat
          label={netDelta >= 0 ? 'Ganas con Pro' : 'Pro se paga al llegar a'}
          value={netDelta >= 0 ? formatEuro(netDelta, 0) : formatEuro(beSpend, 0) + '/mes'}
          accent={netDelta >= 0}
        />
        <CalcStat label="Break-even" value={formatEuro(beSpend, 0) + '/mes'} />
      </div>

      {netDelta >= 0 && (
        <p style={{ margin: '18px 0 0', fontSize: 13, color: PURPLE, fontWeight: 600 }}>
          A tu nivel de spend, suscribirte a Pro te devuelve {formatEuro(netDelta, 0)} cada mes.
        </p>
      )}
    </section>
  )
}

function CalcStat({ label, value, accent }) {
  return (
    <div
      style={{
        padding: 16,
        borderRadius: 14,
        background: accent ? purpleAlpha(0.08) : 'var(--surface-2)',
        border: `1px solid ${accent ? purpleAlpha(0.2) : 'var(--border)'}`,
      }}
    >
      <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{label}</div>
      <div style={{ fontSize: 22, fontWeight: 700, marginTop: 4, color: accent ? PURPLE : 'var(--text)' }}>
        {value}
      </div>
    </div>
  )
}

function EnterpriseBlock() {
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState({ email: '', role: 'advertiser', company: '', estimatedMonthlySpend: '', message: '' })
  const [status, setStatus] = useState({ kind: 'idle', msg: '' })

  const submit = async (e) => {
    e.preventDefault()
    setStatus({ kind: 'loading', msg: '' })
    try {
      const res = await apiService.contactSales({
        ...form,
        estimatedMonthlySpend: Number(form.estimatedMonthlySpend) || 0,
      })
      if (!res?.success) throw new Error(res?.message || 'No se pudo enviar')
      setStatus({ kind: 'success', msg: 'Recibido. Te contactamos en menos de 24h.' })
      setForm({ email: '', role: 'advertiser', company: '', estimatedMonthlySpend: '', message: '' })
    } catch (err) {
      setStatus({ kind: 'error', msg: err?.message || 'Error al enviar' })
    }
  }

  return (
    <section
      style={{
        margin: '48px auto 0',
        maxWidth: 900,
        borderRadius: 24,
        padding: 28,
        background: 'linear-gradient(135deg, rgba(124,58,237,0.05), rgba(99,102,241,0.05))',
        border: '1px solid var(--border)',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 18, flexWrap: 'wrap' }}>
        <Building2 size={28} style={{ color: PURPLE }} />
        <div style={{ flex: 1, minWidth: 240 }}>
          <h2 style={{ margin: '0 0 6px', fontSize: 22, fontWeight: 700 }}>Enterprise</h2>
          <p style={{ margin: 0, fontSize: 14, color: 'var(--text-muted)' }}>
            Comisión negociable, multi-equipo, integraciones a medida, SLAs, account manager dedicado.
            Para agencias con spend &gt;€10k/mes o creators con &gt;50 canales.
          </p>
        </div>
        {!open && (
          <button
            type="button"
            onClick={() => setOpen(true)}
            style={{
              padding: '10px 18px',
              borderRadius: 10,
              fontSize: 14,
              fontWeight: 600,
              fontFamily: F,
              cursor: 'pointer',
              background: PURPLE,
              color: '#fff',
              border: 'none',
            }}
          >
            Contactar ventas
          </button>
        )}
      </div>

      {open && (
        <form onSubmit={submit} style={{ marginTop: 22, display: 'grid', gap: 12 }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12 }}>
            <Input label="Email" type="email" required value={form.email} onChange={(v) => setForm({ ...form, email: v })} />
            <Select
              label="Rol"
              value={form.role}
              onChange={(v) => setForm({ ...form, role: v })}
              options={[{ v: 'advertiser', l: 'Advertiser / Agencia' }, { v: 'creator', l: 'Creator / Network' }]}
            />
            <Input label="Empresa" value={form.company} onChange={(v) => setForm({ ...form, company: v })} />
            <Input
              label="Spend estimado/mes (€)"
              type="number"
              value={form.estimatedMonthlySpend}
              onChange={(v) => setForm({ ...form, estimatedMonthlySpend: v })}
            />
          </div>
          <Textarea
            label="¿Qué buscas resolver?"
            value={form.message}
            onChange={(v) => setForm({ ...form, message: v })}
          />
          {status.kind !== 'idle' && (
            <div
              role={status.kind === 'error' ? 'alert' : 'status'}
              style={{
                fontSize: 13,
                color: status.kind === 'error' ? '#dc2626' : status.kind === 'success' ? '#16a34a' : 'var(--text-muted)',
              }}
            >
              {status.msg || (status.kind === 'loading' ? 'Enviando…' : '')}
            </div>
          )}
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              type="submit"
              disabled={status.kind === 'loading'}
              style={{
                padding: '10px 18px',
                borderRadius: 10,
                fontSize: 14,
                fontWeight: 600,
                fontFamily: F,
                cursor: 'pointer',
                background: PURPLE,
                color: '#fff',
                border: 'none',
              }}
            >
              Enviar
            </button>
            <button
              type="button"
              onClick={() => setOpen(false)}
              style={{
                padding: '10px 18px',
                borderRadius: 10,
                fontSize: 14,
                fontWeight: 600,
                fontFamily: F,
                cursor: 'pointer',
                background: 'transparent',
                color: 'var(--text-muted)',
                border: '1px solid var(--border)',
              }}
            >
              Cancelar
            </button>
          </div>
        </form>
      )}
    </section>
  )
}

function Input({ label, value, onChange, type = 'text', required = false }) {
  return (
    <label style={{ display: 'grid', gap: 4, fontSize: 12, color: 'var(--text-muted)' }}>
      {label}
      <input
        type={type}
        required={required}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        style={{
          padding: '10px 12px',
          borderRadius: 10,
          border: '1px solid var(--border)',
          background: 'var(--surface)',
          color: 'var(--text)',
          fontSize: 14,
          fontFamily: F,
        }}
      />
    </label>
  )
}

function Select({ label, value, onChange, options }) {
  return (
    <label style={{ display: 'grid', gap: 4, fontSize: 12, color: 'var(--text-muted)' }}>
      {label}
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        style={{
          padding: '10px 12px',
          borderRadius: 10,
          border: '1px solid var(--border)',
          background: 'var(--surface)',
          color: 'var(--text)',
          fontSize: 14,
          fontFamily: F,
        }}
      >
        {options.map((o) => <option key={o.v} value={o.v}>{o.l}</option>)}
      </select>
    </label>
  )
}

function Textarea({ label, value, onChange }) {
  return (
    <label style={{ display: 'grid', gap: 4, fontSize: 12, color: 'var(--text-muted)' }}>
      {label}
      <textarea
        rows={4}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        style={{
          padding: '10px 12px',
          borderRadius: 10,
          border: '1px solid var(--border)',
          background: 'var(--surface)',
          color: 'var(--text)',
          fontSize: 14,
          fontFamily: F,
          resize: 'vertical',
        }}
      />
    </label>
  )
}

export default function PricingPage() {
  const [interval, setInterval] = useState('monthly')
  const [loadingKey, setLoadingKey] = useState(null)
  const { user, isAuthenticated } = useAuth()
  const navigate = useNavigate()
  const currentPlanKey = user?.subscription?.plan || null

  const handleCheckout = useCallback(
    async (planKey, billingInterval) => {
      if (!isAuthenticated) {
        navigate(`/auth/login?next=/pricing&plan=${planKey}&interval=${billingInterval}`)
        return
      }
      setLoadingKey(planKey)
      try {
        const res = await apiService.createCheckoutSession(planKey, billingInterval)
        if (res?.url) {
          window.location.href = res.url
          return
        }
        throw new Error(res?.message || 'No se pudo iniciar el checkout')
      } catch (e) {
        setLoadingKey(null)
        alert(e?.message || 'No se pudo iniciar el checkout')
      }
    },
    [isAuthenticated, navigate]
  )

  return (
    <main
      data-testid="pricing-page"
      style={{
        fontFamily: F,
        color: 'var(--text)',
        background:
          'radial-gradient(ellipse 90% 50% at 75% 8%, rgba(124, 58, 237, 0.08) 0%, transparent 55%), radial-gradient(ellipse 60% 40% at 15% 30%, rgba(99, 102, 241, 0.05) 0%, transparent 60%), var(--bg)',
        minHeight: '100vh',
        paddingBottom: 80,
      }}
    >
      <SEO
        title="Precios"
        description="Plan Free para empezar y Plan Pro con comisión rebajada (15%), bulk launcher, analytics avanzados y atribución multi-touch. 14 días gratis sin tarjeta."
        path="/pricing"
        type="website"
      />

      <div style={{ maxWidth: MAX_W, margin: '0 auto', padding: '32px 24px 0' }}>
        <Link
          to="/"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            fontSize: 13,
            color: 'var(--text-muted)',
            textDecoration: 'none',
          }}
        >
          <ArrowLeft size={14} /> Volver
        </Link>

        <header style={{ marginTop: 28, textAlign: 'center' }}>
          <h1
            style={{
              fontSize: 'clamp(34px, 4.5vw, 52px)',
              fontWeight: 800,
              letterSpacing: '-0.02em',
              margin: '0 0 12px',
            }}
          >
            Precios simples para crecer
          </h1>
          <p
            style={{
              maxWidth: 640,
              margin: '0 auto',
              fontSize: 16,
              color: 'var(--text-muted)',
              lineHeight: 1.55,
            }}
          >
            Empieza gratis. Cambia a Pro cuando crezcas y la comisión rebajada (Advertiser) o los analytics avanzados (Creator) compensen el plan.
            Sin permanencia, sin tarjeta para empezar la prueba.
          </p>

          {/* Toggle mensual / anual */}
          <div
            role="tablist"
            aria-label="Periodo de facturación"
            style={{
              display: 'inline-flex',
              marginTop: 24,
              padding: 4,
              borderRadius: 999,
              background: 'var(--surface)',
              border: '1px solid var(--border)',
            }}
          >
            {[
              { key: 'monthly', label: 'Mensual' },
              { key: 'annual',  label: 'Anual · -20%' },
            ].map((o) => (
              <button
                key={o.key}
                role="tab"
                aria-selected={interval === o.key}
                onClick={() => setInterval(o.key)}
                style={{
                  padding: '8px 16px',
                  borderRadius: 999,
                  fontSize: 13,
                  fontWeight: 600,
                  fontFamily: F,
                  cursor: 'pointer',
                  border: 'none',
                  background: interval === o.key ? PURPLE : 'transparent',
                  color: interval === o.key ? '#fff' : 'var(--text-muted)',
                  transition: 'background 120ms ease',
                }}
              >
                {o.label}
              </button>
            ))}
          </div>
        </header>

        <section
          aria-label="Planes"
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
            gap: 20,
            marginTop: 40,
          }}
        >
          {Object.entries(TIERS).map(([key, tier]) => (
            <TierCard
              key={key}
              planKey={key}
              tier={tier}
              interval={interval}
              onCheckout={handleCheckout}
              loadingKey={loadingKey}
              currentPlanKey={currentPlanKey}
            />
          ))}
        </section>

        <BreakEvenCalculator />
        <EnterpriseBlock />

        <section style={{ margin: '64px auto 0', maxWidth: 720 }}>
          <h2 style={{ fontSize: 22, fontWeight: 700, marginBottom: 16, textAlign: 'center' }}>Preguntas frecuentes</h2>
          {[
            {
              q: '¿La prueba de 14 días pide tarjeta?',
              a: 'No. Te damos acceso completo al plan Pro durante 14 días y te pedimos la tarjeta al final del periodo para continuar.',
            },
            {
              q: '¿Puedo cambiar de plan después?',
              a: 'Sí, sin permanencia. Las campañas ya creadas mantienen la comisión a la que se cobraron — un cambio de plan no afecta retroactivamente.',
            },
            {
              q: '¿Qué pasa si bajo de Pro a Free?',
              a: 'Tus canales y datos se quedan. Los canales por encima del límite de Free (2) dejan de aparecer en marketplace, pero no se borran; al volver a Pro se reactivan automáticamente.',
            },
            {
              q: '¿Cómo se calcula el ahorro de Advertiser Pro?',
              a: 'Pro baja la comisión del 20% al 15%. Con €1.000/mes de spend ahorras €50 → Pro (€49) se paga solo. Cuanto más gastes, más rentable.',
            },
          ].map((f) => (
            <details
              key={f.q}
              style={{
                padding: 14,
                borderRadius: 12,
                background: 'var(--surface)',
                border: '1px solid var(--border)',
                marginBottom: 10,
              }}
            >
              <summary style={{ cursor: 'pointer', fontWeight: 600, fontSize: 15 }}>{f.q}</summary>
              <p style={{ margin: '8px 0 0', fontSize: 14, color: 'var(--text-muted)' }}>{f.a}</p>
            </details>
          ))}
        </section>
      </div>
    </main>
  )
}
