import React, { useState } from 'react'
import { motion } from 'framer-motion'
import { Link2, Sparkles, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react'
import { FONT_DISPLAY, FONT_BODY, GREEN, PURPLE } from '../../theme/tokens'
import { fmtFollowers } from '../../lib/channelPricing'

// ─── UrlInputCard ───────────────────────────────────────────────────────────
// Input "pega tu link" que aparece arriba del wizard. Si el análisis devuelve
// datos suficientes, dispara onAnalyzed(snapshot) — el padre rellena los
// inputs del wizard y avanza al Step 4.
//
// Casos:
//   - Telegram público → datos completos → onAnalyzed con followers + nombre.
//   - Discord invite → datos completos → onAnalyzed.
//   - Newsletter Substack → puede ser ok o partial.
//   - Newsletter Beehiiv → casi siempre partial → fallback manual.
//   - WhatsApp → backend devuelve redirect_questionnaire → onWhatsApp().
//   - Telegram privado → partial → mensaje + permitir manual.
//
// Props:
//   onAnalyzed({ platform, followers, name, description, profileImage, verified })
//   onWhatsApp() — usuario pegó un link de WhatsApp, abrir cuestionario
//   accent — color principal (GREEN landing, PURPLE blog)

export default function UrlInputCard({ onAnalyzed, onWhatsApp, accent = GREEN }) {
  const [link, setLink] = useState('')
  const [state, setState] = useState('idle') // idle | loading | success | partial | error
  const [errorMsg, setErrorMsg] = useState('')
  const [result, setResult] = useState(null)

  async function handleAnalyze(e) {
    e?.preventDefault?.()
    setErrorMsg('')
    if (!link || link.length < 6) {
      setState('error')
      setErrorMsg('Pega un link válido')
      return
    }
    setState('loading')
    try {
      const res = await fetch('/api/calculator/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ link: link.trim() }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok || !data?.success) {
        setState('error')
        setErrorMsg(data?.message || 'No hemos podido analizar el link. Sigue manualmente abajo.')
        return
      }

      // WhatsApp → derivar al cuestionario
      if (data.platform === 'whatsapp' || data.status === 'redirect_questionnaire') {
        setState('success')
        setResult(data)
        // Pequeño delay para que el usuario vea el badge antes de redirigir
        setTimeout(() => onWhatsApp?.(), 500)
        return
      }

      if (data.status === 'ok' && data.data?.subscribers) {
        setState('success')
        setResult(data)
        // Pasar snapshot al padre
        onAnalyzed?.({
          platform:     normalizePlatformId(data.platform),
          followers:    data.data.subscribers,
          name:         data.data.name || '',
          description:  data.data.description || '',
          profileImage: data.data.profileImage || '',
          verified:     !!data.data.verified,
        })
        return
      }

      if (data.status === 'partial') {
        setState('partial')
        setResult(data)
        return
      }

      if (data.status === 'not_found') {
        setState('error')
        setErrorMsg('No hemos encontrado el canal. Comprueba el link o sigue manualmente.')
        return
      }

      setState('error')
      setErrorMsg(data.message || 'Algo no salió bien. Sigue manualmente.')
    } catch {
      setState('error')
      setErrorMsg('Error de red. Inténtalo de nuevo en un momento.')
    }
  }

  return (
    <motion.form
      onSubmit={handleAnalyze}
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
      style={{
        background: `${accent}06`,
        border: `1px solid ${accent}22`,
        borderRadius: 14,
        padding: '18px 20px',
        marginBottom: 22,
        fontFamily: FONT_BODY,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
        <div style={{
          width: 30, height: 30, borderRadius: 9,
          background: `${accent}14`, color: accent,
          display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
        }}>
          <Link2 size={15} strokeWidth={2.3} />
        </div>
        <div style={{ flex: 1 }}>
          <p style={{
            margin: 0, fontSize: 14, fontWeight: 600, color: 'var(--text)', lineHeight: 1.3,
          }}>
            ¿Tienes un link de tu canal?
          </p>
          <p style={{ margin: '2px 0 0', fontSize: 12, color: 'var(--muted)' }}>
            Telegram, Discord o Newsletter — leemos los datos públicos en 2 segundos.
          </p>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <input
          type="url"
          value={link}
          onChange={(e) => { setLink(e.target.value); if (state === 'error') setState('idle') }}
          placeholder="https://t.me/tucanal · https://discord.gg/... · https://tuboletin.substack.com"
          disabled={state === 'loading'}
          style={{
            flex: 1,
            minWidth: 220,
            padding: '11px 14px',
            borderRadius: 10,
            border: `1px solid ${state === 'error' ? '#ef4444' : 'var(--border)'}`,
            background: 'var(--bg)',
            color: 'var(--text)',
            fontFamily: FONT_BODY,
            fontSize: 14,
            outline: 'none',
            boxSizing: 'border-box',
            transition: 'border-color 0.2s',
          }}
          onFocus={(e) => { if (state !== 'error') e.target.style.borderColor = accent }}
          onBlur={(e) => { e.target.style.borderColor = state === 'error' ? '#ef4444' : 'var(--border)' }}
        />
        <button
          type="submit"
          disabled={state === 'loading' || !link}
          style={{
            display: 'flex', alignItems: 'center', gap: 8,
            padding: '11px 18px', borderRadius: 10,
            background: (state === 'loading' || !link) ? 'var(--bg2)' : accent,
            color: (state === 'loading' || !link) ? 'var(--muted)' : '#fff',
            fontFamily: FONT_BODY, fontSize: 13.5, fontWeight: 600,
            border: 'none', cursor: (state === 'loading' || !link) ? 'not-allowed' : 'pointer',
            boxShadow: (state === 'loading' || !link) ? 'none' : `0 4px 10px ${accent}40`,
            transition: 'all 0.2s',
            whiteSpace: 'nowrap',
          }}
        >
          {state === 'loading' ? (
            <>
              <Loader2 size={14} strokeWidth={2.4} style={{ animation: 'spin 0.9s linear infinite' }} />
              Analizando…
            </>
          ) : (
            <>
              <Sparkles size={14} strokeWidth={2.4} />
              Analizar canal
            </>
          )}
        </button>
      </div>

      {/* Estado: éxito */}
      {state === 'success' && result && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          style={{
            marginTop: 12, padding: '10px 12px', borderRadius: 10,
            background: `${accent}10`, border: `1px solid ${accent}30`,
            display: 'flex', alignItems: 'center', gap: 10,
            fontSize: 13, color: 'var(--text)',
          }}
        >
          <CheckCircle2 size={16} style={{ color: accent, flexShrink: 0 }} strokeWidth={2.4} />
          <span style={{ flex: 1 }}>
            <strong>{result.data?.name || 'Canal analizado'}</strong>
            {result.data?.subscribers != null && (
              <>
                {' · '}<strong>{fmtFollowers(result.data.subscribers)}</strong>{' suscriptores'}
              </>
            )}
            {result.data?.verified && <span style={{ marginLeft: 6, color: accent, fontWeight: 600 }}>✓ verificado</span>}
            {result.platform === 'whatsapp' && (
              <span style={{ marginLeft: 8, color: 'var(--muted)' }}>
                · Abriendo cuestionario WhatsApp…
              </span>
            )}
          </span>
        </motion.div>
      )}

      {/* Estado: partial — datos incompletos, fallback manual */}
      {state === 'partial' && result && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          style={{
            marginTop: 12, padding: '10px 12px', borderRadius: 10,
            background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.25)',
            display: 'flex', alignItems: 'flex-start', gap: 10,
            fontSize: 13, color: 'var(--text)',
          }}
        >
          <AlertCircle size={16} style={{ color: '#f59e0b', flexShrink: 0, marginTop: 2 }} strokeWidth={2.4} />
          <span style={{ flex: 1, lineHeight: 1.5 }}>
            {result.data?.name && <><strong>{result.data.name}</strong>. </>}
            {result.message || 'Datos parciales. Completa los inputs abajo manualmente — usaremos lo que sí pudimos leer.'}
          </span>
        </motion.div>
      )}

      {/* Estado: error */}
      {state === 'error' && errorMsg && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          style={{
            marginTop: 12, padding: '10px 12px', borderRadius: 10,
            background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.22)',
            display: 'flex', alignItems: 'flex-start', gap: 10,
            fontSize: 13, color: 'var(--text)',
          }}
        >
          <AlertCircle size={16} style={{ color: '#ef4444', flexShrink: 0, marginTop: 2 }} strokeWidth={2.4} />
          <span style={{ flex: 1 }}>{errorMsg}</span>
        </motion.div>
      )}

      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}</style>
    </motion.form>
  )
}

// Mapea el `platform` que devuelve el backend al ID que usa el wizard
// (PLATFORMS en channelPricing.js: telegram | whatsapp | discord | newsletter).
function normalizePlatformId(p) {
  if (p === 'whatsapp_channel' || p === 'whatsapp_group') return 'whatsapp'
  if (p === 'telegram' || p === 'discord' || p === 'newsletter' || p === 'whatsapp') return p
  return null
}
