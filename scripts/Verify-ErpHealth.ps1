param(
  [string]$ErpUrl = "https://erp.yatharthafoods.in"
)

$ErrorActionPreference = "Stop"

Write-Host "Checking ERP at $ErpUrl ..."

try {
  $login = Invoke-WebRequest -Uri "$ErpUrl/login" -UseBasicParsing -MaximumRedirection 5
  if ($login.StatusCode -ge 400) {
    throw "Login page returned $($login.StatusCode)"
  }
  Write-Host "OK  Login page reachable ($($login.StatusCode))"
} catch {
  Write-Error "ERP login page failed: $_"
}

try {
  $dns = Resolve-DnsName ([uri]$ErpUrl).Host -ErrorAction SilentlyContinue | Select-Object -First 3
  if ($dns) {
    Write-Host "OK  DNS for $(([uri]$ErpUrl).Host):"
    $dns | ForEach-Object {
      $target = if ($_.IPAddress) { $_.IPAddress } else { $_.NameHost }
      Write-Host "    $($_.Name) -> $target"
    }
  }
} catch {
  Write-Warning "Could not resolve DNS (may be fine if using CNAME): $_"
}

Write-Host ""
Write-Host "Next: sign in, change owner password, configure Settings -> Website sync, Publish to website."
