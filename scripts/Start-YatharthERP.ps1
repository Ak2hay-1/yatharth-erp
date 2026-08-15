# Yatharth Foods ERP — desktop launcher
# Opens the Electron desktop shell (starts Next.js inside Electron, stops it on quit).

$ErrorActionPreference = "Stop"

$AppName = "Yatharth Foods ERP"
$AppDir = Split-Path -Parent $PSScriptRoot
$ElectronCmd = Join-Path $AppDir "node_modules\.bin\electron.cmd"

function Show-Error([string]$message) {
  Add-Type -AssemblyName System.Windows.Forms
  [System.Windows.Forms.MessageBox]::Show(
    $message,
    $AppName,
    [System.Windows.Forms.MessageBoxButtons]::OK,
    [System.Windows.Forms.MessageBoxIcon]::Error
  ) | Out-Null
}

try {
  if (-not (Get-Command npm -ErrorAction SilentlyContinue)) {
    $nodeDir = "C:\Program Files\nodejs"
    if (Test-Path (Join-Path $nodeDir "npm.cmd")) {
      $env:Path = "$nodeDir;" + $env:Path
    }
  }

  if (-not (Get-Command npm -ErrorAction SilentlyContinue)) {
    throw "Node.js/npm was not found. Install Node.js 20+ from https://nodejs.org/ and try again."
  }

  if (-not (Test-Path -LiteralPath $ElectronCmd)) {
    throw "Electron is not installed. Open a terminal in:`n$AppDir`n`nThen run:`nnpm install"
  }

  # Prefer production build when .next exists; otherwise --dev for first-time / local work.
  $hasBuild = Test-Path -LiteralPath (Join-Path $AppDir ".next\BUILD_ID")
  $args = @(".")
  if (-not $hasBuild) {
    $args += "--dev"
  }

  Start-Process -FilePath $ElectronCmd -ArgumentList $args -WorkingDirectory $AppDir
} catch {
  Show-Error $_.Exception.Message
  exit 1
}
