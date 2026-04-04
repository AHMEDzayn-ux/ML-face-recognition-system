@echo off
echo ========================================
echo Installing FastAPI Dependencies
echo ========================================
echo.

call venv\Scripts\activate.bat

echo Installing FastAPI, Uvicorn, and Python-multipart...
pip install fastapi uvicorn[standard] python-multipart

if errorlevel 1 (
    echo ERROR: Installation failed!
    pause
    exit /b 1
)

echo.
echo ========================================
echo Installation Complete!
echo ========================================
echo.
echo To start the server, run:
echo   python main.py
echo.
echo Or manually:
echo   uvicorn main:app --reload --host 0.0.0.0 --port 8000
echo.
pause
