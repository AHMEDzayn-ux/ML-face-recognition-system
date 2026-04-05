# Attendance System - Codebase Analysis

## Face Recognition & Embedding Architecture

---

## 1. FACE RECOGNITION PIPELINE

### How It Works: Step-by-Step

#### Phase 1: Building the Embeddings Database

**File: `build_embeddings.py`**

```
known_faces/
├── Alice/
│   ├── photo_1.jpg
│   └── photo_2.jpg
└── Bob/
    └── photo_1.jpg
         ↓
build_embeddings.py runs
         ↓
DeepFace.represent() for each image using:
  - Model: FaceNet (generates 128-dimensional vectors)
  - Detector: MTCNN (face detection)
         ↓
embeddings.pkl (pickle file)
{
  "Alice": [
    {"embedding": [0.123, -0.456, ...], "image": "photo_1.jpg", "path": "..."},
    {"embedding": [0.125, -0.450, ...], "image": "photo_2.jpg", "path": "..."}
  ],
  "Bob": [
    {"embedding": [0.789, -0.012, ...], "image": "photo_1.jpg", "path": "..."}
  ]
}
```

**Trigger Points for Rebuild:**

- `/api/students/{student_id}/upload_photos` (after photos uploaded)
- `/api/students/{student_id}` (after student deleted)
- Manual: `/api/rebuild_embeddings`
- Process: Runs `build_embeddings.py` as subprocess in background

---

#### Phase 2: Identifying a Face from Camera

**File: `identify_face.py` → Used by `main.py`**

```
1. User captures image on camera
   ↓
2. Image preprocessing:
   - Resize to 640×480
   - Apply brightness enhancement if needed
   - Save temporarily
   ↓
3. Extract embedding from image:
   DeepFace.represent(image):
     - Model: FaceNet
     - Detector: RetinaFace (for API, faster + handles angles)
     - Returns: 128D embedding vector
   ↓
4. Compare against ALL known faces:
   For each person in embeddings.pkl:
     For each of their training photos:
       distance = cosine_distance(test_embedding, known_embedding)

   min_distance = lowest distance found
   ↓
5. Apply THREE-LEVEL VALIDATION:

   ✓ Check 1: Distance Threshold
     if min_distance >= 0.4:  # threshold
       ❌ FAIL: Distance too high

   ✓ Check 2: Confidence Level
     confidence = (1 - min_distance/threshold) × 100
     if confidence < 60%:
       ❌ FAIL: Confidence too low

   ✓ Check 3: Distance Gap (ambiguity check)
     if (distance_2nd - distance_1st) < 0.05:
       ❌ FAIL: Two people too similar, ambiguous

   All passed?
   ✅ IDENTIFIED
   ↓
6. Return result: {identified: true, name: "Alice", confidence: 85%, ...}
```

### Key Algorithm Details

**Similarity Metric:**

```python
def calculate_cosine_distance(embedding1, embedding2):
    # Cosine similarity (dot product of normalized vectors)
    similarity = (embedding1 · embedding2) / (||embedding1|| × ||embedding2||)

    # Convert to distance
    distance = 1 - similarity

    # Range: 0 (identical) to 2 (opposite)
    # Default threshold: 0.4
```

**Multiple Photo Handling:**

- When building embeddings: Store multiple embeddings per person
- When identifying: Compare against ALL embeddings, use minimum distance
- This makes recognition robust to lighting/angles in training data

---

## 2. CAMERA FEATURES: MAIN PAGE vs TRIP

### Main Page Camera (`/camera` route)

**Frontend:** `pwa-dashboard/app/camera/page.tsx`

- Uses `CameraView.tsx` component
- Calls `markAttendance()` API function

**Backend:** `main.py` → `/mark_attendance` endpoint

```python
@app.post("/mark_attendance")
async def mark_attendance(file: UploadFile = File(...)):
    """
    1. Extract embedding from uploaded image
    2. identify_from_embedding(test_embedding)
       → Searches FULL embeddings.pkl for match
    3. If identified:
       - Log to attendance.json (local backup)
       - Log to Supabase attendance table
    4. Return: {success: true, name: "Alice", confidence: 85%}
    """
```

**Response Format:**

```json
{
  "success": true,
  "name": "Alice",
  "confidence": 0.85,
  "message": "Attendance marked successfully for Alice"
}
```

