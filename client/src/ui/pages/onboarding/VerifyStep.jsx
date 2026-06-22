import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowRight, ExternalLink, Loader, CheckCircle, Copy } from 'lucide-react'
import apiService from '../../../services/api'
import { useAuth } from '../../../auth/AuthContext'
import { useOnboarding } from './OnboardingContext'

const A = '#8b5cf6'
const AD = '#7c3aed'
const AG = (o) => `rgba(139,92,246,${o})`
const OK = '#10b981'
const ERR = '#ef4444'
const F = "'Inter', system-ui, sans-serif"
const D = "'Sora', system-ui, sans-serif"

// ─── Shared UI helpers ────────────────────────────────────────────────────
function Heading({ title, subtitle }) {
  return (
    <>
      <h1 style={{ fontFamily: D, fontSize: '28px', fontWeight: 700, letterSpacing: '-0.03em', color: 'var(--text)', marginBottom: '8px', textAlign: 'center', lineHeight: 1.2 }}>
        {title}
      </h1>
      {subtitle && (
        <p style={{ fontSize: '15px', color: 'var(--muted)', marginBottom: '28px', textAlign: 'center' }}>
          {subtitle}
        </p>
      )}
    </>
  )
}

function ErrorBanner({ message }) {
  if (!message) return null
  return (
    <div style={{
      background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)',
      borderRadius: '10px', padding: '12px 16px', marginBottom: '20px',
      fontSize: '13px', color: ERR,
    }}>{message}</div>
  )
}

function InstructionList({ steps }) {
  return (
    <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '16px', padding: '24px', marginBottom: '24px' }}>
      {steps.map((text, i) => (
        <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: '14px', padding: '10px 0', borderBottom: i !== steps.length - 1 ? '1px solid var(--border)' : 'none' }}>
          <div style={{
            width: '28px', height: '28px', borderRadius: '50%',
            background: AG(0.12), border: `1px solid ${AG(0.25)}`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '13px', fontWeight: 700, color: A, flexShrink: 0, marginTop: '1px',
          }}>{i + 1}</div>
          <span style={{ fontSize: '14px', color: 'var(--text)', lineHeight: 1.5, paddingTop: '5px' }}>{text}</span>
        </div>
      ))}
    </div>
  )
}

function PrimaryButton({ children, onClick, disabled, loading }) {
  const active = !disabled && !loading
  return (
    <button
      onClick={onClick}
      disabled={disabled || loading}
      style={{
        width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
        background: active ? A : AG(0.3), color: '#fff', border: 'none',
        borderRadius: '12px', padding: '14px', fontSize: '15px', fontWeight: 700,
        cursor: active ? 'pointer' : 'not-allowed', fontFamily: F,
        boxShadow: active ? `0 4px 16px ${AG(0.35)}` : 'none', transition: 'all .2s',
      }}
      onMouseEnter={e => { if (active) e.currentTarget.style.background = AD }}
      onMouseLeave={e => { if (active) e.currentTarget.style.background = A }}
    >
      {loading ? <><Loader size={16} style={{ animation: 'spin 1s linear infinite' }} /> Verificando...</> : children}
      <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
    </button>
  )
}

function TextInput({ value, onChange, placeholder, label, focused, setFocused, name }) {
  const inputId = `verify-step-${name}`
  return (
    <div style={{ marginBottom: '20px' }}>
      {label && (
        <label htmlFor={inputId} style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text)', display: 'block', marginBottom: '6px' }}>
          {label}
        </label>
      )}
      <input
        id={inputId}
        name={name}
        type="text"
        value={value}
        onChange={e => onChange(e.target.value)}
        onFocus={() => setFocused(name)}
        onBlur={() => setFocused(null)}
        placeholder={placeholder}
        style={{
          width: '100%', boxSizing: 'border-box', background: 'var(--bg)',
          border: `1px solid ${focused === name ? A : 'var(--border-med)'}`,
          borderRadius: '10px', padding: '13px 16px',
          fontSize: '15px', color: 'var(--text)', fontFamily: F, outline: 'none',
          transition: 'border-color .2s, box-shadow .2s',
          boxShadow: focused === name ? `0 0 0 3px ${AG(0.12)}` : 'none',
        }}
      />
    </div>
  )
}

