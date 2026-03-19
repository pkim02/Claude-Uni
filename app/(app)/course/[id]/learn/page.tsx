"use client";

import { useState, useEffect, useRef } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import ReactMarkdown from "react-markdown";
import { ArrowLeft, Send, Loader2, BookOpen, Lightbulb, HelpCircle, Zap, GraduationCap } from "lucide-react";
import type { Course, ChatMessage } from "@/lib/types";

export default function LearnPage() {
  const params = useParams();
  const courseId = params.id as string;
  const [course, setCourse] = useState<Course | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [mode, setMode] = useState<"tutor" | "solve">("tutor");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    fetchCourse();
  }, [courseId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function fetchCourse() {
    try {
      const res = await fetch(`/api/courses/${courseId}`);
      if (res.ok) {
        const data = await res.json();
        setCourse(data.course);
      }
    } catch {
      // handle error
    }
  }

  async function handleSend(messageText?: string) {
    const text = messageText || input.trim();
    if (!text || streaming) return;

    const userMessage: ChatMessage = {
      role: "user",
      content: text,
      timestamp: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setStreaming(true);

    // Add empty assistant message for streaming
    const assistantMessage: ChatMessage = {
      role: "assistant",
      content: "",
      timestamp: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, assistantMessage]);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          courseId,
          mode,
          messages: [...messages, userMessage].map((m) => ({
            role: m.role,
            content: m.content,
          })),
        }),
      });

      if (!res.ok) throw new Error("Chat failed");

      const reader = res.body?.getReader();
      const decoder = new TextDecoder();
      let fullContent = "";

      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value);
          const lines = chunk.split("\n");

          for (const line of lines) {
            if (line.startsWith("data: ")) {
              const data = line.slice(6);
              if (data === "[DONE]") break;
              try {
                const parsed = JSON.parse(data);
                if (parsed.text) {
                  fullContent += parsed.text;
                  setMessages((prev) => {
                    const updated = [...prev];
                    updated[updated.length - 1] = {
                      ...updated[updated.length - 1],
                      content: fullContent,
                    };
                    return updated;
                  });
                }
              } catch {
                // skip invalid JSON
              }
            }
          }
        }
      }
    } catch {
      setMessages((prev) => {
        const updated = [...prev];
        updated[updated.length - 1] = {
          ...updated[updated.length - 1],
          content: "Sorry, I encountered an error. Please try again.",
        };
        return updated;
      });
    }

    setStreaming(false);
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  const suggestions = course?.weekly_schedule?.slice(0, 3).map((w) => ({
    label: `Teach me Week ${w.week}`,
    prompt: `Teach me about Week ${w.week}: ${w.title}. Cover the key concepts: ${w.topics.join(", ")}`,
  })) || [];

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
        <div className="flex-1">
          <h1 className="font-semibold text-sm">{course?.name || "Loading..."}</h1>
          <p className="text-xs text-[var(--muted-foreground)]">
            {mode === "tutor" ? "AI Tutor — teaches you" : "Solve Mode — gives answers"}
          </p>
        </div>

        {/* Mode Toggle */}
        <div className="flex items-center bg-[var(--muted)] rounded-lg p-0.5">
          <button
            onClick={() => setMode("tutor")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
              mode === "tutor"
                ? "bg-white text-[var(--foreground)] shadow-sm"
                : "text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
            }`}
          >
            <GraduationCap className="w-3.5 h-3.5" />
            Tutor
          </button>
          <button
            onClick={() => setMode("solve")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
              mode === "solve"
                ? "bg-brand-500 text-white shadow-sm"
                : "text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
            }`}
          >
            <Zap className="w-3.5 h-3.5" />
            Solve
          </button>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-auto px-6 py-6">
        {messages.length === 0 ? (
          <div className="max-w-2xl mx-auto pt-20 text-center">
            <BookOpen className="w-12 h-12 text-brand-300 mx-auto mb-4" />
            <h2 className="text-xl font-semibold mb-2">Ready to learn?</h2>
            <p className="text-[var(--muted-foreground)] mb-8">
              Ask me anything about {course?.name || "your course"}. I&apos;ll teach you using
              your course materials.
            </p>

            {suggestions.length > 0 && (
              <div className="flex flex-wrap justify-center gap-3">
                {suggestions.map((s, i) => (
                  <button
                    key={i}
                    onClick={() => handleSend(s.prompt)}
                    className="flex items-center gap-2 px-4 py-2.5 border border-[var(--border)] rounded-xl text-sm hover:border-brand-300 hover:bg-brand-50/50 transition-colors"
                  >
                    <Lightbulb className="w-4 h-4 text-brand-500" />
                    {s.label}
                  </button>
                ))}
                <button
                  onClick={() => handleSend("Give me an overview of this entire course. What are the key themes and how do they connect?")}
                  className="flex items-center gap-2 px-4 py-2.5 border border-[var(--border)] rounded-xl text-sm hover:border-brand-300 hover:bg-brand-50/50 transition-colors"
                >
                  <HelpCircle className="w-4 h-4 text-brand-500" />
                  Course overview
                </button>
              </div>
            )}
          </div>
        ) : (
          <div className="max-w-2xl mx-auto space-y-6">
            {messages.map((msg, i) => (
              <div
                key={i}
                className={`message-enter ${
                  msg.role === "user" ? "flex justify-end" : ""
                }`}
              >
                {msg.role === "user" ? (
                  <div className="bg-[var(--foreground)] text-[var(--background)] px-4 py-3 rounded-2xl rounded-br-md max-w-[80%]">
                    <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                  </div>
                ) : (
                  <div className="prose prose-sm max-w-none">
                    <ReactMarkdown>{msg.content}</ReactMarkdown>
                    {streaming && i === messages.length - 1 && (
                      <span className="streaming-cursor" />
                    )}
                  </div>
                )}
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* Input */}
      <div className="border-t border-[var(--border)] px-6 py-4">
        <div className="max-w-2xl mx-auto">
          <div className="flex items-end gap-3 bg-white border border-[var(--border)] rounded-xl px-4 py-3 focus-within:ring-2 focus-within:ring-brand-300 focus-within:border-transparent transition-shadow">
            <textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={`Ask about ${course?.name || "your course"}...`}
              rows={1}
              className="flex-1 resize-none bg-transparent focus:outline-none text-sm max-h-32"
              style={{ minHeight: "24px" }}
            />
            <button
              onClick={() => handleSend()}
              disabled={!input.trim() || streaming}
              className="p-1.5 text-[var(--muted-foreground)] hover:text-brand-500 disabled:opacity-30 transition-colors"
            >
              {streaming ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <Send className="w-5 h-5" />
              )}
            </button>
          </div>
          <p className="text-xs text-[var(--muted-foreground)] mt-2 text-center">
            AI tutor powered by Claude. Responses are based on your course materials.
          </p>
        </div>
      </div>
    </div>
  );
}
