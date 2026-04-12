import React, { useState, useEffect, useCallback, useRef } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import {
  Search, X, SlidersHorizontal, ChevronDown, ChevronLeft, ChevronRight,
  TrendingUp, Flame,
} from 'lucide-react'
import apiService from '../../../../../services/api'
import { C, FONT_BODY, FONT_DISPLAY } from '../../../theme/tokens'
import ChannelCard from '../../../components/ChannelCard'

// ─── Constants ──────────────────────────────────────────────────────────────
const PAGE_SIZE = 20

const PLATFORMS = [
  { key: 'all', label: 'Todas', icon: '📡' },
  { key: 'telegram', label: 'Telegram', icon: '✈️' },
  { key: 'whatsapp', label: 'WhatsApp', icon: '💬' },
  { key: 'discord', label: 'Discord', icon: '🎮' },
  { key: 'newsletter', label: 'Newsletter', icon: '📧' },
]

const CATEGORIES = [
  { key: 'all', label: 'Todas' },
  { key: 'finanzas', label: 'Finanzas' },
  { key: 'marketing', label: 'Marketing' },
  { key: 'tecnologia', label: 'Tech' },
  { key: 'cripto', label: 'Crypto' },
  { key: 'salud', label: 'Salud' },
  { key: 'educacion', label: 'Educacion' },
  { key: 'lifestyle', label: 'Lifestyle' },
]

const SORT_OPTIONS = [
  { key: 'score', label: 'Score CAS' },
  { key: 'audiencia', label: 'Suscriptores' },
  { key: 'engagement', label: 'Engagement' },
  { key: 'precio', label: 'Precio €/post' },
  { key: 'createdAt', label: 'Mas reciente' },
]

const PLATFORM_COLORS = {
  telegram: '#2aabee',
  whatsapp: '#25d366',
  discord: '#5865f2',
  newsletter: '#8b5cf6',
  instagram: '#e1306c',
}

// ─── Map API response to ChannelCard's `canal` shape ────────────────────────
const mapToCanal = (ch) => ({
  id: ch.id || ch._id,
  nombre: ch.nombre || ch.name || '',
  plataforma: ch.plataforma || ch.platform || '',
  nicho: ch.categoria || ch.category || '',
  seguidores: ch.audiencia || ch.audience || 0,
  CAS: ch.CAS ?? ch.score ?? null,
  CAF: ch.CAF ?? null,
  CTF: ch.CTF ?? null,
  CER: ch.CER ?? null,
  CVS: ch.CVS ?? null,
  CAP: ch.CAP ?? null,
  nivel: ch.nivel || 'BRONZE',
  CPMDinamico: ch.CPMDinamico || ch.precio || 0,
  verificacion: ch.verificacion || {
    confianzaScore: ch.confianzaScore ?? (ch.verificado ? 60 : 30),
    tipoAcceso: ch.verificado ? 'tracking_url' : 'declarado',
  },
  antifraude: ch.antifraude || { ratioCTF_CAF: null, flags: [] },
  benchmark: ch.benchmark,
  // Extra fields for badges
  _verified: ch.verificado || ch.verified || false,
  _engagement: ch.engagement,
  _precio: ch.precio || ch.pricePerPost || 0,
  _views_trend: ch.views_trend,
})

// ─── Helpers ────────────────────────────────────────────────────────────────
const fmtNum = (n) => {
  if (n == null) return '--'
  if (n >= 1e6) return `${(n / 1e6).toFixed(1)}M`
  if (n >= 1e3) return `${(n / 1e3).toFixed(n >= 10000 ? 0 : 1)}K`
  return String(n)
}

const debounce = (fn, ms) => {
  let t
  return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms) }
}

// ─── Slider component ───────────────────────────────────────────────────────
function RangeSlider({ label, value, onChange, min = 0, max = 100, step = 1, format }) {
  const pct = ((value - min) / (max - min)) * 100
  return (
    <div style={{ marginBottom: 16 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
        <span style={{ fontSize: 12, color: 'var(--muted)', fontWeight: 500 }}>{label}</span>
        <span style={{ fontSize: 12, color: C.teal, fontWeight: 600, fontFamily: 'monospace' }}>
          {format ? format(value) : value}
        </span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        style={{ width: '100%', accentColor: C.teal }}
      />
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 2 }}>
        <span style={{ fontSize: 10, color: 'var(--muted2, #475569)' }}>{format ? format(min) : min}</span>
        <span style={{ fontSize: 10, color: 'var(--muted2, #475569)' }}>{format ? format(max) : max}</span>
      </div>
    </div>
  )
}

