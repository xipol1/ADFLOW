/**
 * LinkedIn Newsletters Service — editorial seed list of Spanish-language
 * LinkedIn Newsletters + optional scraper.
 *
 * ──────────────────────────────────────────────────────────────────────────
 * WHY THIS IS SEED-FIRST (not scraper-first):
 * ──────────────────────────────────────────────────────────────────────────
 * LinkedIn blocks anonymous HTTP access to newsletter pages. Requests from
 * any user agent (including Googlebot) are served an empty SPA shell with
 * HTTP 500 — no OG tags, no subscriber count, no description. Scraping
 * would require a valid session cookie, which is ToS-hostile and brittle.
 *
 * So this service primarily exposes a CURATED EDITORIAL LIST of known
 * Spanish-language LinkedIn newsletters. They land in the Canal catalog
 * with plataforma='newsletter' + provider='linkedin', and a placeholder
 * URL built from the author's LinkedIn profile path (which at least leads
 * the user to the right person on LinkedIn). When a creator claims their
 * newsletter via OAuth, the real URL + subscribers + post metrics get
 * filled in by linkedinCreatorMetricsService.
 *
 * The scraper function is included as an OPTIONAL fallback for the day
 * LinkedIn re-opens their public HTML. Today it is a no-op that simply
 * returns { _urlDead: true }.
 * ──────────────────────────────────────────────────────────────────────────
 */

const axios = require('axios');

const REQUEST_TIMEOUT_MS = 12000;
const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36';

