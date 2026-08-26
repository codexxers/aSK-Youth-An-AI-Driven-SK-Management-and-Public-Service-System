@echo off
setlocal EnableDelayedExpansion
title aSK//YOUTH AI System - Launcher
echo ============================================================
echo           aSK//YOUTH AI System - Starting All Services
echo ============================================================
echo   ROOT: %~dp0
echo   Production UI: Vercel  ^|  API: https://api.askyouth.online
echo   Local dev UI below is optional.
echo.

set "ROOT=%~dp0"
set "ROOTNS=%ROOT:~0,-1%"
set "PYDIR=%ROOT%backend\tools"
set "PM2_ECOSYSTEM=%PYDIR%\pm2.ecosystem.config.cjs"

set "PYEXE="
if exist "%ROOT%.venv\Scripts\python.exe" set "PYEXE=%ROOT%.venv\Scripts\python.exe"
if not defined PYEXE if exist "%ROOT%ai-layer\venv\Scripts\python.exe" set "PYEXE=%ROOT%ai-layer\venv\Scripts\python.exe"
if not defined PYEXE (
  where python >nul 2>&1 && set "PYEXE=python"
)
if not defined PYEXE (
  echo [ERROR] No Python found. Install Python or run setup_project.bat.
  pause
  exit /b 1
)

where npx >nul 2>&1
if errorlevel 1 (
  echo [ERROR] npx not found. Install Node.js LTS from https://nodejs.org/
  pause
  exit /b 1
)

set "CF_TUNNEL="
if exist "%ROOT%cloudflared-tunnel-name.txt" (
  for /f "usebackq delims=" %%a in ("%ROOT%cloudflared-tunnel-name.txt") do set "CF_TUNNEL=%%a"
)

:: --- [1/5] PM2 Python microservices (5000-5008) ---
echo [1/5] Starting Python microservices via PM2 (ports 5000-5008^)...
if not exist "%PM2_ECOSYSTEM%" (
  echo [ERROR] Missing: %PM2_ECOSYSTEM%
  pause
  exit /b 1
)
if not exist "%PYDIR%\.env" (
  if exist "%PYDIR%\.env.example" (
    echo       Creating .env from .env.example — set DB_PASS before budget/attendance tools work.
    copy /Y "%PYDIR%\.env.example" "%PYDIR%\.env" >nul
  ) else (
    echo [WARN] No %PYDIR%\.env — copy .env.example and set DB_PASS.
  )
)
pushd "%PYDIR%"
call npx pm2 start pm2.ecosystem.config.cjs
if errorlevel 1 (
  echo [ERROR] PM2 start failed. Try: cd "%PYDIR%" ^&^& npx pm2 start pm2.ecosystem.config.cjs
  popd
  pause
  exit /b 1
)
call npx pm2 save >nul 2>&1
popd
echo       PM2 apps: sk-router sk-docgen sk-budget sk-attendance sk-narrative sk-summary sk-context sk-language
timeout /t 6 /nobreak >nul

:: --- [2/5] Legacy Python AI layer (8000) — embeddings, OCR, legacy routes ---
echo [2/5] Starting Python AI Layer legacy (port 8000^)...
echo       Interpreter: !PYEXE!
start "aSK YOUTH - Python AI Layer" cmd /k cd /d "%ROOT%ai-layer" ^&^& "!PYEXE!" -m uvicorn main:app --host 0.0.0.0 --port 8000
timeout /t 10 /nobreak >nul

:: --- [3/5] Node backend + Qwen (3001) ---
echo [3/5] Starting Node.js Backend + Qwen (port 3001^)...
echo       Uses llm_config.mjs — VRAM ladder picks ctx size automatically.
start "aSK YOUTH - Node.js Backend" cmd /k cd /d "%ROOT%backend" ^&^& node server.js
timeout /t 12 /nobreak >nul

:: --- [4/5] Cloudflare tunnel ---
if defined CF_TUNNEL (
  where cloudflared >nul 2>&1
  if errorlevel 1 (
    echo [4/5] SKIPPED: cloudflared not in PATH.
    echo           https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/downloads/
  ) else (
    echo [4/5] Starting Cloudflare Tunnel ^(!CF_TUNNEL!^)...
    start "aSK YOUTH - Cloudflare Tunnel" cmd /k call "%ROOT%scripts\run_cloudflare_tunnel.bat" !CF_TUNNEL! "!ROOTNS!"
    timeout /t 3 /nobreak >nul
  )
) else (
  echo [4/5] SKIPPED: cloudflared-tunnel-name.txt missing.
  echo           Line 1 = tunnel name. See cloudflared-tunnel-name.example
)

:: --- [5/5] Frontend dev (5174) — local only ---
echo [5/5] Starting Frontend Dev Server (port 5174^) — optional local UI...
if not exist "%ROOT%frontend\package.json" (
  echo [WARN] frontend\package.json not found — skipped.
) else (
  start "aSK YOUTH - Frontend" cmd /k cd /d "%ROOT%frontend" ^&^& npm run dev
  timeout /t 5 /nobreak >nul
  start "" "http://localhost:5174"
)

echo.
echo ============================================================
echo   Services started. Check taskbar CMD windows + PM2.
echo.
echo   PM2 tools : http://localhost:5000/services
echo   Legacy Py : http://localhost:8000
echo   Node API  : http://localhost:3001
echo   Local UI  : http://localhost:5174
echo   Public API: https://api.askyouth.online  ^(needs tunnel^)
echo.
echo   Stop all  : stop_system.bat  or  stop.bat
echo   PM2 status: cd "%PYDIR%" ^&^& npx pm2 list
echo ============================================================
echo.
pause
endlocal
