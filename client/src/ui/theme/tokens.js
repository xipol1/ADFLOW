// ─── Channelad Design Tokens ─────────────────────────────────────────────────
// Single source of truth for all colors, typography, spacing, and animations.

// ── Brand colors ─────────────────────────────────────────────────────────────
export const PURPLE      = '#7C3AED'
export const PURPLE_DARK = '#6D28D9'
export const PURPLE_LIGHT= '#8B5CF6'
export const GREEN       = '#25d366'
export const GREEN_DARK  = '#1ea952'

// ── Role-based accent ────────────────────────────────────────────────────────
const ACCENT_MAP = {
  advertiser: { hex: '#8b5cf6', r: 139, g: 92,  b: 246 },
  anunciante: { hex: '#8b5cf6', r: 139, g: 92,  b: 246 },
  creator:    { hex: '#25d366', r: 37,  g: 211, b: 102 },
  creador:    { hex: '#25d366', r: 37,  g: 211, b: 102 },
}

export function accent(role) {
  return (ACCENT_MAP[role] || ACCENT_MAP.advertiser).hex
}

export function accentAlpha(role, opacity) {
  const c = ACCENT_MAP[role] || ACCENT_MAP.advertiser
  return `rgba(${c.r},${c.g},${c.b},${opacity})`
}

// Shorthand for purple alpha (most common)
export const purpleAlpha = (o) => `rgba(139,92,246,${o})`
// Shorthand for green alpha
export const greenAlpha  = (o) => `rgba(37,211,102,${o})`

// ── Semantic colors ──────────────────────────────────────────────────────────
export const OK   = '#10b981'
export const WARN = '#f59e0b'
export const ERR  = '#ef4444'
export const BLUE = '#3b82f6'

// ── Platform brand colors ────────────────────────────────────────────────────
export const PLATFORM_BRAND = {
  whatsapp:   { color: '#25d366', bg: 'rgba(37,211,102,0.12)',   label: 'WhatsApp'   },
  telegram:   { color: '#2aabee', bg: 'rgba(42,171,238,0.12)',   label: 'Telegram'   },
  discord:    { color: '#5865f2', bg: 'rgba(88,101,242,0.12)',   label: 'Discord'    },
  youtube:    { color: '#ef4444', bg: 'rgba(239,68,68,0.12)',    label: 'YouTube'    },
  instagram:  { color: '#e1306c', bg: 'rgba(225,48,108,0.12)',   label: 'Instagram'  },
  tiktok:     { color: '#010101', bg: 'rgba(100,100,100,0.12)',  label: 'TikTok'     },
  newsletter: { color: '#8b5cf6', bg: 'rgba(139,92,246,0.12)',   label: 'Newsletter' },
  facebook:   { color: '#1877f2', bg: 'rgba(24,119,242,0.12)',   label: 'Facebook'   },
  linkedin:   { color: '#0a66c2', bg: 'rgba(10,102,194,0.12)',   label: 'LinkedIn'   },
}

// Also keyed by display name (for lookups using capitalized names)
export const PLAT_COLORS = {
  Telegram:   '#2aabee',
  WhatsApp:   '#25d366',
  Discord:    '#5865f2',
  Instagram:  '#e1306c',
  YouTube:    '#ef4444',
  Newsletter: '#f59e0b',
  Facebook:   '#1877f2',
  TikTok:     '#010101',
  LinkedIn:   '#0a66c2',
}

// ── Typography ───────────────────────────────────────────────────────────────
export const FONT_BODY    = "'Inter', system-ui, sans-serif"
export const FONT_DISPLAY = "'Sora', system-ui, sans-serif"

// ── Spacing & layout ─────────────────────────────────────────────────────────
export const SIDEBAR = {
  width:          240,
  collapsedWidth: 68,
  link: {
    padding:           '10px 14px',
    paddingCollapsed:  '10px 0',
    fontSize:          '14px',
    iconSize:          18,
    iconStrokeActive:  2.2,
    iconStrokeDefault: 1.8,
    borderRadius:      '10px',
    gap:               '10px',
  },
  headerHeight: 64,
}

export const CARD_RADIUS = 16
export const BTN_RADIUS  = 10

// ── Sparkline defaults ───────────────────────────────────────────────────────
export const SPARKLINE = { w: 84, h: 34, pad: 3 }

// ── Landing page section spacing ─────────────────────────────────────────────
export const SECTION_PAD = '140px 64px'
export const SECTION_PAD_SM = '72px 20px'
export const SECTION_PAD_MD = '96px 32px'
export const MAX_W = '1200px'

