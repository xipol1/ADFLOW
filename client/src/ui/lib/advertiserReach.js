// ─── advertiserReach ────────────────────────────────────────────────────────
// Lógica de cálculo para el modo "anunciante" de la calculadora. El input
// natural del anunciante NO es un "presupuesto mensual" abstracto sino el
// precio que paga por UNA publicación + cuántas publicaciones planea.
//
// El backend calcula entonces:
//   - alcance por publicación
//   - alcance total (por post × posts planeados)
//   - budget total (precio por post × posts planeados)
//   - comparativa contra paid media al mismo budget total.
//
// Reemplaza la lógica que vivía duplicada en ROICalculator.jsx.

// CPM/CTR/engagement medianos por plataforma en el marketplace Channelad
// (datos consolidados de +2.500 canales en seguimiento).
const PLATFORM_AD_METRICS = {
  telegram:   { cpm: 3.8, ctr: 0.28, eng: 0.38 },
  whatsapp:   { cpm: 4.2, ctr: 0.34, eng: 0.45 },
  discord:    { cpm: 5.1, ctr: 0.22, eng: 0.30 },
  newsletter: { cpm: 6.5, ctr: 0.30, eng: 0.50 },
  mixto:      { cpm: 4.3, ctr: 0.30, eng: 0.38 },
}

// Multiplicador de nicho — mismas claves que channelPricing.NICHES.
const NICHE_AD_MULT = {
  finanzas:        1.4,
  b2bsaas:         1.4,
  cripto:          1.3,
  tech:            1.2,
  educacion:       1.15,
  marketing:       1.1,
  ecommerce:       1.1,
  fitness:         1.0,
  lifestyle:       1.0,
  gaming:          0.9,
  noticias:        0.85,
  entretenimiento: 0.85,
}

// Paid media baseline (Meta/Google promedio). Lo usamos como referencia para
// mostrar el ahorro vs publicidad tradicional.
const PAID_MEDIA_CPM = 12   // EUR
const PAID_MEDIA_CTR = 0.012 // 1.2% CTR — promedio histórico Meta/Google display

/**
 * computeAdvertiserReach({ pricePerPost, postsPlanned, platform, niche })
 *
 * Inputs:
 *   pricePerPost  — €/publicación que paga el anunciante (50-5000 típico)
 *   postsPlanned  — número de publicaciones que compra (1-30)
 *   platform      — 'telegram' | 'whatsapp' | 'discord' | 'newsletter' | 'mixto'
 *   niche         — id del nicho (cripto, finanzas, ...)
 *
 * Returns:
 *   reachPerPost          — impresiones por publicación
 *   reachTotal            — reachPerPost × postsPlanned
 *   clicksPerPost         — clicks estimados por publicación
 *   clicksTotal           — clicks totales
 *   engagedTotal          — usuarios activos viendo el anuncio (total)
 *   totalBudget           — pricePerPost × postsPlanned (lo que paga el anunciante a Channelad)
 *   cpcEffective          — coste por click sobre el budget total
 *   reachDeltaPct         — % de ganancia vs paid media a mismo budget
 *   clicksDeltaPct        — % de ganancia de clicks vs paid media
 *   paidEquivalent        — { reach, clicks } con el budget total en Meta/Google
 */
export function computeAdvertiserReach({
  pricePerPost = 100,
  postsPlanned = 4,
  platform = 'mixto',
  niche = 'lifestyle',
} = {}) {
  const p = PLATFORM_AD_METRICS[platform] || PLATFORM_AD_METRICS.mixto
  const nicheMult = NICHE_AD_MULT[niche] ?? 1.0

  // Alcance por publicación: el pricePerPost compra impresiones a un CPM
  // efectivo (CPM base × multiplicador de nicho).
  const reachPerPost = (pricePerPost / p.cpm) * 1000 * nicheMult
  // CTR sobre impresiones, pero solo una fracción (~50%) de las impresiones
  // ven realmente el ad — los demás scrollean. Modela engagement real.
  const clicksPerPost = reachPerPost * p.ctr * 0.5
  const engagedPerPost = reachPerPost * p.eng

  const reachTotal   = reachPerPost   * postsPlanned
  const clicksTotal  = clicksPerPost  * postsPlanned
  const engagedTotal = engagedPerPost * postsPlanned

  const totalBudget = pricePerPost * postsPlanned
  const cpcEffective = clicksTotal > 0 ? totalBudget / clicksTotal : 0

  // Comparativa contra paid media al mismo budget total
  const paidReach  = (totalBudget / PAID_MEDIA_CPM) * 1000
  const paidClicks = paidReach * PAID_MEDIA_CTR
  const reachDeltaPct  = paidReach  > 0 ? ((reachTotal  / paidReach)  - 1) * 100 : 0
  const clicksDeltaPct = paidClicks > 0 ? ((clicksTotal / paidClicks) - 1) * 100 : 0

  return {
    reachPerPost,
    reachTotal,
    clicksPerPost,
    clicksTotal,
    engagedTotal,
    totalBudget,
    cpcEffective,
    reachDeltaPct,
    clicksDeltaPct,
    paidEquivalent: { reach: paidReach, clicks: paidClicks },
  }
}

export { PLATFORM_AD_METRICS, NICHE_AD_MULT, PAID_MEDIA_CPM, PAID_MEDIA_CTR }
