"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  getTripParticipants,
  markManualCheckin,
  updateTripStatus,
} from "@/lib/api";
import { TripParticipant, Trip, TripStats } from "@/lib/supabase";
import { supabase } from "@/lib/supabase";
import AddParticipantsDialog from "@/components/AddParticipantsDialog";
import {
  ArrowLeft,
  Camera,
  CheckCircle2,
  XCircle,
  Loader2,
  Search,
  Clock,
  Calendar,
  Users,
  AlertCircle,
  UserCheck,
  UserPlus,
} from "lucide-react";

export default function TripDashboardPage() {
  const params = useParams();
  const router = useRouter();
  const tripId = params.id as string;

  const [trip, setTrip] = useState<Trip | null>(null);
  const [stats, setStats] = useState<TripStats>({
    total: 0,
    checked_in: 0,
    missing: 0,
    percentage: 0,
  });
  const [participants, setParticipants] = useState<TripParticipant[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filter, setFilter] = useState<"all" | "checked_in" | "missing">("all");
  const [showAddDialog, setShowAddDialog] = useState(false);

  useEffect(() => {
    loadTripData();
    
    // Subscribe to real-time updates and return cleanup function
    const cleanup = subscribeToUpdates();
    return cleanup;
  }, [tripId]);

  const loadTripData = async () => {
    try {
      setLoading(true);
      const data = await getTripParticipants(tripId);

      if (data.success) {
        setTrip(data.trip);
        setStats(data.stats);
        setParticipants(data.participants);
      }
    } catch (error) {
      console.error("Error loading trip:", error);
    } finally {
      setLoading(false);
    }
  };

  const subscribeToUpdates = () => {
    const channel = supabase.channel(`trip_${tripId}_participants`);
    
    channel.on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "trip_participants",
        filter: `trip_id=eq.${tripId}`,
      },
      (payload) => {
        console.log("Real-time update:", payload);
        loadTripData();
      }
    ).subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  };

  const handleManualCheckin = async (participant: TripParticipant) => {
    try {
      await markManualCheckin(
        tripId,
        participant.id,
        undefined,
        "Manual check-in from dashboard",
      );
      loadTripData();
    } catch (error) {
      console.error("Error checking in:", error);
    }
  };

  const handleUpdateStatus = async (status: string) => {
    try {
      await updateTripStatus(tripId, status);
      loadTripData();
    } catch (error) {
      console.error("Error updating status:", error);
    }
  };

  const filteredParticipants = participants.filter((p) => {
    const matchesSearch =
      p.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.roll_number.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesFilter =
      filter === "all" ||
      (filter === "checked_in" && p.checked_in) ||
      (filter === "missing" && !p.checked_in);

    return matchesSearch && matchesFilter;
  });

  const missingParticipants = participants.filter((p) => !p.checked_in);
  const checkedInParticipants = participants.filter((p) => p.checked_in);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-sky-50/30 flex items-center justify-center">
        <Loader2 className="h-12 w-12 animate-spin text-blue-600" />
      </div>
    );
  }

  if (!trip) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-sky-50/30 flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="h-16 w-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-slate-900 mb-2">
            Trip Not Found
          </h2>
          <Link href="/trips" className="text-blue-600 hover:underline">
            Back to Trips
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-sky-50/30">
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-6">
          <Link
            href="/trips"
            className="inline-flex items-center gap-2 text-slate-600 hover:text-slate-900 mb-4"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Trips
          </Link>

          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-3xl font-bold text-slate-900 mb-2">
                {trip.name}
              </h1>
              {trip.description && (
                <p className="text-slate-600">{trip.description}</p>
              )}
              <div className="flex items-center gap-4 mt-3 text-sm text-slate-600">
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  {new Date(trip.trip_date).toLocaleDateString()}
                </div>
                {trip.departure_time && (
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4" />
                    Departure: {trip.departure_time.substring(0, 5)}
                  </div>
                )}
                <span
                  className={`px-3 py-1 rounded-full text-xs font-semibold ${
                    trip.status === "planning"
                      ? "bg-blue-100 text-blue-700"
                      : trip.status === "active"
                        ? "bg-green-100 text-green-700"
                        : trip.status === "completed"
                          ? "bg-gray-100 text-gray-700"
                          : "bg-red-100 text-red-700"
                  }`}
                >
                  {trip.status.toUpperCase()}
                </span>
              </div>
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => setShowAddDialog(true)}
                className="flex items-center gap-2 px-4 py-2 bg-slate-600 hover:bg-slate-700 text-white rounded-lg font-semibold text-sm"
              >
                <UserPlus className="h-4 w-4" />
                Add Participants
              </button>
              {trip.status === "planning" && (
                <button
                  onClick={() => handleUpdateStatus("active")}
                  className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-semibold text-sm"
                >
                  Start Trip
                </button>
              )}
              <Link
                href={`/trips/${tripId}/camera`}
                className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-xl font-semibold shadow-lg shadow-blue-600/30"
              >
                <Camera className="h-5 w-5" />
                Camera
              </Link>
            </div>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="bg-white rounded-xl border border-slate-200 p-6 mb-6 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-bold text-slate-900">
              Check-in Progress
            </h2>
            <span className="text-3xl font-bold text-blue-600">
              {stats.checked_in}/{stats.total}
            </span>
          </div>
          <div className="w-full bg-slate-200 rounded-full h-4 overflow-hidden">
            <div
              className="bg-gradient-to-r from-blue-500 to-green-500 h-full transition-all duration-500"
              style={{ width: `${stats.percentage}%` }}
            />
          </div>
          <div className="flex items-center justify-between mt-2 text-sm text-slate-600">
            <span>{stats.percentage.toFixed(1)}% Complete</span>
            <span>{stats.missing} Missing</span>
          </div>
        </div>

        {/* Search and Filter */}
        <div className="bg-white rounded-xl border border-slate-200 p-4 mb-6 shadow-sm">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-slate-400" />
              <input
                type="text"
                placeholder="Search by name or roll number..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setFilter("all")}
                className={`px-4 py-2 rounded-lg font-medium text-sm ${
                  filter === "all"
                    ? "bg-slate-900 text-white"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                All ({stats.total})
              </button>
              <button
                onClick={() => setFilter("missing")}
                className={`px-4 py-2 rounded-lg font-medium text-sm ${
                  filter === "missing"
                    ? "bg-red-600 text-white"
                    : "bg-red-50 text-red-600 hover:bg-red-100"
                }`}
              >
                Missing ({stats.missing})
              </button>
              <button
                onClick={() => setFilter("checked_in")}
                className={`px-4 py-2 rounded-lg font-medium text-sm ${
                  filter === "checked_in"
                    ? "bg-green-600 text-white"
                    : "bg-green-50 text-green-600 hover:bg-green-100"
                }`}
              >
                Checked In ({stats.checked_in})
              </button>
            </div>
          </div>
        </div>

        {/* Missing Students Alert */}
        {stats.missing > 0 && filter !== "checked_in" && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-6 mb-6">
            <div className="flex items-start gap-3">
              <AlertCircle className="h-6 w-6 text-red-600 mt-0.5" />
              <div className="flex-1">
                <h3 className="font-bold text-red-900 mb-2">
                  {stats.missing} Student{stats.missing !== 1 ? "s" : ""}{" "}
                  Missing
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                  {missingParticipants.slice(0, 6).map((p) => (
                    <div
                      key={p.id}
                      className="flex items-center justify-between bg-white rounded-lg px-3 py-2 text-sm"
                    >
                      <div>
                        <div className="font-semibold text-red-900">
                          {p.name}
                        </div>
                        <div className="text-xs text-red-600">
                          {p.roll_number}
                        </div>
                      </div>
                      <button
                        onClick={() => handleManualCheckin(p)}
                        className="px-2 py-1 bg-red-600 hover:bg-red-700 text-white rounded text-xs font-semibold"
                      >
                        Check In
                      </button>
                    </div>
                  ))}
                </div>
                {missingParticipants.length > 6 && (
                  <p className="text-sm text-red-700 mt-2">
                    +{missingParticipants.length - 6} more missing
                  </p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Participants List */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-4 border-b border-slate-200 bg-slate-50">
            <h3 className="font-bold text-slate-900 flex items-center gap-2">
              <Users className="h-5 w-5" />
              Participants ({filteredParticipants.length})
            </h3>
          </div>

          <div className="divide-y divide-slate-200">
            {filteredParticipants.length === 0 ? (
              <div className="text-center py-12 text-slate-500">
                <Users className="h-12 w-12 mx-auto mb-3 text-slate-300" />
                <p>No participants found</p>
              </div>
            ) : (
              filteredParticipants.map((participant) => (
                <div
                  key={participant.id}
                  className={`p-4 hover:bg-slate-50 transition-colors ${
                    participant.checked_in ? "bg-green-50/30" : ""
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div
                        className={`flex-shrink-0 h-12 w-12 rounded-full flex items-center justify-center ${
                          participant.checked_in
                            ? "bg-green-100 text-green-600"
                            : "bg-red-100 text-red-600"
                        }`}
                      >
                        {participant.checked_in ? (
                          <CheckCircle2 className="h-6 w-6" />
                        ) : (
                          <XCircle className="h-6 w-6" />
                        )}
                      </div>
                      <div>
                        <div className="font-semibold text-slate-900">
                          {participant.name}
                        </div>
                        <div className="text-sm text-slate-600">
                          {participant.roll_number}
                        </div>
                        {participant.checked_in &&
                          participant.check_in_time && (
                            <div className="text-xs text-green-600 mt-1 flex items-center gap-2">
                              <Clock className="h-3 w-3" />
                              {new Date(
                                participant.check_in_time,
                              ).toLocaleString()}
                              {participant.check_in_method && (
                                <span className="px-2 py-0.5 bg-green-100 rounded text-green-700 font-medium">
                                  {participant.check_in_method}
                                </span>
                              )}
                              {participant.confidence && (
                                <span className="text-green-600">
                                  {participant.confidence.toFixed(1)}%
                                </span>
                              )}
                            </div>
                          )}
                      </div>
                    </div>

                    {!participant.checked_in && (
                      <button
                        onClick={() => handleManualCheckin(participant)}
                        className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold text-sm transition-all"
                      >
                        <UserCheck className="h-4 w-4" />
                        Check In
                      </button>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Add Participants Dialog */}
        {showAddDialog && (
          <AddParticipantsDialog
            tripId={tripId}
            onClose={() => setShowAddDialog(false)}
            onSuccess={() => loadTripData()}
          />
        )}
      </div>
    </div>
  );
}
