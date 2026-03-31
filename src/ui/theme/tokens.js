// ─── ADFLOW Design Tokens ────────────────────────────────────────────────────
// Single source of truth for all colors, typography, spacing, and animations.

// ── Brand colors ─────────────────────────────────────────────────────────────
export const PURPLE      = '#8b5cf6'
export const PURPLE_DARK = '#7c3aed'
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

// ── Animation ────────────────────────────────────────────────────────────────
export const EASE       = 'cubic-bezier(.4,0,.2,1)'
export const TRANSITION = `all 250ms cubic-bezier(.4,0,.2,1)`

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
