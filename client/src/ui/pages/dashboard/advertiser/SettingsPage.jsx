import React, { useState, useEffect } from 'react'
import { User, Bell, Lock, FileText, Key, Shield, Check, Eye, EyeOff, Copy, RefreshCw, AlertTriangle, Loader2 } from 'lucide-react'
import { useAuth } from '../../../../auth/AuthContext'
import apiService from '../../../../services/api'
import {
  PURPLE, purpleAlpha, FONT_BODY, FONT_DISPLAY, OK, WARN, ERR,
} from '../../../theme/tokens'
import TwoFactorCard from '../../../components/TwoFactorCard'


const TABS = [
  { id: 'perfil',         icon: User,      label: 'Perfil'        },
  { id: 'notificaciones', icon: Bell,      label: 'Notificaciones' },
  { id: 'seguridad',      icon: Shield,    label: 'Seguridad'     },
  { id: 'facturacion',    icon: FileText,  label: 'Facturación'   },
  { id: 'api',            icon: Key,       label: 'API'           },
]

// ─── Form field ───────────────────────────────────────────────────────────────
const Field = ({ label, type = 'text', value, onChange, placeholder, hint, required, disabled, error }) => {
  const [show, setShow]   = useState(false)
  const [focused, setFocused] = useState(false)
  const isPassword = type === 'password'
  const actualType = isPassword ? (show ? 'text' : 'password') : type
  const borderColor = error ? ERR : focused ? purpleAlpha(0.5) : 'var(--border-med)'

  return (
    <div>
      <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--muted)', display: 'block', marginBottom: '7px', letterSpacing: '0.01em' }}>
        {label}{required && <span style={{ color: PURPLE, marginLeft: '3px' }}>*</span>}
      </label>
      {type === 'textarea' ? (
        <textarea
          value={value || ''} onChange={e => onChange?.(e.target.value)}
          placeholder={placeholder} rows={3} disabled={disabled}
          onFocus={() => setFocused(true)} onBlur={() => setFocused(false)}
          style={{
            width: '100%', boxSizing: 'border-box',
            background: disabled ? 'var(--bg2)' : 'var(--bg)', borderRadius: '11px', padding: '11px 14px',
            fontSize: '14px', color: 'var(--text)', fontFamily: FONT_BODY, outline: 'none', resize: 'vertical',
            opacity: disabled ? 0.6 : 1,
            border: `1px solid ${borderColor}`,
            boxShadow: focused ? `0 0 0 3px ${purpleAlpha(0.07)}` : 'none',
            transition: 'border-color .15s, box-shadow .15s',
          }}
        />
      ) : (
        <div style={{ position: 'relative' }}>
          <input
            type={actualType} value={value || ''} onChange={e => onChange?.(e.target.value)}
            placeholder={placeholder} disabled={disabled}
            onFocus={() => setFocused(true)} onBlur={() => setFocused(false)}
            style={{
              width: '100%', boxSizing: 'border-box',
              background: disabled ? 'var(--bg2)' : 'var(--bg)', borderRadius: '11px',
              padding: isPassword ? '11px 44px 11px 14px' : '11px 14px',
              fontSize: '14px', color: 'var(--text)', fontFamily: FONT_BODY, outline: 'none',
              opacity: disabled ? 0.6 : 1,
              border: `1px solid ${borderColor}`,
              boxShadow: focused ? `0 0 0 3px ${purpleAlpha(0.07)}` : 'none',
              transition: 'border-color .15s, box-shadow .15s',
            }}
          />
          {isPassword && (
            <button
              type="button" onClick={() => setShow(s => !s)}
              style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted)', display: 'flex', padding: '4px' }}
            >
              {show ? <EyeOff size={15} /> : <Eye size={15} />}
            </button>
          )}
        </div>
      )}
      {error && <div style={{ fontSize: '11px', color: ERR, marginTop: '5px', lineHeight: 1.4 }}>{error}</div>}
      {hint && !error && <div style={{ fontSize: '11px', color: 'var(--muted2)', marginTop: '5px', lineHeight: 1.4 }}>{hint}</div>}
    </div>
  )
}

