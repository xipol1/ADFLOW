// ─── Channelad — WebMCP (navegación agéntica) ───────────────────────────────
// Expone la calculadora de tarifas como una "tool" que los agentes de IA y los
// navegadores agénticos (Edge 147 nativo, Chrome 149 origin trial) pueden
// invocar directamente, sin scrapear el DOM ni rellenar el wizard a mano.
//
// Spec: WebMCP / Web Model Context Protocol (W3C Web Machine Learning CG).
//   - La API en navegador se expone como `navigator.modelContext` (la spec
//     borrador la llama `document.modelContext`; registramos en la que exista).
//   - registerTool({ name, description, inputSchema, execute, annotations }).
//   - `inputSchema` es JSON Schema. El contexto que antes daba `provideContext`
//     ahora va embebido en las `description` de cada parámetro.
//   - `execute(input)` devuelve un objeto plano que el agente interpreta.
//
// Es 100% client-side: el cálculo corre con computeChannelPricing (función pura),
// así que no toca el backend ni expone datos privados. Si el navegador no soporta
// WebMCP, registerCalculatorTools() es un no-op silencioso.

import {
  PLATFORMS, NICHES, FORMATS,
  computeChannelPricing, findPlatform, findNiche, findFormat,
  fmtEur, fmtFollowers,
} from './channelPricing'
import { PUBLIC_COMMISSION_MULTIPLIER, PUBLIC_COMMISSION_LABEL } from '../theme/stats'

const PLATFORM_IDS = PLATFORMS.map((p) => p.id)
const NICHE_IDS    = NICHES.map((n) => n.id)
const FORMAT_IDS   = FORMATS.map((f) => f.id)

// ── Núcleo puro: valida la entrada del agente y calcula el resultado ─────────
// Separado del registro para poder testearlo sin globals de navegador. Tolerante
// con la entrada (un agente puede mandar strings, valores fuera de rango, ids
// desconocidos): si algo no encaja devolvemos { ok:false } con las opciones
// válidas en lugar de lanzar.
export function buildCalculatorResult(input = {}) {
  const plataforma = String(input.plataforma || '').toLowerCase().trim()
  const nicho      = String(input.nicho || '').toLowerCase().trim()

  if (!PLATFORM_IDS.includes(plataforma)) {
    return {
      ok: false,
      error: `Plataforma no reconocida: "${input.plataforma}".`,
      plataformasValidas: PLATFORMS.map((p) => ({ id: p.id, nombre: p.label })),
    }
  }
  if (!NICHE_IDS.includes(nicho)) {
    return {
      ok: false,
      error: `Nicho no reconocido: "${input.nicho}".`,
      nichosValidos: NICHES.map((n) => ({ id: n.id, nombre: n.label })),
    }
  }

  // Coerciones tolerantes. seguidores es obligatorio de facto; el resto opcional.
  const seguidores = clampNum(input.seguidores, 0, 100_000_000, 0)
  const reaccionesPorPost = clampNum(input.reaccionesPorPost, 0, 100_000_000, 0)
  const postsPorMes = clampNum(input.postsPorMes, 1, 60, 4)
  const formato = FORMAT_IDS.includes(input.formato) ? input.formato : 'standard'

  if (seguidores <= 0) {
    return {
      ok: false,
      error: 'Indica el número de suscriptores activos del canal (parámetro "seguidores", entero positivo).',
    }
  }

  const r = computeChannelPricing({
    followers: seguidores,
    reactionsPerPost: reaccionesPorPost,
    postsPerMonth: postsPorMes,
    platform: plataforma,
    niche: nicho,
    format: formato,
  })

  const pNombre = findPlatform(plataforma).label
  const nNombre = findNiche(nicho).label
  const fNombre = findFormat(formato).label

  // Resumen en lenguaje natural para que el agente pueda citarlo tal cual.
  const resumen =
    `Un canal de ${pNombre} de nicho "${nNombre}" con ${fmtFollowers(seguidores)} ` +
    `suscriptores alcanza ~${r.reachPerPost.toLocaleString('es-ES')} personas por post ` +
    `(CPM efectivo ${r.effectiveCpm.toFixed(1)} €). Tarifa para el creador por ` +
    `${fNombre.toLowerCase()}: ${fmtEur(r.featuredFormatPrice)}. El anunciante paga ` +
    `${fmtEur(r.featuredFormatPrice * PUBLIC_COMMISSION_MULTIPLIER)} (incluye ${PUBLIC_COMMISSION_LABEL} de comisión de Channelad). ` +
    `Con ${postsPorMes} posts/mes el creador ingresaría ~${fmtEur(r.monthlyEarnings)}/mes ` +
    `(${fmtEur(r.yearlyEarnings)}/año).`

  return {
    ok: true,
    entrada: { plataforma, nicho, seguidores, reaccionesPorPost, postsPorMes, formato },
    moneda: 'EUR',
    formatoDestacado: {
      id: formato,
      nombre: fNombre,
      precioCreador: round2(r.featuredFormatPrice),
      precioAnunciante: round2(r.featuredFormatPrice * PUBLIC_COMMISSION_MULTIPLIER),
    },
    preciosPorFormato: r.pricePerFormat.map((f) => ({
      id: f.id,
      nombre: f.label,
      precioCreador: round2(f.price),
    })),
    ingresos: {
      precioPostEstandarCreador: round2(r.creatorPerPost),
      mensualCreador: round2(r.monthlyEarnings),
      anualCreador: round2(r.yearlyEarnings),
    },
    cpmEfectivo: round2(r.effectiveCpm),
    alcancePorPost: r.reachPerPost,
    engagement: { nivel: r.engagement.label, tasa: round4(r.engagement.rate) },
    resumen,
    nota:
      'Estimación orientativa basada en CPMs medianos del marketplace de Channelad ' +
      `(comisión del ${PUBLIC_COMMISSION_LABEL} pagada por el anunciante; el creador recibe el 100% de su tarifa). ` +
      'Para una tarifa real, registra el canal en https://channelad.io/para-canales.',
  }
}

