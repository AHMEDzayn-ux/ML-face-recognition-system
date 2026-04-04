/*
 * ESP32-CAM Face Recognition Attendance System
 * 
 * Captures photo and sends to FastAPI backend for face recognition
 * 
 * Hardware: ESP32-CAM (AI-Thinker or similar)
 * Backend: FastAPI server on your PC
 * 
 * Author: Face Recognition Attendance System
 * Version: 1.0.0
 */

#include "esp_camera.h"
#include <WiFi.h>
#include <HTTPClient.h>

// ==================== CONFIGURATION ====================

// WiFi credentials - CHANGE THESE!
const char* ssid = "YOUR_WIFI_SSID";        // Your WiFi network name
const char* password = "YOUR_WIFI_PASSWORD"; // Your WiFi password

// Backend API server - CHANGE THIS!
const char* serverUrl = "http://192.168.1.100:8000/mark_attendance";  // Replace with your PC's IP

// Camera pins for ESP32-CAM (AI-Thinker module)
#define PWDN_GPIO_NUM     32
#define RESET_GPIO_NUM    -1
#define XCLK_GPIO_NUM      0
#define SIOD_GPIO_NUM     26
#define SIOC_GPIO_NUM     27
#define Y9_GPIO_NUM       35
#define Y8_GPIO_NUM       34
#define Y7_GPIO_NUM       39
#define Y6_GPIO_NUM       36
#define Y5_GPIO_NUM       21
#define Y4_GPIO_NUM       19
#define Y3_GPIO_NUM       18
#define Y2_GPIO_NUM        5
#define VSYNC_GPIO_NUM    25
#define HREF_GPIO_NUM     23
#define PCLK_GPIO_NUM     22

// LED pins
#define FLASH_LED_PIN      4  // Flash LED (can be used as indicator)
#define BUILTIN_LED_PIN   33  // Built-in red LED

// Button pin (optional - for manual capture)
#define BUTTON_PIN        13  // Connect button between GPIO13 and GND

// Settings
#define CAPTURE_INTERVAL  5000  // Capture every 5 seconds (auto mode)
bool autoCapture = false;       // Set to true for automatic capture mode

// ==================== SETUP ====================

void setup() {
  Serial.begin(115200);
  Serial.setDebugOutput(true);
  Serial.println();
  Serial.println("========================================");
  Serial.println("ESP32-CAM Face Recognition Attendance");
  Serial.println("========================================");

  // Initialize LED pins
  pinMode(FLASH_LED_PIN, OUTPUT);
  pinMode(BUILTIN_LED_PIN, OUTPUT);
  digitalWrite(FLASH_LED_PIN, LOW);
  digitalWrite(BUILTIN_LED_PIN, LOW);

  // Initialize button pin (optional)
  pinMode(BUTTON_PIN, INPUT_PULLUP);

  // Initialize camera
  Serial.println("Initializing camera...");
  if (!initCamera()) {
    Serial.println("❌ Camera initialization failed!");
    blinkError();
    return;
  }
  Serial.println("✅ Camera initialized successfully");

  // Connect to WiFi
  Serial.println("Connecting to WiFi...");
  WiFi.begin(ssid, password);
  
  int attempts = 0;
  while (WiFi.status() != WL_CONNECTED && attempts < 20) {
    delay(500);
    Serial.print(".");
    attempts++;
  }
  Serial.println();

  if (WiFi.status() == WL_CONNECTED) {
    Serial.println("✅ WiFi connected!");
    Serial.print("IP Address: ");
    Serial.println(WiFi.localIP());
    Serial.print("Backend URL: ");
    Serial.println(serverUrl);
    blinkSuccess();
  } else {
    Serial.println("❌ WiFi connection failed!");
    blinkError();
    return;
  }

  Serial.println("========================================");
  Serial.println("System Ready!");
  if (autoCapture) {
    Serial.println("Mode: Auto-capture every 5 seconds");
  } else {
    Serial.println("Mode: Button press to capture");
    Serial.println("Press button on GPIO13 to take photo");
  }
  Serial.println("========================================");
}

// ==================== MAIN LOOP ====================

unsigned long lastCapture = 0;
bool lastButtonState = HIGH;

