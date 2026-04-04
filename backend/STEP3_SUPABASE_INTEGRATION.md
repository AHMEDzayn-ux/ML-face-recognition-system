# Step 3: FastAPI + Supabase Integration
## Complete Guide

---

## ✅ **What We're Doing:**

1. Install Supabase Python packages
2. Configure environment variables (.env file)
3. Update main.py to save attendance to Supabase
4. Test the connection
5. Add dashboard API endpoints

---

## 📦 **Step 1: Install Packages**

Run these commands in your terminal:

```bash
cd "f:\My projects\face recognition"

# Activate virtual environment
venv\Scripts\activate

# Install Supabase packages
pip install supabase python-dotenv

# Update requirements.txt
pip freeze > requirements.txt
```

**OR run the batch file I created:**
```bash
install_supabase.bat
```

---

## 🔑 **Step 2: Configure .env File**

I've created a `.env` file for you. Now you need to fill in your Supabase credentials:

### **Get Your Credentials:**

1. Go to your Supabase project dashboard
2. Click **Settings** (left sidebar) → **API**
3. Copy these values:

```
Project URL: https://xxxxx.supabase.co
anon/public key: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### **Edit .env File:**

Open the file at: `f:\My projects\face recognition\.env`

Replace with your actual values:

```env
SUPABASE_URL=https://xxxxx.supabase.co
SUPABASE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

---

## 🔧 **Step 3: Update main.py**

### **Add Supabase Connection at Startup:**

The code has been updated to:
1. Load Supabase credentials from .env
2. Connect to Supabase on startup
3. Test the connection
4. Save attendance to both local JSON AND Supabase

### **Add This to mark_attendance Function:**

Find the section around line 360 where attendance is saved, and add this code after saving to JSON:

```python
# Also save to Supabase (if enabled)
if supabase_client and matched_name != "Unknown":
    try:
        # Get student from database
        student_response = supabase_client.table('students')\
            .select('*')\
            .eq('name', matched_name)\
            .execute()
        
        if student_response.data:
            student = student_response.data[0]
            
            # Save attendance
            supabase_client.table('attendance').insert({
                "student_id": student['id'],
                "roll_number": student['roll_number'],
                "name": matched_name,
                "confidence": confidence,
                "status": "present"
            }).execute()
            
            print(f"✅ Saved to Supabase: {matched_name}")
    except Exception as e:
        print(f"⚠️  Supabase save failed: {e}")
```

### **Add Dashboard API Endpoints:**

Add all the endpoints from `supabase_endpoints.py` to the end of `main.py` (before the `if __name__ == "__main__":` line).

Or simply:
```python
# At the end of main.py imports:
from supabase_endpoints import *
```

---

## 🧪 **Step 4: Test the Connection**

### **Test 1: Start FastAPI**

```bash
python main.py
```

**You should see:**
```
============================================================
🚀 Starting Face Recognition API...
============================================================

☁️  Connecting to Supabase...
✅ Supabase connected! (6 students in database)

📂 Loading embeddings database...
✅ Loaded 6 people from database

🔥 Warming up face recognition models...
...

============================================================
✅ Server ready!
✅ Supabase enabled - attendance will be saved to cloud!
============================================================
```

### **Test 2: Check API Endpoints**

Open browser and go to:

```
http://localhost:8000/docs
```

You should see new endpoints:
- `/api/stats/today` - Today's statistics
- `/api/attendance/today` - Today's attendance list
- `/api/attendance/range` - Date range query
- `/api/stats/weekly` - Weekly trend
- `/api/students` - List all students

### **Test 3: Mark Attendance**

Use your mobile app to capture a photo. Check:

1. **FastAPI console** - Should show:
   ```
   ✅ Saved to Supabase: John Doe (95.3%)
   ```

2. **Supabase dashboard** - Go to Table Editor → `attendance` table
   - You should see new records appearing!

3. **Test API** - Open browser:
   ```
   http://localhost:8000/api/stats/today
   ```
   
   Should return:
   ```json
   {
     "total_students": 6,
     "present": 3,
     "absent": 3,
     "attendance_rate": 50.0,
     "date": "2026-04-04"
   }
   ```

---

## 📊 **Step 5: Test Dashboard APIs**

### **Today's Stats:**
```
GET http://localhost:8000/api/stats/today
```

### **Today's Attendance:**
```
GET http://localhost:8000/api/attendance/today
```

### **Weekly Trend:**
```
GET http://localhost:8000/api/stats/weekly
```

### **All Students:**
```
GET http://localhost:8000/api/students
```

---

## ✅ **Success Checklist:**

- [ ] Packages installed (supabase, python-dotenv)
- [ ] .env file configured with your Supabase credentials
- [ ] SQL tables created in Supabase
- [ ] Students added to Supabase (matching embeddings.pkl names!)
- [ ] FastAPI connects to Supabase on startup
- [ ] Attendance saves to both JSON and Supabase
- [ ] Dashboard APIs return data
- [ ] Mobile app can mark attendance

---

## 🐛 **Troubleshooting:**

### **Error: "Supabase connection failed"**
- Check .env file has correct URL and key
- Check Supabase project is active
- Check internet connection

### **Error: "Student not found in Supabase"**
- Names in embeddings.pkl must EXACTLY match names in Supabase students table
- Check with: `SELECT name FROM students;` in Supabase SQL Editor

### **Error: "Module not found: supabase"**
- Run: `pip install supabase python-dotenv`
- Make sure virtual environment is activated

### **Attendance not saving to Supabase:**
- Check FastAPI console for errors
- Check Supabase logs (Dashboard → Logs)
- Verify student exists in students table

---

## 🎉 **Next Steps:**

Once this is working:

1. **Build PWA Dashboard** - React app to display analytics
2. **Real-time Updates** - Use Supabase realtime subscriptions
3. **Export Reports** - CSV/Excel download endpoints
4. **Student Management** - Add/edit students via API

---

## 💡 **Tips:**

- Supabase free tier is perfect for testing (500MB database)
- Keep local JSON as backup (dual save)
- Check Supabase dashboard regularly for data verification
- Use FastAPI /docs for API testing

---

**Ready to proceed?** Let me know if you hit any issues! 🚀
