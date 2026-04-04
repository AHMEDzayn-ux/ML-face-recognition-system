"use client";

import { useRef, useState, useEffect } from "react";
import { Camera, Loader2 } from "lucide-react";
import { markAttendance } from "@/lib/api";

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
  const [loading, setLoading] = useState(false);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isMounted, setIsMounted] = useState(false);

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

  const capture = async () => {
    if (!videoRef.current || !canvasRef.current) {
      onResult({ success: false, message: "Camera not ready" });
      return;
    }

    setLoading(true);

    try {
      const video = videoRef.current;
      const canvas = canvasRef.current;

      // Set canvas size to video size
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;

      // Draw video frame to canvas
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("Canvas context not available");

      ctx.drawImage(video, 0, 0);

      // Convert canvas to blob
      const blob = await new Promise<Blob>((resolve, reject) => {
        canvas.toBlob(
          (blob) => {
            if (blob) resolve(blob);
            else reject(new Error("Failed to create blob"));
          },
          "image/jpeg",
          0.8,
        );
      });

      const file = new File([blob], "capture.jpg", { type: "image/jpeg" });

      // Send to backend
      const result = await markAttendance(file);
      onResult(result);
    } catch (error) {
      console.error("Capture error:", error);
      onResult({
        success: false,
        message: error instanceof Error ? error.message : "Unknown error",
      });
    } finally {
      setLoading(false);
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
      </div>

      <button
        onClick={capture}
        disabled={loading}
        className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-semibold py-4 px-6 rounded-lg transition-colors flex items-center justify-center"
      >
        {loading ? (
          <>
            <Loader2 className="w-5 h-5 mr-2 animate-spin" />
            Processing...
          </>
        ) : (
          <>
            <Camera className="w-5 h-5 mr-2" />
            Capture & Mark Attendance
          </>
        )}
      </button>
    </div>
  );
}
