/**
 * emailService.renderTemplate — currency display + HTML-injection hardening.
 *
 * Two regressions guarded here, both surfaced once real campaign lifecycle
 * emails started routing through these templates (PR #97):
 *
 *  1. Currency symbol. The platform charges in EUR, but several price slots
 *     hard-coded a literal "$" before the amount. They must render "€…".
 *
 *  2. Stored→email HTML injection. renderTemplate interpolated every variable
 *     raw, so advertiser-controlled ad copy / display names could inject markup
 *     (or break out of href attributes) into outbound email. Per-variable values
 *     must now be HTML-escaped — without double-encoding template entities (&euro;)
 *     or the trusted {{CONTENT}} layout slot.
 *
 * The module exports a singleton. Under NODE_ENV=test (jest default) and with
 * EMAIL_PROVIDER unset, no transporter is created and verifyConexion is skipped,
 * so requiring it performs no network I/O. renderTemplate only reads template
 * files + does string substitution, so we can call it directly.
 */
const emailService = require('../services/emailService');

describe('renderTemplate — EUR currency symbol', () => {
  test('campana-creada renders €price, never $price', async () => {
    const html = await emailService.renderTemplate('campana-creada', {
      creatorName: 'Ana',
      advertiserName: 'Marca',
      channelName: 'Canal',
      content: 'Texto',
      price: '45.00',
      deadline: '5 de junio',
      campaignUrl: 'https://channelad.io/campanas/1',
    });
    expect(html).toContain('&euro;45.00');
    expect(html).not.toContain('$45.00');
    // The euro entity must not be double-escaped by the escaping pass.
    expect(html).not.toContain('&amp;euro;');
  });

  test('campana-pagada, campana-completada, campana-cancelada, retiro-procesado all use €', async () => {
    const pagada = await emailService.renderTemplate('campana-pagada', { price: '10.00' });
    expect(pagada).toContain('&euro;10.00');
    expect(pagada).not.toContain('$10.00');

    const completada = await emailService.renderTemplate('campana-completada', {
      price: '20.00',
      netAmount: '16.40',
    });
    expect(completada).toContain('&euro;20.00');
    expect(completada).toContain('&euro;16.40');
    expect(completada).not.toContain('$20.00');
    expect(completada).not.toContain('$16.40');

    const cancelada = await emailService.renderTemplate('campana-cancelada', { refundAmount: '30.00' });
    expect(cancelada).toContain('&euro;30.00');
    expect(cancelada).not.toContain('$30.00');

    const retiro = await emailService.renderTemplate('retiro-procesado', { amount: '99.99' });
    expect(retiro).toContain('&euro;99.99');
    expect(retiro).not.toContain('$99.99');
  });
});

describe('renderTemplate — HTML escaping of interpolated values', () => {
  test('advertiser-controlled content and names are escaped, not injected', async () => {
    const html = await emailService.renderTemplate('campana-creada', {
      creatorName: 'Ana',
      advertiserName: '<script>alert(1)</script>',
      channelName: 'Canal',
      content: `<b>x</b>&"'`,
      price: '45.00',
      deadline: 'hoy',
      campaignUrl: 'https://channelad.io/campanas/1',
    });

    // The five HTML-significant chars are encoded…
    expect(html).toContain(`&lt;b&gt;x&lt;/b&gt;&amp;&quot;&#39;`);
    expect(html).toContain('&lt;script&gt;alert(1)&lt;/script&gt;');

    // …and the raw markup never reaches the output.
    expect(html).not.toContain('<b>x</b>');
    expect(html).not.toContain('<script>alert(1)</script>');
  });

  test('"$" sequences in user content are inserted literally (not treated as replace patterns)', async () => {
    const html = await emailService.renderTemplate('campana-creada', {
      creatorName: 'Ana',
      advertiserName: 'Marca',
      channelName: 'Canal',
      content: 'Oferta $& $1 $`',
      price: '45.00',
      deadline: 'hoy',
      campaignUrl: 'https://channelad.io/campanas/1',
    });
    // The literal "$" chars survive (function replacer, not string-pattern
    // substitution), while the embedded "&" is HTML-escaped to "&amp;". If "$&"
    // had been interpreted as a replace pattern, the matched {{content}} token
    // would have leaked instead.
    expect(html).toContain('Oferta $&amp; $1 $`');
  });

  test('trusted template entities and layout are preserved', async () => {
    const html = await emailService.renderTemplate('campana-creada', {
      creatorName: 'Ana',
      advertiserName: 'Marca',
      channelName: 'Canal',
      content: 'Texto',
      price: '45.00',
      deadline: 'hoy',
      campaignUrl: 'https://channelad.io/campanas/1',
    });
    // Template-authored entities survive intact (no double-encoding).
    expect(html).toContain('Nueva campa&ntilde;a');
    expect(html).not.toContain('&amp;ntilde;');
    // The href is intact and usable.
    expect(html).toContain('href="https://channelad.io/campanas/1"');
  });
});
