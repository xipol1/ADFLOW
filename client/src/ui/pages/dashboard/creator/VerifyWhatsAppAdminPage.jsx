/**
 * VerifyWhatsAppAdminPage — verifica un canal de WhatsApp ya creado contra
 * el admin client de ChannelAd. Frontend-driven polling: arrancamos la
 * verificación en el backend (genera un código), el usuario lo publica en
 * su canal y añade el número de ChannelAd como admin, y nosotros polleamos
 * /onboarding/whatsapp/poll cada 5 s mientras la pestaña esté abierta.
 *
 * Estados que devuelve el backend (controlador whatsappAdminPoll):
 *   { active:false, reason:'none'|'mismatch' }                — vencido / no iniciado
 *   { active:true, found:false, expiresIn, adminClientReady } — esperando código
 *   { active:true, found:true, completed:true, canal, tier }  — ✅ verificado
 *   { active:true, found:true, completed:false, error, ... }  — código encontrado, falta admin
 */

import React, { useState, useEffect, useRef, useCallback } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import {
  ArrowLeft, CheckCircle2, AlertTriangle, Copy, Check, Loader2,
  ShieldCheck, MessageSquare, Phone, RotateCcw, Sparkles, Clock,
} from 'lucide-react'
import apiService from '../../../../services/api'
import { FONT_BODY, FONT_DISPLAY, GREEN, OK as _OK, ERR, WARN } from '../../../theme/tokens'

// Match the design system used elsewhere in /creator (purple primary, etc.).
const A   = '#8b5cf6'
const AD  = '#7c3aed'
const AG  = (o) => `rgba(139,92,246,${o})`
const WA  = GREEN          // WhatsApp accent
const OK  = _OK
const F   = FONT_BODY
const D   = FONT_DISPLAY

const POLL_INTERVAL_MS = 5000

// ── Helpers ────────────────────────────────────────────────────────────────
function fmtSeconds(secs) {
  if (secs == null || secs < 0) return '—'
  const m = Math.floor(secs / 60)
  const s = secs % 60
  return m > 0 ? `${m}m ${s}s` : `${s}s`
}

