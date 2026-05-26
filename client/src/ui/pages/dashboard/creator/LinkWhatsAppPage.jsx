/**
 * LinkWhatsAppPage
 *
 * UI for the full WhatsApp linking flow:
 *   Step 0 — Consent screen (full DPA summary + checkbox)
 *   Step 1 — QR scan (polls every 2s for status change)
 *   Step 2 — Connected: newsletter picker (choose which channels to import)
 *   Step 3 — Done: confirmation + link to audit log
 *
 * The underlying session manager is on the backend; this UI is just a
 * thin wrapper that talks to /api/baileys endpoints.
 */

import React, { useState, useEffect, useRef } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import {
  ShieldCheck,
  Eye,
  EyeOff,
  QrCode,
  CheckCircle2,
  AlertTriangle,
  Smartphone,
  Loader2,
  ArrowRight,
  X,
  FileText,
  Users,
  XCircle,
  Megaphone,
} from 'lucide-react'
import apiService from '../../../../services/api'
import { FONT_BODY, FONT_DISPLAY, GREEN, greenAlpha, PURPLE, purpleAlpha } from '../../../theme/tokens'
import { useConfirm } from '../shared/DashComponents'

const POLL_INTERVAL_MS = 2000

// ─── Demo mode ───────────────────────────────────────────────────────────────
// When ?demo=1 is set, the page skips the QR scan and jumps directly to step 2
// with a synthetic sessionState. Used for sales/UX demos when scanning a real
// WhatsApp QR isn't practical (screenshare, no Baileys access, etc.).
const DEMO_SESSION_STATE = {
  sessionId: 'demo-session',
  status: 'connected',
  deviceNumber: '34611223344',
  deviceName: 'Demo Creator',
  newsletters: [],
  groups: [
    {
      jid: '120363010000000001@g.us',
      name: 'Crypto España 🇪🇸',
      participantsCount: 1024,
      isAdmin: true,
      isAnnounce: false,
      apto: true,
      aptoReasons: ['Cumple criterios: eres admin y tiene 1024 miembros'],
    },
    {
      jid: '120363010000000002@g.us',
      name: 'Trading Pro VIP',
      participantsCount: 800,
      isAdmin: true,
      isAnnounce: false,
      apto: true,
      aptoReasons: ['Cumple criterios: eres admin y tiene 800 miembros'],
    },
    {
      jid: '120363010000000003@g.us',
      name: 'Inversión & Bolsa España',
      participantsCount: 450,
      isAdmin: true,
      isAnnounce: true,
      apto: false,
      aptoReasons: ['Grupo solo-anuncios — conviértelo en Canal (Newsletter) para Channelad'],
    },
    {
      jid: '120363010000000004@g.us',
      name: 'NFT Drops Channel',
      participantsCount: 150,
      isAdmin: true,
      isAnnounce: false,
      apto: false,
      aptoReasons: ['Tiene 150 miembros — mínimo 200 para monetizar'],
    },
    {
      jid: '120363010000000005@g.us',
      name: 'Amigos del colegio',
      participantsCount: 28,
      isAdmin: false,
      isAnnounce: false,
      apto: false,
      aptoReasons: ['No eres administrador del grupo', 'Tiene 28 miembros — mínimo 200 para monetizar'],
    },
  ],
}

