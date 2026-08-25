# Verify api.yatharthafoods.in DNS + TLS health for go-live.
# Usage: powershell -File scripts/Verify-ApiHealth.ps1

param(
  [string]$HostName = "api.yatharthafoods.in",
  [string]$ExpectedVmIp = ""
)

$ErrorActionPreference = "Continue"
Write-Host "=== DNS ($HostName) ===" -ForegroundColor Cyan

$records = @()
try {
  $records = Resolve-DnsName $HostName -Type A -ErrorAction Stop |
    Where-Object { $_.Type -eq "A" }
} catch {
  Write-Host "FAIL: DNS lookup failed - $($_.Exception.Message)" -ForegroundColor Red
  Write-Host "Add Cloudflare A record: api -> Vultr VM IP, Proxy = DNS only (grey cloud)."
  exit 1
}

$ips = @($records | ForEach-Object { $_.IPAddress } | Select-Object -Unique)
Write-Host ("A records: " + ($ips -join ", "))

$cloudflareHints = $ips | Where-Object {
  $_ -like "104.21.*" -or $_ -like "172.67.*" -or $_ -like "104.16.*" -or $_ -like "188.114.*"
}
if ($cloudflareHints.Count -gt 0) {
  Write-Host "FAIL: DNS still points at Cloudflare proxy IPs (orange cloud)." -ForegroundColor Red
  Write-Host "In Cloudflare -> DNS -> api: set Proxy to DNS only (grey cloud), then wait 2-5 minutes."
  exit 2
}

if ($ExpectedVmIp -and ($ips -notcontains $ExpectedVmIp)) {
  Write-Host "WARN: Expected VM IP $ExpectedVmIp not in A records." -ForegroundColor Yellow
} else {
  Write-Host "OK: DNS looks like direct-to-origin (not Cloudflare proxy)." -ForegroundColor Green
}

Write-Host ""
Write-Host "=== HTTPS /health ===" -ForegroundColor Cyan
$url = "https://$HostName/health"
try {
  $res = Invoke-WebRequest -Uri $url -UseBasicParsing -TimeoutSec 20
  Write-Host "Status: $($res.StatusCode)"
  Write-Host "Body:   $($res.Content)"
  if ($res.Content -match '"ok"\s*:\s*true') {
    Write-Host "OK: API health passed." -ForegroundColor Green
    exit 0
  }
  Write-Host "FAIL: Unexpected health body." -ForegroundColor Red
  exit 3
} catch {
  $msg = $_.Exception.Message
  Write-Host "FAIL: $msg" -ForegroundColor Red
  if ($msg -match "525") {
    Write-Host "Cloudflare 525: orange cloud without valid origin TLS - switch api to grey cloud, or install Caddy TLS on the VM."
  } elseif ($msg -match "SSL|certificate|handshake") {
    Write-Host "TLS issue: on the VM run: docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d --build"
  } else {
    Write-Host "Check firewall (443), Caddy, and: curl http://localhost:3001/health on the VM."
  }
  exit 4
}
