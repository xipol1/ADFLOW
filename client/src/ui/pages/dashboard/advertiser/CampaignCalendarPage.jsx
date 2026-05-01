import React, { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Calendar as CalendarIcon, ChevronLeft, ChevronRight, AlertTriangle,
  Filter, Eye, Sparkles, RefreshCw,
} from 'lucide-react'
import apiService from '../../../../services/api'
import { FONT_BODY, FONT_DISPLAY, OK, WARN, ERR, BLUE } from '../../../theme/tokens'

const PURPLE = 'var(--accent, #8B5CF6)'
const purpleAlpha = (o) => `var(--accent-dim, rgba(139,92,246,${o}))`

// ─── Status config ─────────────────────────────────────────────────────────
const STATUS_CFG = {
  DRAFT:     { label: 'Borrador',   color: '#94a3b8' },
  PAID:      { label: 'Pagada',     color: BLUE },
  PUBLISHED: { label: 'Publicada',  color: OK },
  COMPLETED: { label: 'Completada', color: '#6b7280' },
  CANCELLED: { label: 'Cancelada',  color: ERR },
}

const VIEW_OPTIONS = [
  { key: 'week',    label: '14 días',  days: 14 },
  { key: 'month',   label: '30 días',  days: 30 },
  { key: 'quarter', label: '90 días',  days: 90 },
]

const ROW_HEIGHT = 36
const CHANNEL_COL_WIDTH = 220

// ─── Date helpers ──────────────────────────────────────────────────────────
function startOfDay(d) {
  const x = new Date(d)
  x.setHours(0, 0, 0, 0)
  return x
}

function addDays(d, n) {
  const x = new Date(d)
  x.setDate(x.getDate() + n)
  return x
}

function dayDiff(a, b) {
  return Math.round((startOfDay(a) - startOfDay(b)) / 86400000)
}

function fmtDay(d) {
  return d.getDate()
}

function fmtMonth(d) {
  return d.toLocaleDateString('es', { month: 'short' })
}

function isWeekend(d) {
  const dow = d.getDay()
  return dow === 0 || dow === 6
}

// Resolve campaign date range — fall back chain
function getCampaignRange(c) {
  const start = c.publishDate || c.publishedAt || c.paidAt || c.createdAt
  const end = c.completedAt || c.deadline ||
    (start ? addDays(new Date(start), 7).toISOString() : null)  // default 7d if no end
  if (!start || !end) return null
  return {
    start: startOfDay(new Date(start)),
    end: startOfDay(new Date(end)),
  }
}

// Detect overlapping campaigns on the same channel
function findOverlaps(campaigns) {
  const byChannel = {}
  for (const c of campaigns) {
    const ch = c.channel?._id || c.channel?.id || c.channelId
    if (!ch) continue
    if (!byChannel[ch]) byChannel[ch] = []
    byChannel[ch].push(c)
  }
  const overlapIds = new Set()
  for (const list of Object.values(byChannel)) {
    if (list.length < 2) continue
    for (let i = 0; i < list.length; i++) {
      for (let j = i + 1; j < list.length; j++) {
        const ra = getCampaignRange(list[i])
        const rb = getCampaignRange(list[j])
        if (!ra || !rb) continue
        // Overlap test
        if (ra.start <= rb.end && rb.start <= ra.end) {
          overlapIds.add(list[i]._id || list[i].id)
          overlapIds.add(list[j]._id || list[j].id)
        }
      }
    }
  }
  return overlapIds
}


