# FastAPI Backend - Quick Start Guide

## 📦 Installation

### Step 1: Install Dependencies

```batch
install_api_deps.bat
```

Or manually:

```batch
venv\Scripts\activate.bat
pip install fastapi uvicorn[standard] python-multipart
```

---

## 🚀 Start the Server

### Quick Start:

```batch
start_api.bat
```

Or manually:

```batch
venv\Scripts\activate.bat
python main.py
```

The server will be available at:

- **API:** http://localhost:8000
- **Docs:** http://localhost:8000/docs
- **ESP32 Access:** http://YOUR_PC_IP:8000

---

## 🔌 API Endpoints

### 1. Health Check

```bash
GET http://localhost:8000/

Response:
{
  "status": "online",
  "students_enrolled": 3,
  "version": "1.0.0"
}
```

### 2. Identify Face

```bash
POST http://localhost:8000/identify
Content-Type: multipart/form-data
Body: file=@photo.jpg

Response (Success):
{
  "identified": true,
  "name": "john_doe",
  "distance": 0.23,
  "confidence": 85.5
}

Response (Unknown):
{
  "identified": false,
  "name": null,
  "closest_match": "jane_smith",
  "distance": 0.58
}
```

### 3. Mark Attendance

```bash
POST http://localhost:8000/mark_attendance
Content-Type: multipart/form-data
Body: file=@photo.jpg

Response (Success):
{
  "success": true,
  "student": "john_doe",
  "timestamp": "2026-04-02T14:26:00.123456",
  "status": "present",
  "confidence": 85.5
}

Response (Failure):
{
  "success": false,
  "error": "unknown_person",
  "message": "Person not recognized in database"
}
```

### 4. Get Students

```bash
GET http://localhost:8000/students

Response:
{
  "students": [
    {"name": "john_doe", "photos": 1},
    {"name": "jane_smith", "photos": 1}
  ],
  "total": 2
}
```

### 5. Get Today's Attendance

```bash
GET http://localhost:8000/attendance/today

Response:
{
  "attendance": [
    {
      "name": "john_doe",
      "timestamp": "2026-04-02T14:26:00.123456",
      "confidence": 85.5,
      "status": "present"
    }
  ],
  "total": 1,
  "date": "2026-04-02"
}
```

---

## 🧪 Testing the API

### Using curl (Command Line):

**Health Check:**

```bash
curl http://localhost:8000/
```

**Identify Face:**

```bash
curl -X POST -F "file=@test_images/you_1.jpg" http://localhost:8000/identify
```

**Mark Attendance:**

```bash
curl -X POST -F "file=@test_images/you_1.jpg" http://localhost:8000/mark_attendance
```

**Get Students:**

```bash
curl http://localhost:8000/students
```

### Using Web Browser:

1. Open: http://localhost:8000/docs
2. Interactive Swagger UI with all endpoints
3. Try out endpoints directly from browser

---

## 🌐 ESP32-CAM Integration

### Find Your PC's IP Address:

```batch
ipconfig
```

Look for "IPv4 Address" (e.g., 192.168.1.100)

### ESP32-CAM will connect to:

```
http://192.168.1.100:8000/identify
```

### Important:

- PC and ESP32-CAM must be on same WiFi network
- Firewall may need to allow port 8000
- CORS is already enabled for ESP32 access

---

## 📂 Files Created

- **attendance.json** - Attendance log (auto-created)
- **uploads/** - Temporary image storage (auto-deleted)

---

## 🔧 Configuration

Edit `main.py` to change:

- `THRESHOLD = 0.4` - Recognition threshold
- `port=8000` - Server port
- `ATTENDANCE_LOG` - Log file location

---

## ⚠️ Troubleshooting

**"Face database not loaded"**

- Run: `python build_embeddings.py`
- Make sure `embeddings.pkl` exists

**"Address already in use"**

- Port 8000 is busy
- Change port in `main.py` (line with `port=8000`)

**ESP32 can't connect**

- Check PC IP address with `ipconfig`
- Make sure both are on same WiFi
- Check firewall settings

---

## 🎯 Next Steps

1. Install dependencies: `install_api_deps.bat`
2. Start server: `start_api.bat`
3. Test with curl or browser
4. Get your PC's IP address
5. Ready for ESP32-CAM integration!
