@echo off
echo ========================================
echo  YOUR PC's IP ADDRESS
echo ========================================
echo.
ipconfig | findstr /i "IPv4"
echo.
echo ========================================
echo Copy one of these IP addresses above
echo and update the API_URL in your code!
echo ========================================
pause