// ─── Editorial seed list ──────────────────────────────────────────────────
// Format mirrors editorialSeedsData.js so the orchestrator treats these the
// same way as Substack/Beehiiv seeds.
//
// Fields:
//   - title:       newsletter display name
//   - author:      creator/company behind it
//   - profileUrl:  LinkedIn profile or company page URL (fallback link —
//                  sends the user to the author on LinkedIn)
//   - rawCategory: human-readable category label, feeds the taxonomy
//   - description: one-line description for the Canal card
//
// These are seeds — the creator reclaims via OAuth to correct/enrich data.
const LINKEDIN_NEWSLETTER_SEEDS = [
  {
    title: 'Marketing4eCommerce',
    author: 'Rubén Bastón',
    profileUrl: 'https://www.linkedin.com/company/marketing4ecommerce/',
    rawCategory: 'Marketing eCommerce',
    description:
      'Noticias y análisis diarios sobre marketing digital y comercio electrónico en España y LATAM.',
  },
  {
    title: 'Dealflow — The Spanish Startup Ecosystem',
    author: 'Jaime Novoa',
    profileUrl: 'https://www.linkedin.com/in/jaimenovoa/',
    rawCategory: 'Startups venture capital',
    description:
      'Resumen semanal del ecosistema español de startups y venture capital. De Jaime Novoa.',
  },
  {
    title: 'Suma Positiva',
    author: 'Samuel Gil',
    profileUrl: 'https://www.linkedin.com/in/samuelgil/',
    rawCategory: 'Tecnología startups venture capital',
    description:
      'Referencia en negocios digitales, tecnología y venture capital en español. Escrita por Samuel Gil.',
  },
  {
    title: 'No Solo Suerte',
    author: 'Rafa Sarandeses',
    profileUrl: 'https://www.linkedin.com/in/rafasarandeses/',
    rawCategory: 'Estrategia personal profesional liderazgo',
    description:
      'Estrategia personal y profesional para líderes y ejecutivos. Newsletter semanal en español.',
  },
  {
    title: 'Gente Interesante',
    author: 'Oriol Roda',
    profileUrl: 'https://www.linkedin.com/in/oriolroda/',
    rawCategory: 'Biohacking salud longevidad',
    description:
      'Biohacking, salud y longevidad aplicada. Conversaciones con gente interesante del mundo wellness.',
  },
  {
    title: 'Kaizen Spanish',
    author: 'Benjamín Serra',
    profileUrl: 'https://www.linkedin.com/in/benjaminserra/',
    rawCategory: 'Idiomas comunicación español',
    description: 'Cómo mejorar tu comunicación y tu español escrito y hablado.',
  },
  {
    title: 'El Gato y la Caja',
    author: 'Pablo González',
    profileUrl: 'https://www.linkedin.com/company/el-gato-y-la-caja/',
    rawCategory: 'Ciencia divulgación',
    description: 'Divulgación científica con un enfoque cercano y accesible en español.',
  },
  {
    title: 'Midudev — JavaScript y Programación',
    author: 'Miguel Ángel Durán',
    profileUrl: 'https://www.linkedin.com/in/midudev/',
    rawCategory: 'Programación desarrollo JavaScript',
    description:
      'Tutoriales y contenido educativo sobre JavaScript, React y desarrollo web por midudev.',
  },
  {
    title: 'Retail News by Laureano Turienzo',
    author: 'Laureano Turienzo',
    profileUrl: 'https://www.linkedin.com/in/laureanoturienzoesteban/',
    rawCategory: 'Retail negocios',
    description:
      'Análisis y tendencias del sector retail global por Laureano Turienzo, CEO de RetailN1.',
  },
  {
    title: 'IA Para Empresas',
    author: 'Guillermo Beuchat',
    profileUrl: 'https://www.linkedin.com/in/guillermobeuchat/',
    rawCategory: 'Inteligencia artificial empresas productividad',
    description:
      'Cómo aplicar inteligencia artificial en procesos empresariales. En español, orientada a directivos.',
  },
  {
    title: 'Recursos Humanos Hoy',
    author: 'Gloria Molins',
    profileUrl: 'https://www.linkedin.com/in/gloriamolins/',
    rawCategory: 'Recursos humanos liderazgo',
    description:
      'Newsletter sobre tendencias en recursos humanos, talent acquisition y cultura empresarial.',
  },
  {
    title: 'The Conversation España',
    author: 'The Conversation',
    profileUrl: 'https://www.linkedin.com/company/the-conversation-espana/',
    rawCategory: 'Noticias actualidad análisis académico',
    description:
      'Análisis de actualidad escritos por académicos españoles. Política, economía, ciencia.',
  },
  {
    title: 'Leyendo Ecommerce',
    author: 'Jordi Ordóñez',
    profileUrl: 'https://www.linkedin.com/in/jordiob/',
    rawCategory: 'eCommerce Amazon marketplaces',
    description:
      'Consultoría de ecommerce y Amazon. Noticias y consejos prácticos para vendedores online.',
  },
  {
    title: 'Tech, Ciencia y Futuro',
    author: 'Pablo F. Iglesias',
    profileUrl: 'https://www.linkedin.com/in/pabloyglesias/',
    rawCategory: 'Tecnología ciencia ciberseguridad',
    description:
      'Tecnología, ciberseguridad y su impacto en la sociedad. Newsletter de Pablo F. Iglesias.',
  },
  {
    title: 'Futuro Laboral',
    author: 'Santiago Niño Becerra',
    profileUrl: 'https://www.linkedin.com/in/santiagoninobecerra/',
    rawCategory: 'Economía empleo futuro',
    description:
      'Análisis macroeconómico y tendencias del mercado laboral por Santiago Niño Becerra.',
  },
  {
    title: 'Human-Centered Leadership',
    author: 'Belén Garijo',
    profileUrl: 'https://www.linkedin.com/in/belengarijo/',
    rawCategory: 'Liderazgo diversidad innovación',
    description:
      'Liderazgo, innovación y diversidad de género en ciencia y tecnología por la CEO de Merck.',
  },
  {
    title: 'Product Hackers Weekly',
    author: 'Product Hackers',
    profileUrl: 'https://www.linkedin.com/company/producthackers/',
    rawCategory: 'Growth producto marketing',
    description:
      'Growth, experimentación y producto digital. Newsletter semanal de la consultora Product Hackers.',
  },
  {
    title: 'Nuevo Sector',
    author: 'Nuevo Sector',
    profileUrl: 'https://www.linkedin.com/company/nuevo-sector/',
    rawCategory: 'eCommerce retail startups',
    description:
      'Resumen semanal del mundo del eCommerce, retail y su ecosistema startup.',
  },
  {
    title: 'Finanzas Inteligentes',
    author: 'Gonzalo Sánchez-Arjona',
    profileUrl: 'https://www.linkedin.com/in/gonzalosanchezarjona/',
    rawCategory: 'Finanzas personales inversión',
    description:
      'Educación financiera práctica para profesionales. Inversión, ahorro e independencia financiera.',
  },
  {
    title: 'Health & Longevity Insider',
    author: 'Dr. Enrique Rojas',
    profileUrl: 'https://www.linkedin.com/in/enriquerojas/',
    rawCategory: 'Salud longevidad medicina',
    description:
      'Últimos avances en salud, longevidad y medicina preventiva por el Dr. Enrique Rojas.',
  },
];

