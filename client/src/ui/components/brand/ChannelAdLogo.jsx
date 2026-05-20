import React from 'react'

/**
 * Channelad wordmark — manual de marca v1.0.
 * "channel" + "A" gradiente + "d" + icono radar (3 arcos + punto).
 */
export default function ChannelAdLogo({ height = 40, monochrome, dark, className, style }) {
  const id = React.useId()
  const baseColor = monochrome ? (dark ? '#FFFFFF' : '#0F1115') : '#0F1115'
  const accentFill = monochrome
    ? (dark ? '#FFFFFF' : '#0F1115')
    : `url(#${id}-grad)`
  const arcMidStroke = monochrome ? baseColor : '#6D28D9'
  const arcInnerStroke = monochrome ? baseColor : '#A78BFA'
  const dotFill = monochrome ? baseColor : '#7C3AED'

  return (
    <svg
      role="img"
      aria-label="Channelad"
      viewBox="0 0 460 120"
      height={height}
      width={(460 / 120) * height}
      className={className}
      style={{ display: 'block', ...style }}
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <linearGradient id={`${id}-grad`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#7C3AED" />
          <stop offset="100%" stopColor="#A78BFA" />
        </linearGradient>
      </defs>

      <text x="0" y="75" fontFamily="Inter, system-ui, Arial, sans-serif" fontSize="64" fill={baseColor}>
        channel
      </text>
      <text x="235" y="75" fontFamily="Inter, system-ui, Arial, sans-serif" fontSize="64" fill={accentFill} fontWeight="600">
        A
      </text>
      <text x="280" y="75" fontFamily="Inter, system-ui, Arial, sans-serif" fontSize="64" fill={baseColor}>
        d
      </text>

      <g transform="translate(380,60)">
        <path d="M0,0 m-50,0 a50,50 0 1,1 100,0"
          stroke={accentFill} strokeWidth="8" fill="none" strokeLinecap="round" />
        <path d="M0,0 m-32,0 a32,32 0 1,1 64,0"
          stroke={arcMidStroke} strokeWidth="6" fill="none" strokeLinecap="round" />
        <path d="M0,0 m-16,0 a16,16 0 1,1 32,0"
          stroke={arcInnerStroke} strokeWidth="5" fill="none" strokeLinecap="round" />
        <circle cx="0" cy="0" r="6" fill={dotFill} />
      </g>
    </svg>
  )
}
