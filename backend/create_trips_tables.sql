-- Migration: Create trips and trip_participants tables
-- Description: Add trip session management for efficient group attendance tracking
-- 
-- INSTRUCTIONS:
-- 1. Open Supabase Dashboard: https://supabase.com/dashboard
-- 2. Go to SQL Editor
-- 3. Copy and paste this entire file
-- 4. Click "Run" to execute

-- Trips table: Stores trip/event information
CREATE TABLE IF NOT EXISTS trips (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  trip_date DATE NOT NULL,
  departure_time TIME,
  status TEXT DEFAULT 'planning' CHECK (status IN ('planning', 'active', 'completed', 'cancelled')),
  created_by TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Trip Participants table: Links students to specific trips
CREATE TABLE IF NOT EXISTS trip_participants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id UUID NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  roll_number TEXT NOT NULL,
  name TEXT,
  expected BOOLEAN DEFAULT TRUE,
  checked_in BOOLEAN DEFAULT FALSE,
  check_in_time TIMESTAMP WITH TIME ZONE,
  check_in_method TEXT CHECK (check_in_method IN ('face', 'manual', 'bulk')),
  checked_in_by TEXT,
  confidence FLOAT,
  photo_url TEXT,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(trip_id, student_id)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_trip_participants_trip ON trip_participants(trip_id);
CREATE INDEX IF NOT EXISTS idx_trip_participants_student ON trip_participants(student_id);
CREATE INDEX IF NOT EXISTS idx_trip_participants_checked_in ON trip_participants(trip_id, checked_in);
CREATE INDEX IF NOT EXISTS idx_trips_date ON trips(trip_date);
CREATE INDEX IF NOT EXISTS idx_trips_status ON trips(status);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers to auto-update updated_at
DROP TRIGGER IF EXISTS update_trips_updated_at ON trips;
CREATE TRIGGER update_trips_updated_at
    BEFORE UPDATE ON trips
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_trip_participants_updated_at ON trip_participants;
CREATE TRIGGER update_trip_participants_updated_at
    BEFORE UPDATE ON trip_participants
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Row Level Security (RLS) Policies
ALTER TABLE trips ENABLE ROW LEVEL SECURITY;
ALTER TABLE trip_participants ENABLE ROW LEVEL SECURITY;

-- Allow all operations for now (adjust based on your auth setup)
DROP POLICY IF EXISTS "Allow all operations on trips" ON trips;
CREATE POLICY "Allow all operations on trips" ON trips
  FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow all operations on trip_participants" ON trip_participants;
CREATE POLICY "Allow all operations on trip_participants" ON trip_participants
  FOR ALL USING (true) WITH CHECK (true);

-- Comments for documentation
COMMENT ON TABLE trips IS 'Stores trip/event sessions for group attendance tracking';
COMMENT ON TABLE trip_participants IS 'Links students to specific trips with check-in status';
COMMENT ON COLUMN trip_participants.check_in_method IS 'Method used: face (recognition), manual (override), bulk (mass check-in)';
COMMENT ON COLUMN trip_participants.confidence IS 'Face recognition confidence score (0-100) when check_in_method is face';


-- Step 6: Create Trip Confirmation Tables
-- =====================================================
CREATE TABLE IF NOT EXISTS trip_confirmations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    trip_id UUID NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    status TEXT DEFAULT 'open' CHECK (status IN ('open', 'closed')),
    created_by TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS trip_confirmation_checkins (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    trip_id UUID NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
    confirmation_id UUID NOT NULL REFERENCES trip_confirmations(id) ON DELETE CASCADE,
    participant_id UUID NOT NULL REFERENCES trip_participants(id) ON DELETE CASCADE,
    roll_number TEXT NOT NULL,
    name TEXT NOT NULL,
    check_in_time TIMESTAMPTZ DEFAULT NOW(),
    check_in_method TEXT CHECK (check_in_method IN ('face', 'manual', 'bulk')),
    checked_in_by TEXT,
    confidence FLOAT,
    photo_url TEXT,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(confirmation_id, participant_id)
);

CREATE INDEX IF NOT EXISTS idx_trip_confirmations_trip ON trip_confirmations(trip_id);
CREATE INDEX IF NOT EXISTS idx_trip_confirmations_status ON trip_confirmations(trip_id, status);
CREATE INDEX IF NOT EXISTS idx_trip_checkins_trip ON trip_confirmation_checkins(trip_id);
CREATE INDEX IF NOT EXISTS idx_trip_checkins_confirmation ON trip_confirmation_checkins(confirmation_id);
CREATE INDEX IF NOT EXISTS idx_trip_checkins_participant ON trip_confirmation_checkins(participant_id);
CREATE INDEX IF NOT EXISTS idx_trip_checkins_trip_confirmation ON trip_confirmation_checkins(trip_id, confirmation_id);

DROP TRIGGER IF EXISTS update_trip_confirmations_updated_at ON trip_confirmations;
CREATE TRIGGER update_trip_confirmations_updated_at
    BEFORE UPDATE ON trip_confirmations
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_trip_confirmation_checkins_updated_at ON trip_confirmation_checkins;
CREATE TRIGGER update_trip_confirmation_checkins_updated_at
    BEFORE UPDATE ON trip_confirmation_checkins
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

ALTER TABLE trip_confirmations ENABLE ROW LEVEL SECURITY;
ALTER TABLE trip_confirmation_checkins ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow all operations on trip_confirmations" ON trip_confirmations;
CREATE POLICY "Allow all operations on trip_confirmations" ON trip_confirmations
  FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow all operations on trip_confirmation_checkins" ON trip_confirmation_checkins;
CREATE POLICY "Allow all operations on trip_confirmation_checkins" ON trip_confirmation_checkins
  FOR ALL USING (true) WITH CHECK (true);

COMMENT ON TABLE trip_confirmations IS 'Stores separate confirmation occasions for a trip';
COMMENT ON TABLE trip_confirmation_checkins IS 'Stores present check-ins for each confirmation occasion';
