"""
FastAPI Backend for Face Recognition Attendance System
Receives photos from ESP32-CAM and returns identification results
"""

# Suppress TensorFlow warnings for cleaner output
import os
os.environ['TF_CPP_MIN_LOG_LEVEL'] = '3'  # Suppress TF warnings
os.environ['TF_ENABLE_ONEDNN_OPTS'] = '0'  # Disable oneDNN custom operations

from fastapi import FastAPI, File, UploadFile, HTTPException, Form
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, FileResponse
from typing import List, Optional
import uvicorn
import pickle
import numpy as np
from datetime import datetime
from pathlib import Path
import cv2
from deepface import DeepFace
import json
import warnings
import shutil
import subprocess
import asyncio
warnings.filterwarnings('ignore')  # Suppress other warnings

# Supabase integration
try:
    from supabase import create_client, Client
    from dotenv import load_dotenv
    env_path = os.path.join(os.path.dirname(__file__), '.env')
    load_dotenv(env_path)  # Load .env file explicitly
    SUPABASE_ENABLED = os.getenv("SUPABASE_URL") and os.getenv("SUPABASE_KEY")
except ImportError:
    SUPABASE_ENABLED = False
    print("⚠️  Supabase not installed. Install with: pip install supabase python-dotenv")

# Import our existing identification logic
import sys
sys.path.append(os.path.dirname(__file__))

# Import image enhancement module
from image_enhancement import preprocess_for_recognition

# Add garbage collection for memory management
import gc

app = FastAPI(
    title="Face Recognition Attendance API",
    description="API for ESP32-CAM face recognition attendance system",
    version="1.0.0"
)

# Enable CORS for ESP32-CAM to access the API
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allow all origins (ESP32-CAM)
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configuration
EMBEDDINGS_DB = "embeddings.pkl"
ATTENDANCE_LOG = "attendance.json"
UPLOAD_DIR = "uploads"
KNOWN_FACES_DIR = "known_faces"
THRESHOLD = 0.4  # Face matching threshold (original)

# Create necessary directories
os.makedirs(UPLOAD_DIR, exist_ok=True)
os.makedirs(KNOWN_FACES_DIR, exist_ok=True)

# Global variable to track embedding rebuild status
rebuild_status = {
    "is_running": False,
    "last_run": None,
    "last_status": "idle"
}

# Load embeddings database at startup
embeddings_db = None
supabase_client: Client = None

@app.on_event("startup")
async def startup_event():
    """Load embeddings database and warm up models when server starts"""
    global embeddings_db, supabase_client
    
    print("\n" + "="*60)
    print("🚀 Starting Face Recognition API...")
    print("="*60 + "\n")
    
    # Step 1: Initialize Supabase connection
    if SUPABASE_ENABLED:
        try:
            print("☁️  Connecting to Supabase...")
            supabase_client = create_client(
                os.getenv("SUPABASE_URL"),
                os.getenv("SUPABASE_KEY")
            )
            # Test connection
            result = supabase_client.table('students').select("id", count='exact').execute()
            print(f"✅ Supabase connected! ({result.count} students in database)")
        except Exception as e:
            print(f"⚠️  Supabase connection failed: {e}")
            print("   Continuing without Supabase...")
            supabase_client = None
    else:
        print("ℹ️  Supabase not configured (will use local JSON only)")
        supabase_client = None
    
    # Step 2: Load embeddings database
    print("\n📂 Loading embeddings database...")
    try:
        with open(EMBEDDINGS_DB, 'rb') as f:
            embeddings_db = pickle.load(f)
        print(f"✅ Loaded {len(embeddings_db)} people from database")
    except FileNotFoundError:
        print(f"⚠️  WARNING: {EMBEDDINGS_DB} not found. Run build_embeddings.py first!")
        embeddings_db = {}
    except Exception as e:
        print(f"❌ Error loading database: {e}")
        embeddings_db = {}
    
    # Step 3: Warm up models (preload into memory)
    print("\n🔥 Warming up face recognition models...")
    print("   This may take 10-30 seconds on first run...")
    
    try:
        # Create a dummy image for model warmup
        dummy_path = os.path.join(UPLOAD_DIR, "warmup_dummy.jpg")
        
        # Use random noise image
        dummy_img = np.random.randint(0, 255, (640, 480, 3), dtype=np.uint8)
        cv2.imwrite(dummy_path, dummy_img)
        
        print("   ⏳ Loading FaceNet model...")
        print("   ⏳ Loading RetinaFace detector...")
        
        # Force load models by attempting detection
        # This will fail (no face in dummy image) but loads models into RAM
        try:
            DeepFace.represent(
                img_path=dummy_path,
                model_name="Facenet",
                detector_backend="retinaface",
                enforce_detection=False
            )
            print("   ✅ Models loaded successfully!")
        except ValueError:
            # Expected - no face in dummy image
            print("   ✅ Models loaded successfully!")
        except Exception as e:
            print(f"   ⚠️  Warmup completed with warning: {str(e)[:50]}")
        
        # Clean up dummy file
        try:
            if os.path.exists(dummy_path):
                os.remove(dummy_path)
        except:
            pass
        
        print("   ✅ FaceNet model ready!")
        print("   ✅ RetinaFace detector ready!")
        
    except Exception as e:
        print(f"   ⚠️  Model warmup failed: {str(e)[:100]}")
        print("   ℹ️  Models will load on first request instead")
    
    print("\n" + "="*60)
    print("✅ Server ready!")
    if supabase_client:
        print("✅ Supabase enabled - attendance will be saved to cloud!")
    else:
        print("ℹ️  Using local JSON storage only")
    print("="*60 + "\n")


def preprocess_image_for_deepface(img_path, max_dimension=1024):
    """
    Preprocess image to reduce memory consumption before DeepFace processing.
    
    Args:
        img_path: Path to the image file
        max_dimension: Maximum width or height (default: 1024)
    
    Returns:
        Path to the preprocessed image (same path, image is overwritten)
    """
    try:
        # Read image
        img = cv2.imread(img_path)
        if img is None:
            raise ValueError(f"Could not read image: {img_path}")
        
        # Get dimensions
        height, width = img.shape[:2]
        
        # Calculate if resizing is needed
        if width > max_dimension or height > max_dimension:
            # Calculate scaling factor
            scale = max_dimension / max(width, height)
            new_width = int(width * scale)
            new_height = int(height * scale)
            
            # Resize with high-quality interpolation
            img = cv2.resize(img, (new_width, new_height), interpolation=cv2.INTER_AREA)
            print(f"   📐 Resized image: {width}x{height} → {new_width}x{new_height}")
        
        # Apply brightness enhancement if needed
        img = preprocess_for_recognition(img)
        
        # Save preprocessed image
        cv2.imwrite(img_path, img, [cv2.IMWRITE_JPEG_QUALITY, 95])
        
        # Clear image from memory
        del img
        gc.collect()
        
        return img_path
        
    except Exception as e:
        print(f"❌ Preprocessing error: {str(e)}")
        raise


