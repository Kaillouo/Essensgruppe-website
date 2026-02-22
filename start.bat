@echo off
title Essensgruppe - Starting...
color 0A

echo ================================================
echo   Essensgruppe Dev Server - START
echo ================================================
echo.

:: Start PostgreSQL (tries common install versions, silent fail if already running)
echo [1/4] Starting PostgreSQL...
net start postgresql-x64-17 >nul 2>&1
net start postgresql-x64-16 >nul 2>&1
net start postgresql-x64-15 >nul 2>&1
net start postgresql-x64-14 >nul 2>&1
echo       PostgreSQL ready.
echo.

:: Kill anything stale on ports 3000 and 3001
echo [2/4] Clearing ports 3000 and 3001...
for /f "tokens=5" %%a in ('netstat -ano ^| findstr :3000 ^| findstr LISTENING 2^>nul') do taskkill /F /PID %%a >nul 2>&1
for /f "tokens=5" %%a in ('netstat -ano ^| findstr :3001 ^| findstr LISTENING 2^>nul') do taskkill /F /PID %%a >nul 2>&1
echo       Ports cleared.
echo.

:: Start backend
echo [3/4] Starting backend (port 3000)...
start "Essensgruppe Backend" cmd /k "cd /d "%~dp0backend" && npm run dev"
timeout /t 4 /nobreak >nul
echo       Backend started.
echo.

:: Start frontend
echo [4/4] Starting frontend (port 3001)...
start "Essensgruppe Frontend" cmd /k "cd /d "%~dp0frontend" && npm run dev"
timeout /t 3 /nobreak >nul
echo       Frontend started.
echo.

:: Open browser
echo Opening browser...
start http://localhost:3001
echo.

echo ================================================
echo   All servers running!
echo   Frontend : http://localhost:3001
echo   Backend  : http://localhost:3000
echo.
echo   Run stop.bat to shut everything down cleanly.
echo ================================================
echo.
pause
