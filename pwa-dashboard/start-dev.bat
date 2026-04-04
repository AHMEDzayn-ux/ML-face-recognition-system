@echo off
echo ============================================================
echo 🚀 Starting Next.js PWA Dashboard
echo ============================================================
echo.

cd /d "F:\My projects\attendance-system\pwa-dashboard"

echo Starting development server...
echo.
echo The app will open at: http://localhost:3000
echo.
echo Available pages:
echo   • Dashboard:  http://localhost:3000/
echo   • Camera:     http://localhost:3000/camera
echo   • Students:   http://localhost:3000/students
echo   • Analytics:  http://localhost:3000/analytics
echo   • Reports:    http://localhost:3000/reports
echo.
echo ============================================================
echo.

call npm run dev