void loop() {
  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("⚠️ WiFi disconnected! Reconnecting...");
    WiFi.reconnect();
    delay(5000);
    return;
  }

  bool shouldCapture = false;

  if (autoCapture) {
    // Auto-capture mode
    if (millis() - lastCapture > CAPTURE_INTERVAL) {
      shouldCapture = true;
      lastCapture = millis();
    }
  } else {
    // Button mode - capture on button press
    bool buttonState = digitalRead(BUTTON_PIN);
    if (buttonState == LOW && lastButtonState == HIGH) {
      shouldCapture = true;
      delay(50); // Debounce
    }
    lastButtonState = buttonState;
  }

  if (shouldCapture) {
    captureAndSend();
  }

  delay(100);
}

// ==================== CAMERA FUNCTIONS ====================

bool initCamera() {
  camera_config_t config;
  config.ledc_channel = LEDC_CHANNEL_0;
  config.ledc_timer = LEDC_TIMER_0;
  config.pin_d0 = Y2_GPIO_NUM;
  config.pin_d1 = Y3_GPIO_NUM;
  config.pin_d2 = Y4_GPIO_NUM;
  config.pin_d3 = Y5_GPIO_NUM;
  config.pin_d4 = Y6_GPIO_NUM;
  config.pin_d5 = Y7_GPIO_NUM;
  config.pin_d6 = Y8_GPIO_NUM;
  config.pin_d7 = Y9_GPIO_NUM;
  config.pin_xclk = XCLK_GPIO_NUM;
  config.pin_pclk = PCLK_GPIO_NUM;
  config.pin_vsync = VSYNC_GPIO_NUM;
  config.pin_href = HREF_GPIO_NUM;
  config.pin_sscb_sda = SIOD_GPIO_NUM;
  config.pin_sscb_scl = SIOC_GPIO_NUM;
  config.pin_pwdn = PWDN_GPIO_NUM;
  config.pin_reset = RESET_GPIO_NUM;
  config.xclk_freq_hz = 20000000;
  config.pixel_format = PIXFORMAT_JPEG;

  // Image quality settings
  if (psramFound()) {
    config.frame_size = FRAMESIZE_SVGA;  // 800x600
    config.jpeg_quality = 10;            // 0-63, lower = better quality
    config.fb_count = 2;
  } else {
    config.frame_size = FRAMESIZE_VGA;   // 640x480
    config.jpeg_quality = 12;
    config.fb_count = 1;
  }

  // Initialize camera
  esp_err_t err = esp_camera_init(&config);
  if (err != ESP_OK) {
    Serial.printf("Camera init failed with error 0x%x\n", err);
    return false;
  }

  // Sensor settings for better face detection
  sensor_t* s = esp_camera_sensor_get();
  s->set_brightness(s, 0);     // -2 to 2
  s->set_contrast(s, 0);       // -2 to 2
  s->set_saturation(s, 0);     // -2 to 2
  s->set_whitebal(s, 1);       // 0 = disable, 1 = enable
  s->set_awb_gain(s, 1);       // 0 = disable, 1 = enable
  s->set_wb_mode(s, 0);        // 0 to 4
  s->set_exposure_ctrl(s, 1);  // 0 = disable, 1 = enable
  s->set_aec2(s, 0);           // 0 = disable, 1 = enable
  s->set_ae_level(s, 0);       // -2 to 2
  s->set_aec_value(s, 300);    // 0 to 1200
  s->set_gain_ctrl(s, 1);      // 0 = disable, 1 = enable
  s->set_agc_gain(s, 0);       // 0 to 30
  s->set_gainceiling(s, (gainceiling_t)0);  // 0 to 6
  s->set_bpc(s, 0);            // 0 = disable, 1 = enable
  s->set_wpc(s, 1);            // 0 = disable, 1 = enable
  s->set_raw_gma(s, 1);        // 0 = disable, 1 = enable
  s->set_lenc(s, 1);           // 0 = disable, 1 = enable
  s->set_hmirror(s, 0);        // 0 = disable, 1 = enable
  s->set_vflip(s, 0);          // 0 = disable, 1 = enable

  return true;
}

