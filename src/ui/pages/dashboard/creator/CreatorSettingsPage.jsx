import React, { useState, useEffect } from 'react'
import { User, Bell, Lock, CreditCard, Link2, CheckCircle, AlertCircle, Loader2, Eye, EyeOff } from 'lucide-react'
import { useAuth } from '../../../../auth/AuthContext'
import apiService from '../../../../../services/api'
import { GREEN, greenAlpha, OK as _OK, ERR, FONT_BODY, FONT_DISPLAY, PLAT_COLORS } from '../../../theme/tokens'
import { ErrorBanner } from '../shared/DashComponents'

const WA  = GREEN
const WAG = greenAlpha
const OK  = _OK
const ER  = ERR
const F   = FONT_BODY
const D   = FONT_DISPLAY

const TABS = [
  { id: 'perfil',         icon: User,       label: 'Perfil' },
  { id: 'notificaciones', icon: Bell,       label: 'Notificaciones' },
  { id: 'seguridad',      icon: Lock,       label: 'Seguridad' },
  { id: 'cobros',         icon: CreditCard, label: 'Método de cobro' },
  { id: 'cuentas',        icon: Link2,      label: 'Cuentas conectadas' },
]

// ── Controlled input ─────────────────────────────────────────────────────────
const Inp = ({ label, type = 'text', value, onChange, placeholder, hint, error, disabled }) => {
  const [showPw, setShowPw] = useState(false)
  const isPw = type === 'password'
  return (
    <div>
      <label style={{ fontSize: '12px', fontWeight: 500, color: 'var(--muted)', display: 'block', marginBottom: '6px' }}>{label}</label>
      <div style={{ position: 'relative' }}>
        <input
          type={isPw && showPw ? 'text' : type}
          value={value || ''}
          onChange={e => onChange?.(e.target.value)}
          placeholder={placeholder}
          disabled={disabled}
          style={{
            width: '100%', boxSizing: 'border-box',
            background: disabled ? 'var(--bg2)' : 'var(--bg)',
            border: `1px solid ${error ? ER : 'var(--border-med)'}`,
            borderRadius: '10px', padding: '10px 14px',
            paddingRight: isPw ? '40px' : '14px',
            fontSize: '14px', color: 'var(--text)', fontFamily: F, outline: 'none',
            opacity: disabled ? 0.6 : 1,
            transition: 'border-color .15s',
          }}
          onFocus={e => { if (!error) e.target.style.borderColor = WAG(0.5) }}
          onBlur={e => { e.target.style.borderColor = error ? ER : 'var(--border-med)' }}
        />
        {isPw && (
          <button onClick={() => setShowPw(!showPw)} type="button" style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted)', display: 'flex', padding: '4px' }}>
            {showPw ? <EyeOff size={15} /> : <Eye size={15} />}
          </button>
        )}
      </div>
      {error && <div style={{ fontSize: '11px', color: ER, marginTop: '4px', fontWeight: 500 }}>{error}</div>}
      {hint && !error && <div style={{ fontSize: '11px', color: 'var(--muted2)', marginTop: '4px' }}>{hint}</div>}
    </div>
  )
}

// ── Toggle ───────────────────────────────────────────────────────────────────
const Toggle = ({ label, desc, on, onChange }) => (
  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 0', borderBottom: '1px solid var(--border)' }}>
    <div><div style={{ fontSize: '13px', fontWeight: 500, color: 'var(--text)', marginBottom: '2px' }}>{label}</div><div style={{ fontSize: '12px', color: 'var(--muted)' }}>{desc}</div></div>
    <button onClick={() => onChange?.(!on)} style={{ width: '44px', height: '24px', borderRadius: '12px', border: 'none', cursor: 'pointer', position: 'relative', background: on ? WA : 'var(--muted2)', transition: 'background .2s', flexShrink: 0 }}>
      <div style={{ position: 'absolute', top: '3px', left: on ? '22px' : '3px', width: '18px', height: '18px', borderRadius: '50%', background: '#fff', transition: 'left .2s' }} />
    </button>
  </div>
)

