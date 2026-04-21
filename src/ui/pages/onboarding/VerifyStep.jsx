import React, { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { Copy, CheckCircle, ExternalLink, ArrowRight, Loader } from 'lucide-react'
import apiService from '../../../../services/api'
import { useOnboarding } from './OnboardingContext'

const A = '#8b5cf6'
const AD = '#7c3aed'
const AG = (o) => `rgba(139,92,246,${o})`
const OK = '#10b981'
const F = "'Inter', system-ui, sans-serif"
const D = "'Sora', system-ui, sans-serif"

const PLATFORM_LINKS = {
  telegram: (url) => `https://t.me/share/url?url=${encodeURIComponent(url)}&text=${encodeURIComponent('Check this out \uD83D\uDC40')}`,
  whatsapp: (url) => `https://wa.me/?text=${encodeURIComponent(url)}`,
  discord: null,
  instagram: null,
}

// ─── Sub-state: Intro ────────────────────────────────────────────────────
function IntroView({ onGenerate, loading }) {
  return (
    <div>
      <h1 style={{ fontFamily: D, fontSize: '28px', fontWeight: 700, letterSpacing: '-0.03em', color: 'var(--text)', marginBottom: '8px', textAlign: 'center' }}>
        Verifica tu canal
      </h1>
      <p style={{ fontSize: '15px', color: 'var(--muted)', marginBottom: '32px', textAlign: 'center' }}>
        Confirma que tu canal tiene audiencia real
      </p>

      <div style={{
        background: 'var(--surface)', border: '1px solid var(--border)',
        borderRadius: '16px', padding: '28px', marginBottom: '28px',
      }}>
        {[
          { num: '1', text: 'Generamos un enlace unico para ti' },
          { num: '2', text: 'Lo publicas en tu canal' },
          { num: '3', text: '3 personas hacen clic y listo' },
        ].map(({ num, text }) => (
          <div key={num} style={{ display: 'flex', alignItems: 'center', gap: '16px', padding: '12px 0', borderBottom: num !== '3' ? '1px solid var(--border)' : 'none' }}>
            <div style={{
              width: '32px', height: '32px', borderRadius: '50%',
              background: AG(0.12), border: `1px solid ${AG(0.25)}`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '14px', fontWeight: 700, color: A, flexShrink: 0,
            }}>
              {num}
            </div>
            <span style={{ fontSize: '14px', color: 'var(--text)', lineHeight: 1.4 }}>{text}</span>
          </div>
        ))}
      </div>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', marginBottom: '24px' }}>
        <span style={{ fontSize: '13px', color: 'var(--muted)' }}>Tarda menos de 60 segundos</span>
      </div>

      <button
        onClick={onGenerate}
        disabled={loading}
        style={{
          width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
          background: loading ? AG(0.3) : A, color: '#fff', border: 'none',
          borderRadius: '12px', padding: '14px', fontSize: '15px', fontWeight: 700,
          cursor: loading ? 'not-allowed' : 'pointer', fontFamily: F,
          boxShadow: `0 4px 16px ${AG(0.35)}`, transition: 'all .2s',
        }}
        onMouseEnter={e => { if (!loading) e.currentTarget.style.background = AD }}
        onMouseLeave={e => { if (!loading) e.currentTarget.style.background = A }}
      >
        {loading ? <><Loader size={16} style={{ animation: 'spin 1s linear infinite' }} /> Generando...</> : <>Generar mi enlace <ArrowRight size={16} /></>}
      </button>

      <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
    </div>
  )
}

// ─── Sub-state: Action (copy link + post) ────────────────────────────────
function ActionView({ trackingUrl, platform, onPosted }) {
  const [copied, setCopied] = useState(false)

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(trackingUrl)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      const ta = document.createElement('textarea')
      ta.value = trackingUrl
      document.body.appendChild(ta)
      ta.select()
      document.execCommand('copy')
      document.body.removeChild(ta)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  const shareLink = PLATFORM_LINKS[platform]?.(trackingUrl)

  return (
    <div>
      <h1 style={{ fontFamily: D, fontSize: '28px', fontWeight: 700, letterSpacing: '-0.03em', color: 'var(--text)', marginBottom: '8px', textAlign: 'center' }}>
        Publica este enlace
      </h1>
      <p style={{ fontSize: '15px', color: 'var(--muted)', marginBottom: '28px', textAlign: 'center' }}>
        Comparte este enlace en tu canal para verificarlo
      </p>

      {/* Link display */}
      <div style={{
        background: 'var(--bg)', border: `2px solid ${copied ? OK : A}`,
        borderRadius: '14px', padding: '16px', marginBottom: '16px',
        display: 'flex', alignItems: 'center', gap: '12px',
        transition: 'border-color .3s',
      }}>
        <span style={{
          flex: 1, fontSize: '14px', fontFamily: 'monospace',
          color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        }}>
          {trackingUrl}
        </span>
        <button onClick={handleCopy} style={{
          background: copied ? `${OK}15` : AG(0.1),
          border: `1px solid ${copied ? `${OK}30` : AG(0.25)}`,
          borderRadius: '8px', padding: '8px 14px',
          cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px',
          fontSize: '13px', fontWeight: 600,
          color: copied ? OK : A, fontFamily: F,
          transition: 'all .2s', whiteSpace: 'nowrap',
        }}>
          {copied ? <><CheckCircle size={14} /> Copiado</> : <><Copy size={14} /> Copiar</>}
        </button>
      </div>

      {/* Suggested message */}
      <div style={{
        background: 'var(--surface)', borderRadius: '10px', padding: '12px 16px',
        fontSize: '13px', color: 'var(--muted)', marginBottom: '24px', lineHeight: 1.5,
      }}>
        Escribe algo como: <span style={{ color: 'var(--text)' }}>"Mira esto \uD83D\uDC40"</span> y pega el enlace
      </div>

      {/* Platform deep-link */}
      {shareLink && (
        <a
          href={shareLink}
          target="_blank"
          rel="noopener noreferrer"
          style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
            width: '100%', padding: '12px', marginBottom: '12px',
            background: platform === 'telegram' ? '#2aabee15' : '#25d36615',
            border: `1px solid ${platform === 'telegram' ? '#2aabee30' : '#25d36630'}`,
            borderRadius: '12px', textDecoration: 'none',
            fontSize: '14px', fontWeight: 600,
            color: platform === 'telegram' ? '#2aabee' : '#25d366',
            fontFamily: F,
          }}
        >
          <ExternalLink size={16} />
          Abrir {platform === 'telegram' ? 'Telegram' : 'WhatsApp'}
        </a>
      )}

      <button
        onClick={onPosted}
        style={{
          width: '100%', background: A, color: '#fff', border: 'none',
          borderRadius: '12px', padding: '14px', fontSize: '15px', fontWeight: 700,
          cursor: 'pointer', fontFamily: F, transition: 'all .2s',
          boxShadow: `0 4px 16px ${AG(0.35)}`,
        }}
        onMouseEnter={e => e.currentTarget.style.background = AD}
        onMouseLeave={e => e.currentTarget.style.background = A}
      >
        Ya lo publique
      </button>

      <p style={{ fontSize: '12px', color: 'var(--muted2)', textAlign: 'center', marginTop: '16px' }}>
        El enlace expira en 48 horas
      </p>
    </div>
  )
}

