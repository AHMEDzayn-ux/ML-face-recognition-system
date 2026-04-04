# Add these new API endpoints to the end of main.py (before if __name__ == "__main__":)

# =============================================================================
# SUPABASE INTEGRATION - Dashboard API Endpoints
# =============================================================================

@app.get("/api/stats/today")
async def get_today_stats():
    """Get today's attendance summary statistics"""
    if not supabase_client:
        # Fallback to local JSON
        return get_stats_from_json()
    
    try:
        # Get total students count
        students_response = supabase_client.table('students').select('id', count='exact').execute()
        total_students = students_response.count
        
        # Get today's attendance count
        today = datetime.now().date().isoformat()
        attendance_response = supabase_client.table('attendance')\
            .select('id', count='exact')\
            .eq('date', today)\
            .execute()
        total_present = attendance_response.count
        
        # Calculate stats
        attendance_rate = (total_present / total_students * 100) if total_students > 0 else 0
        
        return {
            "total_students": total_students,
            "present": total_present,
            "absent": total_students - total_present,
            "attendance_rate": round(attendance_rate, 2),
            "date": today
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching stats: {str(e)}")


@app.get("/api/attendance/today")
async def get_today_attendance():
    """Get all attendance records for today"""
    if not supabase_client:
        return get_attendance_from_json()
    
    try:
        today_start = datetime.now().replace(hour=0, minute=0, second=0).isoformat()
        
        response = supabase_client.table('attendance')\
            .select('*')\
            .gte('timestamp', today_start)\
            .order('timestamp', desc=True)\
            .execute()
        
        return {
            "data": response.data,
            "count": len(response.data)
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching attendance: {str(e)}")


@app.get("/api/attendance/range")
async def get_attendance_range(start_date: str, end_date: str):
    """Get attendance records between dates (YYYY-MM-DD format)"""
    if not supabase_client:
        raise HTTPException(status_code=503, detail="Supabase not configured")
    
    try:
        response = supabase_client.table('attendance')\
            .select('*')\
            .gte('date', start_date)\
            .lte('date', end_date)\
            .order('timestamp', desc=True)\
            .execute()
        
        return {
            "data": response.data,
            "count": len(response.data),
            "start_date": start_date,
            "end_date": end_date
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching range: {str(e)}")


@app.get("/api/stats/weekly")
async def get_weekly_stats():
    """Get attendance trend for last 7 days"""
    if not supabase_client:
        raise HTTPException(status_code=503, detail="Supabase not configured")
    
    try:
        from datetime import timedelta
        
        today = datetime.now().date()
        week_ago = today - timedelta(days=7)
        
        response = supabase_client.table('attendance')\
            .select('date')\
            .gte('date', week_ago.isoformat())\
            .execute()
        
        # Count by date
        daily_counts = {}
        for record in response.data:
            date = record['date']
            daily_counts[date] = daily_counts.get(date, 0) + 1
        
        # Format for charts
        trend_data = [
            {"date": date, "count": count}
            for date, count in sorted(daily_counts.items())
        ]
        
        return {"data": trend_data}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching weekly stats: {str(e)}")


@app.get("/api/students")
async def get_students():
    """Get all students"""
    if not supabase_client:
        raise HTTPException(status_code=503, detail="Supabase not configured")
    
    try:
        response = supabase_client.table('students')\
            .select('*')\
            .eq('is_active', True)\
            .order('name')\
            .execute()
        
        return {
            "data": response.data,
            "count": len(response.data)
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching students: {str(e)}")


# Helper functions for fallback to local JSON
def get_stats_from_json():
    """Get stats from local attendance.json"""
    try:
        with open(ATTENDANCE_LOG, 'r') as f:
            attendance_data = json.load(f)
        
        # Count today's attendance
        today = datetime.now().date().isoformat()
        today_count = sum(1 for entry in attendance_data if entry.get('timestamp', '').startswith(today))
        
        return {
            "total_students": len(embeddings_db) if embeddings_db else 0,
            "present": today_count,
            "absent": len(embeddings_db) - today_count if embeddings_db else 0,
            "attendance_rate": (today_count / len(embeddings_db) * 100) if embeddings_db else 0,
            "date": today,
            "source": "local_json"
        }
    except:
        return {
            "total_students": 0,
            "present": 0,
            "absent": 0,
            "attendance_rate": 0,
            "date": datetime.now().date().isoformat()
        }


def get_attendance_from_json():
    """Get attendance from local JSON"""
    try:
        with open(ATTENDANCE_LOG, 'r') as f:
            attendance_data = json.load(f)
        
        # Filter today's records
        today = datetime.now().date().isoformat()
        today_records = [entry for entry in attendance_data if entry.get('timestamp', '').startswith(today)]
        
        return {
            "data": today_records,
            "count": len(today_records),
            "source": "local_json"
        }
    except:
        return {"data": [], "count": 0}


# Helper function to save attendance to Supabase
async def save_to_supabase(student_name, confidence):
    """Save attendance record to Supabase database"""
    if not supabase_client:
        return None
    
    try:
        # Get student from database
        student_response = supabase_client.table('students')\
            .select('*')\
            .eq('name', student_name)\
            .execute()
        
        if not student_response.data:
            print(f"⚠️  Student '{student_name}' not found in Supabase")
            return None
        
        student = student_response.data[0]
        
        # Insert attendance record
        attendance_data = {
            "student_id": student['id'],
            "roll_number": student['roll_number'],
            "name": student_name,
            "confidence": confidence,
            "status": "present"
        }
        
        result = supabase_client.table('attendance').insert(attendance_data).execute()
        
        print(f"✅ Saved to Supabase: {student_name} ({confidence:.1%})")
        return result.data[0] if result.data else None
        
    except Exception as e:
        print(f"❌ Error saving to Supabase: {e}")
        return None
