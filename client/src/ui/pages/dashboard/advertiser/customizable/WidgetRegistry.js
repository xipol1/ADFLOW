import {
  DollarSign, Megaphone, Activity, Eye, MousePointerClick,
  TrendingUp, BarChart3, LineChart, PieChart, Table2,
  AlertTriangle, Zap, CalendarDays, Users, Target,
  StickyNote, Layout, Sparkles, MessageSquare, Clock,
} from 'lucide-react'

export const WIDGET_CATEGORIES = {
  METRICS: { id: 'METRICS', label: 'Métricas', icon: Activity },
  CHARTS: { id: 'CHARTS', label: 'Gráficos', icon: BarChart3 },
  TABLES: { id: 'TABLES', label: 'Tablas', icon: Table2 },
  TOOLS: { id: 'TOOLS', label: 'Herramientas', icon: Zap },
}

export const WIDGET_TYPES = {
  KPI_SPEND: 'KPI_SPEND',
  KPI_CAMPAIGNS: 'KPI_CAMPAIGNS',
  KPI_CTR: 'KPI_CTR',
  KPI_VIEWS: 'KPI_VIEWS',
  KPI_CLICKS: 'KPI_CLICKS',
  KPI_ROI: 'KPI_ROI',
  SPEND_CHART: 'SPEND_CHART',
  CAMPAIGNS_TABLE: 'CAMPAIGNS_TABLE',
  ACTION_ITEMS: 'ACTION_ITEMS',
  QUICK_ACTIONS: 'QUICK_ACTIONS',
  WELCOME: 'WELCOME',
  ACTIVITY_FEED: 'ACTIVITY_FEED',
  TOP_CHANNELS: 'TOP_CHANNELS',
  BUDGET_DONUT: 'BUDGET_DONUT',
  NOTES: 'NOTES',
  CAMPAIGN_CALENDAR: 'CAMPAIGN_CALENDAR',
}

export const VARIANT_IDS = {
  COMPACT: 'compact',
  STANDARD: 'standard',
  DETAILED: 'detailed',
  BAR: 'bar',
  LINE: 'line',
  MINI: 'mini',
  CARDS: 'cards',
  LIST: 'list',
  FULL: 'full',
}

