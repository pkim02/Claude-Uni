"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Calendar, Loader2, Clock, BookOpen, RotateCcw } from "lucide-react";
import type { Course, StudyDay } from "@/lib/types";

export default function PlanPage() {
  const params = useParams();
  const courseId = params.id as string;
  const [course, setCourse] = useState<Course | null>(null);
  const [examDate, setExamDate] = useState("");
  const [plan, setPlan] = useState<{ plan_type: string; days: StudyDay[] } | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchCourse();
  }, [courseId]);

  async function fetchCourse() {
    try {
      const res = await fetch(`/api/courses/${courseId}`);
      if (res.ok) {
        const data = await res.json();
        setCourse(data.course);
      }
    } catch {
      // handle
    }
  }

  async function generatePlan() {
    if (!examDate) return;
    setLoading(true);

    try {
      const res = await fetch("/api/plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ courseId, examDate }),
      });

      if (res.ok) {
        const data = await res.json();
        setPlan(data.plan);
      }
    } catch {
      // handle
    }
    setLoading(false);
  }

  const today = new Date().toISOString().split("T")[0];

  return (
    <div className="flex flex-col h-screen">
      {/* Header */}
      <div className="border-b border-[var(--border)] px-6 py-3 flex items-center gap-4">
        <Link
          href={`/course/${courseId}`}
          className="p-1.5 hover:bg-[var(--muted)] rounded-lg transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
        </Link>
        <div>
          <h1 className="font-semibold text-sm">{course?.name || "Loading..."}</h1>
          <p className="text-xs text-[var(--muted-foreground)]">Study Planner</p>
        </div>
      </div>

      <div className="flex-1 overflow-auto px-6 py-8">
        <div className="max-w-2xl mx-auto">
          {!plan ? (
            <div className="text-center pt-12">
              <Calendar className="w-12 h-12 text-brand-300 mx-auto mb-4" />
              <h2 className="text-xl font-semibold mb-2">Study Planner</h2>
              <p className="text-[var(--muted-foreground)] mb-8">
                Enter your exam date and get an AI-optimized study schedule with
                spaced repetition.
              </p>

              <div className="max-w-sm mx-auto space-y-4">
                <div className="text-left">
                  <label className="block text-sm font-medium mb-1.5">
                    Exam Date
                  </label>
                  <input
                    type="date"
                    value={examDate}
                    onChange={(e) => setExamDate(e.target.value)}
                    min={today}
                    className="w-full px-4 py-2.5 rounded-lg border border-[var(--border)] bg-white focus:outline-none focus:ring-2 focus:ring-brand-300"
                  />
                </div>

                <button
                  onClick={generatePlan}
                  disabled={!examDate || loading}
                  className="w-full flex items-center justify-center gap-2 bg-[var(--foreground)] text-[var(--background)] py-3 rounded-lg font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Creating your study plan...
                    </>
                  ) : (
                    <>
                      <Calendar className="w-4 h-4" />
                      Generate Study Plan
                    </>
                  )}
                </button>
              </div>
            </div>
          ) : (
            <div>
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-xl font-semibold">Your Study Plan</h2>
                  <p className="text-sm text-[var(--muted-foreground)]">
                    {plan.plan_type === "cram" ? "Cram Mode" : "Spaced Repetition"} — {plan.days.length} days
                  </p>
                </div>
                <button
                  onClick={() => setPlan(null)}
                  className="flex items-center gap-2 px-3 py-1.5 border border-[var(--border)] rounded-lg text-sm hover:bg-[var(--muted)] transition-colors"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  New plan
                </button>
              </div>

              <div className="space-y-4">
                {plan.days.map((day, i) => (
                  <div
                    key={i}
                    className={`p-5 border rounded-xl ${
                      day.is_review
                        ? "border-brand-200 bg-brand-50/50"
                        : "border-[var(--border)]"
                    }`}
                  >
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <span className="text-sm font-bold text-brand-600">
                          Day {i + 1}
                        </span>
                        <span className="text-sm text-[var(--muted-foreground)]">
                          {new Date(day.date).toLocaleDateString("en-US", {
                            weekday: "short",
                            month: "short",
                            day: "numeric",
                          })}
                        </span>
                        {day.is_review && (
                          <span className="text-xs px-2 py-0.5 bg-brand-100 text-brand-700 rounded">
                            Review Day
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-1 text-xs text-[var(--muted-foreground)]">
                        <Clock className="w-3.5 h-3.5" />
                        {day.estimated_hours}h
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-2 mb-3">
                      {day.topics.map((topic, j) => (
                        <span
                          key={j}
                          className="px-2 py-1 bg-[var(--muted)] text-xs rounded-md"
                        >
                          {topic}
                        </span>
                      ))}
                    </div>

                    <ul className="space-y-1.5">
                      {day.tasks.map((task, j) => (
                        <li key={j} className="flex items-start gap-2 text-sm">
                          <BookOpen className="w-3.5 h-3.5 text-[var(--muted-foreground)] mt-0.5 shrink-0" />
                          {task}
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
