@echo off
setlocal EnableDelayedExpansion
title aSK YOUTH - Cloudflare Tunnel

:: Arg1 = tunnel name (name mode). Arg2 = project ROOT folder (optional, REQUIRED for reliable token path).
:: If arg2 missing: resolve ROOT as parent of this scripts\ folder (canonical path).

set "PROOT=%~f2"
if "%PROOT%"=="" (
  pushd "%~dp0.."
  set "PROOT=!CD!"
  popd
)

set "TOKEN_PRIMARY=!PROOT!\cloudflared-tunnel-token.txt"
set "TOKEN_FALLBACK=!USERPROFILE!\.cloudflared\cloudflared-tunnel-token.txt"

set "TOKEN_FILE="
set "CF_TOKEN="

if exist "!TOKEN_PRIMARY!" set "TOKEN_FILE=!TOKEN_PRIMARY!"
if not defined TOKEN_FILE if exist "!TOKEN_FALLBACK!" set "TOKEN_FILE=!TOKEN_FALLBACK!"

echo ============================================================
echo   Cloudflare tunnel launcher
echo   Project root: !PROOT!
echo   Token file  : !TOKEN_PRIMARY!
echo ============================================================

if defined TOKEN_FILE (
  echo Using token file: !TOKEN_FILE!
)
if defined TOKEN_FILE for /f "usebackq tokens=* delims=" %%T in ("!TOKEN_FILE!") do set "CF_TOKEN=%%T"
if defined CF_TOKEN set "CF_TOKEN=!CF_TOKEN:"=!"

if not defined TOKEN_FILE (
  echo STATUS: NO cloudflared-tunnel-token.txt found.
  echo Create file HERE ^(same folder as start_system.bat^):
  echo   !TOKEN_PRIMARY!
  echo Line 1 ONLY = JWT from dashboard ^(starts eyJ...^). Save as ANSI or UTF-8.
  echo Optional copy: !TOKEN_FALLBACK!
  echo.
) else if not defined CF_TOKEN (
  echo STATUS: Token file exists but first line is EMPTY or unreadable.
  echo Re-save with Notepad - Save As - UTF-8 ^(try UTF-8 without BOM if problems^).
  echo.
)

if defined CF_TOKEN (
  echo MODE: remote token ^(--token^)
  echo Starting cloudflared...
  echo.
  cloudflared tunnel run --token "!CF_TOKEN!"
  echo.
  echo cloudflared exited ^(code %ERRORLEVEL%^).
  pause
  endlocal
  exit /b 0
)

:: ----- NAME mode -----
set "CERT=%USERPROFILE%\.cloudflared\cert.pem"
set "CERT_TXT=!PROOT!\cloudflared-origin-cert.txt"
if exist "!CERT_TXT!" (
  for /f "usebackq delims=" %%A in ("!CERT_TXT!") do set "CERT=%%A"
)

if not exist "%CERT%" (
  echo ============================================================
  echo   Need EITHER cloudflared-tunnel-token.txt OR cert.pem+uuid.json
  echo ============================================================
  pause
  exit /b 1
)

set "TUNNEL_ORIGIN_CERT=%CERT%"
echo MODE: tunnel NAME ^(needs %%USERPROFILE%%\.cloudflared\{uuid}.json^)
echo Origin cert: %CERT%

if "%~1"=="" (
  echo Usage: run_cloudflare_tunnel.bat ^<tunnel-name^> [project-root]
  pause
  exit /b 1
)

echo Tunnel name: %~1
echo.

set "ID_FILE=!PROOT!\cloudflared-tunnel-id.txt"
if exist "!ID_FILE!" (
  set "TUUID="
  for /f "usebackq delims=" %%U in ("!ID_FILE!") do set "TUUID=%%U"
  if defined TUUID (
    set "CRED_JSON=%USERPROFILE%\.cloudflared\!TUUID!.json"
    if not exist "!CRED_JSON!" (
      echo MISSING: !CRED_JSON!
      echo Fix: add cloudflared-tunnel-token.txt ^(JWT line 1^) — see cloudflared-tunnel-token.example.txt
      pause
      exit /b 1
    )
    echo Found credentials: !CRED_JSON!
    echo.
  )
)

cloudflared tunnel run %~1
echo.
echo cloudflared exited ^(code %ERRORLEVEL%^).
pause
endlocal
