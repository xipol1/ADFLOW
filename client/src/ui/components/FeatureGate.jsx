/**
 * FeatureGate — declarative wrapper for soft-launch gating.
 *
 * <FeatureGate feature="whatsapp">{<TheRealPage />}</FeatureGate>
 *   renders TheRealPage if features.whatsapp is true, otherwise shows
 *   a polished "Próximamente" overlay with a notify-me CTA.
 *
 * Falls back to rendering children if /api/features fails or is loading
 * — better to show the page (and let downstream 503s handle it) than to
 * block on flag fetch.
 */
import React from 'react'
import { useNavigate } from 'react-router-dom'
import { Sparkles, ArrowLeft, Bell } from 'lucide-react'
import useFeatures from '../../hooks/useFeatures'
import { FONT_BODY, FONT_DISPLAY, PURPLE, purpleAlpha } from '../theme/tokens'

const FEATURE_COPY = {
  whatsapp: {
    title: 'WhatsApp Channels — Próximamente',
    body: 'Estamos terminando la integración con WhatsApp Business para que puedas vincular tus Canales y empezar a monetizarlos. Disponible muy pronto.',
    eta: 'ETA: junio 2026',
  },
  payments: {
    title: 'Pagos con tarjeta — Próximamente',
    body: 'Estamos validando la integración con Stripe Live para procesar pagos reales. Mientras tanto, puedes crear campañas en modo simulado.',
    eta: 'ETA: esta semana',
  },
  r2Storage: {
    title: 'Subida de archivos — Próximamente',
    body: 'Estamos terminando la configuración del almacenamiento. De momento, las campañas funcionan en modo texto plano.',
    eta: 'ETA: esta semana',
  },
  subscriptions: {
    title: 'Planes de suscripción — Próximamente',
    body: 'Los planes Pro estarán disponibles en breve. Mientras, todas las funciones core están abiertas.',
    eta: 'ETA: junio 2026',
  },
  default: {
    title: 'Próximamente',
    body: 'Esta funcionalidad estará disponible muy pronto.',
    eta: '',
  },
}

export default function FeatureGate({ feature, children, fallback }) {
  const { features, loading } = useFeatures()

  // While loading, render children optimistically — flag fetch shouldn't
  // gate UX. If the feature ends up off, the downstream 503 will surface.
  if (loading) return children

  if (features[feature]) return children
  if (fallback) return fallback

  return <ComingSoon feature={feature} />
}

export function ComingSoon({ feature }) {
  const navigate = useNavigate()
  const copy = FEATURE_COPY[feature] || FEATURE_COPY.default

  return (
    <div style={{
      maxWidth: 560, margin: '60px auto', padding: '0 24px',
      fontFamily: FONT_BODY, textAlign: 'center',
    }}>
      <div style={{
        background: 'var(--surface)', border: '1px solid var(--border)',
        borderRadius: 20, padding: '40px 32px',
        boxShadow: '0 12px 48px rgba(13,17,23,0.08)',
      }}>
        <div style={{
          width: 64, height: 64, borderRadius: 16,
          background: `linear-gradient(135deg, ${purpleAlpha(0.16)} 0%, ${purpleAlpha(0.04)} 100%)`,
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
          marginBottom: 20,
        }}>
          <Sparkles size={28} style={{ color: PURPLE }} />
        </div>

        <h1 style={{
          margin: 0, fontSize: 24, fontWeight: 700,
          color: 'var(--text)', fontFamily: FONT_DISPLAY,
          letterSpacing: '-0.02em',
        }}>{copy.title}</h1>

        <p style={{
          marginTop: 12, marginBottom: 0, fontSize: 15,
          color: 'var(--muted)', lineHeight: 1.55,
        }}>{copy.body}</p>

        {copy.eta && (
          <div style={{
            marginTop: 18, display: 'inline-block',
            padding: '5px 12px', borderRadius: 999,
            background: purpleAlpha(0.10),
            color: PURPLE, fontSize: 12, fontWeight: 600,
            letterSpacing: '0.04em',
          }}>{copy.eta}</div>
        )}

        <div style={{ marginTop: 28, display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap' }}>
          <button
            onClick={() => navigate(-1)}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 6,
              background: 'transparent', color: 'var(--muted)',
              border: '1px solid var(--border)', borderRadius: 10,
              padding: '10px 18px', fontSize: 13, fontWeight: 600,
              cursor: 'pointer', fontFamily: FONT_BODY,
            }}
          >
            <ArrowLeft size={14} /> Volver
          </button>
          <a
            href="mailto:contact@channelad.io?subject=Avísame%20cuando%20esté%20disponible"
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 6,
              background: PURPLE, color: '#fff',
              border: 'none', borderRadius: 10,
              padding: '10px 18px', fontSize: 13, fontWeight: 600,
              cursor: 'pointer', textDecoration: 'none',
              fontFamily: FONT_BODY,
            }}
          >
            <Bell size={14} /> Avisarme cuando esté
          </a>
        </div>
      </div>
    </div>
  )
}
