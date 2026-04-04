@echo off
echo ========================================
echo Verifying Dependencies
echo ========================================
echo.

REM Check if virtual environment is activated
python -c "import sys; exit(0 if hasattr(sys, 'real_prefix') or (hasattr(sys, 'base_prefix') and sys.base_prefix != sys.prefix) else 1)" 2>nul
if errorlevel 1 (
    echo Activating virtual environment...
    if exist venv\Scripts\activate.bat (
        call venv\Scripts\activate.bat
    ) else (
        echo ERROR: Virtual environment not found!
        echo Please run install_python311.bat first
        pause
        exit /b 1
    )
)

echo.
python verify_dependencies.py
echo.

if errorlevel 1 (
    echo.
    echo Some dependencies are missing. Try reinstalling:
    echo   pip install --upgrade -r requirements.txt
    echo.
)

pause
