/**
 * Newsletter Taxonomy Service — classification + normalization.
 *
 * Takes a raw newsletter (from any source: ohmynewst HTML, Substack JSON,
 * editorial list, etc.) and outputs a canonical representation with:
 *
 *   - categoria  → one of NICHE_BENCHMARKS slugs (finanzas, tecnologia, …)
 *   - tags       → array of normalized keyword tags
 *   - provider   → substack | beehiiv | mailchimp | kit | ghost | other
 *   - plataforma → always 'newsletter' for this service
 *   - idioma     → 'es' by default (detected heuristically)
 *   - description → cleaned, HTML-stripped, <= 500 chars
 *
 * The niche dictionary is intentionally exhaustive and Spanish-first. It maps
 * surface labels (and common keywords that appear in descriptions/titles) to
 * the 12 canonical nichos that the scoring engine knows about.
 *
 * IMPORTANT: order inside NICHE_KEYWORDS matters. The first matching niche
 * wins, so more specific ones (crypto, ecommerce) must come before broader
 * ones (tecnologia, marketing).
 */

const { NICHE_BENCHMARKS } = require('../../config/nicheBenchmarks');

// ─── Keyword → niche dictionary ───────────────────────────────────────────
// Each niche has a set of keywords with weights. Weight defaults to 1.
// Classification scores all niches by (sum of matched keyword weights ×
// source multiplier) and picks the highest. This avoids the order-sensitivity
// of a first-match strategy on ambiguous inputs like "tecnología, startups y
// venture capital" which contain keywords from multiple niches.
//
// Weights:
//   3 = very strong signal (niche name itself, or canonical term)
//   2 = strong signal
//   1 = weak/ambiguous signal
const NICHE_KEYWORDS = [
  {
    nicho: 'crypto',
    keywords: {
      cripto: 3, crypto: 3, bitcoin: 3, btc: 3, ethereum: 3, eth: 2, web3: 3,
      defi: 3, nft: 3, blockchain: 3, altcoin: 3, solana: 2, binance: 2,
      satoshi: 2, token: 1, ico: 2, staking: 2, metaverso: 2, metaverse: 2,
      'el pez gordo': 3,
    },
  },
  {
    nicho: 'finanzas',
    keywords: {
      finanzas: 3, finance: 3, bolsa: 3, invertir: 3, inversion: 3, inversor: 3,
      inversiones: 3, trading: 3, trader: 2, dividendos: 3, ibex: 3,
      acciones: 2, fondos: 2, etf: 3, ahorro: 3, hipoteca: 2, banca: 2,
      banking: 2, fintech: 3, economia: 2, economy: 2, macroeconomia: 3,
      jubilacion: 2, pension: 2, 'independencia financiera': 3, fire: 1,
      wealth: 2, patrimonio: 2, capital: 1, dealflow: 3, 'venture capital': 2,
      'vc ': 1, 'private equity': 2, stocks: 2, 'wall street': 3,
      dividends: 2, broker: 2, brokers: 2, divisas: 2, forex: 3,
    },
  },
  {
    nicho: 'ecommerce',
    keywords: {
      ecommerce: 3, 'e-commerce': 3, 'comercio electronico': 3, dropshipping: 3,
      'amazon fba': 3, 'amazon seller': 3, shopify: 3, woocommerce: 3,
      prestashop: 3, retail: 2, marketplace: 2, 'ventas online': 3,
      'tienda online': 3, d2c: 2, 'direct to consumer': 2, cro: 1,
      'nuevo sector': 2, ecommartech: 3,
    },
  },
  {
    nicho: 'marketing',
    keywords: {
      marketing: 3, growth: 2, 'growth hacking': 3, seo: 3, sem: 2, ppc: 2,
      ads: 1, publicidad: 2, copywriting: 3, 'copy ': 1, brand: 1,
      branding: 2, marca: 1, 'social media': 2, 'community manager': 3,
      'email marketing': 3, inbound: 2, 'content marketing': 3,
      'personal branding': 2, 'marca personal': 2, 'linkedin ads': 2,
      'facebook ads': 2, 'meta ads': 2, 'google ads': 2, funnel: 2,
      advertising: 2, 'growth hacker': 3, hubspot: 2,
    },
  },
  {
    nicho: 'tecnologia',
    keywords: {
      tecnologia: 3, technology: 3, 'tech ': 2, programacion: 3, programming: 3,
      developer: 2, 'dev ': 1, codigo: 2, software: 2, 'ia ': 2,
      'inteligencia artificial': 3, 'artificial intelligence': 3, 'ai ': 2,
      'machine learning': 3, 'deep learning': 3, llm: 2, gpt: 2, chatgpt: 2,
      ciberseguridad: 3, cybersecurity: 3, cloud: 2, saas: 3, startup: 3,
      startups: 3, emprendimiento: 3, emprender: 2, 'no-code': 2, nocode: 2,
      'low-code': 2, python: 2, javascript: 2, devops: 2,
      'product management': 2, 'product manager': 2, ux: 2, 'ui/ux': 2,
      'diseño web': 2, apps: 1, 'mobile apps': 2, ios: 1, android: 1,
      'tech,': 2, 'silicon valley': 2, api: 1, 'data science': 2,
      ipad: 2, iphone: 2, linux: 2, 'redes ': 2, 'ciencia': 2,
      // ohmynewst category labels (Spanish)
      negocio: 2, negocios: 2, 'creacion de contenido': 2,
      'gadgets y tecnologia': 3, 'gadgets y tecnología': 3,
    },
  },
  {
    nicho: 'salud',
    keywords: {
      salud: 3, health: 3, bienestar: 2, wellness: 2, nutricion: 3,
      nutrition: 3, fitness: 3, gym: 2, gimnasio: 2, running: 2, yoga: 2,
      mindfulness: 2, meditacion: 2, meditation: 2, 'salud mental': 3,
      'mental health': 3, biohacking: 3, longevidad: 3, longevity: 3,
      dieta: 2, keto: 2, cetogenica: 2, crossfit: 2, medicina: 2,
      psicologia: 2, ayuno: 2, suplementos: 2,
    },
  },
  {
    nicho: 'educacion',
    keywords: {
      educacion: 3, education: 3, aprender: 2, learning: 2, cursos: 2,
      course: 1, oposiciones: 3, idiomas: 3, languages: 2, ingles: 2,
      english: 1, frances: 2, aleman: 2, italiano: 2, formacion: 2,
      training: 1, universidad: 2, productividad: 2, productivity: 2,
      'productividad personal': 3, habitos: 2, habits: 2, kaizen: 3,
      'desarrollo personal': 3, 'personal development': 3, autoayuda: 2,
      libros: 2, books: 2, reading: 2, lectura: 2, biblioteca: 1,
      notion: 2, mentalidad: 2, mindset: 2, 'soft skills': 2,
    },
  },
  {
    nicho: 'noticias',
    keywords: {
      noticias: 3, news: 2, actualidad: 3, politica: 3, politics: 3,
      periodismo: 3, journalism: 3, reporter: 2, reportero: 2, diario: 2,
      prensa: 2, internacional: 2, 'resumen diario': 3, 'morning brief': 3,
      'boletin diario': 3, 'al dia': 3, 'mientras dormias': 3,
      'fleet street': 3, press: 1, 'elmundo.es': 3, 'el español': 2,
      eldiario: 2, 'el pais': 2, 'geopolitica': 3, geopolitics: 3,
    },
  },
  {
    nicho: 'deporte',
    keywords: {
      deporte: 3, deportes: 3, sports: 3, futbol: 3, football: 2,
      'la liga': 3, 'real madrid': 3, barcelona: 2, 'fc barcelona': 3,
      atletico: 2, champions: 2, baloncesto: 3, basketball: 3, nba: 2,
      acb: 2, tenis: 2, tennis: 2, padel: 3, ciclismo: 3, cycling: 2,
      motogp: 3, 'formula 1': 3, 'f1 ': 2, 'motor sport': 2, atletismo: 3,
      maraton: 2, marathon: 2, olimpicos: 2, beisbol: 3, baseball: 3,
      deportistas: 2, corredores: 2, triatletas: 2, nadadores: 2,
    },
  },
  {
    nicho: 'entretenimiento',
    keywords: {
      entretenimiento: 3, entertainment: 3, cine: 3, cinema: 3, peliculas: 3,
      movies: 2, series: 2, 'tv ': 1, netflix: 2, hbo: 2, streaming: 2,
      musica: 3, music: 2, gaming: 3, videojuegos: 3, esports: 3, anime: 3,
      manga: 3, humor: 2, memes: 2, 'cultura pop': 3, 'pop culture': 2,
      celebrity: 2, famosos: 2, podcast: 2, radio: 1, 'video games': 3,
      'indie game': 3, 'indie video': 3, 'video game': 3, rock: 2,
      conciertos: 2, 'rocker ': 2,
    },
  },
  {
    nicho: 'lifestyle',
    keywords: {
      lifestyle: 3, 'estilo de vida': 3, viajes: 3, travel: 3, turismo: 2,
      gastronomia: 3, gastronomy: 2, cocina: 3, recetas: 2, cooking: 2,
      food: 1, vino: 2, wine: 2, fotografia: 2, photography: 2, moda: 3,
      fashion: 3, belleza: 3, beauty: 3, skincare: 3, decoracion: 3,
      decor: 2, hogar: 2, home: 1, jardin: 2, diy: 2, bricolaje: 2,
      mascotas: 3, pets: 2, perros: 2, gatos: 2, maternidad: 2,
      paternidad: 2, crianza: 2, familia: 1, family: 1, arte: 2, 'art ': 1,
      pintura: 2, literatura: 2, teatro: 2, minimalismo: 2, flamenco: 2,
      camping: 2, senderismo: 2, 'trabajo remoto': 3, 'nomada digital': 3,
      'nomadas digitales': 3, 'remote work': 3, 'digital nomad': 3,
    },
  },
];

