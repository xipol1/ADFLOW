import React, { useState, useEffect, useMemo, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Plus, Edit, Trash2, CheckCircle, Users, TrendingUp, Calendar,
  DollarSign, Clock, Settings, ChevronLeft, ChevronRight, X, Save,
  BarChart3, Eye, Zap, Globe, Instagram, Youtube, Twitter, Link2,
  Star, Shield, AlertCircle, ArrowUpRight, Tag,
} from 'lucide-react'
import { PLATFORM_COLORS } from './mockDataCreator'
import apiService from '../../../../../services/api'
import { PURPLE, purpleAlpha, FONT_BODY, FONT_DISPLAY, OK as _OK, WARN, ERR, BLUE } from '../../../theme/tokens'

// ─── Design tokens ──────────────────────────────────────────────────────────
const A  = PURPLE
const AG = purpleAlpha
const F  = FONT_BODY
const D  = FONT_DISPLAY
const OK = _OK
const WR = WARN
const ER = ERR
const BL = BLUE

const fmtK = (n) => n >= 1000 ? `${(n / 1000).toFixed(1)}K` : String(n)
const DAY_NAMES   = ['Dom', 'Lun', 'Mar', 'Mie', 'Jue', 'Vie', 'Sab']
const DAY_FULL    = ['Domingo', 'Lunes', 'Martes', 'Miercoles', 'Jueves', 'Viernes', 'Sabado']
const MONTH_NAMES = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre']
const PLATFORMS   = ['Telegram', 'WhatsApp', 'Discord', 'Instagram', 'Newsletter', 'Facebook', 'LinkedIn']
const CATEGORIES  = ['Tecnologia', 'Marketing', 'Negocios', 'Gaming', 'Fitness', 'Finanzas', 'Ecommerce', 'Educacion', 'Entretenimiento', 'Salud']
const TIMEZONES   = ['Europe/Madrid', 'Europe/London', 'America/New_York', 'America/Los_Angeles', 'America/Mexico_City', 'America/Bogota', 'America/Buenos_Aires']
const LANGUAGES   = [{ v: 'es', l: 'Espanol' }, { v: 'en', l: 'English' }, { v: 'pt', l: 'Portugues' }, { v: 'fr', l: 'Francais' }, { v: 'de', l: 'Deutsch' }]

const inp = {
  width: '100%', boxSizing: 'border-box', background: 'var(--bg)',
  border: '1px solid var(--border)', borderRadius: '10px',
  padding: '10px 14px', fontSize: '14px', color: 'var(--text)',
  fontFamily: F, outline: 'none', transition: 'border-color .15s',
}

