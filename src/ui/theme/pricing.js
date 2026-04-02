// ─── ADFLOW Pricing Engine ───────────────────────────────────────────────────
// Single source of truth for all pricing logic, packs, and launch urgency.

// ── Manual commission tiers (based on basePrice) ─────────────────────────────
const MANUAL_TIERS = [
  { max: 500,   rate: 0.20 },
  { max: 1500,  rate: 0.15 },
  { max: 5000,  rate: 0.12 },
  { max: Infinity, rate: 0.10 },
]

// ── AutoBuy commission tiers ─────────────────────────────────────────────────
const AUTOBUY_TIERS = {
  autobuy_basic:     0.20,
  autobuy_optimized: 0.25,
  autobuy_full:      0.30,
}

// ── Core pricing function ────────────────────────────────────────────────────
// finalPrice = basePrice * (1 + commissionRate)
// Advertiser pays finalPrice, creator receives basePrice, platform keeps difference.

export function getManualCommissionRate(basePrice) {
  for (const tier of MANUAL_TIERS) {
    if (basePrice <= tier.max) return tier.rate
  }
  return 0.10
}

export function getAutoBuyCommissionRate(mode = 'autobuy_basic') {
  return AUTOBUY_TIERS[mode] || AUTOBUY_TIERS.autobuy_basic
}

export function calcFinalPrice(basePrice, commissionRate) {
  return Math.round(basePrice * (1 + commissionRate) * 100) / 100
}

export function calcPlatformFee(basePrice, commissionRate) {
  return Math.round(basePrice * commissionRate * 100) / 100
}

export function getPricingBreakdown(basePrice, pricingType = 'manual', autobuyMode = 'autobuy_basic') {
  const commissionRate = pricingType === 'manual'
    ? getManualCommissionRate(basePrice)
    : getAutoBuyCommissionRate(autobuyMode)

  const platformFee = calcPlatformFee(basePrice, commissionRate)
  const finalPrice  = calcFinalPrice(basePrice, commissionRate)

  return {
    basePrice,
    finalPrice,
    commissionRate,
    platformFee,
    pricingType,
  }
}

// ── Packs ────────────────────────────────────────────────────────────────────
export const PACKS = [
  {
    id: 'starter',
    name: 'Starter',
    marketPrice: 200,
    finalPrice: 150,
    channels: 2,
    reach: '~25K',
    features: ['Optimizacion automatica', 'Acceso a canales verificados', 'Tracking en tiempo real'],
    badge: null,
    highlight: false,
    row: 1,
  },
  {
    id: 'growth',
    name: 'Growth',
    marketPrice: 400,
    finalPrice: 300,
    channels: 4,
    reach: '~65K',
    features: ['Optimizacion automatica', 'Acceso a canales verificados', 'Tracking en tiempo real'],
    badge: null,
    highlight: false,
    row: 1,
  },
  {
    id: 'pro',
    name: 'Pro',
    marketPrice: 650,
    finalPrice: 500,
    channels: 6,
    reach: '~140K',
    features: ['Optimizacion automatica', 'Acceso a canales verificados', 'Tracking en tiempo real'],
    badge: 'Mas popular',
    highlight: true,
    row: 1,
  },
  {
    id: 'scale',
    name: 'Scale',
    marketPrice: 1300,
    finalPrice: 1000,
    channels: 10,
    reach: '~280K',
    features: ['Optimizacion automatica', 'Acceso a canales verificados', 'Tracking en tiempo real'],
    badge: null,
    highlight: false,
    row: 1,
  },
  {
    id: 'performance',
    name: 'Performance',
    marketPrice: 3200,
    finalPrice: 2500,
    channels: 18,
    reach: '~600K',
    features: ['Optimizacion automatica', 'Acceso a canales verificados', 'Tracking en tiempo real'],
    badge: null,
    highlight: false,
    row: 2,
  },
  {
    id: 'dominance',
    name: 'Dominance',
    marketPrice: 6500,
    finalPrice: 5000,
    channels: 30,
    reach: '~1.2M',
    features: ['Optimizacion automatica', 'Acceso a canales verificados', 'Tracking en tiempo real'],
    badge: null,
    highlight: false,
    row: 2,
  },
]

export function getPackDiscount(pack) {
  return Math.round((1 - pack.finalPrice / pack.marketPrice) * 100)
}

// ── Launch urgency ───────────────────────────────────────────────────────────
// launchOfferEndDate = today + 15 days (set once, stored in localStorage)
const LAUNCH_DURATION_DAYS = 15

export function getLaunchOfferEnd() {
  if (typeof window === 'undefined') {
    const end = new Date()
    end.setDate(end.getDate() + LAUNCH_DURATION_DAYS)
    return end
  }
  try {
    const stored = localStorage.getItem('adflow-launch-end')
    if (stored) {
      const date = new Date(stored)
      if (!isNaN(date.getTime())) return date
    }
  } catch {}
  const end = new Date()
  end.setDate(end.getDate() + LAUNCH_DURATION_DAYS)
  try { localStorage.setItem('adflow-launch-end', end.toISOString()) } catch {}
  return end
}

export function getLaunchUrgency() {
  const end = getLaunchOfferEnd()
  const now = new Date()
  const diffMs = end.getTime() - now.getTime()
  const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24))
  const diffHours = Math.ceil(diffMs / (1000 * 60 * 60))

  if (diffMs <= 0) {
    return { active: false, days: 0, hours: 0, message: '', severity: 'expired' }
  }

  let message, severity
  if (diffDays <= 2) {
    message = 'Ultimas 48h — precios se actualizaran pronto'
    severity = 'critical'
  } else if (diffDays <= 5) {
    message = 'Ultimos dias para acceder a precios de lanzamiento'
    severity = 'warning'
  } else {
    message = `Ofertas de lanzamiento activas — quedan ${diffDays} dias`
    severity = 'info'
  }

  return { active: true, days: diffDays, hours: diffHours, message, severity }
}
