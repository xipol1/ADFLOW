import { useState, useEffect, useRef, useCallback } from 'react'
import apiService from '../../../../../services/api'
import { getDefaultLayout } from './WidgetRegistry'

const STORAGE_KEY = 'channelad-dashboard-views-v1'
const SAVE_DEBOUNCE_MS = 800

const newId = () => 'view_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 8)

// ─── Built-in presets (loaded into "create new view" picker) ──────────────────
export const PRESETS = {
  default: {
    name: 'Vista por defecto',
    icon: '🏠',
    description: 'KPIs, gasto, campañas y acciones — el dashboard estándar',
    items: () => getDefaultLayout(),
  },
  marketing: {
    name: 'Marketing',
    icon: '📣',
    description: 'Foco en CTR, vistas, top canales y calendario',
    items: () => [
      { i: 'm-w', type: 'WELCOME', variant: 'compact', x: 0, y: 0, w: 6, h: 2 },
      { i: 'm-q', type: 'QUICK_ACTIONS', variant: 'standard', x: 6, y: 0, w: 6, h: 2 },
      { i: 'm-v', type: 'KPI_VIEWS', variant: 'compact', x: 0, y: 2, w: 3, h: 2 },
      { i: 'm-c', type: 'KPI_CLICKS', variant: 'compact', x: 3, y: 2, w: 3, h: 2 },
      { i: 'm-ct', type: 'KPI_CTR', variant: 'compact', x: 6, y: 2, w: 3, h: 2 },
      { i: 'm-r', type: 'KPI_ROI', variant: 'compact', x: 9, y: 2, w: 3, h: 2 },
      { i: 'm-tc', type: 'TOP_CHANNELS', variant: 'standard', x: 0, y: 4, w: 6, h: 4 },
      { i: 'm-cal', type: 'CAMPAIGN_CALENDAR', variant: 'standard', x: 6, y: 4, w: 6, h: 5 },
      { i: 'm-act', type: 'ACTIVITY_FEED', variant: 'standard', x: 0, y: 8, w: 6, h: 4 },
    ],
  },
  performance: {
    name: 'Performance',
    icon: '📊',
    description: 'Análisis profundo: gráficos, tabla completa y métricas detalladas',
    items: () => [
      { i: 'p-w', type: 'WELCOME', variant: 'standard', x: 0, y: 0, w: 12, h: 2 },
      { i: 'p-spend', type: 'KPI_SPEND', variant: 'detailed', x: 0, y: 2, w: 6, h: 4 },
      { i: 'p-ctr', type: 'KPI_CTR', variant: 'standard', x: 6, y: 2, w: 3, h: 3 },
      { i: 'p-roi', type: 'KPI_ROI', variant: 'standard', x: 9, y: 2, w: 3, h: 3 },
      { i: 'p-c', type: 'KPI_CAMPAIGNS', variant: 'compact', x: 6, y: 5, w: 3, h: 2 },
      { i: 'p-vw', type: 'KPI_VIEWS', variant: 'compact', x: 9, y: 5, w: 3, h: 2 },
      { i: 'p-chart', type: 'SPEND_CHART', variant: 'line', x: 0, y: 7, w: 7, h: 4 },
      { i: 'p-don', type: 'BUDGET_DONUT', variant: 'standard', x: 7, y: 7, w: 5, h: 4 },
      { i: 'p-tab', type: 'CAMPAIGNS_TABLE', variant: 'full', x: 0, y: 11, w: 12, h: 5 },
    ],
  },
  finanzas: {
    name: 'Finanzas',
    icon: '💰',
    description: 'Gasto, presupuesto, ROI y campañas pendientes de pago',
    items: () => [
      { i: 'f-w', type: 'WELCOME', variant: 'compact', x: 0, y: 0, w: 8, h: 2 },
      { i: 'f-roi', type: 'KPI_ROI', variant: 'compact', x: 8, y: 0, w: 4, h: 2 },
      { i: 'f-spend', type: 'KPI_SPEND', variant: 'detailed', x: 0, y: 2, w: 6, h: 4 },
      { i: 'f-don', type: 'BUDGET_DONUT', variant: 'standard', x: 6, y: 2, w: 6, h: 4 },
      { i: 'f-chart', type: 'SPEND_CHART', variant: 'bar', x: 0, y: 6, w: 8, h: 4 },
      { i: 'f-act', type: 'ACTION_ITEMS', variant: 'list', x: 8, y: 6, w: 4, h: 4 },
      { i: 'f-tab', type: 'CAMPAIGNS_TABLE', variant: 'compact', x: 0, y: 10, w: 12, h: 4 },
    ],
  },
  minimal: {
    name: 'Minimalista',
    icon: '✨',
    description: 'Solo lo esencial: 4 KPIs y campañas recientes',
    items: () => [
      { i: 'mn-s', type: 'KPI_SPEND', variant: 'compact', x: 0, y: 0, w: 3, h: 2 },
      { i: 'mn-c', type: 'KPI_CAMPAIGNS', variant: 'compact', x: 3, y: 0, w: 3, h: 2 },
      { i: 'mn-ct', type: 'KPI_CTR', variant: 'compact', x: 6, y: 0, w: 3, h: 2 },
      { i: 'mn-v', type: 'KPI_VIEWS', variant: 'compact', x: 9, y: 0, w: 3, h: 2 },
      { i: 'mn-tab', type: 'CAMPAIGNS_TABLE', variant: 'full', x: 0, y: 2, w: 12, h: 5 },
    ],
  },
}