export default function LinkWhatsAppPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const isDemo = searchParams.get('demo') === '1'

  const [step, setStep] = useState(isDemo ? 2 : 0) // 0 consent, 1 QR, 2 pick newsletter, 3 done
  const [consent, setConsent] = useState(false)
  const [alias, setAlias] = useState('')
  const [sessionId, setSessionId] = useState(isDemo ? DEMO_SESSION_STATE.sessionId : null)
  const [sessionState, setSessionState] = useState(isDemo ? DEMO_SESSION_STATE : null)
  const [myCanales, setMyCanales] = useState([])
  const [selectedCanalId, setSelectedCanalId] = useState(null)
  const [selectedNewsletterJid, setSelectedNewsletterJid] = useState(null)
  const [linking, setLinking] = useState(false)
  const [error, setError] = useState('')
  const pollRef = useRef(null)
  const { confirm, dialog: confirmDialog } = useConfirm()

  // ─── Polling ──────────────────────────────────────────────────────────────
  useEffect(() => {
    if (isDemo) return
    if (step !== 1 || !sessionId) return
    let cancelled = false

    const poll = async () => {
      try {
        const res = await apiService.request(`/baileys/link/${sessionId}`)
        if (cancelled) return
        if (res?.success) {
          setSessionState(res)
          if (res.status === 'connected') {
            setStep(2)
            loadMyCanales()
          } else if (res.status === 'revoked' || res.status === 'error' || res.status === 'expired') {
            setError(res.lastError || 'La sesión expiró. Vuelve a intentarlo.')
          }
        }
      } catch (err) {
        // Network hiccup — don't alarm the user, just keep trying
        console.warn('poll error:', err.message)
      }
    }

    poll()
    pollRef.current = setInterval(poll, POLL_INTERVAL_MS)

    return () => {
      cancelled = true
      if (pollRef.current) clearInterval(pollRef.current)
    }
  }, [step, sessionId])

  // ─── Load user canales (for mapping newsletters → canal) ──────────────────
  const loadMyCanales = async () => {
    try {
      const res = await apiService.getMyChannels()
      setMyCanales(res?.data || res?.canales || [])
    } catch (_) {
      setMyCanales([])
    }
  }

  // ─── Handlers ─────────────────────────────────────────────────────────────

  const handleStartLink = async () => {
    setError('')
    setLinking(true)
    try {
      const res = await apiService.request('/baileys/link/start', {
        method: 'POST',
        body: JSON.stringify({ alias, consentAccepted: true }),
      })
      if (res?.success && res.sessionId) {
        setSessionId(res.sessionId)
        setStep(1)
      } else {
        setError(res?.message || 'No se pudo iniciar la vinculación')
      }
    } catch (err) {
      setError(err.message || 'Error al iniciar la vinculación')
    } finally {
      setLinking(false)
    }
  }

  const handleLinkNewsletter = async (newsletterJid) => {
    if (!selectedCanalId) {
      setError('Selecciona primero un canal de Channelad para vincular')
      return
    }
    setLinking(true)
    setError('')
    try {
      const res = await apiService.request(`/baileys/sessions/${sessionId}/link-canal`, {
        method: 'POST',
        body: JSON.stringify({ newsletterJid, canalId: selectedCanalId }),
      })
      if (res?.success) {
        setSelectedNewsletterJid(newsletterJid)
        setStep(3)
      } else {
        setError(res?.message || 'Error al vincular el canal')
      }
    } catch (err) {
      setError(err.message || 'Error al vincular')
    } finally {
      setLinking(false)
    }
  }

  const handleRevoke = async () => {
    if (!sessionId) return
    const ok = await confirm({
      title: 'Cancelar vinculación',
      message: '¿Seguro que quieres cancelar la vinculación con WhatsApp? Tendrás que volver a escanear el QR para conectar de nuevo.',
      confirmLabel: 'Cancelar vinculación',
      cancelLabel: 'Volver',
      tone: 'danger',
    })
    if (!ok) return
    try {
      await apiService.request(`/baileys/sessions/${sessionId}`, { method: 'DELETE' })
    } catch (_) {}
    setStep(0)
    setSessionId(null)
    setSessionState(null)
    if (pollRef.current) clearInterval(pollRef.current)
  }

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <div style={{ fontFamily: FONT_BODY, padding: '32px 24px', maxWidth: '880px', margin: '0 auto' }}>
      {confirmDialog}
      {/* Header */}
      <div style={{ marginBottom: '24px' }}>
        <Link to="/creator/channels" style={{ fontSize: '13px', color: 'var(--muted)', textDecoration: 'none' }}>
          ← Volver a mis canales
        </Link>
        <h1
          style={{
            fontFamily: FONT_DISPLAY,
            fontSize: '28px',
            fontWeight: 700,
            color: 'var(--text)',
            marginTop: '12px',
            marginBottom: '6px',
            letterSpacing: '-0.5px',
          }}
        >
          Vincular canal de WhatsApp
        </h1>
        <p style={{ fontSize: '14px', color: 'var(--muted)', marginBottom: '0' }}>
          Conecta un canal de WhatsApp a Channelad para verificar su audiencia y leer métricas reales.
        </p>
      </div>

      {/* Demo banner */}
      {isDemo && (
        <div
          style={{
            background: 'linear-gradient(90deg, rgba(139,92,246,0.12), rgba(34,197,94,0.08))',
            border: '1px dashed rgba(139,92,246,0.45)',
            borderRadius: '12px',
            padding: '12px 16px',
            marginBottom: '20px',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            fontSize: '13px',
            color: 'var(--text)',
          }}
        >
          <span style={{ fontSize: '16px' }}>🎬</span>
          <div style={{ flex: 1 }}>
            <strong>Modo demo activo</strong> — Los grupos mostrados son ficticios. Quita <code style={{ background: 'var(--bg2)', padding: '1px 5px', borderRadius: '4px' }}>?demo=1</code> de la URL para volver al flujo real.
          </div>
        </div>
      )}

      {/* Progress indicator */}
      <StepIndicator currentStep={step} />

      {/* Error banner */}
      {error && (
        <div
          style={{
            background: 'rgba(239,68,68,0.08)',
            border: '1px solid rgba(239,68,68,0.25)',
            borderRadius: '12px',
            padding: '14px 18px',
            marginBottom: '20px',
            display: 'flex',
            alignItems: 'flex-start',
            gap: '10px',
          }}
        >
          <AlertTriangle size={18} style={{ color: '#EF4444', flexShrink: 0, marginTop: '1px' }} />
          <div style={{ flex: 1, fontSize: '14px', color: 'var(--text)' }}>{error}</div>
          <button
            onClick={() => setError('')}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted)' }}
            aria-label="Cerrar mensaje de error"
          >
            <X size={16} />
          </button>
        </div>
      )}

      {/* Steps */}
      {step === 0 && (
        <ConsentStep
          alias={alias}
          setAlias={setAlias}
          consent={consent}
          setConsent={setConsent}
          linking={linking}
          onContinue={handleStartLink}
        />
      )}

      {step === 1 && <QRStep sessionState={sessionState} onRevoke={handleRevoke} />}

      {step === 2 && (
        <NewsletterPickerStep
          sessionState={sessionState}
          myCanales={myCanales}
          selectedCanalId={selectedCanalId}
          setSelectedCanalId={setSelectedCanalId}
          linking={linking}
          onLink={handleLinkNewsletter}
          onRevoke={handleRevoke}
        />
      )}

      {step === 3 && <DoneStep sessionState={sessionState} onFinish={() => navigate('/creator/channels')} />}
    </div>
  )
}

