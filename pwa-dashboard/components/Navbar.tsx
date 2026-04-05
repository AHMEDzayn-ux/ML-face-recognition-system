"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Home,
  Camera,
  Users,
  BarChart3,
  FileText,
  ScanLine,
  Bus,
} from "lucide-react";

export default function Navbar() {
  const pathname = usePathname();

  const links = [
    { href: "/", label: "Dashboard", icon: Home },
    { href: "/camera", label: "Camera", icon: Camera },
    { href: "/trips", label: "Trips", icon: Bus },
    { href: "/students", label: "Students", icon: Users },
    { href: "/analytics", label: "Analytics", icon: BarChart3 },
    { href: "/reports", label: "Reports", icon: FileText },
  ];

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 border-b border-slate-200/40 bg-slate-50 h-16 will-change-transform">
      <div className="max-w-7xl mx-auto px-3 sm:px-4 md:px-5 h-full">
        <div className="flex h-full items-center justify-between gap-2 sm:gap-4">
          {/* Logo - responsive text size */}
          <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
            <div className="flex h-9 sm:h-10 w-9 sm:w-10 items-center justify-center rounded-lg sm:rounded-xl bg-gradient-to-br from-sky-500 to-blue-700 text-white shadow-lg shadow-blue-300/60">
              <ScanLine className="h-4 sm:h-5 w-4 sm:w-5" />
            </div>
            <div className="hidden sm:block">
              <p className="font-[var(--font-jakarta)] text-[0.62rem] sm:text-[0.68rem] font-bold uppercase tracking-[0.2em] sm:tracking-[0.24em] text-slate-400 leading-none">
                Face Recognition
              </p>
              <p className="font-[var(--font-jakarta)] text-[0.75rem] sm:text-sm font-extrabold tracking-tight text-slate-900 md:text-[1.02rem] leading-tight">
                Attendance
              </p>
            </div>
          </div>

          {/* Navigation links - scrollable on mobile */}
          <div className="flex items-center gap-0.5 sm:gap-1 overflow-x-auto py-1 flex-1 justify-end md:justify-end">
            {links.map(({ href, label, icon: Icon }) => {
              const isActive = pathname === href;
              return (
                <Link
                  key={href}
                  href={href}
                  className={`font-[var(--font-jakarta)] flex shrink-0 items-center rounded-lg sm:rounded-xl px-2 sm:px-3 py-1.5 sm:py-2 text-[0.7rem] sm:text-[0.84rem] font-semibold tracking-[0.01em] transition-all md:px-4 md:text-[0.92rem] whitespace-nowrap ${
                    isActive
                      ? "bg-slate-900 text-white shadow-md shadow-slate-400/20"
                      : "text-slate-600 hover:bg-slate-200/55 hover:text-slate-900"
                  }`}
                  title={label}
                >
                  <Icon className="h-3 sm:h-4 w-3 sm:w-4 md:h-5 md:w-5 flex-shrink-0" />
                  <span className="hidden sm:inline ml-1 md:ml-2">{label}</span>
                </Link>
              );
            })}
          </div>
        </div>
      </div>
    </nav>
  );
}
