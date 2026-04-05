# Photo Storage - Complete Implementation Summary

## ✅ What's Been Fixed

### Backend (FastAPI)

**File: `backend/main.py`**

#### 1. Student Photo Upload Endpoint

```python
POST /api/students/{student_id}/upload_photos
```

**Now does:**

1. ✅ Validates face detection with DeepFace
2. ✅ Saves to LOCAL: `known_faces/{student_name}/photo_N.jpg` (for embeddings)
3. ✅ Uploads to CLOUD: Supabase Storage `student-photos` bucket
4. ✅ Gets public URL from Supabase
5. ✅ Stores first photo URL in `students.photo_url` column
6. ✅ Returns all photo URLs in API response

#### 2. Trip Check-In Endpoint

```python
POST /api/trips/{trip_id}/checkin
```

**Now does:**

1. ✅ Performs face recognition
2. ✅ Uploads check-in photo to Supabase Storage
3. ✅ Stores cloud URL in `trip_participants.photo_url`
4. ✅ Returns photo URL in API response

### Frontend (Next.js/React)

#### 1. Student Type Definition

**File: `pwa-dashboard/lib/supabase.ts`**

- ✅ Added `photo_url: string | null` field to Student interface

#### 2. Students Page Display

**File: `pwa-dashboard/app/students/page.tsx`**

- ✅ Now displays photos from `student.photo_url` (Supabase cloud URL)
- ✅ Fallback to icon if no photo URL exists
- ✅ Removed dependency on local backend endpoint `/api/students/{id}/photo`

## 📦 Supabase Storage Setup Required

### Bucket Name: `student-photos`

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

### Storage Policies Needed

**Option 1: Public Bucket (Recommended for simplicity)**

```sql
-- In Supabase Dashboard → Storage → student-photos → Policies
-- Make bucket public for read access
CREATE POLICY "Public Access"
ON storage.objects FOR SELECT
USING ( bucket_id = 'student-photos' );
```

**Option 2: Authenticated Access**

```sql
-- For more security (requires signed URLs)
CREATE POLICY "Authenticated can read"
ON storage.objects FOR SELECT
USING ( bucket_id = 'student-photos' AND auth.role() = 'authenticated' );
```

## 🔄 Data Flow

### Adding a Student with Photos

```
1. User uploads photos in AddStudentForm
   ↓
2. Frontend calls createStudent() → creates student record
   ↓
3. Frontend calls uploadStudentPhotos(studentId, photos)
   ↓
4. Backend processes each photo:
   - Validates face detection
   - Saves locally (for embeddings)
   - Uploads to Supabase Storage
   - Gets public URL
   ↓
5. Backend updates students.photo_url with first photo URL
   ↓
6. Frontend receives response with photo_urls array
   ↓
7. Frontend refreshes student list
   ↓
8. Student card displays photo from photo_url field
```

### Trip Check-In

```
1. User takes photo in trip check-in
   ↓
2. Backend performs face recognition
   ↓
3. Match found → upload photo to Supabase Storage
   ↓
4. Backend updates trip_participants.photo_url with cloud URL
   ↓
5. Frontend displays check-in photo from photo_url
```

## 🗄️ Database Schema

### Students Table

```sql
-- Column added (should already exist if you set it up)
ALTER TABLE students ADD COLUMN photo_url TEXT;
```

### Trip Participants Table

```sql
-- Column exists, now stores cloud URLs instead of local paths
trip_participants.photo_url TEXT
```

## 📝 Testing Checklist


### 1. Add New Student

- [ ] Upload 1-10 photos
- [ ] Check backend logs for "✅ Saved photo N for {name} (local + cloud)"
- [ ] Check backend logs for "✅ Updated student photo_url in database"
- [ ] Verify photos appear in Supabase Storage dashboard
- [ ] Verify student card shows photo on students page
- [ ] Check browser network tab - photo should load from `supabase.co` domain

### 2. Trip Check-In

- [ ] Create a trip with participants
- [ ] Use face recognition to check in
- [ ] Verify photo appears in trip participant list
- [ ] Check photo URL in database - should be Supabase URL

### 3. Error Handling

- [ ] Upload photo without face → should be rejected
- [ ] Upload non-image file → should be rejected
- [ ] Network error during upload → local copy should still work
- [ ] Student without photo → should show user icon

## 🐛 Troubleshooting

### Photos Not Appearing

**Check 1: Supabase Storage Bucket**

```
1. Go to Supabase Dashboard → Storage
2. Verify "student-photos" bucket exists
3. Check if photos are uploaded (browse folders)
```

**Check 2: Database Field**

```sql
-- Run in Supabase SQL Editor
SELECT id, name, photo_url FROM students LIMIT 10;
-- Should show URLs like: https://ykrbllmjrevriecowlnr.supabase.co/storage/v1/object/public/student-photos/...
```

**Check 3: Storage Policies**

```
1. Go to Supabase Dashboard → Storage → student-photos → Policies
2. Ensure public read access policy exists
3. Or check browser console for 403 errors
```

**Check 4: Backend Logs**

```
Look for:
✅ "Saved photo N for {name} (local + cloud)"
✅ "Updated student photo_url in database"
⚠️ "Cloud upload failed" - indicates storage issue
```

### Photos Show as Broken Image

**Likely Cause:** Storage bucket is private and no RLS policy for public access

**Fix:**

```sql
-- Make bucket public for reads
CREATE POLICY "Public Access"
ON storage.objects FOR SELECT
USING ( bucket_id = 'student-photos' );
```

### Backend Error on Upload

**Error:** `StorageException: Bucket not found`
**Fix:** Create `student-photos` bucket in Supabase Dashboard

**Error:** `StorageException: new row violates row-level security policy`
**Fix:** Add storage policy for INSERT:

```sql
CREATE POLICY "Authenticated can upload"
ON storage.objects FOR INSERT
WITH CHECK ( bucket_id = 'student-photos' AND auth.role() = 'authenticated' );
```

## 🔐 Security Notes

1. **Local Photos:** Stored in `backend/known_faces/` for embeddings only
   - Not accessible from internet
   - Used only for face recognition processing

2. **Cloud Photos:** Stored in Supabase Storage
   - Accessible via public URL (if policy allows)
   - Served via CDN for fast delivery
   - Backed up and replicated by Supabase

3. **Database URLs:**
   - Stored in plain text (safe - they're public URLs)
   - No sensitive data in URLs

## 📊 Storage Usage

**Per Student:**

- Local: ~100-500 KB per photo × 10 photos = ~5 MB max
- Cloud: Same as local (duplicate)

**100 Students:**

- Local: ~500 MB
- Cloud: ~500 MB (in Supabase free tier: 1 GB included)

## 🚀 Next Steps (Optional Enhancements)

1. **Migrate Existing Students**
   - Create script to upload existing local photos to cloud
   - Update database with photo URLs

2. **Thumbnail Generation**
   - Generate smaller versions for list view
   - Store as `photo_1_thumb.jpg`

3. **Multiple Photos Display**
   - Show photo gallery for each student
   - Store array of URLs in `photo_urls` JSONB column

4. **Photo Management**
   - Allow deleting/replacing photos
   - Delete from both local and cloud storage

5. **Compression**
   - Compress images before upload
   - Reduce storage costs and loading time

## ✅ Summary

**Before:**

- Photos saved locally only
- Not accessible from frontend
- Lost if server restarts

**After:**

- Photos saved to both local (for AI) and cloud (for display)
- URLs stored in database
- Frontend displays from cloud storage
- Persistent and scalable
