import React from 'react'
import { CheckCircle2, Bell, Link2, Clock } from 'lucide-react'

// 18 hourly clicks — early hours of a fresh campaign. Used by the inline
// chart so the screen feels "just published, picking up traffic".
const EARLY_CLICKS = [40, 36, 32, 28, 26, 22, 20, 22, 18, 16, 14, 16, 12, 14, 10, 12, 8, 6]

/**
 * Step 3 ("Se publica") demo — tracking-link verified publication +
 * realtime click counter starting + 48h verification countdown.
 */
export default function DemoLivePublication() {
  return (
    <div>
      {/* Header */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 18,
          gap: 12,
          flexWrap: 'wrap',
        }}
      >
        <div>
          <h3 style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)', margin: 0 }}>
            Q4_Test · En vivo
          </h3>
          <p style={{ fontSize: 11, color: 'var(--muted)', margin: 0, marginTop: 2 }}>
            Publicado hace 2 min · 47h 58min restantes para verificación
          </p>
        </div>
        <span
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            background: 'rgba(34, 197, 94, 0.14)',
            color: '#16a34a',
            padding: '6px 12px',
            borderRadius: 999,
            fontSize: 11,
            fontWeight: 600,
            whiteSpace: 'nowrap',
            border: '1px solid rgba(34, 197, 94, 0.18)',
          }}
        >
          <span
            style={{
              width: 6,
              height: 6,
              borderRadius: '50%',
              background: '#16a34a',
              animation: 'livePulse 1.4s ease-in-out infinite',
            }}
          />
          Publicado · En vivo
        </span>
      </div>

      {/* Notification feed — verification events */}
      <div
        style={{
          background: 'var(--bg2)',
          border: '1px solid var(--border)',
          borderRadius: 10,
          padding: 14,
          marginBottom: 14,
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            marginBottom: 12,
            paddingBottom: 10,
            borderBottom: '1px solid var(--border)',
          }}
        >
          <Bell size={12} color="#7C3AED" strokeWidth={2.2} />
          <span
            style={{
              fontSize: 10,
              fontWeight: 700,
              color: 'var(--text)',
              textTransform: 'uppercase',
              letterSpacing: '0.1em',
            }}
          >
            Notificaciones en tiempo real
          </span>
        </div>
        <NotifRow
          icon={CheckCircle2}
          color="#16a34a"
          title="Publicado en Canal #042"
          time="hace 2 min"
          desc="Mensaje publicado en el feed principal del canal"
        />
        <div style={{ height: 1, background: 'var(--border)', margin: '10px 0' }} />
        <NotifRow
          icon={Link2}
          color="#7C3AED"
          title="Tracking link activo"
          time="hace 2 min"
          desc="channelad.io/t/xyz123 · clicks únicos detectados"
          mono
        />
      </div>

      {/* Live counter + chart */}
      <div
        style={{
          background: 'var(--surface)',
          border: '1px solid var(--border)',
          borderRadius: 10,
          padding: 14,
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 8 }}>
          <span
            style={{
              fontSize: 10,
              fontWeight: 700,
              color: 'var(--muted)',
              textTransform: 'uppercase',
              letterSpacing: '0.1em',
            }}
          >
            Clicks únicos verificados
          </span>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 10, color: 'var(--muted)' }}>
            <Clock size={10} strokeWidth={2.2} />
            primeras 2h
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 14 }}>
          <span
            style={{
              fontSize: 36,
              fontWeight: 800,
              color: 'var(--text)',
              letterSpacing: '-0.03em',
              lineHeight: 1,
              fontFamily: "'Sora', system-ui, sans-serif",
              fontVariantNumeric: 'tabular-nums',
            }}
          >
            47
          </span>
          <span style={{ fontSize: 12, fontWeight: 600, color: '#16a34a' }}>
            ↑ +12 últimos 5 min
          </span>
        </div>

        <LiveClicksChart points={EARLY_CLICKS} />
      </div>

      {/* Verification countdown */}
      <div
        style={{
          marginTop: 14,
          padding: '12px 14px',
          background: 'linear-gradient(135deg, rgba(124,58,237,0.06) 0%, rgba(124,58,237,0.10) 100%)',
          border: '1px solid rgba(124, 58, 237, 0.20)',
          borderRadius: 10,
          display: 'flex',
          alignItems: 'center',
          gap: 12,
        }}
      >
        <div
          style={{
            width: 28,
            height: 28,
            borderRadius: 8,
            background: '#7C3AED',
            color: '#fff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
          }}
        >
          <Clock size={14} strokeWidth={2.2} />
        </div>
        <div style={{ flex: 1, fontSize: 11, color: 'var(--text)', fontWeight: 500 }}>
          Verificación automática en 48h. Si los clicks únicos no superan el mínimo,
          escrow se reembolsa automáticamente.
        </div>
      </div>

      <style>{`
        @keyframes livePulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50%      { opacity: 0.5; transform: scale(0.85); }
        }
        @keyframes liveChartReveal {
          from { stroke-dashoffset: 380; opacity: 0; }
          to   { stroke-dashoffset: 0; opacity: 1; }
        }
      `}</style>
    </div>
  )
}