def safe_deepface_represent(img_path, retries=2, enforce_detection=True):
    """
    Safely call DeepFace.represent with memory management and error handling.
    
    Args:
        img_path: Path to the image
        retries: Number of retry attempts on failure
        enforce_detection: Whether to enforce face detection (True for uploads, False for identification)
    
    Returns:
        DeepFace representation result
    
    Raises:
        ValueError: If no face detected
        Exception: If processing fails after retries
    """
    last_error = None
    
    for attempt in range(retries):
        try:
            # Preprocess image to reduce memory usage
            preprocess_image_for_deepface(img_path)
            
            # Call DeepFace
            result = DeepFace.represent(
                img_path=img_path,
                model_name="Facenet",
                detector_backend="retinaface",
                enforce_detection=enforce_detection
            )
            
            # Clear memory after successful processing
            gc.collect()
            
            return result
            
        except ValueError as e:
            # No face detected - don't retry
            raise ValueError("No face detected in image")
            
        except Exception as e:
            last_error = e
            error_msg = str(e).lower()
            
            # Check if it's a memory error
            if "memory" in error_msg or "oom" in error_msg or "allocat" in error_msg:
                print(f"   ⚠️  Memory error on attempt {attempt + 1}/{retries}")
                print(f"   🧹 Clearing memory and retrying...")
                
                # Aggressive memory cleanup
                gc.collect()
                
                # Try with smaller image on retry
                if attempt < retries - 1:
                    try:
                        img = cv2.imread(img_path)
                        if img is not None:
                            # Reduce size more aggressively
                            h, w = img.shape[:2]
                            new_h, new_w = h // 2, w // 2
                            img = cv2.resize(img, (new_w, new_h), interpolation=cv2.INTER_AREA)
                            cv2.imwrite(img_path, img, [cv2.IMWRITE_JPEG_QUALITY, 90])
                            del img
                            gc.collect()
                            print(f"   📐 Reduced image size for retry: {new_w}x{new_h}")
                    except:
                        pass
                
                # Wait a moment before retry
                import time
                time.sleep(0.5)
            else:
                # Non-memory error - don't retry
                raise
    
    # All retries failed
    if last_error:
        raise Exception(f"Face detection failed after {retries} attempts: {str(last_error)}")
    else:
        raise Exception("Face detection failed")


def calculate_cosine_distance(embedding1, embedding2):
    """Calculate cosine distance between two embeddings"""
    embedding1 = np.array(embedding1)
    embedding2 = np.array(embedding2)
    
    dot_product = np.dot(embedding1, embedding2)
    norm1 = np.linalg.norm(embedding1)
    norm2 = np.linalg.norm(embedding2)
    
    similarity = dot_product / (norm1 * norm2)
    distance = 1 - similarity
    
    return distance


def identify_from_embedding(test_embedding, threshold=THRESHOLD):
    """Identify person from embedding (original simple logic)"""
    if not embeddings_db or len(embeddings_db) == 0:
        return None
    
    best_match = None
    best_distance = float('inf')
    
    for person_name, person_embeddings in embeddings_db.items():
        distances = []
        for embedding_data in person_embeddings:
            known_embedding = embedding_data['embedding']
            distance = calculate_cosine_distance(test_embedding, known_embedding)
            distances.append(distance)
        
        min_distance = min(distances)
        
        if min_distance < best_distance:
            best_distance = min_distance
            best_match = person_name
    
    if best_distance < threshold:
        confidence = (1 - (best_distance / threshold)) * 100
        return {
            'identified': True,
            'name': best_match,
            'distance': float(best_distance),
            'confidence': float(confidence)
        }
    else:
        return {
            'identified': False,
            'name': None,
            'closest_match': best_match,
            'distance': float(best_distance)
        }


def log_attendance(name, confidence):
    """Log attendance to JSON file AND Supabase"""
    attendance_entry = {
        'name': name,
        'timestamp': datetime.now().isoformat(),
        'confidence': confidence,
        'status': 'present'
    }
    
    # Save to local JSON (backup)
    if os.path.exists(ATTENDANCE_LOG):
        with open(ATTENDANCE_LOG, 'r') as f:
            try:
                attendance_data = json.load(f)
            except:
                attendance_data = []
    else:
        attendance_data = []
    
    attendance_data.append(attendance_entry)
    
    with open(ATTENDANCE_LOG, 'w') as f:
        json.dump(attendance_data, f, indent=2)
    
    # ALSO save to Supabase (if enabled)
    if supabase_client:
        try:
            # Get student from Supabase
            student_response = supabase_client.table('students')\
                .select('*')\
                .eq('name', name)\
                .execute()
            
            if student_response.data and len(student_response.data) > 0:
                student = student_response.data[0]
                
                # Insert attendance record
                supabase_data = {
                    "student_id": student['id'],
                    "roll_number": student['roll_number'],
                    "name": name,
                    "confidence": confidence / 100.0,  # Convert to 0-1 range
                    "status": "present"
                }
                
                supabase_client.table('attendance').insert(supabase_data).execute()
                
                print(f"✅ Saved to Supabase: {name} ({confidence:.1f}%)")
            else:
                print(f"⚠️  Student '{name}' not found in Supabase database")
                
        except Exception as e:
            print(f"⚠️  Supabase save failed: {e}")
            # Continue anyway - at least we have local JSON backup
    
    return attendance_entry


@app.get("/")
async def root():
    """Health check endpoint"""
    return {
        "status": "online",
        "message": "Face Recognition API is running",
        "students_enrolled": len(embeddings_db) if embeddings_db else 0,
        "version": "1.0.0"
    }