// ─── Sub-state: Progress (live counter) ──────────────────────────────────
function ProgressView({ uniqueClicks, minClicks, clicks, trackingUrl }) {
  const [copied, setCopied] = useState(false)
  const pct = Math.min((uniqueClicks / minClicks) * 100, 100)

  const handleCopy = async () => {
    try { await navigator.clipboard.writeText(trackingUrl) } catch {}
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  return (
    <div>
      <h1 style={{ fontFamily: D, fontSize: '28px', fontWeight: 700, letterSpacing: '-0.03em', color: 'var(--text)', marginBottom: '8px', textAlign: 'center' }}>
        Esperando clicks...
      </h1>
      <p style={{ fontSize: '15px', color: 'var(--muted)', marginBottom: '32px', textAlign: 'center' }}>
        Tu audiencia esta haciendo clic en el enlace
      </p>

      {/* Big counter */}
      <div style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center',
        background: 'var(--surface)', border: '1px solid var(--border)',
        borderRadius: '20px', padding: '32px', marginBottom: '24px',
      }}>
        <div style={{ fontSize: '56px', fontWeight: 800, fontFamily: D, color: uniqueClicks >= minClicks ? OK : A, lineHeight: 1, marginBottom: '4px' }}>
          {uniqueClicks}
        </div>
        <div style={{ fontSize: '16px', color: 'var(--muted)', marginBottom: '20px' }}>
          de {minClicks} clicks necesarios
        </div>

        {/* Progress bar */}
        <div style={{ width: '100%', height: '8px', background: 'var(--bg)', borderRadius: '4px', overflow: 'hidden' }}>
          <div style={{
            width: `${pct}%`, height: '100%',
            background: uniqueClicks >= minClicks ? OK : A,
            borderRadius: '4px',
            transition: 'width .5s ease, background .3s',
          }} />
        </div>
      </div>

      {/* Click list */}
      <div style={{ marginBottom: '24px' }}>
        {Array.from({ length: minClicks }, (_, i) => {
          const click = clicks[i]
          const done = i < uniqueClicks
          return (
            <div key={i} style={{
              display: 'flex', alignItems: 'center', gap: '12px',
              padding: '10px 0',
              borderBottom: i < minClicks - 1 ? '1px solid var(--border)' : 'none',
            }}>
              <div style={{
                width: '24px', height: '24px', borderRadius: '50%',
                background: done ? `${OK}15` : 'var(--bg)',
                border: `1.5px solid ${done ? OK : 'var(--border)'}`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                transition: 'all .3s',
              }}>
                {done && <CheckCircle size={14} color={OK} />}
              </div>
              <span style={{ fontSize: '14px', color: done ? 'var(--text)' : 'var(--muted2)', flex: 1 }}>
                Click {i + 1}
              </span>
              {click && (
                <span style={{ fontSize: '12px', color: 'var(--muted)' }}>
                  {click.device === 'mobile' ? '\uD83D\uDCF1' : '\uD83D\uDCBB'} {timeAgo(click.timestamp)}
                </span>
              )}
              {!done && (
                <span style={{ fontSize: '12px', color: 'var(--muted2)' }}>esperando...</span>
              )}
            </div>
          )
        })}
      </div>

      {/* Re-copy link */}
      <button onClick={handleCopy} style={{
        width: '100%', background: 'var(--surface)', border: '1px solid var(--border)',
        borderRadius: '10px', padding: '10px', cursor: 'pointer',
        fontSize: '13px', color: copied ? OK : 'var(--muted)',
        fontFamily: F, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
      }}>
        {copied ? <><CheckCircle size={14} /> Enlace copiado</> : <><Copy size={14} /> Copiar enlace de nuevo</>}
      </button>

      <p style={{ fontSize: '12px', color: 'var(--muted2)', textAlign: 'center', marginTop: '16px' }}>
        Verificando cada 5 segundos
      </p>
    </div>
  )
}

