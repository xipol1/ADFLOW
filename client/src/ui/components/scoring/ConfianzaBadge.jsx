import React from 'react'
import { C, confianzaColor, fuenteLabel } from '../../theme/tokens'

const FUENTE_TOOLTIP = {
  admin_directo: 'Admin directo — el creador es administrador verificado del canal',
  oauth_graph:   'OAuth Graph — datos leídos directamente desde la API oficial',
  bot_miembro:   'Bot miembro — métricas medidas por el bot dentro del canal',
  tracking_url:  'Tracking URL — tráfico verificado vía URL única',
  declarado:     'Declarado — datos declarados por el creador, sin verificación externa',
}

// Small trust indicator: colored dot + source + optional score.
export default function ConfianzaBadge({ score, fuente, showScore = false }) {
  if (score == null || Number.isNaN(score)) return null
  const color = confianzaColor(score)
  const label = fuenteLabel[fuente] || 'Decl.'
  const tooltip = FUENTE_TOOLTIP[fuente] || 'Fuente no especificada'

  return (
    <span
      className="inline-flex items-center font-mono"
      title={tooltip}
      style={{ gap: 6, fontSize: 12, color: 'var(--muted)', cursor: 'help' }}
    >
      <span
        style={{
          display: 'inline-block',
          width: 8,
          height: 8,
          borderRadius: 999,
          background: color,
          boxShadow: `0 0 0 2px ${color}33`,
        }}
      />
      <span>{label}</span>
      {showScore && (
        <>
          <span style={{ opacity: 0.4 }}>·</span>
          <span style={{ color, fontWeight: 600 }}>{score}</span>
        </>
      )}
    </span>
  )
}
