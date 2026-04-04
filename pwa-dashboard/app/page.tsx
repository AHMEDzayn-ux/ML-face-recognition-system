"use client";

import { useEffect, useState } from "react";
import { supabase, type Attendance } from "@/lib/supabase";
import StatsCards from "@/components/StatsCards";
import RecentAttendance from "@/components/RecentAttendance";

export default function DashboardPage() {
  const [attendance, setAttendance] = useState<Attendance[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchTodayAttendance();

    // Real-time subscription
    const channel = supabase
      .channel("attendance_changes")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "attendance",
        },
        (payload) => {
          setAttendance((prev) => [payload.new as Attendance, ...prev]);
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  async function fetchTodayAttendance() {
    try {
      const today = new Date().toISOString().split('T')[0];
      console.log('Fetching attendance for:', today);
      
      const { data, error } = await supabase
        .from('attendance')
        .select('*')
        .eq('date', today)
        .order('timestamp', { ascending: false });

      if (error) {
        console.error('Supabase error:', error);
        throw error;
      }
      
      console.log('Attendance data:', data);
      setAttendance(data || []);
    } catch (error) {
      console.error('Error fetching attendance:', error);
      // Set empty array so page still loads
      setAttendance([]);
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

  return (
    <div className="page-shell">
      <div className="surface-card fade-up mb-8 overflow-hidden p-6 md:p-8">
        <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="mb-2 text-[0.72rem] font-semibold uppercase tracking-[0.24em] text-sky-700">
              Attendance Overview
            </p>
            <h1 className="section-title text-3xl md:text-4xl">Dashboard</h1>
            <p className="section-subtitle mt-3 text-sm md:text-base">
              Live check-ins and performance indicators for your campus.
            </p>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white/80 px-4 py-3 text-sm font-medium text-slate-600 shadow-sm">
            {new Date().toLocaleDateString("en-US", {
              weekday: "long",
              year: "numeric",
              month: "long",
              day: "numeric",
            })}
          </div>
        </div>
      </div>

      <div className="fade-up fade-up-delay-1">
        <StatsCards attendance={attendance} />
      </div>

      <div className="mt-8 fade-up fade-up-delay-2">
        <RecentAttendance attendance={attendance} />
      </div>
    </div>
  );
}
