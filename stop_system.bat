@echo off
setlocal EnableDelayedExpansion
title aSK//YOUTH AI System - Shutdown
echo ============================================================
echo           aSK//YOUTH AI System - Stopping All Services
echo ============================================================
echo.

set "ROOT=%~dp0"
set "PYDIR=%ROOT%backend\tools"

:: --- [1/6] PM2 Python microservices ---
echo [1/6] Stopping PM2 Python microservices (5000-5008^)...
if exist "%PYDIR%\pm2.ecosystem.config.cjs" (
  pushd "%PYDIR%"
  where npx >nul 2>&1
  if not errorlevel 1 (
    call npx pm2 stop all >nul 2>&1
    call npx pm2 delete all >nul 2>&1
    echo       PM2 processes stopped.
  ) else (
    echo       npx not found — killing ports directly.
  )
  popd
) else (
  echo       pm2.ecosystem.config.cjs not found — skipping PM2.
)

:: Fallback: kill listeners on microservice ports
for %%P in (5000 5001 5002 5003 5004 5005 5007 5008) do (
  for /f "tokens=5" %%a in ('netstat -aon 2^>nul ^| findstr ":%%P.*LISTENING"') do (
    taskkill /PID %%a /F >nul 2>&1
  )
)
echo       Ports 5000-5008 cleared.

:: --- [2/6] Legacy Python AI layer ---
echo [2/6] Stopping Python AI Layer (port 8000^)...
for /f "tokens=5" %%a in ('netstat -aon 2^>nul ^| findstr ":8000.*LISTENING"') do (
  taskkill /PID %%a /F >nul 2>&1
)
echo       Done.

:: --- [3/6] Node backend ---
echo [3/6] Stopping Node.js Backend (port 3001^)...
for /f "tokens=5" %%a in ('netstat -aon 2^>nul ^| findstr ":3001.*LISTENING"') do (
  taskkill /PID %%a /F >nul 2>&1
)
echo       Done.

:: --- [4/6] Frontend dev ---
echo [4/6] Stopping Frontend Dev Server (port 5174^)...
for /f "tokens=5" %%a in ('netstat -aon 2^>nul ^| findstr ":5174.*LISTENING"') do (
  taskkill /PID %%a /F >nul 2>&1
)
echo       Done.

:: --- [5/6] Cloudflare tunnel ---
echo [5/6] Stopping Cloudflare Tunnel (cloudflared.exe^)...
taskkill /IM cloudflared.exe /F >nul 2>&1
echo       Done.

:: --- [6/6] Orphan CMD windows (optional titles) ---
echo [6/6] Closing launcher CMD windows by title...
taskkill /FI "WINDOWTITLE eq aSK YOUTH - Python AI Layer*" /F >nul 2>&1
taskkill /FI "WINDOWTITLE eq aSK YOUTH - Node.js Backend*" /F >nul 2>&1
taskkill /FI "WINDOWTITLE eq aSK YOUTH - Cloudflare Tunnel*" /F >nul 2>&1
taskkill /FI "WINDOWTITLE eq aSK YOUTH - Frontend*" /F >nul 2>&1
echo       Done.

echo.
echo ============================================================
echo   All services stopped.
echo   Restart: start_system.bat  or  start.bat
echo ============================================================
echo.
pause
endlocal