@app.post("/identify")
async def identify_face(file: UploadFile = File(...)):
    """
    Identify a person from uploaded image
    
    Used by ESP32-CAM to identify faces
    Returns: {identified, name, confidence}
    """
    
    # Validate file type
    if not file.content_type.startswith('image/'):
        raise HTTPException(status_code=400, detail="File must be an image")
    
    # Check if database is loaded
    if not embeddings_db or len(embeddings_db) == 0:
        raise HTTPException(
            status_code=503,
            detail="Face database not loaded. Run build_embeddings.py first."
        )
    
    try:
        # Save uploaded file temporarily
        file_path = os.path.join(UPLOAD_DIR, f"temp_{datetime.now().timestamp()}.jpg")
        
        try:
            with open(file_path, "wb") as buffer:
                content = await file.read()
                buffer.write(content)
            
            # Resize image for faster processing
            img = cv2.imread(file_path)
            if img is None:
                return JSONResponse(content={
                    "identified": False,
                    "error": "invalid_image"
                })
            
            img = cv2.resize(img, (640, 480))  # Resize to standard size
            
            # Apply brightness enhancement if needed (fast - only processes dark images)
            img = preprocess_for_recognition(img)
            
            cv2.imwrite(file_path, img)
            
            # Clear memory
            del img
            gc.collect()
            
            # Extract embedding from uploaded image
            try:
                embedding_objs = safe_deepface_represent(
                    img_path=file_path, 
                    retries=1,
                    enforce_detection=False  # Allow slight angle variations for identification
                )
                test_embedding = embedding_objs[0]["embedding"]
            except ValueError:
                return JSONResponse(content={
                    "identified": False,
                    "error": "no_face_detected"
                })
            except Exception as e:
                error_msg = str(e).lower()
                if "memory" in error_msg or "oom" in error_msg:
                    print(f"❌ Memory error during identification: {e}")
                    return JSONResponse(content={
                        "identified": False,
                        "error": "memory_error"
                    })
                return JSONResponse(content={
                    "identified": False,
                    "error": "no_face_detected"
                })
            
            # Identify the person
            result = identify_from_embedding(test_embedding, threshold=THRESHOLD)
            
            return JSONResponse(content=result)
        
        finally:
            # Always clean up temp file
            try:
                if os.path.exists(file_path):
                    os.remove(file_path)
            except Exception as e:
                print(f"Warning: Could not delete temp file {file_path}: {e}")
    
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Server error: {str(e)}")


@app.post("/mark_attendance")
async def mark_attendance(file: UploadFile = File(...)):
    """
    Mark attendance for identified person
    
    Identifies person and logs attendance with timestamp
    Returns: {success, student, timestamp, status}
    """
    
    print(f"\n📸 Received attendance request from {file.filename}")
    
    # Validate file type
    if not file.content_type.startswith('image/'):
        raise HTTPException(status_code=400, detail="File must be an image")
    
    # Check if database is loaded
    if not embeddings_db or len(embeddings_db) == 0:
        raise HTTPException(
            status_code=503,
            detail="Face database not loaded. Run build_embeddings.py first."
        )
    
    try:
        # Save uploaded file temporarily
        file_path = os.path.join(UPLOAD_DIR, f"attendance_{datetime.now().timestamp()}.jpg")
        
        try:
            with open(file_path, "wb") as buffer:
                content = await file.read()
                buffer.write(content)
            
            # Resize image for faster processing
            img = cv2.imread(file_path)
            if img is None:
                return JSONResponse(
                    status_code=200,
                    content={
                        "success": False,
                        "message": "Could not read image file. Please try capturing again."
                    }
                )
            
            img = cv2.resize(img, (640, 480))  # Resize to standard size
            
            # Apply brightness enhancement if needed (fast - only processes dark images)
            img = preprocess_for_recognition(img)
            
            cv2.imwrite(file_path, img)
            
            # Extract embedding
            try:
                embedding_objs = DeepFace.represent(
                    img_path=file_path,
                    model_name="Facenet",
                    detector_backend="retinaface",  # Best balance: handles angles + reasonable speed
                    enforce_detection=False  # Allow slight angle variations
                )
                test_embedding = embedding_objs[0]["embedding"]
            except Exception as e:
                return JSONResponse(
                    status_code=200,
                    content={
                        "success": False,
                        "message": "No face detected in image. Please ensure your face is clearly visible."
                    }
                )
            
            # Identify the person
            result = identify_from_embedding(test_embedding, threshold=THRESHOLD)
            
            print(f"🔍 Identification result: {result['identified']} - {result.get('name', 'Unknown')}")
            
            if result['identified']:
                # Log attendance
                print(f"💾 Logging attendance for: {result['name']}")
                attendance = log_attendance(result['name'], result['confidence'])
                
                return JSONResponse(content={
                    "success": True,
                    "name": result['name'],
                    "confidence": result['confidence'] / 100.0,  # Convert to 0-1 range
                    "message": f"Attendance marked successfully for {result['name']}"
                })
            else:
                return JSONResponse(content={
                    "success": False,
                    "message": "Person not recognized in database. Please try again with better lighting or a clearer angle."
                })
        
        finally:
            # Always clean up temp file
            try:
                if os.path.exists(file_path):
                    os.remove(file_path)
            except Exception as e:
                print(f"Warning: Could not delete temp file {file_path}: {e}")
    
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Server error: {str(e)}")


@app.get("/students")
async def get_students():
    """Get list of all enrolled students from Supabase"""
    if not supabase_client:
        # Fallback to old embedding-based list if Supabase not configured
        if not embeddings_db:
            return {"students": []}
        
        students = []
        for name, embeddings in embeddings_db.items():
            students.append({
                "name": name,
                "photos": len(embeddings)
            })
        return {"students": students, "total": len(students)}
    
    try:
        # Fetch from Supabase students table
        result = supabase_client.table("students").select("*").eq("is_active", True).order("roll_number").execute()
        
        students = result.data if result.data else []
        
        print(f"✅ Fetched {len(students)} students from Supabase")
        if students:
            print(f"   First student: {students[0]}")  # Debug log
        
        return {"students": students, "total": len(students)}
        
    except Exception as e:
        print(f"❌ Error fetching students: {e}")
        # Fallback to embedding-based list
        if not embeddings_db:
            return {"students": []}
        
        students = []
        for name, embeddings in embeddings_db.items():
            students.append({
                "name": name,
                "photos": len(embeddings)
            })
        return {"students": students, "total": len(students)}


