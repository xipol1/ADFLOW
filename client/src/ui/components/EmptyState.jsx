import React from 'react'
import { FONT_BODY, FONT_DISPLAY, PURPLE, purpleAlpha, GREEN, greenAlpha } from '../theme/tokens'

/**
 * EmptyState — Premium empty-state card with icon, title, description and CTA.
 * Used across all dashboard pages when no data is available.
 *
 * Props:
 *   icon        — Lucide icon component
 *   title       — Heading text
 *   description — Body text
 *   actionLabel — CTA button label (optional)
 *   onAction    — CTA click handler (optional)
 *   accent      — 'purple' | 'green' (default: 'purple')
 *   secondary   — { label, onClick } for a secondary action (optional)
 */
export default function EmptyState({
  icon: Icon,
  title,
  description,
  actionLabel,
  onAction,
  accent = 'purple',
  secondary,
}) {
  const color = accent === 'green' ? GREEN : PURPLE
  const alpha = accent === 'green' ? greenAlpha : purpleAlpha

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      textAlign: 'center',
      padding: '64px 28px',
      maxWidth: '420px',
      margin: '0 auto',
    }}>
      {/* Animated icon ring */}
      <div style={{
        width: '80px',
        height: '80px',
        borderRadius: '24px',
        background: alpha(0.08),
        border: `1.5px solid ${alpha(0.18)}`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: '24px',
        position: 'relative',
      }}>
        {/* Decorative ring */}
        <div style={{
          position: 'absolute',
          inset: '-8px',
          borderRadius: '30px',
          border: `1px dashed ${alpha(0.15)}`,
        }} />
        {Icon && <Icon size={32} color={color} strokeWidth={1.5} />}
      </div>

      {/* Title */}
      <h3 style={{
        fontFamily: FONT_DISPLAY,
        fontSize: '20px',
        fontWeight: 800,
        color: 'var(--text)',
        marginBottom: '8px',
        letterSpacing: '-0.02em',
        lineHeight: 1.3,
      }}>
        {title}
      </h3>

      {/* Description */}
      <p style={{
        fontFamily: FONT_BODY,
        fontSize: '14px',
        color: 'var(--muted)',
        lineHeight: 1.6,
        marginBottom: actionLabel ? '28px' : '0',
        maxWidth: '340px',
      }}>
        {description}
      </p>

      {/* CTA Button */}
      {actionLabel && onAction && (
        <button
          onClick={onAction}
          style={{
            background: color,
            color: '#fff',
            border: 'none',
            borderRadius: '12px',
            padding: '12px 28px',
            fontSize: '14px',
            fontWeight: 700,
            fontFamily: FONT_BODY,
            cursor: 'pointer',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            transition: 'transform .15s, box-shadow .15s',
            boxShadow: `0 4px 16px ${alpha(0.3)}`,
          }}
          onMouseEnter={e => {
            e.currentTarget.style.transform = 'translateY(-2px)'
            e.currentTarget.style.boxShadow = `0 8px 28px ${alpha(0.4)}`
          }}
          onMouseLeave={e => {
            e.currentTarget.style.transform = 'none'
            e.currentTarget.style.boxShadow = `0 4px 16px ${alpha(0.3)}`
          }}
        >
          {actionLabel}
        </button>
      )}

      {/* Secondary action */}
      {secondary && (
        <button
          onClick={secondary.onClick}
          style={{
            background: 'none',
            border: 'none',
            color: color,
            fontSize: '13px',
            fontWeight: 600,
            fontFamily: FONT_BODY,
            cursor: 'pointer',
            marginTop: '14px',
            padding: '4px 0',
            transition: 'opacity .15s',
          }}
          onMouseEnter={e => { e.currentTarget.style.opacity = '0.7' }}
          onMouseLeave={e => { e.currentTarget.style.opacity = '1' }}
        >
          {secondary.label}
        </button>
      )}
    </div>
  )
}
