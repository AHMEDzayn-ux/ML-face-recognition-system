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
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50/30">
      <div className="max-w-7xl mx-auto px-4 py-6">
        {/* Back Button & Trip Info */}
        <div className="mb-6">
          <Link
            href={`/trips/${tripId}`}
            className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-700 font-medium mb-3 transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Trip
          </Link>

          {trip && (
            <div>
              <div className="flex items-start justify-between gap-4 mb-3">
                <div>
                  <h1 className="text-3xl font-bold text-slate-900 mb-1">
                    {trip.name}
                  </h1>
                  <p className="text-slate-600">
                    {selectedSession ? `Session: ${selectedSession.name}` : "Trip Attendance"}
                  </p>
                </div>
                <div className="text-right">
                  <div className="text-sm font-semibold text-slate-700">Progress</div>
                  <div className="text-2xl font-bold text-blue-600">
                    {displayStats.checked_in}/{displayStats.total}
                  </div>
                </div>
              </div>

              {/* Progress Bar */}
              <div className="flex items-center gap-4">
                <div className="flex-1 h-2 bg-slate-200 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-blue-500 to-blue-600 transition-all duration-300"
                    style={{ width: `${displayStats.percentage}%` }}
                  />
                </div>
                <span className="text-sm font-semibold text-slate-600 whitespace-nowrap">
                  {displayStats.percentage.toFixed(0)}%
                </span>
                {displayStats.missing > 0 && (
                  <span className="text-sm font-semibold text-red-600">
                    {displayStats.missing} missing
                  </span>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Session Selector */}
        {sessions.length > 1 && (
          <div className="mb-6 p-4 sm:p-5 bg-white border border-slate-200 rounded-lg">
            <h3 className="text-sm font-bold text-slate-900 mb-3">Select Session:</h3>
            <div className="flex gap-2 flex-wrap">
              {sessions.map((session) => (
                <button
                  key={session.id}
                  onClick={() => setSelectedSession(session)}
                  className={`px-4 py-2 rounded-lg font-medium text-sm transition-all ${
                    selectedSession?.id === session.id
                      ? "bg-blue-600 text-white shadow-md"
                      : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                  }`}
                >
                  {session.name}
                  <span className="ml-2 text-xs font-normal opacity-75">
                    ({session.stats.checked_in}/{session.stats.total})
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Camera Feed Section */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">
              {/* Camera Container */}
              <div className="relative bg-slate-950 aspect-video">
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  className="w-full h-full object-cover"
                />
                <canvas ref={canvasRef} className="hidden" />

                {/* Focus Rectangle */}
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <div className="border-2 border-blue-400/30 w-56 h-72 rounded-lg" />
                </div>

                {/* Overlay Info */}
                <div className="absolute top-4 right-4 bg-black/70 backdrop-blur text-white px-3 py-2 rounded-lg text-sm font-medium">
                  {pendingCount > 0 || processingCount > 0 ? (
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse" />
                      {processingCount > 0 && <span>Processing {processingCount}</span>}
                      {pendingCount > 0 && processingCount > 0 && <span>•</span>}
                      {pendingCount > 0 && <span>{pendingCount} queued</span>}
                    </div>
                  ) : (
                    <span className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-green-400 rounded-full" />
                      Ready
                    </span>
                  )}
                </div>
              </div>

              {/* Capture Button Below Video */}
              <div className="bg-gradient-to-br from-slate-50 to-white p-5 border-t border-slate-200">
                <button
                  onClick={capturePhoto}
                  className="w-full bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white px-8 py-4 rounded-lg font-bold text-lg shadow-lg hover:shadow-xl transition-all flex items-center justify-center gap-3"
                >
                  <Camera className="h-6 w-6" />
                  Capture & Check In
                </button>

                {(pendingCount > 0 || processingCount > 0) && (
                  <div className="mt-3 text-center text-sm text-slate-600">
                    <span className="inline-flex items-center gap-2">
                      <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
                      {processingCount > 0 && <span>Processing {processingCount}</span>}
                      {pendingCount > 0 && processingCount === 0 && <span>{pendingCount} in queue</span>}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Instructions */}
            <div className="mt-6 p-4 sm:p-5 bg-blue-50 border border-blue-200 rounded-lg">
              <h4 className="font-bold text-blue-900 mb-3 flex items-center gap-2">
                <span className="inline-flex w-5 h-5 items-center justify-center rounded-full bg-blue-600 text-white text-xs font-bold">i</span>
                Camera Instructions
              </h4>
              <ul className="space-y-2 text-sm text-blue-800">
                <li className="flex items-start gap-2">
                  <span className="text-blue-600 font-bold">•</span>
                  <span>Position your face within the frame</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-blue-600 font-bold">•</span>
                  <span>Ensure good lighting on your face</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-blue-600 font-bold">•</span>
                  <span>Click capture when ready - recognition is automatic</span>
                </li>
              </ul>
            </div>
          </div>

          {/* Activity Log */}
          <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden flex flex-col">
            <div className="p-5 border-b border-slate-200">
              <h3 className="text-lg font-bold text-slate-900">Recent Activity</h3>
            </div>

            <div className="overflow-y-auto flex-1">
              {uploadQueue.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-96 text-center p-4">
                  <Camera className="h-12 w-12 text-slate-300 mb-3" />
                  <p className="text-slate-500 text-sm">No captures yet</p>
                  <p className="text-slate-400 text-xs mt-1">Captures will appear here</p>
                </div>
              ) : (
                <div className="space-y-2 p-4">
                  {uploadQueue.slice().reverse().map((item) => (
                    <div
                      key={item.id}
                      className={`p-4 rounded-lg border-2 transition-all ${
                        item.status === "success"
                          ? "bg-emerald-50 border-emerald-200"
                          : item.status === "error"
                            ? "bg-red-50 border-red-200"
                            : item.status === "processing"
                              ? "bg-blue-50 border-blue-200"
                              : "bg-yellow-50 border-yellow-200"
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        {item.status === "success" && (
                          <CheckCircle2 className="h-5 w-5 text-emerald-600 flex-shrink-0 mt-0.5" />
                        )}
                        {item.status === "error" && (
                          <XCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
                        )}
                        {item.status === "processing" && (
                          <Loader2 className="h-5 w-5 text-blue-600 animate-spin flex-shrink-0 mt-0.5" />
                        )}
                        {item.status === "pending" && (
                          <AlertCircle className="h-5 w-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                        )}

                        <div className="flex-1 min-w-0">
                          {item.status === "success" && item.result && (
                            <div>
                              <p className="font-bold text-emerald-900 text-sm">
                                ✓ {item.result.name}
                              </p>
                              <p className="text-xs text-emerald-700 mt-0.5">
                                {item.result.roll_number}
                              </p>
                              <p className="text-xs text-emerald-700 mt-1">
                                {item.result.confidence}% match
                              </p>
                            </div>
                          )}
                          {item.status === "error" && (
                            <div>
                              <p className="font-bold text-red-900 text-sm">Failed</p>
                              <p className="text-xs text-red-700 mt-1">
                                {item.error || "Recognition failed"}
                              </p>
                            </div>
                          )}
                          {item.status === "processing" && (
                            <p className="font-semibold text-blue-900 text-sm">Processing...</p>
                          )}
                          {item.status === "pending" && (
                            <p className="font-semibold text-yellow-900 text-sm">Queued...</p>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
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
