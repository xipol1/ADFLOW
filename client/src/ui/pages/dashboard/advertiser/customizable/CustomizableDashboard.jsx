import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { Responsive, useContainerWidth } from 'react-grid-layout'
import {
  Pencil, Check, Plus, X, Settings2, RotateCcw,
  ChevronDown, GripVertical, Layout,
} from 'lucide-react'
import {
  WIDGET_CATALOG as ADVERTISER_CATALOG,
  getDefaultLayout as advertiserDefaultLayout,
  generateWidgetId as advertiserGenerateId,
} from './WidgetRegistry'
import advertiserWidgetRenderer from './widgets'
import WidgetPicker from './WidgetPicker'
import ViewTabs from './ViewTabs'
import { NewViewModal, ExportViewModal, ImportViewModal } from './ViewModals'
import useDashboardViewsHook, { PRESETS as ADVERTISER_PRESETS } from './useDashboardViews'
import { FONT_BODY, FONT_DISPLAY } from '../../../../theme/tokens'

const PURPLE = 'var(--accent, #8B5CF6)'
const pa = (o) => `rgba(139,92,246,${o})`

// ─── Inline CSS for react-grid-layout ─────────────────────────────────────────
const GRID_STYLES = `
.react-grid-layout { position: relative; transition: height 200ms ease; }
.react-grid-item { transition: transform 220ms cubic-bezier(.22,1,.36,1), width 220ms cubic-bezier(.22,1,.36,1), height 220ms cubic-bezier(.22,1,.36,1), opacity .15s; }
.react-grid-item.cssTransforms { transition-property: transform, width, height; }
.react-grid-item.resizing { z-index: 5; opacity: 0.96; transition: none; }
.react-grid-item.resizing .adflow-widget-card { box-shadow: 0 12px 40px ${pa(0.3)}; border-color: ${pa(0.6)}; }
.react-grid-item.react-draggable-dragging { transition: none; z-index: 100; opacity: 0.96; }
.react-grid-item.react-draggable-dragging .adflow-widget-card { box-shadow: 0 16px 48px rgba(0,0,0,0.25), 0 0 0 2px ${pa(0.5)}; transform: scale(1.02); }
.react-grid-item.react-grid-placeholder {
  background: ${pa(0.12)};
  border: 2px dashed ${pa(0.55)};
  border-radius: 16px;
  opacity: 1;
  transition-duration: 100ms;
  z-index: 2;
  user-select: none;
}

/* ═══ RESIZE HANDLES — all 8 directions ═══ */
.react-grid-item > .react-resizable-handle {
  position: absolute;
  background: transparent;
  z-index: 4;
  opacity: 0;
  transition: opacity .15s;
}
.react-grid-item:hover > .react-resizable-handle,
.react-grid-item.resizing > .react-resizable-handle { opacity: 1; }

/* Corners — visible chevron indicators */
.react-grid-item > .react-resizable-handle-se {
  width: 18px; height: 18px; bottom: 0; right: 0; cursor: se-resize;
}
.react-grid-item > .react-resizable-handle-se::after {
  content: ""; position: absolute; right: 4px; bottom: 4px;
  width: 9px; height: 9px;
  border-right: 2.5px solid ${pa(0.7)};
  border-bottom: 2.5px solid ${pa(0.7)};
  border-radius: 0 0 3px 0;
}
.react-grid-item > .react-resizable-handle-sw {
  width: 18px; height: 18px; bottom: 0; left: 0; cursor: sw-resize;
}
.react-grid-item > .react-resizable-handle-sw::after {
  content: ""; position: absolute; left: 4px; bottom: 4px;
  width: 9px; height: 9px;
  border-left: 2.5px solid ${pa(0.7)};
  border-bottom: 2.5px solid ${pa(0.7)};
  border-radius: 0 0 0 3px;
}
.react-grid-item > .react-resizable-handle-ne {
  width: 18px; height: 18px; top: 0; right: 0; cursor: ne-resize;
}
.react-grid-item > .react-resizable-handle-ne::after {
  content: ""; position: absolute; right: 4px; top: 4px;
  width: 9px; height: 9px;
  border-right: 2.5px solid ${pa(0.7)};
  border-top: 2.5px solid ${pa(0.7)};
  border-radius: 0 3px 0 0;
}
.react-grid-item > .react-resizable-handle-nw {
  width: 18px; height: 18px; top: 0; left: 0; cursor: nw-resize;
}
.react-grid-item > .react-resizable-handle-nw::after {
  content: ""; position: absolute; left: 4px; top: 4px;
  width: 9px; height: 9px;
  border-left: 2.5px solid ${pa(0.7)};
  border-top: 2.5px solid ${pa(0.7)};
  border-radius: 3px 0 0 0;
}

/* Edges — thin pill indicators */
.react-grid-item > .react-resizable-handle-n {
  height: 8px; left: 18px; right: 18px; top: 0; cursor: n-resize;
}
.react-grid-item > .react-resizable-handle-s {
  height: 8px; left: 18px; right: 18px; bottom: 0; cursor: s-resize;
}
.react-grid-item > .react-resizable-handle-e {
  width: 8px; top: 18px; bottom: 18px; right: 0; cursor: e-resize;
}
.react-grid-item > .react-resizable-handle-w {
  width: 8px; top: 18px; bottom: 18px; left: 0; cursor: w-resize;
}
.react-grid-item > .react-resizable-handle-n::after,
.react-grid-item > .react-resizable-handle-s::after {
  content: ""; position: absolute; left: 50%; transform: translateX(-50%);
  top: 50%; margin-top: -1px;
  width: 28px; height: 3px; border-radius: 2px; background: ${pa(0.55)};
}
.react-grid-item > .react-resizable-handle-e::after,
.react-grid-item > .react-resizable-handle-w::after {
  content: ""; position: absolute; top: 50%; transform: translateY(-50%);
  left: 50%; margin-left: -1px;
  width: 3px; height: 28px; border-radius: 2px; background: ${pa(0.55)};
}

/* ═══ Widget card ═══ */
.adflow-widget-card {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 16px;
  height: 100%;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  transition: border-color .15s, box-shadow .15s, transform .2s;
  position: relative;
}
.adflow-widget-card.editing { border-color: ${pa(0.35)}; }
.adflow-widget-card.editing:hover { box-shadow: 0 6px 24px ${pa(0.15)}; }

/* Drag header hover state (inline styles handle base render) */
.adflow-widget-drag-header:hover {
  background: linear-gradient(180deg, ${pa(0.18)} 0%, ${pa(0.04)} 100%) !important;
}
.adflow-widget-drag-header:active { cursor: grabbing !important; }

.adflow-widget-controls { opacity: 0; transition: opacity .15s; }
.adflow-widget-card.editing .adflow-widget-controls { opacity: 1; }

/* Body — NO scroll. Content adapts via useWidgetSize. */
.adflow-widget-body {
  flex: 1;
  min-height: 0;
  overflow: hidden;
  padding: 16px 18px;
  display: flex;
  flex-direction: column;
}
.adflow-widget-card.editing .adflow-widget-body { padding-top: 8px; }

/* Subtle pulse so users notice editing mode */
@keyframes editGlow { 0%,100%{ box-shadow: 0 0 0 0 ${pa(0.0)} } 50% { box-shadow: 0 0 0 3px ${pa(0.06)} } }
.adflow-widget-card.editing { animation: editGlow 2.4s ease infinite; }

/* Touch-friendly resize handles on coarse pointers */
@media (pointer: coarse) {
  .react-grid-item > .react-resizable-handle { opacity: 0.6; }
  .react-grid-item > .react-resizable-handle-se,
  .react-grid-item > .react-resizable-handle-sw,
  .react-grid-item > .react-resizable-handle-ne,
  .react-grid-item > .react-resizable-handle-nw { width: 26px; height: 26px; }
}
`

