"use client";

import { useEffect, useState } from "react";
import {
  supabase,
  type Attendance,
  type AttendanceSummary,
} from "@/lib/supabase";
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
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import AttendanceChart from "@/components/AttendanceChart";

interface AnalyticsData {
  summary: AttendanceSummary[];
  dailyStats: { date: string; count: number }[];
  todayAttendance: Attendance[];
  totalStudents: number;
  activeStudents: number;
  topPerformers: AttendanceSummary[];
  needsAttention: AttendanceSummary[];
  weeklyTrend: number;
  avgCheckInTime: string;
  todayRate: number;
}

export default function AnalyticsPage() {
  const [data, setData] = useState<AnalyticsData>({
    summary: [],
    dailyStats: [],
    todayAttendance: [],
    totalStudents: 0,
    activeStudents: 0,
    topPerformers: [],
    needsAttention: [],
    weeklyTrend: 0,
    avgCheckInTime: "--:--",
    todayRate: 0,
  });
  const [loading, setLoading] = useState(true);
  const [selectedPeriod, setSelectedPeriod] = useState<"7d" | "30d">("7d");
  
  // Table state
  const [tableSearch, setTableSearch] = useState("");
  const [sortField, setSortField] = useState<keyof AttendanceSummary>("attendance_rate");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);

  useEffect(() => {
    fetchAnalytics();
  }, [selectedPeriod]);

  async function fetchAnalytics() {
    try {
      // 1. Fetch all students count
      const { data: studentsData, error: studentsError } = await supabase
        .from("students")
        .select("id, is_active");

      if (studentsError) throw studentsError;
      const totalStudents = studentsData?.length || 0;
      const activeStudents =
        studentsData?.filter((s) => s.is_active).length || 0;

      // 2. Fetch attendance summary
      const { data: summaryData, error: summaryError } = await supabase
        .from("attendance_summary")
        .select("*")
        .order("attendance_rate", { ascending: false });

      if (summaryError) throw summaryError;
      const summary = summaryData || [];

      // 3. Fetch period-based attendance stats
      const daysAgo = selectedPeriod === "7d" ? 7 : 30;
      const periodStart = new Date();
      periodStart.setDate(periodStart.getDate() - daysAgo);

      const { data: attendanceData, error: attendanceError } = await supabase
        .from("attendance")
        .select("date, time, timestamp")
        .gte("date", periodStart.toISOString().split("T")[0])
        .order("date");

      if (attendanceError) throw attendanceError;

      // 4. Fetch today's attendance
      const today = new Date().toISOString().split("T")[0];
      const { data: todayData, error: todayError } = await supabase
        .from("attendance")
        .select("*")
        .eq("date", today);

      if (todayError) throw todayError;
      const todayAttendance = todayData || [];

      // 5. Calculate daily stats
      const grouped = (attendanceData || []).reduce(
        (acc: Record<string, number>, record) => {
          acc[record.date] = (acc[record.date] || 0) + 1;
          return acc;
        },
        {},
      );

      const dailyStats = Object.entries(grouped).map(([date, count]) => ({
        date,
        count: count as number,
      }));

      // 6. Calculate weekly trend
      const lastWeekStats = dailyStats.slice(-7);
      const previousWeekStats = dailyStats.slice(-14, -7);
      const lastWeekAvg =
        lastWeekStats.reduce((sum, s) => sum + s.count, 0) /
        (lastWeekStats.length || 1);
      const prevWeekAvg =
        previousWeekStats.reduce((sum, s) => sum + s.count, 0) /
        (previousWeekStats.length || 1);
      const weeklyTrend =
        prevWeekAvg > 0 ? ((lastWeekAvg - prevWeekAvg) / prevWeekAvg) * 100 : 0;

      // 7. Calculate average check-in time
      const times = todayAttendance
        .map((a) => {
          const [hours, minutes] = a.time.split(":").map(Number);
          return hours * 60 + minutes;
        })
        .filter((t) => !isNaN(t));

      const avgMinutes =
        times.length > 0
          ? times.reduce((sum, t) => sum + t, 0) / times.length
          : 0;

      const avgHours = Math.floor(avgMinutes / 60);
      const avgMins = Math.floor(avgMinutes % 60);
      const avgCheckInTime =
        times.length > 0
          ? `${String(avgHours).padStart(2, "0")}:${String(avgMins).padStart(2, "0")}`
          : "--:--";

      // 8. Get top performers and students needing attention
      const topPerformers = summary.slice(0, 5);
      const needsAttention = summary
        .filter((s) => s.attendance_rate < 75)
        .sort((a, b) => a.attendance_rate - b.attendance_rate)
        .slice(0, 5);

      // 9. Calculate today's attendance rate
      const todayRate =
        activeStudents > 0
          ? (todayAttendance.length / activeStudents) * 100
          : 0;

      setData({
        summary,
        dailyStats,
        todayAttendance,
        totalStudents,
        activeStudents,
        topPerformers,
        needsAttention,
        weeklyTrend,
        avgCheckInTime,
        todayRate,
      });
    } catch (error) {
      console.error("Error fetching analytics:", error);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="spinner"></div>
      </div>
    );
  }

  const avgAttendanceRate =
    data.summary.length > 0
      ? (
          data.summary.reduce((sum, s) => sum + s.attendance_rate, 0) /
          data.summary.length
        ).toFixed(1)
      : "0.0";

  // Filter and sort table data
  const filteredSummary = data.summary.filter((student) => {
    const searchLower = tableSearch.toLowerCase();
    return (
      student.name.toLowerCase().includes(searchLower) ||
      student.roll_number.toLowerCase().includes(searchLower) ||
      (student.class && student.class.toLowerCase().includes(searchLower))
    );
  });

  const sortedSummary = [...filteredSummary].sort((a, b) => {
    let aValue = a[sortField];
    let bValue = b[sortField];

    // Handle null values
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

  // Pagination
  const totalPages = Math.ceil(sortedSummary.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedSummary = sortedSummary.slice(startIndex, endIndex);

  const handleSort = (field: keyof AttendanceSummary) => {
    if (sortField === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection("desc");
    }
    setCurrentPage(1); // Reset to first page
  };

  const SortIcon = ({ field }: { field: keyof AttendanceSummary }) => {
    if (sortField !== field) {
      return <ArrowUpDown className="w-3 h-3 ml-1 opacity-30" />;
    }
    return sortDirection === "asc" ? (
      <ArrowUp className="w-3 h-3 ml-1" />
    ) : (
      <ArrowDown className="w-3 h-3 ml-1" />
    );
  };

  return (
    <div className="page-shell max-w-7xl">
      {/* Header */}
      <div className="mb-6 flex justify-between items-start">
        <div>
          <h1 className="section-title text-3xl flex items-center">
            <BarChart3 className="w-8 h-8 mr-3 text-sky-700" />
            Analytics Dashboard
          </h1>
          <p className="section-subtitle mt-2">
            Real-time attendance insights and performance metrics
          </p>
        </div>

        {/* Period Selector */}
        <div className="flex gap-2 bg-slate-100 p-1 rounded-lg">
          <button
            onClick={() => setSelectedPeriod("7d")}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              selectedPeriod === "7d"
                ? "bg-white text-sky-700 shadow-sm"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            7 Days
          </button>
          <button
            onClick={() => setSelectedPeriod("30d")}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              selectedPeriod === "30d"
                ? "bg-white text-sky-700 shadow-sm"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            30 Days
          </button>
        </div>
      </div>

      {/* Key Metrics Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {/* Today's Attendance */}
        <div className="surface-card p-4">
          <div className="flex items-center justify-between mb-2">
            <div className="p-2 bg-sky-100 rounded-lg">
              <CheckCircle2 className="w-5 h-5 text-sky-700" />
            </div>
            <span
              className={`text-xs font-medium px-2 py-1 rounded ${
                data.todayRate >= 75
                  ? "bg-green-100 text-green-700"
                  : "bg-yellow-100 text-yellow-700"
              }`}
            >
              {data.todayRate.toFixed(0)}%
            </span>
          </div>
          <p className="text-2xl font-bold text-slate-900">
            {data.todayAttendance.length}
          </p>
          <p className="text-xs text-slate-500 mt-1">Present Today</p>
          <p className="text-xs text-slate-400">
            of {data.activeStudents} active students
          </p>
        </div>

        {/* Total Students */}
        <div className="surface-card p-4">
          <div className="flex items-center justify-between mb-2">
            <div className="p-2 bg-purple-100 rounded-lg">
              <Users className="w-5 h-5 text-purple-700" />
            </div>
          </div>
          <p className="text-2xl font-bold text-slate-900">
            {data.totalStudents}
          </p>
          <p className="text-xs text-slate-500 mt-1">Total Students</p>
          <p className="text-xs text-slate-400">{data.activeStudents} active</p>
        </div>

        {/* Average Attendance Rate */}
        <div className="surface-card p-4">
          <div className="flex items-center justify-between mb-2">
            <div className="p-2 bg-emerald-100 rounded-lg">
              <Target className="w-5 h-5 text-emerald-700" />
            </div>
            <span
              className={`text-xs font-medium px-2 py-1 rounded ${
                parseFloat(avgAttendanceRate) >= 75
                  ? "bg-green-100 text-green-700"
                  : "bg-yellow-100 text-yellow-700"
              }`}
            >
              Overall
            </span>
          </div>
          <p className="text-2xl font-bold text-slate-900">
            {avgAttendanceRate}%
          </p>
          <p className="text-xs text-slate-500 mt-1">Avg Attendance</p>
          <p className="text-xs text-slate-400">All students</p>
        </div>

        {/* Weekly Trend */}
        <div className="surface-card p-4">
          <div className="flex items-center justify-between mb-2">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Activity className="w-5 h-5 text-blue-700" />
            </div>
            <span
              className={`text-xs font-medium px-2 py-1 rounded ${
                data.weeklyTrend >= 0
                  ? "bg-green-100 text-green-700"
                  : "bg-red-100 text-red-700"
              }`}
            >
              {data.weeklyTrend >= 0 ? "+" : ""}
              {data.weeklyTrend.toFixed(1)}%
            </span>
          </div>
          <p className="text-2xl font-bold text-slate-900">
            {data.dailyStats.slice(-7).reduce((sum, s) => sum + s.count, 0)}
          </p>
          <p className="text-xs text-slate-500 mt-1">Check-ins (7d)</p>
          <p className="text-xs text-slate-400">vs previous week</p>
        </div>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        {/* Daily Trend Chart - Takes 2 columns */}
        <div className="lg:col-span-2 surface-card p-5">
          <h3 className="text-base font-semibold text-slate-900 mb-4 flex items-center">
            <TrendingUp className="w-4 h-4 mr-2 text-sky-700" />
            Daily Attendance Trend
          </h3>
          <AttendanceChart data={data.dailyStats} />
        </div>

        {/* Quick Stats - Takes 1 column */}
        <div className="surface-card p-5">
          <h3 className="text-base font-semibold text-slate-900 mb-4">
            Quick Stats
          </h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-slate-400" />
                <span className="text-sm text-slate-600">
                  Avg Check-in Time
                </span>
              </div>
              <span className="text-sm font-semibold text-slate-900">
                {data.avgCheckInTime}
              </span>
            </div>

            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-slate-400" />
                <span className="text-sm text-slate-600">Days Tracked</span>
              </div>
              <span className="text-sm font-semibold text-slate-900">
                {data.dailyStats.length}
              </span>
            </div>

            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <div className="flex items-center gap-2">
                <Award className="w-4 h-4 text-slate-400" />
                <span className="text-sm text-slate-600">Top Performers</span>
              </div>
              <span className="text-sm font-semibold text-slate-900">
                {data.topPerformers.length}
              </span>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-slate-400" />
                <span className="text-sm text-slate-600">Needs Attention</span>
              </div>
              <span className="text-sm font-semibold text-slate-900">
                {data.needsAttention.length}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Performance Lists */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Top Performers */}
        <div className="surface-card p-5">
          <h3 className="text-base font-semibold text-slate-900 mb-4 flex items-center">
            <Award className="w-4 h-4 mr-2 text-emerald-600" />
            Top Performers
          </h3>
          <div className="space-y-2">
            {data.topPerformers.length > 0 ? (
              data.topPerformers.map((student, index) => (
                <div
                  key={student.student_id}
                  className="flex items-center justify-between p-3 bg-slate-50 rounded-lg hover:bg-slate-100 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-gradient-to-br from-emerald-400 to-emerald-600 rounded-full flex items-center justify-center text-white font-bold text-sm">
                      {index + 1}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-slate-900">
                        {student.name}
                      </p>
                      <p className="text-xs text-slate-500">
                        {student.roll_number}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold text-emerald-700">
                      {student.attendance_rate.toFixed(1)}%
                    </p>
                    <p className="text-xs text-slate-500">
                      {student.total_present} days
                    </p>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-sm text-slate-500 text-center py-4">
                No data available
              </p>
            )}
          </div>
        </div>

        {/* Needs Attention */}
        <div className="surface-card p-5">
          <h3 className="text-base font-semibold text-slate-900 mb-4 flex items-center">
            <AlertTriangle className="w-4 h-4 mr-2 text-orange-600" />
            Needs Attention
          </h3>
          <div className="space-y-2">
            {data.needsAttention.length > 0 ? (
              data.needsAttention.map((student) => (
                <div
                  key={student.student_id}
                  className="flex items-center justify-between p-3 bg-slate-50 rounded-lg hover:bg-slate-100 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-gradient-to-br from-orange-400 to-orange-600 rounded-full flex items-center justify-center">
                      <AlertTriangle className="w-4 h-4 text-white" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-slate-900">
                        {student.name}
                      </p>
                      <p className="text-xs text-slate-500">
                        {student.roll_number}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold text-orange-700">
                      {student.attendance_rate.toFixed(1)}%
                    </p>
                    <p className="text-xs text-slate-500">
                      {student.total_present} days
                    </p>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-sm text-slate-500 text-center py-4">
                All students performing well! 🎉
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Full Student Summary Table */}
      <div className="surface-card overflow-hidden">
        {/* Header with Search */}
        <div className="border-b border-slate-200 p-5">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <h3 className="text-base font-semibold text-slate-900">
                Complete Student Summary
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                Showing {paginatedSummary.length} of {filteredSummary.length} students
                {tableSearch && ` (filtered from ${data.summary.length} total)`}
              </p>
            </div>
            
            {/* Search Bar */}
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4" />
              <input
                type="text"
                placeholder="Search students..."
                value={tableSearch}
                onChange={(e) => {
                  setTableSearch(e.target.value);
                  setCurrentPage(1); // Reset to first page on search
                }}
                className="w-full pl-9 pr-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-sky-500 focus:border-transparent"
              />
            </div>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50">
              <tr>
                <th
                  onClick={() => handleSort("name")}
                  className="px-5 py-3 text-left text-xs font-medium text-slate-600 uppercase tracking-wider cursor-pointer hover:bg-slate-100 transition-colors"
                >
                  <div className="flex items-center">
                    Student
                    <SortIcon field="name" />
                  </div>
                </th>
                <th
                  onClick={() => handleSort("class")}
                  className="px-5 py-3 text-left text-xs font-medium text-slate-600 uppercase tracking-wider cursor-pointer hover:bg-slate-100 transition-colors"
                >
                  <div className="flex items-center">
                    Class
                    <SortIcon field="class" />
                  </div>
                </th>
                <th
                  onClick={() => handleSort("total_present")}
                  className="px-5 py-3 text-left text-xs font-medium text-slate-600 uppercase tracking-wider cursor-pointer hover:bg-slate-100 transition-colors"
                >
                  <div className="flex items-center">
                    Present Days
                    <SortIcon field="total_present" />
                  </div>
                </th>
                <th
                  onClick={() => handleSort("attendance_rate")}
                  className="px-5 py-3 text-left text-xs font-medium text-slate-600 uppercase tracking-wider cursor-pointer hover:bg-slate-100 transition-colors"
                >
                  <div className="flex items-center">
                    Rate
                    <SortIcon field="attendance_rate" />
                  </div>
                </th>
                <th className="px-5 py-3 text-left text-xs font-medium text-slate-600 uppercase tracking-wider">
                  Status
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-slate-100">
              {paginatedSummary.length > 0 ? (
                paginatedSummary.map((student) => (
                  <tr
                    key={student.student_id}
                    className="hover:bg-slate-50 transition-colors"
                  >
                    <td className="px-5 py-3">
                      <div>
                        <p className="text-sm font-medium text-slate-900">
                          {student.name}
                        </p>
                        <p className="text-xs text-slate-500">
                          {student.roll_number}
                        </p>
                      </div>
                    </td>
                    <td className="px-5 py-3 text-sm text-slate-600">
                      {student.class || "-"} {student.section || ""}
                    </td>
                    <td className="px-5 py-3 text-sm font-medium text-slate-900">
                      {student.total_present}
                    </td>
                    <td className="px-5 py-3 text-sm font-bold">
                      <span
                        className={
                          student.attendance_rate >= 90
                            ? "text-emerald-700"
                            : student.attendance_rate >= 75
                              ? "text-green-700"
                              : student.attendance_rate >= 50
                                ? "text-yellow-700"
                                : "text-red-700"
                        }
                      >
                        {student.attendance_rate.toFixed(1)}%
                      </span>
                    </td>
                    <td className="px-5 py-3">
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          student.attendance_rate >= 90
                            ? "bg-emerald-100 text-emerald-800"
                            : student.attendance_rate >= 75
                              ? "bg-green-100 text-green-800"
                              : student.attendance_rate >= 50
                                ? "bg-yellow-100 text-yellow-800"
                                : "bg-red-100 text-red-800"
                        }`}
                      >
                        {student.attendance_rate >= 90
                          ? "Excellent"
                          : student.attendance_rate >= 75
                            ? "Good"
                            : student.attendance_rate >= 50
                              ? "Fair"
                              : "Low"}
                      </span>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} className="px-5 py-8 text-center text-slate-500">
                    {tableSearch ? (
                      <div>
                        <p className="text-sm font-medium">No students found</p>
                        <p className="text-xs mt-1">Try adjusting your search</p>
                      </div>
                    ) : (
                      <p className="text-sm">No student data available</p>
                    )}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="border-t border-slate-200 px-5 py-4 flex items-center justify-between">
            <div className="text-sm text-slate-600">
              Page {currentPage} of {totalPages}
            </div>
            
            <div className="flex items-center gap-2">
              <button
                onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                disabled={currentPage === 1}
                className="p-2 rounded-lg border border-slate-300 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              
              {/* Page numbers */}
              <div className="flex items-center gap-1">
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  let pageNum;
                  if (totalPages <= 5) {
                    pageNum = i + 1;
                  } else if (currentPage <= 3) {
                    pageNum = i + 1;
                  } else if (currentPage >= totalPages - 2) {
                    pageNum = totalPages - 4 + i;
                  } else {
                    pageNum = currentPage - 2 + i;
                  }
                  
                  return (
                    <button
                      key={pageNum}
                      onClick={() => setCurrentPage(pageNum)}
                      className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors ${
                        currentPage === pageNum
                          ? "bg-sky-600 text-white"
                          : "hover:bg-slate-100 text-slate-700"
                      }`}
                    >
                      {pageNum}
                    </button>
                  );
                })}
              </div>
              
              <button
                onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                disabled={currentPage === totalPages}
                className="p-2 rounded-lg border border-slate-300 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