// ─── Page ──────────────────────────────────────────────────────────────────
export default function VerifyWhatsAppAdminPage() {
  const { canalId } = useParams()
  const navigate = useNavigate()

  const [canal, setCanal] = useState(null)
  const [code, setCode] = useState(null)
  const [adminNumber, setAdminNumber] = useState('')
  const [expiresIn, setExpiresIn] = useState(null)
  const [pollState, setPollState] = useState(null) // last poll response
  const [error, setError] = useState('')
  const [starting, setStarting] = useState(true)
  const [completed, setCompleted] = useState(false)
  const pollRef = useRef(null)

  // ── 1. Load the canal + start verification on mount ─────────────────────
  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        // Fetch canal to confirm ownership and get its channelId (the
        // WhatsApp identifier inside the platform — what the admin client
        // uses to read posts).
        const canalRes = await apiService.request(`/canales/${canalId}`)
        if (cancelled) return
        if (!canalRes?.success || !canalRes?.data) {
          setError('No se pudo cargar el canal.')
          setStarting(false)
          return
        }
        const c = canalRes.data
        if (c.plataforma !== 'whatsapp') {
          setError('Este canal no es de WhatsApp.')
          setStarting(false)
          return
        }
        setCanal(c)
        const channelId = c?.botConfig?.whatsapp?.channelId || c.identificadorCanal

        // Start verification → backend stores the code and returns it.
        const startRes = await apiService.onboardingWhatsappStartAdmin(canalId, channelId)
        if (cancelled) return
        if (!startRes?.success) {
          setError(startRes?.error || 'No se pudo iniciar la verificación.')
          setStarting(false)
          return
        }
        setCode(startRes.verificationCode)
        setExpiresIn(startRes.expiresIn)
        setAdminNumber(startRes.instrucciones?.numeroChannelAd || '')
        setStarting(false)
      } catch (err) {
        if (!cancelled) {
          setError(err?.message || 'Error al iniciar la verificación.')
          setStarting(false)
        }
      }
    })()
    return () => { cancelled = true }
  }, [canalId])

  // ── 2. Polling loop ─────────────────────────────────────────────────────
  const tick = useCallback(async () => {
    if (!canal || !code || completed) return
    const channelId = canal?.botConfig?.whatsapp?.channelId || canal.identificadorCanal
    try {
      const r = await apiService.onboardingWhatsappPoll(canalId, channelId)
      setPollState(r)
      if (r?.expiresIn != null) setExpiresIn(r.expiresIn)
      if (r?.completed && r?.canal) {
        setCompleted(true)
        if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null }
      }
      if (r?.active === false) {
        // Verification expired or not active; stop polling but keep UI for retry.
        if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null }
      }
    } catch (err) {
      // Don't surface transient network errors as red banners — just log.
      console.warn('[wa-admin-verify] poll error:', err?.message)
    }
  }, [canal, canalId, code, completed])

  useEffect(() => {
    if (!code || completed) return
    // Run immediately, then every POLL_INTERVAL_MS.
    tick()
    pollRef.current = setInterval(tick, POLL_INTERVAL_MS)
    return () => {
      if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null }
    }
  }, [code, completed, tick])

  // ── 3. Manual retry / restart ───────────────────────────────────────────
  const handleRestart = async () => {
    setError('')
    setCode(null)
    setExpiresIn(null)
    setPollState(null)
    setCompleted(false)
    setStarting(true)
    try {
      const channelId = canal?.botConfig?.whatsapp?.channelId || canal?.identificadorCanal
      const startRes = await apiService.onboardingWhatsappStartAdmin(canalId, channelId)
      if (!startRes?.success) {
        setError(startRes?.error || 'No se pudo reiniciar la verificación.')
      } else {
        setCode(startRes.verificationCode)
        setExpiresIn(startRes.expiresIn)
        setAdminNumber(startRes.instrucciones?.numeroChannelAd || '')
      }
    } catch (err) {
      setError(err?.message || 'Error al reiniciar.')
    } finally {
      setStarting(false)
    }
  }

  // ── 4. Force admin check (used by the "Verificar admin ahora" button) ──
  const handleForceCheck = async () => {
    if (!canal) return
    const channelId = canal?.botConfig?.whatsapp?.channelId || canal.identificadorCanal
    setError('')
    try {
      const r = await apiService.onboardingWhatsappVerifyAdmin(canalId, channelId)
      if (r?.success) {
        setCompleted(true)
        if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null }
      } else {
        // Not admin yet — surface the reason so the user knows what to do.
        setError(r?.error || 'ChannelAd aún no es admin del canal.')
      }
    } catch (err) {
      setError(err?.message || 'Error verificando admin.')
    }
  }

  // ── Render ──────────────────────────────────────────────────────────────
  return (
    <div style={{ fontFamily: F, padding: '32px 24px', maxWidth: '760px', margin: '0 auto' }}>
      <BackLink />
      <Header />

      {error && <ErrorBanner message={error} onClose={() => setError('')} />}

      {starting && !code && <StartingState />}

      {completed && <CompletedState canal={pollState?.canal || canal} tier={pollState?.tier} onFinish={() => navigate('/creator/channels')} />}

      {!completed && code && (
        <>
          <CodeCard
            code={code}
            adminNumber={adminNumber}
            expiresIn={expiresIn}
          />
          <PollStatus pollState={pollState} adminClientReady={pollState?.adminClientReady !== false} />
          <ActionRow
            onRestart={handleRestart}
            onForceCheck={handleForceCheck}
            disabledForceCheck={!pollState?.found}
          />
        </>
      )}
    </div>
  )
}

