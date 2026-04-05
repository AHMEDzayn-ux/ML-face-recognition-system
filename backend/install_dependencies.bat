@echo off
echo ========================================
echo Installing Face Recognition Dependencies
echo Using Python 3.11
echo ========================================
echo.

REM Use Python 3.11 directly
set PYTHON="C:\Users\user\AppData\Local\Programs\Python\Python311\python.exe"

echo Checking Python version...
%PYTHON% --version
echo.

echo Installing dependencies from requirements.txt...
echo This may take 5-10 minutes. Please wait...
echo.

%PYTHON% -m pip install --upgrade pip
%PYTHON% -m pip install -r requirements.txt

if errorlevel 1 (
    echo.
    echo ========================================
    echo ERROR: Installation failed!
    echo ========================================
    echo.
    echo Trying to install essential packages only...
    %PYTHON% -m pip install deepface opencv-python fastapi uvicorn python-multipart python-dotenv supabase numpy pillow mtcnn retina-face
    
    if errorlevel 1 (
        echo ERROR: Essential packages installation also failed!
        pause
        exit /b 1
    )
)

echo.
echo ========================================
echo Installation Complete!
echo ========================================
echo.
echo Next steps:
echo 1. Rebuild embeddings: %PYTHON% build_embeddings.py
echo 2. Start server: %PYTHON% main.py
echo.
pause
