/**
 * copyAnalyzer — heuristic ad copy analysis.
 * Pure functions, no API calls. Returns score 0-100 with breakdown + suggestions.
 */

// Strong CTA verbs (Spanish + English)
const CTA_VERBS = [
  'descubre', 'apúntate', 'compra', 'reserva', 'únete', 'suscríbete',
  'prueba', 'consigue', 'obtén', 'aprovecha', 'empieza', 'descarga',
  'regístrate', 'visita', 'contacta', 'llama', 'reclama', 'gana',
  'buy', 'try', 'get', 'join', 'subscribe', 'discover', 'claim', 'shop',
]

const URGENCY_MARKERS = [
  'hoy', 'ahora', 'ya', 'última', 'últimas', 'limitad', 'solo', 'sólo',
  'oferta', 'flash', 'gratis', 'descuento', '50%', '%', 'expira', 'cierra',
  'únic', 'exclusiv', '24h', 'antes de', 'plazas', 'cupos',
  'today', 'now', 'limited', 'free', 'discount', 'expires', 'only',
]

const RISKY_CLAIMS = [
  /\b(garantizado|garantizamos|100%|garantía total)\b/i,
  /\b(curar?|cura|sanar?)\b/i,
  /\b(ganar|gana)\s+(\d+|miles|millones)\b/i,
  /\b(pierde|adelgaza)\s+\d+\s*(kg|kilos)\b/i,
  /\b(rico|millonario)\b.*\b(rápido|fácil)\b/i,
  /\bsin\s+(esfuerzo|riesgo)\b/i,
  /\b(milagro|milagroso)\b/i,
]

const SPAMMY_MARKERS = [
  /[A-ZÁÉÍÓÚÑ]{6,}/,           // 6+ uppercase letters in a row
  /[!?]{3,}/,                    // !!! or ???
  /[💸💰💵🤑]{3,}/u,            // money emoji spam
  /(\$\$\$|\€\€\€)/,            // currency spam
]

const URL_REGEX = /https?:\/\/\S+|www\.\S+/i

