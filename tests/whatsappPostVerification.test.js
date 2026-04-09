const {
  verifyPostPublication,
  parseSeguidores,
  procesarScreenshotOCR,
  crossValidarMetricas,
  generarInformeVerificado,
  parseWhatsAppUrl,
  extractWhatsAppMetadata,
} = require('../services/whatsappPostVerification');

// ─── parseSeguidores ─────────────────────────────────────────────────────
describe('parseSeguidores', () => {
  test('"21K followers" → 21000', () => {
    expect(parseSeguidores('21K followers')).toBe(21000);
  });

  test('"1.2M followers" → 1200000 (Anglo decimal)', () => {
    expect(parseSeguidores('1.2M followers')).toBe(1200000);
  });

  test('"1,2M" → 1200000 (European decimal)', () => {
    expect(parseSeguidores('1,2M')).toBe(1200000);
  });

  test('"21.000 seguidores" → 21000 (European thousands separator)', () => {
    expect(parseSeguidores('21.000 seguidores')).toBe(21000);
  });

  test('"21,000 followers" → 21000 (Anglo thousands separator)', () => {
    expect(parseSeguidores('21,000 followers')).toBe(21000);
  });

  test('"890 followers" → 890', () => {
    expect(parseSeguidores('890 followers')).toBe(890);
  });

  test('"890" → 890', () => {
    expect(parseSeguidores('890')).toBe(890);
  });

  test('"1.250.000" → 1250000 (triple-group European)', () => {
    expect(parseSeguidores('1.250.000')).toBe(1250000);
  });

  test('"1,250,000" → 1250000 (triple-group Anglo)', () => {
    expect(parseSeguidores('1,250,000')).toBe(1250000);
  });

  test('null / undefined / empty → null', () => {
    expect(parseSeguidores(null)).toBeNull();
    expect(parseSeguidores(undefined)).toBeNull();
    expect(parseSeguidores('')).toBeNull();
  });

  test('non-numeric garbage → null', () => {
    expect(parseSeguidores('muchos')).toBeNull();
  });
});

// ─── parseWhatsAppUrl + extractWhatsAppMetadata ──────────────────────────
describe('parseWhatsAppUrl', () => {
  test('extracts channelId and postNum', () => {
    const p = parseWhatsAppUrl('https://whatsapp.com/channel/0029Va9qABCD1234EFG/42');
    expect(p.channelId).toBe('0029Va9qABCD1234EFG');
    expect(p.postNum).toBe(42);
  });

  test('channel URL without post number', () => {
    const p = parseWhatsAppUrl('https://whatsapp.com/channel/abc-123');
    expect(p.channelId).toBe('abc-123');
    expect(p.postNum).toBeNull();
  });

  test('non-WhatsApp URL returns null', () => {
    expect(parseWhatsAppUrl('https://t.me/something')).toBeNull();
    expect(parseWhatsAppUrl('garbage')).toBeNull();
  });
});

describe('extractWhatsAppMetadata', () => {
  test('reads og:title and follower count from description', () => {
    const html = `<html><head>
      <meta property="og:title" content="Crypto News Daily" />
      <meta property="og:description" content="21K followers · Daily crypto updates" />
    </head></html>`;
    const meta = extractWhatsAppMetadata(html);
    expect(meta.nombre).toBe('Crypto News Daily');
    expect(meta.seguidores).toBe(21000);
  });

  test('falls back to generic pattern when og:description is absent', () => {
    const html = `<html><body>Our channel has 12.500 seguidores and growing.</body></html>`;
    const meta = extractWhatsAppMetadata(html);
    expect(meta.seguidores).toBe(12500);
  });

  test('returns seguidores: null when follower count cannot be extracted', () => {
    const html = `<html><head><title>Weird Page</title></head></html>`;
    const meta = extractWhatsAppMetadata(html);
    expect(meta.seguidores).toBeNull();
    expect(meta.nombre).toBe('Weird Page');
  });
});