// ─── Step Indicator ──────────────────────────────────────────────────────────

function StepIndicator({ currentStep }) {
  const steps = [
    { id: 0, label: 'Consentimiento' },
    { id: 1, label: 'Escanear QR' },
    { id: 2, label: 'Elegir canal' },
    { id: 3, label: 'Listo' },
  ]
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: '32px',
        padding: '0 4px',
      }}
    >
      {steps.map((s, i) => (
        <React.Fragment key={s.id}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flex: '0 0 auto' }}>
            <div
              style={{
                width: '32px',
                height: '32px',
                borderRadius: '50%',
                background: currentStep >= s.id ? PURPLE : 'var(--bg3)',
                color: currentStep >= s.id ? '#fff' : 'var(--muted)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '13px',
                fontWeight: 700,
                transition: 'all .25s',
              }}
            >
              {currentStep > s.id ? <CheckCircle2 size={16} /> : i + 1}
            </div>
            <span
              style={{
                fontSize: '11px',
                color: currentStep >= s.id ? 'var(--text)' : 'var(--muted)',
                marginTop: '6px',
                fontWeight: 500,
                whiteSpace: 'nowrap',
              }}
            >
              {s.label}
            </span>
          </div>
          {i < steps.length - 1 && (
            <div
              style={{
                flex: 1,
                height: '2px',
                background: currentStep > s.id ? PURPLE : 'var(--bg3)',
                margin: '0 8px',
                marginTop: '-20px',
                transition: 'background .25s',
              }}
            />
          )}
        </React.Fragment>
      ))}
    </div>
  )
}

// ─── Step 0: Consent ─────────────────────────────────────────────────────────