// ─── Widget Card (wrapper around each widget) ─────────────────────────────────
function WidgetCard({ widget, data, editing, onRemove, onChangeVariant, widgetCatalog, WidgetRenderer }) {
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef(null)
  const cfg = widgetCatalog[widget.type]

  useEffect(() => {
    if (!menuOpen) return
    const handler = (e) => { if (menuRef.current && !menuRef.current.contains(e.target)) setMenuOpen(false) }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [menuOpen])

  if (!cfg) return null

  return (
    <div className={`adflow-widget-card ${editing ? 'editing' : ''}`}>
      {/* Drag handle bar — visible only in edit mode, ONLY draggable area */}
      {editing && (
        <div className="adflow-widget-drag-header adflow-drag-handle"
          title="Arrastra para mover"
          style={{
            height: 24,
            opacity: 1,
            background: `linear-gradient(180deg, ${pa(0.08)} 0%, transparent 100%)`,
            borderBottom: `1px dashed ${pa(0.18)}`,
            borderRadius: '16px 16px 0 0',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 4,
            cursor: 'grab',
            userSelect: 'none',
            flexShrink: 0,
          }}
        >
          {Array.from({ length: 8 }).map((_, i) => (
            <span key={i} style={{ width: 3, height: 3, borderRadius: 2, background: pa(0.6) }} />
          ))}
        </div>
      )}

      {/* Edit-mode floating controls */}
      {editing && (
        <div className="adflow-widget-controls" style={{
          position: 'absolute', top: 26, right: 8, zIndex: 5,
          display: 'flex', alignItems: 'center', gap: 4,
        }}>
          {cfg.variants.length > 1 && (
            <div ref={menuRef} style={{ position: 'relative' }}>
              <button
                onMouseDown={(e) => e.stopPropagation()}
                onClick={(e) => { e.stopPropagation(); setMenuOpen(o => !o) }}
                style={{
                  background: 'var(--bg2)', border: '1px solid var(--border)',
                  borderRadius: 8, height: 26, padding: '0 8px',
                  display: 'flex', alignItems: 'center', gap: 4, cursor: 'pointer',
                  fontSize: 11, fontWeight: 600, color: 'var(--text)', fontFamily: FONT_BODY,
                  boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
                }}
                title="Cambiar versión del widget"
              >
                <Settings2 size={12} />
                {cfg.variants.find(v => v.id === widget.variant)?.name || 'Versión'}
                <ChevronDown size={11} />
              </button>
              {menuOpen && (
                <div style={{
                  position: 'absolute', top: 30, right: 0,
                  background: 'var(--bg)', border: '1px solid var(--border)',
                  borderRadius: 10, padding: 4, minWidth: 140, zIndex: 10,
                  boxShadow: '0 8px 28px rgba(0,0,0,0.25)',
                }}>
                  <div style={{ fontSize: 10, fontWeight: 600, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.06em', padding: '6px 10px 4px' }}>
                    Versión
                  </div>
                  {cfg.variants.map(v => {
                    const sel = v.id === widget.variant
                    return (
                      <button key={v.id}
                        onMouseDown={(e) => e.stopPropagation()}
                        onClick={(e) => { e.stopPropagation(); onChangeVariant(v.id); setMenuOpen(false) }}
                        style={{
                          width: '100%', textAlign: 'left',
                          padding: '7px 10px', borderRadius: 6, border: 'none',
                          background: sel ? pa(0.12) : 'transparent',
                          color: sel ? PURPLE : 'var(--text)',
                          fontSize: 12, fontWeight: sel ? 600 : 500,
                          cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                          fontFamily: FONT_BODY,
                        }}
                        onMouseEnter={(e) => { if (!sel) e.currentTarget.style.background = 'var(--bg2)' }}
                        onMouseLeave={(e) => { if (!sel) e.currentTarget.style.background = 'transparent' }}
                      >
                        {v.name}
                        {sel && <Check size={12} />}
                      </button>
                    )
                  })}
                </div>
              )}
            </div>
          )}
          <button
            onMouseDown={(e) => e.stopPropagation()}
            onClick={(e) => { e.stopPropagation(); onRemove() }}
            style={{
              width: 26, height: 26, borderRadius: 8,
              background: 'var(--bg2)', border: '1px solid var(--border)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer', color: '#ef4444',
              boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
            }}
            title="Eliminar widget"
            onMouseEnter={(e) => { e.currentTarget.style.borderColor = '#ef4444'; e.currentTarget.style.background = 'rgba(239,68,68,0.1)' }}
            onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.background = 'var(--bg2)' }}
          >
            <X size={13} strokeWidth={2.5} />
          </button>
        </div>
      )}

      <div className="adflow-widget-body">
        <WidgetRenderer type={widget.type} variant={widget.variant} data={data} widgetId={widget.i} />
      </div>
    </div>
  )
}

// ─── Empty state ──────────────────────────────────────────────────────────────
function EmptyDashboard({ onAdd, onReset }) {
  return (
    <div style={{
      padding: 60, textAlign: 'center',
      border: `2px dashed ${pa(0.3)}`, borderRadius: 20, background: pa(0.04),
      display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16,
    }}>
      <div style={{
        width: 64, height: 64, borderRadius: 16,
        background: pa(0.12), border: `1px solid ${pa(0.25)}`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <Layout size={28} color={PURPLE} />
      </div>
      <div>
        <div style={{ fontFamily: FONT_DISPLAY, fontSize: 20, fontWeight: 800, color: 'var(--text)', letterSpacing: '-0.03em', marginBottom: 6 }}>
          Esta vista está vacía
        </div>
        <div style={{ fontSize: 14, color: 'var(--muted)', maxWidth: 420, margin: '0 auto', lineHeight: 1.5 }}>
          Empieza añadiendo widgets para personalizar esta vista. Puedes mover, redimensionar y elegir entre diferentes versiones.
        </div>
      </div>
      <div style={{ display: 'flex', gap: 10 }}>
        <button onClick={onAdd}
          style={{
            background: PURPLE, color: '#fff', border: 'none', borderRadius: 12,
            padding: '11px 20px', fontSize: 14, fontWeight: 600,
            display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer',
            fontFamily: FONT_BODY, boxShadow: `0 4px 16px ${pa(0.35)}`,
          }}
        >
          <Plus size={16} strokeWidth={2.5} /> Añadir widget
        </button>
        <button onClick={onReset}
          style={{
            background: 'var(--bg2)', color: 'var(--text)', border: '1px solid var(--border)',
            borderRadius: 12, padding: '11px 20px', fontSize: 14, fontWeight: 600,
            display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontFamily: FONT_BODY,
          }}
        >
          <RotateCcw size={14} /> Cargar diseño por defecto
        </button>
      </div>
    </div>
  )
}

// ─── Main component ──────────────────────────────────────────────────────────
/**
 * CustomizableDashboard — role-agnostic grid dashboard.
 *
 * Defaults to the advertiser registry / widgets / hook. Pass overrides to
 * reuse the infrastructure for creators (or any future role).
 *
 * Props:
 *   data              — the data context passed to every widget renderer
 *   widgetCatalog     — { [type]: { name, variants, ... } }   (default: advertiser)
 *   WidgetRenderer    — React component ({ type, variant, data, widgetId }) => JSX
 *   getDefaultLayout  — () => initial items array for new users
 *   generateWidgetId  — () => string  (unique id for new widget instances)
 *   useViewsHook      — hook returning { views, activeView, ... } — defaults to
 *                       advertiser hook (backend-synced); creator passes a
 *                       local-only variant
 *   accentColor       — CSS color token used for highlights/badges
 *   accentAlpha       — fn(opacity) => "rgba(R,G,B,opacity)"
 *   widgetCategories  — optional category overrides for the picker
 */
export default function CustomizableDashboard({
  data,
  widgetCatalog = ADVERTISER_CATALOG,
  WidgetRenderer = advertiserWidgetRenderer,
  getDefaultLayout = advertiserDefaultLayout,
  generateWidgetId = advertiserGenerateId,
  useViewsHook = useDashboardViewsHook,
  accentColor = PURPLE,
  accentAlpha = pa,
  widgetCategories,
}) {
  const WIDGET_CATALOG = widgetCatalog
  const [editing, setEditing] = useState(false)
  const [pickerOpen, setPickerOpen] = useState(false)
  const [newViewOpen, setNewViewOpen] = useState(false)
  const [exportOpen, setExportOpen] = useState(false)
  const [exportPayload, setExportPayload] = useState({ json: '', name: '' })
  const [importOpen, setImportOpen] = useState(false)

  const {
    views, activeView, activeViewId, loading, syncing, syncError,
    updateActiveItems, createView, renameView, deleteView,
    duplicateView, setActiveView, setAsDefault, exportView, importView,
  } = useViewsHook()

  const items = activeView?.items || []

  const onLayoutChange = useCallback((layout) => {
    if (!activeView) return
    let touched = false
    const next = items.map(it => {
      const l = layout.find(x => x.i === it.i)
      if (!l) return it
      if (l.x === it.x && l.y === it.y && l.w === it.w && l.h === it.h) return it
      touched = true
      return { ...it, x: l.x, y: l.y, w: l.w, h: l.h }
    })
    if (touched) updateActiveItems(next)
  }, [items, activeView, updateActiveItems])

  const handleAddWidget = useCallback((type, variantId) => {
    const cfg = WIDGET_CATALOG[type]
    if (!cfg) return
    const variant = cfg.variants.find(v => v.id === variantId) || cfg.variants[0]
    const id = generateWidgetId()
    const maxY = items.reduce((m, it) => Math.max(m, it.y + it.h), 0)
    updateActiveItems(prev => [...prev, {
      i: id, type, variant: variant.id,
      x: 0, y: maxY, w: variant.defaultW, h: variant.defaultH,
    }])
  }, [items, updateActiveItems])

  const handleRemoveWidget = useCallback((id) => {
    updateActiveItems(prev => prev.filter(it => it.i !== id))
  }, [updateActiveItems])

  const handleChangeVariant = useCallback((id, variantId) => {
    updateActiveItems(prev => prev.map(it => {
      if (it.i !== id) return it
      const cfg = WIDGET_CATALOG[it.type]
      const variant = cfg?.variants.find(v => v.id === variantId)
      if (!variant) return it
      return {
        ...it,
        variant: variantId,
        w: Math.max(variant.minW, Math.min(variant.maxW, variant.defaultW)),
        h: Math.max(variant.minH, Math.min(variant.maxH, variant.defaultH)),
      }
    }))
  }, [updateActiveItems])

  const handleResetLayout = useCallback(() => {
    if (window.confirm('¿Restaurar el diseño por defecto en esta vista?')) {
      updateActiveItems(getDefaultLayout())
    }
  }, [updateActiveItems])

  const handleExportView = useCallback((viewId) => {
    const json = exportView(viewId)
    const view = views.find(v => v.id === viewId)
    if (json) {
      setExportPayload({ json, name: view?.name || 'dashboard' })
      setExportOpen(true)
    }
  }, [exportView, views])

  // Build layouts object for ResponsiveGrid (single breakpoint approach)
  const layouts = useMemo(() => {
    const lg = items.map(it => {
      const cfg = WIDGET_CATALOG[it.type]
      const variant = cfg?.variants.find(v => v.id === it.variant) || cfg?.variants[0]
      return {
        i: it.i,
        x: it.x, y: it.y, w: it.w, h: it.h,
        minW: variant?.minW || 2,
        minH: variant?.minH || 2,
        maxW: variant?.maxW || 12,
        maxH: variant?.maxH || 10,
      }
    })
    const xs = items.map((it, idx) => {
      const cfg = WIDGET_CATALOG[it.type]
      const variant = cfg?.variants.find(v => v.id === it.variant) || cfg?.variants[0]
      return {
        i: it.i,
        x: 0, y: idx * 4, w: 4, h: variant?.defaultH || 4,
        minH: variant?.minH || 2,
      }
    })
    return { lg, md: lg, sm: lg, xs, xxs: xs }
  }, [items])

  const existingTypes = items.map(it => it.type)
  const { width: measuredWidth, containerRef } = useContainerWidth({ initialWidth: 1200 })

  if (loading) {
    return (
      <div style={{ padding: 80, textAlign: 'center', color: 'var(--muted)', fontSize: 14, fontFamily: FONT_BODY }}>
        Cargando dashboard...
      </div>
    )
  }

  return (
    <div ref={containerRef} style={{ fontFamily: FONT_BODY, width: '100%', maxWidth: 1400, margin: '0 auto' }}>
      <style>{GRID_STYLES}</style>

      {/* ── Top toolbar ── */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        marginBottom: 14, flexWrap: 'wrap', gap: 12,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <h1 style={{
            fontFamily: FONT_DISPLAY, fontSize: 22, fontWeight: 800,
            color: 'var(--text)', letterSpacing: '-0.03em', margin: 0,
          }}>
            Dashboard
          </h1>
          {editing && (
            <span style={{
              fontSize: 11, fontWeight: 700, color: PURPLE,
              background: pa(0.12), border: `1px solid ${pa(0.3)}`,
              borderRadius: 20, padding: '3px 10px', display: 'flex', alignItems: 'center', gap: 4,
            }}>
              <Pencil size={10} /> Modo edición
            </span>
          )}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {editing && (
            <>
              <button onClick={() => setPickerOpen(true)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 7,
                  background: PURPLE, color: '#fff', border: 'none', borderRadius: 10,
                  padding: '9px 14px', fontSize: 13, fontWeight: 600,
                  cursor: 'pointer', fontFamily: FONT_BODY, boxShadow: `0 4px 14px ${pa(0.35)}`,
                }}
              >
                <Plus size={14} strokeWidth={2.5} /> Añadir widget
              </button>
              <button onClick={handleResetLayout}
                style={{
                  display: 'flex', alignItems: 'center', gap: 7,
                  background: 'var(--bg2)', color: 'var(--text)', border: '1px solid var(--border)',
                  borderRadius: 10, padding: '9px 12px', fontSize: 12.5, fontWeight: 600,
                  cursor: 'pointer', fontFamily: FONT_BODY,
                }}
                title="Restaurar diseño por defecto"
              >
                <RotateCcw size={13} /> Restaurar
              </button>
            </>
          )}

          <button onClick={() => setEditing(e => !e)}
            style={{
              display: 'flex', alignItems: 'center', gap: 7,
              background: editing ? '#10b981' : 'var(--bg2)',
              color: editing ? '#fff' : 'var(--text)',
              border: `1px solid ${editing ? '#10b981' : 'var(--border)'}`,
              borderRadius: 10, padding: '9px 14px', fontSize: 13, fontWeight: 600,
              cursor: 'pointer', fontFamily: FONT_BODY,
              boxShadow: editing ? '0 4px 14px rgba(16,185,129,0.3)' : 'none',
            }}
          >
            {editing ? <><Check size={14} strokeWidth={2.5} /> Listo</> : <><Pencil size={13} /> Editar dashboard</>}
          </button>
        </div>
      </div>

      {/* ── View tabs ── */}
      <ViewTabs
        views={views}
        activeViewId={activeViewId}
        onSelect={setActiveView}
        onRename={renameView}
        onDelete={deleteView}
        onDuplicate={duplicateView}
        onSetDefault={setAsDefault}
        onExport={handleExportView}
        onCreate={() => setNewViewOpen(true)}
        onImport={() => setImportOpen(true)}
        syncing={syncing}
        syncError={syncError}
      />

      {/* ── Edit hint banner ── */}
      {editing && (
        <div style={{
          background: pa(0.06), border: `1px solid ${pa(0.18)}`, borderRadius: 12,
          padding: '10px 14px', marginBottom: 14, fontSize: 12.5, color: 'var(--muted)',
          display: 'flex', alignItems: 'center', gap: 8,
        }}>
          <span style={{ color: PURPLE, fontWeight: 600 }}>💡 Modo edición activo:</span>
          arrastra desde la barra superior para mover · estira desde cualquier borde o esquina para redimensionar · cambia la versión o elimina con los botones de la esquina superior derecha.
        </div>
      )}

      {/* ── Grid or empty state ── */}
      {items.length === 0 ? (
        <EmptyDashboard onAdd={() => setPickerOpen(true)} onReset={handleResetLayout} />
      ) : (
        <Responsive
          className="layout"
          width={measuredWidth}
          layouts={layouts}
          breakpoints={{ lg: 1200, md: 996, sm: 768, xs: 480, xxs: 0 }}
          cols={{ lg: 12, md: 12, sm: 12, xs: 4, xxs: 4 }}
          rowHeight={56}
          margin={[12, 12]}
          containerPadding={[0, 0]}
          onLayoutChange={onLayoutChange}
          dragConfig={{ enabled: editing, handle: '.adflow-drag-handle' }}
          resizeConfig={{ enabled: editing, handles: ['s', 'w', 'e', 'n', 'sw', 'nw', 'se', 'ne'] }}
        >
          {items.map(it => (
            <div key={it.i}>
              <WidgetCard
                widget={it}
                data={data}
                editing={editing}
                onRemove={() => handleRemoveWidget(it.i)}
                onChangeVariant={(v) => handleChangeVariant(it.i, v)}
                widgetCatalog={widgetCatalog}
                WidgetRenderer={WidgetRenderer}
              />
            </div>
          ))}
        </Responsive>
      )}

      {/* ── Add Widget secondary CTA ── */}
      {!editing && items.length > 0 && (
        <div style={{ marginTop: 24, display: 'flex', justifyContent: 'center' }}>
          <button onClick={() => { setEditing(true); setPickerOpen(true) }}
            style={{
              display: 'flex', alignItems: 'center', gap: 7,
              background: 'transparent', border: `1px dashed ${pa(0.4)}`, borderRadius: 10,
              padding: '10px 18px', fontSize: 13, fontWeight: 600,
              color: PURPLE, cursor: 'pointer', fontFamily: FONT_BODY,
            }}
          >
            <Plus size={14} strokeWidth={2.5} /> Añadir más widgets
          </button>
        </div>
      )}

      {/* ── Modals ── */}
      <WidgetPicker
        open={pickerOpen}
        onClose={() => setPickerOpen(false)}
        onAdd={(type, variant) => { handleAddWidget(type, variant); setPickerOpen(false) }}
        existingTypes={existingTypes}
        widgetCatalog={widgetCatalog}
        widgetCategories={widgetCategories}
        accentColor={accentColor}
        accentAlpha={accentAlpha}
      />
      <NewViewModal
        open={newViewOpen}
        onClose={() => setNewViewOpen(false)}
        onCreate={(name, items) => { createView(name, items); setNewViewOpen(false) }}
      />
      <ExportViewModal
        open={exportOpen}
        onClose={() => setExportOpen(false)}
        json={exportPayload.json}
        viewName={exportPayload.name}
      />
      <ImportViewModal
        open={importOpen}
        onClose={() => setImportOpen(false)}
        onImport={importView}
      />
    </div>
  )
}
