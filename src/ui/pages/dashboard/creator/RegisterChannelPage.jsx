import React, { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  ChevronLeft, ChevronRight, CheckCircle, AlertCircle, Link2,
  Shield, Zap, Eye, Users, DollarSign, ArrowRight, Lock, Unlock,
  ExternalLink, Copy, X, Loader, Settings,
} from 'lucide-react'
import apiService from '../../../../../services/api'

// ─── Design tokens ──────────────────────────────────────────────────────────
const A  = '#8b5cf6'
const AG = (o) => `rgba(139,92,246,${o})`
const F  = "'Inter', system-ui, sans-serif"
const D  = "'Sora', system-ui, sans-serif"
const OK = '#10b981'
const WR = '#f59e0b'
const ER = '#ef4444'
const BL = '#3b82f6'
const WA = '#25d366'

const CATEGORIES = ['Tecnologia', 'Marketing', 'Negocios', 'Gaming', 'Fitness', 'Finanzas', 'Ecommerce', 'Educacion', 'Entretenimiento', 'Salud', 'Crypto', 'Lifestyle']

const inp = {
  width: '100%', boxSizing: 'border-box', background: 'var(--bg)',
  border: '1px solid var(--border)', borderRadius: '12px',
  padding: '12px 16px', fontSize: '14px', color: 'var(--text)',
  fontFamily: F, outline: 'none', transition: 'border-color .2s, box-shadow .2s',
}

// ─── Platform definitions ────────────────────────────────────────────────────
const PLATFORMS = [
  {
    id: 'telegram',
    name: 'Telegram',
    icon: '✈️',
    color: '#2aabee',
    description: 'Canales y grupos de Telegram',
    verifyMethod: 'Bot Token + Chat ID',
    fields: [
      { key: 'botToken', label: 'Bot Token', type: 'password', placeholder: '123456:ABC-DEF1234ghIkl-zyx57W2v1u123ew11', required: true },
      { key: 'chatId', label: 'Chat ID / Username', type: 'text', placeholder: '@tucanal o -1001234567890', required: true },
    ],
    steps: [
      'Abre Telegram y busca @BotFather',
      'Envia /newbot y sigue las instrucciones para crear tu bot',
      'Copia el token que te da BotFather',
      'Anade tu bot como administrador del canal',
      'Introduce el username de tu canal (ej: @tucanal) o el Chat ID numerico',
    ],
    metricsObtained: ['Suscriptores', 'Nombre del canal', 'Descripcion', 'Tipo de chat'],
    securityNote: 'El bot necesita permisos de solo lectura. Solo accedemos a estadisticas publicas del canal.',
  },
  {
    id: 'whatsapp',
    name: 'WhatsApp',
    icon: '💬',
    color: '#25d366',
    description: 'Canales y comunidades de WhatsApp',
    verifyMethod: 'WhatsApp Business API',
    fields: [
      { key: 'accessToken', label: 'Access Token', type: 'password', placeholder: 'EAAGm0PZC8jXABO...', required: true },
      { key: 'phoneNumber', label: 'Numero de telefono', type: 'text', placeholder: '+34612345678', required: true },
    ],
    steps: [
      'Accede a Meta Business Suite (business.facebook.com)',
      'Ve a Configuracion → WhatsApp → API setup',
      'Genera un Access Token permanente',
      'Copia el numero de telefono asociado',
      'Asegurate de que el numero esta verificado en Meta Business',
    ],
    metricsObtained: ['Numero verificado', 'Nombre del negocio', 'Estado del numero'],
    securityNote: 'Usamos la API oficial de Meta. Solo leemos el perfil y estadisticas basicas.',
  },
  {
    id: 'discord',
    name: 'Discord',
    icon: '🎮',
    color: '#5865f2',
    description: 'Servidores de Discord',
    verifyMethod: 'Bot Token + Server ID',
    fields: [
      { key: 'botToken', label: 'Bot Token', type: 'password', placeholder: 'MTA4NzE2OTczNjQ0...', required: true },
      { key: 'serverId', label: 'Server ID', type: 'text', placeholder: '1087169736440...', required: true },
    ],
    steps: [
      'Ve a discord.com/developers/applications y crea una nueva aplicacion',
      'En la seccion "Bot", crea un bot y copia el token',
      'Invita el bot a tu servidor con permisos de lectura',
      'Activa el "Developer Mode" en Discord → Ajustes → Avanzado',
      'Click derecho en tu servidor → Copiar ID',
    ],
    metricsObtained: ['Miembros totales', 'Miembros online', 'Nombre del servidor'],
    securityNote: 'El bot solo necesita permisos de lectura. No puede enviar mensajes ni modificar el servidor.',
  },
  {
    id: 'instagram',
    name: 'Instagram',
    icon: '📸',
    color: '#e1306c',
    description: 'Cuentas profesionales de Instagram',
    verifyMethod: 'Instagram Graph API',
    fields: [
      { key: 'accessToken', label: 'Access Token', type: 'password', placeholder: 'EAAGm0PZC8jXABO...', required: true },
    ],
    steps: [
      'Convierte tu cuenta a Profesional (Negocio o Creador)',
      'Conecta tu cuenta de Instagram a una pagina de Facebook',
      'Ve a developers.facebook.com y crea una app',
      'En "Instagram Basic Display" o "Instagram Graph API", genera un token',
      'Asegurate de otorgar permisos: instagram_basic, pages_show_list',
    ],
    metricsObtained: ['Seguidores', 'Publicaciones totales', 'Engagement rate', 'Likes/comentarios promedio'],
    securityNote: 'Usamos Instagram Graph API oficial. Solo leemos datos publicos de tu perfil y publicaciones.',
  },
  {
    id: 'newsletter',
    name: 'Newsletter',
    icon: '📧',
    color: '#f59e0b',
    description: 'Substack, Mailchimp, ConvertKit, etc.',
    verifyMethod: 'API Key de tu plataforma',
    fields: [
      { key: 'accessToken', label: 'API Key', type: 'password', placeholder: 'Tu API key de la plataforma de email', required: true },
    ],
    steps: [
      'Accede a la configuracion de tu plataforma de newsletter',
      'Busca la seccion de API o Integraciones',
      'Genera una API key con permisos de lectura',
      'Copia la key e introducela aqui',
      'Plataformas soportadas: Substack, Mailchimp, ConvertKit, Beehiiv',
    ],
    metricsObtained: ['Suscriptores', 'Open rate', 'Click rate'],
    securityNote: 'Solo leemos estadisticas. Nunca enviamos emails ni modificamos tu lista de suscriptores.',
  },
  {
    id: 'facebook',
    name: 'Facebook',
    icon: '👤',
    color: '#1877f2',
    description: 'Paginas y grupos de Facebook',
    verifyMethod: 'Facebook Page Token',
    fields: [
      { key: 'accessToken', label: 'Page Access Token', type: 'password', placeholder: 'EAAGm0PZC8jXABO...', required: true },
    ],
    steps: [
      'Ve a developers.facebook.com y crea una app',
      'Anade el producto "Facebook Login"',
      'En Graph API Explorer, selecciona tu pagina',
      'Genera un token con permisos: pages_read_engagement, read_insights',
      'Usa "Extend Access Token" para un token de larga duracion',
    ],
    metricsObtained: ['Seguidores', 'Likes de pagina', 'Engagement rate', 'Alcance'],
    securityNote: 'Usamos la Graph API oficial de Meta. Solo accedemos a estadisticas de tu pagina.',
  },
]