// ─── Sub-components ────────────────────────────────────────────────────────

function BackLink() {
  return (
    <Link
      to="/creator/channels"
      style={{
        display: 'inline-flex', alignItems: 'center', gap: 6,
        fontSize: 13, color: 'var(--muted)', textDecoration: 'none',
        marginBottom: 16,
      }}
    >
      <ArrowLeft size={14} /> Volver a mis canales
    </Link>
  )
}

function Header() {
  return (
    <div style={{ marginBottom: 28 }}>
      <h1 style={{
        fontFamily: D, fontSize: 28, fontWeight: 800,
        color: 'var(--text)', letterSpacing: '-0.5px',
        marginBottom: 6, lineHeight: 1.2,
      }}>
        Verificar canal de WhatsApp
      </h1>
      <p style={{ fontSize: 14, color: 'var(--muted)', margin: 0 }}>
        Publica el código en tu canal y añade el número de ChannelAd como administrador.
        Detectaremos los dos pasos automáticamente.
      </p>
    </div>
  )
}

function ErrorBanner({ message, onClose }) {
  return (
    <div style={{
      background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)',
      borderRadius: 12, padding: '12px 16px', marginBottom: 18,
      display: 'flex', alignItems: 'flex-start', gap: 10,
    }}>
      <AlertTriangle size={18} style={{ color: ERR, flexShrink: 0, marginTop: 1 }} />
      <div style={{ flex: 1, fontSize: 13, color: 'var(--text)', lineHeight: 1.5 }}>{message}</div>
      <button onClick={onClose} aria-label="Cerrar"
        style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted)', padding: 0 }}>
        ×
      </button>
    </div>
  )
}

function StartingState() {
  return (
    <div style={{
      background: 'var(--surface)', border: '1px solid var(--border)',
      borderRadius: 16, padding: '40px 24px', textAlign: 'center',
    }}>
      <Loader2 size={28} style={{ color: A, animation: 'spin 1s linear infinite' }} />
      <div style={{ marginTop: 14, fontSize: 14, color: 'var(--muted)' }}>
        Generando código de verificación…
      </div>
      <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
    </div>
  )
}

