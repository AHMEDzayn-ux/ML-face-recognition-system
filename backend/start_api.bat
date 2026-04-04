@echo off
echo ========================================
echo Starting Face Recognition API Server
echo ========================================
echo.

REM Activate virtual environment
call venv\Scripts\activate.bat

REM Start FastAPI server with unbuffered output
python -u main.py
