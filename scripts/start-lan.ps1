$ErrorActionPreference = "Stop"

$root = Split-Path -Parent $PSScriptRoot
Set-Location $root

if (-not $env:PORT) {
  $env:PORT = "3021"
}

if (-not $env:HOSTNAME) {
  $env:HOSTNAME = "0.0.0.0"
}

Write-Host "Building 珠峰学员管理系统..."
npm run build

Write-Host "Starting LAN server on $($env:HOSTNAME):$($env:PORT)..."
npm run start -- --hostname $env:HOSTNAME --port $env:PORT
