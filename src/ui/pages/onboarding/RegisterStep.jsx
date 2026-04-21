import React, { useState, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useAuth } from '../../../auth/AuthContext'
import { useOnboarding } from './OnboardingContext'

const A = '#8b5cf6'
const AD = '#7c3aed'
const AG = (o) => `rgba(139,92,246,${o})`
const F = "'Inter', system-ui, sans-serif"
const D = "'Sora', system-ui, sans-serif"

function PasswordStrength({ password }) {
  const checks = [
    { label: '8+ caracteres', ok: password.length >= 8 },
    { label: 'Mayuscula', ok: /[A-Z]/.test(password) },
    { label: 'Minuscula', ok: /[a-z]/.test(password) },
    { label: 'Numero', ok: /\d/.test(password) },
  ]
  const passed = checks.filter(c => c.ok).length
  if (!password) return null

  return (
    <div style={{ marginTop: '8px' }}>
      <div style={{ display: 'flex', gap: '4px', marginBottom: '6px' }}>
        {[1, 2, 3, 4].map(i => (
          <div key={i} style={{
            flex: 1, height: '3px', borderRadius: '2px',
            background: i <= passed ? (passed <= 2 ? '#ef4444' : passed === 3 ? '#f59e0b' : '#10b981') : 'var(--border)',
            transition: 'background .2s',
          }} />
        ))}
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
        {checks.map(c => (
          <span key={c.label} style={{
            fontSize: '11px',
            color: c.ok ? '#10b981' : 'var(--muted2)',
            transition: 'color .2s',
          }}>
            {c.ok ? '\u2713' : '\u2022'} {c.label}
          </span>
        ))}
      </div>
    </div>
  )
}

export default function RegisterStep() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { register, isAuthenticated } = useAuth()
  const { dispatch } = useOnboarding()

  const [email, setEmail] = useState(searchParams.get('email') || '')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [focused, setFocused] = useState(null)

  // If already authenticated, skip to channel step
  useEffect(() => {
    if (isAuthenticated) {
      dispatch({ type: 'SET_STEP', payload: 2 })
      navigate('/onboarding/channel', { replace: true })
    }
  }, [isAuthenticated])

  const isValid = email && password.length >= 8 && /[A-Z]/.test(password) && /[a-z]/.test(password) && /\d/.test(password)

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!isValid) return
    setError('')
    setLoading(true)

    const res = await register({ email, password, role: 'creator' })
    setLoading(false)

    if (res?.success) {
      dispatch({ type: 'SET_STEP', payload: 2 })
      navigate('/onboarding/channel')
    } else {
      setError(res?.message || 'No se pudo crear la cuenta')
    }
  }

  const inputStyle = (field) => ({
    width: '100%', boxSizing: 'border-box',
    background: 'var(--bg)',
    border: `1px solid ${focused === field ? A : 'var(--border-med)'}`,
    borderRadius: '10px', padding: '13px 16px',
    fontSize: '15px', color: 'var(--text)',
    fontFamily: F, outline: 'none',
    transition: 'border-color .2s, box-shadow .2s',
    boxShadow: focused === field ? `0 0 0 3px ${AG(0.12)}` : 'none',
  })

  return (
    <div>
      <h1 style={{
        fontFamily: D, fontSize: '28px', fontWeight: 700,
        letterSpacing: '-0.03em', color: 'var(--text)',
        marginBottom: '8px', textAlign: 'center', lineHeight: 1.2,
      }}>
        Empieza a monetizar tu comunidad
      </h1>
      <p style={{ fontSize: '15px', color: 'var(--muted)', marginBottom: '32px', textAlign: 'center', lineHeight: 1.5 }}>
        Recibe campañas de anunciantes en tu canal
      </p>

      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        {error && (
          <div style={{
            background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)',
            borderRadius: '10px', padding: '12px 16px',
            fontSize: '13px', color: '#ef4444',
          }}>{error}</div>
        )}

        <div>
          <label style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text)', display: 'block', marginBottom: '6px' }}>
            Correo electronico
          </label>
          <input
            type="email" required autoFocus
            value={email} onChange={e => setEmail(e.target.value)}
            onFocus={() => setFocused('email')} onBlur={() => setFocused(null)}
            placeholder="tu@email.com"
            style={inputStyle('email')}
          />
        </div>

        <div>
          <label style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text)', display: 'block', marginBottom: '6px' }}>
            Contrasena
          </label>
          <input
            type="password" required
            value={password} onChange={e => setPassword(e.target.value)}
            onFocus={() => setFocused('pass')} onBlur={() => setFocused(null)}
            placeholder="Crea una contrasena segura"
            style={inputStyle('pass')}
          />
          <PasswordStrength password={password} />
        </div>

        <button
          type="submit"
          disabled={!isValid || loading}
          style={{
            background: isValid && !loading ? A : AG(0.3),
            color: '#fff', border: 'none', borderRadius: '12px',
            padding: '14px', fontSize: '15px', fontWeight: 700,
            cursor: isValid && !loading ? 'pointer' : 'not-allowed',
            fontFamily: F, transition: 'all .2s',
            boxShadow: isValid ? `0 4px 16px ${AG(0.35)}` : 'none',
            marginTop: '4px',
          }}
          onMouseEnter={e => { if (isValid && !loading) e.currentTarget.style.background = AD }}
          onMouseLeave={e => { if (isValid && !loading) e.currentTarget.style.background = A }}
        >
          {loading ? 'Creando cuenta...' : 'Continuar'}
        </button>

        <p style={{ fontSize: '12px', color: 'var(--muted2)', textAlign: 'center', lineHeight: 1.5 }}>
          ¿Ya tienes cuenta?{' '}
          <a href="/auth/login" style={{ color: A, textDecoration: 'none', fontWeight: 600 }}>Inicia sesion</a>
        </p>
      </form>
    </div>
  )
}
