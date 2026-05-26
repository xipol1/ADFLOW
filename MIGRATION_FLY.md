# Vercel → Fly.io migration (test deploy)

This document describes how to deploy the Channelad backend to Fly.io while
keeping the frontend (Vite SPA + prerendered blog) on Vercel. Follow it top to
bottom for a first deploy; later sections (DNS, Stripe, prod cutover) are only
needed once the test instance is healthy.

**Scope of this branch** — adds `Dockerfile`, `.dockerignore`, `fly.toml`, and
this README. Nothing else in the codebase is modified, so you can merge or
abandon this branch without affecting the Vercel deploy.

---

## 0. Why move at all

| | Vercel (current) | Fly.io |
|---|---|---|
| Long-lived processes (Baileys WhatsApp worker) | ❌ serverless kills sockets | ✅ container stays up |
| Socket.io | ⚠️ only `/api` rewrites, websockets flaky | ✅ first-class |
| Crons | ✅ native, but limited to 60s | ✅ in-process or external |
| Cold starts | ~300 ms | none |
| Cost | $0 free / $20 Pro | ~$0–10 free tier, $5/mo Hobby |
| Frontend SPA | ✅ ideal | overkill |

Decision: keep frontend on Vercel, move only the API.

---

## 1. Prerequisites (10 min)

### 1.1 Install flyctl

Windows PowerShell:

```powershell
iwr https://fly.io/install.ps1 -useb | iex
# then open a NEW shell so $PATH picks up flyctl
```

macOS / Linux:

```bash
curl -L https://fly.io/install.sh | sh
```

Verify:

```powershell
flyctl version
```

### 1.2 Sign up & log in (free tier)

```powershell
flyctl auth signup     # only the first time, opens browser
# or, if you already have an account:
flyctl auth login
```

The free tier covers up to 3 `shared-cpu-1x` 256 MB VMs and is plenty for this
test. You don't need to add a payment method to start, but Fly will ask for one
before letting you scale to multiple machines or add a volume.

---

## 2. Launch the app (5 min)

From the repo root, **on the `chore/fly-deploy-test` branch**:

```powershell
flyctl launch --no-deploy --copy-config --name channelad-api-test --region mad
```

What this does:

- Reads the included `fly.toml` (`--copy-config`).
- Creates the Fly app `channelad-api-test` in Madrid (`mad`).
- **Does NOT deploy yet** (`--no-deploy`) — we need to set secrets first.

If the name is taken pick another one and update `app = "..."` in `fly.toml`.

---

## 3. Set secrets (15 min — the bulk of the work)

Fly secrets are encrypted env vars injected into the container. They are **not**
written to disk and don't show up in logs. Set them from your local `.env`:

### 3.1 Required for boot (the app crashes without these)

```powershell
flyctl secrets set `
  MONGODB_URI="mongodb+srv://USER:PASS@cluster.mongodb.net/channelad?retryWrites=true&w=majority" `
  JWT_SECRET="$(node -e "console.log(require('crypto').randomBytes(48).toString('hex'))")" `
  JWT_REFRESH_SECRET="$(node -e "console.log(require('crypto').randomBytes(48).toString('hex'))")" `
  ENCRYPTION_KEY="REPLACE_WITH_EXACTLY_32_CHARS!!" `
  SESSION_SECRET="$(node -e "console.log(require('crypto').randomBytes(48).toString('hex'))")" `
  CRON_SECRET="$(node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")"
```

> `ENCRYPTION_KEY` **must** be exactly 32 characters (AES-256). Re-use the same
> value you have in Vercel so existing encrypted secrets in Mongo stay
> decryptable — generating a new one will brick all stored OAuth/2FA tokens.

### 3.2 Stripe (test mode for the test deploy)

```powershell
flyctl secrets set `
  STRIPE_SECRET_KEY="sk_test_..." `
  STRIPE_PUBLISHABLE_KEY="pk_test_..." `
  STRIPE_WEBHOOK_SECRET="whsec_..." `
  STRIPE_SUBSCRIPTION_WEBHOOK_SECRET="whsec_..." `
  STRIPE_CURRENCY="eur"
```

### 3.3 URLs / CORS

```powershell
# Replace api-test.channelad.io with the temporary fly URL until DNS is mapped.
flyctl secrets set `
  FRONTEND_URL="https://channelad.io" `
  BACKEND_URL="https://channelad-api-test.fly.dev" `
  PUBLIC_BASE_URL="https://channelad.io" `
  CORS_ORIGIN="https://channelad.io,https://www.channelad.io"