@app.post("/api/students")
async def create_student(
    roll_number: str = Form(...),
    name: str = Form(...),
    class_name: Optional[str] = Form(None),
    section: Optional[str] = Form(None),
    email: Optional[str] = Form(None),
    phone: Optional[str] = Form(None)
):
    """
    Create a new student in Supabase database
    
    Args:
        roll_number: Unique student roll number/ID
        name: Student's full name
        class_name: Class/Grade level (optional)
        section: Section/Division (optional)
        email: Email address (optional)
        phone: Phone number (optional)
    
    Returns:
        Created student object with UUID
    """
    
    if not supabase_client:
        raise HTTPException(
            status_code=503,
            detail="Supabase not configured. Cannot create student."
        )
    
    try:
        # Check if roll number already exists
        existing = supabase_client.table('students')\
            .select('id')\
            .eq('roll_number', roll_number)\
            .execute()
        
        if existing.data and len(existing.data) > 0:
            raise HTTPException(
                status_code=400,
                detail=f"Student with roll number '{roll_number}' already exists"
            )
        
        # Create student data
        student_data = {
            "roll_number": roll_number,
            "name": name,
            "class": class_name,
            "section": section,
            "email": email,
            "phone": phone,
            "is_active": True
        }
        
        # Insert into Supabase
        result = supabase_client.table('students').insert(student_data).execute()
        
        if result.data and len(result.data) > 0:
            created_student = result.data[0]
            print(f"✅ Created student: {name} (Roll: {roll_number})")
            
            return JSONResponse(content={
                "success": True,
                "student": created_student,
                "message": f"Student '{name}' created successfully"
            })
        else:
            raise HTTPException(status_code=500, detail="Failed to create student")
            
    except HTTPException:
        raise
    except Exception as e:
        print(f"❌ Error creating student: {e}")
        raise HTTPException(status_code=500, detail=f"Error creating student: {str(e)}")


@app.delete("/api/students/{student_id}")
async def delete_student(student_id: str):
    """
    Delete a student from Supabase (hard delete)
    
    This will CASCADE delete all attendance records for this student.
    Also removes the student's folder from known_faces/ directory.
    
    Args:
        student_id: UUID of the student to delete
    
    Returns:
        Success status
    """
    
    if not supabase_client:
        raise HTTPException(
            status_code=503,
            detail="Supabase not configured. Cannot delete student."
        )
    
    try:
        # Get student info before deleting (for cleanup)
        student_response = supabase_client.table('students')\
            .select('*')\
            .eq('id', student_id)\
            .execute()
        
        if not student_response.data or len(student_response.data) == 0:
            raise HTTPException(status_code=404, detail="Student not found")
        
        student = student_response.data[0]
        student_name = student['name']
        
        # Delete from Supabase (CASCADE will delete attendance records)
        supabase_client.table('students').delete().eq('id', student_id).execute()
        
        print(f"✅ Deleted student from database: {student_name}")
        
        # Remove student's known_faces folder if it exists
        student_folder = os.path.join(KNOWN_FACES_DIR, student_name)
        if os.path.exists(student_folder):
            try:
                shutil.rmtree(student_folder)
                print(f"✅ Removed face photos folder: {student_folder}")
            except Exception as e:
                print(f"⚠️  Warning: Could not remove folder {student_folder}: {e}")
        
        # Trigger embeddings rebuild in background
        asyncio.create_task(rebuild_embeddings_background())
        
        return JSONResponse(content={
            "success": True,
            "message": f"Student '{student_name}' deleted successfully",
            "student_id": student_id
        })
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"❌ Error deleting student: {e}")
        raise HTTPException(status_code=500, detail=f"Error deleting student: {str(e)}")


