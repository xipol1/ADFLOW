import React, { useState, useEffect } from 'react'
import { Link, useParams, useNavigate } from 'react-router-dom'
import { useAuth } from '../../../auth/AuthContext'
import apiService from '../../../../services/api'
import {
  PURPLE, purpleAlpha, FONT_BODY, FONT_DISPLAY,
  OK, WARN, ERR, BLUE, PLATFORM_BRAND,
} from '../../theme/tokens'

const MOCK = {
  nombre: 'Canal Demo',
  plataforma: 'WhatsApp',
  descripcion: 'Este es un canal de demostracion con contenido variado sobre ecommerce, marketing digital y emprendimiento. Ideal para marcas que buscan audiencias comprometidas en mercados hispanohablantes.',
  miembros: 12400,
  precio: 320,
  rating: 4.8,
  reviews: 97,
  engagement: '4.2%',
  categoria: 'Ecommerce',
  verificado: true,
}

const fmtNumber = (n) => {
  if (!n) return '0'
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1000) return `${(n / 1000).toFixed(n >= 10000 ? 0 : 1)}K`
  return String(n)
}

const Stars = ({ rating }) => {
  const full = Math.floor(rating)
  const half = rating - full >= 0.5
  const empty = 5 - full - (half ? 1 : 0)
  return (
    <span style={{ color: '#f59e0b', fontSize: '16px', letterSpacing: '1px' }}>
      {'★'.repeat(full)}
      {half && '★'}
      {'☆'.repeat(empty)}
    </span>
  )
}

