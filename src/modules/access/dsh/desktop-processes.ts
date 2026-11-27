import {spawnSync} from 'node:child_process';
import {isAbsolute, join, resolve} from 'node:path';
import {fileURLToPath} from 'node:url';

// Only the known Node-mode connector with a confirmed zero window handle can be ignored.
export const desktopProcessQuery = String.raw`
$ErrorActionPreference = 'Stop'
$desktopExe = $env:CUIGENGJI_PROCESS_DESKTOP_EXE
$ignoreProcessId = [int]$env:CUIGENGJI_PROCESS_NODE_PID
$desktopName = [IO.Path]::GetFileName($desktopExe)
$desktop = @()
$bridges = @()
$connector = '^\s*(?:"[^"]+"|[^\s"]+)\s+(?:--expose-internals\s+)?(?:"(?:[^"]*[\\/])?external-server\.js"|(?:[^\s"]*[\\/])?external-server\.js)\s+--connection\s+(?:"[^"]+"|[^\s"]+)\s*$'
foreach ($entry in Get-CimInstance Win32_Process) {
  if ($entry.ProcessId -eq $ignoreProcessId) { continue }
  if ($entry.ExecutablePath -ne $desktopExe -and ($entry.ExecutablePath -or $entry.Name -ne $desktopName)) { continue }
  if ($entry.ExecutablePath -eq $desktopExe -and $entry.CommandLine -match $connector) {
    $process = Get-Process -Id $entry.ProcessId -ErrorAction SilentlyContinue
    if ($null -ne $process -and $process.MainWindowHandle -eq [IntPtr]::Zero) {
      $bridges += $entry.ProcessId
      continue
    }
  }
  $desktop += $entry.ProcessId
}
[pscustomobject]@{ Desktop = $desktop; ExternalMcp = $bridges } | ConvertTo-Json -Compress
`;

export function queryDesktopProcesses(desktopExe: string) {
  if (process.platform !== 'win32' || !isAbsolute(desktopExe)) {
    throw new Error('Desktop process detection requires Windows and an absolute executable path');
  }
  const powershell = join(process.env.SystemRoot || 'C:\\Windows', 'System32', 'WindowsPowerShell', 'v1.0', 'powershell.exe');
  const command = Buffer.from(desktopProcessQuery, 'utf16le').toString('base64');
  const result = spawnSync(powershell, ['-NoProfile', '-NonInteractive', '-EncodedCommand', command], {
    env: {...process.env, CUIGENGJI_PROCESS_DESKTOP_EXE: resolve(desktopExe), CUIGENGJI_PROCESS_NODE_PID: String(process.pid)},
    encoding: 'utf8', windowsHide: true, timeout: 15000,
  });
  if (result.error || result.status !== 0) {
    const detail = result.error?.message || `PowerShell exited with status ${result.status}`;
    throw Object.assign(new Error(`Could not confirm that DSH is stopped (${detail})`), {code: 'DSH_STOP_UNKNOWN'});
  }
  const processes: {Desktop: number[]; ExternalMcp: number[]} = JSON.parse(result.stdout);
  if (!Array.isArray(processes.Desktop) || !Array.isArray(processes.ExternalMcp)) {
    throw new Error('Invalid process list from Windows');
  }
  return processes;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  console.log(JSON.stringify(queryDesktopProcesses(process.argv[2] || '')));
}
