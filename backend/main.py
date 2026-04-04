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
from fastapi.responses import JSONResponse
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
    load_dotenv()  # Load .env file
    SUPABASE_ENABLED = os.getenv("SUPABASE_URL") and os.getenv("SUPABASE_KEY")
except ImportError:
    SUPABASE_ENABLED = False
    print("⚠️  Supabase not installed. Install with: pip install supabase python-dotenv")

# Import our existing identification logic
import sys
sys.path.append(os.path.dirname(__file__))

# Import image enhancement module
from image_enhancement import preprocess_for_recognition

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
THRESHOLD = 0.4

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
    """Identify person from embedding"""
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
            
            # Extract embedding from uploaded image
            try:
                embedding_objs = DeepFace.represent(
                    img_path=file_path,
                    model_name="Facenet",
                    detector_backend="retinaface",  # Best balance: handles angles + reasonable speed
                    enforce_detection=False  # Allow slight angle variations
                )
                test_embedding = embedding_objs[0]["embedding"]
            except Exception as e:
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
    """Get list of all enrolled students"""
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
    Saves photos to known_faces/{student_name}/ directory.
    
    Args:
        student_id: UUID of the student
        photos: List of image files (minimum 3, maximum 10)
    
    Returns:
        Success status with photo count
    """
    
    if not supabase_client:
        raise HTTPException(
            status_code=503,
            detail="Supabase not configured. Cannot upload photos."
        )
    
    # Validate photo count
    if len(photos) < 3:
        raise HTTPException(
            status_code=400,
            detail="Minimum 3 photos required for accurate face recognition"
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
        
        # Create student's folder in known_faces
        student_folder = os.path.join(KNOWN_FACES_DIR, student_name)
        os.makedirs(student_folder, exist_ok=True)
        
        # Save and validate each photo
        saved_count = 0
        failed_photos = []
        
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
                    DeepFace.represent(
                        img_path=temp_path,
                        model_name="Facenet",
                        detector_backend="retinaface",
                        enforce_detection=True  # Require face detection
                    )
                    
                    # Face detected successfully - save to student folder
                    final_path = os.path.join(student_folder, f"photo_{saved_count + 1}.jpg")
                    shutil.copy(temp_path, final_path)
                    saved_count += 1
                    print(f"✅ Saved photo {saved_count} for {student_name}")
                    
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
        
        # Check if we have enough valid photos
        if saved_count < 3:
            # Clean up - remove folder if not enough photos
            if os.path.exists(student_folder):
                shutil.rmtree(student_folder)
            
            raise HTTPException(
                status_code=400,
                detail=f"Only {saved_count} valid photos with detectable faces. Minimum 3 required. Failed photos: {failed_photos}"
            )
        
        print(f"✅ Successfully uploaded {saved_count} photos for {student_name}")
        
        # Trigger embeddings rebuild in background
        asyncio.create_task(rebuild_embeddings_background())
        
        response_data = {
            "success": True,
            "student_name": student_name,
            "photos_saved": saved_count,
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
