// ─── advertiserReach ────────────────────────────────────────────────────────
// Lógica de cálculo para el modo "anunciante" de la calculadora. Dado un
// presupuesto + plataforma + nicho, estima alcance, clicks, engaged users
// y compara contra paid media (Meta/Google).
//
// Reemplaza la lógica que vivía duplicada en ROICalculator.jsx. La calc
// unificada permite que /para-anunciantes use ChannelCalculator role="advertiser"
// en vez de su propio componente.

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
// Importamos los IDs del lib para no derivar dos mapas distintos.
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
 * computeAdvertiserReach({ budget, platform, niche })
 *
 * Returns:
 *   reach            — impresiones estimadas
 *   clicks           — clicks estimados (CTR aplicado a una fracción del reach)
 *   engaged          — usuarios activos que verían el anuncio
 *   cpcEffective     — coste por click efectivo (€)
 *   reachDeltaPct    — % de ganancia de reach vs paid media tradicional
 *   clicksDeltaPct   — % de ganancia de clicks vs paid media
 *   paidEquivalent   — { reach, clicks } que conseguirías con paid media al mismo budget
 */
export function computeAdvertiserReach({ budget = 500, platform = 'mixto', niche = 'lifestyle' } = {}) {
  const p = PLATFORM_AD_METRICS[platform] || PLATFORM_AD_METRICS.mixto
  const nicheMult = NICHE_AD_MULT[niche] ?? 1.0

  const reach = (budget / p.cpm) * 1000 * nicheMult
  // CTR sobre impresiones, pero solo una fracción (~50%) de las impresiones
  // ven realmente el ad — los demás scrollean. Esto modela honestamente el
  // engagement real frente al teórico.
  const clicks = reach * p.ctr * 0.5
  const engaged = reach * p.eng
  const cpcEffective = clicks > 0 ? budget / clicks : 0

  // Comparativa contra paid media al mismo budget
  const paidReach = (budget / PAID_MEDIA_CPM) * 1000
  const paidClicks = paidReach * PAID_MEDIA_CTR
  const reachDeltaPct  = paidReach  > 0 ? ((reach  / paidReach)  - 1) * 100 : 0
  const clicksDeltaPct = paidClicks > 0 ? ((clicks / paidClicks) - 1) * 100 : 0

  return {
    reach,
    clicks,
    engaged,
    cpcEffective,
    reachDeltaPct,
    clicksDeltaPct,
    paidEquivalent: { reach: paidReach, clicks: paidClicks },
  }
}

export { PLATFORM_AD_METRICS, NICHE_AD_MULT, PAID_MEDIA_CPM, PAID_MEDIA_CTR }
