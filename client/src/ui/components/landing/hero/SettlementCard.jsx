import React from 'react'
import { motion } from 'framer-motion'
import { Lock, TrendingUp, Zap, ShieldCheck, Eye, BadgeCheck } from 'lucide-react'

// Colors are the WCAG-AA-safe deep brand shades: the avatar circles carry a
// white channel id, so a vibrant brand fill (telegram #229ED9, whatsapp
// #25D366, orange) failed contrast. Deeper shades keep the hue and clear AA.
const SETTLEMENT_CHANNELS = [
  { id: '042', platform: 'telegram',   color: '#1565a0' },
  { id: '018', platform: 'whatsapp',   color: '#15803d' },
  { id: '057', platform: 'newsletter', color: '#c2410c' },
  { id: '009', platform: 'telegram',   color: '#1565a0' },
]

// 12 hourly impressions points — gentle ascending curve with a soft midpeak.
// Drives the hero metric chart so the card feels "live" without being a
// generic line graph.
const IMPRESSION_TREND = [22, 28, 34, 38, 44, 52, 58, 62, 68, 74, 80, 86]

/**
 * SettlementCard — focal hero card. Premium fintech surface:
 *   · translucent background with backdrop-blur
 *   · long soft shadow tinted with primary
 *   · ambient glow positioned absolutely behind the card (rendered by the
 *     parent — we just paint the surface here so the glow shows through)
 *   · headline metric dominant, sparkline integrated, premium CTA
 *
 * The "Liberar pago" CTA is decorative (cursor-default). Never wire it up.
 */
