# syntax=docker/dockerfile:1.7

# ─────────────────────────────────────────────────────────────────────────────
# Channelad backend — Fly.io / Railway / any container host
#
# The frontend stays on Vercel (Vite SPA + prerendered blog), so this image
# only ships the Node/Express API + Socket.io + Baileys worker + crons.
# ─────────────────────────────────────────────────────────────────────────────

FROM node:20-bookworm-slim AS base

ENV NODE_ENV=production \
    HOST=0.0.0.0 \
    PORT=8080 \
    NPM_CONFIG_LOGLEVEL=warn \
    PUPPETEER_SKIP_DOWNLOAD=true \
    PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true

WORKDIR /app

# tini = PID 1 → clean SIGTERM → server.js already handles graceful shutdown
RUN apt-get update \
 && apt-get install -y --no-install-recommends tini ca-certificates \
 && rm -rf /var/lib/apt/lists/*

# ── Dependencies layer (cached unless package*.json change) ───────────────────
COPY package.json package-lock.json* ./
RUN npm ci --omit=dev --no-audit --no-fund

# ── App layer ────────────────────────────────────────────────────────────────
COPY . .

# Ensure runtime mount points exist (uploads is read by app.js:155)
RUN mkdir -p uploads public data/whatsapp-session \
 && chown -R node:node /app

USER node

EXPOSE 8080

HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD node -e "require('http').get('http://127.0.0.1:'+(process.env.PORT||8080)+'/health',r=>{process.exit(r.statusCode>=200&&r.statusCode<400?0:1)}).on('error',()=>process.exit(1))"

ENTRYPOINT ["/usr/bin/tini", "--"]
CMD ["node", "server.js"]