// ─── Main ──────────────────────────────────────────────────────────────────
export default function CampaignCalendarPage() {
  const navigate = useNavigate()
  const [campaigns, setCampaigns] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [viewKey, setViewKey] = useState('month')
  const [anchor, setAnchor] = useState(() => {
    const d = startOfDay(new Date())
    d.setDate(d.getDate() - 3)  // start 3 days before today
    return d
  })
  const [statusFilter, setStatusFilter] = useState('all')

  const view = VIEW_OPTIONS.find(v => v.key === viewKey)
  const days = view.days
  const today = startOfDay(new Date())

  // Day-cell width adapts to view
  const cellWidth = days <= 14 ? 56 : days <= 30 ? 32 : 14

  const loadCampaigns = async () => {
    setLoading(true); setError('')
    try {
      const res = await apiService.getMyCampaigns()
      if (res?.success) {
        const items = res.data?.items || res.data || []
        setCampaigns(Array.isArray(items) ? items : [])
      } else {
        setError(res?.message || 'No se pudieron cargar las campañas')
      }
    } catch (e) {
      setError(e.message || 'Error de conexión')
    }
    setLoading(false)
  }

  useEffect(() => { loadCampaigns() }, [])

  // Filter + sort campaigns
  const visible = useMemo(() => {
    return campaigns.filter(c => {
      if (statusFilter !== 'all' && c.status !== statusFilter) return false
      const range = getCampaignRange(c)
      if (!range) return false
      const viewEnd = addDays(anchor, days)
      // Show only if range intersects with visible window
      return range.end >= anchor && range.start <= viewEnd
    }).sort((a, b) => {
      const ra = getCampaignRange(a)
      const rb = getCampaignRange(b)
      return ra.start - rb.start
    })
  }, [campaigns, statusFilter, anchor, days])

  const overlaps = useMemo(() => findOverlaps(visible), [visible])

  // Generate the day-axis array
  const dayAxis = useMemo(() => {
    return Array.from({ length: days }, (_, i) => addDays(anchor, i))
  }, [anchor, days])

  return (
    <div style={{ fontFamily: FONT_BODY, display: 'flex', flexDirection: 'column', gap: 20, maxWidth: 1300 }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
            <div style={{
              width: 40, height: 40, borderRadius: 12,
              background: purpleAlpha(0.12), border: `1px solid ${purpleAlpha(0.25)}`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <CalendarIcon size={20} color={PURPLE} />
            </div>
            <h1 style={{
              fontFamily: FONT_DISPLAY, fontSize: 28, fontWeight: 800,
              color: 'var(--text)', letterSpacing: '-0.04em', lineHeight: 1.1, margin: 0,
            }}>
              Calendario de campañas
            </h1>
          </div>
          <p style={{ fontSize: 14, color: 'var(--muted)', lineHeight: 1.5 }}>
            Vista Gantt de todas tus campañas. Detecta solapamientos en el mismo canal y planifica con vista global.
          </p>
        </div>
        <button onClick={loadCampaigns} disabled={loading}
          style={{
            background: 'var(--surface)', border: '1px solid var(--border)',
            borderRadius: 10, padding: '8px 14px', cursor: loading ? 'wait' : 'pointer',
            color: 'var(--muted)', display: 'flex', alignItems: 'center', gap: 6,
            fontSize: 12, fontWeight: 600, fontFamily: FONT_BODY,
          }}>
          <RefreshCw size={12} className={loading ? 'animate-spin' : ''} />
          Actualizar
        </button>
      </div>

      {/* Controls */}
      <div style={{
        background: 'var(--surface)', border: '1px solid var(--border)',
        borderRadius: 12, padding: 12,
        display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap',
      }}>
        {/* Date nav */}
        <button onClick={() => setAnchor(addDays(anchor, -days))}
          style={{
            background: 'var(--bg2)', border: '1px solid var(--border)',
            borderRadius: 8, padding: '6px 10px', cursor: 'pointer', color: 'var(--text)',
          }}>
          <ChevronLeft size={14} />
        </button>
        <button onClick={() => {
          const d = startOfDay(new Date())
          d.setDate(d.getDate() - 3)
          setAnchor(d)
        }}
          style={{
            background: 'var(--bg2)', border: '1px solid var(--border)',
            borderRadius: 8, padding: '6px 14px', cursor: 'pointer',
            fontSize: 12, fontWeight: 600, color: 'var(--text)', fontFamily: FONT_BODY,
          }}>
          Hoy
        </button>
        <button onClick={() => setAnchor(addDays(anchor, days))}
          style={{
            background: 'var(--bg2)', border: '1px solid var(--border)',
            borderRadius: 8, padding: '6px 10px', cursor: 'pointer', color: 'var(--text)',
          }}>
          <ChevronRight size={14} />
        </button>
        <span style={{ fontSize: 13, color: 'var(--text)', fontWeight: 600, marginLeft: 8 }}>
          {dayAxis[0].toLocaleDateString('es', { day: 'numeric', month: 'short' })}
          {' — '}
          {dayAxis[dayAxis.length - 1].toLocaleDateString('es', { day: 'numeric', month: 'short', year: 'numeric' })}
        </span>

        <span style={{ flex: 1 }} />

        {/* View selector */}
        <div style={{ display: 'flex', gap: 2, background: 'var(--bg2)', borderRadius: 8, padding: 2 }}>
          {VIEW_OPTIONS.map(opt => {
            const active = viewKey === opt.key
            return (
              <button key={opt.key} onClick={() => setViewKey(opt.key)} style={{
                background: active ? PURPLE : 'transparent',
                color: active ? '#fff' : 'var(--muted)',
                border: 'none', borderRadius: 6, padding: '5px 12px',
                fontSize: 11.5, fontWeight: 600, cursor: 'pointer', fontFamily: FONT_BODY,
              }}>{opt.label}</button>
            )
          })}
        </div>

        {/* Status filter */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 4, paddingLeft: 8, borderLeft: '1px solid var(--border)' }}>
          <Filter size={12} color="var(--muted)" />
          <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
            style={{
              background: 'var(--bg)', border: '1px solid var(--border)',
              borderRadius: 8, padding: '6px 10px', fontSize: 12, color: 'var(--text)',
              fontFamily: FONT_BODY, cursor: 'pointer',
            }}>
            <option value="all">Todos los estados</option>
            <option value="DRAFT">Borrador</option>
            <option value="PAID">Pagada</option>
            <option value="PUBLISHED">Publicada</option>
            <option value="COMPLETED">Completada</option>
            <option value="CANCELLED">Cancelada</option>
          </select>
        </div>
      </div>

      {/* Overlap warning */}
      {overlaps.size > 0 && (
        <div role="alert" style={{
          background: `${WARN}10`, border: `1px solid ${WARN}30`,
          borderRadius: 12, padding: '12px 16px',
          display: 'flex', alignItems: 'center', gap: 10, fontSize: 13,
        }}>
          <AlertTriangle size={16} color={WARN} />
          <span style={{ color: 'var(--text)' }}>
            <strong style={{ color: WARN }}>{overlaps.size} campañas se solapan</strong> en el mismo canal.
            Ad fatigue posible — considera espaciarlas.
          </span>
        </div>
      )}

      {error && (
        <div role="alert" style={{
          background: `${ERR}10`, border: `1px solid ${ERR}30`, color: ERR,
          borderRadius: 10, padding: '10px 14px', fontSize: 13,
        }}>{error}</div>
      )}

      {/* Loading */}
      {loading && (
        <div style={{
          background: 'var(--surface)', border: '1px solid var(--border)',
          borderRadius: 14, height: 300,
          animation: 'pulse 1.5s ease-in-out infinite',
        }} />
      )}

      {/* Empty state */}
      {!loading && visible.length === 0 && (
        <div style={{
          background: 'var(--surface)', border: '1px dashed var(--border)',
          borderRadius: 18, padding: '60px 28px', textAlign: 'center',
        }}>
          <div style={{
            width: 64, height: 64, borderRadius: 18,
            background: purpleAlpha(0.08), border: `1px solid ${purpleAlpha(0.18)}`,
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center', marginBottom: 16,
          }}>
            <Sparkles size={28} color={PURPLE} />
          </div>
          <h3 style={{ fontFamily: FONT_DISPLAY, fontSize: 17, fontWeight: 700, color: 'var(--text)', marginBottom: 6 }}>
            Sin campañas en esta ventana
          </h3>
          <p style={{ fontSize: 13, color: 'var(--muted)', maxWidth: 460, margin: '0 auto 14px', lineHeight: 1.6 }}>
            {statusFilter === 'all'
              ? 'No hay campañas con fechas dentro de los próximos ' + days + ' días.'
              : 'Cambia el filtro o navega a otra fecha.'}
          </p>
          <button onClick={() => navigate('/advertiser/campaigns/new')}
            style={{
              background: PURPLE, color: '#fff', border: 'none', borderRadius: 10,
              padding: '10px 18px', fontSize: 13, fontWeight: 700, cursor: 'pointer',
              fontFamily: FONT_BODY,
            }}>
            Crear campaña
          </button>
        </div>
      )}

      {/* Gantt */}
      {!loading && visible.length > 0 && (
        <div style={{
          background: 'var(--surface)', border: '1px solid var(--border)',
          borderRadius: 14, overflow: 'auto',
        }}>
          <div style={{ minWidth: CHANNEL_COL_WIDTH + days * cellWidth }}>

            {/* Day axis header */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: `${CHANNEL_COL_WIDTH}px repeat(${days}, ${cellWidth}px)`,
              borderBottom: '1px solid var(--border)',
              background: 'var(--bg2)',
              position: 'sticky', top: 0, zIndex: 2,
            }}>
              <div style={{
                padding: '10px 14px', fontSize: 11, fontWeight: 700,
                color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.05em',
              }}>Campaña / Canal</div>
              {dayAxis.map((d, i) => {
                const isToday = startOfDay(d).getTime() === today.getTime()
                const monthStart = d.getDate() === 1 || i === 0
                return (
                  <div key={i} style={{
                    padding: '6px 0',
                    fontSize: 10,
                    textAlign: 'center',
                    color: isToday ? PURPLE : isWeekend(d) ? 'var(--muted2)' : 'var(--muted)',
                    fontWeight: isToday ? 800 : 600,
                    background: isWeekend(d) ? 'var(--bg)' : 'transparent',
                    borderLeft: monthStart ? `1px solid ${purpleAlpha(0.25)}` : 'none',
                    position: 'relative',
                  }}>
                    {monthStart && cellWidth >= 24 && (
                      <div style={{
                        fontSize: 9, color: PURPLE, fontWeight: 700, marginBottom: 2,
                        textTransform: 'uppercase', letterSpacing: '0.04em',
                      }}>{fmtMonth(d)}</div>
                    )}
                    <div>{fmtDay(d)}</div>
                  </div>
                )
              })}
            </div>

            {/* Rows */}
            {visible.map((c, rowIdx) => {
              const range = getCampaignRange(c)
              if (!range) return null
              const cfg = STATUS_CFG[c.status] || STATUS_CFG.DRAFT
              const channelName = c.channel?.nombreCanal || c.channel?.nombre || c.channel?.identificadorCanal || 'Canal'
              const id = c._id || c.id

              // Compute bar position in days
              const startOffset = Math.max(0, dayDiff(range.start, anchor))
              const endOffset = Math.min(days - 1, dayDiff(range.end, anchor))
              const visibleDays = endOffset - startOffset + 1
              const isOverlap = overlaps.has(id)

              const startsBefore = range.start < anchor
              const endsAfter = range.end > addDays(anchor, days - 1)

              return (
                <div key={id} style={{
                  display: 'grid',
                  gridTemplateColumns: `${CHANNEL_COL_WIDTH}px repeat(${days}, ${cellWidth}px)`,
                  borderBottom: '1px solid var(--border)',
                  height: ROW_HEIGHT,
                  alignItems: 'center',
                  background: rowIdx % 2 === 0 ? 'transparent' : `${purpleAlpha(0.025)}`,
                  position: 'relative',
                }}>
                  {/* Row label */}
                  <div style={{
                    padding: '0 14px', minWidth: 0,
                    overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis',
                  }}>
                    <div style={{
                      fontSize: 12, fontWeight: 600, color: 'var(--text)',
                      overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis',
                    }}>{channelName}</div>
                    <div style={{
                      fontSize: 10, color: 'var(--muted)',
                      overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis',
                    }}>
                      €{c.price || 0} · {cfg.label}
                    </div>
                  </div>

                  {/* Day cells (background grid) */}
                  {dayAxis.map((d, i) => {
                    const isToday = startOfDay(d).getTime() === today.getTime()
                    const we = isWeekend(d)
                    return (
                      <div key={i} style={{
                        height: '100%',
                        background: isToday ? `${PURPLE}08` : we ? 'var(--bg)' : 'transparent',
                        borderLeft: i === 0 ? 'none' : we ? '1px solid var(--bg)' : '1px solid var(--border)',
                        position: 'relative',
                      }}>
                        {isToday && (
                          <div style={{
                            position: 'absolute', top: 0, bottom: 0, left: 0, width: 2,
                            background: PURPLE,
                          }} />
                        )}
                      </div>
                    )
                  })}

                  {/* Bar (positioned absolutely over the cells) */}
                  {visibleDays > 0 && (
                    <button
                      onClick={() => navigate(`/advertiser/campaigns?selected=${id}`)}
                      title={`${channelName} · ${cfg.label} · ${range.start.toLocaleDateString('es')} → ${range.end.toLocaleDateString('es')}`}
                      style={{
                        position: 'absolute',
                        left: CHANNEL_COL_WIDTH + startOffset * cellWidth + 2,
                        top: 6,
                        height: ROW_HEIGHT - 12,
                        width: visibleDays * cellWidth - 4,
                        background: `${cfg.color}${isOverlap ? '50' : '30'}`,
                        border: `1px solid ${isOverlap ? WARN : cfg.color}`,
                        borderLeft: startsBefore ? `4px dashed ${cfg.color}` : `3px solid ${cfg.color}`,
                        borderRight: endsAfter ? `2px dashed ${cfg.color}` : `1px solid ${cfg.color}`,
                        borderRadius: 4,
                        padding: '0 8px',
                        display: 'flex', alignItems: 'center', gap: 4,
                        cursor: 'pointer',
                        overflow: 'hidden',
                        fontSize: 11, fontWeight: 600, color: 'var(--text)',
                        fontFamily: FONT_BODY,
                        whiteSpace: 'nowrap',
                        transition: 'transform .15s, box-shadow .15s',
                      }}
                      onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.boxShadow = `0 4px 12px ${cfg.color}40` }}
                      onMouseLeave={e => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = 'none' }}
                    >
                      {isOverlap && <AlertTriangle size={10} color={WARN} />}
                      {visibleDays * cellWidth >= 80 && (
                        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {(c.content || channelName).slice(0, 30)}
                        </span>
                      )}
                    </button>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Legend */}
      {!loading && visible.length > 0 && (
        <div style={{
          background: 'var(--surface)', border: '1px solid var(--border)',
          borderRadius: 12, padding: 14,
          display: 'flex', gap: 16, flexWrap: 'wrap', alignItems: 'center',
          fontSize: 11, color: 'var(--muted)',
        }}>
          <span style={{ fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Leyenda
          </span>
          {Object.entries(STATUS_CFG).map(([k, v]) => (
            <div key={k} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{
                width: 14, height: 10, background: `${v.color}30`,
                border: `1px solid ${v.color}`, borderRadius: 3,
              }} />
              <span style={{ color: 'var(--text)' }}>{v.label}</span>
            </div>
          ))}
          <span style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 6 }}>
            <AlertTriangle size={12} color={WARN} />
            <span>Borde amarillo = solapamiento en el mismo canal</span>
          </span>
        </div>
      )}
    </div>
  )
}
