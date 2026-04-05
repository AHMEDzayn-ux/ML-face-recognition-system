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
      <div className="surface-muted p-8 text-center">
        <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-slate-200 mb-3">
          <Loader2 className="w-6 h-6 text-slate-500 animate-spin" />
        </div>
        <p className="text-slate-600 font-medium">Initializing camera...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-lg border-2 border-red-200 bg-red-50 p-8 text-center">
        <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-red-100 mb-3">
          <XCircle className="w-6 h-6 text-red-600" />
        </div>
        <p className="text-red-900 font-semibold mb-4">{error}</p>
        <button
          onClick={startCamera}
          className="bg-red-600 hover:bg-red-700 text-white px-6 py-2.5 rounded-lg font-medium transition-colors inline-flex items-center gap-2"
        >
          <Camera className="w-4 h-4" />
          Try Again
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Video Feed */}
      <div className="relative overflow-hidden rounded-lg border-2 border-slate-200 bg-slate-950 aspect-video">
        <video 
          ref={videoRef} 
          autoPlay 
          playsInline 
          muted 
          className="w-full h-full object-cover" 
        />
        <canvas ref={canvasRef} className="hidden" />

        {/* Queue Status Overlay */}
        {uploadQueue.length > 0 && (
          <div className="absolute top-4 right-4 bg-black/75 backdrop-blur-sm text-white px-3 py-2 rounded-lg text-xs font-medium border border-white/10">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse" />
              Queue: {uploadQueue.filter((i) => i.status === "pending").length} pending
            </div>
          </div>
        )}

        {/* Instructions Overlay */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="border-2 border-blue-400 w-64 h-80 rounded-lg opacity-50" />
        </div>
      </div>

      {/* Main Capture Button */}
      <button
        onClick={capture}
        className="w-full bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-bold py-4 px-6 rounded-lg shadow-lg hover:shadow-xl transition-all flex items-center justify-center gap-3 text-lg"
      >
        <Camera className="w-5 h-5" />
        Capture & Mark Attendance
        {captureCount > 0 && (
          <span className="ml-2 bg-white/20 px-3 py-1 rounded-full text-sm font-semibold">
            {captureCount}
          </span>
        )}
      </button>

      {/* Queue Status List */}
      {uploadQueue.length > 0 && (
        <div className="space-y-2 max-h-56 overflow-y-auto p-4 bg-slate-50 rounded-lg border border-slate-200">
          <h4 className="font-semibold text-slate-900 text-sm mb-3">Processing Queue</h4>
          {uploadQueue.slice().reverse().map((item) => (
            <div
              key={item.id}
              className={`flex items-center gap-3 p-3 rounded-lg border-2 transition-all ${
                item.status === "completed"
                  ? "bg-emerald-50 border-emerald-200"
                  : item.status === "failed"
                    ? "bg-red-50 border-red-200"
                    : item.status === "processing"
                      ? "bg-blue-50 border-blue-200"
                      : "bg-yellow-50 border-yellow-200"
              }`}
            >
              {item.status === "pending" && (
                <Clock className="w-5 h-5 text-yellow-600" />
              )}
              {item.status === "processing" && (
                <Loader2 className="w-5 h-5 text-blue-600 animate-spin" />
              )}
              {item.status === "completed" && (
                <CheckCircle2 className="w-5 h-5 text-emerald-600" />
              )}
              {item.status === "failed" && (
                <XCircle className="w-5 h-5 text-red-600" />
              )}

              <div className="flex-1">
                <p className={`text-sm font-medium ${
                  item.status === "completed"
                    ? "text-emerald-900"
                    : item.status === "failed"
                      ? "text-red-900"
                      : item.status === "processing"
                        ? "text-blue-900"
                        : "text-yellow-900"
                }`}>
                  {item.status === "pending" && "Waiting in queue..."}
                  {item.status === "processing" && "Processing recognition..."}
                  {item.status === "completed" && item.result?.success && (
                    <span>✓ {item.result.name} ({Math.round((item.result.confidence || 0) * 100)}%)</span>
                  )}
                  {item.status === "failed" && (
                    <span>Failed: {item.result?.message || "Unknown error"}</span>
                  )}
                  {item.status === "completed" && !item.result?.success && (
                    <span>Failed: {item.result?.message || "Not recognized"}</span>
                  )}
                </p>
              </div>

              <span className="text-xs text-slate-500 font-mono">#{item.id.toString().slice(-4)}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
