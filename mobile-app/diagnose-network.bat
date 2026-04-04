@echo off
echo ========================================
echo  BACKEND CONNECTION DIAGNOSTICS
echo ========================================
echo.

echo [1/4] Checking your PC's IP addresses...
echo.
ipconfig | findstr /i "IPv4"
echo.

echo [2/4] Testing if port 8000 is listening...
echo.
netstat -an | findstr :8000
echo.

echo [3/4] Checking Windows Firewall status...
echo.
netsh advfirewall show allprofiles state
echo.

echo ========================================
echo  TROUBLESHOOTING STEPS:
echo ========================================
echo.
echo 1. Find your WiFi IPv4 address above (usually 192.168.x.x or 10.x.x.x)
echo 2. Update API_URL in app\(tabs)\index.tsx with that IP
echo 3. Ensure your backend is running with --host 0.0.0.0
echo 4. Check both phone and PC are on the SAME WiFi network
echo.
echo To allow port 8000 through firewall, run:
echo netsh advfirewall firewall add rule name="Face Recognition Backend" dir=in action=allow protocol=TCP localport=8000
echo.
pause
