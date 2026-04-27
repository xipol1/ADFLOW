import React, { useState } from 'react'
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom'
import { ChevronLeft, Mail, CheckCircle } from 'lucide-react'
import { OnboardingProvider, useOnboarding } from './OnboardingContext'
import { useAuth } from '../../../auth/AuthContext'
import apiService from '../../../services/api'

const F = "'Inter', system-ui, sans-serif"
const D = "'Sora', system-ui, sans-serif"
const A = '#8b5cf6'
const AD = '#7c3aed'
const AG = (o) => `rgba(139,92,246,${o})`
const OK = '#10b981'

const STEPS = [
  { path: 'register', label: 'Cuenta' },
  { path: 'channel', label: 'Canal' },
  { path: 'verify', label: 'Verificar' },
  { path: 'success', label: 'Listo' },
]

function ProgressDots() {
  const location = useLocation()
  const current = STEPS.findIndex(s => location.pathname.includes(s.path))

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', justifyContent: 'center', marginBottom: '32px' }}>
      {STEPS.map((s, i) => {
        const done = i < current
        const active = i === current
        return (
          <React.Fragment key={s.path}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px' }}>
              <div style={{
                width: active ? '32px' : '10px',
                height: '10px',
                borderRadius: active ? '5px' : '50%',
                background: done ? A : active ? A : 'var(--border-med)',
                transition: 'all .3s ease',
                opacity: done ? 0.5 : 1,
              }} />
              <span style={{
                fontSize: '10px',
                fontWeight: active ? 700 : 400,
                color: done || active ? A : 'var(--muted2)',
                fontFamily: F,
                transition: 'color .3s',
              }}>
                {s.label}
              </span>
            </div>
            {i < STEPS.length - 1 && (
              <div style={{ width: '24px', height: '1px', background: done ? A : 'var(--border)', marginBottom: '18px', transition: 'background .3s' }} />
            )}
          </React.Fragment>
        )
      })}
    </div>
  )
}

function EmailVerificationGate({ email }) {
  const [sent, setSent] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleResend = async () => {
    setError('')
    setLoading(true)
    try {
      const res = await apiService.resendVerificationEmail(email)
      if (res?.success) setSent(true)
      else setError(res?.message || 'No se pudo reenviar el email')
    } catch (e) {
      setError(e.message || 'Error de conexión')
    }
    setLoading(false)
  }

  return (
    <div>
      <div style={{
        width: '64px', height: '64px', borderRadius: '50%',
        background: AG(0.1), display: 'flex', alignItems: 'center', justifyContent: 'center',
        margin: '0 auto 20px',
      }}>
        <Mail size={28} color={A} />
      </div>

      <h1 style={{ fontFamily: D, fontSize: '24px', fontWeight: 700, letterSpacing: '-0.03em', textAlign: 'center', color: 'var(--text)', marginBottom: '8px' }}>
        Verifica tu email
      </h1>
      <p style={{ fontSize: '14px', color: 'var(--muted)', textAlign: 'center', marginBottom: '24px', lineHeight: 1.5 }}>
        Te hemos enviado un enlace de confirmación a <span style={{ color: 'var(--text)', fontWeight: 600 }}>{email}</span>.
        Ábrelo y vuelve aquí para continuar.
      </p>

      {sent && (
        <div style={{
          background: `${OK}10`, border: `1px solid ${OK}30`, color: OK,
          borderRadius: '10px', padding: '10px 14px', fontSize: '13px',
          display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px',
        }}>
          <CheckCircle size={14} /> Email reenviado. Revisa tu bandeja de entrada.
        </div>
      )}
      {error && (
        <div style={{
          background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)',
          color: '#ef4444', borderRadius: '10px', padding: '10px 14px',
          fontSize: '13px', marginBottom: '16px',
        }}>{error}</div>
      )}

      <button
        onClick={handleResend}
        disabled={loading || sent}
        style={{
          width: '100%', background: (loading || sent) ? AG(0.3) : A, color: '#fff', border: 'none',
          borderRadius: '12px', padding: '13px', fontSize: '14px', fontWeight: 700,
          cursor: (loading || sent) ? 'not-allowed' : 'pointer', fontFamily: F,
          transition: 'background .2s',
        }}
        onMouseEnter={e => { if (!loading && !sent) e.currentTarget.style.background = AD }}
        onMouseLeave={e => { if (!loading && !sent) e.currentTarget.style.background = A }}
      >
        {loading ? 'Reenviando...' : sent ? 'Email reenviado' : 'Reenviar email de verificación'}
      </button>

      <p style={{ fontSize: '12px', color: 'var(--muted2)', textAlign: 'center', marginTop: '16px' }}>
        ¿No lo encuentras? Revisa la carpeta de spam.
      </p>
    </div>
  )
}

function InnerLayout() {
  const navigate = useNavigate()
  const location = useLocation()
  const { isAuthenticated, user } = useAuth()
  const isFirst = location.pathname.includes('register')
  const isSuccess = location.pathname.includes('success')
  const needsEmailGate = isAuthenticated && user?.emailVerificado === false && !isFirst

  return (
    <div style={{
      minHeight: '100vh',
      background: 'var(--bg)',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      padding: '40px 20px 60px',
      fontFamily: F,
    }}>
      {/* Back button */}
      {!isFirst && !isSuccess && (
        <button
          onClick={() => navigate(-1)}
          style={{
            position: 'absolute', top: '20px', left: '20px',
            background: 'none', border: 'none', cursor: 'pointer',
            color: 'var(--muted)', display: 'flex', alignItems: 'center', gap: '4px',
            fontSize: '13px', fontFamily: F,
          }}
        >
          <ChevronLeft size={16} /> Volver
        </button>
      )}

      {/* Logo */}
      <Link to="/" style={{
        display: 'inline-flex', alignItems: 'center',
        textDecoration: 'none', marginBottom: '32px',
      }} aria-label="Channelad">
        <img src="/logo.svg" alt="Channelad" style={{ height: '36px', width: 'auto', display: 'block' }} />
      </Link>

      {/* Progress */}
      {!isSuccess && <ProgressDots />}

      {/* Content */}
      <div style={{ width: '100%', maxWidth: '440px' }}>
        {needsEmailGate ? <EmailVerificationGate email={user?.email} /> : <Outlet />}
      </div>

      {/* Footer */}
      <p style={{ marginTop: 'auto', paddingTop: '40px', fontSize: '11px', color: 'var(--muted2)' }}>
        &copy; 2026 Channelad
      </p>
    </div>
  )
}

export default function OnboardingLayout() {
  return (
    <OnboardingProvider>
      <InnerLayout />
    </OnboardingProvider>
  )
}
