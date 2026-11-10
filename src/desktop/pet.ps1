param(
  [Parameter(Mandatory = $true)][string]$StateDirectory,
  [Parameter(Mandatory = $true)][string]$AssetsDirectory,
  [int]$ParentProcessId = 0,
  [string]$SelfTestOutput = '',
  [switch]$Headless
)
$ErrorActionPreference = 'Stop'
[Console]::InputEncoding = New-Object System.Text.UTF8Encoding($false)
[Console]::OutputEncoding = New-Object System.Text.UTF8Encoding($false)
Add-Type -AssemblyName PresentationFramework, PresentationCore, WindowsBase, System.Xaml, System.Web.Extensions, System.Windows.Forms, System.Drawing
$references = @(
  [System.Windows.Window].Assembly.Location,
  [System.Windows.Media.Imaging.BitmapSource].Assembly.Location,
  [System.Windows.Threading.Dispatcher].Assembly.Location,
  [System.Xaml.XamlReader].Assembly.Location,
  [System.Web.Script.Serialization.JavaScriptSerializer].Assembly.Location,
  [System.Windows.Forms.Screen].Assembly.Location,
  [System.Drawing.Point].Assembly.Location,
  'System.dll'
)
Add-Type -Path @((Join-Path $PSScriptRoot 'PetWindow.cs'), (Join-Path $PSScriptRoot 'PetSummary.cs')) -ReferencedAssemblies $references
if ($SelfTestOutput) {
  [Cuigengji.Desktop.PetWindow]::SelfTest($StateDirectory, $AssetsDirectory, $SelfTestOutput)
} else {
  [Cuigengji.Desktop.PetWindow]::Run($StateDirectory, $AssetsDirectory, $ParentProcessId, [bool]$Headless)
}
