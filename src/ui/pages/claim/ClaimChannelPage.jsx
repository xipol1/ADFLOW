import React, { useState, useEffect } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { Helmet } from 'react-helmet-async'
import { CheckCircle, Copy, Loader2, ShieldCheck, ArrowRight } from 'lucide-react'
import { useAuth } from '../../auth/AuthContext'
import apiService from '../../../../services/api'
import { C } from '../../theme/tokens'

const FONT = "'DM Sans', 'Inter', system-ui, sans-serif"

const steps = [
  { num: 1, label: 'Identidad' },
  { num: 2, label: 'Verificacion' },
  { num: 3, label: 'Completado' },
]

function StepIndicator({ current }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, marginBottom: 32 }}>
      {steps.map((s, i) => (
        <React.Fragment key={s.num}>
          {i > 0 && (
            <div style={{ width: 40, height: 2, background: current > s.num ? C.teal : C.border }} />
          )}
          <div
            style={{
              width: 32,
              height: 32,
              borderRadius: 999,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 13,
              fontWeight: 700,
              background: current >= s.num ? C.teal : C.surfaceEl,
              color: current >= s.num ? '#fff' : C.t3,
              border: current === s.num ? `2px solid ${C.teal}` : '2px solid transparent',
            }}
          >
            {current > s.num ? <CheckCircle size={16} /> : s.num}
          </div>
        </React.Fragment>
      ))}
    </div>
  )
}