function NotifRow({ icon: Icon, color, title, time, desc, mono = false }) {
  return (
    <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
      <div
        style={{
          width: 22,
          height: 22,
          borderRadius: 6,
          background: `${color}18`,
          color,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
        }}
      >
        <Icon size={12} strokeWidth={2.2} />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 8 }}>
          <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text)' }}>{title}</span>
          <span style={{ fontSize: 10, color: 'var(--muted)', whiteSpace: 'nowrap' }}>{time}</span>
        </div>
        <div
          style={{
            fontSize: 11,
            color: 'var(--muted)',
            marginTop: 2,
            fontFamily: mono ? "'JetBrains Mono', ui-monospace, monospace" : undefined,
            wordBreak: 'break-all',
          }}
        >
          {desc}
        </div>
      </div>
    </div>
  )
}

function LiveClicksChart({ points }) {
  const W = 380
  const H = 56
  const min = Math.min(...points)
  const max = Math.max(...points)
  const range = max - min || 1
  const step = W / (points.length - 1)
  const ys = points.map((v) => H - 4 - ((max - v) / range) * (H - 8))
  const path = ys.map((y, i) => `${i === 0 ? 'M' : 'L'}${(i * step).toFixed(2)},${y.toFixed(2)}`).join(' ')
  const area = `${path} L${W},${H} L0,${H} Z`
  const lastX = (points.length - 1) * step
  const lastY = ys[ys.length - 1]
  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      style={{ width: '100%', height: 50, display: 'block', overflow: 'visible' }}
      preserveAspectRatio="none"
    >
      <defs>
        <linearGradient id="liveChartFill" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor="#A855F7" stopOpacity="0.22" />
          <stop offset="100%" stopColor="#A855F7" stopOpacity="0" />
        </linearGradient>
        <linearGradient id="liveChartLine" x1="0" x2="1" y1="0" y2="0">
          <stop offset="0%" stopColor="#60A5FA" />
          <stop offset="100%" stopColor="#A855F7" />
        </linearGradient>
      </defs>
      <path d={area} fill="url(#liveChartFill)" />
      <path
        d={path}
        fill="none"
        stroke="url(#liveChartLine)"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        style={{
          strokeDasharray: 380,
          animation: 'liveChartReveal 1.2s cubic-bezier(.22,1,.36,1) 0.4s both',
        }}
      />
      <circle cx={lastX} cy={lastY} r="6" fill="rgba(168, 85, 247, 0.30)" />
      <circle cx={lastX} cy={lastY} r="3" fill="#A855F7" />
    </svg>
  )
}
