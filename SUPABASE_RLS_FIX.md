# FIX: Supabase Storage RLS Policies Blocking Photo Uploads

## Problem

Photo uploads are failing with error: **"new row violates row-level security policy"**

This means Supabase Storage has RLS (Row-Level Security) enabled but the policy doesn't allow uploads.

## Solution: Add RLS Policy via Supabase Console

### Step 1: Go to Supabase Console

Open: https://app.supabase.com/project/ykrbllmjrevriecowlnr/storage/buckets

### Step 2: Go to SQL Editor

- Click **"SQL Editor"** in left sidebar
- Click **"New Query"**

### Step 3: Run This SQL

Copy and paste this SQL and click **"Run"**:

```sql
-- Fix Supabase RLS policies for student-photos bucket

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "student-photos upload" ON storage.objects;
DROP POLICY IF EXISTS "student-photos read" ON storage.objects;
DROP POLICY IF EXISTS "student-photos update" ON storage.objects;
DROP POLICY IF EXISTS "student-photos delete" ON storage.objects;

-- Create new policies that allow uploads
CREATE POLICY "student-photos upload"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'student-photos');

CREATE POLICY "student-photos read"
ON storage.objects FOR SELECT
USING (bucket_id = 'student-photos');

CREATE POLICY "student-photos update"
ON storage.objects FOR UPDATE
WITH CHECK (bucket_id = 'student-photos');

CREATE POLICY "student-photos delete"
ON storage.objects FOR DELETE
USING (bucket_id = 'student-photos');
```

### Step 4: Verify It Worked

Run this test script:

```bash
python test_direct_upload.py
```

You should see:

```
1️⃣  Testing upload to root path...
   ✅ Root upload SUCCESS
```

## Why This Happens

- Supabase creates RLS policies by default for security
- But the default policy was too restrictive and blocked all uploads
- We need to allow uploads to the specific bucket

## Alternative: If SQL Doesn't Work

Go to the Storage section in Supabase console:

1. Click **"student-photos"** bucket
2. Click **"Policies"** tab
3. You should see the policies we just created
4. If they're missing, you may need to add them via the UI

## After Fixing

1. Photos will upload to Supabase Storage ✅
2. photo_url will be saved in students table ✅
3. Trip camera recognition will work ✅
