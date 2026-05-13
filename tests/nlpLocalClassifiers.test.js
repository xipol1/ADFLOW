/**
 * Local NLP classifiers — pure unit tests, no network, no DB.
 */

const {
  runLocalClassifiers,
  detectLanguage,
  countEmojis,
  extractHashtags,
  extractMentions,
  extractDiscountCodes,
  extractPromotionalSignals,
  isLikelyPromotional,
} = require('../services/nlp/localClassifiers');

describe('detectLanguage', () => {
  test('detects Spanish from a typical promotional post', () => {
    const r = detectLanguage('Buenos días gente, hoy análisis técnico EURUSD a las 18h. ¡No os lo perdáis!');
    expect(r.lang).toBe('es');
    expect(r.source).toBe('tinyld');
  });

  test('detects English', () => {
    // Use a longer, less domain-specific English sentence to keep the
    // detector confident — financial jargon ("Bitcoin", "support levels")
    // is detected as Spanish-cognate by some lang ID models.
    const r = detectLanguage(
      'This is a fairly long English sentence intended to give the language detector plenty of context to make a confident decision about its primary language.'
    );
    expect(r.lang).toBe('en');
  });

  test('returns unknown for too-short text', () => {
    expect(detectLanguage('Hi').lang).toBe('unknown');
    expect(detectLanguage('Hi').source).toBe('too-short');
  });

  test('handles non-string input gracefully', () => {
    expect(detectLanguage(null).lang).toBe('unknown');
    expect(detectLanguage(undefined).lang).toBe('unknown');
    expect(detectLanguage(123).lang).toBe('unknown');
  });
});

describe('countEmojis', () => {
  test('counts basic emojis', () => {
    expect(countEmojis('Hola 📈🔥💰')).toBe(3);
  });

  test('zero on plain text', () => {
    expect(countEmojis('Plain ASCII text')).toBe(0);
  });

  test('handles empty string', () => {
    expect(countEmojis('')).toBe(0);
  });
});

describe('extractHashtags', () => {
  test('extracts and deduplicates', () => {
    const tags = extractHashtags('Mira #crypto y #BTC, también #crypto');
    expect(tags.sort()).toEqual(['btc', 'crypto']);
  });

  test('returns empty for no hashtags', () => {
    expect(extractHashtags('Sin hashtags aquí')).toEqual([]);
  });

  test('handles Unicode tags', () => {
    expect(extractHashtags('#España #Año2026')).toEqual(['españa', 'año2026']);
  });
});

describe('extractMentions', () => {
  test('extracts @mentions', () => {
    expect(extractMentions('Hola @rafa y @joan').sort()).toEqual(['joan', 'rafa']);
  });

  test('does not capture email addresses', () => {
    // The leading-space requirement makes "foo@bar.com" not a mention.
    expect(extractMentions('Email: foo@bar.com')).toEqual([]);
  });
});

describe('extractDiscountCodes', () => {
  test('captures uppercase code candidates', () => {
    const codes = extractDiscountCodes('Usa el código WELCOME20 para 20% de descuento');
    expect(codes).toContain('WELCOME20');
  });

  test('filters out known false positives (currencies, abbreviations)', () => {
    const codes = extractDiscountCodes('Pago en USD o EUR con HTTPS via API');
    expect(codes).not.toContain('USD');
    expect(codes).not.toContain('EUR');
    expect(codes).not.toContain('API');
    expect(codes).not.toContain('HTTPS');
  });

  test('filters out 4-letter all-uppercase acronyms', () => {
    const codes = extractDiscountCodes('OPEC and NASA');
    expect(codes).not.toContain('OPEC');
    expect(codes).not.toContain('NASA');
  });

  test('filters out pure-digit candidates', () => {
    const codes = extractDiscountCodes('En el año 2026 con código BLACK50');
    expect(codes).not.toContain('2026');
    expect(codes).toContain('BLACK50');
  });

  test('returns empty for text without codes', () => {
    expect(extractDiscountCodes('Texto normal sin códigos')).toEqual([]);
  });
});

