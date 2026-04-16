import React, { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../auth/AuthContext'
import Badge from './Badge'
import { scoreLabel } from './ScoreBar'
import { CASBadge, CPMBadge, ConfianzaBadge } from '../../ui/components/scoring'

// ── Add-to-list dropdown ─────────────────────────────────────────────────────
function AddToListDropdown({ channelId, lists, onAdd, onCreate, channelListMap }) {
  const [open, setOpen] = useState(false)
  const [creating, setCreating] = useState(false)
  const [newName, setNewName] = useState('')
  const [adding, setAdding] = useState(null)
  const ref = useRef(null)

  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false) }
    if (open) document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  const inLists = (channelListMap || {})[channelId] || []
  const isInAny = inLists.length > 0

  const handleAdd = async (listId) => {
    setAdding(listId)
    await onAdd(listId, channelId)
    setAdding(null)
  }

  const handleCreate = async () => {
    if (!newName.trim()) return
    setAdding('new')
    await onCreate(newName.trim(), channelId)
    setNewName('')
    setCreating(false)
    setAdding(null)
  }

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button
        onClick={(e) => { e.stopPropagation(); setOpen(!open) }}
        title={isInAny ? `En ${inLists.length} lista${inLists.length > 1 ? 's' : ''}` : 'Guardar en lista'}
        style={{
          background: isInAny ? 'var(--accent, #8B5CF6)' : 'var(--bg, #080C10)',
          color: isInAny ? '#fff' : 'var(--text-secondary, #8B949E)',
          border: `1px solid ${isInAny ? 'var(--accent, #8B5CF6)' : 'var(--border, #21262D)'}`,
          borderRadius: '8px', width: '32px', height: '32px',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          cursor: 'pointer', transition: 'all 150ms ease', flexShrink: 0,
          fontSize: '15px',
        }}
      >
        {isInAny ? '\u2713' : '+'}
      </button>

      {open && (
        <div
          onClick={(e) => e.stopPropagation()}
          style={{
            position: 'absolute', top: '100%', right: 0, marginTop: '6px', zIndex: 50,
            background: 'var(--surface, #0D1117)', border: '1px solid var(--border, #21262D)',
            borderRadius: '12px', boxShadow: '0 12px 32px rgba(0,0,0,0.4)',
            width: '220px', overflow: 'hidden',
          }}
        >
          <div style={{ padding: '10px 12px 6px', fontSize: '11px', fontWeight: 700, color: 'var(--muted2, #484F58)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Guardar en lista
          </div>

          <div style={{ maxHeight: '180px', overflowY: 'auto' }}>
            {lists.length === 0 && !creating && (
              <div style={{ padding: '12px', textAlign: 'center', fontSize: '12px', color: 'var(--text-secondary, #8B949E)' }}>
                No tienes listas aun
              </div>
            )}
            {lists.map((list) => {
              const alreadyIn = inLists.includes(list._id || list.id)
              const lid = list._id || list.id
              return (
                <button
                  key={lid}
                  disabled={alreadyIn || adding === lid}
                  onClick={() => !alreadyIn && handleAdd(lid)}
                  style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    width: '100%', padding: '8px 12px', border: 'none',
                    background: alreadyIn ? 'rgba(139,92,246,0.08)' : 'transparent',
                    color: 'var(--text, #E6EDF3)', cursor: alreadyIn ? 'default' : 'pointer',
                    fontSize: '13px', textAlign: 'left', fontFamily: 'inherit',
                    transition: 'background 100ms',
                  }}
                  onMouseEnter={(e) => { if (!alreadyIn) e.currentTarget.style.background = 'var(--bg, #080C10)' }}
                  onMouseLeave={(e) => { if (!alreadyIn) e.currentTarget.style.background = 'transparent' }}
                >
                  <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {list.name}
                    <span style={{ fontSize: '11px', color: 'var(--muted2)', marginLeft: '6px' }}>
                      {(list.channels?.length || 0)}
                    </span>
                  </span>
                  {alreadyIn && <span style={{ fontSize: '12px', color: 'var(--accent, #8B5CF6)', flexShrink: 0 }}>{'\u2713'}</span>}
                  {adding === lid && <span style={{ fontSize: '11px', color: 'var(--muted2)', flexShrink: 0 }}>...</span>}
                </button>
              )
            })}
          </div>

          {/* Create new list */}
          <div style={{ borderTop: '1px solid var(--border, #21262D)', padding: '8px' }}>
            {creating ? (
              <div style={{ display: 'flex', gap: '6px' }}>
                <input
                  autoFocus
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
                  placeholder="Nombre de lista"
                  style={{
                    flex: 1, background: 'var(--bg, #080C10)', border: '1px solid var(--border, #21262D)',
                    borderRadius: '6px', padding: '5px 8px', fontSize: '12px',
                    color: 'var(--text)', outline: 'none', fontFamily: 'inherit',
                  }}
                />
                <button
                  onClick={handleCreate}
                  disabled={!newName.trim() || adding === 'new'}
                  style={{
                    background: 'var(--accent, #8B5CF6)', color: '#fff', border: 'none',
                    borderRadius: '6px', padding: '5px 10px', fontSize: '12px', fontWeight: 600,
                    cursor: newName.trim() ? 'pointer' : 'default', opacity: newName.trim() ? 1 : 0.4,
                  }}
                >
                  {adding === 'new' ? '...' : 'OK'}
                </button>
              </div>
            ) : (
              <button
                onClick={() => setCreating(true)}
                style={{
                  width: '100%', background: 'transparent', border: 'none',
                  color: 'var(--accent, #8B5CF6)', fontSize: '12px', fontWeight: 600,
                  cursor: 'pointer', padding: '4px 4px', textAlign: 'left', fontFamily: 'inherit',
                }}
              >
                + Nueva lista
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

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
  if (v >= 75) return 'var(--accent, #8B5CF6)'
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

export default function ChannelCardNew({ channel, onClick, lists, onAddToList, onCreateList, channelListMap }) {
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
    confianzaScore,
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
        {isAuthenticated && lists && onAddToList && (
          <AddToListDropdown
            channelId={cId}
            lists={lists}
            onAdd={onAddToList}
            onCreate={onCreateList}
            channelListMap={channelListMap}
          />
        )}
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

      {/* Score + Intelligence badges */}
      {(cScore != null || cPrice > 0 || confianzaScore != null) && (
        <div className="px-4 pb-3 flex flex-wrap items-center gap-1.5">
          {cScore != null && <CASBadge CAS={Math.round(cScore)} nivel={nivel} size="sm" />}
          {isAuthenticated && cPrice > 0 && <CPMBadge CPM={cPrice} plataforma={cPlatform} size="sm" />}
          {confianzaScore != null && <ConfianzaBadge score={confianzaScore} showScore />}
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
