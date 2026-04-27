import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Zap, Search, Radio, Wallet, CheckCircle, ArrowRight,
  ArrowLeft, X, Megaphone, BarChart3, Users, Inbox,
} from 'lucide-react'
import { PURPLE, purpleAlpha, GREEN, greenAlpha, FONT_BODY, FONT_DISPLAY } from '../theme/tokens'

// ── Step definitions per role ─────────────────────────────────────────────────
const STEPS = {
  advertiser: [
    {
      title: 'Bienvenido a ChannelAd',
      desc: 'La plataforma premium para comprar espacios publicitarios en comunidades reales de WhatsApp, Telegram, Discord y mas.',
      icon: Zap,
      tip: 'Conecta con audiencias activas y verificadas',
    },
    {
      title: 'Explora canales',
      desc: 'Busca entre miles de canales verificados por plataforma, categoria, audiencia y precio. Filtra y compara para encontrar el match perfecto.',
      icon: Search,
      tip: 'Usa filtros avanzados para resultados precisos',
      action: { label: 'Ir a Explorar', path: '/advertiser/explore' },
    },
    {
      title: 'Crea tu primera campana',
      desc: 'Puedes comprar manualmente o usar Auto-Buy para que el algoritmo seleccione los mejores canales dentro de tu presupuesto.',
      icon: Megaphone,
      tip: 'Auto-Buy optimiza tu inversion automaticamente',
      action: { label: 'Probar Auto-Buy', path: '/advertiser/autobuy' },
    },
    {
      title: 'Gestiona y mide',
      desc: 'Monitorea tus campanas en tiempo real: impresiones, clicks, CTR. Gestiona pagos con escrow seguro y resuelve disputas si es necesario.',
      icon: BarChart3,
      tip: 'Dashboard con metricas en tiempo real',
    },
    {
      title: 'Listo para empezar',
      desc: 'Tu cuenta esta configurada. Explora el marketplace y lanza tu primera campana. Estamos aqui para ayudarte.',
      icon: CheckCircle,
      tip: 'Usa Cmd+K para navegar rapidamente',
    },
  ],
  creator: [
    {
      title: 'Bienvenido a ChannelAd',
      desc: 'Monetiza tus canales de comunicacion. Recibe solicitudes de anunciantes, publica contenido patrocinado y cobra de forma segura.',
      icon: Zap,
      tip: 'Tus audiencias tienen valor real',
    },
    {
      title: 'Registra tus canales',
      desc: 'Anade tus canales de WhatsApp, Telegram, Discord, Instagram u otras plataformas. Define precios, categorias y disponibilidad.',
      icon: Radio,
      tip: 'Mas canales = mas oportunidades de ingreso',
      action: { label: 'Registrar canal', path: '/creator/channels/new' },
    },
    {
      title: 'Recibe solicitudes',
      desc: 'Los anunciantes te enviaran propuestas con presupuesto y contenido. Acepta, negocia o rechaza desde tu bandeja de solicitudes.',
      icon: Inbox,
      tip: 'Revisa cada solicitud antes de aceptar',
    },
    {
      title: 'Cobra de forma segura',
      desc: 'Todos los pagos pasan por escrow. El dinero se libera cuando confirmas la publicacion. Solicita retiros a tu cuenta bancaria.',
      icon: Wallet,
      tip: 'Escrow protege a ambas partes',
    },
    {
      title: 'Listo para monetizar',
      desc: 'Tu cuenta esta activa. Registra tu primer canal y empieza a recibir propuestas de anunciantes.',
      icon: CheckCircle,
      tip: 'Usa Cmd+K para navegar rapidamente',
    },
  ],
}

function getStorageKey(role) {
  return `channelad-onboarding-${role}-done`
}

/**
 * OnboardingWizard — Full-screen onboarding modal for new users.
 *
 * Props:
 *   role     — 'advertiser' | 'creator'
 *   onClose  — callback when wizard is dismissed
 */