export const WIDGET_CATALOG = {
  [WIDGET_TYPES.WELCOME]: {
    type: WIDGET_TYPES.WELCOME,
    name: 'Bienvenida',
    description: 'Saludo personalizado con resumen del día',
    icon: Sparkles,
    category: 'TOOLS',
    variants: [
      { id: 'standard', name: 'Estándar', defaultW: 12, defaultH: 2, minW: 6, minH: 2, maxW: 12, maxH: 3 },
      { id: 'compact', name: 'Compacto', defaultW: 6, defaultH: 2, minW: 4, minH: 2, maxW: 8, maxH: 2 },
    ],
    defaultVariant: 'standard',
  },

  [WIDGET_TYPES.KPI_SPEND]: {
    type: WIDGET_TYPES.KPI_SPEND,
    name: 'Gasto mensual',
    description: 'Gasto acumulado del mes actual',
    icon: DollarSign,
    category: 'METRICS',
    variants: [
      { id: 'compact', name: 'Compacto', defaultW: 3, defaultH: 2, minW: 2, minH: 2, maxW: 4, maxH: 2 },
      { id: 'standard', name: 'Estándar', defaultW: 3, defaultH: 3, minW: 3, minH: 3, maxW: 6, maxH: 4 },
      { id: 'detailed', name: 'Detallado', defaultW: 6, defaultH: 4, minW: 4, minH: 3, maxW: 8, maxH: 5 },
    ],
    defaultVariant: 'compact',
  },

  [WIDGET_TYPES.KPI_CAMPAIGNS]: {
    type: WIDGET_TYPES.KPI_CAMPAIGNS,
    name: 'Campañas activas',
    description: 'Número de campañas en curso',
    icon: Megaphone,
    category: 'METRICS',
    variants: [
      { id: 'compact', name: 'Compacto', defaultW: 3, defaultH: 2, minW: 2, minH: 2, maxW: 4, maxH: 2 },
      { id: 'standard', name: 'Estándar', defaultW: 3, defaultH: 3, minW: 3, minH: 3, maxW: 6, maxH: 4 },
      { id: 'detailed', name: 'Detallado', defaultW: 6, defaultH: 4, minW: 4, minH: 3, maxW: 8, maxH: 5 },
    ],
    defaultVariant: 'compact',
  },

  [WIDGET_TYPES.KPI_CTR]: {
    type: WIDGET_TYPES.KPI_CTR,
    name: 'CTR promedio',
    description: 'Click-through rate de tus campañas',
    icon: Activity,
    category: 'METRICS',
    variants: [
      { id: 'compact', name: 'Compacto', defaultW: 3, defaultH: 2, minW: 2, minH: 2, maxW: 4, maxH: 2 },
      { id: 'standard', name: 'Estándar', defaultW: 3, defaultH: 3, minW: 3, minH: 3, maxW: 6, maxH: 4 },
    ],
    defaultVariant: 'compact',
  },

  [WIDGET_TYPES.KPI_VIEWS]: {
    type: WIDGET_TYPES.KPI_VIEWS,
    name: 'Vistas totales',
    description: 'Impresiones acumuladas de todas las campañas',
    icon: Eye,
    category: 'METRICS',
    variants: [
      { id: 'compact', name: 'Compacto', defaultW: 3, defaultH: 2, minW: 2, minH: 2, maxW: 4, maxH: 2 },
      { id: 'standard', name: 'Estándar', defaultW: 3, defaultH: 3, minW: 3, minH: 3, maxW: 6, maxH: 4 },
    ],
    defaultVariant: 'compact',
  },

  [WIDGET_TYPES.KPI_CLICKS]: {
    type: WIDGET_TYPES.KPI_CLICKS,
    name: 'Clicks totales',
    description: 'Total de clicks en tus anuncios',
    icon: MousePointerClick,
    category: 'METRICS',
    variants: [
      { id: 'compact', name: 'Compacto', defaultW: 3, defaultH: 2, minW: 2, minH: 2, maxW: 4, maxH: 2 },
      { id: 'standard', name: 'Estándar', defaultW: 3, defaultH: 3, minW: 3, minH: 3, maxW: 6, maxH: 4 },
    ],
    defaultVariant: 'compact',
  },

  [WIDGET_TYPES.KPI_ROI]: {
    type: WIDGET_TYPES.KPI_ROI,
    name: 'ROI estimado',
    description: 'Retorno de inversión estimado',
    icon: TrendingUp,
    category: 'METRICS',
    variants: [
      { id: 'compact', name: 'Compacto', defaultW: 3, defaultH: 2, minW: 2, minH: 2, maxW: 4, maxH: 2 },
      { id: 'standard', name: 'Estándar', defaultW: 3, defaultH: 3, minW: 3, minH: 3, maxW: 6, maxH: 4 },
    ],
    defaultVariant: 'compact',
  },

  [WIDGET_TYPES.SPEND_CHART]: {
    type: WIDGET_TYPES.SPEND_CHART,
    name: 'Gráfico de gasto',
    description: 'Evolución del gasto por periodo',
    icon: BarChart3,
    category: 'CHARTS',
    variants: [
      { id: 'bar', name: 'Barras', defaultW: 6, defaultH: 4, minW: 4, minH: 3, maxW: 12, maxH: 6 },
      { id: 'line', name: 'Líneas', defaultW: 6, defaultH: 4, minW: 4, minH: 3, maxW: 12, maxH: 6 },
      { id: 'mini', name: 'Mini', defaultW: 3, defaultH: 3, minW: 3, minH: 2, maxW: 6, maxH: 4 },
    ],
    defaultVariant: 'bar',
  },

  [WIDGET_TYPES.CAMPAIGNS_TABLE]: {
    type: WIDGET_TYPES.CAMPAIGNS_TABLE,
    name: 'Campañas recientes',
    description: 'Lista de campañas con métricas clave',
    icon: Table2,
    category: 'TABLES',
    variants: [
      { id: 'full', name: 'Tabla completa', defaultW: 6, defaultH: 5, minW: 5, minH: 4, maxW: 12, maxH: 8 },
      { id: 'compact', name: 'Lista compacta', defaultW: 4, defaultH: 4, minW: 3, minH: 3, maxW: 8, maxH: 6 },
      { id: 'cards', name: 'Tarjetas', defaultW: 6, defaultH: 5, minW: 4, minH: 4, maxW: 12, maxH: 8 },
    ],
    defaultVariant: 'full',
  },

  [WIDGET_TYPES.ACTION_ITEMS]: {
    type: WIDGET_TYPES.ACTION_ITEMS,
    name: 'Requiere atención',
    description: 'Tareas pendientes y alertas',
    icon: AlertTriangle,
    category: 'TOOLS',
    variants: [
      { id: 'cards', name: 'Tarjetas', defaultW: 6, defaultH: 4, minW: 4, minH: 3, maxW: 12, maxH: 6 },
      { id: 'list', name: 'Lista', defaultW: 4, defaultH: 3, minW: 3, minH: 2, maxW: 8, maxH: 5 },
      { id: 'compact', name: 'Compacto', defaultW: 3, defaultH: 2, minW: 3, minH: 2, maxW: 6, maxH: 3 },
    ],
    defaultVariant: 'cards',
  },

  [WIDGET_TYPES.QUICK_ACTIONS]: {
    type: WIDGET_TYPES.QUICK_ACTIONS,
    name: 'Acciones rápidas',
    description: 'Accesos directos a funciones clave',
    icon: Zap,
    category: 'TOOLS',
    variants: [
      { id: 'standard', name: 'Botones', defaultW: 6, defaultH: 2, minW: 4, minH: 2, maxW: 12, maxH: 3 },
      { id: 'compact', name: 'Iconos', defaultW: 3, defaultH: 2, minW: 2, minH: 2, maxW: 6, maxH: 2 },
    ],
    defaultVariant: 'standard',
  },

  [WIDGET_TYPES.ACTIVITY_FEED]: {
    type: WIDGET_TYPES.ACTIVITY_FEED,
    name: 'Actividad reciente',
    description: 'Timeline de actividad en la plataforma',
    icon: Clock,
    category: 'TOOLS',
    variants: [
      { id: 'standard', name: 'Timeline', defaultW: 4, defaultH: 5, minW: 3, minH: 3, maxW: 6, maxH: 8 },
      { id: 'compact', name: 'Compacto', defaultW: 3, defaultH: 3, minW: 3, minH: 2, maxW: 6, maxH: 5 },
    ],
    defaultVariant: 'standard',
  },

  [WIDGET_TYPES.TOP_CHANNELS]: {
    type: WIDGET_TYPES.TOP_CHANNELS,
    name: 'Top canales',
    description: 'Canales con mejor rendimiento',
    icon: Users,
    category: 'TABLES',
    variants: [
      { id: 'standard', name: 'Tabla', defaultW: 6, defaultH: 4, minW: 4, minH: 3, maxW: 12, maxH: 6 },
      { id: 'compact', name: 'Lista', defaultW: 3, defaultH: 4, minW: 3, minH: 3, maxW: 6, maxH: 6 },
    ],
    defaultVariant: 'standard',
  },

  [WIDGET_TYPES.BUDGET_DONUT]: {
    type: WIDGET_TYPES.BUDGET_DONUT,
    name: 'Distribución de presupuesto',
    description: 'Cómo se distribuye tu gasto por plataforma',
    icon: PieChart,
    category: 'CHARTS',
    variants: [
      { id: 'standard', name: 'Donut', defaultW: 4, defaultH: 4, minW: 3, minH: 3, maxW: 6, maxH: 6 },
      { id: 'compact', name: 'Mini', defaultW: 3, defaultH: 3, minW: 2, minH: 2, maxW: 4, maxH: 4 },
    ],
    defaultVariant: 'standard',
  },

  [WIDGET_TYPES.NOTES]: {
    type: WIDGET_TYPES.NOTES,
    name: 'Notas',
    description: 'Bloc de notas personal',
    icon: StickyNote,
    category: 'TOOLS',
    variants: [
      { id: 'standard', name: 'Estándar', defaultW: 4, defaultH: 4, minW: 2, minH: 2, maxW: 8, maxH: 8 },
      { id: 'compact', name: 'Mini', defaultW: 3, defaultH: 3, minW: 2, minH: 2, maxW: 6, maxH: 6 },
    ],
    defaultVariant: 'standard',
  },

  [WIDGET_TYPES.CAMPAIGN_CALENDAR]: {
    type: WIDGET_TYPES.CAMPAIGN_CALENDAR,
    name: 'Calendario',
    description: 'Vista de calendario de campañas',
    icon: CalendarDays,
    category: 'TOOLS',
    variants: [
      { id: 'standard', name: 'Mensual', defaultW: 6, defaultH: 5, minW: 4, minH: 4, maxW: 12, maxH: 7 },
      { id: 'compact', name: 'Semana', defaultW: 6, defaultH: 3, minW: 4, minH: 2, maxW: 12, maxH: 4 },
    ],
    defaultVariant: 'standard',
  },
}

