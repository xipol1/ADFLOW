import React, { useState, useEffect } from 'react'
import { useSearchParams, useNavigate, Link } from 'react-router-dom'
import { Helmet } from 'react-helmet-async'
import { TrendingUp, TrendingDown, Minus, ChevronRight } from 'lucide-react'
import apiService from '../../../../services/api'
import { useAuth } from '../../../auth/AuthContext'
import { Badge, TableRowSkeleton } from '../../../components/ui'
import { scoreLabel } from '../../../components/ui/ScoreBar'

function maskName(name) {
  if (!name || name.length <= 2) return '••••••'
  return name.slice(0, 2) + '•'.repeat(Math.min(name.length - 2, 8))
}
function maskUsername(u) {
  if (!u || u.length <= 2) return '@••••••'
  return '@' + u.replace(/^@/, '').slice(0, 2) + '•'.repeat(6)
}

const CATEGORIES = [
  { key: 'all', label: 'Todos' },
  { key: 'finanzas', label: 'Finanzas' },
  { key: 'marketing', label: 'Marketing' },
  { key: 'tecnologia', label: 'Tecnologia' },
  { key: 'cripto', label: 'Crypto' },
  { key: 'salud', label: 'Salud' },
  { key: 'educacion', label: 'Educacion' },
  { key: 'lifestyle', label: 'Lifestyle' },
  { key: 'entretenimiento', label: 'Entretenimiento' },
]

const MEDALS = ['🥇', '🥈', '🥉']
const TOP_BORDERS = ['var(--gold)', 'var(--text-secondary)', '#CD7F32']

const fmtNum = (n) => {
  if (n == null) return '—'
  if (n >= 1e6) return `${(n / 1e6).toFixed(1)}M`
  if (n >= 1e3) return `${(n / 1e3).toFixed(n >= 10000 ? 0 : 1)}K`
  return String(n)
}

function scoreColor(v) {
  if (v >= 90) return 'var(--gold)'
  if (v >= 75) return 'var(--accent)'
  if (v >= 60) return 'var(--blue)'
  if (v >= 40) return '#E3B341'
  return 'var(--red)'
}

function DeltaBadge({ delta }) {
  if (delta == null) return <span style={{ color: 'var(--muted2)', fontFamily: 'var(--font-mono)' }} className="text-xs">—</span>
  if (delta === 0) return <span className="inline-flex items-center gap-0.5 text-xs" style={{ color: 'var(--muted2)', fontFamily: 'var(--font-mono)' }}><Minus size={12} />0</span>
  const up = delta > 0
  return (
    <span className="inline-flex items-center gap-0.5 text-xs font-semibold" style={{ color: up ? 'var(--accent)' : 'var(--red)', fontFamily: 'var(--font-mono)' }}>
      {up ? <TrendingUp size={12} /> : <TrendingDown size={12} />}{Math.abs(delta)}
    </span>
  )
}

const CATEGORY_COLORS = {
  finanzas: '#F0B429', marketing: '#00D4A8', tecnologia: '#58A6FF',
  cripto: '#F59E0B', salud: '#10B981', educacion: '#8B5CF6',
  lifestyle: '#EC4899', entretenimiento: '#F97316', default: '#8B949E',
}

