import React, { useState, useEffect } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { useAuth } from '../../../auth/AuthContext'
import apiService from '../../../../services/api'
import { PURPLE as A, PURPLE_DARK as AD, purpleAlpha as AG, FONT_BODY, FONT_DISPLAY } from '../../theme/tokens'

export default function AuthPage({ defaultTab = 'login' }) {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { login, register } = useAuth()

  const refCode = searchParams.get('ref') || ''
  const botTokenParam = searchParams.get('bot_token') || ''
  const botEmailParam = searchParams.get('email') || ''

  const [tab, setTab]           = useState((refCode || botTokenParam) ? 'register' : defaultTab)
  const [email, setEmail]       = useState(botEmailParam)
  const [password, setPassword] = useState('')
  const [name, setName]         = useState('')
  const [role, setRole]         = useState(botTokenParam ? 'creator' : 'advertiser')
  const [referral, setReferral] = useState(refCode)
  const [remember, setRemember] = useState(false)
  const [showPass, setShowPass] = useState(false)
  const [loading, setLoading]   = useState(false)
  const [error, setError]       = useState('')
  const [needs2FA, setNeeds2FA] = useState(false)
  const [twoFACode, setTwoFACode] = useState('')
  const [twoFAEmail, setTwoFAEmail] = useState('')
  const [botToken, setBotToken] = useState(botTokenParam)
  const [founderData, setFounderData] = useState(null) // { valid, channelUsername, channelTier, niche }

  // Validate bot token on mount
  useEffect(() => {
    if (!botTokenParam) return
    const validate = async () => {
      try {
        const res = await apiService.request(`/auth/validate-bot-token?token=${encodeURIComponent(botTokenParam)}`, { method: 'GET', auth: false })
        if (res?.valid) {
          setFounderData(res)
          if (res.email) setEmail(res.email)
        } else {
          setBotToken('')
          setFounderData(null)
        }
      } catch { setBotToken(''); setFounderData(null) }
    }
    validate()
  }, [botTokenParam])

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
    if (res?.requires2FA) {
      setNeeds2FA(true)
      setTwoFAEmail(res.email || email)
      return
    }
    if (res?.success) { navigate('/dashboard'); return }
    setError(res?.message || 'Credenciales incorrectas')
  }

  const on2FAVerify = async (e) => {
    e.preventDefault()
    if (twoFACode.length < 6) { setError('Introduce un codigo de 6 digitos'); return }
    setError('')
    setLoading(true)
    // First validate the 2FA code
    const valRes = await apiService.validate2FA(twoFAEmail, twoFACode)
    if (!valRes?.success) { setLoading(false); setError(valRes?.message || 'Codigo invalido'); return }
    // Then complete login (password already verified, backend will issue tokens)
    const res = await login({ email: twoFAEmail, password, twoFACode: twoFACode })
    setLoading(false)
    if (res?.success) { navigate('/dashboard'); return }
    setError(res?.message || 'Error al completar login')
  }

  const onRegister = async (e) => {
    e.preventDefault()
    setError('')
    if (password.length < 8) { setError('La contraseña debe tener al menos 8 caracteres'); return }
    if (!/[A-Z]/.test(password)) { setError('La contraseña debe incluir al menos una mayúscula'); return }
    if (!/[a-z]/.test(password)) { setError('La contraseña debe incluir al menos una minúscula'); return }
    if (!/\d/.test(password)) { setError('La contraseña debe incluir al menos un número'); return }
    setLoading(true)
    const regData = { email, password, nombre: name, role }
    if (botToken) regData.botToken = botToken
    const res = await register(regData)
    if (res?.success) {
      // Apply referral code if present — synchronous to ensure it links
      const codeToApply = referral.trim() || refCode
      if (codeToApply) {
        try {
          const refRes = await apiService.applyReferralCode(codeToApply)
          if (!refRes?.success) console.warn('Referral code could not be applied:', refRes?.message)
        } catch (refErr) {
          console.warn('Referral code application failed:', refErr?.message)
        }
      }
      setLoading(false)
      navigate('/dashboard')
      return
    }
    setLoading(false)
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
        Channel<span style={{ color: A }}>ad</span>
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

          {/* 2FA VERIFICATION STEP */}
          {tab === 'login' && needs2FA && (
            <form onSubmit={on2FAVerify} style={{ display: 'flex', flexDirection: 'column', gap: '16px', alignItems: 'center', padding: '8px 0' }}>
              <div style={{ width: '56px', height: '56px', borderRadius: '16px', background: `${AG(0.1)}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '24px' }}>🔐</div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text)', fontFamily: D, marginBottom: '6px' }}>Verificacion en dos pasos</div>
                <div style={{ fontSize: '13px', color: 'var(--muted)' }}>Introduce el codigo de tu app de autenticacion</div>
              </div>
              <input
                type="text" value={twoFACode} onChange={e => setTwoFACode(e.target.value.replace(/\D/g, '').slice(0, 8))}
                placeholder="000000" maxLength={8} autoFocus
                style={{ ...inputStyle(focusedField === '2fa'), width: '200px', textAlign: 'center', fontFamily: 'monospace', fontSize: '20px', letterSpacing: '0.3em', fontWeight: 700 }}
                onFocus={() => setFocusedField('2fa')} onBlur={() => setFocusedField(null)}
              />
              <div style={{ fontSize: '11px', color: 'var(--muted)' }}>Tambien puedes usar un codigo de respaldo</div>
              <button type="submit" disabled={loading || twoFACode.length < 6} style={{
                width: '100%', background: loading || twoFACode.length < 6 ? 'var(--muted2)' : A,
                color: '#fff', border: 'none', borderRadius: '10px', padding: '13px',
                fontSize: '14px', fontWeight: 600, cursor: loading ? 'not-allowed' : 'pointer', fontFamily: F,
              }}>
                {loading ? 'Verificando...' : 'Verificar'}
              </button>
              <button type="button" onClick={() => { setNeeds2FA(false); setTwoFACode(''); setError('') }} style={{
                background: 'none', border: 'none', cursor: 'pointer', color: A, fontSize: '13px', fontWeight: 500,
              }}>Volver al login</button>
            </form>
          )}

          {/* LOGIN FORM */}
          {tab === 'login' && !needs2FA && (
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

              {/* Founder badge */}
              {founderData?.valid && (
                <div style={{
                  background: 'linear-gradient(135deg, rgba(139,92,246,0.08), rgba(236,72,153,0.08))',
                  border: '1px solid rgba(139,92,246,0.25)',
                  borderRadius: '12px', padding: '14px 16px',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                    <span style={{ fontSize: '16px' }}>🏆</span>
                    <span style={{ fontSize: '14px', fontWeight: 700, color: '#8b5cf6', fontFamily: D }}>Canal Fundador</span>
                  </div>
                  <p style={{ fontSize: '12px', color: 'var(--text)', lineHeight: 1.5, margin: 0 }}>
                    {founderData.channelUsername && <><strong>{founderData.channelUsername}</strong> · </>}
                    {founderData.niche && <>{founderData.niche} · </>}
                    Comision del 10% permanente + €10 de bono de bienvenida
                  </p>
                </div>
              )}

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
                  onChange={e => { if (!founderData?.valid) setEmail(e.target.value) }}
                  readOnly={!!founderData?.valid}
                  onFocus={() => setFocusedField('email')}
                  onBlur={() => setFocusedField(null)}
                  placeholder="tu@email.com"
                  style={{
                    ...inputStyle(focusedField === 'email'),
                    ...(founderData?.valid ? { opacity: 0.7, cursor: 'not-allowed' } : {}),
                  }}
                />
                {founderData?.valid && (
                  <p style={{ fontSize: '11px', color: '#8b5cf6', marginTop: '4px' }}>
                    Email vinculado a tu verificacion del bot
                  </p>
                )}
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
                    placeholder="Min. 8 chars, mayuscula, minuscula y numero"
                    style={{ ...inputStyle(focusedField === 'pass'), paddingRight: '44px' }}
                    autoFocus={!!founderData?.valid}
                  />
                  <button type="button" onClick={() => setShowPass(!showPass)} style={{
                    position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)',
                    background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted2)', fontSize: '13px',
                  }}>{showPass ? '🙈' : '👁'}</button>
                </div>
              </div>

              {/* Role selector — hidden when coming from bot (auto-creator) */}
              {!founderData?.valid && (
              <div>
                <label style={{ fontSize: '13px', fontWeight: 500, color: 'var(--text)', display: 'block', marginBottom: '8px' }}>
                  Quiero usar Channelad para… <span style={{ color: '#ef4444' }}>*</span>
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
              )}

              {/* Referral code field */}
              <div>
                <label style={{ fontSize: '13px', fontWeight: 500, color: 'var(--text)', display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '6px' }}>
                  <span style={{ fontSize: '14px' }}>🎁</span> Codigo de invitacion
                  {referral && <span style={{ fontSize: '11px', color: '#10b981', fontWeight: 600 }}>Aplicado</span>}
                </label>
                <input
                  type="text" value={referral}
                  onChange={e => setReferral(e.target.value.toUpperCase())}
                  onFocus={() => setFocusedField('referral')}
                  onBlur={() => setFocusedField(null)}
                  placeholder="Pide un codigo a quien te invito"
                  maxLength={12}
                  style={{
                    ...inputStyle(focusedField === 'referral'),
                    ...(referral ? {
                      borderColor: '#10b981',
                      background: 'rgba(16,185,129,0.04)',
                      boxShadow: focusedField === 'referral' ? '0 0 0 3px rgba(16,185,129,0.12)' : 'none',
                    } : {}),
                    letterSpacing: '0.08em',
                    fontWeight: referral ? 700 : 400,
                  }}
                />
                {!referral ? (
                  <p style={{ fontSize: '11px', color: 'var(--muted)', marginTop: '4px', lineHeight: 1.4 }}>
                    Registrate con un codigo y recibe <strong style={{ color: '#10b981' }}>10€ de saldo</strong> para tus primeras campanas
                  </p>
                ) : (
                  <p style={{ fontSize: '11px', color: '#10b981', marginTop: '4px', lineHeight: 1.4, fontWeight: 500 }}>
                    Recibiras 10€ de saldo gratis para tus campanas
                  </p>
                )}
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
        © 2026 Channelad · <Link to="/privacidad" style={{ color: 'var(--muted2)' }}>Privacidad</Link> · <Link to="/terminos" style={{ color: 'var(--muted2)' }}>Términos</Link>
      </p>
    </div>
  )
}
