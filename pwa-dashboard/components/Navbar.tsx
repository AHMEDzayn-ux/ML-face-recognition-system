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
    <nav className="sticky top-0 z-50 border-b border-slate-200/40 bg-slate-50/75 backdrop-blur-xl">
      <div className="max-w-7xl mx-auto px-4 md:px-5">
        <div className="flex h-16 items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-sky-500 to-blue-700 text-white shadow-lg shadow-blue-300/60">
              <ScanLine className="h-5 w-5" />
            </div>
            <div>
              <p className="font-[var(--font-jakarta)] text-[0.68rem] font-bold uppercase tracking-[0.24em] text-slate-400">
                Face Recognition
              </p>
              <p className="font-[var(--font-jakarta)] text-sm font-extrabold tracking-tight text-slate-900 md:text-[1.02rem]">
                Attendance Console
              </p>
            </div>
          </div>

          <div className="flex max-w-[68vw] items-center gap-1 overflow-x-auto py-1 md:max-w-none md:overflow-visible">
            {links.map(({ href, label, icon: Icon }) => {
              const isActive = pathname === href;
              return (
                <Link
                  key={href}
                  href={href}
                  className={`font-[var(--font-jakarta)] flex shrink-0 items-center rounded-xl px-3 py-2 text-[0.84rem] font-semibold tracking-[0.01em] transition-all md:px-4 md:text-[0.92rem] ${
                    isActive
                      ? "bg-slate-900 text-white shadow-md shadow-slate-400/20"
                      : "text-slate-600 hover:bg-slate-200/55 hover:text-slate-900"
                  }`}
                >
                  <Icon className="mr-2 h-4 w-4 md:h-5 md:w-5" />
                  <span className="hidden md:inline">{label}</span>
                </Link>
              );
            })}
          </div>
        </div>
      </div>
    </nav>
  );
}
