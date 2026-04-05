-- Create or replace the update_timestamp_column function
CREATE OR REPLACE FUNCTION update_timestamp_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

---

-- Create sessions table for trips
-- Allows multiple sessions within a single trip
-- Example: Trip "Field Day 2026" has Session "Morning Session" and "Afternoon Session"

CREATE TABLE IF NOT EXISTS trip_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    trip_id UUID NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    session_date DATE NOT NULL,
    start_time TIME,
    end_time TIME,
    expected_participants INT DEFAULT 0,
    status TEXT DEFAULT 'planning' CHECK (status IN ('planning', 'active', 'completed', 'cancelled')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(trip_id, name),
    CONSTRAINT valid_times CHECK (start_time IS NULL OR end_time IS NULL OR start_time < end_time)
);

-- Index for faster queries
CREATE INDEX IF NOT EXISTS idx_trip_sessions_trip_id ON trip_sessions(trip_id);
CREATE INDEX IF NOT EXISTS idx_trip_sessions_date ON trip_sessions(session_date);
CREATE INDEX IF NOT EXISTS idx_trip_sessions_status ON trip_sessions(status);

-- Update timestamp trigger
CREATE OR REPLACE TRIGGER update_trip_sessions_timestamp
BEFORE UPDATE ON trip_sessions
FOR EACH ROW
EXECUTE FUNCTION update_timestamp_column();

---

-- Create session attendance table
-- Tracks attendance per student per session
-- Separate from trip_participants which tracks overall trip participation

CREATE TABLE IF NOT EXISTS session_attendance (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID NOT NULL REFERENCES trip_sessions(id) ON DELETE CASCADE,
    trip_id UUID NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
    student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    roll_number TEXT NOT NULL,
    name TEXT NOT NULL,
    expected BOOLEAN DEFAULT true,
    checked_in BOOLEAN DEFAULT false,
    check_in_time TIMESTAMPTZ,
    check_in_method TEXT CHECK (check_in_method IN ('face', 'manual', 'bulk', NULL)),
    checked_in_by TEXT,
    confidence FLOAT,
    photo_url TEXT,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(session_id, student_id),
    CONSTRAINT valid_checkin CHECK (checked_in = FALSE OR check_in_time IS NOT NULL)
);

-- Indexes for session attendance
CREATE INDEX IF NOT EXISTS idx_session_attendance_session_id ON session_attendance(session_id);
CREATE INDEX IF NOT EXISTS idx_session_attendance_student_id ON session_attendance(student_id);
CREATE INDEX IF NOT EXISTS idx_session_attendance_trip_id ON session_attendance(trip_id);
CREATE INDEX IF NOT EXISTS idx_session_attendance_checked_in ON session_attendance(session_id, checked_in);
CREATE INDEX IF NOT EXISTS idx_session_attendance_timestamp ON session_attendance(check_in_time DESC);

-- Update timestamp trigger
CREATE OR REPLACE TRIGGER update_session_attendance_timestamp
BEFORE UPDATE ON session_attendance
FOR EACH ROW
EXECUTE FUNCTION update_timestamp_column();

---

-- Drop views in correct order (dependent views first)
DROP VIEW IF EXISTS student_session_history;
DROP VIEW IF EXISTS session_stats;

-- Create view for session statistics
-- Shows attendance summary per session

CREATE VIEW session_stats AS
SELECT
    s.id,
    s.trip_id,
    s.name,
    s.description,
    s.session_date,
    s.start_time,
    s.end_time,
    s.status,
    s.expected_participants,
    s.created_at,
    s.updated_at,
    COALESCE(COUNT(DISTINCT sa.student_id), 0) AS total,
    COALESCE(COUNT(DISTINCT CASE WHEN sa.checked_in THEN sa.student_id END), 0) AS checked_in,
    COALESCE(COUNT(DISTINCT CASE WHEN NOT sa.checked_in THEN sa.student_id END), 0) AS missing,
    ROUND(
        COALESCE(100.0 * COUNT(DISTINCT CASE WHEN sa.checked_in THEN sa.student_id END) /
        NULLIF(COUNT(DISTINCT sa.student_id), 0), 0),
        2
    ) AS percentage
FROM trip_sessions s
LEFT JOIN session_attendance sa ON s.id = sa.session_id
GROUP BY s.id, s.trip_id, s.name, s.description, s.session_date, s.start_time, s.end_time, s.status, s.expected_participants, s.created_at, s.updated_at;

---

-- Create view for per-student session history
-- Useful for analytics and reports

CREATE VIEW student_session_history AS
SELECT
    sa.student_id,
    st.roll_number,
    st.name,
    s.trip_id,
    t.name AS trip_name,
    s.id AS session_id,
    s.name AS session_name,
    s.session_date,
    sa.checked_in,
    sa.check_in_time,
    sa.check_in_method,
    sa.confidence
FROM session_attendance sa
JOIN trip_sessions s ON sa.session_id = s.id
JOIN trips t ON s.trip_id = t.id
JOIN students st ON sa.student_id = st.id
ORDER BY s.session_date DESC, sa.check_in_time DESC;

---

-- Grant permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON trip_sessions TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON session_attendance TO authenticated;
GRANT SELECT ON session_stats TO authenticated;
GRANT SELECT ON student_session_history TO authenticated;

-- Enable RLS (Row Level Security) if needed
ALTER TABLE trip_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE session_attendance ENABLE ROW LEVEL SECURITY;

-- Simple RLS policies for authenticated users
CREATE POLICY "Enable all for authenticated users" ON trip_sessions
FOR ALL
USING (true)
WITH CHECK (true);

CREATE POLICY "Enable all for authenticated users" ON session_attendance
FOR ALL
USING (true)
WITH CHECK (true);
