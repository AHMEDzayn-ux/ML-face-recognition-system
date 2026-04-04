@echo off
echo Installing Supabase dependencies...
echo.

cd /d "%~dp0"

REM Activate virtual environment
if exist venv\Scripts\activate.bat (
    call venv\Scripts\activate.bat
) else (
    echo ERROR: Virtual environment not found!
    echo Please run setup_environment.bat first.
    pause
    exit /b 1
)

echo Installing supabase...
pip install supabase

echo Installing python-dotenv...
pip install python-dotenv

echo.
echo Updating requirements.txt...
pip freeze > requirements.txt

echo.
echo ✅ Installation complete!
echo.
echo Next steps:
echo 1. Edit .env file with your Supabase URL and API key
echo 2. Run: python main.py (to test the connection)
echo.
pause