```

### 3.4 Everything else from `.env.example`

The fastest way: bulk-import your local `.env` (review it first — don't push
dev-only values to prod):

```powershell
# WARNING: this uploads every key/value from .env to Fly. Strip dev-only
# values first.
flyctl secrets import < .env
```

Or set individually:

```powershell
flyctl secrets set `
  EMAIL_PROVIDER="..." EMAIL_HOST="..." EMAIL_PORT="..." `
  EMAIL_SECURE="true" EMAIL_USER="..." EMAIL_PASS="..." `
  TELEGRAM_BOT_TOKEN="..." TELEGRAM_API_ID="..." TELEGRAM_API_HASH="..." TELEGRAM_SESSION="..." `
  WHATSAPP_TOKEN="..." WHATSAPP_PHONE_NUMBER_ID="..." WHATSAPP_VERIFY_TOKEN="..." `
  META_APP_ID="..." META_APP_SECRET="..." `
  GOOGLE_CLIENT_ID="..." `
  BOT_API_KEY="..." `
  R2_ACCOUNT_ID="..." R2_ACCESS_KEY_ID="..." R2_SECRET_ACCESS_KEY="..." `
  R2_BUCKET="channelad-media" R2_PUBLIC_URL="https://..." `
  SENTRY_DSN="..." REDIS_URL="redis://..."
```

### 3.5 List what's set (no values shown)

```powershell
flyctl secrets list
```

---

## 4. First deploy (5 min)

```powershell
flyctl deploy --remote-only
```

`--remote-only` builds the image on Fly's builders so you don't need local
Docker. Expect 3–6 minutes the first time (~250 MB image).

Watch logs in another shell:

```powershell
flyctl logs
```

Healthcheck target is `GET /health`. The app should respond within ~40 seconds
of the container starting. If `flyctl logs` shows `Server running on port 8080`
and the healthcheck flips to green, you're up:

```powershell
flyctl status
flyctl open                # opens https://channelad-api-test.fly.dev
curl https://channelad-api-test.fly.dev/health
```

---

## 5. Smoke tests (15 min)

From your machine, hit the new URL directly:

```powershell
$base = "https://channelad-api-test.fly.dev"

# Health
curl "$base/health"

# Public endpoint that touches Mongo
curl "$base/api/auth/health"     # or any GET that doesn't need auth

# Auth flow
curl -X POST "$base/api/auth/login" `
  -H "Content-Type: application/json" `
  -d '{"email":"test@channelad.io","password":"..."}'
```

Then point a frontend dev build at it to test the browser path:

```powershell
# In a separate shell
$env:VITE_API_URL = "https://channelad-api-test.fly.dev"
npm run frontend:dev
```

What to verify:

- [ ] Login + JWT refresh
- [ ] Socket.io connects (Network tab → `ws://` upgrade succeeds)
- [ ] A Stripe webhook delivers (use `stripe listen --forward-to` against the fly URL)
- [ ] An R2 upload returns a 200 + public URL
- [ ] `/api/jobs/telegram-intel` returns 200 with the right `CRON_SECRET` header
- [ ] Baileys QR endpoint renders a QR (only if `WHATSAPP_SESSION_PATH` was set and a volume mounted — see §7)

---

## 6. Crons

`vercel.json` defines 9 crons that today hit `/api/{oauth,admin,jobs}/...` with
the `Authorization: Bearer $CRON_SECRET` header. Pick one strategy:

### Option A — In-process node-cron (simplest, already partly done)

`lib/campaignCron.js` already runs in-process via `startCampaignCron()` in
`server.js:130`. Extend the same file to register the other 8 schedules. Pros:
no external dependency. Cons: only one machine should run them — keep
`min_machines_running = 1` and `auto_stop_machines = "off"` once you enable it.

### Option B — GitHub Actions (zero infra cost)

Add `.github/workflows/crons.yml`:

```yaml
name: Crons
on:
  schedule:
    - cron: "0 3 * * *"
jobs:
  meta-refresh:
    runs-on: ubuntu-latest
    steps:
      - run: |
          curl -fsS -X POST https://channelad-api-test.fly.dev/api/oauth/meta/cron-refresh \
            -H "Authorization: Bearer ${{ secrets.CRON_SECRET }}"
```

Repeat one job per schedule. GitHub Actions cron is best-effort (can lag 5–15
min) but free for public repos and 2 000 min/mo on private repos.

### Option C — Fly machines run

```powershell
# Trigger ad-hoc
flyctl machines run -a channelad-api-test `
  --rm --command "curl -X POST http://localhost:8080/api/jobs/telegram-intel -H 'Authorization: Bearer $env:CRON_SECRET'"