// ── Tool 1: calcular la tarifa de un canal ──────────────────────────────────
function calculatorTool() {
  return {
    name: 'calcular_tarifa_canal',
    title: 'Calcular tarifa de un canal',
    description:
      'Estima cuánto puede cobrar un canal de WhatsApp, Telegram, Discord o Newsletter ' +
      'por una publicación patrocinada, y cuánto ingresaría al mes, usando la calculadora ' +
      'de Channelad. Devuelve precio por post (para el creador y lo que paga el anunciante), ' +
      'precios por formato, ingreso mensual/anual, CPM efectivo y alcance estimado por post. ' +
      'Es una estimación orientativa basada en CPMs medianos del marketplace hispanohablante.',
    inputSchema: {
      type: 'object',
      properties: {
        plataforma: {
          type: 'string',
          enum: PLATFORM_IDS,
          description: 'Plataforma del canal: telegram, whatsapp, discord o newsletter.',
        },
        nicho: {
          type: 'string',
          enum: NICHE_IDS,
          description:
            'Temática del canal (cambia el CPM hasta ×3). Premium: finanzas, b2bsaas, cripto, tech. ' +
            'Medios: educacion, marketing, ecommerce, fitness, lifestyle. ' +
            'Bajos: gaming, noticias, entretenimiento.',
        },
        seguidores: {
          type: 'number',
          minimum: 1,
          description: 'Suscriptores activos: los que realmente reciben la notificación de cada post.',
        },
        reaccionesPorPost: {
          type: 'number',
          minimum: 0,
          description:
            'Opcional. Reacciones medias por publicación. Mide el engagement y ajusta el CPM ' +
            'entre −15% y +25%. Por defecto 0 (sin datos = engagement neutro).',
        },
        postsPorMes: {
          type: 'number',
          minimum: 1,
          description: 'Opcional. Posts patrocinados al mes, para estimar el ingreso mensual. Por defecto 4.',
        },
        formato: {
          type: 'string',
          enum: FORMAT_IDS,
          description:
            'Opcional. Formato del anuncio para el precio destacado: standard (post normal), ' +
            'pin24 / pin48 (fijado 24/48h), organic (mención integrada), pack5 / pack10 ' +
            '(paquetes con descuento por volumen). Por defecto standard.',
        },
      },
      required: ['plataforma', 'nicho', 'seguidores'],
    },
    annotations: { readOnlyHint: true, openWorldHint: false },
    execute: async (input) => buildCalculatorResult(input || {}),
  }
}

// ── Tool 2: listar las opciones válidas (descubrimiento) ─────────────────────
// Permite al agente conocer los ids exactos de plataforma/nicho/formato antes
// de llamar a la calculadora, sin tener que adivinarlos.
function optionsTool() {
  return {
    name: 'listar_opciones_calculadora',
    title: 'Opciones de la calculadora de canales',
    description:
      'Devuelve los valores válidos para la calculadora de tarifas de Channelad: ' +
      'plataformas, nichos (con su multiplicador de CPM) y formatos de anuncio disponibles. ' +
      'Úsalo antes de calcular_tarifa_canal si no conoces los identificadores exactos.',
    inputSchema: { type: 'object', properties: {} },
    annotations: { readOnlyHint: true, openWorldHint: false },
    execute: async () => ({
      plataformas: PLATFORMS.map((p) => ({ id: p.id, nombre: p.label })),
      nichos: NICHES.map((n) => ({ id: n.id, nombre: n.label, multiplicadorCpm: n.mult })),
      formatos: FORMATS.map((f) => ({ id: f.id, nombre: f.label, descripcion: f.description })),
    }),
  }
}

// ── Registro ─────────────────────────────────────────────────────────────────
let registered = false

// Devuelve el objeto que expone registerTool, sea navigator.modelContext (lo que
// implementan los navegadores) o document.modelContext (nombre de la spec borrador).
function getModelContext() {
  if (typeof navigator !== 'undefined' && navigator.modelContext?.registerTool) {
    return navigator.modelContext
  }
  if (typeof document !== 'undefined' && document.modelContext?.registerTool) {
    return document.modelContext
  }
  return null
}

export function registerCalculatorTools() {
  if (registered) return true
  const mc = getModelContext()
  if (!mc) return false // navegador sin soporte WebMCP → no-op silencioso

  try {
    mc.registerTool(calculatorTool())
    mc.registerTool(optionsTool())
    registered = true
    return true
  } catch (err) {
    // Nunca dejamos que un detalle de la API (aún experimental) rompa la app.
    if (import.meta.env?.DEV) console.warn('[webmcp] registro fallido:', err?.message || err)
    return false
  }
}

// ── Helpers numéricos ────────────────────────────────────────────────────────
function clampNum(v, min, max, fallback) {
  const n = Number(v)
  if (!Number.isFinite(n)) return fallback
  return Math.min(max, Math.max(min, Math.round(n)))
}
function round2(n) { return Math.round((Number(n) || 0) * 100) / 100 }
function round4(n) { return Math.round((Number(n) || 0) * 10000) / 10000 }