// ── Card ─────────────────────────────────────────────────────────────────────
const Card = ({ title, children }) => (
  <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '16px', overflow: 'hidden' }}>
    {title && <div style={{ padding: '18px 22px', borderBottom: '1px solid var(--border)' }}><h2 style={{ fontFamily: D, fontSize: '15px', fontWeight: 600, color: 'var(--text)' }}>{title}</h2></div>}
    <div style={{ padding: '22px' }}>{children}</div>
  </div>
)

// ── Toast ────────────────────────────────────────────────────────────────────
const Toast = ({ message, type = 'success', onClose }) => {
  useEffect(() => { const t = setTimeout(onClose, 3000); return () => clearTimeout(t) }, [onClose])
  const isOk = type === 'success'
  return (
    <div style={{ position: 'fixed', bottom: '24px', right: '24px', zIndex: 2000, background: 'var(--surface)', border: `1px solid ${isOk ? OK : ER}40`, borderRadius: '12px', padding: '14px 20px', display: 'flex', alignItems: 'center', gap: '10px', boxShadow: '0 8px 32px rgba(0,0,0,0.18)', animation: 'toast-in 200ms ease' }}>
      {isOk ? <CheckCircle size={18} color={OK} /> : <AlertCircle size={18} color={ER} />}
      <span style={{ fontSize: '13px', fontWeight: 500, color: 'var(--text)' }}>{message}</span>
      <style>{`@keyframes toast-in { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }`}</style>
    </div>
  )
}

// ── Platform connection card ─────────────────────────────────────────────────
const PlatformCard = ({ channel }) => {
  const c = PLAT_COLORS[channel.plataforma] || WA
  const connected = !!(channel.credenciales?.botToken || channel.credenciales?.accessToken || channel.credenciales?.phoneNumberId)
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: connected ? `${c}08` : 'var(--bg)', border: `1px solid ${connected ? `${c}30` : 'var(--border)'}`, borderRadius: '12px', padding: '14px 18px', transition: 'border-color .15s' }}
      onMouseEnter={e => { e.currentTarget.style.borderColor = `${c}50` }}
      onMouseLeave={e => { e.currentTarget.style.borderColor = connected ? `${c}30` : 'var(--border)' }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: `${c}15`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: D, fontWeight: 800, fontSize: '14px', color: c }}>
          {channel.plataforma?.slice(0, 2).toUpperCase()}
        </div>
        <div>
          <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text)' }}>{channel.nombreCanal || channel.plataforma}</div>
          <div style={{ fontSize: '12px', color: 'var(--muted)', marginTop: '2px' }}>
            {channel.plataforma} · {channel.estadisticas?.seguidores?.toLocaleString('es') || channel.audience?.toLocaleString('es') || '—'} seguidores
          </div>
        </div>
      </div>
      <span style={{
        background: connected ? `${OK}12` : `${ER}08`,
        color: connected ? OK : 'var(--muted)',
        border: `1px solid ${connected ? `${OK}30` : 'var(--border)'}`,
        borderRadius: '8px', padding: '4px 10px', fontSize: '11px', fontWeight: 600,
      }}>
        {connected ? '● Conectado' : '○ Sin conectar'}
      </span>
    </div>
  )
}