function timeAgo(ts) {
  const s = Math.floor((Date.now() - new Date(ts).getTime()) / 1000)
  if (s < 5) return 'ahora'
  if (s < 60) return `hace ${s}s`
  const m = Math.floor(s / 60)
  if (m < 60) return `hace ${m}m`
  return `hace ${Math.floor(m / 60)}h`
}

// ─── Main VerifyStep ─────────────────────────────────────────────────────
export default function VerifyStep() {
  const navigate = useNavigate()
  const { state, dispatch } = useOnboarding()
  const { channelId, platform, trackingUrl } = state

  const [phase, setPhase] = useState(trackingUrl ? 'action' : 'intro')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  // Redirect if no channel
  useEffect(() => {
    if (!channelId) navigate('/onboarding/channel', { replace: true })
  }, [channelId])

  // Generate verification link
  const handleGenerate = async () => {
    setLoading(true)
    setError('')
    try {
      const res = await apiService.createVerificationLink(channelId)
      if (res?.success && res.data) {
        dispatch({
          type: 'SET_VERIFY_LINK',
          payload: {
            trackingUrl: res.data.trackingUrl,
            trackingCode: res.data.code,
            minClicks: res.data.verification?.minClicks || 3,
          },
        })
        setPhase('action')
      } else {
        setError(res?.message || 'Error generando enlace')
      }
    } catch {
      setError('Error de conexion')
    }
    setLoading(false)
  }

  // Move to progress phase
  const handlePosted = () => setPhase('progress')

  // Poll verification status
  useEffect(() => {
    if (phase !== 'progress' || !channelId) return
    let active = true

    const poll = async () => {
      try {
        const res = await apiService.checkVerificationStatus(channelId)
        if (!active) return
        if (res?.success && res.data) {
          dispatch({
            type: 'UPDATE_VERIFICATION',
            payload: {
              status: res.data.status || res.data.verification?.status,
              uniqueClicks: res.data.stats?.uniqueClicks || 0,
              clicks: res.data.recentClicks || [],
            },
          })
          if (res.data.status === 'verified' || res.data.verification?.status === 'verified') {
            setTimeout(() => {
              if (active) navigate('/onboarding/success')
            }, 1500)
          }
        }
      } catch {}
    }

    poll()
    const interval = setInterval(poll, 5000)
    return () => { active = false; clearInterval(interval) }
  }, [phase, channelId])

  if (!channelId) return null

  return (
    <div>
      {error && (
        <div style={{
          background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)',
          borderRadius: '10px', padding: '12px 16px', marginBottom: '20px',
          fontSize: '13px', color: '#ef4444',
        }}>{error}</div>
      )}

      {phase === 'intro' && <IntroView onGenerate={handleGenerate} loading={loading} />}
      {phase === 'action' && <ActionView trackingUrl={state.trackingUrl} platform={platform} onPosted={handlePosted} />}
      {phase === 'progress' && (
        <ProgressView
          uniqueClicks={state.uniqueClicks}
          minClicks={state.minClicks}
          clicks={state.clicks}
          trackingUrl={state.trackingUrl}
        />
      )}
    </div>
  )
}