function ConsentStep({ alias, setAlias, consent, setConsent, linking, onContinue }) {
  const allowlist = [
    { icon: Eye, label: 'Leer nombre y descripción del canal' },
    { icon: Eye, label: 'Leer número de seguidores' },
    { icon: Eye, label: 'Leer métricas de posts publicados por Channelad (views, reacciones)' },
    { icon: Eye, label: 'Publicar anuncios que tú hayas aprobado previamente' },
  ]
  const denylist = [
    { icon: EyeOff, label: 'Leer tus chats personales o de grupo' },
    { icon: EyeOff, label: 'Leer tus contactos, llamadas o mensajes privados' },
    { icon: EyeOff, label: 'Publicar sin tu aprobación explícita' },
    { icon: EyeOff, label: 'Acceder a canales que no hayas registrado' },
  ]

  return (
    <div
      style={{
        background: 'var(--surface)',
        border: '1px solid var(--border)',
        borderRadius: '16px',
        padding: '32px',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
        <div
          style={{
            width: '44px',
            height: '44px',
            borderRadius: '12px',
            background: purpleAlpha(0.1),
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <ShieldCheck size={22} style={{ color: PURPLE }} />
        </div>
        <div>
          <h2
            style={{
              fontFamily: FONT_DISPLAY,
              fontSize: '20px',
              fontWeight: 700,
              color: 'var(--text)',
              margin: 0,
            }}
          >
            Transparencia total antes de vincular
          </h2>
          <p style={{ fontSize: '13px', color: 'var(--muted)', margin: '4px 0 0' }}>
            Queremos que tomes la decisión con toda la información.
          </p>
        </div>
      </div>

      {/* Allowlist */}
      <div style={{ marginBottom: '24px' }}>
        <h3
          style={{
            fontSize: '11px',
            fontWeight: 700,
            color: GREEN,
            textTransform: 'uppercase',
            letterSpacing: '0.1em',
            marginBottom: '10px',
          }}
        >
          ✅ Qué haremos
        </h3>
        <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
          {allowlist.map((item, i) => (
            <li
              key={i}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                padding: '10px 12px',
                background: greenAlpha(0.04),
                border: `1px solid ${greenAlpha(0.12)}`,
                borderRadius: '10px',
                marginBottom: '6px',
                fontSize: '14px',
                color: 'var(--text)',
              }}
            >
              <item.icon size={16} style={{ color: GREEN, flexShrink: 0 }} />
              {item.label}
            </li>
          ))}
        </ul>
      </div>

      {/* Denylist */}
      <div style={{ marginBottom: '24px' }}>
        <h3
          style={{
            fontSize: '11px',
            fontWeight: 700,
            color: '#EF4444',
            textTransform: 'uppercase',
            letterSpacing: '0.1em',
            marginBottom: '10px',
          }}
        >
          ❌ Qué nunca haremos
        </h3>
        <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
          {denylist.map((item, i) => (
            <li
              key={i}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                padding: '10px 12px',
                background: 'rgba(239,68,68,0.04)',
                border: '1px solid rgba(239,68,68,0.12)',
                borderRadius: '10px',
                marginBottom: '6px',
                fontSize: '14px',
                color: 'var(--text)',
              }}
            >
              <item.icon size={16} style={{ color: '#EF4444', flexShrink: 0 }} />
              {item.label}
            </li>
          ))}
        </ul>
      </div>

      {/* Alias (optional) */}
      <div style={{ marginBottom: '20px' }}>
        <label
          style={{
            display: 'block',
            fontSize: '12px',
            fontWeight: 600,
            color: 'var(--muted)',
            marginBottom: '6px',
          }}
        >
          Alias de esta sesión (opcional, útil para agencias)
        </label>
        <input
          type="text"
          value={alias}
          onChange={(e) => setAlias(e.target.value)}
          placeholder='Ej: "Cliente A - Tech News ES"'
          maxLength={80}
          style={{
            width: '100%',
            padding: '12px 14px',
            fontSize: '14px',
            fontFamily: FONT_BODY,
            background: 'var(--bg)',
            color: 'var(--text)',
            border: '1px solid var(--border)',
            borderRadius: '10px',
            outline: 'none',
            boxSizing: 'border-box',
          }}
        />
      </div>

      {/* Consent checkbox */}
      <label
        style={{
          display: 'flex',
          alignItems: 'flex-start',
          gap: '10px',
          padding: '14px 16px',
          background: 'var(--bg2)',
          borderRadius: '10px',
          cursor: 'pointer',
          marginBottom: '20px',
        }}
      >
        <input
          type="checkbox"
          checked={consent}
          onChange={(e) => setConsent(e.target.checked)}
          style={{ marginTop: '3px', accentColor: PURPLE, cursor: 'pointer' }}
        />
        <span style={{ fontSize: '13px', color: 'var(--text)', lineHeight: 1.6 }}>
          He leído y acepto la{' '}
          <Link
            to="/politica-acceso-whatsapp"
            target="_blank"
            style={{ color: PURPLE, textDecoration: 'underline', fontWeight: 600 }}
          >
            <FileText size={12} style={{ display: 'inline', marginRight: '2px' }} />
            Política de acceso y procesamiento de datos de WhatsApp
          </Link>
          . Entiendo que puedo revocar el acceso en cualquier momento desde mi teléfono o desde este dashboard.
        </span>
      </label>

      {/* CTA */}
      <button
        onClick={onContinue}
        disabled={!consent || linking}
        style={{
          width: '100%',
          padding: '14px 24px',
          fontSize: '15px',
          fontWeight: 600,
          fontFamily: FONT_BODY,
          background: consent && !linking ? PURPLE : 'var(--muted2)',
          color: '#fff',
          border: 'none',
          borderRadius: '12px',
          cursor: consent && !linking ? 'pointer' : 'not-allowed',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '8px',
          transition: 'all .2s',
        }}
      >
        {linking ? (
          <>
            <Loader2 size={18} style={{ animation: 'spin 1s linear infinite' }} />
            Generando QR...
          </>
        ) : (
          <>
            Continuar y generar QR
            <ArrowRight size={18} />
          </>
        )}
      </button>

      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}</style>
    </div>
  )
}

