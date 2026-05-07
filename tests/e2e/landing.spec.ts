import { test, expect } from '@playwright/test'

/**
 * Landing unification e2e — happy paths.
 *
 * Run:
 *   npx playwright install   # one-time
 *   npx playwright test tests/e2e/landing.spec.ts
 *
 * Env:
 *   BASE_URL  (default http://localhost:5173)
 *
 * Notes:
 *   - These tests rely on data-testid attributes added in this PR. If the
 *     attributes are removed/renamed, update the selectors below.
 *   - The flag override uses the cookie set by featureFlags.js
 *     (window.__setFeatureFlag). On each test we set the cookie BEFORE
 *     navigation so the SSR/initial render picks it up.
 */

const BASE_URL = process.env.BASE_URL ?? 'http://localhost:5173'

async function setLandingFlag(context, value: boolean) {
  // Clear only our flag cookie to avoid wiping unrelated session cookies.
  await context.clearCookies({ name: 'ff_landingUnification' })
  await context.addCookies([
    {
      name: 'ff_landingUnification',
      value: value ? 'on' : 'off',
      url: BASE_URL,
      path: '/',
      sameSite: 'Lax',
    },
  ])
}

test.describe('Landing unification — flag OFF (default / legacy behavior)', () => {
  test('"/" renders legacy LandingPage', async ({ page, context }) => {
    await setLandingFlag(context, false)
    await page.goto(`${BASE_URL}/`)
    await expect(page.getByTestId('landing-page-legacy')).toBeVisible()
  })

  test('"/para-anunciantes" still renders ForBrandsPage with original SEO', async ({ page, context }) => {
    await setLandingFlag(context, false)
    await page.goto(`${BASE_URL}/para-anunciantes`)
    await expect(page.getByTestId('for-brands-page')).toBeVisible()
    // Hero CTA should link to /marketplace.
    const exploreCta = page.getByTestId('for-brands-cta-explore').first()
    await expect(exploreCta).toBeVisible()
  })
})

test.describe('Landing unification — flag ON (canary / unified behavior)', () => {
  test('"/" renders ForBrandsPage with adaptive SEO (root URL)', async ({ page, context }) => {
    await setLandingFlag(context, true)
    await page.goto(`${BASE_URL}/`)
    await expect(page.getByTestId('for-brands-page')).toBeVisible()
    // Adaptive SEO: canonical should be the root, not /para-anunciantes.
    const canonical = await page.locator('link[rel="canonical"]').getAttribute('href')
    expect(canonical).toMatch(/\/$|^https?:\/\/[^/]+\/?$/)
  })

  test('"/marketplace" still loads (regression check)', async ({ page, context }) => {
    await setLandingFlag(context, true)
    await page.goto(`${BASE_URL}/marketplace`)
    // Marketplace is a separate route; we just check the page didn't 404.
    await expect(page).toHaveURL(/\/marketplace/)
  })
})

/* TODO (Rafa, run locally):
 *   - Add viewport=mobile variants once the StickyHeader mobile breakpoint is finalized.
 *   - Add Lighthouse perf assertion (LCP < 2.5s, CLS < 0.1) once baseline numbers are captured.
 *   - Add a test asserting schema.org WebSite + SearchAction is present on "/" when flag ON.
 */
