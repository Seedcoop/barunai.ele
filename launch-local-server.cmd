@echo off
setlocal EnableExtensions EnableDelayedExpansion
chcp 65001 >nul
cd /d "%~dp0"

set "PORT=5510"
set "URL=http://127.0.0.1:%PORT%/edu-ai-image-lab.html"

if not exist "__serve_local_5500.cjs" (
  echo [ERROR] __serve_local_5500.cjs not found.
  pause
  exit /b 1
)

set "LISTEN_PID="
for /f "tokens=5" %%P in ('netstat -ano ^| findstr ":%PORT%" ^| findstr "LISTENING"') do (
  set "LISTEN_PID=%%P"
  goto :found
)

:found
if defined LISTEN_PID (
  echo [INFO] Local server already running on port !PORT!; PID !LISTEN_PID!.
) else (
  echo [INFO] Starting local server on port !PORT!...
  powershell -NoProfile -Command "Start-Process -FilePath 'C:\\Program Files\\nodejs\\node.exe' -ArgumentList '__serve_local_5500.cjs' -WorkingDirectory '%CD%' -WindowStyle Minimized" >nul 2>nul
  timeout /t 1 >nul
)

powershell -NoProfile -Command "Start-Process '%URL%'" >nul 2>nul
echo [INFO] Opened: %URL%
echo [INFO] Keep this window for logs and close when done.

endlocal
