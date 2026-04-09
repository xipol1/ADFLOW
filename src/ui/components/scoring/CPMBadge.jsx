import React from 'react'
import { C, plataformaIcon } from '../../theme/tokens'

// CPM label with size variants.
export default function CPMBadge({ CPM, plataforma, size = 'md' }) {
  if (CPM == null || Number.isNaN(CPM)) return null
  const icon = plataformaIcon[plataforma] || '📡'
  const cpmStr = `€${Number(CPM).toFixed(1)}`

  if (size === 'sm') {
    return (
      <span className="font-mono" style={{ color: C.teal, fontSize: 14, fontWeight: 600 }}>
        {cpmStr}
      </span>
    )
  }

  if (size === 'lg') {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
        <div className="flex items-center" style={{ gap: 8 }}>
          <span style={{ fontSize: 20 }}>{icon}</span>
          <span
            className="font-mono"
            style={{ color: C.teal, fontSize: 28, fontWeight: 700, lineHeight: 1 }}
          >
            {cpmStr}
          </span>
        </div>
        <span className="mt-1" style={{ color: C.t2, fontSize: 11 }}>
          por 1.000 vistas
        </span>
      </div>
    )
  }

  // md
  return (
    <span className="inline-flex items-center font-mono" style={{ gap: 6 }}>
      <span style={{ fontSize: 14 }}>{icon}</span>
      <span style={{ color: C.teal, fontSize: 15, fontWeight: 600 }}>{cpmStr}</span>
      <span style={{ color: C.t2, fontSize: 12 }}>/ 1K views</span>
    </span>
  )
}
