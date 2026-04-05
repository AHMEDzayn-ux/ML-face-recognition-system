"use client";

import { useEffect, useRef, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
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
  Sparkles,
  Plus,
} from "lucide-react";
import AddParticipantsDialog from "@/components/AddParticipantsDialog";
import {
  createTripConfirmation,
  getTripParticipants,
  markManualCheckin,
  removeParticipantFromTrip,
  updateTripStatus,
} from "@/lib/api";
import {
  TripParticipant,
  Trip,
  TripStats,
  TripConfirmation,
} from "@/lib/supabase";
import { supabase } from "@/lib/supabase";

export default function TripDashboardPage() {
  const params = useParams();
  const tripId = params.id as string;

  type CachedTripData = {
    trip: Trip;
    stats: TripStats;
    participants: TripParticipant[];
    confirmations: TripConfirmation[];
    selectedConfirmationId: string | null;
  };

  const [trip, setTrip] = useState<Trip | null>(null);
  const [stats, setStats] = useState<TripStats>({
    total: 0,
    checked_in: 0,
    missing: 0,
    percentage: 0,
  });
  const [confirmations, setConfirmations] = useState<TripConfirmation[]>([]);
  const [selectedConfirmationId, setSelectedConfirmationId] = useState<
    string | null
  >(null);
  const [participants, setParticipants] = useState<TripParticipant[]>([]);
  const [initialLoading, setInitialLoading] = useState(true);
  const [sessionLoadingId, setSessionLoadingId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [filter, setFilter] = useState<"all" | "checked_in" | "missing">("all");
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [confirmationName, setConfirmationName] = useState("");
  const [confirmationDescription, setConfirmationDescription] = useState("");
  const [creatingConfirmation, setCreatingConfirmation] = useState(false);
  const [removingParticipantId, setRemovingParticipantId] = useState<
    string | null
  >(null);
  const sessionCacheRef = useRef<Record<string, CachedTripData>>({});

  useEffect(() => {
    loadTripData(undefined, { showInitialLoader: true, useCache: false });

    // Subscribe to real-time updates and return cleanup function
    const cleanup = subscribeToUpdates();
    return cleanup;
  }, [tripId]);

  useEffect(() => {
    if (!trip) {
      return;
    }

    loadTripData(selectedConfirmationId || undefined);
  }, [selectedConfirmationId]);

  const loadTripData = async (
    confirmationId?: string,
    options: { showInitialLoader?: boolean; useCache?: boolean } = {},
  ) => {
    const sessionKey = confirmationId || "__default__";
    const useCache = options.useCache !== false;

    if (useCache && sessionCacheRef.current[sessionKey]) {
      const cached = sessionCacheRef.current[sessionKey];
      setTrip(cached.trip);
      setStats(cached.stats);
      setParticipants(cached.participants);
      setConfirmations(cached.confirmations);
      setSelectedConfirmationId(cached.selectedConfirmationId);
      return;
    }

    try {
      if (options.showInitialLoader) {
        setInitialLoading(true);
      } else {
        setSessionLoadingId(sessionKey);
      }

      const data = await getTripParticipants(tripId, undefined, confirmationId);

      if (data.success) {
        const resolvedSelectedConfirmationId =
          data.selected_confirmation?.id ||
          confirmationId ||
          data.confirmations?.[0]?.id ||
          null;

        const nextValue: CachedTripData = {
          trip: data.trip,
          stats: data.stats,
          participants: data.participants,
          confirmations: data.confirmations || [],
          selectedConfirmationId: resolvedSelectedConfirmationId,
        };

        sessionCacheRef.current[sessionKey] = nextValue;
        if (resolvedSelectedConfirmationId) {
          sessionCacheRef.current[resolvedSelectedConfirmationId] = nextValue;
        }

        setTrip(data.trip);
        setStats(data.stats);
        setParticipants(data.participants);
        setConfirmations(data.confirmations || []);
        setSelectedConfirmationId(resolvedSelectedConfirmationId);
      }
    } catch (error) {
      console.error("Error loading trip:", error);
    } finally {
      if (options.showInitialLoader) {
        setInitialLoading(false);
      } else {
        setSessionLoadingId(null);
      }
    }
  };

  const subscribeToUpdates = () => {
    const channel = supabase.channel(`trip_${tripId}_participants`);

    channel
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "trip_participants",
          filter: `trip_id=eq.${tripId}`,
        },
        (payload) => {
          console.log("Real-time update:", payload);
          loadTripData(selectedConfirmationId || undefined, {
            useCache: false,
          });
        },
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "trip_confirmation_checkins",
          filter: `trip_id=eq.${tripId}`,
        },
        () => {
          loadTripData(selectedConfirmationId || undefined, {
            useCache: false,
          });
        },
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "trip_confirmations",
          filter: `trip_id=eq.${tripId}`,
        },
        () => {
          loadTripData(selectedConfirmationId || undefined, {
            useCache: false,
          });
        },
      )
      .subscribe();

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
        selectedConfirmationId || undefined,
      );
      loadTripData(selectedConfirmationId || undefined, { useCache: false });
    } catch (error) {
      console.error("Error checking in:", error);
    }
  };

  const handleRemoveParticipant = async (participant: TripParticipant) => {
    try {
      setRemovingParticipantId(participant.id);
      await removeParticipantFromTrip(tripId, participant.id);
      await loadTripData(selectedConfirmationId || undefined, {
        useCache: false,
      });
    } catch (error) {
      console.error("Error removing participant:", error);
    } finally {
      setRemovingParticipantId(null);
    }
  };

  const handleConfirmationChange = (confirmationId: string) => {
    setSelectedConfirmationId(confirmationId);
  };

  const handleCreateConfirmation = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!confirmationName.trim()) {
      return;
    }

    try {
      setCreatingConfirmation(true);
      const result = await createTripConfirmation(tripId, {
        name: confirmationName.trim(),
        description: confirmationDescription.trim() || undefined,
      });

      setConfirmationName("");
      setConfirmationDescription("");

      const newConfirmationId = result.confirmation?.id;
      if (newConfirmationId) {
        setSelectedConfirmationId(newConfirmationId);
      }
    } catch (error) {
      console.error("Error creating confirmation:", error);
    } finally {
      setCreatingConfirmation(false);
    }
  };

  const handleUpdateStatus = async (status: string) => {
    try {
      await updateTripStatus(tripId, status);
      loadTripData(selectedConfirmationId || undefined, { useCache: false });
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

  if (initialLoading) {
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
                href={`/trips/${tripId}/camera${selectedConfirmationId ? `?confirmationId=${selectedConfirmationId}` : ""}`}
                className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-xl font-semibold shadow-lg shadow-blue-600/30"
              >
                <Camera className="h-5 w-5" />
                Camera
              </Link>
            </div>
          </div>
        </div>

        {/* Confirmation Occasions */}
        <div className="bg-white rounded-xl border border-slate-200 p-6 mb-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-blue-600" />
                Confirmation Occasions
              </h2>
              <p className="text-sm text-slate-600 mt-1">
                Create separate sessions for each headcount so you can track who
                is present or missing each time.
              </p>
            </div>
            <span className="text-sm font-semibold text-slate-500">
              {sessionLoadingId
                ? "Refreshing..."
                : `${confirmations.length} total`}
            </span>
          </div>

          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {confirmations.length === 0 ? (
              <div className="md:col-span-2 xl:col-span-3 rounded-xl border border-dashed border-slate-300 bg-slate-50 p-4 text-sm text-slate-600">
                No confirmation occasions yet. Use the form below to add the
                first one.
              </div>
            ) : (
              confirmations.map((confirmation) => {
                const isSelected = confirmation.id === selectedConfirmationId;

                return (
                  <button
                    key={confirmation.id}
                    type="button"
                    onClick={() => handleConfirmationChange(confirmation.id)}
                    className={`text-left rounded-xl border p-4 transition-all ${
                      isSelected
                        ? "border-blue-500 bg-blue-50 shadow-md"
                        : "border-slate-200 bg-slate-50 hover:bg-slate-100"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="font-semibold text-slate-900">
                          {confirmation.name}
                        </div>
                        {confirmation.description && (
                          <div className="text-sm text-slate-600 mt-1">
                            {confirmation.description}
                          </div>
                        )}
                      </div>
                      {isSelected && (
                        <span className="text-xs font-semibold px-2 py-1 rounded-full bg-blue-600 text-white">
                          Active
                        </span>
                      )}
                    </div>

                    <div className="mt-4 flex items-center gap-4 text-sm">
                      <span className="text-green-700 font-semibold">
                        Present {confirmation.checked_in || 0}
                      </span>
                      <span className="text-red-700 font-semibold">
                        Missing {confirmation.missing || 0}
                      </span>
                      {sessionLoadingId === confirmation.id && (
                        <span className="text-slate-500 text-xs font-semibold">
                          Loading...
                        </span>
                      )}
                    </div>
                  </button>
                );
              })
            )}
          </div>

          <form
            onSubmit={handleCreateConfirmation}
            className="mt-6 grid gap-3 md:grid-cols-[1fr_1fr_auto]"
          >
            <input
              type="text"
              value={confirmationName}
              onChange={(event) => setConfirmationName(event.target.value)}
              placeholder="New occasion name, e.g. Morning headcount"
              className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <input
              type="text"
              value={confirmationDescription}
              onChange={(event) =>
                setConfirmationDescription(event.target.value)
              }
              placeholder="Optional note or location"
              className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <button
              type="submit"
              disabled={creatingConfirmation || !confirmationName.trim()}
              className="inline-flex items-center justify-center gap-2 px-4 py-3 bg-slate-900 hover:bg-slate-800 text-white rounded-lg font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Plus className="h-4 w-4" />
              {creatingConfirmation ? "Adding..." : "Add Occasion"}
            </button>
          </form>
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
                Present ({stats.checked_in})
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
                        Present
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

                    <div className="flex items-center gap-2">
                      {!participant.checked_in && (
                        <button
                          onClick={() => handleManualCheckin(participant)}
                          className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold text-sm transition-all"
                        >
                          <UserCheck className="h-4 w-4" />
                          Present
                        </button>
                      )}

                      <button
                        onClick={() => handleRemoveParticipant(participant)}
                        disabled={removingParticipantId === participant.id}
                        className="flex items-center gap-2 px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-lg font-semibold text-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {removingParticipantId === participant.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <XCircle className="h-4 w-4" />
                        )}
                        Remove
                      </button>
                    </div>
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