export default function SettlementCard() {
  return (
    <div
      style={{
        background: 'rgba(255, 255, 255, 0.78)',
        backdropFilter: 'blur(28px) saturate(160%)',
        WebkitBackdropFilter: 'blur(28px) saturate(160%)',
        border: '1px solid rgba(255, 255, 255, 0.7)',
        borderRadius: 22,
        padding: 26,
        width: 360,
        maxWidth: '100%',
        boxShadow:
          '0 1px 0 0 rgba(255, 255, 255, 0.9) inset, 0 40px 80px -24px rgba(76, 29, 149, 0.22), 0 16px 40px -12px rgba(15, 17, 21, 0.10)',
        position: 'relative',
      }}
    >
      {/* Top reflective highlight — adds the "polished" feel */}
      <div
        aria-hidden="true"
        style={{
          position: 'absolute',
          top: 0,
          left: '12%',
          right: '12%',
          height: 1,
          background: 'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.9) 50%, transparent 100%)',
          borderRadius: 1,
        }}
      />

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 22, gap: 12 }}>
        <div>
          <p
            style={{
              fontSize: 10,
              textTransform: 'uppercase',
              letterSpacing: '0.14em',
              color: 'rgba(15, 17, 21, 0.5)',
              fontWeight: 600,
              margin: 0,
              marginBottom: 5,
            }}
          >
            Campaña activa
          </p>
          <h4 style={{ fontSize: 16, fontWeight: 700, color: '#0F1115', margin: 0, letterSpacing: '-0.015em' }}>
            Q4_Test · 4 canales
          </h4>
        </div>
        <span
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            background: 'rgba(34, 197, 94, 0.12)',
            color: '#15803d',
            padding: '5px 11px',
            borderRadius: 999,
            fontSize: 10,
            fontWeight: 600,
            whiteSpace: 'nowrap',
            border: '1px solid rgba(34, 197, 94, 0.18)',
            letterSpacing: '0.02em',
          }}
        >
          <span
            style={{
              width: 6,
              height: 6,
              borderRadius: '50%',
              background: '#16a34a',
              boxShadow: '0 0 0 3px rgba(34, 197, 94, 0.18)',
              animation: 'settlementPulse 1.8s ease-in-out infinite',
            }}
          />
          Verificado
        </span>
      </div>

      {/* Avatar row */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 11,
          marginBottom: 22,
          paddingBottom: 22,
          borderBottom: '1px solid rgba(15, 17, 21, 0.06)',
        }}
      >
        <div style={{ display: 'flex' }}>
          {SETTLEMENT_CHANNELS.map((c, i) => (
            <div
              key={`${c.id}-${i}`}
              style={{
                width: 28,
                height: 28,
                borderRadius: '50%',
                background: c.color,
                color: '#fff',
                fontSize: 9,
                fontWeight: 700,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow:
                  '0 0 0 2px rgba(255, 255, 255, 0.95), 0 4px 12px -4px ' + c.color + '80',
                marginLeft: i === 0 ? 0 : -6,
                zIndex: SETTLEMENT_CHANNELS.length - i,
                position: 'relative',
              }}
            >
              {c.id.slice(0, 2)}
            </div>
          ))}
        </div>
        <span style={{ fontSize: 11.5, color: 'rgba(15, 17, 21, 0.55)', fontWeight: 500 }}>
          4 canales · 3 plataformas
        </span>
      </div>

      {/* Primary metric — the focal point */}
      <div style={{ marginBottom: 18 }}>
        <p
          style={{
            fontSize: 10,
            textTransform: 'uppercase',
            letterSpacing: '0.14em',
            color: 'rgba(15, 17, 21, 0.5)',
            fontWeight: 600,
            margin: 0,
            marginBottom: 6,
          }}
        >
          Impresiones verificadas
        </p>
        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 10 }}>
          <p
            style={{
              fontSize: 44,
              fontWeight: 800,
              color: '#0F1115',
              letterSpacing: '-0.035em',
              lineHeight: 1,
              margin: 0,
              fontFamily: "'Sora', system-ui, sans-serif",
              fontVariantNumeric: 'tabular-nums',
            }}
          >
            89.247
          </p>
          <span
            style={{
              fontSize: 12,
              color: '#15803d',
              fontWeight: 700,
              background: 'rgba(34, 197, 94, 0.12)',
              padding: '4px 9px',
              borderRadius: 6,
              letterSpacing: '0.01em',
            }}
          >
            ↑ 18%
          </span>
        </div>

        {/* Live mini chart — sparkline integrated into the metric block */}
        <ImpressionsTrend points={IMPRESSION_TREND} />
      </div>

      {/* Secondary stats — softer surface, inner shadow, premium feel */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10, marginBottom: 22 }}>
        <StatBlock label="En escrow" value="1.247 €" icon={Lock} />
        <StatBlock label="CPM efectivo" value="13,98 €" icon={TrendingUp} />
      </div>

      {/* Footer + Premium CTA */}
      <div>
        <p
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 6,
            fontSize: 11,
            color: 'rgba(15, 17, 21, 0.55)',
            textAlign: 'center',
            margin: 0,
            marginBottom: 11,
            fontWeight: 500,
            width: '100%',
          }}
        >
          <Zap size={12} fill="#f59e0b" stroke="#f59e0b" />
          Liberación automática al cierre de campaña
        </p>
        <PremiumCTA />
      </div>

      <style>{`
        @keyframes settlementPulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50%      { opacity: 0.5; transform: scale(0.85); }
        }
        @keyframes settlementChartReveal {
          from { stroke-dashoffset: 240; opacity: 0; }
          to   { stroke-dashoffset: 0; opacity: 1; }
        }
        @keyframes settlementDotPulse {
          0%, 100% { transform: scale(1); opacity: 1; }
          50%      { transform: scale(1.45); opacity: 0.7; }
        }
      `}</style>
    </div>
  )
}

