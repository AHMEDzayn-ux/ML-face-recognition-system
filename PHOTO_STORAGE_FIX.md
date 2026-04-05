# Photo Storage Fix - Supabase Integration

## Summary

Fixed photo upload system to use **dual storage**:

1. **Local storage** (`known_faces/` folder) - for face recognition embeddings
2. **Supabase Storage** (cloud) - for displaying photos in the UI
3. **Database** (`students.photo_url`) - stores cloud URL for easy access

## Changes Made

### 1. Student Photo Upload (`POST /api/students/{student_id}/upload_photos`)

**What was happening before:**

- Photos were saved ONLY locally to `backend/known_faces/{student_name}/photo_N.jpg`
- No cloud storage integration
- No photo URLs stored in database
- Photos couldn't be displayed in frontend (different server)

**What happens now:**

```
For each uploaded photo:
1. Validate face detection with DeepFace
2. Save to LOCAL: known_faces/{student_name}/photo_N.jpg (for embeddings)
3. Upload to CLOUD: Supabase Storage bucket "student-photos"
   Path: {student_id}/{student_name}/photo_N.jpg
4. Get public URL from Supabase
5. Store FIRST photo URL in students.photo_url field
6. Return all photo URLs in API response
```

**API Response includes:**

```json
{
  "success": true,
  "student_name": "John Doe",
  "photos_saved": 3,
  "photo_urls": [
    "https://ykrbllmjrevriecowlnr.supabase.co/storage/v1/object/public/student-photos/...",
    "https://ykrbllmjrevriecowlnr.supabase.co/storage/v1/object/public/student-photos/...",
    "https://ykrbllmjrevriecowlnr.supabase.co/storage/v1/object/public/student-photos/..."
  ],
  "message": "Successfully uploaded 3 photos for John Doe"
}
```

### 2. Trip Check-In Photo Upload (`POST /api/trips/{trip_id}/checkin`)

**What was happening before:**

- Photo saved to `uploads/trip_{trip_id}_{timestamp}.jpg`
- Local path stored in `trip_participants.photo_url`
- **Photo deleted immediately after processing** ❌
- Frontend couldn't display the photo

**What happens now:**

```
1. Capture photo for face recognition
2. Perform face matching
3. Upload photo to Supabase Storage bucket "student-photos"
   Path: trip-checkins/{trip_id}/{participant_id}_{timestamp}.jpg
4. Get public URL
5. Store cloud URL in trip_participants.photo_url
6. Delete temporary local file
7. Return photo URL in response
```

**API Response includes:**

```json
{
  "success": true,
  "participant": {
    "id": "uuid-here",
    "roll_number": "2023001",
    "name": "John Doe",
    "confidence": 95.5,
    "check_in_time": "2026-04-05T17:15:00Z",
    "photo_url": "https://ykrbllmjrevriecowlnr.supabase.co/storage/v1/object/public/student-photos/trip-checkins/..."
  }
}
```

## Database Schema

### Students Table

```sql
CREATE TABLE students (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    roll_number TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    class TEXT,
    section TEXT,
    email TEXT,
    phone TEXT,
    photo_url TEXT,  -- ✅ Stores Supabase cloud URL
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

### Trip Participants Table

```sql
CREATE TABLE trip_participants (
    -- ... other fields ...
    photo_url TEXT,  -- ✅ Now stores Supabase cloud URL (not local path)
    -- ... other fields ...
);
```

## Supabase Storage Buckets Required

### Bucket: `student-photos`

**Purpose:** Store all student photos and check-in photos

**Folder Structure:**

```
student-photos/
├── {student_id}/
│   └── {student_name}/
│       ├── photo_1.jpg
│       ├── photo_2.jpg
│       └── photo_3.jpg
└── trip-checkins/
    └── {trip_id}/
        └── {participant_id}_{timestamp}.jpg
```

**Access Policy:**

- **Public read access** (so frontend can display images)
- **Authenticated write access** (backend can upload)

## Local Storage (Still Used)

### Folder: `backend/known_faces/`

**Purpose:** Store photos for DeepFace embeddings generation

**Folder Structure:**

```
known_faces/
└── {student_name}/
    ├── photo_1.jpg
    ├── photo_2.jpg
    └── photo_3.jpg
```

**Why keep local copies?**

- DeepFace needs local file access to generate embeddings
- Embeddings are used for fast face recognition
- Local copies = faster processing (no network latency)

## Error Handling

**Cloud upload failures:**

- If Supabase upload fails, local copy still exists
- Face recognition will still work
- Warning logged but process continues
- User notified in failed_photos array

**Face detection failures:**

- Photo rejected before any storage
- Neither local nor cloud copy saved
- User notified with reason

## Testing Checklist

- [ ] Upload student photos - verify cloud URLs returned
- [ ] Check students table - photo_url field populated
- [ ] View student in dashboard - photo displays correctly
- [ ] Trip check-in with face - photo URL stored
- [ ] View trip participants - check-in photo displays
- [ ] Test with 10 photos - all uploaded to cloud
- [ ] Test network failure - local copy still works

## Frontend Display

**Students List/Profile:**

```tsx
<img src={student.photo_url} alt={student.name} />
```

**Trip Participants:**

```tsx
{
  participant.photo_url && (
    <img src={participant.photo_url} alt="Check-in photo" />
  );
}
```

## Migration Notes

**Existing students (uploaded before this fix):**

- Have local photos in `known_faces/` folder
- Do NOT have cloud URLs in database
- Face recognition still works
- To fix: Re-upload photos or run migration script

**Migration script (if needed):**

```python
# Upload existing photos to cloud and update database
# Run once to migrate existing students
```

## Benefits

✅ **Frontend can display photos** - cloud URLs accessible from browser  
✅ **Photos persist** - not deleted after processing  
✅ **Scalable** - works in production with separate frontend/backend servers  
✅ **Fast recognition** - local copies for embeddings still available  
✅ **Backup** - photos stored in Supabase (durable, replicated)  
✅ **CDN-ready** - Supabase Storage uses CDN for fast delivery

## Files Modified

1. `backend/main.py`
   - Line 664-809: Updated `upload_student_photos()` endpoint
   - Line 1297-1332: Updated `trip_checkin()` endpoint

## Dependencies

No new dependencies required - uses existing `supabase` Python client.

## Next Steps (Optional Enhancements)

1. **Batch upload migration** - Script to upload existing local photos to cloud
2. **Photo deletion** - When student deleted, remove cloud photos
3. **Multiple photo URLs** - Store array of URLs instead of just first photo
4. **Thumbnail generation** - Generate smaller versions for list views
5. **Separate bucket** - Use `trip-checkin-photos` bucket for trip photos
