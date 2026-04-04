# Face Recognition Attendance System

A face recognition system using pre-trained deep learning models for automated attendance tracking.

## Phase 1: Local ML Prototype

### Setup Instructions

**Step 1: Install Python 3.11**

1. Download Python 3.11.10 from: https://www.python.org/downloads/release/python-31110/
2. Run installer with these settings:
   - ✅ **Add python.exe to PATH**
   - ✅ Install for all users
   - ❌ **Do NOT** set as default (keep your 3.14)
3. Note the installation path (usually `C:\Users\YourName\AppData\Local\Programs\Python\Python311`)

**Step 2: Run Setup**

Run the automated setup:

```batch
install_python311.bat
```

Or manually:

```batch
# Use Python 3.11 specifically
C:\Users\YourName\AppData\Local\Programs\Python\Python311\python.exe -m venv venv
venv\Scripts\activate.bat
pip install -r requirements.txt
```

**Alternative: Docker (if Python install fails)**

```batch
setup_docker.bat
docker-compose up -d
```

### Project Structure

```
face recognition/
├── venv/                  # Virtual environment
├── known_faces/          # Student face images (to be created)
│   ├── student_name_1/
│   │   ├── photo1.jpg
│   │   ├── photo2.jpg
│   │   └── photo3.jpg
│   └── student_name_2/
│       └── ...
├── test_images/          # Test images (to be created)
├── embeddings.pkl        # Pre-computed face embeddings
├── verify_faces.py       # Simple face verification
├── build_embeddings.py   # Create embeddings database
└── identify_face.py      # Main identification script
```

### How It Works

1. **Face Detection**: MTCNN/RetinaFace detects and crops faces
2. **Feature Extraction**: FaceNet extracts 128/512-D embeddings
3. **Matching**: Cosine similarity compares embeddings
4. **Identification**: Returns best match above threshold

### Technologies Used

- **DeepFace**: High-level face recognition library
- **FaceNet**: Pre-trained neural network for embeddings
- **OpenCV**: Image processing
- **TensorFlow**: Deep learning backend

### Next Steps

1. ✅ Setup environment
2. ⏳ Test face verification
3. ⏳ Build known faces database
4. ⏳ Implement identification
5. ⏳ Validate accuracy
