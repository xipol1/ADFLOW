// ─── Channelad — Unified Channel Pricing ────────────────────────────────────
// Single source of truth for every calculator on the public site.
// Replaces the duplicate CPM tables and formulas that used to live inside
// the landing earnings calculator and the blog post CalculadoraPrecios.jsx.
//
// All consumers go through `computeChannelPricing()`. The data tables
// (NICHES, PLATFORMS, FORMATS) are exported so the UI can render pickers
// directly without re-declaring them.

import { PUBLIC_COMMISSION_MULTIPLIER } from '../theme/stats'

// ── Plataformas ─────────────────────────────────────────────────────────────
// `mult` ajusta el CPM base por la calidad de impresión típica de cada
// plataforma (WhatsApp = open rate 80-90%, Discord = engagement alto pero
// audiencia más fragmentada, etc.).
export const PLATFORMS = [
  { id: 'telegram',   label: 'Telegram',   color: '#2aabee', mult: 1.0  },
  { id: 'whatsapp',   label: 'WhatsApp',   color: '#25d366', mult: 1.05 },
  { id: 'discord',    label: 'Discord',    color: '#5865f2', mult: 0.95 },
  { id: 'newsletter', label: 'Newsletter', color: '#8b5cf6', mult: 1.10 },
]

// ── Nichos ──────────────────────────────────────────────────────────────────
// Lista canónica fusionada de las dos tablas previas. El `mult` aplica sobre
// el CPM base (12 €) — es el premium/discount típico del nicho frente al
// promedio del marketplace.
export const NICHES = [
  { id: 'finanzas',        label: 'Finanzas / Inversiones',  mult: 1.5  },
  { id: 'b2bsaas',         label: 'B2B SaaS',                 mult: 1.4  },
  { id: 'cripto',          label: 'Cripto / Trading',         mult: 1.3  },
  { id: 'tech',            label: 'Tecnología / Software',    mult: 1.2  },
  { id: 'educacion',       label: 'Educación',                mult: 1.1  },
  { id: 'marketing',       label: 'Marketing / Negocios',     mult: 1.1  },
  { id: 'ecommerce',       label: 'E-commerce',               mult: 1.0  },
  { id: 'fitness',         label: 'Fitness / Salud',          mult: 0.95 },
  { id: 'lifestyle',       label: 'Lifestyle / Moda',         mult: 0.9  },
  { id: 'gaming',          label: 'Gaming',                   mult: 0.85 },
  { id: 'noticias',        label: 'Noticias / Actualidad',    mult: 0.75 },
  { id: 'entretenimiento', label: 'Entretenimiento / Memes',  mult: 0.65 },
]

// ── Formatos publicitarios ──────────────────────────────────────────────────
// `mult` = multiplicador sobre el precio base (1 post estándar).
// `discount` (solo paquetes) = descuento por volumen aplicado tras multiplicar.
export const FORMATS = [
  { id: 'standard', label: 'Post estándar',     mult: 1,  discount: 0,    description: 'Precio base, post normal en el feed.' },
  { id: 'pin24',    label: 'Fijado 24h',         mult: 2,  discount: 0,    description: 'Permanece arriba del canal durante 24 horas.' },
  { id: 'pin48',    label: 'Fijado 48h',         mult: 3,  discount: 0,    description: 'Permanece arriba durante 48 horas, ideal para lanzamientos.' },
  { id: 'organic',  label: 'Mención orgánica',   mult: 1.5, discount: 0,   description: 'Integrado dentro de tu contenido habitual.' },
  { id: 'pack5',    label: 'Paquete 5 posts',    mult: 5,  discount: 0.15, description: '−15% por volumen, campañas largas.' },
  { id: 'pack10',   label: 'Paquete 10 posts',   mult: 10, discount: 0.25, description: '−25% por volumen, anunciantes recurrentes.' },
]

// CPM base del marketplace (mediana real para canales medianos).
// El CPM efectivo se calcula como: BASE_CPM · platform.mult · niche.mult · engagementBoost.
export const BASE_CPM = 12

// Tasa de impresión por publicación — fracción de la audiencia que ve un post
// típico (Telegram 30-45%, WhatsApp 75-90%, Discord 60-80%). Usamos 60% como
// promedio conservador para el reach mostrado.
export const REACH_RATE = 0.6

// ── Engagement boost ────────────────────────────────────────────────────────
// `reactionsPerPost / followers` da la engagement rate. La industria considera:
//   < 0.5%  → engagement bajo (−15% precio)
//   0.5-2%  → normal (sin ajuste)
//   2-5%    → bueno (+10%)
//   > 5%    → excelente (+25%)
// Si el usuario no provee reactionsPerPost (== 0 o null), no se aplica boost.
export function engagementBoost(followers, reactionsPerPost) {
  if (!reactionsPerPost || !followers || followers <= 0) return 1
  const rate = reactionsPerPost / followers
  if (rate >= 0.05) return 1.25
  if (rate >= 0.02) return 1.10
  if (rate >= 0.005) return 1.0
  return 0.85
}

