import React from 'react'
import { Wifi, BatteryFull, Signal } from 'lucide-react'
import { FONT_BODY, FONT_DISPLAY } from '../../theme/tokens'

const F = FONT_BODY
const D = FONT_DISPLAY
const GREEN = '#25d366'
const greenAlpha = (o) => `rgba(37,211,102,${o})`

/**
 * PhoneFrame — marco de móvil que envuelve mockups reales de la plataforma.
 * El interior es un viewport con scroll oculto para que demos altos "asomen"
 * sin scrollbar visible — sensación de app real.
 */
export default function PhoneFrame({
  children,
  appLabel = 'Channelad',
  subLabel = 'Creator',
  width = 340,
  height = 680,
  contentScale = 1,
}) {
  return (
    <div
      style={{
        position: 'relative',
        width,
        height,
        margin: '0 auto',
        borderRadius: 40,
        background: 'linear-gradient(180deg, #1a1a1a 0%, #050505 100%)',
        padding: 10,
        boxShadow:
          '0 50px 90px -32px rgba(0,0,0,0.45), 0 12px 30px -8px rgba(0,0,0,0.20), inset 0 0 0 1px rgba(255,255,255,0.06)',
      }}
    >
      {/* Notch */}
      <div style={{
        position: 'absolute', top: 16, left: '50%', transform: 'translateX(-50%)',
        width: 110, height: 24, borderRadius: 14, background: '#000', zIndex: 5,
      }} />

      <div
        style={{
          width: '100%', height: '100%',
          borderRadius: 32, overflow: 'hidden',
          background: 'var(--bg)',
          display: 'flex', flexDirection: 'column',
        }}
      >
        {/* Status bar */}
        <div
          style={{
            background: 'var(--bg)',
            padding: '34px 22px 6px',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            fontSize: 11, color: 'var(--text)', fontWeight: 600,
            fontVariantNumeric: 'tabular-nums',
          }}
        >
          <span>10:24</span>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, color: 'var(--muted)' }}>
            <Signal size={11} strokeWidth={2.4} />
            <Wifi size={11} strokeWidth={2.4} />
            <BatteryFull size={13} strokeWidth={2.2} />
          </span>
        </div>

        {/* App header */}
        <div
          style={{
            padding: '6px 16px 12px',
            display: 'flex', alignItems: 'center', gap: 10,
            borderBottom: '1px solid var(--border)',
            background: 'var(--bg)',
          }}
        >
          <div style={{
            width: 28, height: 28, borderRadius: 8,
            background: 'linear-gradient(135deg, #25d366, #0a8a4a)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontFamily: D, fontWeight: 700, color: '#fff', fontSize: 12,
          }}>C</div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--text)', lineHeight: 1.1, fontFamily: F }}>
              {appLabel}
            </div>
            <div style={{ fontSize: 10.5, color: 'var(--muted)', display: 'flex', alignItems: 'center', gap: 4 }}>
              <span style={{
                width: 6, height: 6, borderRadius: '50%', background: GREEN,
                boxShadow: `0 0 0 0 ${greenAlpha(0.6)}`,
                animation: 'phone-pulse 1.8s infinite',
              }} />
              {subLabel}
            </div>
          </div>
        </div>

        {/* App content — scroll oculto */}
        <div
          style={{
            flex: 1,
            padding: 14,
            overflowY: 'auto',
            overflowX: 'hidden',
            scrollbarWidth: 'none',
            msOverflowStyle: 'none',
            background: 'var(--bg)',
          }}
          className="phone-scroll"
        >
          <div style={{
            transform: contentScale !== 1 ? `scale(${contentScale})` : undefined,
            transformOrigin: 'top center',
            width: contentScale !== 1 ? `${100 / contentScale}%` : undefined,
          }}>
            {children}
          </div>
        </div>

        {/* Home bar */}
        <div style={{
          background: 'var(--bg)', padding: '6px 0 8px',
          display: 'flex', justifyContent: 'center',
          borderTop: '1px solid var(--border)',
        }}>
          <div style={{
            width: 120, height: 4, borderRadius: 4,
            background: 'var(--muted)', opacity: 0.4,
          }} />
        </div>
      </div>

      <style>{`
        .phone-scroll::-webkit-scrollbar { display: none; }
        @keyframes phone-pulse {
          0%   { box-shadow: 0 0 0 0 ${greenAlpha(0.6)}; }
          70%  { box-shadow: 0 0 0 5px ${greenAlpha(0)}; }
          100% { box-shadow: 0 0 0 0 ${greenAlpha(0)}; }
        }
      `}</style>
    </div>
  )
}
