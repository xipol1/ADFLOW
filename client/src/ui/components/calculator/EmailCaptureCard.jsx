import React, { useState } from 'react'
import { motion } from 'framer-motion'
import { Mail, CheckCircle2, AlertCircle, ArrowRight, FileText, BarChart3, Mailbox } from 'lucide-react'
import { FONT_DISPLAY, FONT_BODY, GREEN, PURPLE, greenAlpha, purpleAlpha } from '../../theme/tokens'

// Texto literal del consentimiento — se guarda tal cual en CalculatorLead
// para auditoría GDPR. Si cambia, los nuevos leads guardan el nuevo texto;
// los antiguos conservan el que aceptaron.
const CONSENT_TEXT = 'Acepto recibir el análisis de mi canal por email y comunicaciones puntuales sobre Channelad. Puedo darme de baja en cualquier momento.'

const EMAIL_RX = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/
const POPULAR_TYPO_DOMAINS = {
  'gmial.com': 'gmail.com',
  'gmai.com': 'gmail.com',
  'gnail.com': 'gmail.com',
  'hotnail.com': 'hotmail.com',
  'hotmial.com': 'hotmail.com',
  'yhaoo.com': 'yahoo.com',
  'outloo.com': 'outlook.com',
}

function suggestEmailTypo(email) {
  const [local, domain] = (email || '').split('@')
  if (!local || !domain) return null
  const suggested = POPULAR_TYPO_DOMAINS[domain.toLowerCase()]
  return suggested ? `${local}@${suggested}` : null
}

