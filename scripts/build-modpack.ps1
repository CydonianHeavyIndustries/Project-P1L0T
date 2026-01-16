param(
  [string]$ModpackDir = "modpack",
  [string]$Output = "Project-P1L0T-modpack.zip"
)

$repoRoot = Resolve-Path (Join-Path $PSScriptRoot "..")
$sourcePath = Join-Path $repoRoot $ModpackDir
$outputPath = Join-Path $repoRoot $Output

if (-not (Test-Path -Path $sourcePath)) {
  throw "Modpack folder not found: $sourcePath"
}

if (Test-Path -Path $outputPath) {
  Remove-Item -Path $outputPath -Force
}

Compress-Archive -Path (Join-Path $sourcePath "*") -DestinationPath $outputPath -Force
Write-Host "Wrote modpack archive: $outputPath"
