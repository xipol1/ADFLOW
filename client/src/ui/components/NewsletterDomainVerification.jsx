import React, { useState } from 'react'
import { Globe, Mail, CheckCircle, AlertCircle, Copy, RefreshCw } from 'lucide-react'
import apiService from '../../services/api'
import { FONT_BODY as F } from '../theme/tokens'

/**
 * Newsletter Domain Verification UI
 *
 * Surfaces the Phase 4 proof-of-domain protocol so newsletter channels
 * can be promoted from verificado:false (API-key-only) to verificado:true
 * (admin_directo, confianzaScore ≥ 80).
 *
 * Two flows:
 *   - DNS: user adds a TXT record, we poll dns-check until match
 *   - Email: we send a signed link to admin@/postmaster@<domain>
 *
 * The component is self-contained — it owns its own state machine and
 * only takes a `channelId` plus an `onVerified` callback so the parent
 * can refresh the canal.
 */

const inp = {
  width: '100%', boxSizing: 'border-box', background: 'var(--bg)',
  border: '1px solid var(--border)', borderRadius: '10px',
  padding: '10px 14px', fontSize: '14px', color: 'var(--text)',
  fontFamily: F, outline: 'none',
}

const btn = (variant = 'primary') => ({
  display: 'inline-flex', alignItems: 'center', gap: 6,
  background: variant === 'primary' ? 'var(--accent)' : 'transparent',
  color: variant === 'primary' ? 'var(--bg)' : 'var(--text)',
  border: variant === 'primary' ? 'none' : '1px solid var(--border)',
  borderRadius: 10, padding: '10px 16px',
  fontSize: 13, fontWeight: 600, cursor: 'pointer',
  fontFamily: F, transition: 'opacity .15s',
})

const ALLOWED_MAILBOXES = ['admin', 'postmaster', 'webmaster', 'hostmaster']

