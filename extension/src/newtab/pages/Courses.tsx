import { BookOpen, GraduationCap, Brain, Calendar } from "lucide-react";
import { useStorage } from "../hooks/useStorage";
import type { Course } from "@/shared/types";
import type { Page } from "../App";

interface CoursesProps {
  navigate: (page: Page) => void;
}

export function Courses({ navigate }: CoursesProps) {
  const [courses] = useStorage<Course[]>("courses", []);

  return (
    <div className="max-w-4xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-6">Courses</h1>

      {courses.length === 0 ? (
        <div className="text-center py-16 text-gray-500">
          <BookOpen className="w-12 h-12 mx-auto mb-3 opacity-50" />
          <p>No courses yet. Sync with LearNUS to import your courses.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {courses.map((course) => (
            <div
              key={course.id}
              className="bg-[#111] border border-[#222] rounded-lg p-5 hover:border-[#333] transition-colors"
            >
              <h3 className="font-semibold mb-1 line-clamp-2">{course.name}</h3>
              {course.semester && (
                <div className="text-xs text-gray-600 mb-3">{course.semester}</div>
              )}
              {course.description && (
                <p className="text-sm text-gray-500 mb-4 line-clamp-2">
                  {course.description}
                </p>
              )}
              <div className="text-xs text-gray-600 mb-4">
                {course.topics.length} topics · {course.weekly_schedule.length} weeks
              </div>
              <div className="grid grid-cols-3 gap-2">
                <button
                  onClick={() => navigate({ name: "learn", courseId: course.id })}
                  className="flex flex-col items-center gap-1 p-2 rounded-lg bg-[#1a1a1a] hover:bg-[#222] transition-colors"
                >
                  <GraduationCap className="w-4 h-4 text-amber-400" />
                  <span className="text-xs">Learn</span>
                </button>
                <button
                  onClick={() => navigate({ name: "quiz", courseId: course.id })}
                  className="flex flex-col items-center gap-1 p-2 rounded-lg bg-[#1a1a1a] hover:bg-[#222] transition-colors"
                >
                  <Brain className="w-4 h-4 text-purple-400" />
                  <span className="text-xs">Quiz</span>
                </button>
                <button
                  onClick={() => navigate({ name: "plan", courseId: course.id })}
                  className="flex flex-col items-center gap-1 p-2 rounded-lg bg-[#1a1a1a] hover:bg-[#222] transition-colors"
                >
                  <Calendar className="w-4 h-4 text-blue-400" />
                  <span className="text-xs">Plan</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
