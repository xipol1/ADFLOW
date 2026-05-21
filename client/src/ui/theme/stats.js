// ─── Channelad public stats ──────────────────────────────────────────────────
// Single source of truth for the "+2.500 channels" claim used across landings.
// Keep numbers honest and conservative: round-down beats round-up if questioned.

export const CHANNELS_TRACKED = 2500
export const CHANNELS_TRACKED_LABEL = '+2.500 canales'
export const CHANNELS_TRACKED_LABEL_LONG = '+2.500 canales con métricas propias'
export const CHANNELS_TRACKED_TOOLTIP =
  'Datos propios recolectados y actualizados diariamente, no procedentes de terceros.'

// Public commission strings — keep aligned with COMMISSION_TIERS.standard in pricing.js
export const PUBLIC_COMMISSION_RATE = 0.20
export const PUBLIC_COMMISSION_LABEL = '20%'
export const PUBLIC_COMMISSION_MULTIPLIER = 1 + PUBLIC_COMMISSION_RATE // 1.20

// Founding cohort — primeros FOUNDING_TOTAL admins con comisión 18% vitalicia.
// Fuente única: actualizar FOUNDING_RESERVED cuando entren partners nuevos.
export const FOUNDING_RESERVED = 100
export const FOUNDING_TOTAL = 150
