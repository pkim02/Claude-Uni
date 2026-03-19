"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { BookOpen, Brain, Calendar, Upload, FileText, Loader2 } from "lucide-react";
import type { Course, Material } from "@/lib/types";

export default function CoursePage() {
  const params = useParams();
  const courseId = params.id as string;
  const [course, setCourse] = useState<Course | null>(null);
  const [materials, setMaterials] = useState<Material[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    fetchCourse();
  }, [courseId]);

  async function fetchCourse() {
    try {
      const res = await fetch(`/api/courses/${courseId}`);
      if (res.ok) {
        const data = await res.json();
        setCourse(data.course);
        setMaterials(data.materials || []);
      }
    } catch {
      // handle error
    }
    setLoading(false);
  }

  async function handleAdditionalUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    const formData = new FormData();
    formData.append("file", file);
    formData.append("courseId", courseId);

    try {
      const res = await fetch("/api/ingest", { method: "POST", body: formData });
      if (res.ok) {
        fetchCourse();
      }
    } catch {
      // handle error
    }
    setUploading(false);
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="w-6 h-6 animate-spin text-[var(--muted-foreground)]" />
      </div>
    );
  }

  if (!course) {
    return (
      <div className="p-8">
        <p className="text-[var(--muted-foreground)]">Course not found.</p>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-4xl">
      <div className="mb-8">
        <h1 className="text-2xl font-bold mb-2">{course.name}</h1>
        {course.description && (
          <p className="text-[var(--muted-foreground)]">{course.description}</p>
        )}
      </div>

      {/* Quick Actions */}
      <div className="grid md:grid-cols-3 gap-4 mb-8">
        <Link
          href={`/course/${courseId}/learn`}
          className="p-6 border border-[var(--border)] rounded-xl hover:border-brand-300 transition-colors group"
        >
          <BookOpen className="w-6 h-6 text-brand-500 mb-3" />
          <h3 className="font-semibold mb-1">Learn</h3>
          <p className="text-sm text-[var(--muted-foreground)]">
            Interactive AI tutor for this course
          </p>
        </Link>
        <Link
          href={`/course/${courseId}/quiz`}
          className="p-6 border border-[var(--border)] rounded-xl hover:border-brand-300 transition-colors group"
        >
          <Brain className="w-6 h-6 text-brand-500 mb-3" />
          <h3 className="font-semibold mb-1">Quiz</h3>
          <p className="text-sm text-[var(--muted-foreground)]">
            Practice problems and mock exams
          </p>
        </Link>
        <Link
          href={`/course/${courseId}/plan`}
          className="p-6 border border-[var(--border)] rounded-xl hover:border-brand-300 transition-colors group"
        >
          <Calendar className="w-6 h-6 text-brand-500 mb-3" />
          <h3 className="font-semibold mb-1">Study Plan</h3>
          <p className="text-sm text-[var(--muted-foreground)]">
            AI-generated study schedules
          </p>
        </Link>
      </div>

      {/* Knowledge Map */}
      <div className="mb-8">
        <h2 className="text-lg font-semibold mb-4">Course Topics</h2>
        {course.weekly_schedule && course.weekly_schedule.length > 0 ? (
          <div className="space-y-3">
            {course.weekly_schedule.map((week) => (
              <div
                key={week.week}
                className="p-4 border border-[var(--border)] rounded-xl"
              >
                <div className="flex items-center gap-3 mb-2">
                  <span className="w-8 h-8 flex items-center justify-center bg-brand-50 text-brand-700 rounded-lg text-sm font-bold">
                    {week.week}
                  </span>
                  <h3 className="font-medium">{week.title}</h3>
                </div>
                <div className="ml-11">
                  <div className="flex flex-wrap gap-2">
                    {week.topics.map((topic, i) => (
                      <span
                        key={i}
                        className="px-2 py-1 bg-[var(--muted)] text-xs rounded-md"
                      >
                        {topic}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-[var(--muted-foreground)]">
            No weekly schedule extracted yet. Upload more materials to improve.
          </p>
        )}
      </div>

      {/* Materials */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">Materials</h2>
          <label className="flex items-center gap-2 px-3 py-1.5 border border-[var(--border)] rounded-lg text-sm cursor-pointer hover:bg-[var(--muted)] transition-colors">
            {uploading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Upload className="w-4 h-4" />
            )}
            Add material
            <input
              type="file"
              accept=".pdf,.txt"
              onChange={handleAdditionalUpload}
              className="hidden"
              disabled={uploading}
            />
          </label>
        </div>
        {materials.length > 0 ? (
          <div className="space-y-2">
            {materials.map((m) => (
              <div
                key={m.id}
                className="flex items-center gap-3 p-3 border border-[var(--border)] rounded-lg"
              >
                <FileText className="w-4 h-4 text-[var(--muted-foreground)]" />
                <span className="text-sm">{m.filename}</span>
                <span className="text-xs text-[var(--muted-foreground)] ml-auto">
                  {m.file_type}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-[var(--muted-foreground)]">
            Materials are stored with the course context.
          </p>
        )}
      </div>
    </div>
  );
}