void captureAndSend() {
  Serial.println("\n📸 Capturing photo...");
  
  // Flash LED on (indicates capturing)
  digitalWrite(FLASH_LED_PIN, HIGH);
  
  // Capture photo
  camera_fb_t* fb = esp_camera_fb_get();
  if (!fb) {
    Serial.println("❌ Camera capture failed");
    digitalWrite(FLASH_LED_PIN, LOW);
    return;
  }

  Serial.printf("✅ Photo captured: %d bytes\n", fb->len);

  // Flash LED off
  digitalWrite(FLASH_LED_PIN, LOW);

  // Send to backend
  sendToBackend(fb);

  // Return the frame buffer
  esp_camera_fb_return(fb);
}

void sendToBackend(camera_fb_t* fb) {
  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("❌ WiFi not connected!");
    return;
  }

  Serial.println("📡 Sending to backend...");

  HTTPClient http;
  http.begin(serverUrl);
  http.setTimeout(10000); // 10 second timeout

  // Prepare multipart form data
  String boundary = "----ESP32CAMBoundary";
  String contentType = "multipart/form-data; boundary=" + boundary;
  
  String head = "--" + boundary + "\r\n";
  head += "Content-Disposition: form-data; name=\"file\"; filename=\"capture.jpg\"\r\n";
  head += "Content-Type: image/jpeg\r\n\r\n";
  
  String tail = "\r\n--" + boundary + "--\r\n";

  uint32_t totalLen = head.length() + fb->len + tail.length();

  http.addHeader("Content-Type", contentType);
  http.addHeader("Content-Length", String(totalLen));

  // Prepare payload
  uint8_t* payload = (uint8_t*)malloc(totalLen);
  if (!payload) {
    Serial.println("❌ Memory allocation failed!");
    http.end();
    return;
  }

  // Copy data
  memcpy(payload, head.c_str(), head.length());
  memcpy(payload + head.length(), fb->buf, fb->len);
  memcpy(payload + head.length() + fb->len, tail.c_str(), tail.length());

  // Send HTTP POST
  int httpResponseCode = http.POST(payload, totalLen);

  free(payload);

  if (httpResponseCode > 0) {
    String response = http.getString();
    Serial.printf("✅ HTTP Response code: %d\n", httpResponseCode);
    Serial.println("Response: " + response);

    // Parse response
    if (response.indexOf("\"success\":true") > 0) {
      // Extract student name
      int nameStart = response.indexOf("\"student\":\"") + 11;
      int nameEnd = response.indexOf("\"", nameStart);
      String studentName = response.substring(nameStart, nameEnd);
      
      Serial.println("========================================");
      Serial.println("✅ ATTENDANCE MARKED!");
      Serial.println("Student: " + studentName);
      Serial.println("========================================");
      blinkSuccess();
    } else if (response.indexOf("\"error\":\"unknown_person\"") > 0) {
      Serial.println("========================================");
      Serial.println("❌ UNKNOWN PERSON");
      Serial.println("Person not in database");
      Serial.println("========================================");
      blinkError();
    } else if (response.indexOf("\"error\":\"no_face_detected\"") > 0) {
      Serial.println("========================================");
      Serial.println("⚠️ NO FACE DETECTED");
      Serial.println("Please position face in camera");
      Serial.println("========================================");
      blinkWarning();
    }
  } else {
    Serial.printf("❌ HTTP POST failed: %s\n", http.errorToString(httpResponseCode).c_str());
    Serial.println("Check if backend server is running!");
    blinkError();
  }

  http.end();
}

// ==================== LED FUNCTIONS ====================

void blinkSuccess() {
  // 3 quick blinks = success
  for (int i = 0; i < 3; i++) {
    digitalWrite(BUILTIN_LED_PIN, HIGH);
    delay(100);
    digitalWrite(BUILTIN_LED_PIN, LOW);
    delay(100);
  }
}

void blinkError() {
  // Long blinks = error
  for (int i = 0; i < 3; i++) {
    digitalWrite(BUILTIN_LED_PIN, HIGH);
    delay(500);
    digitalWrite(BUILTIN_LED_PIN, LOW);
    delay(500);
  }
}

void blinkWarning() {
  // 2 medium blinks = warning
  for (int i = 0; i < 2; i++) {
    digitalWrite(BUILTIN_LED_PIN, HIGH);
    delay(250);
    digitalWrite(BUILTIN_LED_PIN, LOW);
    delay(250);
  }
}