export function getDefaultLayout() {
  return [
    { i: 'w-welcome', type: WIDGET_TYPES.WELCOME, variant: 'standard', x: 0, y: 0, w: 12, h: 2 },
    { i: 'w-spend', type: WIDGET_TYPES.KPI_SPEND, variant: 'compact', x: 0, y: 2, w: 3, h: 2 },
    { i: 'w-campaigns', type: WIDGET_TYPES.KPI_CAMPAIGNS, variant: 'compact', x: 3, y: 2, w: 3, h: 2 },
    { i: 'w-ctr', type: WIDGET_TYPES.KPI_CTR, variant: 'compact', x: 6, y: 2, w: 3, h: 2 },
    { i: 'w-views', type: WIDGET_TYPES.KPI_VIEWS, variant: 'compact', x: 9, y: 2, w: 3, h: 2 },
    { i: 'w-spendchart', type: WIDGET_TYPES.SPEND_CHART, variant: 'bar', x: 0, y: 4, w: 5, h: 4 },
    { i: 'w-table', type: WIDGET_TYPES.CAMPAIGNS_TABLE, variant: 'full', x: 5, y: 4, w: 7, h: 4 },
    { i: 'w-actions', type: WIDGET_TYPES.ACTION_ITEMS, variant: 'cards', x: 0, y: 8, w: 6, h: 4 },
    { i: 'w-quick', type: WIDGET_TYPES.QUICK_ACTIONS, variant: 'standard', x: 6, y: 8, w: 6, h: 2 },
  ]
}

let _counter = 0
export function generateWidgetId() {
  return `w-${Date.now()}-${_counter++}`
}