@app.post("/api/students/{student_id}/upload_photos")
async def upload_student_photos(
    student_id: str,
    photos: List[UploadFile] = File(...)
):
    """
    Upload face photos for a student
    
    Validates that each photo contains a detectable face using RetinaFace.
    Saves photos to:
    1. Local known_faces/{student_name}/ directory (for embeddings)
    2. Supabase Storage bucket (for display in UI)
    3. Stores cloud URL in students.photo_url field
    
    Args:
        student_id: UUID of the student
        photos: List of image files (minimum 1, maximum 10)
    
    Returns:
        Success status with photo count and URLs
    """
    
    if not supabase_client:
        raise HTTPException(
            status_code=503,
            detail="Supabase not configured. Cannot upload photos."
        )
    
    # Validate photo count
    if len(photos) < 1:
        raise HTTPException(
            status_code=400,
            detail="Minimum 1 photo required"
        )
    
    if len(photos) > 10:
        raise HTTPException(
            status_code=400,
            detail="Maximum 10 photos allowed"
        )
    
    try:
        # Get student info
        student_response = supabase_client.table('students')\
            .select('*')\
            .eq('id', student_id)\
            .execute()
        
        if not student_response.data or len(student_response.data) == 0:
            raise HTTPException(status_code=404, detail="Student not found")
        
        student = student_response.data[0]
        student_name = student['name']
        
        # Create student's folder in known_faces (for embeddings)
        student_folder = os.path.join(KNOWN_FACES_DIR, student_name)
        os.makedirs(student_folder, exist_ok=True)
        
        # Save and validate each photo
        saved_count = 0
        failed_photos = []
        photo_urls = []
        first_photo_url = None
        
        for idx, photo in enumerate(photos):
            # Validate file type
            if not photo.content_type.startswith('image/'):
                failed_photos.append({
                    "filename": photo.filename,
                    "reason": "Not an image file"
                })
                continue
            
            try:
                # Save photo temporarily for validation
                temp_path = os.path.join(UPLOAD_DIR, f"temp_validate_{idx}.jpg")
                
                with open(temp_path, "wb") as buffer:
                    content = await photo.read()
                    buffer.write(content)
                
                # Validate face detection
                try:
                    # Use safe DeepFace processing with memory management
                    print(f"   🔍 Processing photo {idx + 1} ({photo.filename})...")
                    safe_deepface_represent(temp_path, enforce_detection=True)
                    
                    # Face detected successfully
                    photo_number = saved_count + 1
                    
                    # 1. Save locally for embeddings
                    local_path = os.path.join(student_folder, f"photo_{photo_number}.jpg")
                    shutil.copy(temp_path, local_path)
                    
                    # 2. Upload to Supabase Storage
                    try:
                        storage_path = f"{student_id}/{student_name}/photo_{photo_number}.jpg"
                        
                        with open(temp_path, "rb") as f:
                            file_content = f.read()
                            
                        print(f"📤 Uploading to Supabase: {storage_path}")
                        print(f"   File size: {len(file_content)} bytes")
                        print(f"   Bucket: student-photos")
                        
                        try:
                            # Try to upload
                            upload_response = supabase_client.storage.from_("student-photos").upload(
                                storage_path,
                                file_content,
                                {"content-type": "image/jpeg"}
                            )
                            print(f"   Upload response: {upload_response}")
                        except Exception as upload_err:
                            # If it fails, might be because path exists, try to replace
                            print(f"   First upload failed: {upload_err}")
                            print(f"   Attempting to replace file...")
                            try:
                                upload_response = supabase_client.storage.from_("student-photos").update(
                                    storage_path,
                                    file_content,
                                    {"content-type": "image/jpeg"}
                                )
                                print(f"   Replace successful")
                            except Exception as replace_err:
                                print(f"   Replace also failed: {replace_err}")
                                raise upload_err  # Raise original error
                        
                        # Get public URL
                        public_url = supabase_client.storage.from_("student-photos").get_public_url(storage_path)
                        print(f"   ✅ Public URL: {public_url}")
                        photo_urls.append(public_url)
                        
                        # Store first photo URL for student profile
                        if first_photo_url is None:
                            first_photo_url = public_url
                        
                        print(f"✅ Saved photo {photo_number} for {student_name} (local + cloud)")
                        
                    except Exception as storage_error:
                        print(f"❌ CRITICAL: Cloud upload FAILED for photo {photo_number}: {storage_error}")
                        print(f"   Error type: {type(storage_error).__name__}")
                        print(f"   Photo saved locally only (not accessible from app)")
                        import traceback
                        traceback.print_exc()
                        # DO NOT continue - this photo failed and won't be uploaded
                    
                    saved_count += 1
                    
                except ValueError:
                    failed_photos.append({
                        "filename": photo.filename,
                        "reason": "No face detected in image"
                    })
                except Exception as e:
                    failed_photos.append({
                        "filename": photo.filename,
                        "reason": f"Face detection error: {str(e)}"
                    })
                
                # Clean up temp file
                if os.path.exists(temp_path):
                    os.remove(temp_path)
                    
            except Exception as e:
                failed_photos.append({
                    "filename": photo.filename,
                    "reason": f"Upload error: {str(e)}"
                })
        
        # Check if we have at least 1 valid photo
        if saved_count < 1:
            # Clean up - remove folder if not enough photos
            if os.path.exists(student_folder):
                shutil.rmtree(student_folder)
            
            raise HTTPException(
                status_code=400,
                detail=f"No valid photos with detectable faces. Failed photos: {failed_photos}"
            )
        
        # Update student record with first photo URL (ONLY if we have a valid cloud URL)
        db_update_success = False
        if first_photo_url:
            try:
                supabase_client.table('students').update({
                    "photo_url": first_photo_url
                }).eq('id', student_id).execute()
                print(f"✅ Updated student photo_url in database: {first_photo_url}")
                db_update_success = True
            except Exception as e:
                print(f"❌ CRITICAL: Failed to update photo_url in database: {e}")
                print(f"   Photo is saved locally but NOT accessible from cloud!")
        else:
            print(f"⚠️ WARNING: No photo_url to save (Supabase upload failed or skipped)")
        
        print(f"✅ Successfully uploaded {saved_count} photos for {student_name}")
        
        # Trigger embeddings rebuild in background
        asyncio.create_task(rebuild_embeddings_background())
        
        response_data = {
            "success": True,
            "student_name": student_name,
            "photos_saved": saved_count,
            "photo_urls": photo_urls,
            "message": f"Successfully uploaded {saved_count} photos for {student_name}"
        }
        
        if failed_photos:
            response_data["failed_photos"] = failed_photos
            response_data["message"] += f" ({len(failed_photos)} photos failed validation)"
        
        return JSONResponse(content=response_data)
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"❌ Error uploading photos: {e}")
        raise HTTPException(status_code=500, detail=f"Error uploading photos: {str(e)}")


@app.get("/api/students/{student_id}/photo")
async def get_student_photo(student_id: str):
    """Get the first photo of a student by student ID"""
    if not supabase_client:
        raise HTTPException(status_code=503, detail="Supabase not configured")
    
    try:
        # Get student info
        student_response = supabase_client.table('students')\
            .select('*')\
            .eq('id', student_id)\
            .execute()
        
        if not student_response.data or len(student_response.data) == 0:
            raise HTTPException(status_code=404, detail="Student not found")
        
        student = student_response.data[0]
        student_name = student['name']
        
        # Look for first photo
        student_folder = os.path.join(KNOWN_FACES_DIR, student_name)
        photo_path = os.path.join(student_folder, "photo_1.jpg")
        
        if not os.path.exists(photo_path):
            raise HTTPException(status_code=404, detail="No photo found for student")
        
        return FileResponse(path=photo_path, media_type="image/jpeg")
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"❌ Error fetching student photo: {e}")
        raise HTTPException(status_code=500, detail=f"Error fetching photo: {str(e)}")


async def rebuild_embeddings_background():
    """Background task to rebuild embeddings database"""
    global embeddings_db, rebuild_status
    
    rebuild_status["is_running"] = True
    rebuild_status["last_run"] = datetime.now().isoformat()
    rebuild_status["last_status"] = "running"
    
    try:
        print("\n🔄 Starting embeddings rebuild...")
        
        # Run build_embeddings.py script
        result = subprocess.run(
            ["python", "build_embeddings.py"],
            cwd=os.path.dirname(__file__),
            capture_output=True,
            text=True,
            timeout=300  # 5 minutes timeout
        )
        
        if result.returncode == 0:
            # Reload embeddings database
            try:
                with open(EMBEDDINGS_DB, 'rb') as f:
                    embeddings_db = pickle.load(f)
                print(f"✅ Embeddings rebuilt successfully! {len(embeddings_db)} students loaded.")
                rebuild_status["last_status"] = "success"
            except Exception as e:
                print(f"⚠️  Embeddings built but reload failed: {e}")
                rebuild_status["last_status"] = "partial"
        else:
            print(f"❌ Embeddings rebuild failed: {result.stderr}")
            rebuild_status["last_status"] = "failed"
            
    except subprocess.TimeoutExpired:
        print("❌ Embeddings rebuild timeout (>5 minutes)")
        rebuild_status["last_status"] = "timeout"
    except Exception as e:
        print(f"❌ Embeddings rebuild error: {e}")
        rebuild_status["last_status"] = "error"
    finally:
        rebuild_status["is_running"] = False


@app.post("/api/rebuild_embeddings")
async def rebuild_embeddings():
    """
    Trigger embeddings database rebuild
    
    Runs build_embeddings.py asynchronously in background.
    Returns immediately with job status.
    """
    
    if rebuild_status["is_running"]:
        return JSONResponse(content={
            "success": False,
            "message": "Embeddings rebuild already in progress",
            "status": rebuild_status
        })
    
    # Start rebuild in background
    asyncio.create_task(rebuild_embeddings_background())
    
    return JSONResponse(content={
        "success": True,
        "message": "Embeddings rebuild started in background",
        "status": "running"
    })


