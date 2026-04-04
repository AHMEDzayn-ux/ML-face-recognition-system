@echo off
REM Test if main.py has syntax errors

cd /d "%~dp0"

echo Testing main.py for syntax errors...
python -m py_compile main.py

if %errorlevel% equ 0 (
    echo.
    echo ========================================
    echo   SUCCESS! No syntax errors found.
    echo ========================================
    echo.
    echo You can now run: start_api.bat
    echo.
) else (
    echo.
    echo ========================================
    echo   ERROR! Syntax errors found above.
    echo ========================================
    echo.
    echo Please fix the errors and try again.
    echo.
)

pause
