/**
 * telegramAnalyzer — extrae datos de un canal/grupo público de Telegram
 * desde el HTML que sirve t.me/{username}.
 *
 * Telegram expone públicamente:
 *   - <meta property="og:title">       → nombre del canal
 *   - <meta property="og:description"> → descripción
 *   - <meta property="og:image">       → foto de perfil
 *   - <div class="tgme_page_extra">    → "X subscribers" (Telegram canales)
 *                                       o "X members" (Telegram groups)
 *
 * Si el canal es PRIVADO o no existe, la página no tiene tgme_page_extra
 * con número — devolvemos status 'partial' o 'not_found' según.
 *
 * No usamos cheerio (dependencia pesada) — basta regex bien acotada.
 */

const UA = 'Mozilla/5.0 (compatible; ChanneladBot/1.0; +https://channelad.io/bot)';

async function fetchTelegramHtml(username) {
  const url = `https://t.me/${username}`;
  const ac = new AbortController();
  const timer = setTimeout(() => ac.abort(), 8000);
  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': UA, 'Accept-Language': 'es-ES,es;q=0.9,en;q=0.8' },
      signal: ac.signal,
    });
    if (!res.ok) {
      const err = new Error(`telegram_http_${res.status}`);
      err.statusCode = res.status;
      throw err;
    }
    return await res.text();
  } finally {
    clearTimeout(timer);
  }
}

// ─── Parsers ────────────────────────────────────────────────────────────────
function extractMetaContent(html, property) {
  // <meta property="og:title" content="Cool Channel">  ó comillas simples.
  const rx = new RegExp(`<meta[^>]+property=["']${property}["'][^>]+content=["']([^"']*)["']`, 'i');
  const rxAlt = new RegExp(`<meta[^>]+content=["']([^"']*)["'][^>]+property=["']${property}["']`, 'i');
  return (html.match(rx)?.[1] || html.match(rxAlt)?.[1] || '').trim();
}

function extractSubscribers(html) {
  // El número aparece en <div class="tgme_page_extra">8 542 subscribers, ...</div>
  // o "members" para grupos. Telegram usa NBSP ( ) como separador de miles.
  const blockMatch = html.match(/<div class="tgme_page_extra">([\s\S]*?)<\/div>/);
  if (!blockMatch) return null;
  const text = blockMatch[1].replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ');
  // Buscar "N subscribers" o "N members" (en inglés siempre)
  const m = text.match(/([\d][\d\s., ]*)\s*(?:subscribers?|members?)/i);
  if (!m) return null;
  const cleaned = m[1].replace(/[^\d]/g, '');
  const n = parseInt(cleaned, 10);
  return Number.isFinite(n) ? n : null;
}

function isPrivateOrMissing(html) {
  // Telegram renderiza una vista "join" cuando es privado/inexistente.
  // Heurística: si no hay tgme_page_extra Y no hay og:title relevante → no_found.
  return !html.includes('tgme_page_extra');
}

// ─── Analyzer principal ─────────────────────────────────────────────────────
/**
 * analyze({ externalId }) — externalId es el username de t.me/{username}.
 * Devuelve { status, data: { name, description, subscribers, profileImage, verified } }
 */
async function analyze({ externalId }) {
  if (!externalId || typeof externalId !== 'string') {
    return { status: 'failed', errorMessage: 'invalid_username', data: {} };
  }

  let html;
  try {
    html = await fetchTelegramHtml(externalId);
  } catch (err) {
    if (err.statusCode === 404) {
      return { status: 'not_found', errorMessage: 'channel_not_found', data: {} };
    }
    return {
      status: 'failed',
      errorMessage: err.message || 'fetch_failed',
      data: {},
    };
  }

  const subscribers = extractSubscribers(html);
  const name = extractMetaContent(html, 'og:title');
  const description = extractMetaContent(html, 'og:description');
  const profileImage = extractMetaContent(html, 'og:image');
  const verified = html.includes('verified_icon') || html.includes('verified-icon');

  // Si no podemos leer subscribers, el canal probablemente es privado /
  // la cuenta no es un canal público (chat de usuario, bot…) — devolvemos
  // 'partial' para que el frontend pida los datos manualmente.
  if (subscribers == null || isPrivateOrMissing(html)) {
    return {
      status: 'partial',
      errorMessage: 'subscribers_unavailable',
      data: { name, description, profileImage, verified, subscribers: null },
    };
  }

  return {
    status: 'ok',
    data: {
      name,
      description,
      subscribers,
      profileImage,
      verified,
      lastActivity: null, // no expuesto en HTML público
    },
  };
}

module.exports = { analyze, _extractSubscribers: extractSubscribers, _extractMetaContent: extractMetaContent };
