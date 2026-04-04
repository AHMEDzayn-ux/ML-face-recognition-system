"use client";

import { User, Clock, CheckCircle } from "lucide-react";
import type { Attendance } from "@/lib/supabase";

interface RecentAttendanceProps {
  attendance: Attendance[];
}

export default function RecentAttendance({
  attendance,
}: RecentAttendanceProps) {
  const recent = attendance.slice(0, 10);

  if (recent.length === 0) {
    return (
      <div className="surface-card p-8 text-center">
        <User className="mx-auto mb-4 h-12 w-12 text-slate-400" />
        <p className="font-medium text-slate-600">No attendance records today</p>
      </div>
    );
  }

  return (
    <div className="surface-card overflow-hidden">
      <div className="subtle-divider border-b p-6">
        <h2 className="text-xl font-semibold text-slate-900">
          Recent Attendance
        </h2>
        <p className="mt-1 text-sm text-slate-500">
          Latest {recent.length} check-ins
        </p>
      </div>

      <div className="space-y-2 p-2 md:p-3">
        {recent.map((record) => (
          <div
            key={record.id}
            className="surface-muted p-4 transition-all hover:-translate-y-0.5 hover:shadow-sm"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <div className="rounded-full bg-sky-100 p-2">
                  <User className="h-5 w-5 text-sky-700" />
                </div>
                <div>
                  <p className="font-semibold text-slate-900">{record.name}</p>
                  <p className="text-sm text-slate-500">
                    Roll: {record.roll_number}
                  </p>
                </div>
              </div>

              <div className="text-right">
                <div className="mb-1 flex items-center text-sm text-slate-600">
                  <Clock className="mr-1 h-4 w-4" />
                  {new Date(record.timestamp).toLocaleTimeString("en-US", {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </div>
                <div className="flex items-center text-sm">
                  <CheckCircle className="mr-1 h-4 w-4 text-emerald-500" />
                  <span className="font-semibold text-emerald-600">
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
}
