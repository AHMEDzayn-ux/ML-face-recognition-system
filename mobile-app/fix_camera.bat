@echo off
echo ========================================
echo Fixing expo-camera version
echo ========================================
echo.

cd "f:\My projects\face-recognition-app"

echo Uninstalling current expo-camera...
npm uninstall expo-camera

echo.
echo Installing compatible version...
npm install expo-camera@17.0.10

echo.
echo ========================================
echo Done! Now restart the app:
echo   npm start
echo ========================================
pause
