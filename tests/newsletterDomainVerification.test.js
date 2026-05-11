/**
 * Newsletter domain verification tests.
 *
 * Covers:
 *   - Domain normalization + shape validation
 *   - startChallenge: persists token, rejects bad input
 *   - checkDnsChallenge: TXT match → promotes, mismatch → no-op, expired → fail
 *   - buildEmailToken / confirmEmailToken round-trip
 *   - confirmEmailToken: nonce rotation invalidates old links
 */

const jwt = require('jsonwebtoken');

// JWT_SECRET must be set before importing the service so _jwtSecret doesn't
// throw at construct time on the email path.
process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-secret-with-enough-entropy-1234567890';

const svc = require('../services/newsletter/domainVerificationService');

function makeCanal(overrides = {}) {
  return {
    _id: 'canal-id',
    plataforma: 'newsletter',
    propietario: 'owner',
    nombreCanal: 'Test Newsletter',
    estadisticas: { seguidores: 1000 },
    verificado: false,
    verificacion: { tipoAcceso: 'declarado', confianzaScore: 25 },
    newsletterVerification: {},
    save: jest.fn().mockResolvedValue(true),
    ...overrides,
  };
}

describe('domain normalization', () => {
  test('strips scheme, www, trailing slash, lowercases', () => {
    expect(svc._normalizeDomain('https://www.Example.com/')).toBe('example.com');
    expect(svc._normalizeDomain('HTTP://sub.foo.bar/path')).toBe('sub.foo.bar');
    expect(svc._normalizeDomain('  Example.org  ')).toBe('example.org');
  });

  test('isValidDomain accepts FQDNs', () => {
    expect(svc._isValidDomain('example.com')).toBe(true);
    expect(svc._isValidDomain('news.sub.example.io')).toBe(true);
  });

  test('isValidDomain rejects obviously bogus input', () => {
    expect(svc._isValidDomain('')).toBe(false);
    expect(svc._isValidDomain('localhost')).toBe(false);
    expect(svc._isValidDomain('no spaces.com')).toBe(false);
    expect(svc._isValidDomain('-leading.com')).toBe(false);
    expect(svc._isValidDomain('trailing-.com')).toBe(false);
  });
});

describe('startChallenge', () => {
  test('rejects invalid domain', async () => {
    const canal = makeCanal();
    await expect(svc.startChallenge(canal, { domain: 'not a domain', method: 'dns' }))
      .rejects.toMatchObject({ code: 'INVALID_DOMAIN' });
    expect(canal.save).not.toHaveBeenCalled();
  });

  test('rejects invalid method', async () => {
    const canal = makeCanal();
    await expect(svc.startChallenge(canal, { domain: 'example.com', method: 'sms' }))
      .rejects.toMatchObject({ code: 'INVALID_METHOD' });
  });

  test('rejects non-newsletter canals', async () => {
    const canal = makeCanal({ plataforma: 'telegram' });
    await expect(svc.startChallenge(canal, { domain: 'example.com', method: 'dns' }))
      .rejects.toMatchObject({ code: 'WRONG_PLATFORM' });
  });

  test('persists token and returns TXT record for DNS method', async () => {
    const canal = makeCanal();
    const result = await svc.startChallenge(canal, { domain: 'Example.com', method: 'dns' });

    expect(result.domain).toBe('example.com');
    expect(result.method).toBe('dns');
    expect(result.token).toMatch(/^[a-f0-9]{32}$/);
    expect(result.txtRecord).toBe(`channelad-verify=${result.token}`);
    expect(canal.newsletterVerification.challengeToken).toBe(result.token);
    expect(canal.save).toHaveBeenCalled();
  });

  test('email method omits txtRecord', async () => {
    const canal = makeCanal();
    const result = await svc.startChallenge(canal, { domain: 'example.com', method: 'email' });
    expect(result.txtRecord).toBeNull();
  });

  test('regenerates token on re-start (invalidates old proof)', async () => {
    const canal = makeCanal();
    const a = await svc.startChallenge(canal, { domain: 'example.com', method: 'dns' });
    const b = await svc.startChallenge(canal, { domain: 'example.com', method: 'dns' });
    expect(a.token).not.toBe(b.token);
  });
});

