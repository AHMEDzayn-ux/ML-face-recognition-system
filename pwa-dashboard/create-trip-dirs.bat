@echo off
echo Creating trip directories...

if not exist "app\trips" mkdir "app\trips"
if not exist "app\trips\new" mkdir "app\trips\new"
if not exist "app\trips\[id]" mkdir "app\trips\[id]"
if not exist "app\trips\[id]\camera" mkdir "app\trips\[id]\camera"

echo Done!
pause
