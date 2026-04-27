import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { Helmet } from 'react-helmet-async'
import { Search, X, SlidersHorizontal, ChevronLeft, ChevronRight, Zap } from 'lucide-react'
import apiService from '../../../../services/api'
import { ChannelCardNew, FilterSidebar, CardSkeleton } from '../../../../components/ui'

const PAGE_SIZE = 20

const PLATFORMS = [
  { key: 'telegram', label: 'Telegram', icon: '✈️' },
  { key: 'whatsapp', label: 'WhatsApp', icon: '💬' },
  { key: 'discord', label: 'Discord', icon: '🎮' },
  { key: 'newsletter', label: 'Newsletter', icon: '📧' },
]

const CATEGORIES = [
  { key: 'finanzas', label: 'Finanzas' },
  { key: 'marketing', label: 'Marketing' },
  { key: 'tecnologia', label: 'Tecnología' },
  { key: 'cripto', label: 'Crypto' },
  { key: 'salud', label: 'Salud' },
  { key: 'educacion', label: 'Educación' },
  { key: 'lifestyle', label: 'Lifestyle' },
  { key: 'entretenimiento', label: 'Entretenimiento' },
]

const debounce = (fn, ms) => { let t; return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms) } }

export default function ExplorePage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const navigate = useNavigate()
  const fromAutobuy = searchParams.get('from') === 'autobuy'

  // ── User lists for "add to list" on cards ──
  const [userLists, setUserLists] = useState([])
  const [listToast, setListToast] = useState('')

  useEffect(() => {
    apiService.getMyLists().then((res) => {
      if (res?.success) {
        const items = Array.isArray(res.data) ? res.data : res.data?.items || []
        setUserLists(items)
      }
    }).catch(() => {})
  }, [])

  // Map: channelId -> [listId, listId, ...]
  const channelListMap = useMemo(() => {
    const map = {}
    for (const list of userLists) {
      const lid = list._id || list.id
      for (const ch of (list.channels || [])) {
        const cid = typeof ch === 'string' ? ch : (ch._id || ch.id || ch)
        if (!map[cid]) map[cid] = []
        if (!map[cid].includes(lid)) map[cid].push(lid)
      }
    }
    return map
  }, [userLists])

  const showToast = (msg) => { setListToast(msg); setTimeout(() => setListToast(''), 3000) }

  const handleAddToList = useCallback(async (listId, channelId) => {
    try {
      const res = await apiService.addChannelToList(listId, channelId)
      if (res?.success) {
        setUserLists((prev) => prev.map((l) => {
          if ((l._id || l.id) === listId) return res.data || { ...l, channels: [...(l.channels || []), channelId] }
          return l
        }))
        const listName = userLists.find(l => (l._id || l.id) === listId)?.name || 'lista'
        showToast(`Canal guardado en "${listName}"`)
      } else {
        showToast(res?.message || 'No se pudo guardar')
      }
    } catch { showToast('Error de conexion') }
  }, [userLists])

  const handleCreateListAndAdd = useCallback(async (name, channelId) => {
    try {
      const res = await apiService.createList({ name })
      if (res?.success && res.data) {
        const newList = res.data
        const lid = newList._id || newList.id
        setUserLists((prev) => [...prev, newList])
        // Now add channel to the new list
        const addRes = await apiService.addChannelToList(lid, channelId)
        if (addRes?.success) {
          setUserLists((prev) => prev.map((l) => {
            if ((l._id || l.id) === lid) return addRes.data || { ...l, channels: [channelId] }
            return l
          }))
        }
        showToast(`Lista "${name}" creada y canal guardado`)
      } else {
        showToast(res?.message || 'No se pudo crear la lista')
      }
    } catch { showToast('Error de conexion') }
  }, [])

  // State from URL
  const sortBy = searchParams.get('sort') || 'score'
  const page = Math.max(1, Number(searchParams.get('page')) || 1)
  const searchQ = searchParams.get('q') || ''
  const minScore = Number(searchParams.get('minScore')) || 0
  const minSubs = Number(searchParams.get('minSubs')) || 0

  // Parse multi-select from URL
  const selectedPlatforms = (searchParams.get('platforms') || '').split(',').filter(Boolean)
  const selectedCategories = (searchParams.get('categories') || '').split(',').filter(Boolean)

  const [searchInput, setSearchInput] = useState(searchQ)
  const [channels, setChannels] = useState([])
  const [pagination, setPagination] = useState({ total: 0, totalPaginas: 1 })
  const [loading, setLoading] = useState(true)
  const [drawerOpen, setDrawerOpen] = useState(false)

  const setParam = useCallback((key, value) => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev)
      if (!value || value === '0' || (Array.isArray(value) && value.length === 0)) next.delete(key)
      else next.set(key, Array.isArray(value) ? value.join(',') : String(value))
      if (key !== 'page') next.delete('page')
      return next
    })
  }, [setSearchParams])

  const debouncedSearch = useCallback(debounce((v) => setParam('q', v), 400), [setParam])
  const handleSearch = (v) => { setSearchInput(v); debouncedSearch(v) }

  const toggleMulti = (key, current, setter) => {
    const arr = [...current]
    const idx = arr.indexOf(key)
    if (idx >= 0) arr.splice(idx, 1); else arr.push(key)
    setter(arr)
  }

  // Fetch
  useEffect(() => {
    let cancelled = false
    setLoading(true)
    const params = { pagina: page, limite: PAGE_SIZE, ordenPor: sortBy }
    // Send first selected platform/category to backend for server-side filtering
    if (selectedPlatforms.length >= 1) params.plataforma = selectedPlatforms[0]
    if (selectedCategories.length >= 1) params.categoria = selectedCategories[0]
    if (searchQ) params.busqueda = searchQ
    if (minScore > 0) params.minScore = minScore
    if (minSubs > 0) params.minSubs = minSubs

    apiService.searchChannels(params).then((res) => {
      if (cancelled) return
      let data = Array.isArray(res?.data) ? res.data : []
      // Client-side multi-filter for additional platforms/categories
      if (selectedPlatforms.length > 1) data = data.filter((c) => selectedPlatforms.includes((c.plataforma || '').toLowerCase()))
      if (selectedCategories.length > 1) data = data.filter((c) => selectedCategories.includes((c.categoria || '').toLowerCase()))
      setChannels(data)
      // Update total to reflect filtered count
      const total = (selectedPlatforms.length > 1 || selectedCategories.length > 1) ? data.length : (res?.pagination?.total || data.length)
      const totalPaginas = (selectedPlatforms.length > 1 || selectedCategories.length > 1) ? 1 : (res?.pagination?.totalPaginas || 1)
      setPagination({ total, totalPaginas })
    }).catch(() => { if (!cancelled) setChannels([]) })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [sortBy, page, searchQ, minScore, minSubs, selectedPlatforms.join(), selectedCategories.join()])

  const activeCount = [selectedPlatforms.length > 0, selectedCategories.length > 0, minScore > 0, minSubs > 0, searchQ].filter(Boolean).length

  const clearAll = () => { setSearchInput(''); setSearchParams({}) }

  // ── Render ────────────────────────────────────────────────
  return (
    <div className="min-h-screen" style={{ fontFamily: 'var(--font-sans)', background: 'var(--bg)', color: 'var(--text)' }}>
      <Helmet>
        <title>Explorar Canales · Channelad</title>
        <meta name="description" content="Descubre canales verificados de Telegram, WhatsApp, Discord y Newsletter para publicidad. Filtra por categoria, audiencia y score. Metricas reales y pagos protegidos." />
        <meta property="og:title" content="Explorar Canales · Channelad" />
        <meta property="og:description" content="Marketplace de publicidad en comunidades digitales cerradas. Canales verificados con metricas reales." />
      </Helmet>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8">

        {/* Autobuy context banner */}
        {fromAutobuy && (
          <div className="mb-4 flex items-center gap-3 rounded-xl px-5 py-3.5" style={{ background: 'rgba(139,92,246,0.08)', border: '1px solid rgba(139,92,246,0.2)' }}>
            <Zap size={18} style={{ color: 'var(--accent, #8B5CF6)', flexShrink: 0 }} />
            <div className="flex-1">
              <div className="text-sm font-semibold" style={{ color: 'var(--accent, #8B5CF6)' }}>Seleccionando canales para Auto-Buy</div>
              <div className="text-xs mt-0.5" style={{ color: 'var(--text-secondary)' }}>
                Guarda canales en una lista con el boton <strong>+</strong> de cada tarjeta. Luego selecciona esa lista en el modo "Mis favoritos" de Auto-Buy.
              </div>
            </div>
            <button
              onClick={() => navigate('/advertiser/autobuy')}
              className="text-xs font-semibold px-4 py-2 rounded-lg flex-shrink-0"
              style={{ background: 'var(--accent, #8B5CF6)', color: '#fff', border: 'none', cursor: 'pointer' }}
            >
              Volver a Auto-Buy
            </button>
          </div>
        )}

        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold tracking-tight" style={{ color: 'var(--text)' }}>Canales</h1>
          <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
            {loading ? 'Buscando...' : `${pagination.total} canales disponibles`}
          </p>
        </div>

        {/* Search bar */}
        <div className="flex gap-3 mb-6">
          <div className="flex-1 flex items-center gap-2.5 px-4 py-2.5 rounded-lg" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
            <Search size={16} style={{ color: 'var(--muted2)', flexShrink: 0 }} />
            <input
              type="text" value={searchInput} onChange={(e) => handleSearch(e.target.value)}
              placeholder="Buscar por nombre, @username o categoría..."
              className="flex-1 bg-transparent border-none outline-none text-sm"
              style={{ color: 'var(--text)', fontFamily: 'var(--font-sans)' }}
            />
            {searchInput && (
              <button onClick={() => { setSearchInput(''); setParam('q', '') }} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, display: 'flex' }}>
                <X size={14} style={{ color: 'var(--muted2)' }} />
              </button>
            )}
          </div>
          <button
            onClick={() => setDrawerOpen(!drawerOpen)}
            className="lg:hidden flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium"
            style={{ background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--text-secondary)', cursor: 'pointer' }}
          >
            <SlidersHorizontal size={14} />
            {activeCount > 0 && <span className="w-4 h-4 rounded-full flex items-center justify-center text-[10px] font-bold" style={{ background: 'var(--accent)', color: '#080C10' }}>{activeCount}</span>}
          </button>
        </div>

        {/* Layout */}
        <div className="flex gap-6 items-start">

          {/* Sidebar — desktop */}
          <div className="hidden lg:block w-[260px] flex-shrink-0 sticky top-6 rounded-xl p-5" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
            <FilterSidebar
              platforms={PLATFORMS} selectedPlatforms={selectedPlatforms}
              onPlatformChange={(k) => { const a = [...selectedPlatforms]; const i = a.indexOf(k); if (i >= 0) a.splice(i, 1); else a.push(k); setParam('platforms', a) }}
              categories={CATEGORIES} selectedCategories={selectedCategories}
              onCategoryChange={(k) => { const a = [...selectedCategories]; const i = a.indexOf(k); if (i >= 0) a.splice(i, 1); else a.push(k); setParam('categories', a) }}
              minSubs={minSubs} onMinSubsChange={(v) => setParam('minSubs', v)}
              minScore={minScore} onMinScoreChange={(v) => setParam('minScore', v)}
              sortBy={sortBy} onSortChange={(v) => setParam('sort', v)}
              onClear={clearAll} activeCount={activeCount}
            />
          </div>

          {/* Mobile drawer */}
          {drawerOpen && (
            <>
              <div className="fixed inset-0 z-40 bg-black/50" onClick={() => setDrawerOpen(false)} />
              <div className="fixed inset-y-0 left-0 z-50 w-[300px] overflow-y-auto p-5" style={{ background: 'var(--surface)' }}>
                <FilterSidebar
                  platforms={PLATFORMS} selectedPlatforms={selectedPlatforms}
                  onPlatformChange={(k) => { const a = [...selectedPlatforms]; const i = a.indexOf(k); if (i >= 0) a.splice(i, 1); else a.push(k); setParam('platforms', a) }}
                  categories={CATEGORIES} selectedCategories={selectedCategories}
                  onCategoryChange={(k) => { const a = [...selectedCategories]; const i = a.indexOf(k); if (i >= 0) a.splice(i, 1); else a.push(k); setParam('categories', a) }}
                  minSubs={minSubs} onMinSubsChange={(v) => setParam('minSubs', v)}
                  minScore={minScore} onMinScoreChange={(v) => setParam('minScore', v)}
                  sortBy={sortBy} onSortChange={(v) => setParam('sort', v)}
                  onClear={clearAll} activeCount={activeCount}
                />
                <button onClick={() => setDrawerOpen(false)} className="w-full mt-4 py-2.5 rounded-lg text-sm font-semibold" style={{ background: 'var(--accent)', color: '#080C10', border: 'none', cursor: 'pointer' }}>
                  Aplicar filtros
                </button>
              </div>
            </>
          )}

          {/* Main grid */}
          <main className="flex-1 min-w-0">
            {loading ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
                {Array.from({ length: 9 }).map((_, i) => <CardSkeleton key={i} />)}
              </div>
            ) : channels.length === 0 ? (
              <div className="rounded-xl text-center py-20 px-6" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
                <div className="text-4xl mb-4">🔍</div>
                <h3 className="text-base font-semibold mb-2" style={{ color: 'var(--text)' }}>No encontramos canales con esos filtros</h3>
                <p className="text-sm mb-5" style={{ color: 'var(--text-secondary)' }}>Ajusta la búsqueda o limpia los filtros</p>
                <button onClick={clearAll} className="px-5 py-2 rounded-lg text-sm font-semibold" style={{ background: 'var(--accent)', color: '#080C10', border: 'none', cursor: 'pointer' }}>
                  Limpiar filtros
                </button>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
                  {channels.map((ch, i) => (
                    <div key={ch.id || ch._id || i} style={{ animationDelay: `${i * 50}ms` }} className="animate-fadeIn">
                      <ChannelCardNew
                        channel={ch}
                        lists={userLists}
                        onAddToList={handleAddToList}
                        onCreateList={handleCreateListAndAdd}
                        channelListMap={channelListMap}
                      />
                    </div>
                  ))}
                </div>

                {/* Pagination */}
                {pagination.totalPaginas > 1 && (
                  <div className="flex items-center justify-center gap-2 mt-8">
                    <button
                      disabled={page <= 1}
                      onClick={() => setParam('page', page - 1)}
                      className="px-3 py-1.5 rounded-md text-sm font-medium disabled:opacity-30"
                      style={{ background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--text-secondary)', cursor: page <= 1 ? 'default' : 'pointer' }}
                    >
                      <ChevronLeft size={14} />
                    </button>
                    <span className="text-sm px-3" style={{ color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)' }}>
                      {page} / {pagination.totalPaginas}
                    </span>
                    <button
                      disabled={page >= pagination.totalPaginas}
                      onClick={() => setParam('page', page + 1)}
                      className="px-3 py-1.5 rounded-md text-sm font-medium disabled:opacity-30"
                      style={{ background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--text-secondary)', cursor: page >= pagination.totalPaginas ? 'default' : 'pointer' }}
                    >
                      <ChevronRight size={14} />
                    </button>
                  </div>
                )}
              </>
            )}
          </main>
        </div>
      </div>

      {/* Toast */}
      {listToast && (
        <div style={{
          position: 'fixed', bottom: '24px', left: '50%', transform: 'translateX(-50%)',
          background: 'var(--surface, #0D1117)', border: '1px solid var(--border, #21262D)',
          borderRadius: '12px', padding: '10px 20px', boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
          fontSize: '13px', fontWeight: 600, color: 'var(--text)', zIndex: 100,
          display: 'flex', alignItems: 'center', gap: '8px',
        }}>
          <span style={{ color: 'var(--accent, #8B5CF6)', fontSize: '15px' }}>{'\u2713'}</span>
          {listToast}
        </div>
      )}
    </div>
  )
}