// ─── Step 1: QR Scan ─────────────────────────────────────────────────────────

function QRStep({ sessionState, onRevoke }) {
  const qr = sessionState?.qrDataUrl
  const status = sessionState?.status || 'pending_qr'

  return (
    <div
      style={{
        background: 'var(--surface)',
        border: '1px solid var(--border)',
        borderRadius: '16px',
        padding: '40px 32px',
        textAlign: 'center',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', marginBottom: '20px' }}>
        <Smartphone size={20} style={{ color: PURPLE }} />
        <h2
          style={{
            fontFamily: FONT_DISPLAY,
            fontSize: '20px',
            fontWeight: 700,
            color: 'var(--text)',
            margin: 0,
          }}
        >
          Escanea con tu WhatsApp
        </h2>
      </div>

      <div
        style={{
          width: '320px',
          height: '320px',
          margin: '0 auto 24px',
          padding: '16px',
          background: '#fff',
          borderRadius: '16px',
          border: '1px solid var(--border)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          position: 'relative',
        }}
      >
        {qr ? (
          <img src={qr} alt="Código QR para vincular WhatsApp" style={{ width: '100%', height: '100%' }} />
        ) : (
          <div style={{ textAlign: 'center', color: '#666' }}>
            <Loader2
              size={40}
              style={{ animation: 'spin 1s linear infinite', color: PURPLE, marginBottom: '12px' }}
            />
            <p style={{ fontSize: '13px', margin: 0 }}>
              {status === 'pending_qr' ? 'Generando código QR...' : status}
            </p>
          </div>
        )}
      </div>

      <ol
        style={{
          textAlign: 'left',
          maxWidth: '360px',
          margin: '0 auto 24px',
          fontSize: '13px',
          color: 'var(--muted)',
          lineHeight: 1.8,
          paddingLeft: '20px',
        }}
      >
        <li>Abre WhatsApp en tu teléfono</li>
        <li>
          Ve a <strong>Ajustes → Dispositivos vinculados</strong>
        </li>
        <li>
          Pulsa <strong>Vincular un dispositivo</strong>
        </li>
        <li>Apunta tu teléfono a este código</li>
      </ol>

      <p style={{ fontSize: '12px', color: 'var(--muted2)', marginBottom: '16px' }}>
        ChannelAd aparecerá en tu lista de dispositivos vinculados. Puedes revocar el acceso desde WhatsApp en
        cualquier momento.
      </p>

      <button
        onClick={onRevoke}
        style={{
          padding: '10px 20px',
          fontSize: '13px',
          fontWeight: 500,
          fontFamily: FONT_BODY,
          background: 'transparent',
          color: 'var(--muted)',
          border: '1px solid var(--border)',
          borderRadius: '10px',
          cursor: 'pointer',
        }}
      >
        Cancelar vinculación
      </button>

      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}</style>
    </div>
  )
}

// ─── Step 2: Newsletter Picker ───────────────────────────────────────────────

function NewsletterPickerStep({ sessionState, myCanales, selectedCanalId, setSelectedCanalId, linking, onLink, onRevoke }) {
  const newsletters = sessionState?.newsletters || []
  const groups = sessionState?.groups || []
  const aptoGroups = groups.filter((g) => g.apto)
  const noAptoGroups = groups.filter((g) => !g.apto)

  if (newsletters.length === 0) {
    return (
      <div
        style={{
          background: 'var(--surface)',
          border: '1px solid var(--border)',
          borderRadius: '16px',
          padding: '32px',
        }}
      >
        <div style={{ textAlign: 'center', marginBottom: '28px' }}>
          <div
            style={{
              width: '56px',
              height: '56px',
              borderRadius: '16px',
              background: 'rgba(245,158,11,0.1)',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: '16px',
            }}
          >
            <AlertTriangle size={28} style={{ color: '#F59E0B' }} />
          </div>
          <h2 style={{ fontFamily: FONT_DISPLAY, fontSize: '18px', fontWeight: 700, color: 'var(--text)', marginBottom: '8px' }}>
            No tienes Canales (newsletters) que administres
          </h2>
          <p style={{ fontSize: '14px', color: 'var(--muted)', maxWidth: '460px', margin: '0 auto', lineHeight: 1.6 }}>
            Channelad monetiza <strong>Canales de WhatsApp</strong> (newsletters broadcast), no grupos.
            Pero hemos auditado tus grupos para mostrarte cuáles podrían convertirse en Canales monetizables.
          </p>
        </div>

        <GroupAuditReport groups={groups} aptoGroups={aptoGroups} noAptoGroups={noAptoGroups} />

        <div style={{ textAlign: 'center', marginTop: '24px' }}>
          <button
            onClick={onRevoke}
            style={{
              padding: '10px 20px',
              fontSize: '13px',
              fontWeight: 500,
              background: 'transparent',
              color: 'var(--muted)',
              border: '1px solid var(--border)',
              borderRadius: '10px',
              cursor: 'pointer',
            }}
          >
            Cerrar sesión y volver
          </button>
        </div>
      </div>
    )
  }

  return (
    <div
      style={{
        background: 'var(--surface)',
        border: '1px solid var(--border)',
        borderRadius: '16px',
        padding: '32px',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '6px' }}>
        <CheckCircle2 size={22} style={{ color: GREEN }} />
        <h2 style={{ fontFamily: FONT_DISPLAY, fontSize: '20px', fontWeight: 700, color: 'var(--text)', margin: 0 }}>
          Conectado como {sessionState?.deviceName || sessionState?.deviceNumber}
        </h2>
      </div>
      <p style={{ fontSize: '13px', color: 'var(--muted)', marginBottom: '24px' }}>
        Hemos detectado {newsletters.length} canal{newsletters.length === 1 ? '' : 'es'} que administras. Elige cuál
        quieres vincular a Channelad.
      </p>

      {/* Canal picker (ChannelAd side) */}
      <div style={{ marginBottom: '24px' }}>
        <label
          style={{
            display: 'block',
            fontSize: '12px',
            fontWeight: 600,
            color: 'var(--muted)',
            marginBottom: '6px',
          }}
        >
          Vincular al siguiente canal de ChannelAd
        </label>
        <select
          value={selectedCanalId || ''}
          onChange={(e) => setSelectedCanalId(e.target.value)}
          style={{
            width: '100%',
            padding: '12px 14px',
            fontSize: '14px',
            background: 'var(--bg)',
            color: 'var(--text)',
            border: '1px solid var(--border)',
            borderRadius: '10px',
            outline: 'none',
          }}
        >
          <option value="">Selecciona un canal...</option>
          {myCanales
            .filter((c) => !c.plataforma || c.plataforma === 'whatsapp' || !c.plataforma)
            .map((c) => (
              <option key={c._id || c.id} value={c._id || c.id}>
                {c.nombreCanal || c.nombre || 'Sin nombre'}
              </option>
            ))}
        </select>
        {myCanales.length === 0 && (
          <p style={{ fontSize: '12px', color: 'var(--muted2)', marginTop: '6px' }}>
            No tienes canales creados. <Link to="/creator/channels/new" style={{ color: PURPLE }}>Crea uno primero</Link>.
          </p>
        )}
      </div>

      {/* Newsletters list */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        {newsletters.map((n) => (
          <div
            key={n.jid}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '14px',
              padding: '14px 16px',
              background: 'var(--bg2)',
              border: '1px solid var(--border)',
              borderRadius: '12px',
            }}
          >
            <div
              style={{
                width: '44px',
                height: '44px',
                borderRadius: '10px',
                background: greenAlpha(0.1),
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
                fontSize: '20px',
              }}
            >
              💬
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <p style={{ fontSize: '15px', fontWeight: 600, color: 'var(--text)', margin: 0 }}>{n.name}</p>
                {n.verification === 'VERIFIED' && (
                  <span
                    style={{
                      fontSize: '10px',
                      fontWeight: 700,
                      color: '#fff',
                      background: '#3b82f6',
                      padding: '2px 6px',
                      borderRadius: '99px',
                    }}
                  >
                    ✓
                  </span>
                )}
              </div>
              <p style={{ fontSize: '12px', color: 'var(--muted)', margin: '2px 0 0' }}>
                {n.subscribers?.toLocaleString() || 0} seguidores · {n.role}
              </p>
            </div>
            <button
              onClick={() => onLink(n.jid)}
              disabled={linking || !selectedCanalId}
              style={{
                padding: '10px 18px',
                fontSize: '13px',
                fontWeight: 600,
                background: selectedCanalId && !linking ? PURPLE : 'var(--muted2)',
                color: '#fff',
                border: 'none',
                borderRadius: '10px',
                cursor: selectedCanalId && !linking ? 'pointer' : 'not-allowed',
              }}
            >
              {linking ? 'Vinculando...' : 'Vincular'}
            </button>
          </div>
        ))}
      </div>

      {groups.length > 0 && (
        <div style={{ marginTop: '32px', paddingTop: '24px', borderTop: '1px dashed var(--border)' }}>
          <h3
            style={{
              fontFamily: FONT_DISPLAY,
              fontSize: '15px',
              fontWeight: 700,
              color: 'var(--text)',
              margin: '0 0 4px',
            }}
          >
            Auditoría de tus grupos
          </h3>
          <p style={{ fontSize: '12px', color: 'var(--muted)', margin: '0 0 16px' }}>
            Channelad solo monetiza Canales (newsletters), pero te mostramos cuáles de tus grupos podrían
            convertirse.
          </p>
          <GroupAuditReport groups={groups} aptoGroups={aptoGroups} noAptoGroups={noAptoGroups} />
        </div>
      )}

      <button
        onClick={onRevoke}
        style={{
          marginTop: '20px',
          padding: '10px 20px',
          fontSize: '13px',
          fontWeight: 500,
          background: 'transparent',
          color: 'var(--muted)',
          border: '1px solid var(--border)',
          borderRadius: '10px',
          cursor: 'pointer',
        }}
      >
        Cancelar y cerrar sesión
      </button>
    </div>
  )
}

