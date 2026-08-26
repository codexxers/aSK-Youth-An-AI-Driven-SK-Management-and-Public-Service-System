@echo off
setlocal enabledelayedexpansion
title aSK//YOUTH.AI - Project Setup
echo ============================================
echo   aSK//YOUTH.AI - Full Project Setup
echo ============================================
echo.

:: Get the directory where this BAT file lives
set "ROOT=%~dp0"
if "%ROOT:~-1%"=="\" set "ROOT=%ROOT:~0,-1%"
set "TOOLS=%ROOT%\tools"

:: ================================================================
:: [1/7] CHECK PREREQUISITES
:: ================================================================
echo [1/7] Checking prerequisites...

set "MISSING_PREREQS=0"

:: --- Python check ---
set "PYTHON_OK=0"
python --version >nul 2>&1 && set "PYTHON_OK=1"

:: Double-check: the Windows Store stub exits 0 but outputs junk.
:: Verify output actually contains "Python 3".
if "%PYTHON_OK%"=="1" (
    for /f "tokens=*" %%v in ('python --version 2^>^&1') do (
        echo %%v | findstr /i "Python 3" >nul 2>&1
        if errorlevel 1 set "PYTHON_OK=0"
    )
)

if "%PYTHON_OK%"=="0" (
    echo.
    echo   [MISSING] Python 3 is not installed or not in PATH.
    echo.
    echo   This is usually caused by one of two things:
    echo     A^) Python is not installed at all.
    echo     B^) Windows is intercepting "python" with a Store stub.
    echo.
    echo   To fix option B:
    echo     Settings, Apps, Advanced app settings, App execution aliases
    echo     Turn OFF "App Installer" entries for python.exe and python3.exe
    echo.
    echo   Then install real Python from: https://www.python.org/downloads/
    echo   IMPORTANT: Check "Add Python to PATH" during installation.
    echo.
    set /p "OPEN_PY=   Open Python download page now? [Y/N]: "
    if /i "!OPEN_PY!"=="Y" start "" "https://www.python.org/downloads/"
    set "MISSING_PREREQS=1"
) else (
    for /f "tokens=*" %%v in ('python --version 2^>^&1') do echo   - %%v OK
)

:: --- Node.js check ---
set "NODE_OK=0"
where node >nul 2>&1 && set "NODE_OK=1"

if "%NODE_OK%"=="0" (
    echo.
    echo   [MISSING] Node.js is not installed or not in PATH.
    echo   Download the LTS version from: https://nodejs.org/
    echo.
    set /p "OPEN_NODE=   Open Node.js download page now? [Y/N]: "
    if /i "!OPEN_NODE!"=="Y" start "" "https://nodejs.org/"
    set "MISSING_PREREQS=1"
) else (
    for /f "tokens=*" %%v in ('node --version 2^>^&1') do echo   - Node.js %%v OK
    for /f "tokens=*" %%v in ('npm --version 2^>^&1') do echo   - npm %%v OK
)

:: --- curl check ---
where curl.exe >nul 2>&1
if %ERRORLEVEL% neq 0 (
    echo.
    echo   [MISSING] curl.exe not found. This is built into Windows 10 and later.
    echo   Make sure you are on Windows 10 version 1803 or newer.
    echo.
    set "MISSING_PREREQS=1"
) else (
    echo   - curl.exe OK
)

if "!MISSING_PREREQS!"=="1" (
    echo.
    echo   ============================================================
    echo   One or more prerequisites are missing.
    echo   Install the items listed above, then run setup_project.bat
    echo   again. After installing Python/Node, open a NEW terminal
    echo   window so the PATH changes take effect.
    echo   ============================================================
    echo.
    pause
    exit /b 1
)
echo.

:: ================================================================
:: [2/7] DOWNLOAD TESSERACT OCR (local to project)
:: ================================================================
echo [2/7] Setting up Tesseract OCR...

if not exist "%TOOLS%" mkdir "%TOOLS%"

set "TESS_DIR=%TOOLS%\Tesseract-OCR"
set "TESS_EXE=%TESS_DIR%\tesseract.exe"

:: Also check system default install location and PATH
set "TESS_SYS=C:\Program Files\Tesseract-OCR\tesseract.exe"
set "TESS_FOUND=0"
if exist "!TESS_EXE!" set "TESS_FOUND=1"
if exist "!TESS_SYS!" set "TESS_FOUND=1"
where tesseract >nul 2>&1 && set "TESS_FOUND=1"

