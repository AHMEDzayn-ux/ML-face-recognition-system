@echo off
echo ============================================================
echo 📦 Installing Next.js PWA Dependencies
echo ============================================================
echo.

cd /d "F:\My projects\attendance-system\pwa-dashboard"

echo Installing dependencies...
call npm install @supabase/supabase-js lucide-react react-webcam chart.js react-chartjs-2 xlsx jspdf jspdf-autotable

echo.
echo Installing dev dependency (PWA)...
call npm install --save-dev @ducanh2912/next-pwa

echo.
echo ============================================================
echo ✅ Installation Complete!
echo ============================================================
echo.
echo Next steps:
echo 1. Run: npm run dev
echo 2. Open: http://localhost:3000
echo 3. Test all pages (Dashboard, Camera, Students, Analytics, Reports)
echo.
pause
