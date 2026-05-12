import React, { useState } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { CreditCard, ArrowRight, AlertCircle, Sparkles, CheckCircle2 } from 'lucide-react'
import SEO from '../../components/SEO'
import apiService from '../../../services/api'
import { usePlan } from '../../../hooks/usePlan'
import { PURPLE, purpleAlpha, FONT_BODY, MAX_W } from '../../theme/tokens'

const F = FONT_BODY

const STATUS_LABEL = {
  active:    { label: 'Activo', color: '#16a34a' },
  trialing:  { label: 'En prueba', color: PURPLE },
  granted:   { label: 'Otorgado', color: PURPLE },
  past_due:  { label: 'Pago pendiente', color: '#f59e0b' },
  canceled:  { label: 'Cancelado (acceso hasta fin de periodo)', color: '#f59e0b' },
  expired:   { label: 'Expirado', color: 'var(--text-muted)' },
}

function formatDate(dt) {
  if (!dt) return '—'
  try {
    return new Date(dt).toLocaleDateString('es-ES', { day: '2-digit', month: 'long', year: 'numeric' })
  } catch {
    return '—'
  }
}

export default function BillingPage() {
  const { plan, planKey, subscription, loading, error, refresh } = usePlan()
  const [busy, setBusy] = useState(null) // 'portal' | 'cancel' | null
  const [feedback, setFeedback] = useState(null)

  const status = subscription?.status || null
  const statusInfo = STATUS_LABEL[status] || { label: status || '—', color: 'var(--text-muted)' }
  const isPaidTier = plan?.tier === 'pro' || plan?.tier === 'enterprise'
  const hasStripeSub = Boolean(subscription?.stripeSubscriptionId)

  const openPortal = async () => {
    setBusy('portal'); setFeedback(null)
    try {
      const res = await apiService.openBillingPortal()
      if (res?.url) { window.location.href = res.url; return }
      throw new Error(res?.message || 'No se pudo abrir el portal')
    } catch (e) {
      setBusy(null)
      setFeedback({ kind: 'error', msg: e?.message || 'Error al abrir el portal' })
    }
  }

  const cancel = async () => {
    if (!window.confirm('¿Cancelar la suscripción al final del periodo actual? Mantendrás el acceso hasta esa fecha.')) return
    setBusy('cancel'); setFeedback(null)
    try {
      const res = await apiService.cancelSubscription()
      if (!res?.success) throw new Error(res?.message || 'No se pudo cancelar')
      setFeedback({ kind: 'success', msg: 'Cancelación programada. Mantienes el acceso hasta fin de periodo.' })
      await refresh()
    } catch (e) {
      setFeedback({ kind: 'error', msg: e?.message || 'Error al cancelar' })
    } finally {
      setBusy(null)
    }
  }

  return (
    <main
      data-testid="billing-page"
      style={{
        fontFamily: F,
        color: 'var(--text)',
        background: 'var(--bg)',
        minHeight: '100vh',
        padding: '32px 16px 80px',
      }}
    >
      <SEO title="Facturación" description="Tu plan y método de pago." path="/account/billing" type="website" noindex />

      <div style={{ maxWidth: 760, margin: '0 auto' }}>
        <h1 style={{ fontSize: 28, fontWeight: 800, letterSpacing: '-0.02em', margin: '0 0 24px' }}>
          Facturación y plan
        </h1>

        {loading && <SkeletonCard />}
        {error && (
          <div role="alert" style={{ padding: 14, borderRadius: 12, background: 'rgba(220,38,38,0.06)', color: '#dc2626', fontSize: 14 }}>
            {error}
          </div>
        )}

        {!loading && !error && plan && (
          <>
            <motion.section
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.25 }}
              style={{
                padding: 24,
                borderRadius: 18,
                background: 'var(--surface)',
                border: `1px solid ${isPaidTier ? purpleAlpha(0.25) : 'var(--border)'}`,
                marginBottom: 20,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
                <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                  Plan actual
                </span>
                <span
                  style={{
                    fontSize: 12,
                    fontWeight: 600,
                    color: statusInfo.color,
                    background: 'transparent',
                    border: `1px solid ${statusInfo.color}`,
                    padding: '2px 8px',
                    borderRadius: 999,
                  }}
                >
                  {statusInfo.label}
                </span>
              </div>
              <h2 style={{ margin: '0 0 12px', fontSize: 26, fontWeight: 700 }}>{plan.label}</h2>

              <dl style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 16, margin: 0 }}>
                {subscription?.trialEnd && status === 'trialing' && (
                  <Field term="Prueba termina" desc={formatDate(subscription.trialEnd)} />
                )}
                {subscription?.currentPeriodEnd && (
                  <Field
                    term={subscription.cancelAtPeriodEnd ? 'Acceso hasta' : 'Próxima renovación'}
                    desc={formatDate(subscription.currentPeriodEnd)}
                  />
                )}
                {subscription?.billingInterval && (
                  <Field term="Facturación" desc={subscription.billingInterval === 'annual' ? 'Anual' : 'Mensual'} />
                )}
              </dl>

              {subscription?.cancelAtPeriodEnd && (
                <div
                  role="status"
                  style={{
                    marginTop: 16,
                    padding: 12,
                    borderRadius: 10,
                    fontSize: 13,
                    background: 'rgba(245,158,11,0.08)',
                    border: '1px solid rgba(245,158,11,0.3)',
                    color: '#b45309',
                    display: 'flex',
                    gap: 8,
                    alignItems: 'flex-start',
                  }}
                >
                  <AlertCircle size={16} style={{ flexShrink: 0, marginTop: 2 }} />
                  <span>
                    Has cancelado tu suscripción. Mantienes acceso hasta el {formatDate(subscription.currentPeriodEnd)}.
                    Si cambias de idea, vuelve a suscribirte desde <Link to="/pricing" style={{ color: PURPLE, fontWeight: 600 }}>/pricing</Link>.
                  </span>
                </div>
              )}

              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginTop: 22 }}>
                {hasStripeSub && (
                  <button
                    type="button"
                    onClick={openPortal}
                    disabled={busy === 'portal'}
                    style={primaryBtn(busy === 'portal')}
                  >
                    <CreditCard size={16} style={{ marginRight: 6, verticalAlign: -3 }} />
                    {busy === 'portal' ? 'Redirigiendo…' : 'Gestionar pago / facturas'}
                  </button>
                )}
                {!isPaidTier && (
                  <Link to="/pricing" style={{ ...primaryBtn(false), textDecoration: 'none', display: 'inline-flex', alignItems: 'center' }}>
                    <Sparkles size={16} style={{ marginRight: 6 }} />
                    Mejorar a Pro
                    <ArrowRight size={14} style={{ marginLeft: 6 }} />
                  </Link>
                )}
                {hasStripeSub && !subscription?.cancelAtPeriodEnd && (
                  <button
                    type="button"
                    onClick={cancel}
                    disabled={busy === 'cancel'}
                    style={secondaryBtn(busy === 'cancel')}
                  >
                    {busy === 'cancel' ? 'Cancelando…' : 'Cancelar plan'}
                  </button>
                )}
              </div>

              {feedback && (
                <div
                  role={feedback.kind === 'error' ? 'alert' : 'status'}
                  style={{
                    marginTop: 14,
                    fontSize: 13,
                    color: feedback.kind === 'error' ? '#dc2626' : '#16a34a',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                  }}
                >
                  {feedback.kind === 'success' && <CheckCircle2 size={16} />}
                  <span>{feedback.msg}</span>
                </div>
              )}
            </motion.section>

            <section
              style={{
                padding: 20,
                borderRadius: 18,
                background: 'var(--surface)',
                border: '1px solid var(--border)',
              }}
            >
              <h3 style={{ margin: '0 0 8px', fontSize: 16, fontWeight: 700 }}>Qué incluye tu plan</h3>
              <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'grid', gap: 8 }}>
                {Object.entries(plan.features || {})
                  .filter(([, v]) => v)
                  .map(([k]) => (
                    <li key={k} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 14 }}>
                      <CheckCircle2 size={14} style={{ color: PURPLE }} />
                      <code style={{ fontSize: 13, color: 'var(--text-muted)' }}>{k}</code>
                    </li>
                  ))}
                {Object.values(plan.features || {}).every((v) => !v) && (
                  <li style={{ fontSize: 14, color: 'var(--text-muted)' }}>Plan Free — features de pago se desbloquean al subir a Pro.</li>
                )}
              </ul>
            </section>
          </>
        )}
      </div>
    </main>
  )
}