// ─── Step indicator ─────────────────────────────────────────────────────────
const StepIndicator = ({ current, total, labels }) => (
  <div style={{ display: 'flex', gap: '0', marginBottom: '32px' }}>
    {Array.from({ length: total }, (_, i) => {
      const done = i < current
      const active = i === current
      return (
        <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <div style={{
              width: '28px', height: '28px', borderRadius: '50%', flexShrink: 0,
              background: done ? A : active ? AG(0.15) : 'var(--bg)',
              border: `2px solid ${done ? A : active ? A : 'var(--border)'}`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              transition: 'all .3s',
            }}>
              {done ? <CheckCircle size={14} color="#fff" /> : (
                <span style={{ fontSize: '12px', fontWeight: 700, color: active ? A : 'var(--muted)' }}>{i + 1}</span>
              )}
            </div>
            {i < total - 1 && (
              <div style={{ flex: 1, height: '2px', background: done ? A : 'var(--border)', margin: '0 6px', transition: 'background .3s' }} />
            )}
          </div>
          <span style={{ fontSize: '11px', fontWeight: done || active ? 600 : 400, color: done ? A : active ? 'var(--text)' : 'var(--muted)', paddingRight: '8px' }}>
            {labels[i]}
          </span>
        </div>
      )
    })}
  </div>
)

// ─── Copyable code block ─────────────────────────────────────────────────────
const CopyBlock = ({ text }) => {
  const [copied, setCopied] = useState(false)
  const copy = () => { navigator.clipboard?.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 1500) }
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: '8px', padding: '8px 12px', fontSize: '12px', fontFamily: 'monospace', color: 'var(--text)' }}>
      <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{text}</span>
      <button onClick={copy} style={{ background: 'none', border: 'none', cursor: 'pointer', color: copied ? OK : 'var(--muted)', padding: '2px', display: 'flex' }}>
        {copied ? <CheckCircle size={14} /> : <Copy size={14} />}
      </button>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN PAGE
