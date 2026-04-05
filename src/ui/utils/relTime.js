/**
 * relTime — Human-readable relative time in Spanish.
 * Accepts a Date, ISO string, or timestamp.
 */
export function relTime(input) {
  if (!input) return ''
  const date = typeof input === 'string' || typeof input === 'number'
    ? new Date(input)
    : input
  if (isNaN(date.getTime())) return String(input)

  const now = Date.now()
  const diff = now - date.getTime()

  // Future dates
  if (diff < 0) {
    const abs = Math.abs(diff)
    const mins = Math.floor(abs / 60000)
    if (mins < 60) return `En ${mins}m`
    const hrs = Math.floor(mins / 60)
    if (hrs < 24) return `En ${hrs}h`
    const days = Math.floor(hrs / 24)
    return `En ${days}d`
  }

  const seconds = Math.floor(diff / 1000)
  if (seconds < 30) return 'Ahora mismo'

  const minutes = Math.floor(seconds / 60)
  if (minutes < 1) return 'Hace un momento'
  if (minutes < 60) return `Hace ${minutes}m`

  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `Hace ${hours}h`

  const days = Math.floor(hours / 24)
  if (days === 1) return 'Ayer'
  if (days < 7) return `Hace ${days} dias`

  const weeks = Math.floor(days / 7)
  if (weeks === 1) return 'Hace 1 semana'
  if (weeks < 5) return `Hace ${weeks} semanas`

  const months = Math.floor(days / 30)
  if (months === 1) return 'Hace 1 mes'
  if (months < 12) return `Hace ${months} meses`

  const years = Math.floor(months / 12)
  if (years === 1) return 'Hace 1 ano'
  return `Hace ${years} anos`
}
