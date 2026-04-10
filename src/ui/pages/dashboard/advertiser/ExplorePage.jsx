import React, { useState, useMemo, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Search, X, CheckCircle, Users, TrendingUp, Star, Grid, List,
  Filter, SlidersHorizontal, ChevronDown, ExternalLink, Zap,
  ImagePlus, Trash2, FileImage,
} from 'lucide-react'
import { PLATFORM_COLORS } from './mockData'
import apiService from '../../../../../services/api'
import {
  PURPLE, purpleAlpha, FONT_BODY, FONT_DISPLAY, OK,
} from '../../../theme/tokens'
import { C } from '../../../theme/tokens'
import ChannelCard from '../../../components/ChannelCard'

// Map the advertiser-side explore shape (legacy: name/platform/category/
// audience/pricePerPost/verified) to the canonical canal shape expected
// by ChannelCard + scoring. Scoring v2 fields stay undefined unless the
// API already returns them; ChannelCard degrades silently.
const mapExploreChannel = (ch) => ({
  id: ch.id,
  nombre: ch.name,
  plataforma: ch.platform,
  nicho: ch.category,
  seguidores: ch.audience || 0,
  CAS: ch.CAS,
  CAF: ch.CAF,
  CTF: ch.CTF,
  CER: ch.CER,
  CVS: ch.CVS,
  CAP: ch.CAP,
  nivel: ch.nivel,
  CPMDinamico: ch.CPMDinamico || ch.pricePerPost,
  verificacion: ch.verificacion || {
    confianzaScore: ch.verified ? 60 : 30,
    tipoAcceso: ch.verified ? 'tracking_url' : 'declarado',
  },
  antifraude: ch.antifraude || { ratioCTF_CAF: null, flags: [] },
  benchmark: ch.benchmark,
})


const fmtAudience = (n) => {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1000)      return `${(n / 1000).toFixed(n >= 10000 ? 0 : 1)}K`
  return String(n)
}

// ─── Platform badge ────────────────────────────────────────────────────────────
const PlatformBadge = ({ platform }) => {
  const color = PLATFORM_COLORS[platform] || PURPLE
  return (
    <span style={{
      background: `${color}18`, color, border: `1px solid ${color}35`,
      borderRadius: '6px', padding: '2px 8px', fontSize: '11px', fontWeight: 600,
      whiteSpace: 'nowrap',
    }}>
      {platform}
    </span>
  )
}

// ─── Star rating ───────────────────────────────────────────────────────────────
const StarRating = ({ rating = 4.7 }) => (
  <div style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
    {[1, 2, 3, 4, 5].map(i => (
      <Star key={i} size={10}
        fill={i <= Math.round(rating) ? '#f59e0b' : 'none'}
        color={i <= Math.round(rating) ? '#f59e0b' : 'var(--muted2)'}
        strokeWidth={1.5}
      />
    ))}
    <span style={{ fontSize: '11px', color: 'var(--muted)', marginLeft: '2px' }}>{rating}</span>
  </div>
)

// ─── Grid channel card ─────────────────────────────────────────────────────────
const ChannelCardGrid = ({ ch, onDetail, onHire }) => {
  const [hovered, setHovered] = useState(false)
  const platColor = PLATFORM_COLORS[ch.platform] || PURPLE

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        background: 'var(--surface)',
        border: `1px solid ${hovered ? purpleAlpha(0.4) : 'var(--border)'}`,
        borderRadius: '16px',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        transition: 'border-color .18s, transform .18s, box-shadow .18s',
        transform: hovered ? 'translateY(-3px)' : 'none',
        boxShadow: hovered ? `0 12px 40px ${purpleAlpha(0.12)}` : '0 1px 4px rgba(0,0,0,0.05)',
      }}
    >
      {/* Color bar */}
      <div style={{ height: '3px', background: platColor }} />

      {/* Card body */}
      <div style={{ padding: '18px', flex: 1, display: 'flex', flexDirection: 'column', gap: '12px' }}>

        {/* Header row */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '8px' }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontFamily: FONT_DISPLAY, fontSize: '15px', fontWeight: 700, color: 'var(--text)', lineHeight: 1.3, marginBottom: '5px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {ch.name}
            </div>
            <div style={{ display: 'flex', gap: '5px', flexWrap: 'wrap', alignItems: 'center' }}>
              <PlatformBadge platform={ch.platform} />
              <span style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: '5px', padding: '2px 7px', fontSize: '11px', color: 'var(--muted)' }}>
                {ch.category}
              </span>
            </div>
          </div>
          {ch.verified && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '3px', background: `${OK}12`, border: `1px solid ${OK}25`, borderRadius: '6px', padding: '3px 8px', flexShrink: 0 }}>
              <CheckCircle size={10} color={OK} strokeWidth={2.5} />
              <span style={{ fontSize: '10px', fontWeight: 700, color: OK }}>Verificado</span>
            </div>
          )}
        </div>

        {/* Star rating */}
        <StarRating rating={ch.rating || 4.6} />

        {/* Metrics */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px' }}>
          {[
            { label: 'Audiencia', val: fmtAudience(ch.audience) },
            { label: 'Engagement', val: `${ch.engagement}%` },
            { label: 'Score', val: ch.score ? `${ch.score}/100` : '-' },
          ].map(({ label, val }) => (
            <div key={label} style={{ background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: '9px', padding: '9px 8px', textAlign: 'center' }}>
              <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text)', fontFamily: FONT_DISPLAY }}>{val}</div>
              <div style={{ fontSize: '10px', color: 'var(--muted)', marginTop: '1px' }}>{label}</div>
            </div>
          ))}
        </div>

        {/* Description snippet */}
        {ch.description && (
          <p style={{ fontSize: '12px', color: 'var(--muted)', lineHeight: 1.5, overflow: 'hidden', textOverflow: 'ellipsis', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', margin: 0 }}>
            {ch.description}
          </p>
        )}
      </div>

      {/* Footer */}
      <div style={{ padding: '14px 18px', borderTop: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px' }}>
        <div>
          <div style={{ fontFamily: FONT_DISPLAY, fontSize: '20px', fontWeight: 800, color: 'var(--text)', letterSpacing: '-0.02em' }}>
            €{ch.pricePerPost}
          </div>
          <div style={{ fontSize: '11px', color: 'var(--muted)' }}>por publicación</div>
        </div>
        <div style={{ display: 'flex', gap: '7px' }}>
          <button
            onClick={() => onDetail(ch)}
            style={{
              background: 'var(--bg)', border: '1px solid var(--border-med)',
              borderRadius: '9px', padding: '8px 13px', fontSize: '12px', fontWeight: 600,
              color: 'var(--text)', cursor: 'pointer', fontFamily: FONT_BODY, transition: 'border-color .15s',
            }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = purpleAlpha(0.5) }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border-med)' }}
          >
            Ver
          </button>
          <button
            onClick={() => onHire(ch)}
            style={{
              background: PURPLE, border: 'none', borderRadius: '9px',
              padding: '8px 14px', fontSize: '12px', fontWeight: 600,
              color: '#fff', cursor: 'pointer', fontFamily: FONT_BODY,
              boxShadow: `0 3px 10px ${purpleAlpha(0.3)}`,
              transition: 'background .15s, box-shadow .15s',
            }}
            onMouseEnter={e => { e.currentTarget.style.background = '#7c3aed'; e.currentTarget.style.boxShadow = `0 4px 14px ${purpleAlpha(0.4)}` }}
            onMouseLeave={e => { e.currentTarget.style.background = PURPLE; e.currentTarget.style.boxShadow = `0 3px 10px ${purpleAlpha(0.3)}` }}
          >
            Contratar
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── List channel row ──────────────────────────────────────────────────────────
const ChannelRowList = ({ ch, onDetail, onHire, isLast }) => {
  const [hovered, setHovered] = useState(false)
  const platColor = PLATFORM_COLORS[ch.platform] || PURPLE

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: 'flex', alignItems: 'center', gap: '16px',
        padding: '16px 20px',
        borderBottom: isLast ? 'none' : '1px solid var(--border)',
        background: hovered ? 'var(--bg2)' : 'transparent',
        transition: 'background .12s',
      }}
    >
      {/* Platform indicator */}
      <div style={{ width: '4px', alignSelf: 'stretch', borderRadius: '2px', background: platColor, flexShrink: 0 }} />

      {/* Info */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px', flexWrap: 'wrap' }}>
          <span style={{ fontFamily: FONT_DISPLAY, fontSize: '14px', fontWeight: 700, color: 'var(--text)' }}>{ch.name}</span>
          <PlatformBadge platform={ch.platform} />
          {ch.verified && <CheckCircle size={13} color={OK} strokeWidth={2.5} />}
          <span style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: '5px', padding: '1px 7px', fontSize: '11px', color: 'var(--muted)' }}>{ch.category}</span>
        </div>
        <StarRating rating={ch.rating || 4.6} />
      </div>

      {/* Stats */}
      {[
        { label: 'Audiencia', val: fmtAudience(ch.audience) },
        { label: 'Engagement', val: `${ch.engagement}%` },
      ].map(({ label, val }) => (
        <div key={label} style={{ textAlign: 'center', minWidth: '72px' }}>
          <div style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text)', fontFamily: FONT_DISPLAY }}>{val}</div>
          <div style={{ fontSize: '10px', color: 'var(--muted)' }}>{label}</div>
        </div>
      ))}

      {/* Price */}
      <div style={{ textAlign: 'right', minWidth: '80px' }}>
        <div style={{ fontFamily: FONT_DISPLAY, fontSize: '18px', fontWeight: 800, color: 'var(--text)' }}>€{ch.pricePerPost}</div>
        <div style={{ fontSize: '10px', color: 'var(--muted)' }}>/ post</div>
      </div>

      {/* Actions */}
      <div style={{ display: 'flex', gap: '7px', flexShrink: 0 }}>
        <button onClick={() => onDetail(ch)} style={{ background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: '9px', padding: '7px 12px', fontSize: '12px', fontWeight: 600, color: 'var(--text)', cursor: 'pointer', fontFamily: FONT_BODY }}>Ver</button>
        <button onClick={() => onHire(ch)} style={{ background: PURPLE, border: 'none', borderRadius: '9px', padding: '7px 14px', fontSize: '12px', fontWeight: 600, color: '#fff', cursor: 'pointer', fontFamily: FONT_BODY }}>Contratar</button>
      </div>
    </div>
  )
}