// Mirror of backend detectHook in copyBenchmarksService — must stay in sync.
const EMOJI_RE = /[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/u
function detectDominantHook(text) {
  if (!text) return null
  const t = text.trim()
  if (!t) return null
  const first = t.slice(0, 50).toLowerCase()
  if (/^[¿?]/.test(t)) return 'question'
  if (/^[¡!]/.test(t)) return 'exclamation'
  if (EMOJI_RE.test(t.slice(0, 3))) return 'emoji'
  if (/^\d/.test(t)) return 'number'
  if (/^(yo|hoy|llevo|acabo de|llevo años|este|esta|aquí está)/.test(first)) return 'personal'
  if (/^(nuevo|atención|importante|breaking|noticia)/.test(first)) return 'announcement'
  return 'other'
}


/**
 * Analyze ad copy.
 *
 * @param {string} text — the ad copy
 * @param {object} [channelContext] — optional channel-specific benchmarks
 *   payload returned by GET /api/channels/:id/copy-benchmarks. When
 *   provided, the analyzer adds channel-specific checks ("in this channel
 *   posts of 90-150 chars get 2.3× CTR") on top of the generic ones.
 *   Shape: { sampleSize, plataforma, categoria, overall, topQuartile }
 *   See services/copyBenchmarksService.js.
 */
export function analyzeCopy(text, channelContext = null) {
  const raw = (text || '').trim()
  const checks = []
  let score = 50  // start neutral

  // ── Length ─────────────────────────────────────────────────────────────
  const len = raw.length
  const words = raw.split(/\s+/).filter(Boolean).length
  let lengthCheck

  if (len === 0) {
    lengthCheck = { id: 'length', label: 'Longitud', status: 'todo', detail: 'Escribe el copy para empezar.', impact: 0 }
  } else if (len < 60) {
    lengthCheck = { id: 'length', label: 'Longitud', status: 'warn', detail: `Demasiado corto (${len} chars). Apunta a 80-220 chars.`, impact: -10 }
    score -= 10
  } else if (len <= 220) {
    lengthCheck = { id: 'length', label: 'Longitud', status: 'ok', detail: `${len} chars · ${words} palabras (rango óptimo)`, impact: 12 }
    score += 12
  } else if (len <= 400) {
    lengthCheck = { id: 'length', label: 'Longitud', status: 'warn', detail: `Algo largo (${len} chars). Considera recortar.`, impact: -5 }
    score -= 5
  } else {
    lengthCheck = { id: 'length', label: 'Longitud', status: 'fail', detail: `Demasiado largo (${len} chars). Reduce a < 300.`, impact: -15 }
    score -= 15
  }
  checks.push(lengthCheck)

  // ── CTA presence ───────────────────────────────────────────────────────
  const lower = raw.toLowerCase()
  const ctaFound = CTA_VERBS.filter(v => lower.includes(v))
  const hasCTA = ctaFound.length > 0
  if (raw.length > 0) {
    if (hasCTA) {
      checks.push({ id: 'cta', label: 'Llamada a la acción', status: 'ok', detail: `Detectado: «${ctaFound[0]}»`, impact: 15 })
      score += 15
    } else {
      checks.push({ id: 'cta', label: 'Llamada a la acción', status: 'fail', detail: 'No detectamos un CTA claro. Añade un verbo de acción.', impact: -12 })
      score -= 12
    }
  }

  // ── URL / link ─────────────────────────────────────────────────────────
  if (raw.length > 0) {
    const hasUrl = URL_REGEX.test(raw)
    if (hasUrl) {
      checks.push({ id: 'link', label: 'Enlace de destino', status: 'ok', detail: 'URL incluida en el copy', impact: 8 })
      score += 8
    } else {
      checks.push({ id: 'link', label: 'Enlace de destino', status: 'warn', detail: 'No hay URL en el copy. El sistema añadirá tu link de tracking, pero un CTA con dominio mejora confianza.', impact: -3 })
      score -= 3
    }
  }

  // ── Urgency / scarcity ─────────────────────────────────────────────────
  const urgencyFound = URGENCY_MARKERS.filter(m => lower.includes(m))
  if (raw.length > 0) {
    if (urgencyFound.length >= 1) {
      checks.push({ id: 'urgency', label: 'Urgencia / valor', status: 'ok', detail: `Detectado: ${urgencyFound.slice(0, 3).map(u => `«${u}»`).join(', ')}`, impact: 8 })
      score += 8
    } else {
      checks.push({ id: 'urgency', label: 'Urgencia / valor', status: 'warn', detail: 'No hay marcador de urgencia o promoción. Considera añadir un beneficio diferencial.', impact: -3 })
      score -= 3
    }
  }

  // ── Risky claims ───────────────────────────────────────────────────────
  const risky = RISKY_CLAIMS.filter(re => re.test(raw))
  if (risky.length > 0) {
    checks.push({
      id: 'claims',
      label: 'Claims arriesgados',
      status: 'fail',
      detail: `Detectamos ${risky.length} expresiones que pueden bloquearse en revisión (ej: garantías absolutas, promesas de salud o ingresos).`,
      impact: -20,
    })
    score -= 20
  } else if (raw.length > 0) {
    checks.push({ id: 'claims', label: 'Claims arriesgados', status: 'ok', detail: 'Sin claims de riesgo evidentes', impact: 0 })
  }

  // ── Spammy formatting ──────────────────────────────────────────────────
  const spamHits = SPAMMY_MARKERS.filter(re => re.test(raw))
  if (spamHits.length > 0) {
    checks.push({
      id: 'spam',
      label: 'Formato',
      status: 'fail',
      detail: `Mayúsculas, signos o emojis repetidos. Usa formato natural — los lectores lo perciben como spam.`,
      impact: -10,
    })
    score -= 10
  } else if (raw.length > 0) {
    checks.push({ id: 'spam', label: 'Formato', status: 'ok', detail: 'Formato limpio y natural', impact: 0 })
  }

  // ── Sentiment / question ───────────────────────────────────────────────
  const hasQuestion = /\?/u.test(raw)
  const hasExcl = /!/u.test(raw) && !/!{2,}/.test(raw)
  if (raw.length > 0) {
    if (hasQuestion || hasExcl) {
      checks.push({ id: 'tone', label: 'Tono conversacional', status: 'ok', detail: hasQuestion ? 'Pregunta inicial atrae atención' : 'Tono enérgico (1 exclamación)', impact: 5 })
      score += 5
    }
  }

  // ── Numbers / specificity ──────────────────────────────────────────────
  const hasNumber = /\d/.test(raw)
  if (raw.length > 0 && hasNumber) {
    checks.push({ id: 'numbers', label: 'Especificidad', status: 'ok', detail: 'Incluye datos numéricos (precio, %, cantidad)', impact: 5 })
    score += 5
  }

  // ── Channel-specific checks (only when we have benchmark data) ────────
  // These reward copies that match what's worked in this specific channel.
  // When the channel has too few samples (sampleSize < 5) we skip — generic
  // rules above are more reliable than 1-2 outliers.
  const hasBench = channelContext
    && channelContext.sampleSize >= 5
    && channelContext.topQuartile
    && channelContext.topQuartile.count >= 1

  if (hasBench && raw.length > 0) {
    const tq = channelContext.topQuartile
    // Length match against top-quartile range
    if (Array.isArray(tq.lengthRange) && tq.lengthRange.length === 2) {
      const [lo, hi] = tq.lengthRange
      const inRange = len >= lo && len <= hi
      if (inRange) {
        checks.push({
          id: 'channel_length',
          label: 'Longitud para este canal',
          status: 'ok',
          detail: `En tu canal los posts top tienen ${lo}-${hi} chars. El tuyo: ${len}. ✓`,
          impact: 8,
        })
        score += 8
      } else {
        const diff = len < lo ? `corto (faltan ${lo - len})` : `largo (sobran ${len - hi})`
        checks.push({
          id: 'channel_length',
          label: 'Longitud para este canal',
          status: 'warn',
          detail: `Posts top en tu canal: ${lo}-${hi} chars. El tuyo (${len}) está ${diff}.`,
          impact: -4,
        })
        score -= 4
      }
    }

    // Emoji density vs top-quartile median
    if (Number.isFinite(tq.emojisMedian)) {
      const emojiCount = (raw.match(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/gu) || []).length
      const target = tq.emojisMedian
      const diff = Math.abs(emojiCount - target)
      if (diff <= 1) {
        checks.push({
          id: 'channel_emojis',
          label: 'Emojis para este canal',
          status: 'ok',
          detail: `Posts top usan ~${target} emojis. El tuyo: ${emojiCount}. ✓`,
          impact: 4,
        })
        score += 4
      } else if (emojiCount > target + 2) {
        checks.push({
          id: 'channel_emojis',
          label: 'Emojis para este canal',
          status: 'warn',
          detail: `Posts top en tu canal usan ~${target} emojis. El tuyo: ${emojiCount} (demasiados).`,
          impact: -3,
        })
        score -= 3
      }
    }

    // Dominant hook pattern
    if (tq.dominantHook && tq.dominantHook !== 'other') {
      const hookHints = {
        question: '¿pregunta inicial?',
        exclamation: '¡exclamación inicial!',
        emoji: 'emoji al inicio',
        number: 'empezar con un dato/número',
        personal: 'tono personal ("yo", "llevo años…")',
        announcement: 'tono de anuncio ("nuevo", "atención…")',
      }
      const detected = detectDominantHook(raw)
      const matches = detected === tq.dominantHook
      if (matches) {
        checks.push({
          id: 'channel_hook',
          label: 'Hook para este canal',
          status: 'ok',
          detail: `Posts top en tu canal abren con ${hookHints[tq.dominantHook]}. ✓`,
          impact: 5,
        })
        score += 5
      } else {
        checks.push({
          id: 'channel_hook',
          label: 'Hook para este canal',
          status: 'warn',
          detail: `Posts top en tu canal suelen abrir con ${hookHints[tq.dominantHook]}. Considera adaptarlo.`,
          impact: 0,
        })
      }
    }
  }

  // ── Clamp and finalize ─────────────────────────────────────────────────
  score = Math.max(0, Math.min(100, score))

  // ── Predicted CTR (very rough heuristic) ───────────────────────────────
  // Base = the channel's avg CTR if we have it, else generic 1.8%. Adjust
  // by the score offset from 50. When we have the channel's top-quartile
  // CTR, score 75+ asymptotes toward that ceiling.
  const channelAvgCtr = hasBench ? channelContext.overall?.avgCtr : null
  const channelTopCtr = hasBench ? channelContext.topQuartile?.avgCtr : null
  const baseCtr = Number.isFinite(channelAvgCtr) && channelAvgCtr > 0 ? channelAvgCtr : 1.8
  let predictedCtr = raw.length === 0 ? null : Math.max(0.3, baseCtr + (score - 50) * 0.04)
  // When we know what the top of the channel looks like, cap optimism
  if (predictedCtr != null && Number.isFinite(channelTopCtr) && channelTopCtr > 0) {
    predictedCtr = Math.min(predictedCtr, channelTopCtr)
  }

  // ── Verdict ─────────────────────────────────────────────────────────────
  let verdict = 'review'
  if (raw.length === 0) verdict = 'empty'
  else if (score >= 75) verdict = 'great'
  else if (score >= 55) verdict = 'good'
  else if (score >= 35) verdict = 'review'
  else verdict = 'rework'

  // ── Suggestions ─────────────────────────────────────────────────────────
  const suggestions = []
  if (!hasCTA && raw.length > 0) suggestions.push('Empieza o cierra con un verbo de acción claro: «Descubre…», «Reserva ya…»')
  if (urgencyFound.length === 0 && raw.length > 0) suggestions.push('Añade un beneficio o urgencia concreta (ej: «50% solo hoy», «últimas plazas»)')
  if (len > 220) suggestions.push('Recorta para llegar al rango óptimo de 80-220 caracteres')
  if (len > 0 && len < 60) suggestions.push('Amplía el copy para incluir contexto y CTA (mínimo 60 chars)')
  if (risky.length > 0) suggestions.push('Revisa los claims absolutos — pueden ser bloqueados en moderación')
  if (spamHits.length > 0) suggestions.push('Reduce mayúsculas, signos o emojis repetidos')
  if (!hasNumber && raw.length > 50) suggestions.push('Datos concretos (precio, %, plazas) aumentan credibilidad')

  return {
    score,
    verdict,
    checks,
    suggestions,
    predictedCtr,
    stats: { length: len, words },
    channelAware: hasBench,
  }
}


// ─────────────────────────────────────────────────────────────────────────────
// A/B VARIANT GENERATOR
// Heuristic transformations of the original copy. Each variant fixes one or
// more weaknesses detected by analyzeCopy(). All transformations are pure.
// ─────────────────────────────────────────────────────────────────────────────

const URGENCY_HOOKS = [
  '⏳ Plazas limitadas:',
  '🚀 Solo durante esta semana:',
  '⚡ Oferta exclusiva hoy:',
]

const CTA_TEMPLATES = [
  'Descubre cómo aquí 👉',
  'Pruébalo gratis 14 días 👉',
  'Reserva tu plaza ahora 👉',
  'Empieza ya 👉',
]

const HOOK_QUESTIONS = [
  '¿Cansado de perder horas analizando?',
  '¿Y si pudieras hacerlo en la mitad de tiempo?',
  '¿Buscas algo que de verdad funcione?',
]

// Fix: strip risky claims (replace with safer language)
function neutralizeClaims(text) {
  return text
    .replace(/\b(garantizado|garantizamos|100%|garantía total)\b/gi, 'comprobado')
    .replace(/\bsin\s+(esfuerzo|riesgo)\b/gi, 'de forma sencilla')
    .replace(/\b(milagro|milagroso)\b/gi, 'efectivo')
}

// Fix: strip spammy formatting (uppercase runs, !!!, emoji spam)
function cleanSpam(text) {
  return text
    .replace(/([A-ZÁÉÍÓÚÑ]{6,})/g, (m) => m.charAt(0) + m.slice(1).toLowerCase())
    .replace(/[!?]{2,}/g, (m) => m[0])
    .replace(/([💸💰💵🤑])\1{2,}/gu, '$1')
    .replace(/(\$\$\$|\€\€\€)/g, '€')
}

// Fix: trim long copy to ~200 chars without breaking mid-sentence
function trimToOptimal(text, target = 200) {
  if (text.length <= target) return text
  const truncated = text.slice(0, target + 30)
  // Cut at last sentence terminator before target
  const lastDot = Math.max(truncated.lastIndexOf('.'), truncated.lastIndexOf('!'), truncated.lastIndexOf('?'))
  if (lastDot > target * 0.6) return truncated.slice(0, lastDot + 1).trim()
  // Otherwise cut at last word boundary before target
  const cut = truncated.slice(0, target).replace(/\s+\S*$/, '')
  return cut.trim() + '…'
}

// Fix: ensure CTA at the end
function ensureCTA(text, ctaIdx = 0) {
  const lower = text.toLowerCase()
  const hasAny = CTA_VERBS.some(v => lower.includes(v))
  if (hasAny) return text
  const cta = CTA_TEMPLATES[ctaIdx % CTA_TEMPLATES.length]
  // Drop trailing URL temporarily, append CTA before it
  const urlMatch = text.match(URL_REGEX)
  if (urlMatch) {
    const url = urlMatch[0]
    const stripped = text.replace(URL_REGEX, '').trim().replace(/[.,;:]$/, '')
    return `${stripped}. ${cta} ${url}`
  }
  return text.trim().replace(/[.,;:]$/, '') + `. ${cta}`
}

// Fix: prepend an urgency / scarcity hook
function prependUrgency(text, hookIdx = 0) {
  const lower = text.toLowerCase()
  const hasAny = URGENCY_MARKERS.some(m => lower.includes(m))
  if (hasAny) return text
  const hook = URGENCY_HOOKS[hookIdx % URGENCY_HOOKS.length]
  return `${hook} ${text.replace(/^[¿!]?\s*/, '')}`
}

// Fix: prepend a question hook
function prependQuestion(text, qIdx = 0) {
  if (text.startsWith('¿') || text.startsWith('?')) return text
  const q = HOOK_QUESTIONS[qIdx % HOOK_QUESTIONS.length]
  return `${q} ${text}`
}


/**
 * Generate up to 3 alternative versions of the copy.
 * Each variant has a label, the rewritten text, the changes applied,
 * and re-runs analyzeCopy() so the caller can compare scores side-by-side.
 */
export function generateVariants(text) {
  const original = (text || '').trim()
  if (original.length < 20) return []

  const baseAnalysis = analyzeCopy(original)
  const issues = new Set(baseAnalysis.checks.filter(c => c.status !== 'ok').map(c => c.id))

  const variants = []

  // ── Variant 1: "Optimizado" — fix all detected issues ────────────────
  let v1 = original
  const v1Changes = []
  if (issues.has('claims')) { v1 = neutralizeClaims(v1); v1Changes.push('Claims arriesgados suavizados') }
  if (issues.has('spam')) { v1 = cleanSpam(v1); v1Changes.push('Formato limpiado') }
  if (issues.has('cta')) { v1 = ensureCTA(v1, 0); v1Changes.push('CTA añadido al final') }
  if (issues.has('urgency')) { v1 = prependUrgency(v1, 0); v1Changes.push('Hook de urgencia añadido') }
  if (v1.length > 220) { v1 = trimToOptimal(v1, 200); v1Changes.push('Recortado a 200 chars') }
  if (v1Changes.length > 0 && v1 !== original) {
    variants.push({
      key: 'optimized',
      label: 'Optimizado',
      description: 'Aplica todas las mejoras detectadas',
      text: v1,
      changes: v1Changes,
      analysis: analyzeCopy(v1),
    })
  }

  // ── Variant 2: "Urgente" — push urgency + scarcity ───────────────────
  let v2 = cleanSpam(neutralizeClaims(original))
  const v2Changes = ['Hook de escasez al inicio']
  v2 = prependUrgency(v2, 1)
  if (!CTA_VERBS.some(c => v2.toLowerCase().includes(c))) {
    v2 = ensureCTA(v2, 1)
    v2Changes.push('CTA imperativo añadido')
  }
  if (v2.length > 220) { v2 = trimToOptimal(v2, 200); v2Changes.push('Recortado a 200 chars') }
  if (v2 !== variants[0]?.text) {
    variants.push({
      key: 'urgent',
      label: 'Urgente',
      description: 'Maximiza scarcity + acción inmediata',
      text: v2,
      changes: v2Changes,
      analysis: analyzeCopy(v2),
    })
  }

  // ── Variant 3: "Conversacional" — pregunta + tono natural ────────────
  let v3 = cleanSpam(neutralizeClaims(original))
  const v3Changes = ['Pregunta inicial como hook']
  v3 = prependQuestion(v3, 0)
  if (!CTA_VERBS.some(c => v3.toLowerCase().includes(c))) {
    v3 = ensureCTA(v3, 2)
    v3Changes.push('CTA conversacional')
  }
  if (v3.length > 240) { v3 = trimToOptimal(v3, 220); v3Changes.push('Recortado para mantener fluidez') }
  if (v3 !== variants[0]?.text && v3 !== variants[1]?.text) {
    variants.push({
      key: 'conversational',
      label: 'Conversacional',
      description: 'Pregunta + tono cercano',
      text: v3,
      changes: v3Changes,
      analysis: analyzeCopy(v3),
    })
  }

  // Filter: only keep variants that actually improve the score
  return variants.filter(v => v.analysis.score >= baseAnalysis.score)
}
