# Connection Troubleshooting Guide

## ✅ You Confirmed:

- ✅ Same WiFi network
- ✅ Backend is running (start_api.bat)
- ✅ App opens camera

## 🔍 Let's Fix the Connection:

---

## Step 1: Verify Backend is Running

In the terminal where `start_api.bat` is running, you should see:

```
INFO:     Uvicorn running on http://0.0.0.0:8000 (Press CTRL+C to quit)
✅ Loaded embeddings database with X people
```

**If you DON'T see this**, the backend isn't running properly.

---

## Step 2: Test Backend Locally (On Your PC)

Open a web browser on your PC and go to:

```
http://localhost:8000/
```

**You should see:**

```json
{
  "status": "online",
  "students_enrolled": X,
  "message": "Face Recognition API is running"
}
```

**If this doesn't work**, backend has an issue.

---

## Step 3: Verify IP Address

### Find Your Current IP:

```cmd
ipconfig
```

Look for **IPv4 Address** under your WiFi adapter (e.g., 192.168.1.100 or 10.x.x.x)

### Check API_URL in App:

The IP in your app is: **10.188.23.214**

**Make sure this matches your actual PC IP!**

If your IP changed, update line 14 in:
`f:\My projects\face-recognition-app\app\(tabs)\index.tsx`

---

## Step 4: Fix Windows Firewall (MOST COMMON ISSUE)

### Option A: Allow Python Through Firewall (Recommended)

1. Open **Windows Defender Firewall with Advanced Security**
   - Press `Windows + R`
   - Type: `wf.msc`
   - Press Enter

2. Click **"Inbound Rules"** → **"New Rule"**

3. Choose **"Program"** → Next

4. Browse to: `f:\My projects\face recognition\venv\Scripts\python.exe`

5. **"Allow the connection"** → Next

6. Check all (Domain, Private, Public) → Next

7. Name: "Face Recognition API" → Finish

### Option B: Allow Port 8000

1. Open **Windows Defender Firewall with Advanced Security**

2. Click **"Inbound Rules"** → **"New Rule"**

3. Choose **"Port"** → Next

4. **TCP**, Specific local ports: **8000** → Next

5. **"Allow the connection"** → Next

6. Check all → Next

7. Name: "Port 8000 - Face API" → Finish

### Option C: Quick Test (Temporary - Not Secure)

**Temporarily disable firewall to test:**

- Windows Settings → Update & Security → Windows Security
- Firewall & network protection
- Turn off firewall (just for testing!)
- Try the app
- **Turn firewall back on after testing!**

---

## Step 5: Test from Phone Browser

On your phone, open a web browser and go to:

```
http://10.188.23.214:8000/
```

**If you see the JSON response:**
✅ Network connection works!
❌ Problem is in the app code

**If you DON'T see the response:**
❌ Firewall or network issue

---

## Step 6: Check Backend Logs

When you press "Capture" in the app, check the backend terminal.

**You should see:**

```
INFO: 10.188.23.214:XXXXX - "POST /mark_attendance HTTP/1.1" 200 OK
```

**If you see nothing:**

- Phone can't reach backend (firewall/network)

**If you see errors:**

- Connection works but there's a backend issue

---

## Quick Checklist:

- [ ] Backend running (`start_api.bat`)
- [ ] See "Uvicorn running" message
- [ ] Can access http://localhost:8000/ on PC
- [ ] IP address matches (`ipconfig` vs app code)
- [ ] Firewall rule added for Python or port 8000
- [ ] Can access http://10.188.23.214:8000/ on phone browser
- [ ] Both devices on same WiFi network
- [ ] WiFi is 2.4GHz or allows device-to-device communication

---

## Common Issues:

### "Connection timeout"

- **Firewall blocking** → Add firewall rule
- **Wrong IP** → Verify with ipconfig
- **WiFi isolation** → Some public/guest WiFi blocks device communication

### "Connection refused"

- **Backend not running** → Check start_api.bat window
- **Wrong port** → Should be 8000

### "No response"

- **Phone and PC on different networks** → Check WiFi name matches
- **VPN active** → Disable VPN on PC or phone

---

## Test Commands:

### On PC:

```cmd
# Check if port 8000 is listening
netstat -an | findstr :8000

# Should show:
# TCP    0.0.0.0:8000    0.0.0.0:0    LISTENING
```

### On Phone Browser:

```
http://10.188.23.214:8000/students
```

Should show list of enrolled students!

---

**Start with Step 4 (Firewall) - that's the most common issue!**
