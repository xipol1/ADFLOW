import React, { useState, useEffect } from 'react'
import { useParams, useNavigate, useLocation, Link } from 'react-router-dom'
import { Helmet } from 'react-helmet-async'
import { CheckCircle, Copy, Loader2, ShieldCheck, ArrowRight } from 'lucide-react'
import { useAuth } from '../../../auth/AuthContext'
import apiService from '../../../services/api'

const steps = [
  { num: 1, label: 'Identidad' },
  { num: 2, label: 'Verificacion' },
  { num: 3, label: 'Completado' },
]

// Discord callback error codes (mirrors the onboarding verify step).
const DISCORD_ERRORS = {
  discord_denied: 'Cancelaste la autorizacion. Vuelve a intentarlo cuando quieras.',
  discord_no_bot: 'No encontramos ningun servidor donde seas administrador y el bot este instalado. Instala el bot primero y vuelve a verificar.',
  discord_state_expired: 'La sesion de verificacion caduco. Vuelve a empezar.',
  discord_state_invalid: 'No pudimos validar la verificacion. Vuelve a intentarlo.',
  discord_not_configured: 'La verificacion de Discord no esta disponible ahora mismo. Contacta con soporte.',
  discord_failed: 'No se pudo completar la verificacion con Discord. Vuelve a intentarlo.',
}

// Decode a JWT payload client-side, display-only (to render the guild picker).
// The backend re-verifies the signed token + chosen guild, so this is untrusted.
function decodeJwtPayload(token) {
  try {
    const b64 = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')
    const json = decodeURIComponent(
      atob(b64).split('').map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2)).join(''),
    )
    return JSON.parse(json)
  } catch {
    return null
  }
}

function StepIndicator({ current }) {
  return (
    <div className="flex items-center justify-center gap-2 mb-8">
      {steps.map((s, i) => (
        <React.Fragment key={s.num}>
          {i > 0 && <div className="w-10 h-0.5 rounded-full" style={{ background: current > s.num ? 'var(--accent)' : 'var(--border)' }} />}
          <div className="flex flex-col items-center gap-1">
            <div
              className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-colors"
              style={{
                background: current >= s.num ? 'var(--accent)' : 'var(--bg3)',
                color: current >= s.num ? '#080C10' : 'var(--muted2)',
                border: current === s.num ? '2px solid var(--accent)' : '2px solid transparent',
              }}
            >
              {current > s.num ? <CheckCircle size={14} /> : s.num}
            </div>
            <span className="text-[10px] font-medium" style={{ color: current >= s.num ? 'var(--text)' : 'var(--muted2)' }}>{s.label}</span>
          </div>
        </React.Fragment>
      ))}
    </div>
  )
}

