import React, { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Building2, Search, Star, Wallet, Calendar, ArrowRight,
  TrendingUp, TrendingDown, AlertTriangle, MessageSquare,
  CheckCircle2, Crown, Repeat, X, Mail,
} from 'lucide-react'
import apiService from '../../../../services/api'
import { FONT_BODY as F, FONT_DISPLAY as D, GREEN, greenAlpha, OK, WARN, ERR, BLUE } from '../../../theme/tokens'

const ACCENT = GREEN
const ga = greenAlpha
const fmtEur = (n) => `€${Math.round(Number(n) || 0).toLocaleString('es')}`

/**
 * CreatorBrandsPage — CRM de advertisers con los que has trabajado.
 *
 * Espejo de "Past brands" (Aspire) y "Saved brands" (CreatorIQ). Agrupa por
 * advertiser todas las campañas COMPLETED + PAID. Permite segmentar por:
 *   - Top spenders (más revenue)
 *   - Recientes (últimos 30 días)
 *   - At risk (no han vuelto en 60+ días)
 *   - Best rated
 *
 * Útil para: outreach proactivo, repeat business, identificar churn antes
 * de que se vayan.
 */
export default function CreatorBrandsPage() {
  const navigate = useNavigate()
  const [campaigns, setCampaigns] = useState([])
  const [requests, setRequests] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [segment, setSegment] = useState('all')
  const [selected, setSelected] = useState(null)

  useEffect(() => {
    let mounted = true
    Promise.all([
      apiService.getCreatorCampaigns?.().catch(() => null),
      apiService.getAdsForCreator?.().catch(() => null),
    ]).then(([cmpRes, adRes]) => {
      if (!mounted) return
      if (cmpRes?.success && Array.isArray(cmpRes.data)) setCampaigns(cmpRes.data)
      if (adRes?.success && Array.isArray(adRes.data)) setRequests(adRes.data)
      setLoading(false)
    }).catch(() => mounted && setLoading(false))
    return () => { mounted = false }
  }, [])

  // Aggregate by brand
  const brands = useMemo(() => {
    const map = {}
    const all = [...campaigns, ...requests.filter(r => r.status === 'aceptada' || r.status === 'rechazada')]
    all.forEach(item => {
      const name = item.advertiserName || item.advertiser?.nombre || item.anunciante || 'Anunciante'
      if (!map[name]) {
        map[name] = {
          name, sector: item.sector || item.advertiser?.sector || '—',
          email: item.advertiser?.email || '',
          campaigns: [], totalRevenue: 0, completedCount: 0,
          ratings: [], lastCampaignAt: 0, firstCampaignAt: Infinity,
          rejectedCount: 0,
        }
      }
      const m = map[name]
      m.campaigns.push(item)
      const date = new Date(item.completedAt || item.createdAt).getTime()
      if (date > m.lastCampaignAt) m.lastCampaignAt = date
      if (date < m.firstCampaignAt) m.firstCampaignAt = date
      if (item.status === 'COMPLETED') {
        m.completedCount++
        m.totalRevenue += (item.netAmount || 0)
        if (Number(item.rating) > 0) m.ratings.push(Number(item.rating))
      }
      if (item.status === 'rechazada') m.rejectedCount++
    })
    return Object.values(map).map(b => ({
      ...b,
      avgRating: b.ratings.length ? b.ratings.reduce((s, r) => s + r, 0) / b.ratings.length : 0,
      daysSinceLast: Math.floor((Date.now() - b.lastCampaignAt) / 86400000),
      relationship: classifyRelationship(b),
    }))
  }, [campaigns, requests])

  const filtered = useMemo(() => {
    let list = brands
    if (segment === 'top')      list = list.filter(b => b.totalRevenue > 0).sort((a, b) => b.totalRevenue - a.totalRevenue).slice(0, 10)
    if (segment === 'recent')   list = list.filter(b => b.daysSinceLast <= 30).sort((a, b) => a.daysSinceLast - b.daysSinceLast)
    if (segment === 'risk')     list = list.filter(b => b.daysSinceLast > 60 && b.completedCount >= 2).sort((a, b) => b.daysSinceLast - a.daysSinceLast)
    if (segment === 'rated')    list = list.filter(b => b.avgRating >= 4.5).sort((a, b) => b.avgRating - a.avgRating)
    if (search.trim()) {
      const q = search.toLowerCase()
      list = list.filter(b => b.name.toLowerCase().includes(q) || b.sector.toLowerCase().includes(q))
    }
    if (segment === 'all') list = list.slice().sort((a, b) => b.lastCampaignAt - a.lastCampaignAt)
    return list
  }, [brands, segment, search])

  const stats = useMemo(() => ({
    total: brands.length,
    repeat: brands.filter(b => b.completedCount >= 2).length,
    revenue: brands.reduce((s, b) => s + b.totalRevenue, 0),
    avgRating: brands.filter(b => b.avgRating > 0).reduce((s, b, _, arr) => s + b.avgRating / arr.length, 0),
  }), [brands])

  return (
    <div style={{ fontFamily: F, display: 'flex', flexDirection: 'column', gap: 22, maxWidth: 1200 }}>
      <div>
        <h1 style={{ fontFamily: D, fontSize: 26, fontWeight: 800, color: 'var(--text)', letterSpacing: '-0.03em', margin: '0 0 6px' }}>
          Brands CRM
        </h1>
        <p style={{ fontSize: 14, color: 'var(--muted)', margin: 0 }}>
          Tus advertisers — quiénes te han pagado más, quiénes vuelven y quiénes deberías reactivar.
        </p>
      </div>

      {/* KPI stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12 }}>
        <KpiCard icon={Building2} label="Total advertisers" value={stats.total} accent={ACCENT} />
        <KpiCard icon={Repeat}    label="Recurrentes"       value={stats.repeat} accent={BLUE} sub={stats.total > 0 ? `${Math.round(stats.repeat / stats.total * 100)}% repeat rate` : ''} />
        <KpiCard icon={Wallet}    label="Revenue total"     value={fmtEur(stats.revenue)} accent={OK} />
        <KpiCard icon={Star}      label="Rating promedio"   value={stats.avgRating ? `${stats.avgRating.toFixed(1)} ★` : '—'} accent="#f59e0b" />
      </div>

      {/* Filter bar */}
      <div style={{
        background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12,
        padding: 12, display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap',
      }}>
        <div style={{ position: 'relative', flex: 1, minWidth: 200 }}>
          <Search size={13} color="var(--muted)" style={{ position: 'absolute', left: 11, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar advertiser o sector"
            style={{
              width: '100%', boxSizing: 'border-box',
              background: 'var(--bg2)', color: 'var(--text)', border: '1px solid var(--border)',
              borderRadius: 8, padding: '8px 12px 8px 32px', fontSize: 13, fontFamily: F, outline: 'none',
            }} />
        </div>
        <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
          {[
            { id: 'all',    label: 'Todos' },
            { id: 'top',    label: '👑 Top spenders' },
            { id: 'recent', label: 'Recientes' },
            { id: 'rated',  label: 'Mejor valorados' },
            { id: 'risk',   label: '⚠ At risk', count: brands.filter(b => b.daysSinceLast > 60 && b.completedCount >= 2).length },
          ].map(s => {
            const active = segment === s.id
            return (
              <button key={s.id} onClick={() => setSegment(s.id)} style={{
                background: active ? ga(0.12) : 'var(--bg2)',
                color: active ? ACCENT : 'var(--muted)',
                border: `1px solid ${active ? ga(0.3) : 'var(--border)'}`,
                borderRadius: 7, padding: '6px 11px', fontSize: 11.5, fontWeight: active ? 700 : 500,
                cursor: 'pointer', fontFamily: F, whiteSpace: 'nowrap',
                display: 'inline-flex', alignItems: 'center', gap: 4,
              }}>
                {s.label}
                {s.count > 0 && (
                  <span style={{ fontSize: 9.5, fontWeight: 800, padding: '0 5px', background: active ? `${ACCENT}30` : `${ERR}20`, color: active ? ACCENT : ERR, borderRadius: 10 }}>
                    {s.count}
                  </span>
                )}
              </button>
            )
          })}
        </div>
      </div>

      {/* Brand list */}
      {loading ? (
        <div style={{ height: 400, background: 'var(--bg2)', borderRadius: 12, animation: 'pulse 1.5s ease infinite' }} />
      ) : filtered.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 60, background: 'var(--surface)', border: '1px dashed var(--border)', borderRadius: 14 }}>
          <Building2 size={36} color="var(--muted2)" style={{ margin: '0 auto 12px' }} />
          <div style={{ fontFamily: D, fontSize: 16, fontWeight: 700, color: 'var(--text)' }}>Sin brands aún</div>
          <div style={{ fontSize: 12.5, color: 'var(--muted)', marginTop: 6 }}>Cuando completes campañas, los advertisers aparecerán aquí.</div>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 12 }}>
          {filtered.map(b => <BrandCard key={b.name} brand={b} onClick={() => setSelected(b)} />)}
        </div>
      )}

      {selected && <BrandDetailModal brand={selected} onClose={() => setSelected(null)} navigate={navigate} />}
    </div>
  )
}

