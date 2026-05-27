// ─── mediaKitScore ──────────────────────────────────────────────────────────
// Función pura. Evalúa un canal contra checklist de "media-kit ready" y
// devuelve { score 0-100, items, topActions }.
//
// La idea: que el creador entienda en un vistazo qué le falta para que un
// anunciante serio acepte su propuesta. El número está calibrado para que:
//   - 90-100 = listo para Channelad (todos los items críticos OK)
//   - 70-89  = funcional pero mejorable
//   - 0-69   = faltan cosas básicas, mostramos top 3 acciones
//
// Pesos calibrados a partir de las +2.500 fichas de canales en seguimiento:
// los items que mejor predicen aceptación de campañas son tamaño, regularidad,
// y engagement. La foto/descripción son higiénicos pero baratos de arreglar.

import { NICHES } from './channelPricing'

// Bandas de score → label/color para el UI
export const SCORE_BANDS = [
  { min: 90, label: 'Listo para Channelad', color: '#22c55e' },
  { min: 70, label: 'Funcional, mejorable', color: '#f59e0b' },
  { min: 0,  label: 'Necesita trabajo',      color: '#ef4444' },
]

export function scoreBand(score) {
  for (const b of SCORE_BANDS) {
    if (score >= b.min) return b
  }
  return SCORE_BANDS[SCORE_BANDS.length - 1]
}

// ── Definición de items ─────────────────────────────────────────────────────
// Cada item es una función pura que recibe el snapshot y devuelve:
//   { id, label, weight, ok, action: 'qué hacer si falla' }
const ITEMS = [
  // ── Tamaño mínimo (crítico) ──
  {
    id: 'min_subscribers',
    label: 'Audiencia mínima monetizable (≥500 suscriptores activos)',
    weight: 20,
    test: (s) => (s.followers ?? 0) >= 500,
    action: 'Crece a ≥500 suscriptores activos antes de captar campañas. Por debajo, los anunciantes ven el CPM demasiado caro frente al alcance.',
  },
  // ── Engagement (crítico) ──
  {
    id: 'engagement_normal',
    label: 'Tasa de reacciones ≥ 0,5% (mínimo creíble)',
    weight: 15,
    test: (s) => {
      if (!s.followers || !s.reactionsPerPost) return false
      return s.reactionsPerPost / s.followers >= 0.005
    },
    action: 'Tu tasa de reacciones está por debajo del 0,5%. Mejora calls-to-action y formato (preguntas, encuestas) o limpia suscriptores inactivos.',
  },
  // ── Regularidad ──
  {
    id: 'regularity_min',
    label: 'Publicas al menos 4 posts patrocinables al mes',
    weight: 15,
    test: (s) => (s.postsPerMonth ?? 0) >= 4,
    action: 'Sube tu cadencia a 4 publicaciones/mes mínimo. Los anunciantes premium no firman con canales que postean menos de una vez por semana.',
  },
  // ── Foto de perfil ──
  {
    id: 'profile_image',
    label: 'Foto de perfil profesional',
    weight: 10,
    test: (s) => !!s.profileImage && s.profileImage.length > 10,
    action: 'Añade una foto de perfil clara (logo o foto tuya). Los anunciantes filtran canales sin imagen — es señal de canal abandonado.',
  },
  // ── Descripción ──
  {
    id: 'description_ok',
    label: 'Descripción ≥ 50 caracteres con el nicho claro',
    weight: 10,
    test: (s) => (s.description ?? '').trim().length >= 50,
    action: 'Escribe una descripción de ≥50 caracteres que diga: a quién va dirigido, qué publicas y con qué frecuencia.',
  },
  // ── Nombre concreto ──
  {
    id: 'has_name',
    label: 'Nombre del canal definido',
    weight: 5,
    test: (s) => (s.name ?? '').trim().length >= 3,
    action: 'Pon un nombre concreto al canal. Los anunciantes prefieren nombres claros frente a "@usuario123".',
  },
  // ── Verificado (opcional, suma) ──
  {
    id: 'verified_badge',
    label: 'Canal verificado por la plataforma',
    weight: 10,
    test: (s) => s.verified === true,
    action: 'Solicita la verificación en tu plataforma cuando seas elegible. No es bloqueante pero acelera la confianza del anunciante.',
  },
  // ── Nicho premium ──
  {
    id: 'premium_niche',
    label: 'Nicho con demanda alta de anunciantes',
    weight: 10,
    test: (s) => {
      const n = NICHES.find((x) => x.id === s.niche)
      return n && n.mult >= 1.1
    },
    action: 'Tu nicho tiene CPM por debajo de la media del marketplace. Considera enfocar a un sub-nicho con demanda concreta (finanzas, B2B, cripto) o vender por volumen.',
  },
  // ── Posts patrocinables a la vez no demasiados (anti-spam) ──
  {
    id: 'not_oversaturated',
    label: 'No saturas la audiencia (≤ 20 posts patrocinados / mes)',
    weight: 5,
    test: (s) => (s.postsPerMonth ?? 0) <= 20,
    action: 'Estás postando demasiado. Pasar de 20 posts patrocinados/mes quema la audiencia. Reduce y sube tarifa.',
  },
]

// Suma de weights debe sumar 100.
// 20 + 15 + 15 + 10 + 10 + 5 + 10 + 10 + 5 = 100 ✓

/**
 * scoreMediaKit(snapshot) → { score, items, topActions }
 *
 * snapshot — el mismo que pasa por la calc: { platform, niche, followers,
 *   reactionsPerPost, postsPerMonth, format, name?, description?,
 *   profileImage?, verified? }
 *
 * Returns:
 *   score       — int 0-100
 *   items       — [{ id, label, weight, ok, action }]
 *   topActions  — top 3 acciones de los items que fallan, ordenadas por weight desc
 *   band        — { min, label, color }
 */
export function scoreMediaKit(snapshot = {}) {
  const items = ITEMS.map((it) => ({
    id:     it.id,
    label:  it.label,
    weight: it.weight,
    action: it.action,
    ok:     !!it.test(snapshot),
  }))

  const score = items.reduce((sum, it) => sum + (it.ok ? it.weight : 0), 0)

  const topActions = items
    .filter((it) => !it.ok)
    .sort((a, b) => b.weight - a.weight)
    .slice(0, 3)
    .map((it) => ({ id: it.id, label: it.label, action: it.action, weight: it.weight }))

  return {
    score,
    items,
    topActions,
    band: scoreBand(score),
  }
}
