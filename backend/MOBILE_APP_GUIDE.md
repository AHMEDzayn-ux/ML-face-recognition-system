# Mobile App Development Guide - React Native Expo

## 📱 Phase 3: Mobile Attendance App

Build a React Native Expo app that captures photos and marks attendance via your FastAPI backend.

---

## 🎯 What You'll Build

```
📱 Mobile App
    ↓
📸 Camera Capture
    ↓
📡 Send to Backend API
    ↓
✅ Show Result (Name or Unknown)
```

---

## 📋 Prerequisites

### Step 1: Install Node.js

1. Download from: https://nodejs.org/
2. Install LTS version (v18.x or v20.x)
3. Verify installation:
   ```bash
   node --version
   npm --version
   ```

### Step 2: Install Expo CLI

```bash
npm install -g expo-cli
```

### Step 3: Install Expo Go App on Your Phone

- **Android:** Google Play Store → Search "Expo Go"
- **iOS:** App Store → Search "Expo Go"

---

## 🚀 Create the Project

### Step 1: Create New Expo Project

```bash
cd "f:\My projects"
npx create-expo-app@latest face-recognition-app
cd face-recognition-app
```

Choose: **Blank** template

### Step 2: Install Required Packages

```bash
npm install expo-camera axios
```

---

## 📝 Project Structure

```
face-recognition-app/
├── App.js              # Main app component
├── app.json            # App configuration
├── package.json        # Dependencies
├── components/         # Reusable components
│   ├── Camera.js
│   └── ResultScreen.js
└── assets/             # Images, icons
```

---

## 💻 Code Implementation

### File: `App.js`

Replace the entire content with:

```javascript
import React, { useState } from "react";
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Image,
} from "react-native";
import { Camera } from "expo-camera";
import axios from "axios";

// CHANGE THIS to your PC's IP address
const API_URL = "http://192.168.1.100:8000/mark_attendance";

export default function App() {
  const [hasPermission, setHasPermission] = useState(null);
  const [camera, setCamera] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [showCamera, setShowCamera] = useState(false);

  // Request camera permission
  const requestPermission = async () => {
    const { status } = await Camera.requestCameraPermissionsAsync();
    setHasPermission(status === "granted");
    if (status === "granted") {
      setShowCamera(true);
    } else {
      Alert.alert(
        "Permission Denied",
        "Camera access is required to mark attendance",
      );
    }
  };

  // Capture and send photo
  const capturePhoto = async () => {
    if (!camera) return;

    setIsLoading(true);
    setResult(null);

    try {
      const photo = await camera.takePictureAsync({
        quality: 0.7,
        base64: false,
      });

      // Send to backend
      await sendToBackend(photo.uri);
    } catch (error) {
      Alert.alert("Error", "Failed to capture photo");
      setIsLoading(false);
    }
  };

  // Send photo to backend API
  const sendToBackend = async (imageUri) => {
    try {
      const formData = new FormData();
      formData.append("file", {
        uri: imageUri,
        type: "image/jpeg",
        name: "photo.jpg",
      });

      const response = await axios.post(API_URL, formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
        timeout: 10000, // 10 second timeout
      });

      setIsLoading(false);

      if (response.data.success) {
        setResult({
          success: true,
          student: response.data.student,
          confidence: response.data.confidence,
          timestamp: response.data.timestamp,
        });
        Alert.alert(
          "✅ Attendance Marked!",
          `Welcome, ${response.data.student}!\nConfidence: ${response.data.confidence.toFixed(1)}%`,
          [{ text: "OK" }],
        );
      } else {
        setResult({
          success: false,
          error: response.data.error,
          message: response.data.message,
        });
        Alert.alert("❌ Failed", response.data.message || "Unknown error", [
          { text: "OK" },
        ]);
      }
    } catch (error) {
      setIsLoading(false);
      console.error("Error:", error);
      Alert.alert(
        "Connection Error",
        "Cannot connect to server. Make sure:\n- Backend is running\n- Phone and PC are on same WiFi\n- API_URL is correct",
        [{ text: "OK" }],
      );
    }
  };

  // Main UI
  if (!showCamera) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>📸 Face Recognition Attendance</Text>
        <TouchableOpacity style={styles.button} onPress={requestPermission}>
          <Text style={styles.buttonText}>Open Camera</Text>
        </TouchableOpacity>
        <Text style={styles.info}>
          Make sure backend server is running!{"\n"}
          API: {API_URL}
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Camera
        style={styles.camera}
        type={Camera.Constants.Type.front}
        ref={(ref) => setCamera(ref)}
      >
        <View style={styles.cameraOverlay}>
          <View style={styles.header}>
            <Text style={styles.headerText}>
              Position your face in the frame
            </Text>
          </View>

          <View style={styles.faceFrame} />

          {result && (
            <View
              style={[
                styles.resultBox,
                result.success ? styles.successBox : styles.errorBox,
              ]}
            >
              <Text style={styles.resultText}>
                {result.success
                  ? `✅ ${result.student}`
                  : `❌ ${result.message}`}
              </Text>
            </View>
          )}
        </View>
      </Camera>

      <View style={styles.controls}>
        <TouchableOpacity
          style={[styles.captureButton, isLoading && styles.disabledButton]}
          onPress={capturePhoto}
          disabled={isLoading}
        >
          {isLoading ? (
            <ActivityIndicator size="large" color="#fff" />
          ) : (
            <Text style={styles.captureButtonText}>
              📸 Capture & Mark Attendance
            </Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.backButton}
          onPress={() => setShowCamera(false)}
        >
          <Text style={styles.backButtonText}>← Back</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#1a1a2e",
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#fff",
    textAlign: "center",
    marginTop: 100,
    marginBottom: 40,
  },
  button: {
    backgroundColor: "#0f3460",
    padding: 20,
    borderRadius: 10,
    marginHorizontal: 40,
  },
  buttonText: {
    color: "#fff",
    fontSize: 18,
    textAlign: "center",
    fontWeight: "bold",
  },
  info: {
    color: "#aaa",
    fontSize: 12,
    textAlign: "center",
    marginTop: 20,
    paddingHorizontal: 20,
  },
  camera: {
    flex: 1,
  },
  cameraOverlay: {
    flex: 1,
    backgroundColor: "transparent",
    justifyContent: "space-between",
  },
  header: {
    backgroundColor: "rgba(0,0,0,0.7)",
    padding: 20,
    paddingTop: 50,
  },
  headerText: {
    color: "#fff",
    fontSize: 16,
    textAlign: "center",
  },
  faceFrame: {
    width: 250,
    height: 250,
    borderWidth: 3,
    borderColor: "#4ecca3",
    borderRadius: 125,
    alignSelf: "center",
    marginTop: 50,
  },
  resultBox: {
    padding: 20,
    marginHorizontal: 20,
    borderRadius: 10,
    marginBottom: 20,
  },
  successBox: {
    backgroundColor: "rgba(78, 204, 163, 0.9)",
  },
  errorBox: {
    backgroundColor: "rgba(231, 76, 60, 0.9)",
  },
  resultText: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "bold",
    textAlign: "center",
  },
  controls: {
    backgroundColor: "#1a1a2e",
    padding: 20,
    paddingBottom: 40,
  },
  captureButton: {
    backgroundColor: "#4ecca3",
    padding: 20,
    borderRadius: 10,
    marginBottom: 10,
  },
  disabledButton: {
    backgroundColor: "#666",
  },
  captureButtonText: {
    color: "#fff",
    fontSize: 18,
    textAlign: "center",
    fontWeight: "bold",
  },
  backButton: {
    backgroundColor: "#666",
    padding: 15,
    borderRadius: 10,
  },
  backButtonText: {
    color: "#fff",
    fontSize: 16,
    textAlign: "center",
  },
});
```

