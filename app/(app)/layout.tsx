"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { GraduationCap, LayoutDashboard, Settings, LogOut, Globe, ClipboardList, Bell } from "lucide-react";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [unreadCount, setUnreadCount] = useState(0);

  const fetchUnread = useCallback(async () => {
    try {
      const res = await fetch("/api/learnus/notifications");
      if (res.ok) {
        const data = await res.json();
        setUnreadCount(data.unreadCount);
      }
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    fetchUnread();
    // Poll every 60 seconds for notification count
    const interval = setInterval(fetchUnread, 60000);
    return () => clearInterval(interval);
  }, [fetchUnread]);

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
            icon={<LayoutDashboard className="w-4 h-4" />}
            label="Dashboard"
            active={pathname === "/dashboard"}
          />
          <SidebarLink
            href="/learnus"
            icon={<Globe className="w-4 h-4" />}
            label="LearNUS Import"
            active={pathname === "/learnus"}
          />
          <SidebarLink
            href="/learnus/tasks"
            icon={<ClipboardList className="w-4 h-4" />}
            label="Homework Board"
            active={pathname === "/learnus/tasks"}
          />
          <SidebarLink
            href="/learnus/notifications"
            icon={
              <div className="relative">
                <Bell className="w-4 h-4" />
                {unreadCount > 0 && (
                  <span className="absolute -top-1.5 -right-1.5 bg-red-500 text-white text-[9px] font-bold w-3.5 h-3.5 rounded-full flex items-center justify-center">
                    {unreadCount > 9 ? "9+" : unreadCount}
                  </span>
                )}
              </div>
            }
            label="Notifications"
            active={pathname === "/learnus/notifications"}
          />
          <SidebarLink
            href="/settings"
            icon={<Settings className="w-4 h-4" />}
            label="Settings"
            active={pathname === "/settings"}
          />
        </nav>

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
