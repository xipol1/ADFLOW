<#
.SYNOPSIS
  Repoint the frontend's Baileys/WhatsApp sidecar at a new host (e.g. the free
  Oracle Cloud worker) by updating the Vercel production env vars.

.DESCRIPTION
  The frontend (client/src/services/api.js) routes only /baileys/* calls to a
  separate host, read at BUILD time from VITE_BAILEYS_API_URL (the client appends
  /api itself). BAILEYS_SIDECAR_URL is the backend's informational copy returned
  in the Vercel 503 body. This script sets BOTH for Production.

  Because VITE_* is build-time, a REDEPLOY is required for the change to take
  effect — the script reminds you (it does not deploy from your local tree, to
  avoid shipping uncommitted code).

  Requires: Vercel CLI logged in + project linked (.vercel/project.json). Both
  are already true on this machine.

.PARAMETER Url
  The sidecar base URL, WITHOUT a trailing /api. e.g. https://api-worker.channelad.io

.EXAMPLE
  .\scripts\set-vercel-baileys-url.ps1 -Url https://api-worker.channelad.io
#>
param(
  [Parameter(Mandatory = $true)][string]$Url
)

$ErrorActionPreference = 'Stop'
$Url = $Url.TrimEnd('/')
if ($Url -notmatch '^https://') { throw "Url must start with https:// (got: $Url)" }
if ($Url -match '/api$') { throw "Drop the trailing /api - the frontend adds it. Use e.g. https://api-worker.channelad.io" }
if (-not (Test-Path ".vercel/project.json")) { throw "Run from the repo root (no .vercel/project.json found here)." }

$vars = @('VITE_BAILEYS_API_URL', 'BAILEYS_SIDECAR_URL')
foreach ($name in $vars) {
  Write-Host "Updating $name -> $Url (Production)..." -ForegroundColor Cyan
  # Remove the old value if it exists (swallow error if absent), then add the new one.
  try { vercel env rm $name production --yes 2>$null } catch {}
  $Url | vercel env add $name production
}

Write-Host ""
Write-Host "Done. Both vars now point at $Url." -ForegroundColor Green
Write-Host "VITE_BAILEYS_API_URL is baked at build time -> REDEPLOY to apply:" -ForegroundColor Yellow
Write-Host "  - Vercel dashboard -> Deployments -> latest -> Redeploy, OR"
Write-Host "  - push any commit to main (Vercel rebuilds with the new env)."
Write-Host ""
Write-Host "Verify after redeploy: open the app, start WhatsApp linking, and check the"
Write-Host "Network tab -> /baileys/* requests should hit $Url/api ."
