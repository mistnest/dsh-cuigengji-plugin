param(
  [string]$DesktopExe = $env:DSH_DESKTOP_EXE,
  [string]$DshHome = (Join-Path $env:USERPROFILE '.dsh'),
  [string]$ReleaseDirectory = (Join-Path $PSScriptRoot '..\releases')
)
$ErrorActionPreference = 'Stop'
$projectDirectory = [IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..'))
if ([string]::IsNullOrWhiteSpace($DesktopExe)) {
  throw 'Pass -DesktopExe with the installed DeepSeek Harness executable path, or set DSH_DESKTOP_EXE.'
}
$DesktopExe = [IO.Path]::GetFullPath($DesktopExe)
$desktopDirectory = Split-Path -Parent $DesktopExe
$nodeShim = Join-Path $desktopDirectory 'resources\runtime\bin\node.cmd'
$pnpm = Join-Path $desktopDirectory 'resources\runtime\pnpm\bin\pnpm.mjs'
$profile = Join-Path $DshHome 'profiles\desktop'
foreach ($path in @($DesktopExe, $nodeShim, $pnpm, (Join-Path $profile 'package.json'))) {
  if (-not (Test-Path -LiteralPath $path)) { throw "Required installed desktop path missing: $path" }
}
if (Get-Process -ErrorAction SilentlyContinue | Where-Object { $_.Path -eq $DesktopExe }) {
  throw 'Exit DeepSeek Harness (including its tray process) before installing the plugin.'
}
$ReleaseDirectory = [IO.Path]::GetFullPath($ReleaseDirectory)
$null = New-Item -ItemType Directory -Path $ReleaseDirectory -Force
$previousNode = $env:DSH_DESKTOP_NODE_EXECUTABLE
Push-Location $projectDirectory
try {
  & npm.cmd pack --silent --pack-destination $ReleaseDirectory
  if ($LASTEXITCODE -ne 0) { throw 'Plugin build or pack failed.' }
  $manifest = Get-Content -LiteralPath 'package.json' -Encoding UTF8 -Raw | ConvertFrom-Json
  $archive = Join-Path $ReleaseDirectory "dsh-cuigengji-$($manifest.version).tgz"
  # pnpm can keep an older local tgz when only its contents change.
  # Give every distinct build a stable, content-addressed installation path.
  $digest = (Get-FileHash -LiteralPath $archive -Algorithm SHA256).Hash.Substring(0, 16).ToLowerInvariant()
  $installArchive = Join-Path $ReleaseDirectory "dsh-cuigengji-$($manifest.version)-$digest.tgz"
  if (-not (Test-Path -LiteralPath $installArchive)) {
    Copy-Item -LiteralPath $archive -Destination $installArchive
  }
  $env:DSH_DESKTOP_NODE_EXECUTABLE = $DesktopExe
  Set-Location -LiteralPath $profile
  & $nodeShim $pnpm add $installArchive
  if ($LASTEXITCODE -ne 0) { throw 'Desktop profile installation failed.' }
  $installedRoot = Join-Path $profile 'node_modules\dsh-cuigengji'
  $installed = Get-Content -LiteralPath (Join-Path $installedRoot 'package.json') -Encoding UTF8 -Raw | ConvertFrom-Json
  if ($installed.version -ne $manifest.version) { throw 'Installed plugin version differs.' }
  foreach ($relative in @('runtime\adapters\mcp\client.js', 'lib\client.js', 'README.md', 'package.json')) {
    $sourceHash = (Get-FileHash -LiteralPath (Join-Path $projectDirectory $relative)).Hash
    $installedHash = (Get-FileHash -LiteralPath (Join-Path $installedRoot $relative)).Hash
    if ($sourceHash -ne $installedHash) { throw "Installed file differs: $relative. Bump the plugin version and retry." }
  }
  Write-Output "Installed cuigengji $($installed.version) into $profile. Restart DeepSeek Harness."
} finally {
  $env:DSH_DESKTOP_NODE_EXECUTABLE = $previousNode
  Pop-Location
}