// ─── localStorage fallback helpers ────────────────────────────────────────────
function loadFromLocal() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw)
    if (!parsed || !Array.isArray(parsed.views)) return null
    return parsed
  } catch { return null }
}

function saveToLocal(views, activeViewId) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify({ views, activeViewId })) } catch {}
}

// ─── Migrate legacy single-layout key into a default view ─────────────────────
function migrateLegacyLayout() {
  try {
    const legacy = localStorage.getItem('channelad-dashboard-layout-v1')
    if (!legacy) return null
    const items = JSON.parse(legacy)
    if (!Array.isArray(items) || items.length === 0) return null
    const view = {
      id: newId(),
      name: 'Mi dashboard',
      items,
      isDefault: true,
      updatedAt: new Date().toISOString(),
    }
    localStorage.removeItem('channelad-dashboard-layout-v1')
    return { views: [view], activeViewId: view.id }
  } catch { return null }
}

// ─── Hook ─────────────────────────────────────────────────────────────────────
export default function useDashboardViews() {
  const [views, setViews] = useState([])
  const [activeViewId, setActiveViewIdState] = useState(null)
  const [loading, setLoading] = useState(true)
  const [syncing, setSyncing] = useState(false)
  const [syncError, setSyncError] = useState(null)
  const saveTimerRef = useRef(null)
  const skipNextSaveRef = useRef(false)

  // ─── Initial load: try backend, fallback to localStorage ─────────────────────
  useEffect(() => {
    let mounted = true
    const load = async () => {
      try {
        const res = await apiService.getDashboardViews().catch(() => null)
        if (!mounted) return

        if (res?.success && Array.isArray(res.data?.views) && res.data.views.length > 0) {
          skipNextSaveRef.current = true
          setViews(res.data.views)
          setActiveViewIdState(res.data.activeViewId || res.data.views[0].id)
          saveToLocal(res.data.views, res.data.activeViewId)
        } else {
          // Backend empty — try local cache or migrate legacy layout
          const local = loadFromLocal() || migrateLegacyLayout()
          if (local && local.views.length > 0) {
            skipNextSaveRef.current = true
            setViews(local.views)
            setActiveViewIdState(local.activeViewId || local.views[0].id)
          } else {
            // Bootstrap with default view
            const view = {
              id: newId(),
              name: 'Mi dashboard',
              items: getDefaultLayout(),
              isDefault: true,
              updatedAt: new Date().toISOString(),
            }
            setViews([view])
            setActiveViewIdState(view.id)
          }
        }
      } catch (e) {
        console.error('useDashboardViews.load failed:', e)
        const local = loadFromLocal()
        if (local && mounted) {
          skipNextSaveRef.current = true
          setViews(local.views)
          setActiveViewIdState(local.activeViewId)
        }
      }
      if (mounted) setLoading(false)
    }
    load()
    return () => { mounted = false }
  }, [])

  // ─── Debounced backend sync on every state change ────────────────────────────
  useEffect(() => {
    if (loading || views.length === 0) return
    saveToLocal(views, activeViewId)

    if (skipNextSaveRef.current) {
      skipNextSaveRef.current = false
      return
    }

    if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
    saveTimerRef.current = setTimeout(async () => {
      setSyncing(true)
      setSyncError(null)
      try {
        const res = await apiService.saveDashboardViews(views, activeViewId)
        if (!res?.success) setSyncError(res?.message || 'Error al sincronizar')
      } catch (e) {
        setSyncError(e?.message || 'Error de red')
      } finally {
        setSyncing(false)
      }
    }, SAVE_DEBOUNCE_MS)

    return () => { if (saveTimerRef.current) clearTimeout(saveTimerRef.current) }
  }, [views, activeViewId, loading])

  // ─── View operations ─────────────────────────────────────────────────────────
  const activeView = views.find(v => v.id === activeViewId) || views[0] || null

  const updateActiveItems = useCallback((itemsOrUpdater) => {
    setViews(prev => prev.map(v => {
      if (v.id !== activeViewId) return v
      const next = typeof itemsOrUpdater === 'function' ? itemsOrUpdater(v.items) : itemsOrUpdater
      return { ...v, items: next, updatedAt: new Date().toISOString() }
    }))
  }, [activeViewId])

  const createView = useCallback((name, items = [], { setActive = true } = {}) => {
    const view = {
      id: newId(),
      name: (name || 'Nueva vista').trim().slice(0, 60) || 'Nueva vista',
      items: Array.isArray(items) ? items : [],
      isDefault: false,
      updatedAt: new Date().toISOString(),
    }
    setViews(prev => [...prev, view])
    if (setActive) setActiveViewIdState(view.id)
    return view.id
  }, [])

  const renameView = useCallback((viewId, name) => {
    setViews(prev => prev.map(v => v.id === viewId
      ? { ...v, name: (name || '').trim().slice(0, 60) || v.name, updatedAt: new Date().toISOString() }
      : v))
  }, [])

  const deleteView = useCallback((viewId) => {
    setViews(prev => {
      if (prev.length <= 1) return prev // never delete last view
      const next = prev.filter(v => v.id !== viewId)
      // If deleted view was active, switch to first remaining
      if (viewId === activeViewId) {
        const fallback = next.find(v => v.isDefault) || next[0]
        setActiveViewIdState(fallback.id)
      }
      // If we just deleted the only default, mark first as default
      if (!next.find(v => v.isDefault)) next[0].isDefault = true
      return next
    })
  }, [activeViewId])

  const duplicateView = useCallback((viewId) => {
    setViews(prev => {
      const original = prev.find(v => v.id === viewId)
      if (!original) return prev
      const copy = {
        ...original,
        id: newId(),
        name: `${original.name} (copia)`.slice(0, 60),
        isDefault: false,
        items: original.items.map(it => ({ ...it, i: 'w-' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6) })),
        updatedAt: new Date().toISOString(),
      }
      setActiveViewIdState(copy.id)
      return [...prev, copy]
    })
  }, [])

  const setActiveView = useCallback((viewId) => {
    setActiveViewIdState(viewId)
  }, [])

  const setAsDefault = useCallback((viewId) => {
    setViews(prev => prev.map(v => ({ ...v, isDefault: v.id === viewId })))
  }, [])

  // ─── Export / Import ─────────────────────────────────────────────────────────
  const exportView = useCallback((viewId) => {
    const view = views.find(v => v.id === viewId)
    if (!view) return null
    const payload = {
      __format: 'channelad-dashboard-template',
      __version: 1,
      name: view.name,
      items: view.items.map(({ i, type, variant, x, y, w, h }) => ({ i, type, variant, x, y, w, h })),
      exportedAt: new Date().toISOString(),
    }
    return JSON.stringify(payload, null, 2)
  }, [views])

  const importView = useCallback((jsonString) => {
    let parsed
    try { parsed = JSON.parse(jsonString) }
    catch { return { success: false, error: 'JSON inválido' } }

    if (parsed.__format !== 'channelad-dashboard-template') {
      return { success: false, error: 'No es un template válido de Channelad' }
    }
    if (!Array.isArray(parsed.items)) {
      return { success: false, error: 'El template no contiene widgets' }
    }
    const items = parsed.items.map((it, idx) => ({
      ...it,
      i: 'w-import-' + Date.now().toString(36) + '-' + idx,
    }))
    const id = createView(parsed.name || 'Vista importada', items, { setActive: true })
    return { success: true, viewId: id }
  }, [createView])

  return {
    views,
    activeView,
    activeViewId,
    loading,
    syncing,
    syncError,
    updateActiveItems,
    createView,
    renameView,
    deleteView,
    duplicateView,
    setActiveView,
    setAsDefault,
    exportView,
    importView,
  }
}
