# Mobile App - Step by Step Setup

## 📱 Create the Expo Project

### Step 1: Check Node.js is Installed

Open Command Prompt and run:

```bash
node --version
```

If you see a version number (like v18.x.x or v20.x.x), you're good! ✅

If not, download and install from: https://nodejs.org/

---

### Step 2: Navigate to Your Projects Folder

```bash
cd "f:\My projects"
```

---

### Step 3: Create the Expo App

Run this command:

```bash
npx create-expo-app face-recognition-app
```

**Choose:** `blank` template when prompted

This will create a folder called `face-recognition-app` with all the files including **App.js**

---

### Step 4: Go Into the Project Folder

```bash
cd face-recognition-app
```

---

### Step 5: Install Required Packages

```bash
npm install expo-camera axios
```

---

### Step 6: Now App.js Exists!

Check the folder structure:

```
f:\My projects\face-recognition-app\
├── App.js          ← This file now exists!
├── package.json
├── app.json
└── node_modules\
```

---

### Step 7: Replace App.js Content

1. Open `App.js` in a text editor (Notepad, VS Code, etc.)
2. Delete ALL the existing content
3. Copy and paste the code from `MOBILE_APP_GUIDE.md` (the JavaScript code section)

---

### Step 8: Change the API URL

In App.js, find line ~8:

```javascript
const API_URL = "http://192.168.1.100:8000/mark_attendance";
```

Change `192.168.1.100` to **your PC's IP address**

To find your IP:

```bash
ipconfig
```

Look for IPv4 Address (e.g., 192.168.1.100)

---

### Step 9: Start the Development Server

```bash
npm start
```

This will:

- Start Expo server
- Show a QR code
- Open a browser with the QR code

---

### Step 10: Install Expo Go on Your Phone

**Android:** Play Store → Search "Expo Go"  
**iOS:** App Store → Search "Expo Go"

---

### Step 11: Scan the QR Code

1. Open Expo Go app
2. Tap "Scan QR Code"
3. Scan the QR code from your terminal/browser
4. App will load on your phone!

---

## 🎯 Quick Commands Summary

```bash
# Navigate to projects folder
cd "f:\My projects"

# Create Expo app
npx create-expo-app face-recognition-app

# Go into project
cd face-recognition-app

# Install packages
npm install expo-camera axios

# Start server
npm start
```

---

## ⚠️ Troubleshooting

**"npx not found"**

- Install Node.js from nodejs.org

**"Template not found"**

- Just press Enter when prompted for template (uses default blank template)

**"Cannot find module"**

- Run: `npm install`

**App.js still doesn't exist**

- Make sure you're in the correct folder: `f:\My projects\face-recognition-app\`
- Check with: `dir` (Windows) to see files

---

## 📝 Where Are You Now?

Let me know which step you're on:

- [ ] Have Node.js installed?
- [ ] Created the Expo project?
- [ ] See App.js in the folder?
- [ ] Need help with a specific step?
