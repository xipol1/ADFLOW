/**
 * ChannelAd — WhatsApp public-post verification pipeline.
 *
 * This service is independent from WhatsAppVerificationService.js, which
 * handles the admin-access polling/onboarding flow. This file handles the
 * per-campaign verification pipeline:
 *
 *   A. verifyPostPublication(url)      — fetch the public WhatsApp channel
 *                                        URL and extract canonical post
 *                                        metadata (channel name, follower
 *                                        count, description).
 *   B. parseSeguidores(texto)          — robust to "21K", "21.000",
 *                                        "1.2M", "1,2M", "890 seguidores",
 *                                        etc. European + Anglo formats.
 *   C. procesarScreenshotOCR(buffer)   — Tesseract.js (lazy-loaded) with
 *                                        multi-language regex parsing.
 *   D. crossValidarMetricas(...)       — combine screenshot + tracking
 *                                        clicks + niche benchmarks into
 *                                        a single confianzaScore + fraud flag.
 *   E. generarInformeVerificado(...)   — build the structured object the
 *                                        Advertiser sees.
 *
 * ──────────────────────────────────────────────────────────────────────────
 * OCR implementation choice — TESSERACT vs GOOGLE CLOUD VISION
 *
 * Tesseract.js ships ~12 MB of wasm + language data that inflates the
 * serverless cold start. To keep other functions fast we lazy-require it
 * inside procesarScreenshotOCR() — it only loads on the code path that
 * actually needs OCR (admin endpoint + screenshot upload). If the bundle
 * size becomes a problem, swap to Google Cloud Vision ($0.0015/image) by
 * replacing only `runOcr()` below; the rest of the pipeline is unchanged.
 * ──────────────────────────────────────────────────────────────────────────
 */

const { detectarAnomaliaFraude, calcularPercentilCTR } = require('../config/nicheBenchmarks');

// ─── A. verifyPostPublication ──────────────────────────────────────────────

const WHATSAPP_URL_REGEX = /whatsapp\.com\/channel\/([\w-]+)(?:\/(\d+))?/i;

/**
 * Extract channelId + postNum from a WhatsApp public channel URL.
 */
function parseWhatsAppUrl(url) {
  const m = String(url || '').match(WHATSAPP_URL_REGEX);
  if (!m) return null;
  return {
    channelId: m[1],
    postNum: m[2] ? Number(m[2]) : null,
  };
}

/**
 * Best-effort HTML extraction of the channel name, follower count, and
 * description. WhatsApp's public HTML is server-rendered og: metadata — if
 * Meta changes the structure the fallbacks below should still find at
 * least the follower number via the generic "\d... followers" regex.
 *
 * CRITICAL DESIGN DECISION: if parsing fails we return
 *   { verificado: true, seguidores: null, ... }
 * instead of throwing. The publication IS verified (the URL is real and
 * the page loaded) even if we cannot currently extract the follower
 * count. A later re-run can refill that field.
 */
