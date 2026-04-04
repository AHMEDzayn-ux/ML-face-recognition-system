# ESP32-CAM Setup Guide

## 📦 Hardware Required

1. **ESP32-CAM module** (AI-Thinker or similar) - ~$6-10
2. **FTDI programmer** or **USB-to-Serial adapter** (for uploading code)
3. **Jumper wires** (5-6 wires)
4. **Push button** (optional - for manual capture)
5. **Power supply** (5V USB or adapter)

---

## 🔧 Software Setup

### Step 1: Install Arduino IDE

1. Download from: https://www.arduino.cc/en/software
2. Install Arduino IDE 2.x or 1.8.x

### Step 2: Add ESP32 Board Support

1. Open Arduino IDE
2. Go to: **File → Preferences**
3. In "Additional Board Manager URLs", add:
   ```
   https://raw.githubusercontent.com/espressif/arduino-esp32/gh-pages/package_esp32_index.json
   ```
4. Go to: **Tools → Board → Boards Manager**
5. Search: **"esp32"**
6. Install: **"esp32 by Espressif Systems"**

---

## 🔌 Hardware Connections

### Connecting ESP32-CAM to FTDI Programmer:

| ESP32-CAM | FTDI/USB-Serial  |
| --------- | ---------------- |
| 5V        | 5V (VCC)         |
| GND       | GND              |
| U0R (RX)  | TX               |
| U0T (TX)  | RX               |
| IO0       | GND (for upload) |

**Important:**

- Connect **IO0 to GND** only when uploading code
- Disconnect IO0 from GND after upload for normal operation

---

## 💾 Upload Code to ESP32-CAM

### Step 1: Get Your PC's IP Address

On Windows, open Command Prompt:

```batch
ipconfig
```

Look for **IPv4 Address** (e.g., 192.168.1.100)

### Step 2: Configure the Arduino Code

Open `esp32_attendance.ino` and change these lines:

```cpp
// Line 17-18: Your WiFi credentials
const char* ssid = "YOUR_WIFI_SSID";        // Your WiFi name
const char* password = "YOUR_WIFI_PASSWORD"; // Your WiFi password

// Line 21: Your PC's IP address (from ipconfig)
const char* serverUrl = "http://192.168.1.100:8000/mark_attendance";
//                              ^^^^^^^^^^^^^^
//                              Change this to your PC's IP!
```

### Step 3: Upload to ESP32-CAM

1. **Connect Hardware:**
   - Connect ESP32-CAM to FTDI as shown above
   - **Important:** Connect **IO0 to GND** before upload

2. **Arduino IDE Settings:**
   - Go to: **Tools → Board → ESP32 Arduino**
   - Select: **"AI Thinker ESP32-CAM"**
   - Go to: **Tools → Port**
   - Select: Your COM port (e.g., COM3, COM4)

3. **Upload:**
   - Click **Upload** button (→)
   - Wait for "Connecting..." message
   - If stuck, press the **RESET** button on ESP32-CAM
   - Wait for "Hard resetting via RTS pin..." message
   - Upload complete! ✅

4. **After Upload:**
   - **Disconnect IO0 from GND**
   - Press **RESET** button
   - ESP32-CAM will start running

---

## 🧪 Testing

### Step 1: Open Serial Monitor

1. In Arduino IDE: **Tools → Serial Monitor**
2. Set baud rate: **115200**

You should see:

```
========================================
ESP32-CAM Face Recognition Attendance
========================================
Initializing camera...
✅ Camera initialized successfully
Connecting to WiFi...
✅ WiFi connected!
IP Address: 192.168.1.xxx
Backend URL: http://192.168.1.100:8000/mark_attendance
========================================
System Ready!
Mode: Button press to capture
Press button on GPIO13 to take photo
========================================
```

### Step 2: Capture and Test

**Option 1: Button Press**

- Connect a button between **GPIO13** and **GND**
- Press button to capture photo
- Watch Serial Monitor for results

