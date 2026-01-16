@echo off
setlocal
cd /d "%~dp0"

set PORT=5544
set ROOT_DIR=C:\Project-P1L0T
set DATA_DIR=C:\Project-P1L0T\data

if not "%P1LOT_ROOT%"=="" set ROOT_DIR=%P1LOT_ROOT%
if not "%P1LOT_DATA_DIR%"=="" set DATA_DIR=%P1LOT_DATA_DIR%

set CONFIG_PATH=%DATA_DIR%\launcher.config.json

for /f "usebackq delims=" %%p in (`powershell -NoProfile -Command "try { (Get-Content -Raw '%CONFIG_PATH%' | ConvertFrom-Json).port } catch { '' }"`) do set PORT=%%p
if "%PORT%"=="" set PORT=5544

if exist "desktop\node_modules\.bin\electron.cmd" (
  call "desktop\start.cmd"
  exit /b 0
)

echo Electron not installed yet. Run desktop\install.cmd first.
echo Falling back to browser launcher...
start "" cmd /c "set P1LOT_PORT=%PORT% && set P1LOT_ROOT=%ROOT_DIR% && set P1LOT_DATA_DIR=%DATA_DIR% && node server.js"
for /l %%x in (1, 1, 10) do (
  timeout /t 1 /nobreak >nul
  powershell -NoProfile -Command "try { (Invoke-WebRequest -UseBasicParsing -TimeoutSec 1 http://localhost:%PORT%/api/health | Out-Null); exit 0 } catch { exit 1 }" >nul 2>&1
  if %errorlevel%==0 goto open
)
:open
start "" "http://localhost:%PORT%"
endlocal
