"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  RefreshCw,
  FileText,
  BookOpen,
  Bell,
  Calendar,
  CheckCircle,
  Clock,
  Loader2,
  AlertCircle,
  Sparkles,
  Plus,
  Upload,
  X,
  Brain,
} from "lucide-react";
import type { Course } from "@/lib/types";
import type { HomeworkTask, Activity } from "@/lib/learnus/types";

export default function DashboardPage() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [tasks, setTasks] = useState<HomeworkTask[]>([]);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [syncing, setSyncing] = useState(false);
  const [showUpload, setShowUpload] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState("");

  useEffect(() => {
    fetchAll();
  }, []);

  async function fetchAll() {
    const [coursesRes, tasksRes, activitiesRes] = await Promise.all([
      fetch("/api/courses").then((r) => r.ok ? r.json() : { courses: [] }),
      fetch("/api/learnus/tasks").then((r) => r.ok ? r.json() : { tasks: [] }),
      fetch("/api/learnus/activities").then((r) => r.ok ? r.json() : { activities: [] }),
    ]);
    setCourses(coursesRes.courses || []);
    setTasks(tasksRes.tasks || []);
    setActivities(activitiesRes.activities || []);
  }

  async function handleSync() {
    setSyncing(true);
    try {
      // Trigger notification check (lightweight sync)
      const creds = localStorage.getItem("learnus-creds");
      if (creds) {
        const { username, password } = JSON.parse(creds);
        await fetch("/api/learnus/notifications", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "check", username, password }),
        });
      }
      await fetchAll();
    } finally {
      setSyncing(false);
    }
  }

  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setUploadStatus("Uploading and parsing...");
    const formData = new FormData();
    formData.append("file", file);
    try {
      const res = await fetch("/api/ingest", { method: "POST", body: formData });
      if (res.ok) {
        const data = await res.json();
        setCourses((prev) => [...prev, data.course]);
        setShowUpload(false);
        setUploadStatus("");
      } else {
        setUploadStatus("Error uploading file");
      }
    } catch {
      setUploadStatus("Network error");
    }
    setUploading(false);
  }

  async function handleTextSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const formData = new FormData(form);
    const text = formData.get("text") as string;
    const name = formData.get("name") as string;
    if (!text.trim()) return;
    setUploading(true);
    setUploadStatus("Analyzing materials...");
    try {
      const res = await fetch("/api/ingest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text, name }),
      });
      if (res.ok) {
        const data = await res.json();
        setCourses((prev) => [...prev, data.course]);
        setShowUpload(false);
        setUploadStatus("");
      } else {
        setUploadStatus("Error processing materials");
      }
    } catch {
      setUploadStatus("Network error");
    }
    setUploading(false);
  }

  const pendingTasks = tasks.filter((t) => t.status !== "submitted" && t.status !== "completed");
  const draftReady = tasks.filter((t) => t.status === "draft_ready");
  const drafting = tasks.filter((t) => t.status === "drafting");
  const unreadActivities = activities.filter((a) => !a.read);

  const upcoming = [...pendingTasks]
    .filter((t) => t.dueDate)
    .sort((a, b) => new Date(a.dueDate!).getTime() - new Date(b.dueDate!).getTime())
    .slice(0, 8);

  const formatTimeAgo = (dateStr: string) => {
    const diff = Date.now() - new Date(dateStr).getTime();
    const minutes = Math.floor(diff / 60000);
    if (minutes < 1) return "just now";
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    return `${Math.floor(hours / 24)}d ago`;
  };

  const formatDueDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const days = Math.floor((date.getTime() - Date.now()) / 86400000);
    const text = date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
    if (days < 0) return { text, color: "text-red-500" };
    if (days === 0) return { text: "Today", color: "text-red-500" };
    if (days === 1) return { text: "Tomorrow", color: "text-amber-500" };
    if (days <= 3) return { text, color: "text-amber-500" };
    return { text, color: "text-[var(--muted-foreground)]" };
  };

  const statusBadge = (status: string) => {
    switch (status) {
      case "draft_ready":
        return <span className="text-xs px-2 py-0.5 rounded-full bg-amber-100 text-amber-700">Draft Ready</span>;
      case "drafting":
        return <span className="text-xs px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 flex items-center gap-1"><Loader2 className="w-3 h-3 animate-spin" />Drafting</span>;
      case "reviewed":
        return <span className="text-xs px-2 py-0.5 rounded-full bg-green-100 text-green-700">Reviewed</span>;
      case "new":
        return <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">New</span>;
      case "submitted":
        return <span className="text-xs px-2 py-0.5 rounded-full bg-green-100 text-green-700">Submitted</span>;
      default:
        return <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">{status}</span>;
    }
  };

  // First-time setup
  if (courses.length === 0 && tasks.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center p-8">
        <div className="max-w-md text-center space-y-6">
          <Sparkles className="w-16 h-16 text-brand-500 mx-auto" />
          <h1 className="text-3xl font-bold">Welcome to Claude University</h1>
          <p className="text-[var(--muted-foreground)]">
            Import your courses from LearNUS or upload a syllabus to get started.
            Claude will auto-draft your homework while you actually learn.
          </p>
          <div className="flex gap-3 justify-center">
            <Link
              href="/learnus"
              className="bg-[var(--foreground)] text-[var(--background)] font-semibold px-6 py-3 rounded-lg hover:opacity-90 transition-opacity"
            >
              Connect LearNUS
            </Link>
            <button
              onClick={() => setShowUpload(true)}
              className="border border-[var(--border)] px-6 py-3 rounded-lg hover:bg-[var(--muted)] transition-colors"
            >
              Upload Syllabus
            </button>
          </div>
          <p className="text-xs text-[var(--muted-foreground)]">
            Don&apos;t let school get in the way of your education.
          </p>
        </div>

        {/* Upload Modal (shared with main view) */}
        {showUpload && <UploadModal
          onClose={() => { setShowUpload(false); setUploadStatus(""); setUploading(false); }}
          uploading={uploading}
          uploadStatus={uploadStatus}
          onFileUpload={handleFileUpload}
          onTextSubmit={handleTextSubmit}
        />}
      </div>
    );
  }

  return (
    <div className="p-8 max-w-4xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-2xl font-bold">Home</h1>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowUpload(true)}
            className="flex items-center gap-2 px-3 py-2 text-sm border border-[var(--border)] rounded-lg hover:bg-[var(--muted)] transition-colors"
          >
            <Plus className="w-4 h-4" />
            Add Course
          </button>
          <button
            onClick={handleSync}
            disabled={syncing}
            className="flex items-center gap-2 px-3 py-2 text-sm bg-[var(--foreground)] text-[var(--background)] rounded-lg hover:opacity-90 disabled:opacity-50 transition-opacity"
          >
            <RefreshCw className={`w-4 h-4 ${syncing ? "animate-spin" : ""}`} />
            {syncing ? "Syncing..." : "Sync"}
          </button>
        </div>
      </div>

      {/* Action Items */}
      {(draftReady.length > 0 || drafting.length > 0 || unreadActivities.length > 0) && (
        <section className="mb-8">
          <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-brand-500" />
            Action Items
          </h2>
          <div className="space-y-2">
            {draftReady.map((t) => (
              <div key={t.id} className="border border-brand-200 bg-brand-50/50 rounded-xl p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <FileText className="w-5 h-5 text-brand-500" />
                  <div>
                    <div className="font-medium text-sm">{t.title}</div>
                    <div className="text-xs text-[var(--muted-foreground)]">
                      {t.courseName}
                      {t.dueDate && ` · Due ${formatDueDate(t.dueDate).text}`}
                      {" · "}<span className="text-brand-600">Draft Ready</span>
                    </div>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Link href="/assignments" className="px-3 py-1.5 text-xs bg-brand-500 text-white font-medium rounded-lg hover:bg-brand-600 transition-colors">
                    Review Draft
                  </Link>
                  {t.courseId && (
                    <Link href={`/course/${t.courseId}/learn`} className="px-3 py-1.5 text-xs border border-[var(--border)] rounded-lg hover:bg-[var(--muted)] transition-colors">
                      Learn Topic
                    </Link>
                  )}
                </div>
              </div>
            ))}

            {drafting.map((t) => (
              <div key={t.id} className="border border-blue-200 bg-blue-50/50 rounded-xl p-4 flex items-center gap-3">
                <Loader2 className="w-5 h-5 text-blue-500 animate-spin" />
                <div>
                  <div className="font-medium text-sm">{t.title}</div>
                  <div className="text-xs text-[var(--muted-foreground)]">{t.courseName} · <span className="text-blue-600">Drafting...</span></div>
                </div>
              </div>
            ))}

            {unreadActivities.slice(0, 3).map((a) => (
              <div key={a.id} className="border border-[var(--border)] rounded-xl p-4 flex items-center gap-3">
                {a.type === "material" ? <BookOpen className="w-5 h-5 text-green-500" /> :
                 a.type === "announcement" ? <Bell className="w-5 h-5 text-blue-500" /> :
                 <FileText className="w-5 h-5 text-[var(--muted-foreground)]" />}
                <div>
                  <div className="font-medium text-sm">{a.title}</div>
                  <div className="text-xs text-[var(--muted-foreground)]">{a.courseName} · {a.type} · {formatTimeAgo(a.detectedAt)}</div>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* All Caught Up */}
      {pendingTasks.length === 0 && unreadActivities.length === 0 && courses.length > 0 && (
        <div className="text-center py-12 mb-8">
          <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-3" />
          <h2 className="text-xl font-semibold">All caught up!</h2>
          <p className="text-[var(--muted-foreground)] mt-1">No pending assignments or new updates.</p>
        </div>
      )}

      {/* Upcoming Deadlines */}
      {upcoming.length > 0 && (
        <section className="mb-8">
          <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
            <Calendar className="w-5 h-5 text-[var(--muted-foreground)]" />
            Upcoming Deadlines
          </h2>
          <div className="border border-[var(--border)] rounded-xl divide-y divide-[var(--border)] bg-white">
            {upcoming.map((t) => {
              const due = formatDueDate(t.dueDate!);
              return (
                <div key={t.id} className="flex items-center justify-between px-4 py-3">
                  <div className="flex items-center gap-3">
                    <span className={`text-sm font-medium w-20 ${due.color}`}>{due.text}</span>
                    <div>
                      <div className="text-sm">{t.title}</div>
                      <div className="text-xs text-[var(--muted-foreground)]">{t.courseName}</div>
                    </div>
                  </div>
                  {statusBadge(t.status)}
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* Courses */}
      {courses.length > 0 && (
        <section className="mb-8">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-semibold">Courses</h2>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-3">
            {courses.map((course) => (
              <div key={course.id} className="border border-[var(--border)] rounded-xl p-4 bg-white hover:border-brand-300 transition-colors">
                <h3 className="font-semibold text-sm mb-1 line-clamp-2">{course.name}</h3>
                {course.semester && <div className="text-xs text-[var(--muted-foreground)] mb-3">{course.semester}</div>}
                <div className="text-xs text-[var(--muted-foreground)] mb-3">
                  {course.topics?.length || 0} topics · {course.weekly_schedule?.length || 0} weeks
                </div>
                <div className="flex gap-2">
                  <Link href={`/course/${course.id}/learn`} className="flex-1 flex items-center justify-center gap-1 py-1.5 bg-[var(--foreground)] text-[var(--background)] rounded-lg text-xs font-medium hover:opacity-90 transition-opacity">
                    <BookOpen className="w-3 h-3" /> Learn
                  </Link>
                  <Link href={`/course/${course.id}/quiz`} className="flex-1 flex items-center justify-center gap-1 py-1.5 border border-[var(--border)] rounded-lg text-xs font-medium hover:bg-[var(--muted)] transition-colors">
                    <Brain className="w-3 h-3" /> Quiz
                  </Link>
                  <Link href={`/course/${course.id}/plan`} className="flex-1 flex items-center justify-center gap-1 py-1.5 border border-[var(--border)] rounded-lg text-xs font-medium hover:bg-[var(--muted)] transition-colors">
                    <Calendar className="w-3 h-3" /> Plan
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Recent Activity */}
      {activities.length > 0 && (
        <section>
          <h2 className="text-lg font-semibold mb-3">Recent Activity</h2>
          <div className="space-y-1">
            {activities.slice(0, 10).map((a) => (
              <div key={a.id} className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm ${a.read ? "text-[var(--muted-foreground)]" : ""}`}>
                <span className="text-xs text-[var(--muted-foreground)] w-16 shrink-0">{formatTimeAgo(a.detectedAt)}</span>
                <span className="truncate">{a.type === "grade" ? "Grade posted" : a.type === "material" ? "New material" : a.type}: {a.title}</span>
                <span className="text-xs text-[var(--muted-foreground)] shrink-0">{a.courseName}</span>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Upload Modal */}
      {showUpload && <UploadModal
        onClose={() => { setShowUpload(false); setUploadStatus(""); setUploading(false); }}
        uploading={uploading}
        uploadStatus={uploadStatus}
        onFileUpload={handleFileUpload}
        onTextSubmit={handleTextSubmit}
      />}
    </div>
  );
}

function UploadModal({
  onClose,
  uploading,
  uploadStatus,
  onFileUpload,
  onTextSubmit,
}: {
  onClose: () => void;
  uploading: boolean;
  uploadStatus: string;
  onFileUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onTextSubmit: (e: React.FormEvent<HTMLFormElement>) => void;
}) {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-6">
      <div className="bg-[var(--background)] rounded-2xl p-8 max-w-lg w-full max-h-[80vh] overflow-auto">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold">Add a Course</h2>
          <button onClick={onClose} className="p-1 hover:bg-[var(--muted)] rounded-lg transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {uploadStatus && (
          <div className="mb-4 p-3 bg-brand-50 border border-brand-200 rounded-lg text-sm flex items-center gap-2">
            {uploading && <Loader2 className="w-4 h-4 animate-spin" />}
            {uploadStatus}
          </div>
        )}

        <div className="mb-6">
          <h3 className="text-sm font-medium mb-3">Upload a PDF</h3>
          <label className="flex flex-col items-center justify-center gap-3 p-8 border-2 border-dashed border-[var(--border)] rounded-xl cursor-pointer hover:border-brand-300 hover:bg-brand-50/50 transition-colors">
            <Upload className="w-8 h-8 text-[var(--muted-foreground)]" />
            <span className="text-sm text-[var(--muted-foreground)]">Drop your syllabus or lecture PDF here</span>
            <span className="text-xs text-[var(--muted-foreground)]">PDF files up to 10MB</span>
            <input type="file" accept=".pdf" onChange={onFileUpload} className="hidden" disabled={uploading} />
          </label>
        </div>

        <div className="flex items-center gap-4 mb-6">
          <div className="flex-1 h-px bg-[var(--border)]" />
          <span className="text-sm text-[var(--muted-foreground)]">or paste text</span>
          <div className="flex-1 h-px bg-[var(--border)]" />
        </div>

        <form onSubmit={onTextSubmit}>
          <div className="mb-4">
            <label className="block text-sm font-medium mb-1.5">Course Name</label>
            <input name="name" type="text" placeholder="e.g., Introduction to Computer Science" className="w-full px-4 py-2.5 rounded-lg border border-[var(--border)] bg-white focus:outline-none focus:ring-2 focus:ring-brand-300" />
          </div>
          <div className="mb-4">
            <label className="block text-sm font-medium mb-1.5">Syllabus / Course Content</label>
            <textarea name="text" rows={6} placeholder="Paste your syllabus, course outline, or lecture notes here..." className="w-full px-4 py-2.5 rounded-lg border border-[var(--border)] bg-white focus:outline-none focus:ring-2 focus:ring-brand-300 resize-none" />
          </div>
          <button type="submit" disabled={uploading} className="w-full flex items-center justify-center gap-2 bg-[var(--foreground)] text-[var(--background)] py-2.5 rounded-lg text-sm font-medium hover:opacity-90 disabled:opacity-50 transition-opacity">
            <FileText className="w-4 h-4" /> Create Course
          </button>
        </form>
      </div>
    </div>
  );
}
