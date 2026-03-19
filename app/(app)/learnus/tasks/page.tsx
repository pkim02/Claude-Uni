"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import ReactMarkdown from "react-markdown";
import {
  ArrowLeft,
  Plus,
  ClipboardList,
  Loader2,
  CheckCircle2,
  Clock,
  Sparkles,
  BookOpen,
  Zap,
  Trash2,
  ChevronDown,
  ChevronUp,
  Calendar,
} from "lucide-react";
import type { HomeworkTask } from "@/lib/learnus/types";

interface CourseOption {
  id: string;
  name: string;
}

export default function TasksPage() {
  const [tasks, setTasks] = useState<HomeworkTask[]>([]);
  const [courses, setCourses] = useState<CourseOption[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [expandedTask, setExpandedTask] = useState<string | null>(null);
  const [solvingTask, setSolvingTask] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // Form state
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [courseId, setCourseId] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [taskType, setTaskType] = useState<string>("assignment");

  useEffect(() => {
    fetchTasks();
    fetchCourses();
  }, []);

  async function fetchTasks() {
    try {
      const res = await fetch("/api/learnus/tasks");
      if (res.ok) {
        const data = await res.json();
        setTasks(data.tasks);
      }
    } catch {
      // handle error
    } finally {
      setLoading(false);
    }
  }

  async function fetchCourses() {
    try {
      const res = await fetch("/api/courses");
      if (res.ok) {
        const data = await res.json();
        setCourses(data.courses?.map((c: any) => ({ id: c.id, name: c.name })) || []);
      }
    } catch {
      // handle error
    }
  }

  async function handleCreateTask() {
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
      }),
    });

    if (res.ok) {
      const data = await res.json();
      setTasks((prev) => [data.task, ...prev]);
      setTitle("");
      setDescription("");
      setCourseId("");
      setDueDate("");
      setTaskType("assignment");
      setShowForm(false);
    }
  }

  async function handleSolve(taskId: string, mode: "solve" | "tutor") {
    setSolvingTask(taskId);

    try {
      const res = await fetch("/api/learnus/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "solve", taskId, mode }),
      });

      if (res.ok) {
        const data = await res.json();
        setTasks((prev) =>
          prev.map((t) => (t.id === taskId ? data.task : t))
        );
        setExpandedTask(taskId);
      }
    } catch {
      // handle error
    } finally {
      setSolvingTask(null);
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

  const statusIcon = (status: string) => {
    switch (status) {
      case "completed":
        return <CheckCircle2 className="w-4 h-4 text-green-500" />;
      case "in_progress":
        return <Loader2 className="w-4 h-4 text-brand-500 animate-spin" />;
      default:
        return <Clock className="w-4 h-4 text-[var(--muted-foreground)]" />;
    }
  };

  const typeColors: Record<string, string> = {
    assignment: "bg-blue-100 text-blue-700",
    quiz: "bg-purple-100 text-purple-700",
    essay: "bg-amber-100 text-amber-700",
    project: "bg-green-100 text-green-700",
    other: "bg-gray-100 text-gray-700",
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
              <ClipboardList className="w-6 h-6 text-brand-500" />
              Homework Board
            </h1>
            <p className="text-sm text-[var(--muted-foreground)]">
              Add tasks and let Claude solve them or teach you how
            </p>
          </div>
        </div>

        <button
          onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-2 px-4 py-2 bg-[var(--foreground)] text-[var(--background)] rounded-lg text-sm font-medium hover:opacity-90 transition-opacity"
        >
          <Plus className="w-4 h-4" />
          Add Task
        </button>
      </div>

      {/* Create Task Form */}
      {showForm && (
        <div className="border border-[var(--border)] rounded-xl p-6 mb-6 bg-[var(--muted)]">
          <h3 className="font-semibold mb-4">New Homework Task</h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1.5">Title</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g., Chapter 5 Problem Set"
                className="w-full px-3 py-2 border border-[var(--border)] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-300 bg-white"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1.5">Description / Instructions</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Paste the assignment instructions or describe what you need to do..."
                rows={4}
                className="w-full px-3 py-2 border border-[var(--border)] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-300 bg-white resize-none"
              />
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1.5">Course</label>
                <select
                  value={courseId}
                  onChange={(e) => setCourseId(e.target.value)}
                  className="w-full px-3 py-2 border border-[var(--border)] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-300 bg-white"
                >
                  <option value="">No course</option>
                  {courses.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1.5">Type</label>
                <select
                  value={taskType}
                  onChange={(e) => setTaskType(e.target.value)}
                  className="w-full px-3 py-2 border border-[var(--border)] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-300 bg-white"
                >
                  <option value="assignment">Assignment</option>
                  <option value="quiz">Quiz Prep</option>
                  <option value="essay">Essay</option>
                  <option value="project">Project</option>
                  <option value="other">Other</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1.5">Due Date</label>
                <input
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  className="w-full px-3 py-2 border border-[var(--border)] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-300 bg-white"
                />
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={handleCreateTask}
                disabled={!title.trim()}
                className="px-4 py-2 bg-[var(--foreground)] text-[var(--background)] rounded-lg text-sm font-medium hover:opacity-90 disabled:opacity-40 transition-opacity"
              >
                Create Task
              </button>
              <button
                onClick={() => setShowForm(false)}
                className="px-4 py-2 border border-[var(--border)] rounded-lg text-sm hover:bg-white transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Task List */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-6 h-6 animate-spin text-[var(--muted-foreground)]" />
        </div>
      ) : tasks.length === 0 ? (
        <div className="text-center py-20">
          <ClipboardList className="w-12 h-12 text-[var(--muted-foreground)] mx-auto mb-4 opacity-40" />
          <h3 className="font-medium mb-1">No tasks yet</h3>
          <p className="text-sm text-[var(--muted-foreground)]">
            Add a homework task and Claude will solve it or help you understand it.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {tasks.map((task) => (
            <div
              key={task.id}
              className="border border-[var(--border)] rounded-xl overflow-hidden"
            >
              {/* Task header */}
              <div className="px-5 py-4 flex items-center gap-4">
                {statusIcon(task.status)}

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <h3 className="font-medium text-sm truncate">{task.title}</h3>
                    <span
                      className={`text-xs px-2 py-0.5 rounded-full ${
                        typeColors[task.type] || typeColors.other
                      }`}
                    >
                      {task.type}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-[var(--muted-foreground)]">
                    <span>{task.courseName}</span>
                    {task.dueDate && (
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        Due: {new Date(task.dueDate).toLocaleDateString()}
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {task.status === "pending" && (
                    <>
                      <button
                        onClick={() => handleSolve(task.id, "solve")}
                        disabled={solvingTask === task.id}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-brand-500 text-white rounded-lg text-xs font-medium hover:bg-brand-600 disabled:opacity-50 transition-colors"
                      >
                        {solvingTask === task.id ? (
                          <Loader2 className="w-3 h-3 animate-spin" />
                        ) : (
                          <Zap className="w-3 h-3" />
                        )}
                        Solve
                      </button>
                      <button
                        onClick={() => handleSolve(task.id, "tutor")}
                        disabled={solvingTask === task.id}
                        className="flex items-center gap-1.5 px-3 py-1.5 border border-[var(--border)] rounded-lg text-xs font-medium hover:bg-[var(--muted)] disabled:opacity-50 transition-colors"
                      >
                        <BookOpen className="w-3 h-3" />
                        Teach Me
                      </button>
                    </>
                  )}

                  {task.solution && (
                    <button
                      onClick={() =>
                        setExpandedTask(expandedTask === task.id ? null : task.id)
                      }
                      className="p-1.5 hover:bg-[var(--muted)] rounded-lg transition-colors"
                    >
                      {expandedTask === task.id ? (
                        <ChevronUp className="w-4 h-4" />
                      ) : (
                        <ChevronDown className="w-4 h-4" />
                      )}
                    </button>
                  )}

                  <button
                    onClick={() => handleDelete(task.id)}
                    className="p-1.5 text-[var(--muted-foreground)] hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Task description */}
              {task.description && !task.solution && (
                <div className="px-5 pb-3 text-xs text-[var(--muted-foreground)] line-clamp-2">
                  {task.description}
                </div>
              )}

              {/* Solution */}
              {task.solution && expandedTask === task.id && (
                <div className="border-t border-[var(--border)] px-5 py-4 bg-[var(--muted)]">
                  <div className="flex items-center gap-2 mb-3">
                    <Sparkles className="w-4 h-4 text-brand-500" />
                    <span className="text-xs font-medium">AI Solution</span>
                  </div>
                  <div className="prose prose-sm max-w-none">
                    <ReactMarkdown>{task.solution}</ReactMarkdown>
                  </div>
                </div>
              )}

              {/* Solving indicator */}
              {solvingTask === task.id && (
                <div className="border-t border-[var(--border)] px-5 py-3 bg-brand-50 flex items-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin text-brand-500" />
                  <span className="text-xs text-brand-700">
                    Claude is working on this...
                  </span>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
