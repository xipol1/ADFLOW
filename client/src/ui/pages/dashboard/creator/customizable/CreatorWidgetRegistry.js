import {
  Wallet, Inbox, Star, Radio, TrendingUp, BarChart3, Table2,
  Users, CalendarDays, Sparkles, MessageSquare, Clock,
  StickyNote, Zap, Target, AlertTriangle,
} from 'lucide-react'

// Categories shared with the advertiser registry — same picker UI handles both.
export const WIDGET_CATEGORIES = {
  METRICS: { id: 'METRICS', label: 'Métricas', icon: BarChart3 },
  CHARTS:  { id: 'CHARTS',  label: 'Gráficos', icon: BarChart3 },
  TABLES:  { id: 'TABLES',  label: 'Tablas',   icon: Table2 },
  TOOLS:   { id: 'TOOLS',   label: 'Herramientas', icon: Zap },
}

// Creator-specific widget types. Disjoint from the advertiser set so they
// can never accidentally cross-pollinate (e.g. a creator can't have
// "KPI_SPEND" since they don't spend, they earn).
export const WIDGET_TYPES = {
  WELCOME:           'WELCOME',
  KPI_EARNINGS:      'KPI_EARNINGS',
  KPI_PENDING_REQ:   'KPI_PENDING_REQ',
  KPI_RATING:        'KPI_RATING',
  KPI_CHANNELS:      'KPI_CHANNELS',
  KPI_COMPLETED:     'KPI_COMPLETED',
  KPI_CAS_AVG:       'KPI_CAS_AVG',
  EARNINGS_CHART:    'EARNINGS_CHART',
  REQUESTS_TABLE:    'REQUESTS_TABLE',
  CHANNELS_TABLE:    'CHANNELS_TABLE',
  TOP_ADVERTISERS:   'TOP_ADVERTISERS',
  ACTIVITY_FEED:     'ACTIVITY_FEED',
  QUICK_ACTIONS:     'QUICK_ACTIONS',
  ACTION_ITEMS:      'ACTION_ITEMS',
  NOTES:             'NOTES',
  CAMPAIGN_CALENDAR: 'CAMPAIGN_CALENDAR',
}

// Small DRY helper — most KPIs use the same compact/standard variants.
const kpiVariants = [
  { id: 'compact',  name: 'Compacto',  defaultW: 3, defaultH: 2, minW: 2, minH: 2, maxW: 4, maxH: 2 },
  { id: 'standard', name: 'Estándar',  defaultW: 3, defaultH: 3, minW: 3, minH: 3, maxW: 6, maxH: 4 },
]

