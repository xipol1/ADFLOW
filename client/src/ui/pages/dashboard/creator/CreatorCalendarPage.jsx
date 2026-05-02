import React, { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Calendar as CalIcon, ChevronLeft, ChevronRight, Plus, Filter,
  Radio, Wallet, Clock, Eye, X, AlertTriangle, CheckCircle2,
  Sparkles, Inbox, ArrowRight,
} from 'lucide-react'
import { useAuth } from '../../../../auth/AuthContext'
import apiService from '../../../../services/api'
import { FONT_BODY as F, FONT_DISPLAY as D, GREEN, greenAlpha, OK, WARN, ERR, BLUE, PLAT_COLORS } from '../../../theme/tokens'

const ACCENT = GREEN
const ga = greenAlpha
const fmtEur = (n) => `€${Math.round(Number(n) || 0).toLocaleString('es')}`
const PLANNED_KEY = 'channelad-creator-calendar-planned-v1'

const STATUS_COLOR = {
  pendiente: WARN, PAID: BLUE, PUBLISHED: OK, COMPLETED: '#94a3b8',
  CANCELLED: ERR, planned: '#8B5CF6',
}

/**
 * CreatorCalendarPage — Editorial planner standalone.
 *
 * Vista mensual con drag-drop visual. Eventos automáticos desde campañas
 * (PAID/PUBLISHED/COMPLETED) y deadlines. El creator puede añadir
 * "placeholders" planeados (planned) que se guardan en localStorage hasta
 * que se conviertan en campañas reales.
 *
 * Tres vistas: Mes / Semana / Lista.
 */
