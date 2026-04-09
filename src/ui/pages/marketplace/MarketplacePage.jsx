import React, { useState, useMemo, useEffect, useCallback } from 'react'
import { Link, useSearchParams, useNavigate } from 'react-router-dom'
import SEO from '../../components/SEO'
import { useAuth } from '../../../auth/AuthContext'
import apiService from '../../../../services/api'
import { PURPLE as A, PURPLE_DARK as AD, purpleAlpha as AG, PLATFORM_BRAND as PLAT, STATUS as BADGE, FONT_BODY, FONT_DISPLAY } from '../../theme/tokens'
import ChannelCard from '../../components/ChannelCard'

// Map the marketplace listing shape (aggregated in MarketplacePage's
// own useMemo with API + fallback mock data) to the canonical canal
// shape ChannelCard expects. Unknown scoring v2 fields stay undefined.
const mapListingChannel = (l) => ({
  id: l.id,
  nombre: l.name || l.title,
  plataforma: (l.platCls || l.platform || '').toLowerCase(),
  nicho: l.category,
  seguidores: typeof l.audienceRaw === 'number' ? l.audienceRaw : undefined,
  CAS: l.CAS,
  CAF: l.CAF,
  CTF: l.CTF,
  CER: l.CER,
  CVS: l.CVS,
  CAP: l.CAP,
  nivel: l.nivel,
  CPMDinamico: l.CPMDinamico || l.priceNum,
  verificacion: l.verificacion || {
    confianzaScore: l.verified ? 65 : 30,
    tipoAcceso: l.verified ? 'tracking_url' : 'declarado',
  },
  antifraude: l.antifraude || { ratioCTF_CAF: null, flags: [] },
})

const CATEGORY_ICONS = {
  'ecommerce': '🛒', 'fitness': '💪', 'marketing': '📈', 'gaming': '🎮',
  'tecnologia': '💻', 'ia & tech': '🤖', 'educación': '📚', 'educacion': '📚',
  'lifestyle': '💡', 'finanzas': '💰', 'negocios': '💼', 'gastronomía': '🍽️',
  'cripto': '🪙', 'diseño': '🎨',
}

// Fallback listings shown while API is loading or unavailable
const FALLBACK_LISTINGS = [
  { id: 'demo-1', plataforma: 'whatsapp', categoria: 'Ecommerce', verificado: true, nombre: 'Comunidad Ecommerce', seller: 'ecomhub', initials: 'EH', descripcion: 'Comunidad de compradores activos en ecommerce con alto poder adquisitivo', audiencia: 12400, precio: 320, engagement: '5.2%' },
  { id: 'demo-2', plataforma: 'telegram', categoria: 'Marketing', verificado: true, nombre: 'Tech Marketing Pro', seller: 'techpro', initials: 'TP', descripcion: 'Audiencia tech hispanohablante con alta tasa de engagement y conversión', audiencia: 8200, precio: 450, engagement: '6.1%' },
  { id: 'demo-3', plataforma: 'discord', categoria: 'Gaming', verificado: false, nombre: 'Gaming España DC', seller: 'gamermk', initials: 'GM', descripcion: 'Servidor gaming con comunidad activa, torneos semanales y alto engagement', audiencia: 4500, precio: 280, engagement: '9.7%' },
  { id: 'demo-4', plataforma: 'discord', categoria: 'IA & Tech', verificado: true, nombre: 'AI Labs Community', seller: 'ai_labs', initials: 'AI', descripcion: 'Comunidad IA: prompts, herramientas, automatizaciones y novedades del sector', audiencia: 11000, precio: 220, engagement: '4.5%' },
  { id: 'demo-5', plataforma: 'whatsapp', categoria: 'Fitness', verificado: true, nombre: 'Fitness España', seller: 'fitcoach', initials: 'FT', descripcion: 'Canal fitness con audiencia comprometida, recetas, retos semanales y productos', audiencia: 8700, precio: 180, engagement: '8.3%' },
  { id: 'demo-6', plataforma: 'telegram', categoria: 'Tecnologia', verificado: true, nombre: 'Dev & Code ES', seller: 'devcode', initials: 'DC', descripcion: 'Canal para desarrolladores hispanohablantes. Tutoriales, ofertas de trabajo y noticias tech.', audiencia: 38900, precio: 380, engagement: '7.3%' },
  { id: 'demo-7', plataforma: 'instagram', categoria: 'Negocios', verificado: true, nombre: 'Emprendedores IG', seller: 'empig', initials: 'EI', descripcion: 'Emprendimiento, finanzas personales y estilo de vida empresarial.', audiencia: 87400, precio: 650, engagement: '3.8%' },
  { id: 'demo-8', plataforma: 'whatsapp', categoria: 'Educación', verificado: false, nombre: 'EduHub España', seller: 'eduhub', initials: 'ED', descripcion: 'Canal educativo con cursos, tutoriales y comunidad de estudiantes activos', audiencia: 5200, precio: 120, engagement: '6.9%' },
  { id: 'demo-9', plataforma: 'telegram', categoria: 'Finanzas', verificado: true, nombre: 'Finanzas Para Todos', seller: 'finanzas', initials: 'FP', descripcion: 'Educación financiera, inversión y ahorro. Audiencia muy comprometida.', audiencia: 52100, precio: 520, engagement: '5.9%' },
  { id: 'demo-10', plataforma: 'telegram', categoria: 'Ecommerce', verificado: true, nombre: 'Dropshipping ES', seller: 'dropship', initials: 'DS', descripcion: 'Comunidad dropshipping con proveedores, tendencias y soporte 24/7', audiencia: 15300, precio: 380, engagement: '4.8%' },
  { id: 'demo-11', plataforma: 'whatsapp', categoria: 'Fitness', verificado: true, nombre: 'NutriCoach Pro', seller: 'nutri', initials: 'NC', descripcion: 'Canal nutrición y bienestar con planes de dieta personalizados y comunidad', audiencia: 9600, precio: 210, engagement: '11.2%' },
  { id: 'demo-12', plataforma: 'telegram', categoria: 'IA & Tech', verificado: false, nombre: 'AI Daily ES', seller: 'aidaily', initials: 'AD', descripcion: 'Noticias y recursos de inteligencia artificial en español cada día', audiencia: 6800, precio: 140, engagement: '4.7%' },
]

