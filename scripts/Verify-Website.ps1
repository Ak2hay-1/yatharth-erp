# Smoke-check the public marketing site.
# Usage: powershell -File scripts/Verify-Website.ps1

param(
  [string]$Site = "https://yatharthafoods.in",
  [string]$Api = "https://api.yatharthafoods.in"
)

$ErrorActionPreference = "Continue"
$failed = 0

function Test-Url([string]$Url, [string]$ExpectMatch = "") {
  Write-Host "GET $Url" -ForegroundColor Cyan
  try {
    $tmp = [System.IO.Path]::GetTempFileName()
    $code = & curl.exe -sL -o $tmp -w "%{http_code}" --max-time 25 $Url
    $content = Get-Content -Raw -Path $tmp -ErrorAction SilentlyContinue
    Remove-Item $tmp -Force -ErrorAction SilentlyContinue
    Write-Host "  $code ($($content.Length) bytes)"
    if ($code -notmatch '^2') {
      Write-Host "  FAIL: HTTP $code" -ForegroundColor Red
      return $false
    }
    if ($ExpectMatch -and ($content -notmatch $ExpectMatch)) {
      Write-Host "  FAIL: body did not match /$ExpectMatch/" -ForegroundColor Red
      return $false
    }
    return $true
  } catch {
    Write-Host "  FAIL: $($_.Exception.Message)" -ForegroundColor Red
    return $false
  }
}

if (-not (Test-Url $Site)) { $failed++ }
if (-not (Test-Url "$Site/sitemap.xml" "urlset|url")) { $failed++ }
if (-not (Test-Url "$Site/products")) { $failed++ }
if (-not (Test-Url "$Site/price-list")) { $failed++ }
if (-not (Test-Url "$Site/contact")) { $failed++ }

Write-Host ""
Write-Host "=== Catalog API (needs TLS + published catalog) ===" -ForegroundColor Cyan
$apiTmp = [System.IO.Path]::GetTempFileName()
$apiCode = & curl.exe -sL -o $apiTmp -w "%{http_code}" --max-time 20 "$Api/health"
$apiBody = Get-Content -Raw -Path $apiTmp -ErrorAction SilentlyContinue
Remove-Item $apiTmp -Force -ErrorAction SilentlyContinue
Write-Host "health: $apiCode $apiBody"
if ($apiCode -ne "200") {
  Write-Host "FAIL API health" -ForegroundColor Red
  $failed++
} else {
  $listTmp = [System.IO.Path]::GetTempFileName()
  $listCode = & curl.exe -sL -o $listTmp -w "%{http_code}" --max-time 20 "$Api/v1/public/price-list"
  $listBody = Get-Content -Raw -Path $listTmp -ErrorAction SilentlyContinue
  Remove-Item $listTmp -Force -ErrorAction SilentlyContinue
  $snippetLen = [Math]::Min(180, $listBody.Length)
  Write-Host "price-list: $listCode $($listBody.Substring(0, $snippetLen))"
  if ($listBody -match '"veg"\s*:\s*\[\s*\]' -and $listBody -match '"nonVeg"\s*:\s*\[\s*\]') {
    Write-Host "WARN: price-list is empty - publish from ERP Settings -> Website sync." -ForegroundColor Yellow
  }
  if ($listCode -ne "200") {
    Write-Host "FAIL API price-list" -ForegroundColor Red
    $failed++
  }
}

if ($failed -gt 0) {
  Write-Host ""
  Write-Host "Website smoke finished with $failed failure(s)." -ForegroundColor Red
  exit 1
}
Write-Host ""
Write-Host "Website smoke passed." -ForegroundColor Green