export const WIDGET_CATALOG = {
  [WIDGET_TYPES.WELCOME]: {
    type: WIDGET_TYPES.WELCOME,
    name: 'Bienvenida',
    description: 'Saludo personalizado con resumen del día',
    icon: Sparkles,
    category: 'TOOLS',
    variants: [
      { id: 'standard', name: 'Estándar', defaultW: 12, defaultH: 2, minW: 6, minH: 2, maxW: 12, maxH: 3 },
      { id: 'compact',  name: 'Compacto', defaultW: 6,  defaultH: 2, minW: 4, minH: 2, maxW: 8,  maxH: 2 },
    ],
    defaultVariant: 'standard',
  },

  [WIDGET_TYPES.KPI_EARNINGS]: {
    type: WIDGET_TYPES.KPI_EARNINGS,
    name: 'Ingresos del mes',
    description: 'Cobros liberados desde escrow este mes',
    icon: Wallet,
    category: 'METRICS',
    variants: kpiVariants,
    defaultVariant: 'compact',
  },

  [WIDGET_TYPES.KPI_PENDING_REQ]: {
    type: WIDGET_TYPES.KPI_PENDING_REQ,
    name: 'Solicitudes pendientes',
    description: 'Propuestas de anunciantes esperando tu respuesta',
    icon: Inbox,
    category: 'METRICS',
    variants: kpiVariants,
    defaultVariant: 'compact',
  },

  [WIDGET_TYPES.KPI_RATING]: {
    type: WIDGET_TYPES.KPI_RATING,
    name: 'Rating medio',
    description: 'Valoración promedio de los anunciantes',
    icon: Star,
    category: 'METRICS',
    variants: kpiVariants,
    defaultVariant: 'compact',
  },

  [WIDGET_TYPES.KPI_CHANNELS]: {
    type: WIDGET_TYPES.KPI_CHANNELS,
    name: 'Canales activos',
    description: 'Canales tuyos verificados y disponibles',
    icon: Radio,
    category: 'METRICS',
    variants: kpiVariants,
    defaultVariant: 'compact',
  },

  [WIDGET_TYPES.KPI_COMPLETED]: {
    type: WIDGET_TYPES.KPI_COMPLETED,
    name: 'Campañas completadas',
    description: 'Total de campañas que has ejecutado con éxito',
    icon: TrendingUp,
    category: 'METRICS',
    variants: kpiVariants,
    defaultVariant: 'compact',
  },

  [WIDGET_TYPES.KPI_CAS_AVG]: {
    type: WIDGET_TYPES.KPI_CAS_AVG,
    name: 'CAS promedio',
    description: 'Channel Authority Score medio de tus canales',
    icon: Target,
    category: 'METRICS',
    variants: kpiVariants,
    defaultVariant: 'compact',
  },

  [WIDGET_TYPES.EARNINGS_CHART]: {
    type: WIDGET_TYPES.EARNINGS_CHART,
    name: 'Gráfico de ingresos',
    description: 'Evolución de tus ingresos por mes',
    icon: BarChart3,
    category: 'CHARTS',
    variants: [
      { id: 'bar',  name: 'Barras',  defaultW: 6, defaultH: 4, minW: 4, minH: 3, maxW: 12, maxH: 6 },
      { id: 'line', name: 'Líneas',  defaultW: 6, defaultH: 4, minW: 4, minH: 3, maxW: 12, maxH: 6 },
      { id: 'mini', name: 'Mini',    defaultW: 3, defaultH: 3, minW: 3, minH: 2, maxW: 6,  maxH: 4 },
    ],
    defaultVariant: 'bar',
  },

  [WIDGET_TYPES.REQUESTS_TABLE]: {
    type: WIDGET_TYPES.REQUESTS_TABLE,
    name: 'Solicitudes recientes',
    description: 'Últimas propuestas recibidas',
    icon: Inbox,
    category: 'TABLES',
    variants: [
      { id: 'full',    name: 'Tabla',   defaultW: 6, defaultH: 5, minW: 5, minH: 4, maxW: 12, maxH: 8 },
      { id: 'compact', name: 'Compacto',defaultW: 4, defaultH: 4, minW: 3, minH: 3, maxW: 8,  maxH: 6 },
    ],
    defaultVariant: 'full',
  },

  [WIDGET_TYPES.CHANNELS_TABLE]: {
    type: WIDGET_TYPES.CHANNELS_TABLE,
    name: 'Mis canales',
    description: 'Listado de tus canales y métricas clave',
    icon: Radio,
    category: 'TABLES',
    variants: [
      { id: 'full',    name: 'Tabla',   defaultW: 6, defaultH: 5, minW: 5, minH: 4, maxW: 12, maxH: 8 },
      { id: 'compact', name: 'Compacto',defaultW: 4, defaultH: 4, minW: 3, minH: 3, maxW: 8,  maxH: 6 },
    ],
    defaultVariant: 'full',
  },

  [WIDGET_TYPES.TOP_ADVERTISERS]: {
    type: WIDGET_TYPES.TOP_ADVERTISERS,
    name: 'Top anunciantes',
    description: 'Anunciantes que más han pagado por tus canales',
    icon: Users,
    category: 'TABLES',
    variants: [
      { id: 'standard', name: 'Tabla',  defaultW: 6, defaultH: 4, minW: 4, minH: 3, maxW: 12, maxH: 6 },
      { id: 'compact',  name: 'Lista',  defaultW: 3, defaultH: 4, minW: 3, minH: 3, maxW: 6,  maxH: 6 },
    ],
    defaultVariant: 'standard',
  },

  [WIDGET_TYPES.ACTIVITY_FEED]: {
    type: WIDGET_TYPES.ACTIVITY_FEED,
    name: 'Actividad reciente',
    description: 'Timeline de tus campañas e interacciones',
    icon: Clock,
    category: 'TOOLS',
    variants: [
      { id: 'standard', name: 'Timeline', defaultW: 4, defaultH: 5, minW: 3, minH: 3, maxW: 6, maxH: 8 },
      { id: 'compact',  name: 'Compacto', defaultW: 3, defaultH: 3, minW: 3, minH: 2, maxW: 6, maxH: 5 },
    ],
    defaultVariant: 'standard',
  },

  [WIDGET_TYPES.QUICK_ACTIONS]: {
    type: WIDGET_TYPES.QUICK_ACTIONS,
    name: 'Acciones rápidas',
    description: 'Accesos directos a las funciones más usadas',
    icon: Zap,
    category: 'TOOLS',
    variants: [
      { id: 'standard', name: 'Botones', defaultW: 6, defaultH: 2, minW: 4, minH: 2, maxW: 12, maxH: 3 },
      { id: 'compact',  name: 'Iconos',  defaultW: 3, defaultH: 2, minW: 2, minH: 2, maxW: 6,  maxH: 2 },
    ],
    defaultVariant: 'standard',
  },

  [WIDGET_TYPES.ACTION_ITEMS]: {
    type: WIDGET_TYPES.ACTION_ITEMS,
    name: 'Requiere atención',
    description: 'Tareas pendientes y alertas',
    icon: AlertTriangle,
    category: 'TOOLS',
    variants: [
      { id: 'cards',   name: 'Tarjetas', defaultW: 6, defaultH: 4, minW: 4, minH: 3, maxW: 12, maxH: 6 },
      { id: 'list',    name: 'Lista',    defaultW: 4, defaultH: 3, minW: 3, minH: 2, maxW: 8,  maxH: 5 },
      { id: 'compact', name: 'Compacto', defaultW: 3, defaultH: 2, minW: 3, minH: 2, maxW: 6,  maxH: 3 },
    ],
    defaultVariant: 'cards',
  },

  [WIDGET_TYPES.NOTES]: {
    type: WIDGET_TYPES.NOTES,
    name: 'Notas',
    description: 'Bloc de notas personal',
    icon: StickyNote,
    category: 'TOOLS',
    variants: [
      { id: 'standard', name: 'Estándar', defaultW: 4, defaultH: 4, minW: 2, minH: 2, maxW: 8, maxH: 8 },
      { id: 'compact',  name: 'Mini',     defaultW: 3, defaultH: 3, minW: 2, minH: 2, maxW: 6, maxH: 6 },
    ],
    defaultVariant: 'standard',
  },

  [WIDGET_TYPES.CAMPAIGN_CALENDAR]: {
    type: WIDGET_TYPES.CAMPAIGN_CALENDAR,
    name: 'Calendario',
    description: 'Vista de calendario con tus campañas programadas',
    icon: CalendarDays,
    category: 'TOOLS',
    variants: [
      { id: 'standard', name: 'Mensual', defaultW: 6, defaultH: 5, minW: 4, minH: 4, maxW: 12, maxH: 7 },
      { id: 'compact',  name: 'Semana',  defaultW: 6, defaultH: 3, minW: 4, minH: 2, maxW: 12, maxH: 4 },
    ],
    defaultVariant: 'standard',
  },
}

