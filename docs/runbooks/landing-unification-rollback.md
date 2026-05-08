# Runbook — Landing unification rollback

**Owner:** Rafa
**Last updated:** 2026-05-07
**Severity if triggered:** P2 (user-visible regression on `/`) — escalate to P1 if checkout/marketplace conversion drops > 20%.

This runbook covers reverting the landing unification feature (canary or 100%) when a regression appears. The feature is gated by `landingUnification` (cookie `ff_landingUnification`, env `VITE_FF_LANDING_UNIFICATION`).

---

## When to trigger this runbook

- LCP on `/` regresses > 30% vs. baseline ([FILL: dashboard URL])
- CLS on `/` regresses > 0.05 vs. baseline ([FILL: dashboard URL])
- Marketplace click-through from `/` drops > 15% over a 30-min window
- Sentry shows a new error tied to `LandingPage` or `ForBrandsPage` with > 0.5% session rate
- Any P0/P1 alert from [FILL: alerting tool — PagerDuty, Datadog Monitor URL]

---

## 5-step rollback

### 1. Confirm the regression

Pull the [FILL: Grafana / Datadog dashboard] for `/`. Compare LCP, CLS, conversion to the baseline at [FILL: timestamp ISO of pre-canary baseline]. If the metric isn't in the dashboard, run `npm run lighthouse:landing` locally against prod URL.

### 2. Flip the flag to OFF in production

Two options — use whichever is faster.

**Option A (preferred — env var, no redeploy):** in [FILL: Vercel project settings URL] set `VITE_FF_LANDING_UNIFICATION=off` and redeploy from the Vercel dashboard (no code change needed). Wait ~2 min for the build.

**Option B (cookie nuke — 30s, but only affects new sessions):** if Vercel is slow, push an empty cache-bust deployment via the Vercel dashboard ("Redeploy" with "Use existing Build Cache" disabled). New users will land on the legacy `/` in ~30s; existing users keep the flag from cookie until expiry.

### 3. Notify stakeholders (use messages in section below)

Post message #1 in `#eng-incidents` immediately after step 2. Then post message #2 in `#marketing` and DM [FILL: head of marketing].

### 4. Verify the rollback

In an incognito window (no cookie), open `/`. The page should be the legacy `LandingPage` (look for `data-testid="landing-page-legacy"` in DevTools). Confirm the regression metric in the dashboard is recovering. Wait 10 min and confirm the trend.

### 5. Postmortem

File a postmortem doc within 24h. Include: timeline, root cause hypothesis, what the dashboards showed before/after, who was paged, what would have caught this in CI. Use the template at [FILL: postmortem template URL].

---

## Slack messages (copy-paste-ready)

### Message #1 — `#eng-incidents` (sent at start of step 2)

> :rotating_light: Rolling back landing unification on `/`. Metric regression: [FILL: which metric, by how much]. Flipping `VITE_FF_LANDING_UNIFICATION=off` now via Vercel. Will confirm rollback in ~5 min. Pinging @[FILL: oncall].

### Message #2 — `#marketing` (sent after rollback confirmed)

> Heads up: we rolled back the unified landing test on `/` due to [FILL: short reason]. `/` is back to the legacy LandingPage. `/para-anunciantes` is unchanged. No action needed from your side; if you have campaigns pointing to `/para-anunciantes`, those still work. We'll re-attempt the rollout once we fix the issue. Postmortem doc tomorrow.

### Message #3 — `#eng-incidents` (sent after rollback confirmed)

> :white_check_mark: Rollback confirmed. `/` is serving legacy LandingPage in incognito. [FILL: metric] recovering ([FILL: current value vs baseline]). No further action needed. Postmortem ETA: [FILL: 24-48h].

---

## Reverting the 301 redirect (post-100pct only)

If the rollback happens AFTER the 301 (`/para-anunciantes` -> `/`) has shipped: remove the entries you added from `vercel.json` (see `vercel.redirects.post-100pct.json` for the exact spec) and redeploy. Search engines may take 24-72h to refresh; expect a brief SEO dip while they re-index `/para-anunciantes`.

## Common pitfalls

- The Vercel CLI flag is `vercel --force` (not `vercel deploy --force`); easier to redeploy from the dashboard.
- Cookie overrides persist for 30 days. Users with `ff_landingUnification=on` set during canary won't see the rollback until the cookie expires or the env var is set to `off` (env var beats cookie? — NO, cookie beats env var in `featureFlags.js`. To force-rollback those users you must clear the cookie, which requires either a code change or a server-side `Set-Cookie` header).
- If you flip the flag while a deployment is in-progress, the next deployment will pick up the new value. Confirm the deployed env value in Vercel after step 2.
