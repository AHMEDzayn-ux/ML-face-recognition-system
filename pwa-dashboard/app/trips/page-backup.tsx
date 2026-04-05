"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function TripsPage() {
  const router = useRouter();

  useEffect(() => {
    // Redirect trips list to home (create trip page)
    router.replace("/");
  }, [router]);

  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-center">
        <div className="spinner mb-4"></div>
        <p className="text-slate-600">Loading...</p>
      </div>
    </div>
  );
}