**Data Flow:**

```
Camera capture → CameraView.tsx → POST /mark_attendance →
Extract embedding → Search full DB → Log to attendance table
```

---

### Trip Camera (`/trips/[id]/camera` route)

**Frontend:** `pwa-dashboard/app/trips/[id]/camera/page.tsx`

- Custom camera component
- Calls `tripCheckin()` API function

**Backend:** `main.py` → `/api/trips/{trip_id}/checkin` endpoint

```python
@app.post("/api/trips/{trip_id}/checkin")
async def trip_checkin(trip_id: str, image: UploadFile):
    """
    1. Extract embedding from image
    2. identify_from_embedding(test_embedding)
       → Searches FULL embeddings.pkl (NOT filtered to trip!)
    3. If identified:
       - Get best_match name from embeddings
       - Find participant in trip_participants table where name matches
       - Update trip_participants.checked_in = true
    4. Return: {success: true, participant: {...}}
    """
```

**Response Format:**

```json
{
  "success": true,
  "participant": {
    "id": "uuid",
    "roll_number": "STU001",
    "name": "Alice",
    "confidence": 0.85,
    "check_in_time": "2024-04-06T10:30:00"
  }
}
```

**Data Flow:**

```
Camera capture → TripCameraPage.tsx → POST /api/trips/{id}/checkin →
Extract embedding → Search FULL DB → Find in trip_participants →
Update checked_in status
```

---

## 3. ADDING STUDENTS TO TRIPS

### Database Schema

```sql
-- trip_participants table
{
  id: uuid,
  trip_id: uuid,
  student_id: uuid,
  roll_number: string,    -- from students table
  name: string,           -- from students table
  expected: boolean,
  checked_in: boolean,
  check_in_time: timestamp,
  check_in_method: "face" | "manual",
  confidence: float,
  photo_url: string       -- cloud storage URL
}
```

### Three Methods

#### Method 1: CSV Upload

**Endpoint:** `POST /api/trips/{trip_id}/upload-csv`

```python
# CSV format (header optional)
roll_number
STU001        # → Find in students table → Add to trip
STU002        # → Find in students table → Add to trip
STU999        # → Not found → Add to "not_found" list

# For each found student:
trip_participants.insert({
  trip_id: trip.id,
  student_id: student.id,
  roll_number: student.roll_number,
  name: student.name,
  expected: true,
  checked_in: false
})
```

#### Method 2: Manual Add (From UI)

**Endpoint:** `POST /api/trips/{trip_id}/add-participant`

**With detailed logging in backend:**

```python
# Frontend sends FormData with student_id or roll_number
# Backend:
1. Clean/trim values (handles empty strings)
2. Verify trip exists
3. Find student by ID or roll_number
4. Check not already in trip
5. Insert into trip_participants

# If student not found → 404 error
# If already in trip → 400 error (duplicate)
```

#### Method 3: Direct Database

- Insert directly into trip_participants

### Key Point: No Filtering by Trip

- When student added to trip: Only creates a record in `trip_participants`
- Embeddings in `embeddings.pkl` are global for ALL students
- No sub-database created for trip-specific embeddings
- Trip checkin searches FULL database, not limited to trip participants

---

## 4. EMBEDDINGS STORAGE & LOADING

### Physical Storage

**Embeddings File:**

- **Location:** `backend/embeddings.pkl`
- **Format:** Python pickle (binary)
- **Content:** Dictionary mapping student names to embedding lists
- **Size:** Grows with each added student (~10-20KB per person)

**Source Photos:**

- **Location:** `backend/known_faces/{student_name}/photo_N.jpg`
- **Structure:** One folder per student, numbered photos
- **Purpose:** Source material for rebuild_embeddings.py

**Cloud Storage (Optional):**

- **Location:** Supabase Storage bucket `student-photos`
- **Path:** `{student_id}/{student_name}/photo_N.jpg`
- **Purpose:** Display in UI, backup

---

### Loading & Caching

**Startup (`startup_event()`):**

```python
# When FastAPI server starts:
with open("embeddings.pkl", 'rb') as f:
    embeddings_db = pickle.load(f)

print(f"✅ Loaded {len(embeddings_db)} people from database")
```

**Global Variable:**

