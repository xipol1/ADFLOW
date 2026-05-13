/**
 * anthropicClient — Claude Haiku wrapper for Capa 2 content classification.
 *
 * Single responsibility: take a batch of post bodies (already locally
 * pre-classified for cheap fields) and ask Haiku to return categories,
 * sentiment, brand safety, and buyer intent in strict JSON.
 *
 * Why Haiku 4.5: cheapest current Anthropic model, fast enough for
 * real-time enrichment of incoming newsletter posts, plenty smart for
 * categorical classification. Per project memory: model id is
 * 'claude-haiku-4-5-20251001'.
 *
 * Cost discipline:
 *   - Batch up to 20 posts per call. Reduces per-post overhead from
 *     ~150 tokens (system prompt + JSON schema framing) to ~10 tokens
 *     of marginal context.
 *   - Lazy require of @anthropic-ai/sdk so Vercel cold paths don't import
 *     ~5MB of client code that they never use.
 *   - All token counts surfaced for LLMBudgetGuard to record.
 *
 * Output schema (verbatim from Capa 2 plan, with brand_safety_flags
 * taxonomy expanded for completeness):
 *
 *   {
 *     "results": [
 *       {
 *         "id": "<observationId or batch-local index>",
 *         "lang": "es" | "en" | "pt" | ...,
 *         "categories": ["cripto", "trading"],
 *         "sentiment": -1.0..1.0,
 *         "brand_safety_score": 0..100,
 *         "brand_safety_flags": [...],
 *         "is_promotional": boolean,
 *         "promotional_signals": [...],
 *         "buyer_intent": 0..100,
 *         "topics_keywords": ["bitcoin", "binance"]
 *       }
 *     ]
 *   }
 */

'use strict';

const DEFAULT_MODEL = 'claude-haiku-4-5-20251001';
const DEFAULT_MAX_TOKENS = 2048;

// Approximate chars-to-tokens ratio for Spanish text. Empirically ~3.5
// characters per token on Spanish; we round up to 4 for safety in budget
// estimates (over-estimate is preferable to under-estimate).
const CHARS_PER_TOKEN_ESTIMATE = 4;

const VALID_CATEGORIES = [
  'cripto', 'finanzas', 'trading', 'deportes', 'gaming', 'tech',
  'marketing', 'fitness', 'salud', 'educación', 'ecommerce',
  'viajes', 'lifestyle', 'noticias', 'política', 'entretenimiento',
  'adulto', 'otros',
];

const VALID_BRAND_SAFETY_FLAGS = [
  'gambling', 'nsfw', 'political_polarizing', 'hate_speech',
  'weapons', 'alcohol_excess', 'drugs', 'scam_suspected',
  'misinformation_suspected', 'shock_violence',
];

const SYSTEM_PROMPT = [
  'Eres un clasificador de contenido para canales de WhatsApp en una plataforma de marketing.',
  'Recibes una lista de posts y devuelves JSON estricto con la clasificación de cada uno.',
  'REGLAS ABSOLUTAS:',
  '- NO razones en texto. NO escribas nada fuera del JSON.',
  '- Devuelve un único objeto con la forma {"results": [...]} sin texto antes ni después.',
  '- Cada post de entrada lleva un campo "id" — devuélvelo intacto en la salida.',
  `- Categorías válidas (escoge 1-3 más relevantes): ${VALID_CATEGORIES.join(', ')}.`,
  `- Flags de brand safety válidos: ${VALID_BRAND_SAFETY_FLAGS.join(', ')}. Vacío si el post es seguro.`,
  '- "lang" en código ISO-639-1 (es, en, pt, ca, fr, it, …) o "unknown".',
  '- "sentiment" entre -1.0 y 1.0.',
  '- "brand_safety_score" entre 0 y 100 (100=totalmente seguro para marcas).',
  '- "buyer_intent" entre 0 y 100 (0=sin intención de compra; 100=CTA directa de compra).',
  '- "is_promotional" booleano: ¿el post promociona un producto/servicio?',
  '- "promotional_signals" array de patrones detectados: affiliate_link, discount_code, explicit_ad_disclosure, limited_time, free_offer, cta_buy.',
  '- "topics_keywords" 3-7 palabras clave en minúscula sin tildes.',
  '- Si recibes una señal de los clasificadores locales (lang/promotional), úsala como hint pero no la copies ciegamente — corrige si está mal.',
].join('\n');