// Flat list of keywords for tag extraction (preserving order, no weights)
const ALL_KEYWORDS_FLAT = NICHE_KEYWORDS.flatMap((n) => Object.keys(n.keywords));

// ─── Provider detection ───────────────────────────────────────────────────
// Ordered: more specific hostnames first. LinkedIn newsletter URLs follow
// the pattern linkedin.com/newsletters/{slug}-{id}/ and must be matched
// BEFORE any generic "linkedin" rule (we don't classify linkedin.com/in/
// as newsletter provider, those are profiles).
const PROVIDER_RULES = [
  { provider: 'substack', match: /substack\.com/i },
  { provider: 'beehiiv', match: /beehiiv\.com|\.beehiiv\./i },
  { provider: 'mailchimp', match: /mailchimp\.com|us\d+\.campaign-archive\.com/i },
  { provider: 'kit', match: /ck\.page|kit\.com|convertkit/i },
  { provider: 'ghost', match: /ghost\.io/i },
  { provider: 'revue', match: /getrevue\.co/i },
  { provider: 'linkedin', match: /linkedin\.com\/newsletters/i },
];

// ─── Helpers ──────────────────────────────────────────────────────────────

/**
 * Strip accents and lowercase a string for keyword matching.
 */
function normalizeText(s) {
  if (!s || typeof s !== 'string') return '';
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // remove diacritics
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Strip HTML tags + collapse whitespace.
 */
function stripHtml(html) {
  if (!html || typeof html !== 'string') return '';
  return html
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Count how many times `kw` appears in `blob`.
 *
 * Short keywords (<= 4 chars) require word boundaries so that "ico" does
 * NOT match "macroeconómico", "eth" does not match "ethernet", "etf" does
 * not match "etféretro", etc. Long keywords (> 4 chars) use simple indexOf
 * because false-positive collisions are vanishingly unlikely at that length
 * and multi-word phrases ("venture capital") work naturally.
 *
 * A word boundary for us is: start/end of blob, or any non-alphanumeric
 * character. We pad the blob with a space on each side so the boundaries
 * at the extremes match too.
 */
function countOccurrences(blob, kw) {
  if (!blob || !kw) return 0;
  if (kw.length > 4) {
    let count = 0;
    let idx = 0;
    while ((idx = blob.indexOf(kw, idx)) !== -1) {
      count++;
      idx += kw.length;
    }
    return count;
  }
  // Short keyword: require word boundaries on both sides.
  const padded = ` ${blob} `;
  let count = 0;
  let idx = 0;
  while ((idx = padded.indexOf(kw, idx)) !== -1) {
    const before = padded.charCodeAt(idx - 1);
    const after = padded.charCodeAt(idx + kw.length);
    const isAlnum = (c) =>
      (c >= 48 && c <= 57) || // 0-9
      (c >= 97 && c <= 122);  // a-z (blob is already lowercased + accent-stripped)
    if (!isAlnum(before) && !isAlnum(after)) count++;
    idx += kw.length;
  }
  return count;
}

/**
 * Score every niche against a text blob. Returns an array of
 * { nicho, score, matched } sorted descending by score.
 *
 * sourceCategory matches carry a 3× multiplier because that text was
 * already curated by the directory and is a much stronger signal than
 * words appearing in the title or description.
 */
function scoreNiches({ title = '', description = '', sourceCategory = '' }) {
  const titleBlob = normalizeText(title);
  const descBlob = normalizeText(description);
  const catBlob = normalizeText(sourceCategory);

  const scores = NICHE_KEYWORDS.map(({ nicho, keywords }) => {
    let score = 0;
    const matched = [];
    for (const [kw, weight] of Object.entries(keywords)) {
      const inCat = countOccurrences(catBlob, kw);
      const inTitle = countOccurrences(titleBlob, kw);
      const inDesc = countOccurrences(descBlob, kw);
      if (inCat + inTitle + inDesc > 0) {
        // sourceCategory is a curated signal → 3× multiplier
        // title is shorter and more intentional → 2× multiplier
        // description is noisy → 1× multiplier
        const hits = inCat * 3 + inTitle * 2 + inDesc * 1;
        score += hits * weight;
        matched.push(kw);
      }
    }
    return { nicho, score, matched };
  });

  return scores.sort((a, b) => b.score - a.score);
}

/**
 * Detect the canonical niche from a raw text blob (title + description +
 * source category). Returns one of NICHE_BENCHMARKS slugs, defaulting to
 * 'otros' when nothing matches.
 */
function detectNiche({ title = '', description = '', sourceCategory = '' }) {
  const scored = scoreNiches({ title, description, sourceCategory });
  if (!scored.length || scored[0].score === 0) return 'otros';
  return scored[0].nicho;
}

/**
 * Detect the email provider from the newsletter URL.
 */
function detectProvider(url) {
  if (!url || typeof url !== 'string') return 'other';
  for (const { provider, match } of PROVIDER_RULES) {
    if (match.test(url)) return provider;
  }
  return 'other';
}

/**
 * Extract free-form tags from a raw text blob. Returns up to 8 deduped
 * lowercase tags (niche keywords that happen to appear in the text).
 * Prefers tags from the top-scoring niche (so the tag set aligns with the
 * assigned categoria).
 */
function extractTags({ title = '', description = '', sourceCategory = '' }) {
  const blob = normalizeText(`${sourceCategory} ${title} ${description}`);
  if (!blob) return [];

  // Score niches and take matched keywords from the top two, in order.
  const scored = scoreNiches({ title, description, sourceCategory });
  const topNiches = scored.filter((s) => s.score > 0).slice(0, 2);

  const found = new Set();
  for (const { matched } of topNiches) {
    for (const kw of matched) {
      if (found.size >= 8) break;
      if (kw.length >= 4) found.add(kw.trim());
    }
  }

  return Array.from(found);
}

/**
 * Very light language heuristic. Newsletters harvested from Spanish sources
 * default to 'es'. If obvious English markers appear in the description we
 * flip to 'en'. Good enough for the current seed pipeline; proper detection
 * can be added later.
 */
function detectLanguage({ description = '', sourceLanguage = '' } = {}) {
  if (sourceLanguage && sourceLanguage.length === 2) return sourceLanguage.toLowerCase();
  const blob = normalizeText(description);
  if (!blob) return 'es';

  const englishMarkers = [
    ' the ', ' and ', ' newsletter ', ' weekly ', ' daily ', ' about ',
    ' with ', ' from ', ' learn ', ' your ',
  ];
  let hits = 0;
  for (const m of englishMarkers) {
    if (blob.includes(m)) hits++;
  }
  return hits >= 2 ? 'en' : 'es';
}

/**
 * Clean a description: strip HTML, collapse whitespace, cap at 500 chars.
 */
function cleanDescription(raw, maxLen = 500) {
  const cleaned = stripHtml(raw);
  if (cleaned.length <= maxLen) return cleaned;
  return cleaned.slice(0, maxLen - 1).trim() + '…';
}

/**
 * Build a URL-safe slug from a newsletter name. Used as the stable
 * identifier when the source doesn't provide one (e.g. editorial seed lists).
 */
function slugify(name) {
  if (!name || typeof name !== 'string') return '';
  return normalizeText(name)
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60);
}

/**
 * Classify a raw newsletter record. Input keys are loose — the function
 * handles any of: title/name, description/about/bio, category/categoria/tag,
 * url/link/homepage, language/idioma.
 *
 * Output is a canonical record ready to be stored in ChannelCandidate.raw_metrics
 * and/or used to create a Canal.
 */
function classifyNewsletter(raw = {}) {
  const title = (raw.title || raw.name || raw.nombre || '').trim();
  const rawDescription = raw.description || raw.about || raw.bio || raw.summary || '';
  const description = cleanDescription(rawDescription);
  const url = (raw.url || raw.link || raw.homepage || raw.website || '').trim();
  // Accept both "category" (short form used by some seeds) and "rawCategory"
  // (the canonical field used by ohmynewst and the editorial seed lists).
  const sourceCategory =
    raw.rawCategory || raw.category || raw.categoria || raw.tag || '';

  // Explicit provider on the raw seed takes precedence over URL detection.
  // This lets editorial seeds (e.g. LinkedIn newsletters without a verified
  // URL) preserve their provider without needing a valid URL to parse.
  const detectedProvider = detectProvider(url);
  const provider =
    raw.provider && raw.provider !== 'other'
      ? raw.provider
      : detectedProvider;

  const categoria = detectNiche({ title, description, sourceCategory });
  const tags = extractTags({ title, description, sourceCategory });
  const idioma = detectLanguage({ description, sourceLanguage: raw.language || raw.idioma });

  // Slug: prefer an explicit slug from the source, then try to parse it from
  // the URL, finally fall back to slugifying the title.
  let slug = (raw.slug || raw.username || '').toLowerCase().trim();
  if (!slug && url) {
    const m = url.match(/^https?:\/\/([^./]+)\.(substack|beehiiv|ghost)\./i);
    if (m) slug = m[1].toLowerCase();
  }
  if (!slug) slug = slugify(title);

  return {
    slug,
    title: title || slug,
    description,
    url,
    provider,
    plataforma: 'newsletter',
    categoria,
    tags,
    idioma,
    subscribers: Number.isFinite(raw.subscribers) ? raw.subscribers : (Number(raw.subscribers) || 0),
    frequency: raw.frequency || raw.frecuencia || '',
    rawCategory: sourceCategory,
  };
}

module.exports = {
  classifyNewsletter,
  detectNiche,
  detectProvider,
  detectLanguage,
  extractTags,
  scoreNiches,
  cleanDescription,
  stripHtml,
  normalizeText,
  slugify,
  NICHE_KEYWORDS,
  PROVIDER_RULES,
};
