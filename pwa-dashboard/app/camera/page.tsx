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
      <div className="mb-4">
        <div className="flex items-center gap-2.5 mb-1">
          <div className="p-2 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg">
            <Camera className="w-5 h-5 text-white" />
          </div>
          <h1 className="section-title text-2xl sm:text-3xl text-slate-900">
            Mark Attendance
          </h1>
        </div>
        <p className="section-subtitle ml-9 text-slate-600">
          Secure face recognition check-in
        </p>
      </div>

      <div className="surface-card p-0 sm:p-0 mb-4 overflow-hidden">
        <CameraView onResult={setResult} />
      </div>

      {result && (
        <div
          className={`surface-card p-4 sm:p-5 mb-4 border-2 ${
            result.success
              ? "border-emerald-200 bg-emerald-50/60"
              : "border-red-200 bg-red-50/60"
          }`}
        >
          <div className="flex items-start gap-3">
            {result.success ? (
              <CheckCircle className="w-6 h-6 text-emerald-600 flex-shrink-0 mt-0.5" />
            ) : (
              <XCircle className="w-6 h-6 text-red-600 flex-shrink-0 mt-0.5" />
            )}
            <div className="flex-1 min-w-0">
              <h3 className={`font-bold text-base sm:text-lg ${
                  result.success ? "text-emerald-900" : "text-red-900"
                }`}
              >
                {result.success ? "✓ Attendance Marked" : "✗ Recognition Failed"}
              </h3>
              {result.name && (
                <p className="text-slate-700 mt-1.5 text-sm font-medium">
                  {result.name}
                </p>
              )}
              {result.confidence && (
                <p className={`text-sm mt-1 ${result.success ? "text-emerald-700" : "text-red-700"}`}>
                  Confidence: <span className="font-semibold">{(result.confidence * 100).toFixed(1)}%</span>
                </p>
              )}
              {result.message && (
                <p className="text-slate-600 mt-2 text-sm">{result.message}</p>
              )}
            </div>
          </div>
        </div>
      )}

      <div className="surface-muted border-l-4 border-l-blue-500 bg-blue-50/50">
        <div className="p-4">
          <h3 className="mb-2 font-bold text-sm text-blue-900 flex items-center gap-2">
            <span className="inline-flex w-5 h-5 items-center justify-center rounded-full bg-blue-500 text-white text-xs">i</span>
            Best Practices for Accurate Recognition
          </h3>
          <ul className="space-y-1.5 text-xs text-blue-800">
            <li className="flex items-start gap-2">
              <span className="text-blue-600 font-bold mt-0.5">•</span>
              <span>Position your face directly in front of the camera</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-blue-600 font-bold mt-0.5">•</span>
              <span>Ensure adequate lighting from the front</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-blue-600 font-bold mt-0.5">•</span>
              <span>Avoid extreme angles or shadows on your face</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-blue-600 font-bold mt-0.5">•</span>
              <span>Remove glasses or sunglasses if possible</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-blue-600 font-bold mt-0.5">•</span>
              <span>Stay still for 1-2 seconds while capturing</span>
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}