// ─── Telegram verifier ────────────────────────────────────────────────────
function TelegramVerify({ canalId, channelName, onDone }) {
  const [chatId, setChatId] = useState(channelName?.startsWith('@') ? channelName : '')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [focused, setFocused] = useState(null)

  const handleVerify = async () => {
    const id = chatId.trim()
    if (!id) { setError('Introduce el username o ID del canal'); return }
    setError('')
    setLoading(true)
    try {
      const res = await apiService.onboardingTelegramVerify(id, canalId)
      if (res?.success) onDone(res)
      else setError(res?.error || res?.instruccion || 'No se pudo verificar el canal')
    } catch (e) {
      setError(e.message || 'Error de conexión')
    }
    setLoading(false)
  }

  return (
    <div>
      <Heading
        title="Verifica tu canal de Telegram"
        subtitle="Añade nuestro bot como admin para activar el canal"
      />
      <ErrorBanner message={error} />

      <InstructionList steps={[
        'Abre tu canal de Telegram y ve a "Administradores"',
        'Pulsa "Añadir administrador" y busca @ChannelAdBot',
        'Activa los permisos "Publicar mensajes" y "Editar mensajes"',
        'Introduce abajo el username de tu canal (ej. @micanal)',
      ]} />

      <TextInput
        label="Username o ID del canal"
        value={chatId}
        onChange={setChatId}
        placeholder="@micanal o -1001234567890"
        name="chatId"
        focused={focused}
        setFocused={setFocused}
      />

      <PrimaryButton onClick={handleVerify} disabled={!chatId.trim()} loading={loading}>
        Verificar canal <ArrowRight size={16} />
      </PrimaryButton>
    </div>
  )
}

// ─── Discord verifier ─────────────────────────────────────────────────────
// base64url(JWT payload) → objeto. Solo para MOSTRAR la lista de servidores; la
// confianza la pone el backend al re-verificar la firma del token.
function decodeJwtPayload(token) {
  try {
    const part = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')
    const json = decodeURIComponent(
      atob(part).split('').map(c => '%' + c.charCodeAt(0).toString(16).padStart(2, '0')).join('')
    )
    return JSON.parse(json)
  } catch { return null }
}

const DISCORD_ERRORS = {
  discord_denied: 'Cancelaste la autorización. Vuelve a intentarlo cuando quieras.',
  discord_no_bot: 'No encontramos ningún servidor donde seas administrador y el bot esté instalado. Instala el bot primero y vuelve a verificar.',
  discord_state_expired: 'La sesión de verificación caducó. Vuelve a empezar.',
  discord_state_invalid: 'No pudimos validar la verificación. Vuelve a intentarlo.',
  discord_not_configured: 'La verificación de Discord no está disponible ahora mismo. Contacta con soporte.',
  discord_failed: 'No se pudo completar la verificación con Discord. Vuelve a intentarlo.',
}

