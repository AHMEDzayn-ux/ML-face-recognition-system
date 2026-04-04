# Debugging: Check if Mobile App is Hitting Backend

## 🔍 Issue: CMD doesn't show requests

This means the mobile app might not be connecting to your FastAPI backend.

---

## ✅ Step 1: Check Your IP Address

**Your current API_URL in mobile app:**
```
http://10.202.12.214:8000/mark_attendance
```

**Check if this is still correct:**

1. Open Command Prompt
2. Run: `ipconfig`
3. Find your **WiFi IPv4 Address**
4. Does it match `10.202.12.214`?

**If NO:** Your IP changed! Update the mobile app.

---

## ✅ Step 2: Restart FastAPI with Logging

I just added more logging. **Restart FastAPI:**

```cmd
# Stop (Ctrl+C)
python main.py
```

Now when you mark attendance, you should see:
```
📸 Received attendance request from image.jpg
🔍 Identification result: True - PersonName
💾 Logging attendance for: PersonName
✅ Saved to Supabase: PersonName (95.3%)
```

---

## ✅ Step 3: Test with Browser First

**Open browser and go to:**
```
http://localhost:8000/docs
```

1. Find `/mark_attendance` endpoint
2. Click "Try it out"
3. Upload a test image
4. Click "Execute"

**Check FastAPI console** - Do you see the log messages?

---

## ✅ Step 4: Check Mobile App IP

**In your mobile app:**

File: `face-recognition-app/app/(tabs)/index.tsx`
Line 16: `const API_URL = "http://10.202.12.214:8000/mark_attendance";`

**Make sure:**
1. IP matches your computer's current IP
2. Port is 8000
3. Endpoint is `/mark_attendance`

**To find your current IP:**
```cmd
ipconfig
```
Look for: `Wireless LAN adapter Wi-Fi` → `IPv4 Address`

---

## ✅ Step 5: Check Firewall

**Make sure Windows Firewall allows port 8000:**

1. Windows Security → Firewall & network protection
2. Advanced settings
3. Inbound Rules
4. Look for "Python" or port 8000 rule
5. Make sure it's ENABLED

---

## 🧪 Quick Test Commands:

### **Test 1: Is FastAPI running?**
```cmd
curl http://localhost:8000/
```
Should return: `{"message":"Face Recognition Attendance API"}`

### **Test 2: Can mobile reach it?**
In mobile app, change API_URL temporarily to:
```typescript
const API_URL = "http://YOUR_CURRENT_IP:8000/";
```

Then in app, check if you can fetch:
```typescript
fetch(API_URL).then(r => r.json()).then(console.log)
```

---

## 🎯 Most Likely Issues:

1. **IP Address Changed** ⭐ Most common!
   - WiFi reconnect changes IP
   - Update mobile app API_URL

2. **Firewall Blocking**
   - Windows Firewall blocking port 8000
   - Add firewall rule

3. **Wrong Endpoint**
   - Mobile app calling wrong URL
   - Check API_URL in index.tsx

4. **FastAPI Not Running**
   - Check if python main.py is actually running
   - Check no errors in startup

---

## 🚀 Action Plan:

1. **Check IP:** Run `ipconfig` and verify
2. **Update mobile app** if IP changed
3. **Restart FastAPI** (to get new logs)
4. **Mark attendance** with mobile app
5. **Watch CMD** - Should now see logs!

---

**What's your computer's current IP address?** (Run `ipconfig`) 🔍
