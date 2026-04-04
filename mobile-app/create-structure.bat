@echo off
echo Creating Smart Attendance System Project Structure...
echo.

cd "F:\My projects"
mkdir smart-attendance-system
cd smart-attendance-system

mkdir mobile-app-backup
mkdir pwa-dashboard
mkdir docs
mkdir backend-placeholder

echo.
echo ✅ Folder structure created!
echo.
echo Structure:
echo F:\My projects\smart-attendance-system\
echo   ├── mobile-app-backup\      (Your current React Native app)
echo   ├── pwa-dashboard\           (New Next.js PWA - will create)
echo   ├── backend-placeholder\     (For your Python backend later)
echo   └── docs\                    (Documentation and plans)
echo.
echo Next: Copying mobile app files...
pause

xcopy "F:\My projects\face-recognition-app\*" "F:\My projects\smart-attendance-system\mobile-app-backup\" /E /I /H /Y

echo.
echo ✅ Mobile app backed up!
echo.
pause