function DiscordVerify({ canalId, onDone }) {
  const [inviteUrl, setInviteUrl] = useState('')
  const [ownershipToken, setOwnershipToken] = useState('')
  const [guilds, setGuilds] = useState([])
  const [selectedGuild, setSelectedGuild] = useState('')
  const [loading, setLoading] = useState(false)
  const [authLoading, setAuthLoading] = useState(false)
  const [error, setError] = useState('')
  // Fase 3: elegir el canal de texto donde se publican los anuncios.
  const [pubStage, setPubStage] = useState(false)
  const [pubChannels, setPubChannels] = useState([])
  const [selectedPub, setSelectedPub] = useState('')

  // Carga la URL de invitación del bot para el paso de instalación.
  useEffect(() => {
    let cancelled = false
    apiService.onboardingDiscordInstructions('').then(res => {
      if (!cancelled && res?.success) setInviteUrl(res.instrucciones?.inviteUrl || '')
    }).catch(() => {})
    return () => { cancelled = true }
  }, [])

  // Al volver del OAuth de Discord: lee el token de propiedad (o el error) de la URL.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const cbError = params.get('error')
    const token = params.get('discord_owner')
    if (cbError) {
      const reason = params.get('reason')
      setError(reason === 'not_admin'
        ? 'Tu cuenta de Discord no es administradora de ningún servidor. Inicia sesión con la cuenta correcta.'
        : (DISCORD_ERRORS[cbError] || 'No se pudo verificar el servidor.'))
    }
    if (token) {
      const payload = decodeJwtPayload(token)
      const list = Array.isArray(payload?.guilds) ? payload.guilds : []
      setOwnershipToken(token)
      setGuilds(list)
      if (list.length === 1) setSelectedGuild(list[0].id)
    }
    // Limpia la query para que un refresco no reprocese un token caducado.
    if (cbError || token) {
      window.history.replaceState({}, '', window.location.pathname)
    }
  }, [])

  const startOAuth = async () => {
    setError('')
    setAuthLoading(true)
    try {
      const res = await apiService.onboardingDiscordAuthUrl(canalId)
      if (res?.success && res.authUrl) {
        window.location.href = res.authUrl
        return
      }
      setError(res?.error || 'No se pudo iniciar la verificación con Discord')
    } catch (e) {
      setError(e.message || 'Error de conexión')
    }
    setAuthLoading(false)
  }

  const handleVerify = async () => {
    if (!selectedGuild) { setError('Elige un servidor'); return }
    setError('')
    setLoading(true)
    try {
      const res = await apiService.onboardingDiscordVerify(selectedGuild, canalId, ownershipToken)
      if (res?.success) {
        // Si el servidor tiene varios canales de texto, deja elegir dónde
        // publicar; si no, el backend ya fijó el único/por defecto.
        const channels = Array.isArray(res.canalesDisponibles) ? res.canalesDisponibles : []
        if (channels.length > 1) {
          setPubChannels(channels)
          setSelectedPub(res.canalPublicacion?.id || channels[0].id)
          setPubStage(true)
          setLoading(false)
          return
        }
        onDone(res)
        return
      }
      setError(res?.error || res?.instruccion || 'No se pudo verificar el servidor')
    } catch (e) {
      setError(e.message || 'Error de conexión')
    }
    setLoading(false)
  }

  const confirmPublishChannel = async () => {
    if (!selectedPub) { setError('Elige un canal'); return }
    setError('')
    setLoading(true)
    try {
      await apiService.onboardingDiscordSetPublishChannel(canalId, selectedPub)
      onDone({ success: true })
    } catch (e) {
      setError(e.message || 'No se pudo guardar el canal de publicación')
      setLoading(false)
    }
  }

  // ── Paso 3: elegir el canal de texto donde se publican los anuncios ──
  if (pubStage) {
    return (
      <div>
        <Heading
          title="¿Dónde publicamos los anuncios?"
          subtitle="Elige el canal de texto de tu servidor donde se publicarán las campañas"
        />
        <ErrorBanner message={error} />

        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '24px' }}>
          {pubChannels.map(c => {
            const active = selectedPub === c.id
            return (
              <button
                key={c.id}
                onClick={() => setSelectedPub(c.id)}
                style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px',
                  width: '100%', textAlign: 'left', boxSizing: 'border-box',
                  background: active ? AG(0.1) : 'var(--surface)',
                  border: `1.5px solid ${active ? A : 'var(--border)'}`,
                  borderRadius: '12px', padding: '14px 16px', cursor: 'pointer',
                  fontFamily: F, transition: 'all .15s',
                }}
              >
                <span style={{ fontSize: '15px', fontWeight: 600, color: 'var(--text)' }}>#{c.name}</span>
                {active && <CheckCircle size={18} style={{ color: A }} />}
              </button>
            )
          })}
        </div>

        <PrimaryButton onClick={confirmPublishChannel} disabled={!selectedPub} loading={loading}>
          Confirmar y activar <ArrowRight size={16} />
        </PrimaryButton>
      </div>
    )
  }

  // ── Paso 2: selector de servidor (tras volver del OAuth) ──
  if (ownershipToken && guilds.length > 0) {
    return (
      <div>
        <Heading
          title="Elige tu servidor"
          subtitle="Eres administrador de estos servidores y el bot ya está instalado en ellos"
        />
        <ErrorBanner message={error} />

        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '24px' }}>
          {guilds.map(g => {
            const active = selectedGuild === g.id
            return (
              <button
                key={g.id}
                onClick={() => setSelectedGuild(g.id)}
                style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px',
                  width: '100%', textAlign: 'left', boxSizing: 'border-box',
                  background: active ? AG(0.1) : 'var(--surface)',
                  border: `1.5px solid ${active ? A : 'var(--border)'}`,
                  borderRadius: '12px', padding: '14px 16px', cursor: 'pointer',
                  fontFamily: F, transition: 'all .15s',
                }}
              >
                <span style={{ fontSize: '15px', fontWeight: 600, color: 'var(--text)' }}>{g.name}</span>
                <span style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  {g.memberCount != null && (
                    <span style={{ fontSize: '13px', color: 'var(--muted)' }}>
                      {g.memberCount.toLocaleString('es-ES')} miembros
                    </span>
                  )}
                  {active && <CheckCircle size={18} style={{ color: A }} />}
                </span>
              </button>
            )
          })}
        </div>

        <PrimaryButton onClick={handleVerify} disabled={!selectedGuild} loading={loading}>
          Activar servidor <ArrowRight size={16} />
        </PrimaryButton>
      </div>
    )
  }

  // ── Paso 1: instalar bot + iniciar OAuth de propiedad ──
  return (
    <div>
      <Heading
        title="Verifica tu servidor de Discord"
        subtitle="Instala el bot y confirma con Discord que eres su administrador"
      />
      <ErrorBanner message={error} />

      <InstructionList steps={[
        'Pulsa "Instalar bot" para añadirlo a tu servidor',
        'Selecciona tu servidor en Discord y autoriza los permisos',
        'Vuelve aquí y pulsa "Verificar propiedad con Discord"',
        'Elige el servidor y actívalo',
      ]} />

      {inviteUrl && (
        <a
          href={inviteUrl}
          target="_blank"
          rel="noopener noreferrer"
          style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
            width: '100%', padding: '12px', marginBottom: '16px', boxSizing: 'border-box',
            background: '#5865f215', border: '1px solid #5865f230',
            borderRadius: '12px', textDecoration: 'none',
            fontSize: '14px', fontWeight: 600, color: '#5865f2', fontFamily: F,
          }}
        >
          <ExternalLink size={16} /> Instalar bot en mi servidor
        </a>
      )}

      <PrimaryButton onClick={startOAuth} disabled={authLoading} loading={authLoading}>
        Verificar propiedad con Discord <ArrowRight size={16} />
      </PrimaryButton>
    </div>
  )
}