export default function ChannelDetailPage() {
  const { channelId } = useParams()
  const navigate = useNavigate()
  const { isAuthenticated } = useAuth()

  const [channel, setChannel] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    let cancelled = false
    const fetchChannel = async () => {
      setLoading(true)
      setError(null)
      try {
        const res = await apiService.getChannel(channelId)
        if (!cancelled) {
          if (res?.success && res.data) {
            setChannel(res.data)
          } else {
            // API returned but no data -- use mock
            setChannel(null)
          }
        }
      } catch (err) {
        if (!cancelled) {
          setChannel(null)
          setError(err.message || 'Error al cargar el canal')
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    fetchChannel()
    return () => { cancelled = true }
  }, [channelId])

  // Resolve display data: API channel or mock fallback
  const data = channel || MOCK
  const nombre = data.nombre || data.name || MOCK.nombre
  const plataforma = (data.plataforma || data.platform || MOCK.plataforma).toLowerCase()
  const platInfo = PLATFORM_BRAND[plataforma] || PLATFORM_BRAND.whatsapp
  const platLabel = platInfo.label
  const platColor = platInfo.color
  const descripcion = data.descripcion || data.description || MOCK.descripcion
  const miembros = data.miembros || data.audience || data.audiencia || MOCK.miembros
  const precio = data.precio || data.pricePerPost || MOCK.precio
  const rating = data.rating || MOCK.rating
  const reviews = data.reviews || MOCK.reviews
  const engagement = data.engagement || MOCK.engagement
  const categoria = data.categoria || data.category || MOCK.categoria
  const verificado = data.verificado || data.verified || MOCK.verificado
  const seller = data.seller || data.creador || nombre.toLowerCase().replace(/\s+/g, '_').slice(0, 12)
  const initials = (data.initials || nombre.slice(0, 2)).toUpperCase()

  const handleContract = () => {
    if (isAuthenticated) {
      navigate('/advertiser/explore')
    } else {
      navigate('/auth/login')
    }
  }

  const F = FONT_BODY
  const D = FONT_DISPLAY

  // --- Loading state ---
  if (loading) {
    return (
      <div style={{ background: 'var(--bg)', color: 'var(--text)', fontFamily: F, minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '36px', marginBottom: '12px', animation: 'spin 1s linear infinite' }}>&#x27F3;</div>
          <p style={{ fontSize: '14px', color: 'var(--muted)' }}>Cargando canal...</p>
        </div>
      </div>
    )
  }

  // --- 404 state (API returned explicit 404 and no mock fallback desired) ---
  if (error && !channel && error.includes('404')) {
    return (
      <div style={{ background: 'var(--bg)', color: 'var(--text)', fontFamily: F, minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ textAlign: 'center', maxWidth: '420px' }}>
          <div style={{ fontFamily: D, fontSize: '64px', fontWeight: 800, color: PURPLE, marginBottom: '16px' }}>404</div>
          <h2 style={{ fontFamily: D, fontSize: '22px', fontWeight: 700, marginBottom: '8px' }}>Canal no encontrado</h2>
          <p style={{ fontSize: '14px', color: 'var(--muted)', marginBottom: '24px' }}>
            El canal que buscas no existe o ha sido eliminado.
          </p>
          <Link to="/marketplace" style={{
            background: PURPLE, color: '#fff', borderRadius: '10px',
            padding: '10px 24px', fontSize: '14px', fontWeight: 600,
            textDecoration: 'none', fontFamily: F,
          }}>
            Volver al marketplace
          </Link>
        </div>
      </div>
    )
  }

  // --- Main detail view ---
  return (
    <div style={{ background: 'var(--bg)', color: 'var(--text)', fontFamily: F, minHeight: '100vh' }}>

      {/* Back link */}
      <div style={{ maxWidth: '900px', margin: '0 auto', padding: '32px 48px 0' }}>
        <Link to="/marketplace" style={{
          fontSize: '13px', color: PURPLE, textDecoration: 'none', fontWeight: 500,
          display: 'inline-flex', alignItems: 'center', gap: '4px',
        }}>
          &larr; Volver al marketplace
        </Link>
      </div>

      <div style={{ maxWidth: '900px', margin: '0 auto', padding: '24px 48px 48px' }}>

        {/* Hero section */}
        <div style={{
          background: 'var(--surface)', border: '1px solid var(--border)',
          borderRadius: '16px', padding: '32px', marginBottom: '24px',
        }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '24px', flexWrap: 'wrap' }}>

            {/* Avatar */}
            <div style={{
              width: '72px', height: '72px', borderRadius: '50%',
              background: platInfo.bg, border: `2px solid ${platColor}40`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '22px', fontWeight: 800, color: platColor, flexShrink: 0,
            }}>
              {initials}
            </div>

            <div style={{ flex: 1, minWidth: '200px' }}>
              {/* Platform badge */}
              <div style={{
                display: 'inline-block', background: platInfo.bg, color: platColor,
                borderRadius: '6px', padding: '3px 10px',
                fontSize: '11px', fontWeight: 600, marginBottom: '8px',
              }}>
                {platLabel}
              </div>

              {/* Channel name */}
              <h1 style={{ fontFamily: D, fontSize: '28px', fontWeight: 800, letterSpacing: '-0.02em', margin: '0 0 8px' }}>
                {nombre}
              </h1>

              {/* Seller + rating */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap', marginBottom: '8px' }}>
                <span style={{ fontSize: '14px', color: 'var(--muted)' }}>por <span style={{ color: 'var(--text)', fontWeight: 600 }}>@{seller}</span></span>
                <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <Stars rating={Number(rating)} />
                  <span style={{ fontSize: '14px', fontWeight: 600 }}>{rating}</span>
                  <span style={{ fontSize: '13px', color: 'var(--muted)' }}>({reviews} reviews)</span>
                </span>
              </div>

              {/* Badges row */}
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
                {verificado && (
                  <span style={{
                    background: purpleAlpha(0.12), color: PURPLE,
                    border: `1px solid ${purpleAlpha(0.22)}`,
                    borderRadius: '6px', padding: '3px 10px',
                    fontSize: '11px', fontWeight: 700,
                  }}>
                    Verificado
                  </span>
                )}
                <span style={{
                  background: 'rgba(59,130,246,0.1)', color: BLUE,
                  borderRadius: '6px', padding: '3px 10px',
                  fontSize: '11px', fontWeight: 600,
                }}>
                  {fmtNumber(miembros)} miembros
                </span>
                <span style={{
                  background: 'rgba(16,185,129,0.1)', color: OK,
                  borderRadius: '6px', padding: '3px 10px',
                  fontSize: '11px', fontWeight: 600,
                }}>
                  {categoria}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Stats row */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginBottom: '24px' }}>
          {[
            { label: 'Seguidores', value: fmtNumber(miembros), color: BLUE },
            { label: 'Engagement', value: engagement, color: OK },
            { label: 'Posts/mes', value: String(data.postsPerMonth || data.postsMes || 24), color: WARN },
            { label: 'Rating', value: String(rating), color: '#f59e0b' },
          ].map(s => (
            <div key={s.label} style={{
              background: 'var(--surface)', border: '1px solid var(--border)',
              borderRadius: '14px', padding: '20px 16px', textAlign: 'center',
            }}>
              <div style={{ fontFamily: D, fontSize: '22px', fontWeight: 800, color: s.color, marginBottom: '4px' }}>{s.value}</div>
              <div style={{ fontSize: '12px', color: 'var(--muted)', fontWeight: 500 }}>{s.label}</div>
            </div>
          ))}
        </div>

        {/* Description */}
        <div style={{
          background: 'var(--surface)', border: '1px solid var(--border)',
          borderRadius: '14px', padding: '24px', marginBottom: '24px',
        }}>
          <h2 style={{ fontFamily: D, fontSize: '18px', fontWeight: 700, marginBottom: '12px' }}>Descripcion</h2>
          <p style={{ fontSize: '15px', lineHeight: 1.8, color: 'var(--muted)' }}>{descripcion}</p>
        </div>

        {/* Pricing + CTA */}
        <div style={{
          background: `linear-gradient(135deg, ${purpleAlpha(0.06)} 0%, transparent 100%)`,
          border: `1px solid ${purpleAlpha(0.18)}`,
          borderRadius: '14px', padding: '28px', display: 'flex',
          alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px',
        }}>
          <div>
            <div style={{ fontSize: '13px', color: 'var(--muted)', marginBottom: '4px', fontWeight: 500 }}>Precio por publicacion</div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px' }}>
              <span style={{ fontFamily: D, fontSize: '36px', fontWeight: 800, color: 'var(--text)' }}>&euro;{precio}</span>
              <span style={{ fontSize: '14px', color: 'var(--muted)' }}>/post</span>
            </div>
          </div>
          <button
            onClick={handleContract}
            style={{
              background: PURPLE, color: '#fff', border: 'none',
              borderRadius: '10px', padding: '14px 32px',
              fontSize: '15px', fontWeight: 700, cursor: 'pointer',
              fontFamily: F, transition: 'all .2s',
            }}
            onMouseEnter={e => { e.currentTarget.style.background = '#7c3aed' }}
            onMouseLeave={e => { e.currentTarget.style.background = PURPLE }}
          >
            {isAuthenticated ? 'Contratar este canal' : 'Iniciar sesion para contratar'}
          </button>
        </div>

      </div>
    </div>
  )
}