// ── Gradients ────────────────────────────────────────────────────────────────
export const GRADIENT_TEXT = `linear-gradient(135deg, #7C3AED 0%, #8b5cf6 40%, #A855F7 100%)`
export const GRADIENT_HERO_BG = `radial-gradient(ellipse 80% 60% at 50% -10%, rgba(124,58,237,0.08) 0%, transparent 60%)`
export const GRADIENT_CARD = `linear-gradient(145deg, rgba(124,58,237,0.04) 0%, transparent 50%)`
export const GRADIENT_BTN = `linear-gradient(135deg, #7C3AED, #A855F7)`

// ── Premium shadows ─────────────────────────────────────────────────────────
export const SHADOW_SM = 'var(--shadow-sm)'
export const SHADOW_MD = 'var(--shadow-md)'
export const SHADOW_LG = 'var(--shadow-lg)'
export const SHADOW_GLOW = '0 0 40px rgba(124,58,237,0.15)'

// ── Animation ────────────────────────────────────────────────────────────────
export const EASE       = 'cubic-bezier(.22,1,.36,1)'
export const EASE_OUT   = 'cubic-bezier(.22,1,.36,1)'
export const TRANSITION = `all 250ms cubic-bezier(.22,1,.36,1)`

// ── Status badge colors ──────────────────────────────────────────────────────
export const STATUS = {
  verified: { bg: 'rgba(139,92,246,0.12)', color: '#8b5cf6', border: 'rgba(139,92,246,0.22)' },
  trending: { bg: 'rgba(249,115,22,0.12)', color: '#f97316', border: 'rgba(249,115,22,0.22)' },
  new:      { bg: 'rgba(59,130,246,0.12)', color: '#3b82f6', border: 'rgba(59,130,246,0.22)' },
}

// ── Notification type config ─────────────────────────────────────────────────
export const NOTIF_TYPE = {
  success: { emoji: '✅', color: '#22c55e', bg: 'rgba(34,197,94,0.1)' },
  info:    { emoji: 'ℹ️',  color: '#3b82f6', bg: 'rgba(59,130,246,0.1)' },
  warning: { emoji: '⚠️', color: '#f59e0b', bg: 'rgba(245,158,11,0.1)' },
}

// ─── Scoring UI tokens (dark-first, data-dense) ──────────────────────────────
// Used by src/ui/components/scoring/* and downstream scoring pages.
// Kept separate from the marketing/landing palette above so that legacy
// consumers of the purple/green brand colors keep working unchanged.
export const C = {
  // Surfaces
  bg:        '#0B1120',
  surface:   '#111827',
  surfaceEl: '#1C2A3F',
  border:    '#1E2D45',
  borderEl:  '#2A3F5F',

  // Global accent
  teal:      '#00D4B8',
  tealDim:   'rgba(0,212,184,0.12)',
  tealGlow:  'rgba(0,212,184,0.06)',

  // Roles
  adv:       '#818CF8',  // Advertiser — indigo
  cre:       '#34D399',  // Creator — emerald
  adm:       '#FBBF24',  // Admin — amber

  // CAS levels
  elite:     '#818CF8',
  gold:      '#F59E0B',
  silver:    '#94A3B8',
  bronze:    '#B87333',

  // Traffic-light semantics
  ok:        '#10B981',
  okDim:     'rgba(16,185,129,0.15)',
  warn:      '#F59E0B',
  warnDim:   'rgba(245,158,11,0.15)',
  alert:     '#EF4444',
  alertDim:  'rgba(239,68,68,0.15)',

  // Text
  t1:        '#F1F5F9',
  t2:        '#94A3B8',
  t3:        '#475569',
}

export const NIVEL = {
  ELITE:  { color: C.elite,  label: 'ELITE',  min: 80 },
  GOLD:   { color: C.gold,   label: 'GOLD',   min: 61 },
  SILVER: { color: C.silver, label: 'SILVER', min: 41 },
  BRONZE: { color: C.bronze, label: 'BRONZE', min: 0  },
}

export const nivelFromCAS = (cas) =>
  cas >= 80 ? NIVEL.ELITE :
  cas >= 61 ? NIVEL.GOLD  :
  cas >= 41 ? NIVEL.SILVER : NIVEL.BRONZE

export const confianzaColor = (n) =>
  n >= 80 ? C.ok : n >= 50 ? C.warn : C.alert

export const fuenteLabel = {
  admin_directo: 'Admin',
  oauth_graph:   'OAuth',
  bot_miembro:   'Bot',
  tracking_url:  'URL',
  declarado:     'Decl.',
}

export const plataformaIcon = {
  telegram:   '✈️',
  whatsapp:   '📱',
  discord:    '🎮',
  instagram:  '📸',
  facebook:   '📘',
  newsletter: '📧',
  blog:       '📝',
}

export const TIERS = ['free', 'starter', 'growth', 'pro', 'agency']
export const tierAbove = (a, b) => TIERS.indexOf(a) >= TIERS.indexOf(b)
