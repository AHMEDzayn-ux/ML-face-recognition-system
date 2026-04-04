@echo off
echo ========================================
echo Supabase Complete Setup
echo ========================================
echo.

cd /d "%~dp0"

echo Step 1: Activate virtual environment...
call venv\Scripts\activate.bat

echo.
echo Step 2: Running setup script...
echo.
python setup_supabase_complete.py

echo.
echo ========================================
echo.
pause
