@echo off
setlocal
cd /d "%~dp0"
title Pest Mantra REAL MODE

echo ==========================================
echo   PEST MANTRA - REAL MODE
echo ==========================================
echo.

if not exist "node_modules" (
  echo Installing dependencies for first run...
  call npm ci
  if errorlevel 1 (
    echo.
    echo Dependency installation failed.
    pause
    exit /b 1
  )
)

if not exist "apps\backend\.env" (
  echo Real environment is not configured yet.
  echo Starting one-time setup...
  call npm run setup:real
  if errorlevel 1 pause & exit /b 1
)

call npm run real
if errorlevel 1 (
  echo.
  echo REAL MODE did not start. Read the error above.
  echo If ports 3000/3001/4000 are already in use, close old Node windows or run:
  echo   taskkill /F /IM node.exe
  pause
)
endlocal