function Field({ term, desc }) {
  return (
    <div>
      <dt style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 2 }}>{term}</dt>
      <dd style={{ margin: 0, fontSize: 14, fontWeight: 600 }}>{desc}</dd>
    </div>
  )
}

function SkeletonCard() {
  return (
    <div
      style={{
        padding: 24,
        borderRadius: 18,
        background: 'var(--surface)',
        border: '1px solid var(--border)',
        height: 240,
      }}
    >
      <div style={{ height: 14, width: 100, background: 'var(--surface-2)', borderRadius: 6 }} />
      <div style={{ marginTop: 14, height: 26, width: 200, background: 'var(--surface-2)', borderRadius: 6 }} />
    </div>
  )
}

function primaryBtn(busy) {
  return {
    padding: '10px 16px',
    borderRadius: 10,
    fontSize: 14,
    fontWeight: 600,
    fontFamily: F,
    background: PURPLE,
    color: '#fff',
    border: 'none',
    cursor: busy ? 'default' : 'pointer',
    opacity: busy ? 0.7 : 1,
  }
}

function secondaryBtn(busy) {
  return {
    padding: '10px 16px',
    borderRadius: 10,
    fontSize: 14,
    fontWeight: 600,
    fontFamily: F,
    background: 'transparent',
    color: 'var(--text)',
    border: '1px solid var(--border)',
    cursor: busy ? 'default' : 'pointer',
    opacity: busy ? 0.7 : 1,
  }
}