// ─── Pill button ────────────────────────────────────────────────────────────
function Pill({ label, icon, active, onClick, color }) {
  return (
    <button
      onClick={onClick}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 5,
        padding: '6px 14px',
        borderRadius: 999,
        fontSize: 12,
        fontWeight: 600,
        fontFamily: FONT_BODY,
        cursor: 'pointer',
        transition: 'all 150ms',
        border: active
          ? `1px solid ${color || C.teal}`
          : '1px solid var(--border)',
        background: active
          ? `${color || C.teal}15`
          : 'transparent',
        color: active
          ? (color || C.teal)
          : 'var(--muted)',
      }}
    >
      {icon && <span style={{ fontSize: 13 }}>{icon}</span>}
      {label}
    </button>
  )
}

// ─── Card skeleton ──────────────────────────────────────────────────────────
function CardSkeleton() {
  return (
    <div
      className="animate-pulse"
      style={{
        background: 'var(--surface)',
        border: '1px solid var(--border)',
        borderRadius: 16,
        padding: 16,
        height: 260,
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
        <div style={{ height: 14, background: 'var(--bg2, #1a2332)', borderRadius: 4, width: 128 }} />
        <div style={{ height: 24, background: 'var(--bg2, #1a2332)', borderRadius: 999, width: 64 }} />
      </div>
      <div style={{ height: 5, background: 'var(--bg2, #1a2332)', borderRadius: 999, marginBottom: 16 }} />
      <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        {[1, 2, 3].map((i) => (
          <div key={i} style={{ height: 10, background: 'var(--bg2, #1a2332)', borderRadius: 4, width: 48 }} />
        ))}
      </div>
      <div style={{ height: 32, background: 'var(--bg2, #1a2332)', borderRadius: 8, marginBottom: 16 }} />
      <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: 12, borderTop: '1px solid var(--border)' }}>
        <div style={{ height: 10, background: 'var(--bg2, #1a2332)', borderRadius: 4, width: 80 }} />
        <div style={{ height: 28, background: 'var(--bg2, #1a2332)', borderRadius: 8, width: 96 }} />
      </div>
    </div>
  )
}

// ─── Empty state ────────────────────────────────────────────────────────────
function EmptyState({ onClear }) {
  return (
    <div style={{
      textAlign: 'center',
      padding: '80px 24px',
      background: 'var(--surface)',
      borderRadius: 16,
      border: '1px solid var(--border)',
    }}>
      <div style={{ fontSize: 48, marginBottom: 16 }}>🔍</div>
      <h3 style={{ fontFamily: FONT_DISPLAY, fontSize: 18, fontWeight: 700, color: 'var(--text)', marginBottom: 8 }}>
        No se encontraron canales
      </h3>
      <p style={{ fontSize: 14, color: 'var(--muted)', marginBottom: 20 }}>
        Prueba ajustando los filtros o la busqueda
      </p>
      <button
        onClick={onClear}
        style={{
          background: C.teal,
          color: '#fff',
          border: 'none',
          borderRadius: 10,
          padding: '10px 24px',
          fontSize: 13,
          fontWeight: 600,
          cursor: 'pointer',
          fontFamily: FONT_BODY,
        }}
      >
        Limpiar filtros
      </button>
    </div>
  )
}

