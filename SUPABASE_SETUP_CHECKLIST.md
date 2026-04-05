# Supabase Setup Checklist - Student Photos Feature

## Pre-Setup Verification

- [ ] Have Supabase project open: https://supabase.com/dashboard
- [ ] Have `backend/add_student_photos.sql` file available
- [ ] Have backend/frontend code deployed (all files created)
- [ ] Have test image file ready (JPG or PNG)

---

## Step 1: Add Photo Column to Database ⚙️

**Time: 1-2 minutes**

- [ ] Click "SQL Editor" in left sidebar
- [ ] Click "New Query" or "+ New"
- [ ] Copy entire content of `backend/add_student_photos.sql` file:
  ```sql
  ALTER TABLE students ADD COLUMN IF NOT EXISTS photo_url TEXT;
  CREATE INDEX IF NOT EXISTS idx_students_photo_url ON students(photo_url);
  COMMENT ON COLUMN students.photo_url IS 'URL to student photo in storage';
  ```
- [ ] Paste into SQL editor
- [ ] Click **"Run"** button (blue play icon)
- [ ] See success message: "Query returned 0 rows" ✅
- [ ] Verify in Table Editor: students table now has `photo_url` column

**Status: COMPLETE ✅**

---

## Step 2: Create Storage Bucket 📁

**Time: 1-2 minutes**

- [ ] Click "Storage" in left sidebar
- [ ] Click **"New Bucket"** button (top right)
- [ ] In dialog:
  - [ ] Name: `student-photos` (exact name required)
  - [ ] Uncheck ☐ "Private bucket" (should be UNCHECKED = PUBLIC)
  - [ ] Click **"Create Bucket"** button
- [ ] New bucket appears in list: `student-photos`

**Status: COMPLETE ✅**

---

## Step 3: Set Up Security Policies (RLS) 🔒

**Time: 2-3 minutes**

### 3a: Allow Public Read (GET)

- [ ] Click **`student-photos`** bucket name
- [ ] Click **"Policies"** tab
- [ ] Click **"New Policy"** button
- [ ] Click **"Get policy template"** → Select **"Allow public read-only access"**
- [ ] Click **"Review"** → Click **"Save policy"**
- [ ] You should see policy: "Allow read access to bucket student-photos"

### 3b: Allow Authenticated Upload (POST)

- [ ] Still in Policies tab, click **"New Policy"** again
- [ ] Select **"Create a policy from scratch"** or **"For authenticated users"**
- [ ] Name: `Allow authenticated users to upload`
- [ ] Target roles: `authenticated`
- [ ] Operation: `INSERT`
- [ ] Custom expression (in USING field): `true`
- [ ] Click **"Review"** → **"Save policy"**

### 3c: Allow Authenticated Delete (DELETE)

- [ ] Click **"New Policy"** again
- [ ] Name: `Allow authenticated users to delete`
- [ ] Target roles: `authenticated`
- [ ] Operation: `DELETE`
- [ ] Custom expression (in USING field): `true`
- [ ] Click **"Review"** → **"Save policy"**

**Expected: 3 policies visible (Read, Insert, Delete)**

**Status: COMPLETE ✅**

---

## Step 4: Verify Database Connection 🔗

**Time: 1 minute**

In your frontend `.env.local` file, verify these exist:

```
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

- [ ] Both variables present
- [ ] Keys match Supabase project (Settings → API)

**Status: COMPLETE ✅**

---

## Step 5: Test Feature 🧪

**Time: 2-3 minutes**

### In Your App:

1. [ ] Go to Students page
2. [ ] Click **"Add Student"** button
3. [ ] Fill form with:
   - Name: `Test Student`
   - Roll Number: `TEST001`
   - Class: `1`
   - Section: `A`
   - Click **"Add Student"**
4. [ ] Find new student in list
5. [ ] Hover over card → Click **Edit** (pencil icon)
6. [ ] In dialog, click **"Upload Photo"** area
7. [ ] Select test image file (JPG/PNG, under 5MB)
8. [ ] Wait for preview to appear (green thumbnail)
9. [ ] Click **"Save"** button
10. [ ] Dialog closes and student card updates
11. [ ] ✅ Photo now appears in student card!

### Verify Success:

- [ ] Photo displays in student card immediately
- [ ] Photo is clickable (opens preview)
- [ ] No console errors (F12 → Console tab)
- [ ] Photo persists after page refresh
- [ ] Can hover → Edit again and see photo

**Status: COMPLETE ✅**

---

## Step 6: Cleanup & Final Verification 🎉

**Time: 1 minute**

- [ ] (Optional) Delete test student and photo if desired
  - Hover → Click delete button
  - Verify photo removed from storage
- [ ] Try uploading different photo formats (JPG, PNG)
- [ ] Try uploading large file (should error "too big")
- [ ] Add photos for real students
- [ ] Take screenshot of students page with photos for documentation

**Status: COMPLETE ✅**

---

## All Done! 🎊

**All steps completed: [ /6 ] **

You now have:
✅ Photo column in database  
✅ Storage bucket for files  
✅ Security policies configured  
✅ Frontend components ready  
✅ Feature tested and working

**Next:** Start uploading student photos!

---

## Quick Reference

### Supabase Locations

- SQL Editor: Left sidebar → "SQL Editor"
- Storage: Left sidebar → "Storage"
- Database: Left sidebar → "Table Editor"
- Settings: Left sidebar → "Settings" → "API"

### File Locations (Your Project)

- SQL migration: `backend/add_student_photos.sql`
- Photo upload component: `components/PhotoUpload.tsx`
- Student page: `app/students/page.tsx`
- Setup guide: `STUDENT_PHOTOS_SETUP_GUIDE.md`
- Quick start: `STUDENT_PHOTOS_QUICK_START.md`

### Common Issues

**Issue: "bucket not found" error**

- Solution: Verify bucket name is exactly `student-photos` (lowercase, lowercase s)
- Check: Storage → Buckets list shows `student-photos`

**Issue: Can't upload file**

- Solution: Check RLS policies exist
- Check: Policies tab shows 3 policies listed
- Solution: Make sure bucket is NOT private

**Issue: File uploads but photo doesn't show**

- Solution: Check database photo_url column exists
- Check: SQL Editor → Run the add_student_photos.sql query again
- Solution: Refresh page (Ctrl+R)

**Issue: Photo disappears after refresh**

- Solution: Check Supabase Session/Auth is working
- Check: Other student data loads correctly
- Solution: Check browser console for errors (F12)

---

## Support

If stuck:

1. Check troubleshooting above
2. See detailed guide: `STUDENT_PHOTOS_SETUP_GUIDE.md`
3. Check Supabase docs: https://supabase.com/docs/guides/storage
