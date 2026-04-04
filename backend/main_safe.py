"""
FastAPI Backend for Face Recognition Attendance System - SAFE VERSION
No model preloading - for troubleshooting
"""

# Suppress TensorFlow warnings for cleaner output
import os
os.environ['TF_CPP_MIN_LOG_LEVEL'] = '3'
os.environ['TF_ENABLE_ONEDNN_OPTS'] = '0'

from fastapi import FastAPI, File, UploadFile, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
import uvicorn
import pickle
import numpy as np
from datetime import datetime
from pathlib import Path
import cv2
from deepface import DeepFace
import json
import warnings
warnings.filterwarnings('ignore')

# Import our existing identification logic
import sys
sys.path.append(os.path.dirname(__file__))

app = FastAPI(
    title="Face Recognition Attendance API",
    description="API for ESP32-CAM face recognition attendance system",
    version="1.0.0"
)

# Enable CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configuration
EMBEDDINGS_DB = "embeddings.pkl"
ATTENDANCE_LOG = "attendance.json"
UPLOAD_DIR = "uploads"
THRESHOLD = 0.4

# Create directories
os.makedirs(UPLOAD_DIR, exist_ok=True)

# Load embeddings database at startup
embeddings_db = None

@app.on_event("startup")
async def startup_event():
    """Load embeddings database (NO MODEL PRELOADING)"""
    global embeddings_db
    
    print("\n" + "="*60)
    print("🚀 Starting Face Recognition API (Safe Mode)")
    print("="*60 + "\n")
    
    print("📂 Loading embeddings database...")
    try:
        with open(EMBEDDINGS_DB, 'rb') as f:
            embeddings_db = pickle.load(f)
        print(f"✅ Loaded {len(embeddings_db)} people from database")
    except FileNotFoundError:
        print(f"⚠️  WARNING: {EMBEDDINGS_DB} not found")
        embeddings_db = {}
    
    print("\n✅ Server ready! (Models will load on first request)")
    print("="*60 + "\n")

# ... rest of the file stays the same ...