function extractWhatsAppMetadata(html) {
  const text = String(html || '');

  // Channel name: og:title usually works, fallback to <title>.
  let nombre = null;
  const ogTitle = text.match(/<meta[^>]+property=["']og:title["'][^>]+content=["']([^"']+)["']/i);
  if (ogTitle) nombre = ogTitle[1];
  if (!nombre) {
    const htmlTitle = text.match(/<title[^>]*>([^<]+)<\/title>/i);
    if (htmlTitle) nombre = htmlTitle[1].replace(/\s+-\s+WhatsApp.*$/i, '').trim();
  }

  // Description: og:description.
  let descripcion = null;
  const ogDesc = text.match(/<meta[^>]+property=["']og:description["'][^>]+content=["']([^"']+)["']/i);
  if (ogDesc) descripcion = ogDesc[1];

  // Followers: try the specific "og:description" pattern first (WhatsApp
  // puts "123K followers" there), then a generic fallback across the HTML.
  let seguidoresRaw = null;
  if (descripcion) {
    const inDesc = descripcion.match(
      /(\d[\d.,\s]*\s*[KMkm]?)\s*(followers|seguidores|suscriptores|subscribers)/i,
    );
    if (inDesc) seguidoresRaw = inDesc[1];
  }
  if (!seguidoresRaw) {
    const generic = text.match(
      /(\d[\d.,\s]*\s*[KMkm]?)\s*(followers|seguidores|suscriptores|subscribers)/i,
    );
    if (generic) seguidoresRaw = generic[1];
  }

  const seguidores = seguidoresRaw ? parseSeguidores(seguidoresRaw) : null;

  return { nombre, descripcion, seguidores };
}

async function verifyPostPublication(urlPost) {
  const parsed = parseWhatsAppUrl(urlPost);
  if (!parsed) {
    return {
      verificado: false,
      motivo: 'url_invalida',
      channelId: null,
      postNum: null,
      timestamp: new Date(),
    };
  }

  try {
    const res = await fetch(urlPost, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; ChannelAdVerifier/1.0; +https://channelad.io/bot)',
        'Accept-Language': 'en,es;q=0.9',
      },
    });
    if (!res.ok) {
      return {
        verificado: false,
        motivo: `http_${res.status}`,
        channelId: parsed.channelId,
        postNum: parsed.postNum,
        timestamp: new Date(),
      };
    }
    const html = await res.text();
    const meta = extractWhatsAppMetadata(html);

    // Page loaded successfully — the publication IS verified even if the
    // follower count extraction fails.
    return {
      verificado: true,
      channelId: parsed.channelId,
      postNum: parsed.postNum,
      seguidores: meta.seguidores,       // null when parsing fails, by design
      nombre: meta.nombre,
      descripcion: meta.descripcion,
      timestamp: new Date(),
    };
  } catch (err) {
    return {
      verificado: false,
      motivo: 'fetch_error',
      mensaje: err?.message || String(err),
      channelId: parsed.channelId,
      postNum: parsed.postNum,
      timestamp: new Date(),
    };
  }
}

// ─── B. parseSeguidores ────────────────────────────────────────────────────

/**
 * Parse WhatsApp-style follower counts. Robust to:
 *   "21K followers"       → 21000
 *   "1.2M followers"      → 1200000
 *   "1,2M"                → 1200000  (European decimal)
 *   "21.000 seguidores"   → 21000    (European thousands separator)
 *   "21,000 followers"    → 21000    (Anglo thousands separator)
 *   "890 followers"       → 890
 *   "890"                 → 890
 *
 * Returns null for unparseable input.
 */
function parseSeguidores(texto) {
  if (texto == null) return null;
  const raw = String(texto).trim();
  if (!raw) return null;

  // Direct K/M multiplier wins when present, regardless of decimal style.
  // Accept both "1.2M" and "1,2M".
  const multMatch = raw.match(/^(\d+(?:[.,]\d+)?)\s*([KkMm])/);
  if (multMatch) {
    const num = parseFloat(multMatch[1].replace(',', '.'));
    const mult = multMatch[2].toUpperCase() === 'M' ? 1_000_000 : 1_000;
    if (Number.isFinite(num)) return Math.round(num * mult);
  }

  // No multiplier: treat separators heuristically.
  //   "21.000"  → 21000 (thousands, not 21)
  //   "21,000"  → 21000 (thousands)
  //   "21.5"    → 21    (decimal — rare in follower counts, round down)
  //   "1,250.5" → 1250  (mixed — thousands then decimal)
  //   "890"     → 890
  const cleaned = raw.replace(/[^\d.,]/g, '');
  if (!cleaned) return null;

  // Determine separator style.
  const hasDot = cleaned.includes('.');
  const hasComma = cleaned.includes(',');

  let normalized;
  if (hasDot && hasComma) {
    // Mixed: whichever appears LAST is the decimal.
    if (cleaned.lastIndexOf(',') > cleaned.lastIndexOf('.')) {
      normalized = cleaned.replace(/\./g, '').replace(',', '.');
    } else {
      normalized = cleaned.replace(/,/g, '');
    }
  } else if (hasDot) {
    // Bare dots: if followed by exactly 3 digits, it's a thousands separator.
    if (/^\d{1,3}(\.\d{3})+$/.test(cleaned)) {
      normalized = cleaned.replace(/\./g, '');
    } else {
      normalized = cleaned;
    }
  } else if (hasComma) {
    // Bare commas: same rule — 3-digit groups → thousands separator.
    if (/^\d{1,3}(,\d{3})+$/.test(cleaned)) {
      normalized = cleaned.replace(/,/g, '');
    } else {
      normalized = cleaned.replace(',', '.');
    }
  } else {
    normalized = cleaned;
  }

  const n = parseFloat(normalized);
  return Number.isFinite(n) ? Math.round(n) : null;
}

// ─── C. procesarScreenshotOCR ──────────────────────────────────────────────

// Multi-language regex patterns. WhatsApp is localized per phone OS — a
// Spanish user sees "visualizaciones", a Latin American one sees "vistas",
// an English phone sees "views". We try all and take the first match.
const VIEWS_PATTERNS = [
  /(\d[\d.,\s]*[KMkm]?)\s*(views|vistas|visualizaciones|reproducciones|lecturas|vistos|seen by|view count)/i,
];
const REACTIONS_PATTERNS = [
  /(\d[\d.,\s]*[KMkm]?)\s*(reactions|reacciones|me gusta|likes|emojis|respuestas|replies)/i,
];

function firstMatch(text, patterns) {
  for (const re of patterns) {
    const m = text.match(re);
    if (m) {
      const parsed = parseSeguidores(m[1]); // same numeric parser handles "21K" etc.
      if (parsed != null) return parsed;
    }
  }
  return null;
}

/**
 * Low-level OCR adapter. Lazy-requires tesseract.js so the wasm payload
 * does not affect cold starts of unrelated functions. Swap the body of
 * this function for a Google Vision call if the bundle size becomes an
 * issue — the rest of the module does not care.
 */
async function runOcr(imageBuffer) {
  // Lazy require. If tesseract.js is not installed the caller gets a
  // structured error rather than a crash at module load.
  let Tesseract;
  try {
    Tesseract = require('tesseract.js');
  } catch (err) {
    throw Object.assign(new Error('tesseract.js not installed'), {
      code: 'OCR_NOT_AVAILABLE',
    });
  }
  // Single-shot recognize with the "eng+spa" language pack — both cover
  // English and Spanish WhatsApp interfaces.
  const { data } = await Tesseract.recognize(imageBuffer, 'eng+spa');
  return data?.text || '';
}

/**
 * Parse a raw screenshot buffer.
 * @returns {{ views: number|null, reacciones: number|null, confianza: 'alta'|'media'|'baja', textoRaw: string }}
 */
async function procesarScreenshotOCR(imageBuffer, { ocrFn = runOcr } = {}) {
  if (!imageBuffer) {
    return { views: null, reacciones: null, confianza: 'baja', textoRaw: '' };
  }

  let text;
  try {
    text = await ocrFn(imageBuffer);
  } catch (err) {
    return {
      views: null,
      reacciones: null,
      confianza: 'baja',
      textoRaw: '',
      error: err?.code || 'ocr_failed',
    };
  }

  const views = firstMatch(text, VIEWS_PATTERNS);
  const reacciones = firstMatch(text, REACTIONS_PATTERNS);

  let confianza = 'baja';
  if (views != null && reacciones != null) confianza = 'alta';
  else if (views != null || reacciones != null) confianza = 'media';

  return { views, reacciones, confianza, textoRaw: text };
}

// ─── D. crossValidarMetricas ───────────────────────────────────────────────

/**
 * Cross-validate a captured metrics tuple against niche benchmarks and
 * return a confianzaScore + fraud flag. This is the number the Advertiser
 * sees in the verification report — it is SPECIFIC to the campaign, not
 * a property of the channel.
 *
 * @param {object} args
 * @param {number} args.views       - reported views (from screenshot / admin bot)
 * @param {number} args.clicks      - unique clicks (from tracking URL, always precise)
 * @param {number} args.seguidores  - channel followers at the time of capture
 * @param {string} args.nicho       - niche key (falls back to 'otros')
 * @param {string} [args.fuenteDatos] - base source: 'admin_directo' | 'screenshot_ocr' | 'tracking_url' | 'declarado'
 */
function crossValidarMetricas({ views, clicks, seguidores, nicho, fuenteDatos = 'screenshot_ocr' }) {
  const v = Number(views) || 0;
  const c = Number(clicks) || 0;
  const f = Number(seguidores) || 0;

  const CTRImplicito = v > 0 ? c / v : 0;
  const viewRate = f > 0 ? v / f : 0;

  const anomaly = detectarAnomaliaFraude(nicho, CTRImplicito);
  const flagFraude = Boolean(anomaly.anomalia);

  // Base score by data source. These mirror the TIPO_ACCESO_CONFIANZA
  // values used by the channel-level scoring engine, but they are SCOPED
  // to this single campaign's verification.
  const BASE_BY_SOURCE = {
    admin_directo:  95,
    oauth_graph:    95,
    bot_miembro:    70,
    screenshot_ocr: 60,
    tracking_url:   40,
    declarado:      30,
  };
  let score = BASE_BY_SOURCE[fuenteDatos] ?? 40;

  // Coherence bonuses (+10 each if the ratio lands inside the niche's
  // reasonable band). calcularPercentilCTR returns 0-100.
  if (v > 0 && c > 0) {
    const pct = calcularPercentilCTR(nicho, CTRImplicito);
    if (pct >= 10 && pct <= 95) score += 10;
  }
  if (f > 0 && v > 0 && viewRate >= 0.02 && viewRate <= 1.0) {
    score += 10;
  }
  if (f > 0) score += 5; // follower count confirmed by scraping

  // Hard penalty if the CTR itself is anomalous — the screenshot may be
  // fabricated.
  if (flagFraude) score -= 20;

  score = Math.max(0, Math.min(100, Math.round(score)));

  return {
    confianzaScore: score,
    CTRImplicito,
    viewRate,
    flagFraude,
    tipoFlag: anomaly.tipo,
    detalle: {
      fuenteBase: fuenteDatos,
      coherenciaCTR: v > 0 && c > 0,
      coherenciaViewRate: viewRate >= 0.02 && viewRate <= 1.0,
      seguidoresConfirmados: f > 0,
      sigmas: anomaly.sigmas,
    },
  };
}

// ─── E. generarInformeVerificado ───────────────────────────────────────────

/**
 * Build the advertiser-facing verification report. Shows:
 *   - canal identity (name, platform, CAS, nivel)
 *   - publication metadata (post number, URL, timestamp)
 *   - metrics (views, clicks, CTR, CTR vs benchmark, reactions)
 *   - campaign confianzaScore (NOT the channel's — they are different)
 *   - fuenteDatos of the capture
 *   - a neutral `advertencia` when flagged (no direct accusation)
 */
function generarInformeVerificado({ canal, campania, metricas, validacion }) {
  const views = Number(metricas?.views) || 0;
  const clicks = Number(metricas?.clicksVerificados ?? metricas?.clicks) || 0;
  const reacciones = Number(metricas?.reacciones ?? metricas?.reactions) || 0;
  const nicho = canal?.categoria || canal?.nicho || 'otros';

  const CTR = views > 0 ? +(clicks / views).toFixed(6) : 0;

  // Percentile vs benchmark → "+X% over the niche median". We anchor the
  // comparison to the niche p50 so the sign is intuitive ("+23%" or "-12%").
  let CTRvsBenchmark = null;
  try {
    const { NICHE_BENCHMARKS } = require('../config/nicheBenchmarks');
    const bench = NICHE_BENCHMARKS[nicho] || NICHE_BENCHMARKS.otros;
    const p50 = bench.ctr[1];
    if (p50 > 0 && views > 0) {
      const delta = ((CTR - p50) / p50) * 100;
      CTRvsBenchmark = `${delta >= 0 ? '+' : ''}${delta.toFixed(0)}% vs media del nicho`;
    }
  } catch (_) { /* ignore */ }

  // Neutral wording. The system flags, the ChannelAd team reviews — the
  // report NEVER accuses the creator of fraud directly.
  const advertencia = validacion?.flagFraude
    ? 'Las métricas de esta campaña están fuera del rango habitual para el nicho. Están siendo revisadas por el equipo de ChannelAd.'
    : null;

  return {
    verificadoPor: 'ChannelAd',
    timestamp: new Date(),
    canal: {
      nombre: canal?.nombreCanal || canal?.nombre || '',
      plataforma: canal?.plataforma || '',
      CAS: canal?.CAS ?? null,
      nivel: canal?.nivel || null,
    },
    publicacion: {
      verificada: Boolean(metricas?.publicacionVerificada ?? true),
      timestamp: metricas?.publicadoEn || campania?.publishedAt || null,
      postNum: metricas?.postNum ?? null,
      urlPublica: metricas?.urlPublica || campania?.urlPublica || null,
    },
    metricas: {
      views,
      clicksVerificados: clicks,   // from tracking URL — always precise
      CTR,
      CTRvsBenchmark,
      reacciones,
    },
    // This is the CAMPAIGN-specific confianzaScore from crossValidarMetricas.
    // It is distinct from canal.confianzaScore (the channel-level signal).
    confianzaScore: validacion?.confianzaScore ?? null,
    fuenteDatos: validacion?.detalle?.fuenteBase || metricas?.fuenteDatos || null,
    advertencia,
  };
}

module.exports = {
  verifyPostPublication,
  parseSeguidores,
  procesarScreenshotOCR,
  crossValidarMetricas,
  generarInformeVerificado,
  // Internals exposed for testing.
  parseWhatsAppUrl,
  extractWhatsAppMetadata,
  runOcr,
};
