import React, { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../../../auth/AuthContext'
import { PURPLE as A, PURPLE_DARK as AD, purpleAlpha as AG, FONT_BODY, FONT_DISPLAY } from '../../theme/tokens'

export default function AuthPage({ defaultTab = 'login' }) {
  const navigate = useNavigate()
  const { login, register } = useAuth()

  const [tab, setTab]           = useState(defaultTab)
  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [name, setName]         = useState('')
  const [role, setRole]         = useState('advertiser')
  const [remember, setRemember] = useState(false)
  const [showPass, setShowPass] = useState(false)
  const [loading, setLoading]   = useState(false)
  const [error, setError]       = useState('')

  const F = FONT_BODY
  const D = FONT_DISPLAY

  const reset = (nextTab) => {
    setTab(nextTab)
    setError('')
    setEmail('')
    setPassword('')
    setName('')
  }

  const onLogin = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    const res = await login({ email, password })
    setLoading(false)
    if (res?.success) { navigate('/dashboard'); return }
    setError(res?.message || 'Credenciales incorrectas')
  }

  const onRegister = async (e) => {
    e.preventDefault()
    setError('')
    if (password.length < 8) { setError('La contraseña debe tener al menos 8 caracteres'); return }
    if (!/[A-Z]/.test(password)) { setError('La contraseña debe incluir al menos una mayúscula'); return }
    if (!/[a-z]/.test(password)) { setError('La contraseña debe incluir al menos una minúscula'); return }
    if (!/\d/.test(password)) { setError('La contraseña debe incluir al menos un número'); return }
    setLoading(true)
    const res = await register({ email, password, nombre: name, role })
    setLoading(false)
    if (res?.success) { navigate('/dashboard'); return }
    setError(res?.message || 'No se pudo crear la cuenta')
  }

  const inputStyle = (focused) => ({
    width: '100%', boxSizing: 'border-box',
    background: 'var(--bg)',
    border: `1px solid ${focused ? A : 'var(--border-med)'}`,
    borderRadius: '10px', padding: '11px 14px',
    fontSize: '14px', color: 'var(--text)',
    fontFamily: F, outline: 'none',
    transition: 'border-color .2s',
    boxShadow: focused ? `0 0 0 3px ${AG(0.12)}` : 'none',
  })

  const [focusedField, setFocusedField] = useState(null)

  return (
    <div style={{
      minHeight: '100vh', background: 'var(--bg)',
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      padding: '40px 20px', fontFamily: F,
    }}>

      {/* Logo */}
      <Link to="/" style={{
        fontFamily: D, fontWeight: 700, fontSize: '22px',
        letterSpacing: '-0.4px', textDecoration: 'none',
        color: 'var(--text)', marginBottom: '28px',
      }}>
        Ad<span style={{ color: A }}>flow</span>
      </Link>

      {/* Title */}
      <h1 style={{
        fontFamily: D, fontSize: '26px', fontWeight: 700,
        letterSpacing: '-0.03em', color: 'var(--text)',
        marginBottom: '6px', textAlign: 'center',
      }}>
        {tab === 'login' ? 'Inicia sesión en tu cuenta' : 'Crea tu cuenta gratis'}
      </h1>
      <p style={{ fontSize: '14px', color: 'var(--muted)', marginBottom: '28px', textAlign: 'center' }}>
        {tab === 'login' ? (
          <>¿No tienes una cuenta?{' '}
            <button onClick={() => reset('register')} style={{
              background: 'none', border: 'none', cursor: 'pointer',
              color: A, fontWeight: 600, fontSize: '14px', padding: 0,
            }}>Regístrate</button>
          </>
        ) : (
          <>¿Ya tienes cuenta?{' '}
            <button onClick={() => reset('login')} style={{
              background: 'none', border: 'none', cursor: 'pointer',
              color: A, fontWeight: 600, fontSize: '14px', padding: 0,
            }}>Inicia sesión</button>
          </>
        )}
      </p>

      {/* Card */}
      <div style={{
        width: '100%', maxWidth: '420px',
        background: 'var(--surface)',
        border: '1px solid var(--border)',
        borderRadius: '18px',
        overflow: 'hidden',
        boxShadow: '0 24px 60px rgba(0,0,0,0.35)',
      }}>

        {/* Tabs */}
        <div style={{
          display: 'flex',
          borderBottom: '1px solid var(--border)',
        }}>
          {[['login', 'Iniciar Sesión'], ['register', 'Registrarse']].map(([key, label]) => (
            <button key={key} onClick={() => reset(key)} style={{
              flex: 1, padding: '16px',
              background: 'none', border: 'none', cursor: 'pointer',
              fontFamily: F, fontSize: '14px', fontWeight: tab === key ? 600 : 400,
              color: tab === key ? A : 'var(--muted)',
              borderBottom: `2px solid ${tab === key ? A : 'transparent'}`,
              transition: 'color .15s, border-color .15s',
              marginBottom: '-1px',
            }}>{label}</button>
          ))}
        </div>

        <div style={{ padding: '28px' }}>

          {/* Error */}
          {error && (
            <div style={{
              background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)',
              borderRadius: '8px', padding: '10px 14px',
              fontSize: '13px', color: '#ef4444', marginBottom: '16px',
            }}>{error}</div>
          )}

          {/* LOGIN FORM */}
          {tab === 'login' && (
            <form onSubmit={onLogin} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label style={{ fontSize: '13px', fontWeight: 500, color: 'var(--text)', display: 'block', marginBottom: '6px' }}>
                  Correo electrónico <span style={{ color: '#ef4444' }}>*</span>
                </label>
                <input
                  type="email" required value={email}
                  onChange={e => setEmail(e.target.value)}
                  onFocus={() => setFocusedField('email')}
                  onBlur={() => setFocusedField(null)}
                  placeholder="tu@email.com"
                  style={inputStyle(focusedField === 'email')}
                />
              </div>

              <div>
                <label style={{ fontSize: '13px', fontWeight: 500, color: 'var(--text)', display: 'block', marginBottom: '6px' }}>
                  Contraseña <span style={{ color: '#ef4444' }}>*</span>
                </label>
                <div style={{ position: 'relative' }}>
                  <input
                    type={showPass ? 'text' : 'password'} required value={password}
                    onChange={e => setPassword(e.target.value)}
                    onFocus={() => setFocusedField('pass')}
                    onBlur={() => setFocusedField(null)}
                    placeholder="••••••••"
                    style={{ ...inputStyle(focusedField === 'pass'), paddingRight: '44px' }}
                  />
                  <button type="button" onClick={() => setShowPass(!showPass)} style={{
                    position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)',
                    background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted2)', fontSize: '13px',
                  }}>{showPass ? '🙈' : '👁'}</button>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '13px', color: 'var(--muted)' }}>
                  <input
                    type="checkbox" checked={remember} onChange={e => setRemember(e.target.checked)}
                    style={{ accentColor: A, width: '14px', height: '14px' }}
                  />
                  Recordarme
                </label>
                <Link to="/auth/forgot-password" style={{ fontSize: '13px', color: A, textDecoration: 'none', fontWeight: 500 }}>
                  ¿Olvidaste tu contraseña?
                </Link>
              </div>

              <button type="submit" disabled={loading} style={{
                background: loading ? 'var(--muted2)' : A,
                color: '#fff', border: 'none', borderRadius: '10px',
                padding: '13px', fontSize: '14px', fontWeight: 600,
                cursor: loading ? 'not-allowed' : 'pointer',
                fontFamily: F, transition: 'background .2s, transform .15s',
                marginTop: '4px',
              }}
                onMouseEnter={e => { if (!loading) e.currentTarget.style.background = AD }}
                onMouseLeave={e => { if (!loading) e.currentTarget.style.background = A }}
              >
                {loading ? 'Iniciando sesión…' : 'Iniciar sesión'}
              </button>
            </form>
          )}

          {/* REGISTER FORM */}
          {tab === 'register' && (
            <form onSubmit={onRegister} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label style={{ fontSize: '13px', fontWeight: 500, color: 'var(--text)', display: 'block', marginBottom: '6px' }}>
                  Nombre <span style={{ color: '#ef4444' }}>*</span>
                </label>
                <input
                  type="text" required value={name}
                  onChange={e => setName(e.target.value)}
                  onFocus={() => setFocusedField('name')}
                  onBlur={() => setFocusedField(null)}
                  placeholder="Tu nombre"
                  style={inputStyle(focusedField === 'name')}
                />
              </div>

              <div>
                <label style={{ fontSize: '13px', fontWeight: 500, color: 'var(--text)', display: 'block', marginBottom: '6px' }}>
                  Correo electrónico <span style={{ color: '#ef4444' }}>*</span>
                </label>
                <input
                  type="email" required value={email}
                  onChange={e => setEmail(e.target.value)}
                  onFocus={() => setFocusedField('email')}
                  onBlur={() => setFocusedField(null)}
                  placeholder="tu@email.com"
                  style={inputStyle(focusedField === 'email')}
                />
              </div>

              <div>
                <label style={{ fontSize: '13px', fontWeight: 500, color: 'var(--text)', display: 'block', marginBottom: '6px' }}>
                  Contraseña <span style={{ color: '#ef4444' }}>*</span>
                </label>
                <div style={{ position: 'relative' }}>
                  <input
                    type={showPass ? 'text' : 'password'} required value={password}
                    onChange={e => setPassword(e.target.value)}
                    onFocus={() => setFocusedField('pass')}
                    onBlur={() => setFocusedField(null)}
                    placeholder="Mín. 8 chars, mayúscula, minúscula y número"
                    style={{ ...inputStyle(focusedField === 'pass'), paddingRight: '44px' }}
                  />
                  <button type="button" onClick={() => setShowPass(!showPass)} style={{
                    position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)',
                    background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted2)', fontSize: '13px',
                  }}>{showPass ? '🙈' : '👁'}</button>
                </div>
              </div>

              <div>
                <label style={{ fontSize: '13px', fontWeight: 500, color: 'var(--text)', display: 'block', marginBottom: '8px' }}>
                  Quiero usar Adflow para… <span style={{ color: '#ef4444' }}>*</span>
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                  {[['advertiser', '📢', 'Anunciarme', 'Comprar espacios'], ['creator', '💼', 'Monetizar', 'Vender espacios']].map(([val, icon, title, sub]) => (
                    <button key={val} type="button" onClick={() => setRole(val)} style={{
                      background: role === val ? AG(0.12) : 'var(--bg)',
                      border: `1px solid ${role === val ? A : 'var(--border-med)'}`,
                      borderRadius: '10px', padding: '12px',
                      cursor: 'pointer', textAlign: 'left', transition: 'all .15s',
                      boxShadow: role === val ? `0 0 0 1px ${A}` : 'none',
                    }}>
                      <div style={{ fontSize: '18px', marginBottom: '4px' }}>{icon}</div>
                      <div style={{ fontSize: '13px', fontWeight: 600, color: role === val ? A : 'var(--text)', fontFamily: F }}>{title}</div>
                      <div style={{ fontSize: '11px', color: 'var(--muted)' }}>{sub}</div>
                    </button>
                  ))}
                </div>
              </div>

              <button type="submit" disabled={loading} style={{
                background: loading ? 'var(--muted2)' : A,
                color: '#fff', border: 'none', borderRadius: '10px',
                padding: '13px', fontSize: '14px', fontWeight: 600,
                cursor: loading ? 'not-allowed' : 'pointer',
                fontFamily: F, transition: 'background .2s',
                marginTop: '4px',
              }}
                onMouseEnter={e => { if (!loading) e.currentTarget.style.background = AD }}
                onMouseLeave={e => { if (!loading) e.currentTarget.style.background = A }}
              >
                {loading ? 'Creando cuenta…' : 'Crear cuenta gratis'}
              </button>

              <p style={{ fontSize: '11px', color: 'var(--muted2)', textAlign: 'center', lineHeight: 1.5 }}>
                Al registrarte aceptas los{' '}
                <Link to="/terminos" style={{ color: A }}>Términos de uso</Link> y la{' '}
                <Link to="/privacidad" style={{ color: A }}>Política de privacidad</Link>
              </p>
            </form>
          )}

          {/* Divider */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', margin: '24px 0 20px' }}>
            <div style={{ flex: 1, height: '1px', background: 'var(--border)' }} />
            <span style={{ fontSize: '12px', color: 'var(--muted2)', whiteSpace: 'nowrap' }}>
              Prueba la plataforma sin registrarte
            </span>
            <div style={{ flex: 1, height: '1px', background: 'var(--border)' }} />
          </div>

          {/* Demo buttons */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <button onClick={() => navigate('/marketplace')} style={{
              width: '100%', background: AG(0.1),
              border: `1px solid ${AG(0.25)}`, borderRadius: '10px',
              padding: '11px', fontSize: '13px', fontWeight: 600,
              color: A, cursor: 'pointer', fontFamily: F,
              transition: 'background .15s, transform .1s',
            }}
              onMouseEnter={e => { e.currentTarget.style.background = AG(0.18); e.currentTarget.style.transform = 'translateY(-1px)' }}
              onMouseLeave={e => { e.currentTarget.style.background = AG(0.1); e.currentTarget.style.transform = 'none' }}
            >
              📢 Explorar marketplace de canales
            </button>
            <button onClick={() => { reset('register'); setRole('creator') }} style={{
              width: '100%', background: 'var(--gg0, rgba(37,211,102,0.08))',
              border: '1px solid rgba(37,211,102,0.22)', borderRadius: '10px',
              padding: '11px', fontSize: '13px', fontWeight: 600,
              color: '#25d366', cursor: 'pointer', fontFamily: F,
              transition: 'background .15s, transform .1s',
            }}
              onMouseEnter={e => { e.currentTarget.style.background = 'rgba(37,211,102,0.16)'; e.currentTarget.style.transform = 'translateY(-1px)' }}
              onMouseLeave={e => { e.currentTarget.style.background = 'rgba(37,211,102,0.08)'; e.currentTarget.style.transform = 'none' }}
            >
              💼 Registrarse como creador
            </button>
          </div>
        </div>
      </div>

      <p style={{ marginTop: '24px', fontSize: '12px', color: 'var(--muted2)' }}>
        © 2026 Adflow · <Link to="/privacidad" style={{ color: 'var(--muted2)' }}>Privacidad</Link> · <Link to="/terminos" style={{ color: 'var(--muted2)' }}>Términos</Link>
      </p>
    </div>
  )
}