// ─── Instagram verifier ───────────────────────────────────────────────────
function InstagramVerify({ canalId }) {
  const [authUrl, setAuthUrl] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const cbError = params.get('error')
    if (cbError) {
      setError(cbError === 'instagram_denied'
        ? 'Cancelaste la autorización. Vuelve a intentarlo cuando quieras.'
        : 'No se pudo conectar Instagram. Vuelve a intentarlo.')
    }

    let cancelled = false
    apiService.onboardingInstagramAuthUrl(canalId, 'onboarding').then(res => {
      if (cancelled) return
      if (res?.success && res.authUrl) setAuthUrl(res.authUrl)
      else setError(prev => prev || res?.error || 'No se pudo generar el enlace de Instagram')
    }).catch(e => {
      if (!cancelled) setError(prev => prev || e.message || 'Error de conexión')
    }).finally(() => {
      if (!cancelled) setLoading(false)
    })
    return () => { cancelled = true }
  }, [canalId])

  return (
    <div>
      <Heading
        title="Conecta tu cuenta de Instagram"
        subtitle="Solo cuentas Business o Creator pueden verificarse"
      />
      <ErrorBanner message={error} />

      <InstructionList steps={[
        'Pulsa "Conectar Instagram" abajo',
        'Inicia sesión con tu cuenta Business o Creator',
        'Autoriza los permisos instagram_basic e instagram_manage_insights',
        'Al terminar volverás aquí con el canal activo',
      ]} />

      {loading ? (
        <div style={{ textAlign: 'center', padding: '16px', color: 'var(--muted)', fontSize: '13px' }}>
          <Loader size={18} style={{ animation: 'spin 1s linear infinite', marginRight: '8px', verticalAlign: 'middle' }} />
          Preparando enlace de Instagram...
          <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
        </div>
      ) : authUrl ? (
        <a
          href={authUrl}
          style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
            width: '100%', padding: '14px', boxSizing: 'border-box',
            background: A, color: '#fff', border: 'none',
            borderRadius: '12px', textDecoration: 'none',
            fontSize: '15px', fontWeight: 700, fontFamily: F,
            boxShadow: `0 4px 16px ${AG(0.35)}`,
          }}
        >
          <ExternalLink size={16} /> Conectar Instagram
        </a>
      ) : null}
    </div>
  )
}

