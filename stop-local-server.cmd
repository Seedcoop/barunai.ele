@echo off
setlocal
set "PORT=5510"
set "KILLED=0"
for /f "tokens=5" %%P in ('netstat -ano ^| findstr ":%PORT%" ^| findstr "LISTENING"') do (
  taskkill /PID %%P /F >nul 2>nul
  set "KILLED=1"
)
if "%KILLED%"=="1" (
  echo [INFO] Stopped local server on port %PORT%.
) else (
  echo [INFO] No server was listening on port %PORT%.
)
endlocal
