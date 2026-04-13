import React, { useState, useEffect } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { Helmet } from 'react-helmet-async'
import { CheckCircle, Copy, Loader2, ShieldCheck, ArrowRight } from 'lucide-react'
import { useAuth } from '../../../auth/AuthContext'
import apiService from '../../../../services/api'

const steps = [
  { num: 1, label: 'Identidad' },
  { num: 2, label: 'Verificacion' },
  { num: 3, label: 'Completado' },
]

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
  const { isAuthenticated } = useAuth()

  const [step, setStep] = useState(isAuthenticated ? 2 : 1)
  const [channel, setChannel] = useState(null)
  const [claimCode, setClaimCode] = useState('')
  const [loading, setLoading] = useState(false)
  const [verifying, setVerifying] = useState(false)
  const [error, setError] = useState('')
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    const isOid = /^[a-f\d]{24}$/i.test(id)
    const fetcher = isOid ? apiService.getChannelIntelligence(id) : apiService.getChannelByUsername(id)
    fetcher.then((res) => {
      if (res?.success && res.data) {
        const d = res.data.canal || res.data
        setChannel({ id: d.id || d._id, nombre: d.nombre || d.nombreCanal, username: d.username || d.identificadorCanal })
      }
    }).catch(() => {})
  }, [id])

  useEffect(() => { if (isAuthenticated && step === 1) setStep(2) }, [isAuthenticated, step])

  useEffect(() => {
    if (step !== 2 || !channel?.id || !isAuthenticated) return
    setLoading(true); setError('')
    apiService.initClaim(channel.id).then((res) => {
      if (res?.success) setClaimCode(res.data.claimCode)
      else setError(res?.message || 'Error al iniciar')
    }).catch((e) => setError(e.message)).finally(() => setLoading(false))
  }, [step, channel?.id, isAuthenticated])

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

  const card = 'rounded-xl p-6 sm:p-8'

  return (
    <div className="min-h-screen" style={{ background: 'var(--bg)', fontFamily: 'var(--font-sans)' }}>
      <Helmet><title>Reclamar canal · Channelad</title></Helmet>

      <div className="max-w-lg mx-auto px-4 py-12">
        <h1 className="text-xl font-bold text-center mb-1" style={{ color: 'var(--text)' }}>Reclamar canal</h1>
        <p className="text-sm text-center mb-8" style={{ color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)' }}>
          {channel ? `@${(channel.username || '').replace(/^@/, '')}` : '...'}
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

        {/* Step 2 — Verify */}
        {step === 2 && (
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

                {error && (
                  <div className="rounded-lg px-4 py-3 text-sm mb-4" style={{ background: 'var(--red-dim)', border: '1px solid rgba(248,81,73,0.2)', color: 'var(--red)' }}>{error}</div>
                )}

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

        {/* Step 3 — Success */}
        {step === 3 && (
          <div className={card} style={{ background: 'var(--surface)', border: '1px solid var(--accent-border)', textAlign: 'center' }}>
            <div className="w-16 h-16 rounded-full mx-auto mb-4 flex items-center justify-center" style={{ background: 'var(--accent-dim)' }}>
              <CheckCircle size={32} style={{ color: 'var(--accent)' }} />
            </div>
            <h2 className="text-xl font-bold mb-2" style={{ color: 'var(--text)' }}>Canal reclamado</h2>
            <p className="text-sm mb-6" style={{ color: 'var(--text-secondary)' }}>
              Ya puedes gestionar la publicidad de tu canal desde el dashboard. Puedes eliminar el codigo de la descripcion.
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
