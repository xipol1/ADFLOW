// ─── Channel One pre-registration — frontend constants ───────────────
// Mirrors config/channelOne.js (backend). Keep both in sync if the niche
// list or sizes ever change. Imported by ChannelOnePage and InterestCounter.

export const CAP = 1000
export const SLOTS_PER_NICHE = 80

export const NICHES = [
  { id: 'finanzas',       label: 'Finanzas e inversión',  emoji: '📈' },
  { id: 'marketing',      label: 'Marketing & growth',    emoji: '🚀' },
  { id: 'tech',           label: 'Tecnología & SaaS',     emoji: '💻' },
  { id: 'cripto',         label: 'Cripto & web3',         emoji: '🪙' },
  { id: 'emprendimiento', label: 'Emprendimiento',        emoji: '🛠️' },
  { id: 'noticias',       label: 'Noticias & actualidad', emoji: '📰' },
  { id: 'lifestyle',      label: 'Lifestyle & ocio',      emoji: '🌿' },
  { id: 'gaming',         label: 'Gaming & esports',      emoji: '🎮' },
  { id: 'deporte',        label: 'Deporte',               emoji: '⚽' },
  { id: 'humor',          label: 'Humor & memes',         emoji: '😂' },
  { id: 'educacion',      label: 'Educación & cultura',   emoji: '📚' },
  { id: 'otros',          label: 'Otros',                 emoji: '✨' },
]

export const SIZES = [
  { id: 'lt5k',   label: 'Menos de 5.000 miembros' },
  { id: '5k_50k', label: 'Entre 5.000 y 50.000' },
  { id: 'gt50k',  label: 'Más de 50.000' },
]

export const PLATFORMS = [
  { id: 'telegram',  label: 'Telegram' },
  { id: 'whatsapp',  label: 'WhatsApp' },
  { id: 'instagram', label: 'Instagram broadcast' },
  { id: 'discord',   label: 'Discord' },
  { id: 'other',     label: 'Otro' },
]

// Public-facing label — NOT "pre-registrados".
// Aggregates founding reservados + audits + qualified conversations.
export const COUNTER_LABEL = 'canales interesados'
export const COUNTER_LABEL_LONG = 'canales en lista de interés'
