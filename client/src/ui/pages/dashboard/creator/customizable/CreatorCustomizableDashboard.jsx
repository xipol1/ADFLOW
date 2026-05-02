import React from 'react'
import CustomizableDashboard from '../../advertiser/customizable/CustomizableDashboard'
import useDashboardViewsHook from '../../advertiser/customizable/useDashboardViews'
import {
  WIDGET_CATALOG, WIDGET_CATEGORIES, getDefaultLayout, generateWidgetId,
} from './CreatorWidgetRegistry'
import CreatorWidgetRenderer from './creatorWidgets'

const CREATOR_STORAGE_KEY = 'channelad-creator-dashboard-views-v1'
const ACCENT = 'var(--accent, #22c55e)'
const ga = (o) => `rgba(34,197,94,${o})`

/**
 * Creator-flavoured wrapper around CustomizableDashboard.
 *
 * Reuses the entire grid + edit-mode + view-tabs infrastructure built for
 * the advertiser dashboard, but injects the creator-specific widget
 * catalog, renderer, default layout, and a separate localStorage key so
 * the two dashboards never share state.
 *
 * Backend sync is OFF for creators in this MVP — the Usuario.dashboardViews
 * field is currently advertiser-only. When/if a creator field is added,
 * pass `syncBackend: true` to the hook and it will persist.
 */
function useCreatorViews() {
  return useDashboardViewsHook({
    storageKey: CREATOR_STORAGE_KEY,
    getDefaultLayout,
    syncBackend: false,
  })
}

export default function CreatorCustomizableDashboard({ data }) {
  return (
    <CustomizableDashboard
      data={data}
      widgetCatalog={WIDGET_CATALOG}
      widgetCategories={WIDGET_CATEGORIES}
      WidgetRenderer={CreatorWidgetRenderer}
      getDefaultLayout={getDefaultLayout}
      generateWidgetId={generateWidgetId}
      useViewsHook={useCreatorViews}
      accentColor={ACCENT}
      accentAlpha={ga}
    />
  )
}