// ─── Channel detail modal ─────────────────────────────────────────────────────
const ChannelModal = ({ ch, onClose, onHire }) => {
  const platColor = PLATFORM_COLORS[ch.platform] || PURPLE

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.65)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px', backdropFilter: 'blur(4px)' }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div style={{ background: 'var(--surface)', borderRadius: '22px', width: '100%', maxWidth: '580px', maxHeight: '85vh', overflow: 'auto', boxShadow: '0 32px 80px rgba(0,0,0,0.45)', animation: 'modal-in .2s ease' }}>
        <style>{`@keyframes modal-in { from { opacity:0; transform:translateY(12px) scale(0.97); } to { opacity:1; transform:none; } }`}</style>

        {/* Color bar */}
        <div style={{ height: '4px', background: platColor }} />

        {/* Header */}
        <div style={{ padding: '24px 28px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '14px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap', marginBottom: '8px' }}>
              <h2 style={{ fontFamily: FONT_DISPLAY, fontSize: '22px', fontWeight: 800, color: 'var(--text)' }}>{ch.name}</h2>
              {ch.verified && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: OK }}>
                  <CheckCircle size={16} strokeWidth={2.5} />
                  <span style={{ fontSize: '13px', fontWeight: 600 }}>Verificado</span>
                </div>
              )}
            </div>
            <div style={{ display: 'flex', gap: '7px', flexWrap: 'wrap', alignItems: 'center' }}>
              <PlatformBadge platform={ch.platform} />
              <span style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: '6px', padding: '2px 8px', fontSize: '12px', color: 'var(--muted)' }}>{ch.category}</span>
              <StarRating rating={ch.rating || 4.6} />
            </div>
          </div>
          <button onClick={onClose} style={{ background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: '9px', padding: '9px', cursor: 'pointer', color: 'var(--muted)', flexShrink: 0, display: 'flex' }}>
            <X size={16} />
          </button>
        </div>

        <div style={{ padding: '24px 28px', display: 'flex', flexDirection: 'column', gap: '22px' }}>

          {/* Description */}
          <p style={{ fontSize: '14px', color: 'var(--muted)', lineHeight: 1.7, margin: 0 }}>{ch.description}</p>

          {/* Metrics grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px' }}>
            {[
              { label: 'Audiencia', val: ch.audience.toLocaleString('es'), icon: Users },
              { label: 'Engagement', val: `${ch.engagement}%`, icon: TrendingUp },
              { label: 'Frecuencia', val: ch.freq },
              { label: 'Precio / post', val: `€${ch.pricePerPost}` },
              { label: 'Demografía', val: ch.demo || 'General' },
              { label: 'Categoría', val: ch.category },
            ].map(({ label, val, icon: Icon }) => (
              <div key={label} style={{ background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: '12px', padding: '14px', textAlign: 'center' }}>
                {Icon && <Icon size={14} color={PURPLE} style={{ marginBottom: '6px' }} />}
                <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text)', fontFamily: FONT_DISPLAY }}>{val}</div>
                <div style={{ fontSize: '11px', color: 'var(--muted)', marginTop: '2px' }}>{label}</div>
              </div>
            ))}
          </div>

          {/* Price highlight */}
          <div style={{ background: purpleAlpha(0.06), border: `1px solid ${purpleAlpha(0.2)}`, borderRadius: '14px', padding: '18px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <div style={{ fontSize: '13px', color: 'var(--muted)', marginBottom: '4px' }}>Precio por publicación</div>
              <div style={{ fontFamily: FONT_DISPLAY, fontSize: '32px', fontWeight: 800, color: PURPLE, letterSpacing: '-0.03em' }}>€{ch.pricePerPost}</div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: '12px', color: 'var(--muted)', marginBottom: '2px' }}>ROI estimado</div>
              <div style={{ fontFamily: FONT_DISPLAY, fontSize: '18px', fontWeight: 700, color: OK }}>~4.2x</div>
            </div>
          </div>

          {/* CTA */}
          <button
            onClick={() => { onHire(ch); onClose() }}
            style={{
              background: PURPLE, color: '#fff', border: 'none', borderRadius: '13px',
              padding: '15px', fontSize: '15px', fontWeight: 700,
              cursor: 'pointer', fontFamily: FONT_BODY, width: '100%',
              boxShadow: `0 6px 20px ${purpleAlpha(0.35)}`,
              transition: 'transform .15s, box-shadow .15s',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
            }}
            onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.boxShadow = `0 10px 30px ${purpleAlpha(0.45)}` }}
            onMouseLeave={e => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = `0 6px 20px ${purpleAlpha(0.35)}` }}
          >
            <Zap size={16} fill="#fff" /> Contratar este canal
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Filter chip ───────────────────────────────────────────────────────────────
const FilterChip = ({ label, active, onClick, count }) => (
  <button
    onClick={onClick}
    style={{
      display: 'flex', alignItems: 'center', gap: '5px',
      background: active ? PURPLE : 'var(--surface)',
      border: `1px solid ${active ? PURPLE : 'var(--border)'}`,
      borderRadius: '20px', padding: '5px 13px',
      fontSize: '12px', fontWeight: 600,
      color: active ? '#fff' : 'var(--muted)',
      cursor: 'pointer', fontFamily: FONT_BODY,
      transition: 'all .15s',
      boxShadow: active ? `0 2px 8px ${purpleAlpha(0.25)}` : 'none',
    }}
  >
    {label}
    {count !== undefined && (
      <span style={{
        background: active ? 'rgba(255,255,255,0.25)' : 'var(--bg2)',
        borderRadius: '10px', padding: '0 5px', fontSize: '10px',
        color: active ? '#fff' : 'var(--muted)',
      }}>{count}</span>
    )}
  </button>
)

// ─── Range slider ──────────────────────────────────────────────────────────────
const PriceFilter = ({ min, max, value, onChange }) => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
      <span style={{ fontSize: '12px', fontWeight: 500, color: 'var(--muted)' }}>Precio máximo</span>
      <span style={{ fontFamily: FONT_DISPLAY, fontSize: '14px', fontWeight: 700, color: PURPLE }}>€{value}</span>
    </div>
    <input
      type="range" min={min} max={max} value={value}
      onChange={e => onChange(Number(e.target.value))}
      style={{ width: '100%', accentColor: PURPLE }}
    />
    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
      <span style={{ fontSize: '11px', color: 'var(--muted2)' }}>€{min}</span>
      <span style={{ fontSize: '11px', color: 'var(--muted2)' }}>€{max}</span>
    </div>
  </div>
)

// ─── Hire modal — Multi-step wizard with availability calendar ──────────────
const HIRE_STEPS = [
  { key: 'info',     label: 'Informacion' },
  { key: 'calendar', label: 'Fecha' },
  { key: 'creative', label: 'Creatividad' },
  { key: 'message',  label: 'Mensaje' },
]

const hireInput = {
  width: '100%', boxSizing: 'border-box', background: 'var(--bg)',
  border: '1px solid var(--border)', borderRadius: '12px',
  padding: '12px 14px', fontSize: '14px', color: 'var(--text)',
  fontFamily: FONT_BODY, outline: 'none', transition: 'border-color .15s',
}

const CAL_DAY_NAMES = ['Dom', 'Lun', 'Mar', 'Mie', 'Jue', 'Vie', 'Sab']
const CAL_MONTHS = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre']
const BL = '#3b82f6'
const WR = '#f59e0b'

