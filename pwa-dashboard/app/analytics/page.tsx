"use client";

import { useEffect, useState } from "react";
import { supabase, type Trip, type TripStats } from "@/lib/supabase";
import {
  BarChart3,
  TrendingUp,
  Calendar,
  Users,
  Clock,
  Award,
  AlertTriangle,
  Activity,
  Target,
  CheckCircle2,
  Search,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Bus,
  MapPin,
} from "lucide-react";

interface TripWithMetrics extends Trip {
  totalParticipants: number;
  checkedIn: number;
  checkInRate: number;
}

interface AnalyticsData {
  trips: TripWithMetrics[];
  totalTrips: number;
  activeTrips: number;
  completedTrips: number;
  totalParticipants: number;
  avgCheckInRate: number;
  recentActivity: { date: string; checkins: number }[];
  topTrips: TripWithMetrics[];
  needsAttention: TripWithMetrics[];
}

export default function AnalyticsPage() {
  const [data, setData] = useState<AnalyticsData>({
    trips: [],
    totalTrips: 0,
    activeTrips: 0,
    completedTrips: 0,
    totalParticipants: 0,
    avgCheckInRate: 0,
    recentActivity: [],
    topTrips: [],
    needsAttention: [],
  });
  const [loading, setLoading] = useState(true);

  const [tableSearch, setTableSearch] = useState("");
  const [sortField, setSortField] =
    useState<keyof TripWithMetrics>("trip_date");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(15);

  useEffect(() => {
    fetchAnalytics();
  }, []);

  async function fetchAnalytics() {
    try {
      const { data: tripsData, error: tripsError } = await supabase
        .from("trips")
        .select("*")
        .order("trip_date", { ascending: false });

      if (tripsError) throw tripsError;
      const trips = (tripsData as Trip[]) || [];

      const { data: participantsData, error: participantsError } =
        await supabase
          .from("trip_participants")
          .select("trip_id, expected, checked_in");

      if (participantsError) throw participantsError;
      const participants = participantsData || [];

      const tripsWithMetrics: TripWithMetrics[] = trips.map((trip) => {
        const tripParts = participants.filter(
          (p) => p.trip_id === trip.id && p.expected,
        );
        const total = tripParts.length;
        const checkedIn = tripParts.filter((p) => p.checked_in).length;
        const rate = total > 0 ? (checkedIn / total) * 100 : 0;

        return {
          ...trip,
          totalParticipants: total,
          checkedIn,
          checkInRate: rate,
        };
      });

      const activeTripsCount = trips.filter(
        (t) => t.status === "active",
      ).length;
      const completedTripsCount = trips.filter(
        (t) => t.status === "completed",
      ).length;
      const totalParts = participants.filter((p) => p.expected).length;
      const totalCheckedIn = participants.filter(
        (p) => p.expected && p.checked_in,
      ).length;
      const overallRate =
        totalParts > 0 ? (totalCheckedIn / totalParts) * 100 : 0;

      const topTrips = [...tripsWithMetrics]
        .filter((t) => t.totalParticipants >= 2)
        .sort((a, b) => b.checkInRate - a.checkInRate)
        .slice(0, 5);

      const needsAttention = [...tripsWithMetrics]
        .filter((t) => t.totalParticipants >= 2 && t.checkInRate < 80)
        .sort((a, b) => a.checkInRate - b.checkInRate)
        .slice(0, 5);

      setData({
        trips: tripsWithMetrics,
        totalTrips: trips.length,
        activeTrips: activeTripsCount,
        completedTrips: completedTripsCount,
        totalParticipants: totalParts,
        avgCheckInRate: overallRate,
        recentActivity: [],
        topTrips,
        needsAttention,
      });
    } catch (error) {
      console.error("Error fetching analytics:", error);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center gap-4">
          <div className="w-8 h-8 border-4 border-sky-600 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-slate-500 font-medium">
            Loading Trip Analytics...
          </p>
        </div>
      </div>
    );
  }

  const filteredTrips = data.trips.filter((trip) => {
    const searchLower = tableSearch.toLowerCase();
    return (
      trip.name.toLowerCase().includes(searchLower) ||
      (trip.description &&
        trip.description.toLowerCase().includes(searchLower)) ||
      trip.status.toLowerCase().includes(searchLower)
    );
  });

  const sortedTrips = [...filteredTrips].sort((a, b) => {
    let aValue = a[sortField];
    let bValue = b[sortField];

    if (aValue === null) aValue = "";
    if (bValue === null) bValue = "";

    if (typeof aValue === "string" && typeof bValue === "string") {
      return sortDirection === "asc"
        ? aValue.localeCompare(bValue)
        : bValue.localeCompare(aValue);
    }

    if (typeof aValue === "number" && typeof bValue === "number") {
      return sortDirection === "asc" ? aValue - bValue : bValue - aValue;
    }

    return 0;
  });

  const totalPages = Math.ceil(sortedTrips.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedTrips = sortedTrips.slice(startIndex, endIndex);

  const handleSort = (field: keyof TripWithMetrics) => {
    if (sortField === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection("desc");
    }
    setCurrentPage(1);
  };

  const SortIcon = ({ field }: { field: keyof TripWithMetrics }) => {
    if (sortField !== field) {
      return <ArrowUpDown className="w-3 h-3 ml-1 opacity-30" />;
    }
    return sortDirection === "asc" ? (
      <ArrowUp className="w-3 h-3 ml-1" />
    ) : (
      <ArrowDown className="w-3 h-3 ml-1" />
    );
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "active":
        return "bg-emerald-100 text-emerald-700";
      case "completed":
        return "bg-blue-100 text-blue-700";
      case "planning":
        return "bg-amber-100 text-amber-700";
      case "cancelled":
        return "bg-red-100 text-red-700";
      default:
        return "bg-slate-100 text-slate-700";
    }
  };

  return (
    <div className="page-shell max-w-7xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 flex items-center gap-2 sm:gap-3">
          <Bus className="w-7 h-7 sm:w-8 sm:h-8 text-sky-600" />
          Trips Analytics
        </h1>
        <p className="text-slate-500 mt-1 text-sm">
          Overview of all trips, participation rates, and metrics
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-6">
        <div className="bg-white rounded-lg sm:rounded-xl shadow-sm border border-slate-200 p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="p-2 bg-sky-100 rounded-lg">
              <Bus className="w-5 h-5 text-sky-700" />
            </div>
          </div>
          <p className="text-2xl sm:text-3xl font-bold text-slate-900">
            {data.totalTrips}
          </p>
          <p className="text-xs sm:text-sm font-medium text-slate-500 mt-1">
            Total Trips
          </p>
        </div>

        <div className="bg-white rounded-lg sm:rounded-xl shadow-sm border border-slate-200 p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="p-2 bg-emerald-100 rounded-lg">
              <Activity className="w-5 h-5 text-emerald-700" />
            </div>
            <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
              Active
            </span>
          </div>
          <p className="text-2xl sm:text-3xl font-bold text-slate-900">
            {data.activeTrips}
          </p>
          <p className="text-xs sm:text-sm font-medium text-slate-500 mt-1">
            In Progress
          </p>
        </div>

        <div className="bg-white rounded-lg sm:rounded-xl shadow-sm border border-slate-200 p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="p-2 bg-purple-100 rounded-lg">
              <Users className="w-5 h-5 text-purple-700" />
            </div>
          </div>
          <p className="text-2xl sm:text-3xl font-bold text-slate-900">
            {data.totalParticipants}
          </p>
          <p className="text-xs sm:text-sm font-medium text-slate-500 mt-1">
            Engagements
          </p>
        </div>

        <div className="bg-white rounded-lg sm:rounded-xl shadow-sm border border-slate-200 p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Target className="w-5 h-5 text-blue-700" />
            </div>
            <span
              className={`text-xs font-medium px-2 py-0.5 rounded-full border ${data.avgCheckInRate >= 80 ? "bg-green-50 text-green-700 border-green-200" : "bg-amber-50 text-amber-700 border-amber-200"}`}
            >
              Overall
            </span>
          </div>
          <p className="text-2xl sm:text-3xl font-bold text-slate-900">
            {data.avgCheckInRate.toFixed(1)}%
          </p>
          <p className="text-xs sm:text-sm font-medium text-slate-500 mt-1">
            Check-in Rate
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-5 mb-6">
        <div className="bg-white rounded-lg sm:rounded-xl shadow-sm border border-slate-200 p-4 sm:p-5">
          <h3 className="text-base sm:text-lg font-semibold text-slate-900 mb-3 flex items-center gap-2">
            <Award className="w-5 h-5 text-emerald-600" />
            Top Engaged Trips
          </h3>
          <div className="space-y-2">
            {data.topTrips.length > 0 ? (
              data.topTrips.map((trip, index) => (
                <div
                  key={trip.id}
                  className="flex items-center justify-between p-2.5 bg-slate-50 rounded-lg border border-slate-100"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="w-7 h-7 bg-emerald-100 rounded-full flex items-center justify-center text-emerald-700 font-bold text-xs flex-shrink-0">
                      {index + 1}
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs sm:text-sm font-medium text-slate-900 line-clamp-1">
                        {trip.name}
                      </p>
                      <p className="text-xs text-slate-500">
                        {new Date(trip.trip_date).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0 ml-2">
                    <p className="text-xs sm:text-sm font-bold text-emerald-700">
                      {trip.checkInRate.toFixed(1)}%
                    </p>
                    <p className="text-xs text-slate-500">
                      {trip.checkedIn}/{trip.totalParticipants}
                    </p>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-xs sm:text-sm text-slate-500 text-center py-4">
                No data
              </p>
            )}
          </div>
        </div>

        <div className="bg-white rounded-lg sm:rounded-xl shadow-sm border border-slate-200 p-4 sm:p-5">
          <h3 className="text-base sm:text-lg font-semibold text-slate-900 mb-3 flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-amber-500" />
            Needs Attention
          </h3>
          <div className="space-y-2">
            {data.needsAttention.length > 0 ? (
              data.needsAttention.map((trip, index) => (
                <div
                  key={trip.id}
                  className="flex items-center justify-between p-2.5 bg-slate-50 rounded-lg border border-slate-100"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="w-7 h-7 bg-amber-100 rounded-full flex items-center justify-center text-amber-700 font-bold text-xs flex-shrink-0">
                      !
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs sm:text-sm font-medium text-slate-900 line-clamp-1">
                        {trip.name}
                      </p>
                      <p className="text-xs text-slate-500">
                        {new Date(trip.trip_date).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0 ml-2">
                    <p className="text-xs sm:text-sm font-bold text-amber-600">
                      {trip.checkInRate.toFixed(1)}%
                    </p>
                    <p className="text-xs text-slate-500">
                      {trip.checkedIn}/{trip.totalParticipants}
                    </p>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-xs sm:text-sm text-slate-500 text-center py-4">
                All good!
              </p>
            )}
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg sm:rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="p-3 sm:p-4 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <h2 className="text-base sm:text-lg font-semibold text-slate-900">
            All Trips Performance
          </h2>
          <div className="relative flex-1 sm:flex-none">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search trips..."
              value={tableSearch}
              onChange={(e) => setTableSearch(e.target.value)}
              className="pl-9 pr-4 py-2 border border-slate-300 rounded-lg text-xs sm:text-sm w-full sm:w-60 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-sky-500"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs sm:text-sm whitespace-nowrap">
            <thead className="bg-slate-50 text-slate-600 border-b border-slate-200">
              <tr>
                <th
                  className="px-4 sm:px-5 py-2.5 font-medium cursor-pointer hover:bg-slate-100 transition-colors"
                  onClick={() => handleSort("name")}
                >
                  <div className="flex items-center">
                    Trip <SortIcon field="name" />
                  </div>
                </th>
                <th
                  className="px-4 sm:px-5 py-2.5 font-medium cursor-pointer hover:bg-slate-100 transition-colors hidden sm:table-cell"
                  onClick={() => handleSort("trip_date")}
                >
                  <div className="flex items-center">
                    Date <SortIcon field="trip_date" />
                  </div>
                </th>
                <th
                  className="px-4 sm:px-5 py-2.5 font-medium cursor-pointer hover:bg-slate-100 transition-colors"
                  onClick={() => handleSort("status")}
                >
                  <div className="flex items-center">
                    Status <SortIcon field="status" />
                  </div>
                </th>
                <th
                  className="px-4 sm:px-5 py-2.5 font-medium cursor-pointer hover:bg-slate-100 transition-colors text-right hidden sm:table-cell"
                  onClick={() => handleSort("totalParticipants")}
                >
                  <div className="flex items-center justify-end">
                    Expected <SortIcon field="totalParticipants" />
                  </div>
                </th>
                <th
                  className="px-4 sm:px-5 py-2.5 font-medium cursor-pointer hover:bg-slate-100 transition-colors text-right"
                  onClick={() => handleSort("checkInRate")}
                >
                  <div className="flex items-center justify-end">
                    Check-in <SortIcon field="checkInRate" />
                  </div>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {paginatedTrips.length > 0 ? (
                paginatedTrips.map((trip) => (
                  <tr
                    key={trip.id}
                    className="hover:bg-slate-50 transition-colors"
                  >
                    <td className="px-4 sm:px-5 py-3">
                      <p className="font-medium text-slate-900 text-sm line-clamp-1">
                        {trip.name}
                      </p>
                      {trip.departure_time && (
                        <p className="text-xs text-slate-500 mt-0.5">
                          {trip.departure_time}
                        </p>
                      )}
                    </td>
                    <td className="px-4 sm:px-5 py-3 text-slate-600 hidden sm:table-cell text-xs sm:text-sm">
                      {new Date(trip.trip_date).toLocaleDateString()}
                    </td>
                    <td className="px-4 sm:px-5 py-3">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium capitalize ${getStatusColor(trip.status)}`}
                      >
                        {trip.status}
                      </span>
                    </td>
                    <td className="px-4 sm:px-5 py-3 text-right hidden sm:table-cell">
                      <span className="font-medium text-slate-900 text-sm">
                        {trip.totalParticipants}
                      </span>
                    </td>
                    <td className="px-4 sm:px-5 py-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <div className="flex-1 max-w-[50px] h-1 bg-slate-100 rounded-full overflow-hidden hidden sm:block">
                          <div
                            className={`h-full rounded-full ${trip.checkInRate >= 80 ? "bg-emerald-500" : trip.checkInRate >= 50 ? "bg-amber-500" : "bg-red-500"}`}
                            style={{ width: `${trip.checkInRate}%` }}
                          />
                        </div>
                        <span
                          className={`font-medium text-xs sm:text-sm ${trip.checkInRate >= 80 ? "text-emerald-700" : trip.checkInRate >= 50 ? "text-amber-600" : "text-red-600"}`}
                        >
                          {trip.checkInRate.toFixed(0)}%
                        </span>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td
                    colSpan={5}
                    className="px-4 sm:px-5 py-6 text-center text-slate-500 text-sm"
                  >
                    No trips found
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {totalPages > 1 && (
          <div className="px-4 sm:px-5 py-3 border-t border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <p className="text-xs sm:text-sm text-slate-500">
              Showing{" "}
              <span className="font-medium text-slate-900">
                {startIndex + 1}
              </span>
              -
              <span className="font-medium text-slate-900">
                {Math.min(endIndex, sortedTrips.length)}
              </span>{" "}
              of{" "}
              <span className="font-medium text-slate-900">
                {sortedTrips.length}
              </span>
            </p>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                disabled={currentPage === 1}
                className="p-1.5 rounded text-slate-500 hover:text-slate-900 hover:bg-slate-100 disabled:opacity-50 disabled:cursor-not-allowed text-xs sm:text-sm"
              >
                Prev
              </button>
              <div className="flex items-center gap-1">
                {Array.from(
                  { length: Math.min(totalPages, 5) },
                  (_, i) => i + 1,
                ).map((page) => (
                  <button
                    key={page}
                    onClick={() => setCurrentPage(page)}
                    className={`w-6 h-6 sm:w-7 sm:h-7 rounded text-xs sm:text-sm font-medium flex items-center justify-center ${currentPage === page ? "bg-sky-600 text-white" : "text-slate-600 hover:bg-slate-100"}`}
                  >
                    {page}
                  </button>
                ))}
              </div>
              <button
                onClick={() =>
                  setCurrentPage((prev) => Math.min(totalPages, prev + 1))
                }
                disabled={currentPage === totalPages}
                className="p-1.5 rounded text-slate-500 hover:text-slate-900 hover:bg-slate-100 disabled:opacity-50 disabled:cursor-not-allowed text-xs sm:text-sm"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
