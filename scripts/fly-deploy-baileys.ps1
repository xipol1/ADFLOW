# scripts/fly-deploy-baileys.ps1
#
# Deploys the Baileys sidecar to Fly.io: imports prod secrets from
# .vercel.production.env (already pulled via `vercel env pull`), runs
# `flyctl deploy`, smokes /health, and prints the secrets you must add to
# Vercel to wire the frontend to the sidecar.
#
# Run after the model has updated fly.toml + created the volume:
#   PS> ./scripts/fly-deploy-baileys.ps1
#
# Prerequisites:
#   - flyctl installed and authenticated
#   - .vercel.production.env in repo root (output of `vercel env pull`)
#   - fly.toml [mounts] block uncommented + min_machines_running=1
#   - Volume `channelad_wa_sessions` already exists in the app

$ErrorActionPreference = 'Stop'

$APP = 'channelad-api-test'
$ENV_FILE = '.vercel.production.env'

if (-not (Test-Path $ENV_FILE)) {
  Write-Host "❌ Falta $ENV_FILE en el repo root." -ForegroundColor Red
  Write-Host "   Run first: npx vercel env pull --environment=production --yes $ENV_FILE" -ForegroundColor Yellow
  exit 1
}

# ── Keys to copy from Vercel → Fly ──────────────────────────────────────────
# Cross-host consistency keys (auth tokens issued by Vercel must verify on
# Fly): JWT_*, ENCRYPTION_KEY, SESSION_SECRET. Plus integration/feature
# secrets needed by server.js boot.
$KEYS = @(
  'MONGODB_URI',
  'JWT_SECRET', 'JWT_REFRESH_SECRET', 'JWT_ISSUER', 'JWT_AUDIENCE',
  'ENCRYPTION_KEY', 'SESSION_SECRET', 'CRON_SECRET',
  'BCRYPT_ROUNDS', 'BOT_API_KEY',
  'TELEGRAM_BOT_TOKEN', 'TELEGRAM_BOT_USERNAME',
  'TELEGRAM_API_ID', 'TELEGRAM_API_HASH', 'TELEGRAM_SESSION',
  'TELEGRAM_WEBHOOK_SECRET', 'TGSTAT_API_TOKEN',
  'EMAIL_PROVIDER', 'EMAIL_HOST', 'EMAIL_PORT', 'EMAIL_SECURE',
  'EMAIL_USER', 'EMAIL_PASS', 'EMAIL_FROM_NAME', 'EMAIL_FROM_ADDRESS'
)

# Fly-specific additions (paths, URLs that differ from Vercel)
$FLY_EXTRAS = @{
  'WHATSAPP_SESSION_PATH' = '/app/data/whatsapp-session'
  'FRONTEND_URL'          = 'https://channelad.io'
  'CORS_ORIGIN'           = 'https://channelad.io,https://www.channelad.io'
  'PUBLIC_BASE_URL'       = 'https://channelad.io'
}

# Parse the .env file into a hashtable
$vercelEnv = @{}
Get-Content $ENV_FILE | ForEach-Object {
  if ($_ -match '^\s*([A-Z_][A-Z0-9_]*)="?(.*?)"?\s*$') {
    $vercelEnv[$Matches[1]] = $Matches[2]
  }
}

# Build the secrets payload — KEY=value lines, one per line
$payload = @()
foreach ($k in $KEYS) {
  if ($vercelEnv.ContainsKey($k)) {
    # Escape any value characters that would confuse flyctl
    $payload += "$k=$($vercelEnv[$k])"
  } else {
    Write-Host "⚠️  $k no está en $ENV_FILE — saltado" -ForegroundColor Yellow
  }
}
foreach ($k in $FLY_EXTRAS.Keys) {
  $payload += "$k=$($FLY_EXTRAS[$k])"
}

Write-Host "📤 Importando $($payload.Count) secrets a Fly app '$APP' (no deploy todavía)..." -ForegroundColor Cyan
$payload -join "`n" | flyctl secrets import --app $APP --stage

if ($LASTEXITCODE -ne 0) {
  Write-Host "❌ flyctl secrets import falló" -ForegroundColor Red
  exit 1
}

Write-Host ""
Write-Host "🚀 Deploying..." -ForegroundColor Cyan
flyctl deploy --app $APP

if ($LASTEXITCODE -ne 0) {
  Write-Host "❌ flyctl deploy falló — revisa los logs con: flyctl logs --app $APP" -ForegroundColor Red
  exit 1
}

Write-Host ""
Write-Host "🧪 Smoke test..." -ForegroundColor Cyan
$health = Invoke-RestMethod -Uri "https://$APP.fly.dev/health" -Method Get -ErrorAction SilentlyContinue
if ($health) {
  Write-Host "✅ /health responde: $($health | ConvertTo-Json -Compress)" -ForegroundColor Green
} else {
  Write-Host "⚠️  /health no responde — la VM puede estar arrancando. Reintenta en 60s." -ForegroundColor Yellow
}

Write-Host ""
Write-Host "✅ Sidecar desplegado. URL: https://$APP.fly.dev" -ForegroundColor Green
Write-Host ""
Write-Host "🔗 Próximo paso — añadir a Vercel Production:" -ForegroundColor Cyan
Write-Host "   BAILEYS_SIDECAR_URL=https://$APP.fly.dev"
Write-Host "   VITE_BAILEYS_API_URL=https://$APP.fly.dev"
Write-Host ""
Write-Host "   Comando directo (autorizado por ti al ejecutar este script):"
Write-Host "   npx vercel env add BAILEYS_SIDECAR_URL production"
Write-Host "   npx vercel env add VITE_BAILEYS_API_URL production"
Write-Host ""
Write-Host "Después de seteo, Vercel auto-redeploya y el FeatureGate se abre." -ForegroundColor Green
Write-Host ""
Write-Host "🧹 Limpieza: rm $ENV_FILE   (contiene secrets prod, no commitear)" -ForegroundColor Yellow
