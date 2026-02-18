@echo off
title Essensgruppe Dev Servers

echo Stopping old servers...
taskkill /F /FI "WINDOWTITLE eq Backend*" >nul 2>&1
taskkill /F /FI "WINDOWTITLE eq Frontend*" >nul 2>&1
:: Kill anything on ports 3000 and 3001
for /f "tokens=5" %%a in ('netstat -ano ^| findstr :3000 ^| findstr LISTENING') do taskkill /F /PID %%a >nul 2>&1
for /f "tokens=5" %%a in ('netstat -ano ^| findstr :3001 ^| findstr LISTENING') do taskkill /F /PID %%a >nul 2>&1
timeout /t 2 /nobreak >nul
echo Done.
echo.

echo Starting Essensgruppe servers...
echo.

:: Start backend
start "Backend" cmd /c "cd /d "%~dp0backend" && npm run dev"

:: Wait for backend to initialize
timeout /t 3 /nobreak >nul

:: Start frontend
start "Frontend" cmd /c "cd /d "%~dp0frontend" && npm run dev"

echo.
echo Servers starting in separate windows:
echo   Backend:  http://localhost:3000
echo   Frontend: http://localhost:3001
echo.
echo Close the terminal windows to stop the servers.
pause
