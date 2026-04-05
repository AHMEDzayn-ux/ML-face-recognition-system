# Student Photo Upload - Supabase Setup Guide

## Overview

This guide walks you through setting up Supabase to support student photo uploads. The system will:

- Store photos in Supabase Storage (student-photos bucket)
- Link photos to student records via photo_url
- Provide a user-friendly upload interface in the student card
- Auto-delete old photos when new ones are uploaded

---

## Step 1: Add Photo Column to Students Table

### 1.1 Open Supabase SQL Editor

1. Go to [Supabase Dashboard](https://supabase.com/dashboard)
2. Select your project
3. Navigate to **SQL Editor** (left sidebar)
4. Click **New Query**

### 1.2 Run the Migration

Copy the entire content from `backend/add_student_photos.sql` and paste it into the SQL editor:

```sql
-- Add photo_url column to students table
ALTER TABLE students ADD COLUMN IF NOT EXISTS photo_url TEXT;

-- Add comment for documentation
COMMENT ON COLUMN students.photo_url IS 'URL to student profile photo stored in Supabase Storage (student-photos bucket)';

-- Index for faster queries filtering by photo_url
CREATE INDEX IF NOT EXISTS idx_students_photo_url ON students(photo_url);
```

Click **Run** ▶️

**Expected Result**: ✅ No error messages, column added successfully

---

## Step 2: Create Storage Bucket for Photos

### 2.1 Navigate to Storage

1. In Supabase Dashboard, go to **Storage** (left sidebar)
2. Click **New Bucket**

### 2.2 Create Bucket Settings

- **Bucket name**: `student-photos`
- **Private bucket**: ❌ Uncheck (we need public access for displaying photos)
- Click **Create bucket**

### 2.3 Configure Public Access

1. Select the **student-photos** bucket
2. Click **Policies** (or ⋮ → Policies)
3. Click **New policy** → **For queries only**

Select template: **Allow public read-only access**

- Apply to: ✅ GET
- Click **Review**
- Click **Save Policy**

**Expected Result**: 🔓 Bucket is publicly readable

---

## Step 3: Create Row Level Security (RLS) Policies for Storage

### 3.1 Add Upload Policy

1. In the **student-photos** bucket, click **Policies** again
2. Click **New policy** → **For data manipulation**
3. Choose: **Create**

Configure as follows:

- **Policy name**: `Allow authenticated users to upload`
- **Target roles**: `authenticated`
- **Expression**: Leave as `true` or `(auth.role() = 'authenticated')`
- Click **Review** → **Save Policy**

### 3.2 Add Delete Policy

1. Click **New policy** → **For data manipulation**
2. Choose: **Delete**

Configure:

- **Policy name**: `Allow users to delete their own photos`
- **Target roles**: `authenticated`
- **Expression**: `true`
- Click **Review** → **Save Policy**

**Result**: ✅ Authenticated users can upload and delete photos

---

## Step 4: Test the Setup

### 4.1 Verify Database Column

Go to **Table Editor** in Supabase:

1. Find **students** table
2. Check if `photo_url` column exists
3. It should be nullable (TEXT type)

### 4.2 Verify Storage Bucket

Go to **Storage**:

- ✅ `student-photos` bucket exists
- ✅ Bucket is public
- ✅ Upload is allowed for authenticated users

---

## Step 5: Update Your Application Code

### 5.1 Files Already Updated

The following files have been created/updated in your project:

✅ `pwa-dashboard/lib/supabase.ts`

- Added `photo_url: string | null` to Student interface

✅ `pwa-dashboard/components/PhotoUpload.tsx`

- Photo upload component with preview
- Handles file validation (max 5MB, images only)
- Auto-deletes old photos
- Updates Supabase with new URL

✅ `pwa-dashboard/components/UpdateStudentDialog.tsx`

- Edit dialog with photo upload
- Updates student info and photo

✅ `pwa-dashboard/app/students/page.tsx`

- Enhanced student cards with photo display
- Edit button to open update dialog
- Delete button on photo overlay

✅ `pwa-dashboard/app/api/students/route.ts`

- PUT endpoint to update student records
- Handles photo URL in database

### 5.2 No Additional Setup Needed

All code changes are complete! The frontend and API are ready to use.

---

## Step 6: How to Use the Photo Feature

### Upload a Student Photo

1. Go to **Students** page
2. Hover over any student card
3. Click the **Edit** button (pencil icon)
4. In the dialog, click **Upload Photo**
5. Select an image file (JPG, PNG, WebP - max 5MB)
6. Preview shows before saving
7. Click **Save** to confirm

### Features

- ✅ **Auto-delete old photo** - Old photo is deleted when new one uploaded
- ✅ **Real-time preview** - See photo before saving
- ✅ **Remove photo** - Click X on preview to delete photo
- ✅ **Error handling** - Shows clear error messages if upload fails
- ✅ **File validation** - Checks file size and type

### Edit Student Info

1. In the **Edit Student** dialog
2. Change name, email, phone, class, section
3. Upload/update photo
4. Click **Save** - All changes saved together

---

## Step 7: Troubleshooting

### ❌ "Failed to upload photo"

**Cause**: Bucket not public or RLS policies wrong
**Fix**:

1. Go to Storage → student-photos
2. Check bucket is **not private**
3. Go to **Policies** and ensure upload policy exists
4. Try again

### ❌ "Failed to get public URL"

**Cause**: Bucket exists but not configured properly
**Fix**:

1. Delete the bucket (click ⋮ → Delete bucket)
2. Create new bucket with name `student-photos`
3. Make sure to **uncheck** "Private bucket"
4. Make it public via Policies

### ❌ Photo URL appears broken

**Cause**: Storage bucket access issue
**Fix**:

1. Go to Storage → student-photos
2. Click any file
3. Check the download/view URL format
4. Should look like: `https://...supabase.co/storage/v1/object/public/student-photos/...`

### ❌ API returns 405 error

**Cause**: API endpoint path issue
**Fix**:

1. Verify file path: `/pwa-dashboard/app/api/students/route.ts`
2. Check route is exporting PUT method
3. Restart dev server: `npm run dev`

---

## Step 8: Optional Enhancements

### Crop Photos

To crop photos before upload, add in PhotoUpload component:

```typescript
// After ImageManipulator import
const croppedImage = await ImageManipulator.manipulateAsync(file.uri, [
  { crop: { originX: 0, originY: 0, width: 500, height: 500 } },
]);
```

### Photo Size Limits

Maximum upload size is 5MB. To change:
In `PhotoUpload.tsx` line ~45:

```typescript
if (file.size > 10 * 1024 * 1024) { // Change to 10MB
```

### Automatic Photo Compression

To compress photos before upload, add:

```typescript
const compressed = await ImageManipulator.manipulateAsync(
  file,
  [{ resize: { width: 512, height: 512 } }],
  { compress: 0.7 },
);
```

---

## Step 9: Database Schema Summary

### Students Table

```sql
students (
  id UUID PRIMARY KEY,
  roll_number TEXT NOT NULL,
  name TEXT NOT NULL,
  class TEXT,
  section TEXT,
  email TEXT,
  phone TEXT,
  photo_url TEXT,          -- NEW: URL to student photo
  is_active BOOLEAN,
  created_at TIMESTAMP,
  updated_at TIMESTAMP
)
```

### Storage

```
Bucket: student-photos
  - Public read access ✅
  - Authenticated upload ✅
  - Authenticated delete ✅
  - Files: student-photos/{studentId}-{timestamp}.{ext}
```

---

## Step 10: Security Notes

### Photo Privacy

- ✅ Photos are public (for display in cards)
- ✅ Only authenticated users can upload/delete
- ✅ Old photos auto-deleted from storage
- ✅ File size limited (prevents abuse)

### Best Practices

1. ✅ Enable RLS on all tables (already enabled)
2. ✅ Restrict storage access to authenticated users
3. ✅ Validate file types and sizes on client AND server
4. ✅ Use HTTPS for all uploads
5. ✅ Regular backups (Supabase auto-backups)

---

## Complete Setup Checklist

- [ ] Ran SQL migration (add_student_photos.sql)
- [ ] Created `student-photos` bucket
- [ ] Made bucket public (unchecked private)
- [ ] Added upload policy to bucket
- [ ] Added delete policy to bucket
- [ ] Verified photo_url column in students table
- [ ] Tested photo upload in UI
- [ ] Verified photo displays on student card
- [ ] Verified edit dialog works
- [ ] Tested delete functionality

✅ **After completing all steps, your photo upload system is ready!**

---

## Support

If you encounter issues:

1. Check **Step 7: Troubleshooting** above
2. Verify all SQL migrations ran successfully
3. Confirm Storage bucket exists and is public
4. Check browser console for errors (F12)
5. Review Supabase logs for API errors

For more info:

- [Supabase Storage Docs](https://supabase.com/docs/guides/storage)
- [Supabase RLS Docs](https://supabase.com/docs/guides/auth/row-level-security)