describe('checkDnsChallenge', () => {
  function fakeResolver(records) {
    return { resolveTxt: jest.fn().mockResolvedValue(records) };
  }

  test('returns NO_CHALLENGE if no challenge started', async () => {
    const canal = makeCanal();
    const result = await svc.checkDnsChallenge(canal, { resolver: fakeResolver([]) });
    expect(result).toMatchObject({ ok: false, code: 'NO_CHALLENGE' });
  });

  test('returns WRONG_METHOD if active challenge is email', async () => {
    const canal = makeCanal({
      newsletterVerification: {
        domain: 'example.com',
        method: 'email',
        challengeToken: 'abc',
        challengeStartedAt: new Date(),
      },
    });
    const result = await svc.checkDnsChallenge(canal, { resolver: fakeResolver([]) });
    expect(result.code).toBe('WRONG_METHOD');
  });

  test('promotes canal when TXT matches', async () => {
    const canal = makeCanal({
      newsletterVerification: {
        domain: 'example.com',
        method: 'dns',
        challengeToken: 'tok123',
        challengeStartedAt: new Date(),
        attempts: 0,
      },
    });
    const resolver = fakeResolver([
      ['v=spf1 include:_spf.google.com ~all'],
      ['channelad-verify=tok123'],
    ]);
    const result = await svc.checkDnsChallenge(canal, { resolver });
    expect(result).toMatchObject({ ok: true, code: 'VERIFIED' });
    expect(canal.verificado).toBe(true);
    expect(canal.verificacion.tipoAcceso).toBe('admin_directo');
    expect(canal.verificacion.confianzaScore).toBeGreaterThanOrEqual(80);
    expect(canal.newsletterVerification.verifiedAt).toBeInstanceOf(Date);
  });

  test('handles TXT records split across strings (RFC 7208 concat)', async () => {
    const canal = makeCanal({
      newsletterVerification: {
        domain: 'example.com',
        method: 'dns',
        challengeToken: 'tok123',
        challengeStartedAt: new Date(),
      },
    });
    // Some DNS providers chunk long TXT into 255-byte segments; resolveTxt
    // returns them as a tuple we must concat client-side.
    const resolver = fakeResolver([['channelad-verify=', 'tok123']]);
    const result = await svc.checkDnsChallenge(canal, { resolver });
    expect(result.ok).toBe(true);
    expect(canal.verificado).toBe(true);
  });

  test('TOKEN_MISMATCH when TXT is absent', async () => {
    const canal = makeCanal({
      newsletterVerification: {
        domain: 'example.com',
        method: 'dns',
        challengeToken: 'tok123',
        challengeStartedAt: new Date(),
      },
    });
    const resolver = fakeResolver([['v=spf1 ~all']]);
    const result = await svc.checkDnsChallenge(canal, { resolver });
    expect(result.code).toBe('TOKEN_MISMATCH');
    expect(canal.verificado).toBe(false);
    expect(canal.newsletterVerification.attempts).toBe(1);
  });

  test('expired challenge fails without DNS call', async () => {
    const canal = makeCanal({
      newsletterVerification: {
        domain: 'example.com',
        method: 'dns',
        challengeToken: 'tok123',
        challengeStartedAt: new Date(Date.now() - svc.CHALLENGE_TTL_MS - 1000),
      },
    });
    const resolver = fakeResolver([]);
    const result = await svc.checkDnsChallenge(canal, { resolver });
    expect(result.code).toBe('EXPIRED');
    expect(resolver.resolveTxt).not.toHaveBeenCalled();
  });

  test('DNS errors surface as NO_TXT_RECORDS or DNS_ERROR', async () => {
    const canal = makeCanal({
      newsletterVerification: {
        domain: 'example.com',
        method: 'dns',
        challengeToken: 'tok123',
        challengeStartedAt: new Date(),
      },
    });
    const err = new Error('queryTxt ENOTFOUND example.com');
    err.code = 'ENOTFOUND';
    const resolver = { resolveTxt: jest.fn().mockRejectedValue(err) };
    const result = await svc.checkDnsChallenge(canal, { resolver });
    expect(result.code).toBe('NO_TXT_RECORDS');
  });
});