```python
# In main.py
embeddings_db = None  # Global, loaded at startup

# Used by BOTH endpoints:
# - /mark_attendance
# - /api/trips/{tripId}/checkin

# Both call: identify_from_embedding(test_embedding, THRESHOLD)
```

**Rebuilding & Reloading:**

```python
# When photos uploaded:
asyncio.create_task(rebuild_embeddings_background())

# Background task:
1. Run: python build_embeddings.py
   → Scans known_faces/
   → DeepFace for each image
   → Saves new embeddings.pkl
2. Reload into memory:
   with open(EMBEDDINGS_DB, 'rb') as f:
       embeddings_db = pickle.load(f)
   print(f"✅ Loaded {len(embeddings_db)} people")

# Takes 2-5 minutes depending on number of students
```

---

## 5. DIFFERENCES: TRIP vs MAIN RECOGNITION

| Aspect               | Main Page                                | Trip Recognition                              |
| -------------------- | ---------------------------------------- | --------------------------------------------- |
| **Endpoint**         | `/mark_attendance`                       | `/api/trips/{id}/checkin`                     |
| **Embedding Source** | Global `embeddings_db`                   | Global `embeddings_db`                        |
| **Search Space**     | ALL students in database                 | ALL students in database                      |
| **Validation**       | 3-level (threshold, confidence, gap)     | 3-level (same)                                |
| **Match Used For**   | Log attendance for any recognized person | Find trip_participant record by name          |
| **Success Criteria** | Just needs "identified: true"            | Needs identified + found in trip_participants |
| **Failure Case**     | Unrecognized person → log failure        | Unrecognized OR not in trip → failure         |
| **Data Storage**     | Attendance table                         | trip_participants.checked_in                  |

**Critical Difference:**

```
Main: Match name → Log to attendance table
Trip: Match name → Find in trip_participants → Update checked_in

If name doesn't match exactly between:
- embeddings.pkl (what name was learned)
- trip_participants.name (what was added to trip)

→ Checkin FAILS even with successful face match!
```

---

## 6. POTENTIAL DATA MISMATCH ISSUES

### Issue 1: Embeddings Out of Sync

**Scenario:**

1. User uploads photos for new student
2. Backend starts async rebuild of embeddings.pkl
3. Server crashes/restarts before rebuild completes
4. New student won't be in embeddings_db

**Risk Level:** MEDIUM
**Mitigation:** Rebuild task has try/except, at least local JSON backup exists

### Issue 2: Student Not in Embeddings

**Scenario:**

1. Student created in database
2. Added to trip manually
3. No photos uploaded → no embeddings created
4. Try to check in → not recognized

**Risk Level:** HIGH
**Result:** Trip checkin fails silently, marked as unrecognized

### Issue 3: Name Mismatch

**Scenario:**

1. Photos uploaded for "John Smith"
2. Embeddings built with key "John Smith"
3. Trip has participant with name "John S." or "JOHN SMITH"
4. Face matches, but name in trip_participants doesn't match

**Example From Code:**

```python
# In trip_checkin:
if match_result['identified']:
    best_match = match_result['name']  # e.g., "John Smith"

    # Find in trip_participants:
    participant = next((p for p in participants
        if p.get('name') == best_match or    # Exact match only!
           (p.get('students') and p['students'].get('name') == best_match)),
        None)

    if participant:
        # Success
    else:
        # FAIL - Name doesn't match despite successful face recognition!
```

**Risk Level:** HIGH
**Root Cause:** No fuzzy matching, exact string comparison only

### Issue 4: Global Embeddings Search (Security/Accuracy)

**Scenario:**

1. Alice and Bob look similar
2. Both added to trip
3. During checkin, Alice captured
4. System returns Bob's embedding as best match
5. But that match has confidence below threshold
6. System fails even though Alice is in the trip

**Risk Level:** MEDIUM
**Better Approach:** Filter embeddings to trip participants before searching

### Issue 5: Photo Quality Variance

**Scenario:**

1. Training photos: good lighting, frontal angle
2. Real-time capture: low light, side angle
3. Embeddings don't match well enough

**Risk Level:** MEDIUM
**Mitigation:** Image enhancement pre-processing helps, but not perfect

### Issue 6: Concurrent Embeddings Rebuild

**Scenario:**

1. Multiple students' photos uploaded simultaneously
2. Multiple rebuild tasks queued
3. No synchronization between rebuilds
4. Final embeddings.pkl might be incomplete

