import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowRight } from 'lucide-react'
import apiService from '../../../services/api'
import { useAuth } from '../../../auth/AuthContext'
import { useOnboarding } from './OnboardingContext'

const A = '#8b5cf6'
const AD = '#7c3aed'
const AG = (o) => `rgba(139,92,246,${o})`
const F = "'Inter', system-ui, sans-serif"
const D = "'Sora', system-ui, sans-serif"

const PLATFORMS = [
  { id: 'telegram', name: 'Telegram', icon: '\u2708\uFE0F', color: '#2aabee' },
  { id: 'whatsapp', name: 'WhatsApp', icon: '\uD83D\uDCAC', color: '#25d366' },
  { id: 'discord', name: 'Discord', icon: '\uD83C\uDFAE', color: '#5865f2' },
  { id: 'instagram', name: 'Instagram', icon: '\uD83D\uDCF8', color: '#e1306c' },
]

const CATEGORIES = ['Tecnologia', 'Marketing', 'Finanzas', 'Entretenimiento', 'Noticias', 'Educacion', 'Deportes', 'Otro']

export default function ChannelStep() {
  const navigate = useNavigate()
  const { isAuthenticated } = useAuth()
  const { dispatch } = useOnboarding()

  const [platform, setPlatform] = useState(null)
  const [channelName, setChannelName] = useState('')
  const [channelLink, setChannelLink] = useState('')
  const [category, setCategory] = useState('Tecnologia')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [focused, setFocused] = useState(null)

  useEffect(() => {
    if (isAuthenticated === false) navigate('/onboarding/register', { replace: true })
  }, [isAuthenticated])

  const isValid = platform && channelName.trim().length >= 2

  const handleSubmit = async () => {
    if (!isValid) return
    setError('')
    setLoading(true)

    try {
      const res = await apiService.createChannel({
        plataforma: platform,
        nombreCanal: channelName.trim(),
        identificadorCanal: channelLink.trim() || `${platform}-${Date.now()}`,
        categoria: category,
      })

      if (res?.success && res.data) {
        dispatch({
          type: 'SET_CHANNEL',
          payload: {
            channelId: res.data._id || res.data.id,
            platform,
            channelName: channelName.trim(),
          },
        })
        navigate('/onboarding/verify')
      } else {
        setError(res?.message || 'Error al crear el canal')
      }
    } catch (err) {
      setError('Error de conexion. Intenta de nuevo.')
    }
    setLoading(false)
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
        Anade tu canal
      </h1>
      <p style={{ fontSize: '15px', color: 'var(--muted)', marginBottom: '32px', textAlign: 'center' }}>
        Selecciona la plataforma donde tienes tu comunidad
      </p>

      {error && (
        <div style={{
          background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)',
          borderRadius: '10px', padding: '12px 16px', marginBottom: '20px',
          fontSize: '13px', color: '#ef4444',
        }}>{error}</div>
      )}

      {/* Platform selection */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '24px' }}>
        {PLATFORMS.map(p => {
          const selected = platform === p.id
          return (
            <button
              key={p.id}
              type="button"
              onClick={() => setPlatform(p.id)}
              style={{
                background: selected ? `${p.color}12` : 'var(--surface)',
                border: `2px solid ${selected ? p.color : 'var(--border)'}`,
                borderRadius: '14px', padding: '20px 16px',
                cursor: 'pointer', textAlign: 'center',
                transition: 'all .15s',
                boxShadow: selected ? `0 4px 16px ${p.color}25` : 'none',
                transform: selected ? 'scale(1.02)' : 'none',
              }}
            >
              <div style={{ fontSize: '32px', marginBottom: '8px' }}>{p.icon}</div>
              <div style={{
                fontFamily: D, fontSize: '14px', fontWeight: 700,
                color: selected ? p.color : 'var(--text)',
              }}>
                {p.name}
              </div>
            </button>
          )
        })}
      </div>

      {/* Channel name */}
      <div style={{ marginBottom: '16px' }}>
        <label style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text)', display: 'block', marginBottom: '6px' }}>
          Nombre del canal
        </label>
        <input
          type="text" required
          value={channelName} onChange={e => setChannelName(e.target.value)}
          onFocus={() => setFocused('name')} onBlur={() => setFocused(null)}
          placeholder="Ej: Tech Insights ES"
          style={inputStyle('name')}
        />
      </div>

      {/* Category */}
      <div style={{ marginBottom: '16px' }}>
        <label style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text)', display: 'block', marginBottom: '6px' }}>
          Categoria
        </label>
        <select
          value={category}
          onChange={e => setCategory(e.target.value)}
          onFocus={() => setFocused('category')}
          onBlur={() => setFocused(null)}
          style={inputStyle('category')}
        >
          {CATEGORIES.map(c => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
      </div>

      {/* Channel link (optional) */}
      <div style={{ marginBottom: '28px' }}>
        <label style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text)', display: 'block', marginBottom: '6px' }}>
          Enlace del canal <span style={{ color: 'var(--muted2)', fontWeight: 400 }}>(opcional)</span>
        </label>
        <input
          type="text"
          value={channelLink} onChange={e => setChannelLink(e.target.value)}
          onFocus={() => setFocused('link')} onBlur={() => setFocused(null)}
          placeholder={platform === 'telegram' ? '@tucanal' : platform === 'discord' ? 'discord.gg/...' : 'https://...'}
          style={inputStyle('link')}
        />
      </div>

      {/* Continue button */}
      <button
        onClick={handleSubmit}
        disabled={!isValid || loading}
        style={{
          width: '100%',
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
          background: isValid && !loading ? A : AG(0.3),
          color: '#fff', border: 'none', borderRadius: '12px',
          padding: '14px', fontSize: '15px', fontWeight: 700,
          cursor: isValid && !loading ? 'pointer' : 'not-allowed',
          fontFamily: F, transition: 'all .2s',
          boxShadow: isValid ? `0 4px 16px ${AG(0.35)}` : 'none',
        }}
        onMouseEnter={e => { if (isValid && !loading) e.currentTarget.style.background = AD }}
        onMouseLeave={e => { if (isValid && !loading) e.currentTarget.style.background = A }}
      >
        {loading ? 'Creando canal...' : <>Continuar <ArrowRight size={16} /></>}
      </button>
    </div>
  )
}
