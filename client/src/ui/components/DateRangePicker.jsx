import React, { useState, useRef, useEffect } from 'react'
import { Calendar, ChevronDown } from 'lucide-react'
import { PURPLE, purpleAlpha, FONT_BODY, FONT_DISPLAY } from '../theme/tokens'

const PRESETS = [
  { key: '7d',  label: '7 dias',   days: 7 },
  { key: '30d', label: '30 dias',  days: 30 },
  { key: '90d', label: '90 dias',  days: 90 },
  { key: '12m', label: '12 meses', days: 365 },
]

/**
 * DateRangePicker — Compact date range selector with presets.
 *
 * Props:
 *   value     — current preset key (e.g. '30d')
 *   onChange  — (key, { from, to, days }) => void
 *   accent    — hex color (default: PURPLE)
 *   presets   — custom presets array (optional)
 */
export default function DateRangePicker({
  value = '30d',
  onChange,
  accent = PURPLE,
  presets = PRESETS,
}) {
  const [open, setOpen] = useState(false)
  const ref = useRef(null)

  useEffect(() => {
    if (!open) return
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  const current = presets.find(p => p.key === value) || presets[1]

  const handleSelect = (preset) => {
    const to = new Date()
    const from = new Date()
    from.setDate(from.getDate() - preset.days)
    onChange?.(preset.key, { from, to, days: preset.days })
    setOpen(false)
  }

  const accentAlpha = (o) => {
    const r = parseInt(accent.slice(1,3),16)
    const g = parseInt(accent.slice(3,5),16)
    const b = parseInt(accent.slice(5,7),16)
    return `rgba(${r},${g},${b},${o})`
  }

  return (
    <div ref={ref} style={{ position: 'relative', display: 'inline-flex' }}>
      <button
        onClick={() => setOpen(v => !v)}
        style={{
          display: 'inline-flex', alignItems: 'center', gap: '7px',
          background: open ? accentAlpha(0.08) : 'var(--bg)',
          border: `1px solid ${open ? accentAlpha(0.4) : 'var(--border)'}`,
          borderRadius: '10px', padding: '8px 14px',
          fontSize: '13px', fontWeight: 500, color: open ? accent : 'var(--text)',
          fontFamily: FONT_BODY, cursor: 'pointer',
          transition: 'all .15s ease',
        }}
        onMouseEnter={e => { if (!open) { e.currentTarget.style.borderColor = 'var(--border-med)' } }}
        onMouseLeave={e => { if (!open) { e.currentTarget.style.borderColor = 'var(--border)' } }}
      >
        <Calendar size={14} strokeWidth={2} />
        <span>{current.label}</span>
        <ChevronDown size={13} strokeWidth={2} style={{
          transition: 'transform .15s',
          transform: open ? 'rotate(180deg)' : 'none',
          opacity: 0.5,
        }} />
      </button>

      {open && (
        <div style={{
          position: 'absolute', top: 'calc(100% + 6px)', right: 0,
          background: 'var(--surface)',
          border: '1px solid var(--border)',
          borderRadius: '12px', padding: '6px',
          boxShadow: '0 12px 40px rgba(0,0,0,0.25)',
          zIndex: 100, minWidth: '160px',
          animation: '_drp_in 120ms ease forwards',
        }}>
          <style>{`@keyframes _drp_in { from { opacity:0; transform:translateY(-4px); } to { opacity:1; transform:none; } }`}</style>
          {presets.map(p => {
            const isActive = p.key === value
            return (
              <button
                key={p.key}
                onClick={() => handleSelect(p)}
                style={{
                  display: 'flex', alignItems: 'center', gap: '8px',
                  width: '100%', padding: '9px 12px',
                  background: isActive ? accentAlpha(0.1) : 'transparent',
                  border: 'none', borderRadius: '8px',
                  fontSize: '13px', fontWeight: isActive ? 600 : 400,
                  color: isActive ? accent : 'var(--text)',
                  fontFamily: FONT_BODY, cursor: 'pointer',
                  transition: 'background .12s',
                }}
                onMouseEnter={e => { if (!isActive) e.currentTarget.style.background = 'var(--bg2)' }}
                onMouseLeave={e => { if (!isActive) e.currentTarget.style.background = 'transparent' }}
              >
                {isActive && <div style={{ width: '5px', height: '5px', borderRadius: '50%', background: accent, flexShrink: 0 }} />}
                {p.label}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
