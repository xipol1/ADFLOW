import React, { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search, X, Radio, BarChart3, FileText } from 'lucide-react'
import apiService from '../../../services/api'
import { C, plataformaIcon } from '../theme/tokens'
import { CASBadge } from './scoring'

// ─── Niche catalog (static, used for instant niche results) ──────────────────
const NICHOS = [
  { key: 'crypto', label: 'Crypto', icon: '🪙' },
  { key: 'finanzas', label: 'Finanzas', icon: '💰' },
  { key: 'tecnologia', label: 'Tecnología', icon: '💻' },
  { key: 'marketing', label: 'Marketing', icon: '📈' },
  { key: 'ecommerce', label: 'Ecommerce', icon: '🛒' },
  { key: 'salud', label: 'Salud', icon: '💊' },
  { key: 'entretenimiento', label: 'Entretenimiento', icon: '🎬' },
  { key: 'educacion', label: 'Educación', icon: '📚' },
  { key: 'gaming', label: 'Gaming', icon: '🎮' },
  { key: 'lifestyle', label: 'Lifestyle', icon: '💡' },
]

const PAGES = [
  { label: 'Marketplace', path: '/marketplace', icon: '🛒' },
  { label: 'Blog', path: '/blog', icon: '📝' },
  { label: 'Para Marcas', path: '/para-anunciantes', icon: '📢' },
  { label: 'Para Creadores', path: '/para-canales', icon: '📡' },
]

// ─── Debounce hook ───────────────────────────────────────────────────────────
function useDebounce(value, ms) {
  const [debounced, setDebounced] = useState(value)
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), ms)
    return () => clearTimeout(t)
  }, [value, ms])
  return debounced
}