if "!TESS_FOUND!"=="1" (
    echo   Tesseract already found - skipping download.
) else (
    echo   Downloading Tesseract OCR v5.4.0 installer...
    set "TESS_URL=https://github.com/UB-Mannheim/tesseract/releases/download/v5.4.0.20240606/tesseract-ocr-w64-setup-5.4.0.20240606.exe"
    set "TESS_INSTALLER=%TOOLS%\tesseract-installer.exe"

    curl.exe -L -o "!TESS_INSTALLER!" "!TESS_URL!" --progress-bar
    if !ERRORLEVEL! neq 0 (
        echo   ERROR: Failed to download Tesseract installer.
        echo   Download manually from:
        echo   https://github.com/UB-Mannheim/tesseract/releases
        echo.
    ) else (
        echo   Running Tesseract installer - a setup window will appear.
        echo   Install to the DEFAULT location and complete the wizard.
        powershell -Command "Start-Process -FilePath '!TESS_INSTALLER!' -Wait"
        del "!TESS_INSTALLER!" >nul 2>&1
        echo   Tesseract installer finished.
    )
)
echo.

:: ================================================================
:: [3/7] DOWNLOAD POPPLER (needed for PDF-to-image OCR)
:: ================================================================
echo [3/7] Setting up Poppler (PDF to image converter)...

set "POPPLER_DIR=%TOOLS%\poppler"
set "POPPLER_VER=24.08.0"

:: Check if poppler binaries already exist (search for pdftoppm.exe)
set "POPPLER_FOUND="
if exist "%POPPLER_DIR%" (
    for /r "%POPPLER_DIR%" %%f in (pdftoppm.exe) do (
        set "POPPLER_FOUND=%%~dpf"
    )
)

if defined POPPLER_FOUND (
    echo   Poppler already installed locally - skipping.
) else (
    echo   Downloading Poppler v%POPPLER_VER%...
    set "POP_URL=https://github.com/oschwartz10612/poppler-windows/releases/download/v%POPPLER_VER%-0/Release-%POPPLER_VER%-0.zip"
    set "POP_ZIP=%TOOLS%\poppler.zip"

    curl.exe -L -o "!POP_ZIP!" "!POP_URL!" --progress-bar
    if !ERRORLEVEL! neq 0 (
        echo   ERROR: Failed to download Poppler.
        echo   PDF-to-image OCR will not work without Poppler.
        echo   You can manually download from:
        echo   https://github.com/oschwartz10612/poppler-windows/releases
        echo.
    ) else (
        echo   Extracting Poppler...
        powershell -Command "Expand-Archive -Path '!POP_ZIP!' -DestinationPath '%POPPLER_DIR%' -Force"
        del "!POP_ZIP!" 2>nul
        echo   Poppler extracted successfully.
    )
)
echo.

:: ================================================================
:: [4/7] CREATE PYTHON VIRTUAL ENVIRONMENT + INSTALL PACKAGES
:: ================================================================
echo [4/7] Setting up Python virtual environment...

set "VENV=%ROOT%\.venv"
set "VENV_PYTHON=%VENV%\Scripts\python.exe"
set "VENV_PIP=%VENV%\Scripts\pip.exe"

if exist "%VENV_PYTHON%" (
    echo   Virtual environment already exists - skipping creation.
) else (
    echo   Creating virtual environment...
    python -m venv "%VENV%"
    if not exist "%VENV_PYTHON%" (
        echo   ERROR: Failed to create virtual environment.
        pause
        exit /b 1
    )
    echo   Virtual environment created.
)

echo   Installing Python packages (this may take several minutes)...
"%VENV_PYTHON%" -m pip install --upgrade pip --quiet >nul 2>&1
"%VENV_PYTHON%" -m pip install -r "%ROOT%\ai-layer\requirements.txt" --quiet >nul 2>&1
if !ERRORLEVEL! neq 0 (
    echo   WARNING: Some Python packages may have failed to install.
    echo   You can retry manually:
    echo   "%VENV_PYTHON%" -m pip install -r "%ROOT%\ai-layer\requirements.txt"
) else (
    echo   All Python packages installed successfully.
)
echo.

:: ================================================================
:: [5/7] INSTALL NODE.JS PACKAGES
:: ================================================================
echo [5/7] Installing Node.js packages...

:: node-llama-cpp has native CUDA bindings compiled per-machine.
:: We use a .build_host marker file to know if the build belongs to this device.
:: If the marker is missing or was built on a different machine, clean and rebuild.

echo   Checking backend native build status...
for /f %%h in ('hostname') do set "THIS_HOST=%%h"
set "BUILD_MARKER=%ROOT%\backend\.build_host"
set "LLAMA_BUILT=0"

if exist "!BUILD_MARKER!" (
    for /f "usebackq delims=" %%c in ("!BUILD_MARKER!") do (
        if /i "%%c"=="!THIS_HOST!" set "LLAMA_BUILT=1"
    )
)

