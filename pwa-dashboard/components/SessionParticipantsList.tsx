"use client";

import { useEffect, useState } from "react";
import {
  getSessionParticipants,
  markSessionManual,
  removeParticipantFromSession,
  sessionCheckin,
} from "@/lib/api";
import { supabase } from "@/lib/supabase";
import {
  Camera,
  CheckCircle2,
  XCircle,
  Loader2,
  Search,
  Trash2,
  AlertCircle,
  UserCheck,
} from "lucide-react";

interface Participant {
  id: string;
  session_id: string;
  trip_id: string;
  student_id: string;
  roll_number: string;
  name: string;
  expected: boolean;
  checked_in: boolean;
  check_in_time?: string;
  check_in_method?: "face" | "manual" | "bulk";
  confidence?: number;
  photo_url?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
}

interface SessionStats {
  total: number;
  checked_in: number;
  missing: number;
  percentage: number;
}

interface SessionParticipantsListProps {
  sessionId: string;
  tripId: string;
  allowCheckin?: boolean;
}

export default function SessionParticipantsList({
  sessionId,
  tripId,
  allowCheckin = true,
}: SessionParticipantsListProps) {
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [stats, setStats] = useState<SessionStats>({
    total: 0,
    checked_in: 0,
    missing: 0,
    percentage: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [filter, setFilter] = useState<"all" | "checked_in" | "missing">("all");
  const [cameraLoading, setCameraLoading] = useState(false);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  useEffect(() => {
    loadParticipants();

    // Subscribe to real-time updates
    const cleanup = subscribeToUpdates();
    return cleanup;
  }, [sessionId]);

  const loadParticipants = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await getSessionParticipants(sessionId);

      if (data.success) {
        setParticipants(data.participants);
        setStats(data.stats);
      }
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to load participants",
      );
      console.error("Error loading participants:", err);
    } finally {
      setLoading(false);
    }
  };

  const subscribeToUpdates = () => {
    const channel = supabase.channel(`session_${sessionId}_attendance`);

    channel
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "session_attendance",
          filter: `session_id=eq.${sessionId}`,
        },
        () => {
          console.log("Participants updated in real-time");
          loadParticipants();
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  };

  const handleCameraCapture = async (
    e: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setCameraLoading(true);
      setError(null);
      const result = await sessionCheckin(sessionId, file);

      if (result.success) {
        // Reload participants after successful check-in
        loadParticipants();
      } else {
        setError(result.message || "Failed to check in");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to check in");
    } finally {
      setCameraLoading(false);
    }
  };

  const handleManualToggle = async (participant: Participant) => {
    try {
      setUpdatingId(participant.id);
      const result = await markSessionManual(
        sessionId,
        participant.id,
        !participant.checked_in,
      );

      if (result.success) {
        setParticipants((prev) =>
          prev.map((p) =>
            p.id === participant.id
              ? {
                  ...p,
                  checked_in: !p.checked_in,
                  check_in_method: "manual" as const,
                }
              : p,
          ),
        );
        // Update stats
        loadParticipants();
      } else {
        setError(result.message || "Failed to update attendance");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update");
    } finally {
      setUpdatingId(null);
    }
  };

  const handleRemoveParticipant = async (participantId: string) => {
    if (!confirm("Remove this participant from the session?")) return;

    try {
      setUpdatingId(participantId);
      const result = await removeParticipantFromSession(
        sessionId,
        participantId,
      );

      if (result.success) {
        setParticipants((prev) => prev.filter((p) => p.id !== participantId));
        loadParticipants();
      } else {
        setError(result.message || "Failed to remove participant");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to remove");
    } finally {
      setUpdatingId(null);
    }
  };

  const filteredParticipants = participants.filter((p) => {
    const matchesSearch =
      p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.roll_number.toLowerCase().includes(searchTerm.toLowerCase());

    if (filter === "checked_in") return matchesSearch && p.checked_in;
    if (filter === "missing") return matchesSearch && !p.checked_in;
    return matchesSearch;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
        <span className="ml-2 text-gray-600">Loading participants...</span>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Stats Bar */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 sm:gap-4">
        <div className="rounded-lg bg-white p-2 sm:p-4 border border-gray-200">
          <div className="text-xs sm:text-sm text-gray-600">Total</div>
          <div className="text-xl sm:text-2xl font-bold text-gray-900">{stats.total}</div>
        </div>
        <div className="rounded-lg bg-green-50 p-2 sm:p-4 border border-green-200">
          <div className="text-xs sm:text-sm text-green-700">Checked</div>
          <div className="text-xl sm:text-2xl font-bold text-green-900">
            {stats.checked_in}
          </div>
        </div>
        <div className="rounded-lg bg-red-50 p-2 sm:p-4 border border-red-200">
          <div className="text-xs sm:text-sm text-red-700">Missing</div>
          <div className="text-xl sm:text-2xl font-bold text-red-900">{stats.missing}</div>
        </div>
        <div className="rounded-lg bg-blue-50 p-2 sm:p-4 border border-blue-200">
          <div className="text-xs sm:text-sm text-blue-700">Progress</div>
          <div className="text-xl sm:text-2xl font-bold text-blue-900">
            {stats.percentage.toFixed(0)}%
          </div>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="rounded-lg bg-red-50 border border-red-200 p-4 text-red-800 flex items-start gap-3">
          <AlertCircle className="h-5 w-5 flex-shrink-0 mt-0.5" />
          <div className="flex-1">{error}</div>
          <button
            onClick={() => setError(null)}
            className="text-red-600 hover:text-red-700 font-medium"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Camera and Search */}
      {allowCheckin && (
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
          <label className="flex-1 relative">
            <input
              type="file"
              accept="image/*"
              capture="environment"
              onChange={handleCameraCapture}
              disabled={cameraLoading}
              className="absolute inset-0 opacity-0 cursor-pointer disabled:cursor-not-allowed"
            />
            <div className="flex items-center justify-center gap-2 rounded-lg border-2 border-dashed border-blue-300 bg-blue-50 px-4 py-3 text-blue-700 hover:border-blue-400 hover:bg-blue-100 transition-colors disabled:opacity-50 cursor-pointer">
              {cameraLoading ? (
                <>
                  <Loader2 className="h-5 w-5 animate-spin" />
                  Checking in...
                </>
              ) : (
                <>
                  <Camera className="h-5 w-5" />
                  Take Photo to Check In
                </>
              )}
            </div>
          </label>

          {/* Search */}
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search name or roll number..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-4 py-2 pl-10 text-gray-900 placeholder-gray-500 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>
        </div>
      )}

      {/* Filter Tabs */}
      <div className="flex gap-2 border-b border-gray-200">
        {(["all", "checked_in", "missing"] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-4 py-2 font-medium transition-colors border-b-2 ${
              filter === f
                ? "border-blue-600 text-blue-600"
                : "border-transparent text-gray-600 hover:text-gray-900"
            }`}
          >
            {f === "all" && "All"}
            {f === "checked_in" &&
              `Checked In (${participants.filter((p) => p.checked_in).length})`}
            {f === "missing" &&
              `Missing (${participants.filter((p) => !p.checked_in).length})`}
          </button>
        ))}
      </div>

      {/* Participants List */}
      {filteredParticipants.length === 0 ? (
        <div className="rounded-lg border-2 border-dashed border-gray-300 p-8 text-center">
          <UserCheck className="mx-auto h-12 w-12 text-gray-400" />
          <p className="mt-2 text-gray-600">No participants found</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filteredParticipants.map((participant) => (
            <div
              key={participant.id}
              className="flex items-center justify-between rounded-lg border border-gray-200 bg-white p-4 hover:shadow-md transition-shadow"
            >
              <div className="flex items-center gap-4 flex-1">
                {/* Photo */}
                {participant.photo_url && (
                  <img
                    src={participant.photo_url}
                    alt={participant.name}
                    className="h-12 w-12 rounded-lg object-cover"
                  />
                )}

                {/* Info */}
                <div className="flex-1">
                  <div className="font-medium text-gray-900">
                    {participant.name}
                  </div>
                  <div className="text-sm text-gray-600">
                    {participant.roll_number}
                  </div>
                  {participant.check_in_time && (
                    <div className="text-xs text-gray-500 mt-1">
                      Checked in:{" "}
                      {new Date(participant.check_in_time).toLocaleTimeString()}
                      {participant.check_in_method && (
                        <span className="ml-2 text-blue-600">
                          ({participant.check_in_method})
                        </span>
                      )}
                    </div>
                  )}
                  {participant.confidence !== undefined && (
                    <div className="text-xs text-gray-500">
                      Confidence: {(participant.confidence * 100).toFixed(1)}%
                    </div>
                  )}
                </div>
              </div>

              {/* Status */}
              <div className="flex items-center gap-2">
                {participant.checked_in ? (
                  <CheckCircle2 className="h-5 w-5 text-green-500" />
                ) : (
                  <XCircle className="h-5 w-5 text-red-500" />
                )}

                {/* Toggle Button */}
                <button
                  onClick={() => handleManualToggle(participant)}
                  disabled={updatingId === participant.id}
                  className={`rounded px-3 py-1 text-sm font-medium transition-colors disabled:opacity-50 ${
                    participant.checked_in
                      ? "bg-green-100 text-green-700 hover:bg-green-200"
                      : "bg-red-100 text-red-700 hover:bg-red-200"
                  }`}
                >
                  {updatingId === participant.id ? (
                    <Loader2 className="h-4 w-4 animate-spin inline" />
                  ) : participant.checked_in ? (
                    "Mark Absent"
                  ) : (
                    "Mark Present"
                  )}
                </button>

                {/* Delete Button */}
                <button
                  onClick={() => handleRemoveParticipant(participant.id)}
                  disabled={updatingId === participant.id}
                  className="text-gray-400 hover:text-red-600 transition-colors disabled:opacity-50"
                >
                  {updatingId === participant.id ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Trash2 className="h-4 w-4" />
                  )}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
