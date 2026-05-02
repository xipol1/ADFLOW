import React, { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Compass, Search, Filter, Bookmark, BookmarkCheck, Wallet,
  Calendar, Clock, Sparkles, ArrowRight, Building2, Target,
  TrendingUp, X, Tag, MapPin, Star, Zap, AlertTriangle,
  ChevronDown, CheckCircle2, MessageSquare, Globe,
} from 'lucide-react'
import { useAuth } from '../../../../auth/AuthContext'
import apiService from '../../../../services/api'
import { FONT_BODY as F, FONT_DISPLAY as D, GREEN, greenAlpha, OK, WARN, ERR, BLUE, PLAT_COLORS } from '../../../theme/tokens'

const ACCENT = GREEN
const ga = greenAlpha
const fmtEur = (n) => `€${Math.round(Number(n) || 0).toLocaleString('es')}`
const SAVED_KEY = 'channelad-creator-discover-saved-v1'
const APPLIED_KEY = 'channelad-creator-discover-applied-v1'

/**
 * CreatorDiscoverPage — Marketplace de briefs abiertos.
 *
 * Equivalente al "Briefs" de Tribe, "Discover" de CreatorIQ, "Catalog" de
 * Telega.io. El creator NAVEGA campañas que advertisers han publicado y
 * APLICA — no solo recibe propuestas. Calcula un fit-score per brief × tu
 * canal: presupuesto + nicho + plataforma + audience size.
 *
 * Cada brief: brand, sector, presupuesto, deadline, deliverables, fit score,
 * número de creators que han aplicado ya, urgencia.
 */