// ─── WhatsApp verifier ────────────────────────────────────────────────────
function WhatsappVerify({ canalId, channelName, onDone }) {
  const [phase, setPhase] = useState('phone')
  const [phone, setPhone] = useState('')
  const [verificacionId, setVerificacionId] = useState('')
  const [otp, setOtp] = useState('')
  const [codigoCanal, setCodigoCanal] = useState('')
  const [copied, setCopied] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [focused, setFocused] = useState(null)

  const handleSendOtp = async () => {
    const p = phone.trim()
    if (!/^\+\d{8,15}$/.test(p)) {
      setError('Usa formato internacional: +34612345678')
      return
    }
    setError('')
    setLoading(true)
    try {
      const res = await apiService.onboardingWhatsappInstructions(channelName || 'canal', p, canalId)
      if (res?.success && res.verificacionId) {
        setVerificacionId(res.verificacionId)
        setPhase('otp')
      } else {
        setError(res?.error || 'No se pudo enviar el código')
      }
    } catch (e) {
      setError(e.message || 'Error de conexión')
    }
    setLoading(false)
  }

  const handleVerifyOtp = async () => {
    const code = otp.trim()
    if (!/^\d{6}$/.test(code)) {
      setError('El código debe tener 6 dígitos')
      return
    }
    setError('')
    setLoading(true)
    try {
      const res = await apiService.onboardingWhatsappVerifyOTPManual(verificacionId, code)
      if (res?.success && res.codigoCanal) {
        setCodigoCanal(res.codigoCanal)
        setPhase('publish')
      } else {
        setError(res?.error || 'Código inválido')
      }
    } catch (e) {
      setError(e.message || 'Error de conexión')
    }
    setLoading(false)
  }

  const handleConfirmPublication = async () => {
    setError('')
    setLoading(true)
    try {
      const res = await apiService.onboardingWhatsappVerify(verificacionId, canalId, 0)
      if (res?.success) onDone(res)
      else setError(res?.error || 'No se pudo completar la verificación')
    } catch (e) {
      setError(e.message || 'Error de conexión')
    }
    setLoading(false)
  }

  const handleCopy = async () => {
    try { await navigator.clipboard.writeText(codigoCanal) } catch {}
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  if (phase === 'phone') {
    return (
      <div>
        <Heading
          title="Verifica tu número de WhatsApp"
          subtitle="Te enviaremos un código por WhatsApp al número del administrador del canal"
        />
        <ErrorBanner message={error} />
        <TextInput
          label="Número de teléfono"
          value={phone}
          onChange={setPhone}
          placeholder="+34612345678"
          name="phone"
          focused={focused}
          setFocused={setFocused}
        />
        <PrimaryButton onClick={handleSendOtp} disabled={!phone.trim()} loading={loading}>
          Enviar código <ArrowRight size={16} />
        </PrimaryButton>
      </div>
    )
  }

  if (phase === 'otp') {
    return (
      <div>
        <Heading
          title="Introduce el código"
          subtitle={`Revisa WhatsApp en ${phone}. Te hemos enviado un código de 6 dígitos`}
        />
        <ErrorBanner message={error} />
        <TextInput
          label="Código de 6 dígitos"
          value={otp}
          onChange={setOtp}
          placeholder="123456"
          name="otp"
          focused={focused}
          setFocused={setFocused}
        />
        <PrimaryButton onClick={handleVerifyOtp} disabled={otp.trim().length !== 6} loading={loading}>
          Verificar código <ArrowRight size={16} />
        </PrimaryButton>
      </div>
    )
  }

  if (phase === 'publish') {
    return (
      <div>
        <Heading
          title="Publica este código en tu canal"
          subtitle="Esto confirma que eres administrador del canal de WhatsApp"
        />
        <ErrorBanner message={error} />

        <div style={{
          background: 'var(--bg)', border: `2px solid ${copied ? OK : A}`,
          borderRadius: '14px', padding: '16px', marginBottom: '16px',
          display: 'flex', alignItems: 'center', gap: '12px', transition: 'border-color .3s',
        }}>
          <span style={{
            flex: 1, fontSize: '18px', fontFamily: 'monospace', fontWeight: 700,
            color: 'var(--text)', letterSpacing: '1px',
          }}>
            {codigoCanal}
          </span>
          <button onClick={handleCopy} style={{
            background: copied ? `${OK}15` : AG(0.1),
            border: `1px solid ${copied ? `${OK}30` : AG(0.25)}`,
            borderRadius: '8px', padding: '8px 14px',
            cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px',
            fontSize: '13px', fontWeight: 600,
            color: copied ? OK : A, fontFamily: F, transition: 'all .2s',
          }}>
            {copied ? <><CheckCircle size={14} /> Copiado</> : <><Copy size={14} /> Copiar</>}
          </button>
        </div>

        <InstructionList steps={[
          'Abre tu canal de WhatsApp',
          'Publica el código exacto de arriba como un mensaje',
          'Puedes borrarlo después de completar la verificación',
          'Pulsa el botón cuando lo hayas publicado',
        ]} />

        <PrimaryButton onClick={handleConfirmPublication} loading={loading}>
          Ya lo publiqué <ArrowRight size={16} />
        </PrimaryButton>
      </div>
    )
  }

  return null
}

// ─── Unsupported platform fallback ────────────────────────────────────────
function UnsupportedPlatform({ platform }) {
  return (
    <div>
      <Heading
        title="Plataforma no soportada aún"
        subtitle={`La verificación automática para ${platform} está en desarrollo`}
      />
      <div style={{
        background: 'var(--surface)', border: '1px solid var(--border)',
        borderRadius: '12px', padding: '20px', marginBottom: '20px',
        fontSize: '14px', color: 'var(--muted)', lineHeight: 1.6,
      }}>
        Contacta con soporte en <span style={{ color: 'var(--text)', fontWeight: 600 }}>soporte@channelad.io</span> para activar tu canal manualmente. Te confirmaremos en menos de 24 horas.
      </div>
    </div>
  )
}

// ─── Main VerifyStep ──────────────────────────────────────────────────────
export default function VerifyStep() {
  const navigate = useNavigate()
  const { isAuthenticated } = useAuth()
  const { state } = useOnboarding()
  const { channelId, platform, channelName } = state

  useEffect(() => {
    if (isAuthenticated === false) navigate('/auth/register', { replace: true })
  }, [isAuthenticated])

  useEffect(() => {
    if (!channelId) navigate('/onboarding/channel', { replace: true })
  }, [channelId])

  if (!channelId || !isAuthenticated) return null

  const handleDone = () => navigate('/onboarding/success')

  switch (platform) {
    case 'telegram':
      return <TelegramVerify canalId={channelId} channelName={channelName} onDone={handleDone} />
    case 'discord':
      return <DiscordVerify canalId={channelId} onDone={handleDone} />
    case 'instagram':
      return <InstagramVerify canalId={channelId} />
    case 'whatsapp':
      return <WhatsappVerify canalId={channelId} channelName={channelName} onDone={handleDone} />
    default:
      return <UnsupportedPlatform platform={platform || 'desconocida'} />
  }
}