class AnthropicNlpClient {
  constructor() {
    this._client = null;
    this._lastError = null;
  }

  /**
   * Lazy-load Anthropic SDK. Throws clearly when missing.
   */
  _getClient() {
    if (this._client) return this._client;
    let sdk;
    try {
      sdk = require('@anthropic-ai/sdk');
    } catch (err) {
      throw new Error(
        `@anthropic-ai/sdk not available. Install with: npm i @anthropic-ai/sdk. Underlying: ${err.message}`
      );
    }
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      throw new Error('ANTHROPIC_API_KEY not set');
    }
    const Anthropic = sdk.Anthropic || sdk.default;
    this._client = new Anthropic({ apiKey });
    return this._client;
  }

  /**
   * Build the user prompt for a batch of posts. The local-classifier
   * signals are passed as JSON hints so Haiku doesn't have to re-derive
   * cheap things (lang, emoji presence, discount-code candidates).
   *
   * @param {Array} posts - [{ id, body, type, isForwarded, localSignals }]
   */
  buildPrompt(posts) {
    const items = posts.map((p, i) => ({
      id: p.id != null ? String(p.id) : String(i),
      type: p.type || 'text',
      isForwarded: !!p.isForwarded,
      localHints: p.localSignals
        ? {
            lang: p.localSignals.lang,
            isLikelyPromotional: p.localSignals.isLikelyPromotional,
            promotionalSignals: p.localSignals.promotionalSignals,
            emojiCount: p.localSignals.emojiCount,
            discountCodes: p.localSignals.discountCodes,
          }
        : null,
      // Trim to a reasonable cap so a single 10kB body can't blow the
      // prompt budget. 1500 chars ≈ 375 tokens — enough to classify but
      // not so much that batches of 20 explode.
      body: typeof p.body === 'string' ? p.body.substring(0, 1500) : '',
    }));

    return [
      'Clasifica los siguientes posts. Devuelve {"results":[...]} con un elemento por post, manteniendo el "id".',
      '',
      'POSTS:',
      JSON.stringify(items, null, 2),
    ].join('\n');
  }

  /**
   * Estimate input token count from raw prompt text. Used by the budget
   * guard to pre-check a call before incurring it.
   */
  estimateInputTokens(systemPrompt, userPrompt) {
    const chars = (systemPrompt || '').length + (userPrompt || '').length;
    return Math.ceil(chars / CHARS_PER_TOKEN_ESTIMATE);
  }

  /**
   * Classify a batch of posts. Returns:
   *   {
   *     ok: true,
   *     results: [{ id, lang, categories, ... }, ...],
   *     usage: { inputTokens, outputTokens }
   *   }
   * On non-fatal errors (rate limit, parse failure) returns:
   *   { ok: false, reason, raw, usage }
   * Throws on configuration errors (missing API key, missing SDK).
   *
   * Caller is responsible for budget enforcement BEFORE calling and
   * cost recording AFTER (we surface usage so the caller can do both).
   */
  async classifyBatch(posts, { model = DEFAULT_MODEL, maxTokens = DEFAULT_MAX_TOKENS } = {}) {
    if (!Array.isArray(posts) || posts.length === 0) {
      return { ok: true, results: [], usage: { inputTokens: 0, outputTokens: 0 } };
    }

    const client = this._getClient();
    const userPrompt = this.buildPrompt(posts);

    let response;
    try {
      response = await client.messages.create({
        model,
        max_tokens: maxTokens,
        system: SYSTEM_PROMPT,
        messages: [
          { role: 'user', content: userPrompt },
          // Prefill the assistant turn with the opening of the JSON so
          // Haiku doesn't drift into prose. We re-prepend it on parsing.
          { role: 'assistant', content: '{"results":[' },
        ],
      });
    } catch (err) {
      this._lastError = err;
      const status = err?.status || err?.response?.status;
      return {
        ok: false,
        reason: status === 429 ? 'rate_limited' : 'api_error',
        error: err.message,
        status,
        usage: { inputTokens: 0, outputTokens: 0 },
      };
    }

    const usage = {
      inputTokens: response?.usage?.input_tokens || 0,
      outputTokens: response?.usage?.output_tokens || 0,
    };

    const rawText = (response?.content || [])
      .filter((b) => b.type === 'text')
      .map((b) => b.text)
      .join('');

    // Reconstruct the full JSON envelope from the prefilled prefix.
    const fullJson = '{"results":[' + rawText;

    let parsed;
    try {
      parsed = this._extractJson(fullJson);
    } catch (err) {
      return {
        ok: false,
        reason: 'parse_failed',
        error: err.message,
        raw: fullJson.substring(0, 500),
        usage,
      };
    }

    const results = Array.isArray(parsed.results) ? parsed.results : [];

    return {
      ok: true,
      results: results.map((r) => this._validateResult(r)),
      usage,
    };
  }

  /**
   * Trim and parse JSON from a string that may have leading/trailing junk.
   * Strategy: find first `{` and last `}`, parse that substring.
   */
  _extractJson(text) {
    const first = text.indexOf('{');
    const last = text.lastIndexOf('}');
    if (first === -1 || last === -1 || last <= first) {
      throw new Error('no JSON object found in response');
    }
    return JSON.parse(text.substring(first, last + 1));
  }

  /**
   * Sanitize a single result row against the expected schema. Unknown
   * fields are dropped, out-of-range values clamped, invalid enums removed.
   */
  _validateResult(row) {
    const out = {
      id: row?.id != null ? String(row.id) : null,
      lang: typeof row?.lang === 'string' ? row.lang.toLowerCase() : 'unknown',
      categories: Array.isArray(row?.categories)
        ? row.categories.filter((c) => VALID_CATEGORIES.includes(String(c).toLowerCase().normalize('NFC')))
                        .map((c) => String(c).toLowerCase().normalize('NFC'))
                        .slice(0, 3)
        : [],
      sentiment: this._clamp(row?.sentiment, -1, 1),
      brandSafetyScore: this._clamp(row?.brand_safety_score ?? row?.brandSafetyScore, 0, 100),
      brandSafetyFlags: Array.isArray(row?.brand_safety_flags || row?.brandSafetyFlags)
        ? (row.brand_safety_flags || row.brandSafetyFlags)
            .filter((f) => VALID_BRAND_SAFETY_FLAGS.includes(String(f).toLowerCase()))
            .map((f) => String(f).toLowerCase())
        : [],
      isPromotional: typeof (row?.is_promotional ?? row?.isPromotional) === 'boolean'
        ? (row.is_promotional ?? row.isPromotional)
        : null,
      promotionalSignals: Array.isArray(row?.promotional_signals || row?.promotionalSignals)
        ? (row.promotional_signals || row.promotionalSignals).map(String).slice(0, 10)
        : [],
      buyerIntent: this._clamp(row?.buyer_intent ?? row?.buyerIntent, 0, 100),
      topicsKeywords: Array.isArray(row?.topics_keywords || row?.topicsKeywords)
        ? (row.topics_keywords || row.topicsKeywords)
            .map((k) => String(k).toLowerCase().trim())
            .filter((k) => k.length > 0 && k.length <= 50)
            .slice(0, 7)
        : [],
    };
    return out;
  }

  _clamp(value, min, max) {
    if (typeof value !== 'number' || Number.isNaN(value)) return null;
    if (value < min) return min;
    if (value > max) return max;
    return value;
  }
}

module.exports = new AnthropicNlpClient();
module.exports.AnthropicNlpClientClass = AnthropicNlpClient;
module.exports.SYSTEM_PROMPT = SYSTEM_PROMPT;
module.exports.VALID_CATEGORIES = VALID_CATEGORIES;
module.exports.VALID_BRAND_SAFETY_FLAGS = VALID_BRAND_SAFETY_FLAGS;
module.exports.DEFAULT_MODEL = DEFAULT_MODEL;