// ─── Pagination ─────────────────────────────────────────────────────────────
function Pagination({ page, totalPages, onPageChange }) {
  if (totalPages <= 1) return null

  const pages = []
  const start = Math.max(1, page - 2)
  const end = Math.min(totalPages, page + 2)
  for (let i = start; i <= end; i++) pages.push(i)

  const btn = (p, label, disabled) => (
    <button
      key={label || p}
      onClick={() => !disabled && onPageChange(p)}
      disabled={disabled}
      style={{
        width: label ? 36 : 36,
        height: 36,
        borderRadius: 10,
        border: p === page ? `1px solid ${C.teal}` : '1px solid var(--border)',
        background: p === page ? `${C.teal}15` : 'transparent',
        color: disabled ? 'var(--muted2, #475569)' : p === page ? C.teal : 'var(--text)',
        fontSize: 13,
        fontWeight: p === page ? 700 : 500,
        cursor: disabled ? 'default' : 'pointer',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontFamily: 'monospace',
        transition: 'all 150ms',
        opacity: disabled ? 0.4 : 1,
      }}
    >
      {label || p}
    </button>
  )

  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, marginTop: 32 }}>
      {btn(page - 1, <ChevronLeft size={16} />, page <= 1)}
      {start > 1 && <>{btn(1)}<span style={{ color: 'var(--muted2)', fontSize: 12 }}>...</span></>}
      {pages.map((p) => btn(p))}
      {end < totalPages && <><span style={{ color: 'var(--muted2)', fontSize: 12 }}>...</span>{btn(totalPages)}</>}
      {btn(page + 1, <ChevronRight size={16} />, page >= totalPages)}
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════════════
export default function ExplorePage() {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()

  // ── State from URL ────────────────────────────────────────────────────
  const platform = searchParams.get('platform') || 'all'
  const category = searchParams.get('category') || 'all'
  const sortBy = searchParams.get('sort') || 'score'
  const page = Math.max(1, Number(searchParams.get('page')) || 1)
  const searchQ = searchParams.get('q') || ''
  const minScore = Number(searchParams.get('minScore')) || 0
  const minSubs = Number(searchParams.get('minSubs')) || 0
  const maxSubs = Number(searchParams.get('maxSubs')) || 0

  // ── Local UI state ────────────────────────────────────────────────────
  const [searchInput, setSearchInput] = useState(searchQ)
  const [channels, setChannels] = useState([])
  const [pagination, setPagination] = useState({ total: 0, totalPaginas: 1 })
  const [loading, setLoading] = useState(true)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [sortOpen, setSortOpen] = useState(false)
  const sortRef = useRef(null)

  // ── Watchlist ─────────────────────────────────────────────────────────
  const [savedIds, setSavedIds] = useState(new Set())
  const [listId, setListId] = useState(null)

  useEffect(() => {
    apiService.getMyLists?.().then((res) => {
      if (res?.success && res.data?.[0]) {
        setListId(res.data[0]._id || res.data[0].id)
        const ids = new Set((res.data[0].canales || []).map((c) => (typeof c === 'string' ? c : c._id || c.id)))
        setSavedIds(ids)
      }
    }).catch(() => {})
  }, [])

  const handleSave = async (canal) => {
    const id = canal.id
    if (!id || savedIds.has(id)) return
    try {
      let lid = listId
      if (!lid) {
        const r = await apiService.createList({ nombre: 'Guardados' })
        if (r?.success && r.data) { lid = r.data._id || r.data.id; setListId(lid) }
      }
      if (lid) await apiService.addChannelToList(lid, id)
      setSavedIds((p) => new Set(p).add(id))
    } catch { /* silent */ }
  }

  // ── Param setter helper ───────────────────────────────────────────────
  const setParam = useCallback((key, value) => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev)
      if (!value || value === 'all' || value === '0' || value === 0) {
        next.delete(key)
      } else {
        next.set(key, String(value))
      }
      // Reset page when filters change
      if (key !== 'page') next.delete('page')
      return next
    })
  }, [setSearchParams])

  // ── Debounced search ──────────────────────────────────────────────────
  const debouncedSearch = useCallback(
    debounce((val) => setParam('q', val), 400),
    [setParam],
  )

  const handleSearchInput = (val) => {
    setSearchInput(val)
    debouncedSearch(val)
  }

  // ── Fetch channels ────────────────────────────────────────────────────
  useEffect(() => {
    let cancelled = false
    const fetchData = async () => {
      setLoading(true)
      try {
        const params = {
          pagina: page,
          limite: PAGE_SIZE,
          ordenPor: sortBy,
        }
        if (platform !== 'all') params.plataforma = platform
        if (category !== 'all') params.categoria = category
        if (searchQ) params.busqueda = searchQ
        if (minScore > 0) params.minScore = minScore
        if (minSubs > 0) params.minSubs = minSubs
        if (maxSubs > 0) params.maxSubs = maxSubs

        const res = await apiService.searchChannels(params)
        if (!cancelled && res?.success) {
          setChannels(Array.isArray(res.data) ? res.data : [])
          setPagination(res.pagination || { total: 0, totalPaginas: 1 })
        }
      } catch {
        if (!cancelled) { setChannels([]); setPagination({ total: 0, totalPaginas: 1 }) }
      }
      if (!cancelled) setLoading(false)
    }
    fetchData()
    return () => { cancelled = true }
  }, [platform, category, sortBy, page, searchQ, minScore, minSubs, maxSubs])

  // ── Close sort dropdown on outside click ──────────────────────────────
  useEffect(() => {
    const h = (e) => { if (sortRef.current && !sortRef.current.contains(e.target)) setSortOpen(false) }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [])

  // ── Clear all filters ─────────────────────────────────────────────────
  const clearFilters = () => {
    setSearchInput('')
    setSearchParams({})
  }

  const activeFilterCount = [
    platform !== 'all',
    category !== 'all',
    minScore > 0,
    minSubs > 0,
    maxSubs > 0,
    searchQ,
  ].filter(Boolean).length

  const currentSort = SORT_OPTIONS.find((s) => s.key === sortBy) || SORT_OPTIONS[0]

  // ═════════════════════════════════════════════════════════════════════
  // RENDER
  // ═════════════════════════════════════════════════════════════════════
  return (
    <div style={{ fontFamily: FONT_BODY, minHeight: '100vh' }}>

      {/* ── HEADER ──────────────────────────────────────────────────── */}
      <div style={{ marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12, marginBottom: 16 }}>
          <div>
            <h1 style={{
              fontFamily: FONT_DISPLAY,
              fontSize: 26,
              fontWeight: 800,
              color: 'var(--text)',
              letterSpacing: '-0.02em',
              margin: 0,
            }}>
              Explorar Canales
            </h1>
            <p style={{ fontSize: 13, color: 'var(--muted)', margin: '4px 0 0' }}>
              {loading ? 'Buscando...' : `${pagination.total} canales encontrados`}
            </p>
          </div>

          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            {/* Sort dropdown */}
            <div ref={sortRef} style={{ position: 'relative' }}>
              <button
                onClick={() => setSortOpen(!sortOpen)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  padding: '8px 14px',
                  borderRadius: 10,
                  border: '1px solid var(--border)',
                  background: 'var(--surface)',
                  color: 'var(--text)',
                  fontSize: 12,
                  fontWeight: 600,
                  cursor: 'pointer',
                  fontFamily: FONT_BODY,
                }}
              >
                {currentSort.label}
                <ChevronDown size={14} style={{ opacity: 0.5 }} />
              </button>
              {sortOpen && (
                <div style={{
                  position: 'absolute',
                  top: '100%',
                  right: 0,
                  marginTop: 4,
                  background: 'var(--surface)',
                  border: '1px solid var(--border)',
                  borderRadius: 12,
                  padding: 4,
                  minWidth: 180,
                  zIndex: 50,
                  boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
                }}>
                  {SORT_OPTIONS.map((opt) => (
                    <button
                      key={opt.key}
                      onClick={() => { setParam('sort', opt.key); setSortOpen(false) }}
                      style={{
                        display: 'block',
                        width: '100%',
                        textAlign: 'left',
                        padding: '8px 12px',
                        borderRadius: 8,
                        border: 'none',
                        background: sortBy === opt.key ? `${C.teal}15` : 'transparent',
                        color: sortBy === opt.key ? C.teal : 'var(--text)',
                        fontSize: 13,
                        fontWeight: sortBy === opt.key ? 600 : 400,
                        cursor: 'pointer',
                        fontFamily: FONT_BODY,
                      }}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Mobile filter toggle */}
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="lg:hidden"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                padding: '8px 14px',
                borderRadius: 10,
                border: activeFilterCount > 0 ? `1px solid ${C.teal}` : '1px solid var(--border)',
                background: activeFilterCount > 0 ? `${C.teal}10` : 'var(--surface)',
                color: activeFilterCount > 0 ? C.teal : 'var(--text)',
                fontSize: 12,
                fontWeight: 600,
                cursor: 'pointer',
                fontFamily: FONT_BODY,
              }}
            >
              <SlidersHorizontal size={14} />
              Filtros
              {activeFilterCount > 0 && (
                <span style={{
                  background: C.teal,
                  color: '#fff',
                  borderRadius: 999,
                  width: 18,
                  height: 18,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 10,
                  fontWeight: 700,
                }}>
                  {activeFilterCount}
                </span>
              )}
            </button>
          </div>
        </div>

        {/* ── SEARCH BAR ───────────────────────────────────────────── */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          padding: '10px 16px',
          borderRadius: 12,
          border: '1px solid var(--border)',
          background: 'var(--surface)',
        }}>
          <Search size={16} color="var(--muted)" />
          <input
            type="text"
            placeholder="Buscar por nombre, username o categoria..."
            value={searchInput}
            onChange={(e) => handleSearchInput(e.target.value)}
            style={{
              flex: 1,
              border: 'none',
              outline: 'none',
              background: 'transparent',
              color: 'var(--text)',
              fontSize: 14,
              fontFamily: FONT_BODY,
            }}
          />
          {searchInput && (
            <button
              onClick={() => { setSearchInput(''); setParam('q', '') }}
              style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, display: 'flex' }}
            >
              <X size={16} color="var(--muted)" />
            </button>
          )}
        </div>
      </div>

      {/* ── LAYOUT: sidebar + grid ─────────────────────────────────── */}
      <div style={{ display: 'flex', gap: 24, alignItems: 'flex-start' }}>

        {/* ── SIDEBAR FILTERS ──────────────────────────────────────── */}
        <aside
          style={{
            width: 260,
            flexShrink: 0,
            background: 'var(--surface)',
            border: '1px solid var(--border)',
            borderRadius: 16,
            padding: 20,
            position: 'sticky',
            top: 80,
            // Mobile: overlay
            ...(typeof window !== 'undefined' && window.innerWidth < 1024
              ? {
                  position: 'fixed',
                  top: 0,
                  left: 0,
                  bottom: 0,
                  width: 300,
                  zIndex: 100,
                  borderRadius: 0,
                  overflowY: 'auto',
                  transform: sidebarOpen ? 'translateX(0)' : 'translateX(-100%)',
                  transition: 'transform 250ms cubic-bezier(.22,1,.36,1)',
                  boxShadow: sidebarOpen ? '0 0 60px rgba(0,0,0,0.5)' : 'none',
                }
              : {}),
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
            <h3 style={{ fontFamily: FONT_DISPLAY, fontSize: 15, fontWeight: 700, color: 'var(--text)', margin: 0 }}>
              Filtros
            </h3>
            {activeFilterCount > 0 && (
              <button
                onClick={clearFilters}
                style={{
                  background: 'none',
                  border: 'none',
                  color: C.teal,
                  fontSize: 12,
                  fontWeight: 600,
                  cursor: 'pointer',
                  fontFamily: FONT_BODY,
                }}
              >
                Limpiar
              </button>
            )}
          </div>

          {/* Platform pills */}
          <div style={{ marginBottom: 20 }}>
            <div style={{ fontSize: 12, color: 'var(--muted)', fontWeight: 600, marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Plataforma
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {PLATFORMS.map((p) => (
                <Pill
                  key={p.key}
                  label={p.label}
                  icon={p.icon}
                  active={platform === p.key}
                  onClick={() => setParam('platform', p.key)}
                  color={PLATFORM_COLORS[p.key]}
                />
              ))}
            </div>
          </div>

          {/* Category pills */}
          <div style={{ marginBottom: 20 }}>
            <div style={{ fontSize: 12, color: 'var(--muted)', fontWeight: 600, marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Categoria
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {CATEGORIES.map((c) => (
                <Pill
                  key={c.key}
                  label={c.label}
                  active={category === c.key}
                  onClick={() => setParam('category', c.key)}
                />
              ))}
            </div>
          </div>

          {/* Subscriber range slider */}
          <RangeSlider
            label="Suscriptores minimos"
            value={minSubs}
            onChange={(v) => setParam('minSubs', v)}
            min={0}
            max={500000}
            step={1000}
            format={(v) => v === 0 ? '0' : fmtNum(v)}
          />

          {/* Score minimum slider */}
          <RangeSlider
            label="Score minimo (CAS)"
            value={minScore}
            onChange={(v) => setParam('minScore', v)}
            min={0}
            max={100}
            step={5}
          />

          {/* Mobile close */}
          <button
            onClick={() => setSidebarOpen(false)}
            className="lg:hidden"
            style={{
              width: '100%',
              marginTop: 16,
              padding: '10px 0',
              borderRadius: 10,
              border: 'none',
              background: C.teal,
              color: '#fff',
              fontSize: 13,
              fontWeight: 600,
              cursor: 'pointer',
              fontFamily: FONT_BODY,
            }}
          >
            Aplicar filtros
          </button>
        </aside>

        {/* Mobile overlay backdrop */}
        {sidebarOpen && (
          <div
            onClick={() => setSidebarOpen(false)}
            style={{
              position: 'fixed',
              inset: 0,
              background: 'rgba(0,0,0,0.5)',
              zIndex: 99,
            }}
          />
        )}

        {/* ── MAIN CONTENT ─────────────────────────────────────────── */}
        <main style={{ flex: 1, minWidth: 0 }}>

          {/* Active filter tags */}
          {activeFilterCount > 0 && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 16 }}>
              {platform !== 'all' && (
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '4px 10px', borderRadius: 999, background: `${PLATFORM_COLORS[platform] || C.teal}15`, border: `1px solid ${PLATFORM_COLORS[platform] || C.teal}30`, color: PLATFORM_COLORS[platform] || C.teal, fontSize: 11, fontWeight: 600 }}>
                  {platform}
                  <X size={12} style={{ cursor: 'pointer' }} onClick={() => setParam('platform', 'all')} />
                </span>
              )}
              {category !== 'all' && (
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '4px 10px', borderRadius: 999, background: `${C.teal}15`, border: `1px solid ${C.teal}30`, color: C.teal, fontSize: 11, fontWeight: 600 }}>
                  {category}
                  <X size={12} style={{ cursor: 'pointer' }} onClick={() => setParam('category', 'all')} />
                </span>
              )}
              {minScore > 0 && (
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '4px 10px', borderRadius: 999, background: `${C.teal}15`, border: `1px solid ${C.teal}30`, color: C.teal, fontSize: 11, fontWeight: 600 }}>
                  CAS ≥ {minScore}
                  <X size={12} style={{ cursor: 'pointer' }} onClick={() => setParam('minScore', 0)} />
                </span>
              )}
              {minSubs > 0 && (
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '4px 10px', borderRadius: 999, background: `${C.teal}15`, border: `1px solid ${C.teal}30`, color: C.teal, fontSize: 11, fontWeight: 600 }}>
                  ≥ {fmtNum(minSubs)} subs
                  <X size={12} style={{ cursor: 'pointer' }} onClick={() => setParam('minSubs', 0)} />
                </span>
              )}
            </div>
          )}

          {/* ── GRID ─────────────────────────────────────────────────── */}
          {loading ? (
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
              gap: 16,
            }}>
              {Array.from({ length: 8 }).map((_, i) => <CardSkeleton key={i} />)}
            </div>
          ) : channels.length === 0 ? (
            <EmptyState onClear={clearFilters} />
          ) : (
            <>
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
                gap: 16,
              }}>
                {channels.map((ch) => {
                  const canal = mapToCanal(ch)
                  return (
                    <div key={canal.id} style={{ position: 'relative' }}>
                      {/* Badges overlay */}
                      <div style={{ position: 'absolute', top: 12, left: 12, zIndex: 2, display: 'flex', gap: 4 }}>
                        {canal._verified && (
                          <span style={{
                            display: 'inline-flex', alignItems: 'center', gap: 3,
                            padding: '3px 8px', borderRadius: 6,
                            background: 'rgba(16,185,129,0.15)', border: '1px solid rgba(16,185,129,0.3)',
                            fontSize: 10, fontWeight: 700, color: '#10b981',
                          }}>
                            ✓ Verificado
                          </span>
                        )}
                        {canal._views_trend === 'creciente' && (
                          <span style={{
                            display: 'inline-flex', alignItems: 'center', gap: 3,
                            padding: '3px 8px', borderRadius: 6,
                            background: 'rgba(245,158,11,0.15)', border: '1px solid rgba(245,158,11,0.3)',
                            fontSize: 10, fontWeight: 700, color: '#f59e0b',
                          }}>
                            <Flame size={10} /> Trending
                          </span>
                        )}
                      </div>
                      <ChannelCard
                        canal={canal}
                        variant="standard"
                        mode="advertiser"
                        saved={savedIds.has(canal.id)}
                        onSave={handleSave}
                        onCTA={(c) => navigate(`/advertiser/campaigns/new?channel=${c.id}`)}
                        onSelect={(c) => navigate(`/advertiser/explore/${c.id}`)}
                      />
                    </div>
                  )
                })}
              </div>

              {/* ── PAGINATION ──────────────────────────────────────── */}
              <Pagination
                page={page}
                totalPages={pagination.totalPaginas || 1}
                onPageChange={(p) => setParam('page', p)}
              />
            </>
          )}
        </main>
      </div>
    </div>
  )
}
