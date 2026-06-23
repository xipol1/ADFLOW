// ─── Channelad — Unified Channel Pricing ────────────────────────────────────
// Single source of truth for every CREATOR-side calculator on the public site.
//
// ⚠️  MIRROR of lib/channelPricingCore.js (repo root, CommonJS). The Vite client
//     app can't import that file, so the pricing FORMULAS and CONSTANTS are
//     duplicated here. They are locked together by REFERENCE_VECTORS in
//     tests/channelPricing.test.js — if this copy drifts from the core, the test
//     fails. Change both (and the advertiser mirror in advertiserReach.js) in the
//     same commit.
//
// The data tables (NICHES, PLATFORMS, FORMATS) are exported so the UI can render
// pickers directly. All price math goes through computeChannelPricing().

import { PUBLIC_COMMISSION_MULTIPLIER } from '../theme/stats'

// ── Plataformas ─────────────────────────────────────────────────────────────
// `mult` ajusta el CPM por la calidad de impresión típica de cada plataforma.
// `reachBase` / `reachFloor` definen la curva de alcance (ver reachRate()).
export const PLATFORMS = [
  { id: 'telegram',   label: 'Telegram',   color: '#2aabee', mult: 1.0,  reachBase: 0.45, reachFloor: 0.18 },
  { id: 'whatsapp',   label: 'WhatsApp',   color: '#25d366', mult: 1.1,  reachBase: 0.72, reachFloor: 0.24 },
  { id: 'discord',    label: 'Discord',    color: '#5865f2', mult: 0.95, reachBase: 0.55, reachFloor: 0.15 },
  { id: 'newsletter', label: 'Newsletter', color: '#8b5cf6', mult: 1.2,  reachBase: 0.40, reachFloor: 0.18 },
]

// ── Nichos ──────────────────────────────────────────────────────────────────
// `mult` aplica sobre el CPM base — premium/discount del nicho frente al
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

// ── Constantes del modelo (MIRROR de lib/channelPricingCore.js) ──────────────
// CPM base: € que cobra el CREADOR por 1.000 impresiones reales, para un canal
// baseline (nicho ×1.0, sin escala, engagement medio). El anunciante paga esto
// × comisión. OJO: no usar para afirmar "más barato que Meta" — el CPM real de
// Meta en España es ~€5-6,5 (no 12 €), al nivel del nuestro. La ventaja de los
// canales es cualitativa (audiencia opt-in, confianza, open/CTR), no el precio.
export const BASE_CPM = 5

// Curva de alcance: rate(f) = floor + (base-floor)·(PIVOT/max(f,PIVOT))^DECAY.
// Sustituye al antiguo 0,6 plano — ahora varía por plataforma y decae con el
// tamaño (los canales grandes alcanzan a un % menor de su audiencia por post).
export const REACH_PIVOT = 3000
export const REACH_DECAY = 0.12

// Taper de escala: descuento de CPM por volumen → precio sublineal en seguidores.
// factor(reach) = SCALE_FLOOR + (1-SCALE_FLOOR)·(RPIVOT/max(reach,RPIVOT))^SCALE_DECAY
export const SCALE_RPIVOT = 8000
export const SCALE_DECAY = 0.10
export const SCALE_FLOOR = 0.45

export function reachRate(platformId, followers) {
  const p = findPlatform(platformId)
  const f = Math.max(0, Number(followers) || 0)
  if (f <= REACH_PIVOT) return p.reachBase
  const decay = Math.pow(REACH_PIVOT / f, REACH_DECAY)
  return p.reachFloor + (p.reachBase - p.reachFloor) * decay
}

export function scaleTaper(reachPerPost) {
  const r = Math.max(0, Number(reachPerPost) || 0)
  if (r <= SCALE_RPIVOT) return 1
  return SCALE_FLOOR + (1 - SCALE_FLOOR) * Math.pow(SCALE_RPIVOT / r, SCALE_DECAY)
}

// ── Engagement boost ────────────────────────────────────────────────────────
// `reactionsPerPost / followers` da la engagement rate:
//   < 0.5%  → bajo (−15%) · 0.5-2% → normal · 2-5% → bueno (+10%) · > 5% → +25%
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
// Devuelve todos los outputs que los calculadores del sitio necesitan.
//
// Inputs:  followers, reactionsPerPost, postsPerMonth, platform, niche, format
// Outputs (claves estables — varios componentes dependen de ellas):
//   effectiveCpm · reachPerPost · pricePerFormat[] · featuredFormatPrice ·
//   featuredFormatLabel · creatorPerPost · advertiserPaysPerPost ·
//   monthlyEarnings · yearlyEarnings · engagement{boost,label,rate} ·
//   comparisons{adsense,patreon,networks}
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

  // Alcance: % decreciente por tamaño y plataforma.
  const rate = reachRate(p.id, followers)
  const reachPerPost = Math.round((Number(followers) || 0) * rate)

  // CPM efectivo: base · plataforma · nicho · engagement · taper de escala.
  const taper = scaleTaper(reachPerPost)
  const effectiveCpm = BASE_CPM * p.mult * n.mult * boost * taper

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
