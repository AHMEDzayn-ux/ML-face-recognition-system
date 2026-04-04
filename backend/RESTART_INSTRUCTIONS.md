# Quick Restart Instructions

## 🔄 Restart FastAPI Now!

**Press Ctrl+C in your FastAPI window to stop it**

Then start again:
```cmd
cd "f:\My projects\face recognition"
venv\Scripts\activate
python main.py
```

**OR:**
```cmd
start_api.bat
```

---

## ✅ You Should Now See:

```
============================================================
🚀 Starting Face Recognition API...
============================================================

☁️  Connecting to Supabase...
✅ Supabase connected! (6 students in database)

📂 Loading embeddings database...
✅ Loaded 6 people from database

🔥 Warming up face recognition models...
   This may take 10-30 seconds on first run...
   ✅ FaceNet model ready!
   ✅ RetinaFace detector ready!

============================================================
✅ Server ready!
✅ Supabase enabled - attendance will be saved to cloud!
============================================================

INFO:     Application startup complete
INFO:     Uvicorn running on http://0.0.0.0:8000
```

---

## 🎯 Then Test:

1. **Open mobile app**
2. **Capture a photo**
3. **Watch FastAPI console** - Should see:
   ```
   ✅ Saved to Supabase: StudentName (95.3%)
   ```
4. **Check Supabase** → Table Editor → attendance table
5. **New row should appear!** 🎉

---

**Restart now and let me know what you see!** 🚀