// ─── verifyPostPublication ───────────────────────────────────────────────
describe('verifyPostPublication', () => {
  const originalFetch = global.fetch;
  afterEach(() => { global.fetch = originalFetch; });

  test('invalid URL returns verificado:false with motivo url_invalida', async () => {
    const result = await verifyPostPublication('not-a-url');
    expect(result.verificado).toBe(false);
    expect(result.motivo).toBe('url_invalida');
  });

  test('successful fetch with parseable HTML returns verificado:true with data', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      text: async () => `<html>
        <meta property="og:title" content="Test Channel" />
        <meta property="og:description" content="1.2K followers test" />
      </html>`,
    });
    const result = await verifyPostPublication('https://whatsapp.com/channel/abc123/7');
    expect(result.verificado).toBe(true);
    expect(result.channelId).toBe('abc123');
    expect(result.postNum).toBe(7);
    expect(result.seguidores).toBe(1200);
    expect(result.nombre).toBe('Test Channel');
  });

  test('successful fetch with unparseable follower count still returns verificado:true and seguidores:null', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      text: async () => `<html><body>Broken page without metadata</body></html>`,
    });
    const result = await verifyPostPublication('https://whatsapp.com/channel/xyz/1');
    expect(result.verificado).toBe(true);
    expect(result.seguidores).toBeNull();
  });

  test('HTTP failure sets verificado:false with http_XXX motivo', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: false,
      status: 404,
      text: async () => '',
    });
    const result = await verifyPostPublication('https://whatsapp.com/channel/abc');
    expect(result.verificado).toBe(false);
    expect(result.motivo).toBe('http_404');
  });

  test('fetch exception sets verificado:false with motivo fetch_error', async () => {
    global.fetch = jest.fn().mockRejectedValue(new Error('network down'));
    const result = await verifyPostPublication('https://whatsapp.com/channel/abc');
    expect(result.verificado).toBe(false);
    expect(result.motivo).toBe('fetch_error');
    expect(result.mensaje).toBe('network down');
  });
});

// ─── procesarScreenshotOCR ───────────────────────────────────────────────
describe('procesarScreenshotOCR', () => {
  test('returns null fields when imageBuffer is missing', async () => {
    const result = await procesarScreenshotOCR(null);
    expect(result.views).toBeNull();
    expect(result.reacciones).toBeNull();
    expect(result.confianza).toBe('baja');
  });

  test('parses views + reactions from Spanish WhatsApp screenshot text', async () => {
    const mockOcr = async () => '12.500 vistas\n350 reacciones';
    const result = await procesarScreenshotOCR(Buffer.from('x'), { ocrFn: mockOcr });
    expect(result.views).toBe(12500);
    expect(result.reacciones).toBe(350);
    expect(result.confianza).toBe('alta');
  });

  test('parses English WhatsApp screenshot text', async () => {
    const mockOcr = async () => '21K views · 90 reactions';
    const result = await procesarScreenshotOCR(Buffer.from('x'), { ocrFn: mockOcr });
    expect(result.views).toBe(21000);
    expect(result.reacciones).toBe(90);
    expect(result.confianza).toBe('alta');
  });

  test('media confianza when only one metric is detected', async () => {
    const mockOcr = async () => '3.400 visualizaciones';
    const result = await procesarScreenshotOCR(Buffer.from('x'), { ocrFn: mockOcr });
    expect(result.views).toBe(3400);
    expect(result.reacciones).toBeNull();
    expect(result.confianza).toBe('media');
  });

  test('baja confianza when nothing is detected', async () => {
    const mockOcr = async () => 'gibberish unrelated content';
    const result = await procesarScreenshotOCR(Buffer.from('x'), { ocrFn: mockOcr });
    expect(result.views).toBeNull();
    expect(result.reacciones).toBeNull();
    expect(result.confianza).toBe('baja');
  });

  test('OCR failure is caught and surfaces as structured error', async () => {
    const mockOcr = async () => { throw new Error('wasm blew up'); };
    const result = await procesarScreenshotOCR(Buffer.from('x'), { ocrFn: mockOcr });
    expect(result.confianza).toBe('baja');
    expect(result.error).toBeDefined();
  });

  test('recognizes Spanish "reproducciones" variant', async () => {
    const mockOcr = async () => '8.000 reproducciones · 12 me gusta';
    const result = await procesarScreenshotOCR(Buffer.from('x'), { ocrFn: mockOcr });
    expect(result.views).toBe(8000);
    expect(result.reacciones).toBe(12);
  });
});

