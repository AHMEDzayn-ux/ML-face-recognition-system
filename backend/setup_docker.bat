# Docker Environment Setup

@echo off
echo ========================================
echo Face Recognition - Docker Setup
echo ========================================
echo.

echo Checking Docker installation...
docker --version
if errorlevel 1 (
    echo ERROR: Docker is not installed!
    echo.
    echo Please install Docker Desktop:
    echo https://www.docker.com/products/docker-desktop/
    echo.
    pause
    exit /b 1
)
echo.

echo Building Docker image...
echo This may take 5-10 minutes on first run...
docker-compose build
if errorlevel 1 (
    echo ERROR: Docker build failed!
    pause
    exit /b 1
)
echo.

echo ========================================
echo Setup Complete!
echo ========================================
echo.
echo To start the environment, run:
echo   docker-compose up -d
echo.
echo To enter the container:
echo   docker-compose exec face-recognition bash
echo.
echo Or run Python scripts directly:
echo   docker-compose run --rm face-recognition python verify_faces.py
echo.
pause
