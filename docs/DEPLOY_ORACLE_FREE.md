# Deploy the always-on worker on a FREE Oracle Cloud VM ($0/mo)

This moves the always-on backend (Baileys WhatsApp + `campaignCron` + the
in-process job scheduler) off **Fly.io (~$5–10/mo)** onto an **Oracle Cloud
Always Free** VM that runs indefinitely at **$0**. The frontend (Vercel) and the
serverless API stay exactly where they are — only the always-on box moves.

It's a **drop-in replacement for the Fly machine**: same `node server.js`, same
role. The only frontend change is pointing `VITE_BAILEYS_API_URL` /
`BAILEYS_SIDECAR_URL` at the new HTTPS URL.

> Why Oracle: Fly removed its permanent free tier in 2024. Oracle Cloud's
> **Always Free** tier still gives a real always-on VM indefinitely. The AMD
> `VM.Standard.E2.1.Micro` (1 OCPU / 1 GB) is almost always provisionable; the
> ARM `A1.Flex` (up to 4 OCPU / 24 GB) is better but frequently "out of
> capacity". Baileys is WebSocket-only (no Chrome), so 1 GB + swap is plenty.

Everything in this repo needed for it already exists: `Dockerfile`,
`docker-compose.yml`. You provision the VM (needs your identity/credit-card for
verification — Always Free resources are never charged); the steps below do the
rest.

---

## 0. What you'll end up with

```
 Vercel (channelad.io)  ──API──▶  Vercel serverless functions   (unchanged)
        │
        └── Baileys/WhatsApp ──HTTPS──▶  Cloudflare Tunnel ──▶  Oracle VM
                                                                  └─ node server.js
                                                                       ├─ Baileys sidecar
                                                                       ├─ campaignCron (10 min)
                                                                       └─ jobScheduler (9 jobs)
```

Cost: **$0/mo** (Always Free VM + free Cloudflare Tunnel + free GitHub).

---

## 1. Create the Always Free VM (~10 min)

1. Sign up / log in at <https://www.oracle.com/cloud/free/> (credit card is for
   identity only — Always Free is never billed).
2. **Compute → Instances → Create instance**:
   - **Image**: Canonical Ubuntu 22.04.
   - **Shape**: `VM.Standard.E2.1.Micro` (Always Free eligible, 1 GB). If you can
     grab it, `VM.Standard.A1.Flex` with 1 OCPU / 6 GB is even better — but expect
     "out of capacity"; the micro is fine for Baileys.
   - **Networking**: keep the default VCN with a **public IPv4**.
   - **SSH keys**: upload your public key (or let Oracle generate one and save it).
3. Create. Note the **public IP**.

> You do **not** need to open any ingress ports — the Cloudflare Tunnel makes an
> outbound-only connection, so the VM's firewall/security list can stay locked
> down. (This is also why it works behind NAT on a Raspberry Pi later.)

---

## 2. Prep the box (~10 min)

SSH in: `ssh ubuntu@<PUBLIC_IP>` (user is `ubuntu` on the Canonical image).

```bash
# Docker + compose plugin
sudo apt-get update && sudo apt-get install -y ca-certificates curl git
curl -fsSL https://get.docker.com | sudo sh
sudo usermod -aG docker ubuntu && newgrp docker

# 2 GB swap — cheap insurance so a job spike never OOM-kills the app on 1 GB
sudo fallocate -l 2G /swapfile && sudo chmod 600 /swapfile
sudo mkswap /swapfile && sudo swapon /swapfile
echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab

# Oracle's Ubuntu image blocks everything via iptables by default. Since we use
# an outbound tunnel we don't need inbound rules, but DO allow established/out:
# (the tunnel is outbound, so usually nothing to change — only touch this if
#  cloudflared can't connect.)
```

---

## 3. Get the code + secrets onto the VM

```bash
git clone https://github.com/xipol1/ADFLOW.git
cd ADFLOW
cp .env.example .env
nano .env   # fill in the REAL values (see list below)
```