**Risk Level:** LOW (Python has GIL, subprocess isolation)

---

## 7. DETAILED CODE REFERENCES

### Embedding Matching Logic

**File:** `identify_face.py` → `identify_face()` function
**Also Used In:** `main.py` → `identify_from_embedding()` wrapper

### Main Endpoints

**Attendance:**

- `POST /mark_attendance` - Main camera recognition
- `GET /attendance/today` - Get today's records
- `GET /attendance/all` - Get all records

**Students:**

- `POST /api/students` - Create student
- `POST /api/students/{id}/upload_photos` - Upload face photos
- `GET /students` - List all students
- `DELETE /api/students/{id}` - Delete student

**Trips:**

- `POST /api/trips` - Create trip
- `GET /api/trips` - List trips
- `POST /api/trips/{id}/checkin` - Face recognition checkin
- `POST /api/trips/{id}/mark-manual` - Manual checkin
- `POST /api/trips/{id}/add-participant` - Add one student
- `POST /api/trips/{id}/upload-csv` - Add multiple students
- `GET /api/trips/{id}/participants` - List participants

### Frontend API Wrappers

**File:** `pwa-dashboard/lib/api.ts`

```typescript
// Main page
markAttendance(imageFile); // POST /mark_attendance

// Trips
tripCheckin(tripId, imageFile); // POST /api/trips/{id}/checkin
addParticipantToTrip(tripId, studentId, rollNumber); // POST /api/trips/{id}/add-participant
```

---

## 8. CONFIGURATION & CONSTANTS

### Backend Settings (main.py)

```python
EMBEDDINGS_DB = "embeddings.pkl"           # Pickle file with all embeddings
ATTENDANCE_LOG = "attendance.json"         # Local backup
UPLOAD_DIR = "uploads"                     # Temporary image uploads
KNOWN_FACES_DIR = "known_faces"            # Training photos directory
THRESHOLD = 0.4                            # Distance threshold for match

# In identify_face.py
min_confidence = 60.0         # Minimum confidence percentage
min_distance_gap = 0.05       # Minimum gap between 1st and 2nd match
```

### DeepFace Configuration

```python
# Image Preprocessing
model_name = "Facenet"        # Embedding model
detector_backend = "retinaface"  # For API (faster)
detector_backend = "mtcnn"       # For building embeddings (more accurate)
enforce_detection = False/True   # Require face to be detected

# Image Sizes
Request: Resize to 640×480
Training: Original size (varies)
```

---

## 9. SUMMARY: HOW RECOGNITION CURRENTLY WORKS

1. **Build Phase:**
   - Student photos → DeepFace FaceNet embeddings
   - All embeddings stored in single pickle file (loaded at server start)

2. **Recognition Phase:**
   - Capture image → Extract embedding via DeepFace
   - Compare against ALL students' embeddings
   - Apply multi-level validation
   - Return best match (or "unknown")

3. **Trip-Specific Logic:**
   - Same embedding search as main page
   - PLUS: Verify matched name exists in trip_participants
   - Update trip_participants record if found

4. **Data Integrity Risk:**
   - Name mismatch between embeddings and trip_participants
   - Student not added to embeddings
   - No filtering of embedding search by trip
   - Exact string matching for participant lookup

---

## 10. RECOMMENDATIONS FOR TROUBLESHOOTING

If face recognition isn't working in a trip:

1. **Verify Embeddings Built:**

   ```bash
   # Check the file exists and is recent
   ls -lh backend/embeddings.pkl

   # Verify it loads
   python -c "import pickle; data = pickle.load(open('embeddings.pkl', 'rb')); print(list(data.keys()))"
   ```

2. **Check Photo Quality:**
   - Look at training photos in `known_faces/{name}/`
   - Test with standalone identify_face.py script on known good photos

3. **Verify Trip Participant Names:**
   - Check exact spelling in trip_participants table
   - Must match exactly what's in embeddings.pkl keys

4. **Test Endpoints Separately:**
   - Use Postman to test `/mark_attendance` with test image
   - Then test `/api/trips/{id}/checkin` with same image
   - Compare responses to see where it fails

5. **Check Server Logs:**
   - Look for "Embeddings rebuilt" messages indicating updates
   - Look for specific face recognition failures and distances
   - Backend validation output is very detailed
