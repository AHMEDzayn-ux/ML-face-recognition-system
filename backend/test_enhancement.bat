@echo off
echo Testing Image Enhancement Module...
echo.

REM Activate virtual environment
call venv\Scripts\activate.bat

REM Run test
python test_enhancement.py

pause