export default function NewsletterDomainVerification({ channelId, alreadyVerified, onVerified }) {
  // step: 'idle' | 'started' | 'verified' | 'failed'
  const [step, setStep] = useState(alreadyVerified ? 'verified' : 'idle')
  const [method, setMethod] = useState('dns')
  const [domain, setDomain] = useState('')
  const [mailbox, setMailbox] = useState('admin')
  const [challenge, setChallenge] = useState(null) // { txtRecord, expiresAt }
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState(null) // { ok, text, code }

  const reset = () => {
    setChallenge(null)
    setMsg(null)
    setStep('idle')
  }

  const handleStart = async () => {
    setBusy(true)
    setMsg(null)
    try {
      const res = await apiService.startNewsletterDomainChallenge(channelId, { domain, method })
      if (res?.success) {
        setChallenge(res.data)
        setStep('started')
      } else {
        setMsg({ ok: false, text: res?.message || 'Error al iniciar el reto', code: res?.code })
      }
    } catch (err) {
      setMsg({ ok: false, text: err.message || 'Error de red' })
    } finally {
      setBusy(false)
    }
  }

  const handleDnsCheck = async () => {
    setBusy(true)
    setMsg(null)
    try {
      const res = await apiService.checkNewsletterDomainDns(channelId)
      const data = res?.data || {}
      if (data.ok) {
        setStep('verified')
        setMsg({ ok: true, text: '¡Dominio verificado! Tu canal pasó a verificado.' })
        onVerified && onVerified()
      } else {
        // TOKEN_MISMATCH is expected during DNS propagation — don't treat as error.
        const friendly = {
          TOKEN_MISMATCH: 'Aún no se detecta el TXT. DNS puede tardar minutos u horas en propagar. Reintenta.',
          NO_TXT_RECORDS: 'El dominio no tiene registros TXT visibles todavía.',
          DNS_ERROR: 'No se pudo resolver el dominio.',
          EXPIRED: 'El reto expiró. Empieza de nuevo.',
        }[data.code] || data.message
        setMsg({ ok: false, text: friendly, code: data.code })
      }
    } catch (err) {
      setMsg({ ok: false, text: err.message || 'Error de red' })
    } finally {
      setBusy(false)
    }
  }

  const handleSendEmail = async () => {
    setBusy(true)
    setMsg(null)
    try {
      const res = await apiService.sendNewsletterDomainEmail(channelId, mailbox)
      if (res?.success) {
        setMsg({
          ok: true,
          text: `Enviamos un enlace a ${res.data?.sentTo}. Ábrelo desde el buzón del dominio para completar la verificación.`,
        })
      } else {
        setMsg({ ok: false, text: res?.message || 'Error al enviar el correo' })
      }
    } catch (err) {
      setMsg({ ok: false, text: err.message || 'Error de red' })
    } finally {
      setBusy(false)
    }
  }

  const copyToClipboard = (txt) => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(txt).then(() => {
        setMsg({ ok: true, text: 'Copiado al portapapeles' })
      })
    }
  }

  // ── Already verified state ─────────────────────────────────────────────
  if (step === 'verified') {
    return (
      <div style={{
        padding: '12px 16px', borderRadius: 10, marginTop: 16,
        background: '#10b98112', border: '1px solid #10b98133',
        display: 'flex', alignItems: 'center', gap: 10,
      }}>
        <CheckCircle size={18} color="#10b981" />
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: '#10b981' }}>
            Dominio verificado
          </div>
          {msg?.ok && (
            <div style={{ fontSize: 12, color: 'var(--muted2)', marginTop: 2 }}>{msg.text}</div>
          )}
        </div>
      </div>
    )
  }

  // ── Verification panel ─────────────────────────────────────────────────
  return (
    <div style={{
      background: 'var(--bg)', border: '1px solid var(--border)',
      borderRadius: 12, padding: 16, marginTop: 16,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
        <AlertCircle size={16} color="#f59e0b" />
        <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>
          Verifica la propiedad del dominio
        </div>
      </div>
      <div style={{ fontSize: 12, color: 'var(--muted2)', marginBottom: 16, lineHeight: 1.5 }}>
        La conexión por API key valida tu cuenta del proveedor pero no demuestra que el newsletter
        es tuyo. Verifica el dominio para que Channelad marque el canal como verificado.
      </div>

      {/* Step 1: pick method + domain */}
      {step === 'idle' && (
        <>
          <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
            <button
              onClick={() => setMethod('dns')}
              style={{
                ...btn(method === 'dns' ? 'primary' : 'secondary'),
                flex: 1, justifyContent: 'center',
              }}
            >
              <Globe size={14} /> DNS TXT
            </button>
            <button
              onClick={() => setMethod('email')}
              style={{
                ...btn(method === 'email' ? 'primary' : 'secondary'),
                flex: 1, justifyContent: 'center',
              }}
            >
              <Mail size={14} /> Email
            </button>
          </div>

          <label style={{ display: 'block', fontSize: 12, color: 'var(--muted2)', marginBottom: 4, fontWeight: 600 }}>
            Dominio del newsletter
          </label>
          <input
            type="text"
            value={domain}
            onChange={(e) => setDomain(e.target.value)}
            placeholder="minewsletter.com"
            style={{ ...inp, marginBottom: 12 }}
          />
          <button
            onClick={handleStart}
            disabled={busy || !domain.trim()}
            style={{ ...btn('primary'), opacity: busy || !domain.trim() ? 0.5 : 1 }}
          >
            {busy ? 'Iniciando...' : 'Iniciar verificación'}
          </button>
        </>
      )}

      {/* Step 2: DNS challenge — show TXT + poll button */}
      {step === 'started' && method === 'dns' && challenge && (
        <>
          <div style={{ fontSize: 12, color: 'var(--muted2)', marginBottom: 8 }}>
            Añade este registro TXT en la zona DNS de <strong>{challenge.domain}</strong>:
          </div>
          <div style={{
            display: 'flex', alignItems: 'center', gap: 8,
            background: 'var(--card-bg, #1a1a1a)', border: '1px solid var(--border)',
            borderRadius: 8, padding: '10px 12px', marginBottom: 12,
            fontFamily: 'ui-monospace, monospace', fontSize: 13,
            color: 'var(--text)', wordBreak: 'break-all',
          }}>
            <span style={{ flex: 1 }}>{challenge.txtRecord}</span>
            <button
              onClick={() => copyToClipboard(challenge.txtRecord)}
              style={{ ...btn('secondary'), padding: '4px 8px', fontSize: 11 }}
              title="Copiar"
            >
              <Copy size={12} />
            </button>
          </div>
          <div style={{ fontSize: 11, color: 'var(--muted2)', marginBottom: 12, lineHeight: 1.5 }}>
            La propagación DNS suele tardar entre 5 minutos y 1 hora. Una vez añadido el registro,
            pulsa el botón para comprobar.
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              onClick={handleDnsCheck}
              disabled={busy}
              style={{ ...btn('primary'), opacity: busy ? 0.6 : 1 }}
            >
              {busy ? <RefreshCw size={14} className="spin" /> : <RefreshCw size={14} />}
              {busy ? 'Comprobando...' : 'Comprobar DNS'}
            </button>
            <button onClick={reset} style={btn('secondary')}>Cancelar</button>
          </div>
        </>
      )}

      {/* Step 2 alt: email challenge — pick mailbox + send */}
      {step === 'started' && method === 'email' && challenge && (
        <>
          <div style={{ fontSize: 12, color: 'var(--muted2)', marginBottom: 8 }}>
            Te enviaremos un enlace de confirmación a una dirección estándar del dominio{' '}
            <strong>{challenge.domain}</strong>. Selecciona el buzón al que tienes acceso:
          </div>
          <select
            value={mailbox}
            onChange={(e) => setMailbox(e.target.value)}
            style={{ ...inp, marginBottom: 12 }}
          >
            {ALLOWED_MAILBOXES.map((m) => (
              <option key={m} value={m}>{m}@{challenge.domain}</option>
            ))}
          </select>
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              onClick={handleSendEmail}
              disabled={busy}
              style={{ ...btn('primary'), opacity: busy ? 0.6 : 1 }}
            >
              <Mail size={14} />
              {busy ? 'Enviando...' : 'Enviar correo'}
            </button>
            <button onClick={reset} style={btn('secondary')}>Cancelar</button>
          </div>
          <div style={{ fontSize: 11, color: 'var(--muted2)', marginTop: 12, lineHeight: 1.5 }}>
            Tras enviarlo, abre el correo desde el buzón indicado y haz clic en el enlace.
            El enlace expira en 24 horas.
          </div>
        </>
      )}

      {/* Feedback */}
      {msg && (
        <div style={{
          marginTop: 12, padding: '10px 12px', borderRadius: 8, fontSize: 12,
          background: msg.ok ? '#10b98112' : '#f59e0b12',
          border: `1px solid ${msg.ok ? '#10b98133' : '#f59e0b33'}`,
          color: msg.ok ? '#10b981' : '#f59e0b',
        }}>
          {msg.text}
        </div>
      )}
    </div>
  )
}
