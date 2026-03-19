import { useState, useEffect, useCallback } from "react";
import {
  RefreshCw,
  FileText,
  BookOpen,
  Bell,
  Calendar,
  CheckCircle,
  Clock,
  Loader,
  AlertCircle,
  Sparkles,
} from "lucide-react";
import { useStorage, useBackgroundMessages, sendMessage } from "../hooks/useStorage";
import type { Assignment, Activity, SyncState, Course } from "@/shared/types";
import type { Page } from "../App";

interface HomeProps {
  navigate: (page: Page) => void;
}

export function Home({ navigate }: HomeProps) {
  const [assignments] = useStorage<Assignment[]>("assignments", []);
  const [activities] = useStorage<Activity[]>("activities", []);
  const [syncState] = useStorage<SyncState>("syncState", {
    lastSyncedAt: null,
    inProgress: false,
    phase: "idle",
    message: "",
    coursesFound: 0,
    assignmentsFound: 0,
    materialsFound: 0,
  });
  const [courses] = useStorage<Course[]>("courses", []);
  const [syncLog, setSyncLog] = useState<string[]>([]);

  // Listen for sync progress messages
  useBackgroundMessages(
    useCallback((message: { type: string; [key: string]: unknown }) => {
      if (message.type === "SYNC_PROGRESS") {
        setSyncLog((prev) => [...prev.slice(-20), message.message as string]);
      }
      if (message.type === "SYNC_COMPLETE") {
        setSyncLog([]);
      }
    }, [])
  );

  // Auto-sync on mount
  useEffect(() => {
    if (!syncState.lastSyncedAt && !syncState.inProgress && courses.length === 0) {
      // First visit — show setup prompt instead of auto-syncing
    }
  }, []);

  const handleSync = () => {
    setSyncLog([]);
    sendMessage({ type: "SYNC_LEARNUS", force: true });
  };

  const pendingAssignments = assignments.filter((a) => a.status !== "submitted");
  const draftReady = assignments.filter((a) => a.status === "draft_ready");
  const drafting = assignments.filter((a) => a.status === "drafting");
  const unreadActivities = activities.filter((a) => !a.read);
  const hasSetup = courses.length > 0;

  // Upcoming deadlines (sorted by due date)
  const upcoming = [...pendingAssignments]
    .filter((a) => a.dueDate)
    .sort((a, b) => new Date(a.dueDate!).getTime() - new Date(b.dueDate!).getTime())
    .slice(0, 8);

  const formatTimeAgo = (dateStr: string) => {
    const diff = Date.now() - new Date(dateStr).getTime();
    const minutes = Math.floor(diff / 60000);
    if (minutes < 1) return "just now";
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
  };

  const formatDueDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diff = date.getTime() - now.getTime();
    const days = Math.floor(diff / 86400000);

    const formatted = date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    });

    if (days < 0) return { text: formatted, urgent: "overdue" };
    if (days === 0) return { text: "Today", urgent: "today" };
    if (days === 1) return { text: "Tomorrow", urgent: "soon" };
    if (days <= 3) return { text: formatted, urgent: "soon" };
    return { text: formatted, urgent: "normal" };
  };

  const statusIcon = (status: Assignment["status"]) => {
    switch (status) {
      case "draft_ready":
        return <CheckCircle className="w-4 h-4 text-amber-400" />;
      case "drafting":
        return <Loader className="w-4 h-4 text-blue-400 animate-spin" />;
      case "reviewed":
        return <CheckCircle className="w-4 h-4 text-green-400" />;
      case "new":
        return <Clock className="w-4 h-4 text-gray-400" />;
      default:
        return <CheckCircle className="w-4 h-4 text-gray-600" />;
    }
  };

  const statusLabel = (status: Assignment["status"]) => {
    switch (status) {
      case "draft_ready": return "Draft Ready";
      case "drafting": return "Drafting...";
      case "reviewed": return "Reviewed";
      case "new": return "New";
      case "submitted": return "Submitted";
    }
  };

  // ── First-time setup ──
  if (!hasSetup && !syncState.inProgress) {
    return (
      <div className="min-h-screen flex items-center justify-center p-8">
        <div className="max-w-md text-center space-y-6">
          <Sparkles className="w-16 h-16 text-amber-400 mx-auto" />
          <h1 className="text-3xl font-bold">Welcome to Claude University</h1>
          <p className="text-gray-400">
            Connect your LearNUS account to auto-import all your courses,
            assignments, and materials. Claude will draft your homework while
            you actually learn.
          </p>
          <button
            onClick={() => navigate({ name: "settings" })}
            className="bg-amber-500 text-black font-semibold px-6 py-3 rounded-lg hover:bg-amber-400 transition-colors"
          >
            Connect LearNUS
          </button>
          <p className="text-xs text-gray-600">
            Uses your existing Claude Pro / ChatGPT Plus subscription. Zero API costs.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Home</h1>
        <div className="flex items-center gap-3">
          {syncState.lastSyncedAt && (
            <span className="text-xs text-gray-500">
              Synced {formatTimeAgo(syncState.lastSyncedAt)}
            </span>
          )}
          <button
            onClick={handleSync}
            disabled={syncState.inProgress}
            className="flex items-center gap-2 px-3 py-1.5 text-sm bg-[#1a1a1a] border border-[#333] rounded-lg hover:bg-[#222] transition-colors disabled:opacity-50"
          >
            <RefreshCw
              className={`w-4 h-4 ${syncState.inProgress ? "animate-spin" : ""}`}
            />
            {syncState.inProgress ? "Syncing..." : "Sync"}
          </button>
        </div>
      </div>

      {/* Sync progress */}
      {syncState.inProgress && syncLog.length > 0 && (
        <div className="bg-[#111] border border-[#222] rounded-lg p-4">
          <div className="text-sm text-gray-400 mb-2">Syncing with LearNUS...</div>
          <div className="space-y-1">
            {syncLog.slice(-5).map((msg, i) => (
              <div key={i} className="text-xs text-gray-500 font-mono">
                {msg}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Action Items */}
      {(draftReady.length > 0 || drafting.length > 0 || unreadActivities.length > 0) && (
        <section>
          <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-amber-400" />
            Action Items
          </h2>
          <div className="space-y-2">
            {draftReady.map((a) => (
              <div
                key={a.id}
                className="bg-[#111] border border-amber-500/20 rounded-lg p-4 flex items-center justify-between hover:border-amber-500/40 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <FileText className="w-5 h-5 text-amber-400" />
                  <div>
                    <div className="font-medium">{a.title}</div>
                    <div className="text-sm text-gray-500">
                      {a.courseName}
                      {a.dueDate && ` · Due ${formatDueDate(a.dueDate).text}`}
                      {" · "}
                      <span className="text-amber-400">Draft Ready</span>
                    </div>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => navigate({ name: "assignments" })}
                    className="px-3 py-1.5 text-sm bg-amber-500 text-black font-medium rounded-lg hover:bg-amber-400 transition-colors"
                  >
                    Review Draft
                  </button>
                  <button
                    onClick={() => navigate({ name: "learn", courseId: a.courseId })}
                    className="px-3 py-1.5 text-sm bg-[#1a1a1a] border border-[#333] rounded-lg hover:bg-[#222] transition-colors"
                  >
                    Learn Topic
                  </button>
                </div>
              </div>
            ))}

            {drafting.map((a) => (
              <div
                key={a.id}
                className="bg-[#111] border border-blue-500/20 rounded-lg p-4 flex items-center gap-3"
              >
                <Loader className="w-5 h-5 text-blue-400 animate-spin" />
                <div>
                  <div className="font-medium">{a.title}</div>
                  <div className="text-sm text-gray-500">
                    {a.courseName} · <span className="text-blue-400">Drafting...</span>
                  </div>
                </div>
              </div>
            ))}

            {unreadActivities.slice(0, 3).map((a) => (
              <div
                key={a.id}
                className="bg-[#111] border border-[#222] rounded-lg p-4 flex items-center gap-3"
              >
                {a.type === "material" ? (
                  <BookOpen className="w-5 h-5 text-green-400" />
                ) : a.type === "announcement" ? (
                  <Bell className="w-5 h-5 text-blue-400" />
                ) : (
                  <FileText className="w-5 h-5 text-gray-400" />
                )}
                <div>
                  <div className="font-medium">{a.title}</div>
                  <div className="text-sm text-gray-500">
                    {a.courseName} · {a.type} · {formatTimeAgo(a.detectedAt)}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* All Caught Up */}
      {pendingAssignments.length === 0 && unreadActivities.length === 0 && hasSetup && (
        <div className="text-center py-12">
          <CheckCircle className="w-12 h-12 text-green-400 mx-auto mb-3" />
          <h2 className="text-xl font-semibold">All caught up!</h2>
          <p className="text-gray-500 mt-1">No pending assignments or new updates.</p>
        </div>
      )}

      {/* Upcoming Deadlines */}
      {upcoming.length > 0 && (
        <section>
          <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
            <Calendar className="w-5 h-5 text-gray-400" />
            Upcoming Deadlines
          </h2>
          <div className="bg-[#111] border border-[#222] rounded-lg divide-y divide-[#222]">
            {upcoming.map((a) => {
              const due = formatDueDate(a.dueDate!);
              return (
                <div
                  key={a.id}
                  className="flex items-center justify-between px-4 py-3"
                >
                  <div className="flex items-center gap-3">
                    <span
                      className={`text-sm font-medium w-16 ${
                        due.urgent === "overdue"
                          ? "text-red-400"
                          : due.urgent === "today"
                          ? "text-red-400"
                          : due.urgent === "soon"
                          ? "text-amber-400"
                          : "text-gray-500"
                      }`}
                    >
                      {due.text}
                    </span>
                    <div>
                      <div className="text-sm">{a.title}</div>
                      <div className="text-xs text-gray-600">{a.courseName}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    {statusIcon(a.status)}
                    <span className="text-gray-500">{statusLabel(a.status)}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* Course Quick Access */}
      {courses.length > 0 && (
        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-semibold">Courses</h2>
            <button
              onClick={() => navigate({ name: "courses" })}
              className="text-sm text-gray-500 hover:text-gray-300"
            >
              View all
            </button>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {courses.slice(0, 6).map((c) => (
              <button
                key={c.id}
                onClick={() => navigate({ name: "course", courseId: c.id })}
                className="bg-[#111] border border-[#222] rounded-lg p-4 text-left hover:border-[#333] transition-colors"
              >
                <div className="font-medium text-sm truncate">{c.name}</div>
                <div className="text-xs text-gray-600 mt-1">{c.semester}</div>
              </button>
            ))}
          </div>
        </section>
      )}

      {/* Recent Activity */}
      {activities.length > 0 && (
        <section>
          <h2 className="text-lg font-semibold mb-3">Recent Activity</h2>
          <div className="space-y-2">
            {activities.slice(0, 10).map((a) => (
              <div
                key={a.id}
                className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm ${
                  a.read ? "text-gray-600" : "text-gray-300 bg-[#111]"
                }`}
              >
                <span className="text-xs text-gray-600 w-16 shrink-0">
                  {formatTimeAgo(a.detectedAt)}
                </span>
                <span className="truncate">
                  {a.type === "grade" ? "Grade posted" : a.type === "material" ? "New material" : a.type}: {a.title}
                </span>
                <span className="text-xs text-gray-700 shrink-0">{a.courseName}</span>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
