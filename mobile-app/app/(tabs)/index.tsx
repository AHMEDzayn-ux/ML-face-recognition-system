import { CameraView, useCameraPermissions } from "expo-camera";
import React, { useState, useEffect, useRef } from "react";
import * as ImageManipulator from "expo-image-manipulator";
import {
  ActivityIndicator,
  Alert,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  ScrollView,
  Vibration,
} from "react-native";

// CHANGE THIS to your PC's IP address
const API_URL = "http://10.202.12.214:8000/mark_attendance";

// Queue item type
interface QueueItem {
  id: number;
  uri: string;
  status: "pending" | "processing" | "completed" | "failed";
  timestamp: number;
  result?: any;
}

export default function HomeScreen() {
  const [permission, requestPermission] = useCameraPermissions();
  const [camera, setCamera] = useState<CameraView | null>(null);
  const [showCamera, setShowCamera] = useState(false);
  
  // Fire and forget - queue system
  const [uploadQueue, setUploadQueue] = useState<QueueItem[]>([]);
  const [recentResults, setRecentResults] = useState<any[]>([]);
  const [captureCount, setCaptureCount] = useState(0);
  
  const processingRef = useRef(false);

  // Request camera permission
  const handleRequestPermission = async () => {
    const result = await requestPermission();
    if (result?.granted) {
      setShowCamera(true);
    } else {
      Alert.alert(
        "Permission Denied",
        "Camera access is required to mark attendance",
      );
    }
  };

  // Capture and send photo - FIRE AND FORGET with CROP & COMPRESS!
  const capturePhoto = async () => {
    if (!camera) return;

    try {
      // 1. Capture photo (fast!)
      const photo = await camera.takePictureAsync({
        quality: 0.5,
      });

      if (photo?.uri) {
        // 2. Optimize image BEFORE queueing (crop & compress!)
        console.log(`📸 Optimizing image...`);
        const optimizedUri = await optimizeImage(photo.uri);
        
        // 3. Add to queue immediately (non-blocking!)
        const queueId = Date.now();
        const newItem: QueueItem = {
          id: queueId,
          uri: optimizedUri, // Use optimized image!
          status: "pending",
          timestamp: queueId,
        };
        
        setUploadQueue((prev) => [...prev, newItem]);
        setCaptureCount((prev) => prev + 1);
        
        // 4. Haptic feedback - capture success!
        Vibration.vibrate(50);
        
        // 5. Camera is IMMEDIATELY ready for next person! ✅
        console.log(`📸 Capture #${captureCount + 1} queued! Ready for next person!`);
      } else {
        Alert.alert("Error", "Failed to capture photo");
      }
    } catch (error) {
      console.error("Capture error:", error);
      Alert.alert("Error", `Failed to capture photo: ${error}`);
    }
  };

  // Optimize image: resize and compress
  const optimizeImage = async (uri: string) => {
    try {
      // Resize to standard face recognition size and compress
      const manipResult = await ImageManipulator.manipulateAsync(
        uri,
        [
          { resize: { width: 640, height: 480 } }, // Resize to 640x480
        ],
        {
          compress: 0.7, // Compress to 70% quality
          format: ImageManipulator.SaveFormat.JPEG,
        }
      );
      
      console.log(`✅ Image optimized: ${uri.length} → ${manipResult.uri.length} chars`);
      return manipResult.uri;
    } catch (error) {
      console.error("Image optimization failed:", error);
      // Fallback to original if optimization fails
      return uri;
    }
  };

  // Background worker - processes queue without blocking UI
  useEffect(() => {
    const processQueue = async () => {
      // Only process one at a time
      if (processingRef.current) return;
      
      // Find next pending item
      const pending = uploadQueue.find((item) => item.status === "pending");
      if (!pending) return;
      
      // Mark as processing
      processingRef.current = true;
      setUploadQueue((prev) =>
        prev.map((item) =>
          item.id === pending.id ? { ...item, status: "processing" } : item
        )
      );
      
      console.log(`🔄 Processing capture #${pending.id}...`);
      
      // Process in background
      const result = await sendToBackend(pending.uri, pending.id);
      
      // Update queue
      setUploadQueue((prev) =>
        prev.map((item) =>
          item.id === pending.id
            ? { ...item, status: result.success ? "completed" : "failed", result }
            : item
        )
      );
      
      // Add to recent results
      if (result.success) {
        setRecentResults((prev) => [result, ...prev].slice(0, 10));
      }
      
      // Clean up old items after 5 seconds
      setTimeout(() => {
        setUploadQueue((prev) => prev.filter((item) => item.id !== pending.id));
      }, 5000);
      
      processingRef.current = false;
    };
    
    // Check queue every 100ms
    const interval = setInterval(processQueue, 100);
    return () => clearInterval(interval);
  }, [uploadQueue]);

  // Send photo to backend API
  const sendToBackend = async (imageUri: string, captureId: number) => {
    // Create abort controller for timeout
    const controller = new AbortController();
    const requestTimeout = setTimeout(() => controller.abort(), 15000); // 15s timeout

    try {
      console.log("Sending to:", API_URL);
      console.log("Image URI:", imageUri);

      // Create FormData with proper React Native format
      const formData = new FormData();

      // React Native FormData requires this specific format
      formData.append("file", {
        uri: imageUri,
        type: "image/jpeg",
        name: "photo.jpg",
      } as any);

      console.log("Sending request with fetch...");

      // Use fetch with timeout
      const response = await fetch(API_URL, {
        method: "POST",
        body: formData,
        headers: {
          "Content-Type": "multipart/form-data",
        },
        signal: controller.signal,
      });

      clearTimeout(requestTimeout);

      console.log(`✅ Capture #${captureId} - Response status:`, response.status);
      
      // Check if response is ok
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const data = await response.json();
      console.log(`✅ Capture #${captureId} - Response data:`, data);

      if (data.success) {
        // Success! Return result
        console.log(`🎉 ${data.student} recognized! (${data.confidence.toFixed(1)}%)`);
        return {
          success: true,
          student: data.student,
          confidence: data.confidence,
          timestamp: new Date().toLocaleTimeString(),
          captureId,
        };
      } else {
        console.log(`❌ Capture #${captureId} - Failed: ${data.message}`);
        return {
          success: false,
          message: data.message || "Unknown error",
          captureId,
        };
      }
    } catch (error: any) {
      clearTimeout(requestTimeout);
      console.error(`❌ Capture #${captureId} - Connection error:`, error);

      // Return error result
      let errorMsg = "Connection failed";
      if (error.name === "AbortError") {
        errorMsg = "Request timeout (15s)";
      } else if (error.message) {
        errorMsg = error.message;
      }

      return {
        success: false,
        message: errorMsg,
        captureId,
      };
    }
  };

  if (!showCamera) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>📸 Face Recognition{"\n"}Attendance</Text>
        <TouchableOpacity
          style={styles.button}
          onPress={handleRequestPermission}
        >
          <Text style={styles.buttonText}>Open Camera</Text>
        </TouchableOpacity>
        <Text style={styles.info}>Backend: {API_URL}</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <CameraView
        style={styles.camera}
        facing="front"
        ref={(ref) => setCamera(ref)}
      >
        <View style={styles.cameraOverlay}>
          <View style={styles.header}>
            <Text style={styles.headerText}>
              📸 Ready to capture! (#{captureCount + 1})
            </Text>
            {uploadQueue.length > 0 && (
              <Text style={styles.queueText}>
                Processing: {uploadQueue.length} in queue
              </Text>
            )}
          </View>

          <View style={styles.faceFrame} />

          {/* Show recent results (non-blocking!) */}
          {recentResults.length > 0 && (
            <View style={styles.resultsPanel}>
              <Text style={styles.resultsPanelTitle}>Recent Check-ins:</Text>
              <ScrollView style={styles.resultsScroll}>
                {recentResults.map((result, idx) => (
                  <View key={idx} style={styles.resultCard}>
                    <Text style={styles.resultName}>
                      ✅ {result.student}
                    </Text>
                    <Text style={styles.resultTime}>{result.timestamp}</Text>
                    <Text style={styles.resultConfidence}>
                      {result.confidence.toFixed(1)}%
                    </Text>
                  </View>
                ))}
              </ScrollView>
            </View>
          )}
        </View>
      </CameraView>

      <View style={styles.controls}>
        {/* Queue status */}
        {uploadQueue.length > 0 && (
          <View style={styles.queueStatus}>
            {uploadQueue.map((item) => (
              <View key={item.id} style={styles.queueItem}>
                {item.status === "processing" && (
                  <>
                    <ActivityIndicator size="small" color="#4CAF50" />
                    <Text style={styles.queueItemText}>Processing...</Text>
                  </>
                )}
                {item.status === "pending" && (
                  <Text style={styles.queueItemText}>⏳ Waiting...</Text>
                )}
              </View>
            ))}
          </View>
        )}

        {/* Capture button - NEVER DISABLED! */}
        <TouchableOpacity
          style={styles.captureButton}
          onPress={capturePhoto}
        >
          <Text style={styles.captureButtonText}>
            📸 Capture #{captureCount + 1}
          </Text>
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
    fontSize: 18,
    textAlign: "center",
    fontWeight: "bold",
  },
  queueText: {
    color: "#4ecca3",
    fontSize: 14,
    textAlign: "center",
    marginTop: 5,
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
  resultsPanel: {
    position: "absolute",
    right: 10,
    top: 100,
    width: 180,
    maxHeight: 400,
    backgroundColor: "rgba(0, 0, 0, 0.85)",
    borderRadius: 10,
    padding: 10,
  },
  resultsPanelTitle: {
    color: "#4ecca3",
    fontSize: 14,
    fontWeight: "bold",
    marginBottom: 10,
    textAlign: "center",
  },
  resultsScroll: {
    maxHeight: 350,
  },
  resultCard: {
    backgroundColor: "rgba(78, 204, 163, 0.2)",
    padding: 8,
    borderRadius: 5,
    marginBottom: 8,
    borderLeftWidth: 3,
    borderLeftColor: "#4ecca3",
  },
  resultName: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "bold",
  },
  resultTime: {
    color: "#aaa",
    fontSize: 11,
    marginTop: 2,
  },
  resultConfidence: {
    color: "#4ecca3",
    fontSize: 12,
    marginTop: 2,
  },
  controls: {
    backgroundColor: "#1a1a2e",
    padding: 20,
    paddingBottom: 40,
  },
  queueStatus: {
    flexDirection: "row",
    justifyContent: "center",
    marginBottom: 10,
    gap: 10,
  },
  queueItem: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(78, 204, 163, 0.2)",
    padding: 8,
    borderRadius: 5,
    gap: 5,
  },
  queueItemText: {
    color: "#4ecca3",
    fontSize: 12,
  },
  captureButton: {
    backgroundColor: "#4ecca3",
    padding: 20,
    borderRadius: 10,
    marginBottom: 10,
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
