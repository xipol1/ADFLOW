import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../auth/AuthContext'
import Badge from './Badge'
import { scoreLabel } from './ScoreBar'

function maskName(name) {
  if (!name || name.length <= 2) return '••••••'
  return name.slice(0, 2) + '•'.repeat(Math.min(name.length - 2, 8))
}
function maskUsername(username) {
  if (!username || username.length <= 2) return '@••••••'
  return '@' + username.slice(0, 2) + '•'.repeat(Math.min(username.length - 2, 6))
}

const CATEGORY_COLORS = {
  finanzas: '#F0B429', marketing: '#00D4A8', tecnologia: '#58A6FF',
  cripto: '#F59E0B', salud: '#10B981', educacion: '#8B5CF6',
  lifestyle: '#EC4899', entretenimiento: '#F97316',
  crypto: '#F59E0B', tech: '#58A6FF', negocios: '#00D4A8',
  gaming: '#5865f2', default: '#8B949E',
}

function fmtNum(n) {
  if (n == null || Number.isNaN(n)) return '—'
  if (n >= 1e6) return `${(n / 1e6).toFixed(1)}M`
  if (n >= 1e3) return `${(n / 1e3).toFixed(n >= 10000 ? 0 : 1)}K`
  return String(n)
}

function scoreColor(v) {
  if (v >= 90) return 'var(--gold, #F0B429)'
  if (v >= 75) return 'var(--accent, #00D4A8)'
  if (v >= 60) return 'var(--blue, #58A6FF)'
  if (v >= 40) return '#E3B341'
  return 'var(--red, #F85149)'
}

function MiniStat({ label, value }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-lg py-2 px-1" style={{ background: 'var(--bg, #080C10)' }}>
      <span className="text-sm font-medium leading-none" style={{ color: 'var(--text)', fontFamily: 'var(--font-mono)' }}>{value}</span>
      <span className="text-[9px] mt-0.5 uppercase tracking-wider" style={{ color: 'var(--muted2)' }}>{label}</span>
    </div>
  )
}

export default function ChannelCardNew({ channel, onClick }) {
  const [hover, setHover] = useState(false)
  const navigate = useNavigate()
  const { isAuthenticated } = useAuth()

  if (!channel) return null

  const {
    id, _id, nombre, name, nombreCanal,
    plataforma, platform,
    categoria, category, nicho,
    audiencia, audience, seguidores,
    CAS, score, nivel,
    CPMDinamico, precio, pricePerPost,
    verificado, verified,
    engagement, CER,
    views_trend,
    avg_views,
    claimed,
  } = channel

  const cId = id || _id
  const cName = nombre || name || nombreCanal || '—'
  const cPlatform = (plataforma || platform || '').toLowerCase()
  const cCategory = (categoria || category || nicho || '').toLowerCase()
  const cSubs = audiencia || audience || seguidores || 0
  const cScore = CAS ?? score ?? null
  const cPrice = CPMDinamico || precio || pricePerPost || 0
  const cVerified = verificado || verified || false
  const cEngagement = engagement || CER || null
  const cAvgViews = avg_views || null
  const cTrending = views_trend === 'creciente'
  const catColor = CATEGORY_COLORS[cCategory] || CATEGORY_COLORS.default

  const handleClick = () => {
    if (onClick) onClick(channel)
    else navigate(`/channel/${cId}`)
  }

  return (
    <div
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      onClick={handleClick}
      className="rounded-xl flex flex-col cursor-pointer transition-all duration-200"
      style={{
        background: 'var(--surface, #0D1117)',
        border: `1px solid ${hover ? 'var(--border-med, #30363D)' : 'var(--border, #21262D)'}`,
        boxShadow: hover ? 'var(--shadow-card-hover)' : 'none',
      }}
    >
      {/* Header */}
      <div className="p-4 pb-3 flex items-start gap-3">
        <div
          className="w-10 h-10 rounded-lg flex items-center justify-center text-base font-bold flex-shrink-0"
          style={{ background: `${catColor}15`, color: catColor, border: `1px solid ${catColor}25` }}
        >
          {isAuthenticated ? cName.charAt(0).toUpperCase() : '?'}
        </div>
        <div className="min-w-0 flex-1">
          <div className="font-semibold text-sm truncate" style={{ color: 'var(--text)' }}>
            {isAuthenticated ? cName : maskName(cName)}
          </div>
          <div className="text-[11px] truncate" style={{ color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)' }}>
            {isAuthenticated
              ? `@${(channel.username || channel.identificadorCanal || cName).replace(/^@/, '')}`
              : maskUsername(channel.username || channel.identificadorCanal || cName)
            }
          </div>
        </div>
      </div>

      {/* Badges */}
      <div className="px-4 pb-3 flex flex-wrap gap-1">
        <Badge label={cPlatform} variant="platform" platform={cPlatform} />
        {cCategory && <Badge label={cCategory} variant="category" />}
        {cVerified && <Badge label="Verificado" variant="verified" />}
        {cTrending && <Badge label="Trending" variant="trending" />}
        {claimed === false && <Badge label="Sin reclamar" variant="unclaimed" />}
      </div>

      {/* Stats grid */}
      <div className="px-4 pb-3 grid grid-cols-2 gap-1.5">
        <MiniStat label="Suscriptores" value={fmtNum(cSubs)} />
        <MiniStat label="Avg Views" value={cAvgViews != null ? fmtNum(cAvgViews) : '—'} />
        <MiniStat label="Engagement" value={cEngagement != null ? `${Number(cEngagement).toFixed(0)}%` : '—'} />
        <MiniStat label="€/post" value={isAuthenticated ? (cPrice > 0 ? `€${cPrice}` : '—') : '€••'} />
      </div>

      {/* Score */}
      {cScore != null && (
        <div className="px-4 pb-3">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[10px] uppercase tracking-wider" style={{ color: 'var(--muted2)' }}>Score</span>
            <span className="text-lg font-medium" style={{ color: scoreColor(cScore), fontFamily: 'var(--font-mono)' }}>{Math.round(cScore)}</span>
          </div>
          <div className="h-1 rounded-full overflow-hidden" style={{ background: 'var(--border)' }}>
            <div className="h-full rounded-full transition-all duration-700 ease-out" style={{ width: `${cScore}%`, background: scoreColor(cScore) }} />
          </div>
        </div>
      )}

      {/* Footer */}
      <div
        className="px-4 py-3 flex items-center justify-end mt-auto"
        style={{ borderTop: '1px solid var(--border)' }}
      >
        <span
          className="text-[12px] font-semibold transition-colors"
          style={{ color: hover ? 'var(--accent)' : 'var(--text-secondary)' }}
        >
          Ver canal →
        </span>
      </div>
    </div>
  )
}