function CodeCard({ code, adminNumber, expiresIn }) {
  const [copied, setCopied] = useState(false)
  const [copiedNum, setCopiedNum] = useState(false)

  const copyCode = () => {
    navigator.clipboard?.writeText(code)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }
  const copyNum = () => {
    if (!adminNumber) return
    navigator.clipboard?.writeText(adminNumber)
    setCopiedNum(true)
    setTimeout(() => setCopiedNum(false), 1500)
  }

  return (
    <div style={{
      background: 'var(--surface)', border: '1px solid var(--border)',
      borderRadius: 16, padding: 24, marginBottom: 20,
    }}>
      {/* Step 1 — code */}
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14, marginBottom: 24 }}>
        <StepBadge n={1} />
        <div style={{ flex: 1 }}>
          <div style={{ fontFamily: D, fontSize: 15, fontWeight: 700, color: 'var(--text)', marginBottom: 4 }}>
            Publica este código en tu canal
          </div>
          <div style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 14, lineHeight: 1.5 }}>
            Abre tu canal de WhatsApp y publica un mensaje que contenga exactamente este código.
            No tiene que ser el único contenido del mensaje.
          </div>
          <div
            onClick={copyCode}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') copyCode() }}
            style={{
              display: 'flex', alignItems: 'center', gap: 12,
              background: AG(0.08), border: `1px dashed ${AG(0.3)}`,
              borderRadius: 12, padding: '16px 20px', cursor: 'pointer',
              fontFamily: 'monospace', fontSize: 24, fontWeight: 700,
              color: A, letterSpacing: 4, justifyContent: 'space-between',
              transition: 'background .2s',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.background = AG(0.12) }}
            onMouseLeave={(e) => { e.currentTarget.style.background = AG(0.08) }}
          >
            <span>{code}</span>
            <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, fontFamily: F, fontWeight: 600, color: copied ? OK : 'var(--muted)' }}>
              {copied ? <><Check size={14} /> Copiado</> : <><Copy size={14} /> Copiar</>}
            </span>
          </div>
          {expiresIn != null && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 10, fontSize: 12, color: 'var(--muted)' }}>
              <Clock size={12} /> Caduca en {fmtSeconds(expiresIn)}
            </div>
          )}
        </div>
      </div>

      {/* Step 2 — admin */}
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14 }}>
        <StepBadge n={2} />
        <div style={{ flex: 1 }}>
          <div style={{ fontFamily: D, fontSize: 15, fontWeight: 700, color: 'var(--text)', marginBottom: 4 }}>
            Añade ChannelAd como administrador
          </div>
          <div style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 14, lineHeight: 1.5 }}>
            En tu canal: <em>Información del canal → Administradores → Añadir admin</em> →
            usa este número:
          </div>
          {adminNumber ? (
            <div
              onClick={copyNum}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') copyNum() }}
              style={{
                display: 'flex', alignItems: 'center', gap: 12,
                background: `${WA}15`, border: `1px solid ${WA}40`,
                borderRadius: 12, padding: '14px 18px', cursor: 'pointer',
                fontFamily: 'monospace', fontSize: 18, fontWeight: 700,
                color: WA, justifyContent: 'space-between',
                transition: 'background .2s',
              }}
            >
              <span style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <Phone size={16} /> {adminNumber}
              </span>
              <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, fontFamily: F, fontWeight: 600, color: copiedNum ? OK : WA }}>
                {copiedNum ? <><Check size={14} /> Copiado</> : <><Copy size={14} /> Copiar</>}
              </span>
            </div>
          ) : (
            <div style={{ fontSize: 13, color: WARN }}>
              Número de admin no configurado en el servidor. Contacta con soporte.
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function StepBadge({ n }) {
  return (
    <div style={{
      width: 32, height: 32, borderRadius: '50%',
      background: AG(0.12), border: `1px solid ${AG(0.25)}`,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: 14, fontWeight: 800, color: A, flexShrink: 0,
    }}>
      {n}
    </div>
  )
}

function PollStatus({ pollState, adminClientReady }) {
  // Map backend state → UI signal
  let icon, title, hint, color
  if (!adminClientReady) {
    icon = <AlertTriangle size={18} />
    title = 'El admin client de WhatsApp no está disponible'
    hint = 'Vuelve a intentarlo en unos minutos. El servicio está reiniciándose.'
    color = WARN
  } else if (pollState?.active === false) {
    icon = <AlertTriangle size={18} />
    title = 'La verificación expiró o no está activa'
    hint = 'Pulsa "Reiniciar" para generar un nuevo código.'
    color = WARN
  } else if (pollState?.found && !pollState?.completed) {
    icon = <ShieldCheck size={18} />
    title = 'Código detectado — falta el acceso de admin'
    hint = `Añade el número de ChannelAd como administrador del canal y pulsa "Verificar admin ahora".${pollState?.error ? ' Detalle: ' + pollState.error : ''}`
    color = WARN
  } else if (pollState?.found && pollState?.completed) {
    icon = <CheckCircle2 size={18} />
    title = 'Verificación completada'
    hint = 'Redirigiendo…'
    color = OK
  } else {
    // active:true, found:false → still waiting
    icon = <Loader2 size={18} style={{ animation: 'spin 1s linear infinite' }} />
    title = 'Esperando que publiques el código…'
    hint = 'Comprobamos tu canal cada 5 segundos. Mantén esta pestaña abierta.'
    color = A
  }

  return (
    <div style={{
      background: `${color}10`, border: `1px solid ${color}30`,
      borderRadius: 12, padding: '14px 18px', marginBottom: 16,
      display: 'flex', alignItems: 'flex-start', gap: 12,
    }}>
      <div style={{ color, flexShrink: 0, marginTop: 1 }}>{icon}</div>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)', marginBottom: 2 }}>{title}</div>
        <div style={{ fontSize: 13, color: 'var(--muted)', lineHeight: 1.5 }}>{hint}</div>
      </div>
      <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
    </div>
  )
}

