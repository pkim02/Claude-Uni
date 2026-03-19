"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Plus, BookOpen, Brain, Calendar, Upload, X, FileText, Loader2 } from "lucide-react";
import type { Course } from "@/lib/types";

export default function DashboardPage() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [showUpload, setShowUpload] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState("");

  useEffect(() => {
    fetchCourses();
  }, []);

  async function fetchCourses() {
    try {
      const res = await fetch("/api/courses");
      if (res.ok) {
        const data = await res.json();
        setCourses(data.courses);
      }
    } catch {
      // No courses yet
    }
  }

  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setUploadStatus("Uploading and parsing your document...");

    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await fetch("/api/ingest", {
        method: "POST",
        body: formData,
      });

      if (res.ok) {
        const data = await res.json();
        setUploadStatus("Course created! Redirecting...");
        setCourses((prev) => [...prev, data.course]);
        setShowUpload(false);
        // Small delay then refresh
        setTimeout(() => {
          setUploadStatus("");
          setUploading(false);
        }, 1000);
      } else {
        const err = await res.json();
        setUploadStatus(`Error: ${err.error || "Upload failed"}`);
        setUploading(false);
      }
    } catch {
      setUploadStatus("Error: Network error. Please try again.");
      setUploading(false);
    }
  }

  async function handleTextSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const formData = new FormData(form);
    const text = formData.get("text") as string;
    const name = formData.get("name") as string;

    if (!text.trim()) return;

    setUploading(true);
    setUploadStatus("Analyzing your course materials...");

    try {
      const res = await fetch("/api/ingest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text, name }),
      });

      if (res.ok) {
        const data = await res.json();
        setUploadStatus("Course created!");
        setCourses((prev) => [...prev, data.course]);
        setShowUpload(false);
        setTimeout(() => {
          setUploadStatus("");
          setUploading(false);
        }, 1000);
      } else {
        setUploadStatus("Error processing materials. Please try again.");
        setUploading(false);
      }
    } catch {
      setUploadStatus("Error: Network error.");
      setUploading(false);
    }
  }

  return (
    <div className="p-8 max-w-5xl">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold">Your Courses</h1>
          <p className="text-[var(--muted-foreground)] mt-1">
            Upload a syllabus to get started
          </p>
        </div>
        <button
          onClick={() => setShowUpload(true)}
          className="flex items-center gap-2 bg-[var(--foreground)] text-[var(--background)] px-4 py-2.5 rounded-lg text-sm font-medium hover:opacity-90 transition-opacity"
        >
          <Plus className="w-4 h-4" />
          New Course
        </button>
      </div>

      {/* Upload Modal */}
      {showUpload && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-6">
          <div className="bg-[var(--background)] rounded-2xl p-8 max-w-lg w-full max-h-[80vh] overflow-auto">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold">Add a Course</h2>
              <button
                onClick={() => {
                  setShowUpload(false);
                  setUploadStatus("");
                  setUploading(false);
                }}
                className="p-1 hover:bg-[var(--muted)] rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {uploadStatus && (
              <div className="mb-4 p-3 bg-brand-50 border border-brand-200 rounded-lg text-sm flex items-center gap-2">
                {uploading && <Loader2 className="w-4 h-4 animate-spin" />}
                {uploadStatus}
              </div>
            )}

            {/* PDF Upload */}
            <div className="mb-6">
              <h3 className="text-sm font-medium mb-3">Upload a PDF</h3>
              <label className="flex flex-col items-center justify-center gap-3 p-8 border-2 border-dashed border-[var(--border)] rounded-xl cursor-pointer hover:border-brand-300 hover:bg-brand-50/50 transition-colors">
                <Upload className="w-8 h-8 text-[var(--muted-foreground)]" />
                <span className="text-sm text-[var(--muted-foreground)]">
                  Drop your syllabus or lecture PDF here
                </span>
                <span className="text-xs text-[var(--muted-foreground)]">
                  PDF files up to 10MB
                </span>
                <input
                  type="file"
                  accept=".pdf"
                  onChange={handleFileUpload}
                  className="hidden"
                  disabled={uploading}
                />
              </label>
            </div>

            <div className="flex items-center gap-4 mb-6">
              <div className="flex-1 h-px bg-[var(--border)]" />
              <span className="text-sm text-[var(--muted-foreground)]">or paste text</span>
              <div className="flex-1 h-px bg-[var(--border)]" />
            </div>

            {/* Text Paste */}
            <form onSubmit={handleTextSubmit}>
              <div className="mb-4">
                <label className="block text-sm font-medium mb-1.5">Course Name</label>
                <input
                  name="name"
                  type="text"
                  placeholder="e.g., Introduction to Computer Science"
                  className="w-full px-4 py-2.5 rounded-lg border border-[var(--border)] bg-white focus:outline-none focus:ring-2 focus:ring-brand-300 focus:border-transparent"
                />
              </div>
              <div className="mb-4">
                <label className="block text-sm font-medium mb-1.5">
                  Syllabus / Course Content
                </label>
                <textarea
                  name="text"
                  rows={8}
                  placeholder="Paste your syllabus, course outline, or lecture notes here..."
                  className="w-full px-4 py-2.5 rounded-lg border border-[var(--border)] bg-white focus:outline-none focus:ring-2 focus:ring-brand-300 focus:border-transparent resize-none"
                />
              </div>
              <button
                type="submit"
                disabled={uploading}
                className="w-full flex items-center justify-center gap-2 bg-[var(--foreground)] text-[var(--background)] py-2.5 rounded-lg text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
              >
                <FileText className="w-4 h-4" />
                Create Course
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Course Grid */}
      {courses.length === 0 ? (
        <div className="text-center py-20">
          <BookOpen className="w-12 h-12 text-[var(--muted-foreground)] mx-auto mb-4" />
          <h3 className="text-lg font-medium mb-2">No courses yet</h3>
          <p className="text-[var(--muted-foreground)] mb-6">
            Upload a syllabus PDF or paste your course outline to get started.
          </p>
          <button
            onClick={() => setShowUpload(true)}
            className="inline-flex items-center gap-2 bg-[var(--foreground)] text-[var(--background)] px-6 py-3 rounded-lg text-sm font-medium hover:opacity-90 transition-opacity"
          >
            <Plus className="w-4 h-4" />
            Add your first course
          </button>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {courses.map((course) => (
            <CourseCard key={course.id} course={course} />
          ))}
        </div>
      )}
    </div>
  );
}

