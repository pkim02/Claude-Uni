"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import {
  Bell,
  ArrowLeft,
  RefreshCw,
  CheckCheck,
  Loader2,
  BookOpen,
  FileText,
  Megaphone,
  Award,
  HelpCircle,
  ClipboardList,
  Calendar,
  AlertCircle,
  Key,
  Eye,
  EyeOff,
} from "lucide-react";

interface Notification {
  id: string;
  type: string;
  courseName: string;
  title: string;
  description: string;
  dueDate: string | null;
  read: boolean;
  autoTaskCreated: boolean;
  detectedAt: string;
}

interface ProgressEvent {
  phase: string;
  message: string;
  timestamp: string;
}

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [hasCredentials, setHasCredentials] = useState(false);
  const [checking, setChecking] = useState(false);
  const [checkLogs, setCheckLogs] = useState<ProgressEvent[]>([]);
  const [showCredForm, setShowCredForm] = useState(false);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(true);
  const logsEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchNotifications();
  }, []);

  async function fetchNotifications() {
    try {
      const res = await fetch("/api/learnus/notifications");
      if (res.ok) {
        const data = await res.json();
        setNotifications(data.notifications);
        setUnreadCount(data.unreadCount);
        setHasCredentials(data.hasCredentials);
      }
    } catch {
      // handle error
    } finally {
      setLoading(false);
    }
  }

  async function handleSaveCredentials() {
    if (!username || !password) return;
    const res = await fetch("/api/learnus/notifications", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "save_credentials", username, password }),
    });
    if (res.ok) {
      setHasCredentials(true);
      setShowCredForm(false);
    }
  }

  async function handleCheckNow() {
    setChecking(true);
    setCheckLogs([]);

    try {
      const body: Record<string, string> = { action: "check" };
      if (username && password) {
        body.username = username;
        body.password = password;
      }

      const res = await fetch("/api/learnus/notifications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const data = await res.json();
        if (data.error?.includes("No credentials")) {
          setShowCredForm(true);
        }
        setChecking(false);
        return;
      }

      const reader = res.body?.getReader();
      const decoder = new TextDecoder();

      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value);
          for (const line of chunk.split("\n")) {
            if (line.startsWith("data: ")) {
              try {
                const event: ProgressEvent = JSON.parse(line.slice(6));
                setCheckLogs((prev) => [...prev, event]);
                setTimeout(() => {
                  logsEndRef.current?.scrollIntoView({ behavior: "smooth" });
                }, 50);
              } catch {
                // skip
              }
            }
          }
        }
      }

      // Refresh notifications list
      await fetchNotifications();
    } catch {
      // handle error
    } finally {
      setChecking(false);
    }
  }

  async function handleMarkAllRead() {
    await fetch("/api/learnus/notifications", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "read_all" }),
    });
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    setUnreadCount(0);
  }

  async function handleMarkRead(id: string) {
    await fetch("/api/learnus/notifications", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "read", notificationId: id }),
    });
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n))
    );
    setUnreadCount((prev) => Math.max(0, prev - 1));
  }

  const typeIcons: Record<string, React.ReactNode> = {
    assignment: <ClipboardList className="w-4 h-4 text-blue-500" />,
    material: <FileText className="w-4 h-4 text-green-500" />,
    announcement: <Megaphone className="w-4 h-4 text-amber-500" />,
    grade: <Award className="w-4 h-4 text-purple-500" />,
    quiz: <HelpCircle className="w-4 h-4 text-red-500" />,
    other: <Bell className="w-4 h-4 text-gray-500" />,
  };

  const typeLabels: Record<string, string> = {
    assignment: "Assignment",
    material: "Material",
    announcement: "Announcement",
    grade: "Grade",
    quiz: "Quiz",
    other: "Update",
  };

  return (
    <div className="p-8 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <Link
            href="/learnus"
            className="p-1.5 hover:bg-[var(--muted)] rounded-lg transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Bell className="w-6 h-6 text-brand-500" />
              LearNUS Notifications
              {unreadCount > 0 && (
                <span className="bg-red-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">
                  {unreadCount}
                </span>
              )}
            </h1>
            <p className="text-sm text-[var(--muted-foreground)]">
              Track updates from your LearNUS courses
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {unreadCount > 0 && (
            <button
              onClick={handleMarkAllRead}
              className="flex items-center gap-1.5 px-3 py-2 border border-[var(--border)] rounded-lg text-xs font-medium hover:bg-[var(--muted)] transition-colors"
            >
              <CheckCheck className="w-3.5 h-3.5" />
              Mark all read
            </button>
          )}
          <button
            onClick={() => setShowCredForm(!showCredForm)}
            className="flex items-center gap-1.5 px-3 py-2 border border-[var(--border)] rounded-lg text-xs font-medium hover:bg-[var(--muted)] transition-colors"
          >
            <Key className="w-3.5 h-3.5" />
            {hasCredentials ? "Update Login" : "Set Login"}
          </button>
          <button
            onClick={handleCheckNow}
            disabled={checking}
            className="flex items-center gap-1.5 px-4 py-2 bg-[var(--foreground)] text-[var(--background)] rounded-lg text-xs font-medium hover:opacity-90 disabled:opacity-50 transition-opacity"
          >
            {checking ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <RefreshCw className="w-3.5 h-3.5" />
            )}
            Check Now
          </button>
        </div>
      </div>

      {/* Credentials Form */}
      {showCredForm && (
        <div className="border border-[var(--border)] rounded-xl p-5 mb-6 bg-[var(--muted)]">
          <h3 className="font-semibold text-sm mb-3">LearNUS Credentials</h3>
          <p className="text-xs text-[var(--muted-foreground)] mb-3">
            Save your credentials for quick notification checks. Stored in memory only — never persisted to disk.
          </p>
          <div className="flex items-end gap-3 max-w-lg">
            <div className="flex-1">
              <label className="block text-xs font-medium mb-1">Username</label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Student ID"
                className="w-full px-3 py-1.5 border border-[var(--border)] rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-brand-300"
              />
            </div>
            <div className="flex-1 relative">
              <label className="block text-xs font-medium mb-1">Password</label>
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Password"
                className="w-full px-3 py-1.5 border border-[var(--border)] rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-brand-300 pr-8"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-2 top-[26px] p-0.5 text-[var(--muted-foreground)]"
              >
                {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
              </button>
            </div>
            <button
              onClick={handleSaveCredentials}
              disabled={!username || !password}
              className="px-4 py-1.5 bg-[var(--foreground)] text-[var(--background)] rounded-lg text-sm font-medium hover:opacity-90 disabled:opacity-40"
            >
              Save
            </button>
          </div>
        </div>
      )}

      {/* Check Progress */}
      {checkLogs.length > 0 && (
        <div className="border border-[var(--border)] rounded-xl overflow-hidden mb-6">
          <div className="px-4 py-2.5 bg-[var(--muted)] border-b border-[var(--border)] flex items-center gap-2">
            {checking ? (
              <Loader2 className="w-4 h-4 animate-spin text-brand-500" />
            ) : (
              <CheckCheck className="w-4 h-4 text-green-500" />
            )}
            <span className="text-xs font-medium">
              {checking ? "Checking LearNUS..." : "Check complete"}
            </span>
          </div>
          <div className="max-h-40 overflow-auto p-3 font-mono text-xs space-y-0.5 bg-gray-950 text-gray-300">
            {checkLogs.map((log, i) => (
              <div key={i} className="flex gap-2">
                <span className="text-gray-600 shrink-0">
                  {new Date(log.timestamp).toLocaleTimeString()}
                </span>
                <span className={log.phase === "error" ? "text-red-400" : log.phase === "complete" ? "text-green-400" : ""}>
                  {log.message}
                </span>
              </div>
            ))}
            <div ref={logsEndRef} />
          </div>
        </div>
      )}

      {/* No credentials warning */}
      {!hasCredentials && !showCredForm && !loading && (
        <div className="border border-amber-200 bg-amber-50 rounded-xl p-4 mb-6">
          <div className="flex items-center gap-2 text-amber-700">
            <AlertCircle className="w-4 h-4" />
            <p className="text-sm">
              Set your LearNUS login to enable notification checking.
            </p>
          </div>
        </div>
      )}

      {/* Notification List */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-6 h-6 animate-spin text-[var(--muted-foreground)]" />
        </div>
      ) : notifications.length === 0 ? (
        <div className="text-center py-20">
          <Bell className="w-12 h-12 text-[var(--muted-foreground)] mx-auto mb-4 opacity-40" />
          <h3 className="font-medium mb-1">No notifications yet</h3>
          <p className="text-sm text-[var(--muted-foreground)]">
            Click &quot;Check Now&quot; to scan LearNUS for updates.
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {notifications.map((notif) => (
            <div
              key={notif.id}
              className={`border rounded-xl px-5 py-3.5 transition-colors cursor-pointer ${
                notif.read
                  ? "border-[var(--border)] bg-white"
                  : "border-brand-200 bg-brand-50/30"
              }`}
              onClick={() => !notif.read && handleMarkRead(notif.id)}
            >
              <div className="flex items-start gap-3">
                <div className="mt-0.5">{typeIcons[notif.type] || typeIcons.other}</div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="text-xs font-medium text-[var(--muted-foreground)]">
                      {notif.courseName}
                    </span>
                    <span className="text-xs px-1.5 py-0.5 rounded bg-[var(--muted)] text-[var(--muted-foreground)]">
                      {typeLabels[notif.type] || "Update"}
                    </span>
                    {!notif.read && (
                      <span className="w-2 h-2 rounded-full bg-brand-500" />
                    )}
                    {notif.autoTaskCreated && (
                      <span className="text-xs px-1.5 py-0.5 rounded bg-green-100 text-green-700">
                        Task created
                      </span>
                    )}
                  </div>

                  <h3 className={`text-sm ${notif.read ? "" : "font-medium"}`}>
                    {notif.title}
                  </h3>

                  {notif.description && (
                    <p className="text-xs text-[var(--muted-foreground)] mt-0.5 line-clamp-2">
                      {notif.description}
                    </p>
                  )}

                  <div className="flex items-center gap-3 mt-1.5 text-xs text-[var(--muted-foreground)]">
                    <span>{new Date(notif.detectedAt).toLocaleString()}</span>
                    {notif.dueDate && (
                      <span className="flex items-center gap-1 text-amber-600">
                        <Calendar className="w-3 h-3" />
                        Due: {new Date(notif.dueDate).toLocaleDateString()}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
