@echo off
REM Create migrations directory and migration file
if not exist "migrations" mkdir migrations

REM Create the SQL migration file
(
echo -- Migration: Create trips and trip_participants tables
echo -- Description: Add trip session management for efficient group attendance tracking
echo.
echo -- Trips table: Stores trip/event information
echo CREATE TABLE IF NOT EXISTS trips ^(
echo   id UUID PRIMARY KEY DEFAULT gen_random_uuid^(^),
echo   name TEXT NOT NULL,
echo   description TEXT,
echo   trip_date DATE NOT NULL,
echo   departure_time TIME,
echo   status TEXT DEFAULT 'planning' CHECK ^(status IN ^('planning', 'active', 'completed', 'cancelled'^)^),
echo   created_by TEXT,
echo   created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW^(^),
echo   updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW^(^)
echo ^);
) > "migrations\001_create_trips_tables_part1.sql"

echo Migration files directory created successfully!
echo.
echo ⚠️  NEXT STEPS:
echo 1. Open Supabase Dashboard: https://supabase.com/dashboard
echo 2. Go to SQL Editor
echo 3. Run the migration SQL manually
echo.
echo OR run: python run_migration.py
pause