// ─── crossValidarMetricas ────────────────────────────────────────────────
describe('crossValidarMetricas', () => {
  test('normal case within niche band yields reasonable score', () => {
    const result = crossValidarMetricas({
      views: 5000, clicks: 110, seguidores: 21000,
      nicho: 'crypto', fuenteDatos: 'screenshot_ocr',
    });
    expect(result.flagFraude).toBe(false);
    expect(result.confianzaScore).toBeGreaterThanOrEqual(60);
    expect(result.CTRImplicito).toBeCloseTo(0.022, 3);
  });

  test('impossibly high CTR triggers flagFraude and penalty', () => {
    const result = crossValidarMetricas({
      views: 100, clicks: 90, seguidores: 21000,
      nicho: 'crypto', fuenteDatos: 'screenshot_ocr',
    });
    expect(result.flagFraude).toBe(true);
    expect(result.tipoFlag).toBe('alto');
  });

  test('admin_directo source starts with highest base score', () => {
    const resAdmin = crossValidarMetricas({
      views: 5000, clicks: 110, seguidores: 21000,
      nicho: 'crypto', fuenteDatos: 'admin_directo',
    });
    const resOcr = crossValidarMetricas({
      views: 5000, clicks: 110, seguidores: 21000,
      nicho: 'crypto', fuenteDatos: 'screenshot_ocr',
    });
    expect(resAdmin.confianzaScore).toBeGreaterThan(resOcr.confianzaScore);
  });

  test('zero views never produces Infinity or NaN', () => {
    const result = crossValidarMetricas({
      views: 0, clicks: 50, seguidores: 10000, nicho: 'crypto',
    });
    expect(Number.isFinite(result.CTRImplicito)).toBe(true);
    expect(result.CTRImplicito).toBe(0);
    expect(Number.isFinite(result.viewRate)).toBe(true);
  });

  test('unknown niche falls back to otros silently', () => {
    const result = crossValidarMetricas({
      views: 5000, clicks: 100, seguidores: 20000, nicho: 'moda',
    });
    expect(result.confianzaScore).toBeGreaterThanOrEqual(0);
    expect(result.confianzaScore).toBeLessThanOrEqual(100);
  });

  test('confianzaScore is always clamped to [0, 100]', () => {
    const overshoot = crossValidarMetricas({
      views: 5000, clicks: 100, seguidores: 20000,
      nicho: 'crypto', fuenteDatos: 'admin_directo',
    });
    expect(overshoot.confianzaScore).toBeLessThanOrEqual(100);

    const undershoot = crossValidarMetricas({
      views: 10, clicks: 9, seguidores: 10,
      nicho: 'crypto', fuenteDatos: 'declarado',
    });
    expect(undershoot.confianzaScore).toBeGreaterThanOrEqual(0);
  });
});

// ─── generarInformeVerificado ────────────────────────────────────────────
describe('generarInformeVerificado', () => {
  const canal = {
    nombreCanal: 'Crypto Daily',
    plataforma: 'whatsapp',
    categoria: 'crypto',
    CAS: 72,
    nivel: 'GOLD',
  };
  const campania = { publishedAt: new Date('2026-03-20'), urlPublica: 'https://whatsapp.com/channel/abc/5' };

  test('happy path — produces a full report with no advertencia', () => {
    const metricas = { views: 5000, clicksVerificados: 110, reacciones: 200, postNum: 5 };
    const validacion = { confianzaScore: 82, flagFraude: false, detalle: { fuenteBase: 'screenshot_ocr' } };
    const informe = generarInformeVerificado({ canal, campania, metricas, validacion });

    expect(informe.verificadoPor).toBe('ChannelAd');
    expect(informe.canal.nombre).toBe('Crypto Daily');
    expect(informe.canal.CAS).toBe(72);
    expect(informe.metricas.views).toBe(5000);
    expect(informe.metricas.clicksVerificados).toBe(110);
    expect(informe.metricas.CTR).toBeCloseTo(0.022, 4);
    expect(informe.metricas.CTRvsBenchmark).toMatch(/^[+-]?\d/);
    expect(informe.confianzaScore).toBe(82);
    expect(informe.advertencia).toBeNull();
    expect(informe.fuenteDatos).toBe('screenshot_ocr');
  });

  test('flagFraude triggers a NEUTRAL advertencia (no direct accusation)', () => {
    const metricas = { views: 5000, clicksVerificados: 110, reacciones: 0 };
    const validacion = { confianzaScore: 40, flagFraude: true, detalle: { fuenteBase: 'screenshot_ocr' } };
    const informe = generarInformeVerificado({ canal, campania, metricas, validacion });

    expect(informe.advertencia).toBeDefined();
    // Must NOT contain accusatory words.
    expect(informe.advertencia).not.toMatch(/fraude/i);
    expect(informe.advertencia).not.toMatch(/fake/i);
    expect(informe.advertencia).not.toMatch(/falso/i);
    // Must mention review.
    expect(informe.advertencia).toMatch(/revisa/i);
  });

  test('exposes the CAMPAIGN confianzaScore, distinct from the channel one', () => {
    const canalWithScore = { ...canal, confianzaScore: 95 }; // channel-level
    const metricas = { views: 5000, clicksVerificados: 110 };
    const validacion = { confianzaScore: 60, flagFraude: false, detalle: { fuenteBase: 'screenshot_ocr' } };
    const informe = generarInformeVerificado({ canal: canalWithScore, campania, metricas, validacion });

    // The report uses the CAMPAIGN-level validacion.confianzaScore, NOT
    // the channel-level canal.confianzaScore.
    expect(informe.confianzaScore).toBe(60);
    expect(informe.confianzaScore).not.toBe(canalWithScore.confianzaScore);
  });

  test('CTR is 0 when views = 0 (no Infinity)', () => {
    const metricas = { views: 0, clicksVerificados: 50 };
    const validacion = { confianzaScore: 40, flagFraude: false };
    const informe = generarInformeVerificado({ canal, campania, metricas, validacion });
    expect(informe.metricas.CTR).toBe(0);
    expect(Number.isFinite(informe.metricas.CTR)).toBe(true);
  });
});
