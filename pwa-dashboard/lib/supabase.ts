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