/**
 * Build a LinkedIn-prefixed slug from a title so LinkedIn newsletters never
 * collide with Substack/Beehiiv ones that share the same display name
 * (e.g. "Marketing4eCommerce" exists on both Substack AND LinkedIn).
 */
function buildLinkedinSlug(title) {
  const clean = (title || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 50);
  return `linkedin-${clean}`;
}

/**
 * Return the editorial seed list in the shape the newsletter discovery
 * orchestrator expects.
 */
function getLinkedinNewsletterSeeds() {
  return LINKEDIN_NEWSLETTER_SEEDS.map((s) => ({
    title: s.title,
    description: s.description,
    url: s.profileUrl,
    rawCategory: s.rawCategory,
    subscribers: 0,
    provider: 'linkedin', // explicit, respected by taxonomyService.classifyNewsletter
    author: s.author,
    source: 'linkedin_newsletters',
    _source: 'linkedin_newsletters',
    idioma: 'es',
    // Explicit slug — prevents collision with Substack seeds sharing the
    // same display name. Respected by dedupeBySlug and classifyNewsletter.
    slug: buildLinkedinSlug(s.title),
  }));
}

/**
 * OPTIONAL scraper — kept as a no-op today because LinkedIn blocks anonymous
 * HTTP access to newsletter pages (returns 500 with empty SPA shell for any
 * user agent, including Googlebot). Left in place so the day LinkedIn opens
 * the public HTML back up, this can be wired into the orchestrator without
 * touching the rest of the pipeline.
 *
 * Returns `{ ok:false, reason }` today. Any code that reaches this function
 * should treat a null result as "no enrichment possible, use seed data".
 */
async function scrapeLinkedinNewsletterPage(url) {
  if (!url) return { ok: false, reason: 'missing url' };
  try {
    const res = await axios.get(url, {
      timeout: REQUEST_TIMEOUT_MS,
      maxRedirects: 5,
      validateStatus: () => true,
      headers: { 'User-Agent': USER_AGENT },
    });
    const status = res.status;
    const html = typeof res.data === 'string' ? res.data : '';
    // LinkedIn serves a generic shell to non-authenticated requests. Detect
    // by: (a) 5xx, (b) no og:title in the HTML.
    if (status >= 500) {
      return { ok: false, reason: `linkedin-blocked-${status}` };
    }
    const ogTitle = (html.match(/<meta[^>]*property=["']og:title["'][^>]*content=["']([^"']+)/i) || [])[1];
    if (!ogTitle) {
      return { ok: false, reason: 'no-og-title' };
    }
    const ogDesc = (html.match(/<meta[^>]*property=["']og:description["'][^>]*content=["']([^"']+)/i) || [])[1];
    const subsMatch = html.match(/"subscriberCount"\s*:\s*(\d+)/);
    return {
      ok: true,
      title: ogTitle,
      description: ogDesc || '',
      subscribers: subsMatch ? parseInt(subsMatch[1], 10) : 0,
    };
  } catch (err) {
    return { ok: false, reason: err.message };
  }
}

module.exports = {
  getLinkedinNewsletterSeeds,
  scrapeLinkedinNewsletterPage,
  LINKEDIN_NEWSLETTER_SEEDS,
};