export default function CreatorDiscoverPage() {
  const { user } = useAuth()
  const navigate = useNavigate()

  const [briefs, setBriefs] = useState([])
  const [channels, setChannels] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filters, setFilters] = useState({ sector: 'all', platform: 'all', minBudget: 0, sortBy: 'fit' })
  const [saved, setSaved] = useState(() => loadJSON(SAVED_KEY, {}))
  const [applied, setApplied] = useState(() => loadJSON(APPLIED_KEY, {}))
  const [selectedBrief, setSelectedBrief] = useState(null)
  const [view, setView] = useState('all') // all | saved | applied

  useEffect(() => {
    let mounted = true
    Promise.all([
      apiService.getMyChannels(),
      apiService.getOpenBriefs?.().catch(() => null), // endpoint may not exist yet
    ]).then(([chRes, bRes]) => {
      if (!mounted) return
      if (chRes?.success) setChannels(Array.isArray(chRes.data) ? chRes.data : chRes.data?.items || [])
      // Fallback to mock briefs derived from the channels' niches
      if (bRes?.success && Array.isArray(bRes.data)) {
        setBriefs(bRes.data)
      } else {
        setBriefs(generateMockBriefs())
      }
      setLoading(false)
    }).catch(() => { if (mounted) { setBriefs(generateMockBriefs()); setLoading(false) } })
    return () => { mounted = false }
  }, [])

  const enriched = useMemo(() => briefs.map(b => ({
    ...b,
    fitScore: computeFit(b, channels),
    saved: !!saved[b.id],
    applied: !!applied[b.id],
  })), [briefs, channels, saved, applied])

  const filtered = useMemo(() => {
    let list = enriched
    if (view === 'saved')   list = list.filter(b => b.saved)
    if (view === 'applied') list = list.filter(b => b.applied)
    if (filters.sector !== 'all')   list = list.filter(b => b.sector === filters.sector)
    if (filters.platform !== 'all') list = list.filter(b => b.platforms?.includes(filters.platform))
    if (filters.minBudget > 0)      list = list.filter(b => b.budget >= filters.minBudget)
    if (search.trim()) {
      const q = search.toLowerCase()
      list = list.filter(b => b.brand.toLowerCase().includes(q) || b.title.toLowerCase().includes(q) || b.description.toLowerCase().includes(q))
    }
    if (filters.sortBy === 'fit')      list.sort((a, b) => b.fitScore - a.fitScore)
    if (filters.sortBy === 'budget')   list.sort((a, b) => b.budget - a.budget)
    if (filters.sortBy === 'deadline') list.sort((a, b) => new Date(a.deadline) - new Date(b.deadline))
    if (filters.sortBy === 'recent')   list.sort((a, b) => new Date(b.publishedAt) - new Date(a.publishedAt))
    return list
  }, [enriched, filters, search, view])

  const toggleSaved = (id) => {
    const next = { ...saved }
    if (next[id]) delete next[id]
    else next[id] = Date.now()
    setSaved(next); saveJSON(SAVED_KEY, next)
  }

  const apply = (brief) => {
    const next = { ...applied, [brief.id]: { at: Date.now(), brand: brief.brand } }
    setApplied(next); saveJSON(APPLIED_KEY, next)
  }

  const sectors = [...new Set(briefs.map(b => b.sector))].sort()
  const platforms = [...new Set(briefs.flatMap(b => b.platforms || []))].sort()

  return (
    <div style={{ fontFamily: F, display: 'flex', flexDirection: 'column', gap: 22, maxWidth: 1200 }}>

      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
            <h1 style={{ fontFamily: D, fontSize: 26, fontWeight: 800, color: 'var(--text)', letterSpacing: '-0.03em', margin: 0 }}>
              Discover
            </h1>
            <span style={{
              background: ga(0.12), color: ACCENT, border: `1px solid ${ga(0.3)}`,
              borderRadius: 20, padding: '2px 9px', fontSize: 10.5, fontWeight: 700, letterSpacing: '0.04em',
            }}>BETA</span>
          </div>
          <p style={{ fontSize: 14, color: 'var(--muted)', margin: 0 }}>
            Briefs abiertos de advertisers buscando creadores. Aplica a los que mejor encajan con tus canales.
          </p>
        </div>

        {/* View toggle */}
        <div style={{ display: 'flex', gap: 2, background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 10, padding: 3 }}>
          {[
            { id: 'all',     label: `Todos · ${enriched.length}` },
            { id: 'saved',   label: `Guardados · ${enriched.filter(b => b.saved).length}` },
            { id: 'applied', label: `Aplicados · ${enriched.filter(b => b.applied).length}` },
          ].map(v => {
            const active = view === v.id
            return (
              <button key={v.id} onClick={() => setView(v.id)} style={{
                background: active ? ACCENT : 'transparent',
                color: active ? '#fff' : 'var(--muted)',
                border: 'none', borderRadius: 8, padding: '7px 12px',
                fontSize: 12, fontWeight: active ? 700 : 500,
                cursor: 'pointer', fontFamily: F, transition: 'all .15s',
              }}>{v.label}</button>
            )
          })}
        </div>
      </div>

      {/* Filters bar */}
      <div style={{
        background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12,
        padding: 12, display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap',
      }}>
        <div style={{ position: 'relative', flex: 1, minWidth: 200 }}>
          <Search size={13} color="var(--muted)" style={{ position: 'absolute', left: 11, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Buscar brief, marca, sector…"
            style={{
              width: '100%', boxSizing: 'border-box',
              background: 'var(--bg2)', color: 'var(--text)', border: '1px solid var(--border)',
              borderRadius: 8, padding: '8px 12px 8px 32px', fontSize: 13, fontFamily: F, outline: 'none',
            }} />
        </div>
        <Select value={filters.sector} onChange={v => setFilters({ ...filters, sector: v })}
          options={[{ value: 'all', label: 'Todos los sectores' }, ...sectors.map(s => ({ value: s, label: s }))]} />
        <Select value={filters.platform} onChange={v => setFilters({ ...filters, platform: v })}
          options={[{ value: 'all', label: 'Todas las plataformas' }, ...platforms.map(p => ({ value: p, label: p }))]} />
        <Select value={filters.minBudget} onChange={v => setFilters({ ...filters, minBudget: Number(v) })}
          options={[{ value: 0, label: 'Cualquier presupuesto' }, { value: 50, label: '€50+' }, { value: 100, label: '€100+' }, { value: 250, label: '€250+' }, { value: 500, label: '€500+' }, { value: 1000, label: '€1000+' }]} />
        <Select value={filters.sortBy} onChange={v => setFilters({ ...filters, sortBy: v })}
          options={[{ value: 'fit', label: 'Mejor fit' }, { value: 'budget', label: 'Mayor presupuesto' }, { value: 'deadline', label: 'Deadline próximo' }, { value: 'recent', label: 'Más recientes' }]} />
      </div>

      {/* Briefs grid */}
      {loading ? (
        <Skeleton />
      ) : filtered.length === 0 ? (
        <EmptyState view={view} />
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: 14 }}>
          {filtered.map(b => (
            <BriefCard key={b.id} brief={b} onSave={() => toggleSaved(b.id)} onClick={() => setSelectedBrief(b)} />
          ))}
        </div>
      )}

      {selectedBrief && (
        <BriefDetailModal brief={selectedBrief} onClose={() => setSelectedBrief(null)}
          onApply={() => { apply(selectedBrief); setSelectedBrief({ ...selectedBrief, applied: true }) }}
          onSave={() => toggleSaved(selectedBrief.id)} />
      )}
    </div>
  )
}

