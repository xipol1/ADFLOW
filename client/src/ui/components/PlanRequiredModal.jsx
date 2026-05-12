import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { Sparkles, X } from 'lucide-react'
import apiService from '../../services/api'
import { PURPLE, purpleAlpha, FONT_BODY } from '../theme/tokens'

const F = FONT_BODY

/**
 * Modal shown when an API call returns 402 PLAN_REQUIRED. Reads the error
 * payload's `feature` + `suggestedPlan` to render a contextual upsell.
 *
 * Usage:
 *   const [gate, setGate] = useState(null)
 *   try { ... } catch (e) {
 *     if (e?.code === 'PLAN_REQUIRED') setGate(e)
 *   }
 *   return <PlanRequiredModal payload={gate} onClose={() => setGate(null)} />
 *
 * The component is self-contained: clicking "Probar 14 días gratis"
 * fires a Stripe Checkout session and redirects. Clicking outside, the X,
 * or "Mantener Free" closes it.
 */

const FEATURE_COPY = {
  bulkLauncher: {
    title: 'Bulk Launcher es una función de Advertiser Pro',
    body: 'Lanza campañas en múltiples canales a la vez, con presupuesto y categoría. Pro también baja tu comisión del 20% al 15%.',
  },
  lookalike: {
    title: 'Canales similares — Pro',
    body: 'Encuentra canales parecidos a los que ya te funcionan según audiencia, nicho y engagement.',
  },
  nicheHeatmap: {
    title: 'Heatmap de nichos — Pro',
    body: 'Visualiza qué nichos rinden mejor para tu inversión por hora, día y plataforma.',
  },
  audienceInsights: {
    title: 'Audience Insights — Pro',
    body: 'Demografía, comportamiento e intereses agregados de la audiencia de cada canal.',
  },
  abTestLab: {
    title: 'A/B Test Lab — Pro',
    body: 'Compara variantes de copy y creatividad con significancia estadística.',
  },
  forecastRoi: {
    title: 'Forecast ROI — Pro',
    body: 'Estima ROAS y conversiones esperadas antes de invertir.',
  },
  realtimeMonitor: {
    title: 'Monitor en tiempo real — Pro',
    body: 'Sigue clicks, conversiones y ROI minuto a minuto en cada campaña.',
  },
  multiTouchAttribution: {
    title: 'Atribución multi-touch — Pro',
    body: 'Modelos linear y time-decay con ventana de 90 días. Free queda fijo en last_touch con ventana 7d.',
  },
  outgoingWebhooks: {
    title: 'Webhooks salientes — Pro',
    body: 'Recibe eventos de conversión y campaña en tus sistemas.',
  },
  advancedAnalytics: {
    title: 'Analytics avanzados — Creator Pro',
    body: 'Cohort de audiencia, benchmark contra competidores y overlap entre tus canales.',
  },
  apiAccess: {
    title: 'API personal — Creator Pro',
    body: 'Export CSV/JSON y webhooks de eventos de canal para tus dashboards.',
  },
  customSlug: {
    title: 'URL personalizada — Creator Pro',
    body: 'channelad.io/c/tunombre en lugar del slug generado.',
  },
}

function fallbackCopy(feature, planLabel) {
  return {
    title: `Esta función requiere ${planLabel || 'un plan superior'}`,
    body: 'Mejora tu plan para desbloquearla. Cancela cuando quieras, sin permanencia.',
  }
}

const PLAN_LABEL = {
  creator_pro: 'Creator Pro',
  advertiser_pro: 'Advertiser Pro',
  creator_enterprise: 'Creator Enterprise',
  advertiser_enterprise: 'Advertiser Enterprise',
}

export default function PlanRequiredModal({ payload, onClose }) {
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()

  if (!payload) return null
  const feature = payload.feature || ''
  const suggestedPlan = payload.suggestedPlan || null
  const planLabel = PLAN_LABEL[suggestedPlan] || 'Pro'
  const copy = FEATURE_COPY[feature] || fallbackCopy(feature, planLabel)

  const startCheckout = async () => {
    if (!suggestedPlan) {
      navigate('/pricing')
      onClose?.()
      return
    }
    setLoading(true)
    try {
      const res = await apiService.createCheckoutSession(suggestedPlan, 'monthly')
      if (res?.url) {
        window.location.href = res.url
        return
      }
      throw new Error(res?.message || 'No se pudo iniciar el checkout')
    } catch (e) {
      setLoading(false)
      // Fall back to /pricing so the user still has a path forward.
      navigate('/pricing')
      onClose?.()
    }
  }

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.15 }}
        onClick={onClose}
        role="dialog"
        aria-modal="true"
        aria-labelledby="plan-required-title"
        style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0,0,0,0.55)',
          backdropFilter: 'blur(4px)',
          zIndex: 9999,
          display: 'grid',
          placeItems: 'center',
          padding: 16,
          fontFamily: F,
        }}
      >
        <motion.div
          initial={{ opacity: 0, y: 16, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 8 }}
          transition={{ duration: 0.18 }}
          onClick={(e) => e.stopPropagation()}
          style={{
            background: 'var(--surface)',
            borderRadius: 20,
            border: `1px solid ${purpleAlpha(0.3)}`,
            boxShadow: `0 20px 80px ${purpleAlpha(0.25)}`,
            maxWidth: 460,
            width: '100%',
            padding: 28,
            position: 'relative',
            color: 'var(--text)',
          }}
        >
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar"
            style={{
              position: 'absolute',
              top: 14,
              right: 14,
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              color: 'var(--text-muted)',
              padding: 4,
              borderRadius: 8,
            }}
          >
            <X size={18} />
          </button>

          <div
            style={{
              width: 44,
              height: 44,
              borderRadius: 12,
              background: purpleAlpha(0.12),
              display: 'grid',
              placeItems: 'center',
              marginBottom: 14,
            }}
          >
            <Sparkles size={22} style={{ color: PURPLE }} />
          </div>

          <h3 id="plan-required-title" style={{ margin: '0 0 8px', fontSize: 20, fontWeight: 700 }}>
            {copy.title}
          </h3>
          <p style={{ margin: '0 0 18px', fontSize: 14, color: 'var(--text-muted)', lineHeight: 1.55 }}>
            {copy.body}
          </p>

          <div
            style={{
              padding: 14,
              borderRadius: 12,
              background: 'var(--surface-2)',
              border: '1px solid var(--border)',
              fontSize: 13,
              color: 'var(--text-muted)',
              marginBottom: 18,
            }}
          >
            14 días gratis · sin tarjeta · cancela cuando quieras.
          </div>

          <div style={{ display: 'flex', gap: 10 }}>
            <button
              type="button"
              onClick={startCheckout}
              disabled={loading}
              style={{
                flex: 1,
                padding: '12px 18px',
                borderRadius: 12,
                fontSize: 14,
                fontWeight: 600,
                fontFamily: F,
                cursor: loading ? 'default' : 'pointer',
                background: PURPLE,
                color: '#fff',
                border: 'none',
                opacity: loading ? 0.7 : 1,
              }}
            >
              {loading ? 'Redirigiendo…' : `Probar ${planLabel}`}
            </button>
            <button
              type="button"
              onClick={() => { navigate('/pricing'); onClose?.() }}
              style={{
                padding: '12px 18px',
                borderRadius: 12,
                fontSize: 14,
                fontWeight: 600,
                fontFamily: F,
                cursor: 'pointer',
                background: 'transparent',
                color: 'var(--text)',
                border: '1px solid var(--border)',
              }}
            >
              Ver planes
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}