export default function ClaimChannelPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { isAuthenticated, user } = useAuth()

  const [step, setStep] = useState(isAuthenticated ? 2 : 1)
  const [channel, setChannel] = useState(null)
  const [claimCode, setClaimCode] = useState('')
  const [loading, setLoading] = useState(false)
  const [verifying, setVerifying] = useState(false)
  const [error, setError] = useState('')
  const [copied, setCopied] = useState(false)

  // Resolve channel (id or username)
  useEffect(() => {
    const isOid = /^[a-f\d]{24}$/i.test(id)
    const fetcher = isOid
      ? apiService.getChannelIntelligence(id)
      : apiService.getChannelByUsername(id)

    fetcher.then((res) => {
      if (res?.success && res.data) {
        const d = res.data.canal || res.data
        setChannel({ id: d.id || d._id, nombre: d.nombre || d.nombreCanal, username: d.username || d.identificadorCanal })
      }
    }).catch(() => {})
  }, [id])

  // Auto-advance to step 2 when authenticated
  useEffect(() => {
    if (isAuthenticated && step === 1) setStep(2)
  }, [isAuthenticated, step])

  // Init claim when entering step 2
  useEffect(() => {
    if (step !== 2 || !channel?.id || !isAuthenticated) return
    setLoading(true)
    setError('')

    apiService.initClaim(channel.id).then((res) => {
      if (res?.success) {
        setClaimCode(res.data.claimCode)
      } else {
        setError(res?.message || 'Error al iniciar la reclamacion')
      }
    }).catch((err) => {
      setError(err.message || 'Error de conexion')
    }).finally(() => setLoading(false))
  }, [step, channel?.id, isAuthenticated])

  const handleVerify = async () => {
    setVerifying(true)
    setError('')
    try {
      const res = await apiService.verifyClaim(channel.id)
      if (res?.success && res.verified) {
        setStep(3)
      } else {
        setError(res?.message || 'Codigo no encontrado en la descripcion')
      }
    } catch (err) {
      setError(err.message || 'Error de verificacion')
    }
    setVerifying(false)
  }

  const handleCopy = () => {
    navigator.clipboard?.writeText(claimCode)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div style={{ fontFamily: FONT, minHeight: '100vh', background: C.bg }}>
      <Helmet>
        <title>Reclamar canal · Channelad</title>
      </Helmet>

      <div style={{ maxWidth: 540, margin: '0 auto', padding: '48px 24px' }}>
        <h1 style={{ fontSize: 24, fontWeight: 800, color: C.t1, textAlign: 'center', marginBottom: 8 }}>
          Reclamar canal
        </h1>
        <p style={{ fontSize: 14, color: C.t2, textAlign: 'center', marginBottom: 32 }}>
          {channel ? `@${(channel.username || '').replace(/^@/, '')}` : '...'}
        </p>

        <StepIndicator current={step} />

        {/* ── STEP 1: Auth ──────────────────────────────────────── */}
        {step === 1 && (
          <div style={{
            background: C.surface, border: `1px solid ${C.border}`, borderRadius: 16, padding: 32, textAlign: 'center',
          }}>
            <ShieldCheck size={40} color={C.teal} style={{ marginBottom: 16 }} />
            <h2 style={{ fontSize: 18, fontWeight: 700, color: C.t1, marginBottom: 8 }}>
              Verifica tu identidad
            </h2>
            <p style={{ fontSize: 13, color: C.t2, marginBottom: 24 }}>
              Necesitas una cuenta en ChannelAd para reclamar este canal.
            </p>
            <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
              <Link
                to="/auth/login"
                style={{
                  padding: '10px 24px', borderRadius: 10, background: C.teal,
                  color: '#fff', fontSize: 14, fontWeight: 600, textDecoration: 'none',
                }}
              >
                Iniciar sesion
              </Link>
              <Link
                to="/auth/register"
                style={{
                  padding: '10px 24px', borderRadius: 10, border: `1px solid ${C.border}`,
                  background: 'transparent', color: C.t1, fontSize: 14, fontWeight: 600, textDecoration: 'none',
                }}
              >
                Registrarse
              </Link>
            </div>
          </div>
        )}

        {/* ── STEP 2: Verify ────────────────────────────────────── */}
        {step === 2 && (
          <div style={{
            background: C.surface, border: `1px solid ${C.border}`, borderRadius: 16, padding: 32,
          }}>
            {loading ? (
              <div style={{ textAlign: 'center', padding: '24px 0' }}>
                <Loader2 size={24} color={C.teal} className="animate-spin" />
                <p style={{ color: C.t2, fontSize: 13, marginTop: 12 }}>Generando codigo de verificacion...</p>
              </div>
            ) : (
              <>
                <h2 style={{ fontSize: 18, fontWeight: 700, color: C.t1, marginBottom: 16, textAlign: 'center' }}>
                  Anade el codigo de verificacion
                </h2>

                <div style={{
                  background: C.bg, border: `1px solid ${C.teal}33`, borderRadius: 12, padding: 16, marginBottom: 20,
                }}>
                  <p style={{ fontSize: 12, color: C.t3, marginBottom: 8 }}>
                    Anade este texto en la descripcion de tu canal de Telegram:
                  </p>
                  <div style={{
                    display: 'flex', alignItems: 'center', gap: 8,
                    background: C.surfaceEl, borderRadius: 8, padding: '10px 14px',
                  }}>
                    <code style={{ flex: 1, fontSize: 14, fontWeight: 600, color: C.teal, wordBreak: 'break-all' }}>
                      {claimCode}
                    </code>
                    <button
                      onClick={handleCopy}
                      style={{
                        background: 'none', border: 'none', cursor: 'pointer', padding: 4,
                        color: copied ? C.ok : C.t3, flexShrink: 0,
                      }}
                    >
                      {copied ? <CheckCircle size={18} /> : <Copy size={18} />}
                    </button>
                  </div>
                </div>

                <ol style={{ fontSize: 13, color: C.t2, lineHeight: 1.8, paddingLeft: 20, marginBottom: 24 }}>
                  <li>Abre tu canal en Telegram</li>
                  <li>Edita la descripcion del canal</li>
                  <li>Pega el codigo en cualquier parte</li>
                  <li>Guarda y vuelve aqui</li>
                </ol>

                {error && (
                  <div style={{
                    background: `${C.alert}15`, border: `1px solid ${C.alert}30`,
                    borderRadius: 10, padding: '10px 14px', marginBottom: 16,
                    fontSize: 13, color: C.alert,
                  }}>
                    {error}
                  </div>
                )}

                <button
                  onClick={handleVerify}
                  disabled={verifying}
                  style={{
                    width: '100%', padding: '12px 0', borderRadius: 10, border: 'none',
                    background: C.teal, color: '#fff', fontSize: 15, fontWeight: 700,
                    cursor: verifying ? 'not-allowed' : 'pointer', fontFamily: FONT,
                    opacity: verifying ? 0.7 : 1, display: 'flex', alignItems: 'center',
                    justifyContent: 'center', gap: 8,
                  }}
                >
                  {verifying ? (
                    <><Loader2 size={16} className="animate-spin" /> Verificando...</>
                  ) : (
                    <>Ya lo anadi, verificar <ArrowRight size={16} /></>
                  )}
                </button>
              </>
            )}
          </div>
        )}

        {/* ── STEP 3: Success ───────────────────────────────────── */}
        {step === 3 && (
          <div style={{
            background: C.surface, border: `1px solid ${C.ok}33`, borderRadius: 16, padding: 32, textAlign: 'center',
          }}>
            <div style={{
              width: 64, height: 64, borderRadius: 999, background: `${C.ok}15`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              margin: '0 auto 16px',
            }}>
              <CheckCircle size={32} color={C.ok} />
            </div>
            <h2 style={{ fontSize: 20, fontWeight: 700, color: C.t1, marginBottom: 8 }}>
              Canal reclamado
            </h2>
            <p style={{ fontSize: 14, color: C.t2, marginBottom: 24 }}>
              Ya puedes gestionar la publicidad de tu canal desde el dashboard.
              Puedes eliminar el codigo de la descripcion.
            </p>
            <button
              onClick={() => navigate('/creator/channels')}
              style={{
                padding: '12px 32px', borderRadius: 10, border: 'none',
                background: C.teal, color: '#fff', fontSize: 15, fontWeight: 700,
                cursor: 'pointer', fontFamily: FONT,
              }}
            >
              Ir al dashboard →
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