if "!LLAMA_BUILT!"=="0" (
    echo   Build marker missing or was made on a different machine - cleaning for rebuild.
    echo   WARNING: This will trigger a 15-30 minute CUDA compilation. Please wait.
    if exist "%ROOT%\backend\node_modules" rd /s /q "%ROOT%\backend\node_modules"
) else (
    echo   Native build already exists for this machine - skipping clean.
)

echo   Installing root dependencies...
cd /d "%ROOT%"
cmd /c npm install --silent
echo     done.

echo   Installing backend dependencies (includes native build - may take a while)...
cd /d "%ROOT%\backend"
cmd /c npm install
echo     done.

:: Write build marker so future runs on this machine skip the clean+rebuild
echo !THIS_HOST!>"!BUILD_MARKER!"

echo   Installing frontend dependencies...
cd /d "%ROOT%\frontend"
cmd /c npm install --silent
echo     done.

cd /d "%ROOT%"
echo   Node.js packages installed.
echo.

:: ================================================================
:: [6/7] CHECK FOR QWEN GGUF MODEL
:: ================================================================
echo [6/7] Checking for Qwen 2.5-7B model...

set "MODEL_FILE=%ROOT%\Qwen25GGUF\Qwen2.5-7B-Instruct-Q4_K_M.gguf"

if exist "!MODEL_FILE!" (
    echo   Qwen model found - OK.
) else (
    echo.
    echo   *** QWEN MODEL NOT FOUND ***
    echo.
    echo   The Qwen 2.5-7B-Instruct GGUF model is required but too large
    echo   to download automatically [~4.6 GB].
    echo.
    echo   Download it manually:
    echo   1. Go to https://huggingface.co/Qwen/Qwen2.5-7B-Instruct-GGUF
    echo   2. Download "qwen2.5-7b-instruct-q4_k_m.gguf"
    echo   3. Create folder: !ROOT!\Qwen25GGUF\
    echo   4. Place the .gguf file there and rename it to:
    echo      Qwen2.5-7B-Instruct-Q4_K_M.gguf
    echo.
    echo   OR ask your teammate to share the Qwen25GGUF folder.
    echo.
)
echo.

:: ================================================================
:: [7/7] SUMMARY
:: ================================================================
echo ============================================
echo   SETUP COMPLETE - Summary
echo ============================================
echo.

:: Check each component
set "ALL_OK=1"

set "TESS_OK=0"
if exist "!TESS_EXE!" set "TESS_OK=1"
if exist "C:\Program Files\Tesseract-OCR\tesseract.exe" set "TESS_OK=1"
where tesseract >nul 2>&1 && set "TESS_OK=1"
if "!TESS_OK!"=="1" (
    echo   [OK] Tesseract OCR
) else (
    echo   [!!] Tesseract OCR - NOT FOUND - image and scanned PDF OCR will not work
    echo        Download from https://github.com/UB-Mannheim/tesseract/releases
    set "ALL_OK=0"
)

set "POPPLER_CHECK=0"
if exist "!POPPLER_DIR!" (
    dir /s /b "!POPPLER_DIR!\pdftoppm.exe" >nul 2>&1 && set "POPPLER_CHECK=1"
)
if "!POPPLER_CHECK!"=="1" (
    echo   [OK] Poppler - PDF-to-image
) else (
    echo   [!!] Poppler - NOT FOUND - PDF OCR will not work
    set "ALL_OK=0"
)

if exist "!VENV_PYTHON!" (
    echo   [OK] Python virtual environment
) else (
    echo   [!!] Python venv - NOT FOUND
    set "ALL_OK=0"
)

if exist "!ROOT!\backend\node_modules" (
    echo   [OK] Backend Node packages
) else (
    echo   [!!] Backend packages - NOT FOUND
    set "ALL_OK=0"
)

if exist "!ROOT!\frontend\node_modules" (
    echo   [OK] Frontend Node packages
) else (
    echo   [!!] Frontend packages - NOT FOUND
    set "ALL_OK=0"
)

if exist "!MODEL_FILE!" (
    echo   [OK] Qwen 2.5-7B model
) else (
    echo   [!!] Qwen model - MISSING - see instructions above
    set "ALL_OK=0"
)

echo.
if "!ALL_OK!"=="1" (
    echo   Everything is ready!
    echo.
    set /p "LAUNCH=   Launch the webapp now? [Y/N]: "
    if /i "!LAUNCH!"=="Y" (
        echo.
        echo   Starting aSK//YOUTH.AI...
        call "!ROOT!\start_system.bat"
    ) else (
        echo   Run start_system.bat whenever you are ready.
    )
) else (
    echo   Some components need attention - see items marked [!!] above.
    echo   Fix the issues above then run start_system.bat.
)
echo.
echo ============================================
pause
