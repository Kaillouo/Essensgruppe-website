@echo off
title Essensgruppe - Stopping...
color 0C

echo ================================================
echo   Essensgruppe Dev Server - STOP
echo ================================================
echo.

:: Kill by port (most reliable)
echo [1/3] Stopping Node servers (ports 3000 + 3001)...
for /f "tokens=5" %%a in ('netstat -ano ^| findstr :3000 ^| findstr LISTENING 2^>nul') do taskkill /F /PID %%a >nul 2>&1
for /f "tokens=5" %%a in ('netstat -ano ^| findstr :3001 ^| findstr LISTENING 2^>nul') do taskkill /F /PID %%a >nul 2>&1

:: Also kill the cmd windows opened by start.bat (catches tsx child processes too)
taskkill /F /FI "WINDOWTITLE eq Essensgruppe Backend" >nul 2>&1
taskkill /F /FI "WINDOWTITLE eq Essensgruppe Frontend" >nul 2>&1
echo       Node servers stopped.
echo.

:: Stop PostgreSQL service
echo [2/3] Stopping PostgreSQL...
net stop postgresql-x64-17 >nul 2>&1
net stop postgresql-x64-16 >nul 2>&1
net stop postgresql-x64-15 >nul 2>&1
net stop postgresql-x64-14 >nul 2>&1
echo       PostgreSQL stopped.
echo.

:: Final port check - confirm ports are free
echo [3/3] Verifying ports are free...
netstat -ano | findstr ":3000 " | findstr LISTENING >nul 2>&1 && echo       WARNING: Port 3000 still in use! || echo       Port 3000 - free.
netstat -ano | findstr ":3001 " | findstr LISTENING >nul 2>&1 && echo       WARNING: Port 3001 still in use! || echo       Port 3001 - free.
echo.

echo ================================================
echo   All done. Your PC is clean!
echo ================================================
echo.
pause