function classifyRelationship(b) {
  if (b.completedCount === 0)         return { label: 'Sin campañas',  color: 'var(--muted)', icon: AlertTriangle }
  if (b.completedCount === 1)         return { label: 'Primera vez',   color: BLUE, icon: Star }
  if (b.daysSinceLast > 60)           return { label: 'Inactivo',      color: ERR, icon: AlertTriangle }
  if (b.totalRevenue > 1000)          return { label: 'Top spender',   color: '#f59e0b', icon: Crown }
  if (b.completedCount >= 3)          return { label: 'Recurrente',    color: OK, icon: Repeat }
  return { label: 'Activo', color: ACCENT, icon: CheckCircle2 }
}

function BrandCard({ brand, onClick }) {
  const Icon = brand.relationship.icon
  return (
    <div onClick={onClick} role="button" tabIndex={0}
      onKeyDown={e => (e.key === 'Enter' || e.key === ' ') && onClick()}
      style={{
        background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12,
        padding: 14, cursor: 'pointer', display: 'flex', flexDirection: 'column', gap: 10,
        transition: 'border-color .15s, box-shadow .15s, transform .15s', outline: 'none',
      }}
      onMouseEnter={e => { e.currentTarget.style.borderColor = ga(0.4); e.currentTarget.style.boxShadow = `0 6px 22px ${ga(0.1)}`; e.currentTarget.style.transform = 'translateY(-2px)' }}
      onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.boxShadow = 'none'; e.currentTarget.style.transform = 'none' }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{
          width: 38, height: 38, borderRadius: 10, flexShrink: 0,
          background: ga(0.12), border: `1px solid ${ga(0.25)}`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontFamily: D, fontWeight: 800, fontSize: 14, color: ACCENT,
        }}>{brand.name.slice(0, 2).toUpperCase()}</div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ fontSize: 13.5, fontWeight: 700, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {brand.name}
            </span>
          </div>
          <div style={{ fontSize: 11, color: 'var(--muted)' }}>{brand.sector}</div>
        </div>
        <span style={{
          background: `${brand.relationship.color}15`, color: brand.relationship.color,
          border: `1px solid ${brand.relationship.color}30`, borderRadius: 20,
          padding: '2px 9px', fontSize: 10, fontWeight: 700, flexShrink: 0,
          display: 'inline-flex', alignItems: 'center', gap: 4,
        }}>
          <Icon size={10} /> {brand.relationship.label}
        </span>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, background: 'var(--bg2)', borderRadius: 9, padding: 9 }}>
        <Tile label="Revenue"    value={fmtEur(brand.totalRevenue)} accent={ACCENT} />
        <Tile label="Campañas"   value={brand.completedCount} />
        <Tile label="Rating"     value={brand.avgRating ? `${brand.avgRating.toFixed(1)}★` : '—'} accent={brand.avgRating >= 4.5 ? OK : 'var(--text)'} />
      </div>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ fontSize: 10.5, color: brand.daysSinceLast > 60 ? ERR : 'var(--muted)' }}>
          Última colab: hace {brand.daysSinceLast}d
        </span>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3, color: ACCENT, fontSize: 11, fontWeight: 700 }}>
          Detalle <ArrowRight size={11} />
        </span>
      </div>
    </div>
  )
}

