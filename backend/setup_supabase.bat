@echo off
echo ========================================
echo Step 3: Supabase Integration Setup
echo ========================================
echo.

cd /d "%~dp0"

echo [1/3] Installing Supabase packages...
call venv\Scripts\activate.bat
pip install supabase python-dotenv
pip freeze > requirements.txt
echo ✅ Packages installed!
echo.

echo [2/3] Checking .env file...
if exist .env (
    echo ✅ .env file exists
    echo.
    echo ⚠️  IMPORTANT: Edit .env file with your Supabase credentials!
    echo    File location: %CD%\.env
    echo.
    echo    Get credentials from:
    echo    https://app.supabase.com → Your Project → Settings → API
    echo.
) else (
    echo ❌ .env file not found!
    pause
    exit /b 1
)

echo [3/3] Testing connection...
echo.
echo Starting FastAPI server to test Supabase connection...
echo Press Ctrl+C to stop the server after testing.
echo.
python main.py

pause