@app.get("/api/rebuild_status")
async def get_rebuild_status():
    """Get status of embeddings rebuild process"""
    return JSONResponse(content={
        "status": rebuild_status
    })


@app.get("/attendance/today")
async def get_today_attendance():
    """Get today's attendance records"""
    if not os.path.exists(ATTENDANCE_LOG):
        return {"attendance": [], "total": 0}
    
    with open(ATTENDANCE_LOG, 'r') as f:
        try:
            all_attendance = json.load(f)
        except:
            return {"attendance": [], "total": 0}
    
    # Filter for today
    today = datetime.now().date()
    today_attendance = [
        entry for entry in all_attendance
        if datetime.fromisoformat(entry['timestamp']).date() == today
    ]
    
    return {
        "attendance": today_attendance,
        "total": len(today_attendance),
        "date": today.isoformat()
    }


@app.get("/attendance/all")
async def get_all_attendance():
    """Get all attendance records"""
    if not os.path.exists(ATTENDANCE_LOG):
        return {"attendance": [], "total": 0}
    
    with open(ATTENDANCE_LOG, 'r') as f:
        try:
            all_attendance = json.load(f)
        except:
            return {"attendance": [], "total": 0}
    
    return {"attendance": all_attendance, "total": len(all_attendance)}


# ==================== TRIPS API ENDPOINTS ====================

@app.post("/api/trips")
async def create_trip(
    name: str = Form(...),
    description: str = Form(None),
    trip_date: str = Form(...),
    departure_time: str = Form(None),
    created_by: str = Form(None)
):
    """
    Create a new trip session
    
    Required: name, trip_date (YYYY-MM-DD)
    Optional: description, departure_time (HH:MM:SS), created_by
    """
    if not supabase_client:
        raise HTTPException(status_code=500, detail="Supabase not configured")
    
    try:
        # Insert trip into database
        trip_data = {
            "name": name,
            "description": description,
            "trip_date": trip_date,
            "departure_time": departure_time,
            "status": "planning",
            "created_by": created_by
        }
        
        result = supabase_client.table("trips").insert(trip_data).execute()
        
        if result.data:
            return JSONResponse(content={
                "success": True,
                "trip": result.data[0]
            })
        else:
            raise HTTPException(status_code=500, detail="Failed to create trip")
            
    except Exception as e:
        print(f"Error creating trip: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/trips")
async def get_trips(status: Optional[str] = None):
    """
    Get all trips, optionally filtered by status
    
    status: planning, active, completed, cancelled
    """
    if not supabase_client:
        raise HTTPException(status_code=500, detail="Supabase not configured")
    
    try:
        query = supabase_client.table("trips").select("*").order("trip_date", desc=True)
        
        if status:
            query = query.eq("status", status)
        
        result = query.execute()
        
        return JSONResponse(content={
            "success": True,
            "trips": result.data,
            "total": len(result.data)
        })
        
    except Exception as e:
        print(f"Error fetching trips: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/trips/{trip_id}")