function Tile({ label, value, accent = 'var(--text)' }) {
  return (
    <div>
      <div style={{ fontSize: 9.5, color: 'var(--muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em' }}>{label}</div>
      <div style={{ fontFamily: D, fontSize: 14, fontWeight: 800, color: accent, letterSpacing: '-0.02em', fontVariantNumeric: 'tabular-nums', marginTop: 2 }}>
        {value}
      </div>
    </div>
  )
}

function KpiCard({ icon: Icon, label, value, accent, sub }) {
  return (
    <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, padding: 14 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
        <div style={{
          width: 30, height: 30, borderRadius: 8,
          background: `${accent}15`, border: `1px solid ${accent}30`,
          display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
        }}>
          <Icon size={14} color={accent} strokeWidth={2.2} />
        </div>
        <span style={{ fontSize: 11, color: 'var(--muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</span>
      </div>
      <div style={{ fontFamily: D, fontSize: 22, fontWeight: 800, color: 'var(--text)', letterSpacing: '-0.02em', fontVariantNumeric: 'tabular-nums' }}>
        {value}
      </div>
      {sub && <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 2 }}>{sub}</div>}
    </div>
  )
}

function BrandDetailModal({ brand, onClose, navigate }) {
  useEffect(() => {
    const h = (e) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', h)
    document.body.style.overflow = 'hidden'
    return () => { window.removeEventListener('keydown', h); document.body.style.overflow = '' }
  }, [onClose])

  const completed = brand.campaigns.filter(c => c.status === 'COMPLETED').sort((a, b) => new Date(b.completedAt || b.createdAt) - new Date(a.completedAt || a.createdAt))

  return (
    <div onClick={(e) => e.target === e.currentTarget && onClose()} style={{
      position: 'fixed', inset: 0, zIndex: 9999, background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(6px)',
      display: 'flex', justifyContent: 'flex-end', fontFamily: F,
    }}>
      <div style={{
        width: 480, maxWidth: '100%', height: '100%', background: 'var(--bg)',
        borderLeft: '1px solid var(--border)', display: 'flex', flexDirection: 'column', overflow: 'hidden',
      }}>
        <div style={{ padding: '18px 22px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{
              width: 48, height: 48, borderRadius: 12,
              background: ga(0.15), border: `1px solid ${ga(0.3)}`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontFamily: D, fontWeight: 800, fontSize: 18, color: ACCENT,
            }}>{brand.name.slice(0, 2).toUpperCase()}</div>
            <div>
              <h2 style={{ fontFamily: D, fontSize: 18, fontWeight: 800, color: 'var(--text)', margin: 0 }}>
                {brand.name}
              </h2>
              <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 2 }}>{brand.sector}</div>
            </div>
          </div>
          <button onClick={onClose} style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 9, width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'var(--muted)' }}>
            <X size={16} />
          </button>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: 22 }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 8, marginBottom: 20 }}>
            <Stat label="Revenue total" value={fmtEur(brand.totalRevenue)} accent={ACCENT} />
            <Stat label="Campañas completadas" value={brand.completedCount} />
            <Stat label="Rating dado" value={brand.avgRating ? `${brand.avgRating.toFixed(1)} ★` : '—'} accent={brand.avgRating >= 4.5 ? OK : 'var(--text)'} />
            <Stat label="Última colab" value={brand.daysSinceLast === 0 ? 'Hoy' : `Hace ${brand.daysSinceLast}d`} accent={brand.daysSinceLast > 60 ? ERR : 'var(--text)'} />
          </div>

          {brand.daysSinceLast > 60 && brand.completedCount >= 2 && (
            <div style={{
              background: `${ERR}10`, border: `1px solid ${ERR}30`, borderRadius: 10,
              padding: 12, marginBottom: 16, display: 'flex', alignItems: 'flex-start', gap: 10,
            }}>
              <AlertTriangle size={14} color={ERR} style={{ flexShrink: 0, marginTop: 2 }} />
              <div>
                <div style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--text)' }}>
                  Brand inactivo desde hace {brand.daysSinceLast} días
                </div>
                <div style={{ fontSize: 11.5, color: 'var(--muted)', marginTop: 3, lineHeight: 1.5 }}>
                  Has completado {brand.completedCount} campañas con {brand.name}. Considera reactivar la relación con un mensaje de outreach.
                </div>
              </div>
            </div>
          )}

          <div style={{ fontSize: 11, color: 'var(--muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>
            Historial ({completed.length})
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {completed.map((c, i) => (
              <div key={c._id || i} style={{
                background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 9, padding: 10,
                display: 'flex', alignItems: 'center', gap: 10,
              }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {c.title || 'Campaña'}
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--muted)' }}>
                    {new Date(c.completedAt || c.createdAt).toLocaleDateString('es')} · {fmtEur(c.netAmount || 0)}
                  </div>
                </div>
                {Number(c.rating) > 0 && (
                  <span style={{ fontSize: 12, color: '#f59e0b', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: 3 }}>
                    {c.rating} <Star size={11} fill="#f59e0b" />
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>

        <div style={{ padding: '14px 22px', borderTop: '1px solid var(--border)', background: 'var(--bg2)', display: 'flex', gap: 8 }}>
          <button onClick={() => { onClose(); navigate('/creator/inbox') }} style={{
            background: 'transparent', color: 'var(--text)', border: '1px solid var(--border)',
            borderRadius: 9, padding: '9px 14px', fontSize: 13, fontWeight: 600,
            cursor: 'pointer', fontFamily: F, display: 'inline-flex', alignItems: 'center', gap: 6,
          }}>
            <MessageSquare size={13} /> Mensaje
          </button>
          {brand.email && (
            <a href={`mailto:${brand.email}`} style={{
              background: 'transparent', color: 'var(--text)', border: '1px solid var(--border)',
              borderRadius: 9, padding: '9px 14px', fontSize: 13, fontWeight: 600,
              cursor: 'pointer', fontFamily: F, textDecoration: 'none',
              display: 'inline-flex', alignItems: 'center', gap: 6,
            }}>
              <Mail size={13} /> Email
            </a>
          )}
          <div style={{ flex: 1 }} />
          <button onClick={() => { onClose(); navigate('/creator/discover') }} style={{
            background: ACCENT, color: '#fff', border: 'none', borderRadius: 9,
            padding: '9px 16px', fontSize: 13, fontWeight: 700,
            cursor: 'pointer', fontFamily: F, display: 'inline-flex', alignItems: 'center', gap: 6,
            boxShadow: `0 4px 14px ${ga(0.35)}`,
          }}>
            Ver briefs <ArrowRight size={13} />
          </button>
        </div>
      </div>
    </div>
  )
}

function Stat({ label, value, accent = 'var(--text)' }) {
  return (
    <div style={{ background: 'var(--bg2)', borderRadius: 9, padding: 11 }}>
      <div style={{ fontSize: 10, color: 'var(--muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 3 }}>
        {label}
      </div>
      <div style={{ fontFamily: D, fontSize: 17, fontWeight: 800, color: accent, letterSpacing: '-0.02em', fontVariantNumeric: 'tabular-nums' }}>
        {value}
      </div>
    </div>
  )
}
