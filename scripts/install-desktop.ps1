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
$pnpmCandidates = @(
  (Join-Path $desktopDirectory 'resources\runtime\pnpm\bin\pnpm.mjs'),
  # DSH 0.2.1-rc.2 moved bundled dependencies under primary-runtime.
  (Join-Path $desktopDirectory 'resources\runtime\primary-runtime\dependencies\pnpm\bin\pnpm.mjs')
)
$pnpm = $pnpmCandidates | Where-Object { Test-Path -LiteralPath $_ } | Select-Object -First 1
$profile = Join-Path $DshHome 'profiles\desktop'
foreach ($path in @($DesktopExe, $nodeShim, $pnpm, (Join-Path $profile 'package.json'))) {
  if (-not (Test-Path -LiteralPath $path)) { throw "Required installed desktop path missing: $path" }
}
$processDetector = Join-Path $projectDirectory 'runtime\modules\access\dsh\desktop-processes.js'
function Confirm-DesktopStopped {
  $previousNode = $env:DSH_DESKTOP_NODE_EXECUTABLE
  try {
    $env:DSH_DESKTOP_NODE_EXECUTABLE = $DesktopExe
    $result = & $nodeShim $processDetector $DesktopExe
    if ($LASTEXITCODE -ne 0 -or -not $result) { throw 'Could not confirm that DeepSeek Harness is stopped.' }
    $processes = $result | ConvertFrom-Json
  } finally {
    $env:DSH_DESKTOP_NODE_EXECUTABLE = $previousNode
  }
  if ($processes.Desktop.Count) {
    throw 'Exit DeepSeek Harness (including its tray process) before installing the plugin.'
  }
  return $processes
}
$null = Confirm-DesktopStopped
$ReleaseDirectory = [IO.Path]::GetFullPath($ReleaseDirectory)
$null = New-Item -ItemType Directory -Path $ReleaseDirectory -Force
$previousNode = $env:DSH_DESKTOP_NODE_EXECUTABLE
Push-Location $projectDirectory
try {
  & npm.cmd run typecheck
  if ($LASTEXITCODE -ne 0) { throw 'Plugin typecheck failed.' }
  & npm.cmd run build
  if ($LASTEXITCODE -ne 0) { throw 'Plugin build failed.' }
  & npm.cmd pack --ignore-scripts --silent --pack-destination $ReleaseDirectory
  if ($LASTEXITCODE -ne 0) { throw 'Plugin build or pack failed.' }
  $manifest = Get-Content -LiteralPath 'package.json' -Encoding UTF8 -Raw | ConvertFrom-Json
  $archive = Join-Path $ReleaseDirectory "$($manifest.name)-$($manifest.version).tgz"
  # pnpm can keep an older local tgz when only its contents change.
  # Give every distinct build a stable, content-addressed installation path.
  $digest = (Get-FileHash -LiteralPath $archive -Algorithm SHA256).Hash.Substring(0, 16).ToLowerInvariant()
  $installArchive = Join-Path $ReleaseDirectory "$($manifest.name)-$($manifest.version)-$digest.tgz"
  if (-not (Test-Path -LiteralPath $installArchive)) {
    Copy-Item -LiteralPath $archive -Destination $installArchive
  }
  $env:DSH_DESKTOP_NODE_EXECUTABLE = $DesktopExe
  $processes = Confirm-DesktopStopped
  $profileManifestPath = Join-Path $profile 'package.json'
  $profileManifestRaw = [IO.File]::ReadAllText($profileManifestPath, [Text.UTF8Encoding]::new($false))
  $existingFilePattern = '("' + [regex]::Escape($manifest.name) + '"\s*:\s*")file:([^"]+)(")'
  $match = [regex]::Match($profileManifestRaw, $existingFilePattern)
  $updatedManifestRaw = $null
  if ($match.Success -and -not (Test-Path -LiteralPath ($match.Groups[2].Value -replace '/','\'))) {
    # DSH 0.2.3+ bundles pnpm 11, which stats existing file: tarballs before
    # replacing them during `pnpm add`. Point stale entries at the new archive first.
    $normalizedArchive = $installArchive -replace '\\','/'
    $updatedManifestRaw = [regex]::Replace($profileManifestRaw, $existingFilePattern, "`${1}file:$normalizedArchive`${3}", 1)
    [IO.File]::WriteAllText($profileManifestPath, $updatedManifestRaw, [Text.UTF8Encoding]::new($false))
  }
  Set-Location -LiteralPath $profile
  & $nodeShim $pnpm add $installArchive
  if ($LASTEXITCODE -ne 0) {
    if ($null -ne $updatedManifestRaw -and [IO.File]::ReadAllText($profileManifestPath) -ceq $updatedManifestRaw) {
      [IO.File]::WriteAllText($profileManifestPath, $profileManifestRaw, [Text.UTF8Encoding]::new($false))
    }
    if ($processes.ExternalMcp.Count) {
      throw 'Desktop profile installation failed. If pnpm reports locked files, close the external MCP client that started the connector and retry.'
    }
    throw 'Desktop profile installation failed.'
  }
  $installedRoot = Join-Path (Join-Path $profile 'node_modules') $manifest.name
  $installed = Get-Content -LiteralPath (Join-Path $installedRoot 'package.json') -Encoding UTF8 -Raw | ConvertFrom-Json
  if ($installed.version -ne $manifest.version) { throw 'Installed plugin version differs.' }
  foreach ($relative in @('runtime\modules\access\mcp\client.js', 'runtime\adapters\dsh\rename-installation.js', 'runtime\modules\access\dsh\desktop-processes.js', 'runtime\modules\author-ui\desktop\desktop.js', 'src\modules\author-ui\desktop\pet.ps1', 'src\modules\author-ui\desktop\PetWindow.cs', 'src\modules\author-ui\workbench\assets\pets\bigfish-pet-poses.png', 'src\modules\author-ui\workbench\assets\pets\cuigengji-pet-poses.png', 'lib\client.js', 'README.md', 'package.json')) {
    $sourceHash = (Get-FileHash -LiteralPath (Join-Path $projectDirectory $relative)).Hash
    $installedHash = (Get-FileHash -LiteralPath (Join-Path $installedRoot $relative)).Hash
    if ($sourceHash -ne $installedHash) { throw "Installed file differs: $relative. Bump the plugin version and retry." }
  }
  # The author workspace has the build/host dependencies. A desktop profile
  # resolves host peers through DSH's loader, unavailable to standalone Node.
  # Run the identical, hash-checked helper from the workspace instead.
  & $nodeShim (Join-Path $projectDirectory 'runtime\adapters\dsh\rename-installation.js') --profile $profile --home $DshHome --apply --desktop-exe $DesktopExe
  if ($LASTEXITCODE -ne 0) { throw 'Installation identity migration failed; keep DSH closed and retain its configuration backup.' }
  Write-Output "Installed $($installed.name) $($installed.version) into $profile. Restart DeepSeek Harness."
} finally {
  $env:DSH_DESKTOP_NODE_EXECUTABLE = $previousNode
  Pop-Location
}