export default function RankingsPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const navigate = useNavigate()
  const { isAuthenticated } = useAuth()
  const activeCategory = searchParams.get('categoria') || 'all'
  const [rankings, setRankings] = useState([])
  const [deltas, setDeltas] = useState({})
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    apiService.getChannelRankings(activeCategory, 20).then((res) => {
      if (cancelled) return
      if (res?.success && res.data) { setRankings(res.data.rankings || []); setDeltas(res.data.deltas || {}) }
    }).catch(() => { if (!cancelled) setRankings([]) })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [activeCategory])

  const categoryLabel = CATEGORIES.find((c) => c.key === activeCategory)?.label || 'Todos'

  const th = 'px-3 py-2.5 text-[10px] font-bold uppercase tracking-widest whitespace-nowrap'

  return (
    <div className="min-h-screen" style={{ background: 'var(--bg)', fontFamily: 'var(--font-sans)' }}>
      <Helmet>
        <title>{`Top Canales ${categoryLabel} · Rankings · Channelad`}</title>
        <meta name="description" content={`Ranking de los mejores canales de ${categoryLabel} para publicidad.`} />
      </Helmet>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8">

        {/* Header */}
        <div className="flex items-baseline justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold tracking-tight" style={{ color: 'var(--text)' }}>Rankings</h1>
            <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>Actualizado diariamente</p>
          </div>
          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold animate-pulse" style={{ background: 'var(--accent-dim)', color: 'var(--accent)', border: '1px solid var(--accent-border)' }}>
            <span className="w-1.5 h-1.5 rounded-full" style={{ background: 'var(--accent)' }} /> LIVE
          </span>
        </div>

        {/* Category tabs */}
        <div className="flex gap-1 overflow-x-auto pb-1 mb-6 p-1 rounded-lg scrollbar-none" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
          {CATEGORIES.map((cat) => {
            const active = activeCategory === cat.key
            return (
              <button
                key={cat.key}
                onClick={() => { const next = new URLSearchParams(); if (cat.key !== 'all') next.set('categoria', cat.key); setSearchParams(next) }}
                className="px-4 py-2 rounded-md text-[13px] font-medium whitespace-nowrap transition-colors"
                style={{
                  background: active ? 'var(--accent)' : 'transparent',
                  color: active ? '#080C10' : 'var(--text-secondary)',
                  border: 'none', cursor: 'pointer',
                }}
              >
                {cat.label}
              </button>
            )
          })}
        </div>

        {/* Table */}
        <div className="rounded-xl overflow-hidden" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
          {loading ? (
            <table className="w-full" style={{ minWidth: 700 }}>
              <tbody>{Array.from({ length: 10 }).map((_, i) => <TableRowSkeleton key={i} cols={9} />)}</tbody>
            </table>
          ) : rankings.length === 0 ? (
            <div className="text-center py-16">
              <div className="text-3xl mb-3">📊</div>
              <p className="text-sm font-medium" style={{ color: 'var(--text)' }}>No hay canales en esta categoria</p>
              <p className="text-xs mt-1" style={{ color: 'var(--muted2)' }}>Los rankings se actualizan diariamente</p>
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table className="w-full" style={{ minWidth: 750, borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ background: 'var(--bg3)' }}>
                    <th className={`${th} text-center w-12`} style={{ color: 'var(--text-secondary)' }}>#</th>
                    <th className={`${th} text-center w-16`} style={{ color: 'var(--text-secondary)' }}>Δ 7d</th>
                    <th className={`${th} text-left`} style={{ color: 'var(--text-secondary)' }}>Canal</th>
                    <th className={`${th} text-center w-12`} style={{ color: 'var(--text-secondary)' }}></th>
                    <th className={`${th} text-right w-24`} style={{ color: 'var(--text-secondary)' }}>Subs</th>
                    <th className={`${th} text-right w-20`} style={{ color: 'var(--text-secondary)' }}>CER</th>
                    <th className={`${th} text-center w-20`} style={{ color: 'var(--text-secondary)' }}>Score</th>
                    <th className={`${th} text-right w-20`} style={{ color: 'var(--text-secondary)' }}>€/post</th>
                    <th className={`${th} w-10`} style={{ color: 'var(--text-secondary)' }}></th>
                  </tr>
                </thead>
                <tbody>
                  {rankings.map((ch) => {
                    const isTop3 = ch.position <= 3
                    const delta = deltas[String(ch.id)] ?? null
                    const catColor = CATEGORY_COLORS[(ch.categoria || '').toLowerCase()] || CATEGORY_COLORS.default

                    return (
                      <tr
                        key={ch.id}
                        onClick={() => navigate(`/channel/${ch.id}`)}
                        className="cursor-pointer transition-colors group"
                        style={{
                          borderBottom: '1px solid var(--border)',
                          borderLeft: isTop3 ? `3px solid ${TOP_BORDERS[ch.position - 1]}` : '3px solid transparent',
                        }}
                        onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--bg-hover, var(--bg3))' }}
                        onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent' }}
                      >
                        <td className="px-3 py-3 text-center">
                          {isTop3 ? <span className="text-lg">{MEDALS[ch.position - 1]}</span> : (
                            <span className="text-sm font-medium" style={{ color: 'var(--muted2)', fontFamily: 'var(--font-mono)' }}>{ch.position}</span>
                          )}
                        </td>
                        <td className="px-3 py-3 text-center"><DeltaBadge delta={delta} /></td>
                        <td className="px-3 py-3">
                          <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold flex-shrink-0" style={{ background: `${catColor}12`, color: catColor, border: `1px solid ${catColor}25` }}>
                              {isAuthenticated ? (ch.nombre || '?').charAt(0).toUpperCase() : '?'}
                            </div>
                            <div className="min-w-0">
                              <div className="text-sm font-medium truncate" style={{ color: 'var(--text)', maxWidth: 180 }}>
                                {isAuthenticated ? (ch.nombre || '—') : maskName(ch.nombre)}
                                {ch.verificado && <span className="ml-1 text-[10px]" style={{ color: 'var(--accent)' }}>✓</span>}
                              </div>
                              <div className="text-[11px] truncate" style={{ color: 'var(--muted2)', fontFamily: 'var(--font-mono)' }}>
                                {isAuthenticated ? (ch.username || '') : maskUsername(ch.username)}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-3 py-3 text-center"><Badge label={ch.plataforma} variant="platform" platform={ch.plataforma} /></td>
                        <td className="px-3 py-3 text-right text-sm font-medium" style={{ color: 'var(--text)', fontFamily: 'var(--font-mono)' }}>{fmtNum(ch.seguidores)}</td>
                        <td className="px-3 py-3 text-right text-xs" style={{ color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)' }}>
                          {ch.engagement != null ? Number(ch.engagement).toFixed(0) : '—'}
                        </td>
                        <td className="px-3 py-3 text-center">
                          <div className="inline-flex flex-col items-center gap-0.5">
                            <span className="text-sm font-medium" style={{ color: scoreColor(ch.CAS), fontFamily: 'var(--font-mono)' }}>{Math.round(ch.CAS || 0)}</span>
                            <div className="w-10 h-0.5 rounded-full overflow-hidden" style={{ background: 'var(--border)' }}>
                              <div className="h-full rounded-full" style={{ width: `${ch.CAS || 0}%`, background: scoreColor(ch.CAS) }} />
                            </div>
                          </div>
                        </td>
                        <td className="px-3 py-3 text-right text-sm font-medium" style={{ color: 'var(--text)', fontFamily: 'var(--font-mono)' }}>
                          {isAuthenticated
                            ? (ch.precio > 0 || ch.CPMDinamico > 0 ? `€${(ch.precio || ch.CPMDinamico).toFixed(0)}` : '—')
                            : '€••'
                          }
                        </td>
                        <td className="px-3 py-3 text-center">
                          <ChevronRight size={14} className="transition-colors" style={{ color: 'var(--muted2)' }} />
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="text-center py-6">
          <p className="text-xs" style={{ color: 'var(--muted2)' }}>Rankings actualizados diariamente por ChannelAd Scoring Engine v2.0</p>
          <Link to="/explore" className="text-xs font-medium mt-1 inline-block" style={{ color: 'var(--accent)' }}>Ver todos los canales →</Link>
        </div>
      </div>
    </div>
  )
}