export default function ClaimChannelPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const location = useLocation()
  const { isAuthenticated } = useAuth()

  const [step, setStep] = useState(isAuthenticated ? 2 : 1)
  const [channel, setChannel] = useState(null)
  const [error, setError] = useState('')

  // Telegram (description-token) flow
  const [claimCode, setClaimCode] = useState('')
  const [loading, setLoading] = useState(false)
  const [verifying, setVerifying] = useState(false)
  const [copied, setCopied] = useState(false)

  // Discord (OAuth ownership) flow
  const [dToken, setDToken] = useState('')
  const [dGuilds, setDGuilds] = useState([])
  const [dSelected, setDSelected] = useState('')
  const [dLoading, setDLoading] = useState(false)

  const platform = channel?.platform

  useEffect(() => {
    const isOid = /^[a-f\d]{24}$/i.test(id)
    const fetcher = isOid ? apiService.getChannelIntelligence(id) : apiService.getChannelByUsername(id)
    fetcher.then((res) => {
      if (res?.success && res.data) {
        const d = res.data.canal || res.data
        setChannel({
          id: d.id || d._id,
          nombre: d.nombre || d.nombreCanal,
          username: d.username || d.identificadorCanal,
          platform: (d.plataforma || d.platform || '').toLowerCase(),
        })
      }
    }).catch(() => {})
  }, [id])

  useEffect(() => { if (isAuthenticated && step === 1) setStep(2) }, [isAuthenticated, step])

  // Telegram: generate the description token once we're authed on step 2.
  useEffect(() => {
    if (step !== 2 || platform !== 'telegram' || !channel?.id || !isAuthenticated) return
    setLoading(true); setError('')
    apiService.initClaim(channel.id).then((res) => {
      if (res?.success) setClaimCode(res.data.claimCode)
      else setError(res?.message || 'Error al iniciar')
    }).catch((e) => setError(e.message)).finally(() => setLoading(false))
  }, [step, platform, channel?.id, isAuthenticated])

  // Discord: on return from OAuth, read the ownership token (or error) from the URL.
  useEffect(() => {
    if (platform !== 'discord') return
    const params = new URLSearchParams(location.search)
    const cbError = params.get('error')
    if (cbError) {
      setError(params.get('reason') === 'not_admin'
        ? 'Tu cuenta de Discord no es administradora de ningun servidor. Inicia sesion con la cuenta correcta.'
        : (DISCORD_ERRORS[cbError] || 'No se pudo verificar el servidor con Discord.'))
      return
    }
    const token = params.get('discord_owner')
    if (token) {
      const payload = decodeJwtPayload(token)
      const list = Array.isArray(payload?.guilds) ? payload.guilds : []
      setDToken(token)
      setDGuilds(list)
      if (list.length === 1) setDSelected(list[0].id)
    }
  }, [platform, location.search])

  const handleVerify = async () => {
    setVerifying(true); setError('')
    try {
      const res = await apiService.verifyClaim(channel.id)
      if (res?.success && res.verified) setStep(3)
      else setError(res?.message || 'Codigo no encontrado en la descripcion')
    } catch (e) { setError(e.message) }
    setVerifying(false)
  }

  const handleCopy = () => { navigator.clipboard?.writeText(claimCode); setCopied(true); setTimeout(() => setCopied(false), 2000) }

  const discordStart = async () => {
    setDLoading(true); setError('')
    try {
      const res = await apiService.onboardingDiscordAuthUrl(channel.id, 'claim')
      if (res?.success && res.authUrl) window.location.href = res.authUrl
      else setError(res?.error || 'No se pudo iniciar la verificacion con Discord')
    } catch (e) { setError(e.message) }
    setDLoading(false)
  }

  const discordVerify = async () => {
    if (!dSelected) { setError('Elige un servidor'); return }
    setVerifying(true); setError('')
    try {
      const res = await apiService.onboardingDiscordVerify(dSelected, channel.id, dToken)
      if (res?.success) setStep(3)
      else setError(res?.error || 'No se pudo verificar el servidor')
    } catch (e) { setError(e.message) }
    setVerifying(false)
  }

  const card = 'rounded-xl p-6 sm:p-8'
  const errorBox = error && (
    <div className="rounded-lg px-4 py-3 text-sm mb-4" style={{ background: 'var(--red-dim)', border: '1px solid rgba(248,81,73,0.2)', color: 'var(--red)' }}>{error}</div>
  )

  return (
    <div className="min-h-screen" style={{ background: 'var(--bg)', fontFamily: 'var(--font-sans)' }}>
      <Helmet><title>Reclamar canal · Channelad</title></Helmet>

      <div className="max-w-lg mx-auto px-4 py-12">
        <h1 className="text-xl font-bold text-center mb-1" style={{ color: 'var(--text)' }}>Reclamar canal</h1>
        <p className="text-sm text-center mb-8" style={{ color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)' }}>
          {channel ? (channel.nombre || `@${(channel.username || '').replace(/^@/, '')}`) : '...'}
        </p>

        <StepIndicator current={step} />

        {/* Step 1 — Auth */}
        {step === 1 && (
          <div className={card} style={{ background: 'var(--surface)', border: '1px solid var(--border)', textAlign: 'center' }}>
            <ShieldCheck size={36} style={{ color: 'var(--accent)', margin: '0 auto 16px' }} />
            <h2 className="text-lg font-semibold mb-2" style={{ color: 'var(--text)' }}>Verifica tu identidad</h2>
            <p className="text-sm mb-6" style={{ color: 'var(--text-secondary)' }}>Necesitas una cuenta en ChannelAd para reclamar este canal.</p>
            <div className="flex gap-3 justify-center">
              <Link to="/auth/login" className="px-5 py-2.5 rounded-lg text-sm font-semibold" style={{ background: 'var(--accent)', color: '#080C10' }}>Iniciar sesion</Link>
              <Link to="/auth/register" className="px-5 py-2.5 rounded-lg text-sm font-semibold" style={{ border: '1px solid var(--border)', color: 'var(--text)' }}>Registrarse</Link>
            </div>
          </div>
        )}

        {/* Step 2 — loading channel */}
        {step === 2 && !channel && (
          <div className={card} style={{ background: 'var(--surface)', border: '1px solid var(--border)', textAlign: 'center' }}>
            <Loader2 size={24} className="animate-spin mx-auto mb-3" style={{ color: 'var(--accent)' }} />
            <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>Cargando canal...</p>
          </div>
        )}

        {/* Step 2 — Telegram: description token */}
        {step === 2 && platform === 'telegram' && (
          <div className={card} style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
            {loading ? (
              <div className="text-center py-8">
                <Loader2 size={24} className="animate-spin mx-auto mb-3" style={{ color: 'var(--accent)' }} />
                <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>Generando codigo...</p>
              </div>
            ) : (
              <>
                <h2 className="text-lg font-semibold mb-5 text-center" style={{ color: 'var(--text)' }}>Anade el codigo de verificacion</h2>

                <div className="rounded-lg p-4 mb-5" style={{ background: 'var(--bg)', border: '1px solid var(--accent-border)' }}>
                  <p className="text-[11px] font-medium mb-2" style={{ color: 'var(--text-secondary)' }}>Anade este texto en la descripcion de tu canal de Telegram:</p>
                  <div className="flex items-center gap-2 rounded-md px-3 py-2.5" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
                    <code className="flex-1 text-sm font-semibold break-all" style={{ color: 'var(--accent)', fontFamily: 'var(--font-mono)' }}>{claimCode}</code>
                    <button onClick={handleCopy} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, color: copied ? 'var(--accent)' : 'var(--muted2)', flexShrink: 0 }}>
                      {copied ? <CheckCircle size={16} /> : <Copy size={16} />}
                    </button>
                  </div>
                </div>

                <ol className="text-sm leading-7 mb-6 pl-5 list-decimal" style={{ color: 'var(--text-secondary)' }}>
                  <li>Abre tu canal <strong>@{(channel?.username || '').replace(/^@/, '')}</strong> en Telegram</li>
                  <li>Edita la descripcion del canal</li>
                  <li>Pega el codigo en cualquier parte</li>
                  <li>Guarda y vuelve aqui</li>
                </ol>

                {errorBox}

                <button
                  onClick={handleVerify}
                  disabled={verifying}
                  className="w-full py-3 rounded-lg text-sm font-bold flex items-center justify-center gap-2 transition-all"
                  style={{ background: 'var(--accent)', color: '#080C10', border: 'none', cursor: verifying ? 'not-allowed' : 'pointer', opacity: verifying ? 0.7 : 1 }}
                >
                  {verifying ? <><Loader2 size={14} className="animate-spin" /> Verificando...</> : <>Ya lo anadi, verificar <ArrowRight size={14} /></>}
                </button>
              </>
            )}
          </div>
        )}

        {/* Step 2 — Discord: OAuth ownership proof */}
        {step === 2 && platform === 'discord' && (
          <div className={card} style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
            {dToken && dGuilds.length > 0 ? (
              <>
                <h2 className="text-lg font-semibold mb-2 text-center" style={{ color: 'var(--text)' }}>Elige tu servidor</h2>
                <p className="text-sm mb-5 text-center" style={{ color: 'var(--text-secondary)' }}>Confirmamos que eres administrador de estos servidores y que el bot esta dentro.</p>

                <div className="flex flex-col gap-2 mb-5">
                  {dGuilds.map((g) => {
                    const active = dSelected === g.id
                    return (
                      <button
                        key={g.id}
                        onClick={() => setDSelected(g.id)}
                        className="text-left px-4 py-3 rounded-lg text-sm font-medium transition-colors"
                        style={{ background: active ? 'var(--accent-dim)' : 'var(--bg)', border: `1px solid ${active ? 'var(--accent)' : 'var(--border)'}`, color: 'var(--text)', cursor: 'pointer' }}
                      >
                        {g.name}{g.memberCount ? <span style={{ color: 'var(--muted2)' }}> · {g.memberCount} miembros</span> : null}
                      </button>
                    )
                  })}
                </div>

                {errorBox}

                <button
                  onClick={discordVerify}
                  disabled={!dSelected || verifying}
                  className="w-full py-3 rounded-lg text-sm font-bold flex items-center justify-center gap-2 transition-all"
                  style={{ background: 'var(--accent)', color: '#080C10', border: 'none', cursor: (!dSelected || verifying) ? 'not-allowed' : 'pointer', opacity: (!dSelected || verifying) ? 0.7 : 1 }}
                >
                  {verifying ? <><Loader2 size={14} className="animate-spin" /> Reclamando...</> : <>Reclamar este servidor <ArrowRight size={14} /></>}
                </button>
              </>
            ) : (
              <>
                <ShieldCheck size={36} style={{ color: 'var(--accent)', margin: '0 auto 16px' }} />
                <h2 className="text-lg font-semibold mb-2 text-center" style={{ color: 'var(--text)' }}>Verifica que eres administrador</h2>
                <ol className="text-sm leading-7 mb-6 pl-5 list-decimal" style={{ color: 'var(--text-secondary)' }}>
                  <li>Instala primero nuestro bot en tu servidor</li>
                  <li>Pulsa "Verificar propiedad con Discord"</li>
                  <li>Autoriza el acceso de solo lectura a tus servidores</li>
                  <li>Elige el servidor que quieres reclamar</li>
                </ol>

                {errorBox}

                <button
                  onClick={discordStart}
                  disabled={dLoading}
                  className="w-full py-3 rounded-lg text-sm font-bold flex items-center justify-center gap-2 transition-all"
                  style={{ background: 'var(--accent)', color: '#080C10', border: 'none', cursor: dLoading ? 'not-allowed' : 'pointer', opacity: dLoading ? 0.7 : 1 }}
                >
                  {dLoading ? <><Loader2 size={14} className="animate-spin" /> Abriendo Discord...</> : <>Verificar propiedad con Discord <ArrowRight size={14} /></>}
                </button>
              </>
            )}
          </div>
        )}

        {/* Step 2 — other platforms: claim not wired yet */}
        {step === 2 && channel && !['telegram', 'discord'].includes(platform) && (
          <div className={card} style={{ background: 'var(--surface)', border: '1px solid var(--border)', textAlign: 'center' }}>
            <ShieldCheck size={36} style={{ color: 'var(--muted2)', margin: '0 auto 16px' }} />
            <h2 className="text-lg font-semibold mb-2" style={{ color: 'var(--text)' }}>Reclamacion no disponible todavia</h2>
            <p className="text-sm mb-6" style={{ color: 'var(--text-secondary)' }}>
              Aun no podemos verificar la propiedad de canales de esta plataforma de forma automatica. Registrate y te ayudamos a conectarlo manualmente.
            </p>
            <Link to="/para-canales" className="inline-block px-6 py-3 rounded-lg text-sm font-bold" style={{ background: 'var(--accent)', color: '#080C10' }}>Empezar en Channelad</Link>
          </div>
        )}

        {/* Step 3 — Success */}
        {step === 3 && (
          <div className={card} style={{ background: 'var(--surface)', border: '1px solid var(--accent-border)', textAlign: 'center' }}>
            <div className="w-16 h-16 rounded-full mx-auto mb-4 flex items-center justify-center" style={{ background: 'var(--accent-dim)' }}>
              <CheckCircle size={32} style={{ color: 'var(--accent)' }} />
            </div>
            <h2 className="text-xl font-bold mb-2" style={{ color: 'var(--text)' }}>Canal reclamado</h2>
            <p className="text-sm mb-6" style={{ color: 'var(--text-secondary)' }}>
              Ya puedes gestionar la publicidad de tu canal desde el dashboard.
              {platform === 'telegram' ? ' Puedes eliminar el codigo de la descripcion.' : ''}
            </p>
            <button
              onClick={() => navigate('/creator/channels')}
              className="px-6 py-3 rounded-lg text-sm font-bold"
              style={{ background: 'var(--accent)', color: '#080C10', border: 'none', cursor: 'pointer' }}
            >
              Ir a mi dashboard →
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
