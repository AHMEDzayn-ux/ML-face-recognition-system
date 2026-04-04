@echo off
echo ========================================
echo Reorganizing into Attendance System
echo ========================================
echo.

cd /d "F:\My projects"

echo Step 1: Creating main folder structure...
mkdir "attendance-system" 2>nul
cd attendance-system

mkdir "mobile-app" 2>nul
mkdir "pwa-dashboard" 2>nul
mkdir "backend" 2>nul
mkdir "docs" 2>nul

echo.
echo Step 2: Moving React Native app...
if exist "..\face-recognition-app\*" (
    echo Copying mobile app files...
    xcopy "..\face-recognition-app\*" "mobile-app\" /E /I /Y /Q
    echo ✓ Mobile app copied to mobile-app\
) else (
    echo ! face-recognition-app folder not found
)

echo.
echo Step 3: Moving Python backend...
if exist "..\face recognition\*" (
    echo Copying backend files...
    xcopy "..\face recognition\*" "backend\" /E /I /Y /Q
    echo ✓ Backend copied to backend\
) else (
    echo ! face recognition folder not found
)

echo.
echo Step 4: Creating Next.js PWA project...
cd pwa-dashboard
echo This will take 2-3 minutes...
call npx create-next-app@latest . --typescript --tailwind --app --eslint --no-git

echo.
echo Step 5: Installing PWA dependencies...
call npm install @supabase/supabase-js chart.js react-chartjs-2 date-fns next-pwa react-webcam xlsx jspdf lucide-react

echo.
echo ========================================
echo ✓ Structure created!
echo ========================================
echo.
echo Next steps:
echo   1. Check: F:\My projects\attendance-system\
echo   2. I'll create all the PWA code files
echo   3. Start building!
echo.
pause
