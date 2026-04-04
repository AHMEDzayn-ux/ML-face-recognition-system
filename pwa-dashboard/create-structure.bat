@echo off
cd /d "F:\My projects\attendance-system\pwa-dashboard"

echo Creating directory structure...
mkdir lib 2>nul
mkdir components 2>nul
mkdir app\camera 2>nul
mkdir app\students 2>nul
mkdir app\analytics 2>nul
mkdir app\reports 2>nul
mkdir app\api\stats 2>nul
mkdir app\api\attendance 2>nul

echo ✓ Directories created!
echo.
echo Run this to continue:
echo   cd "F:\My projects\attendance-system\pwa-dashboard"
pause