function StatBlock({ label, value, icon: Icon }) {
  return (
    <div
      style={{
        background: 'rgba(15, 17, 21, 0.025)',
        border: '1px solid rgba(15, 17, 21, 0.06)',
        borderRadius: 12,
        padding: '12px 13px',
        boxShadow: '0 1px 0 0 rgba(255, 255, 255, 0.7) inset',
      }}
    >
      <p
        style={{
          fontSize: 9,
          textTransform: 'uppercase',
          letterSpacing: '0.14em',
          color: 'rgba(15, 17, 21, 0.5)',
          fontWeight: 600,
          margin: 0,
          marginBottom: 3,
        }}
      >
        {label}
      </p>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
        <p
          style={{
            fontSize: 17,
            fontWeight: 700,
            color: '#0F1115',
            margin: 0,
            letterSpacing: '-0.02em',
            fontVariantNumeric: 'tabular-nums',
          }}
        >
          {value}
        </p>
        {Icon && (
          <span
            style={{
              width: 24,
              height: 24,
              borderRadius: 7,
              background: 'rgba(15, 17, 21, 0.06)',
              color: 'rgba(15, 17, 21, 0.55)',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            <Icon size={13} strokeWidth={2} />
          </span>
        )}
      </div>
    </div>
  )
}

function ImpressionsTrend({ points }) {
  const W = 320
  const H = 44
  const min = Math.min(...points)
  const max = Math.max(...points)
  const range = max - min || 1
  const step = W / (points.length - 1)
  const ys = points.map((v) => H - 4 - ((v - min) / range) * (H - 8))
  const path = ys.map((y, i) => `${i === 0 ? 'M' : 'L'}${(i * step).toFixed(2)},${y.toFixed(2)}`).join(' ')
  const area = `${path} L${W},${H} L0,${H} Z`
  const lastX = (points.length - 1) * step
  const lastY = ys[ys.length - 1]
  return (
    <div style={{ marginTop: 12, marginLeft: -2 }}>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        style={{ width: '100%', height: 36, display: 'block', overflow: 'visible' }}
        preserveAspectRatio="none"
      >
        <defs>
          <linearGradient id="settlementChartFill" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="#A855F7" stopOpacity="0.22" />
            <stop offset="100%" stopColor="#A855F7" stopOpacity="0" />
          </linearGradient>
          <linearGradient id="settlementChartLine" x1="0" x2="1" y1="0" y2="0">
            <stop offset="0%" stopColor="#60A5FA" />
            <stop offset="50%" stopColor="#818CF8" />
            <stop offset="100%" stopColor="#A855F7" />
          </linearGradient>
          <filter id="settlementChartGlow">
            <feGaussianBlur stdDeviation="2" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>
        <path d={area} fill="url(#settlementChartFill)" />
        <path
          d={path}
          fill="none"
          stroke="url(#settlementChartLine)"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          filter="url(#settlementChartGlow)"
          style={{
            strokeDasharray: 240,
            animation: 'settlementChartReveal 1.4s cubic-bezier(.22,1,.36,1) 0.6s both',
          }}
        />
        {/* Glowing terminal dot */}
        <circle cx={lastX} cy={lastY} r="6" fill="rgba(168, 85, 247, 0.35)" />
        <circle
          cx={lastX}
          cy={lastY}
          r="3"
          fill="#A855F7"
          style={{
            transformOrigin: `${lastX}px ${lastY}px`,
            animation: 'settlementDotPulse 2.4s ease-in-out infinite',
          }}
        />
      </svg>
    </div>
  )
}

function PremiumCTA() {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'linear-gradient(180deg, #1c1f2b 0%, #0a0c12 100%)',
        color: '#fff',
        padding: '13px 0',
        borderRadius: 12,
        fontSize: 13.5,
        fontWeight: 600,
        cursor: 'default',
        userSelect: 'none',
        letterSpacing: '-0.005em',
        boxShadow:
          '0 1px 0 0 rgba(255, 255, 255, 0.08) inset, 0 0 0 1px rgba(15, 17, 21, 0.6), 0 18px 40px -12px rgba(30, 41, 99, 0.55), 0 6px 18px -4px rgba(15, 17, 21, 0.35)',
        transition: 'transform .3s cubic-bezier(.22,1,.36,1), box-shadow .3s',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = 'translateY(-1px)'
        e.currentTarget.style.boxShadow =
          '0 1px 0 0 rgba(255, 255, 255, 0.12) inset, 0 0 0 1px rgba(15, 17, 21, 0.7), 0 26px 50px -12px rgba(67, 56, 202, 0.6), 0 8px 22px -4px rgba(15, 17, 21, 0.4)'
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = 'none'
        e.currentTarget.style.boxShadow =
          '0 1px 0 0 rgba(255, 255, 255, 0.08) inset, 0 0 0 1px rgba(15, 17, 21, 0.6), 0 18px 40px -12px rgba(30, 41, 99, 0.55), 0 6px 18px -4px rgba(15, 17, 21, 0.35)'
      }}
    >
      Liberar pago
      <svg
        style={{ marginLeft: 7, width: 14, height: 14 }}
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
        aria-hidden="true"
      >
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14 5l7 7m0 0l-7 7m7-7H3" />
      </svg>
    </div>
  )
}
