import { useState, useRef, useEffect, useCallback } from "react";
import { ArrowLeft, Send, ToggleLeft, ToggleRight } from "lucide-react";
import ReactMarkdown from "react-markdown";
import { useStorage, useBackgroundMessages, sendMessage } from "../hooks/useStorage";
import { buildTutorPrompt } from "@/shared/prompts/tutor";
import { getCourseContext } from "@/shared/storage";
import type { Course, ChatMessage } from "@/shared/types";
import type { Page } from "../App";

interface LearnProps {
  courseId: string;
  navigate: (page: Page) => void;
}

export function Learn({ courseId, navigate }: LearnProps) {
  const [courses] = useStorage<Course[]>("courses", []);
  const course = courses.find((c) => c.id === courseId);

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [mode, setMode] = useState<"tutor" | "solve">("tutor");
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamingText, setStreamingText] = useState("");
  const chatEndRef = useRef<HTMLDivElement>(null);
  const currentRequestId = useRef<string | null>(null);

  // Listen for AI responses
  useBackgroundMessages(
    useCallback((message: { type: string; [key: string]: unknown }) => {
      if (message.type === "AI_CHUNK" && message.id === currentRequestId.current) {
        setStreamingText((prev) => prev + (message.text as string));
      }
      if (message.type === "AI_DONE" && message.id === currentRequestId.current) {
        const fullText = message.fullText as string;
        setMessages((prev) => [
          ...prev,
          { role: "assistant", content: fullText, timestamp: new Date().toISOString() },
        ]);
        setStreamingText("");
        setIsStreaming(false);
        currentRequestId.current = null;
      }
      if (message.type === "AI_ERROR" && message.id === currentRequestId.current) {
        setMessages((prev) => [
          ...prev,
          {
            role: "assistant",
            content: `Error: ${message.error}. Make sure you have claude.ai open in another tab.`,
            timestamp: new Date().toISOString(),
          },
        ]);
        setStreamingText("");
        setIsStreaming(false);
        currentRequestId.current = null;
      }
    }, [])
  );

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, streamingText]);

  const handleSend = async () => {
    if (!input.trim() || isStreaming) return;

    const userMessage: ChatMessage = {
      role: "user",
      content: input.trim(),
      timestamp: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsStreaming(true);
    setStreamingText("");

    const requestId = `chat-${Date.now()}`;
    currentRequestId.current = requestId;

    // Build prompt with course context
    const context = await getCourseContext(courseId);
    const systemPrompt = buildTutorPrompt(course?.name || "Course", context, mode);

    // Build conversation for the AI
    const allMessages = [...messages, userMessage];
    const conversationText = allMessages
      .map((m) => `${m.role === "user" ? "Student" : "Tutor"}: ${m.content}`)
      .join("\n\n");

    const userPrompt = `${systemPrompt}\n\nConversation so far:\n${conversationText}\n\nRespond to the student's latest message.`;

    sendMessage({
      type: "AI_REQUEST",
      id: requestId,
      systemPrompt: "",
      userPrompt,
    });
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const suggestedPrompts = course
    ? [
        ...course.weekly_schedule.slice(0, 3).map((w) => `Teach me Week ${w.week}: ${w.title}`),
        "Give me an overview of this course",
      ]
    : ["What topics does this course cover?"];

  return (
    <div className="flex flex-col h-screen">
      {/* Header */}
      <div className="border-b border-[#222] p-4 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate({ name: "course", courseId })}
            className="text-gray-500 hover:text-gray-300"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="font-semibold">{course?.name || "Learn"}</h1>
            <span className="text-xs text-gray-600">AI Tutor</span>
          </div>
        </div>
        <button
          onClick={() => setMode(mode === "tutor" ? "solve" : "tutor")}
          className="flex items-center gap-2 px-3 py-1.5 text-sm bg-[#1a1a1a] border border-[#333] rounded-lg"
        >
          {mode === "tutor" ? (
            <ToggleLeft className="w-4 h-4 text-amber-400" />
          ) : (
            <ToggleRight className="w-4 h-4 text-purple-400" />
          )}
          {mode === "tutor" ? "Tutor Mode" : "Solve Mode"}
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 && !isStreaming && (
          <div className="flex flex-col items-center justify-center h-full gap-4">
            <p className="text-gray-500">
              {mode === "tutor"
                ? "Ask me anything. I'll teach, not just give answers."
                : "Solve mode: I'll give you complete solutions."}
            </p>
            <div className="flex flex-wrap gap-2 justify-center max-w-lg">
              {suggestedPrompts.map((prompt, i) => (
                <button
                  key={i}
                  onClick={() => setInput(prompt)}
                  className="text-sm px-3 py-1.5 bg-[#111] border border-[#222] rounded-lg text-gray-400 hover:text-gray-200 hover:border-[#333] transition-colors"
                >
                  {prompt}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((msg, i) => (
          <div
            key={i}
            className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
          >
            <div
              className={`max-w-[80%] rounded-lg px-4 py-3 ${
                msg.role === "user"
                  ? "bg-amber-500/10 text-gray-200"
                  : "bg-[#111] border border-[#222]"
              }`}
            >
              {msg.role === "assistant" ? (
                <div className="prose prose-invert prose-sm max-w-none">
                  <ReactMarkdown>{msg.content}</ReactMarkdown>
                </div>
              ) : (
                <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
              )}
            </div>
          </div>
        ))}

        {isStreaming && streamingText && (
          <div className="flex justify-start">
            <div className="max-w-[80%] rounded-lg px-4 py-3 bg-[#111] border border-[#222]">
              <div className="prose prose-invert prose-sm max-w-none">
                <ReactMarkdown>{streamingText}</ReactMarkdown>
              </div>
              <span className="inline-block w-2 h-4 bg-amber-400 animate-pulse ml-1" />
            </div>
          </div>
        )}

        {isStreaming && !streamingText && (
          <div className="flex justify-start">
            <div className="rounded-lg px-4 py-3 bg-[#111] border border-[#222] text-gray-500 text-sm">
              Thinking...
            </div>
          </div>
        )}

        <div ref={chatEndRef} />
      </div>

      {/* Input */}
      <div className="border-t border-[#222] p-4 shrink-0">
        <div className="flex gap-2 max-w-3xl mx-auto">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={
              mode === "tutor"
                ? "Ask a question..."
                : "What do you need solved?"
            }
            rows={1}
            className="flex-1 bg-[#111] border border-[#222] rounded-lg px-4 py-3 text-sm resize-none focus:outline-none focus:border-amber-500/50"
          />
          <button
            onClick={handleSend}
            disabled={!input.trim() || isStreaming}
            className="px-4 bg-amber-500 text-black rounded-lg hover:bg-amber-400 disabled:opacity-50 disabled:hover:bg-amber-500 transition-colors"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
