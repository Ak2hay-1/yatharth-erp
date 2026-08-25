# Generate production secrets for VM + Vercel + ERP website sync.
# Writes secrets/prod-secrets.env (gitignored). Does not print full secrets unless -Show.

param(
  [switch]$Show
)

function New-HexSecret([int]$Bytes = 32) {
  $rng = New-Object System.Security.Cryptography.RNGCryptoServiceProvider
  $buf = New-Object byte[] $Bytes
  $rng.GetBytes($buf)
  -join ($buf | ForEach-Object { $_.ToString("x2") })
}

$root = Split-Path -Parent $PSScriptRoot
$outDir = Join-Path $root "secrets"
$outFile = Join-Path $outDir "prod-secrets.env"

New-Item -ItemType Directory -Force -Path $outDir | Out-Null

$sync = New-HexSecret 32
$revalidate = New-HexSecret 32
$pgPass = New-HexSecret 24
$auth = New-HexSecret 32

@(
  "# Generated $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss') - do not commit"
  "# Copy values into:"
  "#   - services/sync-api/.env (VM)"
  "#   - Vercel -> website project env"
  "#   - ERP Settings -> Website sync (API URL + SYNC_SECRET)"
  ""
  "SYNC_SECRET=$sync"
  "REVALIDATE_WEBHOOK_SECRET=$revalidate"
  "POSTGRES_PASSWORD=$pgPass"
  "POSTGRES_USER=yatharth"
  "POSTGRES_DB=yatharth_sync"
  "WEBSITE_ORIGIN=https://yatharthafoods.in"
  "VERCEL_REVALIDATE_URL=https://yatharthafoods.in/api/revalidate"
  ""
  "# Vercel website"
  "NEXT_PUBLIC_SITE_URL=https://yatharthafoods.in"
  "NEXT_PUBLIC_API_URL=https://api.yatharthafoods.in"
  ""
  "# Optional contact email (SMTP)"
  "CONTACT_NOTIFY_TO=accounts@yatharthfoods.in"
  "CONTACT_NOTIFY_FROM=noreply@yatharthafoods.in"
  "SMTP_HOST="
  "SMTP_PORT=587"
  "SMTP_USER="
  "SMTP_PASS="
  ""
  "# Local ERP .env (office PC / Electron)"
  "AUTH_SECRET=$auth"
) | Set-Content -Path $outFile -Encoding ascii

Write-Host "Wrote $outFile" -ForegroundColor Green
Write-Host "Apply SYNC_SECRET + REVALIDATE_WEBHOOK_SECRET + POSTGRES_PASSWORD on the VM and Vercel."
if ($Show) {
  Get-Content $outFile
} else {
  Write-Host "Re-run with -Show to print values in this terminal."
}
