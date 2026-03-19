param(
  [string]$OutputDir = "releases"
)

$ErrorActionPreference = "Stop"

$root = Split-Path -Parent $PSScriptRoot
$packageJsonPath = Join-Path $root "package.json"
$packageJson = Get-Content $packageJsonPath -Raw | ConvertFrom-Json
$version = [string]$packageJson.version
$bundleName = "zhufeng-student-system-v$version-bundle"
$stagingRoot = Join-Path $root $OutputDir
$stagingDir = Join-Path $stagingRoot $bundleName
$zipPath = Join-Path $stagingRoot ($bundleName + ".zip")

if (!(Test-Path $stagingRoot)) {
  New-Item -ItemType Directory -Path $stagingRoot | Out-Null
}

if (Test-Path $stagingDir) {
  Remove-Item $stagingDir -Recurse -Force
}

if (Test-Path $zipPath) {
  Remove-Item $zipPath -Force
}

New-Item -ItemType Directory -Path $stagingDir | Out-Null

$includePaths = @(
  "app",
  "components",
  "lib",
  "prisma",
  "public",
  "scripts",
  "Dockerfile",
  "docker-compose.deploy.yml",
  ".env.example",
  ".gitignore",
  "middleware.ts",
  "next.config.ts",
  "package.json",
  "package-lock.json",
  "postcss.config.mjs",
  "tailwind.config.ts",
  "tsconfig.json",
  "README.md",
  "CHANGELOG.md",
  "RELEASE.md"
)

foreach ($item in $includePaths) {
  $source = Join-Path $root $item
  if (Test-Path $source) {
    Copy-Item $source -Destination $stagingDir -Recurse -Force
  }
}

Compress-Archive -Path (Join-Path $stagingDir "*") -DestinationPath $zipPath -Force

Write-Host ("Release bundle created: " + $zipPath)