const HireModal = ({ ch, onClose, onSuccess }) => {
  const [step, setStep] = useState(0)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [result, setResult] = useState(null)

  // Step 1: Info
  const [titulo, setTitulo] = useState('')
  const [descripcion, setDescripcion] = useState('')

  // Step 2: Calendar
  const now = new Date()
  const [calMonth, setCalMonth] = useState(now.getMonth())
  const [calYear, setCalYear] = useState(now.getFullYear())
  const [calData, setCalData] = useState(null)
  const [calLoading, setCalLoading] = useState(false)
  const [selectedDates, setSelectedDates] = useState([])

  // Step 3: Creative
  const [content, setContent] = useState('')
  const [targetUrl, setTargetUrl] = useState('')
  const [cta, setCta] = useState('')
  const [tono, setTono] = useState('profesional')
  const [mediaFiles, setMediaFiles] = useState([]) // { file, preview, name, size, type }

  const handleMediaAdd = (e) => {
    const files = Array.from(e.target.files || [])
    const allowed = ['image/png', 'image/jpeg', 'image/jpg', 'image/gif', 'image/webp', 'video/mp4', 'video/quicktime']
    const maxSize = 10 * 1024 * 1024 // 10MB
    const maxFiles = 5

    const current = mediaFiles.length
    const toAdd = files.filter(f => allowed.includes(f.type) && f.size <= maxSize).slice(0, maxFiles - current)

    const newMedia = toAdd.map(file => ({
      file,
      preview: file.type.startsWith('image/') ? URL.createObjectURL(file) : null,
      name: file.name,
      size: file.size,
      type: file.type,
      isVideo: file.type.startsWith('video/'),
    }))

    setMediaFiles(prev => [...prev, ...newMedia].slice(0, maxFiles))
    e.target.value = '' // reset input
  }

  const removeMedia = (idx) => {
    setMediaFiles(prev => {
      const removed = prev[idx]
      if (removed?.preview) URL.revokeObjectURL(removed.preview)
      return prev.filter((_, i) => i !== idx)
    })
  }

  const fmtFileSize = (bytes) => {
    if (bytes < 1024) return `${bytes}B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)}KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)}MB`
  }

  // Step 4: Message
  const [mensaje, setMensaje] = useState('')

  const TONOS = ['profesional', 'casual', 'urgente', 'informativo', 'divertido']

  // Calculate total from selected dates
  const totalFromDates = React.useMemo(() => {
    if (!calData?.days || selectedDates.length === 0) return ch.pricePerPost || 0
    return selectedDates.reduce((sum, dateStr) => {
      const day = calData.days.find(d => d.date === dateStr)
      return sum + (day?.price || ch.pricePerPost || 0)
    }, 0)
  }, [selectedDates, calData, ch.pricePerPost])

  const commission = Math.round(totalFromDates * 0.15 * 100) / 100
  const total = totalFromDates

  // Load availability when step=1 or month changes
  React.useEffect(() => {
    if (step !== 1) return
    const channelId = ch.id || ch._id
    if (!channelId) return
    setCalLoading(true)
    apiService.getChannelAvailability(channelId, calYear, calMonth)
      .then(res => {
        if (res?.success) setCalData(res.data)
        else setCalData(null)
      })
      .catch(() => setCalData(null))
      .finally(() => setCalLoading(false))
  }, [step, calMonth, calYear, ch.id, ch._id])

  // Build calendar grid
  const calGrid = React.useMemo(() => {
    const first = new Date(calYear, calMonth, 1)
    const last = new Date(calYear, calMonth + 1, 0)
    const startPad = first.getDay()
    const grid = []
    for (let i = 0; i < startPad; i++) grid.push(null)
    for (let d = 1; d <= last.getDate(); d++) {
      const dateStr = `${calYear}-${String(calMonth + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`
      const apiDay = calData?.days?.find(dd => dd.date === dateStr)
      const dow = new Date(calYear, calMonth, d).getDay()
      if (apiDay) {
        grid.push({ ...apiDay, d })
      } else {
        // Fallback: basic availability
        const today = new Date(); today.setHours(0, 0, 0, 0)
        const thisDate = new Date(calYear, calMonth, d)
        const isPast = thisDate < today
        grid.push({ d, date: dateStr, dayOfWeek: dow, price: ch.pricePerPost || 0, status: isPast ? 'past' : 'available' })
      }
    }
    return grid
  }, [calYear, calMonth, calData, ch.pricePerPost])

  const toggleDate = (dateStr) => {
    setSelectedDates(prev =>
      prev.includes(dateStr) ? prev.filter(d => d !== dateStr) : [...prev, dateStr]
    )
  }

  const canNext = () => {
    if (step === 0) return titulo.trim().length > 2
    if (step === 1) return selectedDates.length > 0
    if (step === 2) return content.trim().length > 5 && targetUrl.startsWith('http')
    return true
  }

  const handleSubmit = async () => {
    setSubmitting(true)
    setError('')
    try {
      const fullContent = [
        content.trim(),
        cta.trim() ? `\n\nCTA: ${cta.trim()}` : '',
        `\n\n---\nTitulo: ${titulo.trim()}`,
        descripcion.trim() ? `\nBrief: ${descripcion.trim()}` : '',
        `\nTono: ${tono}`,
        `\nFechas: ${selectedDates.join(', ')}`,
      ].join('')

      // Build FormData if media files are attached
      const campaignPayload = {
        channel: ch.id || ch._id,
        content: fullContent,
        targetUrl: targetUrl.trim(),
        price: totalFromDates,
        mediaCount: mediaFiles.length,
      }

      let res
      if (mediaFiles.length > 0) {
        const fd = new FormData()
        Object.entries(campaignPayload).forEach(([k, v]) => fd.append(k, v))
        mediaFiles.forEach((m, i) => fd.append('media', m.file))
        res = await apiService.createCampaignWithMedia(fd)
      } else {
        res = await apiService.createCampaign(campaignPayload)
      }

      if (res?.success) {
        if (mensaje.trim() && res.data?._id) {
          await apiService.sendCampaignChat(res.data._id, mensaje.trim(), 'brief').catch(() => {})
        }
        setResult({ success: true, campaign: res.data })
      } else {
        setError(res?.message || 'Error al crear la campana')
      }
    } catch {
      setError('Error de conexion. Intentalo de nuevo.')
    } finally {
      setSubmitting(false)
    }
  }

  // ── Success screen with instant payment ──
  const [paying, setPaying] = React.useState(false)
  const [payResult, setPayResult] = React.useState(null)

  const handlePayNow = async () => {
    if (!result?.campaign?._id || paying) return
    setPaying(true)
    try {
      const res = await apiService.payCampaign(result.campaign._id)
      if (res?.success) {
        setPayResult('success')
      } else {
        setPayResult('error')
      }
    } catch {
      setPayResult('error')
    }
    setPaying(false)
  }

  if (result?.success) {
    return (
      <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 1100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px', backdropFilter: 'blur(6px)' }}
        onClick={e => { if (e.target === e.currentTarget) { onSuccess?.(); onClose() } }}>
        <div style={{ background: 'var(--surface)', borderRadius: '24px', width: '100%', maxWidth: '520px', padding: '44px 36px', textAlign: 'center', boxShadow: '0 32px 80px rgba(0,0,0,0.4)', animation: 'hm-scale .3s ease' }}>
          <style>{`@keyframes hm-scale { from { transform:scale(.95); opacity:0 } to { transform:none; opacity:1 } }`}</style>

          {payResult === 'success' ? (
            <>
              <div style={{
                width: '80px', height: '80px', borderRadius: '50%',
                background: 'rgba(16,185,129,0.1)', border: '2px solid rgba(16,185,129,0.35)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                margin: '0 auto 22px',
              }}>
                <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
              </div>
              <h2 style={{ fontFamily: FONT_DISPLAY, fontSize: '24px', fontWeight: 800, color: 'var(--text)', marginBottom: '8px', letterSpacing: '-0.03em' }}>Pago activado</h2>
              <p style={{ fontSize: '14px', color: 'var(--muted)', marginBottom: '16px', lineHeight: 1.5 }}>
                El escrow esta activo. El creador recibira la notificacion y podra aceptar tu campana.
              </p>

              {/* Pipeline visual */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0', margin: '20px 0', padding: '0 10px' }}>
                {[
                  { label: 'Borrador', done: true },
                  { label: 'Pagada', done: true },
                  { label: 'Aprobada', done: false },
                  { label: 'Publicada', done: false },
                  { label: 'Completada', done: false },
                ].map((s, i, arr) => (
                  <React.Fragment key={s.label}>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px' }}>
                      <div style={{
                        width: '28px', height: '28px', borderRadius: '50%',
                        background: s.done ? '#10b981' : 'var(--bg)',
                        border: s.done ? 'none' : '2px solid var(--border)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                      }}>
                        {s.done && <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>}
                      </div>
                      <span style={{ fontSize: '10px', color: s.done ? '#10b981' : 'var(--muted)', fontWeight: s.done ? 600 : 400 }}>{s.label}</span>
                    </div>
                    {i < arr.length - 1 && <div style={{ flex: 1, height: '2px', background: s.done && arr[i+1]?.done ? '#10b981' : 'var(--border)', minWidth: '20px', marginBottom: '20px' }} />}
                  </React.Fragment>
                ))}
              </div>

              <p style={{ fontSize: '12px', color: 'var(--muted)', margin: '14px 0 24px', lineHeight: 1.6 }}>
                Cuando el creador acepte, tu anuncio sera publicado. Podras chatear y dar seguimiento desde <strong>Mis Campanas</strong>.
              </p>
              <div style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
                <button onClick={() => { onSuccess?.(); onClose() }} style={{
                  background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: '12px',
                  padding: '12px 24px', fontSize: '13px', cursor: 'pointer', color: 'var(--text)', fontFamily: FONT_BODY, fontWeight: 500,
                }}>Seguir explorando</button>
                <button onClick={() => { onSuccess?.(); onClose(); window.location.href = '/advertiser/campaigns' }} style={{
                  background: PURPLE, color: '#fff', border: 'none', borderRadius: '12px',
                  padding: '12px 24px', fontSize: '13px', fontWeight: 600, cursor: 'pointer', fontFamily: FONT_BODY,
                  boxShadow: `0 4px 14px ${purpleAlpha(0.3)}`, transition: 'all .15s',
                }}>Ver mis campanas</button>
              </div>
            </>
          ) : (
            <>
              <div style={{
                width: '80px', height: '80px', borderRadius: '50%',
                background: 'rgba(16,185,129,0.1)', border: '2px solid rgba(16,185,129,0.35)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                margin: '0 auto 22px',
              }}>
                <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
              </div>
              <h2 style={{ fontFamily: FONT_DISPLAY, fontSize: '24px', fontWeight: 800, color: 'var(--text)', marginBottom: '8px', letterSpacing: '-0.03em' }}>Solicitud creada</h2>
              <p style={{ fontSize: '14px', color: 'var(--muted)', marginBottom: '6px', lineHeight: 1.5 }}>
                Tu solicitud para <strong style={{ color: 'var(--text)' }}>{ch.name}</strong> esta lista.
              </p>
              <div style={{ display: 'inline-flex', gap: '16px', background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: '12px', padding: '14px 22px', margin: '16px 0 8px' }}>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: '10px', color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Total</div>
                  <div style={{ fontFamily: FONT_DISPLAY, fontSize: '18px', fontWeight: 700, color: PURPLE }}>€{totalFromDates}</div>
                </div>
                <div style={{ width: '1px', background: 'var(--border)' }} />
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: '10px', color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Fechas</div>
                  <div style={{ fontFamily: FONT_DISPLAY, fontSize: '18px', fontWeight: 700, color: '#64748b' }}>{selectedDates.length}</div>
                </div>
                <div style={{ width: '1px', background: 'var(--border)' }} />
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: '10px', color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Estado</div>
                  <div style={{ fontFamily: FONT_DISPLAY, fontSize: '18px', fontWeight: 700, color: '#64748b' }}>Borrador</div>
                </div>
              </div>

              {/* Escrow explanation */}
              <div style={{
                background: 'rgba(59,130,246,0.06)', border: '1px solid rgba(59,130,246,0.15)',
                borderRadius: '12px', padding: '14px 18px', margin: '16px 0 8px', textAlign: 'left',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
                  <span style={{ fontSize: '12px', fontWeight: 700, color: '#3b82f6' }}>Pago seguro con escrow</span>
                </div>
                <p style={{ fontSize: '12px', color: 'var(--muted)', lineHeight: 1.5, margin: 0 }}>
                  Tu pago queda retenido de forma segura hasta que la campana se complete. Si el creador no publica, recibiras un reembolso automatico.
                </p>
              </div>

              {payResult === 'error' && (
                <div style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: '10px', padding: '10px 14px', margin: '8px 0', fontSize: '12px', color: '#ef4444' }}>
                  Error al procesar el pago. Puedes intentarlo de nuevo o pagar desde Mis Campanas.
                </div>
              )}

              <div style={{ display: 'flex', gap: '10px', justifyContent: 'center', marginTop: '20px' }}>
                <button onClick={() => { onSuccess?.(); onClose(); window.location.href = '/advertiser/campaigns' }} style={{
                  background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: '12px',
                  padding: '12px 20px', fontSize: '13px', cursor: 'pointer', color: 'var(--text)', fontFamily: FONT_BODY, fontWeight: 500,
                }}>Pagar despues</button>
                <button
                  onClick={handlePayNow}
                  disabled={paying}
                  style={{
                    background: '#3b82f6', color: '#fff', border: 'none', borderRadius: '12px',
                    padding: '12px 28px', fontSize: '14px', fontWeight: 700, cursor: paying ? 'not-allowed' : 'pointer', fontFamily: FONT_BODY,
                    boxShadow: '0 4px 16px rgba(59,130,246,0.35)', transition: 'all .15s',
                    display: 'flex', alignItems: 'center', gap: '8px',
                    opacity: paying ? 0.7 : 1,
                  }}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
                  {paying ? 'Procesando...' : `Pagar €${totalFromDates} ahora`}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    )
  }

  // ── Wizard ──
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 1100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px', backdropFilter: 'blur(6px)' }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div style={{
        background: 'var(--surface)', borderRadius: '24px', width: '100%', maxWidth: '680px',
        maxHeight: '92vh', display: 'flex', flexDirection: 'column',
        boxShadow: '0 32px 80px rgba(0,0,0,0.4)', overflow: 'hidden',
        animation: 'hm-scale .25s ease',
      }}>
        <style>{`@keyframes hm-scale { from { transform:scale(.96); opacity:0 } to { transform:none; opacity:1 } }
.hm-inp:focus { border-color: ${purpleAlpha(0.5)} !important; box-shadow: 0 0 0 3px ${purpleAlpha(0.08)}; }
.hm-btn:hover:not(:disabled) { transform:translateY(-1px); box-shadow:0 6px 20px ${purpleAlpha(0.3)}; }`}</style>

        {/* ── Header ── */}
        <div style={{ padding: '22px 28px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
          <div>
            <h2 style={{ fontFamily: FONT_DISPLAY, fontSize: '20px', fontWeight: 800, color: 'var(--text)', marginBottom: '2px', letterSpacing: '-0.02em' }}>Contratar canal</h2>
            <p style={{ fontSize: '12px', color: 'var(--muted)' }}>Paso {step + 1} de 4</p>
          </div>
          <button onClick={onClose} style={{ background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: '10px', padding: '8px', cursor: 'pointer', color: 'var(--muted)', display: 'flex' }}><X size={16} /></button>
        </div>

        {/* ── Step indicator ── */}
        <div style={{ padding: '14px 28px', borderBottom: '1px solid var(--border)', display: 'flex', gap: '4px', flexShrink: 0 }}>
          {HIRE_STEPS.map((s, i) => {
            const done = i < step
            const active = i === step
            return (
              <div key={s.key} style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '5px' }}>
                <div style={{
                  height: '3px', borderRadius: '2px',
                  background: done ? OK : active ? PURPLE : 'var(--border)',
                  transition: 'background .3s',
                }} />
                <span style={{
                  fontSize: '10px', fontWeight: active ? 700 : 500,
                  color: done ? OK : active ? PURPLE : 'var(--muted2)',
                  transition: 'color .2s', textAlign: 'center',
                }}>{s.label}</span>
              </div>
            )
          })}
        </div>

        {/* ── Body (scrollable) ── */}
        <div style={{ padding: '24px 28px', display: 'flex', flexDirection: 'column', gap: '16px', flex: 1, overflowY: 'auto', minHeight: 0 }}>

          {/* Channel badge (always visible) */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: '12px',
            background: 'var(--bg)', border: '1px solid var(--border)',
            borderRadius: '12px', padding: '12px 16px', flexShrink: 0,
          }}>
            <div style={{
              width: '38px', height: '38px', borderRadius: '10px',
              background: `${PURPLE}12`, border: `1px solid ${purpleAlpha(0.2)}`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontFamily: FONT_DISPLAY, fontSize: '16px', fontWeight: 700, color: PURPLE,
            }}>{(ch.name || '?')[0]}</div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text)', fontFamily: FONT_DISPLAY }}>{ch.name}</div>
              <div style={{ fontSize: '12px', color: 'var(--muted)' }}>{ch.platform} · {ch.category} · {fmtAudience(ch.audience)} audiencia</div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontFamily: FONT_DISPLAY, fontSize: '16px', fontWeight: 700, color: PURPLE }}>€{ch.pricePerPost}</div>
              <div style={{ fontSize: '10px', color: 'var(--muted)' }}>desde/dia</div>
            </div>
          </div>

          {/* ── STEP 1: Information ── */}
          {step === 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', animation: 'hm-scale .2s ease' }}>
              <div>
                <label style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text)', display: 'block', marginBottom: '6px' }}>
                  Titulo del anuncio <span style={{ color: '#ef4444' }}>*</span>
                </label>
                <input className="hm-inp" value={titulo} onChange={e => setTitulo(e.target.value)}
                  placeholder="Ej: Lanzamiento producto verano 2026"
                  style={hireInput} />
              </div>

              <div>
                <label style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text)', display: 'block', marginBottom: '6px' }}>
                  Descripcion / Brief
                </label>
                <textarea className="hm-inp" value={descripcion} onChange={e => setDescripcion(e.target.value)}
                  placeholder="Describe el objetivo de la campana, el producto/servicio, publico objetivo, restricciones..."
                  rows={3} style={{ ...hireInput, resize: 'vertical', lineHeight: 1.6 }} />
              </div>

              {/* Info card */}
              <div style={{ background: `${BL}06`, border: `1px solid ${BL}18`, borderRadius: '12px', padding: '14px 16px', display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={BL} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginTop: '1px', flexShrink: 0 }}><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>
                <div style={{ fontSize: '12px', color: 'var(--muted)', lineHeight: 1.5 }}>
                  En el siguiente paso podras seleccionar las <strong style={{ color: 'var(--text)' }}>fechas de publicacion</strong> disponibles del canal. Cada dia puede tener un precio diferente segun las metricas de audiencia del creador.
                </div>
              </div>
            </div>
          )}

          {/* ── STEP 2: Calendar ── */}
          {step === 1 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', animation: 'hm-scale .2s ease' }}>
              <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text)', marginBottom: '2px' }}>
                Selecciona fechas de publicacion <span style={{ color: '#ef4444' }}>*</span>
              </div>

              {/* Calendar */}
              <div style={{ background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: '14px', padding: '18px', overflow: 'hidden' }}>
                {/* Month navigation */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
                  <button onClick={() => { if (calMonth === 0) { setCalMonth(11); setCalYear(y => y - 1) } else setCalMonth(m => m - 1) }}
                    style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '8px', padding: '6px 8px', cursor: 'pointer', color: 'var(--muted)', display: 'flex' }}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="15 18 9 12 15 6"/></svg>
                  </button>
                  <span style={{ fontFamily: FONT_DISPLAY, fontSize: '15px', fontWeight: 700, color: 'var(--text)' }}>
                    {CAL_MONTHS[calMonth]} {calYear}
                  </span>
                  <button onClick={() => { if (calMonth === 11) { setCalMonth(0); setCalYear(y => y + 1) } else setCalMonth(m => m + 1) }}
                    style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '8px', padding: '6px 8px', cursor: 'pointer', color: 'var(--muted)', display: 'flex' }}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="9 18 15 12 9 6"/></svg>
                  </button>
                </div>

                {calLoading ? (
                  <div style={{ textAlign: 'center', padding: '40px', fontSize: '13px', color: 'var(--muted)' }}>Cargando disponibilidad...</div>
                ) : (
                  <>
                    {/* Day headers */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '4px', marginBottom: '4px' }}>
                      {CAL_DAY_NAMES.map(d => (
                        <div key={d} style={{ textAlign: 'center', fontSize: '10px', fontWeight: 600, color: 'var(--muted)', padding: '4px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{d}</div>
                      ))}
                    </div>

                    {/* Day cells */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '4px' }}>
                      {calGrid.map((day, i) => {
                        if (!day) return <div key={`pad-${i}`} />
                        const isAvailable = day.status === 'available'
                        const isSelected = selectedDates.includes(day.date)
                        const isDisabled = !isAvailable

                        let bg = 'var(--surface)'
                        let border = 'var(--border)'
                        let textColor = 'var(--text)'
                        let priceColor = 'var(--muted)'
                        let cursor = 'pointer'
                        let opacity = 1

                        if (isSelected) {
                          bg = purpleAlpha(0.12); border = A; textColor = A; priceColor = A
                        } else if (day.status === 'past') {
                          opacity = 0.35; cursor = 'default'
                        } else if (day.status === 'disabled') {
                          opacity = 0.35; cursor = 'default'
                        } else if (day.status === 'blocked') {
                          bg = '#ef444408'; border = '#ef444425'; textColor = '#ef4444'; cursor = 'default'
                        } else if (day.status === 'booked') {
                          bg = `${BL}08`; border = `${BL}25`; textColor = BL; cursor = 'default'
                        } else if (day.status === 'too_soon') {
                          bg = `${WR}08`; border = `${WR}20`; textColor = WR; cursor = 'default'
                        } else if (day.status === 'full') {
                          opacity = 0.35; cursor = 'default'
                        } else if (isAvailable) {
                          bg = `${OK}06`; border = `${OK}20`; priceColor = OK
                        }

                        return (
                          <button key={`d-${day.d}`}
                            disabled={isDisabled}
                            onClick={() => isAvailable && toggleDate(day.date)}
                            style={{
                              background: bg, border: `1.5px solid ${border}`,
                              borderRadius: '10px', padding: '6px 2px', cursor,
                              opacity, transition: 'all .12s',
                              display: 'flex', flexDirection: 'column', alignItems: 'center',
                              gap: '2px', minHeight: '50px', justifyContent: 'center',
                              fontFamily: FONT_BODY, position: 'relative',
                            }}
                          >
                            {isSelected && (
                              <div style={{ position: 'absolute', top: '3px', right: '3px', width: '14px', height: '14px', borderRadius: '50%', background: PURPLE, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3"><polyline points="20 6 9 17 4 12"/></svg>
                              </div>
                            )}
                            <span style={{ fontSize: '14px', fontWeight: 700, color: textColor }}>{day.d}</span>
                            {isAvailable && (
                              <span style={{ fontSize: '10px', fontWeight: 600, color: priceColor }}>€{day.price}</span>
                            )}
                            {day.status === 'blocked' && <span style={{ fontSize: '8px', color: '#ef4444' }}>Bloq.</span>}
                            {day.status === 'booked' && <span style={{ fontSize: '8px', color: BL }}>Reserv.</span>}
                            {day.status === 'too_soon' && <span style={{ fontSize: '8px', color: WR }}>Pronto</span>}
                          </button>
                        )
                      })}
                    </div>
                  </>
                )}

                {/* Legend */}
                <div style={{ display: 'flex', gap: '12px', marginTop: '12px', flexWrap: 'wrap' }}>
                  {[
                    { color: OK, label: 'Disponible' },
                    { color: PURPLE, label: 'Seleccionado' },
                    { color: '#ef4444', label: 'Bloqueado' },
                    { color: BL, label: 'Reservado' },
                    { color: WR, label: 'Min. antelacion' },
                  ].map(({ color, label }) => (
                    <div key={label} style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <div style={{ width: '8px', height: '8px', borderRadius: '2px', background: color }} />
                      <span style={{ fontSize: '10px', color: 'var(--muted)' }}>{label}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Selected dates summary */}
              {selectedDates.length > 0 && (
                <div style={{ background: purpleAlpha(0.04), border: `1px solid ${purpleAlpha(0.15)}`, borderRadius: '12px', padding: '14px 16px' }}>
                  <div style={{ fontSize: '10px', fontWeight: 600, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '10px' }}>
                    {selectedDates.length} fecha{selectedDates.length > 1 ? 's' : ''} seleccionada{selectedDates.length > 1 ? 's' : ''}
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '12px' }}>
                    {selectedDates.sort().map(dateStr => {
                      const day = calData?.days?.find(d => d.date === dateStr)
                      const price = day?.price || ch.pricePerPost || 0
                      const parts = dateStr.split('-')
                      const label = `${parts[2]}/${parts[1]}`
                      return (
                        <div key={dateStr} style={{ display: 'flex', alignItems: 'center', gap: '6px', background: purpleAlpha(0.08), border: `1px solid ${purpleAlpha(0.2)}`, borderRadius: '20px', padding: '4px 10px 4px 12px' }}>
                          <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text)' }}>{label}</span>
                          <span style={{ fontSize: '11px', fontWeight: 700, color: PURPLE }}>€{price}</span>
                          <button onClick={() => toggleDate(dateStr)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted)', padding: 0, display: 'flex' }}>
                            <X size={12} />
                          </button>
                        </div>
                      )
                    })}
                  </div>
                  <div style={{ height: '1px', background: purpleAlpha(0.15), margin: '8px 0' }} />
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                    <span style={{ fontSize: '12px', color: 'var(--muted)' }}>Subtotal ({selectedDates.length} dia{selectedDates.length > 1 ? 's' : ''})</span>
                    <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text)' }}>€{totalFromDates}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                    <span style={{ fontSize: '12px', color: 'var(--muted)' }}>Comision plataforma (15%)</span>
                    <span style={{ fontSize: '12px', color: 'var(--muted)' }}>€{commission.toFixed(2)}</span>
                  </div>
                  <div style={{ height: '1px', background: purpleAlpha(0.15), margin: '6px 0' }} />
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text)' }}>Total a pagar</span>
                    <span style={{ fontSize: '18px', fontWeight: 800, color: PURPLE, fontFamily: FONT_DISPLAY }}>€{total}</span>
                  </div>
                </div>
              )}

              {/* Slots info */}
              {calData?.slotsRemaining != null && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', color: 'var(--muted)' }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>
                  <span>{calData.slotsRemaining} slots disponibles este mes · Min. {calData.antelacionMinima} dias de antelacion</span>
                </div>
              )}
            </div>
          )}

          {/* ── STEP 3: Creative ── */}
          {step === 2 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', animation: 'hm-scale .2s ease' }}>
              <div>
                <label style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text)', display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                  <span>Texto del anuncio <span style={{ color: '#ef4444' }}>*</span></span>
                  <span style={{ fontSize: '11px', color: 'var(--muted)', fontWeight: 400 }}>{content.length}/500</span>
                </label>
                <textarea className="hm-inp" value={content} onChange={e => setContent(e.target.value.slice(0, 500))}
                  placeholder="Escribe el copy exacto que quieres que se publique en el canal..."
                  rows={5} style={{ ...hireInput, resize: 'none', lineHeight: 1.65 }} />
              </div>

              <div>
                <label style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text)', display: 'block', marginBottom: '6px' }}>
                  URL de destino <span style={{ color: '#ef4444' }}>*</span>
                </label>
                <input className="hm-inp" value={targetUrl} onChange={e => setTargetUrl(e.target.value)}
                  placeholder="https://tu-web.com/landing"
                  style={{ ...hireInput, borderColor: targetUrl && !targetUrl.startsWith('http') ? '#ef4444' : undefined }} />
                {targetUrl && !targetUrl.startsWith('http') && (
                  <div style={{ fontSize: '11px', color: '#ef4444', marginTop: '4px' }}>La URL debe empezar con https://</div>
                )}
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text)', display: 'block', marginBottom: '6px' }}>
                    Call to Action (CTA)
                  </label>
                  <input className="hm-inp" value={cta} onChange={e => setCta(e.target.value)}
                    placeholder="Ej: Reserva ahora"
                    style={hireInput} />
                </div>
                <div>
                  <label style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text)', display: 'block', marginBottom: '6px' }}>
                    Tono
                  </label>
                  <select className="hm-inp" value={tono} onChange={e => setTono(e.target.value)}
                    style={{ ...hireInput, cursor: 'pointer', appearance: 'none', backgroundImage: 'url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' width=\'12\' height=\'12\' viewBox=\'0 0 24 24\' fill=\'none\' stroke=\'%2394a3b8\' stroke-width=\'2\'%3E%3Cpolyline points=\'6 9 12 15 18 9\'/%3E%3C/svg%3E")', backgroundRepeat: 'no-repeat', backgroundPosition: 'right 14px center' }}>
                    {TONOS.map(t => <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>)}
                  </select>
                </div>
              </div>

              {/* ── Media Upload ── */}
              <div>
                <label style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text)', display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><FileImage size={14} /> Medios (opcional)</span>
                  <span style={{ fontSize: '11px', color: 'var(--muted)', fontWeight: 400 }}>{mediaFiles.length}/5 archivos</span>
                </label>

                {/* Drop zone / file picker */}
                <label style={{
                  display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '8px',
                  border: `2px dashed ${purpleAlpha(0.25)}`, borderRadius: '12px', padding: '20px 16px',
                  cursor: mediaFiles.length >= 5 ? 'not-allowed' : 'pointer', opacity: mediaFiles.length >= 5 ? 0.5 : 1,
                  background: purpleAlpha(0.03), transition: 'all .2s',
                }}>
                  <ImagePlus size={28} color={PURPLE} strokeWidth={1.5} />
                  <span style={{ fontSize: '13px', color: 'var(--text)', fontWeight: 500 }}>
                    {mediaFiles.length >= 5 ? 'Limite alcanzado' : 'Haz clic o arrastra imagenes aqui'}
                  </span>
                  <span style={{ fontSize: '11px', color: 'var(--muted)' }}>
                    PNG, JPG, GIF, WebP o MP4 · Max 10MB por archivo
                  </span>
                  <input type="file" accept="image/png,image/jpeg,image/gif,image/webp,video/mp4,video/quicktime" multiple
                    onChange={handleMediaAdd} disabled={mediaFiles.length >= 5}
                    style={{ display: 'none' }} />
                </label>

                {/* Thumbnails grid */}
                {mediaFiles.length > 0 && (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(90px, 1fr))', gap: '8px', marginTop: '10px' }}>
                    {mediaFiles.map((m, idx) => (
                      <div key={idx} style={{
                        position: 'relative', borderRadius: '10px', overflow: 'hidden',
                        border: '1px solid var(--border)', background: 'var(--bg)', aspectRatio: '1',
                      }}>
                        {m.preview ? (
                          <img src={m.preview} alt={m.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        ) : (
                          <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '4px' }}>
                            <FileImage size={22} color="var(--muted)" />
                            <span style={{ fontSize: '9px', color: 'var(--muted)' }}>Video</span>
                          </div>
                        )}
                        {/* Remove button */}
                        <button onClick={() => removeMedia(idx)} style={{
                          position: 'absolute', top: '4px', right: '4px',
                          width: '22px', height: '22px', borderRadius: '50%',
                          background: 'rgba(0,0,0,0.65)', border: 'none', cursor: 'pointer',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          transition: 'background .15s',
                        }}
                          onMouseEnter={e => e.currentTarget.style.background = 'rgba(239,68,68,0.85)'}
                          onMouseLeave={e => e.currentTarget.style.background = 'rgba(0,0,0,0.65)'}>
                          <Trash2 size={12} color="#fff" />
                        </button>
                        {/* File info */}
                        <div style={{
                          position: 'absolute', bottom: 0, left: 0, right: 0,
                          background: 'linear-gradient(transparent, rgba(0,0,0,0.7))',
                          padding: '12px 6px 4px', fontSize: '9px', color: '#fff', lineHeight: 1.3,
                        }}>
                          <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{m.name}</div>
                          <div style={{ opacity: 0.7 }}>{fmtFileSize(m.size)}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Preview */}
              {content.trim() && (
                <div style={{ background: 'var(--bg)', border: `1px solid var(--border)`, borderRadius: '12px', padding: '14px', borderLeft: `3px solid ${PURPLE}` }}>
                  <div style={{ fontSize: '10px', fontWeight: 600, color: PURPLE, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '8px' }}>Vista previa</div>
                  <div style={{ fontSize: '13px', color: 'var(--text)', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>{content}</div>
                  {/* Media preview in post */}
                  {mediaFiles.length > 0 && (
                    <div style={{ display: 'flex', gap: '6px', marginTop: '10px', overflowX: 'auto', paddingBottom: '4px' }}>
                      {mediaFiles.filter(m => m.preview).map((m, i) => (
                        <img key={i} src={m.preview} alt="" style={{ height: '64px', borderRadius: '8px', objectFit: 'cover', border: '1px solid var(--border)', flexShrink: 0 }} />
                      ))}
                      {mediaFiles.filter(m => m.isVideo).length > 0 && (
                        <div style={{ height: '64px', minWidth: '64px', borderRadius: '8px', background: purpleAlpha(0.06), border: `1px solid ${purpleAlpha(0.15)}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                          <FileImage size={18} color={PURPLE} />
                        </div>
                      )}
                    </div>
                  )}
                  {cta && <div style={{ marginTop: '8px', display: 'inline-block', background: purpleAlpha(0.08), border: `1px solid ${purpleAlpha(0.2)}`, borderRadius: '8px', padding: '6px 14px', fontSize: '12px', fontWeight: 600, color: PURPLE }}>{cta}</div>}
                  {targetUrl.startsWith('http') && <div style={{ marginTop: '6px', fontSize: '11px', color: 'var(--muted)' }}>{targetUrl}</div>}
                </div>
              )}
            </div>
          )}

          {/* ── STEP 4: Message to creator ── */}
          {step === 3 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', animation: 'hm-scale .2s ease' }}>
              {/* Summary */}
              <div style={{ background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: '12px', padding: '14px 16px' }}>
                <div style={{ fontSize: '10px', fontWeight: 600, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '10px' }}>Resumen de la campana</div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                  {[
                    { l: 'Titulo', v: titulo || '-' },
                    { l: 'Total', v: `€${totalFromDates}` },
                    { l: 'Fechas', v: `${selectedDates.length} dia${selectedDates.length > 1 ? 's' : ''}` },
                    { l: 'Tono', v: tono },
                    ...(mediaFiles.length > 0 ? [{ l: 'Medios', v: `${mediaFiles.length} archivo${mediaFiles.length > 1 ? 's' : ''}` }] : []),
                  ].map(({ l, v }) => (
                    <div key={l}>
                      <span style={{ fontSize: '11px', color: 'var(--muted)' }}>{l}: </span>
                      <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text)' }}>{v}</span>
                    </div>
                  ))}
                </div>
                {/* Selected dates pills */}
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginTop: '8px' }}>
                  {selectedDates.sort().map(d => {
                    const parts = d.split('-')
                    return <span key={d} style={{ background: purpleAlpha(0.08), border: `1px solid ${purpleAlpha(0.15)}`, borderRadius: '6px', padding: '2px 7px', fontSize: '10px', fontWeight: 600, color: PURPLE }}>{parts[2]}/{parts[1]}</span>
                  })}
                </div>
              </div>

              {/* Content preview */}
              <div style={{ background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: '12px', padding: '14px', borderLeft: `3px solid ${PURPLE}` }}>
                <div style={{ fontSize: '10px', fontWeight: 600, color: PURPLE, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '6px' }}>Copy del anuncio</div>
                <div style={{ fontSize: '13px', color: 'var(--text)', lineHeight: 1.5, whiteSpace: 'pre-wrap', maxHeight: '80px', overflow: 'auto' }}>{content}</div>
                {/* Media thumbnails in summary */}
                {mediaFiles.length > 0 && (
                  <div style={{ display: 'flex', gap: '6px', marginTop: '10px', flexWrap: 'wrap' }}>
                    {mediaFiles.map((m, i) => (
                      <div key={i} style={{
                        width: '48px', height: '48px', borderRadius: '8px', overflow: 'hidden',
                        border: '1px solid var(--border)', background: 'var(--surface)', flexShrink: 0,
                      }}>
                        {m.preview ? (
                          <img src={m.preview} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        ) : (
                          <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <FileImage size={16} color="var(--muted)" />
                          </div>
                        )}
                      </div>
                    ))}
                    <span style={{ alignSelf: 'center', fontSize: '11px', color: 'var(--muted)', marginLeft: '4px' }}>
                      {mediaFiles.length} archivo{mediaFiles.length > 1 ? 's' : ''} adjunto{mediaFiles.length > 1 ? 's' : ''}
                    </span>
                  </div>
                )}
              </div>

              {/* Initial message */}
              <div>
                <label style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text)', display: 'block', marginBottom: '6px' }}>
                  Mensaje para el creador
                  <span style={{ fontSize: '11px', color: 'var(--muted)', fontWeight: 400, marginLeft: '6px' }}>Opcional — abre el chat</span>
                </label>
                <textarea className="hm-inp" value={mensaje} onChange={e => setMensaje(e.target.value)}
                  placeholder="Hola! Me gustaria publicar un anuncio en tu canal. Aqui te dejo el brief con las indicaciones..."
                  rows={4} style={{ ...hireInput, resize: 'vertical', lineHeight: 1.6 }} />
                <div style={{ fontSize: '11px', color: 'var(--muted)', marginTop: '6px', lineHeight: 1.5 }}>
                  Este mensaje se enviara al chat de la campana. El creador lo vera cuando pagues y actives el escrow.
                </div>
              </div>

              {/* Payment info */}
              <div style={{
                background: `${OK}08`, border: `1px solid ${OK}20`, borderRadius: '12px',
                padding: '14px 16px', display: 'flex', alignItems: 'center', gap: '12px',
              }}>
                <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: `${OK}15`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="1" y="4" width="22" height="16" rx="2" ry="2"/><line x1="1" y1="10" x2="23" y2="10"/></svg>
                </div>
                <div>
                  <div style={{ fontSize: '12px', fontWeight: 600, color: OK }}>Pago seguro con escrow</div>
                  <div style={{ fontSize: '11px', color: 'var(--muted)', lineHeight: 1.4 }}>
                    Tu dinero se retiene en escrow hasta que el creador publique. Si no publica, te devolvemos el importe completo.
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Error */}
          {error && (
            <div style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', color: '#ef4444', borderRadius: '10px', padding: '10px 14px', fontSize: '13px' }}>{error}</div>
          )}
        </div>

        {/* ── Footer ── */}
        <div style={{ padding: '16px 28px', borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0 }}>
          <button onClick={() => step === 0 ? onClose() : setStep(s => s - 1)} style={{
            background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: '10px',
            padding: '11px 20px', fontSize: '13px', cursor: 'pointer', color: 'var(--text)',
            fontFamily: FONT_BODY, fontWeight: 500, transition: 'border-color .15s',
          }}>
            {step === 0 ? 'Cancelar' : 'Atras'}
          </button>

          <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
            {step < 3 && (
              <span style={{ fontSize: '11px', color: 'var(--muted)' }}>
                {step === 0 && !titulo.trim() && 'Introduce un titulo para continuar'}
                {step === 1 && selectedDates.length === 0 && 'Selecciona al menos una fecha'}
                {step === 2 && !content.trim() && 'Escribe el copy del anuncio'}
              </span>
            )}
            {step < 3 ? (
              <button onClick={() => setStep(s => s + 1)} disabled={!canNext()} className="hm-btn" style={{
                background: canNext() ? PURPLE : 'var(--muted2)', color: '#fff', border: 'none',
                borderRadius: '10px', padding: '11px 24px', fontSize: '13px', fontWeight: 600,
                cursor: canNext() ? 'pointer' : 'not-allowed', fontFamily: FONT_BODY,
                boxShadow: canNext() ? `0 4px 14px ${purpleAlpha(0.3)}` : 'none',
                display: 'flex', alignItems: 'center', gap: '6px', transition: 'all .15s',
              }}>
                Siguiente <span style={{ fontSize: '16px' }}>→</span>
              </button>
            ) : (
              <button onClick={handleSubmit} disabled={submitting} className="hm-btn" style={{
                background: PURPLE, color: '#fff', border: 'none',
                borderRadius: '10px', padding: '11px 28px', fontSize: '14px', fontWeight: 700,
                cursor: submitting ? 'not-allowed' : 'pointer', fontFamily: FONT_BODY,
                boxShadow: `0 4px 14px ${purpleAlpha(0.35)}`,
                display: 'flex', alignItems: 'center', gap: '8px', transition: 'all .15s',
              }}>
                {submitting ? (
                  <span style={{ animation: 'hm-scale 1s infinite alternate' }}>Creando...</span>
                ) : (
                  <>
                    <Zap size={16} fill="#fff" /> Enviar solicitud · €{totalFromDates}
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Main page ────────────────────────────────────────────────────────────────
export default function ExplorePage() {
  const navigate = useNavigate()
  const [search, setSearch]         = useState('')
  const [platform, setPlatform]     = useState('all')
  const [category, setCategory]     = useState('all')
  const [sortBy, setSortBy]         = useState('relevance')
  const [onlyVerified, setOnlyVerified] = useState(false)
  const [maxPrice, setMaxPrice]     = useState(2000)
  const [viewMode, setViewMode]     = useState('grid')   // 'grid' | 'list'
  const [showFilters, setShowFilters] = useState(false)
  const [modalCh, setModalCh]       = useState(null)
  const [hireCh, setHireCh]         = useState(null)
  const [channels, setChannels]     = useState([])
  const [apiLoaded, setApiLoaded]   = useState(false)
  const [channelsLoading, setChannelsLoading] = useState(true)
  // New scoring-driven filters (Block E)
  const [casMin, setCasMin]                 = useState(0)
  const [soloDisponible, setSoloDisponible] = useState(false)
  // Watchlist (Sprint 4)
  const [savedChannelIds, setSavedChannelIds] = useState(new Set())
  const [defaultListId, setDefaultListId]     = useState(null)

  // Load watchlist on mount
  useEffect(() => {
    apiService.getMyLists().then((res) => {
      if (res?.success && Array.isArray(res.data) && res.data.length > 0) {
        const list = res.data[0]
        setDefaultListId(list._id || list.id)
        const ids = new Set((list.canales || []).map((c) => typeof c === 'string' ? c : c._id || c.id))
        setSavedChannelIds(ids)
      }
    }).catch(() => {})
  }, [])

  const handleSaveChannel = async (canal) => {
    const chId = canal.id
    if (!chId) return
    if (savedChannelIds.has(chId)) return // already saved
    try {
      let listId = defaultListId
      if (!listId) {
        // Create default list
        const res = await apiService.createList({ nombre: 'Guardados' })
        if (res?.success && res.data) {
          listId = res.data._id || res.data.id
          setDefaultListId(listId)
        } else return
      }
      await apiService.addChannelToList(listId, chId)
      setSavedChannelIds((prev) => new Set(prev).add(chId))
    } catch { /* silent */ }
  }

  // Fetch channels from API
  useEffect(() => {
    let cancelled = false
    const load = async () => {
      setChannelsLoading(true)
      try {
        const res = await apiService.searchChannels({ limite: 50 })
        if (!cancelled && res?.success && Array.isArray(res.data)) {
          const mapped = res.data.map(ch => ({
            id: ch.id || ch._id,
            name: ch.nombre || ch.name || '',
            platform: ch.plataforma || ch.platform || '',
            category: ch.categoria || ch.category || '',
            audience: ch.audiencia || ch.audience || 0,
            engagement: parseFloat(ch.engagement) || 4.2,
            pricePerPost: ch.precio || ch.pricePerPost || 0,
            verified: ch.verificado || ch.verified || false,
            description: ch.descripcion || ch.description || '',
            freq: ch.freq || '3 posts/semana',
            demo: ch.demo || 'General',
            rating: ch.rating || 4.6,
            score: ch.score || null,
          }))
          setChannels(mapped)
          setApiLoaded(true)
        }
      } catch { /* empty state */ }
      if (!cancelled) setChannelsLoading(false)
    }
    load()
    return () => { cancelled = true }
  }, [])

  const platforms  = ['all', ...new Set(channels.map(c => c.platform))]
  const categories = ['all', ...new Set(channels.map(c => c.category))]

  const filtered = useMemo(() => {
    let arr = channels.filter(c => {
      if (search && !c.name.toLowerCase().includes(search.toLowerCase()) && !c.category.toLowerCase().includes(search.toLowerCase())) return false
      if (platform !== 'all' && c.platform !== platform) return false
      if (category !== 'all' && c.category !== category) return false
      if (onlyVerified && !c.verified) return false
      if (c.pricePerPost > maxPrice) return false
      // Block E: CAS minimum. Channels without CAS data pass through
      // when the minimum is 0; they're excluded once the user asks for
      // any positive minimum because "unknown" can't be >= threshold.
      if (casMin > 0) {
        if (c.CAS == null || Number(c.CAS) < casMin) return false
      }
      // Block E: availability toggle. campaniaActiva is populated by
      // the backend when the channel has a PAID/PUBLISHED campaign.
      if (soloDisponible && c.campaniaActiva) return false
      return true
    })
    if (sortBy === 'price-asc')  arr = [...arr].sort((a, b) => a.pricePerPost - b.pricePerPost)
    if (sortBy === 'price-desc') arr = [...arr].sort((a, b) => b.pricePerPost - a.pricePerPost)
    if (sortBy === 'audience')   arr = [...arr].sort((a, b) => b.audience - a.audience)
    if (sortBy === 'engagement') arr = [...arr].sort((a, b) => b.engagement - a.engagement)
    return arr
  }, [channels, search, platform, category, sortBy, onlyVerified, maxPrice, casMin, soloDisponible])

  const activeFilters = [
    platform !== 'all',
    category !== 'all',
    onlyVerified,
    maxPrice < 2000,
  ].filter(Boolean).length

  const SEL_STYLE = {
    background: 'var(--surface)', border: '1px solid var(--border)',
    borderRadius: '10px', padding: '9px 12px', fontSize: '13px',
    color: 'var(--text)', fontFamily: FONT_BODY, outline: 'none', cursor: 'pointer',
  }

  return (
    <div style={{ fontFamily: FONT_BODY, display: 'flex', flexDirection: 'column', gap: '22px', maxWidth: '1200px' }}>

      {/* ── Header ── */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: '14px' }}>
        <div>
          <h1 style={{ fontFamily: FONT_DISPLAY, fontSize: '28px', fontWeight: 800, color: 'var(--text)', letterSpacing: '-0.04em', marginBottom: '4px' }}>
            Explorar canales
          </h1>
          <p style={{ fontSize: '14px', color: 'var(--muted)' }}>
            {channels.length} canales disponibles · Encuentra el perfecto para tu campaña
          </p>
        </div>
      </div>

      {/* ── Search bar ── */}
      <div style={{ position: 'relative' }}>
        <Search size={16} style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', color: 'var(--muted)' }} />
        <input
          value={search} onChange={e => setSearch(e.target.value)}
          placeholder="Buscar por nombre, categoría o plataforma..."
          style={{
            width: '100%', boxSizing: 'border-box',
            background: 'var(--surface)', border: '1px solid var(--border)',
            borderRadius: '13px', padding: '13px 48px 13px 46px',
            fontSize: '14px', color: 'var(--text)', fontFamily: FONT_BODY, outline: 'none',
            transition: 'border-color .15s, box-shadow .15s',
          }}
          onFocus={e => { e.target.style.borderColor = purpleAlpha(0.5); e.target.style.boxShadow = `0 0 0 3px ${purpleAlpha(0.08)}` }}
          onBlur={e => { e.target.style.borderColor = 'var(--border)'; e.target.style.boxShadow = 'none' }}
        />
        {search && (
          <button onClick={() => setSearch('')} style={{ position: 'absolute', right: '14px', top: '50%', transform: 'translateY(-50%)', background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: '6px', padding: '4px', cursor: 'pointer', color: 'var(--muted)', display: 'flex' }}>
            <X size={14} />
          </button>
        )}
      </div>

      {/* ── Toolbar ── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>

        {/* Platform chips */}
        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', flex: 1 }}>
          {platforms.map(p => (
            <FilterChip
              key={p} label={p === 'all' ? 'Todas' : p}
              active={platform === p}
              onClick={() => setPlatform(p)}
              count={p === 'all' ? channels.length : channels.filter(c => c.platform === p).length}
            />
          ))}
        </div>

        {/* Sort */}
        <select value={sortBy} onChange={e => setSortBy(e.target.value)} style={SEL_STYLE}>
          <option value="relevance">Relevancia</option>
          <option value="price-asc">Precio: menor a mayor</option>
          <option value="price-desc">Precio: mayor a menor</option>
          <option value="audience">Mayor audiencia</option>
          <option value="engagement">Mayor engagement</option>
        </select>

        {/* Filters toggle */}
        <button
          onClick={() => setShowFilters(v => !v)}
          style={{
            display: 'flex', alignItems: 'center', gap: '7px',
            background: showFilters ? purpleAlpha(0.1) : 'var(--surface)',
            border: `1px solid ${showFilters ? purpleAlpha(0.4) : 'var(--border)'}`,
            borderRadius: '10px', padding: '9px 14px',
            fontSize: '13px', fontWeight: 600,
            color: showFilters ? PURPLE : 'var(--muted)',
            cursor: 'pointer', fontFamily: FONT_BODY, position: 'relative',
          }}
        >
          <SlidersHorizontal size={14} />
          Filtros
          {activeFilters > 0 && (
            <span style={{ background: PURPLE, color: '#fff', borderRadius: '50%', width: '16px', height: '16px', fontSize: '10px', fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              {activeFilters}
            </span>
          )}
        </button>

        {/* View toggle */}
        <div style={{ display: 'flex', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '10px', overflow: 'hidden' }}>
          {[{ mode: 'grid', Icon: Grid }, { mode: 'list', Icon: List }].map(({ mode, Icon }) => (
            <button key={mode} onClick={() => setViewMode(mode)} style={{
              background: viewMode === mode ? purpleAlpha(0.12) : 'transparent',
              border: 'none', padding: '9px 12px', cursor: 'pointer',
              color: viewMode === mode ? PURPLE : 'var(--muted)',
              display: 'flex', alignItems: 'center',
              transition: 'background .15s, color .15s',
            }}>
              <Icon size={15} />
            </button>
          ))}
        </div>
      </div>

      {/* ── Expandable filters panel ── */}
      {showFilters && (
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '14px', padding: '20px', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px', animation: 'fadeDown .2s ease' }}>
          <style>{`@keyframes fadeDown { from { opacity:0; transform:translateY(-8px); } to { opacity:1; transform:none; } }`}</style>

          {/* Category */}
          <div>
            <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--muted)', display: 'block', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Categoría</label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px' }}>
              {categories.map(c => (
                <FilterChip key={c} label={c === 'all' ? 'Todas' : c} active={category === c} onClick={() => setCategory(c)} />
              ))}
            </div>
          </div>

          {/* Price range */}
          <div>
            <PriceFilter min={50} max={2000} value={maxPrice} onChange={setMaxPrice} />
          </div>

          {/* Other options */}
          <div>
            <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--muted)', display: 'block', marginBottom: '12px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Opciones</label>
            <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', marginBottom: 10 }}>
              <div
                onClick={() => setOnlyVerified(v => !v)}
                style={{ width: '40px', height: '22px', borderRadius: '11px', background: onlyVerified ? PURPLE : 'var(--border)', position: 'relative', transition: 'background .2s', cursor: 'pointer', flexShrink: 0 }}
              >
                <div style={{ position: 'absolute', top: '3px', left: onlyVerified ? '21px' : '3px', width: '16px', height: '16px', borderRadius: '50%', background: '#fff', transition: 'left .2s', boxShadow: '0 1px 4px rgba(0,0,0,0.2)' }} />
              </div>
              <span style={{ fontSize: '13px', fontWeight: 500, color: 'var(--text)' }}>Solo verificados</span>
            </label>
            {/* Block E: only available toggle */}
            <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' }}>
              <div
                onClick={() => setSoloDisponible(v => !v)}
                style={{ width: '40px', height: '22px', borderRadius: '11px', background: soloDisponible ? C.teal : 'var(--border)', position: 'relative', transition: 'background .2s', cursor: 'pointer', flexShrink: 0 }}
              >
                <div style={{ position: 'absolute', top: '3px', left: soloDisponible ? '21px' : '3px', width: '16px', height: '16px', borderRadius: '50%', background: '#fff', transition: 'left .2s', boxShadow: '0 1px 4px rgba(0,0,0,0.2)' }} />
              </div>
              <span style={{ fontSize: '13px', fontWeight: 500, color: 'var(--text)' }}>Solo disponibles</span>
            </label>
          </div>

          {/* Block E: CAS minimum slider */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                CAS mínimo
              </label>
              <span style={{ fontFamily: FONT_DISPLAY, fontSize: 14, fontWeight: 700, color: casMin > 0 ? C.teal : 'var(--muted)' }}>
                {casMin > 0 ? casMin : 'Cualquiera'}
              </span>
            </div>
            <input
              type="range"
              min={0}
              max={100}
              step={5}
              value={casMin}
              onChange={(e) => setCasMin(Number(e.target.value))}
              style={{ width: '100%', accentColor: C.teal }}
            />
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4 }}>
              <span style={{ fontSize: 11, color: 'var(--muted2)' }}>0</span>
              <span style={{ fontSize: 11, color: 'var(--muted2)' }}>100</span>
            </div>
          </div>

          {/* Reset */}
          {(activeFilters > 0 || casMin > 0 || soloDisponible) && (
            <div style={{ display: 'flex', alignItems: 'flex-end' }}>
              <button onClick={() => { setPlatform('all'); setCategory('all'); setOnlyVerified(false); setMaxPrice(2000); setCasMin(0); setSoloDisponible(false) }} style={{ background: 'none', border: 'none', fontSize: '13px', color: '#ef4444', cursor: 'pointer', fontFamily: FONT_BODY, fontWeight: 600, padding: 0 }}>
                ✕ Limpiar filtros
              </button>
            </div>
          )}
        </div>
      )}

      {/* ── Results count ── */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ fontSize: '13px', color: 'var(--muted)' }}>
          Mostrando <strong style={{ color: 'var(--text)' }}>{filtered.length}</strong> canales
          {activeFilters > 0 && <span style={{ color: PURPLE }}> · {activeFilters} filtro{activeFilters > 1 ? 's' : ''} activo{activeFilters > 1 ? 's' : ''}</span>}
        </span>
      </div>

      {/* ── Grid / List ── */}
      {filtered.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '80px 20px', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '18px' }}>
          <div style={{ width: '64px', height: '64px', borderRadius: '16px', background: purpleAlpha(0.1), display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px', fontSize: '28px' }}>
            🔍
          </div>
          <div style={{ fontFamily: FONT_DISPLAY, fontSize: '18px', fontWeight: 700, color: 'var(--text)', marginBottom: '8px' }}>Sin resultados</div>
          <div style={{ fontSize: '14px', color: 'var(--muted)', marginBottom: '20px' }}>Prueba con otros filtros de búsqueda</div>
          <button onClick={() => { setSearch(''); setPlatform('all'); setCategory('all'); setOnlyVerified(false); setMaxPrice(2000) }} style={{ background: PURPLE, color: '#fff', border: 'none', borderRadius: '10px', padding: '10px 22px', fontSize: '13px', fontWeight: 600, cursor: 'pointer', fontFamily: FONT_BODY }}>
            Limpiar filtros
          </button>
        </div>
      ) : viewMode === 'grid' ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '16px' }}>
          {filtered.map(ch => (
            <ChannelCard
              key={ch.id}
              canal={mapExploreChannel(ch)}
              variant="standard"
              mode="advertiser"
              disponible={!ch.campaniaActiva}
              saved={savedChannelIds.has(ch.id)}
              onSelect={() => setModalCh(ch)}
              onCTA={() => setHireCh(ch)}
              onSave={handleSaveChannel}
            />
          ))}
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {filtered.map((ch) => (
            <ChannelCard
              key={ch.id}
              canal={mapExploreChannel(ch)}
              variant="compact"
              mode="advertiser"
              disponible={!ch.campaniaActiva}
              saved={savedChannelIds.has(ch.id)}
              onSelect={() => setModalCh(ch)}
              onCTA={() => setHireCh(ch)}
              onSave={handleSaveChannel}
            />
          ))}
        </div>
      )}

      {modalCh && <ChannelModal ch={modalCh} onClose={() => setModalCh(null)} onHire={(ch) => { setModalCh(null); setHireCh(ch) }} />}
      {hireCh && <HireModal ch={hireCh} onClose={() => setHireCh(null)} onSuccess={() => {}} />}
    </div>
  )
}