const PLATFORMS = ['Todos', 'WhatsApp', 'Telegram', 'Discord', 'YouTube', 'Instagram', 'TikTok']
const CATEGORIES = ['Todas', 'Ecommerce', 'Fitness', 'Marketing', 'Gaming', 'IA & Tech', 'Educación', 'Tecnologia', 'Finanzas', 'Negocios']
const SORT_OPTIONS = [
  { value: 'createdAt', label: 'Más recientes' },
  { value: 'audiencia', label: 'Mayor audiencia' },
  { value: 'precio', label: 'Mayor precio' },
  { value: 'score', label: 'Mejor puntuación' },
]
const PAGE_SIZE = 20

const fmtAudience = (n) => {
  if (!n) return '0'
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1000) return `${(n / 1000).toFixed(n >= 10000 ? 0 : 1)}K`
  return String(n)
}

export default function MarketplacePage() {
  const { isAuthenticated, isAnunciante } = useAuth()
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const [searchInput, setSearchInput] = useState(searchParams.get('q') || '')
  const [apiChannels, setApiChannels] = useState(null)
  const [pagination, setPagination] = useState(null) // { total, totalPaginas }
  const [loading, setLoading] = useState(true)

  const activePlatform = searchParams.get('platform') || 'Todos'
  const activeCategory = searchParams.get('category') || 'Todas'
  const activeQ = searchParams.get('q') || ''
  const activeSort = searchParams.get('sort') || 'createdAt'
  const activePage = Math.max(1, Number(searchParams.get('page') || 1))

  const F = FONT_BODY
  const D = FONT_DISPLAY

  // Fetch channels from API
  const fetchChannels = useCallback(async () => {
    setLoading(true)
    try {
      const params = { page: activePage, limit: PAGE_SIZE, sort: activeSort }
      if (activePlatform !== 'Todos') params.platform = activePlatform.toLowerCase()
      if (activeCategory !== 'Todas') params.category = activeCategory.toLowerCase()
      if (activeQ) params.q = activeQ

      const res = await apiService.searchChannels(params)
      if (res?.success && Array.isArray(res.data) && res.data.length > 0) {
        setApiChannels(res.data)
        setPagination(res.pagination || null)
      } else {
        setApiChannels(null)
        setPagination(null)
      }
    } catch {
      setApiChannels(null)
      setPagination(null)
    } finally {
      setLoading(false)
    }
  }, [activePlatform, activeCategory, activeQ, activeSort, activePage])

  useEffect(() => {
    fetchChannels()
  }, [fetchChannels])

  // Reset to page 1 when filters change
  const prevFiltersRef = React.useRef({ activePlatform, activeCategory, activeQ, activeSort })
  useEffect(() => {
    const prev = prevFiltersRef.current
    const filtersChanged =
      prev.activePlatform !== activePlatform ||
      prev.activeCategory !== activeCategory ||
      prev.activeQ !== activeQ ||
      prev.activeSort !== activeSort
    if (filtersChanged) {
      prevFiltersRef.current = { activePlatform, activeCategory, activeQ, activeSort }
      const next = new URLSearchParams(searchParams)
      next.delete('page')
      setSearchParams(next)
    }
  }, [activePlatform, activeCategory, activeQ, activeSort]) // eslint-disable-line

  // Merge API data with fallback
  const listings = useMemo(() => {
    const source = apiChannels || FALLBACK_LISTINGS
    let items = source.map(ch => {
      const plat = (ch.plataforma || ch.platform || '').toLowerCase()
      const cat = ch.categoria || ch.category || ''
      const name = ch.nombre || ch.name || ''
      const aud = ch.audiencia || ch.audience || 0
      return {
        id: ch.id || ch._id,
        platCls: plat,
        platform: PLAT[plat]?.label || plat,
        category: cat,
        badge: ch.verificado || ch.verified ? 'TOP' : null,
        badgeType: ch.verificado || ch.verified ? 'verified' : null,
        seller: ch.seller || name.toLowerCase().replace(/\s+/g, '_').slice(0, 12),
        initials: ch.initials || name.slice(0, 2).toUpperCase(),
        color: PLAT[plat]?.color || A,
        isPro: ch.verificado || ch.verified || false,
        title: ch.descripcion || ch.description || name,
        name: name,
        rating: ch.rating || (4.5 + Math.random() * 0.5).toFixed(1),
        reviews: ch.reviews || Math.floor(50 + Math.random() * 400),
        members: fmtAudience(aud),
        audienceRaw: aud, // raw number for ChannelCard seguidores
        price: `€${ch.precio || ch.pricePerPost || 0}`,
        priceNum: ch.precio || ch.pricePerPost || 0,
        icon: CATEGORY_ICONS[cat.toLowerCase()] || '📢',
        engagement: ch.engagement || '4.2%',
        verified: ch.verificado || ch.verified || false,
        // Scoring v2 passthrough (undefined if API doesn't return them)
        CAS: ch.CAS, CAF: ch.CAF, CTF: ch.CTF, CER: ch.CER, CVS: ch.CVS, CAP: ch.CAP,
        nivel: ch.nivel,
        CPMDinamico: ch.CPMDinamico,
        verificacion: ch.verificacion,
        antifraude: ch.antifraude,
      }
    })

    // Apply client-side filters on fallback data (API already filters server-side)
    if (!apiChannels) {
      if (activePlatform !== 'Todos') items = items.filter(l => l.platform === activePlatform)
      if (activeCategory !== 'Todas') items = items.filter(l => l.category.toLowerCase().includes(activeCategory.toLowerCase()))
      if (activeQ) {
        const q = activeQ.toLowerCase()
        items = items.filter(l => l.title.toLowerCase().includes(q) || l.name.toLowerCase().includes(q) || l.seller.toLowerCase().includes(q))
      }
    }

    return items
  }, [apiChannels, activePlatform, activeCategory, activeQ])

  const setFilter = (key, value) => {
    const next = new URLSearchParams(searchParams)
    next.delete('page') // reset pagination when filters change
    if ((key === 'platform' && value === 'Todos') || (key === 'category' && value === 'Todas')) {
      next.delete(key)
    } else {
      next.set(key, value)
    }
    setSearchParams(next)
  }

  const setPage = (p) => {
    const next = new URLSearchParams(searchParams)
    if (p <= 1) next.delete('page')
    else next.set('page', String(p))
    setSearchParams(next)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const handleSearch = () => {
    const next = new URLSearchParams(searchParams)
    if (searchInput.trim()) next.set('q', searchInput.trim())
    else next.delete('q')
    setSearchParams(next)
  }

  const handleContract = (listing) => {
    if (isAuthenticated) {
      navigate(isAnunciante ? `/advertiser/explore` : '/advertiser/explore')
    } else {
      navigate('/auth/login')
    }
  }

  return (
    <div style={{ background: 'var(--bg)', color: 'var(--text)', fontFamily: F, minHeight: '100vh' }}>
      <SEO
        title="Marketplace de canales"
        description="Explora canales verificados de WhatsApp, Telegram y Discord para publicitar tu marca. Filtra por nicho, audiencia y precio. Pagos custodiados."
        path="/marketplace"
      />

      {/* Header */}
      <div style={{ borderBottom: '1px solid var(--border)', background: 'var(--bg2)', padding: '32px 48px 24px' }}>
        <div style={{ maxWidth: '1160px', margin: '0 auto' }}>
          <h1 style={{ fontFamily: D, fontSize: '28px', fontWeight: 700, letterSpacing: '-0.02em', marginBottom: '6px' }}>
            Explorar canales
          </h1>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px', marginBottom: '20px' }}>
            <p style={{ fontSize: '14px', color: 'var(--muted)', margin: 0 }}>
              {loading ? 'Cargando canales...' : pagination ? `${pagination.total} canales disponibles` : `${listings.length} canales disponibles`}
            </p>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '12px', color: 'var(--muted)', fontWeight: 500 }}>Ordenar:</span>
              <select
                value={activeSort}
                onChange={e => setFilter('sort', e.target.value)}
                style={{
                  background: 'var(--surface)', color: 'var(--text)',
                  border: '1px solid var(--border-med)', borderRadius: '8px',
                  padding: '5px 10px', fontSize: '13px', cursor: 'pointer', outline: 'none',
                  fontFamily: F,
                }}
              >
                {SORT_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </div>
          </div>

          {/* Search bar */}
          <div style={{
            display: 'flex', maxWidth: '560px',
            background: 'var(--surface)',
            border: '1px solid var(--border-med)',
            borderRadius: '10px', overflow: 'hidden', height: '44px',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', flex: 1, padding: '0 14px', gap: '10px' }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"
                style={{ color: 'var(--muted2)', flexShrink: 0 }}>
                <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
              </svg>
              <input
                type="text"
                placeholder="Buscar canales, temáticas o vendedores..."
                value={searchInput}
                onChange={e => setSearchInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleSearch()}
                style={{ flex: 1, border: 'none', outline: 'none', background: 'transparent', fontSize: '14px', color: 'var(--text)', fontFamily: F }}
              />
              {searchInput && (
                <button onClick={() => { setSearchInput(''); const next = new URLSearchParams(searchParams); next.delete('q'); setSearchParams(next) }}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted)', fontSize: '16px', padding: '0 4px' }}>✕</button>
              )}
            </div>
            <button onClick={handleSearch} style={{
              background: A, color: '#fff', border: 'none', cursor: 'pointer',
              padding: '0 20px', fontSize: '13px', fontWeight: 600,
              transition: 'background .15s',
            }}
              onMouseEnter={e => e.currentTarget.style.background = AD}
              onMouseLeave={e => e.currentTarget.style.background = A}
            >Buscar</button>
          </div>
        </div>
      </div>

      <div style={{ maxWidth: '1160px', margin: '0 auto', padding: '32px 48px' }}>

        {/* Platform filters */}
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '12px' }}>
          {PLATFORMS.map(p => {
            const isActive = activePlatform === p || (p === 'Todos' && activePlatform === 'Todos')
            return (
              <button key={p} onClick={() => setFilter('platform', p)} style={{
                background: isActive ? A : 'var(--surface)',
                color: isActive ? '#fff' : 'var(--muted)',
                border: `1px solid ${isActive ? A : 'var(--border)'}`,
                borderRadius: '999px', padding: '5px 14px',
                fontSize: '13px', fontWeight: isActive ? 600 : 400,
                cursor: 'pointer', transition: 'all .15s',
              }}>{p}</button>
            )
          })}
        </div>

        {/* Category filters */}
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '32px' }}>
          {CATEGORIES.map(c => {
            const isActive = activeCategory === c || (c === 'Todas' && activeCategory === 'Todas')
            return (
              <button key={c} onClick={() => setFilter('category', c)} style={{
                background: isActive ? AG(0.12) : 'transparent',
                color: isActive ? A : 'var(--muted2)',
                border: `1px solid ${isActive ? AG(0.3) : 'transparent'}`,
                borderRadius: '6px', padding: '4px 12px',
                fontSize: '12px', fontWeight: isActive ? 600 : 400,
                cursor: 'pointer', transition: 'all .15s',
              }}>{c}</button>
            )
          })}
        </div>

        {/* Loading state */}
        {loading && (
          <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--muted)' }}>
            <div style={{ fontSize: '32px', marginBottom: '12px', animation: 'spin 1s linear infinite' }}>⟳</div>
            <p style={{ fontSize: '14px' }}>Cargando canales...</p>
          </div>
        )}

        {/* Results grid */}
        {!loading && listings.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '80px 0', color: 'var(--muted)' }}>
            <p style={{ fontSize: '18px', fontFamily: D, fontWeight: 600, marginBottom: '8px', color: 'var(--text)' }}>Sin resultados</p>
            <p style={{ fontSize: '14px' }}>Prueba con otros filtros o términos de búsqueda.</p>
            <button onClick={() => { setSearchParams(new URLSearchParams()); setSearchInput('') }} style={{
              marginTop: '16px', background: AG(0.12), color: A, border: `1px solid ${AG(0.3)}`,
              borderRadius: '8px', padding: '8px 20px', fontSize: '13px', fontWeight: 600, cursor: 'pointer',
            }}>Limpiar filtros</button>
          </div>
        ) : !loading && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '16px' }}>
            {listings.map((l) => (
              <ChannelCard
                key={l.id}
                canal={mapListingChannel(l)}
                variant="standard"
                mode="marketplace"
                disponible
                onCTA={() => navigate(`/channel/${l.id}`)}
              />
            ))}
          </div>
        )}
        {/* Pagination */}
        {!loading && pagination && pagination.totalPaginas > 1 && (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', marginTop: '40px', paddingBottom: '8px' }}>
            <button
              onClick={() => setPage(activePage - 1)}
              disabled={activePage <= 1}
              style={{
                background: 'var(--surface)', color: activePage <= 1 ? 'var(--muted2)' : 'var(--text)',
                border: '1px solid var(--border)', borderRadius: '8px',
                padding: '7px 14px', fontSize: '13px', fontWeight: 600,
                cursor: activePage <= 1 ? 'not-allowed' : 'pointer',
              }}
            >← Anterior</button>

            {Array.from({ length: pagination.totalPaginas }, (_, i) => i + 1)
              .filter(p => p === 1 || p === pagination.totalPaginas || Math.abs(p - activePage) <= 2)
              .reduce((acc, p, idx, arr) => {
                if (idx > 0 && p - arr[idx - 1] > 1) acc.push('…')
                acc.push(p)
                return acc
              }, [])
              .map((p, idx) =>
                p === '…' ? (
                  <span key={`ellipsis-${idx}`} style={{ fontSize: '13px', color: 'var(--muted)', padding: '0 4px' }}>…</span>
                ) : (
                  <button key={p} onClick={() => setPage(p)} style={{
                    background: p === activePage ? A : 'var(--surface)',
                    color: p === activePage ? '#fff' : 'var(--text)',
                    border: `1px solid ${p === activePage ? A : 'var(--border)'}`,
                    borderRadius: '8px', padding: '7px 12px',
                    fontSize: '13px', fontWeight: p === activePage ? 700 : 500,
                    cursor: 'pointer', minWidth: '36px',
                  }}>{p}</button>
                )
              )
            }

            <button
              onClick={() => setPage(activePage + 1)}
              disabled={activePage >= pagination.totalPaginas}
              style={{
                background: 'var(--surface)', color: activePage >= pagination.totalPaginas ? 'var(--muted2)' : 'var(--text)',
                border: '1px solid var(--border)', borderRadius: '8px',
                padding: '7px 14px', fontSize: '13px', fontWeight: 600,
                cursor: activePage >= pagination.totalPaginas ? 'not-allowed' : 'pointer',
              }}
            >Siguiente →</button>
          </div>
        )}

      </div>
    </div>
  )
}
