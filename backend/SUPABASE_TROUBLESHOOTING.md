# Supabase Troubleshooting & Setup Guide

## 🔍 **Checking Supabase Logs**

### **Method 1: Supabase Dashboard**
1. Go to https://app.supabase.com
2. Open your project: `face-recognition-attendance`
3. Click **"Logs"** in left sidebar
4. Select log type:
   - **Database** - SQL queries and errors
   - **API** - REST API requests
   - **Auth** - Authentication logs
5. Filter by time range and search for errors

### **Method 2: Table Editor**
1. Go to **"Table Editor"** in left sidebar
2. Check if tables exist:
   - `students` ❓
   - `attendance` ❓
3. If tables don't exist → Need to run SQL first!

### **Method 3: SQL Editor**
1. Go to **"SQL Editor"**
2. Run: `SELECT tablename FROM pg_tables WHERE schemaname = 'public';`
3. Check if your tables are listed

---

## 📋 **Complete Setup Steps (in order)**

### **✅ Step 1: Run SQL to Create Tables**

**You haven't done this yet!** This is required first.

1. Open Supabase Dashboard: https://app.supabase.com
2. Click your project
3. Click **"SQL Editor"** (left sidebar)
4. Click **"New Query"**
5. Copy ALL the SQL from: `f:\My projects\face recognition\supabase_setup.sql`
6. Paste into SQL Editor
7. Click **"Run"** (or press Ctrl+Enter)

**Expected result:**
```
Success! No rows returned
```

### **✅ Step 2: Verify Tables Created**

In SQL Editor, run:
```sql
-- Check tables exist
SELECT tablename FROM pg_tables WHERE schemaname = 'public';
```

You should see:
- `students`
- `attendance`

### **✅ Step 3: Auto-populate Students from embeddings.pkl**

Run this script:
```bash
cd "f:\My projects\face recognition"
venv\Scripts\activate
python setup_supabase_complete.py
```

This will:
- ✅ Connect to Supabase
- ✅ Check if tables exist
- ✅ Read names from embeddings.pkl
- ✅ Auto-generate roll numbers (001, 002, 003...)
- ✅ Add all students to Supabase
- ✅ Verify everything worked

**OR run the batch file:**
```bash
run_supabase_setup.bat
```

---

## 🐛 **Common Errors & Solutions**

### **Error: "relation 'students' does not exist"**
**Cause:** Tables not created yet

**Solution:**
1. Run SQL in Supabase SQL Editor (Step 1 above)
2. Copy from `supabase_setup.sql`
3. Run ALL the SQL at once

---

### **Error: "Invalid API key"**
**Cause:** Wrong API key in .env file

**Solution:**
1. Go to Supabase → Settings → API
2. Copy **anon/public** key (NOT service_role!)
3. Update `.env` file
4. Restart FastAPI

---

### **Error: "Connection timeout"**
**Cause:** Network issue or wrong URL

**Solution:**
1. Check Supabase URL is correct
2. Check internet connection
3. Check firewall not blocking supabase.co

---

### **Error: "Student not found in Supabase"**
**Cause:** Names in embeddings.pkl don't match Supabase

**Solution:**
Run `setup_supabase_complete.py` to auto-add all students

---

## 🔍 **Checking What Went Wrong**

### **Quick Diagnostic:**

Run this in Python:
```python
from supabase import create_client
import os
from dotenv import load_dotenv

load_dotenv()
supabase = create_client(os.getenv("SUPABASE_URL"), os.getenv("SUPABASE_KEY"))

# Test 1: Can we connect?
try:
    result = supabase.table('students').select('id').limit(1).execute()
    print("✅ Connection works!")
except Exception as e:
    print(f"❌ Connection failed: {e}")

# Test 2: Do tables exist?
try:
    students = supabase.table('students').select('*').execute()
    print(f"✅ Students table exists! Count: {len(students.data)}")
except Exception as e:
    print(f"❌ Students table error: {e}")

try:
    attendance = supabase.table('attendance').select('*').execute()
    print(f"✅ Attendance table exists! Count: {len(attendance.data)}")
except Exception as e:
    print(f"❌ Attendance table error: {e}")
```

---

## 📝 **Step-by-Step Checklist**

- [ ] **1. Supabase project created**
  - Go to supabase.com
  - Create project
  - Wait for provisioning

- [ ] **2. .env file configured**
  - File: `f:\My projects\face recognition\.env`
  - Has correct URL
  - Has correct API key

- [ ] **3. SQL tables created**
  - Open SQL Editor in Supabase
  - Run `supabase_setup.sql`
  - See "Success" message

- [ ] **4. Tables verified**
  - Go to Table Editor
  - See `students` table
  - See `attendance` table

- [ ] **5. Students populated**
  - Run `setup_supabase_complete.py`
  - See "Added X students"
  - Check Table Editor → students table

- [ ] **6. FastAPI connected**
  - Run `python main.py`
  - See "✅ Supabase connected!"
  - See student count

- [ ] **7. Test attendance**
  - Use mobile app to capture photo
  - Check Supabase → attendance table
  - See new record appear

---

## 🎯 **Quick Fix Script**

I've created `setup_supabase_complete.py` which does Steps 2-6 automatically!

Just run:
```bash
run_supabase_setup.bat
```

It will tell you exactly what's wrong and guide you through fixing it!

---

## 📊 **What Your Supabase Should Look Like:**

### **students table:**
```
id    | roll_number | name          | class         | section | is_active
------|-------------|---------------|---------------|---------|----------
uuid1 | 001         | Person1Name   | Default Class | A       | true
uuid2 | 002         | Person2Name   | Default Class | A       | true
uuid3 | 003         | Person3Name   | Default Class | A       | true
...
```

### **attendance table:**
```
id    | student_id | name        | timestamp           | confidence | status
------|------------|-------------|---------------------|------------|--------
uuid1 | uuid1      | Person1Name | 2026-04-04 08:30:00 | 0.95       | present
...
```

---

## 🚀 **Next Steps After Setup:**

1. ✅ Verify students in Supabase Table Editor
2. ✅ Start FastAPI: `python main.py`
3. ✅ Capture photo with mobile app
4. ✅ Check Supabase for new attendance record
5. ✅ Test API: `http://localhost:8000/api/stats/today`

---

**Run this now:**
```bash
run_supabase_setup.bat
```

It will diagnose and fix everything! 🎉
