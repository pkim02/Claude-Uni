"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import ReactMarkdown from "react-markdown";
import {
  FileText,
  Clock,
  Loader2,
  CheckCircle,
  Check,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  BookOpen,
  Plus,
  Zap,
  Trash2,
  Calendar,
} from "lucide-react";
import type { HomeworkTask } from "@/lib/learnus/types";

interface CourseOption {
  id: string;
  name: string;
}

export default function AssignmentsPage() {
  const [tasks, setTasks] = useState<HomeworkTask[]>([]);
  const [courses, setCourses] = useState<CourseOption[]>([]);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState("");
  const [solvingId, setSolvingId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(true);

  // Form state
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [courseId, setCourseId] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [taskType, setTaskType] = useState("assignment");

  useEffect(() => {
    fetchAll();
  }, []);

  async function fetchAll() {
    const [tasksRes, coursesRes] = await Promise.all([
      fetch("/api/learnus/tasks").then((r) => r.ok ? r.json() : { tasks: [] }),
      fetch("/api/courses").then((r) => r.ok ? r.json() : { courses: [] }),
    ]);
    setTasks(tasksRes.tasks || []);
    setCourses((coursesRes.courses || []).map((c: { id: string; name: string }) => ({ id: c.id, name: c.name })));
    setLoading(false);
  }

  async function handleCreate() {
    if (!title.trim()) return;
    const courseName = courses.find((c) => c.id === courseId)?.name || "General";
    const res = await fetch("/api/learnus/tasks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "create",
        courseId,
        courseName,
        title: title.trim(),
        description: description.trim(),
        dueDate: dueDate || null,
        type: taskType,
        autoDraft: true,
      }),
    });
    if (res.ok) {
      const data = await res.json();
      setTasks((prev) => [data.task, ...prev]);
      setTitle(""); setDescription(""); setCourseId(""); setDueDate(""); setTaskType("assignment");
      setShowForm(false);
      // Poll for draft completion
      pollForDraft(data.task.id);
    }
  }

  async function pollForDraft(taskId: string) {
    for (let i = 0; i < 30; i++) {
      await new Promise((r) => setTimeout(r, 3000));
      const res = await fetch("/api/learnus/tasks");
      if (res.ok) {
        const data = await res.json();
        const task = data.tasks.find((t: HomeworkTask) => t.id === taskId);
        if (task && task.status !== "drafting" && task.status !== "new") {
          setTasks(data.tasks);
          return;
        }
        setTasks(data.tasks);
      }
    }
  }

  async function handleSolve(taskId: string, mode: "solve" | "tutor") {
    setSolvingId(taskId);
    try {
      const res = await fetch("/api/learnus/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "solve", taskId, mode }),
      });
      if (res.ok) {
        const data = await res.json();
        setTasks((prev) => prev.map((t) => (t.id === taskId ? data.task : t)));
        setExpandedId(taskId);
      }
    } finally {
      setSolvingId(null);
    }
  }

  async function handleMarkReviewed(taskId: string) {
    const res = await fetch("/api/learnus/tasks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "mark_reviewed",
        taskId,
        finalSolution: editText || tasks.find((t) => t.id === taskId)?.draftSolution,
      }),
    });
    if (res.ok) {
      const data = await res.json();
      setTasks((prev) => prev.map((t) => (t.id === taskId ? data.task : t)));
      setEditingId(null);
    }
  }

  async function handleMarkSubmitted(taskId: string) {
    const res = await fetch("/api/learnus/tasks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "mark_submitted", taskId }),
    });
    if (res.ok) {
      const data = await res.json();
      setTasks((prev) => prev.map((t) => (t.id === taskId ? data.task : t)));
    }
  }

  async function handleDelete(taskId: string) {
    await fetch("/api/learnus/tasks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "delete", taskId }),
    });
    setTasks((prev) => prev.filter((t) => t.id !== taskId));
  }

  async function handleAutoDraft(taskId: string) {
    setSolvingId(taskId);
    const res = await fetch("/api/learnus/tasks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "auto_draft", taskId, mode: "solve" }),
    });
    if (res.ok) {
      const data = await res.json();
      setTasks((prev) => prev.map((t) => (t.id === taskId ? data.task : t)));
      setExpandedId(taskId);
    }
    setSolvingId(null);
  }

  const statusConfig: Record<string, { icon: typeof Clock; color: string; bg: string; label: string }> = {
    new: { icon: Clock, color: "text-gray-500", bg: "bg-gray-100 text-gray-700", label: "New" },
    pending: { icon: Clock, color: "text-gray-500", bg: "bg-gray-100 text-gray-700", label: "Pending" },
    drafting: { icon: Loader2, color: "text-blue-500", bg: "bg-blue-100 text-blue-700", label: "Drafting..." },
    in_progress: { icon: Loader2, color: "text-blue-500", bg: "bg-blue-100 text-blue-700", label: "Working..." },
    draft_ready: { icon: FileText, color: "text-brand-500", bg: "bg-amber-100 text-amber-700", label: "Draft Ready" },
    reviewed: { icon: CheckCircle, color: "text-green-500", bg: "bg-green-100 text-green-700", label: "Reviewed" },
    submitted: { icon: Check, color: "text-green-600", bg: "bg-green-100 text-green-700", label: "Submitted" },
    completed: { icon: CheckCircle, color: "text-green-500", bg: "bg-green-100 text-green-700", label: "Solved" },
  };

  const formatDue = (dateStr: string | null) => {
    if (!dateStr) return null;
    const date = new Date(dateStr);
    const days = Math.floor((date.getTime() - Date.now()) / 86400000);
    const text = date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
    if (days < 0) return { text: `Overdue (${text})`, color: "text-red-500" };
    if (days === 0) return { text: "Due Today", color: "text-red-500" };
    if (days === 1) return { text: "Due Tomorrow", color: "text-amber-500" };
    if (days <= 3) return { text: `Due ${text}`, color: "text-amber-500" };
    return { text: `Due ${text}`, color: "text-[var(--muted-foreground)]" };
  };

  // Group tasks
  const actionNeeded = tasks.filter((t) => t.status === "draft_ready" || t.status === "reviewed");
  const inProgress = tasks.filter((t) => ["new", "pending", "drafting", "in_progress"].includes(t.status));
  const done = tasks.filter((t) => t.status === "submitted" || t.status === "completed");

  function renderTask(t: HomeworkTask) {
    const config = statusConfig[t.status] || statusConfig.pending;
    const Icon = config.icon;
    const isExpanded = expandedId === t.id;
    const isEditing = editingId === t.id;
    const due = formatDue(t.dueDate);
    const solution = t.finalSolution || t.draftSolution || t.solution;

    return (
      <div key={t.id} className={`border rounded-xl overflow-hidden ${t.status === "draft_ready" ? "border-brand-200" : "border-[var(--border)]"}`}>
        {/* Header */}
        <div
          className="px-5 py-4 flex items-center gap-3 cursor-pointer hover:bg-[var(--muted)] transition-colors"
          onClick={() => setExpandedId(isExpanded ? null : t.id)}
        >
          <Icon className={`w-4 h-4 shrink-0 ${config.color} ${t.status === "drafting" || t.status === "in_progress" ? "animate-spin" : ""}`} />
          <div className="flex-1 min-w-0">
            <div className="font-medium text-sm truncate">{t.title}</div>
            <div className="flex items-center gap-2 text-xs text-[var(--muted-foreground)] mt-0.5">
              <span>{t.courseName}</span>
              <span className={`px-1.5 py-0.5 rounded-full ${config.bg}`}>{config.label}</span>
              {due && <span className={due.color}>{due.text}</span>}
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0" onClick={(e) => e.stopPropagation()}>
            {t.status === "draft_ready" && (
              <button onClick={() => { setExpandedId(t.id); setEditingId(t.id); setEditText(solution || ""); }} className="px-3 py-1.5 text-xs bg-brand-500 text-white font-medium rounded-lg hover:bg-brand-600 transition-colors">
                Review Draft
              </button>
            )}
            {t.status === "reviewed" && (
              <button onClick={() => handleMarkSubmitted(t.id)} className="px-3 py-1.5 text-xs bg-green-600 text-white font-medium rounded-lg hover:bg-green-500 transition-colors">
                Mark Submitted
              </button>
            )}
            {(t.status === "pending" || t.status === "new") && (
              <>
                <button onClick={() => handleAutoDraft(t.id)} disabled={solvingId === t.id} className="flex items-center gap-1 px-3 py-1.5 text-xs bg-brand-500 text-white font-medium rounded-lg hover:bg-brand-600 disabled:opacity-50 transition-colors">
                  {solvingId === t.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <Zap className="w-3 h-3" />} Draft
                </button>
                <button onClick={() => handleSolve(t.id, "tutor")} disabled={solvingId === t.id} className="flex items-center gap-1 px-3 py-1.5 text-xs border border-[var(--border)] rounded-lg hover:bg-[var(--muted)] disabled:opacity-50 transition-colors">
                  <BookOpen className="w-3 h-3" /> Teach
                </button>
              </>
            )}
            <button onClick={() => handleDelete(t.id)} className="p-1.5 text-[var(--muted-foreground)] hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors">
              <Trash2 className="w-3.5 h-3.5" />
            </button>
            {isExpanded ? <ChevronUp className="w-4 h-4 text-[var(--muted-foreground)]" /> : <ChevronDown className="w-4 h-4 text-[var(--muted-foreground)]" />}
          </div>
        </div>

        {/* Expanded */}
        {isExpanded && (
          <div className="border-t border-[var(--border)] px-5 py-4 bg-[var(--muted)] space-y-4">
            {t.description && (
              <div>
                <div className="text-xs text-[var(--muted-foreground)] mb-1 font-medium">Assignment Instructions</div>
                <div className="text-sm bg-white rounded-lg p-3 border border-[var(--border)]">{t.description}</div>
              </div>
            )}

            {solution && (
              <div>
                <div className="flex items-center justify-between mb-1">
                  <div className="text-xs text-[var(--muted-foreground)] font-medium">
                    {t.finalSolution ? "Your Solution" : "Auto-Generated Draft"}
                  </div>
                  {t.sourceUrl && (
                    <a href={t.sourceUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-xs text-[var(--muted-foreground)] hover:text-[var(--foreground)]">
                      <ExternalLink className="w-3 h-3" /> Open in LearNUS
                    </a>
                  )}
                </div>

                {isEditing ? (
                  <div className="space-y-3">
                    <textarea
                      value={editText}
                      onChange={(e) => setEditText(e.target.value)}
                      className="w-full bg-white border border-[var(--border)] rounded-lg p-3 text-sm font-mono min-h-[300px] resize-y focus:outline-none focus:ring-2 focus:ring-brand-300"
                    />
                    <div className="flex gap-2">
                      <button onClick={() => handleMarkReviewed(t.id)} className="px-4 py-2 text-sm bg-brand-500 text-white font-medium rounded-lg hover:bg-brand-600 transition-colors">
                        Save & Mark Reviewed
                      </button>
                      <button onClick={() => setEditingId(null)} className="px-4 py-2 text-sm border border-[var(--border)] rounded-lg hover:bg-white transition-colors">
                        Cancel
                      </button>
                    </div>
                    <div className="text-xs text-[var(--muted-foreground)] p-3 bg-brand-50 border border-brand-100 rounded-lg">
                      <strong className="text-brand-600">Make it yours:</strong> Edit the draft to add your personal voice, swap examples, and reference things from your lectures.
                    </div>
                  </div>
                ) : (
                  <div className="bg-white rounded-lg p-3 border border-[var(--border)] prose prose-sm max-w-none max-h-96 overflow-y-auto">
                    <ReactMarkdown>{solution}</ReactMarkdown>
                  </div>
                )}
              </div>
            )}

            {solvingId === t.id && (
              <div className="flex items-center gap-2 p-3 bg-brand-50 border border-brand-100 rounded-lg">
                <Loader2 className="w-4 h-4 animate-spin text-brand-500" />
                <span className="text-xs text-brand-700">Claude is working on this...</span>
              </div>
            )}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold">Assignments</h1>
          <p className="text-sm text-[var(--muted-foreground)]">Auto-drafted by Claude. Review, personalize, submit.</p>
        </div>
        <button onClick={() => setShowForm(!showForm)} className="flex items-center gap-2 px-4 py-2 bg-[var(--foreground)] text-[var(--background)] rounded-lg text-sm font-medium hover:opacity-90 transition-opacity">
          <Plus className="w-4 h-4" /> Add Manually
        </button>
      </div>

      {/* Create Form */}
      {showForm && (
        <div className="border border-[var(--border)] rounded-xl p-6 mb-6 bg-[var(--muted)]">
          <h3 className="font-semibold mb-4">New Assignment</h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1.5">Title</label>
              <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g., Chapter 5 Problem Set" className="w-full px-3 py-2 border border-[var(--border)] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-300 bg-white" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1.5">Description / Instructions</label>
              <textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Paste the assignment instructions..." rows={4} className="w-full px-3 py-2 border border-[var(--border)] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-300 bg-white resize-none" />
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1.5">Course</label>
                <select value={courseId} onChange={(e) => setCourseId(e.target.value)} className="w-full px-3 py-2 border border-[var(--border)] rounded-lg text-sm bg-white">
                  <option value="">No course</option>
                  {courses.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1.5">Type</label>
                <select value={taskType} onChange={(e) => setTaskType(e.target.value)} className="w-full px-3 py-2 border border-[var(--border)] rounded-lg text-sm bg-white">
                  <option value="assignment">Assignment</option>
                  <option value="quiz">Quiz Prep</option>
                  <option value="essay">Essay</option>
                  <option value="project">Project</option>
                  <option value="other">Other</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1.5">Due Date</label>
                <input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} className="w-full px-3 py-2 border border-[var(--border)] rounded-lg text-sm bg-white" />
              </div>
            </div>
            <div className="flex gap-3">
              <button onClick={handleCreate} disabled={!title.trim()} className="px-4 py-2 bg-[var(--foreground)] text-[var(--background)] rounded-lg text-sm font-medium hover:opacity-90 disabled:opacity-40 transition-opacity">
                Create & Auto-Draft
              </button>
              <button onClick={() => setShowForm(false)} className="px-4 py-2 border border-[var(--border)] rounded-lg text-sm hover:bg-white transition-colors">
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-6 h-6 animate-spin text-[var(--muted-foreground)]" />
        </div>
      ) : tasks.length === 0 ? (
        <div className="text-center py-20">
          <FileText className="w-12 h-12 text-[var(--muted-foreground)] mx-auto mb-4 opacity-40" />
          <h3 className="font-medium mb-1">No assignments yet</h3>
          <p className="text-sm text-[var(--muted-foreground)]">Sync with LearNUS or add one manually.</p>
        </div>
      ) : (
        <div className="space-y-8">
          {actionNeeded.length > 0 && (
            <section>
              <h2 className="text-xs font-semibold text-brand-600 mb-3 uppercase tracking-wider">Action Needed ({actionNeeded.length})</h2>
              <div className="space-y-2">{actionNeeded.map(renderTask)}</div>
            </section>
          )}
          {inProgress.length > 0 && (
            <section>
              <h2 className="text-xs font-semibold text-blue-600 mb-3 uppercase tracking-wider">In Progress ({inProgress.length})</h2>
              <div className="space-y-2">{inProgress.map(renderTask)}</div>
            </section>
          )}
          {done.length > 0 && (
            <section>
              <h2 className="text-xs font-semibold text-[var(--muted-foreground)] mb-3 uppercase tracking-wider">Done ({done.length})</h2>
              <div className="space-y-2">{done.map(renderTask)}</div>
            </section>
          )}
        </div>
      )}
    </div>
  );
}
