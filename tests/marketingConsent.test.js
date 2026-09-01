/**
 * services/marketingConsent — la puerta que decide si un email COMERCIAL puede
 * salir, y la evidencia que lo respalda.
 *
 * Lo que se blinda aquí es lo que nos costaría una reclamación: que sin opt-in
 * explícito no salga nada, que la baja lo corte, que el texto que guardamos
 * como prueba sea el que la persona vio de verdad, y que los tokens de baja no
 * se puedan falsificar ni reutilizar entre audiencias.
 *
 * Lógica pura, sin BD: `usuario` es un objeto plano con la forma de los campos
 * relevantes de Usuario.
 */
const fs = require('fs');
const path = require('path');
const marketingConsent = require('../services/marketingConsent');

const { BLOQUEO } = marketingConsent;

describe('puedeRecibirMarketing', () => {
  test('sin consentimiento no se puede enviar (por defecto y para cuentas antiguas)', () => {
    expect(marketingConsent.puedeRecibirMarketing({ email: 'a@b.com' }))
      .toEqual({ ok: false, motivo: BLOQUEO.SIN_CONSENTIMIENTO });

    // Cuenta creada antes de que existiera el campo: el bloque no está.
    expect(marketingConsent.puedeRecibirMarketing({ email: 'a@b.com', comunicaciones: {} }))
      .toEqual({ ok: false, motivo: BLOQUEO.SIN_CONSENTIMIENTO });

    expect(marketingConsent.puedeRecibirMarketing({
      email: 'a@b.com',
      comunicaciones: { marketingOptIn: false },
    })).toEqual({ ok: false, motivo: BLOQUEO.SIN_CONSENTIMIENTO });
  });

  test('con opt-in explícito sí se puede', () => {
    expect(marketingConsent.puedeRecibirMarketing({
      email: 'a@b.com',
      comunicaciones: { marketingOptIn: true },
    })).toEqual({ ok: true });
  });

  test('una baja previa bloquea aunque quede rastro del opt-in', () => {
    expect(marketingConsent.puedeRecibirMarketing({
      email: 'a@b.com',
      comunicaciones: {
        marketingOptIn: false,
        marketingOptInAt: new Date('2026-01-01'),
        marketingOptOutAt: new Date('2026-02-01'),
      },
    })).toEqual({ ok: false, motivo: BLOQUEO.BAJA });
  });

  test('cuenta desactivada o sin email nunca recibe', () => {
    expect(marketingConsent.puedeRecibirMarketing({
      email: 'a@b.com', activo: false, comunicaciones: { marketingOptIn: true },
    })).toEqual({ ok: false, motivo: BLOQUEO.CUENTA_INACTIVA });

    expect(marketingConsent.puedeRecibirMarketing({ comunicaciones: { marketingOptIn: true } }))
      .toEqual({ ok: false, motivo: BLOQUEO.SIN_EMAIL });

    expect(marketingConsent.puedeRecibirMarketing(null))
      .toEqual({ ok: false, motivo: BLOQUEO.SIN_EMAIL });
  });

  // Valores "casi true" que no son true: el consentimiento tiene que ser
  // inequívoco (art. 4.11 RGPD), así que no aceptamos coerción.
  test.each([['true'], [1], ['on'], ['sí']])('%p no cuenta como consentimiento', (valor) => {
    expect(marketingConsent.puedeRecibirMarketing({
      email: 'a@b.com',
      comunicaciones: { marketingOptIn: valor },
    }).ok).toBe(false);
  });
});

describe('buildComunicacionesIniciales', () => {
  const req = {
    headers: { 'x-forwarded-for': '203.0.113.7, 10.0.0.1', 'user-agent': 'Mozilla/5.0 (test)' },
  };

  test('sin marcar la casilla no crea consentimiento ni historial', () => {
    const c = marketingConsent.buildComunicacionesIniciales(false, req);
    expect(c.marketingOptIn).toBe(false);
    expect(c.marketingOptInAt).toBeNull();
    expect(c.historial).toEqual([]);
  });

  test('solo `true` literal genera opt-in (nada de "true" ni 1)', () => {
    expect(marketingConsent.buildComunicacionesIniciales('true', req).marketingOptIn).toBe(false);
    expect(marketingConsent.buildComunicacionesIniciales(1, req).marketingOptIn).toBe(false);
    expect(marketingConsent.buildComunicacionesIniciales(true, req).marketingOptIn).toBe(true);
  });

  test('la evidencia guarda texto literal, versión, IP real y user-agent', () => {
    const c = marketingConsent.buildComunicacionesIniciales(true, req);
    expect(c.historial).toHaveLength(1);
    const ev = c.historial[0];
    expect(ev.accion).toBe('opt_in');
    expect(ev.origen).toBe('registro');
    expect(ev.texto).toBe(marketingConsent.MARKETING_CONSENT_TEXT);
    expect(ev.version).toBe(marketingConsent.MARKETING_CONSENT_VERSION);
    // Primera IP de la cadena X-Forwarded-For, no el proxy.
    expect(ev.ip).toBe('203.0.113.7');
    expect(ev.userAgent).toBe('Mozilla/5.0 (test)');
    expect(ev.fecha).toBeInstanceOf(Date);
  });
});

