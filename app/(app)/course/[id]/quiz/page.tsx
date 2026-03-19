"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Loader2,
  CheckCircle2,
  XCircle,
  ChevronRight,
  RotateCcw,
  Trophy,
} from "lucide-react";
import type { Course, QuizQuestion } from "@/lib/types";

type QuizState = "setup" | "taking" | "results";

export default function QuizPage() {
  const params = useParams();
  const courseId = params.id as string;
  const [course, setCourse] = useState<Course | null>(null);
  const [state, setState] = useState<QuizState>("setup");
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [currentQ, setCurrentQ] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [showExplanation, setShowExplanation] = useState(false);
  const [loading, setLoading] = useState(false);
  const [topic, setTopic] = useState("");
  const [difficulty, setDifficulty] = useState("");

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

  async function generateQuiz() {
    setLoading(true);
    try {
      const res = await fetch("/api/quiz", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ courseId, topic: topic || undefined, difficulty: difficulty || undefined }),
      });

      if (res.ok) {
        const data = await res.json();
        setQuestions(data.questions);
        setState("taking");
        setCurrentQ(0);
        setAnswers({});
        setShowExplanation(false);
      }
    } catch {
      // handle error
    }
    setLoading(false);
  }

  function selectAnswer(answer: string) {
    if (answers[questions[currentQ].id]) return; // already answered
    setAnswers((prev) => ({ ...prev, [questions[currentQ].id]: answer }));
    setShowExplanation(true);
  }

  function nextQuestion() {
    setShowExplanation(false);
    if (currentQ < questions.length - 1) {
      setCurrentQ(currentQ + 1);
    } else {
      setState("results");
    }
  }

  const score = questions.reduce((acc, q) => {
    const userAnswer = answers[q.id];
    if (!userAnswer) return acc;
    // For multiple choice, check the letter
    const isCorrect =
      userAnswer === q.correct_answer ||
      userAnswer.startsWith(q.correct_answer);
    return acc + (isCorrect ? 1 : 0);
  }, 0);

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
          <p className="text-xs text-[var(--muted-foreground)]">Practice Quiz</p>
        </div>
        {state === "taking" && (
          <span className="ml-auto text-sm text-[var(--muted-foreground)]">
            {currentQ + 1} / {questions.length}
          </span>
        )}
      </div>

      <div className="flex-1 overflow-auto px-6 py-8">
        <div className="max-w-2xl mx-auto">
          {/* Setup */}
          {state === "setup" && (
            <div className="text-center pt-12">
              <Trophy className="w-12 h-12 text-brand-300 mx-auto mb-4" />
              <h2 className="text-xl font-semibold mb-2">Practice Quiz</h2>
              <p className="text-[var(--muted-foreground)] mb-8">
                Generate practice questions based on your course materials.
              </p>

              <div className="max-w-sm mx-auto space-y-4 text-left">
                <div>
                  <label className="block text-sm font-medium mb-1.5">
                    Topic (optional)
                  </label>
                  <select
                    value={topic}
                    onChange={(e) => setTopic(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-lg border border-[var(--border)] bg-white focus:outline-none focus:ring-2 focus:ring-brand-300"
                  >
                    <option value="">All topics</option>
                    {course?.topics?.map((t) => (
                      <option key={t.id} value={t.name}>
                        {t.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1.5">
                    Difficulty
                  </label>
                  <select
                    value={difficulty}
                    onChange={(e) => setDifficulty(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-lg border border-[var(--border)] bg-white focus:outline-none focus:ring-2 focus:ring-brand-300"
                  >
                    <option value="">Mixed</option>
                    <option value="easy">Easy</option>
                    <option value="medium">Medium</option>
                    <option value="hard">Hard</option>
                  </select>
                </div>

                <button
                  onClick={generateQuiz}
                  disabled={loading}
                  className="w-full flex items-center justify-center gap-2 bg-[var(--foreground)] text-[var(--background)] py-3 rounded-lg font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Generating questions...
                    </>
                  ) : (
                    "Start Quiz"
                  )}
                </button>
              </div>
            </div>
          )}

          {/* Taking Quiz */}
          {state === "taking" && questions[currentQ] && (
            <div>
              <div className="mb-2 flex items-center gap-2">
                <span
                  className={`text-xs px-2 py-0.5 rounded ${
                    questions[currentQ].difficulty === "easy"
                      ? "bg-green-50 text-green-700"
                      : questions[currentQ].difficulty === "medium"
                      ? "bg-yellow-50 text-yellow-700"
                      : "bg-red-50 text-red-700"
                  }`}
                >
                  {questions[currentQ].difficulty}
                </span>
                <span className="text-xs text-[var(--muted-foreground)]">
                  {questions[currentQ].topic}
                </span>
              </div>

              <h3 className="text-lg font-medium mb-6">
                {questions[currentQ].question}
              </h3>

              {/* Multiple Choice */}
              {questions[currentQ].type === "multiple_choice" &&
                questions[currentQ].options && (
                  <div className="space-y-3">
                    {questions[currentQ].options!.map((option, i) => {
                      const letter = option.charAt(0);
                      const isSelected = answers[questions[currentQ].id] === letter;
                      const isCorrect = letter === questions[currentQ].correct_answer;
                      const hasAnswered = !!answers[questions[currentQ].id];

                      return (
                        <button
                          key={i}
                          onClick={() => selectAnswer(letter)}
                          disabled={hasAnswered}
                          className={`w-full text-left p-4 rounded-xl border transition-colors ${
                            hasAnswered
                              ? isCorrect
                                ? "border-green-300 bg-green-50"
                                : isSelected
                                ? "border-red-300 bg-red-50"
                                : "border-[var(--border)] opacity-60"
                              : "border-[var(--border)] hover:border-brand-300 hover:bg-brand-50/50"
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            {hasAnswered && isCorrect && (
                              <CheckCircle2 className="w-5 h-5 text-green-500 shrink-0" />
                            )}
                            {hasAnswered && isSelected && !isCorrect && (
                              <XCircle className="w-5 h-5 text-red-500 shrink-0" />
                            )}
                            <span className="text-sm">{option}</span>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}

              {/* True/False */}
              {questions[currentQ].type === "true_false" && (
                <div className="flex gap-4">
                  {["True", "False"].map((opt) => {
                    const isSelected = answers[questions[currentQ].id] === opt;
                    const isCorrect = opt === questions[currentQ].correct_answer;
                    const hasAnswered = !!answers[questions[currentQ].id];

                    return (
                      <button
                        key={opt}
                        onClick={() => selectAnswer(opt)}
                        disabled={hasAnswered}
                        className={`flex-1 p-4 rounded-xl border text-center transition-colors ${
                          hasAnswered
                            ? isCorrect
                              ? "border-green-300 bg-green-50"
                              : isSelected
                              ? "border-red-300 bg-red-50"
                              : "border-[var(--border)] opacity-60"
                            : "border-[var(--border)] hover:border-brand-300"
                        }`}
                      >
                        {opt}
                      </button>
                    );
                  })}
                </div>
              )}

              {/* Short Answer */}
              {questions[currentQ].type === "short_answer" && (
                <div>
                  <input
                    type="text"
                    placeholder="Type your answer..."
                    className="w-full px-4 py-3 rounded-xl border border-[var(--border)] focus:outline-none focus:ring-2 focus:ring-brand-300"
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        selectAnswer((e.target as HTMLInputElement).value);
                      }
                    }}
                    disabled={!!answers[questions[currentQ].id]}
                  />
                </div>
              )}

              {/* Explanation */}
              {showExplanation && (
                <div className="mt-6 p-4 bg-[var(--muted)] rounded-xl">
                  <h4 className="text-sm font-semibold mb-2">Explanation</h4>
                  <p className="text-sm text-[var(--muted-foreground)]">
                    {questions[currentQ].explanation}
                  </p>
                </div>
              )}

              {showExplanation && (
                <button
                  onClick={nextQuestion}
                  className="mt-4 flex items-center gap-2 bg-[var(--foreground)] text-[var(--background)] px-6 py-2.5 rounded-lg text-sm font-medium hover:opacity-90 transition-opacity"
                >
                  {currentQ < questions.length - 1 ? "Next Question" : "See Results"}
                  <ChevronRight className="w-4 h-4" />
                </button>
              )}
            </div>
          )}

          {/* Results */}
          {state === "results" && (
            <div className="text-center pt-12">
              <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-brand-50 flex items-center justify-center">
                <span className="text-2xl font-bold text-brand-700">
                  {Math.round((score / questions.length) * 100)}%
                </span>
              </div>
              <h2 className="text-xl font-semibold mb-2">Quiz Complete!</h2>
              <p className="text-[var(--muted-foreground)] mb-8">
                You got {score} out of {questions.length} correct.
              </p>

              <div className="space-y-3 text-left mb-8">
                {questions.map((q, i) => {
                  const userAnswer = answers[q.id];
                  const isCorrect =
                    userAnswer === q.correct_answer ||
                    (userAnswer && userAnswer.startsWith(q.correct_answer));

                  return (
                    <div
                      key={i}
                      className={`p-4 rounded-xl border ${
                        isCorrect
                          ? "border-green-200 bg-green-50/50"
                          : "border-red-200 bg-red-50/50"
                      }`}
                    >
                      <div className="flex items-start gap-2">
                        {isCorrect ? (
                          <CheckCircle2 className="w-4 h-4 text-green-500 mt-0.5 shrink-0" />
                        ) : (
                          <XCircle className="w-4 h-4 text-red-500 mt-0.5 shrink-0" />
                        )}
                        <div>
                          <p className="text-sm font-medium">{q.question}</p>
                          {!isCorrect && (
                            <p className="text-xs text-[var(--muted-foreground)] mt-1">
                              Correct answer: {q.correct_answer}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="flex justify-center gap-3">
                <button
                  onClick={() => {
                    setState("setup");
                    setQuestions([]);
                    setAnswers({});
                  }}
                  className="flex items-center gap-2 px-6 py-2.5 border border-[var(--border)] rounded-lg text-sm font-medium hover:bg-[var(--muted)] transition-colors"
                >
                  <RotateCcw className="w-4 h-4" />
                  Try Again
                </button>
                <Link
                  href={`/course/${courseId}/learn`}
                  className="flex items-center gap-2 bg-[var(--foreground)] text-[var(--background)] px-6 py-2.5 rounded-lg text-sm font-medium hover:opacity-90 transition-opacity"
                >
                  Review with Tutor
                </Link>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