export default function OnboardingWizard({ role = 'advertiser', onClose }) {
  const [step, setStep] = useState(0)
  const navigate = useNavigate()

  const steps = STEPS[role] || STEPS.advertiser
  const accent = role === 'creator' ? GREEN : PURPLE
  const alpha = role === 'creator' ? greenAlpha : purpleAlpha
  const current = steps[step]
  const isLast = step === steps.length - 1
  const Icon = current.icon

  const handleFinish = () => {
    localStorage.setItem(getStorageKey(role), 'true')
    onClose?.()
  }

  const handleSkip = () => {
    localStorage.setItem(getStorageKey(role), 'true')
    onClose?.()
  }

  const handleAction = () => {
    if (current.action?.path) {
      handleFinish()
      navigate(current.action.path)
    }
  }

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 10000,
      background: 'rgba(0,0,0,0.7)',
      backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: '20px',
      animation: '_ob_fadeIn 200ms ease forwards',
    }}>
      <style>{`
        @keyframes _ob_fadeIn { from { opacity:0; } to { opacity:1; } }
        @keyframes _ob_slideIn { from { opacity:0; transform:translateY(20px) scale(0.96); } to { opacity:1; transform:none; } }
      `}</style>

      <div style={{
        width: '100%', maxWidth: '520px',
        background: 'var(--surface)',
        borderRadius: '24px',
        overflow: 'hidden',
        boxShadow: '0 40px 100px rgba(0,0,0,0.5)',
        animation: '_ob_slideIn 300ms ease forwards',
      }}>
        {/* Progress bar */}
        <div style={{ height: '3px', background: 'var(--border)' }}>
          <div style={{
            height: '100%',
            width: `${((step + 1) / steps.length) * 100}%`,
            background: `linear-gradient(90deg, ${accent} 0%, ${role === 'creator' ? '#1ea952' : '#7c3aed'} 100%)`,
            borderRadius: '0 2px 2px 0',
            transition: 'width .3s ease',
          }} />
        </div>

        {/* Skip button */}
        <div style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          padding: '16px 24px 0',
        }}>
          <span style={{
            fontSize: '11px', fontWeight: 600, color: 'var(--muted)',
            fontFamily: FONT_BODY, letterSpacing: '0.03em',
          }}>
            Paso {step + 1} de {steps.length}
          </span>
          <button onClick={handleSkip} style={{
            background: 'none', border: 'none', cursor: 'pointer',
            color: 'var(--muted)', fontSize: '12px', fontWeight: 500,
            fontFamily: FONT_BODY, display: 'flex', alignItems: 'center', gap: '4px',
            transition: 'color .15s',
          }}
            onMouseEnter={e => { e.currentTarget.style.color = 'var(--text)' }}
            onMouseLeave={e => { e.currentTarget.style.color = 'var(--muted)' }}
          >
            Saltar <X size={14} />
          </button>
        </div>

        {/* Content */}
        <div style={{ padding: '32px 32px 24px', textAlign: 'center' }}>
          {/* Icon */}
          <div style={{
            width: '72px', height: '72px', borderRadius: '22px',
            background: alpha(0.1),
            border: `1.5px solid ${alpha(0.2)}`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 24px',
          }}>
            <Icon size={32} color={accent} strokeWidth={1.5} />
          </div>

          {/* Title */}
          <h2 style={{
            fontFamily: FONT_DISPLAY, fontSize: '22px', fontWeight: 800,
            color: 'var(--text)', marginBottom: '12px',
            letterSpacing: '-0.02em',
          }}>
            {current.title}
          </h2>

          {/* Description */}
          <p style={{
            fontFamily: FONT_BODY, fontSize: '14px', color: 'var(--muted)',
            lineHeight: 1.65, maxWidth: '380px', margin: '0 auto 20px',
          }}>
            {current.desc}
          </p>

          {/* Tip badge */}
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: '6px',
            background: alpha(0.06),
            border: `1px solid ${alpha(0.15)}`,
            borderRadius: '20px', padding: '6px 14px',
            fontSize: '12px', color: accent, fontWeight: 500,
            fontFamily: FONT_BODY,
          }}>
            <Zap size={12} strokeWidth={2.5} />
            {current.tip}
          </div>

          {/* Action button (if step has one) */}
          {current.action && (
            <div style={{ marginTop: '20px' }}>
              <button onClick={handleAction} style={{
                background: 'transparent',
                border: `1px solid ${alpha(0.3)}`,
                borderRadius: '10px', padding: '9px 20px',
                fontSize: '13px', fontWeight: 600, color: accent,
                fontFamily: FONT_BODY, cursor: 'pointer',
                transition: 'all .15s',
              }}
                onMouseEnter={e => { e.currentTarget.style.background = alpha(0.08); e.currentTarget.style.borderColor = alpha(0.5) }}
                onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.borderColor = alpha(0.3) }}
              >
                {current.action.label} →
              </button>
            </div>
          )}
        </div>

        {/* Navigation */}
        <div style={{
          padding: '16px 24px 24px',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          gap: '12px',
        }}>
          {/* Back */}
          <button
            onClick={() => setStep(s => s - 1)}
            disabled={step === 0}
            style={{
              display: 'flex', alignItems: 'center', gap: '6px',
              background: 'transparent', border: '1px solid var(--border)',
              borderRadius: '10px', padding: '10px 18px',
              fontSize: '13px', fontWeight: 500, color: 'var(--muted)',
              fontFamily: FONT_BODY, cursor: step === 0 ? 'not-allowed' : 'pointer',
              opacity: step === 0 ? 0.3 : 1,
              transition: 'all .15s',
            }}
            onMouseEnter={e => { if (step > 0) { e.currentTarget.style.borderColor = 'var(--border-med)'; e.currentTarget.style.color = 'var(--text)' } }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.color = 'var(--muted)' }}
          >
            <ArrowLeft size={14} /> Anterior
          </button>

          {/* Step dots */}
          <div style={{ display: 'flex', gap: '6px' }}>
            {steps.map((_, i) => (
              <div key={i} style={{
                width: i === step ? '20px' : '6px',
                height: '6px',
                borderRadius: '3px',
                background: i === step ? accent : i < step ? alpha(0.4) : 'var(--border)',
                transition: 'all .2s ease',
              }} />
            ))}
          </div>

          {/* Next / Finish */}
          <button
            onClick={isLast ? handleFinish : () => setStep(s => s + 1)}
            style={{
              display: 'flex', alignItems: 'center', gap: '6px',
              background: accent, color: '#fff', border: 'none',
              borderRadius: '10px', padding: '10px 22px',
              fontSize: '13px', fontWeight: 600,
              fontFamily: FONT_BODY, cursor: 'pointer',
              boxShadow: `0 4px 16px ${alpha(0.35)}`,
              transition: 'transform .15s, box-shadow .15s',
            }}
            onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.boxShadow = `0 8px 24px ${alpha(0.45)}` }}
            onMouseLeave={e => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = `0 4px 16px ${alpha(0.35)}` }}
          >
            {isLast ? 'Empezar' : 'Siguiente'} {isLast ? <CheckCircle size={14} /> : <ArrowRight size={14} />}
          </button>
        </div>
      </div>
    </div>
  )
}

/** Helper to check if onboarding should show */
export function shouldShowOnboarding(role) {
  return !localStorage.getItem(getStorageKey(role))
}
