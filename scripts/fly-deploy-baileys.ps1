# scripts/fly-deploy-baileys.ps1
#
# Deploys the Baileys sidecar to Fly.io.
# Run: ./scripts/fly-deploy-baileys.ps1
#
# Prerequisites already done by Claude:
#  - fly.toml updated (mounts + min_machines_running=1)
#  - Volume channelad_wa_sessions created (1GB cdg)
#  - .vercel.production.env pulled from Vercel

$ErrorActionPreference = 'Stop'

$APP = 'channelad-api-test'
$ENV_FILE = '.vercel.production.env'

if (-not (Test-Path $ENV_FILE)) {
    Write-Host "Missing $ENV_FILE. Run: npx vercel env pull --environment=production --yes $ENV_FILE" -ForegroundColor Red
    exit 1
}

# Keys to copy from Vercel to Fly (cross-host JWT / auth consistency)
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

# Fly-specific additions (paths and URLs that differ from Vercel)
$FLY_EXTRAS = @{
    'WHATSAPP_SESSION_PATH' = '/app/data/whatsapp-session'
    'FRONTEND_URL'          = 'https://channelad.io'
    'CORS_ORIGIN'           = 'https://channelad.io,https://www.channelad.io'
    'PUBLIC_BASE_URL'       = 'https://channelad.io'
}

# Parse .env + build the import payload with NODE + DOTENV — NOT a
# PowerShell regex. The earlier hand-rolled regex ('="?(.*?)"?') had an
# off-by-one on quoted values that captured one extra char on JWT_SECRET,
# so Fly's secret silently differed from Vercel's and every cross-host
# token verification failed with "invalid signature". dotenv parses byte
# -identically to how the Node runtime reads env vars, eliminating that
# whole class of bug. Node writes UTF-8 without BOM, so flyctl gets clean
# KEY=value lines (PowerShell's own piping would re-add a BOM).
$keysJson   = ($KEYS | ConvertTo-Json -Compress)
$extrasJson = ($FLY_EXTRAS | ConvertTo-Json -Compress)
$tempFile   = [System.IO.Path]::GetTempFileName()

$nodeScript = @'
const fs = require('fs');
const dotenv = require('dotenv');
const [envFile, outFile, keysJson, extrasJson] = process.argv.slice(2);
const parsed = dotenv.parse(fs.readFileSync(envFile));
const keys = JSON.parse(keysJson);
const extras = JSON.parse(extrasJson);
const lines = [];
for (const k of keys) {
  if (parsed[k] != null && parsed[k] !== '') lines.push(k + '=' + parsed[k]);
  else console.error('WARN: ' + k + ' not in env file - skipped');
}
for (const [k, v] of Object.entries(extras)) lines.push(k + '=' + v);
fs.writeFileSync(outFile, lines.join('\n') + '\n', { encoding: 'utf8' }); // Node = no BOM
console.error('Prepared ' + lines.length + ' secrets via dotenv');
'@
$nodeFile = [System.IO.Path]::GetTempFileName() + '.js'
[System.IO.File]::WriteAllText($nodeFile, $nodeScript, (New-Object System.Text.UTF8Encoding $false))
node $nodeFile $ENV_FILE $tempFile $keysJson $extrasJson
Remove-Item $nodeFile -ErrorAction SilentlyContinue
if ($LASTEXITCODE -ne 0) {
    Write-Host "Failed to build secrets payload via node/dotenv" -ForegroundColor Red
    exit 1
}

Write-Host "Importing secrets to Fly app '$APP'..." -ForegroundColor Cyan
# Redirect stdin via cmd /c so the clean (no-BOM) file reaches flyctl
# untouched — PowerShell's native piping would prepend a UTF-8 BOM and
# flyctl would reject the first key name.
try {
    cmd /c "flyctl secrets import --app $APP --stage < `"$tempFile`""
    if ($LASTEXITCODE -ne 0) {
        Write-Host "flyctl secrets import failed" -ForegroundColor Red
        exit 1
    }
}
finally {
    Remove-Item $tempFile -ErrorAction SilentlyContinue
}

Write-Host ""
Write-Host "Deploying..." -ForegroundColor Cyan
flyctl deploy --app $APP
if ($LASTEXITCODE -ne 0) {
    Write-Host "flyctl deploy failed - check: flyctl logs --app $APP" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "Smoke testing /health..." -ForegroundColor Cyan
try {
    $health = Invoke-RestMethod -Uri "https://$APP.fly.dev/health" -Method Get -TimeoutSec 30
    Write-Host "OK: $($health | ConvertTo-Json -Compress)" -ForegroundColor Green
}
catch {
    Write-Host "WARN: /health not responding yet. VM may still be starting." -ForegroundColor Yellow
}

Write-Host ""
Write-Host "Sidecar URL: https://$APP.fly.dev" -ForegroundColor Green
Write-Host ""
Write-Host "Next step: add to Vercel Production:" -ForegroundColor Cyan
Write-Host "  BAILEYS_SIDECAR_URL=https://$APP.fly.dev"
Write-Host "  VITE_BAILEYS_API_URL=https://$APP.fly.dev"
Write-Host ""
Write-Host "Cleanup local secret file: rm $ENV_FILE" -ForegroundColor Yellow