// ─── Toggle switch ─────────────────────────────────────────────────────────────
const Toggle = ({ label, desc, defaultOn = true, badge }) => {
  const [on, setOn] = useState(defaultOn)
  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '16px 0', borderBottom: '1px solid var(--border)',
      gap: '16px',
    }}>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '3px' }}>
          <div style={{ fontSize: '14px', fontWeight: 500, color: 'var(--text)' }}>{label}</div>
          {badge && <span style={{ background: purpleAlpha(0.1), border: `1px solid ${purpleAlpha(0.25)}`, color: PURPLE, borderRadius: '10px', padding: '1px 7px', fontSize: '10px', fontWeight: 700 }}>{badge}</span>}
        </div>
        <div style={{ fontSize: '12px', color: 'var(--muted)', lineHeight: 1.4 }}>{desc}</div>
      </div>
      <button
        onClick={() => setOn(!on)}
        style={{
          width: '46px', height: '26px', borderRadius: '13px', border: 'none', cursor: 'pointer',
          position: 'relative', flexShrink: 0,
          background: on ? PURPLE : 'var(--border)', transition: 'background .2s',
          boxShadow: on ? `0 2px 8px ${purpleAlpha(0.3)}` : 'none',
        }}
      >
        <div style={{
          position: 'absolute', top: '3px', left: on ? '23px' : '3px', width: '20px', height: '20px',
          borderRadius: '50%', background: '#fff', transition: 'left .2s cubic-bezier(.4,0,.2,1)',
          boxShadow: '0 1px 4px rgba(0,0,0,0.2)',
        }} />
      </button>
    </div>
  )
}

