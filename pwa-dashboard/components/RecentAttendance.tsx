"use client";

import { memo } from "react";
import { User, Clock, CheckCircle } from "lucide-react";
import type { Attendance } from "@/lib/supabase";

interface RecentAttendanceProps {
  attendance: Attendance[];
}

const RecentAttendance = memo(function RecentAttendance({
  attendance,
}: RecentAttendanceProps) {
  const recent = attendance.slice(0, 8);

  if (recent.length === 0) {
    return (
      <div className="surface-card p-6 sm:p-8 text-center">
        <User className="mx-auto mb-3 h-10 w-10 text-slate-400" />
        <p className="font-medium text-slate-600">
          No attendance records today
        </p>
      </div>
    );
  }

  return (
    <div className="surface-card overflow-hidden">
      <div className="subtle-divider border-b p-4 sm:p-5">
        <h2 className="text-lg sm:text-xl font-semibold text-slate-900">
          Recent Attendance
        </h2>
        <p className="mt-0.5 text-xs sm:text-sm text-slate-500">
          Latest {recent.length} check-ins
        </p>
      </div>

      <div className="space-y-1 p-1 sm:p-2 max-h-96 overflow-y-auto">
        {recent.map((record) => (
          <div
            key={record.id}
            className="surface-muted p-3 sm:p-4 transition-all hover:shadow-sm"
          >
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center space-x-2 sm:space-x-3 min-w-0">
                <div className="rounded-full bg-sky-100 p-1.5 sm:p-2 flex-shrink-0">
                  <User className="h-4 w-4 sm:h-5 sm:w-5 text-sky-700" />
                </div>
                <div className="min-w-0">
                  <p className="font-semibold text-slate-900 text-sm sm:text-base truncate">
                    {record.name}
                  </p>
                  <p className="text-xs sm:text-sm text-slate-500 truncate">
                    Roll: {record.roll_number}
                  </p>
                </div>
              </div>

              <div className="text-right flex-shrink-0">
                <div className="mb-0.5 sm:mb-1 flex items-center justify-end text-xs sm:text-sm text-slate-600 gap-1">
                  <Clock className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                  {new Date(record.timestamp).toLocaleTimeString("en-US", {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </div>
                <div className="flex items-center justify-end gap-1">
                  <CheckCircle className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-emerald-500" />
                  <span className="font-semibold text-emerald-600 text-xs sm:text-sm">
                    {(record.confidence * 100).toFixed(1)}%
                  </span>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
});

export default RecentAttendance;
