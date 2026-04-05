# Failed to Fetch Error - Diagnostic Guide

## 🐛 Error

```
Error loading trip: TypeError: Failed to fetch
```

This means the frontend **cannot connect** to the backend API.

## ✅ Quick Fix Checklist

### 1. Is the Backend Running?

**Check:**

- Open a command prompt/terminal
- Navigate to backend folder
- Look for running Python process

**Start Backend:**

```bash
cd "F:\My projects\attendance-system\backend"
start_api.bat
```

You should see:

```
🚀 Starting Face Recognition API Server
📍 API will be available at: http://localhost:8000
...
INFO: Uvicorn running on http://0.0.0.0:8000
```

### 2. Test Backend Directly

Open browser and go to:

- **http://localhost:8000** - Should show `{"status":"online",...}`
- **http://localhost:8000/docs** - Should show Swagger API docs

If these don't load → Backend is not running!

### 3. Check Backend Console

Look for errors in the backend terminal:

- Port 8000 already in use?
- Python/dependency errors?
- Database connection errors?

### 4. Restart Both Services

Sometimes a clean restart fixes it:

**Terminal 1 - Backend:**

```bash
cd "F:\My projects\attendance-system\backend"
# Stop if running (Ctrl+C)
start_api.bat
```

**Terminal 2 - Frontend:**

```bash
cd "F:\My projects\attendance-system\pwa-dashboard"
# Stop if running (Ctrl+C)
start-dev.bat
```

### 5. Check .env.local

File: `pwa-dashboard/.env.local`

Should have:

```
NEXT_PUBLIC_API_URL=http://localhost:8000
```

If you changed this, restart frontend after fixing.

## 🔍 Common Causes

| Issue               | Solution                                |
| ------------------- | --------------------------------------- |
| Backend not started | Run `backend/start_api.bat`             |
| Backend crashed     | Check console for errors, restart       |
| Port 8000 in use    | Kill other process or change port       |
| Firewall blocking   | Allow Python/node through firewall      |
| Wrong API URL       | Check `.env.local` has `localhost:8000` |

## 🧪 Debug Steps

### Step 1: Verify Backend is Running

```bash
curl http://localhost:8000
```

OR open in browser: http://localhost:8000

**Expected:** `{"status":"online","students_enrolled":X}`  
**If fails:** Backend is not running!

### Step 2: Check Network Tab

1. Open browser DevTools (F12)
2. Go to Network tab
3. Refresh page
4. Look for failed requests to `localhost:8000`
5. Click failed request to see details

### Step 3: Check Backend Logs

Look at backend terminal for:

```
INFO: 127.0.0.1:XXXXX - "GET /api/trips/... HTTP/1.1" 200 OK
```

If you see requests → Backend is working  
If no requests → Frontend not reaching backend

## ✅ Solution

**Most Common Fix:**

1. Open new terminal
2. `cd "F:\My projects\attendance-system\backend"`
3. `start_api.bat`
4. Wait for "Uvicorn running on..."
5. Refresh browser

The "Failed to fetch" should disappear!

## 📋 Quick Start Script

Save this as `START_ALL.bat`:

```batch
@echo off
echo Starting Attendance System...
echo.

start "Backend API" cmd /k "cd /d F:\My projects\attendance-system\backend && start_api.bat"
timeout /t 5
start "Frontend PWA" cmd /k "cd /d F:\My projects\attendance-system\pwa-dashboard && start-dev.bat"

echo.
echo ✓ Both services starting...
echo ✓ Backend: http://localhost:8000
echo ✓ Frontend: http://localhost:3000
echo.
pause
```

Run this to start everything at once!

## 🆘 Still Not Working?

Check:

1. ✅ Backend terminal shows no errors
2. ✅ http://localhost:8000 loads in browser
3. ✅ http://localhost:3000 loads in browser
4. ✅ Browser console (F12) shows actual error
5. ✅ Firewall not blocking localhost

**If backend starts but still fails:**

- Check if using VPN (might block localhost)
- Try `127.0.0.1:8000` instead of `localhost:8000`
- Check if antivirus blocking Python
