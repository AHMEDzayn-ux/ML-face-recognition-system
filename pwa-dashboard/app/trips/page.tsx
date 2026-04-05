"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { getTrips, deleteTrip } from "@/lib/api";
import { Trip } from "@/lib/supabase";
import {
  Plus,
  Bus,
  Calendar,
  Clock,
  Users,
  ChevronRight,
  Loader2,
  Trash2,
} from "lucide-react";

export default function TripsPage() {
  const router = useRouter();
  const [trips, setTrips] = useState<Trip[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>("all");
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);

  useEffect(() => {
    loadTrips();
  }, [filter]);

  const loadTrips = async () => {
    try {
      setLoading(true);
      const statusFilter = filter === "all" ? undefined : filter;
      const data = await getTrips(statusFilter);
      setTrips(data.trips || []);
    } catch (error) {
      console.error("Error loading trips:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteTrip = async (tripId: string, tripName: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (deleteConfirm !== tripId) {
      setDeleteConfirm(tripId);
      setTimeout(() => setDeleteConfirm(null), 3000);
      return;
    }

    setDeleting(tripId);
    try {
      await deleteTrip(tripId);
      setTrips((prev) => prev.filter((t) => t.id !== tripId));
      setDeleteConfirm(null);
    } catch (err: any) {
      alert(`Failed to delete trip: ${err.message}`);
    } finally {
      setDeleting(null);
    }
  };

  const getStatusBadge = (status: string) => {
    const badges = {
      planning: "bg-blue-100 text-blue-700 border-blue-200",
      active: "bg-green-100 text-green-700 border-green-200",
      completed: "bg-gray-100 text-gray-700 border-gray-200",
      cancelled: "bg-red-100 text-red-700 border-red-200",
    };
    return badges[status as keyof typeof badges] || badges.planning;
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const formatTime = (timeString: string | null) => {
    if (!timeString) return "Not set";
    return timeString.substring(0, 5); // HH:MM
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-sky-50/30">
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-3xl font-bold text-slate-900 mb-2">
                Trip Management
              </h1>
              <p className="text-slate-600">
                Create and manage trip sessions for efficient group attendance
              </p>
            </div>
            <Link
              href="/trips/new"
              className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-xl font-semibold shadow-lg shadow-blue-600/30 transition-all"
            >
              <Plus className="h-5 w-5" />
              New Trip
            </Link>
          </div>

          {/* Filters */}
          <div className="flex gap-2 flex-wrap">
            {["all", "planning", "active", "completed", "cancelled"].map(
              (status) => (
                <button
                  key={status}
                  onClick={() => setFilter(status)}
                  className={`px-4 py-2 rounded-lg font-medium text-sm transition-all ${
                    filter === status
                      ? "bg-slate-900 text-white shadow-md"
                      : "bg-white text-slate-600 hover:bg-slate-100 border border-slate-200"
                  }`}
                >
                  {status.charAt(0).toUpperCase() + status.slice(1)}
                </button>
              ),
            )}
          </div>
        </div>

        {/* Loading State */}
        {loading && (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
          </div>
        )}

        {/* Empty State */}
        {!loading && trips.length === 0 && (
          <div className="text-center py-20">
            <Bus className="h-16 w-16 text-slate-300 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-slate-900 mb-2">
              No trips found
            </h3>
            <p className="text-slate-600 mb-6">
              {filter === "all"
                ? "Create your first trip to get started"
                : `No ${filter} trips found`}
            </p>
            {filter === "all" && (
              <Link
                href="/trips/new"
                className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-xl font-semibold shadow-lg shadow-blue-600/30 transition-all"
              >
                <Plus className="h-5 w-5" />
                Create First Trip
              </Link>
            )}
          </div>
        )}

        {/* Trips Grid */}
        {!loading && trips.length > 0 && (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {trips.map((trip) => (
              <Link
                key={trip.id}
                href={`/trips/${trip.id}`}
                className="group bg-white rounded-xl border border-slate-200 p-6 hover:shadow-lg hover:border-blue-300 transition-all"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-blue-700 text-white shadow-md">
                      <Bus className="h-6 w-6" />
                    </div>
                    <div>
                      <h3 className="font-bold text-slate-900 text-lg group-hover:text-blue-600 transition-colors">
                        {trip.name}
                      </h3>
                      <span
                        className={`inline-block mt-1 px-2 py-1 text-xs font-semibold rounded-md border ${getStatusBadge(
                          trip.status,
                        )}`}
                      >
                        {trip.status.toUpperCase()}
                      </span>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={(e) => handleDeleteTrip(trip.id, trip.name, e)}
                      disabled={deleting === trip.id}
                      className={`p-2 rounded-lg transition-all ${
                        deleteConfirm === trip.id
                          ? 'bg-red-600 text-white hover:bg-red-700'
                          : 'bg-slate-100 text-slate-600 hover:bg-red-50 hover:text-red-600'
                      } ${deleting === trip.id ? 'opacity-50 cursor-not-allowed' : ''}`}
                      title={deleteConfirm === trip.id ? 'Click again to confirm' : 'Delete trip'}
                    >
                      {deleting === trip.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Trash2 className="h-4 w-4" />
                      )}
                    </button>
                    <ChevronRight className="h-5 w-5 text-slate-400 group-hover:text-blue-600 group-hover:translate-x-1 transition-all" />
                  </div>
                </div>

                {trip.description && (
                  <p className="text-sm text-slate-600 mb-4 line-clamp-2">
                    {trip.description}
                  </p>
                )}

                <div className="space-y-2 text-sm">
                  <div className="flex items-center gap-2 text-slate-600">
                    <Calendar className="h-4 w-4" />
                    <span>{formatDate(trip.trip_date)}</span>
                  </div>
                  <div className="flex items-center gap-2 text-slate-600">
                    <Clock className="h-4 w-4" />
                    <span>Departure: {formatTime(trip.departure_time)}</span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
