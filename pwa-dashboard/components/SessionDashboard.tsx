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
    <div className="space-y-6">
      {selectedSession ? (
        /* Session Details View */
        <div>
          {/* Back Button */}
          <button
            onClick={() => setSelectedSession(null)}
            className="flex items-center gap-2 text-blue-600 hover:text-blue-700 font-medium mb-4"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Sessions
          </button>

          {/* Session Header */}
          <div className="rounded-lg bg-white border border-gray-200 p-6 mb-6">
            <div className="flex items-start justify-between">
              <div>
                <h2 className="text-2xl font-bold text-gray-900">
                  {selectedSession.name}
                </h2>
                {selectedSession.description && (
                  <p className="mt-2 text-gray-600">
                    {selectedSession.description}
                  </p>
                )}
                <div className="mt-4 flex flex-wrap gap-4 text-sm text-gray-600">
                  <div>
                    📅{" "}
                    {new Date(
                      selectedSession.session_date,
                    ).toLocaleDateString()}
                  </div>
                  {selectedSession.start_time && (
                    <div>
                      🕐 {selectedSession.start_time}
                      {selectedSession.end_time &&
                        ` - ${selectedSession.end_time}`}
                    </div>
                  )}
                  <div>👥 {selectedSession.stats?.total} expected</div>
                </div>
              </div>
              <span
                className={`inline-block rounded-full px-4 py-1 text-sm font-semibold ${
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
