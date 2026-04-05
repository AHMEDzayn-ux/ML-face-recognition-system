"use client";

import { useEffect, useState, useCallback } from "react";
import { getSessions, deleteSession, updateSessionStatus } from "@/lib/api";
import { supabase } from "@/lib/supabase";
import {
  Clock,
  Calendar,
  Users,
  Trash2,
  Plus,
  ChevronRight,
  AlertCircle,
  CheckCircle2,
  Loader2,
} from "lucide-react";

interface Session {
  id: string;
  trip_id: string;
  name: string;
  description?: string;
  session_date: string;
  start_time?: string;
  end_time?: string;
  status: "planning" | "active" | "completed" | "cancelled";
  expected_participants: number;
  created_at: string;
  updated_at: string;
}

interface SessionStats {
  total: number;
  checked_in: number;
  missing: number;
  percentage: number;
}

interface SessionListItem extends Session {
  stats: SessionStats;
}

interface SessionsListProps {
  tripId: string;
  onCreateSession?: () => void;
  onSelectSession?: (session: SessionListItem) => void;
}

const statusColors = {
  planning: "bg-blue-100 text-blue-800",
  active: "bg-green-100 text-green-800",
  completed: "bg-gray-100 text-gray-800",
  cancelled: "bg-red-100 text-red-800",
};

const statusIcons = {
  planning: Clock,
  active: CheckCircle2,
  completed: CheckCircle2,
  cancelled: AlertCircle,
};

export default function SessionsList({
  tripId,
  onCreateSession,
  onSelectSession,
}: SessionsListProps) {
  const [sessions, setSessions] = useState<SessionListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const loadSessions = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await getSessions(tripId);
      if (data.success && data.sessions) {
        setSessions(data.sessions);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load sessions");
      console.error("Error loading sessions:", err);
    } finally {
      setLoading(false);
    }
  }, [tripId]);

  useEffect(() => {
    loadSessions();

    const channel = supabase.channel(`trip_${tripId}_sessions`);
    channel
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "trip_sessions",
          filter: `trip_id=eq.${tripId}`,
        },
        () => {
          console.log("Sessions updated in real-time");
          loadSessions();
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [tripId, loadSessions]);

  const handleDeleteSession = async (sessionId: string) => {
    if (!confirm("Are you sure you want to delete this session?")) return;

    try {
      setDeletingId(sessionId);
      const result = await deleteSession(sessionId);

      if (result.success) {
        setSessions((prev) => prev.filter((s) => s.id !== sessionId));
      } else {
        setError(result.message || "Failed to delete session");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete session");
    } finally {
      setDeletingId(null);
    }
  };

  const handleStatusChange = async (
    sessionId: string,
    newStatus: "planning" | "active" | "completed" | "cancelled",
  ) => {
    try {
      const result = await updateSessionStatus(sessionId, newStatus);

      if (result.success) {
        setSessions((prev) =>
          prev.map((s) =>
            s.id === sessionId ? { ...s, status: newStatus } : s,
          ),
        );
      } else {
        setError(result.message || "Failed to update session status");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update status");
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
        <span className="ml-2 text-gray-600">Loading sessions...</span>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900">
          Sessions ({sessions.length})
        </h3>
        <button
          onClick={onCreateSession}
          className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 transition-colors"
        >
          <Plus className="h-4 w-4" />
          New Session
        </button>
      </div>

      {error && (
        <div className="rounded-lg bg-red-50 border border-red-200 p-4 text-red-800">
          {error}
        </div>
      )}

      {sessions.length === 0 ? (
        <div className="rounded-lg border-2 border-dashed border-gray-300 p-8 text-center">
          <Calendar className="mx-auto h-12 w-12 text-gray-400" />
          <p className="mt-2 text-gray-600">No sessions yet</p>
          <p className="text-sm text-gray-500">
            Create a session to start taking attendance
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {sessions.map((session) => {
            const StatusIcon = statusIcons[session.status];

            return (
              <div
                key={session.id}
                className="rounded-lg border border-gray-200 bg-white p-4 hover:shadow-lg transition-shadow cursor-pointer"
                onClick={() => onSelectSession?.(session)}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h4 className="font-semibold text-gray-900">
                        {session.name}
                      </h4>
                      <span
                        className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-sm font-medium ${
                          statusColors[session.status]
                        }`}
                      >
                        <StatusIcon className="h-3 w-3" />
                        {session.status.charAt(0).toUpperCase() +
                          session.status.slice(1)}
                      </span>
                    </div>
                    {session.description && (
                      <p className="mt-1 text-sm text-gray-600">
                        {session.description}
                      </p>
                    )}
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteSession(session.id);
                    }}
                    disabled={deletingId === session.id}
                    className="ml-2 text-gray-400 hover:text-red-600 transition-colors disabled:opacity-50"
                  >
                    {deletingId === session.id ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Trash2 className="h-4 w-4" />
                    )}
                  </button>
                </div>

                <div className="mt-4 space-y-2 text-sm text-gray-600">
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    {new Date(session.session_date).toLocaleDateString()}
                  </div>
                  {session.start_time && (
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4" />
                      {session.start_time}
                      {session.end_time && ` - ${session.end_time}`}
                    </div>
                  )}
                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4" />
                    {session.stats?.checked_in || 0} of{" "}
                    {session.stats?.total || session.expected_participants}{" "}
                    checked in
                  </div>
                </div>

                {session.stats && (
                  <div className="mt-4">
                    <div className="flex items-center justify-between text-xs text-gray-600 mb-1">
                      <span>Attendance</span>
                      <span className="font-semibold">
                        {session.stats.percentage.toFixed(0)}%
                      </span>
                    </div>
                    <div className="h-2 rounded-full bg-gray-200 overflow-hidden">
                      <div
                        className="h-full bg-green-500"
                        style={{
                          width: `${session.stats.percentage}%`,
                        }}
                      />
                    </div>
                  </div>
                )}

                <div className="mt-4 pt-4 border-t border-gray-200">
                  <select
                    value={session.status}
                    onChange={(e) =>
                      handleStatusChange(
                        session.id,
                        e.target.value as
                          | "planning"
                          | "active"
                          | "completed"
                          | "cancelled",
                      )
                    }
                    onClick={(e) => e.stopPropagation()}
                    className="w-full rounded border border-gray-300 px-2 py-1 text-sm text-gray-700 hover:border-gray-400"
                  >
                    <option value="planning">Planning</option>
                    <option value="active">Active</option>
                    <option value="completed">Completed</option>
                    <option value="cancelled">Cancelled</option>
                  </select>
                </div>

                <div className="mt-4 flex items-center gap-2 text-blue-600 hover:text-blue-700 text-sm font-medium">
                  View Details
                  <ChevronRight className="h-4 w-4" />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
