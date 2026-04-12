import React, { useState, useEffect } from 'react'
import { useSearchParams, useNavigate, Link } from 'react-router-dom'
import { Helmet } from 'react-helmet-async'
import {
  TrendingUp, TrendingDown, Minus, ChevronRight,
} from 'lucide-react'
import apiService from '../../../../services/api'
import { C, NIVEL, nivelFromCAS, plataformaIcon } from '../../theme/tokens'

// ─── Constants ──────────────────────────────────────────────────────────────

const FONT = "'DM Sans', 'Inter', system-ui, sans-serif"

const CATEGORIES = [
  { key: 'all', label: 'Todos' },
  { key: 'finanzas', label: 'Finanzas' },
  { key: 'marketing', label: 'Marketing' },
  { key: 'tecnologia', label: 'Tech' },
  { key: 'cripto', label: 'Crypto' },
  { key: 'salud', label: 'Salud' },
  { key: 'educacion', label: 'Educacion' },
  { key: 'lifestyle', label: 'Lifestyle' },
]

const MEDALS = ['🥇', '🥈', '🥉']

const fmtNum = (n) => {
  if (n == null || Number.isNaN(n)) return '--'
  if (n >= 1e6) return `${(n / 1e6).toFixed(1)}M`
  if (n >= 1e3) return `${(n / 1e3).toFixed(n >= 10000 ? 0 : 1)}K`
  return String(n)
}

// ─── Delta badge ────────────────────────────────────────────────────────────

function DeltaBadge({ delta }) {
  if (delta == null) {
    return (
      <span style={{ color: C.t3, fontSize: 11 }}>--</span>
    )
  }
  if (delta === 0) {
    return (
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 2, color: C.t3, fontSize: 11 }}>
        <Minus size={12} /> 0
      </span>
    )
  }
  const up = delta > 0
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 2,
        color: up ? C.ok : C.alert,
        fontSize: 11,
        fontWeight: 600,
        fontFamily: 'monospace',
      }}
    >
      {up ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
      {Math.abs(delta)}
    </span>
  )
}

// ─── Score pill ─────────────────────────────────────────────────────────────

function ScorePill({ cas, nivel }) {
  const lvl = (nivel && NIVEL[nivel]) || nivelFromCAS(cas || 0)
  return (
    <span
      className="font-mono"
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 4,
        padding: '3px 10px',
        borderRadius: 999,
        background: `${lvl.color}18`,
        border: `1px solid ${lvl.color}35`,
        color: lvl.color,
        fontSize: 12,
        fontWeight: 700,
      }}
    >
      {Math.round(cas || 0)}
    </span>
  )
}

// ─── Position cell ──────────────────────────────────────────────────────────

function Position({ pos }) {
  if (pos <= 3) {
    return (
      <span style={{ fontSize: 20, lineHeight: 1 }}>{MEDALS[pos - 1]}</span>
    )
  }
  return (
    <span
      className="font-mono"
      style={{
        color: C.t2,
        fontSize: 14,
        fontWeight: 600,
        width: 28,
        textAlign: 'center',
        display: 'inline-block',
      }}
    >
      {pos}
    </span>
  )
}

// ─── Table row ──────────────────────────────────────────────────────────────