function ActionRow({ onRestart, onForceCheck, disabledForceCheck }) {
  return (
    <div style={{ display: 'flex', gap: 10, justifyContent: 'space-between', flexWrap: 'wrap' }}>
      <button
        onClick={onRestart}
        style={{
          display: 'inline-flex', alignItems: 'center', gap: 6,
          background: 'none', border: '1px solid var(--border)',
          borderRadius: 10, padding: '10px 16px', fontSize: 13, fontWeight: 600,
          color: 'var(--text)', cursor: 'pointer', fontFamily: F,
        }}
      >
        <RotateCcw size={14} /> Reiniciar
      </button>

      <button
        onClick={onForceCheck}
        disabled={disabledForceCheck}
        style={{
          display: 'inline-flex', alignItems: 'center', gap: 6,
          background: disabledForceCheck ? AG(0.3) : A, color: '#fff',
          border: 'none', borderRadius: 10, padding: '10px 16px',
          fontSize: 13, fontWeight: 700,
          cursor: disabledForceCheck ? 'not-allowed' : 'pointer', fontFamily: F,
          boxShadow: disabledForceCheck ? 'none' : `0 4px 12px ${AG(0.3)}`,
          transition: 'background .15s',
        }}
        onMouseEnter={(e) => { if (!disabledForceCheck) e.currentTarget.style.background = AD }}
        onMouseLeave={(e) => { if (!disabledForceCheck) e.currentTarget.style.background = A }}
        title={disabledForceCheck ? 'Publica el código primero' : 'Forzar verificación de admin'}
      >
        <ShieldCheck size={14} /> Verificar admin ahora
      </button>
    </div>
  )
}

function CompletedState({ canal, tier, onFinish }) {
  return (
    <div style={{
      background: `${OK}10`, border: `1px solid ${OK}30`,
      borderRadius: 16, padding: 32, textAlign: 'center',
    }}>
      <div style={{
        width: 56, height: 56, margin: '0 auto 16px',
        borderRadius: '50%', background: `${OK}20`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <CheckCircle2 size={32} color={OK} />
      </div>
      <h2 style={{
        fontFamily: D, fontSize: 22, fontWeight: 800,
        color: 'var(--text)', marginBottom: 8,
      }}>
        Canal verificado
      </h2>
      <p style={{ fontSize: 14, color: 'var(--muted)', marginBottom: 20, lineHeight: 1.5 }}>
        ChannelAd ya tiene acceso admin a tu canal y leerá las métricas en tiempo real.
        {tier && <><br />Nivel de verificación: <strong style={{ color: 'var(--text)', textTransform: 'capitalize' }}>{tier}</strong></>}
      </p>
      {canal?.channelName && (
        <div style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 24 }}>
          <MessageSquare size={14} style={{ verticalAlign: 'middle', marginRight: 6 }} />
          {canal.channelName} {canal.seguidores ? `· ${canal.seguidores.toLocaleString()} seguidores` : ''}
        </div>
      )}
      <button
        onClick={onFinish}
        style={{
          display: 'inline-flex', alignItems: 'center', gap: 6,
          background: A, color: '#fff', border: 'none',
          borderRadius: 10, padding: '12px 24px',
          fontSize: 14, fontWeight: 700, cursor: 'pointer', fontFamily: F,
          boxShadow: `0 4px 16px ${AG(0.35)}`,
        }}
      >
        <Sparkles size={14} /> Volver a mis canales
      </button>
    </div>
  )
}
