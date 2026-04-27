import React from 'react'

const VARIANTS = {
  platform: {
    telegram:   { bg: 'rgba(42,171,238,0.10)', color: '#2aabee', border: 'rgba(42,171,238,0.20)' },
    whatsapp:   { bg: 'rgba(37,211,102,0.10)', color: '#25d366', border: 'rgba(37,211,102,0.20)' },
    discord:    { bg: 'rgba(88,101,242,0.10)', color: '#5865f2', border: 'rgba(88,101,242,0.20)' },
    newsletter: { bg: 'rgba(245,158,11,0.10)', color: '#f59e0b', border: 'rgba(245,158,11,0.20)' },
  },
  category: { bg: 'var(--bg3, #161B22)', color: 'var(--text-secondary, #8B949E)', border: 'var(--border)' },
  verified: { bg: 'var(--accent-dim, rgba(139,92,246,0.08))', color: 'var(--accent, #8B5CF6)', border: 'var(--accent-border, rgba(139,92,246,0.19))' },
  trending: { bg: 'var(--gold-dim, rgba(240,180,41,0.08))', color: 'var(--gold, #F0B429)', border: 'rgba(240,180,41,0.19)' },
  unclaimed: { bg: 'var(--blue-dim, rgba(88,166,255,0.08))', color: 'var(--blue, #58A6FF)', border: 'rgba(88,166,255,0.19)' },
}

const PLATFORM_ICONS = {
  telegram: '✈️', whatsapp: '💬', discord: '🎮', newsletter: '📧',
  instagram: '📸', facebook: '📘', youtube: '📺',
}

export default function Badge({ label, variant = 'category', platform, className = '' }) {
  let colors
  if (variant === 'platform' && platform) {
    colors = VARIANTS.platform[platform.toLowerCase()] || VARIANTS.category
  } else if (typeof VARIANTS[variant] === 'object' && !VARIANTS[variant].bg) {
    colors = VARIANTS.category
  } else {
    colors = VARIANTS[variant] || VARIANTS.category
  }

  const icon = variant === 'platform' ? PLATFORM_ICONS[platform?.toLowerCase()] || '📡' : null

  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 text-[11px] font-semibold rounded-md whitespace-nowrap ${className}`}
      style={{ background: colors.bg, color: colors.color, border: `1px solid ${colors.border}` }}
    >
      {variant === 'verified' && '✓ '}
      {variant === 'trending' && '↑ '}
      {icon && <span className="text-xs">{icon}</span>}
      {label}
    </span>
  )
}