// ─── Group Audit Report (used inside Step 2) ─────────────────────────────────

function GroupAuditReport({ groups, aptoGroups, noAptoGroups }) {
  if (!groups || groups.length === 0) {
    return (
      <div
        style={{
          background: 'var(--bg2)',
          border: '1px solid var(--border)',
          borderRadius: '12px',
          padding: '16px 20px',
          fontSize: '13px',
          color: 'var(--muted)',
          textAlign: 'center',
        }}
      >
        No detectamos grupos en esta cuenta de WhatsApp.
      </div>
    )
  }

  return (
    <>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap: '10px',
          marginBottom: '16px',
        }}
      >
        <SummaryStat label="Grupos detectados" value={groups.length} color={PURPLE} />
        <SummaryStat label="Aptos para monetizar" value={aptoGroups.length} color={GREEN} />
        <SummaryStat label="No aptos hoy" value={noAptoGroups.length} color="#F59E0B" />
      </div>

      {aptoGroups.length > 0 && (
        <div style={{ marginBottom: '16px' }}>
          <h4 style={{ fontSize: '12px', fontWeight: 700, color: GREEN, margin: '0 0 8px', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
            ✅ Aptos ({aptoGroups.length})
          </h4>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {aptoGroups.map((g) => (
              <GroupAuditRow key={g.jid} group={g} />
            ))}
          </div>
        </div>
      )}

      {noAptoGroups.length > 0 && (
        <div>
          <h4 style={{ fontSize: '12px', fontWeight: 700, color: '#F59E0B', margin: '0 0 8px', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
            ⚠️ No aptos ({noAptoGroups.length})
          </h4>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {noAptoGroups.map((g) => (
              <GroupAuditRow key={g.jid} group={g} />
            ))}
          </div>
        </div>
      )}
    </>
  )
}

function SummaryStat({ label, value, color }) {
  return (
    <div
      style={{
        background: 'var(--bg2)',
        border: '1px solid var(--border)',
        borderRadius: '12px',
        padding: '12px 14px',
        textAlign: 'center',
      }}
    >
      <div style={{ fontSize: '22px', fontWeight: 700, color, fontFamily: FONT_DISPLAY, lineHeight: 1 }}>
        {value}
      </div>
      <div style={{ fontSize: '11px', color: 'var(--muted)', marginTop: '4px' }}>{label}</div>
    </div>
  )
}

function GroupAuditRow({ group }) {
  const apto = group.apto
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        padding: '12px 14px',
        background: apto ? greenAlpha(0.06) : 'var(--bg2)',
        border: `1px solid ${apto ? greenAlpha(0.18) : 'var(--border)'}`,
        borderRadius: '10px',
      }}
    >
      <div
        style={{
          width: '36px',
          height: '36px',
          borderRadius: '8px',
          background: apto ? greenAlpha(0.12) : 'rgba(245,158,11,0.1)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
        }}
      >
        {apto ? (
          <CheckCircle2 size={18} style={{ color: GREEN }} />
        ) : (
          <XCircle size={18} style={{ color: '#F59E0B' }} />
        )}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
          <span style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text)' }}>
            {group.name || '(sin nombre)'}
          </span>
          {group.isAnnounce && (
            <span
              style={{
                fontSize: '10px',
                fontWeight: 700,
                color: '#fff',
                background: '#8b5cf6',
                padding: '2px 6px',
                borderRadius: '99px',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '3px',
              }}
            >
              <Megaphone size={9} /> Anuncios
            </span>
          )}
        </div>
        <div style={{ fontSize: '11px', color: 'var(--muted)', marginTop: '2px', display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
            <Users size={11} /> {group.participantsCount?.toLocaleString() || 0} miembros
          </span>
          <span>{group.isAdmin ? 'Eres admin' : 'No eres admin'}</span>
        </div>
        {group.aptoReasons?.length > 0 && (
          <div style={{ fontSize: '11px', color: apto ? GREEN : '#F59E0B', marginTop: '4px', lineHeight: 1.5 }}>
            {group.aptoReasons[0]}
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Step 3: Done ────────────────────────────────────────────────────────────

function DoneStep({ sessionState, onFinish }) {
  return (
    <div
      style={{
        background: 'var(--surface)',
        border: '1px solid var(--border)',
        borderRadius: '16px',
        padding: '48px 32px',
        textAlign: 'center',
      }}
    >
      <div
        style={{
          width: '72px',
          height: '72px',
          borderRadius: '20px',
          background: greenAlpha(0.12),
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: '16px',
        }}
      >
        <CheckCircle2 size={36} style={{ color: GREEN }} />
      </div>
      <h2 style={{ fontFamily: FONT_DISPLAY, fontSize: '24px', fontWeight: 700, color: 'var(--text)', marginBottom: '8px' }}>
        Canal vinculado correctamente
      </h2>
      <p style={{ fontSize: '14px', color: 'var(--muted)', maxWidth: '440px', margin: '0 auto 24px', lineHeight: 1.7 }}>
        A partir de ahora leeremos los seguidores, views y reacciones de este canal en tiempo real. Puedes consultar
        cada operación en el{' '}
        <Link to="/creator/whatsapp-audit" style={{ color: PURPLE, fontWeight: 600 }}>
          registro de accesos
        </Link>
        .
      </p>
      <button
        onClick={onFinish}
        style={{
          padding: '14px 32px',
          fontSize: '15px',
          fontWeight: 600,
          background: PURPLE,
          color: '#fff',
          border: 'none',
          borderRadius: '12px',
          cursor: 'pointer',
        }}
      >
        Ir a mis canales
      </button>
    </div>
  )
}
