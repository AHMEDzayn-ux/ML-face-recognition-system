"use client";

import { useEffect, useState, useRef } from "react";
import { useParams, useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  getTripParticipants,
  tripCheckin,
  sessionCheckin,
  getSessions,
} from "@/lib/api";
import { Trip, TripStats } from "@/lib/supabase";
import { supabase } from "@/lib/supabase";
import {
  ArrowLeft,
  Camera,
  Loader2,
  CheckCircle2,
  XCircle,
  AlertCircle,
} from "lucide-react";

interface QueueItem {
  id: string;
  blob: Blob;
  status: "pending" | "processing" | "success" | "error";
  result?: any;
  error?: string;
  timestamp: number;
}

interface SessionInfo {
  id: string;
  name: string;
  session_date: string;
  status: string;
  stats: {
    total: number;
    checked_in: number;
    missing: number;
    percentage: number;
  };
}

export default function TripCameraPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const tripId = params.id as string;
  const sessionIdParam = searchParams?.get("session") || "";

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const [trip, setTrip] = useState<Trip | null>(null);
  const [stats, setStats] = useState<TripStats>({
    total: 0,
    checked_in: 0,
    missing: 0,
    percentage: 0,
  });
  const [sessions, setSessions] = useState<SessionInfo[]>([]);
  const [selectedSession, setSelectedSession] = useState<SessionInfo | null>(
    null,
  );
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [uploadQueue, setUploadQueue] = useState<QueueItem[]>([]);
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    loadTripData();
    loadSessions();
    startCamera();

    // Subscribe to real-time updates and get cleanup function
    const cleanupSubscription = subscribeToUpdates();

    return () => {
      // Clean up camera stream
      if (stream) {
        stream.getTracks().forEach((track) => track.stop());
      }
      // Clean up subscription
      cleanupSubscription();
    };
  }, [tripId]);

  useEffect(() => {
    // Set selected session from URL param or first session
    if (sessionIdParam && sessions.length > 0) {
      const session = sessions.find((s) => s.id === sessionIdParam);
      if (session) {
        setSelectedSession(session);
      } else {
        setSelectedSession(sessions[0]);
      }
    } else if (sessions.length > 0) {
      setSelectedSession(sessions[0]);
    }
  }, [sessions, sessionIdParam]);

  useEffect(() => {
    processQueue();
  }, [uploadQueue]);

  const loadTripData = async () => {
    try {
      const data = await getTripParticipants(tripId);
      if (data.success) {
        setTrip(data.trip);
        setStats(data.stats);
      }
    } catch (error) {
      console.error("Error loading trip:", error);
    }
  };

  const loadSessions = async () => {
    try {
      const data = await getSessions(tripId);
      if (data.success && data.sessions) {
        setSessions(data.sessions);
      }
    } catch (error) {
      console.error("Error loading sessions:", error);
    }
  };

  const subscribeToUpdates = () => {
    const channel = supabase.channel(`trip_${tripId}_camera`);

    channel
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "trip_participants",
          filter: `trip_id=eq.${tripId}`,
        },
        () => {
          loadTripData();
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  };

  const startCamera = async () => {
    try {
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
    } catch (error) {
      console.error("Error accessing camera:", error);
      alert("Could not access camera. Please check permissions.");
    }
  };

  const capturePhoto = async () => {
    if (!videoRef.current || !canvasRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const context = canvas.getContext("2d");

    if (!context) return;

    // Set canvas size to match video
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    // Draw current video frame to canvas
    context.drawImage(video, 0, 0, canvas.width, canvas.height);

    // Convert to blob
    canvas.toBlob(
      (blob) => {
        if (blob) {
          // Add to queue
          const queueItem: QueueItem = {
            id: `capture_${Date.now()}`,
            blob,
            status: "pending",
            timestamp: Date.now(),
          };

          setUploadQueue((prev) => [...prev, queueItem]);
        }
      },
      "image/jpeg",
      0.7,
    );
  };

  const processQueue = async () => {
    if (processing) return;

    const pending = uploadQueue.find((item) => item.status === "pending");
    if (!pending) return;

    setProcessing(true);

    // Mark as processing
    setUploadQueue((prev) =>
      prev.map((item) =>
        item.id === pending.id ? { ...item, status: "processing" } : item,
      ),
    );

    try {
      const file = new File(
        [pending.blob],
        `capture_${pending.timestamp}.jpg`,
        {
          type: "image/jpeg",
        },
      );

      let result;
      // Use session check-in if session is selected, otherwise use trip check-in
      if (selectedSession) {
        result = await sessionCheckin(selectedSession.id, file);
      } else {
        result = await tripCheckin(tripId, file);
      }

      if (result.success) {
        setUploadQueue((prev) =>
          prev.map((item) =>
            item.id === pending.id
              ? { ...item, status: "success", result: result.participant }
              : item,
          ),
        );

        // Auto-remove success after 5 seconds
        setTimeout(() => {
          setUploadQueue((prev) =>
            prev.filter((item) => item.id !== pending.id),
          );
        }, 5000);

        // Reload sessions to update stats
        loadSessions();
      } else {
        setUploadQueue((prev) =>
          prev.map((item) =>
            item.id === pending.id
              ? {
                  ...item,
                  status: "error",
                  error: result.message || "Recognition failed",
                }
              : item,
          ),
        );

        // Auto-remove error after 10 seconds
        setTimeout(() => {
          setUploadQueue((prev) =>
            prev.filter((item) => item.id !== pending.id),
          );
        }, 10000);
      }
    } catch (error: any) {
      setUploadQueue((prev) =>
        prev.map((item) =>
          item.id === pending.id
            ? {
                ...item,
                status: "error",
                error: error.message || "Unknown error",
              }
            : item,
        ),
      );

      setTimeout(() => {
        setUploadQueue((prev) => prev.filter((item) => item.id !== pending.id));
      }, 10000);
    } finally {
      setProcessing(false);
    }
  };

  const pendingCount = uploadQueue.filter(
    (item) => item.status === "pending",
  ).length;
  const processingCount = uploadQueue.filter(
    (item) => item.status === "processing",
  ).length;

  const displayStats = selectedSession ? selectedSession.stats : stats;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-6">
          <Link
            href={`/trips/${tripId}`}
            className="inline-flex items-center gap-2 text-slate-300 hover:text-white mb-4"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Dashboard
          </Link>

          {trip && (
            <div>
              <h1 className="text-3xl font-bold text-white mb-2">
                {trip.name} - Camera{" "}
                {selectedSession && `(${selectedSession.name})`}
              </h1>
              <div className="flex items-center gap-4 text-slate-300">
                <span>
                  Progress: {displayStats.checked_in}/{displayStats.total} (
                  {displayStats.percentage.toFixed(1)}%)
                </span>
                <span className="w-px h-4 bg-slate-600" />
                <span className="text-red-400 font-semibold">
                  {displayStats.missing} Missing
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Session Selector */}
        {sessions.length > 0 && (
          <div className="mb-6 bg-slate-800 rounded-xl border border-slate-700 p-4">
            <label className="text-white font-semibold mb-3 block">
              Select Session:
            </label>
            <div className="flex gap-2 flex-wrap">
              {sessions.map((session) => (
                <button
                  key={session.id}
                  onClick={() => setSelectedSession(session)}
                  className={`px-4 py-2 rounded-lg font-medium text-sm transition-all ${
                    selectedSession?.id === session.id
                      ? "bg-blue-600 text-white shadow-lg"
                      : "bg-slate-700 text-slate-300 hover:bg-slate-600"
                  }`}
                >
                  {session.name}
                  <span className="ml-2 text-xs opacity-75">
                    ({session.stats.checked_in}/{session.stats.total})
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Camera View */}
          <div className="lg:col-span-2">
            <div className="bg-slate-800 rounded-xl border border-slate-700 overflow-hidden shadow-2xl">
              <div className="relative aspect-video bg-black">
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  className="w-full h-full object-cover"
                />
                <canvas ref={canvasRef} className="hidden" />

                {/* Overlay */}
                <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-6">
                  <button
                    onClick={capturePhoto}
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white px-8 py-4 rounded-xl font-bold text-lg shadow-lg shadow-blue-600/50 transition-all flex items-center justify-center gap-3"
                  >
                    <Camera className="h-6 w-6" />
                    Capture & Check In
                  </button>

                  {(pendingCount > 0 || processingCount > 0) && (
                    <div className="mt-3 text-center text-sm text-slate-300">
                      {processingCount > 0 && (
                        <span>Processing {processingCount}...</span>
                      )}
                      {pendingCount > 0 && (
                        <span> {pendingCount} in queue</span>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Instructions */}
            <div className="mt-4 bg-slate-800 border border-slate-700 rounded-xl p-4">
              <h3 className="font-semibold text-white mb-2">
                Quick Instructions:
              </h3>
              <ul className="text-sm text-slate-300 space-y-1">
                <li>• Look directly at the camera</li>
                <li>• Ensure good lighting on your face</li>
                <li>• Click "Capture" when ready</li>
                <li>• System will auto-recognize and check you in</li>
              </ul>
            </div>
          </div>

          {/* Queue Status */}
          <div>
            <div className="bg-slate-800 rounded-xl border border-slate-700 p-6 shadow-xl">
              <h2 className="text-xl font-bold text-white mb-4">
                Recent Activity
              </h2>

              <div className="space-y-3">
                {uploadQueue.length === 0 ? (
                  <div className="text-center py-8 text-slate-400">
                    <Camera className="h-12 w-12 mx-auto mb-2 text-slate-600" />
                    <p className="text-sm">No captures yet</p>
                  </div>
                ) : (
                  uploadQueue
                    .slice()
                    .reverse()
                    .map((item) => (
                      <div
                        key={item.id}
                        className={`p-4 rounded-lg border ${
                          item.status === "success"
                            ? "bg-green-900/20 border-green-700"
                            : item.status === "error"
                              ? "bg-red-900/20 border-red-700"
                              : item.status === "processing"
                                ? "bg-blue-900/20 border-blue-700"
                                : "bg-slate-700 border-slate-600"
                        }`}
                      >
                        <div className="flex items-start gap-3">
                          {item.status === "success" && (
                            <CheckCircle2 className="h-5 w-5 text-green-400 mt-0.5" />
                          )}
                          {item.status === "error" && (
                            <XCircle className="h-5 w-5 text-red-400 mt-0.5" />
                          )}
                          {item.status === "processing" && (
                            <Loader2 className="h-5 w-5 text-blue-400 animate-spin mt-0.5" />
                          )}
                          {item.status === "pending" && (
                            <AlertCircle className="h-5 w-5 text-slate-400 mt-0.5" />
                          )}

                          <div className="flex-1 min-w-0">
                            {item.status === "success" && item.result && (
                              <div>
                                <p className="font-semibold text-green-400 truncate">
                                  {item.result.name}
                                </p>
                                <p className="text-xs text-green-300">
                                  {item.result.roll_number}
                                </p>
                                <p className="text-xs text-green-300 mt-1">
                                  Confidence: {item.result.confidence}%
                                </p>
                              </div>
                            )}
                            {item.status === "error" && (
                              <div>
                                <p className="font-semibold text-red-400">
                                  Recognition Failed
                                </p>
                                <p className="text-xs text-red-300 mt-1">
                                  {item.error || "Unknown error"}
                                </p>
                              </div>
                            )}
                            {item.status === "processing" && (
                              <p className="text-slate-300 font-semibold">
                                Processing...
                              </p>
                            )}
                            {item.status === "pending" && (
                              <p className="text-slate-400 font-semibold">
                                In queue...
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    ))
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
