@echo off
echo ============================================================
echo 🚀 COMPLETE SYSTEM STARTUP
echo ============================================================
echo.
echo This will start BOTH backend and PWA dashboard!
echo.
echo Press any key to continue or Ctrl+C to cancel...
pause >nul
echo.

echo ============================================================
echo Step 1/2: Starting FastAPI Backend (Port 8000)
echo ============================================================
cd /d "F:\My projects\attendance-system\backend"
start "Backend API" cmd /k "start_api.bat"
echo ✅ Backend started in new window
timeout /t 5 >nul
echo.

echo ============================================================
echo Step 2/2: Starting Next.js PWA (Port 3000)
echo ============================================================
cd /d "F:\My projects\attendance-system\pwa-dashboard"
start "PWA Dashboard" cmd /k "npm run dev"
echo ✅ PWA dashboard starting in new window
echo.

echo ============================================================
echo ✅ SYSTEM READY!
echo ============================================================
echo.
echo 🔧 Backend API:     http://localhost:8000
echo 🌐 PWA Dashboard:   http://localhost:3000
echo.
echo Wait 10 seconds for servers to fully start...
echo Then open: http://localhost:3000
echo.
echo Press any key to close this window...
pause >nul