// ─── Main page ───────────────────────────────────────────────────────────────
export default function CreatorSettingsPage() {
  const { user } = useAuth()
  const [tab, setTab] = useState('perfil')
  const [loading, setLoading] = useState(true)
  const [fetchError, setFetchError] = useState(null)
  const [retryKey, setRetryKey] = useState(0)
  const [saving, setSaving] = useState(false)
  const [toast, setToast] = useState(null)
  const [errors, setErrors] = useState({})

  // ── Profile form state ──
  const [profile, setProfile] = useState({
    nombre: '', email: '', bio: '', sitioWeb: '', pais: '',
  })
  const up = (k, v) => { setProfile(p => ({ ...p, [k]: v })); setErrors(e => ({ ...e, [k]: null })) }

  // ── Notification prefs ──
  const [notifs, setNotifs] = useState({
    nuevaSolicitud: true, solicitudAprobada: true, pagoRecibido: true,
    retiroProcesado: true, recordatorio: true, novedades: false,
  })
  const tn = (k) => setNotifs(p => ({ ...p, [k]: !p[k] }))

  // ── Security form ──
  const [security, setSecurity] = useState({ actual: '', nueva: '', confirmar: '' })
  const us = (k, v) => { setSecurity(p => ({ ...p, [k]: v })); setErrors(e => ({ ...e, [k]: null })) }

  // ── Payment form ──
  const [payment, setPayment] = useState({
    titular: '', nif: '', iban: '', banco: '', bic: '', emailPaypal: '',
  })
  const upay = (k, v) => { setPayment(p => ({ ...p, [k]: v })); setErrors(e => ({ ...e, [k]: null })) }

  // ── Connected channels ──
  const [channels, setChannels] = useState([])

  // ── Load initial data ──
  useEffect(() => {
    let cancelled = false
    const load = async () => {
      try {
        const [profileRes, channelsRes] = await Promise.all([
          apiService.request('/auth/perfil').catch(() => null),
          apiService.getMyChannels().catch(() => null),
        ])
        if (cancelled) return

        if (profileRes?.success) {
          const u = profileRes.data || profileRes.user || {}
          setProfile({
            nombre: u.nombre || user?.nombre || '',
            email: u.email || user?.email || '',
            bio: u.perfilCreador?.biografia || '',
            sitioWeb: u.perfilCreador?.sitioWeb || '',
            pais: u.perfilCreador?.pais || u.ubicacion?.pais || '',
          })
          if (u.preferenciasNotificacion) setNotifs(p => ({ ...p, ...u.preferenciasNotificacion }))
          if (u.datosFacturacion) setPayment(p => ({ ...p, ...u.datosFacturacion }))
        } else {
          // Use auth context fallback
          setProfile(p => ({ ...p, nombre: user?.nombre || '', email: user?.email || '' }))
        }

        if (channelsRes?.success && Array.isArray(channelsRes.data)) {
          setChannels(channelsRes.data)
        }
      } catch {
        if (!cancelled) setFetchError('No se pudieron cargar los datos. Verifica tu conexion.')
      }
      if (!cancelled) setLoading(false)
    }
    load()
    return () => { cancelled = true }
  }, [user, retryKey])

  // ── Validation ──
  const validateProfile = () => {
    const e = {}
    if (!profile.nombre.trim()) e.nombre = 'El nombre es obligatorio'
    if (profile.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(profile.email)) e.email = 'Email inválido'
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

  const validatePayment = () => {
    const e = {}
    if (payment.iban && !/^[A-Z]{2}\d{2}[\s\d]{12,30}$/.test(payment.iban.replace(/\s/g, ''))) {
      e.iban = 'Formato IBAN inválido'
    }
    if (payment.emailPaypal && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(payment.emailPaypal)) {
      e.emailPaypal = 'Email inválido'
    }
    setErrors(e)
    return Object.keys(e).length === 0
  }

  // ── Save handlers ──
  const saveProfile = async () => {
    if (!validateProfile()) return
    setSaving(true)
    try {
      const res = await apiService.request('/auth/perfil', {
        method: 'PUT',
        body: JSON.stringify({
          nombre: profile.nombre,
          perfilCreador: { biografia: profile.bio, sitioWeb: profile.sitioWeb, pais: profile.pais },
        }),
      })
      setToast({ message: res?.success ? 'Perfil actualizado' : (res?.message || 'Error al guardar'), type: res?.success ? 'success' : 'error' })
    } catch {
      setToast({ message: 'Error de conexión', type: 'error' })
    }
    setSaving(false)
  }

  const saveNotifications = async () => {
    setSaving(true)
    try {
      const res = await apiService.request('/auth/perfil', {
        method: 'PUT',
        body: JSON.stringify({ preferenciasNotificacion: notifs }),
      })
      setToast({ message: res?.success ? 'Preferencias guardadas' : (res?.message || 'Error al guardar'), type: res?.success ? 'success' : 'error' })
    } catch {
      setToast({ message: 'Error de conexión', type: 'error' })
    }
    setSaving(false)
  }

  const saveSecurity = async () => {
    if (!validateSecurity()) return
    setSaving(true)
    try {
      const res = await apiService.request('/auth/cambiar-password', {
        method: 'POST',
        body: JSON.stringify({ passwordActual: security.actual, passwordNueva: security.nueva }),
      })
      if (res?.success) {
        setSecurity({ actual: '', nueva: '', confirmar: '' })
        setToast({ message: 'Contraseña actualizada', type: 'success' })
      } else {
        setToast({ message: res?.message || 'Error al cambiar contraseña', type: 'error' })
      }
    } catch {
      setToast({ message: 'Error de conexión', type: 'error' })
    }
    setSaving(false)
  }

  const savePayment = async () => {
    if (!validatePayment()) return
    setSaving(true)
    try {
      const res = await apiService.request('/auth/perfil', {
        method: 'PUT',
        body: JSON.stringify({ datosFacturacion: payment }),
      })
      setToast({ message: res?.success ? 'Datos de cobro guardados' : (res?.message || 'Error al guardar'), type: res?.success ? 'success' : 'error' })
    } catch {
      setToast({ message: 'Error de conexión', type: 'error' })
    }
    setSaving(false)
  }

  const handleSave = () => {
    if (tab === 'perfil') saveProfile()
    else if (tab === 'notificaciones') saveNotifications()
    else if (tab === 'seguridad') saveSecurity()
    else if (tab === 'cobros') savePayment()
  }

  const initials = (profile.nombre || user?.nombre || 'CR').slice(0, 2).toUpperCase()

  if (loading) {
    return (
      <div style={{ fontFamily: F, display: 'flex', alignItems: 'center', justifyContent: 'center', height: '50vh', gap: '10px', color: 'var(--muted)' }}>
        <Loader2 size={20} style={{ animation: 'spin 1s linear infinite' }} />
        <span>Cargando configuración...</span>
        <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
      </div>
    )
  }

  return (
    <div style={{ fontFamily: F, display: 'flex', flexDirection: 'column', gap: '22px', maxWidth: '860px' }}>
      <div>
        <h1 style={{ fontFamily: D, fontSize: '26px', fontWeight: 700, color: 'var(--text)', letterSpacing: '-0.03em', marginBottom: '4px' }}>Configuración</h1>
        <p style={{ fontSize: '14px', color: 'var(--muted)' }}>Gestiona tu cuenta y preferencias de creador</p>
      </div>

      {fetchError && (
        <ErrorBanner
          message={fetchError}
          onRetry={() => { setFetchError(null); setRetryKey(k => k + 1) }}
        />
      )}

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '4px', borderBottom: '1px solid var(--border)', overflowX: 'auto' }}>
        {TABS.map(t => (
          <button key={t.id} onClick={() => { setTab(t.id); setErrors({}) }} style={{ display: 'flex', alignItems: 'center', gap: '7px', background: 'none', border: 'none', cursor: 'pointer', padding: '10px 16px', fontSize: '13px', fontWeight: tab === t.id ? 600 : 400, color: tab === t.id ? WA : 'var(--muted)', borderBottom: `2px solid ${tab === t.id ? WA : 'transparent'}`, marginBottom: '-1px', fontFamily: F, transition: 'color .15s', whiteSpace: 'nowrap' }}>
            <t.icon size={15} strokeWidth={tab === t.id ? 2.2 : 1.8} /> {t.label}
          </button>
        ))}
      </div>

      {/* ── Profile ── */}
      {tab === 'perfil' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <Card title="Información personal">
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                <Inp label="Nombre completo *" value={profile.nombre} onChange={v => up('nombre', v)} error={errors.nombre} />
                <Inp label="Email" type="email" value={profile.email} disabled hint="El email no se puede cambiar" />
              </div>
              <Inp label="Descripción / Bio" value={profile.bio} onChange={v => up('bio', v)} hint="Aparecerá en tu perfil público como creador" />
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                <Inp label="Sitio web" value={profile.sitioWeb} onChange={v => up('sitioWeb', v)} placeholder="https://tuwebsite.com" />
                <Inp label="País" value={profile.pais} onChange={v => up('pais', v)} placeholder="España" />
              </div>
            </div>
          </Card>
          <Card title="Avatar">
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
              <div style={{ width: '64px', height: '64px', borderRadius: '50%', background: WAG(0.15), border: `2px solid ${WAG(0.4)}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: D, fontWeight: 700, fontSize: '24px', color: WA, flexShrink: 0 }}>
                {initials}
              </div>
              <div>
                <button style={{ background: WAG(0.1), border: `1px solid ${WAG(0.25)}`, borderRadius: '9px', padding: '8px 16px', fontSize: '13px', fontWeight: 600, color: WA, cursor: 'pointer', fontFamily: F }}>Subir imagen</button>
                <div style={{ fontSize: '11px', color: 'var(--muted)', marginTop: '6px' }}>PNG o JPG, máx. 2MB</div>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* ── Notifications ── */}
      {tab === 'notificaciones' && (
        <Card title="Preferencias de notificación">
          <Toggle label="Nueva solicitud de anunciante" desc="Notificación cuando un anunciante envía una propuesta" on={notifs.nuevaSolicitud} onChange={() => tn('nuevaSolicitud')} />
          <Toggle label="Solicitud aprobada" desc="Confirmación cuando aceptas una solicitud" on={notifs.solicitudAprobada} onChange={() => tn('solicitudAprobada')} />
          <Toggle label="Pago recibido" desc="Aviso cuando recibes un ingreso en tu cuenta" on={notifs.pagoRecibido} onChange={() => tn('pagoRecibido')} />
          <Toggle label="Retiro procesado" desc="Confirmación cuando tu retiro se ha procesado" on={notifs.retiroProcesado} onChange={() => tn('retiroProcesado')} />
          <Toggle label="Recordatorio de respuesta" desc="Aviso si llevas más de 24h sin responder a una solicitud" on={notifs.recordatorio} onChange={() => tn('recordatorio')} />
          <Toggle label="Novedades de Adflow" desc="Actualizaciones y nuevas funcionalidades de la plataforma" on={notifs.novedades} onChange={() => tn('novedades')} />
        </Card>
      )}

      {/* ── Security ── */}
      {tab === 'seguridad' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <Card title="Cambiar contraseña">
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <Inp label="Contraseña actual" type="password" value={security.actual} onChange={v => us('actual', v)} placeholder="••••••••" error={errors.actual} />
              <Inp label="Nueva contraseña" type="password" value={security.nueva} onChange={v => us('nueva', v)} placeholder="Mínimo 8 caracteres" error={errors.nueva} hint="Debe incluir mayúscula, minúscula y número" />
              <Inp label="Confirmar nueva contraseña" type="password" value={security.confirmar} onChange={v => us('confirmar', v)} placeholder="Repite la contraseña" error={errors.confirmar} />
            </div>
          </Card>
          <Card title="Autenticación de dos factores">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
              <div>
                <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text)', marginBottom: '4px' }}>2FA por aplicación autenticadora</div>
                <div style={{ fontSize: '13px', color: 'var(--muted)' }}>Protege tu cuenta con una capa extra de seguridad</div>
              </div>
              <button style={{ background: WAG(0.1), border: `1px solid ${WAG(0.25)}`, borderRadius: '10px', padding: '10px 20px', fontSize: '13px', fontWeight: 600, color: WA, cursor: 'pointer', fontFamily: F, whiteSpace: 'nowrap' }}>Activar 2FA</button>
            </div>
          </Card>
          <Card title="Sesiones activas">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <div style={{ fontSize: '13px', fontWeight: 500, color: 'var(--text)', marginBottom: '3px' }}>Sesión actual</div>
                <div style={{ fontSize: '12px', color: 'var(--muted)' }}>Navegador web · Último acceso: ahora</div>
              </div>
              <span style={{ background: `${OK}12`, color: OK, borderRadius: '8px', padding: '3px 10px', fontSize: '11px', fontWeight: 600 }}>Activa</span>
            </div>
          </Card>
        </div>
      )}

      {/* ── Payments ── */}
      {tab === 'cobros' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <Card title="Cuenta bancaria para cobros">
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                <Inp label="Titular de la cuenta" value={payment.titular} onChange={v => upay('titular', v)} />
                <Inp label="NIF / DNI" value={payment.nif} onChange={v => upay('nif', v)} placeholder="12345678A" />
              </div>
              <Inp label="IBAN" value={payment.iban} onChange={v => upay('iban', v)} placeholder="ES91 2100 0418 4502 0005 1332" hint="Deben coincidir titular y NIF" error={errors.iban} />
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                <Inp label="Banco" value={payment.banco} onChange={v => upay('banco', v)} placeholder="CaixaBank" />
                <Inp label="BIC / SWIFT" value={payment.bic} onChange={v => upay('bic', v)} placeholder="CAIXESBBXXX" />
              </div>
            </div>
          </Card>
          <Card title="PayPal (alternativa)">
            <Inp label="Email de PayPal" type="email" value={payment.emailPaypal} onChange={v => upay('emailPaypal', v)} placeholder="tu@paypal.com" hint="Para retiros instantáneos con una pequeña comisión" error={errors.emailPaypal} />
          </Card>
          <div style={{ background: WAG(0.06), border: `1px solid ${WAG(0.2)}`, borderRadius: '12px', padding: '14px 16px', fontSize: '13px', color: 'var(--muted)' }}>
            Los retiros se procesan en 2-3 días hábiles a cuenta bancaria, o de forma instantánea por PayPal (2% comisión).
          </div>
        </div>
      )}

      {/* ── Connected accounts ── */}
      {tab === 'cuentas' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <Card title="Plataformas conectadas">
            {channels.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '24px', color: 'var(--muted)', fontSize: '13px' }}>
                No tienes canales registrados. <a href="/creator/channels" style={{ color: WA, fontWeight: 600, textDecoration: 'none' }}>Registrar canal</a>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {channels.map(ch => <PlatformCard key={ch._id || ch.id} channel={ch} />)}
              </div>
            )}
          </Card>
          <div style={{ background: WAG(0.06), border: `1px solid ${WAG(0.2)}`, borderRadius: '12px', padding: '14px 16px', fontSize: '13px', color: 'var(--muted)' }}>
            Conecta las APIs de tus plataformas para obtener métricas automáticas y mejorar tu puntuación de canal. Gestiona las credenciales desde <strong>Mis Canales → Detalle → Score</strong>.
          </div>
        </div>
      )}

      {/* ── Save button ── */}
      {['perfil', 'notificaciones', 'seguridad', 'cobros'].includes(tab) && (
        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <button
            onClick={handleSave}
            disabled={saving}
            style={{
              background: saving ? 'var(--muted2)' : WA,
              color: '#fff', border: 'none', borderRadius: '12px',
              padding: '12px 28px', fontSize: '14px', fontWeight: 600,
              cursor: saving ? 'default' : 'pointer', fontFamily: F,
              transition: 'background .2s, transform .1s',
              boxShadow: `0 4px 14px ${WAG(0.3)}`,
              display: 'flex', alignItems: 'center', gap: '8px',
              opacity: saving ? 0.7 : 1,
            }}
            onMouseEnter={e => { if (!saving) e.currentTarget.style.transform = 'translateY(-1px)' }}
            onMouseLeave={e => { e.currentTarget.style.transform = 'none' }}
          >
            {saving && <Loader2 size={15} style={{ animation: 'spin 1s linear infinite' }} />}
            {saving ? 'Guardando...' : 'Guardar cambios'}
          </button>
        </div>
      )}

      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
      <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
    </div>
  )
}
