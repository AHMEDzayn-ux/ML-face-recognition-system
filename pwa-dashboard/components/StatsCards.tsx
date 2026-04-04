"use client";

import { Users, CheckCircle, Clock, TrendingUp } from "lucide-react";
import type { Attendance } from "@/lib/supabase";

interface StatsCardsProps {
  attendance: Attendance[];
}

export default function StatsCards({ attendance }: StatsCardsProps) {
  const totalPresent = attendance.length;
  const uniqueStudents = new Set(attendance.map((a) => a.student_id)).size;
  const avgConfidence =
    attendance.length > 0
      ? (
          attendance.reduce((sum, a) => sum + a.confidence, 0) /
          attendance.length
        ).toFixed(1)
      : "0.0";

  const recentAttendance = attendance.slice(0, 5);
  const avgTime =
    recentAttendance.length > 0
      ? new Date(
          recentAttendance.reduce(
            (sum, a) => sum + new Date(a.timestamp).getTime(),
            0,
          ) / recentAttendance.length,
        ).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })
      : "--:--";

  const stats = [
    {
      label: "Total Present",
      value: totalPresent,
      icon: CheckCircle,
      color: "text-emerald-700",
      bgColor: "bg-emerald-100",
    },
    {
      label: "Unique Students",
      value: uniqueStudents,
      icon: Users,
      color: "text-sky-700",
      bgColor: "bg-sky-100",
    },
    {
      label: "Avg Confidence",
      value: `${avgConfidence}%`,
      icon: TrendingUp,
      color: "text-indigo-700",
      bgColor: "bg-indigo-100",
    },
    {
      label: "Recent Avg Time",
      value: avgTime,
      icon: Clock,
      color: "text-amber-700",
      bgColor: "bg-amber-100",
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {stats.map((stat) => (
        <div
          key={stat.label}
          className="surface-card card-hover p-6"
        >
          <div className="mb-5 flex items-center justify-between">
            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                {stat.label}
              </p>
              <p className="text-3xl font-bold text-slate-900">{stat.value}</p>
            </div>
            <div className={`${stat.bgColor} rounded-xl p-3`}>
              <stat.icon className={`w-6 h-6 ${stat.color}`} />
            </div>
          </div>
          <div className="h-1.5 w-full rounded-full bg-slate-100">
            <div className="h-full w-3/5 rounded-full bg-gradient-to-r from-sky-400 to-blue-600" />
          </div>
        </div>
      ))}
    </div>
  );
}
