"use client";

import { useState } from "react";
import CameraView from "@/components/CameraView";
import { Camera, CheckCircle, XCircle } from "lucide-react";

export default function CameraPage() {
  const [result, setResult] = useState<{
    success: boolean;
    name?: string;
    confidence?: number;
    message?: string;
  } | null>(null);

  return (
    <div className="page-shell max-w-4xl">
      <div className="mb-6 sm:mb-8">
        <h1 className="section-title text-2xl sm:text-3xl flex items-center gap-2 sm:gap-3">
          <Camera className="w-6 h-6 sm:w-8 sm:h-8 text-sky-700" />
          <span>Mark Attendance</span>
        </h1>
        <p className="section-subtitle mt-2 text-xs sm:text-sm">
          Position your face in the camera and click capture
        </p>
      </div>

      <div className="surface-card p-4 sm:p-6 mb-6">
        <CameraView onResult={setResult} />
      </div>

      {result && (
        <div
          className={`surface-card p-4 sm:p-6 ${
            result.success
              ? "bg-emerald-50/90 border-emerald-200"
              : "bg-red-50/90 border-red-200"
          }`}
        >
          <div className="flex items-start gap-2 sm:gap-3">
            {result.success ? (
              <CheckCircle className="w-5 h-5 sm:w-6 sm:h-6 text-green-600 flex-shrink-0 mt-1" />
            ) : (
              <XCircle className="w-5 h-5 sm:w-6 sm:h-6 text-red-600 flex-shrink-0 mt-1" />
            )}
            <div className="flex-1 min-w-0">
              <h3
                className={`font-semibold text-base sm:text-lg ${
                  result.success ? "text-green-900" : "text-red-900"
                }`}
              >
                {result.success ? "Attendance Marked!" : "Recognition Failed"}
              </h3>
              {result.name && (
                <p className="text-gray-700 mt-2 text-sm">
                  <span className="font-medium">Student:</span> {result.name}
                </p>
              )}
              {result.confidence && (
                <p className="text-gray-700 text-sm">
                  <span className="font-medium">Confidence:</span>{" "}
                  {(result.confidence * 100).toFixed(1)}%
                </p>
              )}
              {result.message && (
                <p className="text-gray-700 mt-2 text-sm">{result.message}</p>
              )}
            </div>
          </div>
        </div>
      )}

      <div className="mt-6 sm:mt-8 surface-muted p-4 sm:p-6">
        <h3 className="mb-3 font-semibold text-sm sm:text-base text-sky-900">Tips:</h3>
        <ul className="space-y-2 text-xs sm:text-sm text-sky-800">
          <li>• Ensure good lighting on your face</li>
          <li>• Face the camera directly (avoid extreme angles)</li>
          <li>• Remove glasses or masks if possible</li>
          <li>• Stay still when capturing</li>
        </ul>
      </div>
    </div>
  );
}
