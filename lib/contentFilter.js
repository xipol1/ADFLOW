/**
 * Content Filter · detecta términos prohibidos en el copy.
 *
 * Listas por categoría con word boundaries. Bilingüe ES+EN.
 * Devuelve TODOS los flags (no para en el primero) para diagnóstico.
 *
 * NO sustituye revisión humana — un usuario ingenioso escribirá c4s1n0
 * para evadir. Defense in depth: blocklist URL + content filter +
 * moderación humana + reportes.
 */

const RULES = {
  gambling: {
    severity: 'block',
    terms: [
      'apuesta', 'apuestas', 'casino', 'casinos', 'ruleta', 'tragaperras',
      'jackpot', 'póker en línea', 'poker online',
      'bono de bienvenida', 'bono sin depósito',
      'gambling', 'betting', 'wager', 'sportsbook',
      'slot machine', 'free spins', 'no deposit bonus',
    ],
  },
  adult: {
    severity: 'block',
    terms: [
      'porno', 'pornografía', 'sexual explícito', 'webcam erótica',
      'sexo en vivo', 'escort', 'prostitución', 'contenido para adultos',
      'porn', 'pornography', 'xxx', 'adult content', 'nsfw video',
      'cam girl', 'sex chat', 'escort service', 'onlyfans creator',
    ],
  },
  drugs: {
    severity: 'block',
    terms: [
      'cocaína', 'heroína', 'marihuana premium', 'comprar marihuana',
      'venta de droga', 'éxtasis pastilla',
      'cocaine', 'heroin', 'meth ', 'mdma',
      'buy weed', 'buy drugs', 'illegal substance',
    ],
  },
  weapons: {
    severity: 'block',
    terms: [
      'comprar arma', 'arma de fuego', 'pistola sin licencia', 'munición ilegal',
      'buy firearm', 'unlicensed gun', 'ghost gun', 'untraceable firearm',
      'illegal ammo',
    ],
  },
  fraud: {
    severity: 'warning',
    terms: [
      'ganar dinero rápido garantizado', 'inversión 100% segura',
      'duplica tu dinero en', 'sin riesgo garantizado', 'esquema',
      'guaranteed profit', 'risk-free investment', 'double your money',
      'pyramid scheme', 'ponzi',
      'cash advance loan', 'no credit check loan',
    ],
  },
  hate: {
    severity: 'block',
    terms: [
      'supremacía blanca', 'supremacía negra', 'limpieza étnica',
      'white supremacy', 'ethnic cleansing', 'genocide denial',
    ],
  },
};

const escapeRegex = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const compileRule = (entry) => {
  if (entry instanceof RegExp) return entry;
  return new RegExp(`\\b${escapeRegex(entry)}\\b`, 'iu');
};

const COMPILED = Object.fromEntries(
  Object.entries(RULES).map(([category, { severity, terms }]) => [
    category,
    { severity, regexes: terms.map(compileRule), rawTerms: terms },
  ])
);

function checkContent(text) {
  const haystack = String(text || '');
  const flags = [];

  if (!haystack.trim()) {
    return { allowed: true, blocked: false, warnings: 0, flags: [] };
  }

  for (const [category, { severity, regexes }] of Object.entries(COMPILED)) {
    for (const re of regexes) {
      const m = haystack.match(re);
      if (m) {
        flags.push({
          category,
          severity,
          match: m[0],
          index: m.index ?? -1,
        });
      }
    }
  }

  const hasBlock = flags.some((f) => f.severity === 'block');
  return {
    allowed: !hasBlock,
    blocked: hasBlock,
    warnings: flags.filter((f) => f.severity === 'warning').length,
    flags,
  };
}

function checkContentPieces(pieces) {
  for (const { label, text } of pieces) {
    const r = checkContent(text);
    if (!r.allowed) {
      return {
        allowed: false,
        piece: label,
        category: r.flags.find((f) => f.severity === 'block')?.category,
        match: r.flags.find((f) => f.severity === 'block')?.match,
        flags: r.flags,
      };
    }
  }
  return { allowed: true };
}

function listCategories() {
  return Object.keys(RULES);
}

module.exports = {
  checkContent,
  checkContentPieces,
  listCategories,
  RULES,
};