**Option 2: Auto-Capture Mode**
Change line 36 in code:

```cpp
bool autoCapture = true;  // Change from false to true
```

Re-upload code. It will capture every 5 seconds automatically.

---

## 📊 Understanding LED Indicators

| LED Pattern     | Meaning                              |
| --------------- | ------------------------------------ |
| 3 quick blinks  | ✅ Success - Person identified       |
| 3 long blinks   | ❌ Error - Unknown person or no face |
| 2 medium blinks | ⚠️ Warning - No face detected        |
| Flash LED on    | 📸 Capturing photo                   |

---

## 🔧 Troubleshooting

### "Camera init failed"

- **Solution:** Press RESET button on ESP32-CAM
- Check camera ribbon cable is properly connected

### "WiFi connection failed"

- **Solution:**
  - Check WiFi SSID and password are correct
  - Make sure WiFi is 2.4GHz (ESP32 doesn't support 5GHz)
  - Check WiFi network is available

### "HTTP POST failed" or "Connection refused"

- **Solution:**
  - Make sure backend server is running (`start_api.bat`)
  - Check PC's IP address with `ipconfig`
  - Update `serverUrl` in code with correct IP
  - Both PC and ESP32 must be on same WiFi network
  - Check Windows Firewall (allow port 8000)

### "Unknown person" or "No face detected"

- **Solution:**
  - Position face clearly in front of camera
  - Ensure good lighting
  - Face should be 30-60cm from camera
  - Person must be enrolled in database (`embeddings.pkl`)

### Serial Monitor shows garbage text

- **Solution:** Set baud rate to 115200

---

## 🎯 Optional Enhancements

### Add OLED Display (I2C)

Connect OLED:

- SDA → GPIO14
- SCL → GPIO15
- VCC → 3.3V
- GND → GND

Install library: **Adafruit SSD1306**

Display student names on OLED instead of Serial Monitor!

### Add Buzzer

- Positive → GPIO12 (through 100Ω resistor)
- Negative → GND

Beep on success/failure!

### Add External LED

- Green LED → GPIO14 (success indicator)
- Red LED → GPIO15 (error indicator)
- Both through 220Ω resistors to GND

---

## 📸 Photo Quality Tips

For best face recognition:

- **Lighting:** Bright, even lighting (avoid shadows)
- **Distance:** 30-60cm from camera
- **Angle:** Face directly toward camera
- **Background:** Plain background helps
- **Stability:** Hold steady (no blur)

---

## 🌐 Network Setup

**Important:** PC and ESP32-CAM must be on same WiFi network!

1. Find PC IP: `ipconfig` → IPv4 Address
2. Update ESP32 code with PC IP
3. Make sure both connected to same WiFi
4. Backend server must be running

**Firewall:** Windows may block port 8000

- Go to: Windows Defender Firewall → Allow an app
- Allow Python (or allow port 8000)

---

## 🚀 Quick Start Checklist

- [ ] Arduino IDE installed
- [ ] ESP32 board support added
- [ ] ESP32-CAM connected to FTDI
- [ ] WiFi credentials configured in code
- [ ] PC IP address configured in code
- [ ] Backend server running (`start_api.bat`)
- [ ] IO0 connected to GND for upload
- [ ] Code uploaded successfully
- [ ] IO0 disconnected after upload
- [ ] Serial Monitor shows "System Ready!"
- [ ] Button connected (or auto-capture enabled)
- [ ] Test capture works!

---

## 📝 Next Steps

Once working:

1. Test with multiple students
2. Monitor attendance logs in `attendance.json`
3. View attendance via API: `http://localhost:8000/attendance/today`
4. Add OLED display for better UX
5. Mount ESP32-CAM in enclosure

---

## 🆘 Need Help?

Check Serial Monitor output - it shows detailed error messages!

Common issues:

- WiFi credentials wrong
- PC IP address wrong
- Backend server not running
- Firewall blocking connection
- Poor lighting / face not visible
