# Landing unification — flagged canary (`/` -> ForBrandsPage)

## Summary

Behind the `landingUnification` feature flag, the index route `/` now renders `ForBrandsPage` instead of the legacy `LandingPage`. SEO on `ForBrandsPage` adapts to the URL (canonical, title, schema.org) so the unified page is correct whether served from `/` or `/para-anunciantes`. The default is OFF; the flag is enabled gradually via cookie (per-user) and env var (per-environment). The 301 from `/para-anunciantes` -> `/` is **NOT** included in this PR — it ships separately once the canary reaches 100% and internal links migrate (see NEEDS DECISION #2).

## Files

### New

| File | Purpose |
|------|---------|
| `client/src/flags/featureFlags.js` | Cookie -> env var -> default-OFF resolution. SSR-safe. |
| `client/src/ui/components/utils/LazyMount.jsx` | IntersectionObserver-based deferred mount utility. |
| `vercel.redirects.post-100pct.json` | 301 redirect spec — apply post-100pct, not in this PR. |
| `tests/e2e/landing.spec.ts` | 4 Playwright happy paths (flag ON/OFF x route). |
| `docs/runbooks/landing-unification-rollback.md` | 5-step rollback + 3 ready-to-paste Slack messages. |

### Modified

| File | Change |
|------|--------|
| `client/src/routes/AppRoutes.jsx` | Index route reads `getFeatureFlag('landingUnification')`. |
| `client/src/ui/pages/landing/ForBrandsPage.jsx` | Adaptive SEO + schema.org WebSite/SearchAction + `data-testid`. |
| `client/src/ui/pages/landing/LandingPage.jsx` | `data-testid` only. |
| `public/sitemap.xml` | Removed `/para-anunciantes` entry; bumped `/` lastmod to 2026-05-09. |

## Git recipe (8 commits, prefixed `[pre-deploy] N.`)

> **TODO (Rafa):** create the branch and commits — I do not have shell access in this environment.
>
> Below is the recipe. Copy/paste into a terminal at the repo root.

```bash
# 1) Branch off main
git checkout main && git pull
git checkout -b feat/landing-unification-canary

# 2) Stage files in 8 commits
git add client/src/flags/featureFlags.js
git commit -m "[pre-deploy] 1. Add feature flag resolution (cookie -> env -> default)"

git add client/src/ui/components/utils/LazyMount.jsx
git commit -m "[pre-deploy] 2. Add LazyMount utility for deferred mount"

git add client/src/routes/AppRoutes.jsx
git commit -m "[pre-deploy] 3. Gate index route on landingUnification flag"

git add client/src/ui/pages/landing/ForBrandsPage.jsx
git commit -m "[pre-deploy] 4. Adaptive SEO + schema.org SearchAction + data-testid"

git add client/src/ui/pages/landing/LandingPage.jsx
git commit -m "[pre-deploy] 5. Add data-testid to LandingPage for e2e"

git add public/sitemap.xml
git commit -m "[pre-deploy] 6. Remove /para-anunciantes from sitemap, bump / lastmod"

git add tests/e2e/landing.spec.ts
git commit -m "[pre-deploy] 7. Add Playwright happy paths for landing"

git add docs/runbooks/landing-unification-rollback.md vercel.redirects.post-100pct.json pr-description.md
git commit -m "[pre-deploy] 8. Runbook + post-100pct redirect spec + PR description"

# 3) Push and open PR
git push -u origin feat/landing-unification-canary
gh pr create --title "Landing unification — flagged canary" --body-file pr-description.md
```

## TODOs blocking merge — only Rafa can close these

- [ ] Create the branch and the 8 commits using the recipe above.
- [ ] Run `npm run build` and report bundle size delta. Compare `dist/assets/*.js` totals before/after; expect a small increase from the flag util + LazyMount. If `LandingPage` chunk grows by > 5%, re-evaluate NEEDS DECISION #1.
- [ ] `npx playwright install && npx playwright test tests/e2e/landing.spec.ts` to confirm all 4 specs pass against a local dev build.
- [ ] Capture baseline LCP/CLS/conversion for `/` (legacy) and `/para-anunciantes` ahead of canary; paste links into the runbook's `[FILL:]` placeholders.
- [ ] Configure alerts on the regression thresholds in the runbook (LCP +30%, CLS +0.05, conversion -15%). PagerDuty rule + Datadog monitor.
- [ ] Notify marketing of the canary plan and the eventual 301. They control campaign URLs targeting `/para-anunciantes`.
- [ ] Get a second pair of eyes on the SEO adaptive logic in `ForBrandsPage.jsx` — easy to mis-set canonical and tank rankings.

## NEEDS DECISION

### #1 — Inline component extraction in `ForBrandsPage`

`ForBrandsPage.jsx` is 457 lines with several inline section helpers (`Section`, the inlined hero, metrics, benefits, comparison, testimonials, FAQ, CTA). React's `lazy()` only works on default exports from separate modules, so we cannot code-split these without first extracting them to their own files.

Three options:

- **A — Extract to separate files + `React.lazy`.** Best long-term: real code-split, smaller initial JS for `/`. Cost: ~half a day of refactor + risk of breaking framer-motion variants captured by closure. Defer to a follow-up PR.
- **B — Use the `LazyMount` utility shipped in this PR.** Defers the *render* of offscreen sections (still in the main bundle, but mount/effects don't run until in view). Quick win, 3 edits of 1 line each. Recommended for this PR.
- **C — Do nothing.** Acceptable if bundle delta from B is negligible.

If you pick B, wrap these three offscreen sections (lines are approximate, see file):

```jsx
// at top of file, after the existing imports:
import LazyMount from '../../components/utils/LazyMount'

// then wrap:
<LazyMount placeholder={<div style={{ minHeight: 600 }} />}>
  <Section style={{ padding: '110px 48px', background: 'var(--bg)' }}>
    {/* HOW IT WORKS */}
  </Section>
</LazyMount>

<LazyMount placeholder={<div style={{ minHeight: 600 }} />}>
  <Section style={{ padding: '110px 48px', background: 'var(--bg)' }}>
    {/* TESTIMONIALS */}
  </Section>
</LazyMount>

<LazyMount placeholder={<div style={{ minHeight: 700 }} />}>
  <Section style={{ padding: '110px 48px', background: 'var(--bg2)' }}>
    {/* FAQ */}
  </Section>
</LazyMount>
```

**My recommendation: B in this PR, A as a follow-up.**

### #2 — Internal linking migration: now or atomic with the 301

22 React files reference `/para-anunciantes` (Footer, NavBar, CrossLinks, blog posts, dashboard CTAs). I audited the list but did NOT change any of them. Reasoning: during canary, 75-95% of users have the flag OFF; if we change `/para-anunciantes` links to `/` now, those users land on the legacy `LandingPage` when they click "Para anunciantes" — wrong page. Better to migrate the links atomically with the 301 once the flag is at 100%.

**My recommendation: do not migrate links in this PR. Migrate them in the same PR that activates the 301.**

### #3 — Mechanism for canary % targeting

`featureFlags.js` resolves cookie + env var, but something has to actually flip the cookie/env for 5% then 25% of users. Three options evaluated:

- **PostHog feature flags.** Pros: built-in % rollout, per-user targeting. Cons: client-side lib adds ~30KB, eval happens after page load (one frame of legacy `/`), external dependency on PostHog being up.
- **Vercel Edge Middleware.** Pros: eval at the CDN before the bundle ships, no extra dep, ~1h to implement. Cons: harder to debug, deploys couple to redeploys.
- **No real canary — just toggle env var globally.** Pros: 0 effort. Cons: 100% blast radius from minute one. Unsafe.

**My recommendation: Vercel Edge Middleware.** Sample implementation (not in this PR — needs Rafa's call first):

```ts
// middleware.ts (root)
import { NextResponse } from 'next/server'

export function middleware(request) {
  const cookie = request.cookies.get('ff_landingUnification')
  if (cookie) return NextResponse.next()  // user already bucketed
  const bucket = Math.random() < CANARY_PCT ? 'on' : 'off'
  const res = NextResponse.next()
  res.cookies.set('ff_landingUnification', bucket, {
    maxAge: 60 * 60 * 24 * 30,
    path: '/',
    sameSite: 'lax',
  })
  return res
}

export const config = { matcher: ['/'] }
```

`CANARY_PCT` is read from env: 0.05, 0.25, 0.50, 1.00 over the rollout.

## Trust-but-verify

The edits I applied:

- `AppRoutes.jsx`: imports `getFeatureFlag`, the index route conditionally renders `ForBrandsPage` or `LandingPage`.
- `ForBrandsPage.jsx`: imports `useLocation`, computes `isOnRootPath`, switches `<SEO>` props, swaps the `WebPage` schema for an additional `WebSite`+`SearchAction` schema on `/`, adds `data-testid="for-brands-page"` on the `<main>` and `data-testid="for-brands-cta-explore"` on the explore CTA.
- `LandingPage.jsx`: adds `data-testid="landing-page-legacy"` on the `<main>`.
- `sitemap.xml`: removed `/para-anunciantes`, bumped `/` lastmod to 2026-05-09.

Sintácticamente correctas. Pero corre `npm run build` antes de commitear; sin shell no puedo validar que el bundle compila.
