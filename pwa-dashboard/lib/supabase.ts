import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseKey);

export interface Student {
  id: string;
  roll_number: string;
  name: string;
  class: string | null;
  section: string | null;
  email: string | null;
  phone: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Attendance {
  id: string;
  student_id: string;
  roll_number: string;
  name: string;
  timestamp: string;
  date: string;
  time: string;
  confidence: number;
  status: 'present' | 'absent' | 'late';
  photo_url: string | null;
  created_at: string;
}

export interface AttendanceSummary {
  student_id: string;
  roll_number: string;
  name: string;
  class: string | null;
  section: string | null;
  total_present: number;
  attendance_rate: number;
}

export interface Trip {
  id: string;
  name: string;
  description: string | null;
  trip_date: string;
  departure_time: string | null;
  status: 'planning' | 'active' | 'completed' | 'cancelled';
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface TripParticipant {
  id: string;
  trip_id: string;
  student_id: string;
  roll_number: string;
  name: string;
  expected: boolean;
  checked_in: boolean;
  check_in_time: string | null;
  check_in_method: 'face' | 'manual' | 'bulk' | null;
  checked_in_by: string | null;
  confidence: number | null;
  photo_url: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface TripStats {
  total: number;
  checked_in: number;
  missing: number;
  percentage: number;
}

export interface TripWithStats extends Trip {
  stats?: TripStats;
}
