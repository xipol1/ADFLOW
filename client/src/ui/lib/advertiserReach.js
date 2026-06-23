// ─── advertiserReach ────────────────────────────────────────────────────────
// Lógica del modo "anunciante" de la calculadora. El input natural del
// anunciante NO es un presupuesto mensual abstracto, sino el precio que paga
// por UNA publicación + cuántas planea.
//
// ⚠️  CONSISTENCIA: el alcance se deriva del MISMO CPM que la calculadora del
//     creador (channelPricing.js / lib/channelPricingCore.js). Antes este
//     archivo tenía su propia tabla de CPM (3,8-5,1 €) que contradecía la del
//     creador (12 €) ~3×; un anunciante y un creador valoraban el mismo canal
//     con números incompatibles. Ahora:
//        precio_creador = pricePerPost / comisión        (modelo on-top)
//        CPM_creador    = BASE_CPM · plataforma · nicho   (canal "medio")
//        alcance/post   = precio_creador / CPM_creador · 1000
//     Así, si coges la tarifa que la calc. del creador sugiere y la metes aquí,
//     el alcance cuadra. (El taper de escala no se aplica aquí porque no
//     conocemos el tamaño del canal concreto — esto estima el canal medio que
//     ese presupuesto compra.)
//
// Reemplaza la lógica duplicada que vivía en ROICalculator.jsx.

import { PUBLIC_COMMISSION_MULTIPLIER } from '../theme/stats'

// CPM base del creador (€/1.000 impresiones). MIRROR de BASE_CPM en
// lib/channelPricingCore.js — mantener en sync.
const BASE_CPM = 5

// Multiplicador de CPM por plataforma. MIRROR de PLATFORM_CPM_MULT del core,
// más 'mixto' (promedio) para campañas multi-plataforma.
const PLATFORM_CPM_MULT = { telegram: 1.0, whatsapp: 1.5, discord: 0.75, newsletter: 2.0, mixto: 1.1 }

// Multiplicador de CPM por nicho. MIRROR de NICHE_CPM_MULT del core.
const NICHE_CPM_MULT = {
  finanzas: 1.5, b2bsaas: 1.45, cripto: 1.55, tech: 1.2, educacion: 1.0,
  marketing: 1.0, ecommerce: 0.9, fitness: 0.85, lifestyle: 0.8,
  gaming: 0.6, noticias: 0.55, entretenimiento: 0.5,
}

// CTR / engagement medianos por plataforma (datos de comportamiento, separados
// del precio). Sólo se usan para estimar clicks y "engaged users".
const PLATFORM_BEHAVIOR = {
  telegram:   { ctr: 0.28, eng: 0.38 },
  whatsapp:   { ctr: 0.34, eng: 0.45 },
  discord:    { ctr: 0.22, eng: 0.30 },
  newsletter: { ctr: 0.30, eng: 0.50 },
  mixto:      { ctr: 0.30, eng: 0.38 },
}

// NOTA: aquí NO se compara con Meta/Google por CPM. Una deep-research (2026-06)
// con fuentes confirmó que el CPM real de Meta en España es ~€2,5-8 (centro
// ~€5-6,5), no los 12 € que asumíamos — al nivel del CPM efectivo de Channelad,
// y por debajo en nichos premium. Por tanto un claim de "ahorro vs Meta" no es
// defendible. El valor de los canales es cualitativo (audiencia opt-in de nicho,
// confianza/endoso del creador, open/CTR altos, sin fatiga de feed), no precio.

/**
 * computeAdvertiserReach({ pricePerPost, postsPlanned, platform, niche })
 *
 * Inputs:
 *   pricePerPost  — €/publicación que paga el anunciante (comisión incluida)
 *   postsPlanned  — número de publicaciones que compra (1-30)
 *   platform      — 'telegram' | 'whatsapp' | 'discord' | 'newsletter' | 'mixto'
 *   niche         — id del nicho
 *
 * Returns (claves estables — AdvertiserResultCard depende de ellas):
 *   reachPerPost · reachTotal · clicksPerPost · clicksTotal · engagedTotal ·
 *   totalBudget · cpcEffective
 */
export function computeAdvertiserReach({
  pricePerPost = 100,
  postsPlanned = 4,
  platform = 'mixto',
  niche = 'lifestyle',
} = {}) {
  const platMult = PLATFORM_CPM_MULT[platform] ?? PLATFORM_CPM_MULT.mixto
  const nicheMult = NICHE_CPM_MULT[niche] ?? 1.0
  const behavior = PLATFORM_BEHAVIOR[platform] || PLATFORM_BEHAVIOR.mixto

  // El CPM que cobra el creador por un canal medio de esta plataforma+nicho.
  const creatorCpm = BASE_CPM * platMult * nicheMult
  // El anunciante paga con comisión incluida → lo que llega al creador es menos.
  const creatorRevenuePerPost = pricePerPost / PUBLIC_COMMISSION_MULTIPLIER
  // Alcance: las impresiones que ese ingreso del creador representa a su CPM.
  const reachPerPost = creatorCpm > 0 ? (creatorRevenuePerPost / creatorCpm) * 1000 : 0

  // CTR sobre impresiones, pero sólo ~50% de las impresiones ven realmente el
  // ad — el resto scrollea. Modela engagement real.
  const clicksPerPost = reachPerPost * behavior.ctr * 0.5
  const engagedPerPost = reachPerPost * behavior.eng

  const reachTotal   = reachPerPost   * postsPlanned
  const clicksTotal  = clicksPerPost  * postsPlanned
  const engagedTotal = engagedPerPost * postsPlanned

  const totalBudget = pricePerPost * postsPlanned
  const cpcEffective = clicksTotal > 0 ? totalBudget / clicksTotal : 0

  return {
    reachPerPost,
    reachTotal,
    clicksPerPost,
    clicksTotal,
    engagedTotal,
    totalBudget,
    cpcEffective,
  }
}

export { PLATFORM_CPM_MULT, NICHE_CPM_MULT, PLATFORM_BEHAVIOR }
