"use client";

import { useState, useRef } from "react";
import Link from "next/link";
import {
  Globe,
  Download,
  Loader2,
  CheckCircle2,
  AlertCircle,
  LogIn,
  Search,
  FileDown,
  Sparkles,
  Eye,
  EyeOff,
} from "lucide-react";

interface ProgressEvent {
  phase: string;
  message: string;
  currentCourse?: string;
  coursesFound?: number;
  coursesScraped?: number;
  filesDownloaded?: number;
  timestamp: string;
}

export default function LearnUSPage() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [scraping, setScraping] = useState(false);
  const [phase, setPhase] = useState<string>("");
  const [logs, setLogs] = useState<ProgressEvent[]>([]);
  const [result, setResult] = useState<ProgressEvent | null>(null);
  const [error, setError] = useState("");
  const logsEndRef = useRef<HTMLDivElement>(null);

  async function handleStartScrape() {
    if (!username || !password || scraping) return;

    setScraping(true);
    setPhase("login");
    setLogs([]);
    setResult(null);
    setError("");

    try {
      const res = await fetch("/api/learnus/scrape", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to start scraping");
      }

      const reader = res.body?.getReader();
      const decoder = new TextDecoder();

      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value);
          const lines = chunk.split("\n");

          for (const line of lines) {
            if (line.startsWith("data: ")) {
              try {
                const event: ProgressEvent = JSON.parse(line.slice(6));
                setPhase(event.phase);
                setLogs((prev) => [...prev, event]);

                if (event.phase === "complete") {
                  setResult(event);
                } else if (event.phase === "error") {
                  setError(event.message);
                }

                // Auto-scroll logs
                setTimeout(() => {
                  logsEndRef.current?.scrollIntoView({ behavior: "smooth" });
                }, 50);
              } catch {
                // skip invalid JSON
              }
            }
          }
        }
      }
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setScraping(false);
    }
  }

  const phaseIcons: Record<string, React.ReactNode> = {
    login: <LogIn className="w-4 h-4" />,
    discovering: <Search className="w-4 h-4" />,
    scraping: <FileDown className="w-4 h-4" />,
    ingesting: <Sparkles className="w-4 h-4" />,
    complete: <CheckCircle2 className="w-4 h-4 text-green-500" />,
    error: <AlertCircle className="w-4 h-4 text-red-500" />,
  };

  const phaseLabels: Record<string, string> = {
    login: "Logging in...",
    discovering: "Discovering courses...",
    scraping: "Downloading materials...",
    ingesting: "Processing with AI...",
    complete: "Import complete!",
    error: "Error occurred",
  };

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold flex items-center gap-3">
          <Globe className="w-7 h-7 text-brand-500" />
          LearNUS Import
        </h1>
        <p className="text-[var(--muted-foreground)] mt-1">
          Connect to your Yonsei University LearNUS account to automatically import all course
          materials.
        </p>
      </div>

      {/* Login Form */}
      {!scraping && !result && (
        <div className="border border-[var(--border)] rounded-xl p-6 mb-6">
          <h2 className="font-semibold mb-4">LearNUS Credentials</h2>
          <p className="text-sm text-[var(--muted-foreground)] mb-4">
            Your credentials are used only for this import session and are never stored.
          </p>

          <div className="space-y-4 max-w-md">
            <div>
              <label className="block text-sm font-medium mb-1.5">Student ID / Username</label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="e.g., 2024123456"
                className="w-full px-3 py-2 border border-[var(--border)] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-300 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1.5">Password</label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Your LearNUS password"
                  className="w-full px-3 py-2 border border-[var(--border)] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-300 focus:border-transparent pr-10"
                  onKeyDown={(e) => e.key === "Enter" && handleStartScrape()}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              onClick={handleStartScrape}
              disabled={!username || !password}
              className="flex items-center gap-2 px-5 py-2.5 bg-[var(--foreground)] text-[var(--background)] rounded-lg text-sm font-medium hover:opacity-90 disabled:opacity-40 transition-opacity"
            >
              <Download className="w-4 h-4" />
              Start Import
            </button>
          </div>
        </div>
      )}

      {/* Progress Panel */}
      {(scraping || logs.length > 0) && (
        <div className="border border-[var(--border)] rounded-xl overflow-hidden mb-6">
          {/* Phase indicator */}
          <div className="px-6 py-4 border-b border-[var(--border)] bg-[var(--muted)]">
            <div className="flex items-center gap-3">
              {scraping ? (
                <Loader2 className="w-5 h-5 animate-spin text-brand-500" />
              ) : (
                phaseIcons[phase]
              )}
              <div>
                <p className="font-medium text-sm">
                  {phaseLabels[phase] || "Initializing..."}
                </p>
                {logs.length > 0 && (
                  <p className="text-xs text-[var(--muted-foreground)]">
                    {logs[logs.length - 1]?.message}
                  </p>
                )}
              </div>
            </div>

            {/* Phase steps */}
            <div className="flex items-center gap-2 mt-4">
              {["login", "discovering", "scraping", "ingesting", "complete"].map((p, i) => {
                const phases = ["login", "discovering", "scraping", "ingesting", "complete"];
                const currentIdx = phases.indexOf(phase);
                const isActive = phases.indexOf(p) === currentIdx;
                const isDone = phases.indexOf(p) < currentIdx;
                return (
                  <div key={p} className="flex items-center gap-2">
                    <div
                      className={`w-2 h-2 rounded-full ${
                        isDone
                          ? "bg-green-500"
                          : isActive
                          ? "bg-brand-500 animate-pulse"
                          : "bg-[var(--border)]"
                      }`}
                    />
                    <span
                      className={`text-xs ${
                        isActive
                          ? "text-[var(--foreground)] font-medium"
                          : "text-[var(--muted-foreground)]"
                      }`}
                    >
                      {p.charAt(0).toUpperCase() + p.slice(1)}
                    </span>
                    {i < 4 && (
                      <div
                        className={`w-8 h-px ${
                          isDone ? "bg-green-500" : "bg-[var(--border)]"
                        }`}
                      />
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Log output */}
          <div className="max-h-64 overflow-auto p-4 font-mono text-xs space-y-1 bg-gray-950 text-gray-300">
            {logs.map((log, i) => (
              <div key={i} className="flex gap-2">
                <span className="text-gray-600 shrink-0">
                  {new Date(log.timestamp).toLocaleTimeString()}
                </span>
                <span
                  className={
                    log.phase === "error"
                      ? "text-red-400"
                      : log.phase === "complete"
                      ? "text-green-400"
                      : "text-gray-300"
                  }
                >
                  {log.message}
                </span>
              </div>
            ))}
            <div ref={logsEndRef} />
          </div>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="border border-red-200 bg-red-50 rounded-xl p-4 mb-6">
          <div className="flex items-center gap-2 text-red-700">
            <AlertCircle className="w-4 h-4" />
            <p className="text-sm font-medium">Import failed</p>
          </div>
          <p className="text-sm text-red-600 mt-1">{error}</p>
          <button
            onClick={() => {
              setError("");
              setLogs([]);
              setPhase("");
              setResult(null);
            }}
            className="mt-3 text-sm text-red-700 underline hover:no-underline"
          >
            Try again
          </button>
        </div>
      )}

      {/* Success Result */}
      {result && phase === "complete" && (
        <div className="border border-green-200 bg-green-50 rounded-xl p-6 mb-6">
          <div className="flex items-center gap-2 text-green-700 mb-3">
            <CheckCircle2 className="w-5 h-5" />
            <h3 className="font-semibold">Import Complete!</h3>
          </div>
          <p className="text-sm text-green-700 mb-4">{result.message}</p>
          <div className="flex gap-3">
            <Link
              href="/dashboard"
              className="px-4 py-2 bg-green-700 text-white rounded-lg text-sm font-medium hover:bg-green-800 transition-colors"
            >
              Go to Dashboard
            </Link>
            <Link
              href="/learnus/tasks"
              className="px-4 py-2 border border-green-300 text-green-700 rounded-lg text-sm font-medium hover:bg-green-100 transition-colors"
            >
              View Homework Tasks
            </Link>
          </div>
        </div>
      )}

      {/* Info Cards */}
      {!scraping && !result && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-8">
          <div className="border border-[var(--border)] rounded-xl p-4">
            <Search className="w-5 h-5 text-brand-500 mb-2" />
            <h3 className="font-medium text-sm mb-1">Auto-Discovery</h3>
            <p className="text-xs text-[var(--muted-foreground)]">
              Claude navigates your LearNUS and finds all enrolled courses automatically.
            </p>
          </div>
          <div className="border border-[var(--border)] rounded-xl p-4">
            <FileDown className="w-5 h-5 text-brand-500 mb-2" />
            <h3 className="font-medium text-sm mb-1">Material Download</h3>
            <p className="text-xs text-[var(--muted-foreground)]">
              Downloads all PDFs, slides, and documents from every course section.
            </p>
          </div>
          <div className="border border-[var(--border)] rounded-xl p-4">
            <Sparkles className="w-5 h-5 text-brand-500 mb-2" />
            <h3 className="font-medium text-sm mb-1">AI Processing</h3>
            <p className="text-xs text-[var(--muted-foreground)]">
              Materials are analyzed by AI to create structured courses for tutoring and quizzes.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