```

Pair with an external scheduler (Upstash QStash, EasyCron) hitting Fly's URL.
Recommended only if you outgrow A+B.

**Recommendation for the test deploy: Option A** — wire all 9 jobs into
`lib/campaignCron.js` and remove the `crons` block from `vercel.json` once the
Fly instance is the source of truth.

---

## 7. Baileys WhatsApp worker (the original reason to migrate)

To enable the long-lived worker:

```powershell
# 1. Create a 1 GB volume in the same region
flyctl volumes create channelad_wa_sessions --region mad --size 1

# 2. Uncomment the [mounts] block in fly.toml, then set the env var
flyctl secrets set WHATSAPP_SESSION_PATH=/app/data/whatsapp-session

# 3. Make the machine persistent (not auto-stopped)
#    Edit fly.toml: auto_stop_machines = "off", min_machines_running = 1

flyctl deploy --remote-only
```

`server.js:138` checks `process.env.WHATSAPP_SESSION_PATH` before booting the
worker, so toggling the secret is the on/off switch. Without a volume the
worker re-pairs (asks for the QR again) every redeploy.

---

## 8. DNS & frontend cutover

Until everything is green, the frontend keeps pointing at the Vercel API. To
flip over:

1. **Add the custom domain to Fly**:
   ```powershell
   flyctl certs create api.channelad.io
   flyctl certs show api.channelad.io          # shows the CNAME/A records to add
   ```
2. **Update DNS** (Cloudflare):
   - `api.channelad.io` → `CNAME channelad-api-test.fly.dev` (proxied off — Fly
     wants to handle TLS itself, otherwise you get cert loops).
3. **Update the Vercel frontend env**: in the Vercel dashboard, set
   `VITE_API_URL=https://api.channelad.io` and trigger a redeploy.
4. **Update Stripe webhooks**: dashboard → Developers → Webhooks → change
   endpoint URL to `https://api.channelad.io/api/transacciones/webhook` (and
   the subscriptions equivalent). Copy the new signing secret into
   `STRIPE_WEBHOOK_SECRET` / `STRIPE_SUBSCRIPTION_WEBHOOK_SECRET` on Fly.
5. **Update OAuth callbacks** (Meta, Google, LinkedIn, Discord): replace the
   Vercel callback URL with `https://api.channelad.io/api/oauth/.../callback`.

---

## 9. Rollback

Fly keeps every release. To roll back one version:

```powershell
flyctl releases                # list
flyctl deploy --image registry.fly.io/channelad-api-test:deployment-XXXXXXX
```

To fully back out of the migration: change `VITE_API_URL` in Vercel back to the
old origin, then either `flyctl apps destroy channelad-api-test` (free) or
leave it idle (auto-stops, costs nothing).

---

## 10. Costs to expect

| Resource | Free allowance | After that |
|---|---|---|
| `shared-cpu-1x` 256 MB VMs | 3 included | $1.94/mo each |
| `shared-cpu-1x` 512 MB (our config) | not free | ~$3.88/mo |
| Outbound bandwidth (NA/EU) | 160 GB/mo free | $0.02/GB |
| 1 GB volume | 3 GB free total | $0.15/GB-mo |
| TLS certs | unlimited free | — |

Realistic monthly bill for the test instance with auto-stop on: **$0–3**.
Production-ready (always-on + 1 GB volume + Baileys worker): **$5–10**.

---

## 11. Local sanity check before deploying

If `flyctl deploy --remote-only` keeps failing, build the image locally to
isolate the problem (requires Docker Desktop):

```powershell
docker build -t channelad-api .
docker run --rm -p 8080:8080 --env-file .env channelad-api
curl http://localhost:8080/health
```

Common failures:

- `MODULE_NOT_FOUND` → a dep in `dependencies` should be in `devDependencies`
  or vice versa. Check `npm ci --omit=dev` output.
- `EADDRINUSE` → something else is bound to 8080 locally; change the host port
  in `docker run -p 8081:8080`.
- App boots but healthcheck fails → curl `/health` from inside the container:
  `docker exec -it <id> sh -c "wget -O- localhost:8080/health"`.

---

## Quick reference

| | command |
|---|---|
| Deploy | `flyctl deploy --remote-only` |
| Logs | `flyctl logs` |
| SSH into the VM | `flyctl ssh console` |
| Restart | `flyctl machines restart` |
| Scale up RAM | `flyctl scale memory 1024` |
| Set/unset secret | `flyctl secrets set FOO=bar` / `flyctl secrets unset FOO` |
| Tear down | `flyctl apps destroy channelad-api-test` |
