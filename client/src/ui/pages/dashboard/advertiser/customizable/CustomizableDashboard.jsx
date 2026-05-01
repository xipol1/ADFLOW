import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { Responsive, useContainerWidth } from 'react-grid-layout'
import {
  Pencil, Check, Plus, X, Settings2, RotateCcw,
  ChevronDown, GripVertical, Layout,
} from 'lucide-react'
import {
  WIDGET_CATALOG, getDefaultLayout, generateWidgetId,
} from './WidgetRegistry'
import WidgetRenderer from './widgets'
import WidgetPicker from './WidgetPicker'
import ViewTabs from './ViewTabs'
import { NewViewModal, ExportViewModal, ImportViewModal } from './ViewModals'
import useDashboardViews from './useDashboardViews'
import { FONT_BODY, FONT_DISPLAY } from '../../../../theme/tokens'

const PURPLE = 'var(--accent, #8B5CF6)'
const pa = (o) => `rgba(139,92,246,${o})`

// ─── Inline CSS for react-grid-layout ─────────────────────────────────────────
const GRID_STYLES = `
.react-grid-layout { position: relative; transition: height 200ms ease; }
.react-grid-item { transition: transform 200ms ease, width 200ms ease, height 200ms ease, opacity .15s; }
.react-grid-item.cssTransforms { transition-property: transform, width, height; }
.react-grid-item.resizing { z-index: 1; opacity: 0.92; transition: none; }
.react-grid-item.react-draggable-dragging { transition: none; z-index: 100; opacity: 0.92; cursor: grabbing !important; }
.react-grid-item.react-grid-placeholder {
  background: ${pa(0.18)};
  border: 2px dashed ${pa(0.5)};
  border-radius: 16px;
  opacity: 1;
  transition-duration: 100ms;
  z-index: 2;
  user-select: none;
}
.react-grid-item > .react-resizable-handle {
  position: absolute;
  width: 22px; height: 22px;
  bottom: 4px; right: 4px;
  cursor: se-resize;
  background: transparent;
  z-index: 3;
}
.react-grid-item > .react-resizable-handle::after {
  content: "";
  position: absolute;
  right: 6px; bottom: 6px;
  width: 8px; height: 8px;
  border-right: 2.5px solid ${pa(0.6)};
  border-bottom: 2.5px solid ${pa(0.6)};
  border-radius: 0 0 2px 0;
}
.adflow-widget-card {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 16px;
  padding: 18px;
  height: 100%;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  transition: border-color .15s, box-shadow .15s;
  position: relative;
}
.adflow-widget-card.editing {
  border-color: ${pa(0.35)};
  cursor: grab;
}
.adflow-widget-card.editing:hover { box-shadow: 0 6px 24px ${pa(0.18)}; }
.adflow-widget-card.editing:active { cursor: grabbing; }
.adflow-widget-controls { opacity: 0; transition: opacity .15s; }
.adflow-widget-card.editing .adflow-widget-controls { opacity: 1; }
.adflow-widget-card .adflow-widget-content { flex: 1; min-height: 0; overflow: auto; }
@keyframes editPulse { 0%,100%{ box-shadow: 0 0 0 0 ${pa(0.0)} } 50% { box-shadow: 0 0 0 4px ${pa(0.08)} } }
.adflow-widget-card.editing { animation: editPulse 2s ease infinite; }
`

// ─── Widget Card (wrapper around each widget) ─────────────────────────────────
function WidgetCard({ widget, data, editing, onRemove, onChangeVariant }) {
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef(null)
  const cfg = WIDGET_CATALOG[widget.type]

  useEffect(() => {
    if (!menuOpen) return
    const handler = (e) => { if (menuRef.current && !menuRef.current.contains(e.target)) setMenuOpen(false) }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [menuOpen])

  if (!cfg) return null

  return (
    <div className={`adflow-widget-card ${editing ? 'editing' : ''}`}>
      {editing && (
        <div className="adflow-widget-controls" style={{
          position: 'absolute', top: 8, right: 8, zIndex: 5,
          display: 'flex', alignItems: 'center', gap: 4,
        }}>
          {cfg.variants.length > 1 && (
            <div ref={menuRef} style={{ position: 'relative' }}>
              <button
                onMouseDown={(e) => e.stopPropagation()}
                onClick={(e) => { e.stopPropagation(); setMenuOpen(o => !o) }}
                style={{
                  background: 'var(--bg2)', border: '1px solid var(--border)',
                  borderRadius: 8, height: 28, padding: '0 9px',
                  display: 'flex', alignItems: 'center', gap: 4, cursor: 'pointer',
                  fontSize: 11, fontWeight: 600, color: 'var(--text)', fontFamily: FONT_BODY,
                }}
                title="Cambiar versión"
              >
                <Settings2 size={12} />
                {cfg.variants.find(v => v.id === widget.variant)?.name || 'Versión'}
                <ChevronDown size={11} />
              </button>
              {menuOpen && (
                <div style={{
                  position: 'absolute', top: 32, right: 0,
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
              width: 28, height: 28, borderRadius: 8,
              background: 'var(--bg2)', border: '1px solid var(--border)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer', color: '#ef4444',
            }}
            title="Eliminar widget"
            onMouseEnter={(e) => { e.currentTarget.style.borderColor = '#ef4444'; e.currentTarget.style.background = 'rgba(239,68,68,0.1)' }}
            onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.background = 'var(--bg2)' }}
          >
            <X size={13} strokeWidth={2.5} />
          </button>
        </div>
      )}

      {editing && (
        <div style={{
          position: 'absolute', top: 6, left: 6, zIndex: 4,
          width: 24, height: 24, display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: 'var(--muted)', pointerEvents: 'none',
        }}>
          <GripVertical size={14} />
        </div>
      )}

      <div className="adflow-widget-content" style={{ pointerEvents: editing ? 'none' : 'auto' }}>
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
export default function CustomizableDashboard({ data }) {
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
  } = useDashboardViews()

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
    <div ref={containerRef} style={{ fontFamily: FONT_BODY, maxWidth: 1400, margin: '0 auto' }}>
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
          arrastra los widgets para moverlos, agarra la esquina inferior derecha para redimensionar, usa el menú para cambiar la versión, o pulsa la X para eliminar.
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
          rowHeight={62}
          margin={[14, 14]}
          containerPadding={[0, 0]}
          isDraggable={editing}
          isResizable={editing}
          onLayoutChange={onLayoutChange}
          draggableCancel=".adflow-widget-controls,.adflow-widget-controls *,textarea,button,a,input"
          compactType="vertical"
          preventCollision={false}
          useCSSTransforms={true}
        >
          {items.map(it => (
            <div key={it.i}>
              <WidgetCard
                widget={it}
                data={data}
                editing={editing}
                onRemove={() => handleRemoveWidget(it.i)}
                onChangeVariant={(v) => handleChangeVariant(it.i, v)}
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
