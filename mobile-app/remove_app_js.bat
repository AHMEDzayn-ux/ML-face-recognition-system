@echo off
echo Removing conflicting App.js...

cd "f:\My projects\face-recognition-app"
rename App.js App.js.backup

echo.
echo Done! App.js has been renamed to App.js.backup
echo Now restart: npx expo start --clear
pause
