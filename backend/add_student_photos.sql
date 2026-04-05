-- Migration: Add Student Photo Support
-- Description: Add photo_url column to students table for profile pictures
-- 
-- INSTRUCTIONS:
-- 1. Open Supabase Dashboard: https://supabase.com/dashboard
-- 2. Go to SQL Editor
-- 3. Copy and paste this entire file
-- 4. Click "Run" to execute

-- Add photo_url column to students table
ALTER TABLE students ADD COLUMN IF NOT EXISTS photo_url TEXT;

-- Add comment for documentation
COMMENT ON COLUMN students.photo_url IS 'URL to student profile photo stored in Supabase Storage (student-photos bucket)';

-- Index for faster queries filtering by photo_url
CREATE INDEX IF NOT EXISTS idx_students_photo_url ON students(photo_url);
