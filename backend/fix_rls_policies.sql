-- =====================================================
-- FIX: Drop and Recreate RLS Policies
-- Run this if you already created tables with wrong policies
-- =====================================================

-- Drop old restrictive policies
DROP POLICY IF EXISTS "Students writable by authenticated" ON students;
DROP POLICY IF EXISTS "Attendance writable by authenticated" ON attendance;

-- Create new permissive policies for anon key access
CREATE POLICY "Students writable by anon" 
ON students FOR ALL 
USING (true);  -- Allow all users including anon key

CREATE POLICY "Attendance writable by anon" 
ON attendance FOR INSERT 
WITH CHECK (true);  -- Allow all users including anon key

-- Verify policies
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual
FROM pg_policies
WHERE tablename IN ('students', 'attendance')
ORDER BY tablename, policyname;