// ─── Main component ──────────────────────────────────────────────────────────
export default function GlobalSearchBar({ compact = false }) {
  const navigate = useNavigate()
  const [query, setQuery] = useState('')
  const [focused, setFocused] = useState(false)
  const [channels, setChannels] = useState([])
  const [loading, setLoading] = useState(false)
  const [selectedIdx, setSelectedIdx] = useState(-1)
  const inputRef = useRef(null)
  const containerRef = useRef(null)

  const debouncedQuery = useDebounce(query, 300)

  // Search channels from API
  useEffect(() => {
    if (!debouncedQuery || debouncedQuery.length < 2) {
      setChannels([])
      return
    }
    let cancelled = false
    setLoading(true)
    apiService
      .searchChannels({ q: debouncedQuery, limit: 5 })
      .then((res) => {
        if (cancelled) return
        if (res?.success && Array.isArray(res.data)) {
          setChannels(
            res.data.map((ch) => ({
              id: ch.id || ch._id,
              nombre: ch.nombre || ch.name || '',
              plataforma: ch.plataforma || ch.platform || '',
              CAS: ch.CAS,
              nivel: ch.nivel,
              seguidores: ch.estadisticas?.seguidores || ch.audiencia || 0,
            }))
          )
        }
      })
      .catch(() => {})
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [debouncedQuery])

  // Filter niches & pages by query
  const q = query.toLowerCase().trim()
  const filteredNichos = q.length >= 2
    ? NICHOS.filter((n) => n.label.toLowerCase().includes(q) || n.key.includes(q))
    : []
  const filteredPages = q.length >= 2
    ? PAGES.filter((p) => p.label.toLowerCase().includes(q))
    : []

  // All results flattened for keyboard navigation
  const allResults = [
    ...channels.map((ch) => ({ type: 'channel', data: ch })),
    ...filteredNichos.map((n) => ({ type: 'niche', data: n })),
    ...filteredPages.map((p) => ({ type: 'page', data: p })),
  ]

  const showDropdown = focused && q.length >= 2 && allResults.length > 0

  // Navigate to result
  const goTo = useCallback((result) => {
    setQuery('')
    setFocused(false)
    inputRef.current?.blur()
    if (result.type === 'channel') {
      navigate(`/channel/${result.data.id}`)
    } else if (result.type === 'niche') {
      navigate(`/niche/${result.data.key}`)
    } else if (result.type === 'page') {
      navigate(result.data.path)
    }
  }, [navigate])

  // Keyboard handler
  const handleKeyDown = (e) => {
    if (e.key === 'Escape') {
      setFocused(false)
      inputRef.current?.blur()
      return
    }
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setSelectedIdx((i) => Math.min(i + 1, allResults.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setSelectedIdx((i) => Math.max(i - 1, 0))
    } else if (e.key === 'Enter') {
      e.preventDefault()
      if (selectedIdx >= 0 && allResults[selectedIdx]) {
        goTo(allResults[selectedIdx])
      } else if (q.length >= 2) {
        setFocused(false)
        navigate(`/marketplace?q=${encodeURIComponent(q)}`)
        setQuery('')
      }
    }
  }

  // Click outside closes dropdown
  useEffect(() => {
    const handler = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setFocused(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  // Reset selection when results change
  useEffect(() => { setSelectedIdx(-1) }, [allResults.length])

  const inputHeight = compact ? 36 : 42
  const fontSize = compact ? 13 : 14

  return (
    <div ref={containerRef} style={{ position: 'relative', width: '100%', maxWidth: compact ? 320 : 480 }}>
      {/* Input */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          background: focused ? 'var(--surface)' : 'var(--bg2)',
          border: `1px solid ${focused ? 'var(--accent, ' + C.teal + ')' : 'var(--border)'}`,
          borderRadius: showDropdown ? '12px 12px 0 0' : 12,
          height: inputHeight,
          padding: '0 14px',
          transition: 'all 200ms',
        }}
      >
        <Search size={15} color={focused ? C.teal : 'var(--muted2)'} style={{ flexShrink: 0 }} />
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => setFocused(true)}
          onKeyDown={handleKeyDown}
          placeholder="Busca un canal, nicho o creador..."
          style={{
            flex: 1,
            background: 'transparent',
            border: 'none',
            outline: 'none',
            color: 'var(--text)',
            fontSize,
            fontFamily: 'inherit',
          }}
        />
        {query && (
          <button
            onClick={() => { setQuery(''); inputRef.current?.focus() }}
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--muted)',
              cursor: 'pointer',
              padding: 0,
              display: 'flex',
            }}
          >
            <X size={14} />
          </button>
        )}
        {!query && !compact && (
          <span
            style={{
              fontSize: 10,
              color: 'var(--muted2)',
              background: 'var(--bg)',
              border: '1px solid var(--border)',
              borderRadius: 4,
              padding: '2px 6px',
              flexShrink: 0,
              fontFamily: 'JetBrains Mono, monospace',
            }}
          >
            ⌘K
          </span>
        )}
      </div>

      {/* Dropdown */}
      {showDropdown && (
        <div
          style={{
            position: 'absolute',
            top: inputHeight,
            left: 0,
            right: 0,
            background: 'var(--surface)',
            border: `1px solid ${C.teal}44`,
            borderTop: 'none',
            borderRadius: '0 0 12px 12px',
            zIndex: 999,
            maxHeight: 360,
            overflowY: 'auto',
            boxShadow: '0 12px 40px rgba(0,0,0,0.25)',
          }}
        >
          {/* Channel results */}
          {channels.length > 0 && (
            <div>
              <div
                style={{
                  padding: '8px 14px 4px',
                  fontSize: 10,
                  color: 'var(--muted)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.1em',
                  fontWeight: 600,
                }}
              >
                Canales
              </div>
              {channels.map((ch, i) => {
                const idx = i
                const isSelected = selectedIdx === idx
                return (
                  <div
                    key={ch.id}
                    onClick={() => goTo(allResults[idx])}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 10,
                      padding: '8px 14px',
                      cursor: 'pointer',
                      background: isSelected ? 'var(--bg2)' : 'transparent',
                      transition: 'background 100ms',
                    }}
                    onMouseEnter={() => setSelectedIdx(idx)}
                  >
                    <span style={{ fontSize: 14 }}>{plataformaIcon[ch.plataforma] || '📡'}</span>
                    <span style={{ flex: 1, fontSize: 13, color: 'var(--text)', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      @{ch.nombre}
                    </span>
                    {ch.CAS > 0 && <CASBadge CAS={ch.CAS} nivel={ch.nivel} size="xs" />}
                  </div>
                )
              })}
            </div>
          )}

          {/* Niche results */}
          {filteredNichos.length > 0 && (
            <div>
              <div
                style={{
                  padding: '8px 14px 4px',
                  fontSize: 10,
                  color: 'var(--muted)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.1em',
                  fontWeight: 600,
                  borderTop: channels.length > 0 ? '1px solid var(--border)' : 'none',
                }}
              >
                Nichos
              </div>
              {filteredNichos.map((n, i) => {
                const idx = channels.length + i
                const isSelected = selectedIdx === idx
                return (
                  <div
                    key={n.key}
                    onClick={() => goTo(allResults[idx])}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 10,
                      padding: '8px 14px',
                      cursor: 'pointer',
                      background: isSelected ? 'var(--bg2)' : 'transparent',
                    }}
                    onMouseEnter={() => setSelectedIdx(idx)}
                  >
                    <span style={{ fontSize: 14 }}>{n.icon}</span>
                    <span style={{ flex: 1, fontSize: 13, color: 'var(--text)', fontWeight: 500 }}>
                      {n.label}
                    </span>
                    <span style={{ fontSize: 10, color: 'var(--muted)' }}>Ver intel →</span>
                  </div>
                )
              })}
            </div>
          )}

          {/* Page results */}
          {filteredPages.length > 0 && (
            <div>
              <div
                style={{
                  padding: '8px 14px 4px',
                  fontSize: 10,
                  color: 'var(--muted)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.1em',
                  fontWeight: 600,
                  borderTop: '1px solid var(--border)',
                }}
              >
                Páginas
              </div>
              {filteredPages.map((p, i) => {
                const idx = channels.length + filteredNichos.length + i
                const isSelected = selectedIdx === idx
                return (
                  <div
                    key={p.path}
                    onClick={() => goTo(allResults[idx])}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 10,
                      padding: '8px 14px',
                      cursor: 'pointer',
                      background: isSelected ? 'var(--bg2)' : 'transparent',
                    }}
                    onMouseEnter={() => setSelectedIdx(idx)}
                  >
                    <span style={{ fontSize: 14 }}>{p.icon}</span>
                    <span style={{ fontSize: 13, color: 'var(--text)', fontWeight: 500 }}>{p.label}</span>
                  </div>
                )
              })}
            </div>
          )}

          {/* Loading indicator */}
          {loading && channels.length === 0 && (
            <div style={{ padding: '12px 14px', fontSize: 12, color: 'var(--muted)', textAlign: 'center' }}>
              Buscando canales...
            </div>
          )}

          {/* Footer hint */}
          <div
            style={{
              padding: '6px 14px',
              borderTop: '1px solid var(--border)',
              fontSize: 10,
              color: 'var(--muted2)',
              display: 'flex',
              gap: 12,
            }}
          >
            <span>↑↓ navegar</span>
            <span>↵ abrir</span>
            <span>esc cerrar</span>
          </div>
        </div>
      )}
    </div>
  )
}
