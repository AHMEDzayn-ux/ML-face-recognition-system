@echo off
REM Test backend syntax

cd /d "%~dp0"

echo Testing main.py for syntax errors...
python -m py_compile main.py

if %errorlevel% equ 0 (
    echo.
    echo ========================================
    echo   SUCCESS! No syntax errors.
    echo ========================================
    echo.
    echo Starting backend server...
    echo.
    python main.py
) else (
    echo.
    echo ========================================
    echo   ERROR! Syntax errors found.
    echo ========================================
    echo.
    pause
)
