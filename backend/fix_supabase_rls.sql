-- Fix Supabase Storage RLS Policies
-- The student-photos bucket has RLS enabled but the policy blocks writes
-- This script fixes it to allow authenticated users to upload photos

-- Step 1: Check current policies
-- SELECT * FROM pg_policies WHERE schemaname='storage';

-- Step 2: Fix the storage.objects RLS for student-photos  
-- Drop existing restrictive policy if it exists
DROP POLICY IF EXISTS "student-photos upload" ON storage.objects;

-- Create a new permissive policy for uploads
CREATE POLICY "student-photos upload"
ON storage.objects FOR INSERT
WITH CHECK (
    bucket_id = 'student-photos'
    AND (auth.role() = 'authenticated' OR auth.role() = 'anon')
);

-- Create policy for reads (should already exist)
CREATE POLICY IF NOT EXISTS "student-photos read"
ON storage.objects FOR SELECT
USING (bucket_id = 'student-photos');

-- Create policy for updates (in case we need to replace files)
CREATE POLICY IF NOT EXISTS "student-photos update"
ON storage.objects FOR UPDATE
WITH CHECK (bucket_id = 'student-photos');

-- Step 3: Disable row level security temporarily (for development)
-- This allows anyone to upload to the bucket
-- WARNING: Only do this for development/testing!

-- First, check if we need to disable RLS
-- ALTER TABLE storage.objects DISABLE ROW LEVEL SECURITY;

-- Or better: Create a more permissive policy
-- For development, allow all operations
DROP POLICY IF EXISTS "Enable all operations for student-photos" ON storage.objects;

CREATE POLICY "Enable all operations for student-photos"
ON storage.objects
FOR ALL
USING (bucket_id = 'student-photos');

-- Verify policies are in place
-- SELECT * FROM pg_policies WHERE schemaname='storage' AND tablename='objects';
