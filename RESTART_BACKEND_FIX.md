# Add Participant - Restart Required!

## ✅ Good News

The backend IS running (we're getting a response). But the code changes need a restart!

## 🔧 Quick Fix

### 1. Restart Backend

**Stop the backend:**

- Find the terminal running the backend
- Press `Ctrl+C` to stop it

**Start it again:**

```bash
cd "F:\My projects\attendance-system\backend"
start_api.bat
```

Wait for:

```
INFO: Uvicorn running on http://0.0.0.0:8000
```

### 2. Try Adding Participant Again

The error should be gone!

---

## 🔍 What the Error Means

The 400 error "Either student_id or roll_number is required" means:

- Frontend IS sending the request ✅
- Backend IS receiving it ✅
- But the `student_id` parameter is empty or not being read correctly ❌

The fixes I made earlier should handle this, but **Python needs to be restarted** to load the new code.

---

## 📋 If Still Fails After Restart

Check the backend console for the DEBUG line:

```
DEBUG: student_id=<some-uuid>, roll_number=None
```

If you see:

- `student_id=<uuid>` → Good! Should work
- `student_id=None` → Frontend issue, student.id is undefined
- No DEBUG line → Backend still using old code

Let me know what the DEBUG line shows if it still fails!
