import { ArrowLeft, GraduationCap, Brain, Calendar } from "lucide-react";
import { useStorage } from "../hooks/useStorage";
import type { Course } from "@/shared/types";
import type { Page } from "../App";

interface CourseDetailProps {
  courseId: string;
  navigate: (page: Page) => void;
}

export function CourseDetail({ courseId, navigate }: CourseDetailProps) {
  const [courses] = useStorage<Course[]>("courses", []);
  const course = courses.find((c) => c.id === courseId);

  if (!course) {
    return (
      <div className="p-6">
        <p className="text-gray-500">Course not found.</p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div>
        <button
          onClick={() => navigate({ name: "courses" })}
          className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-300 mb-3"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Courses
        </button>
        <h1 className="text-2xl font-bold">{course.name}</h1>
        {course.description && (
          <p className="text-gray-500 mt-1">{course.description}</p>
        )}
        {course.semester && (
          <div className="text-sm text-gray-600 mt-1">{course.semester}</div>
        )}
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-3 gap-3">
        <button
          onClick={() => navigate({ name: "learn", courseId })}
          className="bg-[#111] border border-[#222] rounded-lg p-4 flex flex-col items-center gap-2 hover:border-amber-500/30 transition-colors"
        >
          <GraduationCap className="w-6 h-6 text-amber-400" />
          <span className="font-medium">Learn</span>
          <span className="text-xs text-gray-600">AI Tutor</span>
        </button>
        <button
          onClick={() => navigate({ name: "quiz", courseId })}
          className="bg-[#111] border border-[#222] rounded-lg p-4 flex flex-col items-center gap-2 hover:border-purple-500/30 transition-colors"
        >
          <Brain className="w-6 h-6 text-purple-400" />
          <span className="font-medium">Quiz</span>
          <span className="text-xs text-gray-600">Practice</span>
        </button>
        <button
          onClick={() => navigate({ name: "plan", courseId })}
          className="bg-[#111] border border-[#222] rounded-lg p-4 flex flex-col items-center gap-2 hover:border-blue-500/30 transition-colors"
        >
          <Calendar className="w-6 h-6 text-blue-400" />
          <span className="font-medium">Plan</span>
          <span className="text-xs text-gray-600">Study Schedule</span>
        </button>
      </div>

      {/* Weekly Schedule */}
      {course.weekly_schedule.length > 0 && (
        <section>
          <h2 className="text-lg font-semibold mb-3">Weekly Schedule</h2>
          <div className="space-y-3">
            {course.weekly_schedule.map((week) => (
              <div
                key={week.week}
                className="bg-[#111] border border-[#222] rounded-lg p-4"
              >
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-xs bg-[#222] px-2 py-0.5 rounded text-gray-400">
                    Week {week.week}
                  </span>
                  <span className="font-medium text-sm">{week.title}</span>
                </div>
                {week.topics.length > 0 && (
                  <div className="flex flex-wrap gap-1 mb-2">
                    {week.topics.map((t, i) => (
                      <span
                        key={i}
                        className="text-xs bg-amber-500/10 text-amber-400 px-2 py-0.5 rounded"
                      >
                        {t}
                      </span>
                    ))}
                  </div>
                )}
                {week.objectives.length > 0 && (
                  <ul className="text-xs text-gray-500 space-y-0.5">
                    {week.objectives.map((obj, i) => (
                      <li key={i}>• {obj}</li>
                    ))}
                  </ul>
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Topics */}
      {course.topics.length > 0 && (
        <section>
          <h2 className="text-lg font-semibold mb-3">Topics</h2>
          <div className="grid grid-cols-2 gap-2">
            {course.topics.map((topic) => (
              <div
                key={topic.id}
                className="bg-[#111] border border-[#222] rounded-lg p-3"
              >
                <div className="font-medium text-sm">{topic.name}</div>
                <div className="text-xs text-gray-600 mt-0.5">{topic.description}</div>
                {topic.subtopics.length > 0 && (
                  <div className="text-xs text-gray-700 mt-1">
                    {topic.subtopics.join(", ")}
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
