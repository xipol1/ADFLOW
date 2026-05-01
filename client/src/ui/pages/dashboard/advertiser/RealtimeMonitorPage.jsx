import React, { useState, useEffect, useRef, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Activity, Pause, Play, RefreshCw, AlertCircle, Sparkles,
  TrendingUp, MousePointer, Eye, Zap, Clock,
} from 'lucide-react'
import apiService from '../../../../services/api'
import { FONT_BODY, FONT_DISPLAY, OK, WARN, ERR, BLUE } from '../../../theme/tokens'

const PURPLE = 'var(--accent, #8B5CF6)'
const purpleAlpha = (o) => `var(--accent-dim, rgba(139,92,246,${o}))`

const POLL_INTERVAL_MS = 10000  // 10s
const HISTORY_WINDOW = 30        // last 30 polls = 5 min visible

// ─── Helpers ───────────────────────────────────────────────────────────────
const fmtNum = (n) => n == null ? '—' : Number(n).toLocaleString('es')

function timeSince(d) {
  const s = Math.floor((Date.now() - d) / 1000)
  if (s < 60) return `${s}s`
  if (s < 3600) return `${Math.floor(s / 60)}m`
  return `${Math.floor(s / 3600)}h`
}


// ─── Mini sparkline ────────────────────────────────────────────────────────
function Sparkline({ data, color, w = 110, h = 32 }) {
  if (!data || data.length === 0) {
    return <div style={{ width: w, height: h, background: 'var(--bg2)', borderRadius: 4 }} />
  }
  const max = Math.max(...data, 1)
  const points = data.map((v, i) => {
    const x = (i / Math.max(1, data.length - 1)) * w
    const y = h - (v / max) * h
    return `${x.toFixed(1)},${y.toFixed(1)}`
  }).join(' ')
  return (
    <svg width={w} height={h} style={{ overflow: 'visible' }}>
      <polyline points={points} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <polyline points={`0,${h} ${points} ${w},${h}`} fill={`${color}15`} stroke="none" />
    </svg>
  )
}


// ─── Live indicator (pulsing dot) ──────────────────────────────────────────
function LiveDot({ active, color = OK }) {
  return (
    <div style={{
      width: 8, height: 8, borderRadius: '50%',
      background: active ? color : 'var(--muted2)',
      boxShadow: active ? `0 0 0 0 ${color}80` : 'none',
      animation: active ? 'pulse-dot 1.5s ease-in-out infinite' : 'none',
    }} />
  )
}


