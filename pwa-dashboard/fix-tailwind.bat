@echo off
echo ============================================================
echo 📦 Installing Tailwind CSS PostCSS Plugin
echo ============================================================
echo.

cd /d "F:\My projects\attendance-system\pwa-dashboard"

echo Installing @tailwindcss/postcss...
call npm install @tailwindcss/postcss

echo.
echo ============================================================
echo ✅ Installation Complete!
echo ============================================================
echo.
echo Now restart the dev server:
echo   Ctrl+C to stop
echo   start-dev.bat to restart
echo.
pause