describe('email confirmation round-trip', () => {
  test('resolveRecipient builds correct address', () => {
    const canal = makeCanal({
      newsletterVerification: { domain: 'example.com', method: 'email', challengeToken: 't' },
    });
    expect(svc.resolveRecipient(canal, 'admin')).toBe('admin@example.com');
    expect(svc.resolveRecipient(canal, 'postmaster')).toBe('postmaster@example.com');
    // default
    expect(svc.resolveRecipient(canal)).toBe('admin@example.com');
  });

  test('resolveRecipient rejects arbitrary mailboxes', () => {
    const canal = makeCanal({
      newsletterVerification: { domain: 'example.com', method: 'email', challengeToken: 't' },
    });
    expect(() => svc.resolveRecipient(canal, 'attacker'))
      .toThrow(/no permitido/);
  });

  test('buildEmailToken + confirmEmailToken happy path', async () => {
    const canal = makeCanal({
      newsletterVerification: {
        domain: 'example.com',
        method: 'email',
        challengeToken: 'nonce-xyz',
        challengeStartedAt: new Date(),
      },
    });
    const token = svc.buildEmailToken(canal);

    const CanalModel = {
      findById: jest.fn().mockResolvedValue(canal),
    };
    const result = await svc.confirmEmailToken(token, { CanalModel });
    expect(result).toMatchObject({ ok: true, code: 'VERIFIED' });
    expect(canal.verificado).toBe(true);
  });

  test('confirmEmailToken: NONCE_MISMATCH if challenge was re-started', async () => {
    const canal = makeCanal({
      newsletterVerification: {
        domain: 'example.com',
        method: 'email',
        challengeToken: 'original-nonce',
        challengeStartedAt: new Date(),
      },
    });
    const oldToken = svc.buildEmailToken(canal);

    // Simulate user re-starting the challenge — token rotates
    canal.newsletterVerification.challengeToken = 'new-nonce';

    const CanalModel = { findById: jest.fn().mockResolvedValue(canal) };
    const result = await svc.confirmEmailToken(oldToken, { CanalModel });
    expect(result).toMatchObject({ ok: false, code: 'NONCE_MISMATCH' });
    expect(canal.verificado).toBe(false);
  });

  test('confirmEmailToken: rejects garbage JWT', async () => {
    const CanalModel = { findById: jest.fn() };
    const result = await svc.confirmEmailToken('not-a-jwt', { CanalModel });
    expect(result).toMatchObject({ ok: false, code: 'INVALID_TOKEN' });
    expect(CanalModel.findById).not.toHaveBeenCalled();
  });

  test('confirmEmailToken: rejects expired JWT', async () => {
    const expired = jwt.sign(
      { canalId: 'x', domain: 'example.com', nonce: 'n' },
      process.env.JWT_SECRET,
      { expiresIn: '-1h' }
    );
    const CanalModel = { findById: jest.fn() };
    const result = await svc.confirmEmailToken(expired, { CanalModel });
    expect(result).toMatchObject({ ok: false, code: 'EXPIRED' });
  });

  test('confirmEmailToken: rejects token signed with different secret', async () => {
    const forged = jwt.sign(
      { canalId: 'x', domain: 'example.com', nonce: 'n' },
      'attacker-controlled-secret',
      { expiresIn: '1h' }
    );
    const CanalModel = { findById: jest.fn() };
    const result = await svc.confirmEmailToken(forged, { CanalModel });
    expect(result).toMatchObject({ ok: false, code: 'INVALID_TOKEN' });
  });
});