// ─── Componente principal ───────────────────────────────────────────────────
// Bloque que se muestra al final del Step 4 (resultado) de cada wizard. Pide
// el email a cambio de enviar el reporte completo + benchmark.
//
// Props:
//   snapshot     — objeto con los inputs y outputs del cálculo. Se envía al
//                  backend para reproducir el reporte aunque la fórmula cambie.
//   source       — 'calculator' | 'calculator_whatsapp' | 'blog_calculator'
//   accent       — color principal del bloque (default GREEN para landing,
//                  pasar PURPLE para variant=blog).
export default function EmailCaptureCard({ snapshot, source = 'calculator', accent = GREEN }) {
  const [email, setEmail] = useState('')
  const [consent, setConsent] = useState(false)
  const [state, setState] = useState('idle') // idle | loading | success | error
  const [errorMsg, setErrorMsg] = useState('')
  const [suggestion, setSuggestion] = useState(null)

  function onEmailChange(value) {
    setEmail(value)
    if (state === 'error') setState('idle')
    setSuggestion(suggestEmailTypo(value))
  }

  async function handleSubmit(e) {
    e?.preventDefault?.()
    setErrorMsg('')

    if (!EMAIL_RX.test(email)) {
      setState('error')
      setErrorMsg('Introduce un email válido')
      return
    }
    if (!consent) {
      setState('error')
      setErrorMsg('Tienes que aceptar el consentimiento para enviarte el reporte')
      return
    }

    setState('loading')
    try {
      const utm = readUtmFromUrl()
      const res = await fetch('/api/calculator/lead', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: email.trim(),
          consent: true,
          consentText: CONSENT_TEXT,
          snapshot,
          source,
          utm,
          referrer: document.referrer || '',
          locale: navigator.language || '',
        }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok || !data?.success) {
        setState('error')
        setErrorMsg(data?.message || 'No hemos podido guardar tu email. Inténtalo en un minuto.')
        return
      }
      setState('success')
    } catch (err) {
      setState('error')
      setErrorMsg('Error de red. Vuelve a intentarlo.')
    }
  }

  // ── Render estado: éxito ──
  if (state === 'success') {
    return (
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35 }}
        style={{
          background: `${accent}10`,
          border: `1px solid ${accent}40`,
          borderRadius: 14,
          padding: '20px 22px',
          marginTop: 24,
          fontFamily: FONT_BODY,
          display: 'flex',
          gap: 14,
          alignItems: 'flex-start',
        }}
      >
        <div style={{
          width: 36, height: 36, borderRadius: 10,
          background: `${accent}20`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          flexShrink: 0, color: accent,
        }}>
          <CheckCircle2 size={20} strokeWidth={2.2} />
        </div>
        <div style={{ flex: 1 }}>
          <p style={{ margin: 0, fontSize: 15, fontWeight: 600, color: 'var(--text)' }}>
            Análisis enviado
          </p>
          <p style={{ margin: '6px 0 0', fontSize: 13, color: 'var(--muted)', lineHeight: 1.55 }}>
            Revisa tu bandeja en <strong style={{ color: 'var(--text)' }}>{email}</strong> en los próximos 5 minutos. Si no lo ves, mira la carpeta de spam.
          </p>
        </div>
      </motion.div>
    )
  }

  // ── Render estado: form (idle / loading / error) ──
  return (
    <motion.form
      onSubmit={handleSubmit}
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.1 }}
      style={{
        background: 'var(--surface)',
        border: `1px solid var(--border)`,
        borderRadius: 16,
        padding: '24px 26px',
        marginTop: 26,
        fontFamily: FONT_BODY,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
        <div style={{
          width: 36, height: 36, borderRadius: 10,
          background: `${accent}14`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          flexShrink: 0, color: accent,
        }}>
          <Mail size={18} strokeWidth={2.2} />
        </div>
        <h4 style={{
          fontFamily: FONT_DISPLAY, fontSize: 17, fontWeight: 700,
          margin: 0, letterSpacing: '-0.01em', color: 'var(--text)',
        }}>
          Recibe el análisis detallado por email
        </h4>
      </div>

      <ul style={{
        listStyle: 'none', padding: 0, margin: '0 0 18px',
        display: 'grid', gap: 8,
      }}>
        <BenefitRow Icon={FileText} accent={accent}>Resumen con tarifas por formato y comparativa de tu nicho</BenefitRow>
        <BenefitRow Icon={BarChart3} accent={accent}>Benchmark frente a +2.500 canales en seguimiento propio</BenefitRow>
        <BenefitRow Icon={Mailbox} accent={accent}>Recordatorio de las plazas del founding cohort cuando se acerquen al cierre</BenefitRow>
      </ul>

      {/* Input email */}
      <div style={{ marginBottom: 12 }}>
        <input
          type="email"
          value={email}
          onChange={(e) => onEmailChange(e.target.value)}
          placeholder="tu@email.com"
          disabled={state === 'loading'}
          autoComplete="email"
          required
          style={{
            width: '100%',
            padding: '13px 16px',
            borderRadius: 11,
            border: `1px solid ${state === 'error' ? '#ef4444' : 'var(--border)'}`,
            background: 'var(--bg)',
            color: 'var(--text)',
            fontFamily: FONT_BODY,
            fontSize: 15,
            outline: 'none',
            boxSizing: 'border-box',
            transition: 'border-color 0.2s',
          }}
          onFocus={(e) => { if (state !== 'error') e.target.style.borderColor = accent }}
          onBlur={(e) => { e.target.style.borderColor = state === 'error' ? '#ef4444' : 'var(--border)' }}
        />
        {suggestion && (
          <p style={{ fontSize: 12, color: 'var(--muted)', margin: '8px 0 0' }}>
            ¿Quisiste decir{' '}
            <button
              type="button"
              onClick={() => { setEmail(suggestion); setSuggestion(null) }}
              style={{
                background: 'none', border: 'none', color: accent,
                fontWeight: 600, cursor: 'pointer', padding: 0, fontSize: 12,
                fontFamily: FONT_BODY,
              }}
            >{suggestion}</button>?
          </p>
        )}
      </div>

      {/* Consent */}
      <label style={{
        display: 'flex', alignItems: 'flex-start', gap: 10,
        marginBottom: 14, cursor: 'pointer', userSelect: 'none',
      }}>
        <input
          type="checkbox"
          checked={consent}
          onChange={(e) => setConsent(e.target.checked)}
          disabled={state === 'loading'}
          style={{
            marginTop: 3, accentColor: accent, cursor: 'pointer',
            flexShrink: 0, width: 16, height: 16,
          }}
        />
        <span style={{ fontSize: 12.5, color: 'var(--muted)', lineHeight: 1.55 }}>
          {CONSENT_TEXT}{' '}
          <a
            href="/privacidad"
            target="_blank"
            rel="noopener"
            style={{ color: accent, textDecoration: 'none', fontWeight: 600 }}
          >
            Política de privacidad ↗
          </a>
        </span>
      </label>

      {state === 'error' && errorMsg && (
        <div style={{
          display: 'flex', alignItems: 'flex-start', gap: 8,
          padding: '10px 12px', borderRadius: 10,
          background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.22)',
          marginBottom: 12,
        }}>
          <AlertCircle size={14} style={{ color: '#ef4444', flexShrink: 0, marginTop: 2 }} strokeWidth={2.2} />
          <span style={{ fontSize: 13, color: 'var(--text)' }}>{errorMsg}</span>
        </div>
      )}

      <button
        type="submit"
        disabled={state === 'loading' || !email || !consent}
        style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
          width: '100%', padding: '13px 22px', borderRadius: 11,
          background: (state === 'loading' || !email || !consent) ? 'var(--bg2)' : accent,
          color: (state === 'loading' || !email || !consent) ? 'var(--muted)' : '#fff',
          fontFamily: FONT_BODY,
          fontSize: 14.5, fontWeight: 600,
          border: 'none',
          cursor: (state === 'loading' || !email || !consent) ? 'not-allowed' : 'pointer',
          boxShadow: (state === 'loading' || !email || !consent) ? 'none' : `0 6px 16px ${accent}48`,
          transition: 'all 0.2s',
        }}
      >
        {state === 'loading' ? 'Enviando…' : 'Enviarme el análisis'}
        {state !== 'loading' && <ArrowRight size={14} strokeWidth={2.4} />}
      </button>

      <p style={{
        fontSize: 11, color: 'var(--muted)', textAlign: 'center',
        margin: '12px 0 0', lineHeight: 1.5,
      }}>
        No compartimos tu email con terceros. Baja en cualquier momento desde el propio email.
      </p>
    </motion.form>
  )
}

function BenefitRow({ Icon, accent, children }) {
  return (
    <li style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
      <div style={{
        width: 22, height: 22, borderRadius: 6,
        background: `${accent}14`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        flexShrink: 0, marginTop: 2, color: accent,
      }}>
        <Icon size={12} strokeWidth={2.4} />
      </div>
      <span style={{ fontSize: 13.5, color: 'var(--text)', lineHeight: 1.5 }}>
        {children}
      </span>
    </li>
  )
}

// ─── Helper: leer parámetros UTM de la URL actual ───────────────────────────
function readUtmFromUrl() {
  try {
    const params = new URLSearchParams(window.location.search)
    return {
      source:   params.get('utm_source')   || '',
      medium:   params.get('utm_medium')   || '',
      campaign: params.get('utm_campaign') || '',
      term:     params.get('utm_term')     || '',
      content:  params.get('utm_content')  || '',
    }
  } catch {
    return {}
  }
}
