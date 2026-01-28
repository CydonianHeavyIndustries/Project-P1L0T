$ErrorActionPreference = "Stop"

Write-Host "Installing UI dependencies..."
Push-Location "ui"
if (-not (Test-Path "node_modules")) {
  npm install
} else {
  npm install
}

Write-Host "Building UI..."
npm run build
Pop-Location

Write-Host "Installing launcher desktop dependencies..."
Push-Location "launcher/desktop"
if (-not (Test-Path "node_modules")) {
  npm install
} else {
  npm install
}

Write-Host "Syncing UI build into launcher/web..."
Pop-Location
if (Test-Path "launcher/web") {
  Remove-Item -Recurse -Force "launcher/web"
}
New-Item -ItemType Directory -Force "launcher/web" | Out-Null
Copy-Item -Recurse -Force "ui/dist/*" "launcher/web"

Write-Host "Building installer..."
Push-Location "launcher/desktop"
$env:CSC_IDENTITY_AUTO_DISCOVERY = "false"
npm run dist
Pop-Location

Write-Host "Done. Installer is in launcher/desktop/dist"