describe('tokens de baja', () => {
  test('un token recién firmado se verifica y devuelve audiencia + id', () => {
    const token = marketingConsent.makeUnsubscribeToken('usuario', '507f1f77bcf86cd799439011');
    expect(marketingConsent.verifyUnsubscribeToken(token))
      .toEqual({ audiencia: 'usuario', id: '507f1f77bcf86cd799439011' });
  });

  test('firma manipulada, id cambiado o token basura → null', () => {
    const token = marketingConsent.makeUnsubscribeToken('usuario', 'abc123');
    const [aud, id, mac] = token.split('.');

    // MAC alterada manteniendo la longitud (timingSafeEqual exige igual tamaño).
    const macRota = mac.slice(0, -1) + (mac.endsWith('0') ? '1' : '0');
    expect(marketingConsent.verifyUnsubscribeToken(`${aud}.${id}.${macRota}`)).toBeNull();

    // Mismo MAC, otro id: es el ataque que evita enumerar y dar de baja a otros.
    expect(marketingConsent.verifyUnsubscribeToken(`${aud}.otroid.${mac}`)).toBeNull();

    expect(marketingConsent.verifyUnsubscribeToken('basura')).toBeNull();
    expect(marketingConsent.verifyUnsubscribeToken('')).toBeNull();
    expect(marketingConsent.verifyUnsubscribeToken(null)).toBeNull();
    expect(marketingConsent.verifyUnsubscribeToken(`${id}.${mac}`)).toBeNull();
  });

  test('las audiencias no son intercambiables', () => {
    const token = marketingConsent.makeUnsubscribeToken('usuario', 'abc123');
    const mac = token.split('.')[2];
    // Reetiquetar el token como 'lead' invalida la firma (la audiencia va dentro).
    expect(marketingConsent.verifyUnsubscribeToken(`lead.abc123.${mac}`)).toBeNull();
    expect(() => marketingConsent.makeUnsubscribeToken('otra', 'abc123')).toThrow();
  });

  test('la URL de baja apunta al endpoint público y lleva el token', () => {
    const url = marketingConsent.unsubscribeUrl('abc123', 'https://channelad.io/');
    expect(url).toMatch(/^https:\/\/channelad\.io\/api\/comunicaciones\/baja\?token=usuario\.abc123\./);
    expect(marketingConsent.verifyUnsubscribeToken(url.split('token=')[1]))
      .toEqual({ audiencia: 'usuario', id: 'abc123' });
  });
});

describe('texto del consentimiento', () => {
  // La prueba del art. 7.1 RGPD solo vale si el texto que archivamos es el que
  // la persona leyó. Si alguien reescribe el copy de la casilla en el
  // formulario y no toca la constante (o al revés), esto lo caza.
  test('el formulario de alta muestra el texto exacto que se guarda', () => {
    const jsx = fs.readFileSync(
      path.join(__dirname, '..', 'client', 'src', 'ui', 'pages', 'auth', 'AuthPage.jsx'),
      'utf8'
    );
    expect(jsx).toContain(marketingConsent.MARKETING_CONSENT_TEXT);
  });
});

describe('emailService.enviarEmailComercial (guardián de envío)', () => {
  const emailService = require('../services/emailService');

  test('no envía a quien no ha consentido y dice por qué', async () => {
    const espia = jest.spyOn(emailService, 'enviarEmail');
    const r = await emailService.enviarEmailComercial(
      { _id: 'abc123', email: 'sin-consent@example.com' },
      { asunto: 'Novedades', html: '<p>Hola</p>' }
    );
    expect(r).toEqual({ enviado: false, motivo: BLOQUEO.SIN_CONSENTIMIENTO });
    // Lo importante: ni siquiera llega a la capa de envío.
    expect(espia).not.toHaveBeenCalled();
    espia.mockRestore();
  });

  test('quien se dio de baja tampoco recibe', async () => {
    const r = await emailService.enviarEmailComercial(
      {
        _id: 'abc123',
        email: 'baja@example.com',
        comunicaciones: { marketingOptIn: false, marketingOptOutAt: new Date() },
      },
      { asunto: 'Novedades', html: '<p>Hola</p>' }
    );
    expect(r.enviado).toBe(false);
    expect(r.motivo).toBe(BLOQUEO.BAJA);
  });

  test('el pie de baja se inserta dentro del body y no se duplica', () => {
    const html = '<html><body><p>Hola</p></body></html>';
    const conPie = emailService._conPieDeBaja(html, 'https://channelad.io/baja?token=x');
    expect(conPie).toContain('https://channelad.io/baja?token=x');
    expect(conPie.indexOf('data-channelad-baja')).toBeLessThan(conPie.indexOf('</body>'));
    // Idempotente: pasarlo dos veces no añade un segundo pie.
    const dosVeces = emailService._conPieDeBaja(conPie, 'https://channelad.io/baja?token=x');
    expect(dosVeces.match(/data-channelad-baja/g)).toHaveLength(1);
  });
});