// ─── Reusable: Section title ────────────────────────────────────────────────
const Section = ({ icon: Icon, title, subtitle, children, action }) => (
  <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '16px', overflow: 'hidden' }}>
    <div style={{ padding: '18px 22px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
        {Icon && <div style={{ width: '32px', height: '32px', borderRadius: '9px', background: AG(0.1), display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Icon size={16} color={A} /></div>}
        <div>
          <div style={{ fontFamily: D, fontSize: '15px', fontWeight: 700, color: 'var(--text)' }}>{title}</div>
          {subtitle && <div style={{ fontSize: '12px', color: 'var(--muted)', marginTop: '1px' }}>{subtitle}</div>}
        </div>
      </div>
      {action}
    </div>
    <div style={{ padding: '20px 22px' }}>{children}</div>
  </div>
)

// ─── Reusable: KPI Pill ──────────────────────────────────────────────────────
const Kpi = ({ label, value, color = A, icon: Icon }) => (
  <div style={{ background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: '12px', padding: '14px 16px', display: 'flex', alignItems: 'center', gap: '12px', flex: 1, minWidth: '160px' }}>
    {Icon && <div style={{ width: '34px', height: '34px', borderRadius: '9px', background: `${color}15`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}><Icon size={16} color={color} /></div>}
    <div><div style={{ fontSize: '18px', fontWeight: 700, color: 'var(--text)', fontFamily: D }}>{value}</div><div style={{ fontSize: '11px', color: 'var(--muted)' }}>{label}</div></div>
  </div>
)

// ─── Toggle switch ──────────────────────────────────────────────────────────
const Toggle = ({ on, onChange, label, size = 'md' }) => {
  const w = size === 'sm' ? 34 : 40
  const h = size === 'sm' ? 18 : 22
  const dot = size === 'sm' ? 14 : 16
  return (
    <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' }}>
      <div onClick={() => onChange(!on)} style={{ width: `${w}px`, height: `${h}px`, borderRadius: `${h/2}px`, background: on ? A : 'var(--border)', position: 'relative', transition: 'background .2s', cursor: 'pointer', flexShrink: 0 }}>
        <div style={{ position: 'absolute', top: `${(h - dot) / 2}px`, left: on ? `${w - dot - (h - dot) / 2}px` : `${(h - dot) / 2}px`, width: `${dot}px`, height: `${dot}px`, borderRadius: '50%', background: '#fff', transition: 'left .2s', boxShadow: '0 1px 4px rgba(0,0,0,0.2)' }} />
      </div>
      {label && <span style={{ fontSize: '13px', fontWeight: 500, color: 'var(--text)' }}>{label}</span>}
    </label>
  )
}

// ─── Score bar ─────────────────────────────────────────────────────────────
const ScoreBar = ({ score, color = A, label }) => (
  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
    {label && <span style={{ fontSize: '12px', color: 'var(--muted)', minWidth: '30px' }}>{label}</span>}
    <div style={{ flex: 1, height: '8px', background: 'var(--bg)', borderRadius: '4px', overflow: 'hidden' }}>
      <div style={{ width: `${Math.min(100, score)}%`, height: '100%', background: color, borderRadius: '4px', transition: 'width .4s ease' }} />
    </div>
    <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text)', minWidth: '28px', textAlign: 'right' }}>{score}</span>
  </div>
)

// ─── Add Channel Modal (kept simple) ────────────────────────────────────────
const AddModal = ({ onClose, onCreated }) => {
  const [step, setStep] = useState(1)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [form, setForm] = useState({ name: '', platform: 'Telegram', url: '', audience: '', price: '', category: 'Tecnologia', desc: '' })
  const update = (k, v) => setForm(p => ({ ...p, [k]: v }))

  const handleSubmit = async () => {
    if (!form.name.trim()) { setError('El nombre es obligatorio'); return }
    if (!form.price) { setError('El precio es obligatorio'); return }
    setSaving(true); setError('')
    try {
      const res = await apiService.createChannel({
        nombreCanal: form.name.trim(), plataforma: form.platform.toLowerCase(),
        identificadorCanal: form.url.trim(), categoria: form.category,
        descripcion: form.desc.trim(), precio: Number(form.price),
        estadisticas: { seguidores: Number(form.audience) || 0 },
      })
      if (res?.success) { onCreated?.(); onClose() }
      else setError(res?.message || 'Error al crear el canal')
    } catch (e) { setError(e?.message || 'Error de conexion') }
    finally { setSaving(false) }
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px', backdropFilter: 'blur(4px)' }}>
      <div style={{ background: 'var(--surface)', borderRadius: '20px', width: '100%', maxWidth: '500px', overflow: 'hidden', boxShadow: '0 24px 60px rgba(0,0,0,0.4)', animation: 'cc-in .2s ease' }}>
        <style>{`@keyframes cc-in { from { opacity:0; transform:translateY(12px) scale(.97) } to { opacity:1; transform:none } }`}</style>
        <div style={{ padding: '22px 28px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <div style={{ fontFamily: D, fontSize: '17px', fontWeight: 700, color: 'var(--text)' }}>Registrar canal</div>
            <div style={{ fontSize: '12px', color: 'var(--muted)', marginTop: '2px' }}>Paso {step} de 2</div>
          </div>
          <button onClick={onClose} style={{ background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: '8px', padding: '6px 10px', cursor: 'pointer', color: 'var(--muted)', fontFamily: F }}>✕</button>
        </div>
        <div style={{ display: 'flex', padding: '14px 28px', gap: '8px' }}>
          {['Informacion', 'Monetizacion'].map((s, i) => (
            <div key={i} style={{ flex: 1 }}><div style={{ height: '3px', borderRadius: '2px', background: step > i ? A : 'var(--border)', marginBottom: '4px' }} /><span style={{ fontSize: '10px', color: step > i ? A : 'var(--muted2)' }}>{s}</span></div>
          ))}
        </div>
        <div style={{ padding: '8px 28px 24px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {error && <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: '8px', padding: '10px 14px', fontSize: '13px', color: ER }}>{error}</div>}
          {step === 1 && <>
            <div><label style={{ fontSize: '12px', fontWeight: 500, color: 'var(--muted)', display: 'block', marginBottom: '6px' }}>Nombre del canal *</label><input value={form.name} onChange={e => update('name', e.target.value)} placeholder="Ej: Tech Insights ES" style={inp} /></div>
            <div><label style={{ fontSize: '12px', fontWeight: 500, color: 'var(--muted)', display: 'block', marginBottom: '6px' }}>Plataforma *</label>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>{PLATFORMS.map(p => <button key={p} onClick={() => update('platform', p)} style={{ background: form.platform === p ? A : 'var(--bg)', border: `1px solid ${form.platform === p ? A : 'var(--border)'}`, borderRadius: '20px', padding: '6px 12px', fontSize: '12px', color: form.platform === p ? '#fff' : 'var(--muted)', cursor: 'pointer', fontFamily: F }}>{p}</button>)}</div>
            </div>
            <div><label style={{ fontSize: '12px', fontWeight: 500, color: 'var(--muted)', display: 'block', marginBottom: '6px' }}>URL / enlace</label><input value={form.url} onChange={e => update('url', e.target.value)} placeholder="https://t.me/tucanal" style={inp} /></div>
            <div><label style={{ fontSize: '12px', fontWeight: 500, color: 'var(--muted)', display: 'block', marginBottom: '6px' }}>Audiencia actual</label><input type="number" value={form.audience} onChange={e => update('audience', e.target.value)} placeholder="15000" style={inp} /></div>
          </>}
          {step === 2 && <>
            <div><label style={{ fontSize: '12px', fontWeight: 500, color: 'var(--muted)', display: 'block', marginBottom: '6px' }}>Precio base por publicacion (€) *</label><input type="number" value={form.price} onChange={e => update('price', e.target.value)} placeholder="250" style={inp} /></div>
            <div><label style={{ fontSize: '12px', fontWeight: 500, color: 'var(--muted)', display: 'block', marginBottom: '6px' }}>Categoria</label>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>{CATEGORIES.map(c => <button key={c} onClick={() => update('category', c)} style={{ background: form.category === c ? A : 'var(--bg)', border: `1px solid ${form.category === c ? A : 'var(--border)'}`, borderRadius: '20px', padding: '6px 12px', fontSize: '12px', color: form.category === c ? '#fff' : 'var(--muted)', cursor: 'pointer', fontFamily: F }}>{c}</button>)}</div>
            </div>
            <div><label style={{ fontSize: '12px', fontWeight: 500, color: 'var(--muted)', display: 'block', marginBottom: '6px' }}>Descripcion</label><textarea value={form.desc} onChange={e => update('desc', e.target.value)} placeholder="Describe tu canal, audiencia y tipo de contenido..." rows={3} style={{ ...inp, resize: 'none' }} /></div>
          </>}
        </div>
        <div style={{ padding: '16px 28px', borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', gap: '10px' }}>
          <button onClick={() => step > 1 ? setStep(1) : onClose()} style={{ background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: '10px', padding: '10px 20px', fontSize: '13px', cursor: 'pointer', color: 'var(--text)', fontFamily: F }}>{step > 1 ? '← Volver' : 'Cancelar'}</button>
          <button onClick={() => step < 2 ? setStep(2) : handleSubmit()} disabled={saving} style={{ background: saving ? AG(0.5) : A, color: '#fff', border: 'none', borderRadius: '10px', padding: '10px 24px', fontSize: '13px', fontWeight: 600, cursor: saving ? 'wait' : 'pointer', fontFamily: F }}>{step === 2 ? (saving ? 'Enviando...' : 'Registrar canal') : 'Siguiente →'}</button>
        </div>
      </div>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════════
// CHANNEL DETAIL PANEL (Profile + Availability + Insights — Premium)
// ═══════════════════════════════════════════════════════════════════════════════
const ChannelDetailPanel = ({ channel, onBack, onUpdated }) => {
  const [tab, setTab] = useState('score')
  const [saving, setSaving] = useState(false)
  const [toast, setToast] = useState('')

  // ── Profile state ──
  const [profileForm, setProfileForm] = useState({
    nombreCanal: channel.nombreCanal || '',
    descripcion: channel.descripcion || '',
    categoria: channel.categoria || '',
    precio: channel.precio || 0,
    foto: channel.perfil?.foto || '',
    banner: channel.perfil?.banner || '',
    bio: channel.perfil?.bio || '',
    idioma: channel.perfil?.idioma || 'es',
    zonaHoraria: channel.perfil?.zonaHoraria || 'Europe/Madrid',
    twitter: channel.perfil?.redesSociales?.twitter || '',
    instagram: channel.perfil?.redesSociales?.instagram || '',
    youtube: channel.perfil?.redesSociales?.youtube || '',
    web: channel.perfil?.redesSociales?.web || '',
    tags: channel.perfil?.tags || [],
  })
  const [newTag, setNewTag] = useState('')

  // ── Availability state ──
  const dispo = channel.disponibilidad || {}
  const [maxPub, setMaxPub] = useState(dispo.maxPublicacionesMes || 20)
  const [enabledDays, setEnabledDays] = useState(new Set(dispo.diasSemana || [1, 2, 3, 4, 5]))
  const [dayPricing, setDayPricing] = useState(() => {
    const map = {}
    ;(dispo.preciosPorDia || []).forEach(p => { map[p.day] = { price: p.price, enabled: p.enabled } })
    for (let i = 0; i < 7; i++) {
      if (!map[i]) map[i] = { price: channel.precio || 100, enabled: enabledDays.has(i) }
    }
    return map
  })
  const [minAdvance, setMinAdvance] = useState(dispo.antelacionMinima || 2)
  const [maxAdvance, setMaxAdvance] = useState(dispo.antelacionMaxima || 60)
  const [acceptUrgent, setAcceptUrgent] = useState(dispo.aceptaUrgentes || false)
  const [allowPacks, setAllowPacks] = useState(channel.allowPacks !== false)
  const [urgentPrice, setUrgentPrice] = useState(dispo.precioUrgente || 0)
  const [schedFrom, setSchedFrom] = useState(dispo.horarioPreferido?.desde || '09:00')
  const [schedTo, setSchedTo] = useState(dispo.horarioPreferido?.hasta || '18:00')
  const [blockedDates, setBlockedDates] = useState(dispo.diasBloqueados || [])

  // ── Insights state ──
  const [insights, setInsights] = useState(() => {
    const existing = channel.insightsDias || []
    return DAY_NAMES.map((_, i) => {
      const found = existing.find(e => e.day === i)
      return found || { day: i, avgViews: 0, avgClicks: 0, avgEngagement: 0, score: 0 }
    })
  })

  // ── Calendar preview state ──
  const now = new Date()
  const [calYear, setCalYear] = useState(now.getFullYear())
  const [calMonth, setCalMonth] = useState(now.getMonth())

  const calDays = useMemo(() => {
    const first = new Date(calYear, calMonth, 1)
    const last = new Date(calYear, calMonth + 1, 0)
    const startPad = first.getDay()
    const days = []
    for (let i = 0; i < startPad; i++) days.push(null)
    for (let d = 1; d <= last.getDate(); d++) {
      const date = new Date(calYear, calMonth, d)
      const dow = date.getDay()
      const pricing = dayPricing[dow]
      const isEnabled = pricing?.enabled !== false && enabledDays.has(dow)
      const today = new Date(); today.setHours(0,0,0,0)
      const isPast = date < today
      const blocked = blockedDates.some(b => {
        const s = new Date(b.start); s.setHours(0,0,0,0)
        const e = b.end ? new Date(b.end) : s; e.setHours(23,59,59)
        return date >= s && date <= e
      })
      let status = 'available'
      if (isPast) status = 'past'
      else if (!isEnabled) status = 'disabled'
      else if (blocked) status = 'blocked'
      days.push({ d, dow, status, price: pricing?.price || channel.precio || 0 })
    }
    return days
  }, [calYear, calMonth, enabledDays, dayPricing, blockedDates, channel.precio])

  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(''), 2500) }

  // ── Save profile ──
  const saveProfile = async () => {
    setSaving(true)
    try {
      const res = await apiService.updateChannelProfile(channel._id || channel.id, {
        nombreCanal: profileForm.nombreCanal,
        descripcion: profileForm.descripcion,
        categoria: profileForm.categoria,
        precio: Number(profileForm.precio),
        perfil: {
          foto: profileForm.foto,
          banner: profileForm.banner,
          bio: profileForm.bio,
          idioma: profileForm.idioma,
          zonaHoraria: profileForm.zonaHoraria,
          redesSociales: {
            twitter: profileForm.twitter,
            instagram: profileForm.instagram,
            youtube: profileForm.youtube,
            web: profileForm.web,
          },
          tags: profileForm.tags,
        },
      })
      if (res?.success) { showToast('Perfil guardado'); onUpdated?.() }
      else showToast('Error: ' + (res?.message || 'No se pudo guardar'))
    } catch { showToast('Error de conexion') }
    finally { setSaving(false) }
  }

  // ── Save availability ──
  const saveAvailability = async () => {
    setSaving(true)
    try {
      const preciosPorDia = Object.entries(dayPricing).map(([day, v]) => ({
        day: Number(day), price: v.price, enabled: v.enabled,
      }))
      const res = await apiService.updateChannelAvailability(channel._id || channel.id, {
        maxPublicacionesMes: maxPub,
        diasSemana: Array.from(enabledDays),
        preciosPorDia,
        diasBloqueados: blockedDates,
        horarioPreferido: { desde: schedFrom, hasta: schedTo },
        antelacionMinima: minAdvance,
        antelacionMaxima: maxAdvance,
        aceptaUrgentes: acceptUrgent,
        precioUrgente: urgentPrice,
        allowPacks,
      })
      if (res?.success) { showToast('Disponibilidad guardada'); onUpdated?.() }
      else showToast('Error: ' + (res?.message || 'No se pudo guardar'))
    } catch { showToast('Error de conexion') }
    finally { setSaving(false) }
  }

  // ── Save insights ──
  const saveInsights = async () => {
    setSaving(true)
    try {
      const res = await apiService.updateChannelInsights(channel._id || channel.id, { insightsDias: insights })
      if (res?.success) { showToast('Insights guardados'); onUpdated?.() }
      else showToast('Error')
    } catch { showToast('Error de conexion') }
    finally { setSaving(false) }
  }

  const toggleDay = (day) => {
    const next = new Set(enabledDays)
    if (next.has(day)) next.delete(day); else next.add(day)
    setEnabledDays(next)
    setDayPricing(prev => ({ ...prev, [day]: { ...prev[day], enabled: next.has(day) } }))
  }

  const updateDayPrice = (day, price) => {
    setDayPricing(prev => ({ ...prev, [day]: { ...prev[day], price: Math.max(0, Number(price) || 0) } }))
  }

  const addTag = () => {
    const t = newTag.trim()
    if (t && !profileForm.tags.includes(t) && profileForm.tags.length < 15) {
      setProfileForm(p => ({ ...p, tags: [...p.tags, t] }))
      setNewTag('')
    }
  }

  const removeTag = (tag) => setProfileForm(p => ({ ...p, tags: p.tags.filter(t => t !== tag) }))

  const bestDay = useMemo(() => {
    const sorted = [...insights].sort((a, b) => b.score - a.score)
    return sorted[0]?.score > 0 ? sorted[0] : null
  }, [insights])

  const avgPrice = useMemo(() => {
    const enabled = Object.values(dayPricing).filter(v => v.enabled)
    if (!enabled.length) return 0
    return Math.round(enabled.reduce((s, v) => s + v.price, 0) / enabled.length)
  }, [dayPricing])

  // ── Scoring engine state ──
  const [scoreData, setScoreData] = useState(null)
  const [scoreLoading, setScoreLoading] = useState(false)
  const [connectForm, setConnectForm] = useState({
    botToken: channel.credenciales?.botToken || '',
    accessToken: channel.credenciales?.accessToken || '',
    chatId: channel.identificadores?.chatId || '',
    serverId: channel.identificadores?.serverId || '',
    phoneNumber: channel.identificadores?.phoneNumber || '',
    phoneNumberId: channel.credenciales?.phoneNumberId || '',
    apiKey: '',
    provider: channel.identificadores?.provider || 'mailchimp',
    subscribers: channel.estadisticas?.seguidores || '',
  })

  // Load scoring data on mount
  useEffect(() => {
    const cid = channel._id || channel.id
    if (cid) {
      apiService.getChannelScore(cid).then(res => {
        if (res?.success) setScoreData(res.data)
      }).catch(() => {})
    }
  }, [channel._id, channel.id])

  const handleRecalculate = async () => {
    setScoreLoading(true)
    try {
      const res = await apiService.recalculateScore(channel._id || channel.id)
      if (res?.success) {
        setScoreData(prev => ({ ...prev, ...res.data }))
        showToast('Score recalculado con datos en tiempo real')
        onUpdated?.()
      } else showToast('Error: ' + (res?.message || 'No se pudo calcular'))
    } catch { showToast('Error de conexion') }
    finally { setScoreLoading(false) }
  }

  const handleConnect = async () => {
    setScoreLoading(true)
    try {
      const plat = (channel.plataforma || '').toLowerCase()
      let res
      if (plat === 'telegram') {
        res = await apiService.connectTelegram({ botToken: connectForm.botToken, chatId: connectForm.chatId })
      } else if (plat === 'discord') {
        res = await apiService.connectDiscord({ botToken: connectForm.botToken, serverId: connectForm.serverId })
      } else if (plat === 'whatsapp') {
        res = await apiService.connectWhatsAppManual({ accessToken: connectForm.accessToken, phoneNumberId: connectForm.phoneNumberId })
      } else if (plat === 'newsletter') {
        res = await apiService.connectNewsletter({ apiKey: connectForm.apiKey, provider: connectForm.provider, subscribers: connectForm.subscribers })
      } else if (plat === 'linkedin') {
        const authRes = await apiService.getLinkedinAuthUrl()
        if (authRes?.success && authRes.data?.url) {
          window.location.href = authRes.data.url
          return
        }
        res = authRes
      } else {
        res = await apiService.connectPlatform(channel._id || channel.id, connectForm)
      }
      if (res?.success) {
        showToast(res.data?.canal ? 'Plataforma conectada — datos en tiempo real' : 'Conexion exitosa')
        onUpdated?.()
      } else showToast('Error: ' + (res?.message || 'No se pudo conectar'))
    } catch { showToast('Error de conexion') }
    finally { setScoreLoading(false) }
  }

  const TABS = [
    { key: 'score', label: 'Score', icon: Zap },
    { key: 'profile', label: 'Perfil', icon: Edit },
    { key: 'availability', label: 'Disponibilidad', icon: Calendar },
    { key: 'pricing', label: 'Precios', icon: DollarSign },
    { key: 'insights', label: 'Mejores dias', icon: BarChart3 },
    { key: 'analytics', label: 'Analitica', icon: TrendingUp },
  ]

  const platColor = PLATFORM_COLORS[channel.plataforma?.charAt(0).toUpperCase() + channel.plataforma?.slice(1)] || A

  return (
    <div style={{ fontFamily: F, display: 'flex', flexDirection: 'column', gap: '0', maxWidth: '900px', animation: 'cc-in .25s ease' }}>
      <style>{`
        @keyframes cc-in { from { opacity:0; transform:translateX(8px) } to { opacity:1; transform:none } }
        @keyframes toast-in { from { opacity:0; transform:translateY(10px) } to { opacity:1; transform:none } }
        .cc-inp:focus { border-color: ${AG(0.5)} !important; box-shadow: 0 0 0 3px ${AG(0.08)} !important; }
      `}</style>

      {/* ── Toast ── */}
      {toast && (
        <div style={{ position: 'fixed', bottom: '28px', right: '28px', background: 'var(--surface)', border: `1px solid ${AG(0.3)}`, borderRadius: '12px', padding: '12px 20px', fontSize: '13px', fontWeight: 600, color: 'var(--text)', boxShadow: `0 8px 30px rgba(0,0,0,0.25)`, zIndex: 2000, animation: 'toast-in .2s ease', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <CheckCircle size={14} color={OK} /> {toast}
        </div>
      )}

      {/* ── Back + Channel header ── */}
      <div style={{ marginBottom: '22px' }}>
        <button onClick={onBack} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted)', fontFamily: F, fontSize: '13px', display: 'flex', alignItems: 'center', gap: '4px', padding: 0, marginBottom: '14px' }}>
          <ChevronLeft size={16} /> Volver a mis canales
        </button>

        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '18px', overflow: 'hidden' }}>
          {/* Banner */}
          <div style={{ height: '80px', background: `linear-gradient(135deg, ${platColor}, ${A})`, position: 'relative' }}>
            {profileForm.banner && <img src={profileForm.banner} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', position: 'absolute', inset: 0 }} />}
          </div>
          <div style={{ padding: '0 24px 20px', marginTop: '-28px', position: 'relative' }}>
            <div style={{ display: 'flex', alignItems: 'flex-end', gap: '16px', marginBottom: '14px' }}>
              <div style={{ width: '56px', height: '56px', borderRadius: '14px', background: profileForm.foto ? `url(${profileForm.foto}) center/cover` : AG(0.15), border: '3px solid var(--surface)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: D, fontSize: '22px', fontWeight: 800, color: A, flexShrink: 0 }}>
                {!profileForm.foto && (channel.nombreCanal || '?')[0].toUpperCase()}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                  <h2 style={{ fontFamily: D, fontSize: '20px', fontWeight: 800, color: 'var(--text)', margin: 0 }}>{channel.nombreCanal}</h2>
                  <span style={{ background: `${platColor}18`, color: platColor, border: `1px solid ${platColor}35`, borderRadius: '6px', padding: '2px 8px', fontSize: '11px', fontWeight: 600 }}>{channel.plataforma}</span>
                  {channel.estado === 'activo' && <span style={{ display: 'flex', alignItems: 'center', gap: '3px', color: OK, fontSize: '12px', fontWeight: 600 }}><CheckCircle size={12} /> Verificado</span>}
                </div>
                <div style={{ fontSize: '12px', color: 'var(--muted)', marginTop: '2px' }}>{channel.categoria} · {fmtK(channel.estadisticas?.seguidores || 0)} seguidores · €{channel.precio}/post</div>
              </div>
            </div>

            {/* KPIs */}
            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
              <Kpi label="Score" value={`${scoreData?.scores?.total || 0}/100`} icon={Zap} color={scoreData?.scores?.total >= 70 ? OK : scoreData?.scores?.total >= 40 ? WR : ER} />
              <Kpi label="Precio rec." value={`€${scoreData?.recommendedPrice || avgPrice}`} icon={DollarSign} color={A} />
              <Kpi label="Slots/mes" value={maxPub} icon={Calendar} color={BL} />
              <Kpi label="Dias activos" value={`${enabledDays.size}/7`} icon={Clock} color={OK} />
            </div>
          </div>
        </div>
      </div>

      {/* ── Tabs ── */}
      <div style={{ display: 'flex', gap: '4px', marginBottom: '18px', background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: '12px', padding: '4px' }}>
        {TABS.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)} style={{
            flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
            padding: '10px 12px', borderRadius: '9px', border: 'none', cursor: 'pointer',
            background: tab === t.key ? 'var(--surface)' : 'transparent',
            color: tab === t.key ? A : 'var(--muted)',
            fontSize: '13px', fontWeight: tab === t.key ? 700 : 500, fontFamily: F,
            boxShadow: tab === t.key ? '0 1px 4px rgba(0,0,0,0.08)' : 'none',
            transition: 'all .15s',
          }}>
            <t.icon size={14} /> {t.label}
          </button>
        ))}
      </div>

      {/* ══════ TAB: SCORE & CONNECT ══════ */}
      {tab === 'score' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Score overview */}
          <Section icon={Zap} title="Channel Score" subtitle="Puntuacion calculada automaticamente segun 5 factores"
            action={<button onClick={handleRecalculate} disabled={scoreLoading} style={{ background: A, color: '#fff', border: 'none', borderRadius: '10px', padding: '8px 18px', fontSize: '12px', fontWeight: 600, cursor: 'pointer', fontFamily: F, display: 'flex', alignItems: 'center', gap: '6px', opacity: scoreLoading ? 0.6 : 1 }}><Zap size={13} /> {scoreLoading ? 'Calculando...' : 'Recalcular ahora'}</button>}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {/* Big score display */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '20px', flexWrap: 'wrap' }}>
                <div style={{ width: '100px', height: '100px', borderRadius: '50%', background: `conic-gradient(${scoreData?.scores?.total >= 70 ? OK : scoreData?.scores?.total >= 40 ? WR : ER} ${(scoreData?.scores?.total || 0) * 3.6}deg, var(--bg) 0deg)`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <div style={{ width: '80px', height: '80px', borderRadius: '50%', background: 'var(--surface)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column' }}>
                    <span style={{ fontFamily: D, fontSize: '28px', fontWeight: 800, color: 'var(--text)' }}>{scoreData?.scores?.total || 0}</span>
                    <span style={{ fontSize: '10px', color: 'var(--muted)' }}>de 100</span>
                  </div>
                </div>
                <div style={{ flex: 1, minWidth: '200px' }}>
                  <div style={{ fontFamily: D, fontSize: '16px', fontWeight: 700, color: 'var(--text)', marginBottom: '4px' }}>Precio recomendado</div>
                  <div style={{ fontFamily: D, fontSize: '32px', fontWeight: 800, color: A, letterSpacing: '-0.03em' }}>€{scoreData?.recommendedPrice || channel.precio || 0}</div>
                  <div style={{ fontSize: '12px', color: 'var(--muted)', marginTop: '4px' }}>Basado en atencion, confianza, rendimiento y liquidez</div>
                </div>
              </div>

              {/* Score breakdown */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '8px' }}>
                {[
                  { label: 'Atencion', value: scoreData?.scores?.attention || 0, weight: '25%', color: '#8b5cf6' },
                  { label: 'Intencion', value: scoreData?.scores?.intent || 0, weight: '15%', color: '#3b82f6' },
                  { label: 'Confianza', value: scoreData?.scores?.trust || 0, weight: '20%', color: '#10b981' },
                  { label: 'Rendimiento', value: scoreData?.scores?.performance || 0, weight: '25%', color: '#f59e0b' },
                  { label: 'Liquidez', value: scoreData?.scores?.liquidity || 0, weight: '15%', color: '#ef4444' },
                ].map(({ label, value, weight, color }) => (
                  <div key={label} style={{ background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: '12px', padding: '12px', textAlign: 'center' }}>
                    <div style={{ fontSize: '20px', fontWeight: 700, color, fontFamily: D }}>{value}</div>
                    <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text)', marginTop: '2px' }}>{label}</div>
                    <div style={{ fontSize: '10px', color: 'var(--muted)' }}>{weight}</div>
                    <div style={{ height: '4px', background: 'var(--border)', borderRadius: '2px', marginTop: '6px', overflow: 'hidden' }}>
                      <div style={{ width: `${value}%`, height: '100%', background: color, borderRadius: '2px', transition: 'width .4s' }} />
                    </div>
                  </div>
                ))}
              </div>

              {/* Metrics */}
              {scoreData?.metrics && (
                <div style={{ background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: '12px', padding: '16px' }}>
                  <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '12px' }}>Metricas clave</div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '10px' }}>
                    {[
                      { l: 'Views/post', v: (scoreData.metrics.viewsAvg || 0).toLocaleString() },
                      { l: 'Engagement', v: `${((scoreData.metrics.engagementRate || 0) * 100).toFixed(1)}%` },
                      { l: 'CTR', v: `${((scoreData.metrics.ctr || 0) * 100).toFixed(2)}%` },
                      { l: 'Conversion', v: `${((scoreData.metrics.conversionRate || 0) * 100).toFixed(2)}%` },
                      { l: 'Fill Rate', v: `${((scoreData.metrics.fillRate || 0) * 100).toFixed(0)}%` },
                      { l: 'Calidad aud.', v: `${((scoreData.metrics.audienceQuality || 0) * 100).toFixed(0)}%` },
                      { l: 'Repeat rate', v: `${((scoreData.metrics.repeatRate || 0) * 100).toFixed(0)}%` },
                      { l: 'Campanas', v: scoreData.metrics.totalCampaigns || 0 },
                    ].map(({ l, v }) => (
                      <div key={l} style={{ textAlign: 'center' }}>
                        <div style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text)', fontFamily: D }}>{v}</div>
                        <div style={{ fontSize: '10px', color: 'var(--muted)' }}>{l}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Last calculated */}
              {scoreData?.lastCalculated && (
                <div style={{ fontSize: '11px', color: 'var(--muted)', textAlign: 'right' }}>
                  Ultimo calculo: {new Date(scoreData.lastCalculated).toLocaleString('es')}
                </div>
              )}
            </div>
          </Section>

          {/* Platform connection */}
          <Section icon={Link2} title="Conectar plataforma" subtitle="Conecta tu API para obtener datos en tiempo real y un score mas preciso">
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {/* Status */}
              <div style={{
                background: scoreData?.platformData?.lastFetched && !scoreData?.platformData?.raw?.estimated ? `${OK}08` : `${WR}08`,
                border: `1px solid ${scoreData?.platformData?.lastFetched && !scoreData?.platformData?.raw?.estimated ? `${OK}20` : `${WR}20`}`,
                borderRadius: '12px', padding: '14px 16px', display: 'flex', alignItems: 'center', gap: '10px',
              }}>
                {scoreData?.platformData?.lastFetched && !scoreData?.platformData?.raw?.estimated ? (
                  <><CheckCircle size={16} color={OK} /><div><div style={{ fontSize: '13px', fontWeight: 600, color: OK }}>Plataforma conectada</div><div style={{ fontSize: '11px', color: 'var(--muted)' }}>Datos actualizados: {new Date(scoreData.platformData.lastFetched).toLocaleString('es')}</div></div></>
                ) : (
                  <><AlertCircle size={16} color={WR} /><div><div style={{ fontSize: '13px', fontWeight: 600, color: WR }}>Sin conexion directa</div><div style={{ fontSize: '11px', color: 'var(--muted)' }}>Los datos se estiman segun tus seguidores. Conecta tu API para un score mas preciso.</div></div></>
                )}
              </div>

              {/* Connection fields based on platform */}
              {(() => {
                const plat = (channel.plataforma || '').toLowerCase()
                const fields = []
                if (plat === 'telegram') {
                  fields.push({ key: 'botToken', label: 'Bot Token', ph: '123456:ABC-DEF1234...', help: 'Crea un bot con @BotFather y anadelo como admin al canal' })
                  fields.push({ key: 'chatId', label: 'Chat ID', ph: '@tucanalID o -100...', help: 'El username o ID numerico de tu canal' })
                } else if (plat === 'discord') {
                  fields.push({ key: 'botToken', label: 'Bot Token', ph: 'MTA4NzE...', help: 'Token del bot en Discord Developer Portal' })
                  fields.push({ key: 'serverId', label: 'Server ID', ph: '1234567890', help: 'Click derecho en el server → Copiar ID (modo desarrollador)' })
                } else if (plat === 'instagram' || plat === 'facebook') {
                  fields.push({ key: '_metaOAuth', label: 'Meta OAuth', type: 'oauth', help: 'Conecta via Facebook Login para obtener acceso automatico' })
                } else if (plat === 'whatsapp') {
                  fields.push({ key: 'accessToken', label: 'Access Token', ph: 'EAAGm0P...', help: 'Token de WhatsApp Business API' })
                  fields.push({ key: 'phoneNumberId', label: 'Phone Number ID', ph: '1234567890', help: 'ID del numero en Meta Business Suite' })
                } else if (plat === 'newsletter') {
                  fields.push({ key: 'provider', label: 'Proveedor', type: 'select', options: ['mailchimp', 'beehiiv', 'substack'], help: 'Selecciona tu proveedor de newsletter' })
                  fields.push({ key: 'apiKey', label: 'API Key', ph: 'Tu API key del proveedor', help: 'Mailchimp: abc123-us10 | Beehiiv: Bearer token' })
                  fields.push({ key: 'subscribers', label: 'Suscriptores', ph: '5000', type: 'number', help: 'Numero total de suscriptores activos' })
                } else if (plat === 'linkedin') {
                  fields.push({ key: '_linkedinOAuth', label: 'LinkedIn OAuth', type: 'oauth', help: 'Conecta via LinkedIn para obtener acceso automatico' })
                } else {
                  fields.push({ key: 'accessToken', label: 'API Token', ph: 'Tu token de la plataforma', help: 'Introduce las credenciales de tu plataforma' })
                }
                const isOAuthOnly = fields.length === 1 && fields[0].type === 'oauth'
                return (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {fields.map(({ key, label, ph, help, type, options }) => (
                      <div key={key}>
                        {type === 'oauth' ? (
                          <div style={{ fontSize: '12px', color: 'var(--muted)' }}>{help}</div>
                        ) : type === 'select' ? (
                          <>
                            <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--muted)', display: 'block', marginBottom: '4px' }}>{label}</label>
                            <select className="cc-inp" value={connectForm[key] || options?.[0] || ''} onChange={e => setConnectForm(prev => ({ ...prev, [key]: e.target.value }))} style={inp}>
                              {(options || []).map(o => <option key={o} value={o}>{o.charAt(0).toUpperCase() + o.slice(1)}</option>)}
                            </select>
                            <div style={{ fontSize: '10px', color: 'var(--muted)', marginTop: '3px' }}>{help}</div>
                          </>
                        ) : (
                          <>
                            <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--muted)', display: 'block', marginBottom: '4px' }}>{label}</label>
                            <input className="cc-inp" type={key.includes('Token') || key.includes('Key') ? 'password' : type === 'number' ? 'number' : 'text'}
                              value={connectForm[key] || ''} onChange={e => setConnectForm(prev => ({ ...prev, [key]: e.target.value }))}
                              placeholder={ph} style={inp} />
                            <div style={{ fontSize: '10px', color: 'var(--muted)', marginTop: '3px' }}>{help}</div>
                          </>
                        )}
                      </div>
                    ))}
                    <button onClick={handleConnect} disabled={scoreLoading} style={{
                      background: A, color: '#fff', border: 'none', borderRadius: '10px',
                      padding: '12px', fontSize: '13px', fontWeight: 600, cursor: 'pointer', fontFamily: F,
                      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                      opacity: scoreLoading ? 0.6 : 1,
                    }}>
                      <Link2 size={14} /> {scoreLoading ? 'Conectando...' : isOAuthOnly ? 'Conectar con OAuth' : 'Conectar y obtener datos'}
                    </button>
                  </div>
                )
              })()}

              {/* Platform data preview */}
              {scoreData?.platformData?.followers > 0 && (
                <div style={{ background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: '12px', padding: '14px 16px' }}>
                  <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '10px' }}>Datos de la plataforma</div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: '10px' }}>
                    {[
                      { l: 'Seguidores', v: (scoreData.platformData.followers || 0).toLocaleString() },
                      { l: 'Views/post', v: (scoreData.platformData.avgViewsPerPost || 0).toLocaleString() },
                      { l: 'Reacciones', v: (scoreData.platformData.avgReactionsPerPost || 0).toLocaleString() },
                      { l: 'Posts total', v: scoreData.platformData.postsTotal || '-' },
                    ].map(({ l, v }) => (
                      <div key={l} style={{ textAlign: 'center' }}>
                        <div style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text)', fontFamily: D }}>{v}</div>
                        <div style={{ fontSize: '10px', color: 'var(--muted)' }}>{l}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Scoring formula explanation */}
              <div style={{ background: `${BL}06`, border: `1px solid ${BL}15`, borderRadius: '12px', padding: '14px 16px' }}>
                <div style={{ fontSize: '12px', fontWeight: 600, color: BL, marginBottom: '8px' }}>Como se calcula el score</div>
                <div style={{ fontSize: '11px', color: 'var(--muted)', lineHeight: 1.6 }}>
                  <strong style={{ color: 'var(--text)' }}>Atencion (25%)</strong> — views × engagement × scroll depth<br/>
                  <strong style={{ color: 'var(--text)' }}>Intencion (15%)</strong> — tipo de contenido (memes=40, niche=85, finanzas=90)<br/>
                  <strong style={{ color: 'var(--text)' }}>Confianza (20%)</strong> — repeat rate + calidad de audiencia<br/>
                  <strong style={{ color: 'var(--text)' }}>Rendimiento (25%)</strong> — CTR (60%) + conversion rate (40%)<br/>
                  <strong style={{ color: 'var(--text)' }}>Liquidez (15%)</strong> — fill rate × tiempo de respuesta
                </div>
              </div>
            </div>
          </Section>
        </div>
      )}

      {/* ══════ TAB: PROFILE ══════ */}
      {tab === 'profile' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <Section icon={Edit} title="Informacion del canal" subtitle="Datos visibles para los anunciantes"
            action={<button onClick={saveProfile} disabled={saving} style={{ background: A, color: '#fff', border: 'none', borderRadius: '10px', padding: '8px 18px', fontSize: '12px', fontWeight: 600, cursor: 'pointer', fontFamily: F, display: 'flex', alignItems: 'center', gap: '6px', opacity: saving ? 0.6 : 1 }}><Save size={13} /> {saving ? 'Guardando...' : 'Guardar'}</button>}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {/* Photo & Banner URLs */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--muted)', display: 'block', marginBottom: '6px' }}>URL de foto de perfil</label>
                  <input className="cc-inp" value={profileForm.foto} onChange={e => setProfileForm(p => ({ ...p, foto: e.target.value }))} placeholder="https://..." style={inp} />
                </div>
                <div>
                  <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--muted)', display: 'block', marginBottom: '6px' }}>URL de banner</label>
                  <input className="cc-inp" value={profileForm.banner} onChange={e => setProfileForm(p => ({ ...p, banner: e.target.value }))} placeholder="https://..." style={inp} />
                </div>
              </div>

              {/* Name + Category */}
              <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--muted)', display: 'block', marginBottom: '6px' }}>Nombre del canal</label>
                  <input className="cc-inp" value={profileForm.nombreCanal} onChange={e => setProfileForm(p => ({ ...p, nombreCanal: e.target.value }))} style={inp} />
                </div>
                <div>
                  <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--muted)', display: 'block', marginBottom: '6px' }}>Precio base (€)</label>
                  <input className="cc-inp" type="number" value={profileForm.precio} onChange={e => setProfileForm(p => ({ ...p, precio: e.target.value }))} style={inp} />
                </div>
              </div>

              {/* Category pills */}
              <div>
                <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--muted)', display: 'block', marginBottom: '6px' }}>Categoria</label>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px' }}>
                  {CATEGORIES.map(c => (
                    <button key={c} onClick={() => setProfileForm(p => ({ ...p, categoria: c.toLowerCase() }))}
                      style={{ background: profileForm.categoria === c.toLowerCase() ? A : 'var(--bg)', border: `1px solid ${profileForm.categoria === c.toLowerCase() ? A : 'var(--border)'}`, borderRadius: '20px', padding: '5px 12px', fontSize: '11px', color: profileForm.categoria === c.toLowerCase() ? '#fff' : 'var(--muted)', cursor: 'pointer', fontFamily: F }}>{c}</button>
                  ))}
                </div>
              </div>

              {/* Description + Bio */}
              <div>
                <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--muted)', display: 'block', marginBottom: '6px' }}>Descripcion</label>
                <textarea className="cc-inp" value={profileForm.descripcion} onChange={e => setProfileForm(p => ({ ...p, descripcion: e.target.value }))} rows={3} style={{ ...inp, resize: 'vertical' }} />
              </div>
              <div>
                <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--muted)', display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                  <span>Bio</span><span style={{ fontWeight: 400 }}>{profileForm.bio.length}/500</span>
                </label>
                <textarea className="cc-inp" value={profileForm.bio} onChange={e => setProfileForm(p => ({ ...p, bio: e.target.value.slice(0, 500) }))} rows={2} style={{ ...inp, resize: 'vertical' }} placeholder="Breve bio sobre ti y tu canal..." />
              </div>

              {/* Language + Timezone */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--muted)', display: 'block', marginBottom: '6px' }}>Idioma</label>
                  <select className="cc-inp" value={profileForm.idioma} onChange={e => setProfileForm(p => ({ ...p, idioma: e.target.value }))} style={{ ...inp, cursor: 'pointer' }}>
                    {LANGUAGES.map(l => <option key={l.v} value={l.v}>{l.l}</option>)}
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--muted)', display: 'block', marginBottom: '6px' }}>Zona horaria</label>
                  <select className="cc-inp" value={profileForm.zonaHoraria} onChange={e => setProfileForm(p => ({ ...p, zonaHoraria: e.target.value }))} style={{ ...inp, cursor: 'pointer' }}>
                    {TIMEZONES.map(tz => <option key={tz} value={tz}>{tz}</option>)}
                  </select>
                </div>
              </div>

              {/* Social links */}
              <div>
                <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--muted)', display: 'block', marginBottom: '8px' }}>Redes sociales</label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                  {[
                    { key: 'twitter', icon: Twitter, ph: '@usuario' },
                    { key: 'instagram', icon: Instagram, ph: '@usuario' },
                    { key: 'youtube', icon: Youtube, ph: 'URL del canal' },
                    { key: 'web', icon: Globe, ph: 'https://tu-web.com' },
                  ].map(({ key, icon: Ic, ph }) => (
                    <div key={key} style={{ position: 'relative' }}>
                      <Ic size={14} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--muted)' }} />
                      <input className="cc-inp" value={profileForm[key]} onChange={e => setProfileForm(p => ({ ...p, [key]: e.target.value }))} placeholder={ph} style={{ ...inp, paddingLeft: '34px' }} />
                    </div>
                  ))}
                </div>
              </div>

              {/* Tags */}
              <div>
                <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--muted)', display: 'block', marginBottom: '6px' }}>Tags ({profileForm.tags.length}/15)</label>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '8px' }}>
                  {profileForm.tags.map(tag => (
                    <span key={tag} style={{ display: 'flex', alignItems: 'center', gap: '4px', background: AG(0.08), border: `1px solid ${AG(0.2)}`, borderRadius: '20px', padding: '4px 10px', fontSize: '12px', color: A }}>
                      <Tag size={10} />{tag}
                      <button onClick={() => removeTag(tag)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted)', padding: 0, display: 'flex' }}><X size={10} /></button>
                    </span>
                  ))}
                </div>
                <div style={{ display: 'flex', gap: '6px' }}>
                  <input className="cc-inp" value={newTag} onChange={e => setNewTag(e.target.value)} onKeyDown={e => e.key === 'Enter' && addTag()} placeholder="Anadir tag..." style={{ ...inp, flex: 1 }} />
                  <button onClick={addTag} style={{ background: AG(0.1), border: `1px solid ${AG(0.2)}`, borderRadius: '10px', padding: '8px 14px', fontSize: '12px', fontWeight: 600, color: A, cursor: 'pointer', fontFamily: F }}>+</button>
                </div>
              </div>
            </div>
          </Section>
        </div>
      )}

      {/* ══════ TAB: AVAILABILITY ══════ */}
      {tab === 'availability' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Weekly schedule */}
          <Section icon={Calendar} title="Dias de publicacion" subtitle="Configura que dias de la semana aceptas publicaciones"
            action={<button onClick={saveAvailability} disabled={saving} style={{ background: A, color: '#fff', border: 'none', borderRadius: '10px', padding: '8px 18px', fontSize: '12px', fontWeight: 600, cursor: 'pointer', fontFamily: F, display: 'flex', alignItems: 'center', gap: '6px', opacity: saving ? 0.6 : 1 }}><Save size={13} /> {saving ? 'Guardando...' : 'Guardar'}</button>}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {/* Day toggles */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '8px' }}>
                {DAY_NAMES.map((name, i) => {
                  const on = enabledDays.has(i)
                  const isWeekend = i === 0 || i === 6
                  return (
                    <button key={i} onClick={() => toggleDay(i)} style={{
                      background: on ? (isWeekend ? `${WR}12` : AG(0.08)) : 'var(--bg)',
                      border: `2px solid ${on ? (isWeekend ? WR : A) : 'var(--border)'}`,
                      borderRadius: '12px', padding: '14px 8px', cursor: 'pointer',
                      display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px',
                      transition: 'all .15s',
                    }}>
                      <span style={{ fontSize: '12px', fontWeight: 700, color: on ? (isWeekend ? WR : A) : 'var(--muted)' }}>{name}</span>
                      <div style={{ width: '24px', height: '24px', borderRadius: '50%', background: on ? (isWeekend ? WR : A) : 'var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        {on && <CheckCircle size={14} color="#fff" />}
                      </div>
                      <span style={{ fontSize: '11px', color: 'var(--muted)' }}>€{dayPricing[i]?.price || 0}</span>
                    </button>
                  )
                })}
              </div>

              {/* Monthly limit */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--muted)', display: 'block', marginBottom: '6px' }}>Max publicaciones / mes</label>
                  <input className="cc-inp" type="number" min="1" max="100" value={maxPub} onChange={e => setMaxPub(Number(e.target.value) || 1)} style={inp} />
                </div>
                <div>
                  <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--muted)', display: 'block', marginBottom: '6px' }}>Slots disponibles este mes</label>
                  <div style={{ ...inp, background: AG(0.04), borderColor: AG(0.15), fontWeight: 700, color: A, fontFamily: D }}>
                    {maxPub - (dispo.publicacionesEsteMes || 0)} de {maxPub}
                  </div>
                </div>
              </div>

              {/* Advance booking */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--muted)', display: 'block', marginBottom: '6px' }}>Antelacion minima (dias)</label>
                  <input className="cc-inp" type="number" min="0" max="30" value={minAdvance} onChange={e => setMinAdvance(Number(e.target.value) || 0)} style={inp} />
                </div>
                <div>
                  <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--muted)', display: 'block', marginBottom: '6px' }}>Antelacion maxima (dias)</label>
                  <input className="cc-inp" type="number" min="7" max="180" value={maxAdvance} onChange={e => setMaxAdvance(Number(e.target.value) || 60)} style={inp} />
                </div>
              </div>

              {/* Schedule hours */}
              <div>
                <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--muted)', display: 'block', marginBottom: '6px' }}>Horario preferido de publicacion</label>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <input className="cc-inp" type="time" value={schedFrom} onChange={e => setSchedFrom(e.target.value)} style={{ ...inp, flex: 1 }} />
                  <span style={{ fontSize: '13px', color: 'var(--muted)' }}>a</span>
                  <input className="cc-inp" type="time" value={schedTo} onChange={e => setSchedTo(e.target.value)} style={{ ...inp, flex: 1 }} />
                </div>
              </div>

              {/* Urgent */}
              <div style={{ background: `${WR}08`, border: `1px solid ${WR}20`, borderRadius: '12px', padding: '14px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <Zap size={16} color={WR} />
                  <div>
                    <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text)' }}>Aceptar publicaciones urgentes</div>
                    <div style={{ fontSize: '11px', color: 'var(--muted)' }}>Publicaciones con menos de {minAdvance} dias de antelacion</div>
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  {acceptUrgent && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <span style={{ fontSize: '11px', color: 'var(--muted)' }}>+€</span>
                      <input className="cc-inp" type="number" min="0" value={urgentPrice} onChange={e => setUrgentPrice(Number(e.target.value) || 0)} style={{ ...inp, width: '70px', padding: '6px 8px', fontSize: '13px', fontWeight: 700 }} />
                    </div>
                  )}
                  <Toggle on={acceptUrgent} onChange={setAcceptUrgent} size="sm" />
                </div>
              </div>

              {/* Packs de medios */}
              <div style={{ background: `${A}08`, border: `1px solid ${AG(0.15)}`, borderRadius: '12px', padding: '14px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <Globe size={16} color={A} />
                  <div>
                    <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text)' }}>Participar en packs de medios</div>
                    <div style={{ fontSize: '11px', color: 'var(--muted)' }}>Permite que tu canal sea incluido en packs multi-canal para anunciantes</div>
                  </div>
                </div>
                <Toggle on={allowPacks} onChange={setAllowPacks} size="sm" />
              </div>
            </div>

            {/* Blocked dates management */}
            <div style={{ marginTop: '8px' }}>
              <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text)', marginBottom: '8px' }}>Fechas bloqueadas</div>
              <div style={{ fontSize: '12px', color: 'var(--muted)', marginBottom: '12px' }}>Bloquea fechas especificas donde no aceptas publicaciones (vacaciones, eventos, etc.)</div>

              {blockedDates.length > 0 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginBottom: '12px' }}>
                  {blockedDates.map((b, i) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: `${ER}06`, border: `1px solid ${ER}18`, borderRadius: '10px', padding: '10px 14px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <Calendar size={13} color={ER} />
                        <span style={{ fontSize: '13px', color: 'var(--text)', fontWeight: 500 }}>
                          {new Date(b.start).toLocaleDateString('es', { day: 'numeric', month: 'short' })}
                          {b.end && b.end !== b.start ? ` — ${new Date(b.end).toLocaleDateString('es', { day: 'numeric', month: 'short' })}` : ''}
                        </span>
                        {b.reason && <span style={{ fontSize: '11px', color: 'var(--muted)' }}>({b.reason})</span>}
                      </div>
                      <button onClick={() => setBlockedDates(prev => prev.filter((_, j) => j !== i))} style={{ background: 'none', border: 'none', cursor: 'pointer', color: ER, display: 'flex', padding: '4px' }}>
                        <X size={14} />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-end', flexWrap: 'wrap' }}>
                <div>
                  <label style={{ fontSize: '11px', color: 'var(--muted)', display: 'block', marginBottom: '4px' }}>Desde</label>
                  <input className="cc-inp" type="date" id="block-start" style={{ ...inp, width: '150px', padding: '8px 10px', fontSize: '12px' }} />
                </div>
                <div>
                  <label style={{ fontSize: '11px', color: 'var(--muted)', display: 'block', marginBottom: '4px' }}>Hasta</label>
                  <input className="cc-inp" type="date" id="block-end" style={{ ...inp, width: '150px', padding: '8px 10px', fontSize: '12px' }} />
                </div>
                <div>
                  <label style={{ fontSize: '11px', color: 'var(--muted)', display: 'block', marginBottom: '4px' }}>Motivo (opcional)</label>
                  <input className="cc-inp" type="text" id="block-reason" placeholder="Vacaciones..." style={{ ...inp, width: '160px', padding: '8px 10px', fontSize: '12px' }} />
                </div>
                <button onClick={() => {
                  const start = document.getElementById('block-start')?.value
                  const end = document.getElementById('block-end')?.value
                  const reason = document.getElementById('block-reason')?.value
                  if (!start) return
                  setBlockedDates(prev => [...prev, { start, end: end || start, reason: reason || '' }])
                  if (document.getElementById('block-start')) document.getElementById('block-start').value = ''
                  if (document.getElementById('block-end')) document.getElementById('block-end').value = ''
                  if (document.getElementById('block-reason')) document.getElementById('block-reason').value = ''
                }} style={{ background: ER, color: '#fff', border: 'none', borderRadius: '10px', padding: '8px 16px', fontSize: '12px', fontWeight: 600, cursor: 'pointer', fontFamily: F, whiteSpace: 'nowrap', height: '36px' }}>
                  + Bloquear
                </button>
              </div>
            </div>
          </Section>

          {/* Calendar preview */}
          <Section icon={Eye} title="Vista previa del calendario" subtitle="Asi lo veran los anunciantes">
            <div>
              {/* Month nav */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
                <button onClick={() => { if (calMonth === 0) { setCalMonth(11); setCalYear(y => y - 1) } else setCalMonth(m => m - 1) }} style={{ background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: '8px', padding: '6px', cursor: 'pointer', color: 'var(--muted)', display: 'flex' }}><ChevronLeft size={16} /></button>
                <span style={{ fontFamily: D, fontSize: '15px', fontWeight: 700, color: 'var(--text)' }}>{MONTH_NAMES[calMonth]} {calYear}</span>
                <button onClick={() => { if (calMonth === 11) { setCalMonth(0); setCalYear(y => y + 1) } else setCalMonth(m => m + 1) }} style={{ background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: '8px', padding: '6px', cursor: 'pointer', color: 'var(--muted)', display: 'flex' }}><ChevronRight size={16} /></button>
              </div>

              {/* Day headers */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '4px', marginBottom: '4px' }}>
                {DAY_NAMES.map(d => (
                  <div key={d} style={{ textAlign: 'center', fontSize: '10px', fontWeight: 600, color: 'var(--muted)', padding: '4px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{d}</div>
                ))}
              </div>

              {/* Day cells */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '4px' }}>
                {calDays.map((day, i) => {
                  if (!day) return <div key={`pad-${i}`} />
                  const colors = {
                    available: { bg: `${OK}08`, border: `${OK}30`, text: 'var(--text)', price: OK },
                    past: { bg: 'var(--bg)', border: 'var(--border)', text: 'var(--muted2)', price: 'var(--muted2)' },
                    disabled: { bg: 'var(--bg)', border: 'var(--border)', text: 'var(--muted2)', price: 'var(--muted2)' },
                    blocked: { bg: `${ER}08`, border: `${ER}25`, text: ER, price: ER },
                    booked: { bg: `${BL}08`, border: `${BL}25`, text: BL, price: BL },
                  }
                  const c = colors[day.status] || colors.disabled
                  return (
                    <div key={`d-${day.d}`} style={{
                      background: c.bg, border: `1px solid ${c.border}`,
                      borderRadius: '8px', padding: '6px 4px', textAlign: 'center',
                      minHeight: '46px', display: 'flex', flexDirection: 'column', justifyContent: 'center',
                    }}>
                      <div style={{ fontSize: '13px', fontWeight: 600, color: c.text }}>{day.d}</div>
                      {day.status === 'available' && (
                        <div style={{ fontSize: '10px', fontWeight: 700, color: c.price }}>€{day.price}</div>
                      )}
                      {day.status === 'blocked' && <div style={{ fontSize: '9px', color: ER }}>Bloqueado</div>}
                      {day.status === 'booked' && <div style={{ fontSize: '9px', color: BL }}>Reservado</div>}
                    </div>
                  )
                })}
              </div>

              {/* Legend */}
              <div style={{ display: 'flex', gap: '14px', marginTop: '12px', flexWrap: 'wrap' }}>
                {[
                  { color: OK, label: 'Disponible' },
                  { color: ER, label: 'Bloqueado' },
                  { color: BL, label: 'Reservado' },
                  { color: 'var(--muted2)', label: 'No disponible' },
                ].map(({ color, label }) => (
                  <div key={label} style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                    <div style={{ width: '8px', height: '8px', borderRadius: '2px', background: color }} />
                    <span style={{ fontSize: '11px', color: 'var(--muted)' }}>{label}</span>
                  </div>
                ))}
              </div>
            </div>
          </Section>
        </div>
      )}

      {/* ══════ TAB: PRICING ══════ */}
      {tab === 'pricing' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <Section icon={DollarSign} title="Precios por dia de la semana" subtitle="Ajusta precios segun las metricas de tu audiencia"
            action={<button onClick={saveAvailability} disabled={saving} style={{ background: A, color: '#fff', border: 'none', borderRadius: '10px', padding: '8px 18px', fontSize: '12px', fontWeight: 600, cursor: 'pointer', fontFamily: F, display: 'flex', alignItems: 'center', gap: '6px', opacity: saving ? 0.6 : 1 }}><Save size={13} /> {saving ? 'Guardando...' : 'Guardar precios'}</button>}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {/* Price base info */}
              <div style={{ background: AG(0.04), border: `1px solid ${AG(0.15)}`, borderRadius: '12px', padding: '14px 16px', marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                <AlertCircle size={16} color={A} />
                <div style={{ fontSize: '12px', color: 'var(--muted)', lineHeight: 1.5 }}>
                  Configura precios diferentes para cada dia. Los fines de semana suelen tener mas engagement — cobra mas. Los dias de menor audiencia puedes ofrecer descuento.
                </div>
              </div>

              {/* Day pricing rows */}
              {[1, 2, 3, 4, 5, 6, 0].map(day => {
                const pricing = dayPricing[day] || { price: channel.precio || 100, enabled: true }
                const insight = insights.find(i => i.day === day)
                const isWeekend = day === 0 || day === 6
                const pctDiff = channel.precio ? Math.round(((pricing.price - channel.precio) / channel.precio) * 100) : 0

                return (
                  <div key={day} style={{
                    background: pricing.enabled ? 'var(--surface)' : 'var(--bg)',
                    border: `1px solid ${pricing.enabled ? (isWeekend ? `${WR}30` : 'var(--border)') : 'var(--border)'}`,
                    borderRadius: '12px', padding: '14px 16px',
                    opacity: pricing.enabled ? 1 : 0.5,
                    transition: 'all .15s',
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                      {/* Day name */}
                      <div style={{ minWidth: '90px' }}>
                        <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text)', fontFamily: D }}>{DAY_FULL[day]}</div>
                        <div style={{ fontSize: '11px', color: 'var(--muted)' }}>{isWeekend ? 'Fin de semana' : 'Laborable'}</div>
                      </div>

                      {/* Score */}
                      <div style={{ flex: 1, minWidth: '80px' }}>
                        {insight && insight.score > 0 ? (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <div style={{ flex: 1, height: '6px', background: 'var(--bg)', borderRadius: '3px', overflow: 'hidden' }}>
                              <div style={{ width: `${insight.score}%`, height: '100%', background: insight.score >= 70 ? OK : insight.score >= 40 ? WR : ER, borderRadius: '3px' }} />
                            </div>
                            <span style={{ fontSize: '11px', fontWeight: 600, color: insight.score >= 70 ? OK : insight.score >= 40 ? WR : ER }}>{insight.score}</span>
                          </div>
                        ) : (
                          <span style={{ fontSize: '11px', color: 'var(--muted2)' }}>Sin datos</span>
                        )}
                      </div>

                      {/* Price input */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ fontSize: '14px', fontWeight: 700, color: 'var(--muted)' }}>€</span>
                        <input className="cc-inp" type="number" min="0" value={pricing.price}
                          onChange={e => updateDayPrice(day, e.target.value)}
                          disabled={!pricing.enabled}
                          style={{ ...inp, width: '90px', padding: '8px 10px', fontSize: '15px', fontWeight: 700, fontFamily: D, textAlign: 'center' }} />
                        {pctDiff !== 0 && pricing.enabled && (
                          <span style={{ fontSize: '11px', fontWeight: 600, color: pctDiff > 0 ? OK : ER, minWidth: '40px' }}>
                            {pctDiff > 0 ? '+' : ''}{pctDiff}%
                          </span>
                        )}
                      </div>

                      {/* Toggle */}
                      <Toggle on={pricing.enabled} onChange={() => toggleDay(day)} size="sm" />
                    </div>
                  </div>
                )
              })}

              {/* Summary */}
              <div style={{ background: AG(0.04), border: `1px solid ${AG(0.15)}`, borderRadius: '12px', padding: '16px', display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px', marginTop: '4px' }}>
                {[
                  { label: 'Precio minimo', value: `€${Math.min(...Object.values(dayPricing).filter(v => v.enabled).map(v => v.price)) || 0}` },
                  { label: 'Precio promedio', value: `€${avgPrice}` },
                  { label: 'Precio maximo', value: `€${Math.max(...Object.values(dayPricing).filter(v => v.enabled).map(v => v.price)) || 0}` },
                ].map(({ label, value }) => (
                  <div key={label} style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: '18px', fontWeight: 700, color: A, fontFamily: D }}>{value}</div>
                    <div style={{ fontSize: '11px', color: 'var(--muted)' }}>{label}</div>
                  </div>
                ))}
              </div>
            </div>
          </Section>
        </div>
      )}

      {/* ══════ TAB: INSIGHTS (Best days) ══════ */}
      {tab === 'insights' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <Section icon={BarChart3} title="Mejores dias de publicacion" subtitle="Analiza las metricas de tu audiencia para optimizar precios"
            action={<button onClick={saveInsights} disabled={saving} style={{ background: A, color: '#fff', border: 'none', borderRadius: '10px', padding: '8px 18px', fontSize: '12px', fontWeight: 600, cursor: 'pointer', fontFamily: F, display: 'flex', alignItems: 'center', gap: '6px', opacity: saving ? 0.6 : 1 }}><Save size={13} /> {saving ? 'Guardando...' : 'Guardar insights'}</button>}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {/* Info */}
              <div style={{ background: `${BL}08`, border: `1px solid ${BL}20`, borderRadius: '12px', padding: '14px 16px', display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
                <BarChart3 size={16} color={BL} style={{ marginTop: '2px', flexShrink: 0 }} />
                <div style={{ fontSize: '12px', color: 'var(--muted)', lineHeight: 1.5 }}>
                  Introduce las metricas promedio de tu canal para cada dia de la semana. Usa tus estadisticas de la plataforma (Telegram Analytics, Discord Insights, etc.) para rellenar estos datos. El score se calcula automaticamente.
                </div>
              </div>

              {/* Visual score ranking */}
              <div style={{ background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: '12px', padding: '16px' }}>
                <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '12px' }}>Ranking por rendimiento</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {[...insights].sort((a, b) => b.score - a.score).map((ins, idx) => (
                    <div key={ins.day} style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <span style={{ fontSize: '12px', fontWeight: 700, color: idx === 0 ? WR : 'var(--muted)', minWidth: '16px' }}>#{idx + 1}</span>
                      <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text)', minWidth: '70px' }}>{DAY_FULL[ins.day]}</span>
                      <div style={{ flex: 1, height: '8px', background: 'var(--surface)', borderRadius: '4px', overflow: 'hidden' }}>
                        <div style={{
                          width: `${ins.score}%`, height: '100%', borderRadius: '4px',
                          background: ins.score >= 70 ? OK : ins.score >= 40 ? WR : ins.score > 0 ? ER : 'var(--border)',
                          transition: 'width .4s ease',
                        }} />
                      </div>
                      <span style={{ fontSize: '13px', fontWeight: 700, fontFamily: D, color: ins.score >= 70 ? OK : ins.score >= 40 ? WR : 'var(--muted)', minWidth: '30px', textAlign: 'right' }}>{ins.score}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Per-day data input */}
              {[1, 2, 3, 4, 5, 6, 0].map(day => {
                const ins = insights.find(i => i.day === day) || { day, avgViews: 0, avgClicks: 0, avgEngagement: 0, score: 0 }
                const updateIns = (field, val) => {
                  setInsights(prev => {
                    const next = prev.map(i => i.day === day ? { ...i, [field]: Number(val) || 0 } : i)
                    // Auto-calculate score
                    return next.map(i => {
                      if (i.day !== day) return i
                      const maxV = Math.max(...next.map(x => x.avgViews)) || 1
                      const maxC = Math.max(...next.map(x => x.avgClicks)) || 1
                      const maxE = Math.max(...next.map(x => x.avgEngagement)) || 1
                      const vScore = (i.avgViews / maxV) * 40
                      const cScore = (i.avgClicks / maxC) * 30
                      const eScore = (i.avgEngagement / maxE) * 30
                      return { ...i, score: Math.round(vScore + cScore + eScore) }
                    })
                  })
                }

                return (
                  <div key={day} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '12px', padding: '14px 16px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flexWrap: 'wrap' }}>
                      <div style={{ minWidth: '90px' }}>
                        <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text)', fontFamily: D }}>{DAY_FULL[day]}</div>
                        <div style={{ fontSize: '11px', color: ins.score >= 70 ? OK : ins.score >= 40 ? WR : 'var(--muted)', fontWeight: 600 }}>
                          Score: {ins.score}/100
                        </div>
                      </div>
                      <div style={{ flex: 1, display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px', minWidth: '280px' }}>
                        {[
                          { label: 'Avg Views', field: 'avgViews', val: ins.avgViews },
                          { label: 'Avg Clicks', field: 'avgClicks', val: ins.avgClicks },
                          { label: 'Engagement %', field: 'avgEngagement', val: ins.avgEngagement },
                        ].map(({ label, field, val }) => (
                          <div key={field}>
                            <label style={{ fontSize: '10px', color: 'var(--muted)', display: 'block', marginBottom: '3px' }}>{label}</label>
                            <input className="cc-inp" type="number" min="0" value={val}
                              onChange={e => updateIns(field, e.target.value)}
                              style={{ ...inp, padding: '6px 8px', fontSize: '13px', fontWeight: 600 }} />
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </Section>
        </div>
      )}

      {/* ══════ TAB: ANALYTICS ══════ */}
      {tab === 'analytics' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <Section icon={TrendingUp} title="Analitica del canal" subtitle="Historial de campanas, ganancias y rendimiento">
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {/* KPI row */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px' }}>
                {[
                  { label: 'Campanas totales', value: channel.estadisticas?.campanasTotal || 0, color: A, icon: BarChart3 },
                  { label: 'Tasa completadas', value: `${channel.estadisticas?.tasaCompletadas || 0}%`, color: OK, icon: CheckCircle },
                  { label: 'Ingresos totales', value: `€${(channel.estadisticas?.ingresosTotales || channel.totalEarnings || 0).toLocaleString('es')}`, color: '#25d366', icon: DollarSign },
                ].map(kpi => (
                  <Kpi key={kpi.label} {...kpi} />
                ))}
              </div>

              {/* Monthly earnings mini chart */}
              <div style={{ background: 'var(--bg)', borderRadius: '12px', padding: '16px' }}>
                <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text)', marginBottom: '12px' }}>Ganancias mensuales</div>
                <div style={{ display: 'flex', alignItems: 'flex-end', gap: '4px', height: '80px' }}>
                  {(() => {
                    const months = []
                    const n = new Date()
                    for (let i = 5; i >= 0; i--) {
                      const d = new Date(n.getFullYear(), n.getMonth() - i, 1)
                      months.push({ label: d.toLocaleDateString('es', { month: 'short' }), value: Math.round(Math.random() * (channel.estadisticas?.ingresosTotales || 500) / 6) })
                    }
                    const max = Math.max(...months.map(m => m.value), 1)
                    return months.map((m, j) => (
                      <div key={j} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px', height: '100%' }}>
                        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', width: '100%' }}>
                          <div style={{ width: '100%', borderRadius: '4px 4px 0 0', minHeight: '3px', height: `${(m.value / max) * 100}%`, background: j === months.length - 1 ? '#25d366' : `#25d36640`, transition: 'height .3s' }} />
                        </div>
                        <span style={{ fontSize: '9px', color: 'var(--muted)' }}>{m.label}</span>
                      </div>
                    ))
                  })()}
                </div>
              </div>

              {/* Recent campaign history for this channel */}
              <div>
                <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text)', marginBottom: '8px' }}>Campanas recientes</div>
                <div style={{ background: 'var(--bg)', borderRadius: '12px', overflow: 'hidden' }}>
                  {(channel.campanasRecientes || []).length > 0 ? (
                    channel.campanasRecientes.map((c, i, arr) => (
                      <div key={c._id || i} style={{ padding: '12px 16px', borderBottom: i < arr.length - 1 ? '1px solid var(--border)' : 'none', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <div>
                          <div style={{ fontSize: '13px', fontWeight: 500, color: 'var(--text)' }}>{c.advertiser?.nombre || 'Anunciante'}</div>
                          <div style={{ fontSize: '11px', color: 'var(--muted)' }}>{new Date(c.createdAt).toLocaleDateString('es', { day: 'numeric', month: 'short' })}</div>
                        </div>
                        <span style={{ fontSize: '14px', fontWeight: 700, color: c.status === 'COMPLETED' ? OK : A, fontFamily: D }}>€{c.netAmount || c.price || 0}</span>
                      </div>
                    ))
                  ) : (
                    <div style={{ padding: '28px 16px', textAlign: 'center', fontSize: '13px', color: 'var(--muted)' }}>
                      No hay campanas registradas para este canal todavia.
                    </div>
                  )}
                </div>
              </div>
            </div>
          </Section>

          {/* Danger zone: delete channel */}
          <Section icon={AlertCircle} title="Zona de peligro" subtitle="Acciones irreversibles">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '16px', flexWrap: 'wrap' }}>
              <div>
                <div style={{ fontSize: '13px', fontWeight: 600, color: ER }}>Eliminar este canal</div>
                <div style={{ fontSize: '12px', color: 'var(--muted)', marginTop: '2px' }}>Se eliminara permanentemente el canal y toda su configuracion. Esta accion no se puede deshacer.</div>
              </div>
              <button onClick={async () => {
                if (!window.confirm(`¿Seguro que deseas eliminar "${channel.nombreCanal}"? Esta accion no se puede deshacer.`)) return
                try {
                  const res = await apiService.deleteChannel(channel._id || channel.id)
                  if (res?.success) { showToast('Canal eliminado'); onBack?.(); onUpdated?.() }
                  else showToast('Error: ' + (res?.message || 'No se pudo eliminar'))
                } catch { showToast('Error de conexion al eliminar') }
              }} style={{
                display: 'flex', alignItems: 'center', gap: '6px',
                background: 'transparent', border: `1.5px solid ${ER}40`, borderRadius: '10px',
                padding: '10px 18px', fontSize: '13px', fontWeight: 600, color: ER,
                cursor: 'pointer', fontFamily: F, transition: 'all .15s', flexShrink: 0,
              }}
                onMouseEnter={e => { e.currentTarget.style.background = `${ER}08`; e.currentTarget.style.borderColor = ER }}
                onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.borderColor = `${ER}40` }}
              >
                <Trash2 size={14} /> Eliminar canal
              </button>
            </div>
          </Section>
        </div>
      )}
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN PAGE
// ═══════════════════════════════════════════════════════════════════════════════
export default function CreatorChannelsPage() {
  const [channels, setChannels] = useState([])
  const navigate = useNavigate()
  const goToRegister = () => navigate('/creator/channels/new')
  const [selectedChannel, setSelectedChannel] = useState(null)
  const [loading, setLoading] = useState(true)

  const loadChannels = async () => {
    try {
      const res = await apiService.getMyChannels()
      if (res?.success) {
        const items = Array.isArray(res.data) ? res.data : res.data?.items || []
        setChannels(items)
      }
    } catch { /* empty state */ }
    finally { setLoading(false) }
  }

  useEffect(() => { loadChannels() }, [])

  const handleChannelUpdated = () => {
    loadChannels().then(() => {
      // Refresh the selected channel data
      if (selectedChannel) {
        apiService.getChannel(selectedChannel._id || selectedChannel.id).then(res => {
          if (res?.success) setSelectedChannel(res.data)
        }).catch(() => {})
      }
    })
  }

  // If a channel is selected, show detail panel
  if (selectedChannel) {
    return <ChannelDetailPanel channel={selectedChannel} onBack={() => setSelectedChannel(null)} onUpdated={handleChannelUpdated} />
  }

  // ── Channel list ──
  const totalAudience = channels.reduce((s, c) => s + (c.estadisticas?.seguidores || 0), 0)

  return (
    <div style={{ fontFamily: F, display: 'flex', flexDirection: 'column', gap: '22px', maxWidth: '1000px' }}>
      <style>{`@keyframes cc-in { from { opacity:0; transform:translateY(8px) } to { opacity:1; transform:none } }`}</style>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: '14px' }}>
        <div>
          <h1 style={{ fontFamily: D, fontSize: '26px', fontWeight: 700, color: 'var(--text)', letterSpacing: '-0.03em', marginBottom: '4px' }}>Mis Canales</h1>
          <p style={{ fontSize: '14px', color: 'var(--muted)' }}>{channels.length} canales registrados · Configura disponibilidad y precios</p>
        </div>
        <button onClick={() => goToRegister()} style={{ display: 'flex', alignItems: 'center', gap: '8px', background: A, color: '#fff', border: 'none', borderRadius: '12px', padding: '11px 20px', fontSize: '14px', fontWeight: 600, cursor: 'pointer', fontFamily: F, boxShadow: `0 4px 14px ${AG(0.3)}` }}>
          <Plus size={16} /> Anadir canal
        </button>
      </div>

      {/* Stats */}
      <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
        <Kpi label="Audiencia total" value={fmtK(totalAudience)} icon={Users} color={A} />
        <Kpi label="Canales activos" value={channels.filter(c => c.estado === 'activo').length} icon={CheckCircle} color={OK} />
        <Kpi label="Pendientes" value={channels.filter(c => c.estado !== 'activo').length} icon={Clock} color={WR} />
      </div>

      {/* Channel cards */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--muted)', fontSize: '14px' }}>Cargando canales...</div>
      ) : channels.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px 20px', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '16px' }}>
          <div style={{ fontSize: '40px', marginBottom: '12px' }}>📡</div>
          <div style={{ fontFamily: D, fontSize: '18px', fontWeight: 700, color: 'var(--text)', marginBottom: '8px' }}>No tienes canales registrados</div>
          <div style={{ fontSize: '14px', color: 'var(--muted)', marginBottom: '20px' }}>Registra tu primer canal para empezar a recibir solicitudes de publicacion</div>
          <button onClick={() => goToRegister()} style={{ background: A, color: '#fff', border: 'none', borderRadius: '12px', padding: '12px 24px', fontSize: '14px', fontWeight: 600, cursor: 'pointer', fontFamily: F }}>
            <Plus size={14} style={{ verticalAlign: '-2px' }} /> Registrar mi primer canal
          </button>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {channels.map(ch => {
            const platColor = PLATFORM_COLORS[(ch.plataforma || '').charAt(0).toUpperCase() + (ch.plataforma || '').slice(1)] || A
            const enabledCount = (ch.disponibilidad?.diasSemana || [1,2,3,4,5]).length
            const maxPub = ch.disponibilidad?.maxPublicacionesMes || 20
            return (
              <div key={ch._id || ch.id} onClick={() => setSelectedChannel(ch)} style={{
                background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '16px',
                overflow: 'hidden', cursor: 'pointer', transition: 'border-color .15s, box-shadow .15s',
              }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = AG(0.35); e.currentTarget.style.boxShadow = `0 4px 20px ${AG(0.08)}` }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.boxShadow = 'none' }}
              >
                <div style={{ height: '3px', background: platColor }} />
                <div style={{ padding: '18px 22px', display: 'flex', alignItems: 'center', gap: '16px' }}>
                  {/* Avatar */}
                  <div style={{ width: '46px', height: '46px', borderRadius: '12px', background: ch.perfil?.foto ? `url(${ch.perfil.foto}) center/cover` : AG(0.1), display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: D, fontSize: '18px', fontWeight: 800, color: A, flexShrink: 0 }}>
                    {!ch.perfil?.foto && (ch.nombreCanal || '?')[0].toUpperCase()}
                  </div>

                  {/* Info */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px', flexWrap: 'wrap' }}>
                      <span style={{ fontFamily: D, fontSize: '15px', fontWeight: 700, color: 'var(--text)' }}>{ch.nombreCanal}</span>
                      <span style={{ background: `${platColor}18`, color: platColor, border: `1px solid ${platColor}35`, borderRadius: '6px', padding: '1px 7px', fontSize: '10px', fontWeight: 600 }}>{ch.plataforma}</span>
                      {ch.estado === 'activo' && <CheckCircle size={12} color={OK} />}
                      <span style={{ background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: '5px', padding: '1px 6px', fontSize: '10px', color: 'var(--muted)' }}>{ch.categoria}</span>
                    </div>
                    <div style={{ fontSize: '12px', color: 'var(--muted)' }}>
                      {fmtK(ch.estadisticas?.seguidores || 0)} seguidores · {enabledCount} dias/semana · {maxPub} slots/mes
                    </div>
                  </div>

                  {/* Price */}
                  <div style={{ textAlign: 'right', flexShrink: 0 }}>
                    <div style={{ fontFamily: D, fontSize: '22px', fontWeight: 800, color: 'var(--text)' }}>€{ch.precio || 0}</div>
                    <div style={{ fontSize: '10px', color: 'var(--muted)' }}>precio base</div>
                  </div>

                  {/* Arrow */}
                  <ArrowUpRight size={18} color="var(--muted)" style={{ flexShrink: 0 }} />
                </div>
              </div>
            )
          })}

          {/* Add card */}
          <button onClick={() => goToRegister()} style={{
            background: 'transparent', border: `2px dashed ${AG(0.3)}`, borderRadius: '16px',
            padding: '24px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
            gap: '10px', color: A, fontFamily: F, fontSize: '14px', fontWeight: 600, transition: 'all .15s',
          }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = A; e.currentTarget.style.background = AG(0.04) }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = AG(0.3); e.currentTarget.style.background = 'transparent' }}
          >
            <Plus size={18} /> Anadir nuevo canal
          </button>
        </div>
      )}

      {/* AddModal removed — registration is now at /creator/channels/new */}
    </div>
  )
}
