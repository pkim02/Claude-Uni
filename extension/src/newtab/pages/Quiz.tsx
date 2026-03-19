import { useState, useCallback } from "react";
import { ArrowLeft, CheckCircle, XCircle, Loader } from "lucide-react";
import { useStorage, useBackgroundMessages, sendMessage } from "../hooks/useStorage";
import { buildQuizPrompt } from "@/shared/prompts/quiz-gen";
import { getCourseContext } from "@/shared/storage";
import type { Course, QuizQuestion } from "@/shared/types";
import type { Page } from "../App";

type QuizState = "setup" | "taking" | "results";

interface QuizProps {
  courseId: string;
  navigate: (page: Page) => void;
}

export function Quiz({ courseId, navigate }: QuizProps) {
  const [courses] = useStorage<Course[]>("courses", []);
  const course = courses.find((c) => c.id === courseId);

  const [state, setState] = useState<QuizState>("setup");
  const [topic, setTopic] = useState("all");
  const [difficulty, setDifficulty] = useState("");
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [currentQ, setCurrentQ] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [showAnswer, setShowAnswer] = useState(false);
  const [loading, setLoading] = useState(false);
  const [score, setScore] = useState(0);

  const requestIdRef = useState(() => ({ current: "" }))[0];

  useBackgroundMessages(
    useCallback((message: { type: string; [key: string]: unknown }) => {
      if (message.type === "AI_DONE" && message.id === requestIdRef.current) {
        try {
          const text = message.fullText as string;
          const match = text.match(/\[[\s\S]*\]/);
          if (match) {
            const parsed = JSON.parse(match[0]) as QuizQuestion[];
            setQuestions(parsed);
            setState("taking");
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

  const startQuiz = async () => {
    setLoading(true);
    const context = await getCourseContext(courseId);
    const topicStr = topic === "all" ? (course?.name || "all topics") : topic;
    const prompt = buildQuizPrompt(topicStr, context, difficulty || undefined);

    const id = `quiz-${Date.now()}`;
    requestIdRef.current = id;

    sendMessage({
      type: "AI_REQUEST",
      id,
      systemPrompt: "",
      userPrompt: prompt,
    });
  };

  const selectAnswer = (answer: string) => {
    if (showAnswer) return;
    const q = questions[currentQ];
    setAnswers((prev) => ({ ...prev, [q.id]: answer }));
    setShowAnswer(true);
  };

  const nextQuestion = () => {
    if (currentQ < questions.length - 1) {
      setCurrentQ((prev) => prev + 1);
      setShowAnswer(false);
    } else {
      // Calculate score
      let correct = 0;
      questions.forEach((q) => {
        if (answers[q.id]?.toLowerCase() === q.correct_answer.toLowerCase()) {
          correct++;
        }
      });
      setScore(correct);
      setState("results");
    }
  };

  const topics = course?.topics.map((t) => t.name) || [];

  if (state === "setup") {
    return (
      <div className="max-w-2xl mx-auto p-6 space-y-6">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate({ name: "course", courseId })}
            className="text-gray-500 hover:text-gray-300"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="text-2xl font-bold">Practice Quiz</h1>
        </div>

        <div className="space-y-4">
          <div>
            <label className="text-sm text-gray-400 block mb-2">Topic</label>
            <select
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              className="w-full bg-[#111] border border-[#222] rounded-lg px-4 py-2.5 text-sm"
            >
              <option value="all">All Topics</option>
              {topics.map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-sm text-gray-400 block mb-2">Difficulty</label>
            <div className="flex gap-2">
              {["", "easy", "medium", "hard"].map((d) => (
                <button
                  key={d}
                  onClick={() => setDifficulty(d)}
                  className={`px-4 py-2 text-sm rounded-lg border transition-colors ${
                    difficulty === d
                      ? "border-amber-500 bg-amber-500/10 text-amber-400"
                      : "border-[#222] bg-[#111] text-gray-400 hover:border-[#333]"
                  }`}
                >
                  {d || "All"}
                </button>
              ))}
            </div>
          </div>

          <button
            onClick={startQuiz}
            disabled={loading}
            className="w-full bg-amber-500 text-black font-semibold py-3 rounded-lg hover:bg-amber-400 disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <Loader className="w-4 h-4 animate-spin" /> Generating...
              </>
            ) : (
              "Start Quiz"
            )}
          </button>
        </div>
      </div>
    );
  }

  if (state === "taking") {
    const q = questions[currentQ];
    if (!q) return null;

    const userAnswer = answers[q.id];
    const isCorrect = userAnswer?.toLowerCase() === q.correct_answer.toLowerCase();

    return (
      <div className="max-w-2xl mx-auto p-6 space-y-6">
        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-500">
            {currentQ + 1} / {questions.length}
          </span>
          <div className="flex gap-2">
            <span className="text-xs px-2 py-0.5 rounded bg-[#222] text-gray-400">
              {q.difficulty}
            </span>
            <span className="text-xs px-2 py-0.5 rounded bg-amber-500/10 text-amber-400">
              {q.topic}
            </span>
          </div>
        </div>

        <h2 className="text-lg font-medium">{q.question}</h2>

        {q.type === "multiple_choice" && (
          <div className="space-y-2">
            {q.options.map((opt, i) => {
              const letter = opt.split(")")[0]?.trim() || String.fromCharCode(65 + i);
              const isSelected = userAnswer === letter;
              const isCorrectOpt = letter === q.correct_answer;

              return (
                <button
                  key={i}
                  onClick={() => selectAnswer(letter)}
                  className={`w-full text-left px-4 py-3 rounded-lg border text-sm transition-colors ${
                    showAnswer
                      ? isCorrectOpt
                        ? "border-green-500 bg-green-500/10"
                        : isSelected
                        ? "border-red-500 bg-red-500/10"
                        : "border-[#222] bg-[#111]"
                      : isSelected
                      ? "border-amber-500 bg-amber-500/10"
                      : "border-[#222] bg-[#111] hover:border-[#333]"
                  }`}
                >
                  {opt}
                </button>
              );
            })}
          </div>
        )}

        {q.type === "true_false" && (
          <div className="flex gap-3">
            {["True", "False"].map((opt) => {
              const isSelected = userAnswer === opt;
              const isCorrectOpt = opt === q.correct_answer;
              return (
                <button
                  key={opt}
                  onClick={() => selectAnswer(opt)}
                  className={`flex-1 py-3 rounded-lg border text-sm font-medium transition-colors ${
                    showAnswer
                      ? isCorrectOpt
                        ? "border-green-500 bg-green-500/10"
                        : isSelected
                        ? "border-red-500 bg-red-500/10"
                        : "border-[#222] bg-[#111]"
                      : isSelected
                      ? "border-amber-500 bg-amber-500/10"
                      : "border-[#222] bg-[#111] hover:border-[#333]"
                  }`}
                >
                  {opt}
                </button>
              );
            })}
          </div>
        )}

        {q.type === "short_answer" && (
          <div>
            <input
              type="text"
              placeholder="Your answer..."
              className="w-full bg-[#111] border border-[#222] rounded-lg px-4 py-3 text-sm focus:outline-none focus:border-amber-500/50"
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  selectAnswer((e.target as HTMLInputElement).value);
                }
              }}
              disabled={showAnswer}
            />
          </div>
        )}

        {showAnswer && (
          <div
            className={`p-4 rounded-lg border ${
              isCorrect ? "border-green-500/30 bg-green-500/5" : "border-red-500/30 bg-red-500/5"
            }`}
          >
            <div className="flex items-center gap-2 mb-2">
              {isCorrect ? (
                <CheckCircle className="w-5 h-5 text-green-400" />
              ) : (
                <XCircle className="w-5 h-5 text-red-400" />
              )}
              <span className={isCorrect ? "text-green-400" : "text-red-400"}>
                {isCorrect ? "Correct!" : `Incorrect — Answer: ${q.correct_answer}`}
              </span>
            </div>
            <p className="text-sm text-gray-400">{q.explanation}</p>
          </div>
        )}

        {showAnswer && (
          <button
            onClick={nextQuestion}
            className="w-full bg-amber-500 text-black font-semibold py-3 rounded-lg hover:bg-amber-400 transition-colors"
          >
            {currentQ < questions.length - 1 ? "Next Question" : "See Results"}
          </button>
        )}
      </div>
    );
  }

  // Results
  const pct = Math.round((score / questions.length) * 100);
  return (
    <div className="max-w-2xl mx-auto p-6 space-y-6">
      <h1 className="text-2xl font-bold text-center">Quiz Results</h1>

      <div className="flex justify-center">
        <div
          className={`w-32 h-32 rounded-full border-4 flex items-center justify-center text-3xl font-bold ${
            pct >= 80
              ? "border-green-500 text-green-400"
              : pct >= 60
              ? "border-amber-500 text-amber-400"
              : "border-red-500 text-red-400"
          }`}
        >
          {pct}%
        </div>
      </div>

      <p className="text-center text-gray-400">
        You got {score} out of {questions.length} correct
      </p>

      <div className="flex gap-3 justify-center">
        <button
          onClick={() => {
            setState("setup");
            setQuestions([]);
            setAnswers({});
            setCurrentQ(0);
            setShowAnswer(false);
          }}
          className="px-6 py-2.5 bg-amber-500 text-black font-medium rounded-lg hover:bg-amber-400 transition-colors"
        >
          Try Again
        </button>
        <button
          onClick={() => navigate({ name: "learn", courseId })}
          className="px-6 py-2.5 bg-[#111] border border-[#222] rounded-lg hover:bg-[#1a1a1a] transition-colors"
        >
          Review with Tutor
        </button>
      </div>
    </div>
  );
}
