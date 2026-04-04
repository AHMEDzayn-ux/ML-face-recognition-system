@echo off
echo ========================================
echo Python 3.11 Installation Guide
echo ========================================
echo.
echo Step 1: Download Python 3.11
echo --------------------------------
echo Visit: https://www.python.org/downloads/release/python-31110/
echo.
echo Scroll down to "Files" section and download:
echo   - Windows installer (64-bit): python-3.11.10-amd64.exe
echo   - OR Windows installer (32-bit): python-3.11.10.exe
echo.
echo Step 2: Install Python 3.11
echo --------------------------------
echo IMPORTANT SETTINGS during installation:
echo   [√] Add python.exe to PATH
echo   [√] Install for all users (optional)
echo   [ ] Do NOT set as default Python (keep Python 3.14 as default)
echo.
echo Click "Customize installation" and note the install location
echo   Typical: C:\Users\%USERNAME%\AppData\Local\Programs\Python\Python311
echo.
pause
echo.
echo Step 3: Verify Installation
echo --------------------------------
echo Checking for Python 3.11...
echo.

REM Try common installation paths
set PY311_PATHS[0]=C:\Users\%USERNAME%\AppData\Local\Programs\Python\Python311\python.exe
set PY311_PATHS[1]=C:\Program Files\Python311\python.exe
set PY311_PATHS[2]=C:\Python311\python.exe

for /L %%i in (0,1,2) do (
    call set "PYTHON_PATH=%%PY311_PATHS[%%i]%%"
    if exist "!PYTHON_PATH!" (
        echo Found Python 3.11 at: !PYTHON_PATH!
        "!PYTHON_PATH!" --version
        goto :found
    )
)

echo.
echo Python 3.11 not found in common locations.
echo Please locate python.exe manually and run:
echo   "C:\path\to\python311\python.exe" -m venv venv
echo.
pause
exit /b 1

:found
echo.
echo Step 4: Creating Virtual Environment
echo --------------------------------
"!PYTHON_PATH!" -m venv venv
if errorlevel 1 (
    echo ERROR: Failed to create virtual environment!
    pause
    exit /b 1
)
echo Virtual environment created successfully!
echo.

echo Step 5: Installing Dependencies
echo --------------------------------
call venv\Scripts\activate.bat
echo Upgrading pip...
python -m pip install --upgrade pip
echo.
echo Installing packages (this will take 5-10 minutes)...
pip install numpy pillow opencv-python
pip install deepface
echo.

echo Step 6: Verifying Installation
echo --------------------------------
python -c "import deepface; print('✓ DeepFace imported successfully')"
python -c "import cv2; print('✓ OpenCV imported successfully')"
python -c "import numpy; print('✓ NumPy imported successfully')"
echo.

echo ========================================
echo Installation Complete!
echo ========================================
echo.
echo To activate environment in future:
echo   venv\Scripts\activate.bat
echo.
echo Python 3.11 location: !PYTHON_PATH!
echo.
pause