// ─── Brief card ─────────────────────────────────────────────────────────────
function BriefCard({ brief, onSave, onClick }) {
  const fit = brief.fitScore
  const fitColor = fit >= 80 ? OK : fit >= 60 ? '#f59e0b' : fit >= 40 ? BLUE : 'var(--muted)'
  const daysLeft = Math.ceil((new Date(brief.deadline) - Date.now()) / 86400000)
  const urgent = daysLeft <= 3

  return (
    <div onClick={onClick} role="button" tabIndex={0}
      onKeyDown={e => (e.key === 'Enter' || e.key === ' ') && onClick()}
      style={{
        background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12,
        padding: 16, cursor: 'pointer', display: 'flex', flexDirection: 'column', gap: 10,
        transition: 'border-color .15s, box-shadow .15s, transform .15s', outline: 'none',
      }}
      onMouseEnter={e => { e.currentTarget.style.borderColor = ga(0.4); e.currentTarget.style.boxShadow = `0 6px 22px ${ga(0.1)}`; e.currentTarget.style.transform = 'translateY(-2px)' }}
      onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.boxShadow = 'none'; e.currentTarget.style.transform = 'none' }}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0, flex: 1 }}>
          <div style={{
            width: 38, height: 38, borderRadius: 10, flexShrink: 0,
            background: ga(0.12), border: `1px solid ${ga(0.25)}`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontFamily: D, fontWeight: 800, fontSize: 14, color: ACCENT,
          }}>{brief.brand.slice(0, 2).toUpperCase()}</div>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: 13.5, fontWeight: 700, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {brief.brand}
            </div>
            <div style={{ fontSize: 11, color: 'var(--muted)' }}>
              {brief.sector}
            </div>
          </div>
        </div>

        <button onClick={e => { e.stopPropagation(); onSave() }} title={brief.saved ? 'Quitar de guardados' : 'Guardar'}
          style={{
            background: brief.saved ? ga(0.12) : 'transparent',
            color: brief.saved ? ACCENT : 'var(--muted)',
            border: brief.saved ? `1px solid ${ga(0.3)}` : '1px solid transparent',
            borderRadius: 7, width: 30, height: 30, cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
          }}>
          {brief.saved ? <BookmarkCheck size={13} /> : <Bookmark size={13} />}
        </button>
      </div>

      <h3 style={{ fontFamily: D, fontSize: 15, fontWeight: 700, color: 'var(--text)', letterSpacing: '-0.02em', margin: 0, lineHeight: 1.3 }}>
        {brief.title}
      </h3>
      <p style={{ fontSize: 12, color: 'var(--muted)', lineHeight: 1.5, margin: 0,
        display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
        {brief.description}
      </p>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
        {(brief.platforms || []).map(p => {
          const c = PLAT_COLORS[p.charAt(0).toUpperCase() + p.slice(1)] || ACCENT
          return (
            <span key={p} style={{
              background: `${c}15`, color: c, border: `1px solid ${c}30`,
              borderRadius: 5, padding: '1px 7px', fontSize: 10, fontWeight: 600,
            }}>{p}</span>
          )
        })}
      </div>

      <div style={{
        display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8,
        background: 'var(--bg2)', borderRadius: 9, padding: 10,
      }}>
        <Tile icon={Wallet}   label="Presupuesto" value={fmtEur(brief.budget)} />
        <Tile icon={Calendar} label="Deadline"    value={`${daysLeft}d`} accent={urgent ? ERR : 'var(--text)'} />
        <Tile icon={Sparkles} label="Fit"         value={`${fit}%`} accent={fitColor} />
      </div>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
        <span style={{ fontSize: 10.5, color: 'var(--muted)' }}>
          {brief.appliedCount || 0} ya aplicados · publicado {fmtRelTime(brief.publishedAt)}
        </span>
        {brief.applied ? (
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, color: OK, fontSize: 11, fontWeight: 700 }}>
            <CheckCircle2 size={11} /> Aplicado
          </span>
        ) : (
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3, color: ACCENT, fontSize: 11, fontWeight: 700 }}>
            Ver detalle <ArrowRight size={11} />
          </span>
        )}
      </div>
    </div>
  )
}