// ─── Card wrapper ──────────────────────────────────────────────────────────────
const Card = ({ children, title, subtitle, action }) => (
  <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '18px', overflow: 'hidden' }}>
    {(title || action) && (
      <div style={{ padding: '18px 24px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <h2 style={{ fontFamily: FONT_DISPLAY, fontSize: '15px', fontWeight: 700, color: 'var(--text)', marginBottom: subtitle ? '2px' : 0 }}>{title}</h2>
          {subtitle && <p style={{ fontSize: '12px', color: 'var(--muted)' }}>{subtitle}</p>}
        </div>
        {action}
      </div>
    )}
    <div style={{ padding: '24px' }}>{children}</div>
  </div>
)

// ─── Password strength indicator ───────────────────────────────────────────────
const PasswordStrength = ({ password = '' }) => {
  const checks = [
    { label: 'Al menos 8 caracteres', ok: password.length >= 8 },
    { label: 'Letras mayúsculas', ok: /[A-Z]/.test(password) },
    { label: 'Números', ok: /\d/.test(password) },
    { label: 'Caracteres especiales', ok: /[!@#$%^&*]/.test(password) },
  ]
  const score = checks.filter(c => c.ok).length
  const colors = ['var(--muted2)', '#ef4444', WARN, '#3b82f6', OK]

  return (
    <div style={{ marginTop: '12px' }}>
      <div style={{ display: 'flex', gap: '4px', marginBottom: '10px' }}>
        {[0, 1, 2, 3].map(i => (
          <div key={i} style={{ flex: 1, height: '4px', borderRadius: '2px', background: i < score ? colors[score] : 'var(--border)', transition: 'background .3s' }} />
        ))}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px' }}>
        {checks.map(c => (
          <div key={c.label} style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '11px', color: c.ok ? OK : 'var(--muted)' }}>
            <div style={{ width: '14px', height: '14px', borderRadius: '50%', background: c.ok ? `${OK}18` : 'var(--bg2)', border: `1px solid ${c.ok ? OK : 'var(--border)'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              {c.ok && <Check size={9} strokeWidth={2.5} />}
            </div>
            {c.label}
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── Main page ────────────────────────────────────────────────────────────────
export default function SettingsPage() {
  const { user } = useAuth()
  const [tab, setTab]           = useState('perfil')
  const [saveState, setSaveState] = useState('idle') // idle | saving | saved
  const [apiKeyVisible, setApiKeyVisible] = useState(false)
  const [errors, setErrors]     = useState({})

  // ── Controlled form state ──
  const [profile, setProfile] = useState({
    nombre: '', email: '', empresa: '', telefono: '', timezone: 'Europe/Madrid (GMT+1)', sitioWeb: '', bio: '',
  })
  const up = (k, v) => { setProfile(p => ({ ...p, [k]: v })); setErrors(e => ({ ...e, [k]: null })) }

  const [notifs, setNotifs] = useState({
    campanaAprobada: true, campanaPublicada: true, hitoImpresiones: true,
    campanaFinalizada: true, saldoBajo: true, resumenSemanal: false, newsletter: false,
  })

  const [security, setSecurity] = useState({ actual: '', nueva: '', confirmar: '' })
  const uSec = (k, v) => { setSecurity(p => ({ ...p, [k]: v })); setErrors(e => ({ ...e, [k]: null })) }

  const [billing, setBilling] = useState({
    razonSocial: '', nif: '', direccion: '', cp: '', ciudad: '', pais: 'España', emailFacturacion: '',
  })
  const uBill = (k, v) => { setBilling(p => ({ ...p, [k]: v })); setErrors(e => ({ ...e, [k]: null })) }

  // ── Load profile on mount ──
  useEffect(() => {
    let cancelled = false
    const load = async () => {
      try {
        const res = await apiService.request('/auth/perfil')
        if (cancelled) return
        if (res?.success) {
          const u = res.data || res.user || {}
          setProfile({
            nombre: u.nombre || user?.nombre || '',
            email: u.email || user?.email || '',
            empresa: u.perfilAnunciante?.nombreEmpresa || '',
            telefono: u.perfilAnunciante?.telefono || '',
            timezone: u.perfilAnunciante?.timezone || 'Europe/Madrid (GMT+1)',
            sitioWeb: u.perfilAnunciante?.sitioWeb || '',
            bio: u.perfilAnunciante?.descripcion || '',
          })
          if (u.preferenciasNotificacion) setNotifs(p => ({ ...p, ...u.preferenciasNotificacion }))
          if (u.datosFacturacion) setBilling(p => ({ ...p, ...u.datosFacturacion }))
        }
      } catch (err) { console.error('SettingsPage.loadProfile failed:', err) /* keep defaults from auth context */ }
    }
    load()
    return () => { cancelled = true }
  }, [user])

  // ── Validation ──
  const validateProfile = () => {
    const e = {}
    if (!profile.nombre.trim()) e.nombre = 'El nombre es obligatorio'
    setErrors(e)
    return Object.keys(e).length === 0
  }
  const validateSecurity = () => {
    const e = {}
    if (!security.actual) e.actual = 'Introduce tu contraseña actual'
    if (!security.nueva) e.nueva = 'Introduce la nueva contraseña'
    else if (security.nueva.length < 8) e.nueva = 'Mínimo 8 caracteres'
    else if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(security.nueva)) e.nueva = 'Debe incluir mayúscula, minúscula y número'
    if (security.nueva !== security.confirmar) e.confirmar = 'Las contraseñas no coinciden'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  // ── Real save handlers ──
  const save = async () => {
    setSaveState('saving')
    try {
      if (tab === 'perfil') {
        if (!validateProfile()) { setSaveState('idle'); return }
        await apiService.request('/auth/perfil', {
          method: 'PUT',
          body: JSON.stringify({
            nombre: profile.nombre,
            perfilAnunciante: {
              nombreEmpresa: profile.empresa, telefono: profile.telefono,
              timezone: profile.timezone, sitioWeb: profile.sitioWeb, descripcion: profile.bio,
            },
          }),
        })
      } else if (tab === 'notificaciones') {
        await apiService.request('/auth/perfil', {
          method: 'PUT',
          body: JSON.stringify({ preferenciasNotificacion: notifs }),
        })
      } else if (tab === 'seguridad') {
        if (!validateSecurity()) { setSaveState('idle'); return }
        const res = await apiService.request('/auth/cambiar-password', {
          method: 'POST',
          body: JSON.stringify({ passwordActual: security.actual, passwordNueva: security.nueva }),
        })
        if (res?.success) setSecurity({ actual: '', nueva: '', confirmar: '' })
        else { setErrors({ actual: res?.message || 'Error al cambiar contraseña' }); setSaveState('idle'); return }
      } else if (tab === 'facturacion') {
        await apiService.request('/auth/perfil', {
          method: 'PUT',
          body: JSON.stringify({ datosFacturacion: billing }),
        })
      }
      setSaveState('saved')
      setTimeout(() => setSaveState('idle'), 2500)
    } catch {
      setErrors({ _global: 'Error de conexión' })
      setSaveState('idle')
    }
  }

  const API_KEY = user?.apiKey || 'adf_live_sk_••••••••••••••••••••••••••••'

  return (
    <div style={{ fontFamily: FONT_BODY, display: 'flex', flexDirection: 'column', gap: '24px', maxWidth: '900px' }}>

      {/* ── Header ── */}
      <div>
        <h1 style={{ fontFamily: FONT_DISPLAY, fontSize: '28px', fontWeight: 800, color: 'var(--text)', letterSpacing: '-0.04em', marginBottom: '4px' }}>Configuración</h1>
        <p style={{ fontSize: '14px', color: 'var(--muted)' }}>Gestiona tu cuenta, preferencias y seguridad</p>
      </div>

      {/* ── Tab bar ── */}
      <div style={{ display: 'flex', gap: '2px', borderBottom: '1px solid var(--border)', overflowX: 'auto' }}>
        {TABS.map(t => (
          <button
            key={t.id} onClick={() => setTab(t.id)}
            style={{
              display: 'flex', alignItems: 'center', gap: '7px',
              background: 'none', border: 'none', cursor: 'pointer',
              padding: '11px 18px', fontSize: '13px',
              fontWeight: tab === t.id ? 600 : 400,
              color: tab === t.id ? PURPLE : 'var(--muted)',
              borderBottom: `2px solid ${tab === t.id ? PURPLE : 'transparent'}`,
              marginBottom: '-1px', fontFamily: FONT_BODY,
              transition: 'color .15s, border-color .15s',
              whiteSpace: 'nowrap',
            }}
          >
            <t.icon size={14} strokeWidth={tab === t.id ? 2.2 : 1.8} />
            {t.label}
          </button>
        ))}
      </div>

      {/* ── Perfil ── */}
      {tab === 'perfil' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>

          {/* Avatar card */}
          <Card title="Foto de perfil">
            <div style={{ display: 'flex', alignItems: 'center', gap: '20px', flexWrap: 'wrap' }}>
              <div style={{ width: '72px', height: '72px', borderRadius: '50%', background: purpleAlpha(0.18), border: `2px solid ${purpleAlpha(0.4)}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: FONT_DISPLAY, fontWeight: 800, fontSize: '26px', color: PURPLE, flexShrink: 0, letterSpacing: '-0.02em', boxShadow: `0 0 0 4px ${purpleAlpha(0.08)}` }}>
                {(user?.nombre || 'Usuario').slice(0, 2).toUpperCase()}
              </div>
              <div>
                <div style={{ display: 'flex', gap: '10px', marginBottom: '8px' }}>
                  <button style={{ background: purpleAlpha(0.1), border: `1px solid ${purpleAlpha(0.25)}`, borderRadius: '10px', padding: '9px 18px', fontSize: '13px', fontWeight: 600, color: PURPLE, cursor: 'pointer', fontFamily: FONT_BODY }}>Subir imagen</button>
                  <button style={{ background: 'none', border: '1px solid var(--border)', borderRadius: '10px', padding: '9px 18px', fontSize: '13px', fontWeight: 500, color: 'var(--muted)', cursor: 'pointer', fontFamily: FONT_BODY }}>Eliminar</button>
                </div>
                <div style={{ fontSize: '12px', color: 'var(--muted)' }}>PNG, JPG o GIF · máx. 2MB · mínimo 200×200px</div>
              </div>
            </div>
          </Card>

          {/* Personal info */}
          <Card title="Información personal" subtitle="Datos básicos de tu cuenta de anunciante">
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                <Field label="Nombre completo" value={profile.nombre} onChange={v => up('nombre', v)} required error={errors.nombre} />
                <Field label="Email" type="email" value={profile.email} disabled hint="El email no se puede cambiar" />
              </div>
              <Field label="Empresa" value={profile.empresa} onChange={v => up('empresa', v)} placeholder="Nombre de tu empresa u organización" />
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                <Field label="Teléfono" value={profile.telefono} onChange={v => up('telefono', v)} placeholder="+34 600 000 000" />
                <Field label="Zona horaria" value={profile.timezone} onChange={v => up('timezone', v)} />
              </div>
              <Field label="Sitio web" value={profile.sitioWeb} onChange={v => up('sitioWeb', v)} placeholder="https://tuempresa.com" hint="Aparecerá en tu perfil de anunciante" />
              <Field label="Sobre mí / empresa" type="textarea" value={profile.bio} onChange={v => up('bio', v)} placeholder="Describe brevemente tu empresa o caso de uso..." />
            </div>
          </Card>
        </div>
      )}

      {/* ── Notificaciones ── */}
      {tab === 'notificaciones' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
          <Card title="Email" subtitle="Notificaciones que recibirás por correo electrónico">
            <div>
              <Toggle label="Campaña aprobada" desc="Cuando un canal acepta y aprueba tu anuncio" badge="Recomendado" />
              <Toggle label="Campaña publicada" desc="Notificación cuando tu anuncio sale en vivo" />
              <Toggle label="Hito de impresiones" desc="Alerta al superar 10K, 50K o 100K impresiones" />
              <Toggle label="Campaña finalizada" desc="Aviso cuando termina el período de un anuncio" />
              <Toggle label="Saldo bajo" desc="Alerta cuando tu saldo baja de €50" badge="Importante" />
              <Toggle label="Resumen semanal" desc="Reporte de rendimiento cada lunes por la mañana" defaultOn={false} />
              <Toggle label="Newsletter de ChannelAd" desc="Novedades, consejos y actualizaciones de la plataforma" defaultOn={false} />
            </div>
          </Card>

          <Card title="Push / In-app" subtitle="Notificaciones dentro de la plataforma">
            <div>
              <Toggle label="Actividad en tiempo real" desc="Alertas instantáneas de rendimiento de campañas" />
              <Toggle label="Mensajes de soporte" desc="Respuestas del equipo de soporte de ChannelAd" />
              <Toggle label="Recordatorios de pago" desc="Aviso antes de que tu saldo se agote" />
            </div>
          </Card>
        </div>
      )}

      {/* ── Seguridad ── */}
      {tab === 'seguridad' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>

          <Card title="Cambiar contraseña" subtitle="Usa una contraseña única y segura">
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <Field label="Contraseña actual" type="password" placeholder="••••••••" value={security.actual} onChange={v => uSec('actual', v)} error={errors.actual} />
              <div>
                <Field label="Nueva contraseña" type="password" placeholder="Mínimo 8 caracteres" value={security.nueva} onChange={v => uSec('nueva', v)} error={errors.nueva} />
                <PasswordStrength password={security.nueva} />
              </div>
              <Field label="Confirmar nueva contraseña" type="password" placeholder="Repite la contraseña" value={security.confirmar} onChange={v => uSec('confirmar', v)} error={errors.confirmar} />
            </div>
          </Card>

          <TwoFactorCard accentColor={PURPLE} accentAlpha={purpleAlpha} />

          <Card title="Sesiones activas" subtitle="Dispositivos que tienen acceso a tu cuenta">
            {[
              { device: 'Chrome · Windows 11', ip: '84.232.12.45 (Madrid, ES)', time: 'Ahora mismo', current: true },
              { device: 'Safari · iPhone 16', ip: '84.232.12.46 (Madrid, ES)', time: 'hace 2 horas', current: false },
              { device: 'Firefox · macOS', ip: '82.99.131.20 (Barcelona, ES)', time: 'hace 3 días', current: false },
            ].map((session, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 0', borderBottom: i < 2 ? '1px solid var(--border)' : 'none', gap: '12px' }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '3px' }}>
                    <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text)' }}>{session.device}</span>
                    {session.current && <span style={{ background: `${OK}12`, color: OK, borderRadius: '6px', padding: '1px 7px', fontSize: '10px', fontWeight: 700 }}>Sesión actual</span>}
                  </div>
                  <div style={{ fontSize: '11px', color: 'var(--muted)' }}>{session.ip} · {session.time}</div>
                </div>
                {!session.current && (
                  <button style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: '8px', padding: '6px 12px', fontSize: '12px', fontWeight: 600, color: '#ef4444', cursor: 'pointer', fontFamily: FONT_BODY, whiteSpace: 'nowrap' }}>
                    Cerrar
                  </button>
                )}
              </div>
            ))}
          </Card>
        </div>
      )}

      {/* ── Facturación ── */}
      {tab === 'facturacion' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
          <Card title="Datos de facturación" subtitle="Información que aparecerá en tus facturas">
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                <Field label="Nombre / Razón social" value={billing.razonSocial} onChange={v => uBill('razonSocial', v)} required />
                <Field label="NIF / CIF" value={billing.nif} onChange={v => uBill('nif', v)} placeholder="B12345678" required />
              </div>
              <Field label="Dirección" value={billing.direccion} onChange={v => uBill('direccion', v)} placeholder="Calle, número, piso, puerta" />
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.5fr 1fr', gap: '14px' }}>
                <Field label="Código postal" value={billing.cp} onChange={v => uBill('cp', v)} placeholder="28001" />
                <Field label="Ciudad" value={billing.ciudad} onChange={v => uBill('ciudad', v)} placeholder="Madrid" />
                <Field label="País" value={billing.pais} onChange={v => uBill('pais', v)} />
              </div>
              <Field label="Email de facturación" type="email" value={billing.emailFacturacion} onChange={v => uBill('emailFacturacion', v)} hint="Recibirás las facturas en este email" />
            </div>
          </Card>

          <Card title="Facturas recientes">
            <div>
              {[
                { id: 'INV-2026-003', date: 'Mar 2026', amount: '€1,930', status: 'Pagada' },
                { id: 'INV-2026-002', date: 'Feb 2026', amount: '€1,540', status: 'Pagada' },
                { id: 'INV-2026-001', date: 'Ene 2026', amount: '€980', status: 'Pagada' },
              ].map((inv, i) => (
                <div key={inv.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '13px 0', borderBottom: i < 2 ? '1px solid var(--border)' : 'none', gap: '12px' }}>
                  <div>
                    <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text)', marginBottom: '2px' }}>{inv.id}</div>
                    <div style={{ fontSize: '11px', color: 'var(--muted)' }}>{inv.date}</div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <span style={{ fontFamily: FONT_DISPLAY, fontSize: '14px', fontWeight: 700, color: 'var(--text)' }}>{inv.amount}</span>
                    <span style={{ background: `${OK}12`, color: OK, borderRadius: '6px', padding: '2px 8px', fontSize: '11px', fontWeight: 600 }}>{inv.status}</span>
                    <button style={{ background: 'none', border: 'none', fontSize: '12px', color: PURPLE, cursor: 'pointer', fontFamily: FONT_BODY, fontWeight: 600, padding: 0 }}>Descargar</button>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>
      )}

      {/* ── API ── */}
      {tab === 'api' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>

          <Card title="Clave API" subtitle="Usa tu clave para autenticar solicitudes a la API de ChannelAd">
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>

              {/* Warning */}
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', background: 'rgba(245,158,11,0.06)', border: '1px solid rgba(245,158,11,0.2)', borderRadius: '11px', padding: '13px 16px' }}>
                <AlertTriangle size={15} color="#f59e0b" style={{ marginTop: '1px', flexShrink: 0 }} />
                <span style={{ fontSize: '12px', color: 'var(--muted)', lineHeight: 1.5 }}>
                  <strong style={{ color: 'var(--text)' }}>Nunca compartas tu clave API.</strong> Trátala como una contraseña. Cualquier persona con acceso puede realizar operaciones en tu nombre.
                </span>
              </div>

              {/* Key display */}
              <div>
                <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--muted)', display: 'block', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Tu clave API
                </label>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <div style={{ flex: 1, background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: '11px', padding: '11px 16px', fontFamily: 'monospace', fontSize: '13px', color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {apiKeyVisible ? API_KEY : 'adf_live_sk_' + '•'.repeat(28)}
                  </div>
                  <button onClick={() => setApiKeyVisible(v => !v)} style={{ background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: '11px', padding: '11px 14px', cursor: 'pointer', color: 'var(--muted)', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', fontFamily: FONT_BODY, whiteSpace: 'nowrap' }}>
                    {apiKeyVisible ? <EyeOff size={14} /> : <Eye size={14} />}
                    {apiKeyVisible ? 'Ocultar' : 'Mostrar'}
                  </button>
                  <button style={{ background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: '11px', padding: '11px 14px', cursor: 'pointer', color: 'var(--muted)', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', fontFamily: FONT_BODY, whiteSpace: 'nowrap' }}>
                    <Copy size={14} /> Copiar
                  </button>
                </div>
              </div>

              {/* Regenerate */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px', paddingTop: '8px', borderTop: '1px solid var(--border)' }}>
                <div>
                  <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text)', marginBottom: '2px' }}>Regenerar clave</div>
                  <div style={{ fontSize: '12px', color: 'var(--muted)' }}>La clave anterior dejará de funcionar inmediatamente</div>
                </div>
                <button style={{ display: 'flex', alignItems: 'center', gap: '7px', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: '10px', padding: '9px 18px', fontSize: '13px', fontWeight: 600, color: '#ef4444', cursor: 'pointer', fontFamily: FONT_BODY }}>
                  <RefreshCw size={13} /> Regenerar clave
                </button>
              </div>
            </div>
          </Card>

          <Card title="Documentación y SDKs">
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <p style={{ fontSize: '14px', color: 'var(--muted)', lineHeight: 1.6, margin: 0 }}>
                Integra ChannelAd en tus aplicaciones usando nuestra API REST. Gestiona campañas programáticamente, consulta métricas en tiempo real y automatiza flujos de trabajo.
              </p>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '10px' }}>
                {[
                  { label: 'Referencia API', desc: 'REST API docs' },
                  { label: 'SDK para Node.js', desc: 'npm install channelad' },
                  { label: 'SDK para Python', desc: 'pip install channelad' },
                  { label: 'Webhooks', desc: 'Eventos en tiempo real' },
                ].map(item => (
                  <div key={item.label} style={{ background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: '12px', padding: '14px', cursor: 'pointer', transition: 'border-color .15s' }}
                    onMouseEnter={e => { e.currentTarget.style.borderColor = purpleAlpha(0.4) }}
                    onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)' }}
                  >
                    <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text)', marginBottom: '3px' }}>{item.label}</div>
                    <div style={{ fontSize: '11px', color: 'var(--muted)', fontFamily: 'monospace' }}>{item.desc}</div>
                  </div>
                ))}
              </div>
              <button style={{ display: 'flex', alignItems: 'center', gap: '8px', background: purpleAlpha(0.1), border: `1px solid ${purpleAlpha(0.25)}`, borderRadius: '11px', padding: '11px 20px', fontSize: '13px', fontWeight: 600, color: PURPLE, cursor: 'pointer', fontFamily: FONT_BODY, width: 'fit-content' }}>
                Ver documentación completa →
              </button>
            </div>
          </Card>
        </div>
      )}

      {/* ── Save button ── */}
      {['perfil', 'notificaciones', 'seguridad', 'facturacion'].includes(tab) && (
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', paddingTop: '4px' }}>
          <button style={{ background: 'none', border: '1px solid var(--border)', borderRadius: '12px', padding: '12px 24px', fontSize: '14px', color: 'var(--muted)', cursor: 'pointer', fontFamily: FONT_BODY }}>
            Descartar cambios
          </button>
          <button
            onClick={save}
            disabled={saveState === 'saving'}
            style={{
              display: 'flex', alignItems: 'center', gap: '8px',
              background: saveState === 'saved' ? OK : PURPLE,
              color: '#fff', border: 'none', borderRadius: '12px',
              padding: '12px 28px', fontSize: '14px', fontWeight: 700,
              cursor: saveState === 'saving' ? 'wait' : 'pointer', fontFamily: FONT_BODY,
              transition: 'background .2s, box-shadow .2s',
              boxShadow: saveState === 'saved' ? `0 4px 14px ${OK}40` : `0 4px 14px ${purpleAlpha(0.35)}`,
              opacity: saveState === 'saving' ? 0.8 : 1,
            }}
          >
            {saveState === 'saving' && <RefreshCw size={14} style={{ animation: 'spin 1s linear infinite' }} />}
            {saveState === 'saved' && <Check size={14} strokeWidth={2.5} />}
            {saveState === 'idle' ? 'Guardar cambios' : saveState === 'saving' ? 'Guardando…' : 'Cambios guardados'}
          </button>
          <style>{`@keyframes spin { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }`}</style>
        </div>
      )}
    </div>
  )
}
