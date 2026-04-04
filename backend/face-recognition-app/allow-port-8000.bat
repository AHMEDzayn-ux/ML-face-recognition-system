@echo off
echo Adding firewall rule for port 8000...
netsh advfirewall firewall add rule name="Face Recognition Backend" dir=in action=allow protocol=TCP localport=8000
echo.
echo Firewall rule added!
echo Port 8000 is now allowed through Windows Firewall.
echo.
pause
