/**
 * services/legalConsent — role→docs mapping + derived requiresTermsAcceptance.
 *
 * Pure logic, no DB: `user` is a plain object shaped like the relevant Usuario
 * fields ({ rol, consentimientos }). Consents are built from the live manifest
 * so the test stays correct as document versions change.
 */
const legalConsent = require('../services/legalConsent');

const fullConsents = (rol) =>
  legalConsent.requiredDocsForRole(rol).map((d) => ({ slug: d.slug, version: d.version }));

describe('requiredDocsForRole', () => {
  test('creator and advertiser have distinct, non-empty required sets', () => {
    const creator = legalConsent.requiredDocsForRole('creator').map((d) => d.slug);
    const advertiser = legalConsent.requiredDocsForRole('advertiser').map((d) => d.slug);

    expect(creator).toContain('terminos-condiciones');
    expect(creator).toContain('condiciones-creador');
    expect(creator).toContain('politica-privacidad');

    expect(advertiser).toContain('condiciones-anunciante');
    expect(advertiser).toContain('condiciones-contratacion');

    // Role-specific docs must not bleed across roles.
    expect(creator).not.toContain('condiciones-anunciante');
    expect(advertiser).not.toContain('condiciones-creador');
  });

  test('unknown roles (e.g. admin) require nothing', () => {
    expect(legalConsent.requiredDocsForRole('admin')).toEqual([]);
    expect(legalConsent.requiredDocsForRole(undefined)).toEqual([]);
  });

  test('every required doc carries a version + hash from the manifest', () => {
    for (const d of legalConsent.requiredDocsForRole('advertiser')) {
      expect(typeof d.version).toBe('string');
      expect(d.version.length).toBeGreaterThan(0);
      expect(d.hash).toMatch(/^[a-f0-9]{64}$/);
    }
  });
});

describe('requiresAcceptance (derived)', () => {
  test('no consents → requires acceptance', () => {
    expect(legalConsent.requiresAcceptance({ rol: 'creator', consentimientos: [] })).toBe(true);
  });

  test('all required docs at current version → no acceptance needed', () => {
    const user = { rol: 'advertiser', consentimientos: fullConsents('advertiser') };
    expect(legalConsent.requiresAcceptance(user)).toBe(false);
    expect(legalConsent.missingConsents(user)).toEqual([]);
  });

  test('a stale version re-triggers acceptance for that doc', () => {
    const consents = fullConsents('creator');
    consents[0] = { ...consents[0], version: 'deadbeef0000' }; // simulate old version
    const user = { rol: 'creator', consentimientos: consents };
    expect(legalConsent.requiresAcceptance(user)).toBe(true);
    const missing = legalConsent.missingConsents(user).map((d) => d.slug);
    expect(missing).toEqual([fullConsents('creator')[0].slug]);
  });

  test('partial acceptance still requires the rest', () => {
    const user = { rol: 'advertiser', consentimientos: fullConsents('advertiser').slice(0, 1) };
    expect(legalConsent.requiresAcceptance(user)).toBe(true);
  });
});

describe('validateConsentPayload', () => {
  test('accepts a full, current payload', () => {
    expect(legalConsent.validateConsentPayload('creator', fullConsents('creator'))).toEqual({ ok: true, missing: [] });
  });

  test('rejects a partial payload and reports what is missing', () => {
    const res = legalConsent.validateConsentPayload('advertiser', fullConsents('advertiser').slice(0, 1));
    expect(res.ok).toBe(false);
    expect(res.missing.length).toBeGreaterThan(0);
  });

  test('rejects a stale version', () => {
    const consents = fullConsents('creator').map((c) => ({ ...c, version: 'stale00000000' }));
    expect(legalConsent.validateConsentPayload('creator', consents).ok).toBe(false);
  });

  test('rejects non-array / empty', () => {
    expect(legalConsent.validateConsentPayload('creator', null).ok).toBe(false);
    expect(legalConsent.validateConsentPayload('creator', []).ok).toBe(false);
  });
});

describe('buildConsentEntries', () => {
  test('stamps manifest version/hash + request IP/UA for every required doc', () => {
    const req = { headers: { 'x-forwarded-for': '203.0.113.7, 10.0.0.1', 'user-agent': 'jest-UA' }, ip: '10.0.0.1' };
    const entries = legalConsent.buildConsentEntries('creator', req);
    const required = legalConsent.requiredDocsForRole('creator');

    expect(entries).toHaveLength(required.length);
    for (const e of entries) {
      expect(e.ip).toBe('203.0.113.7'); // first x-forwarded-for hop
      expect(e.userAgent).toBe('jest-UA');
      expect(e.aceptadoEn instanceof Date).toBe(true);
      const doc = required.find((d) => d.slug === e.slug);
      expect(doc).toBeTruthy();
      expect(e.version).toBe(doc.version);
      expect(e.hash).toBe(doc.hash);
    }
  });

  test('unknown role yields no entries', () => {
    expect(legalConsent.buildConsentEntries('admin', { headers: {} })).toEqual([]);
  });
});
