import React, { useState } from 'react'
import { ChevronDown, X } from 'lucide-react'

function Section({ title, children, defaultOpen = true }) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <div className="mb-5">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center justify-between w-full mb-2 group"
        style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
      >
        <span className="text-[10px] font-bold uppercase tracking-widest" style={{ color: 'var(--text-secondary)' }}>
          {title}
        </span>
        <ChevronDown
          size={14}
          style={{
            color: 'var(--muted2)',
            transition: 'transform 200ms',
            transform: open ? 'rotate(0)' : 'rotate(-90deg)',
          }}
        />
      </button>
      {open && <div className="space-y-1">{children}</div>}
    </div>
  )
}

function Checkbox({ label, icon, checked, onChange }) {
  return (
    <div
      onClick={onChange}
      className="flex items-center gap-2.5 py-1.5 px-1 rounded-md cursor-pointer group hover:bg-[var(--bg3)]"
      style={{ transition: 'background 120ms' }}
      role="checkbox"
      aria-checked={checked}
    >
      <div
        className="w-4 h-4 rounded flex-shrink-0 flex items-center justify-center transition-all"
        style={{
          border: `1.5px solid ${checked ? 'var(--accent)' : 'var(--border-med, #30363D)'}`,
          background: checked ? 'var(--accent)' : 'transparent',
        }}
      >
        {checked && <svg width="10" height="8" viewBox="0 0 10 8" fill="none"><path d="M1 4L3.5 6.5L9 1" stroke="#080C10" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>}
      </div>
      {icon && <span className="text-sm">{icon}</span>}
      <span className="text-[13px]" style={{ color: checked ? 'var(--text)' : 'var(--text-secondary)' }}>{label}</span>
    </div>
  )
}

function Slider({ label, value, onChange, min = 0, max = 100, step = 1, format }) {
  return (
    <div className="mb-4 px-1">
      <div className="flex justify-between mb-1.5">
        <span className="text-[11px]" style={{ color: 'var(--text-secondary)' }}>{label}</span>
        <span className="text-[11px] font-medium" style={{ color: 'var(--accent)', fontFamily: 'var(--font-mono)' }}>
          {format ? format(value) : value}
        </span>
      </div>
      <input
        type="range" min={min} max={max} step={step} value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full h-1 rounded-full appearance-none cursor-pointer"
        style={{
          background: `linear-gradient(to right, var(--accent) 0%, var(--accent) ${((value - min) / (max - min)) * 100}%, var(--border) ${((value - min) / (max - min)) * 100}%, var(--border) 100%)`,
          accentColor: 'var(--accent)',
        }}
      />
      <div className="flex justify-between mt-1">
        <span className="text-[10px]" style={{ color: 'var(--muted2)' }}>{format ? format(min) : min}</span>
        <span className="text-[10px]" style={{ color: 'var(--muted2)' }}>{format ? format(max) : max}</span>
      </div>
    </div>
  )
}

export default function FilterSidebar({
  platforms = [], selectedPlatforms = [], onPlatformChange,
  categories = [], selectedCategories = [], onCategoryChange,
  minSubs = 0, onMinSubsChange,
  minScore = 0, onMinScoreChange,
  sortBy = 'score', onSortChange,
  onClear,
  activeCount = 0,
  className = '',
}) {
  const fmtSubs = (v) => {
    if (v === 0) return '0'
    if (v >= 1000) return `${(v / 1000).toFixed(0)}K`
    return String(v)
  }

  const SORT_OPTIONS = [
    { key: 'score', label: 'Score ↓' },
    { key: 'audiencia', label: 'Suscriptores ↓' },
    { key: 'engagement', label: 'Engagement ↓' },
    { key: 'precio', label: '€/post ↓' },
    { key: 'createdAt', label: 'Más reciente' },
  ]

  return (
    <aside className={`flex flex-col ${className}`}>
      <div className="flex items-center justify-between mb-5">
        <h3 className="text-sm font-bold" style={{ color: 'var(--text)' }}>Filtros</h3>
        {activeCount > 0 && (
          <button
            onClick={onClear}
            className="text-[11px] font-medium flex items-center gap-1"
            style={{ color: 'var(--accent)', background: 'none', border: 'none', cursor: 'pointer' }}
          >
            <X size={12} /> Limpiar
          </button>
        )}
      </div>

      <Section title="Plataforma">
        {platforms.map((p) => (
          <Checkbox
            key={p.key}
            label={p.label}
            icon={p.icon}
            checked={selectedPlatforms.includes(p.key)}
            onChange={() => onPlatformChange(p.key)}
          />
        ))}
      </Section>

      <Section title="Categoría">
        {categories.map((c) => (
          <Checkbox
            key={c.key}
            label={c.label}
            checked={selectedCategories.includes(c.key)}
            onChange={() => onCategoryChange(c.key)}
          />
        ))}
      </Section>

      <Section title="Audiencia mínima">
        <Slider
          label="Suscriptores"
          value={minSubs}
          onChange={onMinSubsChange}
          min={0} max={500000} step={1000}
          format={fmtSubs}
        />
      </Section>

      <Section title="Score mínimo">
        <Slider
          label="ChannelAd Score"
          value={minScore}
          onChange={onMinScoreChange}
          min={0} max={100} step={5}
        />
      </Section>

      <Section title="Ordenar por">
        <div className="space-y-0.5">
          {SORT_OPTIONS.map((opt) => (
            <button
              key={opt.key}
              onClick={() => onSortChange(opt.key)}
              className="block w-full text-left px-2 py-1.5 rounded-md text-[13px] transition-colors"
              style={{
                background: sortBy === opt.key ? 'var(--accent-dim)' : 'transparent',
                color: sortBy === opt.key ? 'var(--accent)' : 'var(--text-secondary)',
                border: 'none',
                cursor: 'pointer',
                fontWeight: sortBy === opt.key ? 600 : 400,
              }}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </Section>
    </aside>
  )
}
