-- =====================================================
-- Supabase Setup SQL for Face Recognition System
-- Run this in Supabase SQL Editor
-- =====================================================

-- Step 1: Create Students Table
-- =====================================================
CREATE TABLE students (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    roll_number TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    class TEXT,
    section TEXT,
    email TEXT,
    phone TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for fast queries
CREATE INDEX idx_students_roll ON students(roll_number);
CREATE INDEX idx_students_name ON students(name);
CREATE INDEX idx_students_class ON students(class, section);

-- Enable Row Level Security (optional for now)
ALTER TABLE students ENABLE ROW LEVEL SECURITY;

-- Policy: Public read (for dashboard)
CREATE POLICY "Students readable by all" 
ON students FOR SELECT 
USING (true);

-- Policy: Allow ANON users to insert/update (for API access)
-- IMPORTANT: This allows your FastAPI backend (using anon key) to write data
CREATE POLICY "Students writable by anon" 
ON students FOR ALL 
USING (true)  -- Allow all users (including anon key)


-- Step 2: Create Attendance Table
-- =====================================================
CREATE TABLE attendance (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    student_id UUID REFERENCES students(id) ON DELETE CASCADE,
    roll_number TEXT, -- Denormalized for fast queries
    name TEXT, -- Denormalized for fast queries
    timestamp TIMESTAMPTZ DEFAULT NOW(),
    date DATE DEFAULT CURRENT_DATE,
    time TIME DEFAULT CURRENT_TIME,
    confidence REAL, -- Face recognition confidence (0.0 - 1.0)
    status TEXT CHECK (status IN ('present', 'absent', 'late')) DEFAULT 'present',
    photo_url TEXT, -- Optional: link to captured photo
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for dashboard queries
CREATE INDEX idx_attendance_student ON attendance(student_id);
CREATE INDEX idx_attendance_roll ON attendance(roll_number);
CREATE INDEX idx_attendance_date ON attendance(date);
CREATE INDEX idx_attendance_timestamp ON attendance(timestamp DESC);
CREATE INDEX idx_attendance_date_student ON attendance(date, student_id);

-- Enable RLS
ALTER TABLE attendance ENABLE ROW LEVEL SECURITY;

-- Public read for dashboard
CREATE POLICY "Attendance readable by all" 
ON attendance FOR SELECT 
USING (true);

-- Allow ANON users to write (for API access)
CREATE POLICY "Attendance writable by anon" 
ON attendance FOR INSERT 
WITH CHECK (true);  -- Allow all users (including anon key)


-- Step 3: Create Useful Views (Optional but Recommended)
-- =====================================================

-- View: Today's attendance with student details
CREATE VIEW todays_attendance AS
SELECT 
    a.id,
    a.student_id,
    a.roll_number,
    a.name,
    a.timestamp,
    a.time,
    a.confidence,
    a.status,
    s.class,
    s.section
FROM attendance a
LEFT JOIN students s ON a.student_id = s.id
WHERE a.date = CURRENT_DATE
ORDER BY a.timestamp DESC;

-- View: Attendance summary by student
CREATE VIEW attendance_summary AS
SELECT 
    s.id AS student_id,
    s.roll_number,
    s.name,
    s.class,
    s.section,
    COUNT(a.id) AS total_present,
    COUNT(a.id) * 100.0 / NULLIF(
        (SELECT COUNT(DISTINCT date) FROM attendance), 0
    ) AS attendance_rate
FROM students s
LEFT JOIN attendance a ON s.id = a.student_id
GROUP BY s.id, s.roll_number, s.name, s.class, s.section
ORDER BY s.name;


-- Step 4: Insert Sample Students (CHANGE THESE!)
-- =====================================================
-- Replace with your actual student names from embeddings.pkl

INSERT INTO students (roll_number, name, class, section) VALUES
('001', 'Student1Name', 'Class A', 'Section 1'),
('002', 'Student2Name', 'Class A', 'Section 1'),
('003', 'Student3Name', 'Class B', 'Section 1'),
('004', 'Student4Name', 'Class B', 'Section 2'),
('005', 'Student5Name', 'Class A', 'Section 2'),
('006', 'Student6Name', 'Class B', 'Section 2');

-- ⚠️ IMPORTANT: Update the names above to match your embeddings.pkl!
-- Your embeddings have 6 people enrolled.


-- Step 5: Verify Setup
-- =====================================================

-- Check students table
SELECT * FROM students ORDER BY roll_number;

-- Check attendance table (should be empty)
SELECT * FROM attendance;

-- Check views
SELECT * FROM todays_attendance;
SELECT * FROM attendance_summary;


-- =====================================================
-- Setup Complete! ✅
-- =====================================================
-- Next steps:
-- 1. Copy your Supabase URL and API key
-- 2. Update FastAPI code to connect to Supabase
-- 3. Test marking attendance
-- =====================================================