function CourseCard({ course }: { course: Course }) {
  return (
    <div className="border border-[var(--border)] rounded-xl p-6 hover:border-brand-300 transition-colors bg-white">
      <h3 className="font-semibold mb-1 line-clamp-2">{course.name}</h3>
      {course.description && (
        <p className="text-sm text-[var(--muted-foreground)] mb-4 line-clamp-2">
          {course.description}
        </p>
      )}

      <div className="flex items-center gap-2 text-xs text-[var(--muted-foreground)] mb-4">
        <span>{course.topics?.length || 0} topics</span>
        <span className="w-1 h-1 bg-[var(--border)] rounded-full" />
        <span>{course.weekly_schedule?.length || 0} weeks</span>
      </div>

      <div className="flex gap-2">
        <Link
          href={`/course/${course.id}/learn`}
          className="flex-1 flex items-center justify-center gap-1.5 py-2 bg-[var(--foreground)] text-[var(--background)] rounded-lg text-xs font-medium hover:opacity-90 transition-opacity"
        >
          <BookOpen className="w-3.5 h-3.5" />
          Learn
        </Link>
        <Link
          href={`/course/${course.id}/quiz`}
          className="flex-1 flex items-center justify-center gap-1.5 py-2 border border-[var(--border)] rounded-lg text-xs font-medium hover:bg-[var(--muted)] transition-colors"
        >
          <Brain className="w-3.5 h-3.5" />
          Quiz
        </Link>
        <Link
          href={`/course/${course.id}/plan`}
          className="flex-1 flex items-center justify-center gap-1.5 py-2 border border-[var(--border)] rounded-lg text-xs font-medium hover:bg-[var(--muted)] transition-colors"
        >
          <Calendar className="w-3.5 h-3.5" />
          Plan
        </Link>
      </div>
    </div>
  );
}
