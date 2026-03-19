import { useState, useCallback } from "react";
import { ArrowLeft, Loader, Calendar, BookOpen } from "lucide-react";
import { useStorage, useBackgroundMessages, sendMessage } from "../hooks/useStorage";
import { buildPlannerPrompt } from "@/shared/prompts/planner";
import { getCourseContext } from "@/shared/storage";
import type { Course, StudyPlan } from "@/shared/types";
import type { Page } from "../App";

interface PlanProps {
  courseId: string;
  navigate: (page: Page) => void;
}

export function Plan({ courseId, navigate }: PlanProps) {
  const [courses] = useStorage<Course[]>("courses", []);
  const course = courses.find((c) => c.id === courseId);

  const [examDate, setExamDate] = useState("");
  const [plan, setPlan] = useState<StudyPlan | null>(null);
  const [loading, setLoading] = useState(false);

  const requestIdRef = useState(() => ({ current: "" }))[0];

  useBackgroundMessages(
    useCallback((message: { type: string; [key: string]: unknown }) => {
      if (message.type === "AI_DONE" && message.id === requestIdRef.current) {
        try {
          const text = message.fullText as string;
          const match = text.match(/\{[\s\S]*\}/);
          if (match) {
            setPlan(JSON.parse(match[0]) as StudyPlan);
          }
        } catch {
          // Parse error
        }
        setLoading(false);
      }
      if (message.type === "AI_ERROR" && message.id === requestIdRef.current) {
        setLoading(false);
      }
    }, [requestIdRef])
  );

  const generatePlan = async () => {
    if (!examDate || !course) return;
    setLoading(true);

    const context = await getCourseContext(courseId);
    const daysUntil = Math.ceil(
      (new Date(examDate).getTime() - Date.now()) / 86400000
    );
    const topics = course.topics.map((t) => t.name);
    const prompt = buildPlannerPrompt(course.name, topics, examDate, daysUntil, []);

    const id = `plan-${Date.now()}`;
    requestIdRef.current = id;

    sendMessage({
      type: "AI_REQUEST",
      id,
      systemPrompt: "",
      userPrompt: prompt,
    });
  };

  const today = new Date().toISOString().split("T")[0];

  return (
    <div className="max-w-2xl mx-auto p-6 space-y-6">
      <div className="flex items-center gap-3">
        <button
          onClick={() => navigate({ name: "course", courseId })}
          className="text-gray-500 hover:text-gray-300"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="text-2xl font-bold">Study Plan</h1>
      </div>

      {!plan ? (
        <div className="space-y-4">
          <div>
            <label className="text-sm text-gray-400 block mb-2">Exam Date</label>
            <input
              type="date"
              value={examDate}
              min={today}
              onChange={(e) => setExamDate(e.target.value)}
              className="w-full bg-[#111] border border-[#222] rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-amber-500/50"
            />
          </div>
          <button
            onClick={generatePlan}
            disabled={!examDate || loading}
            className="w-full bg-amber-500 text-black font-semibold py-3 rounded-lg hover:bg-amber-400 disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <Loader className="w-4 h-4 animate-spin" /> Generating...
              </>
            ) : (
              "Generate Study Plan"
            )}
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span
                className={`text-xs px-2 py-0.5 rounded ${
                  plan.plan_type === "cram"
                    ? "bg-red-500/10 text-red-400"
                    : "bg-green-500/10 text-green-400"
                }`}
              >
                {plan.plan_type === "cram" ? "Cram Mode" : "Spaced Repetition"}
              </span>
              <span className="text-sm text-gray-500">{plan.days.length} days</span>
            </div>
            <button
              onClick={() => setPlan(null)}
              className="text-sm text-gray-500 hover:text-gray-300"
            >
              New plan
            </button>
          </div>

          {plan.days.map((day, i) => (
            <div
              key={i}
              className="bg-[#111] border border-[#222] rounded-lg p-4"
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-gray-500" />
                  <span className="font-medium text-sm">Day {i + 1}</span>
                  <span className="text-xs text-gray-600">{day.date}</span>
                  {day.is_review && (
                    <span className="text-xs px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-400">
                      Review
                    </span>
                  )}
                </div>
                <span className="text-xs text-gray-600">
                  {day.estimated_hours}h
                </span>
              </div>

              {day.topics.length > 0 && (
                <div className="flex flex-wrap gap-1 mb-2">
                  {day.topics.map((t, j) => (
                    <span
                      key={j}
                      className="text-xs bg-amber-500/10 text-amber-400 px-2 py-0.5 rounded"
                    >
                      {t}
                    </span>
                  ))}
                </div>
              )}

              <ul className="space-y-1">
                {day.tasks.map((task, j) => (
                  <li key={j} className="text-sm text-gray-400 flex items-start gap-2">
                    <BookOpen className="w-3 h-3 mt-1 text-gray-600 shrink-0" />
                    {task}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
