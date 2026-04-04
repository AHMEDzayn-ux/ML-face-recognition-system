@echo off
echo ========================================
echo Face Recognition - Environment Setup
echo ========================================
echo.

echo Step 1: Checking Python installation...
python --version
if errorlevel 1 (
    echo ERROR: Python is not installed or not in PATH!
    echo Please install Python 3.8+ from https://www.python.org/downloads/
    pause
    exit /b 1
)
echo.

echo Step 2: Creating virtual environment...
python -m venv venv
if errorlevel 1 (
    echo ERROR: Failed to create virtual environment!
    pause
    exit /b 1
)
echo Virtual environment created successfully!
echo.

echo Step 3: Activating virtual environment...
call venv\Scripts\activate.bat
echo.

echo Step 4: Upgrading pip...
python -m pip install --upgrade pip
echo.

echo Step 5: Installing dependencies...
echo This may take several minutes...
echo Installing core packages first...
pip install numpy pillow opencv-python
echo.
echo Installing DeepFace (this will auto-install compatible TensorFlow)...
pip install deepface
echo.

echo Step 6: Verifying installations...
python -c "import deepface; print('✓ DeepFace:', deepface.__version__)"
python -c "import cv2; print('✓ OpenCV:', cv2.__version__)"
python -c "import numpy; print('✓ NumPy:', numpy.__version__)"
python -c "import PIL; print('✓ Pillow:', PIL.__version__)"
echo.

echo ========================================
echo Setup complete!
echo ========================================
echo.
echo To activate the environment in the future, run:
echo   venv\Scripts\activate.bat
echo.
pause