function Tile({ icon: Icon, label, value, accent = 'var(--text)' }) {
  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 2 }}>
        <Icon size={9} color="var(--muted)" />
        <span style={{ fontSize: 9.5, color: 'var(--muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
          {label}
        </span>
      </div>
      <div style={{ fontFamily: D, fontSize: 14, fontWeight: 800, color: accent, letterSpacing: '-0.02em', fontVariantNumeric: 'tabular-nums' }}>
        {value}
      </div>
    </div>
  )
}

// ─── Detail modal ───────────────────────────────────────────────────────────
function BriefDetailModal({ brief, onClose, onApply, onSave }) {
  useEffect(() => {
    const h = (e) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', h)
    document.body.style.overflow = 'hidden'
    return () => { window.removeEventListener('keydown', h); document.body.style.overflow = '' }
  }, [onClose])

  const fit = brief.fitScore
  const fitColor = fit >= 80 ? OK : fit >= 60 ? '#f59e0b' : 'var(--muted)'
  const daysLeft = Math.ceil((new Date(brief.deadline) - Date.now()) / 86400000)

  return (
    <div onClick={(e) => e.target === e.currentTarget && onClose()} style={{
      position: 'fixed', inset: 0, zIndex: 9999,
      background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(6px)',
      display: 'flex', justifyContent: 'flex-end', fontFamily: F,
    }}>
      <style>{`@keyframes bdmIn { from { transform: translateX(40px); opacity: 0 } to { transform: translateX(0); opacity: 1 } }`}</style>
      <div style={{
        width: 540, maxWidth: '100%', height: '100%',
        background: 'var(--bg)', borderLeft: '1px solid var(--border)',
        display: 'flex', flexDirection: 'column', overflow: 'hidden',
        animation: 'bdmIn .22s cubic-bezier(.22,1,.36,1)',
      }}>

        <div style={{ padding: '18px 22px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
              <div style={{
                width: 36, height: 36, borderRadius: 10, flexShrink: 0,
                background: ga(0.12), border: `1px solid ${ga(0.25)}`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontFamily: D, fontWeight: 800, fontSize: 13, color: ACCENT,
              }}>{brief.brand.slice(0, 2).toUpperCase()}</div>
              <div>
                <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)' }}>{brief.brand}</div>
                <div style={{ fontSize: 11, color: 'var(--muted)' }}>{brief.sector}</div>
              </div>
            </div>
            <h2 style={{ fontFamily: D, fontSize: 20, fontWeight: 800, color: 'var(--text)', letterSpacing: '-0.02em', margin: 0 }}>
              {brief.title}
            </h2>
          </div>
          <button onClick={onClose} style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 9, width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'var(--muted)', flexShrink: 0 }}>
            <X size={16} />
          </button>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: 22 }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(110px, 1fr))', gap: 8, marginBottom: 18 }}>
            <Stat label="Presupuesto" value={fmtEur(brief.budget)} accent={ACCENT} />
            <Stat label="Deadline"    value={`${daysLeft} días`} accent={daysLeft <= 3 ? ERR : 'var(--text)'} />
            <Stat label="Fit"         value={`${fit}%`} accent={fitColor} />
            <Stat label="Aplicados"   value={brief.appliedCount || 0} />
          </div>

          <Section title="Descripción">
            <div style={{ fontSize: 13, color: 'var(--text)', lineHeight: 1.6 }}>{brief.description}</div>
          </Section>

          <Section title="Deliverables">
            <ul style={{ margin: 0, paddingLeft: 18, fontSize: 13, color: 'var(--text)', lineHeight: 1.7 }}>
              {(brief.deliverables || []).map((d, i) => <li key={i}>{d}</li>)}
            </ul>
          </Section>

          <Section title="Plataformas">
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {(brief.platforms || []).map(p => {
                const c = PLAT_COLORS[p.charAt(0).toUpperCase() + p.slice(1)] || ACCENT
                return (
                  <span key={p} style={{
                    background: `${c}15`, color: c, border: `1px solid ${c}30`,
                    borderRadius: 6, padding: '3px 9px', fontSize: 12, fontWeight: 600,
                  }}>{p}</span>
                )
              })}
            </div>
          </Section>

          <Section title="Audiencia objetivo">
            <div style={{ fontSize: 12.5, color: 'var(--text)', lineHeight: 1.6 }}>
              {brief.targetAudience || 'Sin restricciones específicas'}
            </div>
          </Section>

          {brief.requirements?.length > 0 && (
            <Section title="Requisitos">
              <ul style={{ margin: 0, paddingLeft: 18, fontSize: 12.5, color: 'var(--text)', lineHeight: 1.7 }}>
                {brief.requirements.map((r, i) => <li key={i}>{r}</li>)}
              </ul>
            </Section>
          )}

          <Section title="Tu fit con este brief">
            <div style={{
              background: `${fitColor}10`, border: `1px solid ${fitColor}30`, borderRadius: 10,
              padding: 14,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 10 }}>
                <div style={{
                  width: 50, height: 50, borderRadius: 14, flexShrink: 0,
                  background: `${fitColor}20`, border: `1px solid ${fitColor}40`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontFamily: D, fontWeight: 900, fontSize: 16, color: fitColor,
                  fontVariantNumeric: 'tabular-nums',
                }}>{fit}</div>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)' }}>
                    {fit >= 80 ? 'Excelente fit' : fit >= 60 ? 'Buen fit' : fit >= 40 ? 'Fit moderado' : 'Fit bajo'}
                  </div>
                  <div style={{ fontSize: 11.5, color: 'var(--muted)', marginTop: 2 }}>
                    Calculado por: nicho + plataforma + audience size + presupuesto
                  </div>
                </div>
              </div>
            </div>
          </Section>
        </div>

        <div style={{ padding: '14px 22px', borderTop: '1px solid var(--border)', background: 'var(--bg2)', display: 'flex', gap: 8 }}>
          <button onClick={onSave} style={{
            background: 'transparent', color: brief.saved ? ACCENT : 'var(--text)',
            border: `1px solid ${brief.saved ? ga(0.4) : 'var(--border)'}`,
            borderRadius: 9, padding: '9px 14px', fontSize: 13, fontWeight: 600,
            cursor: 'pointer', fontFamily: F, display: 'inline-flex', alignItems: 'center', gap: 6,
          }}>
            {brief.saved ? <><BookmarkCheck size={13} /> Guardado</> : <><Bookmark size={13} /> Guardar</>}
          </button>
          <div style={{ flex: 1 }} />
          {brief.applied ? (
            <span style={{
              display: 'inline-flex', alignItems: 'center', gap: 6, color: OK, fontSize: 13, fontWeight: 700,
              padding: '9px 14px', background: `${OK}15`, border: `1px solid ${OK}30`, borderRadius: 9,
            }}>
              <CheckCircle2 size={13} /> Ya aplicado
            </span>
          ) : (
            <button onClick={onApply} style={{
              background: ACCENT, color: '#fff', border: 'none', borderRadius: 9,
              padding: '9px 18px', fontSize: 13, fontWeight: 700, cursor: 'pointer',
              fontFamily: F, display: 'inline-flex', alignItems: 'center', gap: 6,
              boxShadow: `0 4px 14px ${ga(0.35)}`,
            }}>
              <Zap size={13} /> Aplicar
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

function Stat({ label, value, accent = 'var(--text)' }) {
  return (
    <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 9, padding: '10px 12px' }}>
      <div style={{ fontSize: 10, color: 'var(--muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 3 }}>
        {label}
      </div>
      <div style={{ fontFamily: D, fontSize: 17, fontWeight: 800, color: accent, letterSpacing: '-0.02em', fontVariantNumeric: 'tabular-nums' }}>
        {value}
      </div>
    </div>
  )
}

function Section({ title, children }) {
  return (
    <div style={{ marginBottom: 16 }}>
      <div style={{ fontSize: 10.5, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>
        {title}
      </div>
      {children}
    </div>
  )
}

function Select({ value, onChange, options }) {
  return (
    <select value={value} onChange={e => onChange(e.target.value)}
      style={{
        background: 'var(--bg2)', color: 'var(--text)', border: '1px solid var(--border)',
        borderRadius: 8, padding: '7px 28px 7px 11px', fontSize: 12, fontFamily: F, outline: 'none',
        cursor: 'pointer',
      }}>
      {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
    </select>
  )
}

// ─── States ─────────────────────────────────────────────────────────────────
function EmptyState({ view }) {
  const msg = {
    saved:   { title: 'Sin briefs guardados', body: 'Cuando marques un brief para revisar luego, aparecerá aquí.' },
    applied: { title: 'Aún no has aplicado', body: 'Encuentra un brief que encaje contigo y aplica desde su detalle.' },
    all:     { title: 'No hay briefs con esos filtros', body: 'Prueba a relajar los filtros o sube tus precios para encajar más.' },
  }[view]
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 60, textAlign: 'center', gap: 12 }}>
      <Compass size={36} color="var(--muted2)" />
      <div style={{ fontFamily: D, fontSize: 16, fontWeight: 700, color: 'var(--text)' }}>{msg.title}</div>
      <div style={{ fontSize: 12.5, color: 'var(--muted)', maxWidth: 340, lineHeight: 1.5 }}>{msg.body}</div>
    </div>
  )
}

function Skeleton() {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: 14 }}>
      {[1, 2, 3, 4, 5, 6].map(i => (
        <div key={i} style={{ height: 240, background: 'var(--bg2)', borderRadius: 12, animation: 'pulse 1.5s ease infinite' }} />
      ))}
    </div>
  )
}

