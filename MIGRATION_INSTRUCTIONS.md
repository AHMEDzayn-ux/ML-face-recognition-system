# Trip Attendance Feature - Setup Instructions

## ✅ Completed So Far

### Backend

- ✅ Database schema created (`create_trips_tables.sql`)
- ✅ API endpoints implemented in `backend/main.py`:
  - POST `/api/trips` - Create trip
  - GET `/api/trips` - List all trips
  - GET `/api/trips/{id}` - Get trip details
  - POST `/api/trips/{id}/upload-csv` - Import participants from CSV
  - GET `/api/trips/{id}/participants` - Get participants with stats
  - POST `/api/trips/{id}/checkin` - Face recognition check-in (optimized for trip)
  - POST `/api/trips/{id}/mark-manual` - Manual check-in
  - PATCH `/api/trips/{id}/status` - Update trip status

## 🔧 NEXT STEPS - RUN MIGRATION

### Step 1: Apply Database Migration

**Option A: Via Supabase Dashboard (Recommended)**

1. Open https://supabase.com/dashboard
2. Select your project
3. Click "SQL Editor" in left sidebar
4. Click "New Query"
5. Open file: `F:\My projects\attendance-system\backend\create_trips_tables.sql`
6. Copy entire content and paste into SQL Editor
7. Click "Run" (or press Ctrl+Enter)
8. You should see: "Success. No rows returned"

**Option B: Via Supabase CLI** (if installed)

```bash
cd "F:\My projects\attendance-system\backend"
supabase db push
```

### Step 2: Verify Tables Created

Run this query in Supabase SQL Editor:

```sql
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
AND table_name IN ('trips', 'trip_participants');
```

You should see both tables listed.

### Step 3: Test Backend API

After migration, restart your backend:

```bash
cd "F:\My projects\attendance-system\backend"
start_api.bat
```

Then test in browser or Postman:

- http://localhost:8000/docs (Swagger UI - see all new endpoints)
- http://localhost:8000/api/trips (should return empty array)

## 📋 What's Next

After migration is complete, I will:

1. Add TypeScript types for trips in frontend
2. Create trips API client
3. Build trips UI pages (list, create, dashboard, camera)
4. Add real-time updates
5. Test end-to-end workflow

## 🚨 Important Notes

- **Backup**: Supabase automatically backs up your database
- **RLS Policies**: Current policies allow all operations (adjust later for production)
- **Cascade Delete**: Deleting a trip will auto-delete all participants
- **Indexes**: Added for performance on common queries

## 📊 Database Schema Overview

**trips table:**

- id, name, description, trip_date, departure_time
- status (planning/active/completed/cancelled)
- created_by, created_at, updated_at

**trip_participants table:**

- trip_id → links to trips
- student_id → links to students
- roll_number, name
- checked_in (boolean), check_in_time, check_in_method
- confidence, photo_url, notes
- Unique constraint: (trip_id, student_id) - no duplicates

Let me know when you've completed the migration and I'll continue with the frontend!
