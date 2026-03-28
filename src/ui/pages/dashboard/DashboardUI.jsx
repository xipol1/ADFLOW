import React from 'react'
import { ArrowUpRight, Sparkles } from 'lucide-react'

export function DashboardHero({ eyebrow, title, subtitle, accent, children }) {
  return (
    <section className="relative overflow-hidden rounded-[28px] border border-white/10 bg-[#111827] text-white shadow-2xl">
      <div className={`absolute inset-0 bg-gradient-to-br ${accent}`} />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,0.16),transparent_28%),radial-gradient(circle_at_bottom_right,rgba(255,255,255,0.08),transparent_30%)]" />
      <div className="relative grid gap-8 p-6 sm:p-8 xl:grid-cols-[minmax(0,1.6fr)_minmax(320px,1fr)] xl:items-end">
        <div className="space-y-4">
          <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.24em] text-white/80">
            <Sparkles className="h-3.5 w-3.5" />
            {eyebrow}
          </div>
          <div className="max-w-3xl space-y-3">
            <h1 className="font-display text-3xl font-semibold leading-tight sm:text-4xl">{title}</h1>
            <p className="max-w-2xl text-sm leading-6 text-slate-200 sm:text-base">{subtitle}</p>
          </div>
        </div>
        <div>{children}</div>
      </div>
    </section>
  )
}

export function HeroPanel({ label, value, detail, tone = 'slate' }) {
  const toneClass = {
    emerald: 'border-emerald-400/30 bg-emerald-400/10 text-emerald-100',
    amber: 'border-amber-300/30 bg-amber-300/10 text-amber-50',
    sky: 'border-sky-300/30 bg-sky-300/10 text-sky-100',
    slate: 'border-white/10 bg-white/10 text-white'
  }[tone] || 'border-white/10 bg-white/10 text-white'

  return (
    <div className={`rounded-[24px] border p-5 backdrop-blur-sm ${toneClass}`}>
      <p className="text-[11px] uppercase tracking-[0.22em] text-white/65">{label}</p>
      <p className="mt-3 text-3xl font-semibold">{value}</p>
      <p className="mt-2 text-sm text-white/75">{detail}</p>
    </div>
  )
}

export function SectionCard({ title, eyebrow, action, children, className = '' }) {
  return (
    <section className={`rounded-[26px] border border-slate-200/80 bg-white/95 p-5 shadow-[0_24px_80px_-48px_rgba(15,23,42,0.45)] backdrop-blur ${className}`}>
      <div className="mb-5 flex items-start justify-between gap-4">
        <div>
          {eyebrow ? <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-400">{eyebrow}</p> : null}
          <h2 className="font-display mt-2 text-lg font-semibold text-slate-900">{title}</h2>
        </div>
        {action ? <div className="text-sm text-slate-500">{action}</div> : null}
      </div>
      {children}
    </section>
  )
}

export function MetricTile({ label, value, hint, trend, accent = 'blue' }) {
  const accents = {
    blue: 'from-sky-500/15 to-indigo-500/10 text-sky-700',
    emerald: 'from-emerald-500/15 to-teal-500/10 text-emerald-700',
    amber: 'from-amber-500/15 to-orange-500/10 text-amber-700',
    rose: 'from-rose-500/15 to-fuchsia-500/10 text-rose-700'
  }

  return (
    <div className={`rounded-[22px] border border-slate-200 bg-gradient-to-br p-5 ${accents[accent] || accents.blue}`}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-500">{label}</p>
          <p className="mt-3 text-3xl font-semibold text-slate-950">{value}</p>
        </div>
        {trend ? (
          <div className="inline-flex items-center gap-1 rounded-full bg-white px-2.5 py-1 text-xs font-medium text-slate-700 shadow-sm">
            <ArrowUpRight className="h-3.5 w-3.5" />
            {trend}
          </div>
        ) : null}
      </div>
      {hint ? <p className="mt-3 text-sm leading-6 text-slate-600">{hint}</p> : null}
    </div>
  )
}

export function MiniBarList({ items, valueKey, labelKey, formatter }) {
  const max = Math.max(...items.map((item) => Number(item[valueKey]) || 0), 1)

  return (
    <div className="space-y-3">
      {items.map((item) => {
        const value = Number(item[valueKey]) || 0
        const width = `${Math.max((value / max) * 100, 6)}%`
        return (
          <div key={`${item[labelKey]}-${value}`} className="space-y-1.5">
            <div className="flex items-center justify-between gap-3 text-sm">
              <span className="font-medium text-slate-700">{item[labelKey]}</span>
              <span className="text-slate-500">{formatter ? formatter(value) : value}</span>
            </div>
            <div className="h-2 rounded-full bg-slate-100">
              <div className="h-2 rounded-full bg-gradient-to-r from-sky-500 via-cyan-400 to-emerald-400" style={{ width }} />
            </div>
          </div>
        )
      })}
    </div>
  )
}

export function TableList({ columns, rows, emptyLabel }) {
  if (!rows.length) {
    return <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-8 text-center text-sm text-slate-500">{emptyLabel}</div>
  }

  return (
    <div className="overflow-hidden rounded-[22px] border border-slate-200">
      <div className="grid bg-slate-50 px-4 py-3 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500" style={{ gridTemplateColumns: `repeat(${columns.length}, minmax(0, 1fr))` }}>
        {columns.map((column) => <div key={column.key}>{column.label}</div>)}
      </div>
      <div className="divide-y divide-slate-100">
        {rows.map((row, index) => (
          <div key={row.id || index} className="grid items-center gap-3 px-4 py-4 text-sm text-slate-700" style={{ gridTemplateColumns: `repeat(${columns.length}, minmax(0, 1fr))` }}>
            {columns.map((column) => (
              <div key={column.key} className="min-w-0">
                {column.render ? column.render(row) : row[column.key]}
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  )
}

export function StatusBadge({ children, tone = 'neutral' }) {
  const tones = {
    success: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
    warning: 'bg-amber-50 text-amber-700 ring-amber-200',
    danger: 'bg-rose-50 text-rose-700 ring-rose-200',
    info: 'bg-sky-50 text-sky-700 ring-sky-200',
    neutral: 'bg-slate-100 text-slate-700 ring-slate-200'
  }

  return <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset ${tones[tone] || tones.neutral}`}>{children}</span>
}

export function ActivityFeed({ items }) {
  return (
    <div className="space-y-3">
      {items.map((item, index) => (
        <div key={`${item.content}-${index}`} className="flex gap-3 rounded-2xl border border-slate-200/80 bg-slate-50/80 p-4">
          <div className="mt-1 h-2.5 w-2.5 rounded-full bg-gradient-to-r from-sky-500 to-emerald-400" />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium leading-6 text-slate-800">{item.content}</p>
            <p className="mt-1 text-xs uppercase tracking-[0.18em] text-slate-400">{item.timestamp}</p>
          </div>
        </div>
      ))}
    </div>
  )
}
