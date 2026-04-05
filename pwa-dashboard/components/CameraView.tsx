"use client";

import { useRef, useState, useEffect } from "react";
import { Camera, Loader2, CheckCircle2, XCircle, Clock } from "lucide-react";
import { markAttendance } from "@/lib/api";

interface QueueItem {
  id: number;
  blob: Blob;
  status: "pending" | "processing" | "completed" | "failed";
  timestamp: number;
  result?: {
    success: boolean;
    name?: string;
    confidence?: number;
    message?: string;
  };
}

interface CameraViewProps {
  onResult: (result: {
    success: boolean;
    name?: string;
    confidence?: number;
    message?: string;
  }) => void;
}

export default function CameraView({ onResult }: CameraViewProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isMounted, setIsMounted] = useState(false);
  const [uploadQueue, setUploadQueue] = useState<QueueItem[]>([]);
  const [captureCount, setCaptureCount] = useState(0);
  const processingRef = useRef(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    if (isMounted) {
      startCamera();
    }
    return () => {
      stopCamera();
    };
  }, [isMounted]);

  const startCamera = async () => {
    try {
      // Check if mediaDevices API is available
      if (!navigator?.mediaDevices?.getUserMedia) {
        setError("Camera API not available in this browser");
        return;
      }

      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: "user",
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
        audio: false,
      });

      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
      setStream(mediaStream);
      setError(null);
    } catch (err) {
      console.error("Camera error:", err);
      setError("Failed to access camera. Please grant camera permissions.");
    }
  };

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
    }
  };

  // Background queue processor - runs independently from capture
  useEffect(() => {
    const processQueue = async () => {
      // Only process one at a time
      if (processingRef.current) return;

      // Find next pending item
      const pending = uploadQueue.find((item) => item.status === "pending");
      if (!pending) return;

      processingRef.current = true;

      // Mark as processing
      setUploadQueue((prev) =>
        prev.map((item) =>
          item.id === pending.id ? { ...item, status: "processing" } : item
        )
      );

      console.log(`🔄 Processing capture #${pending.id}...`);

      try {
        // Create file from blob
        const file = new File([pending.blob], `capture-${pending.id}.jpg`, {
          type: "image/jpeg",
        });

        // Send to backend (this takes 1-4 seconds but doesn't block UI!)
        const result = await markAttendance(file);

        // Update queue with result
        setUploadQueue((prev) =>
          prev.map((item) =>
            item.id === pending.id
              ? { ...item, status: "completed", result }
              : item
          )
        );

        // Notify parent component
        onResult(result);

        console.log(`✅ Capture #${pending.id} completed:`, result);
      } catch (error) {
        console.error(`❌ Capture #${pending.id} failed:`, error);

        const errorResult = {
          success: false,
          message: error instanceof Error ? error.message : "Unknown error",
        };

        setUploadQueue((prev) =>
          prev.map((item) =>
            item.id === pending.id
              ? { ...item, status: "failed", result: errorResult }
              : item
          )
        );

        onResult(errorResult);
      } finally {
        processingRef.current = false;
      }
    };

    // Process queue every 100ms
    const interval = setInterval(processQueue, 100);
    return () => clearInterval(interval);
  }, [uploadQueue, onResult]);

  // Auto-cleanup old completed/failed items after 10 seconds
  useEffect(() => {
    const cleanup = setInterval(() => {
      const now = Date.now();
      setUploadQueue((prev) =>
        prev.filter((item) => {
          const age = now - item.timestamp;
          const isOld = age > 10000; // 10 seconds
          const isDone = item.status === "completed" || item.status === "failed";
          return !(isOld && isDone);
        })
      );
    }, 5000);

    return () => clearInterval(cleanup);
  }, []);

  const capture = async () => {
    if (!videoRef.current || !canvasRef.current) {
      onResult({ success: false, message: "Camera not ready" });
      return;
    }

    try {
      const video = videoRef.current;
      const canvas = canvasRef.current;

      // Set canvas size to video size (optimized to 640x480 for faster upload)
      const targetWidth = 640;
      const targetHeight = 480;
      canvas.width = targetWidth;
      canvas.height = targetHeight;

      // Draw video frame to canvas
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("Canvas context not available");

      ctx.drawImage(video, 0, 0, targetWidth, targetHeight);

      // Convert canvas to blob (with compression)
      const blob = await new Promise<Blob>((resolve, reject) => {
        canvas.toBlob(
          (blob) => {
            if (blob) resolve(blob);
            else reject(new Error("Failed to create blob"));
          },
          "image/jpeg",
          0.7, // Reduced quality for faster upload
        );
      });

      // Queue immediately - this returns control to user instantly!
      const queueId = Date.now();
      const newItem: QueueItem = {
        id: queueId,
        blob,
        status: "pending",
        timestamp: queueId,
      };

      setUploadQueue((prev) => [...prev, newItem]);
      setCaptureCount((prev) => prev + 1);

      console.log(
        `📸 Capture #${captureCount + 1} queued! Ready for next person!`
      );

      // Optional: haptic feedback on supported devices
      if ("vibrate" in navigator) {
        navigator.vibrate(50);
      }
    } catch (error) {
      console.error("Capture error:", error);
      onResult({
        success: false,
        message: error instanceof Error ? error.message : "Unknown error",
      });
    }
  };

  if (!isMounted) {
    return (
      <div className="surface-muted p-6 text-center">
        <p className="text-gray-600">Loading camera...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50/80 p-6 text-center">
        <p className="text-red-800">{error}</p>
        <button
          onClick={startCamera}
          className="mt-4 bg-red-600 text-white px-4 py-2 rounded-lg"
        >
          Try Again
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="relative overflow-hidden rounded-xl border border-slate-300/50 bg-slate-900">
        <video ref={videoRef} autoPlay playsInline muted className="w-full" />
        <canvas ref={canvasRef} className="hidden" />

        {/* Queue status overlay */}
        {uploadQueue.length > 0 && (
          <div className="absolute top-4 right-4 bg-black/70 backdrop-blur-sm text-white px-3 py-2 rounded-lg text-sm font-medium">
            Queue: {uploadQueue.filter((i) => i.status === "pending").length}{" "}
            pending |{" "}
            {uploadQueue.filter((i) => i.status === "processing").length}{" "}
            processing
          </div>
        )}
      </div>

      {/* Capture button - NEVER DISABLED! */}
      <button
        onClick={capture}
        className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-4 px-6 rounded-lg transition-colors flex items-center justify-center"
      >
        <Camera className="w-5 h-5 mr-2" />
        Capture & Mark Attendance
        {captureCount > 0 && (
          <span className="ml-2 bg-white/20 px-2 py-1 rounded text-sm">
            {captureCount}
          </span>
        )}
      </button>

      {/* Queue status list */}
      {uploadQueue.length > 0 && (
        <div className="space-y-2 max-h-48 overflow-y-auto">
          {uploadQueue.map((item) => (
            <div
              key={item.id}
              className={`flex items-center gap-3 p-3 rounded-lg border ${
                item.status === "completed"
                  ? "bg-green-50 border-green-200"
                  : item.status === "failed"
                    ? "bg-red-50 border-red-200"
                    : item.status === "processing"
                      ? "bg-blue-50 border-blue-200"
                      : "bg-gray-50 border-gray-200"
              }`}
            >
              {item.status === "pending" && (
                <Clock className="w-5 h-5 text-gray-500" />
              )}
              {item.status === "processing" && (
                <Loader2 className="w-5 h-5 text-blue-500 animate-spin" />
              )}
              {item.status === "completed" && (
                <CheckCircle2 className="w-5 h-5 text-green-500" />
              )}
              {item.status === "failed" && (
                <XCircle className="w-5 h-5 text-red-500" />
              )}

              <div className="flex-1 text-sm">
                {item.status === "pending" && (
                  <span className="text-gray-700">Waiting in queue...</span>
                )}
                {item.status === "processing" && (
                  <span className="text-blue-700">Processing...</span>
                )}
                {item.status === "completed" && item.result?.success && (
                  <span className="text-green-700 font-medium">
                    {item.result.name}{" "}
                    {item.result.confidence &&
                      `(${Math.round(item.result.confidence * 100)}%)`}
                  </span>
                )}
                {item.status === "failed" && (
                  <span className="text-red-700">
                    {item.result?.message || "Failed"}
                  </span>
                )}
                {item.status === "completed" && !item.result?.success && (
                  <span className="text-red-700">
                    {item.result?.message || "Not recognized"}
                  </span>
                )}
              </div>

              <span className="text-xs text-gray-500">
                #{item.id.toString().slice(-4)}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