// ─── Campaign card ─────────────────────────────────────────────────────────
function CampaignCard({ campaign, history, prevSnapshot, onClick }) {
  const channelName = campaign.channel?.nombreCanal || campaign.channel?.nombre || campaign.channel?.identificadorCanal || 'Canal'
  const clicks = campaign.tracking?.clicks || 0
  const impressions = campaign.tracking?.impressions || 0
  const ctr = impressions > 0 ? ((clicks / impressions) * 100).toFixed(2) : '0.00'

  const prevClicks = prevSnapshot?.clicks ?? clicks
  const delta = clicks - prevClicks
  const isLive = delta > 0

  return (
    <button onClick={onClick}
      style={{
        background: 'var(--surface)',
        border: `1px solid ${isLive ? OK : 'var(--border)'}`,
        borderRadius: 14, padding: 16,
        textAlign: 'left', fontFamily: FONT_BODY, cursor: 'pointer',
        transition: 'border-color .2s, box-shadow .2s',
        position: 'relative',
        overflow: 'hidden',
      }}
      onMouseEnter={e => e.currentTarget.style.boxShadow = `0 4px 16px ${purpleAlpha(0.1)}`}
      onMouseLeave={e => e.currentTarget.style.boxShadow = 'none'}
    >
      {isLive && (
        <div style={{
          position: 'absolute', top: 0, left: 0, right: 0, height: 2,
          background: `linear-gradient(90deg, transparent, ${OK}, transparent)`,
          animation: 'shimmer 2s ease-in-out infinite',
        }} />
      )}

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
          <LiveDot active={isLive} color={OK} />
          <span style={{
            fontFamily: FONT_DISPLAY, fontSize: 14, fontWeight: 700, color: 'var(--text)',
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 200,
          }}>{channelName}</span>
        </div>
        <span style={{
          background: `${OK}12`, color: OK, fontWeight: 700,
          border: `1px solid ${OK}30`, borderRadius: 5, padding: '2px 7px', fontSize: 10,
        }}>LIVE</span>
      </div>

      <div style={{
        display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, marginBottom: 12,
      }}>
        <div>
          <div style={{ fontSize: 10, color: 'var(--muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 2 }}>
            Clicks
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 4 }}>
            <span style={{ fontFamily: FONT_DISPLAY, fontSize: 20, fontWeight: 800, color: 'var(--text)' }}>
              {fmtNum(clicks)}
            </span>
            {delta > 0 && (
              <span style={{ fontSize: 11, color: OK, fontWeight: 700 }}>+{delta}</span>
            )}
          </div>
        </div>
        <div>
          <div style={{ fontSize: 10, color: 'var(--muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 2 }}>
            Imp.
          </div>
          <div style={{ fontFamily: FONT_DISPLAY, fontSize: 20, fontWeight: 800, color: 'var(--text)' }}>
            {fmtNum(impressions)}
          </div>
        </div>
        <div>
          <div style={{ fontSize: 10, color: 'var(--muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 2 }}>
            CTR
          </div>
          <div style={{ fontFamily: FONT_DISPLAY, fontSize: 20, fontWeight: 800, color: ctr > 2 ? OK : 'var(--text)' }}>
            {ctr}%
          </div>
        </div>
      </div>

      {history && history.length > 1 && (
        <div style={{
          paddingTop: 10, borderTop: '1px solid var(--border)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8,
        }}>
          <span style={{ fontSize: 10, color: 'var(--muted)' }}>Clicks últimos 5 min</span>
          <Sparkline data={history} color={isLive ? OK : PURPLE} />
        </div>
      )}
    </button>
  )
}


// ─── Main ──────────────────────────────────────────────────────────────────
export default function RealtimeMonitorPage() {
  const navigate = useNavigate()
  const [campaigns, setCampaigns] = useState([])
  const [history, setHistory] = useState({})  // { [campaignId]: [click counts...] }
  const [prevSnapshot, setPrevSnapshot] = useState({})  // { [campaignId]: { clicks } }
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [paused, setPaused] = useState(false)
  const [lastUpdate, setLastUpdate] = useState(null)
  const intervalRef = useRef(null)

  const fetchOnce = async () => {
    try {
      const res = await apiService.getMyCampaigns()
      if (res?.success) {
        const items = (res.data?.items || res.data || []).filter(c =>
          c.status === 'PUBLISHED' || c.status === 'PAID'
        )
        setCampaigns(items)
        setLastUpdate(Date.now())

        // Update history + prevSnapshot
        setHistory(prev => {
          const next = { ...prev }
          for (const c of items) {
            const id = c._id || c.id
            const clicks = c.tracking?.clicks || 0
            const list = next[id] || []
            next[id] = [...list, clicks].slice(-HISTORY_WINDOW)
          }
          return next
        })
        setPrevSnapshot(prev => {
          const next = {}
          for (const c of items) {
            const id = c._id || c.id
            // Keep the previous "clicks" snapshot for delta display
            next[id] = { clicks: prev[id]?.clicks ?? (c.tracking?.clicks || 0) }
          }
          return next
        })
      } else {
        setError(res?.message || 'No se pudieron cargar las campañas')
      }
    } catch (e) {
      setError(e.message || 'Error de conexión')
    }
    setLoading(false)
  }

  // Initial load
  useEffect(() => { fetchOnce() }, [])

  // Polling
  useEffect(() => {
    if (paused) {
      if (intervalRef.current) { clearInterval(intervalRef.current); intervalRef.current = null }
      return
    }
    intervalRef.current = setInterval(() => {
      // Save current as prev BEFORE fetching new data
      setPrevSnapshot(prev => {
        const snap = {}
        for (const c of campaigns) {
          const id = c._id || c.id
          snap[id] = { clicks: c.tracking?.clicks || 0 }
        }
        return snap
      })
      fetchOnce()
    }, POLL_INTERVAL_MS)
    return () => { if (intervalRef.current) clearInterval(intervalRef.current) }
  }, [paused, campaigns])

  // Aggregate stats
  const stats = useMemo(() => {
    const totalClicks = campaigns.reduce((s, c) => s + (c.tracking?.clicks || 0), 0)
    const totalImp = campaigns.reduce((s, c) => s + (c.tracking?.impressions || 0), 0)
    const totalCtr = totalImp > 0 ? ((totalClicks / totalImp) * 100).toFixed(2) : '0.00'
    const liveCount = campaigns.filter(c => {
      const id = c._id || c.id
      const cur = c.tracking?.clicks || 0
      const prev = prevSnapshot[id]?.clicks ?? cur
      return cur > prev
    }).length
    return { totalClicks, totalImp, totalCtr, liveCount, total: campaigns.length }
  }, [campaigns, prevSnapshot])

  return (
    <div style={{ fontFamily: FONT_BODY, display: 'flex', flexDirection: 'column', gap: 24, maxWidth: 1200 }}>
      <style>{`
        @keyframes pulse-dot {
          0%, 100% { box-shadow: 0 0 0 0 ${OK}80; }
          50% { box-shadow: 0 0 0 6px ${OK}00; }
        }
        @keyframes shimmer {
          0%, 100% { transform: translateX(-100%); }
          50% { transform: translateX(100%); }
        }
      `}</style>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
            <div style={{
              width: 40, height: 40, borderRadius: 12,
              background: purpleAlpha(0.12), border: `1px solid ${purpleAlpha(0.25)}`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <Activity size={20} color={PURPLE} />
            </div>
            <h1 style={{
              fontFamily: FONT_DISPLAY, fontSize: 28, fontWeight: 800,
              color: 'var(--text)', letterSpacing: '-0.04em', lineHeight: 1.1, margin: 0,
            }}>
              Monitor en tiempo real
            </h1>
          </div>
          <p style={{ fontSize: 14, color: 'var(--muted)', lineHeight: 1.5 }}>
            Clicks e impresiones de tus campañas activas, actualizándose cada {POLL_INTERVAL_MS / 1000}s.
          </p>
        </div>
        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
          {lastUpdate && (
            <span style={{ fontSize: 11, color: 'var(--muted)', display: 'flex', alignItems: 'center', gap: 4 }}>
              <Clock size={11} />
              Hace {timeSince(lastUpdate)}
            </span>
          )}
          <button onClick={() => setPaused(p => !p)}
            style={{
              background: paused ? OK : 'var(--surface)', color: paused ? '#fff' : 'var(--muted)',
              border: `1px solid ${paused ? OK : 'var(--border)'}`,
              borderRadius: 10, padding: '8px 14px', cursor: 'pointer',
              display: 'flex', alignItems: 'center', gap: 6,
              fontSize: 12, fontWeight: 600, fontFamily: FONT_BODY,
            }}>
            {paused ? <><Play size={12} /> Reanudar</> : <><Pause size={12} /> Pausar</>}
          </button>
          <button onClick={() => { fetchOnce() }}
            style={{
              background: 'var(--surface)', border: '1px solid var(--border)',
              borderRadius: 10, padding: '8px 12px', cursor: 'pointer', color: 'var(--muted)',
            }}>
            <RefreshCw size={12} />
          </button>
        </div>
      </div>

      {/* Live status banner */}
      <div style={{
        background: stats.liveCount > 0 ? `${OK}08` : 'var(--surface)',
        border: `1px solid ${stats.liveCount > 0 ? `${OK}30` : 'var(--border)'}`,
        borderRadius: 14, padding: 18,
        display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap',
      }}>
        <div style={{
          width: 50, height: 50, borderRadius: 14,
          background: stats.liveCount > 0 ? `${OK}20` : 'var(--bg2)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          position: 'relative',
        }}>
          {stats.liveCount > 0 && (
            <div style={{
              position: 'absolute', inset: 0, borderRadius: 14, border: `2px solid ${OK}`,
              animation: 'pulse-dot 1.5s ease-in-out infinite',
            }} />
          )}
          <Zap size={22} color={stats.liveCount > 0 ? OK : 'var(--muted)'} />
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 11, color: 'var(--muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 2 }}>
            Actividad en vivo
          </div>
          <div style={{ fontFamily: FONT_DISPLAY, fontSize: 18, fontWeight: 800, color: 'var(--text)' }}>
            {stats.liveCount > 0
              ? `${stats.liveCount} ${stats.liveCount === 1 ? 'campaña recibiendo clicks' : 'campañas recibiendo clicks'} ahora mismo`
              : `${stats.total} ${stats.total === 1 ? 'campaña activa' : 'campañas activas'} sin tráfico nuevo`}
          </div>
        </div>
        <div style={{
          display: 'flex', gap: 16, paddingLeft: 16, borderLeft: '1px solid var(--border)',
        }}>
          <div>
            <div style={{ fontSize: 10, color: 'var(--muted)', fontWeight: 700, textTransform: 'uppercase' }}>Clicks total</div>
            <div style={{ fontFamily: FONT_DISPLAY, fontSize: 18, fontWeight: 800, color: PURPLE }}>{fmtNum(stats.totalClicks)}</div>
          </div>
          <div>
            <div style={{ fontSize: 10, color: 'var(--muted)', fontWeight: 700, textTransform: 'uppercase' }}>Impresiones</div>
            <div style={{ fontFamily: FONT_DISPLAY, fontSize: 18, fontWeight: 800, color: BLUE }}>{fmtNum(stats.totalImp)}</div>
          </div>
          <div>
            <div style={{ fontSize: 10, color: 'var(--muted)', fontWeight: 700, textTransform: 'uppercase' }}>CTR</div>
            <div style={{ fontFamily: FONT_DISPLAY, fontSize: 18, fontWeight: 800, color: 'var(--text)' }}>{stats.totalCtr}%</div>
          </div>
        </div>
      </div>

      {error && (
        <div role="alert" style={{
          background: `${ERR}10`, border: `1px solid ${ERR}30`, color: ERR,
          borderRadius: 10, padding: '10px 14px', fontSize: 13,
          display: 'flex', alignItems: 'center', gap: 8,
        }}>
          <AlertCircle size={14} /> {error}
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 14 }}>
          {[1, 2, 3].map(i => (
            <div key={i} style={{
              background: 'var(--surface)', border: '1px solid var(--border)',
              borderRadius: 14, height: 180,
              animation: 'pulse 1.5s ease-in-out infinite',
            }} />
          ))}
        </div>
      )}

      {/* Empty */}
      {!loading && campaigns.length === 0 && !error && (
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
            No tienes campañas activas
          </h3>
          <p style={{ fontSize: 13, color: 'var(--muted)', maxWidth: 460, margin: '0 auto 14px', lineHeight: 1.6 }}>
            Solo se muestran campañas en estado PAID o PUBLISHED. Lanza una nueva para verla aquí.
          </p>
          <button onClick={() => navigate('/advertiser/campaigns/new')}
            style={{
              background: PURPLE, color: '#fff', border: 'none', borderRadius: 10,
              padding: '10px 18px', fontSize: 13, fontWeight: 700, cursor: 'pointer',
            }}>
            Lanzar campaña
          </button>
        </div>
      )}

      {/* Cards grid */}
      {!loading && campaigns.length > 0 && (
        <div style={{
          display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 14,
        }}>
          {campaigns.map(c => {
            const id = c._id || c.id
            return (
              <CampaignCard
                key={id}
                campaign={c}
                history={history[id] || []}
                prevSnapshot={prevSnapshot[id]}
                onClick={() => navigate(`/advertiser/campaigns?selected=${id}`)}
              />
            )
          })}
        </div>
      )}
    </div>
  )
}