export default function CreatorCalendarPage() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [campaigns, setCampaigns] = useState([])
  const [requests, setRequests] = useState([])
  const [channels, setChannels] = useState([])
  const [loading, setLoading] = useState(true)
  const [view, setView] = useState('month') // 'month' | 'week' | 'list'
  const [monthOffset, setMonthOffset] = useState(0)
  const [selectedDate, setSelectedDate] = useState(null)
  const [planned, setPlanned] = useState(() => loadPlanned())
  const [filter, setFilter] = useState('all')

  useEffect(() => {
    let mounted = true
    Promise.all([
      apiService.getCreatorCampaigns?.().catch(() => null),
      apiService.getAdsForCreator?.().catch(() => null),
      apiService.getMyChannels(),
    ]).then(([cmpRes, adRes, chRes]) => {
      if (!mounted) return
      if (cmpRes?.success && Array.isArray(cmpRes.data)) setCampaigns(cmpRes.data)
      if (adRes?.success && Array.isArray(adRes.data)) setRequests(adRes.data)
      if (chRes?.success) setChannels(Array.isArray(chRes.data) ? chRes.data : chRes.data?.items || [])
      setLoading(false)
    }).catch(() => mounted && setLoading(false))
    return () => { mounted = false }
  }, [])

  const events = useMemo(() => {
    const out = []
    campaigns.forEach(c => {
      const date = c.scheduledAt || c.publishedAt || c.createdAt
      if (!date) return
      out.push({
        id: `c-${c._id || c.id}`, kind: 'campaign', date, status: c.status,
        title: c.title || 'Campaña',
        channel: typeof c.channel === 'object' ? c.channel?.nombreCanal : c.channel,
        amount: c.netAmount || c.price || 0,
        raw: c,
      })
    })
    requests.forEach(r => {
      if (r.deadline) {
        out.push({
          id: `r-${r._id || r.id}-deadline`, kind: 'deadline', date: r.deadline, status: 'deadline',
          title: `Deadline: ${r.title || r.advertiserName || 'Solicitud'}`,
          amount: r.price || 0, raw: r,
        })
      }
    })
    Object.values(planned).forEach(p => {
      out.push({ id: p.id, kind: 'planned', date: p.date, status: 'planned', title: p.title, channel: p.channelName, amount: 0, raw: p })
    })
    return out
  }, [campaigns, requests, planned])

  const filteredEvents = useMemo(() => {
    if (filter === 'all') return events
    if (filter === 'campaigns') return events.filter(e => e.kind === 'campaign')
    if (filter === 'deadlines') return events.filter(e => e.kind === 'deadline')
    if (filter === 'planned')   return events.filter(e => e.kind === 'planned')
    return events
  }, [events, filter])

  const eventsByDay = useMemo(() => {
    const map = {}
    filteredEvents.forEach(e => {
      const d = new Date(e.date)
      const key = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`
      if (!map[key]) map[key] = []
      map[key].push(e)
    })
    return map
  }, [filteredEvents])

  const addPlanned = (date) => {
    const id = `planned-${Date.now()}`
    const next = { ...planned, [id]: { id, date: date.toISOString(), title: 'Nueva publicación', channelName: channels[0]?.nombreCanal || 'Canal' } }
    setPlanned(next); savePlanned(next)
    setSelectedDate({ date, isPlanned: true, plannedId: id })
  }
  const updatePlanned = (id, patch) => {
    if (!planned[id]) return
    const next = { ...planned, [id]: { ...planned[id], ...patch } }
    setPlanned(next); savePlanned(next)
  }
  const removePlanned = (id) => {
    const next = { ...planned }; delete next[id]
    setPlanned(next); savePlanned(next)
  }

  return (
    <div style={{ fontFamily: F, display: 'flex', flexDirection: 'column', gap: 18, maxWidth: 1200 }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
        <div>
          <h1 style={{ fontFamily: D, fontSize: 26, fontWeight: 800, color: 'var(--text)', letterSpacing: '-0.03em', margin: '0 0 4px' }}>
            Calendario
          </h1>
          <p style={{ fontSize: 14, color: 'var(--muted)', margin: 0 }}>
            Planifica publicaciones, ve deadlines y campañas en una sola vista.
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          <Select value={filter} onChange={setFilter}
            options={[
              { value: 'all', label: 'Todo' },
              { value: 'campaigns', label: 'Campañas' },
              { value: 'deadlines', label: 'Deadlines' },
              { value: 'planned', label: 'Planeados' },
            ]} />

          <div style={{ display: 'flex', gap: 2, background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 10, padding: 3 }}>
            {[{ id: 'month', label: 'Mes' }, { id: 'week', label: 'Semana' }, { id: 'list', label: 'Lista' }].map(v => {
              const active = view === v.id
              return (
                <button key={v.id} onClick={() => setView(v.id)} style={{
                  background: active ? ACCENT : 'transparent',
                  color: active ? '#fff' : 'var(--muted)',
                  border: 'none', borderRadius: 8, padding: '6px 13px',
                  fontSize: 12, fontWeight: active ? 700 : 500,
                  cursor: 'pointer', fontFamily: F, transition: 'all .15s',
                }}>{v.label}</button>
              )
            })}
          </div>
        </div>
      </div>

      {/* Legend */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap', fontSize: 11, color: 'var(--muted)' }}>
        {[
          { color: BLUE,    label: 'Pagada (por publicar)' },
          { color: OK,      label: 'Publicada' },
          { color: '#94a3b8', label: 'Completada' },
          { color: WARN,    label: 'Deadline' },
          { color: '#8B5CF6', label: 'Planeado' },
        ].map(l => (
          <div key={l.label} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <div style={{ width: 10, height: 10, borderRadius: 3, background: l.color }} />
            <span>{l.label}</span>
          </div>
        ))}
      </div>

      {loading ? (
        <div style={{ height: 500, background: 'var(--bg2)', borderRadius: 12, animation: 'pulse 1.5s ease infinite' }} />
      ) : (
        <>
          {view === 'month' && <MonthView monthOffset={monthOffset} setMonthOffset={setMonthOffset} eventsByDay={eventsByDay} onDateClick={(d) => setSelectedDate({ date: d })} onAddPlanned={addPlanned} />}
          {view === 'week'  && <WeekView monthOffset={monthOffset} setMonthOffset={setMonthOffset} eventsByDay={eventsByDay} onDateClick={(d) => setSelectedDate({ date: d })} />}
          {view === 'list'  && <ListView events={filteredEvents} onClick={(e) => setSelectedDate({ date: new Date(e.date), event: e })} />}
        </>
      )}

      {selectedDate && (
        <DayDetailModal selected={selectedDate} events={eventsByDay[`${selectedDate.date.getFullYear()}-${selectedDate.date.getMonth()}-${selectedDate.date.getDate()}`] || []}
          onClose={() => setSelectedDate(null)} channels={channels} addPlanned={addPlanned}
          updatePlanned={updatePlanned} removePlanned={removePlanned} navigate={navigate} />
      )}
    </div>
  )
}

// ─── Month view ─────────────────────────────────────────────────────────────
function MonthView({ monthOffset, setMonthOffset, eventsByDay, onDateClick, onAddPlanned }) {
  const now = new Date()
  const view = new Date(now.getFullYear(), now.getMonth() + monthOffset, 1)
  const year = view.getFullYear(); const month = view.getMonth()
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const firstDay = (new Date(year, month, 1).getDay() + 6) % 7
  const monthNames = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre']
  const dayNames = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom']

  return (
    <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 14, padding: 18 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
        <h2 style={{ fontFamily: D, fontSize: 19, fontWeight: 800, color: 'var(--text)', letterSpacing: '-0.02em', margin: 0 }}>
          {monthNames[month]} {year}
        </h2>
        <div style={{ display: 'flex', gap: 4 }}>
          <button onClick={() => setMonthOffset(o => o - 1)} style={navBtn}><ChevronLeft size={14} /></button>
          <button onClick={() => setMonthOffset(0)} style={{ ...navBtn, padding: '0 12px', width: 'auto', fontSize: 12, fontWeight: 600 }}>Hoy</button>
          <button onClick={() => setMonthOffset(o => o + 1)} style={navBtn}><ChevronRight size={14} /></button>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 6 }}>
        {dayNames.map(d => (
          <div key={d} style={{ fontSize: 10.5, fontWeight: 700, color: 'var(--muted)', textAlign: 'center', padding: '6px 0', textTransform: 'uppercase', letterSpacing: '0.04em' }}>{d}</div>
        ))}
        {Array.from({ length: firstDay }).map((_, i) => <div key={`e${i}`} />)}
        {Array.from({ length: daysInMonth }, (_, i) => i + 1).map(day => {
          const date = new Date(year, month, day)
          const isToday = date.toDateString() === now.toDateString()
          const key = `${year}-${month}-${day}`
          const dayEvents = eventsByDay[key] || []
          return (
            <div key={day} onClick={() => onDateClick(date)}
              style={{
                background: isToday ? ga(0.08) : 'var(--bg2)',
                border: `1px solid ${isToday ? ga(0.3) : 'var(--border)'}`,
                borderRadius: 9, padding: 8, minHeight: 90, cursor: 'pointer',
                display: 'flex', flexDirection: 'column', gap: 4,
                transition: 'border-color .15s, background .15s',
              }}
              onMouseEnter={e => { if (!isToday) { e.currentTarget.style.borderColor = ga(0.4) } }}
              onMouseLeave={e => { if (!isToday) { e.currentTarget.style.borderColor = 'var(--border)' } }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontSize: 13, fontWeight: isToday ? 800 : 600, color: isToday ? ACCENT : 'var(--text)', fontFamily: D, fontVariantNumeric: 'tabular-nums' }}>
                  {day}
                </span>
                {dayEvents.length === 0 && (
                  <button onClick={(e) => { e.stopPropagation(); onAddPlanned(date) }}
                    title="Planear publicación" style={{
                      background: 'transparent', border: 'none', color: 'var(--muted2)',
                      cursor: 'pointer', padding: 2, borderRadius: 4, opacity: 0.7,
                    }}>
                    <Plus size={11} />
                  </button>
                )}
              </div>
              {dayEvents.slice(0, 3).map(e => (
                <div key={e.id} title={e.title} style={{
                  background: `${STATUS_COLOR[e.status] || 'var(--muted)'}15`,
                  borderLeft: `3px solid ${STATUS_COLOR[e.status] || 'var(--muted)'}`,
                  borderRadius: 4, padding: '2px 5px', fontSize: 10, color: 'var(--text)', fontWeight: 600,
                  overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                }}>
                  {e.title}
                </div>
              ))}
              {dayEvents.length > 3 && (
                <div style={{ fontSize: 9.5, color: 'var(--muted)', fontWeight: 600 }}>
                  +{dayEvents.length - 3} más
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ─── Week view ──────────────────────────────────────────────────────────────
function WeekView({ monthOffset, setMonthOffset, eventsByDay, onDateClick }) {
  const [weekOffset, setWeekOffset] = useState(0)
  const now = new Date()
  const start = new Date(now)
  const dayOffset = (now.getDay() + 6) % 7
  start.setDate(now.getDate() - dayOffset + weekOffset * 7)

  const week = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(start); d.setDate(start.getDate() + i); return d
  })
  const dayNames = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom']

  return (
    <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 14, padding: 18 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
        <h2 style={{ fontFamily: D, fontSize: 17, fontWeight: 800, color: 'var(--text)', margin: 0 }}>
          Semana del {week[0].toLocaleDateString('es', { day: 'numeric', month: 'short' })}
        </h2>
        <div style={{ display: 'flex', gap: 4 }}>
          <button onClick={() => setWeekOffset(o => o - 1)} style={navBtn}><ChevronLeft size={14} /></button>
          <button onClick={() => setWeekOffset(0)} style={{ ...navBtn, padding: '0 12px', width: 'auto', fontSize: 12, fontWeight: 600 }}>Esta semana</button>
          <button onClick={() => setWeekOffset(o => o + 1)} style={navBtn}><ChevronRight size={14} /></button>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 8 }}>
        {week.map((d, i) => {
          const isToday = d.toDateString() === now.toDateString()
          const key = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`
          const dayEvents = eventsByDay[key] || []
          return (
            <div key={i} onClick={() => onDateClick(d)} style={{
              background: isToday ? ga(0.08) : 'var(--bg2)',
              border: `1px solid ${isToday ? ga(0.3) : 'var(--border)'}`,
              borderRadius: 9, padding: 10, minHeight: 280, cursor: 'pointer',
              display: 'flex', flexDirection: 'column', gap: 6,
            }}>
              <div>
                <div style={{ fontSize: 10, color: 'var(--muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  {dayNames[i]}
                </div>
                <div style={{ fontFamily: D, fontSize: 22, fontWeight: 800, color: isToday ? ACCENT : 'var(--text)', letterSpacing: '-0.02em', fontVariantNumeric: 'tabular-nums' }}>
                  {d.getDate()}
                </div>
              </div>
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 4, overflow: 'auto' }}>
                {dayEvents.length === 0 ? (
                  <div style={{ fontSize: 10, color: 'var(--muted2)', textAlign: 'center', padding: 12 }}>
                    Sin eventos
                  </div>
                ) : dayEvents.map(e => (
                  <div key={e.id} style={{
                    background: `${STATUS_COLOR[e.status] || 'var(--muted)'}15`,
                    borderLeft: `3px solid ${STATUS_COLOR[e.status] || 'var(--muted)'}`,
                    borderRadius: 5, padding: '5px 7px', fontSize: 10.5, color: 'var(--text)',
                  }}>
                    <div style={{ fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{e.title}</div>
                    {e.amount > 0 && <div style={{ fontSize: 9.5, color: 'var(--muted)', marginTop: 1 }}>{fmtEur(e.amount)}</div>}
                  </div>
                ))}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ─── List view ──────────────────────────────────────────────────────────────
function ListView({ events, onClick }) {
  const sorted = events.slice().sort((a, b) => new Date(a.date) - new Date(b.date))
  const groups = {}
  sorted.forEach(e => {
    const d = new Date(e.date)
    const key = d.toLocaleDateString('es', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
    if (!groups[key]) groups[key] = []
    groups[key].push(e)
  })

  if (sorted.length === 0) {
    return (
      <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 14, padding: 60, textAlign: 'center' }}>
        <CalIcon size={36} color="var(--muted2)" style={{ margin: '0 auto 12px' }} />
        <div style={{ fontFamily: D, fontSize: 16, fontWeight: 700, color: 'var(--text)' }}>Sin eventos</div>
        <div style={{ fontSize: 12.5, color: 'var(--muted)', marginTop: 6 }}>Cuando tengas campañas y deadlines aparecerán aquí.</div>
      </div>
    )
  }

  return (
    <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 14, overflow: 'hidden' }}>
      {Object.entries(groups).map(([key, list]) => (
        <div key={key}>
          <div style={{ padding: '10px 18px', background: 'var(--bg2)', borderBottom: '1px solid var(--border)', fontSize: 11, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            {key}
          </div>
          {list.map(e => (
            <div key={e.id} onClick={() => onClick(e)} style={{
              padding: '12px 18px', borderBottom: '1px solid var(--border)',
              display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer',
              transition: 'background .15s',
            }}
              onMouseEnter={ev => ev.currentTarget.style.background = 'var(--bg2)'}
              onMouseLeave={ev => ev.currentTarget.style.background = 'transparent'}>
              <div style={{ width: 4, height: 36, borderRadius: 2, background: STATUS_COLOR[e.status] || 'var(--muted)', flexShrink: 0 }} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {e.title}
                </div>
                <div style={{ fontSize: 11.5, color: 'var(--muted)' }}>
                  {e.channel || '—'} {e.amount > 0 && <>· {fmtEur(e.amount)}</>}
                </div>
              </div>
              <span style={{
                background: `${STATUS_COLOR[e.status] || 'var(--muted)'}15`,
                color: STATUS_COLOR[e.status] || 'var(--muted)',
                border: `1px solid ${STATUS_COLOR[e.status] || 'var(--muted)'}30`,
                borderRadius: 20, padding: '2px 9px', fontSize: 10.5, fontWeight: 700,
              }}>
                {e.status}
              </span>
            </div>
          ))}
        </div>
      ))}
    </div>
  )
}

// ─── Day detail modal ───────────────────────────────────────────────────────
function DayDetailModal({ selected, events, onClose, channels, updatePlanned, removePlanned, navigate }) {
  useEffect(() => {
    const h = (e) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', h)
    document.body.style.overflow = 'hidden'
    return () => { window.removeEventListener('keydown', h); document.body.style.overflow = '' }
  }, [onClose])

  return (
    <div onClick={(e) => e.target === e.currentTarget && onClose()} style={{
      position: 'fixed', inset: 0, zIndex: 9999, background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(6px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20, fontFamily: F,
    }}>
      <div style={{
        background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 14,
        width: 460, maxWidth: '100%', maxHeight: '90vh', overflow: 'hidden',
        display: 'flex', flexDirection: 'column', boxShadow: '0 24px 60px rgba(0,0,0,0.4)',
      }}>
        <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2 style={{ fontFamily: D, fontSize: 17, fontWeight: 800, color: 'var(--text)', margin: 0 }}>
            {selected.date.toLocaleDateString('es', { weekday: 'long', day: 'numeric', month: 'long' })}
          </h2>
          <button onClick={onClose} style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 8, width: 30, height: 30, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'var(--muted)' }}>
            <X size={14} />
          </button>
        </div>
        <div style={{ flex: 1, overflowY: 'auto', padding: 20 }}>
          {events.length === 0 ? (
            <div style={{ textAlign: 'center', padding: 24 }}>
              <CalIcon size={28} color="var(--muted2)" style={{ margin: '0 auto 10px' }} />
              <div style={{ fontSize: 13, color: 'var(--muted)' }}>Sin eventos este día</div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {events.map(e => (
                <div key={e.id} style={{
                  background: 'var(--bg2)', borderLeft: `3px solid ${STATUS_COLOR[e.status] || 'var(--muted)'}`,
                  borderRadius: 9, padding: 12,
                }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8, marginBottom: 4 }}>
                    {e.kind === 'planned' ? (
                      <input value={e.title} onChange={ev => updatePlanned(e.id, { title: ev.target.value })}
                        style={{ background: 'transparent', border: 'none', fontSize: 13, fontWeight: 700, color: 'var(--text)', flex: 1, outline: 'none', fontFamily: F, padding: 0 }} />
                    ) : (
                      <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)', flex: 1 }}>{e.title}</div>
                    )}
                    <span style={{
                      background: `${STATUS_COLOR[e.status] || 'var(--muted)'}15`,
                      color: STATUS_COLOR[e.status] || 'var(--muted)',
                      border: `1px solid ${STATUS_COLOR[e.status] || 'var(--muted)'}30`,
                      borderRadius: 5, padding: '1px 7px', fontSize: 9.5, fontWeight: 700, flexShrink: 0,
                    }}>{e.status}</span>
                  </div>
                  {e.channel && <div style={{ fontSize: 11.5, color: 'var(--muted)' }}>{e.channel}</div>}
                  {e.amount > 0 && <div style={{ fontSize: 12, color: 'var(--text)', fontWeight: 700, marginTop: 4 }}>{fmtEur(e.amount)}</div>}
                  {e.kind === 'planned' && (
                    <div style={{ marginTop: 8, display: 'flex', justifyContent: 'flex-end' }}>
                      <button onClick={() => removePlanned(e.id)} style={{
                        background: 'transparent', color: ERR, border: `1px solid ${ERR}30`,
                        borderRadius: 6, padding: '4px 9px', fontSize: 10.5, fontWeight: 600,
                        cursor: 'pointer', fontFamily: F,
                      }}>Eliminar</button>
                    </div>
                  )}
                  {e.kind === 'campaign' && (
                    <button onClick={() => navigate('/creator/requests')} style={{
                      marginTop: 8, background: 'transparent', color: ACCENT, border: 'none',
                      fontSize: 11, fontWeight: 700, cursor: 'pointer', fontFamily: F,
                      display: 'inline-flex', alignItems: 'center', gap: 4, padding: 0,
                    }}>
                      Ver campaña <ArrowRight size={11} />
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function Select({ value, onChange, options }) {
  return (
    <select value={value} onChange={e => onChange(e.target.value)}
      style={{
        background: 'var(--surface)', color: 'var(--text)', border: '1px solid var(--border)',
        borderRadius: 8, padding: '7px 24px 7px 12px', fontSize: 12, fontFamily: F, outline: 'none', cursor: 'pointer',
      }}>
      {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
    </select>
  )
}

const navBtn = {
  background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 7,
  width: 28, height: 28, display: 'flex', alignItems: 'center', justifyContent: 'center',
  cursor: 'pointer', color: 'var(--text)',
}

function loadPlanned() { try { return JSON.parse(localStorage.getItem(PLANNED_KEY) || '{}') } catch { return {} } }
function savePlanned(p) { try { localStorage.setItem(PLANNED_KEY, JSON.stringify(p)) } catch {} }