async def get_trip(trip_id: str):
    """Get trip details by ID"""
    if not supabase_client:
        raise HTTPException(status_code=500, detail="Supabase not configured")
    
    try:
        # Get trip
        trip_result = supabase_client.table("trips").select("*").eq("id", trip_id).execute()
        
        if not trip_result.data:
            raise HTTPException(status_code=404, detail="Trip not found")
        
        # Get participant count
        participants_result = supabase_client.table("trip_participants").select("*").eq("trip_id", trip_id).execute()
        
        trip = trip_result.data[0]
        participants = participants_result.data
        
        checked_in_count = len([p for p in participants if p.get('checked_in')])
        
        return JSONResponse(content={
            "success": True,
            "trip": trip,
            "stats": {
                "total": len(participants),
                "checked_in": checked_in_count,
                "missing": len(participants) - checked_in_count,
                "percentage": (checked_in_count / len(participants) * 100) if participants else 0
            }
        })
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error fetching trip: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/trips/{trip_id}/upload-csv")
async def upload_trip_csv(trip_id: str, file: UploadFile = File(...)):
    """
    Upload CSV file with trip participants
    
    CSV format: roll_number,name,phone (header optional)
    Minimum required: roll_number column
    """
    if not supabase_client:
        raise HTTPException(status_code=500, detail="Supabase not configured")
    
    try:
        # Verify trip exists
        trip_result = supabase_client.table("trips").select("*").eq("id", trip_id).execute()
        if not trip_result.data:
            raise HTTPException(status_code=404, detail="Trip not found")
        
        # Read CSV content
        content = await file.read()
        lines = content.decode('utf-8').splitlines()
        
        if not lines:
            raise HTTPException(status_code=400, detail="Empty CSV file")
        
        # Parse CSV
        import csv
        import io
        csv_reader = csv.DictReader(io.StringIO(content.decode('utf-8')))
        
        # Check if header exists, fallback to first column as roll_number
        if csv_reader.fieldnames is None or 'roll_number' not in csv_reader.fieldnames:
            # No header, treat first column as roll_number
            csv_reader = csv.reader(io.StringIO(content.decode('utf-8')))
            rows = [{"roll_number": row[0].strip()} for row in csv_reader if row]
        else:
            rows = list(csv_reader)
        
        # Process each row
        imported = 0
        not_found = []
        duplicates = 0
        
        for row in rows:
            roll_number = row.get('roll_number', '').strip()
            if not roll_number:
                continue
            
            # Find student in database
            student_result = supabase_client.table("students").select("*").eq("roll_number", roll_number).execute()
            
            if not student_result.data:
                not_found.append(roll_number)
                continue
            
            student = student_result.data[0]
            
            # Check if already added to trip
            existing = supabase_client.table("trip_participants").select("*").eq("trip_id", trip_id).eq("student_id", student['id']).execute()
            
            if existing.data:
                duplicates += 1
                continue
            
            # Add to trip_participants
            participant_data = {
                "trip_id": trip_id,
                "student_id": student['id'],
                "roll_number": student['roll_number'],
                "name": student['name'],
                "expected": True,
                "checked_in": False
            }
            
            supabase_client.table("trip_participants").insert(participant_data).execute()
            imported += 1
        
        return JSONResponse(content={
            "success": True,
            "imported": imported,
            "not_found": not_found,
            "duplicates": duplicates,
            "total_processed": len(rows)
        })
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error uploading CSV: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/trips/{trip_id}/participants")
async def get_trip_participants(trip_id: str, checked_in: Optional[bool] = None):
    """
    Get participants for a trip
    
    checked_in: true (only checked in), false (only missing), null (all)
    """
    if not supabase_client:
        raise HTTPException(status_code=500, detail="Supabase not configured")
    
    try:
        # Get trip
        trip_result = supabase_client.table("trips").select("*").eq("id", trip_id).execute()
        
        if not trip_result.data:
            raise HTTPException(status_code=404, detail="Trip not found")
        
        # Get participants
        query = supabase_client.table("trip_participants").select("*").eq("trip_id", trip_id)
        
        if checked_in is not None:
            query = query.eq("checked_in", checked_in)
        
        result = query.order("name").execute()
        participants = result.data
        
        # Calculate stats
        all_participants = supabase_client.table("trip_participants").select("*").eq("trip_id", trip_id).execute().data
        checked_in_count = len([p for p in all_participants if p.get('checked_in')])
        
        return JSONResponse(content={
            "success": True,
            "trip": trip_result.data[0],
            "stats": {
                "total": len(all_participants),
                "checked_in": checked_in_count,
                "missing": len(all_participants) - checked_in_count,
                "percentage": (checked_in_count / len(all_participants) * 100) if all_participants else 0
            },
            "participants": participants
        })
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error fetching participants: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/trips/{trip_id}/checkin")
async def trip_checkin(trip_id: str, image: UploadFile = File(...)):
    """
    Check in a student for a trip using face recognition
    
    Optimized: Only compares against trip participants for faster recognition
    """
    if not supabase_client:
        raise HTTPException(status_code=500, detail="Supabase not configured")
    
    try:
        # Get trip participants
        participants_result = supabase_client.table("trip_participants").select("*, students(*)").eq("trip_id", trip_id).eq("checked_in", False).execute()
        
        if not participants_result.data:
            return JSONResponse(content={
                "success": False,
                "message": "All participants already checked in or no participants found"
            })
        
        # Save uploaded image
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        upload_path = os.path.join(UPLOAD_DIR, f"trip_{trip_id}_{timestamp}.jpg")

        with open(upload_path, "wb") as buffer:
            shutil.copyfileobj(image.file, buffer)

        # Preprocess image
        img = cv2.imread(upload_path)
        if img is None:
            return JSONResponse(content={
                "success": False,
                "message": "Could not read captured image"
            })

        img = preprocess_for_recognition(img)
        cv2.imwrite(upload_path, img)
        final_path = upload_path
        
        # Extract embedding from uploaded image
        try:
            test_embedding = DeepFace.represent(
                img_path=final_path,
                model_name="Facenet",
                detector_backend="retinaface",
                enforce_detection=True
            )[0]["embedding"]
        except Exception as e:
            try:
                if os.path.exists(upload_path):
                    os.remove(upload_path)
            except:
                pass
            raise HTTPException(status_code=400, detail=f"No face detected in image: {str(e)}")
        
        # Identify using standard function to match normal camera behavior
        match_result = identify_from_embedding(test_embedding, THRESHOLD)
        
        # Check if match is found and is within threshold
        if match_result and match_result.get('identified'):
            best_match = match_result['name']
            confidence = match_result['confidence']
            
            # Find participant record (check both trip_participants.name and joined students.name)
            participant = next((p for p in participants_result.data 
                              if p.get('name') == best_match or 
                              (p.get('students') and p['students'].get('name') == best_match)), None)
            
            if participant:
                # Upload photo to Supabase Storage
                photo_url = None
                try:
                    storage_path = f"trip-checkins/{trip_id}/{participant['id']}_{timestamp}.jpg"
                    
                    with open(upload_path, "rb") as f:
                        file_content = f.read()
                    
                    # Upload to checkin-photos bucket (or student-photos if you prefer)
                    supabase_client.storage.from_("student-photos").upload(
                        storage_path,
                        file_content,
                        {"content-type": "image/jpeg"}
                    )
                    
                    # Get public URL
                    photo_url = supabase_client.storage.from_("student-photos").get_public_url(storage_path)
                    print(f"✅ Uploaded check-in photo to cloud: {photo_url}")
                    
                except Exception as storage_error:
                    print(f"⚠️ Cloud upload failed for check-in photo: {storage_error}")
                    # Continue anyway - we still have the recognition result
                
                # Update participant as checked in
                update_data = {
                    "checked_in": True,
                    "check_in_time": datetime.now().isoformat(),
                    "check_in_method": "face",
                    "confidence": confidence,
                    "photo_url": photo_url  # Cloud URL instead of local path
                }

                supabase_client.table("trip_participants").update(update_data).eq("id", participant['id']).execute()

                # Clean up temporary file
                try:
                    if os.path.exists(upload_path):
                        os.remove(upload_path)
                except:
                    pass

                return JSONResponse(content={
                    "success": True,
                    "participant": {
                        "id": participant['id'],
                        "roll_number": participant['roll_number'],
                        "name": participant['name'],
                        "confidence": round(confidence, 2),
                        "check_in_time": update_data['check_in_time'],
                        "photo_url": photo_url
                    }
                })

        # No match found
        try:
            if os.path.exists(upload_path):
                os.remove(upload_path)
        except:
            pass
        
        return JSONResponse(content={
            "success": False,
            "message": "Student not recognized or not in trip participant list",
            "closest_match": best_match,
            "distance": float(best_distance)
        })
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error during trip check-in: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/trips/{trip_id}/mark-manual")
async def mark_manual_checkin(
    trip_id: str,
    participant_id: str = Form(None),
    roll_number: str = Form(None),
    notes: str = Form(None)
):
    """
    Manually check in a student (no face recognition)
    
    Provide either participant_id or roll_number
    """
    if not supabase_client:
        raise HTTPException(status_code=500, detail="Supabase not configured")
    
    if not participant_id and not roll_number:
        raise HTTPException(status_code=400, detail="Either participant_id or roll_number is required")
    
    try:
        # Find participant
        if participant_id:
            query = supabase_client.table("trip_participants").select("*").eq("id", participant_id).eq("trip_id", trip_id)
        else:
            query = supabase_client.table("trip_participants").select("*").eq("roll_number", roll_number).eq("trip_id", trip_id)
        
        result = query.execute()
        
        if not result.data:
            raise HTTPException(status_code=404, detail="Participant not found in this trip")
        
        participant = result.data[0]
        
        # Update as checked in
        update_data = {
            "checked_in": True,
            "check_in_time": datetime.now().isoformat(),
            "check_in_method": "manual",
            "notes": notes or "Manual check-in"
        }
        
        supabase_client.table("trip_participants").update(update_data).eq("id", participant['id']).execute()
        
        return JSONResponse(content={
            "success": True,
            "participant": {
                **participant,
                **update_data
            }
        })
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error during manual check-in: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.patch("/api/trips/{trip_id}/status")
async def update_trip_status(trip_id: str, status: str = Form(...)):
    """
    Update trip status
    
    status: planning, active, completed, cancelled
    """
    if not supabase_client:
        raise HTTPException(status_code=500, detail="Supabase not configured")
    
    valid_statuses = ['planning', 'active', 'completed', 'cancelled']
    if status not in valid_statuses:
        raise HTTPException(status_code=400, detail=f"Invalid status. Must be one of: {', '.join(valid_statuses)}")
    
    try:
        result = supabase_client.table("trips").update({"status": status}).eq("id", trip_id).execute()
        
        if not result.data:
            raise HTTPException(status_code=404, detail="Trip not found")
        
        return JSONResponse(content={
            "success": True,
            "trip": result.data[0]
        })
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error updating trip status: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/trips/{trip_id}/add-participant")
async def add_participant_to_trip(
    trip_id: str,
    student_id: str = Form(None),
    roll_number: str = Form(None)
):
    """
    Add a single participant to a trip
    
    Provide either student_id or roll_number
    Returns warning if student doesn't have embeddings (face photos)
    """
    if not supabase_client:
        raise HTTPException(status_code=500, detail="Supabase not configured")
    
    # DETAILED LOGGING
    print("="*60)
    print(f"ADD PARTICIPANT REQUEST:")
    print(f"  trip_id: {trip_id}")
    print(f"  student_id (raw): {repr(student_id)}")
    print(f"  roll_number (raw): {repr(roll_number)}")
    print(f"  student_id type: {type(student_id)}")
    print(f"  roll_number type: {type(roll_number)}")
    
    # Clean up empty strings to None
    student_id = student_id.strip() if student_id else None
    roll_number = roll_number.strip() if roll_number else None
    
    print(f"  student_id (cleaned): {repr(student_id)}")
    print(f"  roll_number (cleaned): {repr(roll_number)}")
    print("="*60)
    
    if not student_id and not roll_number:
        raise HTTPException(status_code=400, detail="Either student_id or roll_number is required")
    
    try:
        # Verify trip exists
        trip_result = supabase_client.table("trips").select("*").eq("id", trip_id).execute()
        if not trip_result.data:
            raise HTTPException(status_code=404, detail="Trip not found")
        
        # Find student
        if student_id:
            student_result = supabase_client.table("students").select("*").eq("id", student_id).execute()
        else:
            student_result = supabase_client.table("students").select("*").eq("roll_number", roll_number).execute()
        
        if not student_result.data:
            raise HTTPException(status_code=404, detail="Student not found")
        
        student = student_result.data[0]
        
        # Check if already in trip
        existing = supabase_client.table("trip_participants").select("*").eq("trip_id", trip_id).eq("student_id", student['id']).execute()
        
        if existing.data:
            raise HTTPException(status_code=400, detail="Student already in this trip")
        
        # Add to trip_participants
        participant_data = {
            "trip_id": trip_id,
            "student_id": student['id'],
            "roll_number": student['roll_number'],
            "name": student['name'],
            "expected": True,
            "checked_in": False
        }
        
        result = supabase_client.table("trip_participants").insert(participant_data).execute()
        
        # Check if student has embeddings (needed for camera recognition)
        has_embeddings = False
        embeddings_warning = None
        
        if embeddings_db and student['name'] in embeddings_db:
            has_embeddings = True
        else:
            embeddings_warning = f"⚠️ Student '{student['name']}' has no face photos. They won't be recognized by the trip camera. Upload photos first!"
            print(embeddings_warning)
        
        response_data = {
            "success": True,
            "participant": result.data[0],
            "has_embeddings": has_embeddings
        }
        
        if embeddings_warning:
            response_data["warning"] = embeddings_warning
        
        return JSONResponse(content=response_data)
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error adding participant: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.delete("/api/trips/{trip_id}/participants/{participant_id}")
async def remove_participant_from_trip(trip_id: str, participant_id: str):
    """Remove a participant from a trip"""
    if not supabase_client:
        raise HTTPException(status_code=500, detail="Supabase not configured")
    
    try:
        # Verify it's the right trip
        participant = supabase_client.table("trip_participants").select("*").eq("id", participant_id).eq("trip_id", trip_id).execute()
        
        if not participant.data:
            raise HTTPException(status_code=404, detail="Participant not found in this trip")
        
        # Delete
        supabase_client.table("trip_participants").delete().eq("id", participant_id).execute()
        
        return JSONResponse(content={
            "success": True,
            "message": "Participant removed from trip"
        })
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error removing participant: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.delete("/api/trips/{trip_id}")
async def delete_trip(trip_id: str):
    """
    Delete a trip and all its participants
    
    This is a CASCADE delete - all participants will be removed automatically
    """
    if not supabase_client:
        raise HTTPException(status_code=500, detail="Supabase not configured")
    
    try:
        # Verify trip exists
        trip_result = supabase_client.table("trips").select("*").eq("id", trip_id).execute()
        
        if not trip_result.data:
            raise HTTPException(status_code=404, detail="Trip not found")
        
        trip_name = trip_result.data[0].get('name', 'Unknown')
        
        # Delete trip (participants will be cascade deleted automatically)
        supabase_client.table("trips").delete().eq("id", trip_id).execute()
        
        print(f"✅ Deleted trip: {trip_name} (ID: {trip_id})")
        
        return JSONResponse(content={
            "success": True,
            "message": f"Trip '{trip_name}' deleted successfully",
            "trip_id": trip_id
        })
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"❌ Error deleting trip: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# ==================== END TRIPS API ====================


if __name__ == "__main__":
    print("=" * 60)
    print("🚀 Starting Face Recognition API Server")
    print("=" * 60)
    print(f"📍 API will be available at: http://localhost:8000")
    print(f"📖 Documentation: http://localhost:8000/docs")
    print(f"🔄 Reload enabled: Yes")
    print("=" * 60)
    
    uvicorn.run(
        "main:app",
        host="0.0.0.0",  # Allow access from ESP32-CAM on network
        port=8000,
        reload=True  # Auto-reload on code changes
    )