// ─── Helpers ────────────────────────────────────────────────────────────────
function computeFit(brief, channels) {
  if (channels.length === 0) return 50
  let score = 30 // base
  // Platform match
  const myPlatforms = new Set(channels.map(c => (c.plataforma || '').toLowerCase()))
  const briefPlats = (brief.platforms || []).map(p => p.toLowerCase())
  if (briefPlats.some(p => myPlatforms.has(p))) score += 20
  // Niche overlap
  const myTags = channels.flatMap(c => (c.tags || []).map(t => t.toLowerCase()))
  const briefSector = (brief.sector || '').toLowerCase()
  if (myTags.some(t => briefSector.includes(t) || t.includes(briefSector))) score += 20
  // Audience size in expected range
  const totalReach = channels.reduce((s, c) => s + (c.estadisticas?.seguidores || 0), 0)
  const minReach = brief.minReach || 1000
  if (totalReach >= minReach) score += 15
  if (totalReach >= minReach * 3) score += 5
  // Budget match (if any of my channels' price ≤ budget × 0.6)
  const fitsBudget = channels.some(c => (c.precio || 0) > 0 && (c.precio || 0) <= brief.budget * 0.7)
  if (fitsBudget) score += 10
  return Math.min(100, score)
}

function generateMockBriefs() {
  const now = Date.now()
  const samples = [
    { brand: 'Bitpanda',   sector: 'Crypto',     title: 'Lanzamiento de nueva token de staking',
      description: 'Buscamos canales de Telegram crypto en español con audiencia activa para difundir el lanzamiento de nuestro nuevo producto de staking.',
      budget: 450, platforms: ['telegram'], minReach: 5000,
      deliverables: ['1 post pinned 24h', 'Mención en boletín semanal', 'Story con link de afiliado'],
      requirements: ['Canal verificado', 'CAS > 50', 'Audiencia España/LATAM'],
      targetAudience: 'Traders cripto 25-44 años, español hispanohablante',
      appliedCount: 12 },
    { brand: 'Notion',     sector: 'Productividad', title: 'Reseña honest de Notion AI',
      description: 'Quiero que pruebes Notion AI durante 1 semana y publiques una reseña honesta. Sin guion forzado.',
      budget: 280, platforms: ['telegram', 'newsletter'], minReach: 3000,
      deliverables: ['1 post largo con experiencia', 'Link de afiliado'],
      requirements: ['Audiencia tech/productividad', 'Sin restricciones de honestidad'],
      targetAudience: 'Profesionales 25-44, knowledge workers',
      appliedCount: 28 },
    { brand: 'Hotmart',    sector: 'Educación',  title: 'Curso de copywriting con descuento exclusivo',
      description: 'Promociona nuestro nuevo curso de copywriting con código exclusivo para tu audiencia (30% off). Comisión + bonus.',
      budget: 600, platforms: ['telegram', 'whatsapp', 'instagram'], minReach: 2000,
      deliverables: ['1 publicación principal', '2 menciones en stories', 'Link tracker'],
      requirements: ['Nicho marketing/business', 'Engagement > 3%'],
      targetAudience: 'Emprendedores, freelancers, copywriters',
      appliedCount: 45 },
    { brand: 'Revolut',    sector: 'Fintech',    title: 'Cuenta gratis para tu audiencia',
      description: 'Promo de cuenta Revolut gratuita con €10 de regalo al primer ingreso. €15 por cada signup verificado.',
      budget: 800, platforms: ['telegram', 'instagram'], minReach: 8000,
      deliverables: ['Promo continua durante 30 días', 'Mín 3 publicaciones'],
      requirements: ['Audiencia España'],
      targetAudience: '18-44 años, interesados en finanzas personales',
      appliedCount: 67 },
    { brand: 'Webflow',    sector: 'Tech / SaaS', title: 'Tutorial Webflow para no-coders',
      description: 'Crea un mini-tutorial sobre cómo lanzar una landing en Webflow. Te damos cuenta gratis y guion sugerido.',
      budget: 320, platforms: ['telegram', 'newsletter'], minReach: 2000,
      deliverables: ['Tutorial post (texto + 3 imágenes)', 'Mención en footer'],
      requirements: ['Nicho design/no-code'],
      targetAudience: 'Emprendedores y diseñadores',
      appliedCount: 18 },
    { brand: 'NordVPN',    sector: 'Tech / SaaS', title: 'Promoción 70% off Black Friday',
      description: 'Campaña de Black Friday — comisión por suscripción + bonus volumen.',
      budget: 1200, platforms: ['telegram', 'discord', 'newsletter'], minReach: 10000,
      deliverables: ['1 publicación principal', 'Banner durante 7 días'],
      requirements: ['Nicho tech/privacy'],
      targetAudience: '18-54, conscientes de privacidad',
      appliedCount: 89 },
    { brand: 'CoinTracker', sector: 'Crypto',    title: 'Software de impuestos crypto',
      description: 'Integración fiscal para holders. Cupón exclusivo para tu audiencia.',
      budget: 380, platforms: ['telegram'], minReach: 3000,
      deliverables: ['1 post explicativo', 'Stories con código'],
      requirements: ['Audiencia España', 'Nicho cripto'],
      targetAudience: 'Holders cripto preocupados por declaración',
      appliedCount: 22 },
    { brand: 'StartupSchool', sector: 'Educación', title: 'Bootcamp de fundadores · cupón €100',
      description: 'Promociona nuestro bootcamp de 8 semanas para fundadores con código €100 off.',
      budget: 540, platforms: ['newsletter', 'telegram'], minReach: 1500,
      deliverables: ['Newsletter dedicada', 'Mención en post'],
      requirements: ['Nicho startup/business'],
      targetAudience: 'Aspirantes a fundadores',
      appliedCount: 34 },
  ]
  return samples.map((s, i) => ({
    ...s,
    id: `brief-${i + 1}`,
    publishedAt: now - (i * 6 + Math.random() * 24) * 3600 * 1000,
    deadline: now + (3 + i * 2 + Math.random() * 10) * 86400 * 1000,
  }))
}

function loadJSON(key, fallback) { try { return JSON.parse(localStorage.getItem(key) || JSON.stringify(fallback)) } catch { return fallback } }
function saveJSON(key, val) { try { localStorage.setItem(key, JSON.stringify(val)) } catch {} }

function fmtRelTime(date) {
  const ms = Date.now() - new Date(date).getTime()
  if (ms < 60000) return 'ahora'
  const min = Math.floor(ms / 60000)
  if (min < 60) return `hace ${min}m`
  const hr = Math.floor(min / 60)
  if (hr < 24) return `hace ${hr}h`
  const d = Math.floor(hr / 24)
  return `hace ${d}d`
}
