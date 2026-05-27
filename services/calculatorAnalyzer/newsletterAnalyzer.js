/**
 * newsletterAnalyzer — analiza una landing de newsletter pública.
 *
 * Soportamos:
 *   - Substack ({slug}.substack.com): expone og:title/og:description y, cuando
 *     el autor lo hace público, un contador "N subscribers" en el HTML.
 *   - Beehiiv  ({slug}.beehiiv.com):  expone og:title pero los subs casi
 *     nunca son públicos. Devolvemos partial + fallback manual.
 *
 * Otras plataformas (ConvertKit, Ghost, Buttondown) las dejamos como TODO
 * — Sprint 1 prioriza las dos principales.
 */

const UA = 'Mozilla/5.0 (compatible; ChanneladBot/1.0; +https://channelad.io/bot)';

async function fetchHtml(url) {
  const ac = new AbortController();
  const timer = setTimeout(() => ac.abort(), 8000);
  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': UA, 'Accept-Language': 'es-ES,es;q=0.9,en;q=0.8' },
      signal: ac.signal,
    });
    if (!res.ok) {
      const err = new Error(`newsletter_http_${res.status}`);
      err.statusCode = res.status;
      throw err;
    }
    return await res.text();
  } finally {
    clearTimeout(timer);
  }
}

function extractMetaContent(html, property) {
  const rx = new RegExp(`<meta[^>]+property=["']${property}["'][^>]+content=["']([^"']*)["']`, 'i');
  const rxAlt = new RegExp(`<meta[^>]+content=["']([^"']*)["'][^>]+property=["']${property}["']`, 'i');
  return (html.match(rx)?.[1] || html.match(rxAlt)?.[1] || '').trim();
}

// Substack a veces expone "X subscribers" en text del head (preloaded data)
// y a veces solo en el JS bundle. Regex defensiva sobre el HTML completo.
function extractSubstackSubs(html) {
  // Patrón visto en producción:
  //   "free_subscriber_count":12345
  //   "subscriberCount":12345
  //   "Join 12,345 subscribers"
  const patterns = [
    /"free_subscriber_count"\s*:\s*(\d+)/,
    /"subscriberCount"\s*:\s*(\d+)/,
    /"totalSubscribers"\s*:\s*(\d+)/,
    /Join\s+([\d,.\s]+)\s+(?:subscribers|readers|people)/i,
  ];
  for (const rx of patterns) {
    const m = html.match(rx);
    if (m) {
      const n = parseInt(m[1].replace(/[^\d]/g, ''), 10);
      if (Number.isFinite(n) && n > 0) return n;
    }
  }
  return null;
}

function extractBeehiivSubs(html) {
  // Beehiiv casi nunca expone subs. Algunos creadores los muestran como badge.
  const patterns = [
    /([\d,.]+)\s+subscribers/i,
    /"subscriberCount"\s*:\s*(\d+)/,
  ];
  for (const rx of patterns) {
    const m = html.match(rx);
    if (m) {
      const n = parseInt(m[1].replace(/[^\d]/g, ''), 10);
      if (Number.isFinite(n) && n > 0) return n;
    }
  }
  return null;
}

/**
 * analyze({ externalId, normalizedUrl, subtype })
 *   subtype: 'substack' | 'beehiiv'  (lo pasa el detector)
 */
async function analyze({ externalId, normalizedUrl, subtype }) {
  if (!normalizedUrl || !subtype) {
    return { status: 'failed', errorMessage: 'invalid_newsletter_url', data: {} };
  }

  let html;
  try {
    html = await fetchHtml(normalizedUrl);
  } catch (err) {
    if (err.statusCode === 404) {
      return { status: 'not_found', errorMessage: 'newsletter_not_found', data: {} };
    }
    return { status: 'failed', errorMessage: err.message || 'fetch_failed', data: {} };
  }

  const name = extractMetaContent(html, 'og:title');
  const description = extractMetaContent(html, 'og:description');
  const profileImage = extractMetaContent(html, 'og:image');

  let subscribers = null;
  if (subtype === 'substack') subscribers = extractSubstackSubs(html);
  if (subtype === 'beehiiv')  subscribers = extractBeehiivSubs(html);

  if (subscribers == null) {
    return {
      status: 'partial',
      errorMessage: 'subscribers_unavailable',
      data: { name, description, profileImage, subscribers: null, verified: false },
    };
  }

  return {
    status: 'ok',
    data: {
      name,
      description,
      subscribers,
      profileImage,
      verified: false,
      lastActivity: null,
    },
  };
}

module.exports = {
  analyze,
  _extractSubstackSubs: extractSubstackSubs,
  _extractBeehiivSubs: extractBeehiivSubs,
};
