@echo off
echo ========================================
echo Checking Python Version
echo ========================================
echo.

python --version
echo.

python -c "import sys; print('Python executable:', sys.executable); print('Python version info:', sys.version_info)"
echo.

pause