// Recommended starting layout for new creators. Channel + earnings + requests
// are the three things a creator cares about most, so they're at the top.
export function getDefaultLayout() {
  return [
    { i: 'cw-welcome',  type: WIDGET_TYPES.WELCOME,         variant: 'standard', x: 0, y: 0, w: 12, h: 2 },

    // Row 2 — 4 KPIs side by side
    { i: 'cw-earn',     type: WIDGET_TYPES.KPI_EARNINGS,    variant: 'compact',  x: 0, y: 2, w: 3, h: 2 },
    { i: 'cw-pending',  type: WIDGET_TYPES.KPI_PENDING_REQ, variant: 'compact',  x: 3, y: 2, w: 3, h: 2 },
    { i: 'cw-channels', type: WIDGET_TYPES.KPI_CHANNELS,    variant: 'compact',  x: 6, y: 2, w: 3, h: 2 },
    { i: 'cw-rating',   type: WIDGET_TYPES.KPI_RATING,      variant: 'compact',  x: 9, y: 2, w: 3, h: 2 },

    // Row 4-6 — what needs attention next to the earnings trend
    { i: 'cw-actions',  type: WIDGET_TYPES.ACTION_ITEMS,    variant: 'cards',    x: 0, y: 4, w: 5, h: 3 },
    { i: 'cw-chart',    type: WIDGET_TYPES.EARNINGS_CHART,  variant: 'line',     x: 5, y: 4, w: 7, h: 3 },

    // Row 7-10 — drill-down: requests + top advertisers
    { i: 'cw-requests', type: WIDGET_TYPES.REQUESTS_TABLE,  variant: 'full',     x: 0, y: 7, w: 7, h: 4 },
    { i: 'cw-topadv',   type: WIDGET_TYPES.TOP_ADVERTISERS, variant: 'standard', x: 7, y: 7, w: 5, h: 4 },

    // Row 11+ — channels overview
    { i: 'cw-mychan',   type: WIDGET_TYPES.CHANNELS_TABLE,  variant: 'full',     x: 0, y: 11, w: 12, h: 4 },
  ]
}

let _counter = 0
export function generateWidgetId() {
  return `cw-${Date.now()}-${_counter++}`
}
