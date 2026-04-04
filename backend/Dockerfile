# Face Recognition with Docker

FROM python:3.11-slim

# Set working directory
WORKDIR /app

# Install system dependencies for OpenCV and face detection
RUN apt-get update && apt-get install -y \
    libgl1-mesa-glx \
    libglib2.0-0 \
    libsm6 \
    libxext6 \
    libxrender-dev \
    libgomp1 \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements
COPY requirements.txt .

# Install Python dependencies
RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir numpy pillow opencv-python && \
    pip install --no-cache-dir deepface

# Copy application files
COPY . .

# Create directories for face data
RUN mkdir -p known_faces test_images

# Set environment variable to avoid TensorFlow warnings
ENV TF_CPP_MIN_LOG_LEVEL=2

CMD ["python"]
