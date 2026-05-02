import React, { useState, useMemo, useEffect } from 'react'
import { X, Search, Check, Plus } from 'lucide-react'
import {
  WIDGET_CATALOG as DEFAULT_CATALOG,
  WIDGET_CATEGORIES as DEFAULT_CATEGORIES,
} from './WidgetRegistry'
import { FONT_BODY, FONT_DISPLAY } from '../../../../theme/tokens'

const PURPLE = 'var(--accent, #8B5CF6)'
const pa = (o) => `rgba(139,92,246,${o})`

export default function WidgetPicker({
  open,
  onClose,
  onAdd,
  existingTypes = [],
  widgetCatalog = DEFAULT_CATALOG,
  widgetCategories = DEFAULT_CATEGORIES,
  accentColor = PURPLE,
  accentAlpha = pa,
}) {
  const WIDGET_CATALOG = widgetCatalog
  const WIDGET_CATEGORIES = widgetCategories
  const [search, setSearch] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('ALL')
  const [hoveredWidget, setHoveredWidget] = useState(null)
  const [selectedVariants, setSelectedVariants] = useState({})

  useEffect(() => {
    if (!open) return
    const handleKey = (e) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handleKey)
    document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', handleKey)
      document.body.style.overflow = ''
    }
  }, [open, onClose])

  const widgets = useMemo(() => {
    const all = Object.values(WIDGET_CATALOG)
    return all.filter(w => {
      const matchesCat = selectedCategory === 'ALL' || w.category === selectedCategory
      const matchesSearch = !search.trim() || w.name.toLowerCase().includes(search.toLowerCase()) || w.description.toLowerCase().includes(search.toLowerCase())
      return matchesCat && matchesSearch
    })
  }, [search, selectedCategory])

  if (!open) return null

  const getVariantId = (w) => selectedVariants[w.type] || w.defaultVariant

  const handleAdd = (widget) => {
    const variantId = getVariantId(widget)
    onAdd(widget.type, variantId)
  }

  return (
    <div
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
      style={{
        position: 'fixed', inset: 0, zIndex: 9999,
        background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(8px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: 24, animation: 'wpFadeIn .2s ease',
        fontFamily: FONT_BODY,
      }}
    >
      <style>{`
        @keyframes wpFadeIn { from { opacity:0 } to { opacity:1 } }
        @keyframes wpSlideUp { from { opacity:0; transform: translateY(20px) } to { opacity:1; transform: translateY(0) } }
      `}</style>

      <div style={{
        background: 'var(--bg)', borderRadius: 20, width: '100%', maxWidth: 1100, maxHeight: '90vh',
        display: 'flex', flexDirection: 'column', overflow: 'hidden',
        border: '1px solid var(--border)', boxShadow: '0 24px 80px rgba(0,0,0,0.4)',
        animation: 'wpSlideUp .25s ease',
      }}>

        {/* Header */}
        <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16 }}>
          <div>
            <h2 style={{ fontFamily: FONT_DISPLAY, fontSize: 22, fontWeight: 800, color: 'var(--text)', letterSpacing: '-0.03em', margin: 0 }}>
              Añadir widget
            </h2>
            <p style={{ fontSize: 13, color: 'var(--muted)', margin: '4px 0 0 0' }}>
              Personaliza tu dashboard con widgets de métricas, gráficos, tablas y herramientas
            </p>
          </div>
          <button onClick={onClose} style={{
            background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 10,
            width: 36, height: 36, display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'pointer', color: 'var(--muted)',
          }}>
            <X size={18} />
          </button>
        </div>

        {/* Filters */}
        <div style={{ padding: '16px 24px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
          <div style={{ position: 'relative', flex: 1, minWidth: 220 }}>
            <Search size={14} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--muted)' }} />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar widget..."
              style={{
                width: '100%', padding: '10px 12px 10px 36px', borderRadius: 10,
                border: '1px solid var(--border)', background: 'var(--bg2)',
                color: 'var(--text)', fontSize: 13, outline: 'none', fontFamily: FONT_BODY,
              }}
              autoFocus
            />
          </div>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {[{ id: 'ALL', label: 'Todos' }, ...Object.values(WIDGET_CATEGORIES)].map(cat => {
              const active = selectedCategory === cat.id
              return (
                <button key={cat.id} onClick={() => setSelectedCategory(cat.id)}
                  style={{
                    padding: '8px 14px', borderRadius: 10, fontSize: 12, fontWeight: 600,
                    background: active ? PURPLE : 'var(--bg2)',
                    color: active ? '#fff' : 'var(--muted)',
                    border: `1px solid ${active ? PURPLE : 'var(--border)'}`,
                    cursor: 'pointer', fontFamily: FONT_BODY, transition: 'all .15s',
                  }}
                >
                  {cat.label}
                </button>
              )
            })}
          </div>
        </div>

        {/* Widget grid */}
        <div style={{ flex: 1, overflow: 'auto', padding: 20 }}>
          {widgets.length === 0 ? (
            <div style={{ padding: 60, textAlign: 'center', color: 'var(--muted)', fontSize: 14 }}>
              No hay widgets que coincidan con tu búsqueda
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 14 }}>
              {widgets.map(widget => {
                const Icon = widget.icon
                const isHovered = hoveredWidget === widget.type
                const variantId = getVariantId(widget)
                const alreadyAdded = existingTypes.includes(widget.type)

                return (
                  <div key={widget.type}
                    onMouseEnter={() => setHoveredWidget(widget.type)}
                    onMouseLeave={() => setHoveredWidget(null)}
                    style={{
                      background: 'var(--surface)',
                      border: `1.5px solid ${isHovered ? pa(0.45) : 'var(--border)'}`,
                      borderRadius: 14, padding: 16,
                      display: 'flex', flexDirection: 'column', gap: 12,
                      transition: 'border-color .15s, transform .15s, box-shadow .15s',
                      transform: isHovered ? 'translateY(-2px)' : 'none',
                      boxShadow: isHovered ? `0 8px 24px ${pa(0.12)}` : 'none',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                      <div style={{
                        width: 42, height: 42, borderRadius: 11,
                        background: pa(0.12), border: `1px solid ${pa(0.25)}`,
                        display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                      }}>
                        <Icon size={19} color={PURPLE} strokeWidth={2} />
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
                          <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)', fontFamily: FONT_DISPLAY }}>
                            {widget.name}
                          </span>
                          {alreadyAdded && (
                            <span style={{ fontSize: 10, color: PURPLE, background: pa(0.12), padding: '2px 6px', borderRadius: 6, fontWeight: 600 }}>
                              Ya añadido
                            </span>
                          )}
                        </div>
                        <div style={{ fontSize: 12, color: 'var(--muted)', lineHeight: 1.4 }}>{widget.description}</div>
                      </div>
                    </div>

                    {/* Variants */}
                    {widget.variants.length > 1 && (
                      <div>
                        <div style={{ fontSize: 10, fontWeight: 600, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>
                          Versión
                        </div>
                        <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                          {widget.variants.map(v => {
                            const sel = v.id === variantId
                            return (
                              <button key={v.id}
                                onClick={() => setSelectedVariants(prev => ({ ...prev, [widget.type]: v.id }))}
                                style={{
                                  padding: '5px 10px', borderRadius: 8, fontSize: 11, fontWeight: 600,
                                  background: sel ? pa(0.15) : 'var(--bg2)',
                                  color: sel ? PURPLE : 'var(--muted)',
                                  border: `1px solid ${sel ? pa(0.4) : 'var(--border)'}`,
                                  cursor: 'pointer', fontFamily: FONT_BODY,
                                }}
                              >
                                {v.name}
                              </button>
                            )
                          })}
                        </div>
                      </div>
                    )}

                    <button onClick={() => handleAdd(widget)}
                      style={{
                        background: PURPLE, color: '#fff', border: 'none', borderRadius: 10,
                        padding: '9px 14px', fontSize: 12.5, fontWeight: 600,
                        cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                        fontFamily: FONT_BODY, marginTop: 'auto',
                      }}
                    >
                      <Plus size={14} strokeWidth={2.5} /> Añadir
                    </button>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{ padding: '14px 24px', borderTop: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'var(--bg2)' }}>
          <span style={{ fontSize: 12, color: 'var(--muted)' }}>
            {widgets.length} widget{widgets.length !== 1 ? 's' : ''} disponible{widgets.length !== 1 ? 's' : ''}
          </span>
          <button onClick={onClose} style={{
            background: 'transparent', border: '1px solid var(--border)', borderRadius: 10,
            padding: '8px 16px', fontSize: 12.5, fontWeight: 600, color: 'var(--text)',
            cursor: 'pointer', fontFamily: FONT_BODY,
          }}>
            Cerrar
          </button>
        </div>
      </div>
    </div>
  )
}
