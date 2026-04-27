import React from 'react'
import { C } from '../../theme/tokens'

// Renders nothing when the ratio is healthy and there are no flags.
export default function FraudFlag({ ratioCTF_CAF, flags = [] }) {
  const hasRatio = ratioCTF_CAF != null && !Number.isNaN(ratioCTF_CAF)
  const ratioBad = hasRatio && ratioCTF_CAF < 0.6
  const hasUnverified = Array.isArray(flags) && flags.includes('datos_no_verificados')

  if (!ratioBad && !hasUnverified) return null

  let banner = null
  if (ratioBad) {
    const critical = ratioCTF_CAF < 0.5
    const bg = critical ? C.alertDim : C.warnDim
    const fg = critical ? C.alert : C.warn
    const border = critical ? `${C.alert}55` : `${C.warn}55`
    const msg = critical
      ? '🚨 Métricas en revisión — engagement inconsistente con el volumen declarado'
      : '⚡ Engagement por debajo del ratio esperado para este tamaño de canal'

    banner = (
      <div
        className="rounded-lg"
        style={{
          background: bg,
          border: `1px solid ${border}`,
          color: fg,
          padding: '10px 12px',
          fontSize: 12,
          lineHeight: 1.4,
        }}
      >
        {msg}
      </div>
    )
  }

  const unverifiedChip = hasUnverified && (
    <span
      style={{
        display: 'inline-block',
        marginTop: banner ? 6 : 0,
        background: 'rgba(148,163,184,0.15)',
        color: C.silver,
        border: `1px solid ${C.silver}44`,
        padding: '2px 8px',
        borderRadius: 999,
        fontSize: 10,
        fontWeight: 600,
      }}
    >
      Sin verificar
    </span>
  )

  return (
    <div>
      {banner}
      {unverifiedChip}
    </div>
  )
}