### Important: Change Line 8

```javascript
const API_URL = "http://10.10.24.220:8000/mark_attendance";
//                      ^^^^^^^^^^^^^^
//                      Replace with your PC's IP address!
```

---

## 🧪 Run and Test

### Step 1: Start Expo Development Server

```bash
npm start
```

or

```bash
npx expo start
```

### Step 2: Scan QR Code

1. A QR code will appear in terminal/browser
2. Open **Expo Go** app on your phone
3. Scan the QR code
4. App will load on your phone!

### Step 3: Test the App

1. Tap "Open Camera"
2. Allow camera permission
3. Position face in the frame
4. Tap "Capture & Mark Attendance"
5. Wait for result!

---

## 🔧 Configuration

### Find Your PC's IP Address

**Windows:**

```bash
ipconfig
```

Look for **IPv4 Address** under your WiFi adapter

**Important:** Phone and PC must be on the same WiFi network!

### Update API URL in App.js

```javascript
const API_URL = "http://YOUR_PC_IP:8000/mark_attendance";
```

---

## 📱 Build Standalone App (Optional)

### For Android APK:

```bash
expo build:android
```

### For iOS (requires Mac):

```bash
expo build:ios
```

---

## 🎨 Features

✅ **Camera Preview:** Real-time camera feed  
✅ **Face Frame Guide:** Circle to position face  
✅ **Loading State:** Shows spinner while processing  
✅ **Success/Failure:** Clear visual feedback  
✅ **Error Handling:** Network error messages  
✅ **Clean UI:** Dark theme, easy to use

---

## ⚠️ Troubleshooting

### "Cannot connect to server"

- Make sure backend is running (`start_api.bat`)
- Check PC and phone are on same WiFi
- Verify IP address is correct
- Check Windows Firewall allows port 8000

### "Camera permission denied"

- Go to phone Settings → Apps → Expo Go → Permissions
- Enable Camera permission

### "Network Error"

- Backend server must be running
- Use PC's local network IP (192.168.x.x)
- Don't use localhost or 127.0.0.1
- Check firewall settings

### App is slow

- Reduce image quality (change `quality: 0.5`)
- Check WiFi signal strength
- Backend may be processing slowly

---

## 🚀 Quick Start Checklist

- [ ] Node.js installed
- [ ] Expo CLI installed
- [ ] Expo Go app on phone
- [ ] Project created
- [ ] Dependencies installed (expo-camera, axios)
- [ ] App.js code updated
- [ ] API_URL changed to PC's IP
- [ ] Backend server running
- [ ] Phone and PC on same WiFi
- [ ] App tested and working!

---

## 📊 What's Next?

Once working:

- Add attendance history screen
- Show list of today's attendance
- Add student enrollment from app
- Improve UI/UX
- Add offline support
- Build standalone APK for distribution

---

## 🎯 Summary

You now have:

1. ✅ Backend API (FastAPI)
2. ✅ Mobile App (React Native Expo)
3. ✅ Complete attendance system!

**Total cost:** ~$0 (just your phone and PC)  
**Development time:** ~3-4 hours  
**Result:** Professional face recognition attendance system! 🎉
