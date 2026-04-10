import React from 'react'
import { C } from '../../theme/tokens'

// 5 component bars + CTF/CAF ratio row.
// Colors follow the scoring spec: CTF bar turns amber/red depending on ratio.
const labelStyle = (c) => ({
  color: c,
  fontSize: 11,
  fontWeight: 600,
  letterSpacing: '0.04em',
  width: 32,
  flexShrink: 0,
})

const numStyle = (c) => ({
  color: c,
  fontSize: 11,
  width: 28,
  textAlign: 'right',
  flexShrink: 0,
})

function Row({ label, value, color, barH, pulse }) {
  const pct = Math.max(0, Math.min(100, value ?? 0))
  return (
    <div className="flex items-center" style={{ gap: 8 }}>
      <span className="font-mono" style={labelStyle('var(--muted)')}>{label}</span>
      <div
        style={{
          flex: 1,
          height: barH,
          background: 'var(--border)',
          borderRadius: 999,
          overflow: 'hidden',
        }}
      >
        <div
          className={pulse ? 'animate-pulse' : ''}
          style={{
            width: `${pct}%`,
            height: '100%',
            background: color,
            borderRadius: 999,
            transition: 'width 400ms cubic-bezier(.22,1,.36,1)',
          }}
        />
      </div>
      <span className="font-mono" style={numStyle('var(--text)')}>{Math.round(pct)}</span>
    </div>
  )
}

export default function ScoreBreakdown({
  CAF,
  CTF,
  CER,
  CVS,
  CAP,
  ratioCTF_CAF,
  compact = false,
}) {
  const barH = compact ? 4 : 6
  const rowGap = compact ? 6 : 10

  // CTF color depends on CTF/CAF ratio
  let ctfColor = C.teal
  let ctfPulse = false
  if (ratioCTF_CAF != null) {
    if (ratioCTF_CAF >= 0.6) ctfColor = C.ok
    else if (ratioCTF_CAF >= 0.5) ctfColor = C.warn
    else {
      ctfColor = C.alert
      ctfPulse = true
    }
  }

  // Ratio badge semaphore
  let ratioBadge = null
  if (ratioCTF_CAF != null) {
    const bg =
      ratioCTF_CAF >= 0.6 ? C.okDim :
      ratioCTF_CAF >= 0.5 ? C.warnDim : C.alertDim
    const fg =
      ratioCTF_CAF >= 0.6 ? C.ok :
      ratioCTF_CAF >= 0.5 ? C.warn : C.alert
    const icon =
      ratioCTF_CAF >= 0.6 ? '✅' :
      ratioCTF_CAF >= 0.5 ? '⚠' : '🚨'
    ratioBadge = (
      <span
        className="font-mono"
        style={{
          background: bg,
          color: fg,
          padding: '2px 8px',
          borderRadius: 999,
          fontSize: 10,
          fontWeight: 600,
        }}
      >
        {icon}
      </span>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: rowGap }}>
      <Row label="CAF" value={CAF} color={C.teal} barH={barH} />
      <Row label="CTF" value={CTF} color={ctfColor} barH={barH} pulse={ctfPulse} />
      <Row label="CER" value={CER} color={C.teal} barH={barH} />
      <Row label="CVS" value={CVS} color={C.teal} barH={barH} />
      <Row label="CAP" value={CAP} color={C.teal} barH={barH} />

      {ratioCTF_CAF != null && (
        <div
          className="flex items-center justify-between pt-2 mt-1"
          style={{ borderTop: '1px solid var(--border)', gap: 8 }}
        >
          <span className="font-mono" style={{ color: 'var(--muted)', fontSize: 11 }}>
            CTF/CAF
          </span>
          <div className="flex items-center" style={{ gap: 8 }}>
            <span className="font-mono" style={{ color: 'var(--text)', fontSize: 11 }}>
              {ratioCTF_CAF.toFixed(2)}
            </span>
            {ratioBadge}
          </div>
        </div>
      )}
    </div>
  )
}
