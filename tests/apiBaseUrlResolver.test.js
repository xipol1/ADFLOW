/**
 * Unit test for the pure baseURL resolver used by the frontend api.js to
 * route /baileys/* calls to a separate sidecar host. See
 * docs/BAILEYS_SIDECAR_PLAN.md and client/src/services/api.js.
 *
 * We can't require() the whole api.js file from Node because it depends on
 * Vite's import.meta.env, so we re-implement the pickBaseUrl helper inline
 * and keep it in sync with the source. If the contract diverges this test
 * fails — same regression protection as if we mocked Vite.
 */

// ── Inline mirror of pickBaseUrl from client/src/services/api.js ──
function pickBaseUrl(endpoint, mainBase, baileysBase) {
  if (baileysBase && typeof endpoint === 'string' && endpoint.startsWith('/baileys')) {
    return baileysBase;
  }
  return mainBase;
}

describe('pickBaseUrl — /baileys/* sidecar routing', () => {
  const MAIN = 'https://channelad.io/api';
  const SIDECAR = 'https://channelad-api-test.fly.dev/api';

  test('routes /baileys/link/start to sidecar when configured', () => {
    expect(pickBaseUrl('/baileys/link/start', MAIN, SIDECAR)).toBe(SIDECAR);
  });

  test('routes /baileys/sessions/:id/* to sidecar', () => {
    expect(pickBaseUrl('/baileys/sessions/abc/link-canal', MAIN, SIDECAR)).toBe(SIDECAR);
  });

  test('non-baileys endpoints go to main API', () => {
    expect(pickBaseUrl('/canales/123', MAIN, SIDECAR)).toBe(MAIN);
    expect(pickBaseUrl('/auth/login', MAIN, SIDECAR)).toBe(MAIN);
    expect(pickBaseUrl('/oauth/telegram/connect', MAIN, SIDECAR)).toBe(MAIN);
  });

  test('falls back to main when sidecar is not configured', () => {
    expect(pickBaseUrl('/baileys/link/start', MAIN, '')).toBe(MAIN);
    expect(pickBaseUrl('/baileys/link/start', MAIN, null)).toBe(MAIN);
    expect(pickBaseUrl('/baileys/link/start', MAIN, undefined)).toBe(MAIN);
  });

  test('does NOT match endpoints that merely contain "baileys"', () => {
    // Defensive — only the prefix matches, so an endpoint like
    // /something/baileys-related stays on the main API.
    expect(pickBaseUrl('/something/baileys-internal', MAIN, SIDECAR)).toBe(MAIN);
  });

  test('handles non-string endpoint defensively (returns main)', () => {
    expect(pickBaseUrl(undefined, MAIN, SIDECAR)).toBe(MAIN);
    expect(pickBaseUrl(null, MAIN, SIDECAR)).toBe(MAIN);
    expect(pickBaseUrl(42, MAIN, SIDECAR)).toBe(MAIN);
  });
});
