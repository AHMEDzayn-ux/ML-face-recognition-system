@echo off
echo ========================================
echo Creating Next.js PWA Project
echo ========================================
echo.

cd /d "f:\My projects"

echo Step 1: Creating project directory...
if not exist "face-recognition-pwa" mkdir face-recognition-pwa
cd face-recognition-pwa

echo.
echo Step 2: Creating Next.js app...
echo Please answer the prompts:
echo   - TypeScript? Yes
echo   - ESLint? Yes
echo   - Tailwind CSS? Yes
echo   - src/ directory? No
echo   - App Router? Yes
echo   - Import alias? Yes (@/*)
echo.

call npx create-next-app@latest . --typescript --tailwind --app --eslint

echo.
echo ========================================
echo Next.js project created!
echo ========================================
pause