Copy the **same values you set on Fly** (they're already proven). The essentials:

```
MONGODB_URI=...               # same Atlas cluster
JWT_SECRET=...  JWT_REFRESH_SECRET=...
ENCRYPTION_KEY=...            # MUST be the SAME 32 chars as Vercel/Fly,
                             #   or every stored OAuth/2FA token becomes undecryptable
SESSION_SECRET=...  CRON_SECRET=...
STRIPE_SECRET_KEY=...  STRIPE_WEBHOOK_SECRET=...  STRIPE_CURRENCY=eur
TELEGRAM_API_ID=...  TELEGRAM_API_HASH=...  TELEGRAM_SESSION=...  TELEGRAM_BOT_TOKEN=...
EMAIL_*=...  GOOGLE_CLIENT_ID=...  BOT_API_KEY=...
FRONTEND_URL=https://channelad.io
PUBLIC_BASE_URL=https://channelad.io
CORS_ORIGIN=https://channelad.io,https://www.channelad.io
# Filled in step 4:
CLOUDFLARE_TUNNEL_TOKEN=
```

> Fast path: `flyctl secrets list -a channelad-api-test` shows the names; reuse
> the same values. `ENABLE_BACKGROUND_JOBS`, `WHATSAPP_SESSION_PATH`, `PORT`,
> `HOST`, `RUNTIME_PLATFORM` are set by `docker-compose.yml` — don't duplicate them.

---

## 4. Free HTTPS via Cloudflare Tunnel (~5 min)

You already use Cloudflare DNS for `channelad.io`, so this is the cleanest TLS.

1. Cloudflare dashboard → **Zero Trust → Networks → Tunnels → Create a tunnel**
   → *Cloudflared* → name it `channelad-worker`.
2. Copy the **tunnel token** it shows → paste into `.env` as
   `CLOUDFLARE_TUNNEL_TOKEN=...`.
3. Add a **Public Hostname**:
   - Subdomain: `api-worker` (→ `api-worker.channelad.io`)
   - Service: **HTTP** → `app:8080`  ← the compose service name + port
4. Save. (DNS is created automatically.)

---

## 5. Launch (~5 min)

```bash
docker compose up -d --build      # first build ~3-5 min
docker compose logs -f app        # watch boot
```

You're up when the logs show:

```
MongoDB conectado correctamente
[cron] Campaign automation scheduled every 10 minutes
[scheduler] enabled — 9 jobs, first tick in 90s
Server running on port 8080
```

Verify HTTPS end-to-end:

```bash
curl https://api-worker.channelad.io/health
# {"status":"ok","db":"connected",...}
```

After ~90 s the scheduler dispatches due jobs; confirm with
`node scripts/check-last-jobs.js` (from your laptop, against the same Atlas DB)
or `docker compose logs app | grep scheduler`.

---

## 6. Point the frontend at the new worker

On **Vercel → Project → Settings → Environment Variables**, set the Baileys URL
to the tunnel hostname, then redeploy the frontend:

```
VITE_BAILEYS_API_URL = https://api-worker.channelad.io
BAILEYS_SIDECAR_URL  = https://api-worker.channelad.io
```

(Use whichever of these your build actually reads — grep the client for
`BAILEYS` / `SIDECAR`.) Re-test WhatsApp linking from the dashboard.

---

## 7. Decommission Fly (stop the bill)

Once §5–6 are green for a day:

```powershell
flyctl machine stop 0805e69a9490d8 -a channelad-api-test   # stop billing immediately
# later, when confident:
flyctl apps destroy channelad-api-test                     # remove entirely
```

(PR #79's `fly.toml` bump becomes moot once Fly is gone — close it if you don't
keep Fly as a fallback.)

---

## 8. Day-2 ops

| Task | Command (on the VM, in `~/ADFLOW`) |
|---|---|
| Logs | `docker compose logs -f app` |
| Restart | `docker compose restart app` |
| Update to latest code | `git pull && docker compose up -d --build` |
| Survives reboot? | Yes — `restart: unless-stopped` + Docker enabled on boot |
| Backup WhatsApp session | `docker run --rm -v adflow_wa-session:/d -v $PWD:/b alpine tar czf /b/wa-session.tgz -C /d .` |

---

## Notes / caveats

- **Memory**: app (Node + Baileys, no Chrome) ≈ 150–300 MB; a `telegram-intel`
  run adds ~100 MB (GramJS). With 1 GB + the 2 GB swap from §2 you have headroom.
  If you snagged an ARM A1 (6–24 GB), ignore swap.
- **Legacy WhatsApp worker**: the image skips Chromium
  (`PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true`), which is correct for Baileys. The
  old `whatsapp-web.js` `WhatsAppAdminClient` (started only if
  `WHATSAPP_SESSION_PATH` is set) needs Chrome and will log
  `Could not find Chrome` then give up after 3 tries — harmless. The compose
  sets `WHATSAPP_SESSION_PATH` for Baileys' own state; if the legacy errors
  bother you, confirm your Baileys manager's session dir and drop that env, or
  add Chromium to the Dockerfile.
- **Single runner**: `ENABLE_BACKGROUND_JOBS=true` lives ONLY on this box. Never
  set it on Vercel or a second VM, or the heavy jobs double-run (the JobLog lock
  guards against simultaneous runs, but don't rely on it as the only line of
  defense for flood-sensitive `telegram-intel`).
- **Idle reclaim**: Oracle may reclaim *idle* Always Free instances. This box is
  never idle (the worker + tunnel keep it busy), so it won't be reclaimed.