// ═══════════════════════════════════════════════════════════════════════════════
export default function RegisterChannelPage() {
  const navigate = useNavigate()
  const [step, setStep] = useState(0)       // 0=platform, 1=connect, 2=info, 3=verify-post, 4=result
  const [platform, setPlatform] = useState(null)
  const [credentials, setCredentials] = useState({})
  const [form, setForm] = useState({ name: '', url: '', category: 'Tecnologia', desc: '', price: '' })
  const [connecting, setConnecting] = useState(false)
  const [creating, setCreating] = useState(false)
  const [connectionResult, setConnectionResult] = useState(null)
  const [error, setError] = useState('')
  const [createdChannel, setCreatedChannel] = useState(null)
  const [verifyLink, setVerifyLink] = useState(null)
  const [verifyStatus, setVerifyStatus] = useState(null)
  const [pollActive, setPollActive] = useState(false)
  const contentRef = useRef(null)

  useEffect(() => {
    contentRef.current?.scrollTo?.({ top: 0, behavior: 'smooth' })
  }, [step])

  // Poll verification status every 5s when on verify step
  useEffect(() => {
    if (step !== 3 || !createdChannel) return
    let active = true
    const channelId = createdChannel._id || createdChannel.id
    const poll = async () => {
      try {
        const res = await apiService.checkVerificationStatus(channelId)
        if (res?.success && active) {
          setVerifyStatus(res.data)
          if (res.data.status === 'verified') {
            setPollActive(false)
            // Auto-advance after short delay
            setTimeout(() => { if (active) setStep(4) }, 1500)
          }
        }
      } catch {}
    }
    poll()
    setPollActive(true)
    const interval = setInterval(poll, 5000)
    return () => { active = false; clearInterval(interval) }
  }, [step, createdChannel])

  const update = (k, v) => setForm(p => ({ ...p, [k]: v }))
  const updateCred = (k, v) => setCredentials(p => ({ ...p, [k]: v }))
  const platDef = PLATFORMS.find(p => p.id === platform)

  // ── Step 1: Verify connection ──
  const handleVerify = async () => {
    if (!platDef) return
    const missing = platDef.fields.filter(f => f.required && !credentials[f.key]?.trim())
    if (missing.length > 0) { setError(`Faltan campos obligatorios: ${missing.map(f => f.label).join(', ')}`); return }

    setConnecting(true); setError('')
    try {
      // Create a temporary channel first, then connect
      const createRes = await apiService.createChannel({
        nombreCanal: credentials.chatId || credentials.serverId || credentials.phoneNumber || platform,
        plataforma: platform,
        identificadorCanal: credentials.chatId || credentials.serverId || credentials.phoneNumber || `${platform}-${Date.now()}`,
        categoria: 'Tecnologia',
      })

      if (!createRes?.success) {
        setError(createRes?.message || 'Error al crear el canal')
        setConnecting(false)
        return
      }

      const channelId = createRes.data?._id || createRes.data?.id
      setCreatedChannel(createRes.data)

      // Now connect the platform
      const connectRes = await apiService.connectPlatform(channelId, credentials)
      if (connectRes?.success) {
        setConnectionResult(connectRes.data)
        // Update channel name if we got it from the API
        if (connectRes.data?.platformData?.raw?.title || connectRes.data?.platformData?.raw?.name) {
          setForm(p => ({ ...p, name: p.name || connectRes.data.platformData.raw.title || connectRes.data.platformData.raw.name || '' }))
        }
        setStep(2)
      } else {
        setError(connectRes?.message || 'No se pudo verificar la conexion. Revisa las credenciales.')
        // If connection fails, still allow to proceed with estimated data
        setConnectionResult({ connected: false, estimated: true, followers: 0, scores: null })
      }
    } catch (e) {
      setError('Error de conexion. Intenta de nuevo.')
    }
    setConnecting(false)
  }

  // ── Skip verification (use estimates) ──
  const handleSkipVerification = async () => {
    setConnecting(true); setError('')
    try {
      const createRes = await apiService.createChannel({
        nombreCanal: form.name || `Canal ${platform}`,
        plataforma: platform,
        identificadorCanal: `${platform}-manual-${Date.now()}`,
        categoria: 'Tecnologia',
      })
      if (createRes?.success) {
        setCreatedChannel(createRes.data)
        setConnectionResult({ connected: false, estimated: true, followers: 0, scores: null })
        setStep(2)
      } else {
        setError(createRes?.message || 'Error al crear el canal')
      }
    } catch { setError('Error de conexion') }
    setConnecting(false)
  }

  // ── Step 2: Save channel info ──
  const handleSaveInfo = async () => {
    if (!form.name.trim()) { setError('El nombre del canal es obligatorio'); return }
    if (!form.price || Number(form.price) <= 0) { setError('Introduce un precio por publicacion'); return }
    setCreating(true); setError('')
    try {
      const channelId = createdChannel?._id || createdChannel?.id
      if (!channelId) { setError('Error: canal no encontrado'); setCreating(false); return }

      const res = await apiService.updateChannel(channelId, {
        nombreCanal: form.name.trim(),
        descripcion: form.desc.trim(),
        categoria: form.category,
        precio: Number(form.price),
        identificadorCanal: form.url.trim() || createdChannel.identificadorCanal,
      })
      if (res?.success) {
        // Generate verification link for test post
        try {
          const vRes = await apiService.createVerificationLink(channelId)
          if (vRes?.success) setVerifyLink(vRes.data)
        } catch {}
        setStep(3) // Go to verification post step
      } else {
        setError(res?.message || 'Error al guardar')
      }
    } catch { setError('Error de conexion') }
    setCreating(false)
  }

  // ── Skip test post ──
  const handleSkipTestPost = () => setStep(4)

  return (
    <div ref={contentRef} style={{ fontFamily: F, maxWidth: '720px', margin: '0 auto' }}>
      <style>{`
        @keyframes rcp-in { from { opacity: 0; transform: translateY(12px) } to { opacity: 1; transform: none } }
        @keyframes pulse { 0%, 100% { opacity: 1 } 50% { opacity: 0.4 } }
        .rcp-inp:focus { border-color: ${AG(0.6)} !important; box-shadow: 0 0 0 3px ${AG(0.1)} !important; }
        .rcp-card { transition: all .2s; cursor: pointer; }
        .rcp-card:hover { border-color: ${AG(0.5)} !important; transform: translateY(-2px); box-shadow: 0 8px 24px rgba(0,0,0,0.08) !important; }
      `}</style>

      {/* ── Back button ── */}
      <button onClick={() => step > 0 ? setStep(s => s - 1) : navigate('/creator/channels')} style={{
        background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted)',
        fontFamily: F, fontSize: '13px', display: 'flex', alignItems: 'center', gap: '4px',
        padding: 0, marginBottom: '20px',
      }}>
        <ChevronLeft size={16} /> {step > 0 ? 'Paso anterior' : 'Volver a mis canales'}
      </button>

      {/* ── Header ── */}
      <div style={{ marginBottom: '28px' }}>
        <h1 style={{ fontFamily: D, fontSize: '26px', fontWeight: 800, color: 'var(--text)', letterSpacing: '-0.03em', marginBottom: '6px' }}>
          {step === 4 ? '¡Canal registrado!' : step === 3 ? 'Post de prueba' : 'Conectar plataforma'}
        </h1>
        <p style={{ fontSize: '14px', color: 'var(--muted)', lineHeight: 1.5 }}>
          {step === 0 && 'Elige tu plataforma para conectar y verificar tu canal automaticamente'}
          {step === 1 && `Conecta tu ${platDef?.name || 'canal'} para obtener metricas en tiempo real`}
          {step === 2 && 'Completa la informacion de tu canal'}
          {step === 3 && 'Publica el enlace de prueba en tu canal para verificar las metricas reales'}
          {step === 4 && 'Tu canal esta listo. Configura disponibilidad y precios para empezar a recibir campanas.'}
        </p>
      </div>

      {/* ── Step indicator ── */}
      {step < 4 && (
        <StepIndicator current={step} total={4} labels={['Plataforma', 'Conexion', 'Informacion', 'Post de prueba']} />
      )}

      {/* ── Error banner ── */}
      {error && (
        <div style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)', borderRadius: '12px', padding: '12px 16px', marginBottom: '20px', display: 'flex', alignItems: 'flex-start', gap: '10px', animation: 'rcp-in .2s ease' }}>
          <AlertCircle size={16} color={ER} style={{ flexShrink: 0, marginTop: '1px' }} />
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: '13px', fontWeight: 600, color: ER }}>{error}</div>
          </div>
          <button onClick={() => setError('')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: ER, padding: 0, display: 'flex' }}><X size={14} /></button>
        </div>
      )}

      {/* ════════════════════════════════════════════════════════════════════════ */}
      {/* STEP 0: Choose platform                                                */}
      {/* ════════════════════════════════════════════════════════════════════════ */}
      {step === 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', animation: 'rcp-in .3s ease' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '12px' }}>
            {PLATFORMS.map(p => {
              const selected = platform === p.id
              return (
                <div key={p.id} className="rcp-card"
                  onClick={() => setPlatform(p.id)}
                  style={{
                    background: selected ? `${p.color}08` : 'var(--surface)',
                    border: `2px solid ${selected ? p.color : 'var(--border)'}`,
                    borderRadius: '16px', padding: '20px',
                    boxShadow: selected ? `0 4px 20px ${p.color}20` : '0 1px 4px rgba(0,0,0,0.04)',
                    position: 'relative',
                  }}
                >
                  {selected && (
                    <div style={{ position: 'absolute', top: '12px', right: '12px' }}>
                      <CheckCircle size={18} color={p.color} />
                    </div>
                  )}
                  <div style={{
                    width: '48px', height: '48px', borderRadius: '14px',
                    background: `${p.color}15`, border: `1px solid ${p.color}30`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '24px', marginBottom: '14px',
                  }}>
                    {p.icon}
                  </div>
                  <div style={{ fontFamily: D, fontSize: '15px', fontWeight: 700, color: 'var(--text)', marginBottom: '4px' }}>
                    {p.name}
                  </div>
                  <div style={{ fontSize: '12px', color: 'var(--muted)', lineHeight: 1.4 }}>
                    {p.description}
                  </div>
                  <div style={{ marginTop: '10px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <Lock size={10} color={p.color} />
                    <span style={{ fontSize: '10px', color: p.color, fontWeight: 600 }}>{p.verifyMethod}</span>
                  </div>
                </div>
              )
            })}
          </div>

          {/* Continue button */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '8px' }}>
            <button
              onClick={() => { if (platform) setStep(1) }}
              disabled={!platform}
              style={{
                display: 'flex', alignItems: 'center', gap: '8px',
                background: platform ? A : AG(0.3), color: '#fff', border: 'none',
                borderRadius: '12px', padding: '12px 28px', fontSize: '14px',
                fontWeight: 700, cursor: platform ? 'pointer' : 'not-allowed',
                fontFamily: F, transition: 'all .2s',
                boxShadow: platform ? `0 4px 16px ${AG(0.35)}` : 'none',
              }}
            >
              Continuar <ArrowRight size={16} />
            </button>
          </div>
        </div>
      )}

      {/* ════════════════════════════════════════════════════════════════════════ */}
      {/* STEP 1: Verify / Connect platform                                      */}
      {/* ════════════════════════════════════════════════════════════════════════ */}
      {step === 1 && platDef && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', animation: 'rcp-in .3s ease' }}>

          {/* Platform header */}
          <div style={{
            background: `linear-gradient(135deg, ${platDef.color}10, ${platDef.color}05)`,
            border: `1px solid ${platDef.color}25`, borderRadius: '16px',
            padding: '20px 24px', display: 'flex', alignItems: 'center', gap: '16px',
          }}>
            <div style={{
              width: '52px', height: '52px', borderRadius: '14px',
              background: `${platDef.color}18`, border: `1px solid ${platDef.color}30`,
              display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '26px', flexShrink: 0,
            }}>
              {platDef.icon}
            </div>
            <div>
              <div style={{ fontFamily: D, fontSize: '18px', fontWeight: 700, color: 'var(--text)' }}>
                Conectar {platDef.name}
              </div>
              <div style={{ fontSize: '13px', color: 'var(--muted)', marginTop: '2px' }}>
                Verificacion via {platDef.verifyMethod}
              </div>
            </div>
          </div>

          {/* Security badge */}
          <div style={{
            background: `${OK}08`, border: `1px solid ${OK}20`, borderRadius: '12px',
            padding: '14px 16px', display: 'flex', alignItems: 'flex-start', gap: '10px',
          }}>
            <Shield size={16} color={OK} style={{ flexShrink: 0, marginTop: '1px' }} />
            <div>
              <div style={{ fontSize: '12px', fontWeight: 600, color: OK, marginBottom: '2px' }}>Conexion segura</div>
              <div style={{ fontSize: '12px', color: 'var(--muted)', lineHeight: 1.4 }}>{platDef.securityNote}</div>
            </div>
          </div>

          {/* How to get credentials - step by step */}
          <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '16px', overflow: 'hidden' }}>
            <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Eye size={14} color={A} />
              <span style={{ fontFamily: D, fontSize: '14px', fontWeight: 700, color: 'var(--text)' }}>Como obtener las credenciales</span>
            </div>
            <div style={{ padding: '16px 20px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {platDef.steps.map((s, i) => (
                  <div key={i} style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
                    <div style={{
                      width: '22px', height: '22px', borderRadius: '50%',
                      background: AG(0.1), border: `1px solid ${AG(0.25)}`,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: '11px', fontWeight: 700, color: A, flexShrink: 0,
                    }}>
                      {i + 1}
                    </div>
                    <span style={{ fontSize: '13px', color: 'var(--text)', lineHeight: 1.5, paddingTop: '1px' }}>{s}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Credential input fields */}
          <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '16px', overflow: 'hidden' }}>
            <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Link2 size={14} color={A} />
              <span style={{ fontFamily: D, fontSize: '14px', fontWeight: 700, color: 'var(--text)' }}>Credenciales de conexion</span>
            </div>
            <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {platDef.fields.map(f => (
                <div key={f.key}>
                  <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--muted)', display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '6px' }}>
                    {f.label} {f.required && <span style={{ color: ER }}>*</span>}
                  </label>
                  <input
                    className="rcp-inp"
                    type={f.type}
                    value={credentials[f.key] || ''}
                    onChange={e => updateCred(f.key, e.target.value)}
                    placeholder={f.placeholder}
                    style={inp}
                  />
                </div>
              ))}
            </div>
          </div>

          {/* What we'll get */}
          <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '16px', padding: '16px 20px' }}>
            <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--muted)', marginBottom: '10px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Metricas que obtendremos
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
              {platDef.metricsObtained.map(m => (
                <span key={m} style={{
                  background: AG(0.08), border: `1px solid ${AG(0.18)}`, borderRadius: '20px',
                  padding: '4px 12px', fontSize: '12px', fontWeight: 500, color: A,
                }}>
                  {m}
                </span>
              ))}
            </div>
          </div>

          {/* Score formula */}
          <div style={{ background: `${A}06`, border: `1px solid ${AG(0.15)}`, borderRadius: '14px', padding: '16px 20px' }}>
            <div style={{ fontSize: '13px', fontWeight: 700, color: A, marginBottom: '8px' }}>Como se calcula el score</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '12px', color: 'var(--muted)', lineHeight: 1.5 }}>
              <div><strong style={{ color: 'var(--text)' }}>Atencion (25%)</strong> — views × engagement × scroll depth</div>
              <div><strong style={{ color: 'var(--text)' }}>Intencion (15%)</strong> — tipo de contenido (memes=40, niche=85, finanzas=90)</div>
              <div><strong style={{ color: 'var(--text)' }}>Confianza (20%)</strong> — repeat rate + calidad de audiencia</div>
              <div><strong style={{ color: 'var(--text)' }}>Rendimiento (25%)</strong> — CTR (60%) + conversion rate (40%)</div>
              <div><strong style={{ color: 'var(--text)' }}>Liquidez (15%)</strong> — fill rate × tiempo de respuesta</div>
            </div>
          </div>

          {/* Action buttons */}
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', flexWrap: 'wrap' }}>
            <button
              onClick={handleSkipVerification}
              disabled={connecting}
              style={{
                display: 'flex', alignItems: 'center', gap: '6px',
                background: 'var(--surface)', border: '1px solid var(--border)',
                borderRadius: '12px', padding: '12px 20px', fontSize: '13px',
                color: 'var(--muted)', cursor: 'pointer', fontFamily: F,
              }}
            >
              <Unlock size={14} /> Registrar sin verificar
            </button>
            <button
              onClick={handleVerify}
              disabled={connecting}
              style={{
                display: 'flex', alignItems: 'center', gap: '8px',
                background: connecting ? AG(0.5) : A, color: '#fff', border: 'none',
                borderRadius: '12px', padding: '12px 28px', fontSize: '14px',
                fontWeight: 700, cursor: connecting ? 'wait' : 'pointer', fontFamily: F,
                boxShadow: `0 4px 16px ${AG(0.35)}`,
              }}
            >
              {connecting ? (
                <><Loader size={16} style={{ animation: 'spin .8s linear infinite' }} /> Verificando...</>
              ) : (
                <><Link2 size={16} /> Conectar y verificar</>
              )}
            </button>
          </div>
        </div>
      )}

      {/* ════════════════════════════════════════════════════════════════════════ */}
      {/* STEP 2: Channel info                                                   */}
      {/* ════════════════════════════════════════════════════════════════════════ */}
      {step === 2 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', animation: 'rcp-in .3s ease' }}>

          {/* Connection result banner */}
          {connectionResult && (
            <div style={{
              background: connectionResult.connected ? `${OK}08` : `${WR}08`,
              border: `1px solid ${connectionResult.connected ? `${OK}25` : `${WR}25`}`,
              borderRadius: '14px', padding: '16px 20px',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: connectionResult.connected ? '12px' : '0' }}>
                {connectionResult.connected ? <CheckCircle size={18} color={OK} /> : <AlertCircle size={18} color={WR} />}
                <div>
                  <div style={{ fontSize: '14px', fontWeight: 700, color: connectionResult.connected ? OK : WR }}>
                    {connectionResult.connected ? 'Plataforma conectada — Datos verificados' : 'Registrado con datos estimados'}
                  </div>
                  {!connectionResult.connected && (
                    <div style={{ fontSize: '12px', color: 'var(--muted)', marginTop: '2px' }}>
                      Podras conectar tu API mas tarde desde la pagina del canal
                    </div>
                  )}
                </div>
              </div>

              {/* Show verified metrics */}
              {connectionResult.connected && connectionResult.followers > 0 && (
                <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', marginTop: '8px' }}>
                  <div style={{ background: 'var(--surface)', borderRadius: '10px', padding: '10px 16px', flex: 1, minWidth: '120px' }}>
                    <div style={{ fontSize: '10px', color: 'var(--muted)', marginBottom: '2px' }}>Suscriptores</div>
                    <div style={{ fontFamily: D, fontSize: '20px', fontWeight: 800, color: 'var(--text)' }}>{(connectionResult.followers || 0).toLocaleString('es')}</div>
                  </div>
                  {connectionResult.scores?.total != null && (
                    <div style={{ background: 'var(--surface)', borderRadius: '10px', padding: '10px 16px', flex: 1, minWidth: '120px' }}>
                      <div style={{ fontSize: '10px', color: 'var(--muted)', marginBottom: '2px' }}>Score</div>
                      <div style={{ fontFamily: D, fontSize: '20px', fontWeight: 800, color: connectionResult.scores.total >= 70 ? OK : connectionResult.scores.total >= 40 ? WR : ER }}>{connectionResult.scores.total}/100</div>
                    </div>
                  )}
                  {connectionResult.recommendedPrice > 0 && (
                    <div style={{ background: 'var(--surface)', borderRadius: '10px', padding: '10px 16px', flex: 1, minWidth: '120px' }}>
                      <div style={{ fontSize: '10px', color: 'var(--muted)', marginBottom: '2px' }}>Precio recomendado</div>
                      <div style={{ fontFamily: D, fontSize: '20px', fontWeight: 800, color: A }}>€{connectionResult.recommendedPrice}</div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Channel info form */}
          <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '16px', overflow: 'hidden' }}>
            <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)' }}>
              <div style={{ fontFamily: D, fontSize: '15px', fontWeight: 700, color: 'var(--text)' }}>Informacion del canal</div>
              <div style={{ fontSize: '12px', color: 'var(--muted)', marginTop: '2px' }}>Asi apareceran tus datos en el marketplace</div>
            </div>
            <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--muted)', display: 'block', marginBottom: '6px' }}>
                  Nombre del canal <span style={{ color: ER }}>*</span>
                </label>
                <input className="rcp-inp" value={form.name} onChange={e => update('name', e.target.value)}
                  placeholder="Ej: Tech Insights ES" style={inp} />
              </div>

              <div>
                <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--muted)', display: 'block', marginBottom: '6px' }}>
                  URL / enlace del canal
                </label>
                <input className="rcp-inp" value={form.url} onChange={e => update('url', e.target.value)}
                  placeholder={platform === 'telegram' ? 'https://t.me/tucanal' : platform === 'instagram' ? 'https://instagram.com/tuuser' : 'URL de tu canal'}
                  style={inp} />
              </div>

              <div>
                <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--muted)', display: 'block', marginBottom: '8px' }}>Categoria</label>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                  {CATEGORIES.map(c => (
                    <button key={c} onClick={() => update('category', c)} style={{
                      background: form.category === c ? A : 'var(--bg)',
                      border: `1px solid ${form.category === c ? A : 'var(--border)'}`,
                      borderRadius: '20px', padding: '6px 14px', fontSize: '12px',
                      color: form.category === c ? '#fff' : 'var(--muted)',
                      cursor: 'pointer', fontFamily: F, fontWeight: form.category === c ? 600 : 400,
                      transition: 'all .15s',
                    }}>{c}</button>
                  ))}
                </div>
              </div>

              <div>
                <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--muted)', display: 'block', marginBottom: '6px' }}>
                  Precio base por publicacion (€) <span style={{ color: ER }}>*</span>
                </label>
                <div style={{ position: 'relative' }}>
                  <input className="rcp-inp" type="number" value={form.price} onChange={e => update('price', e.target.value)}
                    placeholder={connectionResult?.recommendedPrice ? String(connectionResult.recommendedPrice) : '250'}
                    style={{ ...inp, paddingLeft: '32px' }} />
                  <span style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', fontSize: '14px', color: 'var(--muted)', fontWeight: 600 }}>€</span>
                </div>
                {connectionResult?.recommendedPrice > 0 && (
                  <div style={{ fontSize: '11px', color: A, marginTop: '4px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <Zap size={11} /> Precio recomendado por nuestro algoritmo: €{connectionResult.recommendedPrice}
                    <button onClick={() => update('price', String(connectionResult.recommendedPrice))} style={{ background: AG(0.1), border: `1px solid ${AG(0.2)}`, borderRadius: '4px', padding: '1px 6px', fontSize: '10px', color: A, cursor: 'pointer', fontFamily: F, fontWeight: 600 }}>Usar</button>
                  </div>
                )}
              </div>

              <div>
                <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--muted)', display: 'block', marginBottom: '6px' }}>Descripcion</label>
                <textarea className="rcp-inp" value={form.desc} onChange={e => update('desc', e.target.value)}
                  placeholder="Describe tu canal, audiencia y tipo de contenido..."
                  rows={3} style={{ ...inp, resize: 'none' }} />
              </div>
            </div>
          </div>

          {/* Submit */}
          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <button
              onClick={handleSaveInfo}
              disabled={creating}
              style={{
                display: 'flex', alignItems: 'center', gap: '8px',
                background: creating ? AG(0.5) : A, color: '#fff', border: 'none',
                borderRadius: '12px', padding: '14px 32px', fontSize: '14px',
                fontWeight: 700, cursor: creating ? 'wait' : 'pointer', fontFamily: F,
                boxShadow: `0 4px 16px ${AG(0.35)}`,
              }}
            >
              {creating ? (
                <><Loader size={16} style={{ animation: 'spin .8s linear infinite' }} /> Guardando...</>
              ) : (
                <><CheckCircle size={16} /> Completar registro</>
              )}
            </button>
          </div>
        </div>
      )}

      {/* ════════════════════════════════════════════════════════════════════════ */}
      {/* STEP 3: Verification test post                                         */}
      {/* ════════════════════════════════════════════════════════════════════════ */}
      {step === 3 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', animation: 'rcp-in .3s ease' }}>

          {/* Explanation */}
          <div style={{
            background: `linear-gradient(135deg, ${platDef?.color || A}08, ${A}05)`,
            border: `1px solid ${platDef?.color || A}20`, borderRadius: '16px',
            padding: '24px',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '16px' }}>
              <div style={{
                width: '52px', height: '52px', borderRadius: '14px',
                background: `${platDef?.color || A}18`, border: `1px solid ${platDef?.color || A}30`,
                display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '26px', flexShrink: 0,
              }}>
                📊
              </div>
              <div>
                <div style={{ fontFamily: D, fontSize: '18px', fontWeight: 700, color: 'var(--text)' }}>
                  Verificacion con post de prueba
                </div>
                <div style={{ fontSize: '13px', color: 'var(--muted)', marginTop: '2px' }}>
                  Publica este enlace en tu canal para que podamos medir tus metricas reales
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {[
                'Copia el enlace de prueba de abajo',
                `Publicalo en tu ${platDef?.name || 'canal'} con cualquier texto (ej: "Nuevo proyecto en camino 🚀")`,
                'Espera a que tus seguidores hagan click — necesitas minimo 3 clicks unicos',
                'Mediremos: clicks reales, dispositivos, ubicacion, engagement rate',
              ].map((s, i) => (
                <div key={i} style={{ display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
                  <div style={{
                    width: '22px', height: '22px', borderRadius: '50%',
                    background: AG(0.1), border: `1px solid ${AG(0.25)}`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '11px', fontWeight: 700, color: A, flexShrink: 0,
                  }}>{i + 1}</div>
                  <span style={{ fontSize: '13px', color: 'var(--text)', lineHeight: 1.5, paddingTop: '1px' }}>{s}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Tracking link to copy */}
          <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '16px', overflow: 'hidden' }}>
            <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Link2 size={14} color={A} />
              <span style={{ fontFamily: D, fontSize: '14px', fontWeight: 700, color: 'var(--text)' }}>Tu enlace de verificacion</span>
            </div>
            <div style={{ padding: '20px' }}>
              {verifyLink?.trackingUrl ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <CopyBlock text={verifyLink.trackingUrl} />
                  <div style={{ fontSize: '11px', color: 'var(--muted)', lineHeight: 1.5 }}>
                    Este enlace redirige a una pagina de Adflow. Cada click se registra con: IP, dispositivo, navegador, pais y hora exacta.
                  </div>
                </div>
              ) : (
                <div style={{ fontSize: '13px', color: 'var(--muted)', textAlign: 'center', padding: '12px' }}>
                  Generando enlace de verificacion...
                </div>
              )}
            </div>
          </div>

          {/* Live metrics dashboard */}
          <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '16px', overflow: 'hidden' }}>
            <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Zap size={14} color={verifyStatus?.status === 'verified' ? OK : A} />
                <span style={{ fontFamily: D, fontSize: '14px', fontWeight: 700, color: 'var(--text)' }}>Metricas en tiempo real</span>
              </div>
              {pollActive && verifyStatus?.status !== 'verified' && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: OK, animation: 'pulse 1.5s infinite' }} />
                  <span style={{ fontSize: '11px', color: OK, fontWeight: 600 }}>Monitoreando</span>
                </div>
              )}
            </div>
            <div style={{ padding: '20px' }}>
              {/* Stats grid */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px', marginBottom: '16px' }}>
                <div style={{ background: 'var(--bg)', borderRadius: '12px', padding: '16px', textAlign: 'center' }}>
                  <div style={{ fontFamily: D, fontSize: '28px', fontWeight: 800, color: 'var(--text)' }}>
                    {verifyStatus?.stats?.totalClicks || 0}
                  </div>
                  <div style={{ fontSize: '11px', color: 'var(--muted)', marginTop: '2px' }}>Clicks totales</div>
                </div>
                <div style={{ background: 'var(--bg)', borderRadius: '12px', padding: '16px', textAlign: 'center' }}>
                  <div style={{ fontFamily: D, fontSize: '28px', fontWeight: 800, color: (verifyStatus?.stats?.uniqueClicks || 0) >= (verifyStatus?.minClicks || 3) ? OK : A }}>
                    {verifyStatus?.stats?.uniqueClicks || 0}
                  </div>
                  <div style={{ fontSize: '11px', color: 'var(--muted)', marginTop: '2px' }}>Clicks unicos</div>
                </div>
                <div style={{ background: 'var(--bg)', borderRadius: '12px', padding: '16px', textAlign: 'center' }}>
                  <div style={{ fontFamily: D, fontSize: '28px', fontWeight: 800, color: verifyStatus?.clicksNeeded === 0 ? OK : WR }}>
                    {verifyStatus?.clicksNeeded ?? (verifyStatus?.minClicks || 3)}
                  </div>
                  <div style={{ fontSize: '11px', color: 'var(--muted)', marginTop: '2px' }}>Faltan para verificar</div>
                </div>
              </div>

              {/* Progress bar */}
              <div style={{ marginBottom: '16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                  <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text)' }}>Progreso de verificacion</span>
                  <span style={{ fontSize: '12px', fontWeight: 600, color: verifyStatus?.status === 'verified' ? OK : A }}>
                    {verifyStatus?.stats?.uniqueClicks || 0}/{verifyStatus?.minClicks || 3} clicks
                  </span>
                </div>
                <div style={{ height: '8px', background: 'var(--bg)', borderRadius: '4px', overflow: 'hidden' }}>
                  <div style={{
                    height: '100%', borderRadius: '4px', transition: 'width .5s ease',
                    background: verifyStatus?.status === 'verified' ? OK : `linear-gradient(90deg, ${A}, ${BL})`,
                    width: `${Math.min(100, ((verifyStatus?.stats?.uniqueClicks || 0) / (verifyStatus?.minClicks || 3)) * 100)}%`,
                  }} />
                </div>
              </div>

              {/* Device breakdown */}
              {verifyStatus?.stats?.devices && (verifyStatus.stats.devices.mobile > 0 || verifyStatus.stats.devices.desktop > 0) && (
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '16px' }}>
                  {Object.entries(verifyStatus.stats.devices).filter(([, v]) => v > 0).map(([k, v]) => (
                    <span key={k} style={{ background: AG(0.08), border: `1px solid ${AG(0.18)}`, borderRadius: '20px', padding: '4px 12px', fontSize: '11px', fontWeight: 600, color: A }}>
                      {k === 'mobile' ? '📱' : k === 'desktop' ? '💻' : k === 'tablet' ? '📱' : '❓'} {k}: {v}
                    </span>
                  ))}
                  {verifyStatus.stats.countries && Object.keys(verifyStatus.stats.countries).length > 0 && (
                    Object.entries(typeof verifyStatus.stats.countries === 'object' && !Array.isArray(verifyStatus.stats.countries)
                      ? verifyStatus.stats.countries : {}).filter(([, v]) => v > 0).slice(0, 5).map(([k, v]) => (
                      <span key={k} style={{ background: `${BL}10`, border: `1px solid ${BL}20`, borderRadius: '20px', padding: '4px 12px', fontSize: '11px', fontWeight: 600, color: BL }}>
                        🌍 {k}: {v}
                      </span>
                    ))
                  )}
                </div>
              )}

              {/* Recent clicks */}
              {verifyStatus?.recentClicks?.length > 0 && (
                <div>
                  <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--muted)', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    Clicks recientes
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    {verifyStatus.recentClicks.slice(-5).reverse().map((c, i) => (
                      <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', color: 'var(--muted)', padding: '6px 10px', background: 'var(--bg)', borderRadius: '8px' }}>
                        <span>{c.device === 'mobile' ? '📱' : '💻'}</span>
                        <span style={{ fontWeight: 600, color: 'var(--text)' }}>{c.browser || 'Navegador'}</span>
                        <span>·</span>
                        <span>{c.os || 'OS'}</span>
                        {c.country && <><span>·</span><span>🌍 {c.country}</span></>}
                        <span style={{ marginLeft: 'auto', fontSize: '10px' }}>{c.timestamp ? new Date(c.timestamp).toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : ''}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Verified banner */}
              {verifyStatus?.status === 'verified' && (
                <div style={{ background: `${OK}10`, border: `1px solid ${OK}25`, borderRadius: '12px', padding: '16px', marginTop: '12px', textAlign: 'center' }}>
                  <CheckCircle size={28} color={OK} style={{ margin: '0 auto 8px', display: 'block' }} />
                  <div style={{ fontFamily: D, fontSize: '16px', fontWeight: 700, color: OK }}>¡Canal verificado!</div>
                  <div style={{ fontSize: '12px', color: 'var(--muted)', marginTop: '4px' }}>Las metricas de tu canal han sido confirmadas con datos reales</div>
                </div>
              )}
            </div>
          </div>

          {/* Suggested post text */}
          <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '16px', padding: '16px 20px' }}>
            <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--muted)', marginBottom: '10px' }}>Texto sugerido para tu post</div>
            <CopyBlock text={`🚀 Algo nuevo se viene... Descubrelo aqui 👉 ${verifyLink?.trackingUrl || '[tu enlace]'}`} />
            <div style={{ fontSize: '11px', color: 'var(--muted)', marginTop: '8px' }}>
              Puedes escribir lo que quieras. Lo importante es que incluyas el enlace de verificacion.
            </div>
          </div>

          {/* Actions */}
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', flexWrap: 'wrap' }}>
            <button onClick={handleSkipTestPost} style={{
              display: 'flex', alignItems: 'center', gap: '6px',
              background: 'var(--surface)', border: '1px solid var(--border)',
              borderRadius: '12px', padding: '12px 20px', fontSize: '13px',
              color: 'var(--muted)', cursor: 'pointer', fontFamily: F,
            }}>
              Saltar por ahora
            </button>
            {verifyStatus?.status === 'verified' ? (
              <button onClick={() => setStep(4)} style={{
                display: 'flex', alignItems: 'center', gap: '8px',
                background: OK, color: '#fff', border: 'none',
                borderRadius: '12px', padding: '12px 28px', fontSize: '14px',
                fontWeight: 700, cursor: 'pointer', fontFamily: F,
                boxShadow: `0 4px 16px rgba(16,185,129,0.35)`,
              }}>
                <CheckCircle size={16} /> Continuar
              </button>
            ) : (
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--muted)', fontSize: '13px' }}>
                <Loader size={14} style={{ animation: 'spin .8s linear infinite' }} /> Esperando clicks...
              </div>
            )}
          </div>
        </div>
      )}

      {/* ════════════════════════════════════════════════════════════════════════ */}
      {/* STEP 4: Success                                                        */}
      {/* ════════════════════════════════════════════════════════════════════════ */}
      {step === 4 && (
        <div style={{ animation: 'rcp-in .3s ease', textAlign: 'center', padding: '20px 0' }}>

          {/* Success animation */}
          <div style={{
            width: '80px', height: '80px', borderRadius: '50%',
            background: `${OK}12`, border: `2px solid ${OK}30`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 24px', animation: 'rcp-in .4s ease',
          }}>
            <CheckCircle size={36} color={OK} />
          </div>

          <h2 style={{ fontFamily: D, fontSize: '22px', fontWeight: 800, color: 'var(--text)', marginBottom: '8px' }}>
            Canal registrado con exito
          </h2>
          <p style={{ fontSize: '14px', color: 'var(--muted)', marginBottom: '28px', lineHeight: 1.5 }}>
            {connectionResult?.connected
              ? 'Tu canal esta verificado y listo para recibir campanas. Configura tu disponibilidad y precios.'
              : 'Tu canal esta registrado. Conecta tu API cuando quieras para verificar y obtener metricas reales.'
            }
          </p>

          {/* Channel summary card */}
          <div style={{
            background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '18px',
            padding: '24px', textAlign: 'left', marginBottom: '24px',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '16px' }}>
              <div style={{
                width: '48px', height: '48px', borderRadius: '14px',
                background: `${platDef?.color || A}18`, border: `1px solid ${platDef?.color || A}30`,
                display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '24px',
              }}>
                {platDef?.icon || '📢'}
              </div>
              <div>
                <div style={{ fontFamily: D, fontSize: '16px', fontWeight: 700, color: 'var(--text)' }}>{form.name || 'Mi canal'}</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '4px' }}>
                  <span style={{ background: `${platDef?.color || A}18`, color: platDef?.color || A, borderRadius: '6px', padding: '2px 8px', fontSize: '11px', fontWeight: 600 }}>{platDef?.name || platform}</span>
                  <span style={{ fontSize: '12px', color: 'var(--muted)' }}>{form.category}</span>
                  <span style={{ fontSize: '12px', color: 'var(--muted)' }}>€{form.price}/post</span>
                </div>
              </div>
            </div>

            {connectionResult?.connected && (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px' }}>
                <div style={{ background: 'var(--bg)', borderRadius: '10px', padding: '12px', textAlign: 'center' }}>
                  <Users size={14} color={A} style={{ margin: '0 auto 4px', display: 'block' }} />
                  <div style={{ fontFamily: D, fontSize: '18px', fontWeight: 800, color: 'var(--text)' }}>{(connectionResult.followers || 0).toLocaleString('es')}</div>
                  <div style={{ fontSize: '10px', color: 'var(--muted)' }}>Suscriptores</div>
                </div>
                <div style={{ background: 'var(--bg)', borderRadius: '10px', padding: '12px', textAlign: 'center' }}>
                  <Zap size={14} color={OK} style={{ margin: '0 auto 4px', display: 'block' }} />
                  <div style={{ fontFamily: D, fontSize: '18px', fontWeight: 800, color: connectionResult.scores?.total >= 70 ? OK : WR }}>{connectionResult.scores?.total || 0}</div>
                  <div style={{ fontSize: '10px', color: 'var(--muted)' }}>Score</div>
                </div>
                <div style={{ background: 'var(--bg)', borderRadius: '10px', padding: '12px', textAlign: 'center' }}>
                  <DollarSign size={14} color={A} style={{ margin: '0 auto 4px', display: 'block' }} />
                  <div style={{ fontFamily: D, fontSize: '18px', fontWeight: 800, color: A }}>€{connectionResult.recommendedPrice || form.price}</div>
                  <div style={{ fontSize: '10px', color: 'var(--muted)' }}>Precio rec.</div>
                </div>
              </div>
            )}

            {/* Status badges */}
            <div style={{ display: 'flex', gap: '8px', marginTop: '14px', flexWrap: 'wrap' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: '4px', background: connectionResult?.connected ? `${OK}12` : `${WR}12`, color: connectionResult?.connected ? OK : WR, borderRadius: '20px', padding: '4px 12px', fontSize: '11px', fontWeight: 600 }}>
                {connectionResult?.connected ? <><CheckCircle size={12} /> Verificado</> : <><AlertCircle size={12} /> Sin verificar</>}
              </span>
              <span style={{ display: 'flex', alignItems: 'center', gap: '4px', background: `${BL}12`, color: BL, borderRadius: '20px', padding: '4px 12px', fontSize: '11px', fontWeight: 600 }}>
                <Eye size={12} /> Visible en marketplace
              </span>
            </div>
          </div>

          {/* Next steps */}
          <div style={{
            background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '16px',
            padding: '20px 24px', textAlign: 'left', marginBottom: '24px',
          }}>
            <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text)', marginBottom: '12px' }}>Proximos pasos</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {[
                { icon: '📅', text: 'Configura tu disponibilidad y precios por dia', done: false },
                { icon: '📝', text: 'Completa tu perfil con fotos y descripcion detallada', done: false },
                { icon: '🔔', text: 'Activa notificaciones para recibir solicitudes al instante', done: false },
                ...(connectionResult?.connected ? [] : [{ icon: '🔗', text: 'Conecta tu API para verificar y mejorar tu score', done: false }]),
              ].map((s, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '13px', color: 'var(--text)' }}>
                  <span style={{ fontSize: '16px' }}>{s.icon}</span>
                  <span>{s.text}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Action buttons */}
          <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap' }}>
            <button onClick={() => navigate('/creator/channels')} style={{
              display: 'flex', alignItems: 'center', gap: '6px',
              background: 'var(--surface)', border: '1px solid var(--border)',
              borderRadius: '12px', padding: '12px 24px', fontSize: '13px',
              color: 'var(--text)', cursor: 'pointer', fontFamily: F, fontWeight: 600,
            }}>
              Ver mis canales
            </button>
            <button onClick={() => {
              const cid = createdChannel?._id || createdChannel?.id
              if (cid) navigate('/creator/channels', { state: { openChannel: cid } })
              else navigate('/creator/channels')
            }} style={{
              display: 'flex', alignItems: 'center', gap: '8px',
              background: A, color: '#fff', border: 'none',
              borderRadius: '12px', padding: '12px 28px', fontSize: '14px',
              fontWeight: 700, cursor: 'pointer', fontFamily: F,
              boxShadow: `0 4px 16px ${AG(0.35)}`,
            }}>
              <Settings size={16} /> Configurar disponibilidad
            </button>
          </div>
        </div>
      )}

      {/* Spin keyframe for loader */}
      <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
    </div>
  )
}
