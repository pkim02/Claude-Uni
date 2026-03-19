"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { GraduationCap, Home, ClipboardList, Settings, LogOut, Globe } from "lucide-react";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [draftCount, setDraftCount] = useState(0);

  const fetchDraftCount = useCallback(async () => {
    try {
      const res = await fetch("/api/learnus/tasks?filter=draft_ready");
      if (res.ok) {
        const data = await res.json();
        setDraftCount(data.tasks?.length || 0);
      }
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    fetchDraftCount();
    const interval = setInterval(fetchDraftCount, 30000);
    return () => clearInterval(interval);
  }, [fetchDraftCount]);

  function handleLogout() {
    localStorage.removeItem("claude-uni-user");
    window.location.href = "/";
  }

  return (
    <div className="min-h-screen flex">
      {/* Sidebar */}
      <aside className="w-64 border-r border-[var(--border)] bg-[var(--muted)] flex flex-col">
        <div className="p-6">
          <Link href="/dashboard" className="flex items-center gap-2">
            <GraduationCap className="w-6 h-6 text-brand-500" />
            <span className="font-semibold">Claude University</span>
          </Link>
        </div>

        <nav className="flex-1 px-3">
          <SidebarLink
            href="/dashboard"
            icon={<Home className="w-4 h-4" />}
            label="Home"
            active={pathname === "/dashboard"}
          />
          <SidebarLink
            href="/assignments"
            icon={
              <div className="relative">
                <ClipboardList className="w-4 h-4" />
                {draftCount > 0 && (
                  <span className="absolute -top-1.5 -right-1.5 bg-brand-500 text-white text-[9px] font-bold w-3.5 h-3.5 rounded-full flex items-center justify-center">
                    {draftCount > 9 ? "9+" : draftCount}
                  </span>
                )}
              </div>
            }
            label="Assignments"
            active={pathname === "/assignments"}
          />
          <SidebarLink
            href="/learnus"
            icon={<Globe className="w-4 h-4" />}
            label="LearNUS Sync"
            active={pathname?.startsWith("/learnus") || false}
          />
          <SidebarLink
            href="/settings"
            icon={<Settings className="w-4 h-4" />}
            label="Settings"
            active={pathname === "/settings"}
          />
        </nav>

        <div className="px-4 pb-2">
          <div className="text-[10px] text-[var(--muted-foreground)] italic">
            Don&apos;t let school get in the way of your education.
          </div>
        </div>

        <div className="p-3 border-t border-[var(--border)]">
          <button
            onClick={handleLogout}
            className="flex items-center gap-3 w-full px-3 py-2 text-sm text-[var(--muted-foreground)] hover:text-[var(--foreground)] rounded-lg hover:bg-[var(--background)] transition-colors"
          >
            <LogOut className="w-4 h-4" />
            Log out
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-auto">{children}</main>
    </div>
  );
}

function SidebarLink({
  href,
  icon,
  label,
  active,
}: {
  href: string;
  icon: React.ReactNode;
  label: string;
  active: boolean;
}) {
  return (
    <Link
      href={href}
      className={`flex items-center gap-3 px-3 py-2 text-sm rounded-lg transition-colors mb-1 ${
        active
          ? "bg-[var(--background)] text-[var(--foreground)] font-medium shadow-sm"
          : "text-[var(--muted-foreground)] hover:text-[var(--foreground)] hover:bg-[var(--background)]"
      }`}
    >
      {icon}
      {label}
    </Link>
  );
}
