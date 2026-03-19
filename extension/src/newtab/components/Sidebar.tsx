import { Home, BookOpen, ClipboardList, Settings, Sparkles } from "lucide-react";
import { useEffect, useState } from "react";
import type { Page } from "../App";

interface SidebarProps {
  currentPage: string;
  navigate: (page: Page) => void;
}

export function Sidebar({ currentPage, navigate }: SidebarProps) {
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    async function loadUnread() {
      try {
        const result = await chrome.storage.local.get("activities");
        const activities = result.activities || [];
        setUnreadCount(activities.filter((a: { read: boolean }) => !a.read).length);
      } catch {
        // Not in extension context
      }
    }
    loadUnread();
    const interval = setInterval(loadUnread, 30000);
    return () => clearInterval(interval);
  }, []);

  const navItems = [
    { name: "home" as const, label: "Home", icon: Home },
    { name: "courses" as const, label: "Courses", icon: BookOpen },
    { name: "assignments" as const, label: "Assignments", icon: ClipboardList },
    { name: "settings" as const, label: "Settings", icon: Settings },
  ];

  return (
    <nav className="w-16 md:w-56 bg-[#111] border-r border-[#222] flex flex-col shrink-0">
      {/* Logo */}
      <div
        className="flex items-center gap-2 p-4 cursor-pointer"
        onClick={() => navigate({ name: "home" })}
      >
        <Sparkles className="w-6 h-6 text-amber-400 shrink-0" />
        <span className="text-sm font-semibold hidden md:block">Claude University</span>
      </div>

      {/* Nav Items */}
      <div className="flex-1 flex flex-col gap-1 px-2 mt-2">
        {navItems.map((item) => {
          const Icon = item.icon;
          const active = currentPage === item.name;
          return (
            <button
              key={item.name}
              onClick={() => navigate({ name: item.name } as Page)}
              className={`
                flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors
                ${active ? "bg-amber-500/10 text-amber-400" : "text-gray-400 hover:text-gray-200 hover:bg-[#1a1a1a]"}
              `}
            >
              <Icon className="w-5 h-5 shrink-0" />
              <span className="hidden md:block">{item.label}</span>
              {item.name === "home" && unreadCount > 0 && (
                <span className="ml-auto bg-amber-500 text-black text-xs font-bold px-1.5 py-0.5 rounded-full hidden md:block">
                  {unreadCount}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Footer */}
      <div className="p-4 border-t border-[#222]">
        <div className="text-xs text-gray-600 hidden md:block">
          Zero API costs
        </div>
      </div>
    </nav>
  );
}