function RankingRow({ channel, delta, isTop3 }) {
  const [hovered, setHovered] = useState(false)
  const navigate = useNavigate()
  const pIcon = plataformaIcon[channel.plataforma] || '📡'

  return (
    <tr
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onClick={() => navigate(`/channel/${channel.id}`)}
      style={{
        cursor: 'pointer',
        background: hovered
          ? `${C.teal}08`
          : isTop3
            ? `${C.teal}04`
            : 'transparent',
        transition: 'background 120ms',
      }}
    >
      {/* Position */}
      <td style={{ padding: '12px 12px 12px 16px', textAlign: 'center', width: 48 }}>
        <Position pos={channel.position} />
      </td>

      {/* Delta 7d */}
      <td style={{ padding: '12px 8px', textAlign: 'center', width: 64 }}>
        <DeltaBadge delta={delta} />
      </td>

      {/* Channel */}
      <td style={{ padding: '12px 8px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {/* Avatar */}
          <div
            style={{
              width: 36,
              height: 36,
              borderRadius: 10,
              background: isTop3 ? `${C.teal}15` : C.surfaceEl,
              border: `1px solid ${isTop3 ? C.teal + '33' : C.border}`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 14,
              fontWeight: 700,
              color: isTop3 ? C.teal : C.t2,
              flexShrink: 0,
            }}
          >
            {(channel.nombre || '?').charAt(0).toUpperCase()}
          </div>
          <div style={{ minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
              <span
                style={{
                  color: C.t1,
                  fontSize: 13,
                  fontWeight: 600,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                  maxWidth: 160,
                }}
              >
                {channel.nombre || '--'}
              </span>
              {channel.verificado && (
                <span style={{ fontSize: 11, color: C.ok }}>✓</span>
              )}
            </div>
            <div style={{ fontSize: 11, color: C.t3, fontFamily: 'monospace' }}>
              {channel.username || ''}
            </div>
          </div>
        </div>
      </td>

      {/* Platform */}
      <td style={{ padding: '12px 8px', textAlign: 'center', width: 48 }}>
        <span style={{ fontSize: 16 }}>{pIcon}</span>
      </td>

      {/* Subscribers */}
      <td style={{ padding: '12px 8px', textAlign: 'right', width: 90 }}>
        <span className="font-mono" style={{ color: C.t1, fontSize: 13, fontWeight: 600 }}>
          {fmtNum(channel.seguidores)}
        </span>
      </td>

      {/* Engagement */}
      <td style={{ padding: '12px 8px', textAlign: 'right', width: 80 }}>
        <span className="font-mono" style={{ color: C.t2, fontSize: 12 }}>
          {channel.engagement != null ? `${Number(channel.engagement).toFixed(0)}` : '--'}
        </span>
      </td>

      {/* Score */}
      <td style={{ padding: '12px 8px', textAlign: 'center', width: 80 }}>
        <ScorePill cas={channel.CAS} nivel={channel.nivel} />
      </td>

      {/* Price */}
      <td style={{ padding: '12px 8px', textAlign: 'right', width: 80 }}>
        <span className="font-mono" style={{ color: C.t1, fontSize: 13, fontWeight: 600 }}>
          {channel.precio > 0 || channel.CPMDinamico > 0
            ? `€${(channel.precio || channel.CPMDinamico).toFixed(0)}`
            : '--'}
        </span>
      </td>

      {/* Action */}
      <td style={{ padding: '12px 16px 12px 8px', textAlign: 'center', width: 40 }}>
        <ChevronRight size={16} color={hovered ? C.teal : C.t3} />
      </td>
    </tr>
  )
}

// ─── Loading skeleton ───────────────────────────────────────────────────────

function TableSkeleton() {
  return (
    <div className="animate-pulse" style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      {Array.from({ length: 10 }).map((_, i) => (
        <div
          key={i}
          style={{
            height: 52,
            background: i < 3 ? `${C.teal}04` : 'transparent',
            borderBottom: `1px solid ${C.border}`,
            display: 'flex',
            alignItems: 'center',
            padding: '0 16px',
            gap: 16,
          }}
        >
          <div style={{ width: 28, height: 20, background: C.surfaceEl, borderRadius: 4 }} />
          <div style={{ width: 36, height: 36, background: C.surfaceEl, borderRadius: 10 }} />
          <div style={{ flex: 1, height: 12, background: C.surfaceEl, borderRadius: 4 }} />
          <div style={{ width: 60, height: 12, background: C.surfaceEl, borderRadius: 4 }} />
          <div style={{ width: 50, height: 22, background: C.surfaceEl, borderRadius: 999 }} />
        </div>
      ))}
    </div>
  )
}

// ─── Empty state ────────────────────────────────────────────────────────────

function EmptyState() {
  return (
    <div style={{ textAlign: 'center', padding: '60px 24px', color: C.t2 }}>
      <div style={{ fontSize: 40, marginBottom: 12 }}>📊</div>
      <div style={{ fontSize: 16, fontWeight: 600, color: C.t1, marginBottom: 6 }}>
        No hay canales en esta categoria
      </div>
      <div style={{ fontSize: 13 }}>
        Los rankings se actualizan diariamente con datos del Scoring Engine
      </div>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════════════

export default function RankingsPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const activeCategory = searchParams.get('categoria') || 'all'

  const [rankings, setRankings] = useState([])
  const [deltas, setDeltas] = useState({})
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    setLoading(true)

    apiService
      .getChannelRankings(activeCategory, 20)
      .then((res) => {
        if (cancelled) return
        if (res?.success && res.data) {
          setRankings(res.data.rankings || [])
          setDeltas(res.data.deltas || {})
        }
      })
      .catch(() => {
        if (!cancelled) setRankings([])
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => { cancelled = true }
  }, [activeCategory])

  const setCategory = (key) => {
    const next = new URLSearchParams()
    if (key !== 'all') next.set('categoria', key)
    setSearchParams(next)
  }

  const categoryLabel = CATEGORIES.find((c) => c.key === activeCategory)?.label || 'Todos'

  // ── Table column headers ──────────────────────────────────────────────
  const thStyle = {
    padding: '10px 8px',
    fontSize: 10,
    fontWeight: 700,
    color: C.t3,
    textTransform: 'uppercase',
    letterSpacing: '0.08em',
    whiteSpace: 'nowrap',
    borderBottom: `1px solid ${C.border}`,
  }

  return (
    <div
      style={{
        background: C.bg,
        minHeight: '100vh',
        color: C.t1,
        fontFamily: FONT,
      }}
    >
      <Helmet>
        <title>{`Top Canales ${categoryLabel} · Rankings · Channelad`}</title>
        <meta name="description" content={`Ranking de los mejores canales de ${categoryLabel} para publicidad. Scores verificados por ChannelAd Scoring Engine.`} />
      </Helmet>

      <div style={{ maxWidth: 1000, margin: '0 auto', padding: '32px 24px 64px' }}>

        {/* ── HEADER ──────────────────────────────────────────────── */}
        <div style={{ marginBottom: 28 }}>
          <h1
            style={{
              fontSize: 28,
              fontWeight: 800,
              color: C.t1,
              margin: 0,
              letterSpacing: '-0.02em',
            }}
          >
            Rankings de Canales
          </h1>
          <p style={{ fontSize: 14, color: C.t2, margin: '6px 0 0' }}>
            Top canales por categoria, ordenados por ChannelAd Score (CAS)
          </p>
        </div>

        {/* ── CATEGORY TABS ───────────────────────────────────────── */}
        <div
          style={{
            display: 'flex',
            gap: 4,
            flexWrap: 'wrap',
            marginBottom: 24,
            padding: 4,
            background: C.surface,
            borderRadius: 12,
            border: `1px solid ${C.border}`,
          }}
        >
          {CATEGORIES.map((cat) => {
            const active = activeCategory === cat.key
            return (
              <button
                key={cat.key}
                onClick={() => setCategory(cat.key)}
                style={{
                  padding: '8px 18px',
                  borderRadius: 8,
                  border: 'none',
                  background: active ? C.teal : 'transparent',
                  color: active ? C.bg : C.t2,
                  fontSize: 13,
                  fontWeight: active ? 700 : 500,
                  cursor: 'pointer',
                  fontFamily: FONT,
                  transition: 'all 150ms',
                }}
              >
                {cat.label}
              </button>
            )
          })}
        </div>

        {/* ── TABLE ───────────────────────────────────────────────── */}
        <div
          style={{
            background: C.surface,
            border: `1px solid ${C.border}`,
            borderRadius: 16,
            overflow: 'hidden',
          }}
        >
          {loading ? (
            <TableSkeleton />
          ) : rankings.length === 0 ? (
            <EmptyState />
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table
                style={{
                  width: '100%',
                  borderCollapse: 'collapse',
                  minWidth: 700,
                }}
              >
                <thead>
                  <tr style={{ background: `${C.bg}80` }}>
                    <th style={{ ...thStyle, paddingLeft: 16, textAlign: 'center', width: 48 }}>#</th>
                    <th style={{ ...thStyle, textAlign: 'center', width: 64 }}>Δ 7d</th>
                    <th style={{ ...thStyle, textAlign: 'left' }}>Canal</th>
                    <th style={{ ...thStyle, textAlign: 'center', width: 48 }}></th>
                    <th style={{ ...thStyle, textAlign: 'right', width: 90 }}>Suscriptores</th>
                    <th style={{ ...thStyle, textAlign: 'right', width: 80 }}>CER</th>
                    <th style={{ ...thStyle, textAlign: 'center', width: 80 }}>Score</th>
                    <th style={{ ...thStyle, textAlign: 'right', width: 80 }}>€/post</th>
                    <th style={{ ...thStyle, paddingRight: 16, width: 40 }}></th>
                  </tr>
                </thead>
                <tbody>
                  {rankings.map((ch) => (
                    <RankingRow
                      key={ch.id}
                      channel={ch}
                      delta={deltas[String(ch.id)] ?? null}
                      isTop3={ch.position <= 3}
                    />
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* ── FOOTER NOTE ─────────────────────────────────────────── */}
        <div
          style={{
            textAlign: 'center',
            padding: '24px 0',
            fontSize: 12,
            color: C.t3,
          }}
        >
          Rankings actualizados diariamente por ChannelAd Scoring Engine v2.0
          <br />
          <Link
            to="/marketplace"
            style={{ color: C.teal, textDecoration: 'none', fontWeight: 600 }}
          >
            Ver todos los canales →
          </Link>
        </div>
      </div>
    </div>
  )
}