export function engagementLabel(followers, reactionsPerPost) {
  if (!reactionsPerPost || !followers) return 'Sin datos'
  const rate = reactionsPerPost / followers
  if (rate >= 0.05) return 'Excelente'
  if (rate >= 0.02) return 'Bueno'
  if (rate >= 0.005) return 'Normal'
  return 'Bajo'
}

// ── Lookup helpers ──────────────────────────────────────────────────────────
export const findPlatform = (id) => PLATFORMS.find((p) => p.id === id) || PLATFORMS[0]
export const findNiche    = (id) => NICHES.find((n) => n.id === id) || NICHES[3]
export const findFormat   = (id) => FORMATS.find((f) => f.id === id) || FORMATS[0]

// ── Núcleo: cálculo de precios ──────────────────────────────────────────────
// Devuelve todos los outputs que los calculadores del sitio necesitan, en una
// sola pasada. Los consumidores eligen qué mostrar según la `variant`.
//
// Inputs:
//   followers          — número de seguidores activos del canal
//   reactionsPerPost   — reacciones medias por publicación (0 si se ignora)
//   postsPerMonth      — publicaciones patrocinadas que el creador planea/mes
//   platform           — id de PLATFORMS
//   niche              — id de NICHES
//   format             — id de FORMATS (formato "destacado" del output)
//
// Outputs:
//   effectiveCpm           — CPM ajustado a la combinación específica
//   reachPerPost           — impresiones esperadas por publicación
//   pricePerFormat[]       — precio recomendado para cada formato (6 entradas)
//   featuredFormatPrice    — precio del formato seleccionado (atajo de UI)
//   creatorPerPost         — lo que cobra el creador por un post estándar
//   advertiserPaysPerPost  — lo que paga el anunciante (creator + 20%)
//   monthlyEarnings        — creatorPerPost · postsPerMonth
//   yearlyEarnings         — monthlyEarnings · 12
//   engagement             — { boost, label, rate }
//   comparisons            — { adsense, patreon, networks } (solo para landing)
export function computeChannelPricing({
  followers = 0,
  reactionsPerPost = 0,
  postsPerMonth = 1,
  platform = 'telegram',
  niche = 'tech',
  format = 'standard',
} = {}) {
  const p = findPlatform(platform)
  const n = findNiche(niche)
  const f = findFormat(format)
  const boost = engagementBoost(followers, reactionsPerPost)
  const engRate = followers > 0 ? reactionsPerPost / followers : 0

  const effectiveCpm = BASE_CPM * p.mult * n.mult * boost
  const reachPerPost = Math.round(followers * REACH_RATE)
  const creatorPerPost = (reachPerPost / 1000) * effectiveCpm
  const advertiserPaysPerPost = creatorPerPost * PUBLIC_COMMISSION_MULTIPLIER

  const pricePerFormat = FORMATS.map((fmt) => {
    const gross = creatorPerPost * fmt.mult
    const net = gross * (1 - fmt.discount)
    return {
      id: fmt.id,
      label: fmt.label,
      description: fmt.description,
      mult: fmt.mult,
      discount: fmt.discount,
      price: net,
    }
  })

  const featured = pricePerFormat.find((x) => x.id === f.id) || pricePerFormat[0]
  const monthlyEarnings = creatorPerPost * postsPerMonth
  const yearlyEarnings = monthlyEarnings * 12

  // Comparativas vs alternativas — mismo reach mensual, distintos canales.
  // Adsense: ~2 € CPM, sólo si el creador desvía tráfico web (5% del reach).
  const adsense = (reachPerPost * postsPerMonth * 0.05 / 1000) * 2
  // Patreon: 8% comisión, 5% de miembros pagando 5 €/mes.
  const patreon = followers * 0.05 * 5 * 0.92
  // Networks tradicionales: 30-50% comisión + cobro a 60-90 días → ~55% neto.
  const networks = monthlyEarnings * 0.55

  return {
    effectiveCpm,
    reachPerPost,
    pricePerFormat,
    featuredFormatPrice: featured.price,
    featuredFormatLabel: featured.label,
    creatorPerPost,
    advertiserPaysPerPost,
    monthlyEarnings,
    yearlyEarnings,
    engagement: {
      boost,
      label: engagementLabel(followers, reactionsPerPost),
      rate: engRate,
    },
    comparisons: { adsense, patreon, networks },
  }
}

// ── Formatters de UI ────────────────────────────────────────────────────────
export function fmtEur(n) {
  return Math.round(n).toLocaleString('es-ES') + ' €'
}

export function fmtFollowers(n) {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M'
  if (n >= 10_000)    return Math.round(n / 1000) + 'K'
  if (n >= 1_000)     return (n / 1000).toFixed(1) + 'K'
  return n.toLocaleString('es-ES')
}