describe('extractPromotionalSignals', () => {
  test('explicit_ad_disclosure for "patrocinado"', () => {
    expect(extractPromotionalSignals('Post patrocinado por Binance')).toContain('explicit_ad_disclosure');
  });

  test('explicit_collab for "colaboración"', () => {
    expect(extractPromotionalSignals('En colaboración con Stripe')).toContain('explicit_collab');
  });

  test('affiliate_link', () => {
    expect(extractPromotionalSignals('Soy afiliado de eToro')).toContain('affiliate_link');
  });

  test('hashtag_ad for #ad / #publicidad', () => {
    expect(extractPromotionalSignals('Producto top #ad')).toContain('hashtag_ad');
    expect(extractPromotionalSignals('Anuncio nuevo #publicidad')).toContain('hashtag_ad');
  });

  test('discount_code on "código de descuento"', () => {
    expect(extractPromotionalSignals('Usa el código de descuento BLACK20')).toContain('discount_code');
  });

  test('discount_percentage', () => {
    expect(extractPromotionalSignals('Descuento del 30%')).toContain('discount_percentage');
  });

  test('limited_time', () => {
    expect(extractPromotionalSignals('Oferta limitada solo hoy')).toContain('limited_time');
  });

  test('free_offer', () => {
    expect(extractPromotionalSignals('Curso gratis para ti')).toContain('free_offer');
  });

  test('emoji signals', () => {
    const s = extractPromotionalSignals('📢 Nueva oferta 🎁 🚨');
    expect(s).toContain('emoji_megaphone');
    expect(s).toContain('emoji_gift');
    expect(s).toContain('emoji_alarm');
  });

  test('returns empty for neutral content', () => {
    expect(extractPromotionalSignals('Análisis técnico del EURUSD. Niveles clave: 1.0820 y 1.0950.')).toEqual([]);
  });
});

describe('isLikelyPromotional heuristic', () => {
  test('explicit signal alone is enough', () => {
    expect(isLikelyPromotional(['explicit_ad_disclosure'], [])).toBe(true);
    expect(isLikelyPromotional(['affiliate_link'], [])).toBe(true);
    expect(isLikelyPromotional(['hashtag_ad'], [])).toBe(true);
  });

  test('two weak signals trigger', () => {
    expect(isLikelyPromotional(['emoji_money', 'cta_buy'], [])).toBe(true);
  });

  test('one weak signal + discount code triggers', () => {
    expect(isLikelyPromotional(['emoji_gift'], ['WELCOME20'])).toBe(true);
  });

  test('one weak signal alone is NOT enough', () => {
    expect(isLikelyPromotional(['emoji_money'], [])).toBe(false);
  });

  test('discount code alone (no signals) triggers', () => {
    expect(isLikelyPromotional([], ['WELCOME20'])).toBe(true);
  });

  test('nothing → false', () => {
    expect(isLikelyPromotional([], [])).toBe(false);
  });
});

describe('runLocalClassifiers (integration)', () => {
  test('typical promotional post — explicit disclosure', () => {
    const r = runLocalClassifiers(
      'Post patrocinado por Binance 🚨 Usa el código BTC2026 para 20% de descuento. https://binance.com'
    );
    expect(r.lang).toBe('es');
    expect(r.isLikelyPromotional).toBe(true);
    expect(r.promotionalSignals).toContain('explicit_ad_disclosure');
    expect(r.promotionalSignals).toContain('discount_code');
    expect(r.discountCodes).toContain('BTC2026');
    expect(r.emojiCount).toBeGreaterThanOrEqual(1);
  });

  test('neutral analysis post', () => {
    const r = runLocalClassifiers(
      'Análisis técnico del EURUSD diario. Niveles a vigilar: resistencia 1,0950, soporte 1,0820. Volumen confirmando estructura alcista.'
    );
    expect(r.lang).toBe('es');
    expect(r.isLikelyPromotional).toBe(false);
    expect(r.promotionalSignals).toEqual([]);
    expect(r.discountCodes).toEqual([]);
  });

  test('empty input returns sane defaults', () => {
    const r = runLocalClassifiers('');
    expect(r.lang).toBe('unknown');
    expect(r.emojiCount).toBe(0);
    expect(r.hashtags).toEqual([]);
    expect(r.mentions).toEqual([]);
    expect(r.discountCodes).toEqual([]);
    expect(r.promotionalSignals).toEqual([]);
    expect(r.isLikelyPromotional).toBe(false);
  });

  test('null/undefined input does not throw', () => {
    expect(() => runLocalClassifiers(null)).not.toThrow();
    expect(() => runLocalClassifiers(undefined)).not.toThrow();
  });
});
