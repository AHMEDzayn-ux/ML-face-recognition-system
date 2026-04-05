"use client";

import { useState } from "react";
import SessionsList from "./SessionsList";
import CreateSessionDialog from "./CreateSessionDialog";
import SessionParticipantsList from "./SessionParticipantsList";
import { ArrowLeft } from "lucide-react";

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

interface SessionDashboardProps {
  tripId: string;
}

export default function SessionDashboard({ tripId }: SessionDashboardProps) {
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [selectedSession, setSelectedSession] =
    useState<SessionListItem | null>(null);

  const handleSessionCreated = (session: SessionListItem) => {
    // Optionally update UI after session creation
    console.log("Session created:", session);
  };

  const handleSelectSession = (session: SessionListItem) => {
    setSelectedSession(session);
  };

  return (
    <div className="space-y-3">
      {selectedSession ? (
        /* Session Details View */
        <div>
          {/* Back Button */}
          <button
            onClick={() => setSelectedSession(null)}
            className="flex items-center gap-1 text-blue-600 hover:text-blue-700 font-medium text-sm mb-2"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Back
          </button>

          {/* Session Header */}
          <div className="rounded bg-white border border-gray-200 p-4 mb-3">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0 flex-1">
                <h2 className="text-lg font-bold text-gray-900">
                  {selectedSession.name}
                </h2>
                {selectedSession.description && (
                  <p className="mt-1 text-gray-600 text-sm">
                    {selectedSession.description}
                  </p>
                )}
                <div className="mt-2 flex flex-wrap gap-2 text-xs text-gray-600">
                  <div>
                    📅 {new Date(
                      selectedSession.session_date,
                    ).toLocaleDateString()}
                  </div>
                  {selectedSession.start_time && (
                    <div>
                      🕐 {selectedSession.start_time}{selectedSession.end_time &&
                        ` - ${selectedSession.end_time}`}
                    </div>
                  )}
                  <div>👥 {selectedSession.stats?.total}</div>
                </div>
              </div>
              <span
                className={`inline-block rounded px-2 py-1 text-xs font-semibold flex-shrink-0 ${
                  selectedSession.status === "active"
                    ? "bg-green-100 text-green-800"
                    : selectedSession.status === "completed"
                      ? "bg-gray-100 text-gray-800"
                      : selectedSession.status === "cancelled"
                        ? "bg-red-100 text-red-800"
                        : "bg-blue-100 text-blue-800"
                }`}
              >
                {selectedSession.status.charAt(0).toUpperCase() +
                  selectedSession.status.slice(1)}
              </span>
            </div>
          </div>

          {/* Session Participants */}
          <div className="rounded-lg bg-white border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Attendance
            </h3>
            <SessionParticipantsList
              sessionId={selectedSession.id}
              tripId={tripId}
              allowCheckin={selectedSession.status === "active"}
            />
          </div>
        </div>
      ) : (
        /* Sessions List View */
        <div className="rounded-lg bg-white border border-gray-200 p-6">
          <SessionsList
            tripId={tripId}
            onCreateSession={() => setShowCreateDialog(true)}
            onSelectSession={handleSelectSession}
          />
        </div>
      )}

      {/* Create Session Dialog */}
      <CreateSessionDialog
        tripId={tripId}
        isOpen={showCreateDialog}
        onClose={() => setShowCreateDialog(false)}
        onSessionCreated={handleSessionCreated}
      />
    </div>
  );
}
